# Workspace Rules - Exam Prep & Admin Portal

This folder configures customizations for AI coding assistants working in this workspace.

## Agent Guidelines
1.  **Read brain/PROJECT_BRAIN.md First**: Before suggesting or making modifications, read the [brain/PROJECT_BRAIN.md](file:///d:/JEE/brain/PROJECT_BRAIN.md) file to understand the architecture, database mappings, previous decisions, and current tasks.
2.  **Maintain brain/ Files**: After completing any significant architectural change or adding a new feature, update the "Chronological History" inside [brain/session_history.md](file:///d:/JEE/brain/session_history.md) and "Current Operational State" sections of [brain/PROJECT_BRAIN.md](file:///d:/JEE/brain/PROJECT_BRAIN.md) so that memory is persisted across sessions.
3.  **Local MySQL Multi-DB Connector**: When modifying local API requests, ensure that requests passing to the PHP connector include the header or query parameter indicating the target exam stream to connect to the correct database schema dynamically.
4.  **License Auto-Freeze Guards**: Always preserve and adhere to the automated subscription expiration checks and frozen account blocks inside the React router guards and login hooks.
