<?php
require_once __DIR__ . '/db.php';

// Disable default PHP error reporting to ensure only JSON is returned
ini_set('display_errors', 0);
error_reporting(E_ALL);

$input = json_decode(file_get_contents('php://input'), true) ?: [];

$table = isset($input['table']) ? trim($input['table']) : '';
$action = isset($input['action']) ? trim($input['action']) : '';

if (empty($table) || empty($action)) {
    http_response_code(400);
    echo json_encode(["error" => "Table and action are required."]);
    exit;
}

// Allowed tables list for security
$allowed_tables = ['profiles', 'exam_attempts', 'daily_challenges', 'daily_attempts', 'system_config', 'subscription_plans', 'questions'];
if (!in_array($table, $allowed_tables)) {
    http_response_code(400);
    echo json_encode(["error" => "Table '$table' is not accessible."]);
    exit;
}

// Primary keys mapping
$primary_keys = [
    'profiles' => 'id',
    'exam_attempts' => 'id',
    'daily_challenges' => 'date',
    'daily_attempts' => 'id',
    'system_config' => 'key',
    'subscription_plans' => 'id',
    'questions' => 'id'
];
$primary_key = isset($primary_keys[$table]) ? $primary_keys[$table] : 'id';

try {
    if ($action === 'select') {
        $columns = isset($input['columns']) ? trim($input['columns']) : '*';
        
        // Build WHERE clause
        $where_clauses = [];
        $params = [];
        $filters = isset($input['filters']) ? $input['filters'] : [];
        
        foreach ($filters as $index => $filter) {
            $col = preg_replace('/[^a-zA-Z0-9_]/', '', $filter['column']);
            $op = strtolower($filter['op']);
            $val = $filter['value'];
            $param_name = ":f_" . $col . "_" . $index;
            
            if ($op === 'eq') {
                $where_clauses[] = "`$col` = $param_name";
                $params[$param_name] = $val;
            } elseif ($op === 'neq') {
                $where_clauses[] = "`$col` != $param_name";
                $params[$param_name] = $val;
            } elseif ($op === 'like' || $op === 'ilike') {
                $where_clauses[] = "`$col` LIKE $param_name";
                $params[$param_name] = $val;
            } elseif ($op === 'is') {
                if ($val === null || strtolower($val) === 'null') {
                    $where_clauses[] = "`$col` IS NULL";
                } else {
                    $where_clauses[] = "`$col` IS NOT NULL";
                }
            } elseif ($op === 'in') {
                if (is_array($val) && count($val) > 0) {
                    $in_params = [];
                    foreach ($val as $v_idx => $v_val) {
                        $in_param_name = $param_name . "_" . $v_idx;
                        $in_params[] = $in_param_name;
                        $params[$in_param_name] = $v_val;
                    }
                    $where_clauses[] = "`$col` IN (" . implode(", ", $in_params) . ")";
                } else {
                    // Empty IN list means match nothing
                    $where_clauses[] = "1 = 0";
                }
            } elseif ($op === 'not') {
                // E.g., not('gemini_api_key', 'is', null)
                if (is_array($val) && isset($val['op'])) {
                    $sub_op = strtolower($val['op']);
                    $sub_val = $val['value'];
                    if ($sub_op === 'is' && ($sub_val === null || strtolower($sub_val) === 'null')) {
                        $where_clauses[] = "`$col` IS NOT NULL";
                    } else {
                        $where_clauses[] = "NOT (`$col` = $param_name)";
                        $params[$param_name] = $sub_val;
                    }
                }
            }
        }
        
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
        $limitVal = isset($input['limitVal']) ? (int)$input['limitVal'] : null;
        $offsetVal = isset($input['offsetVal']) ? (int)$input['offsetVal'] : null;
        if ($limitVal !== null && $limitVal > 0) {
            $sql .= " LIMIT $limitVal";
            if ($offsetVal !== null && $offsetVal >= 0) {
                $sql .= " OFFSET $offsetVal";
            }
        }
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        $isSingle = isset($input['isSingle']) ? (bool)$input['isSingle'] : false;
        $isMaybeSingle = isset($input['isMaybeSingle']) ? (bool)$input['isMaybeSingle'] : false;
        $countOption = isset($input['countOption']) ? $input['countOption'] : null;
        
        if ($countOption === 'exact') {
            // If counting exact rows, return total count
            $countSql = "SELECT COUNT(*) FROM `$table`";
            if (count($where_clauses) > 0) {
                $countSql .= " WHERE " . implode(" AND ", $where_clauses);
            }
            $countStmt = $conn->prepare($countSql);
            $countStmt->execute($params);
            $totalCount = (int)$countStmt->fetchColumn();
            
            echo json_encode(["data" => [], "error" => null, "count" => $totalCount]);
            exit;
        }
        
        $rows = $stmt->fetchAll();
        
        // Process JSON columns automatically for attempts or config
        foreach ($rows as &$row) {
            if (isset($row['config']) && is_string($row['config'])) {
                $row['config'] = json_decode($row['config'], true);
            }
            if (isset($row['questions']) && is_string($row['questions'])) {
                $row['questions'] = json_decode($row['questions'], true);
            }
            if (isset($row['features']) && is_string($row['features'])) {
                $row['features'] = json_decode($row['features'], true);
            }
            if (isset($row['value']) && is_string($row['value'])) {
                $row['value'] = json_decode($row['value'], true);
            }
            if ($table === 'daily_attempts' && isset($row['user_email'])) {
                $row['profiles'] = [
                    'email' => $row['user_email'],
                    'full_name' => $row['user_name'],
                    'admin_id' => $row['user_admin_id']
                ];
                unset($row['user_email']);
                unset($row['user_name']);
                unset($row['user_admin_id']);
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
        
    } elseif ($action === 'insert' || $action === 'upsert' || $action === 'update') {
        $payload = isset($input['payload']) ? $input['payload'] : null;
        if (empty($payload)) {
            http_response_code(400);
            echo json_encode(["error" => "Payload data is required for inserts/updates."]);
            exit;
        }
        
        // Ensure payload is an array of rows or a single row
        $is_multiple = true;
        if (!isset($payload[0]) || !is_array($payload[0])) {
            $payload = [$payload];
            $is_multiple = false;
        }
        
        $results = [];
        
        foreach ($payload as $row) {
            // Process fields: serialize array/objects to JSON strings
            $processed_row = [];
            foreach ($row as $k => $v) {
                if (is_array($v) || is_object($v)) {
                    $processed_row[$k] = json_encode($v);
                } else {
                    if ($v === true) {
                        $processed_row[$k] = 1;
                    } elseif ($v === false) {
                        $processed_row[$k] = 0;
                    } else {
                        $processed_row[$k] = $v;
                    }
                }
            }
            
            // Filter $processed_row against actual table columns in MariaDB to prevent Unknown Column errors
            try {
                $cols_query = $conn->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_COLUMN);
                if ($cols_query) {
                    $valid_cols = array_flip($cols_query);
                    $filtered_row = [];
                    foreach ($processed_row as $k => $v) {
                        if (isset($valid_cols[$k])) {
                            $filtered_row[$k] = $v;
                        }
                    }
                    $processed_row = $filtered_row;
                }
            } catch (Exception $e) {}

            // Check if record exists for upsert/update
            $pk_val = (isset($processed_row[$primary_key]) && !empty($processed_row[$primary_key])) ? $processed_row[$primary_key] : null;
            if ($pk_val === null && $primary_key === 'id') {
                $pk_val = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
                $processed_row['id'] = $pk_val;
            }
            
            if ($pk_val !== null) {
                $check_stmt = $conn->prepare("SELECT COUNT(*) FROM `$table` WHERE `$primary_key` = ?");
                $check_stmt->execute([$pk_val]);
                $exists = ((int)$check_stmt->fetchColumn() > 0);
            }
            
            if ($action === 'update' || ($action === 'upsert' && $exists)) {
                // Run UPDATE
                if ($pk_val === null) {
                    throw new Exception("Primary key value is missing for update.");
                }
                
                $set_parts = [];
                $params = [];
                foreach ($processed_row as $k => $v) {
                    if ($k !== $primary_key) {
                        $set_parts[] = "`$k` = :$k";
                        $params[":$k"] = $v;
                    }
                }
                $params[":pk_val"] = $pk_val;
                
                $sql = "UPDATE `$table` SET " . implode(", ", $set_parts) . " WHERE `$primary_key` = :pk_val";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                
            } else {
                // Run INSERT
                $cols = array_keys($processed_row);
                $col_placeholders = array_map(function($c) { return ":$c"; }, $cols);
                
                $params = [];
                foreach ($processed_row as $k => $v) {
                    $params[":$k"] = $v;
                }
                
                $sql = "INSERT INTO `$table` (" . implode(", ", array_map(function($c) { return "`$c`"; }, $cols)) . ") VALUES (" . implode(", ", $col_placeholders) . ")";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
            }
            
            // Fetch updated row to return
            if ($pk_val !== null) {
                $fetch_stmt = $conn->prepare("SELECT * FROM `$table` WHERE `$primary_key` = ?");
                $fetch_stmt->execute([$pk_val]);
                $updated_row = $fetch_stmt->fetch();
                
                if ($updated_row) {
                    if (isset($updated_row['config']) && is_string($updated_row['config'])) {
                        $updated_row['config'] = json_decode($updated_row['config'], true);
                    }
                    if (isset($updated_row['questions']) && is_string($updated_row['questions'])) {
                        $updated_row['questions'] = json_decode($updated_row['questions'], true);
                    }
                    if (isset($updated_row['features']) && is_string($updated_row['features'])) {
                        $updated_row['features'] = json_decode($updated_row['features'], true);
                    }
                    if (isset($updated_row['value']) && is_string($updated_row['value'])) {
                        $updated_row['value'] = json_decode($updated_row['value'], true);
                    }
                    $results[] = $updated_row;
                } else {
                    $results[] = $processed_row;
                }
            } else {
                $results[] = $processed_row;
            }
        }
        
        $returned_data = $is_multiple ? $results : (count($results) > 0 ? $results[0] : null);
        echo json_encode(["data" => $returned_data, "error" => null]);
        
    } elseif ($action === 'delete') {
        // Build WHERE clause
        $where_clauses = [];
        $params = [];
        $filters = isset($input['filters']) ? $input['filters'] : [];
        
        foreach ($filters as $index => $filter) {
            $col = preg_replace('/[^a-zA-Z0-9_]/', '', $filter['column']);
            $op = strtolower($filter['op']);
            $val = $filter['value'];
            $param_name = ":f_" . $col . "_" . $index;
            
            if ($op === 'eq') {
                $where_clauses[] = "`$col` = $param_name";
                $params[$param_name] = $val;
            } elseif ($op === 'neq') {
                $where_clauses[] = "`$col` != $param_name";
                $params[$param_name] = $val;
            } elseif ($op === 'is') {
                if ($val === null || strtolower($val) === 'null') {
                    $where_clauses[] = "`$col` IS NULL";
                } else {
                    $where_clauses[] = "`$col` IS NOT NULL";
                }
            }
        }
        
        if (count($where_clauses) === 0) {
            throw new Exception("Safe check: DELETE requires filters.");
        }
        
        $sql = "DELETE FROM `$table` WHERE " . implode(" AND ", $where_clauses);
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(["data" => null, "error" => null]);
    } else {
        http_response_code(405);
        echo json_encode(["error" => "Action '$action' not supported."]);
    }
} catch (Throwable $e) {
    http_response_code(400);
    $msg = $e->getMessage();
    if (strpos($msg, 'Duplicate entry') !== false) {
        $msg = "An account with this email address already exists.";
    }
    echo json_encode(["data" => null, "error" => ["message" => $msg]]);
}
?>
