# 🧠 BRAIN.md - JEE Nexus AI System Knowledge & Memory Base

## 📋 Project Overview
**JEE Nexus AI** (`jee-nexus-ai`) is a full-stack competitive examination preparation platform designed for students preparing for Indian entrance exams such as **JEE Main**, **JEE Advanced**, **NEET**, **KCET**, and **UPSC**.

The system features real-time Computer Based Testing (CBT) interfaces, dynamic AI-powered question generation (Google Gemini API), year-wise Previous Year Question (PYQ) banks, scheduled daily challenges, and administrative control panels for coaching institutes and platform owners.

---

## 🏗️ Core Architecture & Tech Stack

### 1. Frontend Framework
* **Core**: React 19 + TypeScript + Vite.
* **Styling & UI**: Tailwind CSS v4, Framer Motion (animations), Lucide React (icons).
* **Math & Scientific Rendering**: KaTeX via custom component (`MathText.tsx`).
* **Charts & Visualizations**: Recharts.
* **PWA / Offline**: Service Worker (`sw.js`, `serviceWorkerRegistration.ts`).

### 2. Backend & Data Layer (Dual Architecture)
* **Supabase (Primary Cloud Backend)**:
  * Authentication (JWT, Auth Users).
  * PostgreSQL Database storing `profiles`, `questions`, `exam_attempts`, `daily_challenges`, and subscription details (`src/supabase.ts`).
* **PHP REST API (Optional Self-Hosted / XAMPP Stack)**:
  * Custom PHP REST endpoints under `/api` (`auth.php`, `questions.php`, `exam_attempts.php`, `create-order.php`, `verify-payment.php`, `db.php`).
  * MySQL schema and dumps under `/DB` (`schema.sql`, `jee_nexus_mysql.sql`).
* **SQLite & Python Utilities**:
  * Local question database (`DB/jee_questions.db`).
  * PDF parser and DB seeders (`DB/pdf_parser.py`, `DB/seed_db.py`, `DB/migrate_to_supabase.py`).

### 3. Artificial Intelligence Core
* **Google Gemini API** (`@google/genai`):
  * Dynamic test synthesis based on subject, chapter, and difficulty.
  * Real-time solution generation and concepts explanation.
  * Specialized services: `geminiService.ts` (JEE), `neetGeminiService.ts` (NEET - strictly 180 MCQs across Physics, Chemistry, Botany, Zoology with +4/-1), `kcetGeminiService.ts` (KCET), `upscGeminiService.ts` (UPSC).

### 4. Official NEET UG Pattern Memory
* **Structure**: 180 Mandatory MCQs (Physics: 45, Chemistry: 45, Botany: 45, Zoology: 45).
* **Total Marks**: 720 Marks (180 × 4). Duration: 3 Hours (180 Mins).
* **Marking**: +4 for correct, -1 for incorrect, 0 for unanswered. No numerical questions.

---

## 🗺️ File & Directory Structure Map ("Where is the thing?")

```
d:\JEE\
├── api/                        # Custom PHP REST backend (Self-hosted fallback)
│   ├── auth.php                # Authentication & Session endpoints
│   ├── db.php                  # Database connection (PDO MySQL)
│   ├── questions.php           # Question management & query endpoints
│   ├── exam_attempts.php       # Exam result submission & history retrieval
│   ├── create-order.php        # Razorpay payment order generator
│   └── verify-payment.php      # Razorpay webhook / signature validator
│
├── DB/                         # JEE Database scripts, migrations & local datasets
│   ├── schema.sql              # MySQL/SQLite schema structure
│   ├── jee_nexus_mysql.sql     # MySQL database dump
│   ├── jee_questions.db        # Local SQLite question bank (~24MB)
│   ├── seed_db.py              # Populates SQLite DB from extracted datasets
│   └── migrate_to_supabase.py # Migrates local SQLite/MySQL data to Supabase
│
├── neetdb/                     # Dedicated NEET Database scripts & datasets (60,000 Questions Capacity)
│   ├── schema.sql              # NEET SQLite/MySQL schema structure
│   ├── neet_nexus_mysql.sql    # NEET MySQL database dump
│   ├── neet_questions.db       # Local NEET SQLite question bank (15k Qs per subject: Physics, Chem, Botany, Zoology)
│   ├── sql_chunks/             # 5,000-row chunked SQL files for effortless Supabase execution
│   ├── seed_db.py              # Seeds 2013-2026 official NEET papers
│   └── generate_60k_neet_bank.py # Generates 15,000 hard NEET questions per subject (60,000 total)
│
├── src/                        # Main React TypeScript Frontend
│   ├── App.tsx                 # App entry router, context providers, protected routes
│   ├── main.tsx                # React DOM render entry
│   ├── types.ts                # TypeScript definitions (Question, ExamSession, UserProfile, etc.)
│   ├── constants.tsx            # Constant syllabus definitions, static question banks
│   ├── supabase.ts             # Supabase client & API helper functions
│   │
│   ├── components/             # Reusable UI Components
│   │   └── MathText.tsx        # LaTeX math renderer powered by KaTeX
│   │
│   ├── pages/                  # Application Views / Routes
│   │   ├── Dashboard.tsx       # Student hub (quick actions, streak counter, performance stats)
│   │   ├── ExamSetup.tsx       # AI test customization panel (Subject, difficulty, count)
│   │   ├── ExamPortal.tsx      # CBT Exam Interface (Timer, question palette, answer tracking)
│   │   ├── Results.tsx         # Detailed score report, accuracy breakdown, AI solution viewer
│   │   ├── Daily.tsx           # Scheduled Daily Challenge testing area
│   │   ├── YearWisePYQ.tsx     # PYQ drill portal filtered by year and subject
│   │   ├── Analytics.tsx       # Performance metrics & weak area graphical analysis
│   │   ├── History.tsx         # Complete log of past attempts with filter & review
│   │   ├── Login.tsx           # User authentication login view
│   │   ├── Signup.tsx          # New student / user registration view
│   │   ├── Settings.tsx       # Profile management, password reset, preferences
│   │   ├── Admin.tsx           # Coaching center / Teacher portal (Daily tests, student management)
│   │   └── SuperAdmin.tsx      # System administrator portal (User approvals, system metrics)
│   │
│   ├── geminiService.ts        # Main JEE AI question generator & explanation engine
│   ├── neetGeminiService.ts    # Tailored prompt handler for NEET Biology/Physics/Chem
│   ├── kcetGeminiService.ts    # Prompt handler for KCET exams
│   ├── upscGeminiService.ts    # Prompt handler for UPSC Prelims exams
│   └── streamGeminiDispatcher.ts # Stream dispatch helper for streaming AI responses
│
├── .env / .env.example         # Environment variables (Gemini API key, Supabase URL/Key)
├── package.json                # Project scripts & dependencies
├── vite.config.ts              # Vite configuration
├── setup.md / Backend.MD       # Backend installation and database setup guides
└── brain.md                    # AI Knowledge base & fast-reference memory file
```

---

## 🔄 Core Workflows & Data Flow ("What is happening?")

### 1. User Authentication & Access Control (`App.tsx`, `supabase.ts`)
* Users sign in via `Login.tsx` or `Signup.tsx`.
* Role-based routing enforces access boundaries:
  * `student`: Dashboard, ExamSetup, ExamPortal, Results, Daily, PYQ, Analytics, History.
  * `admin`: Admin portal to monitor assigned students and publish daily tests.
  * `super_admin`: Full system management, approving new institute admins, viewing payment revenue logs.

### 2. Test Generation & Execution Lifecycle (`ExamSetup` ➔ `ExamPortal` ➔ `Results`)
* **Setup (`ExamSetup.tsx`)**: The user selects subject, chapter, question count, and exam target (JEE/NEET/KCET/UPSC).
* **Generation (`geminiService.ts` / Supabase)**: The app queries Supabase for matching pre-stored questions or calls Google Gemini AI to generate structured JSON questions matching exact NTA marking schemes.
* **Execution (`ExamPortal.tsx`)**: Provides an exam environment mimicking official CBT software with real-time timer, Question Palette (Answered, Unanswered, Marked for Review), and formula preview.
* **Submission & Results (`Results.tsx`)**: Computes net score according to marking scheme (+4/-1 for MCQs, +4/0 for Numerical), syncs results to Supabase `exam_attempts`, updates subject-wise accuracy metrics, and lets students query AI for step-by-step solutions.

### 3. Daily Challenges & PYQs (`Daily.tsx`, `YearWisePYQ.tsx`)
* Admins publish Daily Challenges via `Admin.tsx` which are pushed to students' dashboards.
* `YearWisePYQ.tsx` enables targeted practice using archived previous years' actual test papers.

### 4. Data Sync & Hydration (`DB/migrate_to_supabase.py`)
* Python tools clean up and extract question sets from local SQLite / PDFs and upload them directly into Supabase tables for global availability.

---

## 🚀 Key Reference Points for Future Development
* **Adding New Exam Types**: Implement a new Gemini service file (e.g. `gateGeminiService.ts`), update `ExamType` enum in `src/types.ts`, and add router cases in `ExamSetup.tsx`.
* **Database Schema Changes**: Ensure updates are mirrored both in `src/supabase.ts` (PostgreSQL types) and `DB/schema.sql` (MySQL schema) if keeping PHP API in sync.
* **Styling & Components**: All LaTeX math expressions must be rendered inside `<MathText text={...} />` to avoid standard markdown rendering glitches.
