import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load environment variables manually from .env
const envPath = resolve('.env');
let apiUrl = 'http://localhost/api';
let geminiApiKey = process.env.GEMINI_API_KEY;

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    
    if (key === 'VITE_API_URL') apiUrl = val;
    if (key === 'GEMINI_API_KEY') geminiApiKey = val;
  });
}

async function callLocalDB(action, table, payload = null, filters = []) {
  const activeStream = 'JEE Main & Advanced';
  const response = await fetch(`${apiUrl}/local_db.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Active-Stream': activeStream
    },
    body: JSON.stringify({
      table,
      action,
      payload,
      filters
    })
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

// Configuration options
const CONFIG = {
  subject: 'Physics', // Physics, Chemistry, Mathematics
  chapter: 'Kinematics', 
  difficulty: 'Hard', // Easy, Medium, Hard
  type: 'MCQ', // MCQ, Numerical
  count: 10, // Number of questions to generate in this run
  outputFile: 'local_generated_questions.json',
  apiProvider: 'gemini', // gemini, nvidia
  nvidiaModel: 'z-ai/glm-5.2' // z-ai/glm-5.2, google/gemma-4-31b-it
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getSystemInstruction() {
  return `You are a JEE Main & Advanced subject expert.
Generate exactly 1 high-difficulty question for ${CONFIG.subject}, chapter "${CONFIG.chapter}".
The difficulty level must be ${CONFIG.difficulty}.
The question type must be ${CONFIG.type}.

${CONFIG.type === 'MCQ' ? `
It must be a multiple choice question with 4 options (A, B, C, D).
Your response must be a JSON object matching this exact format:
{
  "subject": "${CONFIG.subject}",
  "chapter": "${CONFIG.chapter}",
  "type": "MCQ",
  "difficulty": "${CONFIG.difficulty}",
  "statement": "[Full question statement here. Use LaTeX for math, enclose inline formulas in $ and display block formulas in $$]",
  "options": {
    "A": "[Option A text]",
    "B": "[Option B text]",
    "C": "[Option C text]",
    "D": "[Option D text]"
  },
  "correctAnswer": "[A, B, C, or D]",
  "solution": "[Detailed step-by-step mathematical explanation using LaTeX]",
  "explanation": "[Short explanation summary]",
  "concept": "[Core Physics/Chemistry/Math concept tested]"
}` : `
It must be a Numerical Value Question (NAT) where the answer is an integer or decimal value.
Your response must be a JSON object matching this exact format:
{
  "subject": "${CONFIG.subject}",
  "chapter": "${CONFIG.chapter}",
  "type": "Numerical",
  "difficulty": "${CONFIG.difficulty}",
  "statement": "[Full question statement here. Clearly state rounding rules if any. Use LaTeX for math, enclose formulas in $]",
  "options": {},
  "correctAnswer": "[Correct numerical value as a string, e.g. '15' or '0.5']",
  "solution": "[Detailed step-by-step mathematical calculation using LaTeX]",
  "explanation": "[Short explanation summary]",
  "concept": "[Core Physics/Chemistry/Math concept tested]"
}`}

Respond ONLY with the JSON object. Do not include markdown code block tags (\`\`\`json) or any conversational text.`;
}

async function callGemini(prompt, systemInstruction) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemInstruction}\n\nUser request: ${prompt}` }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function callNvidia(prompt, systemInstruction) {
  // Direct NVIDIA NIM fetch call
  const url = 'https://integrate.api.nvidia.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${geminiApiKey}`, // Assumes NVIDIA key is stored in GEMINI_API_KEY for simplicity in script
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      model: CONFIG.nvidiaModel,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4096,
      temperature: 1.0,
      top_p: 1.0,
      stream: false,
      chat_template_kwargs: { enable_thinking: false }
    })
  });

  if (!response.ok) {
    throw new Error(`NVIDIA NIM Error (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

async function run() {
  console.log(`=== Starting Local Question Generator ===`);
  console.log(`Subject: ${CONFIG.subject}`);
  console.log(`Chapter: ${CONFIG.chapter}`);
  console.log(`Difficulty: ${CONFIG.difficulty}`);
  console.log(`Type: ${CONFIG.type}`);
  console.log(`Target Count: ${CONFIG.count}`);
  console.log(`Output File: ${CONFIG.outputFile}`);
  console.log(`-----------------------------------------`);

  if (!geminiApiKey) {
    console.error('Error: GEMINI_API_KEY is not defined in your .env file.');
    process.exit(1);
  }

  // Load existing local file archive
  let archive = [];
  if (existsSync(CONFIG.outputFile)) {
    try {
      archive = JSON.parse(readFileSync(CONFIG.outputFile, 'utf8'));
      console.log(`Loaded ${archive.length} existing questions from local archive.`);
    } catch {
      console.warn(`Local archive file was invalid. Overwriting...`);
    }
  }

  let successCount = 0;
  for (let i = 1; i <= CONFIG.count; i++) {
    console.log(`[Generation ${i}/${CONFIG.count}] Generating question...`);
    
    try {
      const prompt = `Generate 1 unique high-difficulty JEE question for ${CONFIG.subject} chapter ${CONFIG.chapter}.`;
      const systemInstruction = getSystemInstruction();
      
      let rawText = '';
      if (CONFIG.apiProvider === 'nvidia') {
        rawText = await callNvidia(prompt, systemInstruction);
      } else {
        rawText = await callGemini(prompt, systemInstruction);
      }

      // Parse JSON response
      const question = JSON.parse(rawText.trim());
      
      // Add marking scheme
      question.markingScheme = {
        positive: 4,
        negative: CONFIG.type === 'MCQ' ? 1 : 0
      };

      archive.push(question);
      writeFileSync(CONFIG.outputFile, JSON.stringify(archive, null, 2), 'utf8');
      
      successCount++;
      console.log(`[Success] Question ${i} generated and appended to ${CONFIG.outputFile}.`);
    } catch (err) {
      console.error(`[Error] Failed generating question ${i}:`, err.message);
    }

    // Rate-limiting delay (4 seconds for Gemini, 3 seconds for NVIDIA)
    const delayTime = CONFIG.apiProvider === 'nvidia' ? 4500 : 4000;
    await delay(delayTime);
  }

  console.log(`\n=== Local Generation Summary ===`);
  console.log(`Successfully generated: ${successCount}/${CONFIG.count} questions.`);
  console.log(`Total questions in local archive: ${archive.length}`);

  // Optional: Upload archive to Local DB
  console.log('\nDo you want to upload local questions to Local DB? (To run upload, call "node scripts/local_question_generator.js upload")');
}

async function uploadToLocalDB() {
  console.log(`=== Uploading Local Archive to Local DB ===`);

  if (!existsSync(CONFIG.outputFile)) {
    console.error(`Error: Local archive file ${CONFIG.outputFile} does not exist.`);
    process.exit(1);
  }

  const archive = JSON.parse(readFileSync(CONFIG.outputFile, 'utf8'));
  console.log(`Found ${archive.length} questions in local archive to upload.`);

  const batchSize = 100;
  let successCount = 0;

  for (let i = 0; i < archive.length; i += batchSize) {
    const batch = archive.slice(i, i + batchSize);
    console.log(`Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(archive.length / batchSize)}...`);
    
    const result = await callLocalDB('upsert', 'questions', batch);
    const error = result.error;
    if (error) {
      console.error(`Failed to upload batch. Error:`, error.message || JSON.stringify(error));
      // Sequentially insert fallback
      for (const item of batch) {
        const singleResult = await callLocalDB('insert', 'questions', [item]);
        const singleErr = singleResult.error;
        if (!singleErr) {
          successCount++;
        }
      }
    } else {
      successCount += batch.length;
    }
  }

  console.log(`\n🎉 Upload Complete! Uploaded ${successCount}/${archive.length} questions successfully.`);
}

// Parse CLI command
const args = process.argv.slice(2);
if (args[0] === 'upload') {
  uploadToLocalDB();
} else {
  run();
}
