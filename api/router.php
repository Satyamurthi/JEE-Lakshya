<?php
// Global CORS headers for all environments & proxies
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Max-Age: 86400");
header("Connection: close");

// If it's an OPTIONS request, exit immediately with 200 OK
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Resolve the requested URI path
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base = basename($uri);

// 1. Direct lookup in current /api directory
if ($base && $base !== 'router.php') {
    $api_file = __DIR__ . DIRECTORY_SEPARATOR . $base;
    if (is_file($api_file) && pathinfo($api_file, PATHINFO_EXTENSION) === 'php') {
        include $api_file;
        exit(0);
    }
}

// 2. Relative to project root
$rel_file = __DIR__ . '/..' . $uri;
if (is_file($rel_file)) {
    if (pathinfo($rel_file, PATHINFO_EXTENSION) === 'php') {
        if (realpath($rel_file) !== realpath(__FILE__)) {
            include $rel_file;
            exit(0);
        }
    } else {
        return false;
    }
}

// 3. Document Root relative lookup
$doc_root = $_SERVER['DOCUMENT_ROOT'] ?? '';
if ($doc_root) {
    $doc_file = $doc_root . $uri;
    if (is_file($doc_file)) {
        if (pathinfo($doc_file, PATHINFO_EXTENSION) === 'php') {
            if (realpath($doc_file) !== realpath(__FILE__)) {
                include $doc_file;
                exit(0);
            }
        } else {
            return false;
        }
    }
}

http_response_code(404);
echo json_encode(["error" => "Not Found", "path" => $uri]);
?>
