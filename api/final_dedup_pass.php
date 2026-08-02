<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
set_time_limit(1800);

// Semantic Hash Normalization
function getSemanticHash($text) {
    if (empty($text)) return '';
    $text = strtolower($text);
    $text = preg_replace('/\s+/', '', $text);
    $text = preg_replace('/[.,;:!?()\-+=\[\]{}]/', '', $text);
    $latex_replacements = [
        '\\frac', '\\times', '\\cdot', '\\text', '\\mu', '\\alpha', '\\beta', '\\gamma',
        '\\theta', '\\lambda', '\\varepsilon', '\\pi', '\\sigma', '\\omega', '\\delta',
        '\\begin', '\\end', '\\matrix', '\\pmatrix', '\\align', '\\aligned',
        '$', '{', '}', '_', '^', '\\', '*', '/'
    ];
    $text = str_replace($latex_replacements, '', $text);
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
    return 100;
}

try {
    $mysql_conn = new PDO("mysql:host=127.0.0.1;dbname=jee_nexus;charset=utf8mb4", "root", "");
    $mysql_conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Fetch all questions
    $stmt = $mysql_conn->query("SELECT id, statement, options, correctAnswer, correct_answer, solution, explanation, metadata FROM `questions`");
    $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $hash_groups = [];
    foreach ($questions as $q) {
        $hash = getSemanticHash($q['statement']);
        if ($hash) {
            $hash_groups[$hash][] = $q;
        }
    }

    $deleted_count = 0;
    $merged_count = 0;

    // 2. Process groups
    foreach ($hash_groups as $hash => $group) {
        if (count($group) <= 1) continue;

        // Sort group by priority (NTA/PYQ first)
        usort($group, function($a, $b) {
            $meta_a = json_decode($a['metadata'], true) ?: [];
            $meta_b = json_decode($b['metadata'], true) ?: [];
            $p_a = getSourcePriority($meta_a['source'] ?? 'Practice Bank');
            $p_b = getSourcePriority($meta_b['source'] ?? 'Practice Bank');
            return $p_a - $p_b;
        });

        // The first one is our canonical record
        $canonical = $group[0];
        $canonical_meta = json_decode($canonical['metadata'], true) ?: [];
        if (!isset($canonical_meta['source_references'])) {
            $canonical_meta['source_references'] = [
                [
                    "source" => $canonical_meta['source'] ?? 'Practice Bank',
                    "institute" => $canonical_meta['institute'] ?? 'Practice Bank',
                    "year" => $canonical_meta['year'] ?? 2026,
                    "original_id" => $canonical['id']
                ]
            ];
        }

        // Merge other duplicates
        $delete_ids = [];
        for ($i = 1; $i < count($group); $i++) {
            $dup = $group[$i];
            $dup_meta = json_decode($dup['metadata'], true) ?: [];
            $dup_refs = $dup_meta['source_references'] ?? [
                [
                    "source" => $dup_meta['source'] ?? 'Duplicate Source',
                    "institute" => $dup_meta['institute'] ?? 'Duplicate Institute',
                    "year" => $dup_meta['year'] ?? 2026,
                    "original_id" => $dup['id']
                ]
            ];
            
            $canonical_meta['source_references'] = array_merge($canonical_meta['source_references'], $dup_refs);
            $delete_ids[] = $dup['id'];
            $deleted_count++;
        }

        // Save updated canonical record metadata
        $canonical_meta['duplicate_merged_count'] = count($delete_ids);
        $upd = $mysql_conn->prepare("UPDATE `questions` SET `metadata` = :meta WHERE `id` = :id");
        $upd->execute([
            ":meta" => json_encode($canonical_meta),
            ":id" => $canonical['id']
        ]);

        // Delete duplicates
        if (count($delete_ids) > 0) {
            $placeholders = implode(',', array_fill(0, count($delete_ids), '?'));
            $del = $mysql_conn->prepare("DELETE FROM `questions` WHERE `id` IN ($placeholders)");
            $del->execute($delete_ids);
        }

        $merged_count++;
    }

    echo json_encode([
        "success" => true,
        "total_evaluated_questions" => count($questions),
        "unique_semantic_groups" => count($hash_groups),
        "duplicates_deleted" => $deleted_count,
        "groups_merged" => $merged_count
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
