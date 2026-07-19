<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: *");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

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

$key_id     = getenv('RAZORPAY_KEY_ID')     ?: '';
$key_secret = getenv('RAZORPAY_KEY_SECRET') ?: '';

if (!$key_id || !$key_secret) {
    http_response_code(500);
    echo json_encode(['error' => 'Razorpay credentials not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to d:/JEE/.env']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];

// Core payment fields
$amount  = isset($input['amount'])  ? (int)$input['amount']    : 0;
$receipt = isset($input['receipt']) ? trim($input['receipt'])  : 'receipt_' . time();

// Metadata forwarded from frontend
$user_id    = isset($input['user_id'])    ? trim($input['user_id'])    : '';
$user_email = isset($input['user_email']) ? trim($input['user_email']) : '';
$user_name  = isset($input['user_name'])  ? trim($input['user_name'])  : '';
$plan_id    = isset($input['plan_id'])    ? trim($input['plan_id'])    : '';
$plan_name  = isset($input['plan_name'])  ? trim($input['plan_name'])  : '';
$stream     = isset($input['stream'])     ? trim($input['stream'])     : 'jee';

if ($amount < 100) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid amount. Minimum is 100 paise (₹1).']);
    exit;
}

// Create Razorpay order
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.razorpay.com/v1/orders');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'amount'   => $amount,
    'currency' => 'INR',
    'receipt'  => $receipt,
    'notes'    => [
        'user_id'    => $user_id,
        'user_email' => $user_email,
        'plan_id'    => $plan_id,
        'stream'     => $stream
    ]
]));
curl_setopt($ch, CURLOPT_USERPWD, $key_id . ':' . $key_secret);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$result    = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL error: ' . curl_error($ch)]);
    curl_close($ch);
    exit;
}
curl_close($ch);

$data = json_decode($result, true);

if ($http_code !== 200) {
    $status_code = ($http_code === 401) ? 401 : 500;
    http_response_code($status_code);
    echo json_encode(['error' => 'Razorpay API returned error', 'details' => $data]);
    exit;
}

// Return order details + user metadata so the frontend can pass them to verify-payment
echo json_encode([
    'order_id'   => $data['id'],
    'amount'     => $data['amount'],
    'currency'   => $data['currency'],
    'key_id'     => $key_id,
    'user_id'    => $user_id,
    'user_email' => $user_email,
    'user_name'  => $user_name,
    'plan_id'    => $plan_id,
    'plan_name'  => $plan_name,
    'stream'     => $stream
]);
?>
