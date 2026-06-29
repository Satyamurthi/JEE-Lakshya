# 🧠 BRAIN.md - JEE Nexus & NEET Lakshya AI Knowledge Base & Exhaustive Project Memory

> **CRITICAL INSTRUCTION FOR AGENT / AI ASSISTANT**: Read this file completely whenever the user starts a session, asks to *"remember from the brain"*, or says *"continue"* / *"continue at next meet"*. It contains an exhaustive file map, full development trace, and the **LIVE WORK RESUME CHECKPOINT** below which tracks exact ongoing work and state so execution can resume seamlessly without stopping or missing context.

---

## ⏸️ LIVE WORK RESUME CHECKPOINT & SESSION LOG

> **AGENT PROTOCOL**: Update this section before ending any turn or when work is paused. When the user says **"continue"** or **"continue at next meet"**, immediately read this section and resume execution from the **Next Immediate Action**.

* **Session Status**: 🟡 IN-PROGRESS (Deep PDF Question & Option Extraction Pipeline)
* **Last Updated Timestamp**: 2026-06-29 14:50 IST
* **Current Active Stream Context**: Multi-Tenant JEE Main/Advanced (`JEE-Nexus`) & NEET UG (`JEE-Lakshya`)
* **Last Completed Task**: Received user instruction to convert all 177 PYQ papers to standard full-width CBT exam format (rendering question statements and options A, B, C, D directly on screen, eliminating the left-side PDF embed viewer).

### 🎯 Active Task Overview
* **Goal**: Build and run an exhaustive Python extraction engine (`DB/deep_extract_all_pyqs.py`) to parse every single question statement and all four options (A, B, C, D) / numerical answers from all 177 PDFs in `d:\JEE\JEE PYQ`. Update `ExamPortal.tsx` to render all PYQs in pure standard CBT mode without split-screen PDF view.

### 📝 Step-by-Step Progress Tracking
- [x] **Step 1**: Identify user requirement to replace split-screen PDF view with standard full-width CBT question rendering.
- [ ] **Step 2**: Create implementation plan (`implementation_plan.md`) detailing deep PDF parsing and UI rendering updates.
- [ ] **Step 3**: Build comprehensive Python deep extractor (`DB/deep_extract_all_pyqs.py`) to parse full question texts, options A/B/C/D, LaTeX formulas, and answer keys across all 177 PDFs.
- [ ] **Step 4**: Regenerate `src/data/officialJeeExtractedPapers.json` with extracted question texts and options.
- [ ] **Step 5**: Update `YearWisePYQ.tsx` and `ExamPortal.tsx` so `pdfUrl` does not trigger split-screen PDF view for PYQs, presenting standard CBT UI.
- [ ] **Step 6**: Verify production build, test exam portal launch, commit and push to both GitHub repositories.

### 📌 Next Immediate Action (If User Says "Continue")
* **Continuation Point**: Currently at Step 2 & 3. Create `implementation_plan.md` and execute `DB/deep_extract_all_pyqs.py` to process all 177 PDFs.

---

## 🤖 MANDATORY AGENT EXECUTION & CHECKPOINT RULES

1. **PERSISTENT LOGGING**: Every single significant change, file edit, database alteration, or structural task MUST be documented in `brain.md`.
2. **MIDWAY STOPPING GUARD**: If execution stops in the middle (due to rate limits, turn limits, or user pausing), update the `## ⏸️ LIVE WORK RESUME CHECKPOINT` with the exact line of code or task step where work halted.
3. **ZERO-FRICTION RESUMPTION**: When the user says *"continue"*, *"continue at next meet"*, or *"resume"*, immediately read `## ⏸️ LIVE WORK RESUME CHECKPOINT` and execute the pending items immediately.
4. **MULTI-REPO SYNCHRONIZATION**: Always maintain alignment across target repositories (`JEE-Nexus` and `JEE-Lakshya`).

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
├── 📄 brain.md                          # THIS FILE - Exhaustive project memory base, file map & live checkpoint log
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
├── 📄 android_update_schema.sql         # SQL migration script for Android synchronization
├── 📄 JEE_Lakshya_Android.apk           # Compiled debug Android application package
├── 📄 JEE_Lakshya_Android_Release.apk   # Compiled release Android application package
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
├── 📁 neetdb/                           # Dedicated NEET Database & 60,000 Questions Engine
│   ├── 📄 schema.sql                    # Dedicated NEET PostgreSQL/SQLite database schema
│   ├── 📄 neet_nexus_mysql.sql           # Dedicated NEET MySQL database dump
│   ├── 📄 neet_questions.db              # Dedicated NEET SQLite database (~31MB)
│   ├── 📄 generate_60k_neet_bank.py     # Python generator seeding 15,000 hard questions per subject (60,000 total)
│   ├── 📄 generate_massive_neet_bank.py # Standalone NEET question bank compilation script
│   ├── 📄 clean_and_insert_neet_questions.sql # SQL script clearing old questions and inserting NEET PYQ batches
│   ├── 📄 master_neet_setup.sql          # Master 960KB SQL setup file for Supabase NEET database
│   ├── 📄 migrate_to_supabase.py       # Python migration tool transferring NEET questions into Supabase
│   ├── 📄 fetch_all_neetprep_to_neetdb.py # Python scraper/fetcher aggregating external NEET question sources
│   ├── 📄 import_all_new_sources.py     # Python utility importing external datasets into local NEET SQLite
│   ├── 📄 generate_chunked_sql.py       # Generates 5,000-row chunked SQL files for easy Supabase execution
│   ├── 📄 generate_master_sql.py        # Compiles all chunked NEET SQL files into master_neet_setup.sql
│   ├── 📄 generate_sql_clean_and_insert.py # Generates standalone cleanup and insertion SQL scripts
│   ├── 📄 check_supabase_count.py       # Python verification script checking live question counts in Supabase
│   ├── 📄 rebuild_and_migrate_all.py    # Master one-click Python script rebuilding local DB and migrating to Supabase
│   └── 📁 sql_chunks/                   # Directory containing 5,000-row chunked SQL files for smooth execution
│
└── 📁 Android/                          # Native Android Studio Mobile Application Source
    ├── 📁 app/src/main/
    │   ├── 📄 AndroidManifest.xml       # Native Android manifest with network permissions & WebView settings
    │   ├── 📁 java/com/neetlakshya/app/
    │   │   └── 📄 MainActivity.kt       # Native Kotlin WebView activity with back-button & loading handler
    │   └── 📁 res/                      # Android resources
    │       ├── 📁 drawable/             # Android app launch icons and drawables
    │       └── 📁 values/               # Android colors.xml, themes.xml, strings.xml, env_config.xml
    └── 📄 build.gradle / settings.gradle# Android Gradle build scripts
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
- **Android Native WebView Application (`Android/`)**: Generated native Android Kotlin source code ([MainActivity.kt](file:///d:/JEE/Android/app/src/main/java/com/neetlakshya/app/MainActivity.kt)), XML layouts, permissions, and color themes ([env_config.xml](file:///d:/JEE/Android/app/src/main/res/values/env_config.xml)) matching the dark slate/indigo web application branding.
- Android application configured with hardware acceleration, dom storage, and back-button navigation for CBT tests.

### Phase 6: Standardized Checkpoint & Work Resumption Protocol
- Established explicit live work resume logging inside [brain.md](file:///d:/JEE/brain.md).
- Formatted memory structure so any session that halts midway can immediately pick up where it stopped when the user says "continue at next meet".

---

## 🔮 Current Memory State & Next Action Guide

### Where the Project Stands Right Now:
* **Production Build**: Verified clean builds.
* **Database Readiness**: Fully configured for both JEE Main/Advanced and NEET UG (180 MCQs, 720 Marks).
* **Version Control**: Remote GitHub repositories aligned on branch `main`.
* **Session Memory**: 100% active and persistent via `## ⏸️ LIVE WORK RESUME CHECKPOINT`.

### What to Do When User Says "Continue":
1. Open and read `## ⏸️ LIVE WORK RESUME CHECKPOINT` in [brain.md](file:///d:/JEE/brain.md).
2. Check **Current Active Stream Context** and **Next Immediate Action**.
3. Execute the pending step in **Step-by-Step Progress Tracking** without restarting analysis from scratch.
4. Keep `brain.md` updated after every major execution step.
