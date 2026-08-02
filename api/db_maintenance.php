<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
set_time_limit(600); // 10 minutes max limit
ini_set('max_execution_time', 600);

require_once __DIR__ . '/db.php';

// Check if executing via CLI or by an authenticated Super Admin
if (php_sapi_name() !== 'cli') {
    $auth_header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (empty($auth_header) && isset(getallheaders()['Authorization'])) {
        $auth_header = getallheaders()['Authorization'];
    }
    if (empty($auth_header) && isset(getallheaders()['authorization'])) {
        $auth_header = getallheaders()['authorization'];
    }

    $token = '';
    if (preg_match('/Bearer\s(\S+)/i', $auth_header, $matches)) {
        $token = $matches[1];
    }

    $user_profile = resolve_user_from_token($token, $db_name);

    if (!$user_profile || $user_profile['role'] !== 'super_admin') {
        http_response_code(403);
        echo json_encode(["error" => "Forbidden: This action requires Super Admin authorization."]);
        exit;
    }
}

$action = '';
if (php_sapi_name() === 'cli') {
    $action = isset($argv[1]) ? $argv[1] : '';
} else {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
}

if ($action !== 'backup' && $action !== 'cleanup') {
    echo json_encode(["success" => false, "error" => "Invalid action. Use action=backup or action=cleanup"]);
    exit;
}

try {
    $mysql_conn = $conn;

    $sqlite_path = realpath(__DIR__ . '/../jee/DB/jeebakend.DB');
    $sqlite_backup_path = realpath(__DIR__ . '/../jee/DB/jeebakend_backup.DB');
    
    $backup_table = 'questions_backup_' . date('Ymd');

    if ($action === 'backup') {
        // 1. MySQL backup via CREATE TABLE & INSERT
        $mysql_conn->exec("CREATE TABLE IF NOT EXISTS `$backup_table` LIKE `questions`;");
        $mysql_conn->exec("TRUNCATE TABLE `$backup_table`;");
        
        // Copy rows in a single query
        $mysql_conn->exec("INSERT INTO `$backup_table` SELECT * FROM `questions`;");

        // Verify count matches
        $count_orig = (int)$mysql_conn->query("SELECT COUNT(*) FROM `questions`")->fetchColumn();
        $count_backup = (int)$mysql_conn->query("SELECT COUNT(*) FROM `$backup_table`")->fetchColumn();

        echo json_encode([
            "success" => true,
            "mysql_backup" => "Success",
            "original_count" => $count_orig,
            "backup_count" => $count_backup,
            "verified" => ($count_orig === $count_backup) ? "YES" : "NO"
        ]);
        exit;
    }

    if ($action === 'cleanup') {
        // Pre-check: Ensure the backup table exists and contains records before running deletes
        $table_check = $mysql_conn->query("SHOW TABLES LIKE '$backup_table'")->fetch();
        if (!$table_check) {
            echo json_encode(["success" => false, "error" => "Backup table $backup_table does not exist. Run backup first!"]);
            exit;
        }

        $backup_count = (int)$mysql_conn->query("SELECT COUNT(*) FROM `$backup_table`")->fetchColumn();
        if ($backup_count === 0) {
            echo json_encode(["success" => false, "error" => "Backup table is empty. Run backup first!"]);
            exit;
        }

        // 1. Clean MySQL database (Delete non-PYQ questions)
        $mysql_del = $mysql_conn->exec("DELETE FROM `questions` WHERE `year` IS NULL AND (`paper_id` IS NULL OR `paper_id` = '');");

        $mysql_rem = (int)$mysql_conn->query("SELECT COUNT(*) FROM `questions`")->fetchColumn();
        
        echo json_encode([
            "success" => true,
            "mysql_deleted" => $mysql_del,
            "mysql_remaining" => $mysql_rem
        ]);
        exit;
    }
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
