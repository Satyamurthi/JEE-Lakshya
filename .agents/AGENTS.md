# Workspace Rules - Exam Prep & Admin Portal

This folder configures customizations for AI coding assistants working in this workspace.

## Agent Guidelines
1.  **Read brain/PROJECT_BRAIN.md First**: Before suggesting or making modifications, read the [brain/PROJECT_BRAIN.md](file:///d:/JEE/brain/PROJECT_BRAIN.md) file to understand the architecture, database mappings, previous decisions, and current tasks.
2.  **Maintain brain/ Files**: After completing any significant architectural change or adding a new feature, update the "Chronological History" inside [brain/session_history.md](file:///d:/JEE/brain/session_history.md) and "Current Operational State" sections of [brain/PROJECT_BRAIN.md](file:///d:/JEE/brain/PROJECT_BRAIN.md) so that memory is persisted across sessions.
3.  **Local MySQL Multi-DB Connector**: When modifying local API requests, ensure that requests passing to the PHP connector include the header or query parameter indicating the target exam stream to connect to the correct database schema dynamically.
4.  **License Auto-Freeze Guards**: Always preserve and adhere to the automated subscription expiration checks and frozen account blocks inside the React router guards and login hooks.
5.  **AUTO-PUSH TO GITHUB AFTER EVERY CHANGE** ⚡: This is MANDATORY. After every code modification — no matter how small — you MUST immediately run:
    ```
    git -C d:\JEE add -A
    git -C d:\JEE commit -m "<descriptive message>"
    git -C d:\JEE push origin main
    ```
    Do NOT wait until the end of a session. Push immediately after each file change. The remote is pre-authenticated so no credentials are needed.
6.  **UPDATE BRAIN AFTER EVERY SESSION** 🧠: After completing any task, you MUST update both:
    - [brain/PROJECT_BRAIN.md](file:///d:/JEE/brain/PROJECT_BRAIN.md) — update "Current Operational State" and any relevant sections
    - [brain/session_history.md](file:///d:/JEE/brain/session_history.md) — append a new session entry with: date, what was changed, which files, and why
    Then commit and push the brain updates themselves.
7.  **Git Remote Info**:
    - Main repo: `https://github.com/Satyamurthi/JEE-Lakshya.git`
    - Mirror repo: `https://github.com/Satyamurthi/JEE-Nexus.git`
    - Branch: `main`
    - Auth: embedded in remote URL (no extra credentials needed)
    - MySQL binary: `C:\Program Files\MariaDB 12.3\bin\mysql.exe`
    - PHP binary: `C:\xampp\php\php.exe`
    - Node: NOT in PATH — use PHP scripts for DB tasks
