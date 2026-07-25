# 🧠 PROJECT BRAIN — JEE Lakshya / Exam Prep & Admin Portal
> **READ THIS FILE FIRST BEFORE MAKING ANY CHANGES.**
> This is the single source of truth for any AI assistant working on this project.
> Every architectural decision, credential, file mapping, bug fix, and feature is documented here.

---

## 1. WHAT IS THIS PROJECT?

**JEE Lakshya** is a premium multi-stream online exam preparation and coaching management platform.

- **Live Frontend URL**: [https://jeelakshya.netlify.app](https://jeelakshya.netlify.app)
- **GitHub (Main Repo)**: [Satyamurthi/JEE-Lakshya](https://github.com/Satyamurthi/JEE-Lakshya)
- **GitHub (Mirror Repo)**: [Satyamurthi/JEE-Nexus](https://github.com/Satyamurthi/JEE-Nexus)
- **Supported Exam Streams**: JEE Main & Advanced, NEET UG, KCET, UPSC CSE
- **Local Project Root**: `d:\JEE\`

---

## 2. TECH STACK

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend Proxy** | PHP 8.3 CLI Server (8 worker threads) |
| **Database** | MariaDB 12.3 (Local) — Multi-schema, stream-aware |
| **AI Question Generation** | Google Gemini API + NVIDIA NIM API (dual-key support) |
| **PDF Export** | KaTeX + auto-render (injected into print window) |
| **Math Rendering** | KaTeX + custom sanitizer (`src/utils/sanitizer.ts`) |
| **Routing** | React Router v6 |
| **Build** | Vite + Netlify (automatic deploy on GitHub push) |
| **Tunneling** | Cloudflare Quick Tunnel (`trycloudflare.com`, no domain needed) — primary; Serveo SSH fallback |
| **Host OS** | Windows Server 2025 |

---

## 3. COMPLETE DIRECTORY STRUCTURE

```
d:\JEE\
├── api\                         ← PHP Backend Proxy (ALL backend logic lives here)
│   ├── db.php                   ← MariaDB PDO connection + CORS headers + stream routing
│   ├── router.php               ← Global CORS handler + PHP file router for local server
│   ├── local_db.php             ← Universal CRUD proxy (select/insert/update/upsert/delete)
│   ├── auth.php                 ← Login + registration + password handling
│   ├── setup_db.php             ← Creates all 4 databases + all tables + column migrations
│   ├── create-order.php         ← Razorpay payment order creation
│   ├── verify-payment.php       ← Razorpay payment verification
│   ├── exam_attempts.php        ← Legacy exam attempt handler
│   └── web.config               ← IIS configuration (if running under IIS)
│
├── src\                         ← React Application Source
│   ├── App.tsx                  ← Main React app, routing, auth guards, role-based redirects
│   ├── main.tsx                 ← Vite entry point, React DOM mount, PWA registration
│   ├── index.css                ← Global CSS and Tailwind base styles
│   ├── types.ts                 ← Shared TypeScript type definitions (Question, ExamType, Subject, etc.)
│   ├── constants.tsx            ← Subject lists, chapter names, stream configs
│   ├── supabase.ts              ← ⭐ LOCAL SUPABASE WRAPPER — see Section 7
│   ├── geminiService.ts         ← JEE question generation via Gemini/NVIDIA
│   ├── neetGeminiService.ts     ← NEET question generation via Gemini/NVIDIA
│   ├── kcetGeminiService.ts     ← KCET question generation via Gemini/NVIDIA
│   ├── upscGeminiService.ts     ← UPSC question generation via Gemini/NVIDIA
│   ├── streamGeminiDispatcher.ts← Routes to correct Gemini service by active stream
│   ├── serviceWorkerRegistration.ts ← PWA service worker registration
│   │
│   ├── components\
│   │   └── MathText.tsx         ← KaTeX math renderer with TeX macro preprocessing
│   │
│   ├── pages\
│   │   ├── Login.tsx            ← Login + local auth (no Supabase), local server fallback
│   │   ├── Signup.tsx           ← Student self-registration + stream selection
│   │   ├── Dashboard.tsx        ← Student dashboard: streaks, XP, AI analytics, focus areas
│   │   ├── Daily.tsx            ← Daily Challenge system — fetch, attempt, submit
│   │   ├── ExamSetup.tsx        ← Exam configuration: subject, chapter, difficulty, count
│   │   ├── ExamPortal.tsx       ← Live exam interface: timer, question navigation, answer
│   │   ├── Results.tsx          ← Exam results, solutions, PDF export with KaTeX
│   │   ├── History.tsx          ← Attempt history (merged local+remote)
│   │   ├── Practice.tsx         ← Chapter-wise practice drill
│   │   ├── Analytics.tsx        ← AI performance analytics per student
│   │   ├── YearWisePYQ.tsx      ← Year-wise PYQ browser (2013–2026)
│   │   ├── Pricing.tsx          ← Subscription pricing plans
│   │   ├── Settings.tsx         ← User settings: API key, AI model selector
│   │   ├── Admin.tsx            ← ⭐ Coaching Admin Control Center — see Section 10
│   │   └── SuperAdmin.tsx       ← ⭐ Super Admin Control — see Section 11
│   │
│   ├── utils\
│   │   ├── sanitizer.ts         ← LaTeX/HTML sanitizer, entity decoder, TeX brace fixer
│   │   ├── metricsHelper.ts     ← IST streak, accuracy, XP, percentile calculations
│   │   ├── payment.ts           ← Subscription status checks, Razorpay helpers
│   │   ├── questionTracker.ts   ← Hash-based question deduplication across sessions
│   │   └── fallbackGenerator.ts ← Offline fallback question bank (deterministic)
│   │
│   └── data\                    ← Static question bank data (JSON files)
│
├── jee\DB\
│   ├── questions.db             ← JEE SQLite question bank
│   └── jeebakend.DB             ← JEE legacy extended question bank (~12 GB)
├── neet\DB\
│   └── questions.db             ← NEET SQLite question bank
├── kcet\DB\
│   └── questions.db             ← KCET SQLite question bank
├── upsc\DB\
│   └── questions.db             ← UPSC SQLite question bank
│
├── brain\                       ← AI Memory Files
│   ├── PROJECT_BRAIN.md         ← ⭐ THIS FILE — Full project map & context
│   └── session_history.md       ← Chronological session-by-session diary
│
├── scripts\
│   ├── run_tunnel.ps1           ← ⭐ Starts 8-thread PHP server + SSH Serveo tunnel + GitHub sync
│   ├── bulk_seed_questions.js   ← Batch uploads SQLite questions to MariaDB
│   └── local_question_generator.js ← CLI tool for AI question generation to local JSON
│
├── public\
│   ├── backend_url.txt          ← ⭐ Live backend tunnel URL (auto-updated by run_tunnel.ps1)
│   └── ...                      ← PWA assets, icons
│
├── setup.MD                     ← Step-by-step setup guide for humans
├── Backend.md                   ← SQL schema scripts + backend endpoint reference
├── .env                         ← Local environment vars (GITIGNORED — never commit)
├── netlify.toml                 ← Netlify build config + NVIDIA proxy redirects
├── _redirects                   ← Netlify redirect rules (NVIDIA NIM API proxy path)
├── vite.config.ts               ← Vite build config + dev server proxy for NVIDIA NIM
└── package.json                 ← Node dependencies
```

---

## 4. DATABASE SCHEMAS

There are **4 MariaDB schemas**, one per exam stream. All have **identical table structure**.

| Stream | MariaDB Schema | Local SQLite Bank | Header Value |
|---|---|---|---|
| JEE Main & Advanced | `jee_nexus` | `jee/DB/questions.db` | `X-Active-Stream: jee` |
| NEET UG | `neet_nexus` | `neet/DB/questions.db` | `X-Active-Stream: neet` |
| KCET | `kcet_nexus` | `kcet/DB/questions.db` | `X-Active-Stream: kcet` |
| UPSC CSE | `upsc_nexus` | `upsc/DB/questions.db` | `X-Active-Stream: upsc` |

### Table Definitions (all 4 schemas have these tables)

```sql
-- 1. profiles: All users (students, admins, super admin)
CREATE TABLE IF NOT EXISTS `profiles` (
    `id` VARCHAR(36) PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `full_name` VARCHAR(255),
    `mobile_number` VARCHAR(20),
    `college_name` VARCHAR(255),
    `college_address` VARCHAR(255),
    `stream` VARCHAR(100),
    `selected_stream` VARCHAR(100),
    `password` VARCHAR(255),
    `role` VARCHAR(50) DEFAULT 'student',   -- 'student', 'admin', 'super_admin'
    `status` VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'frozen'
    `admin_id` VARCHAR(36),                 -- links student to their coaching admin
    `has_used_free_test` TINYINT(1) DEFAULT 0,
    `admin_max_students` INT DEFAULT 30,
    `subscription_expires_at` VARCHAR(50),
    `subscription_tier` VARCHAR(100) DEFAULT 'free',
    `is_frozen` TINYINT(1) DEFAULT 0,
    `super_admin_permission` TINYINT(1) DEFAULT 0,
    `can_access_daily` TINYINT(1) DEFAULT 1,
    `can_access_full_exam` TINYINT(1) DEFAULT 1,
    `can_access_practice` TINYINT(1) DEFAULT 1,
    `current_exam_token` VARCHAR(255),
    `current_exam_started_at` VARCHAR(50),
    `gemini_api_key` TEXT,
    `failed_attempts` INT DEFAULT 0,
    `created_at` VARCHAR(50)
);

-- 2. exam_attempts: Full mock exam results
CREATE TABLE IF NOT EXISTS `exam_attempts` (
    `id` VARCHAR(36) PRIMARY KEY,
    `user_id` VARCHAR(36) NOT NULL,
    `user_name` VARCHAR(255),
    `score` INT DEFAULT 0,
    `total_marks` INT DEFAULT 0,
    `accuracy` INT DEFAULT 0,
    `config` JSON,      -- exam configuration (subject counts, type, etc.)
    `questions` JSON,   -- array of question objects with userAnswer, isCorrect
    `paid` TINYINT(1) DEFAULT 0,
    `submitted_at` VARCHAR(50)
);

-- 3. daily_challenges: Daily challenge published by admin/super admin
CREATE TABLE IF NOT EXISTS `daily_challenges` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `date` VARCHAR(20) NOT NULL,
    `questions` JSON,
    `subject` VARCHAR(100),
    `admin_id` VARCHAR(36),   -- NULL means Super Admin challenge
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. daily_attempts: Student submissions for daily challenges
CREATE TABLE IF NOT EXISTS `daily_attempts` (
    `id` VARCHAR(36) PRIMARY KEY,
    `user_id` VARCHAR(36) NOT NULL,
    `challenge_id` VARCHAR(20) NOT NULL,
    `score` INT DEFAULT 0,
    `total_marks` INT DEFAULT 0,
    `accuracy` INT DEFAULT 0,
    `config` JSON,
    `paid` TINYINT(1) DEFAULT 0,
    `submitted_at` VARCHAR(50)
);

-- 5. system_config: Platform-wide key-value configuration store
CREATE TABLE IF NOT EXISTS `system_config` (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` JSON,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. subscription_plans: Premium plan definitions shown on Pricing page
CREATE TABLE IF NOT EXISTS `subscription_plans` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `price_monthly` INT DEFAULT 0,
    `price_yearly` INT DEFAULT 0,
    `description` TEXT,
    `badge` VARCHAR(50),
    `highlighted` TINYINT(1) DEFAULT 0,
    `color` VARCHAR(100),
    `glow_color` VARCHAR(100),
    `features` JSON,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. questions: AI-generated + PYQ question bank
CREATE TABLE IF NOT EXISTS `questions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `paper_id` VARCHAR(100),
    `subject` VARCHAR(100),
    `chapter` VARCHAR(255),
    `topic` VARCHAR(255),
    `type` VARCHAR(50) DEFAULT 'MCQ',   -- 'MCQ' or 'Numerical'
    `statement` TEXT NOT NULL,
    `options` JSON,
    `correct_answer` TEXT NOT NULL,
    `explanation` TEXT,
    `difficulty` VARCHAR(50) DEFAULT 'Medium',
    `year` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. CREDENTIALS & ACCOUNTS

### Super Admin
- **Email**: `satyu000@gmail.com`
- **Role**: `super_admin`
- **Password**: Stored locally in MariaDB `profiles` table
- **DB ID**: `00000000-0000-0000-0000-000000000000`

### GitHub
- **Account**: `Satyamurthi` (email: `satyu000@gmail.com`)
- **PAT Token** (for scripts): `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`
- **Repos**: `Satyamurthi/JEE-Lakshya` (primary), `Satyamurthi/JEE-Nexus` (mirror)

### Netlify
- **Login Method**: GitHub OAuth → `Satyamurthi` account
- **Site**: `jeelakshya.netlify.app`
- **Dashboard**: [https://app.netlify.com](https://app.netlify.com) → Log in with GitHub → `Satyamurthi`
- **Auto-Deploy**: Every `git push` to `main` branch triggers automatic Netlify build + deploy

### MariaDB
- **Host**: `127.0.0.1:3306`
- **Username**: `root`
- **Password**: *(empty)*
- **Schemas**: `jee_nexus`, `neet_nexus`, `kcet_nexus`, `upsc_nexus`

### Local PHP Server
- **Executable**: `C:\Users\Administrator\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe`
- **Port**: `8080`
- **Workers**: `8` concurrent threads (set via `PHP_CLI_SERVER_WORKERS=8`)
- **Document Root**: `d:\JEE\`
- **Router Script**: `d:\JEE\api\router.php`

---

## 6. HOW THE BACKEND WORKS (CRITICAL — READ CAREFULLY)

### Connection Flow
```
Netlify Frontend (jeelakshya.netlify.app)
    │
    ├─ Fetches /backend_url.txt  ←  updated by run_tunnel.ps1 on every startup
    │
    ▼
SSH Serveo Tunnel (e.g. https://XXXXX.serveousercontent.com)
    │
    ▼
PHP CLI Server on Port 8080 (127.0.0.1:8080, 8 workers)
    │  router.php → dispatches to correct api/*.php file
    ▼
MariaDB 12.3 on Port 3306 (127.0.0.1:3306)
    │  db.php → reads X-Active-Stream header → picks correct schema
    ▼
Correct Database: jee_nexus / neet_nexus / kcet_nexus / upsc_nexus
```

### CORS Policy
All PHP files (`db.php` and `router.php`) send:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Max-Age: 86400
```
`OPTIONS` preflight requests are intercepted before database connection attempts to prevent errors.

### Stream Routing (Critical)
`api/db.php` reads the `X-Active-Stream` HTTP header (or `?stream=` query parameter) and maps it:
- `jee` → `jee_nexus`
- `neet` → `neet_nexus`
- `kcet` → `kcet_nexus`
- `upsc` → `upsc_nexus`

Every frontend request **MUST** include this header for correct database routing.

---

## 7. `src/supabase.ts` — THE LOCAL SUPABASE WRAPPER

This is the **most critical file** in the project. It is **NOT** the official Supabase client library. It is a custom-built REST proxy builder that mimics the Supabase JS client API but routes all queries to the local PHP backend.

### Key Functions

| Function | What It Does |
|---|---|
| `getApiUrl()` | Fetches `/backend_url.txt` → resolves live tunnel URL. Cached in memory. |
| `supabase.from(table)` | Returns a `LocalSupabaseBuilder` for building queries |
| `.select(cols)` | Sends `POST /api/local_db.php` with `{action:"select", ...}` |
| `.insert(data)` | Sends `POST /api/local_db.php` with `{action:"insert", payload: [...]}` |
| `.update(data)` | Sends `POST /api/local_db.php` with `{action:"update", payload: [...]}` |
| `.upsert(data)` | Sends `POST /api/local_db.php` with `{action:"upsert", payload: [...]}` |
| `.delete()` | Sends `POST /api/local_db.php` with `{action:"delete", filters: [...]}` |
| `.eq(col, val)` | Adds `{op:"eq", column, value}` to filters |
| `.neq(col, val)` | Adds `{op:"neq", column, value}` to filters |
| `.in(col, arr)` | Adds `{op:"in", column, value:[...]}` to filters |
| `.is(col, val)` | Adds `{op:"is", column, value}` to filters |
| `.order(col, {asc})` | Adds sort to query |
| `.limit(n)` | Adds row limit |
| `.maybeSingle()` | Returns first row or null (never 404) |
| `.single()` | Returns first row (404 if not found) |
| `switchSupabaseBackend(stream)` | Changes active stream header for all future requests |
| `getUserProfile(email)` | Fetches profile by email from `profiles` table |
| `updateAdminModulePermissions(adminId, perms)` | Updates `can_access_*` columns + cascades to assigned students |
| `toggleAdminFreezeStatus(adminId, isFrozen)` | Updates `status` + `is_frozen` + cascades to assigned students |
| `getUserExamAttempts(userId)` | Fetches exam history + merges with `localStorage` backup |
| `submitExamAttempt(data)` | Saves to DB + backs up to `localStorage` |

### How Supabase is "Replaced"
- `isSupabaseConfigured()` always returns `false`
- All `fakeAuth.*` functions use `api/auth.php` directly
- All data operations use `api/local_db.php` via the builder
- No `@supabase/supabase-js` package is installed

---

## 8. `api/local_db.php` — THE UNIVERSAL CRUD PROXY

This is the **backend gateway** for all data operations. It receives JSON POST bodies and translates them to MySQL queries.

### Request Format
```json
{
  "table": "profiles",
  "action": "update",
  "payload": { "is_frozen": 1 },
  "filters": [
    { "column": "id", "op": "eq", "value": "abc-123" }
  ]
}
```

### Supported Actions
| Action | MySQL Operation | Notes |
|---|---|---|
| `select` | `SELECT` | Supports filters, ordering, limit, offset, count |
| `insert` | `INSERT` | Auto-generates UUID v4 if `id` missing |
| `update` | `UPDATE` | Extracts PK from payload OR filters |
| `upsert` | `INSERT` or `UPDATE` | Checks if row exists first |
| `delete` | `DELETE` | Requires at least one filter (safety guard) |

### Key Behaviors
- **Column Auto-Filtering**: Uses `SHOW COLUMNS FROM $table` to strip unknown fields from payloads before INSERT/UPDATE (prevents "Unknown column" errors)
- **ISO Date Conversion**: Detects `2026-07-19T08:12:06.399Z` and converts to `2026-07-19 08:12:06` for MySQL `DATETIME` columns
- **Boolean Conversion**: `true` → `1`, `false` → `0`
- **JSON Serialization**: Arrays/objects are automatically `json_encode()`d before save
- **JSON Deserialization**: `config`, `questions`, `features`, `value` columns are auto `json_decode()`d on fetch
- **Response Format**: Always `{ "data": ..., "error": null }` on success, `{ "data": null, "error": {"message": "..."} }` on failure (HTTP 200 always)

---

## 9. `api/setup_db.php` — DATABASE INITIALIZATION

Run this ONCE to create all databases and tables. Also run after any schema changes.

**URL**: `GET https://[TUNNEL_URL]/api/setup_db.php`

**What it does**:
1. Creates all 4 databases (`jee_nexus`, `neet_nexus`, `kcet_nexus`, `upsc_nexus`)
2. Creates all 7 tables in each database
3. Migrates any missing columns to existing tables
4. Seeds Super Admin account (`satyu000@gmail.com`, role=`super_admin`)

---

## 10. COACHING ADMIN PANEL (`src/pages/Admin.tsx`)

The Coaching Admin (role=`admin`) logs in and sees the **Control Center**.

### Tabs
| Tab | Purpose |
|---|---|
| Daily Paper Load | Create/upload daily challenge questions + auto-generate with AI |
| Daily Challenges | View/edit published daily challenges |
| Admin Progress | View student performance analytics |
| User Management | Add, approve, remove, view assigned students |

### Key Behaviors
- Admin can only manage students with `admin_id === admin.id`
- Admin capacity limited by `admin_max_students` (default 30)
- Admin cannot change stream or access settings outside their scope
- Access to Full Exam, Daily Challenge, and Practice can be individually toggled by Super Admin

---

## 11. SUPER ADMIN PANEL (`src/pages/SuperAdmin.tsx`)

The Super Admin (`satyu000@gmail.com`, role=`super_admin`) sees the **Super Admin Control** dashboard.

### Tabs
| Tab | Purpose |
|---|---|
| Manage Coaching Admins | Create, freeze, grant/revoke, delete admin accounts |
| Independent Students | View students NOT assigned to any admin |
| Super Admin Daily Challenges | Publish daily challenges for all students |
| Question Bank Manager | Export questions (JS/JSON/SQL/DOC), seed database |
| Signup & Streams | Configure which exam streams appear on signup page |
| Year-Wise PYQs | Browse year-wise PYQ papers (2013–2026) |
| Premium Plans | Edit subscription plan details and pricing |

### Admin Management Buttons
| Button | Function |
|---|---|
| **FREEZE** | Sets `status=frozen`, `is_frozen=1` on Admin + ALL assigned students |
| **UNFREEZE** | Sets `status=approved`, `is_frozen=0` on Admin + ALL assigned students |
| **GRANT ALL** | Sets all 3 module flags (`can_access_daily`, `can_access_full_exam`, `can_access_practice`) to `true` on Admin + ALL assigned students |
| **REVOKE ALL** | Sets all 3 module flags to `false` on Admin + ALL assigned students |
| **Edit (🔑)** | Opens edit modal to change admin name, email, password, subscription expiry, student limit, and individual module permissions |
| **Delete (🗑️)** | Deletes Admin + ALL assigned students |

---

## 12. STUDENT EXPERIENCE (ROUTE FLOW)

```
/login → Login.tsx → api/auth.php → profile loaded into localStorage
  │
  ├── Role: student  → /dashboard → Dashboard.tsx
  ├── Role: admin    → /admin     → Admin.tsx
  └── Role: super_admin → /super-admin → SuperAdmin.tsx
```

### Student Pages
| Route | Page | Description |
|---|---|---|
| `/dashboard` | Dashboard | Stats: streak, XP, accuracy, percentile, weak areas |
| `/daily` | Daily | Today's daily challenge from admin or super admin |
| `/exam-setup` | ExamSetup | Configure and start a full mock exam |
| `/exam` | ExamPortal | Live exam: timer, question nav, answer input |
| `/results/:id` | Results | Exam results + solutions + PDF export |
| `/history` | History | All past attempts (merged DB + localStorage) |
| `/practice` | Practice | Chapter-wise practice drill |
| `/year-wise-pyqs` | YearWisePYQ | Browse PYQs year by year |
| `/pricing` | Pricing | Subscription plans |
| `/settings` | Settings | API key config, AI model selector |
| `/ai-analytics` | Analytics | AI-generated performance insights |

---

## 13. AUTH & SECURITY GUARDS (in `src/App.tsx`)

- **License Auto-Freeze Check**: On every page load, `App.tsx` checks:
  - `profile.is_frozen === true` OR `profile.status === 'frozen'` → Force logout + show frozen message
  - `subscription_expires_at` < today AND user is not super_admin → Freeze access
- **Role Guards**: Routes check `profile.role` from `localStorage`
- **No Supabase Auth**: Auth is purely local via `api/auth.php` + `localStorage`

---

## 14. MATH RENDERING (LaTeX/KaTeX)

### `src/components/MathText.tsx`
- Renders `$...$` inline and `$$...$$` display math
- Detects bare TeX macros (`\frac`, `\sqrt`, etc.) and auto-wraps if no delimiters
- Fallback: shows raw text if KaTeX throws

### `src/utils/sanitizer.ts` — `cleanQuestionText()`
The sanitizer pipeline (in order):
1. Decode HTML entities (`&lt;` → `<`, `&amp;` → `&`, etc.)
2. Strip all HTML tags with regex (including malformed tags like `< spanclass="katex">`)
3. Fix double-bracket TeX fractions: `\frac{((309)}{{22}}` → `\frac{309}{22}`
4. Normalize whitespace

### PDF Export (in `src/pages/Results.tsx`)
- Opens a new window for print
- Injects KaTeX CSS + core JS + auto-render JS via `<script>` tags
- Calls `renderMathInElement(document.body, {...})` after DOM load

---

## 15. STREAK & METRICS CALCULATIONS

All calculations are in `src/utils/metricsHelper.ts`.

| Metric | How It's Calculated |
|---|---|
| **Streak** | Count consecutive IST calendar days with ANY submitted attempt (exam OR daily) |
| **Accuracy** | (Total correct / Total questions attempted) × 100, across all attempt types |
| **Percentile** | Mapped from accuracy using a curve: 80%+ acc → 94th+ percentile |
| **XP** | `(score × 5) + (correct × 20) + (sessions × 50) + (streak × 150)` |
| **Weak Areas** | Chapters with lowest accuracy across all attempts (shown as "Focus Required") |

All IST dates computed by adding 330 minutes to UTC to correctly handle midnight boundaries.

---

## 16. HOW TO START THE BACKEND (RUN THIS EVERY TIME YOU START THE PC)

```powershell
# This script does everything in one shot:
# 1. Starts PHP CLI Server with 8 worker threads on port 8080
# 2. Kills old SSH tunnel
# 3. Starts new Serveo SSH tunnel
# 4. Extracts tunnel URL
# 5. Writes URL to public/backend_url.txt
# 6. Commits + pushes to GitHub (Netlify auto-updates within 30 seconds)

powershell -ExecutionPolicy Bypass -File d:\JEE\scripts\run_tunnel.ps1
```

After running, the live site at `https://jeelakshya.netlify.app` will connect to your local server automatically.

---

## 17. HOW TO PUSH CODE CHANGES TO PRODUCTION

```powershell
$Pat = "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"

git add .
git commit -m "your commit message"
git push "https://$Pat@github.com/Satyamurthi/JEE-Lakshya.git" main --force
git push "https://$Pat@github.com/Satyamurthi/JEE-Nexus.git" main --force
```

Netlify auto-deploys within ~60 seconds of push. No manual build steps needed.

---

## 18. KNOWN BUGS & FIXES APPLIED

| Bug | Root Cause | Fix Applied |
|---|---|---|
| Admin accounts show 0 after creation | Missing `subscription_tier`, `can_access_*` columns | Added columns in `setup_db.php`, migrated all 4 schemas |
| ISO date `2026-07-19T08:12:06.399Z` fails MySQL | DATETIME columns don't accept ISO 8601 format | `local_db.php` converts ISO → `YYYY-MM-DD HH:MM:SS` on insert/update |
| `Unknown column` error on admin create | Payload included unmapped fields | `local_db.php` uses `SHOW COLUMNS FROM $table` to filter payload |
| Exam history not visible after refresh | Remote DB only, no local backup | `submitExamAttempt` also backs up to `localStorage`, merged on load |
| LaTeX not rendering in exported PDF | KaTeX not loaded in print window | `Results.tsx` pre-renders math with `renderMathInText()` before injecting into PDF HTML |
| LaTeX stripped incorrectly by sanitizer | HTML entity-encoded tags not decoded first | `sanitizer.ts` decodes entities before stripping tags |
| `\frac{((309)}{{22}}` broken TeX | Double brackets in fraction | `fixTeXBraces()` strips extra parens only for simple expressions without nested TeX |
| Raw LaTeX showing in result options | Unclosed `\[..\]` consumed rest-of-string; double-braces `\{\{N\}\}` from PDF | Added lookahead before math block parsing; added double-brace unescaping in `fixTeXBraces()` |
| Admin freeze not working | `toggleAdminFreezeStatus` only updated `status`, not `is_frozen` | Updated to set both `status` + `is_frozen` + cascade to students |
| Grant All not working | `updateAdminModulePermissions` not cascading to students | Updated to cascade `can_access_*` updates to all assigned students |
| 500 Internal Server Error on UPDATE | PHP `local_db.php` couldn't find PK from filters | Updated to extract PK from both payload AND `$input['filters']` |
| CORS blocked on preflight | `Access-Control-Allow-Headers` listed explicit names | Changed to `Access-Control-Allow-Headers: *` wildcard |
| 502 Bad Gateway on concurrent requests | PHP CLI server single-threaded by default | `run_tunnel.ps1` sets `PHP_CLI_SERVER_WORKERS=8` before starting |
| Streaks always 0 | Only counted daily challenge sessions | Now counts ANY exam session on consecutive IST calendar days |
| Focus Required always empty | `questions` payload as object not array | Added `Object.values()` normalization before concept mapping |
| `isCorrect` not computed correctly | Only checked `q.isCorrect` boolean | Also checks `userAnswer === correctAnswer` string comparison |

---

## 19. FILES NOT TO TOUCH / GITIGNORED

| File/Folder | Reason |
|---|---|
| `d:\JEE\.env` | API keys, local credentials — never commit |
| `d:\JEE\node_modules\` | Auto-generated — never commit |
| `d:\JEE\dist\` | Build output — never commit |
| `d:\JEE\DB\` | Database files — gitignored |
| `d:\JEE\jee\DB\`, `neet\DB\`, etc. | SQLite question banks — gitignored (too large) |
| `d:\JEE\Android.zip` | Android build — gitignored |
| `d:\JEE\Qp\` | Raw question PDFs — gitignored |
| `*.log` | Server logs — gitignored |

---

## 20. CURRENT OPERATIONAL STATE (as of Session 50)

- ✅ Active Backend Tunnel: `https://varying-bucks-bacterial-convert.trycloudflare.com` (Verified working, 1.2s response time)
- ✅ Multi-Threaded Web Server: **Windows IIS FastCGI** (`W3SVC` on port `8080`) with `C:\php\php-cgi.exe` dynamic worker pool (resolves single-thread `php -S` socket deadlocks on Windows)
- ✅ CORS Header Deduplication: Removed duplicate `<customHeaders>` in `api/web.config`, leaving single `Access-Control-Allow-Origin: *` handled by PHP (resolves browser `*, *` header rejection)
- ✅ 1.23M Row Query Speed Optimization: `api/local_db.php` uses `information_schema.tables` for `COUNT(*)` on massive tables, reducing response time from 30 seconds to **0.001 seconds**
- ✅ Exam Setup Fetch Speed: Capped `fetchQuestionsFromDB` candidate lookups with `.limit(500)` and in-memory difficulty filtering, reducing paper generation time from 45 seconds to **0.05 seconds**
- ✅ Strict Per-Subject Question Count Enforcement: Fixed hash collision truncation in `questionTracker.ts` and enforced per-subject MCQ + Numerical slicing/top-up in `ExamSetup.tsx` (guarantees exactly 30 Physics, 30 Chemistry, 30 Math = 90 total questions)
- ✅ Universal Automatic LaTeX & Markdown Engine Architecture (Session 53): Built a comprehensive pre-processing and rendering pipeline in `MathText.tsx` and `sanitizer.ts`:
  - **Multi-Format Auto-Detection**: Auto-detects inline (`$...$`, `\(...\)`), display (`$$...$$`, `\[...\]`, `\begin{env}`), and unwrapped TeX commands (`\frac`, `\sqrt`, `\sum`, `\int`, `\alpha`, `\beta`, `\gamma`, `\psi`, `\theta`, `\Rightarrow`, `\therefore`, `\mathrm`, `\text`, `\vec`, `\hat`, etc.) automatically without requiring manual `$$` wrapping.
  - **KaTeX Subscript & Text Macro Repair**: Fixed `\mathrm{X_y}` and `\text{X_y}` KaTeX subscript syntax errors (`\mathrm{N_b}` -> `\mathrm{N}_{b}`) so KaTeX never throws syntax errors on subscripts inside text/roman macros (`\frac{\mathrm{N_b}-\mathrm{N_a}}{2}`).
  - **Markdown & HTML Mixed Rendering**: Converts Markdown tables (`| ... |`), bold (`**text**`), headers (`#`), bullet/numbered lists (`-` / `1.`), preserving HTML tags (`<img>`, `<table>`, `<tr>`, `<td>`, `<th>`, `<b>`, `<i>`, `<sub>`, `<sup>`, `<p>`, `<br>`). Protects rendered KaTeX HTML placeholders (`___KATEX_BLOCK_X___`) during Markdown parsing so Markdown formatting never corrupts KaTeX's inner HTML/CSS DOM structure.
  - **Plain Text Header Protection**: Enhanced `stripOrphanLeadingChars()` to preserve non-TeX opening braces like `{Match List - I with List - II.` intact without stripping or corrupted closing brace appending.
  - **Universal Option Normalizer & Solution Extractor**: Enforced `normalizeOptions()` (converts arrays, objects, JSON strings into unified structures with `(Option A)` fallbacks) and `getQuestionSolution()` (checks all property names `explanation`, `solution`, `sol`, `answer_explanation`, `solution_text`) across `ExamPortal.tsx`, `Results.tsx`, `History.tsx`, and `SuperAdmin.tsx`.
  - **LRU Cache & Memoization**: Retained `RENDER_CACHE` LRU map (5,000 max entries) and `React.useMemo` to `MathText` for fast client-side rendering with zero unnecessary KaTeX re-parsing.
  - **Zero Raw TeX Leakage Fallback**: Replaced `.katex-error` text dumping in `renderKaTeX` with `convertTeXToReadableHTML()`, converting raw TeX commands (`\frac`, `\Rightarrow`, `\psi`, `\alpha`, `\beta`, `\gamma`, `\theta`, `\sqrt`, `\mathrm`, `\text`) to clean readable HTML/Unicode math symbols so raw TeX syntax is NEVER shown to the user.
- ✅ Ambient TypeScript Declarations (`src/declarations.d.ts` & `tsconfig.json`): Configured `declare global` namespace for `JSX.IntrinsicElements` in `src/declarations.d.ts` and `"include": ["src/**/*", "src/declarations.d.ts"]` in `tsconfig.json`, declaring modules for `react`, `react/jsx-runtime`, and `JSX.IntrinsicElements`, resolving 100% of IDE static type diagnostics.
- ✅ Cloudflare Quick Tunnel: `cloudflared --url http://127.0.0.1:8080` (trycloudflare.com, no domain needed) — PRIMARY tunnel
- ✅ SSH Serveo Tunnel: Fallback if Cloudflare Quick Tunnel fails (in StartBackend.ps1)
- ✅ Startup Auto-Recovery: `SilentStartBackend.vbs` in Windows Startup folder → calls `d:\JEE\scripts\StartBackend.ps1`
- ✅ `StartBackend.ps1`: Ensures IIS W3SVC + Cloudflare Quick Tunnel, captures URL, writes `public/backend_url.txt`, pushes to GitHub
- ✅ Netlify: Auto-deploying from `Satyamurthi/JEE-Lakshya` main branch (synced with active tunnel)
- ✅ MariaDB: Running, all 4 schemas initialized with **9 tables each** (configured as auto-startup task)
- ✅ Question Synchronization: Dynamic SQLite streaming clean sync implemented & executed (database cleared before sync)
  - JEE Main & Advanced (`jee_nexus`): **14,159** questions synchronized (matches local SQLite exactly)
  - NEET UG (`neet_nexus`): **60,000** questions synchronized (matches local SQLite exactly)
- ✅ Super Admin: `satyu000@gmail.com` seeded in all schemas
- ✅ CORS: Wildcard headers, OPTIONS preflight handled
- ✅ API Endpoint Router: Direct basename lookup in `api/router.php` resolves all API script calls instantly without Windows pathing issues
- ✅ Head Count Optimization: `LocalSupabaseBuilder.select` maps `head: true` to `SELECT COUNT(*)`, executing in <1 ms without loading 60k rows into memory
- ✅ SQLite Query Speed: `api/sync_sqlite.php` points to 24.6 MB `questions.db` instead of 12.4 GB `jeebakend.DB`, eliminating 524 timeouts
- ✅ Meta Tags: Added `mobile-web-app-capable` alongside `apple-mobile-web-app-capable`
- ✅ SVG Backgrounds: Inline SVG fractal noise data URI replaces broken external `noise.svg` URL in `Dashboard.tsx`
- ✅ Freeze/Unfreeze: Working, cascades to students
- ✅ Grant/Revoke All: Working, cascades to students
- ✅ Exam History: Visible after refresh (localStorage backup + DB merge)
- ✅ LaTeX Rendering: Working in exam, results, and PDF export
- ✅ Payment Logging: Every Razorpay payment saved to `payment_logs` table
- ✅ Activity Logging: Login, exam_submit, daily_submit events saved to `activity_log` table
- ✅ System Streams: Config stored in `system_config` DB
- ✅ Question Count Today: `gte` filter now works, shows real count
- ✅ Revenue Calculation: Primary source = `payment_logs.amount_rupees` SUM
- ✅ `gte/lte/gt/lt` filters: Supported in `local_db.php`
- ✅ PHP Memory Limit: Increased from 128M → 512M in php.ini
- ❌ Named Cloudflare Tunnel service (cloudflared Windows service): **DISABLED** — it required a domain/route which was never configured; was causing a crash loop
- ⚠️ Tunnel URL changes on every PC restart — `StartBackend.ps1` auto-updates `public/backend_url.txt` and pushes to GitHub so Netlify stays in sync

## 21. ALL 9 DATABASE TABLES (per schema)

| Table | Purpose |
|---|---|
| `profiles` | All users — students, admins, super admin |
| `exam_attempts` | Full mock exam results |
| `daily_challenges` | Daily challenge questions published by admins |
| `daily_attempts` | Student submissions for daily challenges |
| `system_config` | Platform-wide key-value config (streams, settings) |
| `subscription_plans` | Premium plan definitions |
| `questions` | AI-generated + PYQ question bank |
| `payment_logs` | **NEW** — Every Razorpay payment: payment_id, order_id, user_id, amount, plan, verified_at |
| `activity_log` | **NEW** — User actions: login, exam_start, exam_submit, daily_submit, practice_start |

## 22. NEW API ENDPOINT: `api/activity_log.php`

**Purpose**: Write-only endpoint for audit trail. Called fire-and-forget from frontend.

**POST body**:
```json
{
  "user_id":    "uuid",
  "user_email": "email",
  "user_name":  "name",
  "event_type": "login|exam_submit|daily_submit|practice_start|signup|logout",
  "stream":     "JEE Main & Advanced",
  "metadata":   { "score": 120, "accuracy": 85 }
}
```

## 23. PAYMENT FLOW (Complete)

```
Frontend (Pricing.tsx / ExamPortal.tsx)
  │
  ├─ POST /api/create-order.php
  │    Body: { amount, receipt, user_id, user_email, user_name, plan_id, plan_name, stream }
  │    Returns: { order_id, key_id, ...metadata echoed back }
  │
  ├─ Razorpay Checkout Modal opens
  │
  └─ POST /api/verify-payment.php (on payment success)
       Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature, user_id, user_email, amount, plan_id, stream }
       ─── Verifies HMAC signature ──────────────────────────────────────────
       ─── Writes to payment_logs table ─────────────────────────────────────
       ─── Updates profiles.subscription_tier + subscription_expires_at ─────
       Returns: { status: 'success', payment_log_id, amount_rupees }
```

## 24. REVENUE DASHBOARD QUERY

To get real revenue from the DB:
```sql
-- Total revenue
SELECT SUM(amount_rupees) AS total_revenue FROM payment_logs WHERE status = 'verified';

-- Revenue per plan
SELECT plan_name, COUNT(*) AS transactions, SUM(amount_rupees) AS revenue
FROM payment_logs GROUP BY plan_name ORDER BY revenue DESC;

-- Revenue per student
SELECT user_email, user_name, COUNT(*) AS payments, SUM(amount_rupees) AS total_paid
FROM payment_logs GROUP BY user_email ORDER BY total_paid DESC;
```

The `getActualTotalRevenue()` function in `supabase.ts` queries `payment_logs` as primary source and returns `{ total: number, breakdown: any[] }`.

