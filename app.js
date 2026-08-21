const units = [
  {
    id: "qwl",
    english: "say / speak",
    root: "ق و ل",
    form: "قَالُوا",
    formMeaning: "they said",
    type: "Root family + Quranic form"
  },
  {
    id: "akh",
    english: "take / adopt",
    root: "أ خ ذ",
    form: "ٱتَّخَذَ",
    formMeaning: "he took / adopted",
    type: "Root family + Quranic form"
  },
  {
    id: "ndhr",
    english: "warn",
    root: "ن ذ ر",
    form: "يُنذِرَ",
    formMeaning: "to warn / that he may warn",
    type: "Root family + Quranic form"
  },
  {
    id: "wld",
    english: "child / offspring",
    root: "و ل د",
    form: "وَلَدًا",
    formMeaning: "a child / son",
    type: "Root family + Quranic form"
  },
  {
    id: "alladhina",
    english: "those who",
    root: "ٱلَّذِينَ",
    form: "ٱلَّذِينَ",
    formMeaning: "those who",
    type: "Relative pronoun"
  }
];

const distractors = [
  "mercy", "earth / land", "knowledge", "Lord / master", "make / place",
  "cave", "work / deed", "from", "in", "towards", "servant", "thing"
];

let cardIndex = 0;
let quizIndex = 0;
let quizScore = 0;
let answered = false;

const screens = {
  home: document.getElementById("homeScreen"),
  lesson: document.getElementById("lessonScreen"),
  revision: document.getElementById("revisionScreen"),
  unlock: document.getElementById("unlockScreen"),
  ayat: document.getElementById("ayatScreen"),
  progress: document.getElementById("progressScreen")
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCard() {
  const unit = units[cardIndex];
  document.getElementById("englishMeaning").textContent = unit.english;
  document.getElementById("arabicRoot").textContent = unit.root;
  document.getElementById("arabicForm").textContent = unit.form;
  document.getElementById("formMeaning").textContent = unit.formMeaning;
  document.getElementById("unitType").textContent = unit.type;
  document.getElementById("cardCounter").textContent = `${cardIndex + 1} of ${units.length}`;
  document.getElementById("backCardBtn").disabled = cardIndex === 0;
  document.getElementById("nextCardBtn").textContent = cardIndex === units.length - 1 ? "Start Revision" : "Next";
  document.getElementById("flipCard").classList.remove("flipped");
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function renderQuiz() {
  answered = false;
  const unit = units[quizIndex];
  document.getElementById("quizArabic").textContent = unit.form;
  document.getElementById("quizSub").textContent = unit.root === unit.form ? unit.type : `Root: ${unit.root}`;
  document.getElementById("quizCounter").textContent = `${quizIndex + 1} of ${units.length}`;
  document.getElementById("quizFeedback").textContent = "";

  const wrong = shuffle(distractors.filter(d => d !== unit.english)).slice(0, 3);
  const options = shuffle([unit.english, ...wrong]);
  const wrap = document.getElementById("answerOptions");
  wrap.innerHTML = "";

  options.forEach(option => {
    const btn = document.createElement("button");
    btn.className = "answer-option";
    btn.textContent = option;
    btn.addEventListener("click", () => handleAnswer(btn, option, unit.english));
    wrap.appendChild(btn);
  });
}

function handleAnswer(button, selected, correct) {
  if (answered) return;
  answered = true;

  const buttons = [...document.querySelectorAll(".answer-option")];
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correct) btn.classList.add("correct");
  });

  if (selected === correct) {
    quizScore++;
    document.getElementById("quizFeedback").textContent = "Correct.";
  } else {
    button.classList.add("wrong");
    document.getElementById("quizFeedback").textContent = `Not quite. Correct answer: ${correct}`;
  }

  setTimeout(() => {
    quizIndex++;
    if (quizIndex < units.length) {
      renderQuiz();
    } else {
      document.getElementById("masteredCount").textContent = units.length;
      document.getElementById("homeLearned").textContent = `${units.length} / ${units.length}`;
      document.getElementById("homeAyat").textContent = "1";
      document.getElementById("startRevisionBtn").disabled = false;
      showScreen("unlock");
    }
  }, 850);
}

function simpleAyatScore(text) {
  const t = text.toLowerCase().replace(/[^\w\s]/g, " ");
  const concepts = [
    ["warn", "warning"],
    ["those", "people"],
    ["said", "say"],
    ["allah", "god"],
    ["take", "taken", "adopt", "adopted"],
    ["son", "child", "offspring"]
  ];

  let matched = 0;
  concepts.forEach(group => {
    if (group.some(word => t.includes(word))) matched++;
  });

  return Math.round((matched / concepts.length) * 100);
}

function renderMastery() {
  const wrap = document.getElementById("masteryList");
  wrap.innerHTML = "";
  units.forEach(unit => {
    const row = document.createElement("div");
    row.className = "mastery-row";
    row.innerHTML = `
      <div>
        <div class="mastery-arabic" dir="rtl">${unit.form}</div>
        <div class="muted">${unit.english}</div>
      </div>
      <span class="mastered-tag">Learned</span>
    `;
    wrap.appendChild(row);
  });
}

document.getElementById("startLessonBtn").addEventListener("click", () => {
  cardIndex = 0;
  renderCard();
  showScreen("lesson");
});

document.getElementById("flipCard").addEventListener("click", () => {
  document.getElementById("flipCard").classList.toggle("flipped");
});

document.getElementById("backCardBtn").addEventListener("click", () => {
  if (cardIndex > 0) {
    cardIndex--;
    renderCard();
  }
});

document.getElementById("nextCardBtn").addEventListener("click", () => {
  if (cardIndex < units.length - 1) {
    cardIndex++;
    renderCard();
  } else {
    quizIndex = 0;
    quizScore = 0;
    renderQuiz();
    showScreen("revision");
  }
});

document.getElementById("startRevisionBtn").addEventListener("click", () => {
  quizIndex = 0;
  quizScore = 0;
  renderQuiz();
  showScreen("revision");
});

document.getElementById("startAyatBtn").addEventListener("click", () => {
  document.getElementById("translationInput").value = "";
  document.getElementById("ayatResult").classList.add("hidden");
  showScreen("ayat");
});

document.getElementById("checkAyatBtn").addEventListener("click", () => {
  const input = document.getElementById("translationInput").value.trim();
  const result = document.getElementById("ayatResult");

  if (!input) {
    result.className = "ayat-result";
    result.textContent = "Enter your understanding of the ayah first.";
    return;
  }

  const score = simpleAyatScore(input);
  let band = "Below 60%";
  let cls = "score-orange";

  if (score > 92) {
    band = "Green";
    cls = "score-green";
  } else if (score > 80) {
    band = "Yellow";
    cls = "score-yellow";
  } else if (score > 60) {
    band = "Orange";
    cls = "score-orange";
  }

  result.className = "ayat-result";
  result.innerHTML = `
    <span class="score-badge ${cls}">${score}% · ${band}</span>
    <p><strong>Reference meaning:</strong> “And to warn those who said, ‘Allah has taken a son.’”</p>
    <p class="muted">POC note: this score uses simple keyword matching only. In the real version, we would use controlled AI evaluation against an approved reference meaning.</p>
    <button id="viewProgressBtn" class="primary">View Progress</button>
  `;

  document.getElementById("viewProgressBtn").addEventListener("click", () => {
    document.getElementById("finalQuizScore").textContent = `${quizScore} / ${units.length}`;
    renderMastery();
    showScreen("progress");
  });
});

document.getElementById("restartBtn").addEventListener("click", () => {
  cardIndex = 0;
  quizIndex = 0;
  quizScore = 0;
  document.getElementById("masteredCount").textContent = "0";
  document.getElementById("homeLearned").textContent = "0 / 5";
  document.getElementById("homeAyat").textContent = "0";
  document.getElementById("startRevisionBtn").disabled = true;
  showScreen("home");
});
