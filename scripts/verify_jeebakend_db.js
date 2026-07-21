import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

try {
  const dbPath = resolve('jee/DB/jeebakend.DB');
  console.log('Connecting to verification database:', dbPath);
  const db = new DatabaseSync(dbPath);

  console.log('\n--- Checking Subject Tables ---');
  const subjects = db.prepare('SELECT * FROM subjects').all();
  console.log('Subjects in DB:', subjects);

  console.log('\n--- Checking Question Counts by Subject and Type ---');
  const counts = db.prepare(`
    SELECT 
      s.name as subject_name,
      q.type,
      COUNT(*) as total_count
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    GROUP BY q.subject_id, q.type
  `).all();

  console.log('Question counts by subject and type:');
  console.table(counts);

  console.log('\n--- Verifying Counts for Synthetic Exam ID 9999 ---');
  const examCounts = db.prepare(`
    SELECT 
      s.name as subject_name,
      q.type,
      COUNT(*) as exam_count
    FROM questions q
    JOIN subjects s ON q.subject_id = s.id
    WHERE q.exam_id = 9999
    GROUP BY q.subject_id, q.type
  `).all();
  console.table(examCounts);

  console.log('\n--- Checking Options and Solutions Count ---');
  const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
  const totalOptions = db.prepare('SELECT COUNT(*) as count FROM options').get().count;
  const totalSolutions = db.prepare('SELECT COUNT(*) as count FROM solutions').get().count;
  console.log(`Total Questions: ${totalQuestions}`);
  console.log(`Total Options:   ${totalOptions}`);
  console.log(`Total Solutions: ${totalSolutions}`);

  console.log('\n--- Checking For Orphan Options or Solutions ---');
  const orphanOptions = db.prepare(`
    SELECT COUNT(*) as count FROM options o
    LEFT JOIN questions q ON o.question_id = q.id
    WHERE q.id IS NULL
  `).get().count;
  
  const orphanSolutions = db.prepare(`
    SELECT COUNT(*) as count FROM solutions s
    LEFT JOIN questions q ON s.question_id = q.id
    WHERE q.id IS NULL
  `).get().count;

  console.log(`Orphan Options:   ${orphanOptions}`);
  console.log(`Orphan Solutions: ${orphanSolutions}`);

  console.log('\n=== Verification Summary ===');
  let success = true;
  for (const row of examCounts) {
    const expected = row.type === 'single_choice' ? 5000000 : 1000000;
    if (row.exam_count !== expected) {
      console.error(`❌ FAILURE: Subject ${row.subject_name} type ${row.type} has ${row.exam_count} questions (Expected ${expected})`);
      success = false;
    }
  }

  if (orphanOptions > 0 || orphanSolutions > 0) {
    console.error('❌ FAILURE: Found orphan options or solutions!');
    success = false;
  }

  if (success) {
    console.log('🎉 SUCCESS: Database structure and counts are 100% correct!');
  } else {
    process.exit(1);
  }

} catch (e) {
  console.error('Error during database verification:', e);
  process.exit(1);
}
