<?php
// Check if executing via CLI. Direct HTTP web execution is blocked for security.
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo json_encode(["error" => "Forbidden: This script can only be run via CLI."]);
    exit;
}

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
set_time_limit(1800); // 30 minutes max limit for large CLI batches
ini_set('max_execution_time', 1800);

// =============================================================================
// LaTeX Linter / Validator Helper
// =============================================================================
function validateLaTeX($text) {
    if (empty($text)) return true;
    
    // 1. Check even count of dollar delimiters
    $dollars = preg_match_all('/(?<!\\\\)\$/', $text);
    if ($dollars % 2 !== 0) return false;

    // 2. Check balance of inline math \( and \)
    $open_inline = substr_count($text, '\\(');
    $close_inline = substr_count($text, '\\)');
    if ($open_inline !== $close_inline) return false;

    // 3. Check balance of display math \[ and \]
    $open_display = substr_count($text, '\\[');
    $close_display = substr_count($text, '\\]');
    if ($open_display !== $close_display) return false;

    // 4. Check balance of curly braces (excluding escaped ones)
    $len = strlen($text);
    $open_braces = 0;
    for ($i = 0; $i < $len; $i++) {
        if ($text[$i] === '{' && ($i === 0 || $text[$i - 1] !== '\\')) {
            $open_braces++;
        } elseif ($text[$i] === '}' && ($i === 0 || $text[$i - 1] !== '\\')) {
            $open_braces--;
            if ($open_braces < 0) return false; // Orphan closing brace
        }
    }
    if ($open_braces !== 0) return false; // Unbalanced opening braces

    // 5. Check matching of environments \begin{aligned} ... \end{aligned}
    preg_match_all('/\\\\begin\s*\{([a-zA-Z*]+)\}/', $text, $begins);
    preg_match_all('/\\\\end\s*\{([a-zA-Z*]+)\}/', $text, $ends);
    if (count($begins[1]) !== count($ends[1])) return false;
    for ($k = 0; $k < count($begins[1]); $k++) {
        if (!in_array($begins[1][$k], $ends[1])) return false;
    }

    return true;
}

// Generate unique UUID
function uuidv4() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

// Generate question hash to prevent exact duplicates
function getQuestionHash($statement, $options) {
    $stmt = strtolower(preg_replace('/\s+/', '', $statement));
    $opts = is_array($options) ? json_encode($options) : $options;
    $opts = strtolower(preg_replace('/\s+/', '', $opts));
    return md5($stmt . '_' . $opts);
}

function getQuestionPatternId($statement) {
    $normalized = strtolower($statement);
    $normalized = preg_replace('/-?\b\d+(?:\.\d+)?\b/', '#', $normalized);
    $normalized = preg_replace('/[^a-z]/', '', $normalized);
    return md5($normalized);
}

// =============================================================================
// CLI Arguments Parsing Helper
// =============================================================================
$subject = 'Physics';
$chapter = 'Electrostatics';
$count = 100;

if (php_sapi_name() === 'cli') {
    $options = getopt("", ["subject:", "chapter:", "count:"]);
    $subject = isset($options['subject']) ? $options['subject'] : $subject;
    $chapter = isset($options['chapter']) ? $options['chapter'] : $chapter;
    $count = isset($options['count']) ? (int)$options['count'] : $count;
} else {
    $subject = isset($_GET['subject']) ? $_GET['subject'] : $subject;
    $chapter = isset($_GET['chapter']) ? $_GET['chapter'] : $chapter;
    $count = isset($_GET['count']) ? (int)$_GET['count'] : $count;
}

// =============================================================================
// Load / Initialize Persistent Progress Registry
// =============================================================================
$progress_file = "d:/JEE/generation_progress.json";
$registry = [
    "stats" => [],
    "hashes" => [],
    "parameters" => []
];

if (file_exists($progress_file)) {
    $registry = json_decode(file_get_contents($progress_file), true) ?: $registry;
}

// =============================================================================
// Helper to Check Near-Duplicate Parameters
// =============================================================================
function isNearDuplicate($chapter, $template_id, array $params, array &$registry) {
    $key = $chapter . "_" . $template_id;
    if (!isset($registry['parameters'][$key])) {
        return false;
    }
    
    foreach ($registry['parameters'][$key] as $existing_params) {
        $all_match = true;
        foreach ($params as $p_name => $p_val) {
            if (!isset($existing_params[$p_name])) {
                $all_match = false;
                break;
            }
            $v1 = floatval($p_val);
            $v2 = floatval($existing_params[$p_name]);
            
            // If the values are within 10% tolerance, consider them near-duplicates
            if ($v2 != 0 && abs(($v1 - $v2) / $v2) > 0.10) {
                $all_match = false;
                break;
            } elseif ($v2 == 0 && abs($v1) > 0.10) {
                $all_match = false;
                break;
            }
        }
        if ($all_match) return true; // Near-duplicate found
    }
    return false;
}

function registerParameters($chapter, $template_id, array $params, array &$registry) {
    $key = $chapter . "_" . $template_id;
    if (!isset($registry['parameters'][$key])) {
        $registry['parameters'][$key] = [];
    }
    $registry['parameters'][$key][] = $params;
}

// =============================================================================
// Templates Library Definition
// =============================================================================
$templates = [];

// ─────────────────────────────────────────────────────────────────────────────
// Physics: Electrostatics Templates
// ─────────────────────────────────────────────────────────────────────────────
if ($subject === 'Physics' && $chapter === 'Electrostatics') {
    // Template 1: Coulomb's Law Force
    $templates[1] = [
        "type" => "MCQ",
        "generate" => function() {
            $q1 = rand(10, 50); $q2 = rand(10, 50); $r = rand(2, 6);
            if ($r == 0) return null; // Solvability check
            $val = round((9 * $q1 * $q2) / ($r * $r) * 10, 2); // Force in mN
            return [
                "params" => ["q1" => $q1, "q2" => $q2, "r" => $r],
                "correct" => $val,
                "statement" => "Two point charges \$q_1 = {$q1} \\ \\mu\\text{C}\$ and \$q_2 = {$q2} \\ \\mu\\text{C}\$ are placed at a distance of \$r = {$r} \\ \\text{m}\$ in vacuum. Calculate the magnitude of the electrostatic force acting between them in milliNewtons (\\text{mN}).",
                "solution" => "Using Coulomb's law: \$F = k \\frac{|q_1 q_2|}{r^2}\$. Substituting the values: \$F = \\left(9 \\times 10^9\\right) \\frac{({$q1} \\times 10^{-6}) ({$q2} \\times 10^{-6})}{{$r}^2} = {$val} \\ \\text{mN}\$."
            ];
        }
    ];

    // Template 2: Electric Field from Point Charge
    $templates[2] = [
        "type" => "MCQ",
        "generate" => function() {
            $q = rand(5, 30); $r = rand(2, 5);
            $val = round((9 * $q) / ($r * $r), 2); // E-field in kN/C
            return [
                "params" => ["q" => $q, "r" => $r],
                "correct" => $val,
                "statement" => "Find the magnitude of the electric field at a distance of \$r = {$r} \\ \\text{m}\$ from a point charge \$q = {$q} \\ \\mu\\text{C}\$ in vacuum (in \\text{kN/C}).",
                "solution" => "The electric field is given by \$E = k \\frac{|q|}{r^2}\$. Substituting: \$E = \\left(9 \\times 10^9\\right) \\frac{{$q} \\times 10^{-6}}{{$r}^2} = {$val} \\ \\text{kN/C}\$."
            ];
        }
    ];

    // Template 3: Potential energy of a two-charge system
    $templates[3] = [
        "type" => "Numerical",
        "generate" => function() {
            $q1 = rand(2, 10); $q2 = rand(-10, -2); $r = rand(1, 4);
            $val = round((9 * $q1 * $q2) / $r * 10, 2); // Energy in mJ
            return [
                "params" => ["q1" => $q1, "q2" => $q2, "r" => $r],
                "correct" => $val,
                "statement" => "Two point charges \$q_1 = {$q1} \\ \\mu\\text{C}\$ and \$q_2 = {$q2} \\ \\mu\\text{C}\$ are separated by a distance of \$r = {$r} \\ \\text{m}\$ in vacuum. Find the electrostatic potential energy of the system in milliJoules (\\text{mJ}).",
                "solution" => "Potential energy is given by \$U = k \\frac{q_1 q_2}{r}\$. Substituting: \$U = \\left(9 \\times 10^9\\right) \\frac{({$q1} \\times 10^{-6}) ({$q2} \\times 10^{-6})}{{$r}} = {$val} \\ \\text{mJ}\$."
            ];
        }
    ];

    // Template 4: Capacitance of a parallel plate capacitor
    $templates[4] = [
        "type" => "MCQ",
        "generate" => function() {
            $area_cm2 = rand(50, 200); $dist_mm = rand(1, 5); $k = rand(2, 6);
            if ($dist_mm == 0) return null;
            // C = k * eps0 * A / d
            // eps0 = 8.85 * 10^-12 F/m
            $val = round(($k * 8.854 * ($area_cm2 * 1e-4) / ($dist_mm * 1e-3)) * 1e12, 2); // in pF
            return [
                "params" => ["area" => $area_cm2, "dist" => $dist_mm, "k" => $k],
                "correct" => $val,
                "statement" => "A parallel plate capacitor has plate area \$A = {$area_cm2} \\ \\text{cm}^2\$ and separation \$d = {$dist_mm} \\ \\text{mm}\$. The space between the plates is filled with a dielectric of constant \$K = {$k}\$. Find the capacitance in picoFarads (\\text{pF}) (Take \$\\varepsilon_0 = 8.854 \\times 10^{-12} \\ \\text{F/m}\$).",
                "solution" => "Capacitance is \$C = \\frac{K \\varepsilon_0 A}{d}\$. Substituting: \$C = \\frac{{$k} \\times (8.854 \\times 10^{-12}) \\times ({$area_cm2} \\times 10^{-4})}{{$dist_mm} \\times 10^{-3}} = {$val} \\ \\text{pF}\$."
            ];
        }
    ];

    // Template 5: Torque on a dipole
    $templates[5] = [
        "type" => "MCQ",
        "generate" => function() {
            $p = rand(2, 10); // * 10^-8 C-m
            $e = rand(10, 50); // * 10^4 N/C
            $angle = 30; // degrees
            $val = round(($p * 1e-8 * $e * 1e4 * sin(deg2rad($angle))) * 1e4, 2); // torque in 10^-4 N-m
            return [
                "params" => ["p" => $p, "e" => $e, "angle" => $angle],
                "correct" => $val,
                "statement" => "An electric dipole of dipole moment \$p = {$p} \\times 10^{-8} \\ \\text{C}\\cdot\\text{m}\$ is aligned at an angle of \${$angle}^\\circ\$ with a uniform electric field of magnitude \$E = {$e} \\times 10^4 \\ \\text{N/C}\$. Calculate the magnitude of the torque acting on the dipole in units of \$10^{-4} \\ \\text{N}\\cdot\\text{m}\$.",
                "solution" => "Torque is \$\\tau = p E \\sin(\\theta)\$. Substituting: \$\\tau = ({$p} \\times 10^{-8}) \\times ({$e} \\times 10^4) \\times \\sin({$angle}^\\circ) = {$val} \\times 10^{-4} \\ \\text{N}\\cdot\\text{m}\$."
            ];
        }
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mathematics: Matrices and Determinants Templates
// ─────────────────────────────────────────────────────────────────────────────
if ($subject === 'Mathematics' && $chapter === 'Matrices and Determinants') {
    // Template 1: Determinant of a 2x2 Matrix
    $templates[1] = [
        "type" => "MCQ",
        "generate" => function() {
            $a = rand(-5, 5); $b = rand(-5, 5); $c = rand(-5, 5); $d = rand(-5, 5);
            $val = ($a * $d) - ($b * $c);
            return [
                "params" => ["a" => $a, "b" => $b, "c" => $c, "d" => $d],
                "correct" => $val,
                "statement" => "Compute the determinant of the matrix: \$\$A = \\begin{pmatrix} {$a} & {$b} \\\\ {$c} & {$d} \\end{pmatrix}\$\$",
                "solution" => "The determinant is given by \$\\det(A) = ad - bc = ({$a} \\times {$d}) - ({$b} \\times {$c}) = {$val}\$."
            ];
        }
    ];

    // Template 2: Trace of Matrix Product
    $templates[2] = [
        "type" => "Numerical",
        "generate" => function() {
            $a1 = rand(-3, 3); $a2 = rand(-3, 3); $a3 = rand(-3, 3); $a4 = rand(-3, 3);
            $b1 = rand(-3, 3); $b2 = rand(-3, 3); $b3 = rand(-3, 3); $b4 = rand(-3, 3);
            // AB = [a1*b1 + a2*b3, a1*b2 + a2*b4]
            //      [a3*b1 + a4*b3, a3*b2 + a4*b4]
            $val = ($a1 * $b1 + $a2 * $b3) + ($a3 * $b2 + $a4 * $b4);
            return [
                "params" => ["a1" => $a1, "a2" => $a2, "b1" => $b1, "b4" => $b4],
                "correct" => $val,
                "statement" => "Let \$A = \\begin{pmatrix} {$a1} & {$a2} \\\\ {$a3} & {$a4} \\end{pmatrix}\$ and \$B = \\begin{pmatrix} {$b1} & {$b2} \\\\ {$b3} & {$b4} \\end{pmatrix}\$. Calculate the trace of the product matrix \$AB\$ (denoted as \\text{Tr}(AB)).",
                "solution" => "The diagonal elements of \$AB\$ are \$d_1 = a_1 b_1 + a_2 b_3 = " . ($a1*$b1 + $a2*$b3) . "\$ and \$d_2 = a_3 b_2 + a_4 b_4 = " . ($a3*$b2 + $a4*$b4) . "\$. The Trace is the sum of diagonal elements: \\text{Tr}(AB) = d_1 + d_2 = {$val}."
            ];
        }
    ];

    // Template 3: Orthogonality constant
    $templates[3] = [
        "type" => "MCQ",
        "generate" => function() {
            $k = rand(2, 5);
            $val = $k * $k;
            return [
                "params" => ["k" => $k],
                "correct" => $val,
                "statement" => "If the matrix \$A = \\frac{1}{{$k}} \\begin{pmatrix} x & 2 \\\\ -2 & y \\end{pmatrix}\$ is orthogonal, find the value of \$x^2 + y^2\$.",
                "solution" => "For an orthogonal matrix, \$A A^T = I\$. Multiplying rows gives \$x^2 + 4 = {$val}\$ and \$y^2 + 4 = {$val}\$. Adding the terms, we get \$x^2 = " . ($val - 4) . "\$ and \$y^2 = " . ($val - 4) . "\$. Hence, \$x^2 + y^2 = " . (2 * $val - 8) . "\$."
            ];
        }
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Chemistry: Physical Chemistry Stoichiometry Templates
// ─────────────────────────────────────────────────────────────────────────────
if ($subject === 'Chemistry' && $chapter === 'Some Basic Concepts in Chemistry') {
    // Template 1: Moles calculation from mass
    $templates[1] = [
        "type" => "MCQ",
        "generate" => function() {
            $mass = rand(10, 100) * 2; // grams of NaOH (Molar mass = 40)
            $val = round($mass / 40, 2); // Moles
            return [
                "params" => ["mass" => $mass],
                "correct" => $val,
                "statement" => "Calculate the number of moles in a sample of {$mass} grams of sodium hydroxide (\\text{NaOH}) (Molar mass of \\text{NaOH} = 40 \\ \\text{g/mol}).",
                "solution" => "Moles = \\frac{\\text{Mass}}{\\text{Molar Mass}} = \\frac{{$mass}}{40} = {$val} \\ \\text{moles}\$."
            ];
        }
    ];

    // Template 2: Molarity of solution
    $templates[2] = [
        "type" => "Numerical",
        "generate" => function() {
            $moles = rand(1, 5); $vol_ml = rand(200, 1000);
            if ($vol_ml == 0) return null;
            $val = round(($moles / ($vol_ml / 1000)), 2); // Molarity in M
            return [
                "params" => ["moles" => $moles, "vol" => $vol_ml],
                "correct" => $val,
                "statement" => "A solution is prepared by dissolving {$moles} moles of solute in enough water to make {$vol_ml} \\ \\text{mL}\$ of solution. Calculate the molarity of the solution in \\text{mol/L} (\\text{M}).",
                "solution" => "Molarity = \\frac{\\text{Moles of Solute}}{\\text{Volume of Solution in Liters}} = \\frac{{$moles}}{" . ($vol_ml / 1000) . "} = {$val} \\ \\text{M}\$."
            ];
        }
    ];
}

// Fallback generic template if no chapter matched
if (empty($templates)) {
    $templates[1] = [
        "type" => "MCQ",
        "generate" => function() use ($chapter) {
            $val = rand(1, 20);
            return [
                "params" => ["val" => $val],
                "correct" => $val,
                "statement" => "For the unit {$chapter}, find the value of the parameter \$x\$ if \$x + 5 = " . ($val + 5) . "\$.",
                "solution" => "Solving for \$x\$, we get \$x = " . ($val + 5) . " - 5 = {$val}\$."
            ];
        }
    ];
}

// =============================================================================
// Batch Generation & Commit Loop
// =============================================================================
try {
    require_once __DIR__ . '/db.php';
    $mysql_conn = $conn;

    $sqlite_path = "d:/JEE/jee/DB/jeebakend.DB";
    $sqlite_conn = null;
    if (file_exists($sqlite_path)) {
        $sqlite_conn = new PDO("sqlite:" . $sqlite_path);
        $sqlite_conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    $generated_list = [];
    $discarded_validation = 0;
    $discarded_duplicate = 0;
    $inserted_count = 0;

    $t_keys = array_keys($templates);

    for ($i = 0; $i < $count; $i++) {
        // 1. Pick a template randomly
        $t_id = $t_keys[array_rand($t_keys)];
        $tmpl = $templates[$t_id];

        // 2. Generate values
        $q_data = $tmpl['generate']();
        if (!$q_data) {
            $discarded_validation++;
            $i--;
            continue;
        }

        // 3. Solvability checks
        $correct = $q_data['correct'];
        if (is_nan($correct) || is_infinite($correct) || $correct === null) {
            $discarded_validation++;
            $i--;
            continue;
        }

        // 4. Near-Duplicate Check
        if (isNearDuplicate($chapter, $t_id, $q_data['params'], $registry)) {
            $discarded_duplicate++;
            $i--;
            continue;
        }

        // 5. Build MCQ Options if MCQ
        $options = null;
        $correctAnswer = "A";
        if ($tmpl['type'] === 'MCQ') {
            $optA = $correct;
            $optB = round($correct * 1.5 + 1, 2);
            $optC = round($correct * 0.5 - 1, 2);
            $optD = round($correct * 2.2, 2);

            // Verification: Ensure exactly one option matches correct answer
            if ($optA == $optB || $optA == $optC || $optA == $optD) {
                $discarded_validation++;
                $i--;
                continue;
            }

            $opt_pool = [
                "A" => "$optA",
                "B" => "$optB",
                "C" => "$optC",
                "D" => "$optD"
            ];
            
            // Convert to array of values, shuffle, and re-assign keys A, B, C, D
            $values = array_values($opt_pool);
            shuffle($values);
            
            $options = [
                "A" => $values[0],
                "B" => $values[1],
                "C" => $values[2],
                "D" => $values[3]
            ];
            
            // Find which key holds the correct answer (matching $correct)
            $correctAnswer = "A";
            foreach ($options as $key => $val) {
                if ((float)$val === (float)$correct) {
                    $correctAnswer = $key;
                    break;
                }
            }
        } else {
            // Numerical answer
            $options = null;
            $correctAnswer = "$correct";
        }

        // 6. LaTeX Linter Checks
        if (!validateLaTeX($q_data['statement']) || !validateLaTeX($q_data['solution'])) {
            $discarded_validation++;
            $i--;
            continue;
        }

        // 7. Exact Duplicate Check
        $hash = getQuestionHash($q_data['statement'], $options);
        if (in_array($hash, $registry['hashes'])) {
            $discarded_duplicate++;
            $i--;
            continue;
        }

        // 8. Register and Write to DB
        registerParameters($chapter, $t_id, $q_data['params'], $registry);
        $registry['hashes'][] = $hash;

        $pattern_id = getQuestionPatternId($q_data['statement']);

        $q_record = [
            "id" => uuidv4(),
            "subject" => $subject,
            "chapter" => $chapter,
            "topic" => isset($q_data['topic']) ? $q_data['topic'] : $chapter,
            "concept" => $chapter,
            "type" => $tmpl['type'],
            "difficulty" => "Hard",
            "statement" => $q_data['statement'],
            "options" => $options,
            "correctAnswer" => $correctAnswer,
            "correct_answer" => $correctAnswer,
            "solution" => $q_data['solution'],
            "explanation" => $q_data['solution'],
            "pattern_id" => $pattern_id
        ];

        // Commit to MySQL
        $stmt = $mysql_conn->prepare("INSERT INTO `questions` (`id`, `subject`, `chapter`, `topic`, `concept`, `type`, `difficulty`, `statement`, `options`, `correctAnswer`, `correct_answer`, `solution`, `explanation`, `pattern_id`) VALUES (:id, :sub, :ch, :tp, :cp, :ty, :df, :st, :op, :ca, :ca_snake, :sol, :exp, :pid) ON DUPLICATE KEY UPDATE id=id");
        $stmt->execute([
            ":id" => $q_record['id'],
            ":sub" => $q_record['subject'],
            ":ch" => $q_record['chapter'],
            ":tp" => $q_record['topic'],
            ":cp" => $q_record['concept'],
            ":ty" => $q_record['type'],
            ":df" => $q_record['difficulty'],
            ":st" => $q_record['statement'],
            ":op" => $options ? json_encode($options) : null,
            ":ca" => $q_record['correctAnswer'],
            ":ca_snake" => $q_record['correct_answer'],
            ":sol" => $q_record['solution'],
            ":exp" => $q_record['explanation'],
            ":pid" => $q_record['pattern_id']
        ]);

        // Commit to SQLite
        if ($sqlite_conn) {
            $sqlite_stmt = $sqlite_conn->prepare("INSERT OR IGNORE INTO `questions` (`id`, `subject`, `chapter`, `topic`, `concept`, `type`, `difficulty`, `statement`, `options`, `correctAnswer`, `correct_answer`, `solution`, `explanation`, `pattern_id`) VALUES (:id, :sub, :ch, :tp, :cp, :ty, :df, :st, :op, :ca, :ca_snake, :sol, :exp, :pid)");
            $sqlite_stmt->execute([
                ":id" => $q_record['id'],
                ":sub" => $q_record['subject'],
                ":ch" => $q_record['chapter'],
                ":tp" => $q_record['topic'],
                ":cp" => $q_record['concept'],
                ":ty" => $q_record['type'],
                ":df" => $q_record['difficulty'],
                ":st" => $q_record['statement'],
                ":op" => $options ? json_encode($options) : null,
                ":ca" => $q_record['correctAnswer'],
                ":ca_snake" => $q_record['correct_answer'],
                ":sol" => $q_record['solution'],
                ":exp" => $q_record['explanation'],
                ":pid" => $q_record['pattern_id']
            ]);
        }

        $generated_list[] = $q_record;
        $inserted_count++;
    }

    // =============================================================================
    // Update Progress log and Write file
    // =============================================================================
    if (!isset($registry['stats'][$chapter])) {
        $registry['stats'][$chapter] = [
            "generated_mcqs" => 0,
            "generated_numericals" => 0,
            "discarded_validation" => 0,
            "discarded_duplicate" => 0
        ];
    }

    foreach ($generated_list as $g_q) {
        if ($g_q['type'] === 'MCQ') {
            $registry['stats'][$chapter]['generated_mcqs']++;
        } else {
            $registry['stats'][$chapter]['generated_numericals']++;
        }
    }
    $registry['stats'][$chapter]['discarded_validation'] += $discarded_validation;
    $registry['stats'][$chapter]['discarded_duplicate'] += $discarded_duplicate;

    file_put_contents($progress_file, json_encode($registry, JSON_PRETTY_PRINT));

    echo json_encode([
        "success" => true,
        "subject" => $subject,
        "chapter" => $chapter,
        "total_batch_count" => $count,
        "inserted" => $inserted_count,
        "discarded_validation" => $discarded_validation,
        "discarded_duplicate" => $discarded_duplicate,
        "total_overall_mcqs" => $registry['stats'][$chapter]['generated_mcqs'],
        "total_overall_numericals" => $registry['stats'][$chapter]['generated_numericals']
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
