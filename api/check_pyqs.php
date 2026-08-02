<?php
header("Content-Type: application/json");
try {
    $conn = new PDO("mysql:host=127.0.0.1;dbname=jee_nexus;charset=utf8mb4", "root", "");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $total = (int)$conn->query("SELECT COUNT(*) FROM `questions`")->fetchColumn();
    $pyqs = (int)$conn->query("SELECT COUNT(*) FROM `questions` WHERE `year` IS NOT NULL OR (`paper_id` IS NOT NULL AND `paper_id` != '')")->fetchColumn();
    $non_pyqs = (int)$conn->query("SELECT COUNT(*) FROM `questions` WHERE `year` IS NULL AND (`paper_id` IS NULL OR `paper_id` = '')")->fetchColumn();

    echo json_encode([
        "total" => $total,
        "pyqs" => $pyqs,
        "non_pyqs" => $non_pyqs
    ]);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>
