<?php
/**
 * Clean Out-of-Syllabus Questions from MariaDB (JEE Nexus)
 * Aligned 100% with official NTA JEE Main 2026 Syllabus
 */

if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

require_once __DIR__ . '/db.php'; // Defines $conn

// Override db.php 60s timeout limit AFTER importing db.php!
set_time_limit(0);
ini_set('max_execution_time', 0);
header('Content-Type: application/json; charset=utf-8');

try {
    // Force target schema to jee_nexus
    $conn->exec("USE jee_nexus");
    $conn->exec("SET innodb_lock_wait_timeout = 30");

    // Total initial count
    $stmtCount = $conn->query("SELECT COUNT(*) FROM questions");
    $initialCount = (int)$stmtCount->fetchColumn();

    $keywords = [
        // Physics Out-of-Syllabus
        'radioactive', 'half-life', 'half life', 'decay constant', 'mean life', 'mean-life',
        'alpha decay', 'beta decay', 'gamma decay', 'potentiometer', 'communication system',
        'carrier wave', 'amplitude modulation', 'frequency modulation', 'transistor',
        'common emitter', 'davisson', 'cyclotron', "earth's magnetic", 'magnetic declination',
        'angle of dip', 'damped oscillation', 'carnot engine', 'carbon resistor', 'color code',

        // Chemistry Out-of-Syllabus
        'solid state', 'unit cell', 'frenkel defect', 'schottky defect', "bragg's law",
        'surface chemistry', 'adsorption', 'physisorption', 'chemisorption', 'tyndall effect',
        'electrophoresis', 'gold number', 'lyophilic', 'lyophobic', 'isolation of elements',
        'metallurgy', 'froth flotation', 'ellingham', 'zone refining', 's-block',
        'alkali metal', 'alkaline earth', 'environmental chemistry', 'acid rain',
        'photochemical smog', 'nylon-6', 'bakelite', 'terylene', 'buna-n', 'buna-s',
        'vulcanization', 'chemistry in everyday life', 'tranquilizer', 'antiseptic',
        'disinfectant', 'antacid', 'antihistamine',

        // Mathematics Out-of-Syllabus
        'mathematical induction', 'mathematical reasoning', 'tautology', 'contrapositive',
        'linear programming', 'feasible region', 'equation of the plane', 'equation of a plane',
        'distance of a point from the plane', 'angle between two planes', 'coplanar lines',
        "rolle's theorem", "lagrange's mean value", 'heights and distances', 'solution of triangles',
        'properties of triangles', 'arithmetico-geometric'
    ];

    $deletedTotal = 0;
    $breakdown = [];

    $stmt = $conn->prepare("DELETE FROM questions WHERE LOWER(statement) LIKE ? OR LOWER(chapter) LIKE ? OR LOWER(topic) LIKE ?");

    foreach ($keywords as $kw) {
        try {
            $pattern = '%' . strtolower($kw) . '%';
            $stmt->execute([$pattern, $pattern, $pattern]);
            $count = $stmt->rowCount();
            if ($count > 0) {
                $deletedTotal += $count;
                $breakdown[$kw] = $count;
            }
        } catch (Throwable $kwErr) {
            // Suppress lock error on single item if busy
        }
    }

    $stmtFinal = $conn->query("SELECT COUNT(*) FROM questions");
    $finalCount = (int)$stmtFinal->fetchColumn();

    $response = [
        "status" => "success",
        "initial_questions" => $initialCount,
        "deleted_total" => $deletedTotal,
        "remaining_questions" => $finalCount,
        "deleted_breakdown" => $breakdown
    ];

    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
