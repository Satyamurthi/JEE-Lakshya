<?php
// Global CORS headers for all environments & proxies
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Max-Age: 86400");

// If it's an OPTIONS request, exit immediately with 200 OK
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Resolve the requested file path
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . '/..' . $uri;

// Prevent recursive inclusion of the router itself
if (realpath($file) === realpath(__FILE__)) {
    return false;
}

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
