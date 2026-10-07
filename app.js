const BUGS = [
  {
    title:"The Vanishing Total",
    question:"A student enters two marks, but the total is always wrong. Find the bug.",
    code:`int a = 40;
int b = 35;
int total;

total = a - b;
cout << total;`,
    answers:["minus","subtraction","a - b"],
    hint:"Look at the operator used to calculate the total.",
    explanation:"The total uses subtraction. Marks should be added: total = a + b;"
  },
  {
    title:"The Sneaky Loop",
    question:"This loop is supposed to print 1 to 5. What is wrong?",
    code:`for(int i = 1; i < 5; i++) {
    cout << i << " ";
}`,
    answers:["<=","less than","5"],
    hint:"Will the loop ever print 5?",
    explanation:"The condition i < 5 stops before 5. Use i <= 5."
  },
  {
    title:"The Mystery Variable",
    question:"The program refuses to compile. Find the problem.",
    code:`int marks = 80;
cout << mark;`,
    answers:["marks","variable","spelling"],
    hint:"Compare the variable declaration with the variable being printed.",
    explanation:"The declared variable is marks, but the program uses mark."
  },
  {
    title:"The Divide Disaster",
    question:"The average should allow decimal values. What should you consider?",
    code:`int total = 155;
int subjects = 2;
int average;

average = total / subjects;`,
    answers:["integer","float","double","decimal"],
    hint:"What happens when two integers are divided?",
    explanation:"Use float or double when an average may need decimal precision."
  },
  {
    title:"The Infinite Trouble",
    question:"The program gets stuck. Identify the debugging clue.",
    code:`int i = 1;
while(i <= 5) {
    cout << i;
}`,
    answers:["increment","i++","infinite","loop"],
    hint:"What changes the value of i?",
    explanation:"i never changes, so the condition remains true. Add i++ inside the loop."
  }
];

let state = {registerNumber:"", index:0, score:0, answered:false, startedAt:null, attempt:1};

const $ = id => document.getElementById(id);

function show(id){ $(id).classList.remove("hidden"); }
function hide(id){ $(id).classList.add("hidden"); }

function validRegister(value){
  return /^[A-Z0-9-]{4,20}$/.test(value);
}

function renderChallenge(){
  const b = BUGS[state.index];
  $("challengeTitle").textContent = b.title;
  $("challengeQuestion").textContent = b.question;
  $("codeBlock").textContent = b.code;
  $("answer").value = "";
  $("feedback").innerHTML = "";
  $("nextBtn").classList.add("hidden");
  $("checkBtn").disabled = false;
  $("hintBtn").disabled = false;
  state.answered = false;
  $("questionCounter").textContent = `Challenge ${state.index + 1} of ${BUGS.length}`;
  $("progressBar").style.width = `${(state.index / BUGS.length) * 100}%`;
}

function startGame(){
  const reg = $("registerNumber").value.trim().toUpperCase().replace(/\s+/g,"");
  if(!validRegister(reg)){
    $("loginMessage").textContent = "Please enter a valid register number.";
    $("registerNumber").focus();
    return;
  }
  state = {registerNumber:reg,index:0,score:0,answered:false,startedAt:new Date().toISOString(),attempt:1};
  $("studentBadge").textContent = `👨‍💻 ${reg}`;
  $("score").textContent = "0";
  hide("loginScreen"); hide("finishScreen"); hide("teacherScreen"); show("gameScreen");
  renderChallenge();
}

function checkAnswer(){
  if(state.answered) return;
  const answer = $("answer").value.trim().toLowerCase();
  if(!answer){
    $("feedback").innerHTML = `<div class="feedback hint">✏️ Write what you think the bug is first.</div>`;
    return;
  }
  const b = BUGS[state.index];
  const correct = b.answers.some(x => answer.includes(x));
  state.answered = true;
  if(correct){
    state.score++;
    $("score").textContent = state.score;
    $("feedback").innerHTML = `<div class="feedback good">🎉 Nice catch! ${b.explanation}</div>`;
  }else{
    $("feedback").innerHTML = `<div class="feedback bad">🕵️ Not quite. ${b.explanation}</div>`;
  }
  $("checkBtn").disabled = true;
  $("hintBtn").disabled = true;
  $("nextBtn").classList.remove("hidden");
}

async function nextChallenge(){
  if(!state.answered) return;
  state.index++;
  if(state.index < BUGS.length){
    renderChallenge();
  }else{
    await finishGame();
  }
}

async function finishGame(){
  $("progressBar").style.width = "100%";
  hide("gameScreen");
  show("finishScreen");
  $("finalScore").textContent = state.score;
  $("finalMax").textContent = BUGS.length;
  $("finalMessage").textContent =
    state.score >= 4 ? "Excellent debugging instincts! 🧠" :
    state.score >= 3 ? "Good work — keep hunting those bugs! 🔎" :
    "Every bug you found was practice. Debug again and beat your score! 🐞";

  await saveResult({
    register_number:state.registerNumber,
    score:state.score,
    max_score:BUGS.length,
    percentage:Math.round((state.score / BUGS.length) * 100),
    attempt:state.attempt,
    started_at:state.startedAt,
    completed_at:new Date().toISOString()
  });
}

/* ------------------------- STORAGE -------------------------
   Supabase is used when configured.
   Otherwise results are kept locally for testing only.
------------------------------------------------------------ */

function supabaseReady(){
  return typeof CONFIG !== "undefined" &&
    CONFIG.SUPABASE_URL &&
    CONFIG.SUPABASE_ANON_KEY &&
    window.supabaseClient;
}

async function loadSupabase(){
  if(!supabaseReady() && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY){
    try{
      const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
      window.supabaseClient = mod.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY);
    }catch(e){
      console.error("Supabase loading failed",e);
    }
  }
}

async function saveResult(row){
  if(supabaseReady()){
    const {error} = await window.supabaseClient.from("bug_buster_results").insert(row);
    if(error) console.error("Could not save result:",error);
    return;
  }
  const local = JSON.parse(localStorage.getItem("bugBusterResults") || "[]");
  local.push(row);
  localStorage.setItem("bugBusterResults",JSON.stringify(local));
}

function getLocalResults(){
  return JSON.parse(localStorage.getItem("bugBusterResults") || "[]");
}

async function getResults(){
  if(supabaseReady()){
    const {data,error} = await window.supabaseClient
      .from("bug_buster_results")
      .select("*")
      .order("completed_at",{ascending:false});
    if(!error) return data || [];
    console.error(error);
  }
  return getLocalResults();
}

function renderMarks(rows){
  const body = $("marksBody");
  body.innerHTML = "";
  if(!rows.length){
    body.innerHTML = `<tr><td colspan="6">No results yet.</td></tr>`;
    return;
  }
  rows.forEach(r=>{
    const tr = document.createElement("tr");
    const date = r.completed_at ? new Date(r.completed_at).toLocaleString() : "";
    [r.register_number,r.score,r.max_score,r.percentage + "%",r.attempt,date]
      .forEach(v=>{const td=document.createElement("td");td.textContent=v ?? "";tr.appendChild(td);});
    body.appendChild(tr);
  });
}

async function loadDashboard(){
  $("dashboardMessage").textContent = "Loading results...";
  const rows = await getResults();
  window.currentResults = rows;
  renderMarks(rows);
  $("dashboardMessage").textContent =
    supabaseReady() ? `${rows.length} result(s) loaded from Supabase.` :
    "Demo mode: results are stored only in this browser. Configure Supabase for online storage.";
}

function csvEscape(value){
  const s = String(value ?? "");
  return `"${s.replace(/"/g,'""')}"`;
}

function downloadCSV(){
  const rows = window.currentResults || [];
  const headers = ["Register Number","Score","Max Score","Percentage","Attempt","Date"];
  const lines = [headers.join(",")];
  rows.forEach(r=>{
    lines.push([
      r.register_number,r.score,r.max_score,r.percentage,r.attempt,
      r.completed_at ? new Date(r.completed_at).toLocaleString() : ""
    ].map(csvEscape).join(","));
  });
  const blob = new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bug-buster-marks.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function openTeacher(){
  hide("loginScreen"); hide("gameScreen"); hide("finishScreen"); show("teacherScreen");
  $("teacherLogin").classList.remove("hidden");
  $("dashboard").classList.add("hidden");
  $("teacherPassword").value = "";
  $("teacherMessage").textContent = "";
}

async function teacherLogin(){
  const expected = CONFIG.TEACHER_ACCESS_CODE || "CHANGE-ME";
  if($("teacherPassword").value !== expected){
    $("teacherMessage").textContent = "Incorrect access code.";
    return;
  }
  $("teacherLogin").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  await loadDashboard();
}

function backToStart(){
  hide("teacherScreen"); hide("finishScreen"); hide("gameScreen"); show("loginScreen");
}

$("startBtn").addEventListener("click",startGame);
$("checkBtn").addEventListener("click",checkAnswer);
$("nextBtn").addEventListener("click",nextChallenge);
$("hintBtn").addEventListener("click",()=>{
  if(!state.answered){
    $("feedback").innerHTML = `<div class="feedback hint">💡 ${BUGS[state.index].hint}</div>`;
  }
});
$("playAgainBtn").addEventListener("click",startGame);
$("teacherBtn").addEventListener("click",openTeacher);
$("teacherLoginBtn").addEventListener("click",teacherLogin);
$("refreshBtn").addEventListener("click",loadDashboard);
$("downloadBtn").addEventListener("click",downloadCSV);
$("backBtn").addEventListener("click",backToStart);
$("registerNumber").addEventListener("keydown",e=>{if(e.key==="Enter")startGame();});
$("teacherPassword").addEventListener("keydown",e=>{if(e.key==="Enter")teacherLogin();});

loadSupabase();
