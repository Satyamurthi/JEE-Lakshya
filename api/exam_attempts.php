<?php
require_once __DIR__ . '/db.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';
$input = json_decode(file_get_contents('php://input'), true) ?: [];

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $userId = isset($input['user_id']) ? trim($input['user_id']) : '';
        $userName = isset($input['user_name']) ? trim($input['user_name']) : '';
        $score = isset($input['score']) ? (int)$input['score'] : 0;
        $totalMarks = isset($input['total_marks']) ? (int)$input['total_marks'] : 0;
        $accuracy = isset($input['accuracy']) ? (int)$input['accuracy'] : 0;
        
        $config = isset($input['config']) ? json_encode($input['config']) : '{}';
        $questions = isset($input['questions']) ? json_encode($input['questions']) : '[]';
        
        if (empty($userId)) {
            http_response_code(400);
            echo json_encode(["error" => "User ID is required."]);
            exit;
        }
        
        $attemptId = bin2hex(random_bytes(16));
        $attemptId = substr($attemptId, 0, 8) . '-' . substr($attemptId, 8, 4) . '-' . substr($attemptId, 12, 4) . '-' . substr($attemptId, 16, 4) . '-' . substr($attemptId, 20, 12);
        
        $stmt = $conn->prepare("INSERT INTO exam_attempts (id, user_id, user_name, score, total_marks, accuracy, config, questions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$attemptId, $userId, $userName, $score, $totalMarks, $accuracy, $config, $questions]);
        
        echo json_encode([
            "success" => true,
            "data" => [
                "id" => $attemptId,
                "user_id" => $userId,
                "score" => $score,
                "total_marks" => $totalMarks
            ]
        ]);
    } else {
        // GET attempts for a user
        $userId = isset($_GET['user_id']) ? trim($_GET['user_id']) : '';
        if (empty($userId)) {
            http_response_code(400);
            echo json_encode(["error" => "User ID is required."]);
            exit;
        }
        
        $stmt = $conn->prepare("SELECT * FROM exam_attempts WHERE user_id = ? ORDER BY submitted_at DESC");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();
        
        $result = [];
        foreach ($rows as $row) {
            $row['config'] = json_decode($row['config'], true);
            $row['questions'] = json_decode($row['questions'], true);
            $result[] = $row;
        }
        
        echo json_encode($result);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
