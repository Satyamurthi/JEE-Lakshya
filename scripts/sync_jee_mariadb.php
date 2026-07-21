<?php
// Set infinite execution time and no memory limit
set_time_limit(0);
ini_set('memory_limit', '-1');

// Read command line argument for active stream
$active_stream = isset($argv[1]) ? strtolower($argv[1]) : 'jee';

$sqlite_path = "d:/JEE/jee/DB/jeebakend.DB";
$db_name = "jee_nexus";

if (strpos($active_stream, 'neet') !== false) {
    $sqlite_path = "d:/JEE/neet/DB/questions.db";
    $db_name = "neet_nexus";
} elseif (strpos($active_stream, 'kcet') !== false) {
    $sqlite_path = "d:/JEE/kcet/DB/questions.db";
    $db_name = "kcet_nexus";
} elseif (strpos($active_stream, 'upsc') !== false) {
    $sqlite_path = "d:/JEE/upsc/DB/questions.db";
    $db_name = "upsc_nexus";
}

$host = "127.0.0.1";
$username = "root";
$password = "";
$progress_file = "d:/JEE/sync_progress.json";

function updateProgress($data) {
    global $progress_file;
    $data['last_updated'] = date("Y-m-d H:i:s");
    file_put_contents($progress_file, json_encode($data));
}

echo "=== Multi-Stream Question Synchronizer ===\n";
echo "Active Stream: $active_stream\n";
echo "SQLite DB: $sqlite_path\n";
echo "MariaDB DB: $db_name\n\n";

if (!file_exists($sqlite_path)) {
    $err = "Error: SQLite file not found!";
    echo $err . "\n";
    updateProgress(["status" => "failed", "error" => $err]);
    exit(1);
}

try {
    echo "[" . date("H:i:s") . "] Connecting to SQLite...\n";
    $sdb = new PDO("sqlite:" . $sqlite_path);
    $sdb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Count questions dynamically
    echo "[" . date("H:i:s") . "] Fetching SQLite questions count...\n";
    if (strpos($active_stream, 'jee') !== false) {
        $total_sqlite = 18014173; // Avoid slow full scan on 12.4 GB DB
    } else {
        $total_sqlite = (int)$sdb->query("SELECT COUNT(*) FROM questions")->fetchColumn();
    }

    updateProgress([
        "status" => "syncing",
        "total_processed" => 0,
        "inserted" => 0,
        "skipped" => 0,
        "total_sqlite" => $total_sqlite,
        "percent" => 0.0
    ]);

    echo "[" . date("H:i:s") . "] Connecting to MariaDB...\n";
    $mdb = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $mdb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Load subjects
    echo "[" . date("H:i:s") . "] Loading subjects...\n";
    $subjects = $sdb->query("SELECT * FROM subjects")->fetchAll(PDO::FETCH_ASSOC);
    $subject_map = [];
    foreach ($subjects as $sub) {
        $subject_map[$sub['id']] = $sub['name'];
    }

    // Load chapters
    echo "[" . date("H:i:s") . "] Loading chapters...\n";
    $chapters = $sdb->query("SELECT * FROM chapters")->fetchAll(PDO::FETCH_ASSOC);
    $chapter_map = [];
    foreach ($chapters as $ch) {
        $chapter_map[$ch['id']] = $ch['name'];
    }

    // Truncate existing questions in MariaDB
    echo "[" . date("H:i:s") . "] Truncating questions table in MariaDB...\n";
    $mdb->exec("TRUNCATE TABLE questions");

    // Prepare insert statement
    $insert_sql = "INSERT INTO questions (
        id, subject, chapter, type, difficulty, statement, options, 
        correctAnswer, correct_answer, solution, explanation, 
        concept, markingScheme, paper_id, year
    ) VALUES (
        :id, :subject, :chapter, :type, :difficulty, :statement, :options, 
        :correctAnswer, :correct_answer, :solution, :explanation, 
        :concept, :markingScheme, :paper_id, :year
    )";
    $insert_stmt = $mdb->prepare($insert_sql);

    $option_keys = ['A', 'B', 'C', 'D', 'E'];
    $existing_hashes = [];
    
    $chunk_size = 5000;
    $min_id = 1;
    $max_id = 18014990;
    
    $inserted_count = 0;
    $skipped_count = 0;
    $total_processed = 0;

    echo "[" . date("H:i:s") . "] Starting batch import...\n";

    for ($start = $min_id; $start <= $max_id; $start += $chunk_size) {
        $end = $start + $chunk_size;

        // 1. Fetch questions in range
        $q_stmt = $sdb->prepare("SELECT id, subject_id, chapter_id, question_text, type as q_type, difficulty, exam_id FROM questions WHERE id >= :start AND id < :end");
        $q_stmt->execute([':start' => $start, ':end' => $end]);
        $questions = $q_stmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($questions) === 0) {
            continue;
        }

        // 2. Extract question IDs
        $q_ids = array_column($questions, 'id');
        $placeholders = implode(',', array_fill(0, count($q_ids), '?'));

        // 3. Fetch options
        $o_stmt = $sdb->prepare("SELECT question_id, option_text, is_correct FROM options WHERE question_id IN ($placeholders)");
        $o_stmt->execute($q_ids);
        $options_rows = $o_stmt->fetchAll(PDO::FETCH_ASSOC);

        $options_map = [];
        foreach ($options_rows as $opt) {
            $options_map[$opt['question_id']][] = $opt;
        }

        // 4. Fetch solutions
        $s_stmt = $sdb->prepare("SELECT question_id, explanation_text FROM solutions WHERE question_id IN ($placeholders)");
        $s_stmt->execute($q_ids);
        $solutions_rows = $s_stmt->fetchAll(PDO::FETCH_ASSOC);

        $solutions_map = [];
        foreach ($solutions_rows as $sol) {
            $solutions_map[$sol['question_id']] = $sol['explanation_text'];
        }

        // 5. Insert batch in a single transaction
        $mdb->beginTransaction();

        foreach ($questions as $q_meta) {
            $q_id = $q_meta['id'];
            $statement = trim($q_meta['question_text']);
            if (empty($statement)) {
                $skipped_count++;
                continue;
            }

            // Deduplication check
            $norm = strtolower(preg_replace('/[^a-z0-9]/', '', $statement));
            $hash = md5($norm);
            if (isset($existing_hashes[$hash])) {
                $skipped_count++;
                continue;
            }
            $existing_hashes[$hash] = true;

            $subject_name = $subject_map[$q_meta['subject_id']] ?? 'Physics';
            $chapter_name = $chapter_map[$q_meta['chapter_id']] ?? 'General Concepts';

            $options = $options_map[$q_id] ?? [];
            $options_obj = [];
            $correct_letter = 'A';
            $q_type = (strtolower($q_meta['q_type']) === 'numerical' || count($options) === 0) ? 'Numerical' : 'MCQ';

            if ($q_type === 'MCQ') {
                foreach ($options as $idx => $opt) {
                    $letter = $option_keys[$idx] ?? 'A';
                    $options_obj[$letter] = $opt['option_text'];
                    if ((int)$opt['is_correct'] === 1) {
                        $correct_letter = $letter;
                    }
                }
            } else {
                $correct_letter = '0';
            }

            $options_json = json_encode($options_obj);
            $explanation_text = $solutions_map[$q_id] ?? 'Detailed step-by-step solution.';

            // UUID v4
            $uuid = sprintf(
                '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                mt_rand(0, 0xffff),
                mt_rand(0, 0x0fff) | 0x4000,
                mt_rand(0, 0x3fff) | 0x8000,
                mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
            );

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

        $mdb->commit();
        $total_processed += count($questions);
        $percent = round(($total_processed / $total_sqlite) * 100, 2);

        // Print progress
        echo "[" . date("H:i:s") . "] Processed $total_processed / $total_sqlite ($percent%) | Inserted: $inserted_count, Skipped: $skipped_count\n";

        // Update progress file
        updateProgress([
            "status" => "syncing",
            "total_processed" => $total_processed,
            "inserted" => $inserted_count,
            "skipped" => $skipped_count,
            "total_sqlite" => $total_sqlite,
            "percent" => $percent
        ]);
    }

    echo "\n=== Sync Completed Successfully! ===\n";
    updateProgress([
        "status" => "completed",
        "total_processed" => $total_processed,
        "inserted" => $inserted_count,
        "skipped" => $skipped_count,
        "total_sqlite" => $total_sqlite,
        "percent" => 100.0
    ]);

} catch (Exception $e) {
    if (isset($mdb) && $mdb->inTransaction()) {
        $mdb->rollBack();
    }
    $err = "Synchronization failed: " . $e->getMessage();
    echo "\n" . $err . "\n";
    updateProgress([
        "status" => "failed",
        "error" => $err
    ]);
}
