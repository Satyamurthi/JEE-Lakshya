<?php
header("Content-Type: text/plain");
echo "=== Staging and Committing MathRenderer fixes ===\n\n";

$add = shell_exec("git -C d:\\JEE add . 2>&1");
echo "ADD:\n" . $add . "\n\n";

$commit = shell_exec("git -C d:\\JEE commit -m \"Fix isMathLine and processSingleTextLine to exclude text lines containing English words or explicit delimiters from display-math wrapping\" 2>&1");
echo "COMMIT:\n" . $commit . "\n\n";

$push = shell_exec("git -C d:\\JEE push origin main 2>&1");
echo "PUSH:\n" . $push . "\n\n";
?>
