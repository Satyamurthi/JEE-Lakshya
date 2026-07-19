<?php
require_once __DIR__ . '/db.php';

// Disable default PHP error reporting to return clean JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('memory_limit', '512M'); // Safeguard memory limit

// Read request payload or query parameter
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$action = isset($input['action']) ? trim($input['action']) : (isset($_GET['action']) ? trim($_GET['action']) : 'count');

// Map active stream to SQLite database path
$sqlite_path = "";
if (strpos($active_stream, 'neet') !== false) {
    $sqlite_path = "d:/JEE/neet/DB/questions.db";
} elseif (strpos($active_stream, 'kcet') !== false) {
    $sqlite_path = "d:/JEE/kcet/DB/questions.db";
} elseif (strpos($active_stream, 'upsc') !== false) {
    $sqlite_path = "d:/JEE/upsc/DB/questions.db";
} else {
    $sqlite_path = "d:/JEE/jee/DB/questions.db";
}

if (!file_exists($sqlite_path)) {
    echo json_encode([
        "success" => false,
        "sqlite_count" => 0,
        "message" => "SQLite database file not found at " . basename($sqlite_path)
    ]);
    exit;
}

try {
    // Connect to SQLite
    $sdb = new PDO("sqlite:" . $sqlite_path);
    $sdb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Verify if questions table exists
    $has_questions_table = $sdb->query("SELECT name FROM sqlite_master WHERE type='table' AND name='questions'")->fetch();
    if (!$has_questions_table) {
        echo json_encode([
            "success" => true,
            "sqlite_count" => 0,
            "message" => "SQLite database contains no questions table."
        ]);
        exit;
    }

    // Get total count of questions in SQLite
    $sqlite_count = (int)$sdb->query("SELECT COUNT(*) FROM questions")->fetchColumn();

    if ($action === 'count') {
        echo json_encode([
            "success" => true,
            "sqlite_count" => $sqlite_count,
            "stream" => $active_stream,
            "message" => "Counted $sqlite_count questions in local SQLite database."
        ]);
        exit;
    }

    if ($action === 'sync') {
        // Load subjects from SQLite
        $subjects_list = $sdb->query("SELECT * FROM subjects")->fetchAll(PDO::FETCH_ASSOC);
        $subject_map = [];
        foreach ($subjects_list as $sub) {
            $subject_map[$sub['id']] = $sub['name'];
        }

        // Load chapters from SQLite
        $chapters_list = $sdb->query("SELECT * FROM chapters")->fetchAll(PDO::FETCH_ASSOC);
        $chapter_map = [];
        foreach ($chapters_list as $ch) {
            $chapter_map[$ch['id']] = $ch['name'];
        }

        // Fetch existing question statement hashes from MariaDB to prevent duplicates
        $existing_hashes = [];
        $maria_stmt = $conn->query("SELECT statement FROM questions");
        while ($row = $maria_stmt->fetch(PDO::FETCH_ASSOC)) {
            $normalized = strtolower(preg_replace('/[^a-z0-9]/', '', $row['statement']));
            $existing_hashes[md5($normalized)] = true;
        }
        $maria_stmt = null;

        // Setup PDO Transaction for fast batch inserts
        $conn->beginTransaction();

        $inserted_count = 0;
        $skipped_count = 0;

        $insert_sql = "INSERT INTO questions (
            id, subject, chapter, type, difficulty, statement, options, 
            correctAnswer, correct_answer, solution, explanation, 
            concept, markingScheme, paper_id, year
        ) VALUES (
            :id, :subject, :chapter, :type, :difficulty, :statement, :options, 
            :correctAnswer, :correct_answer, :solution, :explanation, 
            :concept, :markingScheme, :paper_id, :year
        )";
        $insert_stmt = $conn->prepare($insert_sql);

        $option_keys = ['A', 'B', 'C', 'D', 'E'];

        // Streaming JOIN query across SQLite questions, options, and solutions
        $query_sql = "
            SELECT q.id as q_id, q.subject_id, q.chapter_id, q.question_text, q.type as q_type, q.difficulty, q.exam_id,
                   o.option_text, o.is_correct,
                   s.explanation_text
            FROM questions q
            LEFT JOIN options o ON q.id = o.question_id
            LEFT JOIN solutions s ON q.id = s.question_id
            ORDER BY q.id ASC, o.id ASC
        ";
        $stmt = $sdb->query($query_sql);

        $current_q = null;
        $current_options = [];

        function flushQuestion($q_meta, $options, &$existing_hashes, $subject_map, $chapter_map, $option_keys, $insert_stmt, &$inserted_count, &$skipped_count) {
            $statement = trim($q_meta['question_text']);
            if (empty($statement)) {
                $skipped_count++;
                return;
            }

            // Deduplication check
            $norm = strtolower(preg_replace('/[^a-z0-9]/', '', $statement));
            $hash = md5($norm);
            if (isset($existing_hashes[$hash])) {
                $skipped_count++;
                return;
            }
            $existing_hashes[$hash] = true;

            $subject_name = isset($subject_map[$q_meta['subject_id']]) ? $subject_map[$q_meta['subject_id']] : 'Physics';
            $chapter_name = isset($chapter_map[$q_meta['chapter_id']]) ? $chapter_map[$q_meta['chapter_id']] : 'General Concepts';

            // Options mapping
            $options_obj = [];
            $correct_letter = 'A';
            
            $q_type = (strtolower($q_meta['q_type']) === 'numerical' || count($options) === 0) ? 'Numerical' : 'MCQ';

            if ($q_type === 'MCQ') {
                foreach ($options as $idx => $opt) {
                    $letter = isset($option_keys[$idx]) ? $option_keys[$idx] : 'A';
                    $options_obj[$letter] = $opt['option_text'];
                    if ((int)$opt['is_correct'] === 1) {
                        $correct_letter = $letter;
                    }
                }
            } else {
                $correct_letter = '0';
            }

            $options_json = json_encode($options_obj);
            $explanation_text = $q_meta['explanation_text'] ?? 'Detailed step-by-step solution.';

            // Generate UUID v4
            $uuid = sprintf(
                '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                mt_rand(0, 0xffff),
                mt_rand(0, 0x0fff) | 0x4000,
                mt_rand(0, 0x3fff) | 0x8000,
                mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
            );

            // Marking scheme
            $marking_scheme = json_encode([
                "positive" => 4,
                "negative" => ($q_type === 'MCQ' ? 1 : 0)
            ]);

            $paper_id = 'sqlite_import_' . ($q_meta['exam_id'] ?? 1);
            $year = 2026;

            $insert_stmt->execute([
                ':id' => $uuid,
                ':subject' => $subject_name,
                ':chapter' => $chapter_name,
                ':type' => $q_type,
                ':difficulty' => $q_meta['difficulty'] ?? 'Medium',
                ':statement' => $statement,
                ':options' => $options_json,
                ':correctAnswer' => $correct_letter,
                ':correct_answer' => $correct_letter,
                ':solution' => $explanation_text,
                ':explanation' => $explanation_text,
                ':concept' => $chapter_name,
                ':markingScheme' => $marking_scheme,
                ':paper_id' => $paper_id,
                ':year' => $year
            ]);

            $inserted_count++;
        }

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $q_id = $row['q_id'];
            
            if ($current_q === null) {
                $current_q = $row;
                $current_options = [];
            } elseif ($current_q['q_id'] !== $q_id) {
                // Process previous question
                flushQuestion($current_q, $current_options, $existing_hashes, $subject_map, $chapter_map, $option_keys, $insert_stmt, $inserted_count, $skipped_count);
                // Move to new question
                $current_q = $row;
                $current_options = [];
            }

            if ($row['option_text'] !== null) {
                $current_options[] = [
                    'option_text' => $row['option_text'],
                    'is_correct' => $row['is_correct']
                ];
            }
        }

        // Flush final question
        if ($current_q !== null) {
            flushQuestion($current_q, $current_options, $existing_hashes, $subject_map, $chapter_map, $option_keys, $insert_stmt, $inserted_count, $skipped_count);
        }

        $conn->commit();

        // Get final total in MariaDB questions table
        $new_total = (int)$conn->query("SELECT COUNT(*) FROM questions")->fetchColumn();

        echo json_encode([
            "success" => true,
            "inserted" => $inserted_count,
            "skipped" => $skipped_count,
            "new_total" => $new_total,
            "stream" => $active_stream,
            "message" => "Successfully synchronized SQLite database. Sync summary: $inserted_count questions imported, $skipped_count duplicates skipped."
        ]);
        exit;
    }

    echo json_encode([
        "success" => false,
        "message" => "Invalid action specified."
    ]);

} catch (Exception $e) {
    if ($action === 'sync' && isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Synchronization failed.",
        "details" => $e->getMessage()
    ]);
}
?>
