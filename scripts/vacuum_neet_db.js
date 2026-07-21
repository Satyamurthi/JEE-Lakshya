import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';

const srcPath  = resolve('Qp/NEET_temp.db');
const destPath = resolve('Qp/NEET_clean.db');

// Remove any previous clean copy
if (existsSync(destPath)) {
  console.log('Removing previous NEET_clean.db ...');
  unlinkSync(destPath);
}

console.log('Opening NEET_temp.db ...');
const db = new DatabaseSync(srcPath);
db.exec('PRAGMA journal_mode = WAL;');

// Use VACUUM INTO to produce a clean defragmented copy
console.log(`\nRunning VACUUM INTO '${destPath}' ...`);
console.log('This creates a clean compact copy — please wait, this takes a few minutes...');
const start = Date.now();
db.exec(`VACUUM INTO '${destPath.replace(/\\/g, '/')}'`);
console.log(`\n✅ VACUUM INTO completed in ${Math.round((Date.now() - start) / 1000)}s`);

db.close();
console.log(`Clean database saved to: ${destPath}`);
console.log('\nNow please close NEET.db in your editor, then run:');
console.log('  cmd /c del "D:\\JEE\\Qp\\NEET.db" && ren "D:\\JEE\\Qp\\NEET_clean.db" "NEET.db"');

