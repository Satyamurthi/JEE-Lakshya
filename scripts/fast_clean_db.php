<?php
/**
 * fast_clean_db.php
 * Fast SQL-based cleanup of LaTeX-incompatible and broken questions across:
 *   - jee_nexus
 *   - neet_nexus
 *   - kcet_nexus
 *   - upsc_nexus
 */

set_time_limit(0);
ini_set('memory_limit', '512M');

$DB_HOST = '127.0.0.1';
$DB_PORT = 3306;
$DB_USER = 'root';
$DB_PASS = '';

$databases = ['jee_nexus', 'neet_nexus', 'kcet_nexus', 'upsc_nexus'];

foreach ($databases as $dbName) {
    echo "========================================================\n";
    echo "Processing Database: {$dbName}\n";
    echo "========================================================\n";

    try {
        $pdo = new PDO("mysql:host={$DB_HOST};port={$DB_PORT};dbname={$dbName};charset=utf8mb4", $DB_USER, $DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (Exception $e) {
        echo "Could not connect to {$dbName}: " . $e->getMessage() . "\n";
        continue;
    }

    // 1. Delete questions missing statement or options
    $stmt1 = $pdo->prepare("DELETE FROM questions WHERE statement IS NULL OR TRIM(statement) = '' OR statement = 'null'");
    $stmt1->execute();
    echo "Deleted " . $stmt1->rowCount() . " questions with missing statement.\n";

    $stmt2 = $pdo->prepare("DELETE FROM questions WHERE options IS NULL OR TRIM(CAST(options AS CHAR)) = '' OR CAST(options AS CHAR) = '{}' OR CAST(options AS CHAR) = 'null'");
    $stmt2->execute();
    echo "Deleted " . $stmt2->rowCount() . " questions with missing/invalid options.\n";

    // 2. Delete questions with no correct answer
    $stmt3 = $pdo->prepare("DELETE FROM questions WHERE (correct_answer IS NULL OR TRIM(correct_answer) = '') AND (correctAnswer IS NULL OR TRIM(correctAnswer) = '')");
    $stmt3->execute();
    echo "Deleted " . $stmt3->rowCount() . " questions with no correct answer.\n";

    // 3. Delete questions with unsupported TeX commands (which cause KaTeX render error fallbacks)
    $unsupportedCmds = [
        '%\\bf%', '%\\it%', '%\\rm%', '%\\sc%', '%\\tt%', '%\\sl%',
        '%\\vspace%', '%\\hspace%', '%\\vskip%', '%\\hskip%',
        '%\\newpage%', '%\\clearpage%', '%\\pagebreak%',
        '%\\begin{enumerate}%', '%\\begin{itemize}%', '%\\begin{description}%',
        '%\\begin{tabular}%', '%\\begin{table}%', '%\\begin{figure}%',
        '%\\begin{minipage}%', '%\\begin{multicols}%',
        '%\\cite%', '%\\ref%', '%\\label%', '%\\footnote%',
        '%\\includegraphics%', '%\\usepackage%', '%\\documentclass%',
        '%\\setcounter%', '%\\newcommand%', '%\\renewcommand%'
    ];

    $deletedCmdTotal = 0;
    foreach ($unsupportedCmds as $pattern) {
        $delCmd = $pdo->prepare("DELETE FROM questions WHERE statement LIKE :p1 OR explanation LIKE :p2 OR solution LIKE :p3");
        $delCmd->execute([':p1' => $pattern, ':p2' => $pattern, ':p3' => $pattern]);
        $deletedCmdTotal += $delCmd->rowCount();
    }
    echo "Deleted {$deletedCmdTotal} questions with KaTeX-unsupported commands.\n";

    // 4. Delete questions containing bad HTML tags (like <table>, <div>, <p>, <br>, <script>)
    $badTags = ['%<table%', '%<tr%', '%<td%', '%<div%', '%<p>%', '%<br%', '%<script%'];
    $deletedTagTotal = 0;
    foreach ($badTags as $tagPattern) {
        $delTag = $pdo->prepare("DELETE FROM questions WHERE statement LIKE :p1 OR options LIKE :p2");
        $delTag->execute([':p1' => $tagPattern, ':p2' => $tagPattern]);
        $deletedTagTotal += $delTag->rowCount();
    }
    echo "Deleted {$deletedTagTotal} questions containing unsupported HTML tags.\n";

    // 5. Count remaining clean questions
    $countStmt = $pdo->query("SELECT COUNT(*) FROM questions");
    $totalClean = $countStmt->fetchColumn();
    echo "Total clean questions remaining in {$dbName}: {$totalClean}\n\n";
}

echo "All database cleanups completed successfully!\n";
