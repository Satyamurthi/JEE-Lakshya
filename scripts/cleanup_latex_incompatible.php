<?php
/**
 * cleanup_latex_incompatible.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Audits and deletes questions from jee_nexus / neet_nexus / kcet_nexus /
 * upsc_nexus that would break KaTeX rendering on the website.
 *
 * A question is "LaTeX-incompatible" if ANY of the following are true:
 *  1. MISSING STATEMENT   – NULL, empty, or literal "null"
 *  2. MISSING OPTIONS     – NULL, empty, "{}", or invalid JSON
 *  3. NO CORRECT ANSWER   – both correctAnswer AND correct_answer are NULL/empty
 *  4. BROKEN $ DELIMITERS – odd number of inline $ in any text field
 *  5. UNSUPPORTED COMMANDS – KaTeX-unsupported \commands present
 *  6. BARE HTML TAGS      – <table>, <div>, <br> etc. that the renderer can't handle
 *  7. ENCODING GARBAGE    – U+FFFD replacement character
 *
 * Usage (dry-run, safe – prints counts only):
 *   php scripts/cleanup_latex_incompatible.php
 *
 * Usage (actually delete):
 *   php scripts/cleanup_latex_incompatible.php --delete
 *
 * Usage (single database):
 *   php scripts/cleanup_latex_incompatible.php --db=neet_nexus --delete
 * ─────────────────────────────────────────────────────────────────────────────
 */

set_time_limit(0);
ini_set('memory_limit', '512M');

// ── CLI flags ──────────────────────────────────────────────────────────────────
$opts    = getopt('', ['delete', 'db:']);
$DRY_RUN = !isset($opts['delete']);
$ONLY_DB = isset($opts['db']) ? trim($opts['db']) : null;

$ALL_DATABASES = ['jee_nexus', 'neet_nexus', 'kcet_nexus', 'upsc_nexus'];
$DATABASES     = $ONLY_DB ? [$ONLY_DB] : $ALL_DATABASES;
$BATCH_SIZE    = 2000;

// ── DB connection ──────────────────────────────────────────────────────────────
$DB_HOST = '127.0.0.1';
$DB_PORT = 3306;
$DB_USER = 'root';
$DB_PASS = '';

// ── KaTeX-unsupported commands ─────────────────────────────────────────────────
$KATEX_UNSUPPORTED = [
    '\\bf', '\\it', '\\rm', '\\sc', '\\tt', '\\sl',
    '\\normalfont', '\\textbf', '\\textit', '\\texttt', '\\textrm',
    '\\vspace', '\\hspace', '\\vskip', '\\hskip',
    '\\newpage', '\\clearpage', '\\pagebreak',
    '\\begin{enumerate}', '\\begin{itemize}', '\\begin{description}',
    '\\begin{tabular}', '\\begin{table}', '\\begin{figure}',
    '\\begin{minipage}', '\\begin{multicols}',
    '\\cite', '\\ref', '\\label', '\\footnote',
    '\\includegraphics', '\\usepackage', '\\documentclass',
    '\\setcounter', '\\newcommand', '\\renewcommand',
];

// ── Bad HTML tag pattern (anything except <img>) ───────────────────────────────
$BAD_HTML_PATTERN = '/<(table|tr|td|th|div|p|br|ul|ol|li|h[1-6]|section|article|header|footer|form|input|select|textarea|button|script|style)[^>]*>/i';

// ─────────────────────────────────────────────────────────────────────────────
function checkField(string $fieldName, ?string $value, array $unsupported, string $badHtmlPattern): array {
    if ($value === null || $value === '') return ['bad' => false, 'reason' => ''];

    // 1. Unbalanced inline $ (not part of $$)
    // Remove all $$ first, then count remaining $
    $stripped = preg_replace('/\$\$/', '', $value);
    $singleDollars = substr_count($stripped, '$');
    if ($singleDollars % 2 !== 0) {
        return ['bad' => true, 'reason' => "[{$fieldName}] Unbalanced inline \$ delimiters (count: {$singleDollars})"];
    }

    // Count $$ pairs
    $doubleDollars = substr_count($value, '$$');
    if ($doubleDollars % 2 !== 0) {
        return ['bad' => true, 'reason' => "[{$fieldName}] Unbalanced block \$\$ delimiters (count: {$doubleDollars})"];
    }

    // 2. KaTeX-unsupported commands
    foreach ($unsupported as $cmd) {
        if (strpos($value, $cmd) !== false) {
            return ['bad' => true, 'reason' => "[{$fieldName}] Contains KaTeX-unsupported command: {$cmd}"];
        }
    }

    // 3. Bare unsupported HTML tags
    if (preg_match($badHtmlPattern, $value, $match)) {
        $tag = substr($match[0], 0, 40);
        return ['bad' => true, 'reason' => "[{$fieldName}] Contains unsupported HTML tag: {$tag}"];
    }

    // 4. Encoding garbage (replacement char)
    if (strpos($value, "\xEF\xBF\xBD") !== false) {
        return ['bad' => true, 'reason' => "[{$fieldName}] Contains UTF-8 replacement character (U+FFFD)"];
    }

    return ['bad' => false, 'reason' => ''];
}

function isIncompatible(array $row, array $unsupported, string $badHtmlPattern): array {
    // 1. Missing statement
    $stmt = trim($row['statement'] ?? '');
    if ($stmt === '' || $stmt === 'null') {
        return ['bad' => true, 'reason' => 'Missing or empty statement'];
    }

    // 2. Missing / invalid options
    $opts = trim($row['options'] ?? '');
    if ($opts === '' || $opts === 'null' || $opts === '{}') {
        return ['bad' => true, 'reason' => 'Missing or empty options'];
    }
    $parsedOpts = json_decode($opts, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($parsedOpts) || count($parsedOpts) === 0) {
        return ['bad' => true, 'reason' => 'Options field is invalid JSON or empty object'];
    }

    // 3. No correct answer
    $ca1 = trim($row['correctAnswer'] ?? '');
    $ca2 = trim($row['correct_answer'] ?? '');
    if ($ca1 === '' && $ca2 === '') {
        return ['bad' => true, 'reason' => 'No correct answer (both correctAnswer and correct_answer are empty)'];
    }

    // 4–7. Check all text fields
    $fieldsToCheck = [
        'statement'   => $row['statement'],
        'solution'    => $row['solution'] ?? null,
        'explanation' => $row['explanation'] ?? null,
    ];
    foreach ($parsedOpts as $key => $val) {
        $fieldsToCheck["option_{$key}"] = is_string($val) ? $val : json_encode($val);
    }

    foreach ($fieldsToCheck as $fieldName => $value) {
        $result = checkField($fieldName, $value, $unsupported, $badHtmlPattern);
        if ($result['bad']) return $result;
    }

    return ['bad' => false, 'reason' => ''];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════\n";
echo "  LaTeX-Incompatible Question Cleanup\n";
echo "  Mode  : " . ($DRY_RUN ? "DRY RUN (no deletions)" : "⚠️  LIVE DELETE MODE") . "\n";
echo "  DBs   : " . implode(', ', $DATABASES) . "\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$logLines     = ["Run at: " . date('c'), "Mode: " . ($DRY_RUN ? 'DRY_RUN' : 'DELETE'), "---"];
$globalSummary = [];

foreach ($DATABASES as $dbName) {
    echo "\n▶  Database: {$dbName}\n";
    echo "   ─────────────────────────────────────────────\n";

    try {
        $dsn  = "mysql:host={$DB_HOST};port={$DB_PORT};dbname={$dbName};charset=utf8mb4";
        $conn = new PDO($dsn, $DB_USER, $DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (PDOException $e) {
        echo "   ERROR: Cannot connect to {$dbName}: " . $e->getMessage() . "\n";
        $globalSummary[] = ['db' => $dbName, 'total' => 0, 'bad' => 0, 'error' => true];
        continue;
    }

    $total = (int)$conn->query("SELECT COUNT(*) FROM questions")->fetchColumn();
    echo "   Total questions: " . number_format($total) . "\n";

    $badIds       = [];
    $badReasons   = [];
    $reasonCounts = [];
    $offset       = 0;
    $processed    = 0;

    $stmt = $conn->prepare(
        "SELECT id, statement, options, correctAnswer, correct_answer, solution, explanation
         FROM questions
         LIMIT :limit OFFSET :offset"
    );

    while ($offset < $total) {
        $stmt->bindValue(':limit',  $BATCH_SIZE, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,     PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        if (empty($rows)) break;

        foreach ($rows as $row) {
            $result = isIncompatible($row, $KATEX_UNSUPPORTED, $BAD_HTML_PATTERN);
            if ($result['bad']) {
                $badIds[]               = $row['id'];
                $badReasons[$row['id']] = $result['reason'];
                // Group reason for summary
                $key = preg_replace('/^\[.*?\]\s*/', '', $result['reason']);
                $key = explode(':', $key)[0];
                $key = trim($key);
                $reasonCounts[$key] = ($reasonCounts[$key] ?? 0) + 1;
            }
        }

        $processed += count($rows);
        $offset    += $BATCH_SIZE;

        // Progress every 50k rows
        if ($processed % 50000 < $BATCH_SIZE || $processed >= $total) {
            echo "\r   Scanned " . number_format($processed) . " / " . number_format($total) . " ...";
            flush();
        }
    }

    echo "\r   Scanned " . number_format($total) . " / " . number_format($total) . " ✓\n";
    echo "   Found " . number_format(count($badIds)) . " incompatible questions\n";

    if (!empty($reasonCounts)) {
        echo "\n   Breakdown by reason:\n";
        arsort($reasonCounts);
        foreach ($reasonCounts as $reason => $count) {
            echo "     " . str_pad(number_format($count), 8, ' ', STR_PAD_LEFT) . " × {$reason}\n";
        }
    }

    $logLines[] = "\n[{$dbName}]";
    $logLines[] = "Total: {$total}";
    $logLines[] = "Bad:   " . count($badIds);
    foreach ($reasonCounts as $r => $c) {
        $logLines[] = "  {$c} x {$r}";
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (!$DRY_RUN && !empty($badIds)) {
        echo "\n   🗑️  Deleting " . number_format(count($badIds)) . " questions from {$dbName}...\n";
        $CHUNK   = 500;
        $deleted = 0;
        foreach (array_chunk($badIds, $CHUNK) as $chunk) {
            $placeholders = implode(',', array_fill(0, count($chunk), '?'));
            $delStmt = $conn->prepare("DELETE FROM questions WHERE id IN ({$placeholders})");
            $delStmt->execute($chunk);
            $deleted += count($chunk);
            echo "\r   Deleted " . number_format($deleted) . " / " . number_format(count($badIds)) . " ...";
            flush();
        }
        echo "\r   Deleted " . number_format($deleted) . " ✓                              \n";
        $logLines[] = "Deleted: {$deleted}";
    } elseif ($DRY_RUN && !empty($badIds)) {
        echo "\n   ℹ️  Dry-run — no deletions. Run with --delete to remove these.\n";
    }

    $globalSummary[] = ['db' => $dbName, 'total' => $total, 'bad' => count($badIds)];
}

// ── GLOBAL SUMMARY ─────────────────────────────────────────────────────────────
echo "\n\n═══════════════════════════════════════════════════════════════\n";
echo "  SUMMARY\n";
echo "═══════════════════════════════════════════════════════════════\n";

$grandTotal = 0;
$grandBad   = 0;
foreach ($globalSummary as $s) {
    if (isset($s['error'])) {
        echo "  " . str_pad($s['db'], 15) . "  CONNECTION ERROR\n";
        continue;
    }
    $pct = $s['total'] > 0 ? number_format(($s['bad'] / $s['total']) * 100, 2) : '0.00';
    echo "  " . str_pad($s['db'], 15) .
         str_pad(number_format($s['bad']), 8, ' ', STR_PAD_LEFT) . " bad / " .
         str_pad(number_format($s['total']), 10, ' ', STR_PAD_LEFT) . " total  ({$pct}%)\n";
    $grandTotal += $s['total'];
    $grandBad   += $s['bad'];
}

$grandPct = $grandTotal > 0 ? number_format(($grandBad / $grandTotal) * 100, 2) : '0.00';
echo "  ─────────────────────────────────────────────────────────────\n";
echo "  " . str_pad("TOTAL", 15) .
     str_pad(number_format($grandBad), 8, ' ', STR_PAD_LEFT) . " bad / " .
     str_pad(number_format($grandTotal), 10, ' ', STR_PAD_LEFT) . " total  ({$grandPct}%)\n";
echo "\n  Mode: " . ($DRY_RUN ? "DRY RUN – nothing deleted" : "DELETED") . "\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// Save log
$timestamp = date('Y-m-d_H-i-s');
$suffix    = $DRY_RUN ? 'dryrun' : 'deleted';
$logPath   = __DIR__ . "/../latex_cleanup_{$suffix}_{$timestamp}.log";
file_put_contents($logPath, implode("\n", $logLines));
echo "  Log saved: {$logPath}\n\n";
