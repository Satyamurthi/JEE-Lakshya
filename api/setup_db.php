<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Active-Stream, apikey, prefer, Range");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$host = "127.0.0.1";
$username = "root";
$password = ""; // Default empty password in XAMPP
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
        
        // 1. Create profiles table
        $conn->exec("CREATE TABLE IF NOT EXISTS profiles (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            full_name VARCHAR(255) NULL,
            mobile_number VARCHAR(20) NULL,
            college_name VARCHAR(255) NULL,
            college_address VARCHAR(255) NULL,
            stream VARCHAR(100) NULL,
            selected_stream VARCHAR(100) NULL,
            password VARCHAR(255) NULL,
            role VARCHAR(50) DEFAULT 'student',
            status VARCHAR(50) DEFAULT 'pending',
            admin_id VARCHAR(36) NULL,
            has_used_free_test TINYINT(1) DEFAULT 0,
            admin_max_students INT DEFAULT 30,
            subscription_expires_at VARCHAR(50) NULL,
            subscription_tier VARCHAR(100) DEFAULT 'free',
            is_frozen TINYINT(1) DEFAULT 0,
            super_admin_permission TINYINT(1) DEFAULT 0,
            can_access_daily TINYINT(1) DEFAULT 1,
            can_access_full_exam TINYINT(1) DEFAULT 1,
            can_access_practice TINYINT(1) DEFAULT 1,
            current_exam_token VARCHAR(255) NULL,
            current_exam_started_at VARCHAR(50) NULL,
            gemini_api_key TEXT NULL,
            failed_attempts INT DEFAULT 0,
            created_at VARCHAR(50) NULL
        )");

        // Add migration for existing installations
        $profile_migrations = [
            "ALTER TABLE profiles MODIFY COLUMN created_at VARCHAR(50) NULL",
            "ALTER TABLE profiles MODIFY COLUMN subscription_expires_at VARCHAR(50) NULL",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_stream VARCHAR(100) NULL",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_exam_token VARCHAR(255) NULL",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_exam_started_at VARCHAR(50) NULL",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(100) DEFAULT 'free'",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_max_students INT DEFAULT 30",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at VARCHAR(50) NULL",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_frozen TINYINT(1) DEFAULT 0",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS super_admin_permission TINYINT(1) DEFAULT 0",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_access_daily TINYINT(1) DEFAULT 1",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_access_full_exam TINYINT(1) DEFAULT 1",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_access_practice TINYINT(1) DEFAULT 1"
        ];
        foreach ($profile_migrations as $mig) {
            try { $conn->exec($mig); } catch (Exception $e) {}
        }


        // 2. Create exam_attempts table
        $conn->exec("CREATE TABLE IF NOT EXISTS exam_attempts (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            user_name VARCHAR(255) NULL,
            score INT DEFAULT 0,
            total_marks INT DEFAULT 0,
            accuracy INT DEFAULT 0,
            config JSON NULL,
            questions JSON NULL,
            paid TINYINT(1) DEFAULT 0,
            submitted_at VARCHAR(50) NULL
        )");

        // 3. Create daily_challenges table
        try {
            $tableCheck = $conn->query("SHOW COLUMNS FROM `daily_challenges` LIKE 'id'")->fetch();
            if (!$tableCheck) {
                $conn->exec("DROP TABLE IF EXISTS `daily_challenges`");
            }
        } catch (Exception $e) {}

        $conn->exec("CREATE TABLE IF NOT EXISTS daily_challenges (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date VARCHAR(20) NOT NULL,
            questions JSON NULL,
            subject VARCHAR(100) NULL,
            admin_id VARCHAR(36) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // 4. Create daily_attempts table
        $conn->exec("CREATE TABLE IF NOT EXISTS daily_attempts (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            challenge_id VARCHAR(20) NOT NULL,
            score INT DEFAULT 0,
            total_marks INT DEFAULT 0,
            accuracy INT DEFAULT 0,
            config JSON NULL,
            paid TINYINT(1) DEFAULT 0,
            submitted_at VARCHAR(50) NULL
        )");

        try {
            $conn->exec("ALTER TABLE daily_attempts ADD COLUMN IF NOT EXISTS paid TINYINT(1) DEFAULT 0");
        } catch (Exception $e) {}

        // 5. Create system_config table
        $conn->exec("CREATE TABLE IF NOT EXISTS system_config (
            `key` VARCHAR(100) PRIMARY KEY,
            `value` JSON NULL
        )");

        // 6. Create subscription_plans table
        $conn->exec("CREATE TABLE IF NOT EXISTS subscription_plans (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price INT DEFAULT 0,
            duration_days INT DEFAULT 0,
            features JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // 7. Create questions table
        $conn->exec("CREATE TABLE IF NOT EXISTS questions (
            id VARCHAR(255) PRIMARY KEY,
            subject VARCHAR(255) NULL,
            chapter VARCHAR(255) NULL,
            type VARCHAR(50) NULL,
            difficulty VARCHAR(50) NULL,
            statement TEXT NULL,
            options JSON NULL,
            correctAnswer VARCHAR(255) NULL,
            solution TEXT NULL,
            explanation TEXT NULL,
            concept VARCHAR(255) NULL,
            markingScheme JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // 8. Seed default Super Admin account if none exists
        $checkAdmin = $conn->query("SELECT COUNT(*) FROM profiles WHERE role = 'super_admin'");
        if ((int)$checkAdmin->fetchColumn() === 0) {
            $adminId = '00000000-0000-0000-0000-000000000000';
            $insertAdmin = $conn->prepare("INSERT INTO profiles (id, email, full_name, role, status, password) VALUES (?, ?, ?, ?, ?, ?)");
            $insertAdmin->execute([
                $adminId,
                'satyu000@gmail.com',
                'Super Admin',
                'super_admin',
                'approved',
                'satyupassword'
            ]);
        }

        $results[$db_name] = "Success";
    } catch (PDOException $e) {
        $results[$db_name] = "Error: " . $e->getMessage();
    }
}

echo json_encode(["status" => "done", "results" => $results]);
?>
