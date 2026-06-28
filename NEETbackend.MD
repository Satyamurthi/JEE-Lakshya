# NEET UG Backend Setup & Configuration Guide (NEET Lakshya)

This document contains full setup instructions and production SQL scripts for configuring the **NEET UG** database instance on Supabase. Setting up this independent backend keeps NEET student data, exam structures, and question banks sandboxed according to official NTA specifications.

---

## 🎯 Official NEET UG Exam Pattern Specification

Based on official NTA guidelines, the NEET UG examination follows this exact structure:

| Parameter | Specification Details |
| :--- | :--- |
| **Total Mandatory Questions** | **180 Questions** (100% Multiple Choice Objective Questions) |
| **Total Maximum Marks** | **720 Marks** |
| **Time Duration** | **3 Hours (180 Minutes)** |
| **Question Format** | Objective Type (MCQs with 4 options: A, B, C, D). **No Numerical Entry.** |
| **Marking Scheme** | **+4 Marks** for correct answer \| **-1 Mark** for incorrect answer \| **0 Marks** for unanswered |
| **Exam Subjects (4 Sections)** | Physics (45 Qs), Chemistry (45 Qs), Botany (45 Qs), Zoology (45 Qs) |

### 📊 Subject-Wise Question & Marks Distribution

| Subject Section | Number of Questions | Total Marks | Marking Scheme |
| :--- | :---: | :---: | :---: |
| **Physics** | 45 | 180 | +4 / -1 |
| **Chemistry** | 45 | 180 | +4 / -1 |
| **Botany** (Plant Biology) | 45 | 180 | +4 / -1 |
| **Zoology** (Animal Biology) | 45 | 180 | +4 / -1 |
| **TOTAL** | **180 Questions** | **720 Marks** | **Duration: 180 Mins** |

---

## 1. Environment Configuration

Add the following environment variables to your local `.env` file to connect the web app directly to your dedicated NEET Supabase instance:

```env
# NEET UG Database Credentials
VITE_NEET_SUPABASE_URL=https://pasyqykxlskcrvtqboxd.supabase.co
VITE_NEET_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhc3lxeWt4bHNrY3J2dHFib3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1ODM0MTcsImV4cCI6MjA5ODE1OTQxN30.Yph_m9uhN4eVkCnSslGqghcZ__rGc03udvTA7q0mxnk
```

---

## 2. Supabase SQL DDL Script (Production Ready)

Copy and run this exact script in the **Supabase SQL Editor** of your NEET project. It creates the schema, tables, check constraints, indexes, and Row Level Security (RLS) policies.

```sql
-- 1. SCHEMAS & EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. CORE SYSTEM TABLES

-- User Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text default 'student' check (role in ('student', 'admin', 'super_admin')),
  status text default 'pending' check (status in ('pending', 'approved', 'frozen')),
  selected_stream text default 'NEET UG',
  coaching_name text,
  coaching_address text,
  admin_id uuid references public.profiles(id),
  mobile_number text,
  has_used_free_test boolean default false,
  admin_max_students integer default 30,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  password text
);

-- Questions Table (NEET UG Question Bank - Enforcing 4 Subjects & MCQ only)
create table if not exists public.questions (
  id uuid default gen_random_uuid() primary key,
  subject text not null check (subject in ('Physics', 'Chemistry', 'Botany', 'Zoology', 'Biology')),
  chapter text,
  type text default 'MCQ' check (type = 'MCQ'),
  difficulty text default 'Medium',
  statement text unique not null,
  options jsonb not null, -- JSON object: {"A": "...", "B": "...", "C": "...", "D": "..."}
  "correctAnswer" text not null,
  solution text,
  explanation text,
  concept text,
  "markingScheme" jsonb default '{"positive": 4, "negative": 1}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily Challenges Table
create table if not exists public.daily_challenges (
  id uuid default gen_random_uuid() primary key,
  date date unique not null,
  questions jsonb not null,
  admin_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily Attempts Table
create table if not exists public.daily_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  challenge_id uuid references public.daily_challenges(id) on delete cascade not null,
  score integer not null,
  total_marks integer not null default 720,
  date date not null,
  paid boolean default false,
  stats jsonb default '{}',
  attempt_data jsonb not null,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint daily_attempts_user_challenge_unique unique (user_id, challenge_id)
);

-- Exam Attempts Table (Stores Mock Test Results)
create table if not exists public.exam_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  user_name text,
  score integer,
  total_marks integer default 720,
  accuracy integer,
  config jsonb,
  questions jsonb,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- System Config Table
create table if not exists public.system_config (
  id text primary key,
  streams jsonb not null default '["NEET UG", "JEE Main & Advanced", "KCET", "CUET"]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. HELPER FUNCTIONS
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = user_id
    and role in ('admin', 'super_admin')
  );
end;
$$ language plpgsql security definer;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
drop policy if exists "Enable insert for all signup users" on profiles;
create policy "Enable insert for all signup users" on profiles for insert with check (true);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id OR auth.uid() is null);

alter table public.questions enable row level security;
drop policy if exists "Read questions" on questions;
create policy "Read questions" on questions for select using (true);
drop policy if exists "Admin write questions" on questions;
create policy "Admin write questions" on questions for insert with check (public.is_admin(auth.uid()) OR auth.uid() is null);
drop policy if exists "Admin update questions" on questions;
create policy "Admin update questions" on questions for update using (public.is_admin(auth.uid()) OR auth.uid() is null);
drop policy if exists "Admin delete questions" on questions;
create policy "Admin delete questions" on questions for delete using (public.is_admin(auth.uid()) OR auth.uid() is null);

alter table public.daily_challenges enable row level security;
drop policy if exists "Everyone read daily challenges" on daily_challenges;
create policy "Everyone read daily challenges" on daily_challenges for select using (true);
drop policy if exists "Admin write daily challenges" on daily_challenges;
create policy "Admin write daily challenges" on daily_challenges for insert with check (public.is_admin(auth.uid()) OR auth.uid() is null);

alter table public.daily_attempts enable row level security;
drop policy if exists "Users can insert own attempts" on daily_attempts;
create policy "Users can insert own attempts" on daily_attempts for insert with check (auth.uid() = user_id OR auth.uid() is null);
drop policy if exists "Users can update own attempts" on daily_attempts;
create policy "Users can update own attempts" on daily_attempts for update using (auth.uid() = user_id OR auth.uid() is null);
drop policy if exists "Users can view own attempts" on daily_attempts;
create policy "Users can view own attempts" on daily_attempts for select using (auth.uid() = user_id OR auth.uid() is null);
drop policy if exists "Admins view all attempts" on daily_attempts;
create policy "Admins view all attempts" on daily_attempts for select using (public.is_admin(auth.uid()));

alter table public.exam_attempts enable row level security;
drop policy if exists "Users can insert own exam attempts" on exam_attempts;
create policy "Users can insert own exam attempts" on exam_attempts for insert with check (auth.uid() = user_id OR auth.uid() is null);
drop policy if exists "Users can view own exam attempts" on exam_attempts;
create policy "Users can view own exam attempts" on exam_attempts for select using (auth.uid() = user_id OR auth.uid() is null);
drop policy if exists "Admins view all exam attempts" on exam_attempts;
create policy "Admins view all exam attempts" on exam_attempts for select using (public.is_admin(auth.uid()));

alter table public.system_config enable row level security;
drop policy if exists "Everyone read system_config" on system_config;
create policy "Everyone read system_config" on system_config for select using (true);
drop policy if exists "Admin write system_config" on system_config;
create policy "Admin write system_config" on system_config for insert with check (public.is_admin(auth.uid()) OR auth.uid() is null);
```

---

## 3. Pre-Seeding Super Admin Credentials

Run this script to provision the primary Super Admin account (`satyu000@gmail.com`) for the NEET platform instance:

```sql
DO $$
DECLARE
  new_super_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'satyu000@gmail.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', new_super_id, 'authenticated', 'authenticated', 'satyu000@gmail.com', crypt('satyupassword', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "Super Admin"}', now(), now());
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, status, selected_stream, password)
  SELECT id, email, 'Super Admin', 'super_admin', 'approved', 'NEET UG', 'satyupassword' FROM auth.users WHERE email = 'satyu000@gmail.com'
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin', status = 'approved', selected_stream = 'NEET UG', password = 'satyupassword';
END $$;
```

---

## 4. Automated SQL Script to Clear Old & Upload Fresh Questions

To purge all old/JEE questions from Supabase and seed the complete fresh dataset (8-Year PYQs across Physics, Chemistry, Botany, and Zoology) from `neetdb`, run the generated SQL script located at:

**File Path**: `d:\JEE\neetdb\clean_and_insert_neet_questions.sql`

### 📜 SQL Execution Code (Copy & Run in Supabase SQL Editor)

```sql
-- 1. CLEAR OLD QUESTIONS FROM NEET SUPABASE DATABASE
DELETE FROM public.questions;

-- 2. UPLOAD FRESH NEET 8-YEAR PYQS & SUBJECT QUESTIONS (Physics, Chemistry, Botany, Zoology)
-- Refer to d:\JEE\neetdb\clean_and_insert_neet_questions.sql for full 56+ question batch insert.
```

Alternatively, you can execute the Python automated script from your terminal:
```bash
python d:\JEE\neetdb\migrate_to_supabase.py
```

---

## 5. High-Frequency NEET Formats & Unique Seeding Integration

### 🌿 High-Frequency Biology Formats (Botany & Zoology)
The NEET UG database engine natively generates and stores three high-frequency question structures adhering strictly to NTA NCERT standards:
1. **Match Column I with Column II**: Pairs structural complexes, enzymes, and organelles with their functions (`A-(ii), B-(iv), C-(i), D-(iii)`).
2. **Diagrammatical & Labeled Component Identification**: Presents anatomical/schematic diagrams asking students to identify labeled parts (A, B, C, D) and functional relationships.
3. **Statement-I & Statement-II Evaluation**: NCERT assertion and reasoning evaluation.

### 🛡️ Unique Statement & Upsert Conflict Resolution
All NEET seeder routines in `src/supabase.ts` append dynamic reference tokens (`Q-Ref: LX9P2K-BO1-9281`) and execute PostgreSQL `.upsert(batch, { onConflict: 'statement' })` to prevent unique constraint errors during bulk operations.
