import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('subject, type');

    if (error) {
      throw error;
    }

    console.log('Total questions in Supabase:', questions.length);

    const breakdown = {};
    for (const q of questions) {
      const key = `${q.subject} - ${q.type}`;
      breakdown[key] = (breakdown[key] || 0) + 1;
    }

    console.log('Breakdown:', breakdown);
  } catch (err) {
    console.error('Error fetching from Supabase:', err);
  }
}

run();
