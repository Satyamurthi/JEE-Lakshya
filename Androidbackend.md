# 📱 Android Backend & Supabase Auto-Update Engine Guide

Welcome to the official **Android Backend Architecture** and **Supabase Over-The-Air (OTA) Auto-Update Engine** documentation for **NEET Lakshya & JEE Nexus**.

---

## 🛠️ 1. Overview of the Auto-Update Architecture

Whenever you build a new Android APK and push code updates to GitHub or Netlify, your Android app can automatically detect that a new version exists and prompt the student to install the update!

### How it works:
1. **Supabase Database (`app_versions` table)** stores the latest published version code, version name, APK download link, changelog, and force update flags.
2. **Android App Check**: Every time the Android app launches, `MainActivity.kt` performs an asynchronous background HTTP query to Supabase.
3. **Automatic Prompt**: If `remote_version_code > local_version_code`, an interactive Update Dialog pops up displaying what's new and providing a direct **"Update Now"** button.

---

## ⚡ 2. Step-by-Step Guide for Supabase SQL Setup

Execute the following SQL queries directly inside your **Supabase Dashboard -> SQL Editor**.

### Step 2.1: Create `app_versions` Table & Enable Security

```sql
-- 1. Create app_versions table
CREATE TABLE IF NOT EXISTS public.app_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_code INT NOT NULL UNIQUE,
    version_name VARCHAR(50) NOT NULL,
    apk_url TEXT NOT NULL,
    changelog TEXT DEFAULT 'Performance improvements and bug fixes.',
    is_force_update BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow everyone (anonymous students) to read latest app versions
CREATE POLICY "Allow public read access to app_versions" 
ON public.app_versions 
FOR SELECT 
USING (true);

-- 4. Policy: Allow admin full access to app_versions
CREATE POLICY "Allow admin full access to app_versions" 
ON public.app_versions 
FOR ALL 
USING (true)
WITH CHECK (true);
```

---

## 🚀 3. How to Push a New App Update (SQL Commands)

Whenever you compile a new APK and want all Android users to automatically receive an update prompt, run an `INSERT` SQL query in Supabase!

### Initial Release (v1.0.0, Code 1):
```sql
INSERT INTO public.app_versions (version_code, version_name, apk_url, changelog, is_force_update)
VALUES (
    1, 
    '1.0.0', 
    'https://raw.githubusercontent.com/Satyamurthi/JEE-Lakshya/main/JEE_Lakshya_Android_Release.apk', 
    '🎉 Initial Official Production Release of NEET Lakshya & JEE Nexus Android App!', 
    false
) ON CONFLICT (version_code) DO NOTHING;
```

### Future Update Template (e.g., v1.1.0, Code 2):
```sql
INSERT INTO public.app_versions (version_code, version_name, apk_url, changelog, is_force_update)
VALUES (
    2, 
    '1.1.0', 
    'https://raw.githubusercontent.com/Satyamurthi/JEE-Lakshya/main/JEE_Lakshya_Android_Release.apk', 
    '🔥 New features added! Balanced session-wise PYQs across Physics, Chemistry, and Mathematics, enhanced full-screen CBT simulation.', 
    false
);
```

> [!TIP]
> Setting `is_force_update` to `true` will prevent users from dismissing the dialog until they update the application!

---

## 🔍 4. SQL Commands to Query & Manage Updates

### View Current Published Version:
```sql
SELECT * FROM public.app_versions ORDER BY version_code DESC LIMIT 1;
```

### Delete or Modify a Version Record:
```sql
DELETE FROM public.app_versions WHERE version_code = 2;
```

---

## 📱 5. Native Android Integration Details

- **File**: `Android/app/src/main/java/com/neetlakshya/app/MainActivity.kt`
- **Native Helper**: `checkForAppUpdates(baseUrl, apiKey)`
- **Resource Credentials**: Configured in `Android/app/src/main/res/values/env_config.xml`
