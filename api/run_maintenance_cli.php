<?php
header("Content-Type: application/json");
$php_path = "C:\\Users\\Administrator\\AppData\\Local\\Microsoft\\WinGet\\Packages\\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\\php.exe";
$script = "d:\\JEE\\api\\db_maintenance.php";
$action = isset($_GET['action']) ? $_GET['action'] : 'backup';

if ($action !== 'backup' && $action !== 'cleanup') {
    echo json_encode(["success" => false, "error" => "Invalid action. Use action=backup or action=cleanup"]);
    exit;
}

// Run in the background via cmd start /B
$cmd = 'cmd /c start /B "" "' . $php_path . '" "' . $script . '" ' . escapeshellarg($action) . ' > "d:\\JEE\\maintenance_debug.log" 2>&1';
pclose(popen($cmd, "r"));

echo json_encode([
    "success" => true,
    "message" => "Background PHP CLI process triggered successfully.",
    "action" => $action,
    "command" => $cmd
]);
?>
