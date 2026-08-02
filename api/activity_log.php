<?php
/**
 * activity_log.php
 * Write-only endpoint. Records user activity events to the activity_log table.
 * Called fire-and-forget from the frontend (errors are silently swallowed).
 *
 * POST body:
 *   {
 *     "user_id":    "uuid",
 *     "user_email": "email@example.com",
 *     "user_name":  "Student Name",
 *     "event_type": "login" | "exam_start" | "exam_submit" | "daily_submit" | "practice_start" | "page_view",
 *     "stream":     "JEE Main & Advanced",
 *     "metadata":   { ...any extra context... }
 *   }
 */

require_once __DIR__ . '/db.php';

ini_set('display_errors', 0);
error_reporting(E_ALL);

$input = json_decode(file_get_contents('php://input'), true) ?: [];

$user_id    = isset($input['user_id'])    ? trim($input['user_id'])    : '';
$user_email = isset($input['user_email']) ? trim($input['user_email']) : null;
$user_name  = isset($input['user_name'])  ? trim($input['user_name'])  : null;
$event_type = isset($input['event_type']) ? trim($input['event_type']) : '';
$stream     = isset($input['stream'])     ? trim($input['stream'])     : null;
$metadata   = isset($input['metadata'])   ? $input['metadata']         : null;

// Detect client IP (works behind Cloudflare / Serveo tunnel)
$ip_address = $_SERVER['HTTP_CF_CONNECTING_IP']
           ?? $_SERVER['HTTP_X_FORWARDED_FOR']
           ?? $_SERVER['REMOTE_ADDR']
           ?? null;
if ($ip_address && strpos($ip_address, ',') !== false) {
    $ip_address = trim(explode(',', $ip_address)[0]); // take first IP if multiple
}
$allowed_events = ['login', 'exam_start', 'exam_submit', 'daily_submit', 'practice_start', 'page_view', 'signup', 'logout'];

if (empty($user_id) || empty($event_type)) {
    http_response_code(400);
    echo json_encode(["error" => "user_id and event_type are required."]);
    exit;
}

if (!in_array($event_type, $allowed_events)) {
    // Accept unknown event types but sanitize
    $event_type = preg_replace('/[^a-z0-9_]/', '', strtolower($event_type));
}

// Extract and verify session token
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
}

$allowed_without_token = ['login', 'signup'];
if (!in_array($event_type, $allowed_without_token) && !$user_profile) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized access."]);
    exit;
}

try {
    $stmt = $conn->prepare("INSERT INTO `activity_log` (`user_id`, `user_email`, `user_name`, `event_type`, `metadata`, `stream`, `ip_address`) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $user_id,
        $user_email,
        $user_name,
        $event_type,
        $metadata !== null ? json_encode($metadata) : null,
        $stream,
        $ip_address
    ]);

    echo json_encode(["success" => true, "event" => $event_type]);

} catch (Throwable $e) {
    // Swallow silently so the frontend never sees activity log errors
    http_response_code(200);
    echo json_encode(["success" => false, "note" => "Activity log write failed silently."]);
}
?>
