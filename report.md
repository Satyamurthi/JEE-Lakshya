# Code Review and Security Audit Report - JEE Lakshya

This report outlines the technical audit findings for the JEE Lakshya multi-stream exam preparation platform.

---

## 1. Known Issues (LaTeX & Math Rendering Bug)

### 🔴 Incorrect Raw LaTeX Rendering on Quiz Results
* **File/Location:** [Results.tsx](file:///d:/JEE/src/pages/Results.tsx#L422) and [Results.tsx](file:///d:/JEE/src/pages/Results.tsx#L431)
* **Severity:** High
* **Risk/Impact:** Quiz answers showing raw LaTeX formulas as plain text (e.g. `\frac{3}{2}` or `\sqrt{x}`). Slicing options at 60 characters breaks KaTeX syntax.
* **Technical Detail:** Option strings (`selectedOpt.val` and `corrOpt.val`) are sliced and displayed in plain `<p>` tags instead of the `<MathRenderer>` component. Slicing raw LaTeX text at 60 characters leaves orphan curly braces, triggering KaTeX parsing failures.

---

## 2. Security Vulnerabilities

### 💀 SQL Injection in Generic CRUD Proxy
* **File/Location:** [local_db.php](file:///d:/JEE/api/local_db.php#L366) and [local_db.php](file:///d:/JEE/api/local_db.php#L378)
* **Severity:** Critical
* **Risk/Impact:** Users can execute arbitrary subqueries, leaking password hashes, transaction records, or user profile information.
* **Technical Detail:** The `$columns` parameter is read directly from the POST payload and concatenated into the SQL statement (`SELECT $columns FROM $table`) without escaping or binding.

### 🔴 Exposed CORS Whitelist Wildcard
* **File/Location:** [db.php](file:///d:/JEE/api/db.php#L15-L17)
* **Severity:** High
* **Risk/Impact:** Any client/hacker site hosted on Netlify (`*.netlify.app`) can send cross-origin requests to read student session tokens, transaction details, or student logs.
* **Technical Detail:** The CORS pattern matcher whitelists any origin matching the Netlify subdomain regex: `preg_match('/^https:\/\/([a-zA-Z0-9\-]+\.)*netlify\.app$/', $origin)`.

### 🟡 Hardcoded Database Connection Secrets
* **File/Location:** [db.php](file:///d:/JEE/api/db.php#L60-L63)
* **Severity:** Medium
* **Risk/Impact:** Plaintext credentials are leaked if code is checked into public version control.
* **Technical Detail:** Database host (`127.0.0.1`), username (`root`), and password (`""`) are hardcoded directly in the file. They should be loaded via the `.env` configuration loader.

---

## 3. Database & Sync Logic

### 🔴 Missing Table Indexes on Large Datasets
* **File/Location:** [setup_db.php](file:///d:/JEE/api/setup_db.php#L205-L223) and [setup_db.php](file:///d:/JEE/api/setup_db.php#L92-L105)
* **Severity:** High
* **Risk/Impact:** Exam portal or practice page takes minutes to load, causing database locks and server gateway timeouts.
* **Technical Detail:** The `questions` table (18M+ rows in JEE) lacks indexes on frequently filtered columns (`subject`, `chapter`, `topic`, `concept`, `difficulty`). Similarly, `exam_attempts` and `daily_attempts` tables lack indexes on the foreign key `user_id`.

### 🔴 High-Risk Blocking Synchronizer Strategy
* **File/Location:** [sync_jee_mariadb.php](file:///d:/JEE/scripts/sync_jee_mariadb.php#L90) and [sync_sqlite.php](file:///d:/JEE/api/sync_sqlite.php#L126)
* **Severity:** High
* **Risk/Impact:** Interruptions during sync leave the question bank completely empty. Concurrently triggered sync instances corrupt data.
* **Technical Detail:** The synchronizer script truncates the `questions` table prior to streaming SQLite rows. There are no locking mechanisms to prevent concurrent synchronizations.

---

## 4. Code Quality & Architecture

### 🟡 Extensive Code Duplication in AI Services
* **File/Location:** [geminiService.ts](file:///d:/JEE/src/geminiService.ts), [neetGeminiService.ts](file:///d:/JEE/src/neetGeminiService.ts), [kcetGeminiService.ts](file:///d:/JEE/src/kcetGeminiService.ts), [upscGeminiService.ts](file:///d:/JEE/src/upscGeminiService.ts)
* **Severity:** Medium
* **Risk/Impact:** High maintenance overhead. Improvements or bug fixes to prompts/schemas must be replicated manually across four files.
* **Technical Detail:** 90% of the JSON schema templates, prompt mappings, and service calls are duplicated.

---

## 5. Performance

### 🟢 Duplicate KaTeX Asset Loading
* **File/Location:** [index.html](file:///d:/JEE/index.html#L27-L28) and [MathRenderer.tsx](file:///d:/JEE/src/components/MathRenderer.tsx#L15-L16)
* **Severity:** Low
* **Risk/Impact:** Increased page load times and redundant payload transfer.
* **Technical Detail:** KaTeX is compiled directly inside the React JS bundle, but `index.html` also loads it from CDN.
