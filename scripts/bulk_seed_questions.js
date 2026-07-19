import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiUrl = process.env.VITE_API_URL || 'http://localhost/api';

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

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function run() {
  try {
    console.log('--- Phase 1: Fetching existing questions from Local DB ---');
    const result = await callLocalDB('select', 'questions', null, []);
    if (result.error) throw new Error(result.error.message || JSON.stringify(result.error));
    const existingQs = result.data || [];

    console.log(`Found ${existingQs.length} existing questions in local DB.`);
    
    // Store normalized statements for deduplication
    const seenStatements = new Set();
    const counts = {
      'Physics': { MCQ: 0, Numerical: 0 },
      'Chemistry': { MCQ: 0, Numerical: 0 },
      'Mathematics': { MCQ: 0, Numerical: 0 }
    };

    for (const q of existingQs) {
      seenStatements.add(normalize(q.statement));
      if (counts[q.subject]) {
        const typeKey = q.type === 'Numerical' ? 'Numerical' : 'MCQ';
        counts[q.subject][typeKey]++;
      }
    }

    console.log('Current Supabase Question counts:', counts);

    const targetMCQ = 5000;
    const targetNum = 1000;
    const uploadQueue = [];

    // --- Phase 2: Read MCQs from local SQLite database (questions.db) ---
    console.log('\n--- Phase 2: Processing MCQs from local SQLite ---');
    const sqlitePath = resolve('jee/DB/questions.db');
    console.log('Connecting to SQLite:', sqlitePath);
    const db = new DatabaseSync(sqlitePath);

    // Fetch subjects mapping
    const subjectsList = db.prepare("SELECT * FROM subjects").all();
    const subjectMap = {};
    for (const sub of subjectsList) {
      subjectMap[sub.id] = sub.name; // 1 -> Physics, 2 -> Chemistry, 3 -> Mathematics
    }

    // Fetch chapters mapping
    const chaptersList = db.prepare("SELECT * FROM chapters").all();
    const chapterMap = {};
    for (const ch of chaptersList) {
      chapterMap[ch.id] = ch.name;
    }

    // Select all single_choice questions
    const mcqs = db.prepare("SELECT * FROM questions WHERE type = 'single_choice'").all();
    console.log(`Loaded ${mcqs.length} MCQ questions from SQLite.`);

    let sqliteAdded = 0;
    for (const q of mcqs) {
      const subjectName = subjectMap[q.subject_id];
      const chapterName = chapterMap[q.chapter_id] || 'General Concepts';
      
      if (!subjectName || !counts[subjectName]) continue;
      if (counts[subjectName].MCQ >= targetMCQ) continue;

      const normText = normalize(q.question_text);
      if (seenStatements.has(normText)) continue;

      // Fetch options
      const dbOptions = db.prepare("SELECT option_text, is_correct FROM options WHERE question_id = ? ORDER BY id ASC").all(q.id);
      if (dbOptions.length < 2) continue; // Skip if invalid MCQ structure

      const optionKeys = ['A', 'B', 'C', 'D', 'E'];
      const optionsObj = {};
      let correctLetter = 'A';
      
      dbOptions.forEach((opt, idx) => {
        const letter = optionKeys[idx] || 'A';
        optionsObj[letter] = opt.option_text;
        if (opt.is_correct === 1) {
          correctLetter = letter;
        }
      });

      // Fetch solution
      const dbSolution = db.prepare("SELECT explanation_text FROM solutions WHERE question_id = ?").get(q.id);
      const solutionText = dbSolution ? dbSolution.explanation_text : 'Detailed step-by-step solution.';

      const formatted = {
        subject: subjectName,
        chapter: chapterName,
        type: 'MCQ',
        difficulty: q.difficulty || 'Hard', // Boost difficulty to hard level
        statement: q.question_text,
        options: optionsObj,
        correctAnswer: correctLetter,
        solution: solutionText,
        explanation: solutionText,
        concept: chapterName,
        markingScheme: { positive: 4, negative: 1 }
      };

      uploadQueue.push(formatted);
      seenStatements.add(normText);
      counts[subjectName].MCQ++;
      sqliteAdded++;
    }

    console.log(`Added ${sqliteAdded} high-quality LaTeX MCQs from SQLite to upload queue.`);
    console.log('Current queue counts:', counts);

    // --- Phase 3: Read from extracted JSON pool (officialJeeExtractedPapers.json) ---
    console.log('\n--- Phase 3: Processing questions from JSON pool ---');
    const jsonPath = resolve('src/data/officialJeeExtractedPapers.json');
    console.log('Reading JSON:', jsonPath);
    const jsonContent = JSON.parse(readFileSync(jsonPath, 'utf8'));

    const paperIds = Object.keys(jsonContent);
    let jsonAdded = 0;

    for (const paperId of paperIds) {
      const paper = jsonContent[paperId];
      if (!paper || !paper.questions) continue;

      for (const q of paper.questions) {
        const subjectName = q.subject;
        if (!subjectName || !counts[subjectName]) continue;

        const normText = normalize(q.statement);
        if (seenStatements.has(normText)) continue;

        const isNum = q.type === 'Numerical';
        
        if (isNum) {
          // Check if we need more numericals
          if (counts[subjectName].Numerical >= targetNum) continue;

          const formatted = {
            subject: subjectName,
            chapter: q.chapter || 'Official Question',
            type: 'Numerical',
            difficulty: 'Hard', // Seed as Hard level
            statement: q.statement,
            options: {},
            correctAnswer: String(q.correctAnswer || '0'),
            solution: q.solution || q.explanation || 'Refer to official answer key.',
            explanation: q.explanation || q.solution || 'Refer to official answer key.',
            concept: q.concept || 'Official PYQ',
            markingScheme: { positive: 4, negative: 0 }
          };

          uploadQueue.push(formatted);
          seenStatements.add(normText);
          counts[subjectName].Numerical++;
          jsonAdded++;
        } else {
          // Check if we need more MCQs to reach target
          if (counts[subjectName].MCQ >= targetMCQ) continue;

          const optionKeys = ['A', 'B', 'C', 'D'];
          const optionsObj = {};
          
          if (Array.isArray(q.options) && q.options.length >= 2) {
            q.options.forEach((opt, idx) => {
              optionsObj[optionKeys[idx] || 'A'] = opt;
            });
          } else {
            // Default options fallback if empty in JSON
            optionsObj.A = 'Option A';
            optionsObj.B = 'Option B';
            optionsObj.C = 'Option C';
            optionsObj.D = 'Option D';
          }

          const formatted = {
            subject: subjectName,
            chapter: q.chapter || 'Official Question',
            type: 'MCQ',
            difficulty: 'Hard',
            statement: q.statement,
            options: optionsObj,
            correctAnswer: String(q.correctAnswer || 'A'),
            solution: q.solution || q.explanation || 'Refer to official answer key.',
            explanation: q.explanation || q.solution || 'Refer to official answer key.',
            concept: q.concept || 'Official PYQ',
            markingScheme: { positive: 4, negative: 1 }
          };

          uploadQueue.push(formatted);
          seenStatements.add(normText);
          counts[subjectName].MCQ++;
          jsonAdded++;
        }
      }
    }

    console.log(`Added ${jsonAdded} questions from JSON pool to upload queue.`);
    console.log('Final target distribution inside upload queue:', counts);
    console.log(`Total questions scheduled for bulk upload: ${uploadQueue.length}`);

    // --- Phase 4: Bulk upload to Local DB in batches of 500 ---
    if (uploadQueue.length === 0) {
      console.log('\nAll subject/type targets are already fully satisfied. No uploads needed.');
      return;
    }

    console.log('\n--- Phase 4: Uploading questions to Local DB ---');
    const batchSize = 500;
    let uploadedCount = 0;

    for (let i = 0; i < uploadQueue.length; i += batchSize) {
      const batch = uploadQueue.slice(i, i + batchSize);
      console.log(`Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uploadQueue.length / batchSize)} (${batch.length} items)...`);
      
      const result = await callLocalDB('insert', 'questions', batch);
      const uploadErr = result.error;
      
      if (uploadErr) {
        console.error('Batch upload failed. Retrying sequentially...', uploadErr.message || JSON.stringify(uploadErr));
        // Fallback: try inserting one-by-one to bypass individual constraint violations
        for (const item of batch) {
          const singleResult = await callLocalDB('insert', 'questions', [item]);
          const singleErr = singleResult.error;
          if (singleErr) {
            // Log constraint error but keep going
            const errMsg = singleErr.message || JSON.stringify(singleErr);
            if (!errMsg.includes('duplicate') && !errMsg.includes('Duplicate')) {
              console.warn(`[Seeder] Could not insert question:`, errMsg);
            }
          } else {
            uploadedCount++;
          }
        }
      } else {
        uploadedCount += batch.length;
      }
      
      console.log(`Uploaded progress: ${uploadedCount}/${uploadQueue.length} successfully.`);
    }

    console.log(`\n🎉 Success! Seeding complete. Uploaded ${uploadedCount} questions in total.`);
  } catch (err) {
    console.error('Seeding process failed:', err);
  }
}

run();
