<?php
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $questions = json_decode($input, true);
    if (!is_array($questions)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid payload"]);
        exit;
    }
    
    try {
        $conn->beginTransaction();
        
        // Get or create dummy AI exam
        $examStmt = $conn->prepare("SELECT id FROM exams WHERE name = 'AI Generated' LIMIT 1");
        $examStmt->execute();
        $examRow = $examStmt->fetch();
        if ($examRow) {
            $examId = $examRow['id'];
        } else {
            $insertExam = $conn->prepare("INSERT INTO exams (name, year, type) VALUES ('AI Generated', 2026, 'Main')");
            $insertExam->execute();
            $examId = $conn->lastInsertId();
        }

        foreach ($questions as $q) {
            // 1. Get/Create Subject ID
            $subName = trim($q['subject']);
            $subStmt = $conn->prepare("SELECT id FROM subjects WHERE name = :name LIMIT 1");
            $subStmt->execute([':name' => $subName]);
            $subRow = $subStmt->fetch();
            if ($subRow) {
                $subId = $subRow['id'];
            } else {
                $insertSub = $conn->prepare("INSERT INTO subjects (name) VALUES (:name)");
                $insertSub->execute([':name' => $subName]);
                $subId = $conn->lastInsertId();
            }

            // 2. Get/Create Chapter ID
            $chapName = trim($q['chapter'] ?? $q['concept'] ?? 'General');
            $chapStmt = $conn->prepare("SELECT id FROM chapters WHERE name = :name AND subject_id = :sub_id LIMIT 1");
            $chapStmt->execute([':name' => $chapName, ':sub_id' => $subId]);
            $chapRow = $chapStmt->fetch();
            if ($chapRow) {
                $chapId = $chapRow['id'];
            } else {
                $insertChap = $conn->prepare("INSERT INTO chapters (subject_id, name) VALUES (:sub_id, :name)");
                $insertChap->execute([':sub_id' => $subId, ':name' => $chapName]);
                $chapId = $conn->lastInsertId();
            }

            // 3. Prevent Duplicates
            $statementText = trim($q['statement']);
            $checkQ = $conn->prepare("SELECT id FROM questions WHERE question_text = :q_text LIMIT 1");
            $checkQ->execute([':q_text' => $statementText]);
            $qRow = $checkQ->fetch();
            if ($qRow) {
                continue; // Skip existing question text
            }

            // 4. Insert Question
            $qType = trim($q['type'] ?? 'MCQ');
            $dbInsertType = ($qType === 'MCQ') ? 'single_choice' : (($qType === 'Numerical') ? 'numerical' : $qType);
            $qDiff = trim($q['difficulty'] ?? 'Medium');
            $marksCorrect = intval($q['markingScheme']['positive'] ?? 4);
            $marksIncorrect = -abs(intval($q['markingScheme']['negative'] ?? 1));

            $insertQ = $conn->prepare("
                INSERT INTO questions (exam_id, subject_id, chapter_id, question_text, type, difficulty, marks_correct, marks_incorrect)
                VALUES (:exam_id, :sub_id, :chap_id, :q_text, :q_type, :q_diff, :marks_correct, :marks_incorrect)
            ");
            $insertQ->execute([
                ':exam_id' => $examId,
                ':sub_id' => $subId,
                ':chap_id' => $chapId,
                ':q_text' => $statementText,
                ':q_type' => $dbInsertType,
                ':q_diff' => $qDiff,
                ':marks_correct' => $marksCorrect,
                ':marks_incorrect' => $marksIncorrect
            ]);
            $qId = $conn->lastInsertId();

            // 5. Options
            if ($qType === 'MCQ') {
                $optionsDict = $q['options'] ?? [];
                $identifiers = ["A", "B", "C", "D"];
                foreach ($identifiers as $ident) {
                    $optText = "";
                    if (isset($optionsDict[$ident])) {
                        $optText = $optionsDict[$ident];
                    } else if (is_array($optionsDict) && isset($optionsDict[array_search($ident, $identifiers)])) {
                        $optText = $optionsDict[array_search($ident, $identifiers)];
                    } else {
                        continue;
                    }
                    
                    $isCorrect = (trim($q['correctAnswer']) === $ident) ? 1 : 0;
                    $insertOpt = $conn->prepare("INSERT INTO options (question_id, option_text, is_correct) VALUES (:q_id, :opt_text, :is_correct)");
                    $insertOpt->execute([
                        ':q_id' => $qId,
                        ':opt_text' => $optText,
                        ':is_correct' => $isCorrect
                    ]);
                }
            } else {
                $ansVal = trim($q['correctAnswer']);
                $insertOpt = $conn->prepare("INSERT INTO options (question_id, option_text, is_correct) VALUES (:q_id, :opt_text, 1)");
                $insertOpt->execute([
                    ':q_id' => $qId,
                    ':opt_text' => $ansVal
                ]);
            }

            // 6. Explanation
            $explanation = trim($q['explanation'] ?? $q['solution'] ?? 'No explanation available.');
            $insertSol = $conn->prepare("INSERT INTO solutions (question_id, explanation_text) VALUES (:q_id, :sol_text)");
            $insertSol->execute([
                ':q_id' => $qId,
                ':sol_text' => $explanation
            ]);
        }

        $conn->commit();
        echo json_encode(["success" => true, "message" => "AI questions saved to local database."]);
    } catch (Exception $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        http_response_code(500);
        echo json_encode(["error" => "Transaction failed", "details" => $e->getMessage()]);
    }
    exit;
}

$subject = isset($_GET['subject']) ? trim($_GET['subject']) : null;
$chapter = isset($_GET['chapter']) ? trim($_GET['chapter']) : null;
$mcqCount = isset($_GET['mcqCount']) ? (int)$_GET['mcqCount'] : 10;
$numericalCount = isset($_GET['numericalCount']) ? (int)$_GET['numericalCount'] : 0;

try {
    $questions = [];

    // Helper function to fetch questions by type
    $fetchQuestions = function($type, $limit) use ($conn, $subject, $chapter) {
        if ($limit <= 0) return [];
        
        $dbType = ($type === 'MCQ') ? 'single_choice' : (($type === 'Numerical') ? 'numerical' : $type);
        
        $sql = "SELECT q.id, s.name as subject, c.name as chapter, q.type, q.difficulty, q.question_text as statement, 
                       sol.explanation_text as explanation, sol.explanation_text as solution, c.name as concept,
                       q.marks_correct as positiveMark, q.marks_incorrect as negativeMark
                FROM questions q
                JOIN subjects s ON q.subject_id = s.id
                JOIN chapters c ON q.chapter_id = c.id
                LEFT JOIN solutions sol ON q.id = sol.question_id
                WHERE q.type = :type";
                
        if ($subject) {
            $sql .= " AND s.name = :subject";
        }
        if ($chapter) {
            $sql .= " AND c.name = :chapter";
        }
        
        $sql .= " ORDER BY RAND() LIMIT :limit"; // Random select for test variation
        
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':type', $dbType, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        if ($subject) $stmt->bindValue(':subject', $subject, PDO::PARAM_STR);
        if ($chapter) $stmt->bindValue(':chapter', $chapter, PDO::PARAM_STR);
        
        $stmt->execute();
        $rows = $stmt->fetchAll();
        
        $result = [];
        foreach ($rows as $row) {
            $q_id = $row['id'];
            
            // Format marking scheme
            $row['markingScheme'] = [
                "positive" => (int)$row['positiveMark'],
                "negative" => (int)$row['negativeMark']
            ];
            unset($row['positiveMark'], $row['negativeMark']);
            
            // Map type back to frontend formats
            $row['type'] = ($row['type'] === 'single_choice') ? 'MCQ' : (($row['type'] === 'numerical') ? 'Numerical' : $row['type']);
            
            // Fetch options
            $optStmt = $conn->prepare("SELECT option_text, is_correct FROM options WHERE question_id = ? ORDER BY id ASC");
            $optStmt->execute([$q_id]);
            $options = $optStmt->fetchAll();
            
            $optionsDict = [];
            $correctAnswer = "";
            
            if ($type === 'MCQ') {
                $identifiers = ["A", "B", "C", "D"];
                foreach ($options as $idx => $opt) {
                    if ($idx >= 4) break;
                    $ident = $identifiers[$idx];
                    $optionsDict[$ident] = $opt['option_text'];
                    if ($opt['is_correct']) {
                        $correctAnswer = $ident;
                    }
                }
                if (empty($correctAnswer)) {
                    $correctAnswer = "A";
                }
            } else {
                // Numerical
                $optionsDict = new stdClass(); // Empty JSON object {}
                if (!empty($options)) {
                    $correctAnswer = $options[0]['option_text']; // The correct numeric answer string
                } else {
                    $correctAnswer = "0";
                }
            }
            
            $row['options'] = $optionsDict;
            $row['correctAnswer'] = $correctAnswer;
            $result[] = $row;
        }
        
        return $result;
    };

    $mcqs = $fetchQuestions('MCQ', $mcqCount);
    $numericals = $fetchQuestions('Numerical', $numericalCount);
    
    $questions = array_merge($mcqs, $numericals);
    
    echo json_encode($questions);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
