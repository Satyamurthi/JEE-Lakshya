<?php
// Check if executing via CLI. Direct HTTP web execution is blocked for security.
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo json_encode(["error" => "Forbidden: This script can only be run via CLI."]);
    exit;
}

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
set_time_limit(1800); // 30 minutes execution limit

// =============================================================================
// Semantic Hash Normalization
// =============================================================================
function getSemanticHash($text) {
    if (empty($text)) return '';
    
    // Convert to lowercase
    $text = strtolower($text);
    
    // Remove all whitespace and punctuation
    $text = preg_replace('/\s+/', '', $text);
    $text = preg_replace('/[.,;:!?()\-+=\[\]{}]/', '', $text);
    
    // Strip common LaTeX symbols and commands
    $latex_replacements = [
        '\\frac', '\\times', '\\cdot', '\\text', '\\mu', '\\alpha', '\\beta', '\\gamma',
        '\\theta', '\\lambda', '\\varepsilon', '\\pi', '\\sigma', '\\omega', '\\delta',
        '\\begin', '\\end', '\\matrix', '\\pmatrix', '\\align', '\\aligned',
        '$', '{', '}', '_', '^', '\\', '*', '/'
    ];
    $text = str_replace($latex_replacements, '', $text);
    
    // Strip numbers to identify parameter variations
    $text = preg_replace('/[0-9]/', '', $text);
    
    return md5($text);
}

// Check source priority
function getSourcePriority($source_name) {
    $source_name = strtolower($source_name);
    
    if (strpos($source_name, 'nta') !== false || strpos($source_name, 'official') !== false) return 1;
    if (strpos($source_name, 'allen') !== false) return 2;
    if (strpos($source_name, 'fiitjee') !== false) return 3;
    if (strpos($source_name, 'resonance') !== false) return 4;
    if (strpos($source_name, 'motion') !== false) return 5;
    if (strpos($source_name, 'pw') !== false || strpos($source_name, 'physicswallah') !== false) return 6;
    if (strpos($source_name, 'aakash') !== false) return 7;
    
    return 100; // Default low priority for other sources
}

// Generate unique UUID
function uuidv4() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

// =============================================================================
// CLI Arguments Parsing
// =============================================================================
$limit = 5000;
if (php_sapi_name() === 'cli') {
    $options = getopt("", ["limit:"]);
    $limit = isset($options['limit']) ? (int)$options['limit'] : $limit;
} else {
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : $limit;
}

try {
    $mysql_conn = new PDO("mysql:host=127.0.0.1;dbname=jee_nexus;charset=utf8mb4", "root", "");
    $mysql_conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Run migrations to ensure metadata column exists
    $mysql_conn->exec("ALTER TABLE `questions` ADD COLUMN IF NOT EXISTS `metadata` JSON NULL;");

    // 2. Load existing questions from MySQL to build deduplication registry
    $stmt = $mysql_conn->query("SELECT id, statement, options, metadata FROM `questions`");
    $existing_rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $seen_hashes = [];
    foreach ($existing_rows as $row) {
        $options_dec = json_decode($row['options'], true);
        $hash = getSemanticHash($row['statement']);
        if ($hash) {
            $seen_hashes[$hash] = [
                "id" => $row['id'],
                "statement" => $row['statement'],
                "metadata" => json_decode($row['metadata'], true) ?: []
            ];
        }
    }

    $processed_count = 0;
    $duplicates_merged = 0;
    $new_inserted = 0;

    // 3. Connect to source SQLite (questions.db)
    $sqlite_path = "d:/JEE/jee/DB/questions.db";
    if (file_exists($sqlite_path)) {
        $sdb = new PDO("sqlite:" . $sqlite_path);
        $sdb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Load mappings
        $subject_map = $sdb->query("SELECT id, name FROM subjects")->fetchAll(PDO::FETCH_KEY_PAIR);
        $chapter_map = $sdb->query("SELECT id, name FROM chapters")->fetchAll(PDO::FETCH_KEY_PAIR);

        $q_stmt = $sdb->query("SELECT * FROM questions LIMIT $limit");
        $source_qs = $q_stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($source_qs as $q_meta) {
            $q_id = $q_meta['id'];
            $statement = trim($q_meta['question_text']);
            if (empty($statement)) continue;

            $subject_name = $subject_map[$q_meta['subject_id']] ?? 'Physics';
            $chapter_name = $chapter_map[$q_meta['chapter_id']] ?? 'General Concepts';

            // Fetch options
            $o_stmt = $sdb->prepare("SELECT option_text, is_correct FROM options WHERE question_id = ? ORDER BY id ASC");
            $o_stmt->execute([$q_id]);
            $db_options = $o_stmt->fetchAll(PDO::FETCH_ASSOC);

            $options_obj = [];
            $correct_letter = 'A';
            if (count($db_options) >= 2) {
                $option_keys = ['A', 'B', 'C', 'D', 'E'];
                foreach ($db_options as $idx => $opt) {
                    $letter = $option_keys[$idx] ?? 'A';
                    $options_obj[$letter] = $opt['option_text'];
                    if ((int)$opt['is_correct'] === 1) {
                        $correct_letter = $letter;
                    }
                }
            }

            // Fetch solution
            $sol_stmt = $sdb->prepare("SELECT explanation_text FROM solutions WHERE question_id = ?");
            $sol_stmt->execute([$q_id]);
            $sol_row = $sol_stmt->fetch(PDO::FETCH_ASSOC);
            $solution = $sol_row ? $sol_row['explanation_text'] : 'Detailed solution.';

            // Source tag / metadata
            $source_name = $q_meta['source'] ?? 'SQLite Pool';
            $institute = $q_meta['institute'] ?? 'Practice Bank';
            $year = $q_meta['year'] ?? 2026;
            
            $q_metadata = [
                "source" => $source_name,
                "institute" => $institute,
                "year" => $year,
                "chapter" => $chapter_name,
                "difficulty" => $q_meta['difficulty'] ?? 'Hard',
                "source_references" => [
                    [
                        "source" => $source_name,
                        "institute" => $institute,
                        "year" => $year,
                        "original_id" => $q_id
                    ]
                ]
            ];

            $hash = getSemanticHash($statement);
            $processed_count++;

            // --- Deduplication & Merging Logic ---
            if (isset($seen_hashes[$hash])) {
                $canonical = $seen_hashes[$hash];
                
                // Compare priorities
                $p_new = getSourcePriority($source_name);
                $p_existing = getSourcePriority($canonical['metadata']['source'] ?? 'Practice Bank');

                if ($p_new < $p_existing) {
                    // Update canonical statement and options, merge references
                    $merged_refs = array_merge($canonical['metadata']['source_references'] ?? [], $q_metadata['source_references']);
                    $q_metadata['source_references'] = $merged_refs;

                    $upd = $mysql_conn->prepare("UPDATE `questions` SET `statement` = :st, `options` = :op, `correctAnswer` = :ca, `correct_answer` = :ca_snake, `solution` = :sol, `explanation` = :sol, `metadata` = :meta WHERE `id` = :id");
                    $upd->execute([
                        ":st" => $statement,
                        ":op" => count($options_obj) > 0 ? json_encode($options_obj) : null,
                        ":ca" => $correct_letter,
                        ":ca_snake" => $correct_letter,
                        ":sol" => $solution,
                        ":meta" => json_encode($q_metadata),
                        ":id" => $canonical['id']
                    ]);
                    
                    $seen_hashes[$hash]['statement'] = $statement;
                    $seen_hashes[$hash]['metadata'] = $q_metadata;
                } else {
                    // Just merge reference to existing record
                    $merged_refs = array_merge($canonical['metadata']['source_references'] ?? [], $q_metadata['source_references']);
                    $canonical['metadata']['source_references'] = $merged_refs;

                    $upd = $mysql_conn->prepare("UPDATE `questions` SET `metadata` = :meta WHERE `id` = :id");
                    $upd->execute([
                        ":meta" => json_encode($canonical['metadata']),
                        ":id" => $canonical['id']
                    ]);
                    
                    $seen_hashes[$hash]['metadata'] = $canonical['metadata'];
                }
                $duplicates_merged++;
            } else {
                // New unique question insert
                $new_id = uuidv4();
                
                $ins = $mysql_conn->prepare("INSERT INTO `questions` (`id`, `subject`, `chapter`, `topic`, `concept`, `type`, `difficulty`, `statement`, `options`, `correctAnswer`, `correct_answer`, `solution`, `explanation`, `markingScheme`, `year`, `metadata`) VALUES (:id, :sub, :ch, :tp, :cp, :ty, :df, :st, :op, :ca, :ca_snake, :sol, :exp, :ms, :yr, :meta)");
                $ins->execute([
                    ":id" => $new_id,
                    ":sub" => $subject_name,
                    ":ch" => $chapter_name,
                    ":tp" => $chapter_name,
                    ":cp" => $chapter_name,
                    ":ty" => count($options_obj) > 0 ? 'MCQ' : 'Numerical',
                    ":df" => $q_metadata['difficulty'],
                    ":st" => $statement,
                    ":op" => count($options_obj) > 0 ? json_encode($options_obj) : null,
                    ":ca" => $correct_letter,
                    ":ca_snake" => $correct_letter,
                    ":sol" => $solution,
                    ":exp" => $solution,
                    ":ms" => json_encode(["positive" => 4, "negative" => count($options_obj) > 0 ? 1 : 0]),
                    ":yr" => $year,
                    ":meta" => json_encode($q_metadata)
                ]);

                $seen_hashes[$hash] = [
                    "id" => $new_id,
                    "statement" => $statement,
                    "metadata" => $q_metadata
                ];
                $new_inserted++;
            }
        }
    }

    echo json_encode([
        "success" => true,
        "processed" => $processed_count,
        "new_inserted" => $new_inserted,
        "duplicates_merged" => $duplicates_merged,
        "total_active_questions" => count($seen_hashes)
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
