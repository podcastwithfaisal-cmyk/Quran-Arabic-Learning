# Quran Arabic Learning — Lessons 1–10 build

This build extends the validated multi-user version from 5 lessons / 25 learning units
to 10 lessons / 50 learning units.

New curriculum:
- Lesson 6: Al-Kahf 18:10 building blocks
- Lesson 7: grammar + Al-Kahf 18:69 building blocks
- Lesson 8: known roots in new Quranic forms
- Lessons 9–10: Al-Kahf 18:109 building blocks

Important curriculum rule:
An Ayat Test is only unlocked when all important learning units for that ayah have been
taught. Therefore 18:10, 18:69 and 18:109 are included in the curriculum data but remain
locked until the remaining missing units are taught in later lessons. The app does not
pretend that a partially understood ayah is fully unlocked.

Existing features retained:
- Supabase accounts
- Per-user saved progress
- Revision history
- Retry missed revision questions
- Revision Back navigation
- Redo / Revise completed lessons
- Sequential lesson locking
- Harakat on Quranic forms

## Before uploading

This package intentionally contains the same config.js template as the prior downloadable
build. Put your existing Supabase publishable key into config.js before uploading, or retain
the config.js already working in your live GitHub repository and upload only:
- index.html
- style.css
- data.js
- app.js
- README.md

Do not use a Supabase secret key in browser code.
