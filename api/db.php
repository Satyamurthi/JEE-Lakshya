<?php
// Enable CORS dynamically for web apps, netlify, and mobile apps
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
header("Access-Control-Allow-Origin: " . $origin);
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Active-Stream, x-active-stream, *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=UTF-8");
header("Connection: close");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Set PHP execution time limit (60 seconds per request)
set_time_limit(60);
ini_set('max_execution_time', 60);

// Detect active stream
$active_stream = 'jee';
if (isset($_GET['stream'])) {
    $active_stream = strtolower($_GET['stream']);
} elseif (isset($_SERVER['HTTP_X_ACTIVE_STREAM'])) {
    $active_stream = strtolower($_SERVER['HTTP_X_ACTIVE_STREAM']);
} elseif (isset(getallheaders()['X-Active-Stream'])) {
    $active_stream = strtolower(getallheaders()['X-Active-Stream']);
}

// Map stream to MySQL database name
$db_name = "jee_nexus";
if (strpos($active_stream, 'neet') !== false) {
    $db_name = "neet_nexus";
} elseif (strpos($active_stream, 'kcet') !== false) {
    $db_name = "kcet_nexus";
} elseif (strpos($active_stream, 'upsc') !== false) {
    $db_name = "upsc_nexus";
}

$host = "127.0.0.1";
$port = 3306;
$username = "root";
$password = ""; // Default empty password in XAMPP

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$db_name;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT            => 5,       // 5-second connection timeout
    ];
    if (defined('PDO::MYSQL_ATTR_INIT_COMMAND')) {
        $options[PDO::MYSQL_ATTR_INIT_COMMAND] = "SET NAMES utf8mb4";
    }
    $conn = new PDO($dsn, $username, $password, $options);
} catch (PDOException $exception) {
    http_response_code(500);
    echo json_encode([
        "error"   => "Database connection failure.",
        "details" => $exception->getMessage(),
        "db"      => $db_name
    ]);
    exit(0);
}
?>