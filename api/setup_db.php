<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$host = "127.0.0.1";
$username = "root";
$password = ""; // Default empty password
$databases = ["jee_nexus", "neet_nexus", "kcet_nexus", "upsc_nexus"];

$results = [];

foreach ($databases as $db_name) {
    try {
        // Create database if not exists
        $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        // Connect to database
        $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // ─────────────────────────────────────────────────────────────
        // 1. profiles table
        // ─────────────────────────────────────────────────────────────
        $conn->exec("CREATE TABLE IF NOT EXISTS `profiles` (
            `id` VARCHAR(36) PRIMARY KEY,
            `email` VARCHAR(255) NOT NULL UNIQUE,
            `full_name` VARCHAR(255) NULL,
            `mobile_number` VARCHAR(20) NULL,
            `college_name` VARCHAR(255) NULL,
            `college_address` VARCHAR(255) NULL,
            `stream` VARCHAR(100) NULL,
            `selected_stream` VARCHAR(100) NULL,
            `password` VARCHAR(255) NULL,
            `role` VARCHAR(50) DEFAULT 'student',
            `status` VARCHAR(50) DEFAULT 'pending',
            `admin_id` VARCHAR(36) NULL,
            `has_used_free_test` TINYINT(1) DEFAULT 0,
            `admin_max_students` INT DEFAULT 30,
            `subscription_expires_at` VARCHAR(50) NULL,
            `subscription_tier` VARCHAR(100) DEFAULT 'free',
            `is_frozen` TINYINT(1) DEFAULT 0,
            `super_admin_permission` TINYINT(1) DEFAULT 0,
            `can_access_daily` TINYINT(1) DEFAULT 1,
            `can_access_full_exam` TINYINT(1) DEFAULT 1,
            `can_access_practice` TINYINT(1) DEFAULT 1,
            `current_exam_token` VARCHAR(255) NULL,
            `current_exam_started_at` VARCHAR(50) NULL,
            `gemini_api_key` TEXT NULL,
            `failed_attempts` INT DEFAULT 0,
            `session_token` VARCHAR(255) NULL,
            `session_expires_at` VARCHAR(50) NULL,
            `created_at` VARCHAR(50) NULL
        )");

        // Migrations for existing installations
        $profile_migrations = [
            "ALTER TABLE `profiles` MODIFY COLUMN `created_at` VARCHAR(50) NULL",
            "ALTER TABLE `profiles` MODIFY COLUMN `subscription_expires_at` VARCHAR(50) NULL",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `failed_attempts` INT DEFAULT 0",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `selected_stream` VARCHAR(100) NULL",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `current_exam_token` VARCHAR(255) NULL",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `current_exam_started_at` VARCHAR(50) NULL",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `subscription_tier` VARCHAR(100) DEFAULT 'free'",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `admin_max_students` INT DEFAULT 30",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `is_frozen` TINYINT(1) DEFAULT 0",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `super_admin_permission` TINYINT(1) DEFAULT 0",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `can_access_daily` TINYINT(1) DEFAULT 1",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `can_access_full_exam` TINYINT(1) DEFAULT 1",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `can_access_practice` TINYINT(1) DEFAULT 1",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `mobile_number` VARCHAR(20) NULL",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `college_name` VARCHAR(255) NULL",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `college_address` VARCHAR(255) NULL",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `session_token` VARCHAR(255) NULL",
            "ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `session_expires_at` VARCHAR(50) NULL"
        ];
        foreach ($profile_migrations as $mig) {
            try { $conn->exec($mig); } catch (Exception $e) {}
        }

        // ─────────────────────────────────────────────────────────────
        // 2. exam_attempts table
        // ─────────────────────────────────────────────────────────────
        $conn->exec("CREATE TABLE IF NOT EXISTS `exam_attempts` (
            `id` VARCHAR(36) PRIMARY KEY,
            `user_id` VARCHAR(36) NOT NULL,
            `user_name` VARCHAR(255) NULL,
            `user_email` VARCHAR(255) NULL,
            `score` INT DEFAULT 0,
            `total_marks` INT DEFAULT 0,
            `accuracy` INT DEFAULT 0,
            `config` JSON NULL,
            `questions` JSON NULL,
            `paid` TINYINT(1) DEFAULT 0,
            `stream` VARCHAR(100) NULL,
            `submitted_at` VARCHAR(50) NULL
        )");

        $exam_migrations = [
            "ALTER TABLE `exam_attempts` ADD COLUMN IF NOT EXISTS `paid` TINYINT(1) DEFAULT 0",
            "ALTER TABLE `exam_attempts` ADD COLUMN IF NOT EXISTS `user_email` VARCHAR(255) NULL",
            "ALTER TABLE `exam_attempts` ADD COLUMN IF NOT EXISTS `stream` VARCHAR(100) NULL",
            "ALTER TABLE `exam_attempts` ADD COLUMN IF NOT EXISTS `user_name` VARCHAR(255) NULL"
        ];
        foreach ($exam_migrations as $mig) {
            try { $conn->exec($mig); } catch (Exception $e) {}
        }

        // ─────────────────────────────────────────────────────────────
        // 3. daily_challenges table
        // ─────────────────────────────────────────────────────────────
        try {
            $tableCheck = $conn->query("SHOW COLUMNS FROM `daily_challenges` LIKE 'id'")->fetch();
            if (!$tableCheck) {
                $conn->exec("DROP TABLE IF EXISTS `daily_challenges`");
            }
        } catch (Exception $e) {}

        $conn->exec("CREATE TABLE IF NOT EXISTS `daily_challenges` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `date` VARCHAR(20) NOT NULL,
            `questions` JSON NULL,
            `subject` VARCHAR(100) NULL,
            `admin_id` VARCHAR(36) NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // ─────────────────────────────────────────────────────────────
        // 4. daily_attempts table
        // ─────────────────────────────────────────────────────────────
        $conn->exec("CREATE TABLE IF NOT EXISTS `daily_attempts` (
            `id` VARCHAR(36) PRIMARY KEY,
            `user_id` VARCHAR(36) NOT NULL,
            `challenge_id` VARCHAR(20) NOT NULL,
            `score` INT DEFAULT 0,
            `total_marks` INT DEFAULT 0,
            `accuracy` INT DEFAULT 0,
            `config` JSON NULL,
            `paid` TINYINT(1) DEFAULT 0,
            `submitted_at` VARCHAR(50) NULL
        )");

        $daily_migrations = [
            "ALTER TABLE `daily_attempts` ADD COLUMN IF NOT EXISTS `paid` TINYINT(1) DEFAULT 0"
        ];
        foreach ($daily_migrations as $mig) {
            try { $conn->exec($mig); } catch (Exception $e) {}
        }

        // ─────────────────────────────────────────────────────────────
        // 5. system_config table
        // ─────────────────────────────────────────────────────────────
        $conn->exec("CREATE TABLE IF NOT EXISTS `system_config` (
            `key` VARCHAR(100) PRIMARY KEY,
            `value` JSON NULL,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )");

        try { $conn->exec("ALTER TABLE `system_config` ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"); } catch (Exception $e) {}

        // ─────────────────────────────────────────────────────────────
        // 6. subscription_plans table
        // ─────────────────────────────────────────────────────────────
        $conn->exec("CREATE TABLE IF NOT EXISTS `subscription_plans` (
            `id` VARCHAR(50) PRIMARY KEY,
            `name` VARCHAR(100) NOT NULL,
            `price_monthly` INT DEFAULT 0,
            `price_yearly` INT DEFAULT 0,
            `price` INT DEFAULT 0,
            `duration_days` INT DEFAULT 0,
            `description` TEXT NULL,
            `badge` VARCHAR(50) NULL,
            `highlighted` TINYINT(1) DEFAULT 0,
            `color` VARCHAR(100) NULL,
            `glow_color` VARCHAR(100) NULL,
            `features` JSON NULL,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )");

        $plan_migrations = [
            "ALTER TABLE `subscription_plans` ADD COLUMN IF NOT EXISTS `price_monthly` INT DEFAULT 0",
            "ALTER TABLE `subscription_plans` ADD COLUMN IF NOT EXISTS `price_yearly` INT DEFAULT 0",
            "ALTER TABLE `subscription_plans` ADD COLUMN IF NOT EXISTS `description` TEXT NULL",
            "ALTER TABLE `subscription_plans` ADD COLUMN IF NOT EXISTS `badge` VARCHAR(50) NULL",
            "ALTER TABLE `subscription_plans` ADD COLUMN IF NOT EXISTS `highlighted` TINYINT(1) DEFAULT 0",
            "ALTER TABLE `subscription_plans` ADD COLUMN IF NOT EXISTS `color` VARCHAR(100) NULL",
            "ALTER TABLE `subscription_plans` ADD COLUMN IF NOT EXISTS `glow_color` VARCHAR(100) NULL",
            "ALTER TABLE `subscription_plans` ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ];
        foreach ($plan_migrations as $mig) {
            try { $conn->exec($mig); } catch (Exception $e) {}
        }

        // ─────────────────────────────────────────────────────────────
        // 7. questions table
        // ─────────────────────────────────────────────────────────────
        $conn->exec("CREATE TABLE IF NOT EXISTS `questions` (
            `id` VARCHAR(255) PRIMARY KEY,
            `paper_id` VARCHAR(100) NULL,
            `subject` VARCHAR(255) NULL,
            `chapter` VARCHAR(255) NULL,
            `topic` VARCHAR(255) NULL,
            `concept` VARCHAR(255) NULL,
            `type` VARCHAR(50) NULL,
            `difficulty` VARCHAR(50) NULL,
            `statement` TEXT NULL,
            `options` JSON NULL,
            `correctAnswer` VARCHAR(255) NULL,
            `correct_answer` VARCHAR(255) NULL,
            `solution` TEXT NULL,
            `explanation` TEXT NULL,
            `markingScheme` JSON NULL,
            `year` INT NULL,
            `pattern_id` VARCHAR(64) NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $q_migrations = [
            "ALTER TABLE `questions` ADD COLUMN IF NOT EXISTS `paper_id` VARCHAR(100) NULL",
            "ALTER TABLE `questions` ADD COLUMN IF NOT EXISTS `topic` VARCHAR(255) NULL",
            "ALTER TABLE `questions` ADD COLUMN IF NOT EXISTS `concept` VARCHAR(255) NULL",
            "ALTER TABLE `questions` ADD COLUMN IF NOT EXISTS `correct_answer` VARCHAR(255) NULL",
            "ALTER TABLE `questions` ADD COLUMN IF NOT EXISTS `markingScheme` JSON NULL",
            "ALTER TABLE `questions` ADD COLUMN IF NOT EXISTS `year` INT NULL",
            "ALTER TABLE `questions` ADD COLUMN IF NOT EXISTS `solution` TEXT NULL",
            "ALTER TABLE `questions` ADD COLUMN IF NOT EXISTS `pattern_id` VARCHAR(64) NULL",
            "CREATE INDEX IF NOT EXISTS `idx_questions_pattern_id` ON `questions` (`pattern_id`)"
        ];
        foreach ($q_migrations as $mig) {
            try { $conn->exec($mig); } catch (Exception $e) {}
        }

        // ─────────────────────────────────────────────────────────────
        // 8. payment_logs table  ← NEW: stores every Razorpay transaction
        // ─────────────────────────────────────────────────────────────
        $conn->exec("CREATE TABLE IF NOT EXISTS `payment_logs` (
            `id` VARCHAR(36) PRIMARY KEY,
            `payment_id` VARCHAR(100) NOT NULL,
            `order_id` VARCHAR(100) NOT NULL,
            `user_id` VARCHAR(36) NULL,
            `user_email` VARCHAR(255) NULL,
            `user_name` VARCHAR(255) NULL,
            `amount_paise` INT DEFAULT 0,
            `amount_rupees` DECIMAL(10,2) DEFAULT 0.00,
            `plan_id` VARCHAR(100) NULL,
            `plan_name` VARCHAR(255) NULL,
            `stream` VARCHAR(100) NULL,
            `status` VARCHAR(50) DEFAULT 'verified',
            `verified_at` VARCHAR(50) NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $payment_migrations = [
            "ALTER TABLE `payment_logs` ADD COLUMN IF NOT EXISTS `plan_name` VARCHAR(255) NULL",
            "ALTER TABLE `payment_logs` ADD COLUMN IF NOT EXISTS `stream` VARCHAR(100) NULL"
        ];
        foreach ($payment_migrations as $mig) {
            try { $conn->exec($mig); } catch (Exception $e) {}
        }

        // ─────────────────────────────────────────────────────────────
        // 9. activity_log table  ← NEW: audit trail for all user actions
        // ─────────────────────────────────────────────────────────────
        $conn->exec("CREATE TABLE IF NOT EXISTS `activity_log` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` VARCHAR(36) NOT NULL,
            `user_email` VARCHAR(255) NULL,
            `user_name` VARCHAR(255) NULL,
            `event_type` VARCHAR(100) NOT NULL,
            `metadata` JSON NULL,
            `stream` VARCHAR(100) NULL,
            `ip_address` VARCHAR(45) NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Add index for faster user lookups on activity_log
        try { $conn->exec("CREATE INDEX IF NOT EXISTS `idx_activity_user_id` ON `activity_log` (`user_id`)"); } catch (Exception $e) {}
        try { $conn->exec("CREATE INDEX IF NOT EXISTS `idx_activity_event` ON `activity_log` (`event_type`)"); } catch (Exception $e) {}

        // ─────────────────────────────────────────────────────────────
        // 10. Seed default Super Admin account if none exists
        // ─────────────────────────────────────────────────────────────
        $checkAdmin = $conn->query("SELECT COUNT(*) FROM `profiles` WHERE `role` = 'super_admin'");
        if ((int)$checkAdmin->fetchColumn() === 0) {
            $adminId = '00000000-0000-0000-0000-000000000000';
            $insertAdmin = $conn->prepare("INSERT INTO `profiles` (`id`, `email`, `full_name`, `role`, `status`, `password`, `can_access_daily`, `can_access_full_exam`, `can_access_practice`, `super_admin_permission`) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1, 1)");
            $hashedPassword = password_hash('satyupassword', PASSWORD_BCRYPT);
            $insertAdmin->execute([
                $uuid_for_bind = $adminId,
                $email_for_bind = 'satyu000@gmail.com',
                $name_for_bind = 'Super Admin',
                $role_for_bind = 'super_admin',
                $status_for_bind = 'approved',
                $password_for_bind = $hashedPassword
            ]);
        }

        $results[$db_name] = "Success — all 9 tables created/verified";
    } catch (PDOException $e) {
        $results[$db_name] = "Error: " . $e->getMessage();
    }
}

echo json_encode(["status" => "done", "results" => $results, "tables" => ["profiles","exam_attempts","daily_challenges","daily_attempts","system_config","subscription_plans","questions","payment_logs","activity_log"]]);
?>
