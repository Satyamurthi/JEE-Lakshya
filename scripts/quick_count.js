import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

try {
  const dbPath = resolve('Qp/NEET.db');
  console.log('Connecting to database:', dbPath);
  const db = new DatabaseSync(dbPath);

  console.log('Counting questions by type...');
  const counts = db.prepare('SELECT type, COUNT(*) as count FROM questions GROUP BY type').all();
  console.table(counts);

  console.log('Counting questions by subject_id and type...');
  const subCounts = db.prepare('SELECT subject_id, type, COUNT(*) as count FROM questions GROUP BY subject_id, type').all();
  console.table(subCounts);

  const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
  console.log('Total questions:', totalQuestions);

  db.close();
} catch (e) {
  console.error('Error:', e);
}
