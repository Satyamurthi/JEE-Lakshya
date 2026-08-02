<?php
// ─────────────────────────────────────────────────────────────────────────────
// Secure AI Proxy Endpoint - api/ai.php
// ─────────────────────────────────────────────────────────────────────────────

require_once __DIR__ . '/db.php';

// Enable environment variable loader
if (!function_exists('loadEnv')) {
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
}
loadEnv();

// 1. Extract Token from Authorization header
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

// 2. Lookup user profile
$user_profile = resolve_user_from_token($token, $db_name);

if (!$user_profile) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized access. Please log in again."]);
    exit;
}

// 3. Read request body
$input = json_decode(file_get_contents('php://input'), true) ?: [];

$prompt            = isset($input['prompt'])            ? $input['prompt']            : '';
$systemInstruction = isset($input['systemInstruction']) ? $input['systemInstruction'] : '';
$responseSchema    = isset($input['responseSchema'])    ? $input['responseSchema']    : null;
$custom_api_key    = isset($input['apiKey'])            ? trim($input['apiKey'])      : '';
$model             = isset($input['model'])             ? trim($input['model'])       : '';

if (empty($prompt)) {
    http_response_code(400);
    echo json_encode(["error" => "Prompt is required."]);
    exit;
}

// Helpers for API key verification
if (!function_exists('isNvidiaKey')) {
    function isNvidiaKey($key) {
        $clean = trim($key);
        if (stripos($clean, 'nvapi-') !== false) return true;
        if (strpos($clean, 'AIzaSy') === 0) return false;
        if (strpos($clean, 'AQ.') === 0) return false;
        return true;
    }
}

if (!function_exists('callNvidiaAPI')) {
    function callNvidiaAPI($apiKey, $prompt, $systemInstruction, $modelName) {
        $cleanKey = trim($apiKey);
        if (stripos($cleanKey, 'bearer ') === 0) {
            $cleanKey = trim(substr($cleanKey, 7));
        }
        if (strpos($cleanKey, 'nvapi-') !== 0 && strpos($cleanKey, 'AIzaSy') !== 0 && strpos($cleanKey, 'AQ.') !== 0) {
            $cleanKey = 'nvapi-' . $cleanKey;
        }
        
        $headers = [
            'Authorization: Bearer ' . $cleanKey,
            'Content-Type: application/json',
            'Accept: application/json'
        ];
        
        $body = [
            "model" => $modelName ?: "google/gemma-4-31b-it",
            "messages" => [
                ["role" => "system", "content" => $systemInstruction],
                ["role" => "user", "content" => $prompt]
            ],
            "max_tokens" => 4096,
            "stream" => false
        ];
        
        $ch = curl_init('https://integrate.api.nvidia.com/v1/chat/completions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $res = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200) {
            $data = json_decode($res, true);
            $content = $data['choices'][0]['message']['content'] ?? '';
            if ($content) {
                return $content;
            }
        }
        
        throw new Exception("Nvidia API failure (HTTP $http_code): " . $res);
    }
}

if (!function_exists('callGeminiAPI')) {
    function callGeminiAPI($apiKey, $modelName, $prompt, $systemInstruction, $responseSchema) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/" . urlencode($modelName) . ":generateContent?key=" . urlencode($apiKey);
        
        $parts = is_array($prompt) ? $prompt : [["text" => (string)$prompt]];
        $body = [
            "contents" => [
                [
                    "parts" => $parts
                ]
            ]
        ];
        
        $generationConfig = [
            "temperature" => 0.8,
            "topP" => 0.9
        ];
        
        if ($responseSchema) {
            $generationConfig["responseMimeType"] = "application/json";
            $generationConfig["responseSchema"] = $responseSchema;
        }
        
        $body["generationConfig"] = $generationConfig;
        
        if ($systemInstruction) {
            $body["systemInstruction"] = [
                "parts" => [
                    ["text" => $systemInstruction]
                ]
            ];
        }
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $res = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200) {
            $data = json_decode($res, true);
            $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
            if ($text) {
                return $text;
            }
        }
        
        throw new Exception("Gemini API model $modelName failure (HTTP $http_code): " . $res);
    }
}

if (!function_exists('callGeminiWithFallback')) {
    function callGeminiWithFallback($apiKey, $prompt, $systemInstruction, $responseSchema) {
        $models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
        $last_err = null;
        
        foreach ($models as $m) {
            for ($attempt = 1; $attempt <= 2; $attempt++) {
                try {
                    return callGeminiAPI($apiKey, $m, $prompt, $systemInstruction, $responseSchema);
                } catch (Exception $e) {
                    $last_err = $e;
                    usleep($attempt * 500000); // 0.5s, 1s
                }
            }
        }
        
        throw $last_err ?: new Exception("All Gemini models failed.");
    }
}

// 4. Resolve active API key
$active_key = $custom_api_key;
if (empty($active_key)) {
    // Check server environment fallbacks
    $active_key = getenv('GEMINI_API_KEY') ?: getenv('VITE_GEMINI_API_KEY');
}

if (empty($active_key)) {
    http_response_code(400);
    echo json_encode(["error" => "No API key configured on client or server."]);
    exit;
}

try {
    if (isNvidiaKey($active_key)) {
        $response_text = callNvidiaAPI($active_key, $prompt, $systemInstruction, $model);
    } else {
        $response_text = callGeminiWithFallback($active_key, $prompt, $systemInstruction, $responseSchema);
    }
    
    echo json_encode(["text" => $response_text, "success" => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage(), "success" => false]);
}
?>
