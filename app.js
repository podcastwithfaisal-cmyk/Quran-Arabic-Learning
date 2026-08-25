const C=window.APP_CONFIG,D=window.APP_DATA;
const sb=supabase.createClient(C.SUPABASE_URL,C.SUPABASE_PUBLISHABLE_KEY);
const allUnits=D.lessons.flatMap(l=>l.units),unitMap=Object.fromEntries(allUnits.map(u=>[u.id,u]));
let session=null,state={mastered:new Set(),completed:new Set(),wordStats:{},ayatAttempts:[]};
let authMode="signin",currentLesson=null,cardIndex=0,quizQueue=[],quizIndex=0,quizHistory=[],lessonRevision=false,currentAyah=null;

const screens={auth:authScreen,dashboard:dashboardScreen,lesson:lessonScreen,revision:revisionScreen,ayatList:ayatListScreen,ayat:ayatScreen};
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
  englishMeaning.textContent=u.english;arabicRoot.textContent=u.root;arabicForm.textContent=u.form;
  formMeaning.textContent=u.formMeaning;unitType.textContent=u.type;cardCounter.textContent=`${cardIndex+1} of ${currentLesson.units.length}`;
  backCardBtn.disabled=cardIndex===0;nextCardBtn.textContent=cardIndex===currentLesson.units.length-1?"Start Revision":"Next";flipCard.classList.remove("flipped");
}

function startRevision(items,isLesson=true){
  lessonRevision=isLesson;quizQueue=shuffle([...items]);quizIndex=0;quizHistory=[];renderQuiz();show("revision")
}
function renderQuiz(){
  const u=quizQueue[quizIndex],prev=quizHistory[quizIndex];
  quizArabic.textContent=u.form;quizSub.textContent=u.root===u.form?u.type:`Root: ${u.root}`;
  quizCounter.textContent=`${quizIndex+1} of ${quizQueue.length}`;quizFeedback.textContent="";
  answerOptions.innerHTML="";
  const options=shuffle([u.english,...shuffle(allUnits.filter(x=>x.id!==u.id).map(x=>x.english)).slice(0,3)]);
  options.forEach(o=>{
    const b=document.createElement("button");b.className="answer-option";b.textContent=o;
    if(prev){b.disabled=true;if(o===u.english)b.classList.add("correct");if(o===prev.answer&&o!==u.english)b.classList.add("wrong")}
    else b.onclick=()=>answerRevision(b,o,u);
    answerOptions.appendChild(b);
  });
  if(prev)quizFeedback.textContent=prev.correct?"Correct.":`Incorrect. Correct answer: ${u.english}`;
  revisionBackBtn.disabled=quizIndex===0;
  revisionNextBtn.disabled=!prev;
  revisionNextBtn.textContent=quizIndex===quizQueue.length-1?"Finish / retry missed":"Next";
}

async function answerRevision(btn,answer,u){
  const correct=answer===u.english;
  await recordWord(u,correct);
  quizHistory[quizIndex]={answer,correct};
  document.querySelectorAll(".answer-option").forEach(b=>{b.disabled=true;if(b.textContent===u.english)b.classList.add("correct")});
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
  if(lessonRevision&&currentLesson){await saveLessonComplete(currentLesson)}
  await loadProgress();renderDashboard();show("dashboard");
}

function renderAyatList(){
  ayatList.innerHTML="";
  unlockedAyat().forEach(a=>{
    const c=document.createElement("div");c.className="ayah-card";
    c.innerHTML=`<strong>Al-Kahf ${a.id}</strong><p class="ayah" dir="rtl">${a.arabic}</p><button class="primary">Start Test</button>`;
    c.querySelector("button").onclick=()=>startAyat(a);ayatList.appendChild(c);
  });
}
function startAyat(a){currentAyah=a;ayatTitle.textContent=`Al-Kahf ${a.id}`;ayatArabic.textContent=a.arabic;translationInput.value="";ayatResult.classList.add("hidden");show("ayat")}
function scoreText(t,a){
  const x=t.toLowerCase(),sets={"18:4":[["warn"],["those"],["said","say"],["allah","god"],["take","taken","adopt"],["son","child"]],"18:3":[["remain","abide"],["therein","in it","there"],["forever","ever"]]}[a.id]||[];
  let m=0;sets.forEach(g=>{if(g.some(w=>x.includes(w)))m++});return sets.length?Math.round(m/sets.length*100):0;
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
  const t=translationInput.value.trim();if(!t)return;
  const s=scoreText(t,currentAyah);
  await sb.from("ayat_attempts").insert({user_id:session.user.id,ayah_id:currentAyah.id,score:s});
  let band="Below 60%",cls="score-orange";if(s>92){band="Green";cls="score-green"}else if(s>80){band="Yellow";cls="score-yellow"}else if(s>60){band="Orange";cls="score-orange"}
  ayatResult.className="ayat-result";ayatResult.innerHTML=`<span class="score-badge ${cls}">${s}% · ${band}</span><p><strong>Reference meaning:</strong> ${currentAyah.reference}</p><p class="muted">Semantic AI grading will replace this simple keyword score later.</p>`;
};

init();