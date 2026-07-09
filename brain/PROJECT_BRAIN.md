# Project Brain - Core Architecture & System Overview

This folder (`brain/`) serves as the central memory bank for the multi-stream exam portal. Any AI assistant working on this project must read the files in this folder first to establish complete context.

---

## 1. Project Context
*   **Goal**: Premium mock testing system for four main streams: **JEE**, **NEET**, **KCET**, and **UPSC**.
*   **Core Principle**: A single login page, single Super Admin dashboard (with database switching capabilities), and a single Android app, while keeping SQLite question banks organized in subfolders (`jee/DB/`, `neet/DB/`, `kcet/DB/`, `upsc/DB/`).

---

## 2. System Architecture

```mermaid
graph TD
    A[Single Android App - Kotlin WebView] -->|Loads | B[Single React Web Portal - Vite]
    C[Student Profile] -->|Logs into| B
    D[Super Admin Profile] -->|Logs into| B
    D -->|Toggles Active Stream| E[Active Database Context]
    E -->|Switches Endpoints| F[Supabase Backends - JEE/NEET/KCET/UPSC]
    B -->|Local Fallback Requests| G[Local XAMPP PHP API Proxy]
    G -->|Dynamic Schema Selection| H[Local MySQL Databases - jee_nexus/neet_nexus/etc.]
```

---

## 3. Persistent Files Inventory

*   [PROJECT_BRAIN.md](file:///d:/JEE/brain/PROJECT_BRAIN.md): General overview, architecture diagrams, and system configurations.
*   [session_history.md](file:///d:/JEE/brain/session_history.md): Session-by-session diaries, work records, and design decisions.
*   [next_steps.md](file:///d:/JEE/brain/next_steps.md): Pending items, future plans, and upcoming features.
*   [make_repos_private.js](file:///d:/JEE/scripts/make_repos_private.js): Utility script to bulk convert owned GitHub repositories from public to private.

---

## 4. Run & Test Instructions

### React Web Client
```bash
npm install
npm run dev     # Dev server launches on Port 3000
npm run build   # Build production bundle
```

### Local API
Ensure XAMPP is running Apache on localhost. The PHP files in `api/` will handle local requests.

---

## 5. Revenue & Micro-Payments Tracking Design
*   **Micro-Unlock Price**: Student micro-payment mock-unlocks cost ₹10.
*   **Immediate Draft Registration**: When a student completes Razorpay checkout, the client immediately calls `createDraftPaidAttempt()` (or `submitDailyAttempt()`) to write a draft/initial record (with `paid: true` in its config) to the database. This records the revenue instantly even if the student closes the browser tab before completing the mock test.
*   **Upsert on Completion**: Switched mock attempt saving to use Supabase `upsert` keyed by the draft's unique ID. When the student clicks submit, the draft record is overwritten with final exam scores, preventing duplicate revenue logging.
*   **Schema Fallback Protection**: In cases where schema sync is pending and the `paid` column is missing from `exam_attempts` (throwing pg errors), `getActualTotalRevenue()` falls back to client-side parsing of the `config` JSONB column (`config.paid === true`) to calculate the actual platform revenue accurately.

---

## 6. NEET UG Stream Details
*   **Subjects**: Structured into Physics, Chemistry, Botany, and Zoology.
*   **Dynamic Credentials**: Integrates with the distinct NEET Supabase database (`https://pasyqykxlskcrvtqboxd.supabase.co`) using a Proxy switcher context that activates when the user selects the NEET stream.
*   **Question Type**: NEET relies strictly on MCQs (+4/-1 marking scheme). All numerical entry inputs are bypassed, and question engines (both AI and deterministic fallbacks) are fully isolated from JEE/math-based elements.

---

## 7. GitHub Repository Visibility Utility
*   **Script Location**: [make_repos_private.js](file:///d:/JEE/scripts/make_repos_private.js)
*   **Purpose**: Bulk updates visibility of all public repositories owned by the user to private.
*   **Authentication**: Reads the `GITHUB_PAT` token from the `.env` file (stored locally and gitignored) or accepts it as a command line argument.

---

## 8. Question Deduplication & Database Integrity
*   **Hash Deduplication Strategy**: To prevent repeating questions in a single exam or across practice sessions, client-side filtering utilizes [questionTracker.ts](file:///d:/JEE/src/utils/questionTracker.ts) which computes question hashes strictly based on normalized question statement text. This guarantees identical question statements are deduplicated, even if they have different database primary IDs.
*   **Database Cleanup**: Periodically run paginated scan and delete routines to remove physical duplicate entries. In July 2026, 312 duplicates were cleaned from the NEET database. The Main database has Row-Level Security (RLS) enabled on the `questions` table which blocks anonymous deletions. However, duplicate questions are 100% cleanly filtered out client-side during tests and practice sessions by [questionTracker.ts](file:///d:/JEE/src/utils/questionTracker.ts).

