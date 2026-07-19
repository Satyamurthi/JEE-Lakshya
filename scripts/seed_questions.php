<?php
$host = "127.0.0.1";
$db = "jee_nexus";
$user = "root";
$pass = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Loading officialJeeExtractedPapers.json...\n";
    $raw = file_get_contents('d:/JEE/src/data/officialJeeExtractedPapers.json');
    $papers = json_decode($raw, true);
    
    if (!$papers) {
        die("Failed to parse JSON file!\n");
    }
    
    // Fetch existing statement hashes for deduplication
    $existing = $pdo->query("SELECT statement FROM questions")->fetchAll(PDO::FETCH_COLUMN);
    $seen = [];
    foreach ($existing as $st) {
        $seen[strtolower(preg_replace('/[^a-z0-9]/', '', substr($st, 0, 120)))] = true;
    }
    
    echo "Existing questions in DB: " . count($seen) . "\n";
    
    $inserted = 0;
    $stmt = $pdo->prepare("INSERT INTO questions (id, subject, chapter, type, difficulty, statement, options, correctAnswer, solution, explanation, concept, markingScheme) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($papers as $paperKey => $paperObj) {
        if (!is_array($paperObj) || !isset($paperObj['questions']) || !is_array($paperObj['questions'])) continue;
        
        foreach ($paperObj['questions'] as $q) {
            $statement = isset($q['statement']) ? trim($q['statement']) : '';
            if (empty($statement)) continue;
            
            $hash = strtolower(preg_replace('/[^a-z0-9]/', '', substr($statement, 0, 120)));
            if (isset($seen[$hash])) continue;
            $seen[$hash] = true;
            
            $qNum = isset($q['questionNumber']) ? (int)$q['questionNumber'] : 0;
            $subject = isset($q['subject']) ? trim($q['subject']) : 'Physics';
            
            if ($qNum >= 1 && $qNum <= 30) {
                $subject = 'Physics';
            } elseif ($qNum >= 31 && $qNum <= 60) {
                $subject = 'Chemistry';
            } elseif ($qNum >= 61 && $qNum <= 90) {
                $subject = 'Mathematics';
            }
            
            $type = (isset($q['type']) && in_array($q['type'], ['MCQ', 'Numerical'])) ? $q['type'] : (($qNum % 30 > 25 || $qNum % 30 === 0) ? 'Numerical' : 'MCQ');
            
            $id = isset($q['id']) ? $q['id'] : 'q_' . bin2hex(random_bytes(8));
            $chapter = isset($q['chapter']) ? $q['chapter'] : 'General ' . $subject;
            $difficulty = isset($q['difficulty']) ? $q['difficulty'] : 'Medium';
            $options = json_encode(isset($q['options']) ? $q['options'] : []);
            $correctAnswer = isset($q['correctAnswer']) ? (string)$q['correctAnswer'] : 'A';
            $solution = isset($q['solution']) ? $q['solution'] : '';
            $explanation = isset($q['explanation']) ? $q['explanation'] : '';
            $concept = isset($q['concept']) ? $q['concept'] : 'JEE Main Official PYQ';
            $markingScheme = json_encode(isset($q['markingScheme']) ? $q['markingScheme'] : ['positive' => 4, 'negative' => 1]);
            
            try {
                $stmt->execute([
                    $id,
                    $subject,
                    $chapter,
                    $type,
                    $difficulty,
                    $statement,
                    $options,
                    $correctAnswer,
                    $solution,
                    $explanation,
                    $concept,
                    $markingScheme
                ]);
                $inserted++;
            } catch (Exception $e) {
                // Ignore duplicates
            }
        }
    }
    
    echo "Successfully inserted $inserted new authentic questions into MariaDB jee_nexus database!\n";
    
    // Print new counts
    $counts = $pdo->query("SELECT subject, type, count(*) as cnt FROM questions GROUP BY subject, type")->fetchAll(PDO::FETCH_ASSOC);
    print_r($counts);
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
