# Lakshya Exam Prep Platform (Multi-Stream Reorganized Project)

This repository contains four independent, stream-specific, and database-isolated versions of the Lakshya exam portal:

1. **`jee/` (JEE Main & Advanced Lakshya)**
   * **Database**: Dedicated `jee_questions.db` SQLite question bank.
   * **Scope**: Math, Physics, Chemistry (MCQ, MSQ, NAT questions).
   * **Branding**: Dedicated JEE Main & Advanced prep interface.
2. **`neet/` (NEET UG Lakshya)**
   * **Database**: Dedicated `neet_questions.db` SQLite question bank.
   * **Scope**: Biology (Botany & Zoology), Physics, Chemistry (strictly MCQ pattern, no numerical questions).
   * **Branding**: Medical exam prep interface.
3. **`kcet/` (KCET Lakshya)**
   * **Database**: Dedicated `questions.db` SQLite question bank.
   * **Scope**: State-level Karnataka CET-specific exam engine.
   * **Branding**: KCET entrance prep interface.
4. **`upsc/` (UPSC CSE Lakshya)**
   * **Database**: Dedicated `questions.db` SQLite question bank.
   * **Scope**: IAS Civil Services statement-based analytical engine.
   * **Branding**: UPSC CSE prep interface.

There is also a standalone **`Android/`** app directory containing the Android client code.

---

## 🚀 Running Any Project Locally

Each project is fully self-contained. To run or compile any specific stream:

1. **Open the stream directory**:
   ```bash
   cd jee   # Or: cd neet, cd kcet, cd upsc
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set your keys**:
   Create a `.env` file inside that project folder:
   ```env
   VITE_SUPABASE_URL=https://your-stream-supabase.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   GEMINI_API_KEY=your-gemini-api-key
   ```
4. **Start the local dev server**:
   ```bash
   npm run dev
   ```
5. **Build for production**:
   ```bash
   npm run build
   ```
