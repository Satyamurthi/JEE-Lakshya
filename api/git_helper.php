<?php
header("Content-Type: text/plain");
echo "=== Staging and Committing Math Auto-Wrapping & OCR Typos fixes ===\n\n";

$add = shell_exec("git -C d:\\JEE add . 2>&1");
echo "ADD:\n" . $add . "\n\n";

$commit = shell_exec("git -C d:\\JEE commit -m \"Implement autoWrapMathInText to add missing dollar delimiters, fix OCR rimes typo, and update to surgical brace balancing\" 2>&1");
echo "COMMIT:\n" . $commit . "\n\n";

$push = shell_exec("git -C d:\\JEE push origin main 2>&1");
echo "PUSH:\n" . $push . "\n\n";
?>
