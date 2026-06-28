# 🧠 BRAIN.md - JEE Nexus & NEET Lakshya AI Knowledge Base & Persistent Memory

> **IMPORTANT FOR AGENT / AI ASSISTANT**: Read this file at the start of every session to recall the full project history, completed architectural implementations, database structures, and upcoming roadmap goals.

---

## 📋 Project Overview & Core Mission
**JEE Nexus AI** & **NEET Lakshya AI** (`jee-nexus-ai`) is a full-stack, multi-tenant competitive examination platform designed for Indian entrance examinations including **JEE Main**, **JEE Advanced**, **NEET UG**, **KCET**, **BITSAT**, and **UPSC**.

The system features real-time Computer Based Testing (CBT) software, dynamic AI-powered question synthesis (Google Gemini API), year-wise Previous Year Question (PYQ) banks (2013–2026), automated daily challenges, dynamic revenue analytics, and dedicated Super Admin management tools.

---

## 🏗️ Technical Stack & System Architecture

### 1. Frontend Framework
* **Core**: React 19 + TypeScript + Vite.
* **Styling & UI**: Tailwind CSS v4, Framer Motion (smooth animations), Lucide React (icons).
* **Scientific & Mathematical Rendering**: KaTeX via custom component (`MathText.tsx`).
* **Graphical Analytics**: Recharts for performance profiling and weak area breakdown.
* **PWA / Offline Capability**: Service Worker (`sw.js`, `serviceWorkerRegistration.ts`).

### 2. Dual Backend Layer
* **Supabase Cloud (Primary Production Backend)**:
  * Authentication, User Profiles, Role-Based Access Control (`student`, `admin`, `super_admin`).
  * PostgreSQL tables: `profiles`, `questions`, `daily_challenges`, `daily_attempts`, `exam_attempts`, `system_config`, `user_api_keys`.
* **PHP REST API & Local MySQL/SQLite (Self-Hosted Fallback)**:
  * Custom PHP REST endpoints under `/api` (`auth.php`, `questions.php`, `exam_attempts.php`, etc.).
  * SQLite datasets under `DB/jee_questions.db` (~24MB) and `neetdb/neet_questions.db` (~60k questions capacity).

### 3. Artificial Intelligence Core
* **Google Gemini API** (`@google/genai`):
  * Dynamic test generation based on subject, chapter, and difficulty level.
  * Specialized dispatchers: `geminiService.ts` (JEE), `neetGeminiService.ts` (NEET - strictly 180 MCQs across Physics, Chem, Botany, Zoology with +4/-1), `kcetGeminiService.ts`, `upscGeminiService.ts`.

---

## 📝 Complete Chronological Work Trace & Accomplishments

### Phase 1: Core Platform & Database Foundation
- Built React + TypeScript CBT exam portal supporting JEE and NEET exam structures.
- Integrated Supabase authentication and profile management with multi-tenant coaching support.
- Created standalone SQL scripts for bulk database seeding (`Backend.MD`, `neetbackend.MD`).

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

---

## 🔮 Current Memory State & Next Action Guide

### Where the Project Stands Right Now:
* **Production Build**: Verified clean builds (`✓ built in 9.44s`).
* **Database Readiness**: Fully configured for both JEE Main/Advanced and NEET UG (180 MCQs, 720 Marks).
* **Version Control**: Both remote GitHub repositories (`JEE-Nexus` and `JEE-Lakshya`) are force-updated and aligned on branch `main`.

### What to Start Next / Future Prompt Response Logic:
When the user gives a prompt asking to *"remember from the brain"* or resume work, follow these guidelines:
1. **Check Active Stream Context**: Verify whether the user is focusing on **NEET UG** (`JEE-Lakshya`) or **JEE Main/Advanced** (`JEE-Nexus`).
2. **Question Bank Seeding**: If generating or seeding questions, ensure NEET mode uses 100% MCQs across Physics, Chemistry, Botany, and Zoology with Match-the-Following and Diagrammatical options.
3. **Multi-Repo Pushing**: Whenever committing new updates, always push to both target repositories (`JEE-Nexus` and `JEE-Lakshya`).
4. **Verification**: Always validate changes using `npm run build` prior to committing.

---

## 🗺️ File & Directory Structure Map

```
d:\JEE\
├── Backend.MD                   # Complete Supabase setup & production SQL DDL scripts
├── neetbackend.MD              # Dedicated NEET UG database setup & 180 MCQ specification
├── brain.md                    # THIS FILE - Core memory, architecture & chronological work trace
├── neetdb/                     # Dedicated NEET SQLite database & generator scripts (60k capacity)
│   ├── schema.sql              # NEET database schema
│   └── generate_60k_neet_bank.py # Generates 15k hard questions per subject across 4 sections
├── src/
│   ├── App.tsx                 # Core router & role-based route guards
│   ├── supabase.ts             # Supabase API helper functions & stream-aware seeder
│   ├── pages/
│   │   ├── Dashboard.tsx       # Student dashboard with live streak & AI standby state
│   │   ├── ExamPortal.tsx      # CBT testing environment & session timer verification
│   │   ├── Results.tsx         # Performance reports & step-by-step AI solutions
│   │   ├── SuperAdmin.tsx      # Multi-tenant management, revenue analytics & Question Bank Manager
│   │   └── Login.tsx           # Unified login with auto-bootstrap fallback
│   ├── geminiService.ts        # JEE AI generation service
│   └── neetGeminiService.ts    # NEET AI generation service (180 MCQs, Physics/Chem/Botany/Zoology)
```
