<?php
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
            http_response_code(404);
            echo json_encode(["error" => "User not found in directory. Please enroll first."]);
            exit;
        }
        
        if ($user['password'] !== $password) {
            http_response_code(401);
            echo json_encode(["error" => "Invalid security key."]);
            exit;
        }
        
        if ($user['status'] !== 'approved') {
            http_response_code(403);
            echo json_encode(["error" => "Your account is pending approval from the administrator."]);
            exit;
        }
        
        echo json_encode([
            "success" => true,
            "user" => [
                "id" => $user['id'],
                "email" => $user['email'],
                "full_name" => $user['full_name'],
                "role" => $user['role'],
                "status" => $user['status']
            ]
        ]);
        
    } elseif ($action === 'signup') {
        $fullName = isset($input['fullName']) ? trim($input['fullName']) : '';
        $email = isset($input['email']) ? strtolower(trim($input['email'])) : '';
        $password = isset($input['password']) ? $input['password'] : '';
        
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
        $status = 'pending'; // Requires admin approval
        
        $stmt = $conn->prepare("INSERT INTO profiles (id, email, full_name, password, role, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $email, $fullName, $password, $role, $status]);
        
        echo json_encode([
            "success" => true,
            "message" => "Enrollment initialized. Awaiting admin approval."
        ]);
        
    } else {
        http_response_code(405);
        echo json_encode(["error" => "Invalid action."]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
