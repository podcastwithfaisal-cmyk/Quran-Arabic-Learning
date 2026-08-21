# Quran Arabic POC1

A deliberately small browser-based proof of concept for the learning loop:

1. Learn five Quranic learning units.
2. Revise them with multiple choice.
3. Unlock Surah Al-Kahf 18:4.
4. Attempt the ayah meaning.
5. View simple progress.

## Run it

Open `index.html` in a browser.

For the cleanest local experience, serve the folder with any simple local web server, for example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000

## Important POC limitations

- The Ayat Test score is simple keyword matching, not genuine AI semantic grading.
- The vocabulary dataset is only Lesson 1.
- Progress is not persisted between browser sessions.
- No spaced repetition yet.
- No account/login system.
- No full Quran-page highlighting yet.

The purpose is to test whether the core loop feels motivating before building those features.
