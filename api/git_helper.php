<?php
header("Content-Type: text/plain");
echo "=== Executing Git Commands via PHP System Call ===\n\n";

$status = shell_exec("git -C d:\\JEE status 2>&1");
echo "STATUS BEFORE:\n" . $status . "\n\n";

$add = shell_exec("git -C d:\\JEE add . 2>&1");
echo "ADD:\n" . $add . "\n\n";

$commit = shell_exec("git -C d:\\JEE commit -m \"Refactor LaTeX rendering pipeline to MathRenderer, resolve correctness N/A evaluation bug, add backend field mirroring, and fix compilation errors\" 2>&1");
echo "COMMIT:\n" . $commit . "\n\n";

$push = shell_exec("git -C d:\\JEE push 2>&1");
echo "PUSH:\n" . $push . "\n\n";
?>
