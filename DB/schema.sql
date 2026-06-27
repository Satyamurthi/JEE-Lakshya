-- Enable foreign key support in SQLite
PRAGMA foreign_keys = ON;

-- Exams Table
CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'Main' or 'Advanced'
    duration_minutes INTEGER DEFAULT 180,
    total_questions INTEGER DEFAULT 75
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE -- 'Physics', 'Chemistry', 'Mathematics'
);

-- Chapters Table
CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    chapter_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    type TEXT NOT NULL, -- 'single_choice' (MCQ), 'multiple_choice' (MSQ), 'numerical' (NAT)
    difficulty TEXT NOT NULL, -- 'Easy', 'Medium', 'Hard'
    marks_correct INTEGER DEFAULT 4,
    marks_incorrect INTEGER DEFAULT -1,
    FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- Options Table
CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL, -- 0 for False, 1 for True
    FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Solutions Table
CREATE TABLE IF NOT EXISTS solutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    explanation_text TEXT NOT NULL,
    FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Indexes for performance filtering
CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_options_question ON options(question_id);
CREATE INDEX IF NOT EXISTS idx_solutions_question ON solutions(question_id);
