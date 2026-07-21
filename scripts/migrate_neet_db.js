import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const srcPath  = resolve('Qp/NEET_temp.db').replace(/\\/g, '/');
const destPath = resolve('Qp/NEET.db');

console.log('Opening destination NEET.db ...');
const db = new DatabaseSync(destPath);

// Performance pragmas
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA temp_store = MEMORY;');
db.exec('PRAGMA busy_timeout = 30000;');
db.exec('PRAGMA foreign_keys = OFF;');

// Attach fully-populated source
db.exec(`ATTACH '${srcPath}' AS src`);

console.log('Creating schema in NEET.db ...');
db.exec(`
  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    type TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 180,
    total_questions INTEGER DEFAULT 75
  );
  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    chapter_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    type TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    marks_correct INTEGER DEFAULT 4,
    marks_incorrect INTEGER DEFAULT -1,
    FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    explanation_text TEXT NOT NULL,
    FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);
  CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
  CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter_id);
  CREATE INDEX IF NOT EXISTS idx_options_question ON options(question_id);
  CREATE INDEX IF NOT EXISTS idx_solutions_question ON solutions(question_id);
`);

// Copy small tables first
console.log('Copying exams ...');
db.exec('DELETE FROM main.exams WHERE id = 9999');
db.exec('INSERT OR IGNORE INTO main.exams   SELECT * FROM src.exams');
console.log('Copying subjects ...');
db.exec('DELETE FROM main.subjects');
db.exec('INSERT OR IGNORE INTO main.subjects SELECT * FROM src.subjects');
console.log('Copying chapters ...');
db.exec('DELETE FROM main.chapters');
db.exec('INSERT OR IGNORE INTO main.chapters SELECT * FROM src.chapters');

// Clear ALL existing generated questions/options/solutions (clean slate)
console.log('Clearing existing generated questions, options, solutions from NEET.db ...');
db.exec('DELETE FROM main.solutions WHERE question_id IN (SELECT id FROM main.questions WHERE exam_id = 9999)');
db.exec('DELETE FROM main.options   WHERE question_id IN (SELECT id FROM main.questions WHERE exam_id = 9999)');
db.exec('DELETE FROM main.questions WHERE exam_id = 9999');
console.log('Cleared. Starting migration ...');

const startAll = Date.now();
const BATCH = 500000;

// ---- Questions ----
console.log('Counting questions in source ...');
const totalQ = db.prepare('SELECT COUNT(*) as c FROM src.questions').get().c;
console.log(`Total questions: ${totalQ}`);
let t = Date.now();
for (let offset = 0; offset < totalQ; offset += BATCH) {
  db.exec('BEGIN');
  db.exec(`INSERT INTO main.questions SELECT * FROM src.questions LIMIT ${BATCH} OFFSET ${offset}`);
  db.exec('COMMIT');
  const done = Math.min(offset + BATCH, totalQ);
  const pct  = Math.round((done / totalQ) * 100);
  const elapsed = Math.round((Date.now() - t) / 1000);
  t = Date.now();
  console.log(`Questions: ${done.toLocaleString()} / ${totalQ.toLocaleString()} (${pct}%) — batch took ${elapsed}s`);
}

// ---- Options ----
console.log('Counting options in source ...');
const totalO = db.prepare('SELECT COUNT(*) as c FROM src.options').get().c;
console.log(`Total options: ${totalO}`);
t = Date.now();
for (let offset = 0; offset < totalO; offset += BATCH) {
  db.exec('BEGIN');
  db.exec(`INSERT INTO main.options SELECT * FROM src.options LIMIT ${BATCH} OFFSET ${offset}`);
  db.exec('COMMIT');
  const done = Math.min(offset + BATCH, totalO);
  const pct  = Math.round((done / totalO) * 100);
  const elapsed = Math.round((Date.now() - t) / 1000);
  t = Date.now();
  console.log(`Options: ${done.toLocaleString()} / ${totalO.toLocaleString()} (${pct}%) — batch took ${elapsed}s`);
}

// ---- Solutions ----
console.log('Counting solutions in source ...');
const totalS = db.prepare('SELECT COUNT(*) as c FROM src.solutions').get().c;
console.log(`Total solutions: ${totalS}`);
t = Date.now();
for (let offset = 0; offset < totalS; offset += BATCH) {
  db.exec('BEGIN');
  db.exec(`INSERT INTO main.solutions SELECT * FROM src.solutions LIMIT ${BATCH} OFFSET ${offset}`);
  db.exec('COMMIT');
  const done = Math.min(offset + BATCH, totalS);
  const pct  = Math.round((done / totalS) * 100);
  const elapsed = Math.round((Date.now() - t) / 1000);
  t = Date.now();
  console.log(`Solutions: ${done.toLocaleString()} / ${totalS.toLocaleString()} (${pct}%) — batch took ${elapsed}s`);
}

db.exec('DETACH src');
db.exec('PRAGMA foreign_keys = ON;');
db.close();

console.log(`\n✅ Migration complete in ${Math.round((Date.now() - startAll) / 1000)}s — NEET.db is fully populated!`);
