import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

try {
  const dbPath = resolve('Qp/NEET.db');
  console.log('Connecting to database:', dbPath);
  const db = new DatabaseSync(dbPath);

  console.log('Reading sqlite_sequence...');
  const seq = db.prepare('SELECT * FROM sqlite_sequence').all();
  console.table(seq);

  console.log('Reading max IDs...');
  const maxQ = db.prepare('SELECT MAX(id) as max_id FROM questions').get();
  console.log('Max question ID:', maxQ.max_id);

  const maxO = db.prepare('SELECT MAX(id) as max_id FROM options').get();
  console.log('Max option ID:', maxO.max_id);

  const maxS = db.prepare('SELECT MAX(id) as max_id FROM solutions').get();
  console.log('Max solution ID:', maxS.max_id);

  db.close();
} catch (e) {
  console.error('Error:', e);
}
