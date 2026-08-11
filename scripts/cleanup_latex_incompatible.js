/**
 * cleanup_latex_incompatible.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Audits and deletes questions from jee_nexus / neet_nexus / kcet_nexus /
 * upsc_nexus that would break KaTeX rendering on the website.
 *
 * A question is considered "LaTeX-incompatible" if ANY of the following are true:
 *
 *  1. MISSING STATEMENT   – statement is NULL, empty string, or literal "null"
 *  2. MISSING OPTIONS     – options is NULL, empty, "{}", or not valid JSON
 *  3. NO CORRECT ANSWER   – both correctAnswer AND correct_answer are NULL/empty
 *  4. BROKEN LATEX DELIMITERS – unbalanced $ signs (odd count of $ in a field)
 *  5. UNKNOWN LATEX COMMANDS – contains commands KaTeX does NOT support
 *     (e.g. \vspace, \hspace, \bf, \begin{tabular}, \cite, etc.)
 *  6. BARE HTML TAGS (not <img>) – contains <table>, <div>, <br>, <p>, <span>
 *     etc. mixed in with LaTeX that the renderer won't handle
 *  7. ENCODING GARBAGE    – contains U+FFFD replacement character
 *
 * Usage (dry-run, no deletions):
 *   node scripts/cleanup_latex_incompatible.js
 *
 * Usage (actually delete):
 *   node scripts/cleanup_latex_incompatible.js --delete
 *
 * Usage (specific DB only):
 *   node scripts/cleanup_latex_incompatible.js --db=neet_nexus --delete
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const mysql = require("mysql2/promise");
const path  = require("path");
const fs    = require("fs");

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const DRY_RUN    = !args.includes("--delete");
const ONLY_DB    = (args.find(a => a.startsWith("--db=")) || "").replace("--db=", "") || null;
const BATCH_SIZE = 2000; // rows to process per query batch

// ── Databases to clean ────────────────────────────────────────────────────────
const ALL_DATABASES = ["jee_nexus", "neet_nexus", "kcet_nexus", "upsc_nexus"];
const DATABASES     = ONLY_DB ? [ONLY_DB] : ALL_DATABASES;

// ── MariaDB connection config ─────────────────────────────────────────────────
const DB_CONFIG = {
  host    : "127.0.0.1",
  port    : 3306,
  user    : "root",
  password: "",
  charset : "utf8mb4",
};

// ─────────────────────────────────────────────────────────────────────────────
// KaTeX-unsupported command list
// ─────────────────────────────────────────────────────────────────────────────
const KATEX_UNSUPPORTED_COMMANDS = [
  "\\bf", "\\it", "\\rm", "\\sc", "\\tt", "\\sl",
  "\\normalfont", "\\textbf", "\\textit", "\\texttt", "\\textrm",
  "\\vspace", "\\hspace", "\\vskip", "\\hskip",
  "\\newpage", "\\clearpage", "\\pagebreak",
  "\\begin{enumerate}", "\\begin{itemize}", "\\begin{description}",
  "\\begin{tabular}", "\\begin{table}", "\\begin{figure}",
  "\\begin{minipage}", "\\begin{multicols}",
  "\\cite", "\\ref", "\\label", "\\footnote",
  "\\includegraphics", "\\usepackage", "\\documentclass",
  "\\setcounter", "\\newcommand", "\\renewcommand",
];

// ─────────────────────────────────────────────────────────────────────────────
// HTML tags (other than <img>) that break the renderer
// ─────────────────────────────────────────────────────────────────────────────
const BAD_HTML_TAG_PATTERN = /<(table|tr|td|th|div|p|br|ul|ol|li|h[1-6]|section|article|header|footer|form|input|select|textarea|button|script|style)[^>]*>/i;

// ─────────────────────────────────────────────────────────────────────────────
// Check a single text field for LaTeX incompatibility.
// ─────────────────────────────────────────────────────────────────────────────
function checkField(fieldName, value) {
  if (value === null || value === undefined) return { bad: false, reason: "" };
  const text = String(value);

  // 1. Unbalanced $ delimiters
  const singleDollarCount = (text.match(/(?<!\$)\$(?!\$)/g) || []).length;
  if (singleDollarCount % 2 !== 0) {
    return { bad: true, reason: `[${fieldName}] Unbalanced inline $ delimiters (count: ${singleDollarCount})` };
  }

  const doubleDollarCount = (text.match(/\$\$/g) || []).length;
  if (doubleDollarCount % 2 !== 0) {
    return { bad: true, reason: `[${fieldName}] Unbalanced block $$ delimiters (count: ${doubleDollarCount})` };
  }

  // 2. KaTeX-unsupported commands
  for (const cmd of KATEX_UNSUPPORTED_COMMANDS) {
    if (text.includes(cmd)) {
      return { bad: true, reason: `[${fieldName}] Contains KaTeX-unsupported command: ${cmd}` };
    }
  }

  // 3. Bare HTML tags that break the renderer
  if (BAD_HTML_TAG_PATTERN.test(text)) {
    const match = text.match(BAD_HTML_TAG_PATTERN);
    return { bad: true, reason: `[${fieldName}] Contains unsupported HTML tag: ${match[0].substring(0, 40)}` };
  }

  // 4. Encoding garbage
  if (text.includes("\uFFFD")) {
    return { bad: true, reason: `[${fieldName}] Contains encoding replacement character (U+FFFD)` };
  }

  return { bad: false, reason: "" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluate a complete question row.
// ─────────────────────────────────────────────────────────────────────────────
function isIncompatible(row) {
  // 1. Missing statement
  if (!row.statement || row.statement.trim() === "" || row.statement.trim() === "null") {
    return { bad: true, reason: "Missing or empty statement" };
  }

  // 2. Missing/invalid options
  if (!row.options || row.options.trim() === "" || row.options.trim() === "null" || row.options.trim() === "{}") {
    return { bad: true, reason: "Missing or empty options" };
  }
  let parsedOptions;
  try {
    parsedOptions = JSON.parse(row.options);
    if (typeof parsedOptions !== "object" || Array.isArray(parsedOptions) || Object.keys(parsedOptions).length === 0) {
      return { bad: true, reason: "Options object is empty or invalid" };
    }
  } catch {
    return { bad: true, reason: "Options field is invalid JSON" };
  }

  // 3. Missing correct answer
  const ca1 = (row.correctAnswer || "").trim();
  const ca2 = (row.correct_answer || "").trim();
  if (ca1 === "" && ca2 === "") {
    return { bad: true, reason: "No correct answer (both correctAnswer and correct_answer are empty)" };
  }

  // 4–7. Check text fields for LaTeX issues
  const fieldsToCheck = [
    ["statement",   row.statement],
    ["solution",    row.solution],
    ["explanation", row.explanation],
  ];

  for (const [key, val] of Object.entries(parsedOptions)) {
    fieldsToCheck.push([`option_${key}`, val]);
  }

  for (const [fieldName, value] of fieldsToCheck) {
    const result = checkField(fieldName, value);
    if (result.bad) return result;
  }

  return { bad: false, reason: "" };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  LaTeX-Incompatible Question Cleanup");
  console.log(`  Mode  : ${DRY_RUN ? "DRY RUN (no deletions)" : "⚠️  LIVE DELETE MODE"}`);
  console.log(`  DBs   : ${DATABASES.join(", ")}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  const logLines = [
    `Run at: ${new Date().toISOString()}`,
    `Mode: ${DRY_RUN ? "DRY_RUN" : "DELETE"}`,
    `Databases: ${DATABASES.join(", ")}`,
    "---",
  ];

  const conn = await mysql.createConnection(DB_CONFIG);
  const globalSummary = [];

  for (const dbName of DATABASES) {
    console.log(`\n▶  Database: ${dbName}`);
    console.log("   ─────────────────────────────────────────────");

    await conn.query(`USE \`${dbName}\``);

    const [[{ total }]] = await conn.query("SELECT COUNT(*) as total FROM questions");
    console.log(`   Total questions: ${total.toLocaleString()}`);

    let offset     = 0;
    let badIds     = [];
    let badReasons = {};
    let processed  = 0;

    while (offset < total) {
      const [rows] = await conn.query(
        "SELECT id, statement, options, correctAnswer, correct_answer, solution, explanation FROM questions LIMIT ? OFFSET ?",
        [BATCH_SIZE, offset]
      );

      if (rows.length === 0) break;

      for (const row of rows) {
        const { bad, reason } = isIncompatible(row);
        if (bad) {
          badIds.push(row.id);
          badReasons[row.id] = reason;
        }
      }

      processed += rows.length;
      offset    += BATCH_SIZE;

      if (processed % 50000 < BATCH_SIZE || processed >= total) {
        process.stdout.write(`\r   Scanned ${processed.toLocaleString()} / ${total.toLocaleString()} ...`);
      }
    }

    process.stdout.write(`\r   Scanned ${total.toLocaleString()} / ${total.toLocaleString()} ✓\n`);
    console.log(`   Found ${badIds.length.toLocaleString()} incompatible questions\n`);

    // Reason breakdown
    const reasonCounts = {};
    for (const id of badIds) {
      const r = (badReasons[id] || "Unknown").replace(/\[.*?\]\s*/, "").split(":")[0].trim();
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    }

    if (badIds.length > 0) {
      console.log("   Breakdown by reason:");
      for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`     ${String(count.toLocaleString()).padStart(8)} × ${reason}`);
      }
    }

    logLines.push(`\n[${dbName}]`);
    logLines.push(`Total: ${total}`);
    logLines.push(`Bad:   ${badIds.length}`);
    for (const [r, c] of Object.entries(reasonCounts)) {
      logLines.push(`  ${c} x ${r}`);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (!DRY_RUN && badIds.length > 0) {
      console.log(`\n   🗑️  Deleting ${badIds.length.toLocaleString()} questions from ${dbName}...`);
      const CHUNK = 500;
      let deleted = 0;
      for (let i = 0; i < badIds.length; i += CHUNK) {
        const chunk        = badIds.slice(i, i + CHUNK);
        const placeholders = chunk.map(() => "?").join(",");
        await conn.query(`DELETE FROM questions WHERE id IN (${placeholders})`, chunk);
        deleted += chunk.length;
        process.stdout.write(`\r   Deleted ${deleted.toLocaleString()} / ${badIds.length.toLocaleString()} ...`);
      }
      process.stdout.write(`\r   Deleted ${deleted.toLocaleString()} ✓\n`);
      logLines.push(`Deleted: ${deleted}`);
    } else if (DRY_RUN && badIds.length > 0) {
      console.log("\n   ℹ️  Dry-run — no deletions. Run with --delete to remove these.");
    }

    globalSummary.push({ db: dbName, total: Number(total), bad: badIds.length });
  }

  await conn.end();

  // ── GLOBAL SUMMARY ─────────────────────────────────────────────────────────
  console.log("\n\n═══════════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════");
  let grandTotal = 0, grandBad = 0;
  for (const { db, total, bad } of globalSummary) {
    const pct = total > 0 ? ((bad / total) * 100).toFixed(2) : "0.00";
    console.log(`  ${db.padEnd(15)} ${String(bad.toLocaleString()).padStart(8)} bad / ${String(total.toLocaleString()).padStart(10)} total  (${pct}%)`);
    grandTotal += total;
    grandBad   += bad;
  }
  const grandPct = grandTotal > 0 ? ((grandBad / grandTotal) * 100).toFixed(2) : "0.00";
  console.log("  ─────────────────────────────────────────────────────────────");
  console.log(`  ${"TOTAL".padEnd(15)} ${String(grandBad.toLocaleString()).padStart(8)} bad / ${String(grandTotal.toLocaleString()).padStart(10)} total  (${grandPct}%)`);
  console.log(`\n  Mode: ${DRY_RUN ? "DRY RUN – nothing deleted" : "DELETED"}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Save log
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath   = path.join(__dirname, `../latex_cleanup_${DRY_RUN ? "dryrun" : "deleted"}_${timestamp}.log`);
  fs.writeFileSync(logPath, logLines.join("\n"), "utf8");
  console.log(`  Log saved: ${logPath}\n`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
