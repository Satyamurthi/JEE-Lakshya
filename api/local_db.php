<?php
set_time_limit(60);
ini_set('max_execution_time', 60);
ob_start(); // Buffer output to avoid chunked-encoding issues with cloudflared

require_once __DIR__ . '/db.php';

// Disable default PHP error reporting to ensure only JSON is returned
ini_set('display_errors', 0);
error_reporting(E_ALL);


$input = json_decode(file_get_contents('php://input'), true) ?: [];

$table  = isset($input['table'])  ? trim($input['table'])  : '';
$action = isset($input['action']) ? trim($input['action']) : '';

if (empty($table) || empty($action)) {
    http_response_code(400);
    echo json_encode(["error" => "Table and action are required."]);
    exit;
}

// Allowed tables list for security
$allowed_tables = [
    'profiles',
    'exam_attempts',
    'daily_challenges',
    'daily_attempts',
    'system_config',
    'subscription_plans',
    'questions',
    'payment_logs',    // ← NEW
    'activity_log'     // ← NEW
];
if (!in_array($table, $allowed_tables)) {
    http_response_code(400);
    echo json_encode(["error" => "Table '$table' is not accessible."]);
    exit;
}

// Primary keys mapping
$primary_keys = [
    'profiles'           => 'id',
    'exam_attempts'      => 'id',
    'daily_challenges'   => 'date',
    'daily_attempts'     => 'id',
    'system_config'      => 'key',
    'subscription_plans' => 'id',
    'questions'          => 'id',
    'payment_logs'       => 'id',   // ← NEW
    'activity_log'       => 'id'    // ← NEW (auto-increment, seldom updated)
];
$primary_key = isset($primary_keys[$table]) ? $primary_keys[$table] : 'id';

// ──────────────────────────────────────────────────────────────────────────────
// Helper: build WHERE clause from a filters array
// ──────────────────────────────────────────────────────────────────────────────
function buildWhereClause(array $filters, array &$params): array {
    $where_clauses = [];
    foreach ($filters as $index => $filter) {
        if (!isset($filter['column'])) continue;
        $col        = preg_replace('/[^a-zA-Z0-9_]/', '', $filter['column']);
        $op         = strtolower(isset($filter['op']) ? $filter['op'] : 'eq');
        $val        = isset($filter['value']) ? $filter['value'] : null;
        $param_name = ":f_" . $col . "_" . $index;

        switch ($op) {
            case 'eq':
                $where_clauses[] = "`$col` = $param_name";
                $params[$param_name] = $val;
                break;
            case 'neq':
                $where_clauses[] = "`$col` != $param_name";
                $params[$param_name] = $val;
                break;
            case 'like':
            case 'ilike':
                $where_clauses[] = "`$col` LIKE $param_name";
                $params[$param_name] = $val;
                break;
            case 'is':
                if ($val === null || (is_string($val) && strtolower($val) === 'null')) {
                    $where_clauses[] = "`$col` IS NULL";
                } else {
                    $where_clauses[] = "`$col` IS NOT NULL";
                }
                break;
            case 'in':
                if (is_array($val) && count($val) > 0) {
                    $in_params = [];
                    foreach ($val as $v_idx => $v_val) {
                        $in_param_name      = $param_name . "_" . $v_idx;
                        $in_params[]        = $in_param_name;
                        $params[$in_param_name] = $v_val;
                    }
                    $where_clauses[] = "`$col` IN (" . implode(", ", $in_params) . ")";
                } else {
                    $where_clauses[] = "1 = 0"; // empty IN → match nothing
                }
                break;
            case 'not':
                if (is_array($val) && isset($val['op'])) {
                    $sub_op  = strtolower($val['op']);
                    $sub_val = isset($val['value']) ? $val['value'] : null;
                    if ($sub_op === 'is' && ($sub_val === null || strtolower((string)$sub_val) === 'null')) {
                        $where_clauses[] = "`$col` IS NOT NULL";
                    } else {
                        $where_clauses[] = "NOT (`$col` = $param_name)";
                        $params[$param_name] = $sub_val;
                    }
                }
                break;
            // ── Range operators (NEW) ──────────────────────────────
            case 'gte':
                $where_clauses[] = "`$col` >= $param_name";
                $params[$param_name] = $val;
                break;
            case 'lte':
                $where_clauses[] = "`$col` <= $param_name";
                $params[$param_name] = $val;
                break;
            case 'gt':
                $where_clauses[] = "`$col` > $param_name";
                $params[$param_name] = $val;
                break;
            case 'lt':
                $where_clauses[] = "`$col` < $param_name";
                $params[$param_name] = $val;
                break;
        }
    }
    return $where_clauses;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: decode known JSON columns in a row
// ──────────────────────────────────────────────────────────────────────────────
function decodeJsonColumns(array &$row): void {
    $json_cols = ['config', 'questions', 'features', 'value', 'options', 'markingScheme', 'metadata'];
    foreach ($json_cols as $col) {
        if (isset($row[$col]) && is_string($row[$col])) {
            $decoded = json_decode($row[$col], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $row[$col] = $decoded;
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: sanitize a value for DB storage
// ──────────────────────────────────────────────────────────────────────────────
function sanitizeValue($v): mixed {
    if (is_array($v) || is_object($v)) {
        return json_encode($v);
    }
    if ($v === true)  return 1;
    if ($v === false) return 0;
    // Convert ISO 8601 datetime to MySQL DATETIME format
    if (is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $v)) {
        $ts = strtotime($v);
        return ($ts !== false) ? date('Y-m-d H:i:s', $ts) : $v;
    }
    return $v;
}

try {
    // ═══════════════════════════════════════════════════════════════════════
    // SELECT
    // ═══════════════════════════════════════════════════════════════════════
    if ($action === 'select') {
        $columns   = isset($input['columns']) ? trim($input['columns']) : '*';
        $params    = [];
        $filters   = isset($input['filters']) ? $input['filters'] : [];

        $where_clauses = buildWhereClause($filters, $params);

        // Special JOIN for daily_attempts with profile info
        if ($table === 'daily_attempts' && strpos($columns, 'profiles') !== false) {
            $sql = "SELECT daily_attempts.*, profiles.email AS user_email, profiles.full_name AS user_name, profiles.admin_id AS user_admin_id
                    FROM daily_attempts
                    LEFT JOIN profiles ON daily_attempts.user_id = profiles.id";
        } else {
            $sql = "SELECT $columns FROM `$table`";
        }

        if (count($where_clauses) > 0) {
            $sql .= " WHERE " . implode(" AND ", $where_clauses);
        }

        // Sorting
        $orderCol = isset($input['orderCol']) ? preg_replace('/[^a-zA-Z0-9_]/', '', $input['orderCol']) : '';
        $orderAsc = isset($input['orderAsc']) ? (bool)$input['orderAsc'] : true;
        if (!empty($orderCol)) {
            $sql .= " ORDER BY `$orderCol` " . ($orderAsc ? "ASC" : "DESC");
        }

        // Limit & Offset
        $limitVal  = isset($input['limitVal'])  ? (int)$input['limitVal']  : null;
        $offsetVal = isset($input['offsetVal']) ? (int)$input['offsetVal'] : null;
        if ($limitVal !== null && $limitVal > 0) {
            $sql .= " LIMIT $limitVal";
            if ($offsetVal !== null && $offsetVal >= 0) {
                $sql .= " OFFSET $offsetVal";
            }
        }

        $isSingle      = isset($input['isSingle'])      ? (bool)$input['isSingle']      : false;
        $isMaybeSingle = isset($input['isMaybeSingle']) ? (bool)$input['isMaybeSingle'] : false;
        $countOption   = isset($input['countOption'])   ? $input['countOption']          : null;

        if ($countOption === 'exact' || $columns === 'count(*)' || strtolower($columns) === 'count(1)') {
            if (count($where_clauses) === 0 && ($table === 'questions' || $table === 'exam_attempts')) {
                // High-performance instant count from information_schema (bypasses full table scan on 1M+ rows)
                $infoStmt = $conn->prepare("SELECT TABLE_ROWS FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
                $infoStmt->execute([$table]);
                $totalCount = (int)$infoStmt->fetchColumn();
                if ($totalCount === 0) {
                    $countStmt = $conn->prepare("SELECT COUNT(*) FROM `$table`");
                    $countStmt->execute();
                    $totalCount = (int)$countStmt->fetchColumn();
                }
            } else {
                $countSql = "SELECT COUNT(*) FROM `$table`";
                if (count($where_clauses) > 0) {
                    $countSql .= " WHERE " . implode(" AND ", $where_clauses);
                }
                $countStmt = $conn->prepare($countSql);
                $countStmt->execute($params);
                $totalCount = (int)$countStmt->fetchColumn();
            }
            echo json_encode(["data" => [], "error" => null, "count" => $totalCount]);
            exit;
        }

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);

        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            decodeJsonColumns($row);
            // Reassemble nested profiles object for daily_attempts JOIN
            if ($table === 'daily_attempts' && isset($row['user_email'])) {
                $row['profiles'] = [
                    'email'    => $row['user_email'],
                    'full_name'=> $row['user_name'],
                    'admin_id' => $row['user_admin_id']
                ];
                unset($row['user_email'], $row['user_name'], $row['user_admin_id']);
            }
        }

        if ($isSingle || $isMaybeSingle) {
            if (count($rows) > 0) {
                echo json_encode(["data" => $rows[0], "error" => null]);
            } else {
                if ($isSingle) {
                    http_response_code(404);
                    echo json_encode(["data" => null, "error" => ["message" => "Row not found"]]);
                } else {
                    echo json_encode(["data" => null, "error" => null]);
                }
            }
        } else {
            echo json_encode(["data" => $rows, "error" => null]);
        }

    // ═══════════════════════════════════════════════════════════════════════
    // INSERT / UPDATE / UPSERT
    // ═══════════════════════════════════════════════════════════════════════
    } elseif (in_array($action, ['insert', 'upsert', 'update'])) {
        $payload = isset($input['payload']) ? $input['payload'] : null;
        if (empty($payload)) {
            http_response_code(400);
            echo json_encode(["error" => "Payload data is required for inserts/updates."]);
            exit;
        }

        // Normalize to array of rows
        $is_multiple = true;
        if (!isset($payload[0]) || !is_array($payload[0])) {
            $payload     = [$payload];
            $is_multiple = false;
        }

        $results_arr = [];

        // Fetch valid columns once
        $valid_cols_map = [];
        try {
            $cols_query = $conn->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_COLUMN);
            if ($cols_query) {
                $valid_cols_map = array_flip($cols_query);
            }
        } catch (Exception $e) {}

        $filters = isset($input['filters']) ? $input['filters'] : [];

        foreach ($payload as $row) {
            // Sanitize values
            $processed_row = [];
            foreach ($row as $k => $v) {
                $processed_row[$k] = sanitizeValue($v);
            }

            // Strip columns not in the table
            if (!empty($valid_cols_map)) {
                $filtered = [];
                foreach ($processed_row as $k => $v) {
                    if (isset($valid_cols_map[$k])) {
                        $filtered[$k] = $v;
                    }
                }
                $processed_row = $filtered;
            }

            // Resolve primary key value (from payload OR filters)
            $pk_val = (isset($processed_row[$primary_key]) && $processed_row[$primary_key] !== '') ? $processed_row[$primary_key] : null;
            if ($pk_val === null && !empty($filters)) {
                foreach ($filters as $f) {
                    if (isset($f['column']) && $f['column'] === $primary_key && isset($f['value'])) {
                        $pk_val = $f['value'];
                        break;
                    }
                }
            }

            // Auto-generate UUID for new inserts where PK is 'id'
            if ($pk_val === null && $primary_key === 'id' && $action !== 'update') {
                $pk_val = sprintf(
                    '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                    mt_rand(0, 0xffff),
                    mt_rand(0, 0x0fff) | 0x4000,
                    mt_rand(0, 0x3fff) | 0x8000,
                    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
                );
                $processed_row['id'] = $pk_val;
            }

            // Check existence for upsert
            $exists = false;
            if ($pk_val !== null) {
                $check_stmt = $conn->prepare("SELECT COUNT(*) FROM `$table` WHERE `$primary_key` = ?");
                $check_stmt->execute([$pk_val]);
                $exists = ((int)$check_stmt->fetchColumn() > 0);
            }

            if ($action === 'update' || ($action === 'upsert' && $exists)) {
                // BUILD UPDATE
                $where_clauses = [];
                $where_params  = [];

                if ($pk_val !== null) {
                    $where_clauses[]               = "`$primary_key` = :pk_where_val";
                    $where_params[":pk_where_val"] = $pk_val;
                }

                if (!empty($filters)) {
                    foreach ($filters as $f_idx => $f) {
                        $f_col   = preg_replace('/[^a-zA-Z0-9_]/', '', $f['column']);
                        $f_param = ":w_" . $f_col . "_" . $f_idx;
                        $where_clauses[]  = "`$f_col` = $f_param";
                        $where_params[$f_param] = $f['value'];
                    }
                }

                if (count($where_clauses) === 0) {
                    throw new Exception("WHERE clause filters or primary key is required for update.");
                }

                $set_parts  = [];
                $set_params = [];
                foreach ($processed_row as $k => $v) {
                    $set_param    = ":s_" . $k;
                    $set_parts[]  = "`$k` = $set_param";
                    $set_params[$set_param] = $v;
                }

                if (count($set_parts) > 0) {
                    $sql  = "UPDATE `$table` SET " . implode(", ", $set_parts) . " WHERE " . implode(" AND ", $where_clauses);
                    $stmt = $conn->prepare($sql);
                    $stmt->execute(array_merge($set_params, $where_params));
                }

            } else {
                // BUILD INSERT
                $cols             = array_keys($processed_row);
                $col_placeholders = array_map(function($c) { return ":$c"; }, $cols);
                $params           = [];
                foreach ($processed_row as $k => $v) {
                    $params[":$k"] = $v;
                }
                $sql  = "INSERT INTO `$table` (" . implode(", ", array_map(function($c) { return "`$c`"; }, $cols)) . ") VALUES (" . implode(", ", $col_placeholders) . ")";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
            }

            // Fetch back the saved row
            if ($pk_val !== null) {
                $fetch_stmt = $conn->prepare("SELECT * FROM `$table` WHERE `$primary_key` = ?");
                $fetch_stmt->execute([$pk_val]);
                $updated_row = $fetch_stmt->fetch();
                if ($updated_row) {
                    decodeJsonColumns($updated_row);
                    $results_arr[] = $updated_row;
                } else {
                    $results_arr[] = $processed_row;
                }
            } else {
                $results_arr[] = $processed_row;
            }
        }

        $returned_data = $is_multiple ? $results_arr : (count($results_arr) > 0 ? $results_arr[0] : null);
        echo json_encode(["data" => $returned_data, "error" => null]);

    // ═══════════════════════════════════════════════════════════════════════
    // DELETE
    // ═══════════════════════════════════════════════════════════════════════
    } elseif ($action === 'delete') {
        $params  = [];
        $filters = isset($input['filters']) ? $input['filters'] : [];

        $where_clauses = buildWhereClause($filters, $params);

        if (count($where_clauses) === 0) {
            throw new Exception("Safe check: DELETE requires at least one filter.");
        }

        $sql  = "DELETE FROM `$table` WHERE " . implode(" AND ", $where_clauses);
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);

        echo json_encode(["data" => null, "error" => null]);

    } else {
        http_response_code(405);
        echo json_encode(["error" => "Action '$action' not supported."]);
    }

} catch (Throwable $e) {
    http_response_code(200);
    $msg = $e->getMessage();
    if (strpos($msg, 'Duplicate entry') !== false) {
        $msg = "An account with this email address already exists.";
    }
    echo json_encode(["data" => null, "error" => ["message" => $msg]]);
}
ob_end_flush(); // Flush buffered output to client
?>
