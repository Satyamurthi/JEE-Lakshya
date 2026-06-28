-- ========================================================
-- SUPABASE APP UPDATE ENGINE SCHEMA FOR ANDROID APPLICATION
-- ========================================================

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

-- 4. Policy: Allow authenticated / service role to insert/update versions
CREATE POLICY "Allow admin full access to app_versions" 
ON public.app_versions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 5. Insert Initial Production Version (v1.0.0, Code 1)
INSERT INTO public.app_versions (version_code, version_name, apk_url, changelog, is_force_update)
VALUES (
    1, 
    '1.0.0', 
    'https://raw.githubusercontent.com/Satyamurthi/JEE-Lakshya/main/JEE_Lakshya_Android_Release.apk', 
    '🎉 Initial Official Production Release of NEET Lakshya & JEE Nexus Android App!', 
    false
) ON CONFLICT (version_code) DO NOTHING;

-- 6. Sample Template to Push Future Updates (Run this whenever you release a new APK):
/*
INSERT INTO public.app_versions (version_code, version_name, apk_url, changelog, is_force_update)
VALUES (
    2, 
    '1.1.0', 
    'https://raw.githubusercontent.com/Satyamurthi/JEE-Lakshya/main/JEE_Lakshya_Android_Release.apk', 
    '🔥 New features added! Balanced session-wise PYQs across Physics, Chemistry, and Mathematics, enhanced full-screen CBT simulation.', 
    false
);
*/
