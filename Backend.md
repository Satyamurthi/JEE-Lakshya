# Backend Architecture & SQL Reference Guide (`Backend.md`)

This document contains the complete technical specifications, database schema SQL statements, PHP proxy routes, and stream mapping details for the backend system.

---

## 1. Multi-Stream Database Schemas

The backend uses four distinct MySQL/MariaDB schemas to keep student records, question banks, and exam attempts strictly partitioned per exam stream:

1. `jee_nexus` — JEE Main & Advanced
2. `neet_nexus` — NEET UG
3. `kcet_nexus` — KCET
4. `upsc_nexus` — UPSC CSE

---

## 2. Complete SQL Creation Scripts

Run the following SQL commands on your MariaDB/MySQL instance to create the tables manually for any database stream (e.g. `jee_nexus`):

```sql
CREATE DATABASE IF NOT EXISTS `jee_nexus` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `jee_nexus`;

-- 1. Profiles Table (Students, Admins, Super Admin)
CREATE TABLE IF NOT EXISTS `profiles` (
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
    `created_at` VARCHAR(50) NULL
);

-- Seed Super Admin Account
INSERT INTO `profiles` (`id`, `email`, `full_name`, `role`, `status`, `super_admin_permission`, `created_at`) 
VALUES ('00000000-0000-0000-0000-000000000000', 'satyu000@gmail.com', 'Super Admin', 'super_admin', 'approved', 1, NOW())
ON DUPLICATE KEY UPDATE `role` = 'super_admin';

-- 2. Exam Attempts Table
CREATE TABLE IF NOT EXISTS `exam_attempts` (
    `id` VARCHAR(36) PRIMARY KEY,
    `user_id` VARCHAR(36) NOT NULL,
    `user_name` VARCHAR(255) NULL,
    `score` INT DEFAULT 0,
    `total_marks` INT DEFAULT 0,
    `accuracy` INT DEFAULT 0,
    `config` JSON NULL,
    `questions` JSON NULL,
    `paid` TINYINT(1) DEFAULT 0,
    `submitted_at` VARCHAR(50) NULL
);

-- 3. Daily Challenges Table
CREATE TABLE IF NOT EXISTS `daily_challenges` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `date` VARCHAR(20) NOT NULL,
    `questions` JSON NULL,
    `subject` VARCHAR(100) NULL,
    `admin_id` VARCHAR(36) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Daily Attempts Table
CREATE TABLE IF NOT EXISTS `daily_attempts` (
    `id` VARCHAR(36) PRIMARY KEY,
    `user_id` VARCHAR(36) NOT NULL,
    `challenge_id` VARCHAR(20) NOT NULL,
    `score` INT DEFAULT 0,
    `total_marks` INT DEFAULT 0,
    `accuracy` INT DEFAULT 0,
    `config` JSON NULL,
    `paid` TINYINT(1) DEFAULT 0,
    `submitted_at` VARCHAR(50) NULL
);

-- 5. System Config Table
CREATE TABLE IF NOT EXISTS `system_config` (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` JSON NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Subscription Plans Table
CREATE TABLE IF NOT EXISTS `subscription_plans` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `price_monthly` INT DEFAULT 0,
    `price_yearly` INT DEFAULT 0,
    `description` TEXT NULL,
    `badge` VARCHAR(50) NULL,
    `highlighted` TINYINT(1) DEFAULT 0,
    `color` VARCHAR(100) NULL,
    `glow_color` VARCHAR(100) NULL,
    `features` JSON NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. Questions Bank Table
CREATE TABLE IF NOT EXISTS `questions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `paper_id` VARCHAR(100) NULL,
    `subject` VARCHAR(100) NULL,
    `chapter` VARCHAR(255) NULL,
    `topic` VARCHAR(255) NULL,
    `type` VARCHAR(50) DEFAULT 'MCQ',
    `statement` TEXT NOT NULL,
    `options` JSON NULL,
    `correct_answer` TEXT NOT NULL,
    `explanation` TEXT NULL,
    `difficulty` VARCHAR(50) DEFAULT 'Medium',
    `year` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. PHP API Proxy Files

All proxy endpoints reside inside the `api/` directory:

| PHP Script | Purpose |
| :--- | :--- |
| [api/db.php](file:///d:/JEE/api/db.php) | Connects to MariaDB and dynamically switches schemas (`jee_nexus`, `neet_nexus`, `kcet_nexus`, `upsc_nexus`) based on the `X-Active-Stream` header. |
| [api/router.php](file:///d:/JEE/api/router.php) | Entry-point script handling CORS headers (`apikey`, `prefer`, `Range`) and routing requests. |
| [api/setup_db.php](file:///d:/JEE/api/setup_db.php) | One-click automated setup script that creates all databases and migrates table columns. |
| [api/local_db.php](file:///d:/JEE/api/local_db.php) | Universal CRUD executor. Automatically inspects `SHOW COLUMNS FROM $table` to filter payload fields and converts ISO dates (`YYYY-MM-DDTHH:MM:SS.sssZ`) into MySQL `DATETIME` strings. |
| [api/auth.php](file:///d:/JEE/api/auth.php) | Authentication endpoint handling user login, registration, and security key validation. |

---

## 4. Serving the Backend Proxy

Run the following command from the root directory (`d:\JEE`) to serve the backend locally:

```bash
php -S 127.0.0.1:8080 -t . api/router.php
```

To automatically launch SSH tunneling (Serveo) for remote backend resolution, execute:

```powershell
powershell -ExecutionPolicy Bypass -File d:\JEE\scripts\run_tunnel.ps1
```
This script updates `public/backend_url.txt` and syncs the dynamic backend URL with Netlify deployments.
