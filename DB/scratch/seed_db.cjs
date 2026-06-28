const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually from .env in the same directory
const dotenvContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const env = {};
dotenvContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env file.");
  process.exit(1);
}

// Create the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

function parseSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const lines = sql.split('\n');
  const questions = [];

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('(gen_random_uuid(),') || line.startsWith('(uuid_generate_v4(),')) {
      let content = line;
      if (content.endsWith(',')) content = content.substring(0, content.length - 1);
      if (content.endsWith(';')) content = content.substring(0, content.length - 1);
      if (content.endsWith(')')) content = content.substring(0, content.length - 1);
      
      const prefixIndex = content.indexOf("'");
      if (prefixIndex === -1) continue;
      content = content.substring(prefixIndex);

      const rowValues = [];
      let i = 0;
      while (i < content.length) {
        while (i < content.length && (content[i] === ' ' || content[i] === '\t' || content[i] === ',')) {
          i++;
        }
        if (i >= content.length) break;

        if (content[i] === "'") {
          i++; // Skip opening quote
          let str = '';
          while (i < content.length) {
            if (content[i] === "'" && content[i + 1] === "'") {
              str += "'";
              i += 2;
            } else if (content[i] === "'") {
              i++;
              break;
            } else {
              str += content[i];
              i++;
            }
          }

          // Skip optional type cast like ::jsonb
          if (content[i] === ':' && content[i + 1] === ':') {
            while (i < content.length && content[i] !== ',' && content[i] !== ' ' && content[i] !== '\t') {
              i++;
            }
          }

          rowValues.push(str);
        } else {
          // Unquoted value
          let val = '';
          while (i < content.length && content[i] !== ',') {
            val += content[i];
            i++;
          }
          rowValues.push(val.trim() === 'NULL' ? null : val.trim());
        }
      }

      if (rowValues.length >= 10) {
        let options = {};
        try {
          options = JSON.parse(rowValues[5]);
        } catch (e) {
          options = {};
        }

        let markingScheme = { positive: 4, negative: 1 };
        try {
          markingScheme = JSON.parse(rowValues[9]);
        } catch (e) {
          // Default
        }

        questions.push({
          subject: rowValues[0],
          chapter: rowValues[1],
          type: rowValues[2],
          difficulty: rowValues[3],
          statement: rowValues[4],
          options: options,
          correctAnswer: rowValues[6],
          solution: rowValues[7],
          explanation: rowValues[7],
          concept: rowValues[8],
          markingScheme: markingScheme
        });
      }
    }
  }

  return questions;
}

const sqlFilePath = path.join(__dirname, 'scratch/seed_thousands_questions.sql');
console.log(`Parsing SQL file: ${sqlFilePath}`);
const questions = parseSqlFile(sqlFilePath);
console.log(`Parsed ${questions.length} questions from SQL file.`);

if (questions.length === 0) {
  console.log("No questions parsed. Check format of seed_thousands_questions.sql");
  process.exit(1);
}

// Function to upload questions in batches to avoid payload limits
async function seedDatabase() {
  const batchSize = 100;
  console.log(`Starting seeding in batches of ${batchSize}...`);
  
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    
    // We insert questions directly
    const { data, error } = await supabase
      .from('questions')
      .insert(batch);
      
    if (error) {
      console.error(`Error inserting batch starting at index ${i}:`, error.message);
    } else {
      console.log(`Successfully seeded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(questions.length / batchSize)}`);
    }
  }
  
  console.log("Seeding process completed!");
}

seedDatabase();
