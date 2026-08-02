<?php
set_time_limit(60);
ob_start();
require_once __DIR__ . '/db.php';


$action = isset($_GET['action']) ? $_GET['action'] : '';

// Read JSON input
$input = json_decode(file_get_contents('php://input'), true) ?: [];

try {
    if ($action === 'login') {
        $email = isset($input['email']) ? strtolower(trim($input['email'])) : '';
        $password = isset($input['password']) ? $input['password'] : '';
        
        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(["error" => "Email and security key are required."]);
            exit;
        }
        
        $stmt = $conn->prepare("SELECT * FROM profiles WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(["error" => "Invalid credentials."]);
            exit;
        }
        
        // Brute force lockout check
        if ($user['status'] === 'blocked' || (isset($user['failed_attempts']) && $user['failed_attempts'] >= 5)) {
            if ($user['status'] !== 'blocked') {
                $conn->prepare("UPDATE profiles SET status = 'blocked' WHERE email = ?")->execute([$email]);
            }
            http_response_code(403);
            echo json_encode(["error" => "Account locked due to multiple failed login attempts. Please verify with your Email ID and reset your password."]);
        }
        
        $passwordMatches = false;
        $legacyMatches = false;
        
        if (password_verify($password, $user['password'])) {
            $passwordMatches = true;
        } elseif ($user['password'] === $password) {
            $passwordMatches = true;
            $legacyMatches = true;
        }

        if (!$passwordMatches) {
            $newAttempts = ($user['failed_attempts'] ?? 0) + 1;
            $conn->prepare("UPDATE profiles SET failed_attempts = ? WHERE email = ?")->execute([$newAttempts, $email]);
            
            if ($newAttempts >= 5) {
                $conn->prepare("UPDATE profiles SET status = 'blocked' WHERE email = ?")->execute([$email]);
                http_response_code(403);
                echo json_encode(["error" => "Account locked due to multiple failed login attempts. Please verify with your Email ID and reset your password."]);
            } else {
                http_response_code(401);
                echo json_encode(["error" => "Invalid credentials."]);
            }
            exit;
        }
        
        if ($user['status'] !== 'approved') {
            http_response_code(403);
            echo json_encode(["error" => "Your account is pending approval from the administrator."]);
            exit;
        }
        
        // Dynamic hashing upgrade for plaintext legacy passwords
        if ($legacyMatches) {
            $newHash = password_hash($password, PASSWORD_BCRYPT);
            $conn->prepare("UPDATE profiles SET password = ? WHERE email = ?")->execute([$newHash, $email]);
        }
        
        // Generate a cryptographically secure 30-day session token
        $sessionToken = bin2hex(random_bytes(32));
        $sessionExpiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        
        $conn->prepare("UPDATE profiles SET failed_attempts = 0, session_token = ?, session_expires_at = ? WHERE email = ?")->execute([$sessionToken, $sessionExpiresAt, $email]);
        
        $userData = $user;
        unset($userData['password']);
        $userData['session_token'] = $sessionToken;
        $userData['session_expires_at'] = $sessionExpiresAt;
        
        echo json_encode([
            "success" => true,
            "user" => $userData
        ]);
        exit;
        
    } elseif ($action === 'reset_password') {
        // Block anonymous public resets (access through cloudflare/serveo public tunnel)
        $is_proxied = isset($_SERVER['HTTP_CF_CONNECTING_IP']) || isset($_SERVER['HTTP_X_FORWARDED_FOR']);
        if ($is_proxied) {
            http_response_code(403);
            echo json_encode(["error" => "Password resets are disabled via public tunnel for security. Please contact your coach/administrator."]);
            exit;
        }

        $email = isset($input['email']) ? strtolower(trim($input['email'])) : '';
        $newPassword = isset($input['password']) ? $input['password'] : '';
        
        if (empty($email) || empty($newPassword)) {
            http_response_code(400);
            echo json_encode(["error" => "Email and new password are required."]);
            exit;
        }
        
        $stmt = $conn->prepare("SELECT * FROM profiles WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(["error" => "Email address not found."]);
            exit;
        }
        
        // Hash the new password securely
        $hashed = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $conn->prepare("UPDATE profiles SET password = ?, status = 'approved', failed_attempts = 0 WHERE email = ?");
        $stmt->execute([$hashed, $email]);
        
        echo json_encode([
            "success" => true,
            "message" => "Password changed and account unlocked successfully!"
        ]);
        exit;

        
    } elseif ($action === 'signup') {
        $fullName = isset($input['fullName']) ? trim($input['fullName']) : '';
        $email = isset($input['email']) ? strtolower(trim($input['email'])) : '';
        $password = isset($input['password']) ? $input['password'] : '';
        $mobileNumber = isset($input['mobileNumber']) ? trim($input['mobileNumber']) : null;
        $collegeName = isset($input['collegeName']) ? trim($input['collegeName']) : null;
        $collegeAddress = isset($input['collegeAddress']) ? trim($input['collegeAddress']) : null;
        $stream = isset($input['stream']) ? trim($input['stream']) : 'JEE Main & Advanced';
        
        if (empty($fullName) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(["error" => "All enrollment fields are required."]);
            exit;
        }
        
        // Check if user already exists
        $stmt = $conn->prepare("SELECT id FROM profiles WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(["error" => "Email is already registered. Please login."]);
            exit;
        }
        
        // Generate random UUID
        $userId = bin2hex(random_bytes(16));
        $userId = substr($userId, 0, 8) . '-' . substr($userId, 8, 4) . '-' . substr($userId, 12, 4) . '-' . substr($userId, 16, 4) . '-' . substr($userId, 20, 12);
        
        $role = 'student';
        $status = 'approved'; // Instantly active for individual student signups
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        
        $stmt = $conn->prepare("INSERT INTO profiles (id, email, full_name, mobile_number, college_name, college_address, stream, selected_stream, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $email, $fullName, $mobileNumber, $collegeName, $collegeAddress, $stream, $stream, $hashedPassword, $role, $status]);
        
        echo json_encode([
            "success" => true,
            "userId" => $userId,
            "message" => "Registration successful. You can now log in!"
        ]);
        
    } else {
        http_response_code(405);
        echo json_encode(["error" => "Invalid action."]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    // Log the detailed error message server-side securely
    error_log("[auth error] " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    echo json_encode(["error" => "An unexpected authentication error occurred. Please try again later."]);
}
?>
