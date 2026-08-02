# Lakshya Exam Prep Platform - Code Improvement Checklist (Final Code Audit)

This checklist covers additional deep security vulnerabilities and backend architectural issues discovered during the final codebase audit.

---

## 🔴 HIGH PRIORITY: Authentication & Execution Access Controls

- [x] **Fix User Self-Approval Bypass on Enrollment**
  - *Location:* [auth.php](file:///d:/JEE/api/auth.php#L140)
  - *Vulnerability:* The signup handler trusts `$input['status']` if provided. A client can send `"status": "approved"` in the JSON payload, bypassing coach/admin verification and instantly approving their own account.
  - *Fix:* Hardcode the default enrollment status to `'pending'` for student signups, and never read `status` directly from client input.
- [x] **Restrict Direct Web Access to Question Generator**
  - *Location:* [question_generator.php](file:///d:/JEE/api/question_generator.php)
  - *Vulnerability:* Anyone on the web can invoke this script via HTTP (e.g. `api/question_generator.php?count=500`), triggering long-running procedural templates and overloading the database/CPU.
  - *Fix:* Restrict execution to the command-line interface only by checking `if (php_sapi_name() !== 'cli') { http_response_code(403); exit; }` at the top of the script.
- [x] **Restrict Direct Web Access to Question Ingestion**
  - *Location:* [ingest_questions.php](file:///d:/JEE/api/ingest_questions.php)
  - *Vulnerability:* The bulk ingestion script has no access control and can be run anonymously via HTTP request.
  - *Fix:* Add the same `php_sapi_name() !== 'cli'` safeguard at the top of `ingest_questions.php` to lock down execution to local CLI execution via `run_ingestion_cli.php`.
- [x] **Consolidate Database Connections in Sync Script**
  - *Location:* [sync_jee_mariadb.php](file:///d:/JEE/scripts/sync_jee_mariadb.php)
  - *Vulnerability:* The sync script contains hardcoded local database credentials (`root`, `""`), which will break if credentials change.
  - *Fix:* Require `api/db.php` and reuse the parsed database connections.

---

## 🟡 MEDIUM PRIORITY: Error Sanitization & DB Security

- [x] **Sanitize Sign-up & Reset Exception Disclosures**
  - *Location:* [auth.php](file:///d:/JEE/api/auth.php#L178-L181)
  - *Vulnerability:* If registration fails due to duplicate inputs or database issues, the script returns the raw exception message (`$e->getMessage()`) in the response, leaking path routes or database queries.
  - *Fix:* Log the detailed message via `error_log` and return a generic error payload (e.g., "Registration failed. Please contact support.") to the user.
- [x] **Remove Information Disclosures & Debug Utilities**
  - *Location:* `api/db_status.php`, `api/db_explorer.php`, `api/pyq_analyzer.php`, `api/check_backup.php`, `api/check_cleanup.php`
  - *Vulnerability:* Leftover debug endpoints allow anonymous web users to view running server processes, database tables, backup metrics, and system profiles.
  - *Fix:* Permanently delete these unused files.
