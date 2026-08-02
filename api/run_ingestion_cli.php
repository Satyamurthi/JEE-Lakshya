<?php
header("Content-Type: application/json");
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

    $user_profile = null;
    if (!empty($token)) {
        $stmt = $conn->prepare("SELECT * FROM profiles WHERE session_token = ?");
        $stmt->execute([$token]);
        $user_profile = $stmt->fetch();
        
        if ($user_profile && isset($user_profile['session_expires_at'])) {
            $expiry = strtotime($user_profile['session_expires_at']);
            if ($expiry !== false && $expiry < time()) {
                $user_profile = null;
            }
        }
    }

    if (!$user_profile || $user_profile['role'] !== 'super_admin') {
        http_response_code(403);
        echo json_encode(["error" => "Forbidden: This action requires Super Admin authorization."]);
        exit;
    }
}

$php_path = getenv('PHP_PATH') ?: 'php';
$script = realpath(__DIR__ . '/ingest_questions.php');
$log_path = realpath(__DIR__ . '/..') . '/ingest_debug.log';

$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5000;

// Windows CMD outer-quoting syntax alignment
$cmd = 'cmd /c ""' . $php_path . '" "' . $script . '" --limit=' . $limit . ' > "' . $log_path . '" 2>&1"';
pclose(popen($cmd, "r"));

echo json_encode([
    "success" => true,
    "message" => "Ingestion process triggered in background.",
    "limit" => $limit,
    "command" => $cmd
]);
?>
