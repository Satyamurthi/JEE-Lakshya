# JEE Lakshya - Priority Action Checklist

- [x] **Critical**: Fix SQL injection in `api/local_db.php` lines 366/378 — the `$columns` variable from POST payload is concatenated directly into the query.
- [x] **High**: Fix LaTeX/math rendering in `src/pages/Results.tsx` lines 422/431 — change plain text string interpolation of `selectedOpt.val` and `corrOpt.val` to use `<MathRenderer>` and remove raw `.slice(0, 60)` slicing.
- [x] **High**: Secure CORS origin whitelisting in `api/db.php` lines 15-17 — replace the wildcard `*.netlify.app` regular expression matcher with an explicit origin check for `https://jeelakshya.netlify.app`.
- [ ] **High**: Create database indexes in `api/setup_db.php` lines 92/205 — add MySQL indexes on `questions(subject, chapter)`, `exam_attempts(user_id)`, and `daily_attempts(user_id)` to prevent slow full table scans.
- [ ] **High**: Prevent database empty states during synchronization in `scripts/sync_jee_mariadb.php` line 90 — use a staging table swap pattern (`RENAME TABLE`) instead of raw `TRUNCATE TABLE questions`.
- [ ] **High**: Implement sync concurrency locks in `api/sync_sqlite.php` line 126 — add a file lock check or lock table query to prevent parallel background sync triggers from corrupting data.
- [ ] **Medium**: Consolidate stream AI services in `src/geminiService.ts` — refactor duplicate logic from `neetGeminiService.ts`, `kcetGeminiService.ts`, and `upscGeminiService.ts` into a unified handler.
- [ ] **Medium**: Consolidate database credentials in `api/db.php` lines 60-63 — load connection credentials dynamically using `getenv()` instead of hardcoded plaintext values.
- [ ] **Low**: Remove duplicate KaTeX resources in `index.html` lines 27-28 — remove the CDN script tags since KaTeX is already compiled inside the React JS bundle.
- [ ] **Low**: Clean up mock files in `src/data` — remove any remaining unreferenced mock files like `test.txt`.
