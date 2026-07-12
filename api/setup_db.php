<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

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
            password VARCHAR(255) NULL,
            role VARCHAR(50) DEFAULT 'student',
            status VARCHAR(50) DEFAULT 'pending',
            admin_id VARCHAR(36) NULL,
            has_used_free_test TINYINT(1) DEFAULT 0,
            admin_max_students INT DEFAULT 30,
            subscription_expires_at VARCHAR(50) NULL,
            gemini_api_key TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

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
            submitted_at VARCHAR(50) NULL
        )");

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

        $results[$db_name] = "Success";
    } catch (PDOException $e) {
        $results[$db_name] = "Error: " . $e->getMessage();
    }
}

echo json_encode(["status" => "done", "results" => $results]);
?>
