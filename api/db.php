<?php
// Enable CORS for Vite local development
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Active-Stream");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Detect active stream
$active_stream = 'jee';
if (isset($_GET['stream'])) {
    $active_stream = strtolower($_GET['stream']);
} elseif (isset($_SERVER['HTTP_X_ACTIVE_STREAM'])) {
    $active_stream = strtolower($_SERVER['HTTP_X_ACTIVE_STREAM']);
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
$username = "root";
$password = ""; // Default empty password in XAMPP

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $exception) {
    http_response_code(500);
    echo json_encode([
        "error" => "Database connection failure.",
        "details" => $exception->getMessage()
    ]);
    exit(0);
}
?>