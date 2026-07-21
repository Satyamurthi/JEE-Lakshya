import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { exec } from 'node:child_process';

const logPath = resolve('C:/Users/satyu/.gemini/antigravity-ide/brain/a962d453-dc9f-4c6d-9c3e-5e8d6cc0954a/.system_generated/tasks/task-59.log');
const dbPath = resolve('jee/DB/jeebakend.DB');

function getDbStats() {
  if (!existsSync(dbPath)) {
    return { size: '0 MB', qCount: 0, oCount: 0, sCount: 0, subjectCounts: [] };
  }

  const stats = statSync(dbPath);
  const sizeGB = (stats.size / (1024 * 1024 * 1024)).toFixed(2);
  const size = sizeGB > 1 ? `${sizeGB} GB` : `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;

  try {
    const db = new DatabaseSync(dbPath);
    const qCount = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
    const oCount = db.prepare('SELECT COUNT(*) as count FROM options').get().count;
    const sCount = db.prepare('SELECT COUNT(*) as count FROM solutions').get().count;
    
    const subjectCounts = db.prepare(`
      SELECT s.name as subject, q.type, COUNT(*) as count 
      FROM questions q
      JOIN subjects s ON q.subject_id = s.id
      GROUP BY q.subject_id, q.type
    `).all();
    
    db.close();
    return { size, qCount, oCount, sCount, subjectCounts };
  } catch (e) {
    return { size, qCount: 'Calculating...', oCount: 'Calculating...', sCount: 'Calculating...', subjectCounts: [] };
  }
}

function parseLogs() {
  let logText = '';
  if (existsSync(logPath)) {
    logText = readFileSync(logPath, 'utf8');
  }

  const counts = {
    Physics: { mcq: 0, num: 0, mcqDone: false, numDone: false },
    Chemistry: { mcq: 0, num: 0, mcqDone: false, numDone: false },
    Mathematics: { mcq: 0, num: 0, mcqDone: false, numDone: false }
  };

  const lines = logText.split('\n');
  let currentSubject = '';

  for (const line of lines) {
    if (line.includes('Subject: Physics')) currentSubject = 'Physics';
    if (line.includes('Subject: Chemistry')) currentSubject = 'Chemistry';
    if (line.includes('Subject: Mathematics')) currentSubject = 'Mathematics';

    if (currentSubject) {
      if (line.includes('Completed MCQs')) counts[currentSubject].mcqDone = true;
      if (line.includes('Completed Numericals')) counts[currentSubject].numDone = true;

      // Extract progress numbers
      const mcqMatches = [...line.matchAll(/Progress \(MCQ\):\s*(\d+)/g)];
      if (mcqMatches.length > 0) {
        counts[currentSubject].mcq = parseInt(mcqMatches[mcqMatches.length - 1][1]);
      }

      const numMatches = [...line.matchAll(/Progress \(NUM\):\s*(\d+)/g)];
      if (numMatches.length > 0) {
        counts[currentSubject].num = parseInt(numMatches[numMatches.length - 1][1]);
      }
    }
  }

  // Adjust to full count if marked completed
  for (const sub of ['Physics', 'Chemistry', 'Mathematics']) {
    if (counts[sub].mcqDone) counts[sub].mcq = 5000000;
    if (counts[sub].numDone) counts[sub].num = 1000000;
  }

  let status = 'running';
  if (logText.includes('Total process completed') || logText.includes('Verify Complete')) {
    status = 'completed';
  } else if (logText.toLowerCase().includes('error') || logText.toLowerCase().includes('fail')) {
    status = 'error';
  }

  return { status, logText, counts };
}

const server = createServer((req, res) => {
  const url = req.url;

  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtmlContent());
  } 
  else if (url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const logData = parseLogs();
    const dbData = getDbStats();
    res.end(JSON.stringify({ logs: logData, db: dbData }));
  } 
  else if (url.startsWith('/api/questions')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    try {
      const db = new DatabaseSync(dbPath);
      // Fetch latest 15 questions
      const questions = db.prepare(`
        SELECT q.id, s.name as subject, c.name as chapter, q.question_text, q.type, q.difficulty
        FROM questions q
        JOIN subjects s ON q.subject_id = s.id
        JOIN chapters c ON q.chapter_id = c.id
        ORDER BY q.id DESC
        LIMIT 15
      `).all();
      db.close();
      res.end(JSON.stringify({ success: true, questions }));
    } catch (e) {
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }
  else if (url === '/api/verify' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    console.log('Starting verification run via GUI...');
    exec('node scripts/verify_jeebakend_db.js', (err, stdout, stderr) => {
      res.end(JSON.stringify({
        success: !err,
        stdout: stdout || '',
        stderr: stderr || ''
      }));
    });
  }
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Live Database GUI running at: http://localhost:${PORT}`);
  console.log(`======================================================`);
  
  // Try to automatically open in default browser
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${startCmd} http://localhost:${PORT}`);
});

function getHtmlContent() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JEE Questions Generation Live Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0b0f19;
      --card-bg: #161e2f;
      --accent-cyan: #00f2fe;
      --accent-purple: #9b51e0;
      --accent-green: #10b981;
      --accent-yellow: #f59e0b;
      --accent-red: #ef4444;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --border-color: rgba(255, 255, 255, 0.08);
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: 'Outfit', sans-serif;
      padding: 2rem;
      min-height: 100vh;
      overflow-x: hidden;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    
    /* Header Card */
    header {
      background: radial-gradient(circle at top right, rgba(0, 242, 254, 0.15), transparent 60%), var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      position: relative;
      overflow: hidden;
    }
    
    .header-left h1 {
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent-cyan), #4facfe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.25rem;
    }
    
    .header-left p {
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    
    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      padding: 0.5rem 1rem;
      border-radius: 99px;
      font-size: 0.9rem;
      font-weight: 600;
    }
    
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--accent-yellow);
      box-shadow: 0 0 10px var(--accent-yellow);
      animation: pulse 1.5s infinite alternate;
    }
    
    @keyframes pulse {
      0% { opacity: 0.4; }
      100% { opacity: 1; transform: scale(1.1); }
    }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.5rem;
    }
    
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: transform 0.2s;
    }
    
    .stat-card:hover {
      transform: translateY(-3px);
    }
    
    .stat-card .label {
      color: var(--text-muted);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .stat-card .value {
      font-size: 2.2rem;
      font-weight: 700;
      color: #fff;
    }
    
    /* Main Content Section */
    .dashboard-body {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 2rem;
    }
    
    @media (max-width: 1024px) {
      .dashboard-body {
        grid-template-columns: 1fr;
      }
    }
    
    /* Left: Subject Progress Cards */
    .subjects-panel {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .subject-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .subject-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 0.75rem;
    }
    
    .subject-title {
      font-size: 1.3rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .subject-percentage {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--accent-cyan);
    }
    
    .progress-bar-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    
    .progress-track {
      width: 100%;
      height: 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 99px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.5s ease-out;
    }
    
    .physics-fill {
      background: linear-gradient(90deg, #3b82f6, var(--accent-cyan));
    }
    .chemistry-fill {
      background: linear-gradient(90deg, var(--accent-purple), #ec4899);
    }
    .maths-fill {
      background: linear-gradient(90deg, var(--accent-yellow), #f97316);
    }
    
    /* Right: Terminal and Verification */
    .right-panel {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    
    .terminal-card {
      background: #060913;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    
    .terminal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-family: 'JetBrains Mono', monospace;
    }
    
    .terminal-body {
      background: #02040a;
      border-radius: 8px;
      padding: 1rem;
      height: 300px;
      overflow-y: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      color: #38bdf8;
      border: 1px solid rgba(255, 255, 255, 0.03);
    }
    
    /* Verification Card */
    .verify-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    
    .verify-btn {
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
      color: #000;
      border: none;
      padding: 0.8rem 1.5rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    
    .verify-btn:hover {
      box-shadow: 0 0 15px rgba(0, 242, 254, 0.5);
      transform: scale(1.02);
    }
    
    .verify-btn:active {
      transform: scale(0.98);
    }
    
    .verify-results {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 1rem;
      max-height: 200px;
      overflow-y: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: var(--text-muted);
      white-space: pre-wrap;
    }
    
    /* Question Browser */
    .browser-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
    }
    
    .browser-title {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .refresh-btn {
      background: transparent;
      border: 1px solid var(--accent-cyan);
      color: var(--accent-cyan);
      padding: 0.4rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    
    .refresh-btn:hover {
      background: rgba(0, 242, 254, 0.1);
    }
    
    .q-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 500px;
      overflow-y: auto;
    }
    
    .q-item {
      background: rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .q-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    
    .q-badge {
      background: rgba(0, 242, 254, 0.1);
      color: var(--accent-cyan);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
    }
    
    .q-text {
      font-size: 0.95rem;
      line-height: 1.4;
      color: #fff;
    }
    
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-left">
        <h1>JEE Question Bank Live Generator</h1>
        <p>Generating 18,000,000 Hard-Level, Non-Repeated Questions inside jeebakend.DB</p>
      </div>
      <div class="status-badge">
        <span class="status-dot" id="status-dot"></span>
        <span id="status-text">GENERATING</span>
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="label">Total Target Questions</span>
        <span class="value">18,000,000</span>
      </div>
      <div class="stat-card">
        <span class="label">Current DB Questions</span>
        <span class="value" id="stat-total-q">Calculating...</span>
      </div>
      <div class="stat-card">
        <span class="label">Current Options Count</span>
        <span class="value" id="stat-total-o">Calculating...</span>
      </div>
      <div class="stat-card">
        <span class="label">Database File Size</span>
        <span class="value" id="stat-db-size">Calculating...</span>
      </div>
    </div>

    <div class="dashboard-body">
      <!-- Left Panel: Subject Progress -->
      <div class="subjects-panel">
        
        <!-- Physics -->
        <div class="subject-card">
          <div class="subject-header">
            <span class="subject-title">
              <span style="color: #3b82f6">●</span> Physics
            </span>
            <span class="subject-percentage" id="physics-percentage">0%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-info">
              <span>MCQs (Target: 5,000,000)</span>
              <span id="physics-mcq-count">0 / 5,000,000</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill physics-fill" id="physics-mcq-fill" style="width: 0%"></div>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-info">
              <span>Numericals (Target: 1,000,000)</span>
              <span id="physics-num-count">0 / 1,000,000</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill physics-fill" id="physics-num-fill" style="width: 0%"></div>
            </div>
          </div>
        </div>

        <!-- Chemistry -->
        <div class="subject-card">
          <div class="subject-header">
            <span class="subject-title">
              <span style="color: var(--accent-purple)">●</span> Chemistry
            </span>
            <span class="subject-percentage" id="chemistry-percentage">0%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-info">
              <span>MCQs (Target: 5,000,000)</span>
              <span id="chemistry-mcq-count">0 / 5,000,000</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill chemistry-fill" id="chemistry-mcq-fill" style="width: 0%"></div>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-info">
              <span>Numericals (Target: 1,000,000)</span>
              <span id="chemistry-num-count">0 / 1,000,000</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill chemistry-fill" id="chemistry-num-fill" style="width: 0%"></div>
            </div>
          </div>
        </div>

        <!-- Mathematics -->
        <div class="subject-card">
          <div class="subject-header">
            <span class="subject-title">
              <span style="color: var(--accent-yellow)">●</span> Mathematics
            </span>
            <span class="subject-percentage" id="maths-percentage">0%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-info">
              <span>MCQs (Target: 5,000,000)</span>
              <span id="maths-mcq-count">0 / 5,000,000</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill maths-fill" id="maths-mcq-fill" style="width: 0%"></div>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-info">
              <span>Numericals (Target: 1,000,000)</span>
              <span id="maths-num-count">0 / 1,000,000</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill maths-fill" id="maths-num-fill" style="width: 0%"></div>
            </div>
          </div>
        </div>

      </div>

      <!-- Right Panel: Live Logs -->
      <div class="right-panel">
        <div class="terminal-card">
          <div class="terminal-header">
            <span>console_seeder.log</span>
            <span>UTF-8</span>
          </div>
          <div class="terminal-body" id="terminal-body">
            Checking status...
          </div>
        </div>

        <div class="verify-card">
          <h3>Database Integrity Verification</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem">Run deep structural checks, duplicate detection, and constraint checks on jeebakend.DB.</p>
          <button class="verify-btn" id="verify-btn" onclick="runVerify()">Trigger Deep DB Verify</button>
          <div class="verify-results" id="verify-results">Click button to run verify script...</div>
        </div>
      </div>
    </div>

    <!-- Question Browser -->
    <div class="browser-card">
      <div class="browser-title">
        <span>Live Generated Questions Inspector (Latest 15 Questions)</span>
        <button class="refresh-btn" onclick="fetchQuestions()">Reload Questions</button>
      </div>
      <div class="q-list" id="q-list">
        <p style="color: var(--text-muted)">Loading questions preview...</p>
      </div>
    </div>
  </div>

  <script>
    async function updateStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        // Update Stats
        document.getElementById('stat-total-q').innerText = Number(data.db.qCount).toLocaleString();
        document.getElementById('stat-total-o').innerText = Number(data.db.oCount).toLocaleString();
        document.getElementById('stat-db-size').innerText = data.db.size;
        
        // Update Status Badge
        const statusText = data.logs.status.toUpperCase();
        document.getElementById('status-text').innerText = statusText;
        const dot = document.getElementById('status-dot');
        if (statusText === 'COMPLETED') {
          dot.style.backgroundColor = 'var(--accent-green)';
          dot.style.boxShadow = '0 0 10px var(--accent-green)';
        } else if (statusText === 'ERROR') {
          dot.style.backgroundColor = 'var(--accent-red)';
          dot.style.boxShadow = '0 0 10px var(--accent-red)';
        } else {
          dot.style.backgroundColor = 'var(--accent-yellow)';
          dot.style.boxShadow = '0 0 10px var(--accent-yellow)';
        }
        
        // Update Progress Bars
        const subjects = ['Physics', 'Chemistry', 'Mathematics'];
        const fillIds = { Physics: 'physics', Chemistry: 'chemistry', Mathematics: 'maths' };
        
        for (const sub of subjects) {
          const mcq = data.logs.counts[sub].mcq;
          const num = data.logs.counts[sub].num;
          
          const mcqPct = (mcq / 5000000) * 100;
          const numPct = (num / 1000000) * 100;
          const overallPct = ((mcq + num) / 6000000) * 100;
          
          const id = fillIds[sub];
          document.getElementById(id + '-percentage').innerText = Math.round(overallPct) + '%';
          
          document.getElementById(id + '-mcq-count').innerText = mcq.toLocaleString() + ' / 5,000,000';
          document.getElementById(id + '-mcq-fill').style.width = mcqPct + '%';
          
          document.getElementById(id + '-num-count').innerText = num.toLocaleString() + ' / 1,000,000';
          document.getElementById(id + '-num-fill').style.width = numPct + '%';
        }
        
        // Update Terminal Logs
        const terminal = document.getElementById('terminal-body');
        // Clean line endings and show latest log segment
        const logContent = data.logs.logText.trim().replace(/\\r/g, '\\n');
        terminal.innerText = logContent;
        // Auto scroll to bottom
        terminal.scrollTop = terminal.scrollHeight;
        
      } catch (e) {
        console.error('Error fetching status:', e);
      }
    }

    async function fetchQuestions() {
      try {
        const res = await fetch('/api/questions');
        const data = await res.json();
        const qList = document.getElementById('q-list');
        
        if (data.success && data.questions.length > 0) {
          qList.innerHTML = data.questions.map(q => \`
            <div class="q-item">
              <div class="q-meta">
                <span>ID: \${q.id} | Subject: <b>\${q.subject}</b> | Chapter: \${q.chapter}</span>
                <span class="q-badge">\${q.type.toUpperCase()}</span>
              </div>
              <div class="q-text">\${q.question_text}</div>
            </div>
          \`).join('');
        } else {
          qList.innerHTML = '<p style="color: var(--text-muted)">No generated questions found yet.</p>';
        }
      } catch (e) {
        console.error('Error fetching questions:', e);
      }
    }

    async function runVerify() {
      const btn = document.getElementById('verify-btn');
      const resultsDiv = document.getElementById('verify-results');
      
      btn.innerText = 'Verifying...';
      btn.disabled = true;
      resultsDiv.innerText = 'Starting deep verification checks. Please wait...\\n';
      
      try {
        const res = await fetch('/api/verify', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
          resultsDiv.innerHTML = '<b style="color: var(--accent-green)">Verification Complete:</b>\\n' + data.stdout;
        } else {
          resultsDiv.innerHTML = '<b style="color: var(--accent-red)">Verification Failed:</b>\\n' + data.stderr + '\\n' + data.stdout;
        }
      } catch (e) {
        resultsDiv.innerText = 'Error calling verify endpoint: ' + e.message;
      } finally {
        btn.innerText = 'Trigger Deep DB Verify';
        btn.disabled = false;
      }
    }

    // Live update every 1 second
    setInterval(updateStatus, 1000);
    setInterval(fetchQuestions, 3000);
    
    // Initial calls
    updateStatus();
    fetchQuestions();
  </script>
</body>
</html>
  `;
}
