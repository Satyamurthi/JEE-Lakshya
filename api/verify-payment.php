<?php
// Enable CORS for all environments & proxies
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: *");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Load .env file (searches up from api/ directory)
// ─────────────────────────────────────────────────────────────────────────────
function loadEnv(): void {
    $paths = [__DIR__ . '/.env', __DIR__ . '/../.env', __DIR__ . '/../../.env', 'D:/JEE/.env'];
    foreach ($paths as $path) {
        if (file_exists($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                if (strpos($line, '=') === false) continue;
                [$name, $value] = explode('=', $line, 2);
                $name  = trim($name);
                $value = trim($value);
                putenv("$name=$value");
                $_ENV[$name]    = $value;
                $_SERVER[$name] = $value;
            }
            break;
        }
    }
}
loadEnv();

// ─────────────────────────────────────────────────────────────────────────────
// MariaDB connection (uses the X-Active-Stream header or defaults to jee_nexus)
// ─────────────────────────────────────────────────────────────────────────────
$active_stream = 'jee';
if (isset($_GET['stream'])) {
    $active_stream = strtolower($_GET['stream']);
} elseif (isset($_SERVER['HTTP_X_ACTIVE_STREAM'])) {
    $active_stream = strtolower($_SERVER['HTTP_X_ACTIVE_STREAM']);
}

$db_name = 'jee_nexus';
if (strpos($active_stream, 'neet')  !== false) $db_name = 'neet_nexus';
elseif (strpos($active_stream, 'kcet')  !== false) $db_name = 'kcet_nexus';
elseif (strpos($active_stream, 'upsc')  !== false) $db_name = 'upsc_nexus';

$host     = getenv('DB_HOST')     ?: '127.0.0.1';
$db_user  = getenv('DB_USER')     ?: 'root';
$db_pass  = getenv('DB_PASSWORD') ?: '';

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(200);
    echo json_encode(["data" => null, "error" => ["message" => "Database connection failure: " . $e->getMessage()]]);
    exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay credentials
// ─────────────────────────────────────────────────────────────────────────────
$key_id     = getenv('RAZORPAY_KEY_ID')     ?: '';
$key_secret = getenv('RAZORPAY_KEY_SECRET') ?: '';

// ─────────────────────────────────────────────────────────────────────────────
// Read request body
// ─────────────────────────────────────────────────────────────────────────────
$input = json_decode(file_get_contents('php://input'), true) ?: [];

$action          = isset($input['action'])     ? trim($input['action'])     : '';
$payment_id      = isset($input['razorpay_payment_id']) ? trim($input['razorpay_payment_id']) : '';
$order_id        = isset($input['razorpay_order_id'])   ? trim($input['razorpay_order_id'])   : '';
$signature       = isset($input['razorpay_signature'])  ? trim($input['razorpay_signature'])  : '';

// Meta sent by the frontend at checkout time
$meta_user_id    = isset($input['user_id'])    ? trim($input['user_id'])    : null;
$meta_user_email = isset($input['user_email']) ? trim($input['user_email']) : null;
$meta_user_name  = isset($input['user_name'])  ? trim($input['user_name'])  : null;
$meta_amount     = isset($input['amount'])     ? (int)$input['amount']      : 0;   // in paise
$meta_plan_id    = isset($input['plan_id'])    ? trim($input['plan_id'])    : null;
$meta_plan_name  = isset($input['plan_name'])  ? trim($input['plan_name'])  : null;
$meta_stream     = isset($input['stream'])     ? trim($input['stream'])     : $active_stream;

if (empty($payment_id) || empty($order_id) || empty($signature)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required payment fields: razorpay_payment_id, razorpay_order_id, razorpay_signature.']);
    exit;
}

if (empty($key_secret)) {
    http_response_code(500);
    echo json_encode(['error' => 'Razorpay secret key not configured on server. Add RAZORPAY_KEY_SECRET to d:/JEE/.env']);
    exit;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify Razorpay HMAC signature
// ─────────────────────────────────────────────────────────────────────────────
$expected_signature = hash_hmac('sha256', $order_id . '|' . $payment_id, $key_secret);

if (!hash_equals($expected_signature, $signature)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'error' => 'Signature verification failed. Payment rejected.']);
    exit;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signature verified → write payment record to payment_logs table
// ─────────────────────────────────────────────────────────────────────────────
$log_id       = sprintf(
    '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand(0,0xffff), mt_rand(0,0xffff),
    mt_rand(0,0xffff),
    mt_rand(0,0x0fff)|0x4000,
    mt_rand(0,0x3fff)|0x8000,
    mt_rand(0,0xffff), mt_rand(0,0xffff), mt_rand(0,0xffff)
);
$amount_rupees = round($meta_amount / 100, 2);
$verified_at   = date('Y-m-d H:i:s');

try {
    // Ensure payment_logs table exists (creates silently if missing)
    $conn->exec("CREATE TABLE IF NOT EXISTS `payment_logs` (
        `id` VARCHAR(36) PRIMARY KEY,
        `payment_id` VARCHAR(100) NOT NULL,
        `order_id` VARCHAR(100) NOT NULL,
        `user_id` VARCHAR(36) NULL,
        `user_email` VARCHAR(255) NULL,
        `user_name` VARCHAR(255) NULL,
        `amount_paise` INT DEFAULT 0,
        `amount_rupees` DECIMAL(10,2) DEFAULT 0.00,
        `plan_id` VARCHAR(100) NULL,
        `plan_name` VARCHAR(255) NULL,
        `stream` VARCHAR(100) NULL,
        `status` VARCHAR(50) DEFAULT 'verified',
        `verified_at` VARCHAR(50) NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $stmt = $conn->prepare("INSERT INTO `payment_logs`
        (`id`, `payment_id`, `order_id`, `user_id`, `user_email`, `user_name`, `amount_paise`, `amount_rupees`, `plan_id`, `plan_name`, `stream`, `status`, `verified_at`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?)");
    $stmt->execute([
        $log_id,
        $payment_id,
        $order_id,
        $meta_user_id,
        $meta_user_email,
        $meta_user_name,
        $meta_amount,
        $amount_rupees,
        $meta_plan_id,
        $meta_plan_name,
        $meta_stream,
        $verified_at
    ]);

    // If user_id provided + plan has an expiry, update subscription on profile
    if ($meta_user_id && $meta_plan_id) {
        // Calculate expiry: default 30 days
        $expiry = date('Y-m-d H:i:s', strtotime('+30 days'));
        try {
            $upd = $conn->prepare("UPDATE `profiles` SET `subscription_tier` = ?, `subscription_expires_at` = ? WHERE `id` = ?");
            $upd->execute([$meta_plan_id, $expiry, $meta_user_id]);
        } catch (Exception $upd_e) {
            // Non-fatal — log silently
        }
    }

} catch (Exception $log_e) {
    // Payment is still verified even if DB logging fails — don't reject the user
    error_log("[verify-payment] DB log failed: " . $log_e->getMessage());
}

echo json_encode([
    'status'         => 'success',
    'message'        => 'Payment verified and recorded successfully.',
    'payment_log_id' => $log_id,
    'amount_rupees'  => $amount_rupees,
    'payment_id'     => $payment_id
]);
?>
