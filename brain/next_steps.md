# Next Steps - Project Roadmap

This file maps out upcoming tasks, verification checkpoints, and planned features for the platform.

---

## 1. Local Testing & Verification Checklist
*   [ ] Test login with a user whose `subscription_expires_at` is set in the past. Verify that:
    *   The user's status is automatically updated to `frozen` in the database.
    *   An error message appears on login: `"Your account has been frozen due to subscription expiration or administrator action."`
    *   Access is blocked.
*   [ ] Test active session expiration. Log in as an admin, set their database expiration date to 1 minute in the future, and verify that they are automatically redirected to the frozen suspension screen when the duration ends.
*   [ ] Verify student blocking: when a Coaching Admin is frozen, verify that students under that admin are immediately blocked from taking challenges or practice tests.

---

## 2. Upcoming Features & Roadmap
*   **Database Seeding**:
    *   Initialize and populate the KCET and UPSC local question SQLite databases under `kcet/DB/` and `upsc/DB/`.
*   **Production Deployment**:
    *   Configure production environment variables for the unified dashboard deployment on Netlify.
*   **Android App Release**:
    *   Build and release the unified APK supporting dynamic database switching.
