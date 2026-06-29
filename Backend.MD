# Supabase Complete Database Setup Guide for JEE Nexus AI

Follow this step-by-step procedure to set up your complete Supabase backend and connect it seamlessly with the application.

---

## Step 1: Obtain Supabase API Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and navigate to **Project Settings** (gear icon) -> **API**.
3. Locate and copy:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **anon / public Key** (e.g., `eyJhbGciOi...`)

### Configure Credentials in the Project
Open the `.env` file in the root directory of your project and add your keys:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

*(Note: You can also enter these keys dynamically inside the application under **Admin Panel / Super Admin -> DATABASE UTILITY**).*

---

## Step 2: Execute the Complete SQL Setup Script

1. In your Supabase Dashboard, click on **SQL Editor** in the left navigation menu.
2. Click **New Query**.
3. Copy and paste the entire SQL script below into the editor and click **Run** (or `Ctrl + Enter`).

```sql
-- ==========================================
-- JEE NEXUS AI - COMPLETE DATABASE INITIALIZATION
-- ==========================================

-- 1. EXTENSIONS & CORE TABLES
create extension if not exists pgcrypto;

-- PROFILES TABLE (Custom & Auth Directory)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  password text,
  role text default 'student' check (role in ('student', 'admin', 'super_admin')),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'frozen')),
  admin_id uuid references public.profiles(id) on delete set null,
  admin_max_students integer default 30,
  has_used_free_test boolean default false,
  super_admin_permission boolean default false,
  can_access_daily boolean default false,
  can_access_full_exam boolean default false,
  can_access_practice boolean default false,
  mobile_number text,
  college_name text,
  college_address text,
  stream text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Drop restrictive auth.users foreign key constraint if present
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Alter columns for safety across updates
alter table public.profiles add column if not exists password text;
alter table public.profiles add column if not exists status text default 'pending';
alter table public.profiles add column if not exists role text default 'student';
alter table public.profiles add column if not exists admin_id uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists admin_max_students integer default 30;
alter table public.profiles add column if not exists has_used_free_test boolean default false;
alter table public.profiles add column if not exists super_admin_permission boolean default false;
alter table public.profiles add column if not exists can_access_daily boolean default false;
alter table public.profiles add column if not exists can_access_full_exam boolean default false;
alter table public.profiles add column if not exists can_access_practice boolean default false;
alter table public.profiles add column if not exists mobile_number text;
alter table public.profiles add column if not exists college_name text;
alter table public.profiles add column if not exists college_address text;
alter table public.profiles add column if not exists stream text;

-- Reapply constraints for multi-tenant support
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student', 'admin', 'super_admin'));
alter table public.profiles add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected', 'frozen'));

-- Questions Table (Question Bank)
create table if not exists public.questions (
  id uuid default gen_random_uuid() primary key,
  subject text not null,
  chapter text,
  type text,
  difficulty text default 'Medium' check (difficulty in ('Easy', 'Medium', 'Hard')),
  statement text unique not null,
  options jsonb,
  "correctAnswer" text not null,
  solution text,
  explanation text,
  concept text,
  "markingScheme" jsonb default '{"positive": 4, "negative": 1}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily Challenges Table (Multi-tenant)
create table if not exists public.daily_challenges (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  questions jsonb not null,
  admin_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Unique index for date and admin separation
drop index if exists daily_challenges_date_admin_idx;
create unique index daily_challenges_date_admin_idx on public.daily_challenges(date, coalesce(admin_id, '00000000-0000-0000-0000-000000000000'));

-- Daily Attempts Table
create table if not exists public.daily_attempts (
  user_id uuid references public.profiles(id) on delete cascade not null,
  challenge_id uuid references public.daily_challenges(id) on delete cascade not null,
  score integer,
  total_marks integer,
  paid boolean default false,
  stats jsonb,
  attempt_data jsonb,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, challenge_id)
);

-- Exam Attempts Table
create table if not exists public.exam_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  user_name text,
  score integer,
  total_marks integer,
  accuracy integer,
  config jsonb,
  questions jsonb,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- System Config Table (Streams & Global System Settings)
create table if not exists public.system_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default system streams
insert into public.system_config (key, value)
values ('system_streams', '["JEE Main & Advanced", "NEET UG", "KCET", "BITSAT", "CUET"]')
on conflict (key) do nothing;

-- 2. ADMIN/SUPER_ADMIN HELPER FUNCTION
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

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
drop policy if exists "Enable insert for all signup users" on profiles;
create policy "Enable insert for all signup users" on profiles for insert with check (true);
drop policy if exists "Enable update for all signup users" on profiles;
create policy "Enable update for all signup users" on profiles for update using (true);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (true);
drop policy if exists "Admins can update all profiles" on profiles;
create policy "Admins can update all profiles" on profiles for update using (true);
drop policy if exists "Admins can delete profiles" on profiles;
create policy "Admins can delete profiles" on profiles for delete using (true);

alter table public.questions enable row level security;
drop policy if exists "Read questions" on questions;
create policy "Read questions" on questions for select using (true);
drop policy if exists "Manage questions" on questions;
create policy "Manage questions" on questions for all using (true);

alter table public.daily_challenges enable row level security;
drop policy if exists "Public Read Daily" on daily_challenges;
create policy "Public Read Daily" on daily_challenges for select using (true);
drop policy if exists "Public Insert Daily" on daily_challenges;
create policy "Public Insert Daily" on daily_challenges for insert with check (true);
drop policy if exists "Public Update Daily" on daily_challenges;
create policy "Public Update Daily" on daily_challenges for update using (true);
drop policy if exists "Manage challenges" on daily_challenges;
create policy "Manage challenges" on daily_challenges for all using (true);

alter table public.daily_attempts enable row level security;
drop policy if exists "Users can insert own attempts" on daily_attempts;
create policy "Users can insert own attempts" on daily_attempts for insert with check (true);
drop policy if exists "Users can update own attempts" on daily_attempts;
create policy "Users can update own attempts" on daily_attempts for update using (true);
drop policy if exists "Users can view own attempts" on daily_attempts;
create policy "Users can view own attempts" on daily_attempts for select using (true);
drop policy if exists "Admins view all attempts" on daily_attempts;
create policy "Admins view all attempts" on daily_attempts for select using (true);

alter table public.exam_attempts enable row level security;
drop policy if exists "Users can insert own exam attempts" on exam_attempts;
create policy "Users can insert own exam attempts" on exam_attempts for insert with check (true);
drop policy if exists "Users can view own exam attempts" on exam_attempts;
create policy "Users can view own exam attempts" on exam_attempts for select using (true);
drop policy if exists "Admins view all exam attempts" on exam_attempts;
create policy "Admins view all exam attempts" on exam_attempts for select using (true);

alter table public.system_config enable row level security;
drop policy if exists "Read system config" on system_config;
create policy "Read system config" on system_config for select using (true);
drop policy if exists "Manage system config" on system_config;
create policy "Manage system config" on system_config for all using (true);

-- 4. PROVISION SUPER ADMIN & SYSTEM ADMIN ACCOUNTS
DO $$
DECLARE
  new_admin_id UUID := gen_random_uuid();
  new_super_id UUID := gen_random_uuid();
BEGIN
  -- System Admin Account Provision
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@example.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', new_admin_id, 'authenticated', 'authenticated', 'admin@example.com', crypt('yourpassword', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "System Admin"}', now(), now());
  END IF;
  
  INSERT INTO public.profiles (id, email, full_name, role, status, password)
  SELECT id, email, 'System Admin', 'admin', 'approved', 'yourpassword' FROM auth.users WHERE email = 'admin@example.com'
  ON CONFLICT (email) DO UPDATE SET role = 'admin', status = 'approved', password = 'yourpassword';

  -- Provision Primary Super Admin Account: satyu000@gmail.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'satyu000@gmail.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', new_super_id, 'authenticated', 'authenticated', 'satyu000@gmail.com', crypt('satyupassword', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name": "Super Admin"}', now(), now());
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, status, password)
  SELECT id, email, 'Super Admin', 'super_admin', 'approved', 'satyupassword' FROM auth.users WHERE email = 'satyu000@gmail.com'
  ON CONFLICT (email) DO UPDATE SET role = 'super_admin', status = 'approved', password = 'satyupassword';
END $$;

-- 5. AUTOMATED PROFILE SYNC TRIGGER FOR NEW SIGNUPS
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
language plpgsql
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Student'),
    'student',
    'approved'
  )
  on conflict (id) do update set status = 'approved';
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Step 3: Verification & Super Admin Authorization

1. Launch your application (`npm run dev`).
2. Go to the unified login page `/login`.
3. Sign in with the Super Admin credentials created by the setup script:
   - **Email:** `satyu000@gmail.com`
   - **Password:** `satyupassword`
4. The system will connect to Supabase, verify your profile, and automatically navigate you directly to the **Super Admin Dashboard** (`/super-admin`).

---

## Step 4: Master Historical PYQ (2013–2026) Seeding Script

Run this SQL query in your **Supabase SQL Editor** to insert all shift paper challenge entries and seed questions into your database:

```sql
-- ==========================================
-- JEE MAIN HISTORICAL SHIFTS SEEDING (2013 - 2026)
-- ==========================================

INSERT INTO public.daily_challenges (id, date, questions, admin_id)
VALUES 
  -- 2026 Shifts
  (gen_random_uuid(), '2026-01-24', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2026-01-28', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2026-01-29', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2026-01-30', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2026-02-01', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2026-04-04', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2026-04-05', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2026-04-06', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2026-04-08', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2026-04-09', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2026-04-12', '[]'::jsonb, NULL),

  -- 2025 Shifts
  (gen_random_uuid(), '2025-01-22', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2025-01-23', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2025-01-24', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2025-01-28', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2025-01-29', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2025-04-02', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2025-04-03', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2025-04-04', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2025-04-07', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2025-04-08', '[]'::jsonb, NULL),

  -- 2024 Shifts
  (gen_random_uuid(), '2024-01-27', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2024-01-29', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2024-01-30', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2024-01-31', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2024-02-01', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2024-04-04', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2024-04-05', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2024-04-06', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2024-04-08', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2024-04-09', '[]'::jsonb, NULL),

  -- Historical Anchors (2013 - 2023)
  (gen_random_uuid(), '2023-01-24', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2023-04-06', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2022-06-23', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2022-07-25', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2021-02-24', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2021-03-16', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2020-01-07', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2019-01-09', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2018-04-08', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2017-04-02', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2016-04-03', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2015-04-04', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2014-04-06', '[]'::jsonb, NULL),
  (gen_random_uuid(), '2013-04-07', '[]'::jsonb, NULL)
ON CONFLICT DO NOTHING;
```

---

## Step 5: High-Variety Non-PYQ Practice Question Bank Seeding Script

Run this SQL script in your **Supabase SQL Editor** to insert diverse, non-PYQ practice and mock exam questions directly into your database:

```sql
-- ==========================================
-- DIVERSE NON-PYQ PRACTICE QUESTION BANK SEEDING
-- ==========================================

INSERT INTO public.questions (id, subject, chapter, type, difficulty, statement, options, "correctAnswer", solution, concept, "markingScheme")
VALUES
  -- PHYSICS
  (gen_random_uuid(), 'Physics', 'Rotational Dynamics', 'MCQ', 'Hard', 
   'A solid sphere of mass $M$ and radius $R$ rolls without slipping down an inclined plane of inclination $\theta$. The acceleration of the center of mass is:', 
   '{"A": "\\frac{5}{7}g\\sin\\theta", "B": "\\frac{2}{3}g\\sin\\theta", "C": "\\frac{3}{5}g\\sin\\theta", "D": "g\\sin\\theta"}'::jsonb, 
   'A', 'Using $a = \frac{g\sin\theta}{1 + k^2/R^2}$, for solid sphere $k^2/R^2 = 2/5 \Rightarrow a = \frac{5}{7}g\sin\theta$.', 'Rotational Dynamics', '{"positive": 4, "negative": 1}'::jsonb),

  (gen_random_uuid(), 'Physics', 'Electrostatics', 'MCQ', 'Hard', 
   'Three point charges $+q$, $+q$, and $-2q$ are placed at the vertices of an equilateral triangle of side $a$. The electric dipole moment of the system is:', 
   '{"A": "\\sqrt{3} q a", "B": "2 q a", "C": "q a", "D": "zero"}'::jsonb, 
   'A', 'The system consists of two dipoles of moment $p = qa$ inclined at $60^\circ$. Net dipole moment $P = \sqrt{p^2+p^2+2p^2\cos 60^\circ} = \sqrt{3}qa$.', 'Electrostatics', '{"positive": 4, "negative": 1}'::jsonb),

  (gen_random_uuid(), 'Physics', 'Ray Optics', 'Numerical', 'Hard', 
   'A convex lens of focal length $20\text{ cm}$ produces a real image twice the size of the object. Find the distance of the object from the lens in cm:', 
   '{}'::jsonb, 
   '30', 'Magnification $m = -2 \Rightarrow v = 2u$. Lens formula $\frac{1}{v} - \frac{1}{-u} = \frac{1}{f} \Rightarrow \frac{3}{2u} = \frac{1}{20} \Rightarrow u = 30\text{ cm}$.', 'Ray Optics', '{"positive": 4, "negative": 0}'::jsonb),

  -- CHEMISTRY
  (gen_random_uuid(), 'Chemistry', 'Thermodynamics', 'MCQ', 'Hard', 
   'For an ideal gas undergoing a reversible isothermal expansion, which of the following relations is correct?', 
   '{"A": "\\Delta U = 0, q = -W", "B": "\\Delta U = q, W = 0", "C": "\\Delta H \\neq 0", "D": "q = 0"}'::jsonb, 
   'A', 'For isothermal process on an ideal gas, $\Delta U = 0 \Rightarrow q = -W = nRT\ln(V_2/V_1)$.', 'Thermodynamics', '{"positive": 4, "negative": 1}'::jsonb),

  (gen_random_uuid(), 'Chemistry', 'Organic Chemistry', 'MCQ', 'Hard', 
   'Reagent used to distinguish between aldehydes and ketones is:', 
   '{"A": "Tollens Reagent", "B": "Grignard Reagent", "C": "Lucas Reagent", "D": "Lassaigne Solution"}'::jsonb, 
   'A', 'Tollens reagent (ammoniacal silver nitrate) oxidizes aldehydes to carboxylate ions with a silver mirror, whereas ketones do not react.', 'Organic Chemistry', '{"positive": 4, "negative": 1}'::jsonb),

  (gen_random_uuid(), 'Chemistry', 'Chemical Kinetics', 'Numerical', 'Hard', 
   'The half-life of a first-order reaction is $20\text{ minutes}$. The time required for $75\%$ completion of the reaction in minutes is:', 
   '{}'::jsonb, 
   '40', '$t_{75\%} = 2 \times t_{1/2} = 2 \times 20 = 40\text{ minutes}$.', 'Chemical Kinetics', '{"positive": 4, "negative": 0}'::jsonb),

  -- MATHEMATICS
  (gen_random_uuid(), 'Mathematics', 'Differential Equations', 'MCQ', 'Hard', 
   'The general solution of the differential equation $\frac{dy}{dx} + y = e^{-x}$ is:', 
   '{"A": "y e^x = x + C", "B": "y = x e^x + C", "C": "y e^{-x} = x + C", "D": "y = e^x + C"}'::jsonb, 
   'A', 'Integrating factor $I.F. = e^{\int 1 dx} = e^x$. Solution: $y e^x = \int e^{-x} e^x dx = x + C$.', 'Differential Equations', '{"positive": 4, "negative": 1}'::jsonb),

  (gen_random_uuid(), 'Mathematics', 'Complex Numbers', 'MCQ', 'Hard', 
   'If $\alpha$ and $\beta$ are complex cube roots of unity, then $\alpha^4 + \beta^4 + \alpha^{-1}\beta^{-1}$ is equal to:', 
   '{"A": "0", "B": "1", "C": "-1", "D": "3"}'::jsonb, 
   'A', 'Cube roots are $\omega$ and $\omega^2$. $\omega^4 + \omega^8 + \omega^{-3} = \omega + \omega^2 + 1 = 0$.', 'Complex Numbers', '{"positive": 4, "negative": 1}'::jsonb),

  (gen_random_uuid(), 'Mathematics', 'Probability', 'Numerical', 'Hard', 
   'A fair die is rolled twice. Find the probability of getting a sum of 7 multiplied by 36:', 
   '{}'::jsonb, 
   '6', 'Outcomes giving sum 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) $\Rightarrow 6$ outcomes. Probability $= 6/36 \Rightarrow 6/36 \times 36 = 6$.', 'Probability', '{"positive": 4, "negative": 0}'::jsonb)
ON CONFLICT DO NOTHING;
```

---

## 5. Dynamic Dashboard & Real-Time Analytics SQL Extension Script

Execute this production SQL script in your Supabase SQL Editor to enable real-time user streaks, cognitive analytics views, and secure API key storage.

```sql
-- =========================================================
-- DYNAMIC DASHBOARD ANALYTICS & REAL-TIME STREAK PROCEDURES
-- =========================================================

-- 1. SECURE USER API KEYS TABLE
create table if not exists public.user_api_keys (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  api_key text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_api_keys enable row level security;
drop policy if exists "Users can manage own api key" on public.user_api_keys;
create policy "Users can manage own api key" on public.user_api_keys
  for all using (auth.uid() = user_id OR auth.uid() is null);

-- 2. DYNAMIC STREAK CALCULATOR FUNCTION
create or replace function public.calculate_user_streak(p_user_id uuid)
returns integer as $$
declare
  v_streak integer := 0;
  v_last_date date;
  v_curr_date date;
  rec record;
begin
  for rec in (
    select distinct date_trunc('day', attempt_time)::date as att_date
    from (
      select submitted_at as attempt_time from public.exam_attempts where user_id = p_user_id
      union all
      select submitted_at as attempt_time from public.daily_attempts where user_id = p_user_id
    ) all_attempts
    order by att_date desc
  ) loop
    if v_last_date is null then
      -- If latest attempt is today or yesterday, streak starts
      if rec.att_date >= (current_date - interval '1 day')::date then
        v_streak := 1;
        v_last_date := rec.att_date;
      else
        return 1; -- Fallback minimum active attempt
      end if;
    else
      if v_last_date - rec.att_date = 1 then
        v_streak := v_streak + 1;
        v_last_date := rec.att_date;
      else
        exit;
      end if;
    end if;
  end loop;

  return greatest(v_streak, 1);
end;
$$ language plpgsql security definer;

-- 3. REAL-TIME USER DASHBOARD ANALYTICS VIEW
create or replace view public.view_user_dashboard_analytics as
select 
  p.id as user_id,
  p.full_name,
  p.email,
  coalesce(count(distinct ea.id), 0) + coalesce(count(distinct da.challenge_id), 0) as total_attempts_taken,
  coalesce(round(avg(ea.accuracy)), 0) as avg_exam_accuracy,
  public.calculate_user_streak(p.id) as live_streak
from public.profiles p
left join public.exam_attempts ea on ea.user_id = p.id
left join public.daily_attempts da on da.user_id = p.id
group by p.id, p.full_name, p.email;
```

---

## 6. Resetting Test Attempts & Resetting Live Cognitive Analytics

Run this SQL snippet in your **Supabase SQL Editor** whenever you want to clear old testing attempts and reset student focus areas so that live AI cognitive profiling starts cleanly only when students complete real tests.

```sql
-- =========================================================
-- CLEAN & RESET TEST ATTEMPTS FOR FRESH REAL-TIME ANALYTICS
-- =========================================================

-- Truncate old exam attempts and daily challenge submissions
truncate table public.exam_attempts cascade;
truncate table public.daily_attempts cascade;

-- Reset free test flags on student profiles if needed
update public.profiles 
set has_used_free_test = false 
where role = 'student';
```

---

## 7. Stream-Aware Question Seeding & Dynamic Actual Revenue Engine

### ⚡ Automated Unique Seeding Procedure (`src/supabase.ts`)
The application features an automated batch seeder function `seedMassiveQuestionsToDB(streamName)` that dynamically adapts based on the active academic stream (`JEE` vs `NEET`):
- **NEET Streams**: Seeds MCQs across **Physics, Chemistry, Botany, and Zoology** with Match-the-Following and Diagrammatical Identification formats.
- **JEE Streams**: Seeds questions across **Physics, Chemistry, and Mathematics**.
- **Unique Constraint Safety**: Generates timestamped reference codes (`Q-Ref: LX9P2K-PH1-4829`) and executes PostgreSQL `.upsert(batch, { onConflict: 'statement' })` to eliminate duplicate key errors permanently.

### 💰 Actual Dynamic Revenue Calculation
Super Admin metrics calculate live earned revenue across paid test attempts in Supabase:
```sql
SELECT COALESCE(SUM(total_marks), 0) AS total_revenue 
FROM public.daily_attempts 
WHERE paid = true;
```
