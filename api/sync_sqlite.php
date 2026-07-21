<?php
require_once __DIR__ . '/db.php';

// Disable default PHP error reporting to return clean JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('memory_limit', '512M');

// Read request payload or query parameter
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$action = isset($input['action']) ? trim($input['action']) : (isset($_GET['action']) ? trim($_GET['action']) : 'count');

// Map active stream to SQLite database path
$sqlite_path = "";
if (strpos($active_stream, 'neet') !== false) {
    $sqlite_path = "d:/JEE/neet/DB/questions.db";
} elseif (strpos($active_stream, 'kcet') !== false) {
    $sqlite_path = "d:/JEE/kcet/DB/questions.db";
} elseif (strpos($active_stream, 'upsc') !== false) {
    $sqlite_path = "d:/JEE/upsc/DB/questions.db";
} else {
    $sqlite_path = "d:/JEE/jee/DB/jeebakend.DB";
}

if (!file_exists($sqlite_path)) {
    echo json_encode([
        "success" => false,
        "sqlite_count" => 0,
        "message" => "SQLite database file not found."
    ]);
    exit;
}

try {
    if ($action === 'status') {
        $progress_file = "d:/JEE/sync_progress.json";
        if (file_exists($progress_file)) {
            echo file_get_contents($progress_file);
        } else {
            echo json_encode([
                "status" => "idle",
                "total_processed" => 0,
                "inserted" => 0,
                "skipped" => 0,
                "total_sqlite" => 0,
                "percent" => 0.0
            ]);
        }
        exit;
    }

    // Connect to SQLite
    $sdb = new PDO("sqlite:" . $sqlite_path);
    $sdb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($action === 'count') {
        $sqlite_count = 0;
        if (strpos($active_stream, 'jee') !== false) {
            $sqlite_count = 18014173; // Pre-calculated to prevent slow SQLite index counts
        } else {
            $sqlite_count = (int)$sdb->query("SELECT COUNT(*) FROM questions")->fetchColumn();
        }
        echo json_encode([
            "success" => true,
            "sqlite_count" => $sqlite_count,
            "stream" => $active_stream,
            "message" => "Counted $sqlite_count questions in local SQLite database."
        ]);
        exit;
    }

    if ($action === 'sync') {
        $progress_file = "d:/JEE/sync_progress.json";
        
        if (file_exists($progress_file)) {
            $prog = json_decode(file_get_contents($progress_file), true);
            if (isset($prog['status']) && $prog['status'] === 'syncing') {
                $last_time = isset($prog['last_updated']) ? strtotime($prog['last_updated']) : 0;
                if (time() - $last_time < 60) {
                    echo json_encode([
                        "success" => true,
                        "status" => "syncing",
                        "message" => "Synchronization is already running.",
                        "progress" => $prog
                    ]);
                    exit;
                }
            }
        }

        // Trigger CLI script in background
        $cli_path = "d:\\JEE\\scripts\\sync_jee_mariadb.php";
        $php_path = "C:\\Users\\Administrator\\AppData\\Local\\Microsoft\\WinGet\\Packages\\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\\php.exe";
        $cmd = 'cmd /c start /B "" "' . $php_path . '" "' . $cli_path . '" ' . escapeshellarg($active_stream) . ' > "d:\\JEE\\sync_debug.log" 2>&1';
        pclose(popen($cmd, "r"));

        $est_count = (strpos($active_stream, 'jee') !== false) ? 18014173 : (int)$sdb->query("SELECT COUNT(*) FROM questions")->fetchColumn();
        
        file_put_contents($progress_file, json_encode([
            "status" => "syncing",
            "total_processed" => 0,
            "inserted" => 0,
            "skipped" => 0,
            "total_sqlite" => $est_count,
            "percent" => 0.0,
            "last_updated" => date("Y-m-d H:i:s")
        ]));

        echo json_encode([
            "success" => true,
            "status" => "syncing",
            "message" => "Synchronization started in the background."
        ]);
        exit;
    }

    echo json_encode([
        "success" => false,
        "message" => "Invalid action specified."
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Operation failed.",
        "details" => $e->getMessage()
    ]);
}
?>
