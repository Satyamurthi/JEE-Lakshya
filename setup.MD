# Complete Project Setup Guide (`setup.MD`)

Welcome to the **JEE Lakshya / Exam Prep & Coaching Admin Portal**. This document provides step-by-step instructions to set up, run, and maintain the frontend and backend locally and in production.

---

## 1. System Overview & Architecture

The application is a multi-stream exam preparation platform supporting **JEE**, **NEET**, **KCET**, and **UPSC**.

* **Frontend**: React + TypeScript + Vite + Tailwind CSS
* **Backend Proxy**: PHP 8.x + MariaDB (MySQL) with dynamic multi-stream schema switching
* **Cloud Sync**: Supabase API client wrapper with local PHP fallback proxy
* **Tunneling**: Serveo / Cloudflare SSH Tunneling for remote backend resolution

---

## 2. Directory & Question Bank Structure

Each exam stream has its dedicated question bank directory containing its SQLite database files:

```
d:\JEE\
├── jee\
│   └── DB\
│       ├── questions.db          <-- JEE Question Bank
│       └── jeebakend.DB
├── neet\
│   └── DB\
│       └── questions.db          <-- NEET Question Bank
├── kcet\
│   └── DB\
│       └── questions.db          <-- KCET Question Bank
├── upsc\
│   └── DB\
│       └── questions.db          <-- UPSC Question Bank
├── api\                          <-- PHP Proxy Backend
├── src\                          <-- React Application
├── setup.MD                      <-- Setup Guide
└── Backend.md                    <-- Backend & SQL Guide
```

When a student selects an exam stream (e.g. JEE, NEET, KCET, UPSC), the application passes the HTTP header `X-Active-Stream` (or query parameter `?stream=...`), which dynamically routes database operations to the corresponding MariaDB schema:

| Exam Stream | MariaDB Database | Folder Path |
| :--- | :--- | :--- |
| **JEE Main & Advanced** | `jee_nexus` | `d:\JEE\jee\DB\` |
| **NEET UG** | `neet_nexus` | `d:\JEE\neet\DB\` |
| **KCET** | `kcet_nexus` | `d:\JEE\kcet\DB\` |
| **UPSC CSE** | `upsc_nexus` | `d:\JEE\upsc\DB\` |

---

## 3. Step-by-Step Installation

### Step 1: Clone & Install Dependencies
```bash
# Navigate to project directory
cd d:\JEE

# Install React node packages
npm install
```

### Step 2: Configure Environment Variables
Create or verify `.env` file in the root directory:
```ini
VITE_SUPABASE_URL=https://jee-nexus.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 3: Initialize MariaDB Databases
Make sure MariaDB / MySQL server is running on `127.0.0.1:3306` with user `root` and empty password (or update credentials in `api/db.php`).

Run `api/setup_db.php` to create all 4 stream databases and execute schema migrations:
```bash
php d:\JEE\api\setup_db.php
```
*Output:*
```json
{"status":"done","results":{"jee_nexus":"Success","neet_nexus":"Success","kcet_nexus":"Success","upsc_nexus":"Success"}}
```

### Step 4: Start the Local PHP Backend Proxy
Launch the built-in PHP development server on Port `8080`:
```bash
php -S 127.0.0.1:8080 -t d:\JEE api/router.php
```

### Step 5: Start the React Frontend Application
Launch the Vite development server:
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 4. Super Admin Credentials

* **Email**: `satyu000@gmail.com`
* **Role**: `super_admin`
* **Capabilities**:
  1. Create, edit, freeze, and manage Coaching Admin accounts.
  2. Switch stream database contexts dynamically (JEE, NEET, KCET, UPSC).
  3. Generate and publish Daily Challenges per stream.
  4. Seed and export Question Banks.
  5. Manage platform revenue and subscription plans.

---

## 5. Build for Production

To build the production bundle for Netlify or static deployment:
```bash
npm run build
```
The output files will be generated inside the `dist/` directory.
