# 🧠 BRAIN.md - JEE Nexus & NEET Lakshya AI Knowledge Base & Exhaustive Project Memory

> **CRITICAL INSTRUCTION FOR AGENT / AI ASSISTANT**: Read this file completely whenever the user says *"remember from the brain"*. It contains an exhaustive, line-by-line directory map of EVERY SINGLE FILE in this project (`d:\JEE`), what it is, where it is located, and what logic it executes, along with the full chronological development trace and future roadmap instructions.

---

## 📋 Project Overview & Core Mission
**JEE Nexus AI** & **NEET Lakshya AI** (`jee-nexus-ai`) is an enterprise-grade, multi-tenant competitive examination platform built for Indian entrance examinations including **JEE Main**, **JEE Advanced**, **NEET UG**, **KCET**, **BITSAT**, and **UPSC**.

The system features real-time Computer Based Testing (CBT) software, dynamic AI-powered question synthesis (Google Gemini API), year-wise Previous Year Question (PYQ) banks (2013–2026), automated daily challenges, dynamic revenue analytics, and dedicated Super Admin management tools.

---

## 🗺️ EXHAUSTIVE FILE & DIRECTORY MAP ("Where is everything & what is inside?")

Below is the complete, granular inventory of every single directory and file in `d:\JEE`:

```
d:\JEE\
│
├── 📄 .env                              # Primary environment configuration (VITE_SUPABASE_URL, API keys)
├── 📄 .env.example                      # Template environment variables reference
├── 📄 .gitignore                        # Git ignore rules for node_modules, dist, builds
├── 📄 Backend.MD                        # Complete Supabase setup guide, PostgreSQL SQL DDL scripts & reset routines
├── 📄 NEETbackend.MD                   # Dedicated NEET UG database setup, 180 MCQ specs & SQL scripts
├── 📄 brain.md                          # THIS FILE - Exhaustive project memory base & file map
├── 📄 README.md                         # General repository description and startup instructions
├── 📄 setup.md                          # Platform setup guide and architectural documentation
├── 📄 XAMPP_SETUP.md                    # Setup guide for local XAMPP Apache/MySQL PHP API testing
├── 📄 index.html                        # Application HTML entry point with KaTeX CSS links
├── 📄 manifest.json                     # Progressive Web App (PWA) manifest configuration
├── 📄 metadata.json                     # Workspace metadata configuration
├── 📄 package.json                      # NPM project dependencies, scripts (dev, build, preview)
├── 📄 package-lock.json                 # Locked dependency tree versions
├── 📄 tsconfig.json                     # TypeScript compiler settings
├── 📄 vite.config.ts                    # Vite build tool setup with React plugin and path aliases
├── 📄 eslint.config.js                  # ESLint code quality rules configuration
├── 📄 sw.js                             # Service Worker script for offline caching and PWA functionality
├── 📄 _redirects                         # Netlify single-page application (SPA) routing redirect rules
│
├── 📁 src/                              # Core React TypeScript Frontend Source Directory
│   ├── 📄 App.tsx                       # Main React router, context providers, role-based protected route guards
│   ├── 📄 main.tsx                      # React DOM render root initialization
│   ├── 📄 types.ts                      # Core TypeScript definitions (Question, ExamSession, UserProfile, etc.)
│   ├── 📄 constants.tsx                 # Static syllabus arrays, constant definitions, fallback question sets
│   ├── 📄 supabase.ts                  # Supabase client, auth helpers, dynamic stream seeder & revenue calculator
│   ├── 📄 index.css                     # Global Tailwind CSS styles and KaTeX math overrides
│   ├── 📄 serviceWorkerRegistration.ts # PWA service worker registration and update listener
│   ├── 📄 streamGeminiDispatcher.ts      # Stream dispatcher helper for real-time AI response streaming
│   ├── 📄 geminiService.ts             # JEE Main/Advanced AI question generator & step-by-step solution engine
│   ├── 📄 neetGeminiService.ts         # Dedicated NEET AI generator enforcing 180 MCQs (Physics/Chem/Botany/Zoology)
│   ├── 📄 kcetGeminiService.ts         # KCET examination AI question generator
│   ├── 📄 upscGeminiService.ts         # UPSC Prelims examination AI question generator
│   │
│   ├── 📁 components/                   # Reusable Shared UI Components
│   │   └── 📄 MathText.tsx              # LaTeX mathematical formula renderer powered by KaTeX
│   │
│   ├── 📁 utils/                        # Frontend Utilities & Integrations
│   │   └── 📄 payment.ts                # Razorpay payment gateway integration and verification helper
│   │
│   └── 📁 pages/                        # Application Views / Routes (14 Core Views)
│       ├── 📄 Dashboard.tsx             # Student hub with live streak calculator, performance metrics & AI standby card
│       ├── 📄 ExamSetup.tsx             # Test customization panel (select subject, chapter, difficulty, question count)
│       ├── 📄 ExamPortal.tsx            # CBT testing environment (NTA palette, countdown timer, session verification)
│       ├── 📄 Results.tsx               # Detailed scorecard, accuracy breakdown & step-by-step AI explanation viewer
│       ├── 📄 Practice.tsx              # Modular chapter-wise practice testing ground
│       ├── 📄 Daily.tsx                 # Scheduled Daily Challenge testing area for enrolled students
│       ├── 📄 YearWisePYQ.tsx           # Historical Previous Year Questions (2013-2026) testing portal
│       ├── 📄 Analytics.tsx             # Graphical performance profiling and subject-wise weak area analysis
│       ├── 📄 History.tsx               # Complete searchable log of past exam attempts with review capabilities
│       ├── 📄 Login.tsx                 # User authentication view with PostgREST query fixes & Super Admin auto-bootstrap
│       ├── 📄 Signup.tsx                # New student & coaching admin registration form
│       ├── 📄 Settings.tsx              # User profile management, password reset & preferences
│       ├── 📄 Admin.tsx                 # Coaching center teacher portal for student management & publishing daily tests
│       └── 📄 SuperAdmin.tsx            # System administrator panel (coaching approvals, streams, actual revenue, seeder)
│
├── 📁 api/                              # Optional Custom PHP REST API (Self-Hosted Fallback)
│   ├── 📄 auth.php                      # Authentication, session login, signup endpoints
│   ├── 📄 db.php                        # PDO MySQL database connection helper
│   ├── 📄 questions.php                 # Question retrieval and management API endpoints
│   ├── 📄 exam_attempts.php             # Exam attempt submission and history retrieval API
│   ├── 📄 create-order.php              # Razorpay payment order generator backend endpoint
│   └── 📄 verify-payment.php            # Razorpay webhook and signature verification endpoint
│
├── 📁 DB/                               # JEE Local SQLite Database & Python Migration Suite
│   ├── 📄 schema.sql                    # MySQL/SQLite database schema structure for JEE
│   ├── 📄 jee_nexus_mysql.sql           # Complete MySQL database dump for JEE (~28MB)
│   ├── 📄 jee_questions.db              # Local SQLite question bank (~24MB)
│   ├── 📄 seed_db.py                    # Python script populating local SQLite DB from extracted datasets
│   ├── 📄 migrate_to_supabase.py       # Python script migrating local SQLite/MySQL JEE questions into Supabase
│   ├── 📄 pdf_parser.py                 # Python utility extracting raw text and questions from PDF exam papers
│   ├── 📄 create_exam.py                # Python utility generating mock exam sessions locally
│   ├── 📄 populate_sqlite_from_pkl.py   # Python utility unpickling raw datasets into SQLite
│   └── 📄 export_to_mysql_dump.py       # Python script converting local SQLite database into MySQL SQL dump format
│
└── 📁 neetdb/                           # Dedicated NEET Database & 60,000 Questions Engine
    ├── 📄 schema.sql                    # Dedicated NEET PostgreSQL/SQLite database schema
    ├── 📄 neet_nexus_mysql.sql           # Dedicated NEET MySQL database dump
    ├── 📄 neet_questions.db              # Dedicated NEET SQLite database (~31MB)
    ├── 📄 generate_60k_neet_bank.py     # Python generator seeding 15,000 hard questions per subject (60,000 total)
    ├── 📄 generate_massive_neet_bank.py # Standalone NEET question bank compilation script
    ├── 📄 clean_and_insert_neet_questions.sql # SQL script clearing old questions and inserting NEET PYQ batches
    ├── 📄 master_neet_setup.sql          # Master 960KB SQL setup file for Supabase NEET database
    ├── 📄 migrate_to_supabase.py       # Python migration tool transferring NEET questions into Supabase
    ├── 📄 fetch_all_neetprep_to_neetdb.py # Python scraper/fetcher aggregating external NEET question sources
    ├── 📄 import_all_new_sources.py     # Python utility importing external datasets into local NEET SQLite
    ├── 📄 generate_chunked_sql.py       # Generates 5,000-row chunked SQL files for easy Supabase execution
    ├── 📄 generate_master_sql.py        # Compiles all chunked NEET SQL files into master_neet_setup.sql
    ├── 📄 generate_sql_clean_and_insert.py # Generates standalone cleanup and insertion SQL scripts
    ├── 📄 check_supabase_count.py       # Python verification script checking live question counts in Supabase
    ├── 📄 rebuild_and_migrate_all.py    # Master one-click Python script rebuilding local DB and migrating to Supabase
    └── 📁 sql_chunks/                   # Directory containing 5,000-row chunked SQL files for smooth execution
│
└── 📁 Android/                          # Native Android Studio Mobile Application Source
    ├── 📁 app/src/main/java/com/example/myapplication/
    │   └── 📄 MainActivity.kt           # Native Kotlin WebView activity with back-button & loading handler
    └── 📁 app/src/main/res/             # Android resources (activity_main.xml layout, colors.xml, themes.xml)
```

---

## 📝 Complete Chronological Development Trace

### Phase 1: Core Platform & Database Foundation
- Built React + TypeScript CBT exam portal supporting JEE and NEET exam structures.
- Integrated Supabase authentication and profile management with multi-tenant coaching support.
- Created standalone SQL scripts for bulk database seeding (`Backend.MD`, `NEETbackend.MD`).

### Phase 2: Bug Fixes & System Stability
- **Activity Log Date Fix ([Dashboard.tsx](file:///d:/JEE/src/pages/Dashboard.tsx))**: Implemented robust timestamp fallback resolution checking `completedAt || submitted_at || created_at || date` to permanently eliminate `"INVALID DATE"` bugs.
- **Strict Attempt Guard & AI Standby State ([Dashboard.tsx](file:///d:/JEE/src/pages/Dashboard.tsx))**: Removed static fallback topic lists (`Kinematics`, `Redox Reactions`). Added strict performance verification (`history.length > 0 && performance.length > 0`) displaying an **AI Standby Card** until real tests are taken.
- **Login Fallback & Auto-Bootstrap ([Login.tsx](file:///d:/JEE/src/pages/Login.tsx))**: Fixed PostgREST `.or()` filter syntax errors and implemented auto-bootstrap for `satyu000@gmail.com` ensuring Super Admin access is never blocked.
- **Daily Attempt Schema Mismatch Fix ([supabase.ts](file:///d:/JEE/src/supabase.ts) & [ExamPortal.tsx](file:///d:/JEE/src/pages/ExamPortal.tsx))**: Sanitized `submitDailyAttempt` payload by stripping non-existent columns (like `date`) prior to `.upsert()`.
- **Automatic Submission Fix ([ExamPortal.tsx](file:///d:/JEE/src/pages/ExamPortal.tsx))**: Verified session initialization timestamps on test launch to prevent background zero-timer submissions upon selecting options.

### Phase 3: Super Admin Analytics & Seeding Enhancements
- **Dynamic Actual Revenue Calculation ([SuperAdmin.tsx](file:///d:/JEE/src/pages/SuperAdmin.tsx) & [supabase.ts](file:///d:/JEE/src/supabase.ts))**: Built `getActualTotalRevenue()` to compute real paid transactions across database attempts (`paid = true`), replacing simulated revenue metrics with dynamic live totals (`₹{totalRevenue}`).
- **Pattern (Per Subject) Controls ([SuperAdmin.tsx](file:///d:/JEE/src/pages/SuperAdmin.tsx))**: Implemented subject-wise MCQ and Numerical input controls with `MINI` and `STANDARD` preset toggles for Daily Challenges.
- **Stream-Aware Question Bank Seeder ([supabase.ts](file:///d:/JEE/src/supabase.ts))**: Updated `seedMassiveQuestionsToDB(activeStream)` to dynamically generate Physics, Chemistry, Botany, and Zoology for NEET streams, or Physics, Chemistry, and Math for JEE streams.
- **Unique Statement Guarantee & Conflict Handling ([supabase.ts](file:///d:/JEE/src/supabase.ts))**: Appended timestamped reference tokens (`Q-Ref: LX9P2K-PH1-4829`) and implemented `.upsert(batch, { onConflict: 'statement' })` to eliminate PostgreSQL unique constraint violations.
- **NEET High-Frequency Formats ([supabase.ts](file:///d:/JEE/src/supabase.ts))**: Integrated authentic **Match Column I with Column II** matching pairs and **Diagrammatical & Labeled Component Identification** questions for NEET Botany and Zoology.

### Phase 4: Version Control & Multi-Repo Deployment
- Synchronized all codebase updates across two remote GitHub repositories:
  - `https://github.com/Satyamurthi/JEE-Nexus.git` (`main` branch)
  - `https://github.com/Satyamurthi/JEE-Lakshya.git` (`main` branch)

### Phase 5: Native Android Mobile Application Setup
- **Android Native WebView Application (`Android/`)**: Generated native Android Kotlin source code (`MainActivity.kt`), XML layouts (`activity_main.xml`), permissions (`AndroidManifest.xml`), and color themes (`colors.xml`, `themes.xml`) matching the dark slate/indigo web application branding.
- Android application configured with hardware acceleration, dom storage, and back-button navigation for CBT tests.

---

## 🔮 Current Memory State & Next Action Guide

### Where the Project Stands Right Now:
* **Production Build**: Verified clean builds (`✓ built in 9.42s`).
* **Database Readiness**: Fully configured for both JEE Main/Advanced and NEET UG (180 MCQs, 720 Marks).
* **Version Control**: Both remote GitHub repositories (`JEE-Nexus` and `JEE-Lakshya`) are force-updated and aligned on branch `main`.

### What to Start Next / Future Prompt Response Logic:
When the user gives a prompt asking to *"remember from the brain"* or resume work, follow these guidelines:
1. **Check Active Stream Context**: Verify whether the user is focusing on **NEET UG** (`JEE-Lakshya`) or **JEE Main/Advanced** (`JEE-Nexus`).
2. **Question Bank Seeding**: If generating or seeding questions, ensure NEET mode uses 100% MCQs across Physics, Chemistry, Botany, and Zoology with Match-the-Following and Diagrammatical options.
3. **Multi-Repo Pushing**: Whenever committing new updates, always push to both target repositories (`JEE-Nexus` and `JEE-Lakshya`).
4. **Verification**: Always validate changes using `npm run build` prior to committing.
