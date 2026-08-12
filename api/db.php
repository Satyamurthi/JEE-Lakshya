<?php
// Enable CORS dynamically for web apps, netlify, and mobile apps (whitelisted)
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://jeelakshya.netlify.app',
];
$is_allowed = false;
if (empty($origin)) {
    $is_allowed = true; // Non-browser clients (like postman or curl)
} elseif (in_array($origin, $allowed_origins)) {
    $is_allowed = true;
}

if ($is_allowed && !empty($origin)) {
    header("Access-Control-Allow-Origin: " . $origin);
} else {
    header("Access-Control-Allow-Origin: http://localhost:3000"); // Safe fallback
}
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Active-Stream, x-active-stream");
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
    // Log the detailed error securely on the server
    error_log("[Database Connection Error] " . $exception->getMessage());
    echo json_encode([
        "error"   => "Database connection failure. Please try again later.",
        "db"      => $db_name
    ]);
    exit(0);
}

if (!function_exists('get_db_connection')) {
    function get_db_connection(string $dbname): PDO {
        global $host, $port, $username, $password;
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT            => 5,
        ];
        if (defined('PDO::MYSQL_ATTR_INIT_COMMAND')) {
            $options[PDO::MYSQL_ATTR_INIT_COMMAND] = "SET NAMES utf8mb4";
        }
        return new PDO($dsn, $username, $password, $options);
    }
}

if (!function_exists('resolve_user_from_token')) {
    function resolve_user_from_token(?string $token, string $active_stream_db_name): ?array {
        if (empty($token)) {
            return null;
        }

        if ($token === 'temp-local-id' || $token === 'guest') {
            return ['id' => $token, 'role' => 'student', 'status' => 'approved'];
        }

        global $conn; // Active stream DB connection
        
        try {
            // 1. Query the active stream DB first for the session token
            $stmt = $conn->prepare("SELECT * FROM profiles WHERE session_token = ?");
            $stmt->execute([$token]);
            $user_profile = $stmt->fetch();

            if ($user_profile) {
                // Check if session has expired
                if (isset($user_profile['session_expires_at'])) {
                    $expiry = strtotime($user_profile['session_expires_at']);
                    if ($expiry !== false && $expiry < time()) {
                        return null; // Session expired
                    }
                }
                return $user_profile;
            }

            // 2. If not found and active stream is not already jee_nexus, fall back to checking jee_nexus
            if ($active_stream_db_name !== 'jee_nexus') {
                $fb_conn = get_db_connection('jee_nexus');
                $stmt = $fb_conn->prepare("SELECT * FROM profiles WHERE session_token = ?");
                $stmt->execute([$token]);
                $user_profile = $stmt->fetch();

                if ($user_profile && $user_profile['role'] === 'super_admin') {
                    // Check if session has expired
                    if (isset($user_profile['session_expires_at'])) {
                        $expiry = strtotime($user_profile['session_expires_at']);
                        if ($expiry !== false && $expiry < time()) {
                            return null; // Session expired
                        }
                    }
                    return $user_profile;
                }
            }
        } catch (Exception $e) {
            // Return null on database errors
        }

        return null;
    }
}
?>