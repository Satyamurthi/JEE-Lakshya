<?php
// Enable CORS for development
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

function loadEnv() {
    $paths = [__DIR__ . '/.env', __DIR__ . '/../.env', __DIR__ . '/../../.env', 'D:/JEE/.env'];
    foreach ($paths as $path) {
        if (file_exists($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                if (strpos($line, '=') === false) continue;
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                    putenv(sprintf('%s=%s', $name, $value));
                    $_ENV[$name] = $value;
                    $_SERVER[$name] = $value;
                }
            }
            break;
        }
    }
}

loadEnv();

$key_secret = getenv('RAZORPAY_KEY_SECRET');

if (!$key_secret) {
    http_response_code(500);
    echo json_encode(['error' => 'Razorpay secret configuration missing']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$payment_id = isset($input['razorpay_payment_id']) ? $input['razorpay_payment_id'] : '';
$order_id = isset($input['razorpay_order_id']) ? $input['razorpay_order_id'] : '';
$signature = isset($input['razorpay_signature']) ? $input['razorpay_signature'] : '';

if (empty($payment_id) || empty($order_id) || empty($signature)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required payment fields.']);
    exit;
}

$expected_signature = hash_hmac('sha256', $order_id . '|' . $payment_id, $key_secret);

if (hash_equals($expected_signature, $signature)) {
    echo json_encode(['status' => 'success', 'message' => 'Payment verified successfully.']);
} else {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'error' => 'Signature verification failed.']);
}
