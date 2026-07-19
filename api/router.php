<?php
// Global CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Active-Stream, apikey, prefer, Range");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

// If it's an OPTIONS request, exit immediately with 200 OK
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Resolve the requested file path
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . '/..' . $uri;

// If file exists, serve or include it
if (is_file($file)) {
    if (pathinfo($file, PATHINFO_EXTENSION) === 'php') {
        include $file;
    } else {
        // Let the server serve the static file directly
        return false;
    }
} else {
    // Try without folder mapping in case the PHP working directory differs
    $file_root = $_SERVER['DOCUMENT_ROOT'] . $uri;
    if (is_file($file_root)) {
        if (pathinfo($file_root, PATHINFO_EXTENSION) === 'php') {
            include $file_root;
        } else {
            return false;
        }
    } else {
        http_response_code(404);
        echo json_encode(["error" => "Not Found", "path" => $uri]);
    }
}
?>
