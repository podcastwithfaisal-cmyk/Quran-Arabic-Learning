const C=window.APP_CONFIG,D=window.APP_DATA;
const sb=supabase.createClient(C.SUPABASE_URL,C.SUPABASE_PUBLISHABLE_KEY);
const allUnits=D.lessons.flatMap(l=>l.units),unitMap=Object.fromEntries(allUnits.map(u=>[u.id,u]));
const ROOT_MEANING_OVERRIDES={
  qwl_qala:"say / speak",qwl_qul:"say / speak",kwn_kana:"be / exist",
  satajiduni_future:"find",wjd:"find",sa_future:"future marker",ni_suffix:"me",
  my_suffix_future:"my",midada:"extend / supply",lanafida:"run out / be exhausted",
  walaw:"if / even if",taqulanna:"say / speak",inni:"indeed / certainly",
  blagha_dual:"reach",nasiya_dual:"forget",hutahuma:"fish",
  fatahu:"youth / young person",ma:"what / that which",
  na_suffix:"our / us",hu_suffix:"him / his / it",huma_suffix:"their / them both",
  ka_suffix:"your / you",li:"for / to",lam:"for / to",bi:"with / by",
  wa:"and",fa:"then / so",an:"that / to",in:"if",law:"if / even if",
  illa:"except / unless",idha:"when",idh:"when",dhalika:"that",hadha:"this"
};

const GRAMMAR_NOTES={
  qwl:"3+ males / masculine or mixed group",
  akh:"singular masculine · past tense",
  ndhr:"singular masculine · present/subjunctive form",
  wld:"singular noun",
  alladhina:"plural masculine · 3 or more",
  hu:"singular masculine attached pronoun",
  mkth:"masculine plural · 3 or more",
  rbb:"singular noun",
  kwn:"singular masculine · past tense",
  jal:"singular masculine · past tense",
  aty:"command to one male + “us” object",
  shaa:"singular masculine · past tense",
  sbr:"singular masculine description",
  qwl_qala:"one male · he said",
  qwl_qul:"command to one male · say!",
  kwn_kana:"one male / masculine singular · was",
  na_suffix:"first-person plural · our / us",
  hu_suffix:"third-person masculine singular · him / his / it",
  awy:"verb form is singular masculine; plural subject follows in the ayah",
  ftya:"masculine plural noun · youths",
  amr:"singular noun",
  satajiduni_future:"you = one male; future tense; “me” attached",
  asi_future:"I = first-person singular",
  sa_future:"future prefix",
  ni_suffix:"first-person singular object · me",
  my_suffix_future:"first-person singular possessive · my",
  jia:"first-person plural · We came/brought",
  taqulanna:"you = one male · emphatic present form",
  inni:"first-person singular · indeed I",
  fail:"singular masculine active participle",
  nsy:"you = one male · past tense",
  hdy:"He = singular masculine; “me” attached",
  blgh:"singular masculine · past tense",
  blagha_dual:"dual · exactly two people/things",
  huma_suffix:"dual pronoun · exactly two",
  nasiya_dual:"dual · exactly two",
  hutahuma:"their = exactly two",
  musa:"proper name",
  fatahu:"singular masculine noun + “his”",
  bny:"masculine plural noun · sons/children",
  klm:"feminine plural noun",
  fi:"preposition + singular masculine pronoun in فِيهِ",
  amn:"3+ people · past tense",qam:"3+ people · past tense",dua:"first-person plural · we",
  bd:"3+ people · present tense",fawa:"command to a group",ayqz:"masculine plural",
  klb:"singular noun + their",dhr:"dual · exactly two forelegs",itl:"you = one male",
  wly_turn:"you = one male",bth:"We = first-person plural",labth:"you = group",
  wrq:"your = group",ltf:"command / instruction to one male",shr:"emphatic form",
  zhr:"they = 3+ people",rjm:"they = 3+ people; you = group",awd:"they = 3+ people; you = group",
  flh:"you = group",athr:"We = first-person plural",bnyn:"command to a group",
  mra:"you = one male",stft:"you = one male",tlw:"command to one male",
  sbr_nafs:"command to one male",ayn:"dual · exactly two eyes",ryd:"you = one male",
  ghfl:"We = first-person plural",fal:"third-person singular instruction",kfr:"third-person singular instruction",
  ghwth:"they = 3+ people",aml:"they = 3+ people · past tense",jry:"feminine singular verb agreeing with rivers",
  rjl:"dual · exactly two men",hff:"We = first-person plural; them = exactly two",
  klta:"dual · exactly two",fjr:"We = first-person plural",hwr:"he = one male; him = one male",
  dkl:"one male · past tense",azn:"I = first-person singular",rdd:"I = first-person singular passive"

};

function isNonRootUnit(u){
  return /Particle|Pronoun|Preposition|Conjunction|Grammar pattern|Time particle|Demonstrative|Proper noun/i.test(u.type||"");
}
function actualMeaning(u){
  return u.wordMeaning || u.formMeaning || u.english;
}
function rootMeaning(u){
  if(ROOT_MEANING_OVERRIDES[u.id]) return ROOT_MEANING_OVERRIDES[u.id];
  if(isNonRootUnit(u)) return `No separate lexical root — ${u.english}`;
  return u.rootMeaning || u.english;
}
function grammarNote(u){
  return GRAMMAR_NOTES[u.id] || "";
}
function quizMeanings(){
  return [...new Set(allUnits.map(actualMeaning))];
}

let session=null,state={mastered:new Set(),completed:new Set(),wordStats:{},ayatAttempts:[]};
let authMode="signin",currentLesson=null,cardIndex=0,quizQueue=[],quizIndex=0,quizHistory=[],lessonRevision=false,currentAyah=null;

const screens={auth:authScreen,dashboard:dashboardScreen,lesson:lessonScreen,revision:revisionScreen,lessonComplete:lessonCompleteScreen,ayatList:ayatListScreen,ayat:ayatScreen};
function show(name){Object.values(screens).forEach(x=>x.classList.remove("active"));screens[name].classList.add("active");window.scrollTo({top:0})}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function unlockedAyat(){return D.ayat.filter(a=>a.required.every(id=>state.mastered.has(id)))}
function nextLesson(){return D.lessons.find(l=>!state.completed.has(l.id))||null}

async function init(){
  if(C.SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")){
    show("auth");
    authMessage.textContent="Add your Supabase publishable key to config.js before using this build.";
    return;
  }
  const {data}=await sb.auth.getSession();
  session=data.session;
  if(session){await loadProgress();show("dashboard");renderDashboard()}else show("auth");
}
sb.auth.onAuthStateChange(async(_e,s)=>{session=s;if(s){await loadProgress();show("dashboard");renderDashboard()}else{show("auth");renderUser()}});

function renderUser(){
  userArea.innerHTML="";
  if(!session)return;
  const span=document.createElement("span");span.textContent=session.user.email;span.className="muted";
  const b=document.createElement("button");b.textContent="Sign out";b.className="secondary";b.onclick=()=>sb.auth.signOut();
  userArea.append(span,b);
}

async function loadProgress(){
  state={mastered:new Set(),completed:new Set(),wordStats:{},ayatAttempts:[]};
  const [{data:lessons},{data:words},{data:ayat}]=await Promise.all([
    sb.from("lesson_progress").select("*"),
    sb.from("word_progress").select("*"),
    sb.from("ayat_attempts").select("*").order("attempted_at",{ascending:false})
  ]);
  (lessons||[]).filter(x=>x.completed).forEach(x=>state.completed.add(x.lesson_id));
  (words||[]).forEach(x=>{state.wordStats[x.unit_id]=x;if(x.mastered)state.mastered.add(x.unit_id)});
  state.ayatAttempts=ayat||[];
  renderUser();
}


function masteredUnits(){
  return [...state.mastered].map(id=>unitMap[id]).filter(Boolean);
}

function countsForUnitIds(ids){
  const units=ids.map(id=>unitMap[id]).filter(Boolean);

  const forms=new Set();
  const roots=new Set();

  units.forEach(u=>{
    if((u.type||"").toLowerCase().includes("grammar pattern")) return;

    if(u.form && u.form.trim()){
      forms.add(u.form.trim());
    }

    if(!isNonRootUnit(u) && u.root && u.root.trim()){
      roots.add(u.root.trim());
    }
  });

  return {
    forms:forms.size,
    roots:roots.size,
    rootSet:roots
  };
}

function learnerTotals(){
  return countsForUnitIds([...state.mastered]);
}

function lessonProgressGain(lesson,beforeMasteredIds){
  const before=countsForUnitIds(beforeMasteredIds);
  const afterIds=[...new Set([...beforeMasteredIds,...lesson.units.map(u=>u.id)])];
  const after=countsForUnitIds(afterIds);

  const lessonForms=new Set();
  lesson.units.forEach(u=>{
    if(!(u.type||"").toLowerCase().includes("grammar pattern") && u.form){
      lessonForms.add(u.form.trim());
    }
  });

  return {
    formsAdded:lessonForms.size,
    newRoots:Math.max(0,after.roots-before.roots)
  };
}

function newlyUnlockedAyat(beforeMasteredIds){
  const before=new Set(beforeMasteredIds);
  const beforeUnlocked=new Set(
    D.ayat.filter(a=>a.required.every(id=>before.has(id))).map(a=>a.id)
  );
  return unlockedAyat().filter(a=>!beforeUnlocked.has(a.id));
}

function showLessonComplete(lesson,beforeMasteredIds){
  const totals=learnerTotals();
  const gain=lessonProgressGain(lesson,beforeMasteredIds);
  const newAyat=newlyUnlockedAyat(beforeMasteredIds);

  completeLessonTitle.textContent=`${lesson.title} complete ✓`;
  completeFormsTotal.textContent=totals.forms;
  completeRootsTotal.textContent=totals.roots;
  completeLessonGain.textContent=`+${gain.formsAdded} forms · +${gain.newRoots} new root ${gain.newRoots===1?"family":"families"}`;

  completionAyatBtn.classList.add("hidden");
  newAyahNotice.classList.add("hidden");
  completionAyatBtn.onclick=null;

  if(newAyat.length){
    const ayah=newAyat[0];
    newAyahNotice.classList.remove("hidden");
    newAyahNotice.innerHTML=`<strong>New ayah unlocked:</strong> Al-Kahf ${ayah.id}`;
    completionAyatBtn.classList.remove("hidden");
    completionAyatBtn.textContent=newAyat.length>1
      ? `Try an Ayat Test (${newAyat.length} unlocked)`
      : "Try Ayat Test";
    completionAyatBtn.onclick=()=>{
      if(newAyat.length===1){
        startAyat(ayah);
      }else{
        renderAyatList();
        show("ayatList");
      }
    };
  }

  show("lessonComplete");
}

async function saveLessonComplete(lesson){
  const uid=session.user.id;
  await sb.from("lesson_progress").upsert({user_id:uid,lesson_id:lesson.id,completed:true,completed_at:new Date().toISOString()});
  state.completed.add(lesson.id);
  for(const u of lesson.units){
    const s=state.wordStats[u.id]||{correct_count:0,wrong_count:0,streak:0};
    const row={user_id:uid,unit_id:u.id,correct_count:s.correct_count||0,wrong_count:s.wrong_count||0,streak:s.streak||0,mastered:true,last_attempt_at:s.last_attempt_at||new Date().toISOString()};
    await sb.from("word_progress").upsert(row);
    state.wordStats[u.id]=row;
    state.mastered.add(u.id);
  }
}

async function recordWord(u,correct){
  const cur=state.wordStats[u.id]||{correct_count:0,wrong_count:0,streak:0};
  const next={
    user_id:session.user.id,unit_id:u.id,
    correct_count:(cur.correct_count||0)+(correct?1:0),
    wrong_count:(cur.wrong_count||0)+(correct?0:1),
    streak:correct?(cur.streak||0)+1:0,
    mastered:state.mastered.has(u.id),
    last_attempt_at:new Date().toISOString()
  };
  await sb.from("word_progress").upsert(next);
  state.wordStats[u.id]=next;
}

function renderDashboard(){
  statKnown.textContent=`${state.mastered.size} / ${allUnits.length}`;
  statLessons.textContent=`${state.completed.size} / ${D.lessons.length}`;
  statAyat.textContent=unlockedAyat().length;

  const nl=nextLesson();
  continueBtn.textContent=nl?`Start ${nl.title}`:"All lessons complete";
  continueBtn.disabled=!nl;
  revisionBtn.disabled=state.mastered.size===0;
  ayatTestsBtn.disabled=unlockedAyat().length===0;

  lessonList.innerHTML="";

  const pending=D.lessons.filter(l=>!state.completed.has(l.id));
  const completed=D.lessons.filter(l=>state.completed.has(l.id));

  const pendingHeading=document.createElement("div");
  pendingHeading.className="lesson-section-heading";
  pendingHeading.innerHTML=`<strong>Pending lessons</strong><span>${pending.length}</span>`;
  lessonList.appendChild(pendingHeading);

  pending.forEach(l=>{
    const locked=l.id>1&&!state.completed.has(l.id-1);
    const row=document.createElement("div");
    row.className="lesson-row";
    row.innerHTML=`<div><strong>${l.title}</strong><div class="muted">${l.subtitle}</div></div><div class="lesson-actions"></div>`;

    const actions=row.querySelector(".lesson-actions");
    const button=document.createElement("button");
    button.className=locked?"secondary":"primary";
    button.textContent=locked?"Locked":"Start";
    button.disabled=locked;
    button.onclick=()=>startLesson(l);
    actions.appendChild(button);

    lessonList.appendChild(row);
  });

  if(completed.length){
    const details=document.createElement("details");
    details.className="completed-lessons";

    const summary=document.createElement("summary");
    summary.innerHTML=`<span>Completed lessons</span><span>${completed.length}</span>`;
    details.appendChild(summary);

    const completedList=document.createElement("div");
    completedList.className="completed-lessons-list";

    completed.forEach(l=>{
      const row=document.createElement("div");
      row.className="lesson-row complete";
      row.innerHTML=`<div><strong>${l.title}</strong><div class="muted">${l.subtitle}</div></div><div class="lesson-actions"></div>`;

      const actions=row.querySelector(".lesson-actions");

      const redo=document.createElement("button");
      redo.className="secondary";
      redo.textContent="Redo";
      redo.onclick=()=>startLesson(l);

      const revise=document.createElement("button");
      revise.className="secondary";
      revise.textContent="Revise";
      revise.onclick=()=>startRevision(l.units,false);

      actions.append(redo,revise);
      completedList.appendChild(row);
    });

    details.appendChild(completedList);
    lessonList.appendChild(details);
  }
}

function startLesson(l){currentLesson=l;cardIndex=0;lessonTitle.textContent=l.title;lessonSubtitle.textContent=l.subtitle;renderCard();show("lesson")}
function renderCard(){
  const u=currentLesson.units[cardIndex];

  englishMeaning.textContent=actualMeaning(u);
  rootMeaningFront.textContent=rootMeaning(u);
  grammarInfoFront.textContent=grammarNote(u);

  arabicForm.textContent=u.form;
  arabicRoot.textContent=u.root;
  rootMeaningBack.textContent=`Root meaning: ${rootMeaning(u)}`;
  grammarInfoBack.textContent=grammarNote(u);
  unitType.textContent=u.type;

  cardCounter.textContent=`${cardIndex+1} of ${currentLesson.units.length}`;
  backCardBtn.disabled=cardIndex===0;
  nextCardBtn.textContent=cardIndex===currentLesson.units.length-1?"Start Revision":"Next";
  flipCard.classList.remove("flipped");
}

function startRevision(items,isLesson=true){
  lessonRevision=isLesson;quizQueue=shuffle([...items]);quizIndex=0;quizHistory=[];renderQuiz();show("revision")
}
function renderQuiz(){
  const u=quizQueue[quizIndex],prev=quizHistory[quizIndex];
  const correctMeaning=actualMeaning(u);

  quizArabic.textContent=u.form;
  const grammar=grammarNote(u);
  quizSub.textContent=grammar
    ? `${grammar} · Root: ${u.root} (${rootMeaning(u)})`
    : `Root: ${u.root} · ${rootMeaning(u)}`;

  quizCounter.textContent=`${quizIndex+1} of ${quizQueue.length}`;
  quizFeedback.textContent="";
  answerOptions.innerHTML="";

  const pool=quizMeanings().filter(x=>x!==correctMeaning);
  const options=shuffle([correctMeaning,...shuffle(pool).slice(0,3)]);

  options.forEach(o=>{
    const b=document.createElement("button");
    b.className="answer-option";
    b.textContent=o;

    if(prev){
      b.disabled=true;
      if(o===correctMeaning)b.classList.add("correct");
      if(o===prev.answer&&o!==correctMeaning)b.classList.add("wrong");
    }else{
      b.onclick=()=>answerRevision(b,o,u);
    }
    answerOptions.appendChild(b);
  });

  if(prev){
    quizFeedback.textContent=prev.correct
      ?"Correct."
      :`Incorrect. Correct answer: ${correctMeaning}`;
  }

  revisionBackBtn.disabled=quizIndex===0;
  revisionNextBtn.disabled=!prev;
  revisionNextBtn.textContent=quizIndex===quizQueue.length-1?"Finish / retry missed":"Next";
}

async function answerRevision(btn,answer,u){
  const correctMeaning=actualMeaning(u);
  const correct=answer===correctMeaning;
  await recordWord(u,correct);
  quizHistory[quizIndex]={answer,correct};
  document.querySelectorAll(".answer-option").forEach(b=>{b.disabled=true;if(b.textContent===correctMeaning)b.classList.add("correct")});
  if(!correct)btn.classList.add("wrong");
  quizFeedback.textContent=correct?"Correct.":`Incorrect. Correct answer: ${u.english}`;
  revisionNextBtn.disabled=false;
}

async function nextRevision(){
  if(quizIndex<quizQueue.length-1){quizIndex++;renderQuiz();return}
  const missed=quizHistory.map((h,i)=>h&&!h.correct?quizQueue[i]:null).filter(Boolean);
  if(missed.length){
    quizQueue=shuffle(missed);quizIndex=0;quizHistory=[];renderQuiz();return;
  }
  if(lessonRevision&&currentLesson){
    const beforeMasteredIds=[...state.mastered];
    const completedLesson=currentLesson;

    await saveLessonComplete(completedLesson);
    await loadProgress();
    renderDashboard();
    showLessonComplete(completedLesson,beforeMasteredIds);
    return;
  }

  await loadProgress();
  renderDashboard();
  show("dashboard");
}

function getAyatProgress(ayahId){
  const attempts=state.ayatAttempts.filter(x=>x.ayah_id===ayahId);
  if(!attempts.length){
    return {attempted:false,passed:false,bestScore:null,attemptCount:0};
  }

  const bestScore=Math.max(...attempts.map(x=>Number(x.score)||0));

  return {
    attempted:true,
    passed:bestScore>=60,
    bestScore,
    attemptCount:attempts.length
  };
}

function relatedLessonsForAyah(ayah){
  const required=new Set(ayah.required||[]);
  return D.lessons.filter(lesson=>lesson.units.some(unit=>required.has(unit.id)));
}

function showRelatedLessons(ayah){
  const lessons=relatedLessonsForAyah(ayah);

  ayatList.innerHTML="";

  const header=document.createElement("div");
  header.className="ayah-card";
  header.innerHTML=`
    <strong>Al-Kahf ${ayah.id}</strong>
    <p class="muted">Review the lessons that taught vocabulary or grammar used in this ayah.</p>
    <button class="secondary back-to-ayat">← Back to Ayat Tests</button>
  `;
  header.querySelector(".back-to-ayat").onclick=renderAyatList;
  ayatList.appendChild(header);

  lessons.forEach(lesson=>{
    const row=document.createElement("div");
    row.className="lesson-row";
    row.innerHTML=`
      <div>
        <strong>${lesson.title}</strong>
        <div class="muted">${lesson.subtitle}</div>
      </div>
      <div class="lesson-actions"></div>
    `;

    const actions=row.querySelector(".lesson-actions");

    const revise=document.createElement("button");
    revise.className="secondary";
    revise.textContent="Revise";
    revise.onclick=()=>startRevision(lesson.units,false);

    const redo=document.createElement("button");
    redo.className="secondary";
    redo.textContent="Redo";
    redo.onclick=()=>startLesson(lesson);

    actions.append(revise,redo);
    ayatList.appendChild(row);
  });
}

function renderAyatList(){
  ayatList.innerHTML="";

  unlockedAyat().forEach(a=>{
    const progress=getAyatProgress(a.id);
    const c=document.createElement("div");
    c.className="ayah-card";

    let status="";
    if(progress.passed){
      status=`<p><strong>✓ Passed</strong> · Best score ${progress.bestScore}%</p>`;
    }else if(progress.attempted){
      status=`<p><strong>Not passed yet</strong> · Best score ${progress.bestScore}%</p>`;
    }

    c.innerHTML=`
      <strong>Al-Kahf ${a.id}</strong>
      ${status}
      <p class="ayah" dir="rtl">${a.arabic}</p>
      <div class="ayat-actions">
        <button class="primary test-button">${progress.attempted?"Redo Test":"Start Test"}</button>
        <button class="secondary review-button">Review Related Lessons</button>
      </div>
    `;

    c.querySelector(".test-button").onclick=()=>startAyat(a);
    c.querySelector(".review-button").onclick=()=>showRelatedLessons(a);
    ayatList.appendChild(c);
  });
}
function startAyat(a){currentAyah=a;ayatTitle.textContent=`Al-Kahf ${a.id}`;ayatArabic.textContent=a.arabic;translationInput.value="";ayatResult.classList.add("hidden");show("ayat")}
function normaliseAnswer(text){
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu," ")
    .replace(/\s+/g," ")
    .trim();
}

function phraseMatched(text, alternatives){
  return alternatives.some(phrase=>text.includes(phrase));
}

function scoreText(text,ayah){
  const t=normaliseAnswer(text);

  const rubrics={
    "18:4":[
      {label:"warn",alts:["warn","warning"]},
      {label:"those who",alts:["those who","those"]},
      {label:"said",alts:["said","say","saying"]},
      {label:"Allah",alts:["allah","god"]},
      {label:"has taken / adopted",alts:["has taken","taken","take","adopted","adopt"]},
      {label:"a son / child",alts:["son","child","offspring"]}
    ],
    "18:3":[
      {label:"remaining / abiding",alts:["remain","remaining","abide","abiding","stay","staying"]},
      {label:"therein / in it",alts:["therein","in it","there"]},
      {label:"forever",alts:["forever","ever","eternally"]}
    ],
    "18:23":[
      {label:"do not say",alts:["do not say","don't say","never say","must not say"]},
      {label:"about anything",alts:["anything","something","a thing"]},
      {label:"I will do that",alts:["i will do that","i'll do that","i will do it","i shall do that"]},
      {label:"tomorrow",alts:["tomorrow"]}
    ],
    "18:24":[
      {label:"except / unless",alts:["except","unless"]},
      {label:"if Allah wills",alts:["if allah wills","allah wills","god wills","if god wills"]},
      {label:"remember your Lord",alts:["remember your lord","remember lord","remember god"]},
      {label:"when you forget",alts:["when you forget","if you forget","when forget"]},
      {label:"say",alts:["say","and say","then say"]},
      {label:"perhaps my Lord",alts:["perhaps my lord","maybe my lord","may my lord","perhaps god"]},
      {label:"will guide me",alts:["will guide me","guide me","may guide me"]},
      {label:"nearer / closer than this",alts:["nearer than this","closer than this","nearer","closer"]},
      {label:"right guidance / right conduct",alts:["right guidance","right conduct","right course","guidance","righteous","right way"]}
    ],
    "18:61":[
      {label:"when they reached",alts:["when they reached","they reached"]},
      {label:"the junction / meeting place",alts:["junction","meeting place","meeting point"]},
      {label:"they forgot",alts:["they forgot","forgot"]},
      {label:"their fish",alts:["their fish","the fish"]},
      {label:"it took its way",alts:["took its way","made its way","went its way","took a path"]},
      {label:"into the sea",alts:["into the sea","in the sea","sea"]},
      {label:"slipping / tunnelling away",alts:["slipping away","tunnel","tunnelling","tunneling","slipped away"]}
    ],
    "18:10":[
      {label:"the youths",alts:["youths","young men","young people"]},
      {label:"sought refuge / retreated",alts:["sought refuge","took refuge","retreated","withdrew"]},
      {label:"the cave",alts:["cave"]},
      {label:"our Lord",alts:["our lord","lord"]},
      {label:"grant us mercy",alts:["grant us mercy","give us mercy","mercy"]},
      {label:"from Yourself",alts:["from yourself","from you"]},
      {label:"prepare / facilitate",alts:["prepare","facilitate","make easy"]},
      {label:"our affair",alts:["our affair","our matter"]},
      {label:"right guidance",alts:["right guidance","right conduct","right course","guidance"]}
    ],
    "18:69":[
      {label:"he said",alts:["he said","said"]},
      {label:"you will find me",alts:["you will find me","find me"]},
      {label:"if Allah wills",alts:["if allah wills","allah wills","god willing","if god wills"]},
      {label:"patient",alts:["patient","patience"]},
      {label:"I will not disobey you",alts:["not disobey you","will not disobey","won't disobey","do not disobey"]},
      {label:"in any command / matter",alts:["command","matter","instruction"]}
    ],
    "18:109":[
      {label:"say",alts:["say","tell"]},
      {label:"if the sea were ink",alts:["sea were ink","sea was ink","sea as ink"]},
      {label:"for the words of my Lord",alts:["words of my lord","words of the lord","lord's words"]},
      {label:"the sea would run out",alts:["sea would run out","sea ran out","sea be exhausted","sea exhausted"]},
      {label:"before the words run out",alts:["before the words","before his words","before the words run out","before the words are exhausted"]},
      {label:"even if We brought",alts:["even if we brought","if we brought","even were we to bring"]},
      {label:"the like of it / its equal",alts:["like of it","its equal","similar amount","another like it"]},
      {label:"additional supply",alts:["additional supply","more supply","reinforcement","extra"]}
    ]
  };

  const concepts=rubrics[ayah.id]||[];
  if(!concepts.length) return {score:0,matched:[],missing:[]};

  const matched=[],missing=[];
  concepts.forEach(c=>{
    if(phraseMatched(t,c.alts)) matched.push(c.label);
    else missing.push(c.label);
  });

  const score=Math.round((matched.length/concepts.length)*100);
  return {score,matched,missing};
}

function feedbackText(result){
  const parts=[];
  if(result.matched.length){
    parts.push(`<p><strong>You captured:</strong> ${result.matched.join(", ")}.</p>`);
  }
  if(result.missing.length){
    parts.push(`<p><strong>Review:</strong> ${result.missing.join(", ")}.</p>`);
  }
  return parts.join("");
}

showSignIn.onclick=()=>{authMode="signin";authSubmit.textContent="Sign in";showSignIn.classList.add("active-tab");showSignUp.classList.remove("active-tab");authMessage.textContent=""}
showSignUp.onclick=()=>{authMode="signup";authSubmit.textContent="Create account";showSignUp.classList.add("active-tab");showSignIn.classList.remove("active-tab");authMessage.textContent=""}
authForm.onsubmit=async e=>{
  e.preventDefault();authMessage.textContent="";
  const email=emailInput.value.trim(),password=passwordInput.value;
  if(authMode==="signup"){
    const {error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:"https://quran-arabic-learning.pages.dev"}});
    authMessage.textContent=error?error.message:"Account created. Check your email to confirm your address.";
  }else{
    const {error}=await sb.auth.signInWithPassword({email,password});
    authMessage.textContent=error?error.message:"";
  }
};

continueBtn.onclick=()=>{const l=nextLesson();if(l)startLesson(l)};
revisionBtn.onclick=()=>startRevision(shuffle([...state.mastered].map(id=>unitMap[id])).slice(0,10),false);
ayatTestsBtn.onclick=()=>{renderAyatList();show("ayatList")};
flipCard.onclick=()=>flipCard.classList.toggle("flipped");
backCardBtn.onclick=()=>{if(cardIndex>0){cardIndex--;renderCard()}};
nextCardBtn.onclick=()=>{if(cardIndex<currentLesson.units.length-1){cardIndex++;renderCard()}else startRevision(currentLesson.units,true)};
revisionBackBtn.onclick=()=>{if(quizIndex>0){quizIndex--;renderQuiz()}};
revisionNextBtn.onclick=nextRevision;
backDashboard.onclick=()=>show("dashboard");
backAyatList.onclick=()=>{renderAyatList();show("ayatList")};
checkAyatBtn.onclick=async()=>{
  const t=translationInput.value.trim();
  if(!t){
    ayatResult.className="ayat-result";
    ayatResult.textContent="Enter your understanding of the ayah first.";
    return;
  }

  const result=scoreText(t,currentAyah);
  const s=result.score;

  const attemptedAt=new Date().toISOString();

  const {data:savedAttempt,error:saveError}=await sb
    .from("ayat_attempts")
    .insert({
      user_id:session.user.id,
      ayah_id:currentAyah.id,
      score:s,
      attempted_at:attemptedAt
    })
    .select()
    .single();

  if(!saveError){
    state.ayatAttempts.unshift(
      savedAttempt || {
        user_id:session.user.id,
        ayah_id:currentAyah.id,
        score:s,
        attempted_at:attemptedAt
      }
    );
  }

  let band="Below 60%",cls="score-orange";
  if(s>92){band="Green";cls="score-green"}
  else if(s>80){band="Yellow";cls="score-yellow"}
  else if(s>60){band="Orange";cls="score-orange"}

  const passMessage=s>=60
    ? `<p><strong>✓ Ayah passed.</strong> This result is saved to your account.</p>`
    : `<p><strong>Not passed yet.</strong> Score 60% or higher to mark this ayah as passed.</p>`;

  ayatResult.className="ayat-result";
  ayatResult.innerHTML=`
    <span class="score-badge ${cls}">${s}% · ${band}</span>
    ${passMessage}
    ${feedbackText(result)}
    <p><strong>Reference meaning:</strong> ${currentAyah.reference}</p>
    <p class="muted">Your attempt is saved. The app remembers your best score, and a later lower score will not remove a previous pass.</p>
  `;
};


lessonExitBtn.onclick=()=>{
  renderDashboard();
  show("dashboard");
};
revisionExitBtn.onclick=()=>{
  renderDashboard();
  show("dashboard");
};

completionDashboardBtn.onclick=()=>{renderDashboard();show("dashboard");};

init();