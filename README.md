# Quran Arabic Learning — Word-first Lessons 1–20

This build changes the teaching model across all 20 lessons.

## New lesson-card model

Front:
- English meaning of the actual Quranic word/form
- grammatical information where useful (for example singular, dual, 3+ plural)
- English meaning of the underlying root/family

Back:
- the Arabic word exactly as taught from the Quran
- grammatical information
- root letters / learning unit
- root meaning

Revision now tests the actual Quranic word meaning rather than only the broad root meaning.

Examples:
- قَالُواْ = “they said” — 3+ males / masculine or mixed group
  Root ق و ل = say / speak
- بَلَغَا = “they both reached” — exactly two
  Root ب ل غ = reach
- سَتَجِدُنِي = “you will find me” — one male addressed, future tense, “me” attached
  Root و ج د = find

## Retained features

- 20 lessons / 100 learning units
- Supabase multi-user progress
- pending lessons first
- completed lesson Redo / Revise
- retry missed revision questions
- revision Back navigation
- improved Ayat concept grading
- remembered Ayat passes / best scores
- Review Related Lessons
- Dashboard exit from lessons/revision
- small-phone/iPhone layout improvements

## Upload

Keep your existing live `config.js` because it contains your working Supabase publishable key.

Replace:
- index.html
- style.css
- app.js
- README.md

`data.js` is unchanged in this update.
