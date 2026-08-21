# Quran Arabic Learning — Multi-user build

This version adds:
- Supabase email/password sign-up and sign-in
- Per-user lesson progress
- Per-user word correct/wrong/streak data
- Per-user Ayat Test history
- Sign out
- Retry incorrect revision questions before finishing
- Back navigation during revision
- Redo completed lessons
- Revise completed lessons
- Sequential lesson locking
- Harakat on Quranic word forms

## Before uploading

Open `config.js` and replace:

`PASTE_YOUR_PUBLISHABLE_KEY_HERE`

with the Supabase Publishable key from:
Project Settings → API Keys → Publishable key.

The Project URL is already configured.

Do NOT use the Supabase secret key.

## Upload to GitHub

Replace/add these files in the root of the `Quran-Arabic-Learning` repo:

- index.html
- style.css
- config.js
- data.js
- app.js
- README.md

Cloudflare Pages should redeploy automatically.

## Database assumptions

The build expects these Supabase tables and RLS policies to already exist:

- lesson_progress
- word_progress
- ayat_attempts
