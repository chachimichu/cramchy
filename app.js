
(function(){

/* ===================== DATA ===================== */
const EXAMS = [
  {id:'anatomy', name:'Human Anatomy', start:'2026-09-07T11:00:00+08:00', end:'2026-09-07T13:00:00+08:00', room:'523'},
  {id:'edtech', name:'Educational Technology', start:'2026-09-08T13:00:00+08:00', end:'2026-09-08T15:00:00+08:00', room:'806'},
  {id:'teaching', name:'Principle of Teaching', start:'2026-09-08T17:00:00+08:00', end:'2026-09-08T19:00:00+08:00', room:'603'},
  {id:'cogpsych', name:'Cognitive Psychology', start:'2026-09-05T11:00:00+08:00', end:'2026-09-05T13:00:00+08:00', room:'609'},
  {id:'field', name:'Field Methods in Psychology', start:'2026-09-05T16:00:00+08:00', end:'2026-09-05T18:00:00+08:00', room:'609'}
];
const SUBJECT_ORDER = ['anatomy','edtech','teaching','cogpsych','field'];
const SUBJECT_NAME = {};
EXAMS.forEach(e => SUBJECT_NAME[e.id] = e.name);
const EXAM_BY_ID = {};
EXAMS.forEach(e => EXAM_BY_ID[e.id] = e);

const MOTIVATIONS = [
  "Studying doesn't suck as much as failing.",
  "Don't cry when seeing your results; it was your choice and you chose not to study.",
  "Your maximum is someone else's minimum. Go study.",
  "I thought you wanted to prove that you're the best?",
  "You said you wanted to be the best. Act like it.",
  "Someone is studying while you're scrolling. Guess who gets the score?",
  "Your competition doesn't care that you're tired.",
  "You don't get to want Rank 1 and study like you're okay with Rank 3.",
  "You wanted to prove them wrong. Here's your chance.",
  "You can't complain about being overlooked when you're not giving them anything to notice.",
  "The score you're praying for is hiding inside the hours you're wasting.",
  "You know you're capable of more. That's exactly why you're not allowed to settle.",
  "Someone with less talent but better discipline is already ahead of you.",
  "Your potential means nothing if you keep choosing comfort.",
  "You're not competing with their intelligence. You're competing with their consistency.",
  "Future you will either thank you for tonight or wonder why you gave up so easily.",
  "Imagine meeting future you in 2029 and having to explain why you didn't try.",
  "She got where you wanted to be because she did what you kept postponing.",
  "Your future degree won't care how unmotivated you felt tonight.",
  "The woman you want to become is built during the hours nobody sees.",
  "You keep saying \"future psychologist.\" Start studying like one.",
  "You don't become exceptional by occasionally feeling motivated.",
  "Your future self deserves better than your excuses.",
  "Don't cry over a score you were unwilling to prepare for.",
  "You can't manifest a perfect score. You have to earn it.",
  "The exam doesn't care how badly you wanted 100.",
  "You had the time. You chose your distractions. Remember that when the results come out.",
  "Every question you can't answer tomorrow has a reason you ignored tonight.",
  "Don't ask why they scored higher. Ask how badly they wanted it.",
  "A perfect score starts long before the test paper reaches your desk.",
  "You don't need luck. You need preparation.",
  "Stop hoping the exam is easy. Become prepared enough that it doesn't matter."
];

const HANABI_MESSAGES = [
  "hanabi brought the book. your turn ♡",
  "hanabi says one more page.",
  "tail wag = she approves. keep studying.",
  "hanabi is waiting for you to finish that topic.",
  "study buddy reporting for duty.",
  "hanabi says you can do one more."
];

const KENKEN_MESSAGES = [
  "kenken popped up to check on you ♡",
  "kenken says keep going.",
  "tiny peek of encouragement.",
  "one more topic and kenken approves.",
  "kenken is watching your progress.",
  "hi. now back to studying ♡"
];

const COLLECTIBLE_ICONS = ['🍓','🍵','🎀','🧋','🍰','🍡','🌸','♡','✨','🫧','🍒','🧁'];

const STORAGE_KEY = 'strawberryMatchaMidtermsState_v1';
const SUPABASE_URL = 'https://pjgkadfnvqddfyjmktis.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1hoILah2SpoWwtZ0u2O6UQ_zgRsuNq_';
const sb = window.supabase ? window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
) : null;
let cloudUser = null;
let cloudReady = false;
let cloudSaveTimer = null;
let cloudLoading = false;

/* ===================== STATE ===================== */
function freshSubject(){ return { topics: [], notes: '', forget: '' }; }
function freshState(){
  const subjects = {};
  SUBJECT_ORDER.forEach(id => subjects[id] = freshSubject());
  return {
    subjects,
    missions: [],
    studyHistory: [],
    activeSubject: SUBJECT_ORDER[0],
    motivationIndex: 0,
    customCountdown: null,
    chaowiMode: 'awake',
    petDuoHidden: false,
    petDuoNap: false,
    chaowiPos: { xPct: 6, yPct: 80 },
    profile: { name:'', academicYear:'2026–2027', term:'Term 1', motivation:'mixed', theme:'strawberry-matcha', onboarded:false },
    courses: [],
    gradebook: {},
    quickGwaRows: [
      { id:'quick-1', grade:'', units:3 },
      { id:'quick-2', grade:'', units:3 },
      { id:'quick-3', grade:'', units:3 },
      { id:'quick-4', grade:'', units:3 }
    ],
    examPeriod: null,
    examContext: { academicYear:'2026–2027', term:'Term 1' },
    examData: {},
    archivedTerms: [],
    academicMigrationVersion: 1
  };
}

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return freshState();
    const parsed = JSON.parse(raw);
    return sanitizeState(parsed);
  }catch(e){
    console.warn('Failed to load state, starting fresh.', e);
    return freshState();
  }
}

function sanitizeAttachments(list){
  if(!Array.isArray(list)) return [];
  return list.filter(a => a && typeof a === 'object').map(a => {
    if(a.type === 'file' && typeof a.data === 'string' && a.data.startsWith('data:') && typeof a.name === 'string'){
      return { id: a.id || cryptoId(), type: 'file', name: String(a.name).slice(0,150), data: a.data };
    }
    if(typeof a.url === 'string'){
      return { id: a.id || cryptoId(), type: 'link', label: typeof a.label === 'string' && a.label.trim() ? String(a.label).slice(0,150) : a.url.slice(0,150), url: String(a.url).slice(0,500) };
    }
    return null;
  }).filter(Boolean);
}

function sanitizeState(parsed){
  const base = freshState();
  if(!parsed || typeof parsed !== 'object') return base;
  const out = freshState();
  if(parsed.subjects && typeof parsed.subjects === 'object'){
    SUBJECT_ORDER.forEach(id => {
      const s = parsed.subjects[id];
      if(s && typeof s === 'object'){
        out.subjects[id] = {
          topics: Array.isArray(s.topics) ? s.topics.filter(t => t && typeof t.name === 'string').map(t => ({
            name: String(t.name).slice(0,200),
            status: ['Not Started','In Progress','Done'].includes(t.status) ? t.status : 'Not Started',
            priority: ['Low','Medium','High'].includes(t.priority) ? t.priority : 'Medium',
            attachments: sanitizeAttachments(t.attachments)
          })) : [],
          notes: typeof s.notes === 'string' ? s.notes : '',
          forget: typeof s.forget === 'string' ? s.forget : ''
        };
      }
    });
  }
  if(Array.isArray(parsed.missions)){
    out.missions = parsed.missions.filter(m => m && typeof m.text === 'string').map(m => ({
      id: m.id || cryptoId(),
      text: String(m.text).slice(0,200),
      done: !!m.done
    }));
  }
  if(Array.isArray(parsed.studyHistory)){
    out.studyHistory = parsed.studyHistory.filter(h => h && typeof h.minutes === 'number').map(h => ({
      subject: typeof h.subject === 'string' ? h.subject.slice(0,160) : SUBJECT_ORDER[0],
      minutes: Math.max(1, Math.round(h.minutes)),
      timestamp: typeof h.timestamp === 'number' ? h.timestamp : Date.now(),
      academicKey: typeof h.academicKey === 'string' ? h.academicKey.slice(0,100) : '',
      period: ['midterms','finals'].includes(h.period) ? h.period : ''
    }));
  }
  if(SUBJECT_ORDER.includes(parsed.activeSubject)) out.activeSubject = parsed.activeSubject;
  if(typeof parsed.motivationIndex === 'number') out.motivationIndex = parsed.motivationIndex;
  if(['awake','nap','hidden'].includes(parsed.chaowiMode)) out.chaowiMode = parsed.chaowiMode;
  if(typeof parsed.petDuoHidden === 'boolean') out.petDuoHidden = parsed.petDuoHidden;
  if(typeof parsed.petDuoNap === 'boolean') out.petDuoNap = parsed.petDuoNap;
  if(parsed.customCountdown && typeof parsed.customCountdown === 'object' &&
     typeof parsed.customCountdown.date === 'string' && typeof parsed.customCountdown.time === 'string'){
    out.customCountdown = { date: parsed.customCountdown.date, time: parsed.customCountdown.time };
  }
  if(parsed.chaowiPos && typeof parsed.chaowiPos.xPct === 'number' && typeof parsed.chaowiPos.yPct === 'number'){
    out.chaowiPos = {
      xPct: Math.min(96, Math.max(0, parsed.chaowiPos.xPct)),
      yPct: Math.min(96, Math.max(0, parsed.chaowiPos.yPct))
    };
  }
  if(parsed.profile && typeof parsed.profile === 'object'){
    const p = parsed.profile;
    out.profile = {
      name: typeof p.name === 'string' ? p.name.slice(0,40) : '',
      academicYear: typeof p.academicYear === 'string' ? p.academicYear.slice(0,30) : '2026–2027',
      term: typeof p.term === 'string' ? p.term.slice(0,30) : 'Term 1',
      motivation: ['sweet','chaotic','strict','mixed'].includes(p.motivation) ? p.motivation : 'mixed',
      theme: ['strawberry-matcha','strawberry-milk','matcha-latte','lavender','mocha','blueberry-milk','dark-study'].includes(p.theme) ? p.theme : 'strawberry-matcha',
      onboarded: !!p.onboarded
    };
  }
  if(Array.isArray(parsed.courses)){
    out.courses = parsed.courses.filter(c=>c&&typeof c==='object').map(c=>({
      id:c.id||cryptoId(),
      name:typeof c.name==='string'?c.name.slice(0,80):'Untitled Course',
      code:typeof c.code==='string'?c.code.slice(0,30):'',
      professor:typeof c.professor==='string'?c.professor.slice(0,80):'',
      section:typeof c.section==='string'?c.section.slice(0,40):'',
      units:Number.isFinite(+c.units)?Math.max(0,Math.min(20,+c.units)):3,
      room:typeof c.room==='string'?c.room.slice(0,40):'',
      color:typeof c.color==='string'?c.color.slice(0,30):'pink',
      term:typeof c.term==='string'?c.term.slice(0,30):(out.profile?.term||'Term 1'),
      academicYear:typeof c.academicYear==='string'?c.academicYear.slice(0,30):(out.profile?.academicYear||'2026–2027'),
      schedule:typeof c.schedule==='string'?c.schedule.slice(0,120):'',
      schedules:Array.isArray(c.schedules)?c.schedules.filter(s=>s&&typeof s==='object').map(s=>({
        id:s.id||cryptoId(),
        day:typeof s.day==='string'?s.day.slice(0,12):'',
        start:typeof s.start==='string'?s.start.slice(0,8):'',
        end:typeof s.end==='string'?s.end.slice(0,8):'',
        room:typeof s.room==='string'?s.room.slice(0,50):''
      })):[],
      gradingScheme:(c.gradingScheme&&typeof c.gradingScheme==='object')?{
        ww:Number.isFinite(+c.gradingScheme.ww)?+c.gradingScheme.ww:30,
        pt:Number.isFinite(+c.gradingScheme.pt)?+c.gradingScheme.pt:20,
        attendance:Number.isFinite(+c.gradingScheme.attendance)?+c.gradingScheme.attendance:10,
        exam:Number.isFinite(+c.gradingScheme.exam)?+c.gradingScheme.exam:40
      }:{ww:30,pt:20,attendance:10,exam:40},
      gwaFinalGrade:typeof c.gwaFinalGrade==='string'?c.gwaFinalGrade.slice(0,20):'',
      gwaMode:['auto','include','exclude'].includes(c.gwaMode)?c.gwaMode:'auto'
    }));
  }
  if(parsed.gradebook && typeof parsed.gradebook==='object'){
    Object.entries(parsed.gradebook).forEach(([courseId,g])=>{
      if(!g||typeof g!=='object') return;
      const cleanPeriod=(arr)=>Array.isArray(arr)?arr.filter(a=>a&&typeof a==='object').map(a=>({
        id:a.id||cryptoId(),
        name:typeof a.name==='string'?a.name.slice(0,100):'Assessment',
        category:['ww','pt','attendance','exam'].includes(a.category)?a.category:'ww',
        score:Number.isFinite(+a.score)?Math.max(0,+a.score):0,
        total:Number.isFinite(+a.total)?Math.max(0.01,+a.total):100,
        date:typeof a.date==='string'?a.date.slice(0,10):''
      })):[];
      out.gradebook[courseId]={midterms:cleanPeriod(g.midterms),finals:cleanPeriod(g.finals)};
    });
  }
  if(Array.isArray(parsed.quickGwaRows)){
    const allowed=['','4.0','3.5','3.0','2.5','2.0','1.5','1.0','R','INC','P','F'];
    const rows=parsed.quickGwaRows.filter(r=>r&&typeof r==='object').slice(0,40).map(r=>({
      id:r.id||cryptoId(),
      grade:allowed.includes(String(r.grade||''))?String(r.grade||''):'',
      units:Number.isFinite(+r.units)?Math.max(0,Math.min(20,+r.units)):3
    }));
    if(rows.length) out.quickGwaRows=rows;
  }
  if(parsed.examContext && typeof parsed.examContext==='object'){
    out.examContext={
      academicYear:typeof parsed.examContext.academicYear==='string'?parsed.examContext.academicYear.slice(0,30):(out.profile?.academicYear||'2026–2027'),
      term:['Term 1','Term 2','Term 3'].includes(parsed.examContext.term)?parsed.examContext.term:(out.profile?.term||'Term 1')
    };
  }
  if(Array.isArray(parsed.archivedTerms)) out.archivedTerms=parsed.archivedTerms.filter(x=>typeof x==='string').slice(0,30);
  if(Number.isFinite(+parsed.academicMigrationVersion)) out.academicMigrationVersion=Math.max(0,Math.floor(+parsed.academicMigrationVersion));
  if(parsed.examData && typeof parsed.examData==='object'){
    const cleanSubject=(s)=>{
      if(!s||typeof s!=='object') return {topics:[],notes:'',forget:''};
      return {
        topics:Array.isArray(s.topics)?s.topics.filter(t=>t&&typeof t.name==='string').map(t=>({
          name:String(t.name).slice(0,200),
          status:['Not Started','In Progress','Done'].includes(t.status)?t.status:'Not Started',
          priority:['Low','Medium','High'].includes(t.priority)?t.priority:'Medium',
          attachments:sanitizeAttachments(t.attachments)
        })):[],
        notes:typeof s.notes==='string'?s.notes:'',
        forget:typeof s.forget==='string'?s.forget:''
      };
    };
    const cleanPeriod=(p)=>{
      p=(p&&typeof p==='object')?p:{};
      const subjects={};
      if(p.subjects&&typeof p.subjects==='object') Object.entries(p.subjects).forEach(([id,s])=>{subjects[String(id).slice(0,160)]=cleanSubject(s);});
      const subjectNames={};
      if(p.subjectNames&&typeof p.subjectNames==='object') Object.entries(p.subjectNames).forEach(([id,name])=>{if(typeof name==='string')subjectNames[String(id).slice(0,160)]=name.slice(0,100);});
      const exams=Array.isArray(p.exams)?p.exams.filter(e=>e&&typeof e==='object').map(e=>({
        id:typeof e.id==='string'?e.id.slice(0,160):cryptoId(),
        subjectId:typeof e.subjectId==='string'?e.subjectId.slice(0,160):(typeof e.id==='string'?e.id.slice(0,160):cryptoId()),
        name:typeof e.name==='string'?e.name.slice(0,100):'Exam',
        start:typeof e.start==='string'?e.start:'',
        end:typeof e.end==='string'?e.end:'',
        room:typeof e.room==='string'?e.room.slice(0,50):''
      })): [];
      return {exams,subjects,subjectNames};
    };
    Object.entries(parsed.examData).slice(0,30).forEach(([key,record])=>{
      if(!record||typeof record!=='object')return;
      out.examData[String(key).slice(0,100)]={midterms:cleanPeriod(record.midterms),finals:cleanPeriod(record.finals)};
    });
  }
  if(['midterms','finals'].includes(parsed.examPeriod)) out.examPeriod = parsed.examPeriod;
  return out;
}

function cryptoId(){ return 'id-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }

/* ===================== SAVE (debounced with indicator) ===================== */
let saveTimeout = null;
function saveState(){
  const el = document.getElementById('saveIndicator');
  if(el){ el.textContent = 'saving...'; }
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(e){
      console.error('Save failed', e);
    }
    if(el){ el.textContent = 'saved ✓'; }
    queueCloudSave();
  }, 260);
}

/* ===================== TOASTS ===================== */
function showToast(msg, opts){
  const longer = opts && opts.longer;
  const isChaowi = opts && opts.chaowi;
  const wrap = document.getElementById('toastWrap');
  if(isChaowi){
    const existing = Array.from(wrap.querySelectorAll('.chaowi-toast'));
    while(existing.length >= 3){
      const oldest = existing.shift();
      if(oldest) oldest.remove();
    }
  }
  const t = document.createElement('div');
  t.className = 'toast' + (longer ? ' mascot-toast' : '') + (isChaowi ? ' chaowi-toast' : '');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => { if(t.isConnected) t.remove(); }, longer ? 5000 : (isChaowi ? 4600 : 3000));
}

/* ===================== NAV ===================== */
const navButtons = document.querySelectorAll('.navbtn');
const views = document.querySelectorAll('.view');
function switchTab(tab){
  navButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  views.forEach(v => v.classList.toggle('active', v.id === 'view-' + tab));
  const footer=document.querySelector('.cramchy-footer');
  if(footer) footer.style.display=(tab==='dashboard' && !state.examPeriod)?'block':'none';
  if(tab === 'subjects') renderSubjectsTab();
  if(tab === 'dashboard') renderDashboard();
  if(tab === 'schedule') renderSchedule();
  if(tab === 'timer') renderTimerTab();
  if(tab === 'countdown') renderCustomCountdown();
  if(tab === 'matcha') renderMatchaCorner();
  if(tab === 'tasks') renderCramchyTasks();
  if(tab === 'more') renderCramchySettings();
  if(tab === 'grades'){ applyCramchyPersonalization(); renderGradebook(); }
  if(tab === 'exam') renderExamMode();
}
navButtons.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

/* ===================== COUNTDOWN HELPERS ===================== */
function formatCountdown(startIso, endIso){
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if(now < start){
    let diff = start - now;
    const days = Math.floor(diff / 86400000);
    diff -= days * 86400000;
    const hours = Math.floor(diff / 3600000);
    diff -= hours * 3600000;
    const mins = Math.floor(diff / 60000);
    if(days > 0) return `${days}d ${hours}h left`;
    if(hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  } else if(now >= start && now <= end){
    return 'EXAM IN PROGRESS';
  } else {
    return 'EXAM PASSED';
  }
}
function hoursUntil(startIso){
  return (new Date(startIso).getTime() - Date.now()) / 3600000;
}
function getSortedExams(){
  return [...EXAMS].sort((a,b) => new Date(a.start) - new Date(b.start));
}
function getClosestExam(){
  const now = Date.now();
  const upcoming = getSortedExams().filter(e => new Date(e.end).getTime() > now);
  return upcoming.length ? upcoming[0] : getSortedExams()[getSortedExams().length - 1];
}
function formatExamDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', weekday:'short' });
}
function formatExamTime(iso){
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
}

/* ===================== TOPIC / PROGRESS HELPERS ===================== */
function subjectStats(id){
  const topics = activeExamSubjects()[id].topics;
  const total = topics.length;
  const done = topics.filter(t => t.status === 'Done').length;
  const percent = total ? Math.round((done/total)*100) : 0;
  return { total, done, percent };
}
function overallStats(){
  let total = 0, done = 0;
  SUBJECT_ORDER.forEach(id => {
    const s = subjectStats(id);
    total += s.total; done += s.done;
  });
  const percent = total ? Math.round((done/total)*100) : 0;
  return { total, done, percent };
}
function readinessLabel(id){
  const { percent } = subjectStats(id);
  const exam = EXAM_BY_ID[id];
  const hrs = hoursUntil(exam.start);
  if(hrs > 0 && hrs < 48 && percent < 60){
    return { text: 'LOCK IN IMMEDIATELY', cls: 'readiness-lock' };
  }
  if(percent >= 80) return { text: 'READY TO SLAY', cls: 'readiness-slay' };
  if(percent >= 50) return { text: 'ON TRACK', cls: 'readiness-track' };
  return { text: 'NEEDS ATTENTION', cls: 'readiness-needs' };
}

/* ===================== DASHBOARD ===================== */
function renderDashboard(){
  const overall = overallStats();
  document.getElementById('stat-exams').textContent = EXAMS.length;
  document.getElementById('stat-topics').textContent = overall.total;
  document.getElementById('stat-done').textContent = overall.done;
  document.getElementById('stat-percent').textContent = overall.percent + '%';

  const exam = getClosestExam();
  const box = document.getElementById('closestExamBox');
  box.innerHTML = `
    <span class="tag">NEXT EXAM</span>
    <h3>${exam.name}</h3>
    <div class="meta">${formatExamDate(exam.start)} • ${formatExamTime(exam.start)} – ${formatExamTime(exam.end)} • Room ${exam.room}</div>
    <div class="countdown-big" data-countdown-start="${exam.start}" data-countdown-end="${exam.end}">${formatCountdown(exam.start, exam.end)}</div>
  `;

  renderMissions();
  renderMotivation();
}

function renderMissions(){
  const list = document.getElementById('missionList');
  if(!state.missions.length){
    list.innerHTML = `<div class="empty-state">Add a few realistic goals for today.</div>`;
    return;
  }
  list.innerHTML = '';
  state.missions.forEach(m => {
    const row = document.createElement('div');
    row.className = 'mission-row' + (m.done ? ' done' : '');
    row.innerHTML = `
      <input type="checkbox" ${m.done ? 'checked' : ''} data-id="${m.id}">
      <span>${escapeHtml(m.text)}</span>
      <button class="del" data-id="${m.id}">✕</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const m = state.missions.find(x => x.id === cb.dataset.id);
      if(m){ m.done = cb.checked; saveState(); renderMissions(); }
    });
  });
  list.querySelectorAll('button.del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.missions = state.missions.filter(x => x.id !== btn.dataset.id);
      saveState(); renderMissions();
    });
  });
}

document.getElementById('addMissionBtn').addEventListener('click', addMission);
document.getElementById('missionInput').addEventListener('keydown', e => { if(e.key === 'Enter') addMission(); });
function addMission(){
  const input = document.getElementById('missionInput');
  const text = input.value.trim();
  if(!text) return;
  state.missions.push({ id: cryptoId(), text, done: false });
  input.value = '';
  saveState();
  renderMissions();
  showToast('mission added ♡');
}

function formatCustomCountdownPrecise(diff){
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const hh = String(hours).padStart(2,'0');
  const mm = String(mins).padStart(2,'0');
  const ss = String(secs).padStart(2,'0');
  return days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

function renderCustomCountdown(){
  const dateInput = document.getElementById('customCountdownDate');
  const timeInput = document.getElementById('customCountdownTime');
  if(!dateInput || !timeInput) return;
  const todayStr = new Date().toLocaleDateString('en-CA');
  if(state.customCountdown){
    dateInput.value = state.customCountdown.date;
    timeInput.value = state.customCountdown.time;
  } else if(!dateInput.value){
    dateInput.value = todayStr;
  }
  updateCustomCountdownDisplay();
}

function updateCustomCountdownDisplay(){
  const targetEl = document.getElementById('customCountdownTarget');
  const el = document.getElementById('customCountdownDisplay');
  if(!el || !targetEl) return;
  if(!state.customCountdown){
    targetEl.textContent = '';
    el.textContent = 'Pick a date and time, then tap Set.';
    return;
  }
  const target = new Date(`${state.customCountdown.date}T${state.customCountdown.time}:00`);
  if(isNaN(target.getTime())){
    targetEl.textContent = '';
    el.textContent = 'Pick a valid date and time.';
    return;
  }
  const timeLabel = target.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
  const dateLabel = target.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  targetEl.textContent = `Counting down to ${dateLabel}, ${timeLabel}`;
  const diff = target.getTime() - Date.now();
  el.textContent = diff <= 0 ? 'time\'s up ♡' : formatCustomCountdownPrecise(diff);
}

document.getElementById('setCountdownBtn').addEventListener('click', () => {
  const dateVal = document.getElementById('customCountdownDate').value;
  const timeVal = document.getElementById('customCountdownTime').value;
  if(!dateVal || !timeVal){
    showToast('pick both a date and a time first ♡');
    return;
  }
  state.customCountdown = { date: dateVal, time: timeVal };
  saveState();
  updateCustomCountdownDisplay();
  showToast('countdown set ♡');
});

document.getElementById('clearCountdownBtn').addEventListener('click', () => {
  state.customCountdown = null;
  saveState();
  document.getElementById('customCountdownTime').value = '';
  updateCustomCountdownDisplay();
});

setInterval(updateCustomCountdownDisplay, 1000);

function renderMotivation(){
  document.getElementById('motivationText').textContent = MOTIVATIONS[state.motivationIndex % MOTIVATIONS.length];
}
document.getElementById('pushBtn').addEventListener('click', () => {
  let next = Math.floor(Math.random() * MOTIVATIONS.length);
  if(MOTIVATIONS.length > 1){
    while(next === (state.motivationIndex % MOTIVATIONS.length)) next = Math.floor(Math.random() * MOTIVATIONS.length);
  }
  state.motivationIndex = next;
  saveState();
  renderMotivation();
});

/* ===================== SCHEDULE ===================== */
function renderSchedule(){
  const box = document.getElementById('timelineBox');
  const sorted = getSortedExams();
  const closest = getClosestExam();
  box.innerHTML = '';
  sorted.forEach(exam => {
    const isNext = exam.id === closest.id;
    const item = document.createElement('div');
    item.className = 'timeline-item' + (isNext ? ' next' : '');
    item.innerHTML = `
      <div class="exam-card ${isNext ? 'next-exam' : ''}">
        <div class="row1">
          <h4>${exam.name}</h4>
          ${isNext ? '<span class="next-tag">NEXT EXAM</span>' : `<span class="date-pill">${formatExamDate(exam.start)}</span>`}
        </div>
        <div class="details">${formatExamDate(exam.start)} • ${formatExamTime(exam.start)} – ${formatExamTime(exam.end)} • Room ${exam.room}</div>
        <div class="countdown" data-countdown-start="${exam.start}" data-countdown-end="${exam.end}">${formatCountdown(exam.start, exam.end)}</div>
      </div>
    `;
    box.appendChild(item);
  });
}

/* ===================== SUBJECTS TAB ===================== */
function renderSubjectsTab(){
  const tabsBox = document.getElementById('subjectTabs');
  tabsBox.innerHTML = '';
  SUBJECT_ORDER.forEach(id => {
    const btn = document.createElement('button');
    btn.className = 'subject-tab-btn' + (state.activeSubject === id ? ' active' : '');
    btn.textContent = SUBJECT_NAME[id];
    btn.addEventListener('click', () => {
      state.activeSubject = id;
      expandedAttachments = {};
      saveState();
      renderSubjectsTab();
    });
    tabsBox.appendChild(btn);
  });
  renderSubjectDetail();
}

function renderSubjectDetail(){
  const id = state.activeSubject;
  const exam = EXAM_BY_ID[id];
  const subj = activeExamSubjects()[id];
  const stats = subjectStats(id);
  const readiness = readinessLabel(id);
  const detail = document.getElementById('subjectDetail');

  detail.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div class="flex-between">
        <h3 style="color:var(--red-deep);">${SUBJECT_NAME[id]}</h3>
        <span class="readiness-badge ${readiness.cls}">${readiness.text}</span>
      </div>
      <div class="details" style="color:var(--text-soft); font-weight:700; margin-top:6px;">
        ${formatExamDate(exam.start)} • ${formatExamTime(exam.start)} – ${formatExamTime(exam.end)} • Room ${exam.room}
      </div>
      <div class="countdown" style="color:var(--red-berry); font-weight:800; margin-top:6px;" data-countdown-start="${exam.start}" data-countdown-end="${exam.end}">${formatCountdown(exam.start, exam.end)}</div>
      <div style="margin-top:14px;">
        <div class="flex-between">
          <span style="font-weight:800;">${stats.done} / ${stats.total} topics done</span>
          <span style="font-weight:800; color:var(--red-berry);">${stats.percent}%</span>
        </div>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${stats.percent}%"></div></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="field-label">Study Topics</div>
      <div id="topicList"></div>
      <div class="add-row">
        <input type="text" id="topicInput" placeholder="Type a topic...">
        <button class="btn" id="addTopicBtn">+ Add</button>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <label class="field-label">Notes / Brain Dump</label>
        <textarea id="notesArea" placeholder="professor emphasis, diagrams, reminders, confusing concepts...">${escapeHtml(subj.notes)}</textarea>
      </div>
      <div class="card">
        <label class="field-label">Things I Keep Forgetting</label>
        <textarea id="forgetArea" placeholder="facts that refuse to stay in your brain...">${escapeHtml(subj.forget)}</textarea>
      </div>
    </div>
  `;

  renderTopicList();

  document.getElementById('addTopicBtn').addEventListener('click', addTopic);
  document.getElementById('topicInput').addEventListener('keydown', e => { if(e.key === 'Enter') addTopic(); });

  let notesTimeout;
  document.getElementById('notesArea').addEventListener('input', e => {
    activeExamSubjects()[id].notes = e.target.value;
    clearTimeout(notesTimeout);
    notesTimeout = setTimeout(saveState, 300);
  });
  let forgetTimeout;
  document.getElementById('forgetArea').addEventListener('input', e => {
    activeExamSubjects()[id].forget = e.target.value;
    clearTimeout(forgetTimeout);
    forgetTimeout = setTimeout(saveState, 300);
  });
}

let expandedAttachments = {};

function renderTopicList(){
  const id = state.activeSubject;
  const topics = activeExamSubjects()[id].topics;
  const list = document.getElementById('topicList');
  if(!topics.length){
    list.innerHTML = `<div class="empty-state">No topics yet. Add your first one below ♡</div>`;
    return;
  }
  list.innerHTML = '';
  topics.forEach((t, idx) => {
    const attachments = t.attachments || [];
    const block = document.createElement('div');
    block.className = 'topic-block';
    const row = document.createElement('div');
    row.className = 'topic-row';
    const statusCls = t.status === 'Done' ? 'status-done' : (t.status === 'In Progress' ? 'status-inprogress' : 'status-notstarted');
    const prioCls = t.priority === 'High' ? 'priority-high' : (t.priority === 'Medium' ? 'priority-medium' : 'priority-low');
    row.innerHTML = `
      <input type="text" value="${escapeAttr(t.name)}" data-idx="${idx}" class="topic-name-input">
      <select class="topic-status ${statusCls}" data-idx="${idx}">
        <option value="Not Started" ${t.status==='Not Started'?'selected':''}>Not Started</option>
        <option value="In Progress" ${t.status==='In Progress'?'selected':''}>In Progress</option>
        <option value="Done" ${t.status==='Done'?'selected':''}>Done</option>
      </select>
      <select class="topic-priority ${prioCls}" data-idx="${idx}">
        <option value="Low" ${t.priority==='Low'?'selected':''}>Low</option>
        <option value="Medium" ${t.priority==='Medium'?'selected':''}>Medium</option>
        <option value="High" ${t.priority==='High'?'selected':''}>High</option>
      </select>
      <button class="attach-toggle" data-idx="${idx}">🔗 ${attachments.length}</button>
      <button class="del" data-idx="${idx}">Delete</button>
    `;
    block.appendChild(row);

    const panel = document.createElement('div');
    panel.className = 'attachments-panel';
    panel.id = `attach-panel-${idx}`;
    panel.style.display = expandedAttachments[idx] ? 'block' : 'none';
    block.appendChild(panel);

    list.appendChild(block);
    renderAttachmentsPanel(idx);
  });

  list.querySelectorAll('.topic-name-input').forEach(inp => {
    let t;
    inp.addEventListener('input', () => {
      const idx = +inp.dataset.idx;
      activeExamSubjects()[id].topics[idx].name = inp.value;
      clearTimeout(t);
      t = setTimeout(saveState, 300);
    });
  });
  list.querySelectorAll('.topic-status').forEach(sel => {
    sel.addEventListener('change', () => {
      const idx = +sel.dataset.idx;
      const wasDone = activeExamSubjects()[id].topics[idx].status === 'Done';
      activeExamSubjects()[id].topics[idx].status = sel.value;
      saveState();
      renderTopicList();
      renderSubjectDetail();
      if(!wasDone && sel.value === 'Done'){
        showToast('topic completed! matcha is pleased ♡');
        chaowiReact('topic');
      }
    });
  });
  list.querySelectorAll('.topic-priority').forEach(sel => {
    sel.addEventListener('change', () => {
      const idx = +sel.dataset.idx;
      activeExamSubjects()[id].topics[idx].priority = sel.value;
      saveState();
      renderTopicList();
    });
  });
  list.querySelectorAll('button.attach-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx;
      expandedAttachments[idx] = !expandedAttachments[idx];
      const panel = document.getElementById(`attach-panel-${idx}`);
      if(panel) panel.style.display = expandedAttachments[idx] ? 'block' : 'none';
    });
  });
  list.querySelectorAll('button.del').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx;
      activeExamSubjects()[id].topics.splice(idx, 1);
      expandedAttachments = {};
      saveState();
      renderTopicList();
      renderSubjectDetail();
    });
  });
}

function renderAttachmentsPanel(idx){
  const id = state.activeSubject;
  const panel = document.getElementById(`attach-panel-${idx}`);
  if(!panel) return;
  const topic = activeExamSubjects()[id].topics[idx];
  const attachments = topic.attachments || [];

  let listHtml = '';
  if(!attachments.length){
    listHtml = `<div class="attach-empty">No links added yet.</div>`;
  } else {
    listHtml = attachments.map(a => {
      if(a.type === 'file'){
        return `<div class="attachment-item">📄 <a href="${a.data}" download="${escapeAttr(a.name)}" target="_blank" rel="noopener">${escapeHtml(a.name)}</a><button class="del-att" data-idx="${idx}" data-att-id="${a.id}">✕</button></div>`;
      }
      return `<div class="attachment-item">🔗 <a href="${escapeAttr(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.label)}</a><button class="del-att" data-idx="${idx}" data-att-id="${a.id}">✕</button></div>`;
    }).join('');
  }

  panel.innerHTML = `
    ${listHtml}
    <div class="attach-add-row">
      <input type="text" class="link-label-input" placeholder="Link name (optional)" data-idx="${idx}">
      <input type="text" class="link-url-input" placeholder="Paste a link (https://...)" data-idx="${idx}">
      <button class="btn secondary add-link-btn" data-idx="${idx}">+ Add Link</button>
    </div>
  `;

  panel.querySelector('.add-link-btn').addEventListener('click', () => {
    const labelInput = panel.querySelector('.link-label-input');
    const urlInput = panel.querySelector('.link-url-input');
    let url = urlInput.value.trim();
    if(!url) return;
    if(!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const label = labelInput.value.trim() || url;
    topic.attachments = topic.attachments || [];
    topic.attachments.push({ id: cryptoId(), type: 'link', label, url });
    saveState();
    renderTopicList();
    showToast('link added ♡');
  });

  panel.querySelectorAll('.del-att').forEach(btn => {
    btn.addEventListener('click', () => {
      const attId = btn.dataset.attId;
      topic.attachments = (topic.attachments || []).filter(a => a.id !== attId);
      saveState();
      renderTopicList();
    });
  });
}


function addTopic(){
  const id = state.activeSubject;
  const input = document.getElementById('topicInput');
  const name = input.value.trim();
  if(!name) return;
  activeExamSubjects()[id].topics.push({ name, status: 'Not Started', priority: 'Medium', attachments: [] });
  input.value = '';
  saveState();
  renderSubjectDetail();
  showToast('topic added ♡');
}

/* ===================== STUDY TIMER ===================== */
let timerState = { remaining: 25*60, running: false, intervalId: null, presetMinutes: 25, subject: SUBJECT_ORDER[0] };

function renderTimerTab(){
  const sel = document.getElementById('timerSubjectSelect');
  sel.innerHTML = SUBJECT_ORDER.map(id => `<option value="${id}" ${timerState.subject===id?'selected':''}>${SUBJECT_NAME[id]}</option>`).join('');
  updateTimerDisplay();
  renderHistory();
}
document.getElementById('timerSubjectSelect').addEventListener('change', e => { timerState.subject = e.target.value; });

document.querySelectorAll('[data-mins]').forEach(btn => {
  btn.addEventListener('click', () => {
    if(timerState.running) return;
    const mins = +btn.dataset.mins;
    timerState.presetMinutes = mins;
    timerState.remaining = mins * 60;
    updateTimerDisplay();
  });
});

function updateTimerDisplay(){
  const m = Math.floor(timerState.remaining / 60);
  const s = timerState.remaining % 60;
  document.getElementById('timerDisplay').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

document.getElementById('timerStartBtn').addEventListener('click', () => {
  if(timerState.running) return;
  timerState.running = true;
  chaowiReact('start');
  document.getElementById('timerStartBtn').textContent = 'RESUME';
  document.getElementById('timerStartBtn').disabled = true;
  document.getElementById('timerPauseBtn').disabled = false;
  timerState.intervalId = setInterval(() => {
    timerState.remaining--;
    updateTimerDisplay();
    if(timerState.remaining <= 0){
      clearInterval(timerState.intervalId);
      timerState.running = false;
      logStudySession();
      document.getElementById('timerStartBtn').disabled = false;
      document.getElementById('timerStartBtn').textContent = 'START';
      document.getElementById('timerPauseBtn').disabled = true;
      timerState.remaining = timerState.presetMinutes * 60;
      updateTimerDisplay();
      showToast('study session complete ✧');
      chaowiReact('complete');
    }
  }, 1000);
});
document.getElementById('timerPauseBtn').addEventListener('click', () => {
  if(!timerState.running) return;
  clearInterval(timerState.intervalId);
  timerState.running = false;
  chaowiReact('pause');
  document.getElementById('timerStartBtn').disabled = false;
  document.getElementById('timerStartBtn').textContent = 'RESUME';
  document.getElementById('timerPauseBtn').disabled = true;
});
document.getElementById('timerResetBtn').addEventListener('click', () => {
  clearInterval(timerState.intervalId);
  timerState.running = false;
  timerState.remaining = timerState.presetMinutes * 60;
  updateTimerDisplay();
  document.getElementById('timerStartBtn').disabled = false;
  document.getElementById('timerStartBtn').textContent = 'START';
  document.getElementById('timerPauseBtn').disabled = true;
});

function logStudySession(){
  state.studyHistory.unshift({
    subject: timerState.subject,
    minutes: timerState.presetMinutes,
    timestamp: Date.now()
  });
  saveState();
  renderHistory();
  renderMatchaCorner();
}

function renderHistory(){
  const list = document.getElementById('historyList');
  const totalMins = state.studyHistory.reduce((sum, h) => sum + h.minutes, 0);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  document.getElementById('totalFocusTime').textContent = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  if(!state.studyHistory.length){
    list.innerHTML = `<div class="empty-state">No sessions logged yet.</div>`;
    return;
  }
  list.innerHTML = '';
  state.studyHistory.slice(0, 25).forEach(h => {
    const d = new Date(h.timestamp);
    const dateStr = d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div><div class="subj">${SUBJECT_NAME[h.subject]}</div><div class="when">${dateStr} • ${timeStr}</div></div>
      <div class="mins">${h.minutes}m</div>
    `;
    list.appendChild(row);
  });
}

/* ===================== STREAK ===================== */
function calcStreak(){
  const days = new Set(state.studyHistory.map(h => new Date(h.timestamp).toDateString()));
  let count = 0;
  let cursor = new Date();
  if(!days.has(cursor.toDateString())){
    cursor.setDate(cursor.getDate() - 1);
  }
  while(days.has(cursor.toDateString())){
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/* ===================== MATCHA CORNER ===================== */
function renderMatchaCorner(){
  const streak = calcStreak();
  document.getElementById('streakDisplay').textContent = `${streak} day streak`;
  const commentary = streak >= 3 ? "look at you, actually consistent ♡" : (streak >= 1 ? "keep it going, don't break the chain." : "start today. matcha is watching.");
  document.getElementById('mascotCommentary').textContent = commentary;

  const overall = overallStats();
  const unlockedCount = Math.min(COLLECTIBLE_ICONS.length, Math.floor(overall.done / 3));
  const grid = document.getElementById('collectiblesGrid');
  grid.innerHTML = '';
  COLLECTIBLE_ICONS.forEach((icon, i) => {
    const el = document.createElement('div');
    el.className = 'collectible' + (i < unlockedCount ? ' unlocked' : '');
    el.textContent = icon;
    grid.appendChild(el);
  });
}

(function(){
  const nook = document.getElementById('petNook');
  const duoEl = document.getElementById('petDuo');
  const bubbleEl = document.getElementById('petReactionBubble');
  const hanabiEl = document.getElementById('hanabiDog');
  const kenkenEl = document.getElementById('kenkenDog');
  const napBtn = document.getElementById('petNapBtn');
  const hideBtn = document.getElementById('petHideBtn');
  const revealBtn = document.getElementById('petRevealBtn');
  if(!nook || !duoEl) return;

  function applyPetState(){
    nook.classList.toggle('is-hidden', !!state.petDuoHidden);
    nook.classList.toggle('is-nap', !!state.petDuoNap);
    if(napBtn){
      napBtn.textContent = state.petDuoNap ? '☀' : '☾';
      napBtn.title = state.petDuoNap ? 'Wake Hanabi and Kenken' : 'Let Hanabi and Kenken nap';
    }
  }
  function showPets(){ state.petDuoHidden=false; saveState(); applyPetState(); }
  function hidePets(){ state.petDuoHidden=true; saveState(); applyPetState(); }
  function toggleNap(){ state.petDuoNap=!state.petDuoNap; saveState(); applyPetState(); }
  function showBubble(text, anchorEl){
    if(!bubbleEl) return;
    bubbleEl.textContent = text;
    const rootRect = nook.getBoundingClientRect();
    const anchorRect = (anchorEl || nook).getBoundingClientRect();
    const bubbleW = bubbleEl.offsetWidth || 90;
    const bubbleH = bubbleEl.offsetHeight || 28;
    let left = (anchorRect.left - rootRect.left) + (anchorRect.width / 2) - (bubbleW / 2);
    const maxLeft = Math.max(0, rootRect.width - bubbleW);
    left = Math.max(0, Math.min(left, maxLeft));
    let top = (anchorRect.top - rootRect.top) - bubbleH - 6;
    top = Math.max(-14, top);
    bubbleEl.style.left = `${left}px`;
    bubbleEl.style.top = `${top}px`;
    bubbleEl.style.right = 'auto';
    bubbleEl.classList.remove('show');
    void bubbleEl.offsetWidth;
    bubbleEl.classList.add('show');
  }
  function react(which){
    const anchorEl = which==='hanabi' ? hanabiEl : kenkenEl;
    if(state.petDuoNap){
      state.petDuoNap=false; saveState(); applyPetState(); showBubble('awake! ♡', anchorEl);
    }
    const list=which==='hanabi'?HANABI_MESSAGES:KENKEN_MESSAGES;
    const msg=list[Math.floor(Math.random()*list.length)];
    duoEl.classList.remove('react-hanabi','react-kenken'); void duoEl.offsetWidth;
    duoEl.classList.add(which==='hanabi'?'react-hanabi':'react-kenken');
    setTimeout(()=>duoEl.classList.remove('react-hanabi','react-kenken'),1000);
    showBubble(which==='hanabi'?'woof woof':'i want chicken', anchorEl);
    showToast(msg,{longer:true});
  }
  function key(which){return e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();react(which);}};}
  if(hanabiEl){hanabiEl.addEventListener('click',e=>{e.stopPropagation();react('hanabi');});hanabiEl.addEventListener('keydown',key('hanabi'));}
  if(kenkenEl){kenkenEl.addEventListener('click',e=>{e.stopPropagation();react('kenken');});kenkenEl.addEventListener('keydown',key('kenken'));}
  if(napBtn) napBtn.addEventListener('click',e=>{e.stopPropagation();toggleNap();});
  if(hideBtn) hideBtn.addEventListener('click',e=>{e.stopPropagation();hidePets();});
  if(revealBtn) revealBtn.addEventListener('click',e=>{e.stopPropagation();showPets();});
  applyPetState();
})();

/* ===================== CHAOWI (stationary study cat) ===================== */
const CHAOWI_MESSAGES = [
  "chaowi is watching you scroll.",
  "meow. that means go study.",
  "chaowi sat on your notes. pick them back up.",
  "she believes in you. barely.",
  "purr... now go finish a topic.",
  "chaowi says one more topic.",
  "mrrp. open the reviewer.",
  "chaowi did not wake up for you to procrastinate.",
  "pspspsps... back to studying.",
  "chaowi says you're doing better than you think. now continue.",
  "she brought emotional support. unfortunately you still have to study.",
  "chaowi inspected your reviewer. suspiciously unfinished.",
  "meow meow. academic translation: lock in.",
  "chaowi requests one completed topic as payment.",
  "she's judging your screen time."
];

const CHAOWI_EVENT_MESSAGES = {
  start: ["chaowi says lock in ♡", "study time. she is supervising.", "mrrp. focus mode."],
  pause: ["chaowi will allow this break.", "tiny pause. then back to it ♡"],
  complete: ["chaowi is proud of you ♡", "session complete. acceptable. very acceptable.", "you did it!! chaowi approves."],
  topic: ["chaowi witnessed that. +1 topic ♡", "one less thing to panic about.", "good. feed her another completed topic."]
};

let chaowiApi = null;
function chaowiReact(kind){
  if(chaowiApi) chaowiApi.react(kind || 'click');
}

function initChaowi(){
  const el = document.getElementById('chaowiCat');
  const nook = document.getElementById('chaowiNook');
  const modeBtn = document.getElementById('chaowiModeBtn');
  const revealBtn = document.getElementById('chaowiReveal');
  if(!el || !nook) return;

  let autoTimer = null;
  let busy = false;
  let busyTimer = null;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function randomOf(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
  function randomBetween(a,b){ return a + Math.random() * (b-a); }

  function currentMode(){ return ['awake','nap','hidden'].includes(state.chaowiMode) ? state.chaowiMode : 'awake'; }

  function applyMode(mode, persist=true){
    state.chaowiMode = ['awake','nap','hidden'].includes(mode) ? mode : 'awake';
    nook.classList.toggle('is-nap', state.chaowiMode === 'nap');
    nook.classList.toggle('is-hidden', state.chaowiMode === 'hidden');
    if(modeBtn){
      if(state.chaowiMode === 'awake'){ modeBtn.textContent = '☾'; modeBtn.title = 'Let Chaowi nap'; }
      else if(state.chaowiMode === 'nap'){ modeBtn.textContent = '×'; modeBtn.title = 'Hide Chaowi'; }
      else { modeBtn.textContent = '♡'; modeBtn.title = 'Wake Chaowi'; }
    }
    clearTimeout(autoTimer);
    if(state.chaowiMode === 'awake') scheduleIdle();
    if(persist) saveState();
  }

  function clearAnimState(){
    el.classList.remove('is-jumping','is-meowing','is-scratching','is-headtilt','is-stretching','is-excited','is-tailfast','is-eartwitch','is-celebrating');
  }

  function animate(kind, done){
    if(busy){ if(done) done(); return; }
    if(currentMode() !== 'awake' && kind !== 'wake'){ if(done) done(); return; }
    busy = true;
    clearTimeout(busyTimer);
    clearAnimState();

    let duration = 900;
    const cls = {
      jump:'is-jumping', meow:'is-meowing', scratch:'is-scratching', headtilt:'is-headtilt',
      stretch:'is-stretching', excited:'is-excited', tail:'is-tailfast', ear:'is-eartwitch', celebrate:'is-celebrating'
    }[kind];
    if(cls) el.classList.add(cls);
    if(kind === 'meow') duration = 1200;
    if(kind === 'scratch') duration = 1050;
    if(kind === 'jump') duration = 800;
    if(kind === 'celebrate'){
      if(!reducedMotion){ el.classList.add('is-excited','is-tailfast'); }
      duration = 1250;
    }
    if(reducedMotion && ['jump','scratch','stretch','excited','celebrate'].includes(kind)) duration = 450;

    busyTimer = setTimeout(() => {
      clearAnimState();
      busy = false;
      if(done) done();
    }, duration);
  }

  function showChaowiMessage(message, longer=true){
    showToast(typeof personalizeMascotText==='function' ? personalizeMascotText(message) : message, { chaowi:true, longer });
  }

  function clickReaction(){
    if(currentMode() === 'hidden') return;
    if(currentMode() === 'nap'){
      applyMode('awake');
      showChaowiMessage('mrrp... you woke chaowi. better make it worth it ♡');
      animate('stretch');
      return;
    }
    showChaowiMessage(randomOf(CHAOWI_MESSAGES));
    if(busy) return;
    const actions = reducedMotion ? ['meow','headtilt','tail','ear'] : ['meow','jump','scratch','headtilt','tail','stretch','excited'];
    animate(randomOf(actions));
  }

  function scheduleIdle(){
    clearTimeout(autoTimer);
    if(currentMode() !== 'awake') return;
    autoTimer = setTimeout(runIdle, randomBetween(8000,20000));
  }

  function runIdle(){
    if(currentMode() !== 'awake'){ scheduleIdle(); return; }
    if(busy){ scheduleIdle(); return; }
    const actions = reducedMotion ? ['ear','tail'] : ['ear','tail','headtilt','stretch'];
    animate(randomOf(actions), scheduleIdle);
  }

  function eventReaction(kind){
    if(currentMode() === 'hidden') return;
    if(currentMode() === 'nap' && (kind === 'complete' || kind === 'topic')) applyMode('awake');
    const messages = CHAOWI_EVENT_MESSAGES[kind];
    if(messages) showChaowiMessage(randomOf(messages));
    if(busy || currentMode() !== 'awake') return;
    if(kind === 'complete') animate('celebrate');
    else if(kind === 'topic') animate(reducedMotion ? 'tail' : 'excited');
    else if(kind === 'start') animate(reducedMotion ? 'ear' : 'excited');
    else if(kind === 'pause') animate('headtilt');
    else clickReaction();
  }

  el.addEventListener('click', clickReaction);
  el.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); clickReaction(); }
  });

  if(modeBtn){
    modeBtn.addEventListener('click', e => {
      e.stopPropagation();
      const mode = currentMode();
      if(mode === 'awake'){
        applyMode('nap');
        showChaowiMessage('chaowi is napping. shhh ♡');
      }else if(mode === 'nap'){
        applyMode('hidden');
        showToast('chaowi hid in her little corner. tap the paw to bring her back ♡');
      }else{
        applyMode('awake');
      }
    });
  }

  if(revealBtn){
    revealBtn.addEventListener('click', e => {
      e.stopPropagation();
      applyMode('awake');
      showChaowiMessage('chaowi has returned. supervision resumed.');
      animate('stretch');
    });
  }

  chaowiApi = { react:eventReaction, setMode:applyMode };
  applyMode(currentMode(), false);
}
initChaowi();

/* ===================== BRAIN BREAK TIMER ===================== */
let breakState = { remaining: 5*60, running: false, intervalId: null };
function updateBreakDisplay(){
  const m = Math.floor(breakState.remaining / 60);
  const s = breakState.remaining % 60;
  document.getElementById('breakDisplay').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
document.getElementById('breakStartBtn').addEventListener('click', () => {
  if(breakState.running){
    clearInterval(breakState.intervalId);
    breakState.running = false;
    return;
  }
  breakState.running = true;
  breakState.intervalId = setInterval(() => {
    breakState.remaining--;
    updateBreakDisplay();
    if(breakState.remaining <= 0){
      clearInterval(breakState.intervalId);
      breakState.running = false;
      breakState.remaining = 5*60;
      updateBreakDisplay();
      showToast('break over. back to the academic trenches ♡');
    }
  }, 1000);
});
document.getElementById('breakResetBtn').addEventListener('click', () => {
  clearInterval(breakState.intervalId);
  breakState.running = false;
  breakState.remaining = 5*60;
  updateBreakDisplay();
});

/* ===================== BACKUP / RESET ===================== */
document.getElementById('exportBtn').addEventListener('click', () => {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'strawberry-matcha-midterms-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('backup exported ♡');
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try{
      const parsed = JSON.parse(evt.target.result);
      state = sanitizeState(parsed);
      ensureAcademicStructure();
      saveState();
      renderAll();
      showToast('backup imported ♡');
    }catch(err){
      showToast('that file could not be imported.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('resetBtn').addEventListener('click', () => {
  showModal(
    'Reset everything?',
    'This deletes all topics, notes, missions, study history, streak progress, and collectibles. Export a backup first if you want to keep anything. This cannot be undone.',
    () => {
      state = freshState();
      ensureAcademicStructure();
      saveState();
      renderAll();
      showToast('everything has been reset');
    }
  );
});

function showModal(title, message, onConfirm){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="modal-actions">
        <button class="btn ghost" id="modalCancel">Cancel</button>
        <button class="btn danger" id="modalConfirm">Yes, reset</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#modalCancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#modalConfirm').addEventListener('click', () => { overlay.remove(); onConfirm(); });
}


/* ===================== CLOUD SYNC ===================== */
function setCloudButton(label, cls=''){
  const btn = document.getElementById('cloudBtn');
  if(!btn) return;
  btn.textContent = label;
  btn.classList.remove('synced','syncing');
  if(cls) btn.classList.add(cls);
}
function queueCloudSave(){
  if(!sb || !cloudUser || !cloudReady || cloudLoading) return;
  clearTimeout(cloudSaveTimer);
  setCloudButton('☁ syncing…','syncing');
  cloudSaveTimer = setTimeout(saveStateToCloud, 700);
}
async function saveStateToCloud(){
  if(!sb || !cloudUser || !cloudReady || cloudLoading) return;
  try{
    const { error } = await sb.from('midterms_tracker_state').upsert({
      user_id: cloudUser.id,
      state: state
    }, { onConflict: 'user_id' });
    if(error) throw error;
    setCloudButton('☁ synced','synced');
  }catch(err){
    console.error('Cloud save failed', err);
    setCloudButton('☁ sync error');
  }
}
async function loadCloudStateForUser(user){
  if(!sb || !user) return;
  cloudLoading = true;
  setCloudButton('☁ loading…','syncing');
  try{
    const { data, error } = await sb
      .from('midterms_tracker_state')
      .select('state, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if(error) throw error;

    if(data && data.state){
      state = sanitizeState(data.state);
      ensureAcademicStructure();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderAll();
      setCloudButton('☁ synced','synced');
      showToast('cramchy cloud progress loaded ♡');
    }else{
      const { error: insertError } = await sb.from('midterms_tracker_state').insert({
        user_id: user.id,
        state: state
      });
      if(insertError) throw insertError;
      setCloudButton('☁ synced','synced');
      showToast('your current progress is now backed up ♡');
    }
  }catch(err){
    console.error('Cloud load failed', err);
    setCloudButton('☁ sync error');
    showToast('cloud sync had a tiny problem. local saving still works.');
  }finally{
    cloudLoading = false;
    cloudReady = true;
  }
}
function closeCloudModal(){
  document.getElementById('cloudAuthOverlay')?.remove();
}
function openCloudModal(){
  closeCloudModal();
  const overlay = document.createElement('div');
  overlay.className = 'cloud-auth-overlay';
  overlay.id = 'cloudAuthOverlay';

  if(cloudUser){
    overlay.innerHTML = `
      <div class="cloud-auth-card">
        <button class="cloud-close" id="cloudCloseBtn" aria-label="Close">×</button>
        <h3>cloud sync ♡</h3>
        <p>Cramchy is signed in and can sync across devices.</p>
        <div class="cloud-user">${escapeHtml(cloudUser.email || 'signed in')}</div>
        <div class="cloud-auth-actions">
          <button class="cloud-primary" id="cloudSyncNowBtn">sync now</button>
          <button class="cloud-secondary" id="cloudSignOutBtn">sign out</button>
        </div>
        <p class="cloud-msg" id="cloudAuthMsg"></p>
      </div>`;
  }else{
    overlay.innerHTML = `
      <div class="cloud-auth-card">
        <button class="cloud-close" id="cloudCloseBtn" aria-label="Close">×</button>
        <h3>save it in the cloud ♡</h3>
        <p>Sign in once on this device so your tasks, study progress, notes, and mascot settings can stay synced.</p>
        <label for="cloudEmail">email</label>
        <input id="cloudEmail" type="email" autocomplete="email" placeholder="you@example.com">
        <div class="cloud-auth-actions">
          <button class="cloud-primary" id="cloudSendCodeBtn">send code</button>
        </div>

        <div id="cloudCodeArea" style="display:none; margin-top:14px;">
          <label for="cloudOtpCode">8-digit code</label>
          <input
            id="cloudOtpCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="8"
            pattern="[0-9]*"
            placeholder="12345678"
          >
          <div class="cloud-auth-actions">
            <button class="cloud-primary" id="cloudVerifyCodeBtn">sign in</button>
          </div>
        </div>

        <p class="cloud-msg" id="cloudAuthMsg"></p>
      </div>`;
  }
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if(e.target === overlay) closeCloudModal(); });
  overlay.querySelector('#cloudCloseBtn')?.addEventListener('click', closeCloudModal);

  if(cloudUser){
    overlay.querySelector('#cloudSyncNowBtn')?.addEventListener('click', async () => {
      const msg = overlay.querySelector('#cloudAuthMsg');
      if(msg) msg.textContent = 'syncing…';
      await saveStateToCloud();
      if(msg) msg.textContent = 'synced ♡';
    });
    overlay.querySelector('#cloudSignOutBtn')?.addEventListener('click', async () => {
      await sb.auth.signOut();
      closeCloudModal();
    });
    return;
  }

  const emailEl = overlay.querySelector('#cloudEmail');
  const codeEl = overlay.querySelector('#cloudOtpCode');
  const codeArea = overlay.querySelector('#cloudCodeArea');
  const msgEl = overlay.querySelector('#cloudAuthMsg');
  let pendingOtpEmail = '';

  overlay.querySelector('#cloudSendCodeBtn')?.addEventListener('click', async () => {
    const email = (emailEl?.value || '').trim();
    if(!email){ msgEl.textContent='enter your email first ♡'; return; }

    msgEl.textContent='sending your 8-digit code…';
    const { error } = await sb.auth.signInWithOtp({
      email,
      options:{ shouldCreateUser: true }
    });

    if(error){ msgEl.textContent=error.message; return; }

    pendingOtpEmail = email;
    if(emailEl) emailEl.disabled = true;
    if(codeArea) codeArea.style.display = 'block';
    msgEl.textContent='code sent ♡ check your email, then enter the 8-digit code here.';
    setTimeout(() => codeEl?.focus(), 0);
  });

  overlay.querySelector('#cloudVerifyCodeBtn')?.addEventListener('click', async () => {
    const email = pendingOtpEmail || (emailEl?.value || '').trim();
    const token = (codeEl?.value || '').replace(/\D/g, '').slice(0, 8);

    if(!email){ msgEl.textContent='enter your email first ♡'; return; }
    if(token.length !== 8){ msgEl.textContent='enter the 8-digit code from your email ♡'; return; }

    msgEl.textContent='signing you in…';
    const { data, error } = await sb.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });

    if(error){ msgEl.textContent=error.message; return; }

    if(data?.session){
      msgEl.textContent='signed in ♡ your session will stay on this device.';
      setTimeout(closeCloudModal, 450);
    }else{
      msgEl.textContent='signed in ♡';
    }
  });

  codeEl?.addEventListener('input', () => {
    codeEl.value = codeEl.value.replace(/\D/g, '').slice(0, 8);
  });

  codeEl?.addEventListener('keydown', e => {
    if(e.key === 'Enter') overlay.querySelector('#cloudVerifyCodeBtn')?.click();
  });
}
async function initCloudSync(){
  const btn = document.getElementById('cloudBtn');
  if(!sb){
    setCloudButton('☁ local only');
    return;
  }
  btn?.addEventListener('click', openCloudModal);
  const { data } = await sb.auth.getSession();
  cloudUser = data?.session?.user || null;
  if(cloudUser){
    cloudReady = false;
    await loadCloudStateForUser(cloudUser);
  }else{
    setCloudButton('☁ sign in');
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    const nextUser = session?.user || null;
    if(nextUser && (!cloudUser || cloudUser.id !== nextUser.id)){
      cloudUser = nextUser;
      cloudReady = false;
      await loadCloudStateForUser(cloudUser);
    }else if(!nextUser){
      cloudUser = null;
      cloudReady = false;
      setCloudButton('☁ sign in');
    }
  });
}

/* ===================== COUNTDOWN TICKER ===================== */
function refreshAllCountdowns(){
  document.querySelectorAll('[data-countdown-start]').forEach(el => {
    el.textContent = formatCountdown(el.dataset.countdownStart, el.dataset.countdownEnd);
  });
}
setInterval(refreshAllCountdowns, 30000);

/* ===================== UTIL ===================== */
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}
function escapeAttr(str){ return escapeHtml(str); }


/* ===================== CRAMCHY SHELL + PROFILE ===================== */
const CRAMCHY_THEMES=[
{id:'strawberry-matcha',label:'Strawberry Matcha',colors:['#ffb6c9','#a8c69f']},
{id:'strawberry-milk',label:'Strawberry Milk',colors:['#f49ab4','#fff2f7']},
{id:'matcha-latte',label:'Matcha Latte',colors:['#9eb790','#f3e8ce']},
{id:'lavender',label:'Lavender',colors:['#b494d6','#e6edf8']},
{id:'mocha',label:'Mocha',colors:['#a96f51','#ead7c8']},
{id:'blueberry-milk',label:'Blueberry Milk',colors:['#708fc0','#dce8f7']},
{id:'dark-study',label:'Dark Study',colors:['#352833','#8ba181']}];

function cramchyName(){const n=state?.profile?.name?.trim();return n||'girl';}
function getCramchyGreeting(){
  const h=new Date().getHours(),name=cramchyName(),term=state?.profile?.term||'Term 1',style=state?.profile?.motivation||'mixed';
  const greeting=h<5?'why are we still awake':h<12?'good morning':h<18?'good afternoon':'good evening';
  const endings={sweet:'one little step at a time ♡',chaotic:'academic weapon era starts now.',strict:'let’s get through today’s list.',mixed:'we are absolutely locking in today.'};
  return `${greeting}, ${name} ♡ · ${term} · ${endings[style]||endings.mixed}`;
}
function applyCramchyPersonalization(){
  document.body.dataset.theme=state?.profile?.theme||'strawberry-matcha';
  const g=document.getElementById('cramchyGreeting');if(g)g.textContent=getCramchyGreeting();
}
function personalizeMascotText(text){
  const n=state?.profile?.name?.trim();return String(text).replaceAll('{name}',n?n.toLowerCase():'girl');
}
function themePickerMarkup(selected){
  return CRAMCHY_THEMES.map(t=>`<button type="button" class="theme-choice ${selected===t.id?'selected':''}" data-theme-choice="${t.id}"><span class="theme-dot" style="background:linear-gradient(135deg,${t.colors[0]} 0 50%,${t.colors[1]} 50% 100%)"></span>${t.label}</button>`).join('');
}
function setThemeChoice(theme,root=document){
  state.profile.theme=theme;document.body.dataset.theme=theme;
  root.querySelectorAll?.('[data-theme-choice]').forEach(b=>b.classList.toggle('selected',b.dataset.themeChoice===theme));
  saveState();
}
function renderCramchySettings(){
  if(!state.profile)return;
  const name=document.getElementById('profileName'),yr=document.getElementById('profileYear'),term=document.getElementById('profileTerm'),mot=document.getElementById('profileMotivation');
  if(name)name.value=state.profile.name||'';if(yr)yr.value=state.profile.academicYear||'';
  if(term){if(!Array.from(term.options).some(o=>o.value===state.profile.term)){const o=document.createElement('option');o.value=o.textContent=state.profile.term;term.appendChild(o);}term.value=state.profile.term;}
  if(mot)mot.value=state.profile.motivation||'mixed';
  const picker=document.getElementById('settingsThemePicker');
  if(picker){picker.innerHTML=themePickerMarkup(state.profile.theme);picker.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>setThemeChoice(b.dataset.themeChoice,picker)));}
}
function renderCramchyTasks(){
  const wrap=document.getElementById('cramchyTaskList');if(!wrap)return;
  if(!state.missions.length){wrap.innerHTML=`<div class="shell-empty"><div class="big">nothing here yet ♡</div><p>Add a quick task below. Course-linked tasks, deadlines, priorities, and subtasks come in the full Tasks build.</p></div>`;return;}
  wrap.innerHTML=state.missions.map(m=>`<div class="mission-row"><input type="checkbox" data-cramchy-task-check="${m.id}" ${m.done?'checked':''}><span style="flex:1;${m.done?'text-decoration:line-through;opacity:.6;':''}">${escapeHtml(m.text)}</span><button class="icon-btn" data-cramchy-task-delete="${m.id}" aria-label="Delete">×</button></div>`).join('');
  wrap.querySelectorAll('[data-cramchy-task-check]').forEach(el=>el.addEventListener('change',()=>{const item=state.missions.find(m=>m.id===el.dataset.cramchyTaskCheck);if(item)item.done=el.checked;saveState();renderCramchyTasks();renderDashboard();if(el.checked&&chaowiApi)chaowiApi.react('topic');}));
  wrap.querySelectorAll('[data-cramchy-task-delete]').forEach(el=>el.addEventListener('click',()=>{state.missions=state.missions.filter(m=>m.id!==el.dataset.cramchyTaskDelete);saveState();renderCramchyTasks();renderDashboard();}));
}
function addCramchyQuickTask(){
  const input=document.getElementById('cramchyTaskInput');if(!input||!input.value.trim())return;
  state.missions.push({id:cryptoId(),text:input.value.trim().slice(0,200),done:false});input.value='';saveState();renderCramchyTasks();renderDashboard();
}
function openCramchyOnboarding(){
  if(document.getElementById('cramchyOnboard'))return;
  let selected=state.profile?.theme||'strawberry-matcha';
  const overlay=document.createElement('div');overlay.id='cramchyOnboard';overlay.className='cramchy-onboard';
  overlay.innerHTML=`<div class="cramchy-onboard-card">
    <div style="text-align:center;"><img src="assets/cramchy-wordmark.png" alt="cramchy." style="width:min(260px,78%);height:auto;"><br><img src="assets/cramchy-tagline.png" alt="for the girlies entering their academic weapon era" style="width:min(400px,95%);height:auto;margin-top:6px;"></div>
    <label for="onboardName">what should we call you?</label><input id="onboardName" maxlength="40" placeholder="your nickname">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div><label for="onboardYear">academic year</label><input id="onboardYear" maxlength="30" value="${escapeAttr(state.profile?.academicYear||'2026–2027')}"></div><div><label for="onboardTerm">current term</label><select id="onboardTerm"><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></div></div>
    <label for="onboardMotivation">how should cramchy motivate you?</label><select id="onboardMotivation"><option value="sweet">Sweet — gentle encouragement</option><option value="chaotic">Chaotic — girl, the deadline.</option><option value="strict">Strict — tell me what needs doing</option><option value="mixed">Mixed — surprise me</option></select>
    <label>choose your study space ♡</label><div class="theme-picker" id="onboardThemePicker">${themePickerMarkup(selected)}</div>
    <button class="onboard-start" id="startCramchyBtn">enter my academic weapon era →</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#onboardTerm').value=state.profile?.term||'Term 1';overlay.querySelector('#onboardMotivation').value=state.profile?.motivation||'mixed';
  overlay.querySelectorAll('[data-theme-choice]').forEach(btn=>btn.addEventListener('click',()=>{selected=btn.dataset.themeChoice;overlay.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('selected',b===btn));document.body.dataset.theme=selected;}));
  overlay.querySelector('#startCramchyBtn').addEventListener('click',()=>{
    const name=overlay.querySelector('#onboardName').value.trim();if(!name){overlay.querySelector('#onboardName').focus();return;}
    state.profile={name:name.slice(0,40),academicYear:overlay.querySelector('#onboardYear').value.trim().slice(0,30)||'2026–2027',term:overlay.querySelector('#onboardTerm').value,motivation:overlay.querySelector('#onboardMotivation').value,theme:selected,onboarded:true};
    saveState();applyCramchyPersonalization();overlay.remove();renderAll();showToast(`welcome to cramchy, ${name.toLowerCase()} ♡`,{longer:true});
  });
}
function initCramchyShell(){
  applyCramchyPersonalization();
  document.getElementById('cramchyAddTaskBtn')?.addEventListener('click',addCramchyQuickTask);
  document.getElementById('cramchyTaskInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')addCramchyQuickTask();});
  document.getElementById('saveProfileBtn')?.addEventListener('click',()=>{
    state.profile.name=(document.getElementById('profileName')?.value||'').trim().slice(0,40);
    state.profile.academicYear=(document.getElementById('profileYear')?.value||'2026–2027').trim().slice(0,30);
    state.profile.term=document.getElementById('profileTerm')?.value||'Term 1';
    state.profile.motivation=document.getElementById('profileMotivation')?.value||'mixed';state.profile.onboarded=true;
    saveState();applyCramchyPersonalization();showToast('profile saved ♡');
  });
  document.querySelectorAll('[data-open-tab]').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.openTab)));
  if(typeof CHAOWI_MESSAGES!=='undefined'){
    ["{name}, opening cramchy does not count as studying.","{name}, academic weapon era starts with one task.","{name}, chaowi has reviewed the situation. lock in.","{name}, that reviewer is not going to read itself."].forEach(x=>{if(!CHAOWI_MESSAGES.includes(x))CHAOWI_MESSAGES.push(x);});
  }
  if(!state.profile?.onboarded)setTimeout(openCramchyOnboarding,180);
}


/* ===================== DYNAMIC COURSES + EXAM MODE ===================== */
function renderDailyCountdown(){
  const box=document.getElementById('dailyCountdownBox'); if(!box) return;
  const ex=getClosestExam();
  if(!ex){ box.innerHTML='<p class="small-note">nothing urgent yet ♡</p>'; return; }
  box.innerHTML=`<span class="tag">COMING UP</span><h3>${escapeHtml(ex.subject||'Upcoming exam')}</h3><div class="meta">${escapeHtml(formatExamDate(ex.start))}</div><div class="countdown-big">${formatCountdown(ex.start,ex.end)}</div>`;
}
function renderDynamicCourses(){
  const grid=document.getElementById('dynamicCourseGrid'); if(!grid) return;
  const courses=state.courses||[];
  if(!courses.length){
    grid.innerHTML='<div class="card shell-empty" style="grid-column:1/-1;"><div class="big">no courses yet ♡</div><p>Add your first course so Cramchy can connect tasks, grades, study sessions, and exams to it.</p></div>';
    return;
  }
  grid.innerHTML=courses.map(c=>`
    <div class="course-card-dynamic">
      <div class="course-top">
        <div><h3>${escapeHtml(c.name)}</h3><div class="meta">${escapeHtml(c.code||'No code')}${c.units?` · ${c.units} units`:''}<br>${escapeHtml(c.professor||'Professor not set')}${c.schedule?`<br>${escapeHtml(c.schedule)}`:''}</div></div>
      </div>
      <div class="course-actions">
        <button data-edit-course="${c.id}">Edit</button>
        <button data-delete-course="${c.id}">Delete</button>
      </div>
    </div>`).join('');
  grid.querySelectorAll('[data-edit-course]').forEach(b=>b.addEventListener('click',()=>openCourseModal(b.dataset.editCourse)));
  grid.querySelectorAll('[data-delete-course]').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('Delete this course?')) return;
    state.courses=state.courses.filter(c=>c.id!==b.dataset.deleteCourse); saveState(); renderDynamicCourses();
  }));
}
function openCourseModal(courseId=null){
  const existing=(state.courses||[]).find(c=>c.id===courseId);
  const scrim=document.createElement('div'); scrim.className='modal-scrim';
  scrim.innerHTML=`<div class="course-modal">
    <h3 style="color:var(--red-deep);">${existing?'edit course':'add course ♡'}</h3>
    <div class="course-form-grid">
      <div class="full"><label>course name</label><input id="courseName" value="${escapeAttr(existing?.name||'')}" placeholder="Cognitive Psychology"></div>
      <div><label>course code</label><input id="courseCode" value="${escapeAttr(existing?.code||'')}" placeholder="type code here..."></div>
      <div><label>units</label><input id="courseUnits" type="number" min="0" max="20" step="0.5" value="${existing?.units??3}"></div>
      <div><label>professor</label><input id="courseProf" value="${escapeAttr(existing?.professor||'')}"></div>
      <div><label>section</label><input id="courseSection" value="${escapeAttr(existing?.section||'')}"></div>
      <div><label>room</label><input id="courseRoom" value="${escapeAttr(existing?.room||'')}"></div>
      <div><label>term</label><select id="courseTerm">${['Term 1','Term 2','Term 3'].map(t=>`<option value="${t}" ${t===(existing?.term||state.profile?.term||'Term 1')?'selected':''}>${t}</option>`).join('')}</select></div>
      <div class="full"><label>schedule</label><input id="courseSchedule" value="${escapeAttr(existing?.schedule||'')}" placeholder="Sat · 11:00 AM–1:00 PM · Room 609"></div>
    </div>
    <div class="modal-actions"><button class="more-shortcut" id="cancelCourseModal">cancel</button><button class="btn" id="saveCourseModal">${existing?'save changes':'add course'}</button></div>
  </div>`;
  document.body.appendChild(scrim);
  scrim.querySelector('#cancelCourseModal').addEventListener('click',()=>scrim.remove());
  scrim.addEventListener('click',e=>{if(e.target===scrim)scrim.remove();});
  scrim.querySelector('#saveCourseModal').addEventListener('click',()=>{
    const name=scrim.querySelector('#courseName').value.trim(); if(!name){scrim.querySelector('#courseName').focus();return;}
    const course={
      id:existing?.id||cryptoId(),name:name.slice(0,80),
      code:scrim.querySelector('#courseCode').value.trim().slice(0,30),
      professor:scrim.querySelector('#courseProf').value.trim().slice(0,80),
      section:scrim.querySelector('#courseSection').value.trim().slice(0,40),
      units:Math.max(0,Math.min(20,Number(scrim.querySelector('#courseUnits').value)||0)),
      room:scrim.querySelector('#courseRoom').value.trim().slice(0,40),
      color:existing?.color||'pink',
      term:scrim.querySelector('#courseTerm').value.trim().slice(0,30),
      schedule:scrim.querySelector('#courseSchedule').value.trim().slice(0,120)
    };
    if(existing) state.courses=state.courses.map(c=>c.id===existing.id?course:c); else state.courses.push(course);
    saveState(); renderDynamicCourses(); scrim.remove(); showToast(existing?'course updated ♡':'course added ♡');
  });
}
function renderExamMode(){
  const active=state.examPeriod;
  document.body.classList.toggle('exam-mode-active', !!active);

  const brand=document.querySelector('.brand');
  const title=document.getElementById('examHeroTitle');
  const tagline=document.getElementById('examHeroTagline');

  if(active){
    const upper=active==='midterms'?'midterms szn':'finals szn';
    const lower=active==='midterms'?'midterms szn':'finals szn';
    if(brand) brand.dataset.examLabel=lower;
    if(title) title.textContent=lower;
    if(tagline) tagline.textContent=`you gotta lock in, ${cramchyName().toLowerCase()}!`;
    document.title=`${upper} · Cramchy`;
  }else{
    if(brand) brand.dataset.examLabel='';
    document.title='Cramchy. — study companion';
  }
}
function setExamPeriod(period){
  state.examPeriod=period;
  saveState();
  renderExamMode();
  switchTab('dashboard');
  showToast(period==='midterms'?'midterms szn. lock in.':'finals szn. final boss mode.',{longer:true});
}
function leaveExamMode(goToChooser=false){
  state.examPeriod=null;
  saveState();
  renderExamMode();
  renderDailyHome();
  switchTab(goToChooser?'exam':'dashboard');
}
function initExamAndCourses(){
  document.getElementById('addCourseBtn')?.addEventListener('click',()=>openCourseModal());
  document.querySelectorAll('[data-exam-choice]').forEach(b=>b.addEventListener('click',()=>setExamPeriod(b.dataset.examChoice)));
  document.querySelectorAll('[data-exam-tab]').forEach(b=>b.addEventListener('click',()=>{if(state.examPeriod)switchTab(b.dataset.examTab);}));
  document.getElementById('exitExamModeTopBtn')?.addEventListener('click',()=>leaveExamMode(false));
  document.getElementById('changeExamPeriodBtn')?.addEventListener('click',()=>leaveExamMode(true));
  renderDynamicCourses();renderGradebook();renderGwaCalculator();renderQuickGwa();renderDailyCountdown();renderExamMode();
  if(state.examPeriod)switchTab('dashboard');
}


/* ===================== CRAMCHY DAILY HOME ===================== */
function minutesToday(){
  const now=new Date();
  return (state.studyHistory||[]).filter(h=>{
    const d=new Date(h.timestamp);
    return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate();
  }).reduce((sum,h)=>sum+(Number(h.minutes)||0),0);
}
function formatStudyMinutes(mins){
  if(mins<60) return `${mins}m`;
  const h=Math.floor(mins/60),m=mins%60;
  return m?`${h}h ${m}m`:`${h}h`;
}
function nextExamDays(){
  const ex=getClosestExam();
  if(!ex) return '—';
  const diff=new Date(ex.start).getTime()-Date.now();
  if(diff<=0) return 'today';
  const days=Math.ceil(diff/86400000);
  return days===1?'1d':`${days}d`;
}
function nextCourseLabel(){
  const courses=state.courses||[];
  if(!courses.length) return '—';
  const first=courses[0];
  return first.code||first.name.slice(0,8);
}
function renderDailyTasks(){
  const wrap=document.getElementById('dailyTaskList'); if(!wrap) return;
  const tasks=(state.missions||[]).slice(0,5);
  if(!tasks.length){
    wrap.innerHTML='<div class="shell-empty" style="padding:18px 10px;"><div class="big">nothing due here ♡</div><p>Add a task and it will show up on your daily dashboard.</p></div>';
    return;
  }
  wrap.innerHTML=tasks.map(m=>`<label class="daily-task-row ${m.done?'done':''}">
    <input type="checkbox" data-daily-task="${m.id}" ${m.done?'checked':''}>
    <span class="task-text">${escapeHtml(m.text)}</span>
  </label>`).join('');
  wrap.querySelectorAll('[data-daily-task]').forEach(el=>el.addEventListener('change',()=>{
    const item=state.missions.find(m=>m.id===el.dataset.dailyTask); if(item)item.done=el.checked;
    saveState(); renderDailyHome(); renderCramchyTasks(); renderDashboard();
  }));
}
function renderDailyCourses(){
  const strip=document.getElementById('dailyCourseStrip'); if(!strip) return;
  const courses=(state.courses||[]).slice(0,6);
  if(!courses.length){
    strip.innerHTML='<div class="card shell-empty" style="grid-column:1/-1;"><div class="big">add your courses ♡</div><p>Once added, your daily dashboard will pull course info from them.</p><button class="btn" id="homeAddCourseBtn">+ add course</button></div>';
    document.getElementById('homeAddCourseBtn')?.addEventListener('click',()=>openCourseModal());
    return;
  }
  strip.innerHTML=courses.map(c=>`<button type="button" class="home-course" data-home-course="${c.id}" style="text-align:left;font:inherit;">
    <h4>${escapeHtml(c.name)}</h4>
    <p>${escapeHtml(c.code||'No code')}${c.schedule?`<br>${escapeHtml(c.schedule)}`:''}</p>
  </button>`).join('');
  strip.querySelectorAll('[data-home-course]').forEach(b=>b.addEventListener('click',()=>switchTab('subjects')));
}
function renderDailyUpcoming(){
  const wrap=document.getElementById('dailyUpcomingList'); if(!wrap) return;
  const ex=getSortedExams().filter(e=>new Date(e.end).getTime()>Date.now()).slice(0,3);
  if(!ex.length){wrap.innerHTML='<div class="small-note">nothing urgent right now ♡</div>';return;}
  wrap.innerHTML=ex.map(e=>`<div class="upcoming-item"><strong>${escapeHtml(e.subject)}</strong><span>${escapeHtml(formatExamDate(e.start))} · ${formatCountdown(e.start,e.end)}</span></div>`).join('');
}
function renderSmartStudySuggestion(){
  const title=document.getElementById('smartStudyTitle'),copy=document.getElementById('smartStudyCopy');
  const courses=coursesForCurrentTerm();
  if(!courses.length){
    if(title)title.textContent='add a course first ♡';
    if(copy)copy.textContent='Once your courses are in Cramchy, I can suggest what to study.';
    return;
  }
  const c=courses[Math.floor(Math.random()*courses.length)];
  if(title)title.textContent=`study ${c.name}`;
  if(copy)copy.textContent=`Start with 30 minutes${c.code?` for ${c.code}`:''}. One focused session is enough to get moving.`;
}
function renderDailyHome(){
  const name=cramchyName();
  const h=new Date().getHours();
  const greeting=h<5?'why are we still awake':h<12?'good morning':h<18?'good afternoon':'good evening';
  const dg=document.getElementById('dailyGreeting'); if(dg) dg.textContent=`${greeting}, ${name}.`;
  const dm=document.getElementById('dailyMeta'); if(dm) dm.textContent=`${state.profile?.term||'Term 1'} · ${state.profile?.academicYear||''}`;
  const left=(state.missions||[]).filter(m=>!m.done).length;
  const t=document.getElementById('dailyTasksLeft'); if(t)t.textContent=left;
  const nc=document.getElementById('dailyNextClass'); if(nc)nc.textContent=nextCourseLabel();
  const st=document.getElementById('dailyStudyTime'); if(st)st.textContent=formatStudyMinutes(minutesToday());
  const ed=document.getElementById('dailyExamDays'); if(ed)ed.textContent=nextExamDays();
  renderDailyCountdown();
  renderDailyTasks();
  renderDailyCourses();
  renderDailyUpcoming();
}
function openDailyQuickAdd(){
  switchTab('tasks');
  setTimeout(()=>document.getElementById('cramchyTaskInput')?.focus(),50);
}
function initDailyHome(){
  document.getElementById('dailyQuickAddBtn')?.addEventListener('click',openDailyQuickAdd);
  document.getElementById('dailyViewTasksBtn')?.addEventListener('click',()=>switchTab('tasks'));
  document.getElementById('homeExamModeBtn')?.addEventListener('click',()=>switchTab('exam'));
  document.getElementById('smartStudyBtn')?.addEventListener('click',renderSmartStudySuggestion);
  renderDailyHome();
}


/* ===================== COURSES v2 + GRADEBOOK ===================== */
const COURSE_COLORS={pink:'#e98aa7',matcha:'#91aa78',lavender:'#9b82c7',blue:'#779cca',peach:'#d99678',rose:'#c96f83'};
const DAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const GRADE_CATEGORIES={ww:'Written Works & Quizzes',pt:'Enabling Activities',attendance:'Attendance',exam:'Major Exam'};
let selectedGradeCourseId=null;
let selectedGradePeriod='midterms';

function courseScheme(course){
  const s=course?.gradingScheme||{};
  return {ww:Number(s.ww??30),pt:Number(s.pt??20),attendance:Number(s.attendance??10),exam:Number(s.exam??40)};
}
function normalizeCourseSchedules(course){
  if(Array.isArray(course?.schedules)&&course.schedules.length) return course.schedules;
  const raw=(course?.schedule||'').trim();
  if(!raw) return [];
  const m=raw.match(/^(Sun(?:day)?|Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?)\s*[·|-]\s*([^·]+?)[–-]([^·]+?)(?:\s*[·|-]\s*(.*))?$/i);
  if(!m) return [{id:cryptoId(),day:'',start:'',end:'',room:raw,legacy:true}];
  const dayMap={sun:'Sunday',sunday:'Sunday',mon:'Monday',monday:'Monday',tue:'Tuesday',tuesday:'Tuesday',wed:'Wednesday',wednesday:'Wednesday',thu:'Thursday',thursday:'Thursday',fri:'Friday',friday:'Friday',sat:'Saturday',saturday:'Saturday'};
  const parseClock=(x)=>{
    const mm=String(x).trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i); if(!mm) return '';
    let h=+mm[1],min=mm[2],ap=mm[3].toUpperCase(); if(ap==='PM'&&h<12)h+=12;if(ap==='AM'&&h===12)h=0;return String(h).padStart(2,'0')+':'+min;
  };
  return [{id:cryptoId(),day:dayMap[m[1].toLowerCase()]||'',start:parseClock(m[2]),end:parseClock(m[3]),room:(m[4]||'').replace(/^Room\s*/i,'').trim()}];
}
function displayTime24(t){
  if(!t) return '';
  const [h,m]=t.split(':').map(Number); if(!Number.isFinite(h)) return t;
  const ap=h>=12?'PM':'AM',hh=(h%12)||12; return `${hh}:${String(m||0).padStart(2,'0')} ${ap}`;
}
function scheduleText(s){
  if(s.legacy) return s.room||'Schedule not set';
  const times=s.start&&s.end?`${displayTime24(s.start)}–${displayTime24(s.end)}`:(s.start?displayTime24(s.start):'Time not set');
  return `${s.day||'Day not set'} · ${times}${s.room?` · ${s.room}`:''}`;
}
function nextClassOccurrence(){
  let best=null;
  const now=new Date();
  coursesForCurrentTerm().forEach(course=>{
    normalizeCourseSchedules(course).forEach(s=>{
      if(!DAY_NAMES.includes(s.day)||!/^\d{2}:\d{2}$/.test(s.start||'')) return;
      const targetDay=DAY_NAMES.indexOf(s.day);
      const [hh,mm]=s.start.split(':').map(Number);
      let delta=(targetDay-now.getDay()+7)%7;
      const d=new Date(now); d.setSeconds(0,0); d.setHours(hh,mm,0,0); d.setDate(now.getDate()+delta);
      if(d<=now){d.setDate(d.getDate()+7);}
      if(!best||d<best.when) best={course,schedule:s,when:d};
    });
  });
  return best;
}
function nextCourseLabel(){
  const n=nextClassOccurrence(); if(!n) return '—';
  return `${n.course.code||n.course.name} · ${displayTime24(n.schedule.start)}`;
}

function renderDynamicCourses(){
  const grid=document.getElementById('dynamicCourseGrid'); if(!grid) return;
  const courses=coursesForCurrentTerm();
  if(!courses.length){
    grid.innerHTML='<div class="card shell-empty" style="grid-column:1/-1;"><div class="big">no courses yet</div><p>Add your first course. You can edit, schedule, or remove it anytime.</p><button class="btn" id="emptyAddCourseBtn">+ add course</button></div>';
    document.getElementById('emptyAddCourseBtn')?.addEventListener('click',()=>openCourseModal());
    return;
  }
  grid.innerHTML=courses.map(c=>{
    const schedules=normalizeCourseSchedules(c);
    const scheduleHtml=schedules.length?schedules.map(s=>`<div class="schedule-chip"><span>${escapeHtml(scheduleText(s))}</span></div>`).join(''):'<div class="schedule-chip"><span>no class schedule yet</span></div>';
    const accent=COURSE_COLORS[c.color]||COURSE_COLORS.pink;
    return `<div class="course-card-dynamic" style="--course-accent:${accent}"><div class="course-accent"></div><div class="course-card-body">
      <div class="course-top"><div><h3>${escapeHtml(c.name)}</h3><div class="meta">${escapeHtml(c.code||'No code')}${c.units?` · ${c.units} units`:''}<br>${escapeHtml(c.professor||'Professor not set')}${c.section?` · ${escapeHtml(c.section)}`:''}</div></div></div>
      <div class="schedule-stack">${scheduleHtml}</div>
      <div class="course-card-help">You can change details anytime. “Schedules” lets you add multiple meeting days.</div>
      <div class="course-actions"><button data-edit-course="${c.id}">✎ edit course</button><button data-schedule-course="${c.id}">🗓 edit schedules</button><button class="danger" data-delete-course="${c.id}">remove course</button></div>
    </div></div>`;
  }).join('');
  grid.querySelectorAll('[data-edit-course]').forEach(b=>b.addEventListener('click',()=>openCourseModal(b.dataset.editCourse,false)));
  grid.querySelectorAll('[data-schedule-course]').forEach(b=>b.addEventListener('click',()=>openCourseModal(b.dataset.scheduleCourse,true)));
  grid.querySelectorAll('[data-delete-course]').forEach(b=>b.addEventListener('click',()=>removeCourse(b.dataset.deleteCourse)));
}
function removeCourse(courseId){
  const c=(state.courses||[]).find(x=>x.id===courseId); if(!c) return;
  if(!confirm(`Remove ${c.name}? Its gradebook and course-linked exam workspace entries will also be removed.`)) return;
  state.courses=state.courses.filter(x=>x.id!==courseId);
  if(state.gradebook) delete state.gradebook[courseId];
  const key=academicKey(c.academicYear||profileAcademicYear(),c.term||profileTerm());
  const record=state.examData?.[key];
  const sid=`course-${courseId}`;
  if(record){
    ['midterms','finals'].forEach(period=>{
      const p=record[period];
      if(!p)return;
      p.exams=(p.exams||[]).filter(e=>(e.subjectId||e.id)!==sid);
      if(p.subjects)delete p.subjects[sid];
      if(p.subjectNames)delete p.subjectNames[sid];
    });
  }
  if(selectedGradeCourseId===courseId) selectedGradeCourseId=null;
  saveState(); renderDynamicCourses(); renderDailyHome(); renderGradebook(); renderGwaCalculator(); showToast('course removed');
}
function scheduleRowMarkup(s={}){
  const days=DAY_NAMES.map(d=>`<option value="${d}" ${s.day===d?'selected':''}>${d}</option>`).join('');
  return `<div class="schedule-row-edit" data-schedule-row>
    <div><label>day</label><select data-sch-day><option value="">choose day</option>${days}</select></div>
    <div><label>start</label><input type="time" data-sch-start value="${escapeAttr(s.start||'')}"></div>
    <div><label>end</label><input type="time" data-sch-end value="${escapeAttr(s.end||'')}"></div>
    <div class="schedule-room"><label>room / place</label><input data-sch-room value="${escapeAttr(s.room||'')}" placeholder="Room 609"></div>
    <button type="button" class="schedule-remove-btn" data-remove-schedule aria-label="Remove schedule">×</button>
  </div>`;
}
function openCourseModal(courseId=null,focusSchedules=false){
  const existing=(state.courses||[]).find(c=>c.id===courseId);
  const schedules=existing?normalizeCourseSchedules(existing).filter(s=>!s.legacy):[];
  const scheme=courseScheme(existing);
  const scrim=document.createElement('div'); scrim.className='modal-scrim';
  scrim.innerHTML=`<div class="course-modal">
    <h3 style="color:var(--red-deep);">${existing?'edit course':'add course'}</h3>
    <div class="course-form-grid">
      <div class="full"><label>course name</label><input id="courseName" value="${escapeAttr(existing?.name||'')}" placeholder="Cognitive Psychology"></div>
      <div><label>course code</label><input id="courseCode" value="${escapeAttr(existing?.code||'')}" placeholder="type code here..."></div>
      <div><label>units</label><input id="courseUnits" type="number" min="0" max="20" step="0.5" value="${existing?.units??3}"></div>
      <div><label>professor</label><input id="courseProf" value="${escapeAttr(existing?.professor||'')}"></div>
      <div><label>section</label><input id="courseSection" value="${escapeAttr(existing?.section||'')}"></div>
      <div><label>default room</label><input id="courseRoom" value="${escapeAttr(existing?.room||'')}"></div>
      <div><label>term</label><input id="courseTerm" value="${escapeAttr(existing?.term||state.profile?.term||'Term 1')}"></div>
      <div><label>course color</label><select id="courseColor">${Object.keys(COURSE_COLORS).map(k=>`<option value="${k}" ${existing?.color===k?'selected':''}>${k}</option>`).join('')}</select></div>
      <div class="schedule-editor" id="scheduleEditor"><div class="schedule-editor-head"><div><strong>class schedules</strong><div class="small-note">Add more than one meeting day if needed.</div></div><button type="button" class="more-shortcut" id="addScheduleRowBtn">+ schedule</button></div><div id="scheduleRows">${(schedules.length?schedules:[{}]).map(scheduleRowMarkup).join('')}</div></div>
      <div class="weight-editor"><strong>grading weights</strong><div class="small-note">Default is your 30 / 20 / 10 / 40 system. Total must equal 100%.</div><div class="weight-grid">
        <div><label>Written & Quizzes</label><input id="weightWW" type="number" min="0" max="100" step="1" value="${scheme.ww}"></div>
        <div><label>Enabling Activities</label><input id="weightPT" type="number" min="0" max="100" step="1" value="${scheme.pt}"></div>
        <div><label>Attendance</label><input id="weightAttendance" type="number" min="0" max="100" step="1" value="${scheme.attendance}"></div>
        <div><label>Major Exam</label><input id="weightExam" type="number" min="0" max="100" step="1" value="${scheme.exam}"></div>
      </div><div class="weight-total" id="weightTotal"></div></div>
    </div>
    <div class="modal-actions"><button class="more-shortcut" id="cancelCourseModal">cancel</button><button class="btn" id="saveCourseModal">${existing?'save changes':'add course'}</button></div>
  </div>`;
  document.body.appendChild(scrim);
  const rows=scrim.querySelector('#scheduleRows');
  const bindRemove=()=>scrim.querySelectorAll('[data-remove-schedule]').forEach(btn=>{btn.onclick=()=>{const row=btn.closest('[data-schedule-row]'); if(scrim.querySelectorAll('[data-schedule-row]').length>1)row.remove(); else{row.querySelectorAll('input').forEach(i=>i.value='');row.querySelector('select').value='';}}});
  bindRemove();
  scrim.querySelector('#addScheduleRowBtn').addEventListener('click',()=>{rows.insertAdjacentHTML('beforeend',scheduleRowMarkup({}));bindRemove();});
  const updateWeightTotal=()=>{const vals=['weightWW','weightPT','weightAttendance','weightExam'].map(id=>Number(scrim.querySelector('#'+id).value)||0);const total=vals.reduce((a,b)=>a+b,0);const el=scrim.querySelector('#weightTotal');el.textContent=`total: ${total}%${Math.abs(total-100)<0.001?' ✓':' — must equal 100%'}`;el.style.color=Math.abs(total-100)<0.001?'var(--matcha-dark)':'#a43f55';};
  ['weightWW','weightPT','weightAttendance','weightExam'].forEach(id=>scrim.querySelector('#'+id).addEventListener('input',updateWeightTotal));updateWeightTotal();
  scrim.querySelector('#cancelCourseModal').addEventListener('click',()=>scrim.remove());scrim.addEventListener('click',e=>{if(e.target===scrim)scrim.remove();});
  if(focusSchedules) setTimeout(()=>scrim.querySelector('#scheduleEditor')?.scrollIntoView({behavior:'smooth',block:'center'}),50);
  scrim.querySelector('#saveCourseModal').addEventListener('click',()=>{
    const name=scrim.querySelector('#courseName').value.trim();if(!name){scrim.querySelector('#courseName').focus();return;}
    const gradingScheme={ww:Number(scrim.querySelector('#weightWW').value)||0,pt:Number(scrim.querySelector('#weightPT').value)||0,attendance:Number(scrim.querySelector('#weightAttendance').value)||0,exam:Number(scrim.querySelector('#weightExam').value)||0};
    const totalW=Object.values(gradingScheme).reduce((a,b)=>a+b,0);if(Math.abs(totalW-100)>0.001){showToast('grading weights must total 100%');return;}
    const newSchedules=[...scrim.querySelectorAll('[data-schedule-row]')].map(row=>({id:cryptoId(),day:row.querySelector('[data-sch-day]').value,start:row.querySelector('[data-sch-start]').value,end:row.querySelector('[data-sch-end]').value,room:row.querySelector('[data-sch-room]').value.trim().slice(0,50)})).filter(s=>s.day||s.start||s.end||s.room);
    const course={id:existing?.id||cryptoId(),name:name.slice(0,80),code:scrim.querySelector('#courseCode').value.trim().slice(0,30),professor:scrim.querySelector('#courseProf').value.trim().slice(0,80),section:scrim.querySelector('#courseSection').value.trim().slice(0,40),units:Math.max(0,Math.min(20,Number(scrim.querySelector('#courseUnits').value)||0)),room:scrim.querySelector('#courseRoom').value.trim().slice(0,40),color:scrim.querySelector('#courseColor').value,term:scrim.querySelector('#courseTerm').value.trim().slice(0,30),academicYear:existing?.academicYear||state.profile?.academicYear||'2026–2027',schedule:'',schedules:newSchedules,gradingScheme,gwaFinalGrade:existing?.gwaFinalGrade||'',gwaMode:existing?.gwaMode||'auto'};
    if(existing)state.courses=state.courses.map(c=>c.id===existing.id?course:c);else state.courses.push(course);
    if(!state.gradebook)state.gradebook={};if(!state.gradebook[course.id])state.gradebook[course.id]={midterms:[],finals:[]};
    saveState();renderDynamicCourses();renderDailyHome();renderGradebook();renderGwaCalculator();scrim.remove();showToast(existing?'course updated':'course added');
  });
}

function renderDailyCourses(){
  const strip=document.getElementById('dailyCourseStrip');if(!strip)return;
  const courses=coursesForCurrentTerm().slice(0,6);
  if(!courses.length){strip.innerHTML='<div class="card shell-empty" style="grid-column:1/-1;"><div class="big">add your courses</div><p>Once added, your daily dashboard will use their schedules and grades.</p><button class="btn" id="homeAddCourseBtn">+ add course</button></div>';document.getElementById('homeAddCourseBtn')?.addEventListener('click',()=>openCourseModal());return;}
  strip.innerHTML=courses.map(c=>{const s=normalizeCourseSchedules(c)[0];return `<button type="button" class="home-course" data-home-course="${c.id}" style="text-align:left;font:inherit;"><h4>${escapeHtml(c.name)}</h4><p>${escapeHtml(c.code||'No code')}${s?`<br>${escapeHtml(scheduleText(s))}`:'<br>no schedule yet'}</p></button>`;}).join('');
  strip.querySelectorAll('[data-home-course]').forEach(b=>b.addEventListener('click',()=>switchTab('subjects')));
}

function gradeData(courseId){if(!state.gradebook)state.gradebook={};if(!state.gradebook[courseId])state.gradebook[courseId]={midterms:[],finals:[]};return state.gradebook[courseId];}
function categoryStats(courseId,period,key,extraPct=null){
  const arr=(gradeData(courseId)[period]||[]).filter(a=>a.category===key);let earned=0,total=0;arr.forEach(a=>{earned+=Number(a.score)||0;total+=Number(a.total)||0;});if(extraPct!==null){earned+=Number(extraPct)||0;total+=100;}return {count:arr.length+(extraPct!==null?1:0),earned,total,pct:total>0?(earned/total*100):null};
}
function termGrade(courseId,period,hypothetical=null){
  const course=(state.courses||[]).find(c=>c.id===courseId);if(!course)return null;const scheme=courseScheme(course);let sum=0,used=0;
  Object.keys(GRADE_CATEGORIES).forEach(key=>{const extra=hypothetical&&hypothetical.category===key?hypothetical.pct:null;const st=categoryStats(courseId,period,key,extra);if(st.pct!==null){sum+=st.pct*(scheme[key]||0);used+=scheme[key]||0;}});
  return used>0?sum/used:null;
}
function gradePoint(p){if(p===null||!Number.isFinite(p))return null;if(p>=96)return '4.0';if(p>=90)return '3.5';if(p>=84)return '3.0';if(p>=78)return '2.5';if(p>=72)return '2.0';return 'R';}
function overallGrade(courseId){const m=termGrade(courseId,'midterms'),f=termGrade(courseId,'finals');if(m!==null&&f!==null)return (m+f)/2;if(m!==null)return m;if(f!==null)return f;return null;}
function fmtPct(p){return p===null||!Number.isFinite(p)?'—':`${p.toFixed(2)}%`;}
function assessmentPct(a){return Number(a.total)>0?Number(a.score)/Number(a.total)*100:0;}

function renderGradebook(){
  const root=document.getElementById('gradebookRoot');if(!root)return;const courses=coursesForCurrentTerm();
  if(!courses.length){root.innerHTML='<div class="card shell-empty"><div class="big">add a course first</div><p>Your gradebook is course-based. Add a course, then start entering scores.</p><button class="btn" id="gradeAddCourseBtn">+ add course</button></div>';document.getElementById('gradeAddCourseBtn')?.addEventListener('click',()=>openCourseModal());return;}
  if(!selectedGradeCourseId||!courses.some(c=>c.id===selectedGradeCourseId))selectedGradeCourseId=courses[0].id;
  const cards=courses.map(c=>{const g=overallGrade(c.id),gp=gradePoint(g);return `<button class="grade-course-card ${c.id===selectedGradeCourseId?'active':''}" data-grade-course="${c.id}"><h4>${escapeHtml(c.name)}</h4><div class="grade-big">${fmtPct(g)}</div><div class="small">${gp?`equivalent ${gp}`:'no scores yet'} · ${escapeHtml(c.code||'no code')}</div></button>`;}).join('');
  const course=courses.find(c=>c.id===selectedGradeCourseId),scheme=courseScheme(course),m=termGrade(course.id,'midterms'),f=termGrade(course.id,'finals'),overall=overallGrade(course.id),period=selectedGradePeriod,data=gradeData(course.id)[period]||[];
  const cats=Object.keys(GRADE_CATEGORIES).map(key=>{const st=categoryStats(course.id,period,key);const contribution=st.pct===null?null:st.pct*(scheme[key]||0)/100;return `<div class="category-card"><div class="cat-name">${GRADE_CATEGORIES[key]}</div><div class="cat-score">${fmtPct(st.pct)}</div><div class="cat-meta">weight ${scheme[key]}%${contribution!==null?` · contributes ${contribution.toFixed(2)}`:''}<br>${st.count} score${st.count===1?'':'s'}</div></div>`;}).join('');
  const rows=data.length?data.map(a=>`<div class="assessment-row"><div><div class="name">${escapeHtml(a.name)}</div><div class="sub">${a.date?escapeHtml(a.date)+' · ':''}${Number(a.score)} / ${Number(a.total)}</div></div><div class="assessment-cat"><div class="sub">${GRADE_CATEGORIES[a.category]}</div></div><div class="pct">${assessmentPct(a).toFixed(1)}%</div><div class="assessment-actions"><button data-edit-assessment="${a.id}">edit</button><button class="danger" data-delete-assessment="${a.id}">remove</button></div></div>`).join(''):'<div class="shell-empty" style="padding:20px 10px;"><div class="big">no scores yet</div><p>Add quizzes, enabling activities, attendance, and your major exam as results come in.</p></div>';
  root.innerHTML=`<div class="grade-course-grid">${cards}</div><div class="card"><div class="page-head-row"><div><h3 style="color:var(--red-deep);">${escapeHtml(course.name)}</h3><p class="small-note">${escapeHtml(course.code||'')} · category average uses total points earned ÷ total points possible.</p></div><button class="more-shortcut" id="editGradeCourseBtn">edit weights</button></div>
    <div class="grade-overview-row"><div class="grade-overview-card"><div class="k">Midterms estimate</div><div class="v">${fmtPct(m)}</div><div class="small-note">${gradePoint(m)||'no scores'}</div></div><div class="grade-overview-card"><div class="k">Finals estimate</div><div class="v">${fmtPct(f)}</div><div class="small-note">${gradePoint(f)||'no scores'}</div></div><div class="grade-overview-card"><div class="k">Overall / available</div><div class="v">${fmtPct(overall)}</div><div class="small-note">${gradePoint(overall)||'no scores'} · Midterms 50% / Finals 50%</div></div></div>
    <div class="grade-period-tabs"><button data-grade-period="midterms" class="${period==='midterms'?'active':''}">Midterms</button><button data-grade-period="finals" class="${period==='finals'?'active':''}">Finals</button></div>
    <div class="category-grid">${cats}</div>
    <div class="assessment-head"><div><h3 style="color:var(--red-deep);font-size:1.05rem;">${period==='midterms'?'Midterms':'Finals'} scores</h3><p class="small-note">Current estimate: ${fmtPct(termGrade(course.id,period))}</p></div><button class="btn" id="addAssessmentBtn">+ add score</button></div><div class="assessment-list">${rows}</div>
    <div class="grade-tools"><div class="tool-card"><h4>what-if major exam</h4><p>Preview your estimated ${period} grade with a hypothetical major exam score.</p><div class="tool-inline"><div><label>exam score %</label><input id="whatIfScore" type="number" min="0" max="100" value="90"></div><div><label>projected term grade</label><div class="tool-result" id="whatIfResult" style="margin-top:0;">—</div></div></div><div class="grade-note">This adds a hypothetical 100-point major exam to the scores already entered.</div></div>
    <div class="tool-card"><h4>target calculator</h4><p>How much would you need on a 100-point Major Exam to reach a target term percentage?</p><div class="tool-inline"><div><label>target %</label><input id="targetGradePct" type="number" min="0" max="100" value="90"></div><div><button class="btn" id="calcTargetBtn" style="width:100%;">calculate</button></div></div><div class="tool-result" id="targetResult">enter a target and calculate</div><div class="grade-note">Missing categories are excluded from the current estimate until you enter a score for them.</div></div></div>
  </div>`;
  root.querySelectorAll('[data-grade-course]').forEach(b=>b.addEventListener('click',()=>{selectedGradeCourseId=b.dataset.gradeCourse;renderGradebook();}));
  root.querySelectorAll('[data-grade-period]').forEach(b=>b.addEventListener('click',()=>{selectedGradePeriod=b.dataset.gradePeriod;renderGradebook();}));
  root.querySelector('#addAssessmentBtn')?.addEventListener('click',()=>openAssessmentModal(course.id,period));
  root.querySelector('#editGradeCourseBtn')?.addEventListener('click',()=>openCourseModal(course.id,false));
  root.querySelectorAll('[data-edit-assessment]').forEach(b=>b.addEventListener('click',()=>openAssessmentModal(course.id,period,b.dataset.editAssessment)));
  root.querySelectorAll('[data-delete-assessment]').forEach(b=>b.addEventListener('click',()=>deleteAssessment(course.id,period,b.dataset.deleteAssessment)));
  const updateWhatIf=()=>{const val=Math.max(0,Math.min(100,Number(root.querySelector('#whatIfScore')?.value)||0));const proj=termGrade(course.id,period,{category:'exam',pct:val});const el=root.querySelector('#whatIfResult');if(el)el.textContent=`${fmtPct(proj)} · ${gradePoint(proj)||'—'}`;};root.querySelector('#whatIfScore')?.addEventListener('input',updateWhatIf);updateWhatIf();
  root.querySelector('#calcTargetBtn')?.addEventListener('click',()=>calculateTarget(course.id,period));
}
function openAssessmentModal(courseId,period,assessmentId=null){
  const arr=gradeData(courseId)[period]||[],existing=arr.find(a=>a.id===assessmentId);const course=(state.courses||[]).find(c=>c.id===courseId);const scrim=document.createElement('div');scrim.className='modal-scrim';
  scrim.innerHTML=`<div class="course-modal"><h3 style="color:var(--red-deep);">${existing?'edit score':'add score'}</h3><p class="small-note">${escapeHtml(course?.name||'Course')} · ${period==='midterms'?'Midterms':'Finals'}</p><div class="course-form-grid"><div class="full"><label>assessment name</label><input id="assName" value="${escapeAttr(existing?.name||'')}" placeholder="Quiz 1"></div><div><label>category</label><select id="assCategory">${Object.entries(GRADE_CATEGORIES).map(([k,v])=>`<option value="${k}" ${existing?.category===k?'selected':''}>${v}</option>`).join('')}</select></div><div><label>date</label><input id="assDate" type="date" value="${escapeAttr(existing?.date||'')}"></div><div><label>score</label><input id="assScore" type="number" min="0" step="0.01" value="${existing?.score??''}" placeholder="18"></div><div><label>out of</label><input id="assTotal" type="number" min="0.01" step="0.01" value="${existing?.total??''}" placeholder="20"></div></div><div class="modal-actions"><button class="more-shortcut" id="cancelAss">cancel</button><button class="btn" id="saveAss">${existing?'save changes':'add score'}</button></div></div>`;document.body.appendChild(scrim);scrim.querySelector('#cancelAss').addEventListener('click',()=>scrim.remove());scrim.addEventListener('click',e=>{if(e.target===scrim)scrim.remove();});
  scrim.querySelector('#saveAss').addEventListener('click',()=>{const name=scrim.querySelector('#assName').value.trim(),score=Number(scrim.querySelector('#assScore').value),total=Number(scrim.querySelector('#assTotal').value);if(!name){scrim.querySelector('#assName').focus();return;}if(!Number.isFinite(score)||score<0||!Number.isFinite(total)||total<=0){showToast('enter a valid score and total');return;}const a={id:existing?.id||cryptoId(),name:name.slice(0,100),category:scrim.querySelector('#assCategory').value,score,total,date:scrim.querySelector('#assDate').value};const g=gradeData(courseId);g[period]=existing?g[period].map(x=>x.id===existing.id?a:x):[...g[period],a];saveState();scrim.remove();renderGradebook();showToast(existing?'score updated':'score added');});
}
function deleteAssessment(courseId,period,id){if(!confirm('Remove this score?'))return;const g=gradeData(courseId);g[period]=g[period].filter(a=>a.id!==id);saveState();renderGradebook();showToast('score removed');}
function calculateTarget(courseId,period){
  const root=document.getElementById('gradebookRoot'),target=Math.max(0,Math.min(100,Number(root?.querySelector('#targetGradePct')?.value)||0)),out=root?.querySelector('#targetResult');if(!out)return;
  const at0=termGrade(courseId,period,{category:'exam',pct:0}),at100=termGrade(courseId,period,{category:'exam',pct:100});
  if(at0!==null&&at0>=target){out.textContent=`0% would already keep the estimate at or above ${target.toFixed(1)}%.`;return;}
  if(at100===null||at100<target){out.textContent=`Not reachable with a 100% exam based on the scores entered. 100% projects ${fmtPct(at100)}.`;return;}
  let lo=0,hi=100;for(let i=0;i<50;i++){const mid=(lo+hi)/2,p=termGrade(courseId,period,{category:'exam',pct:mid});if(p!==null&&p>=target)hi=mid;else lo=mid;}out.textContent=`About ${hi.toFixed(1)}% on the Major Exam projects a ${target.toFixed(1)}% term grade.`;
}


/* ===================== TERM GWA ===================== */
let gradesMode='gradebook';
let selectedGwaTerm=null;

const GWA_FINAL_GRADE_OPTIONS=[
  {v:'',label:'select final grade'},
  {v:'estimate',label:'use gradebook estimate (projected)'},
  {v:'4.0',label:'4.0'},{v:'3.5',label:'3.5'},{v:'3.0',label:'3.0'},
  {v:'2.5',label:'2.5'},{v:'2.0',label:'2.0'},{v:'1.5',label:'1.5'},{v:'1.0',label:'1.0'},
  {v:'R',label:'R — Repeat'},{v:'INC',label:'INC — Incomplete'},
  {v:'P',label:'P — Pass'},{v:'F',label:'F — Fail'}
];
function academicYearStart(){
  const m=String(state.profile?.academicYear||'').match(/(20\d{2})/);
  return m?Number(m[1]):null;
}
function isPathFitCode(code){
  return /^MCFIT0[1-4]X$/i.test(String(code||'').trim());
}
function isNstpCourse(course){
  const code=String(course?.code||'').trim();
  const name=String(course?.name||'');
  return /^NSTP/i.test(code)||/National Service Training Program/i.test(name);
}
function effectiveGwaGrade(course){
  const raw=String(course?.gwaFinalGrade||'');
  if(raw==='estimate'){
    const gp=gradePoint(overallGrade(course.id));
    return {raw,grade:gp,projected:true};
  }
  return {raw,grade:raw||null,projected:false};
}
function gwaInclusion(course){
  const {grade}=effectiveGwaGrade(course);
  const upper=String(grade||'').toUpperCase();

  if(course.gwaMode==='exclude') return {include:false,reason:'manually excluded',kind:'excluded'};
  if(course.gwaMode==='include'){
    if(!grade) return {include:false,reason:'waiting for final grade',kind:'pending'};
    if(['R','INC','P','F'].includes(upper)) return {include:false,reason:`${upper} is excluded`,kind:'excluded'};
    const n=Number(grade);
    return Number.isFinite(n)?{include:true,reason:'manually included',kind:'included'}:{include:false,reason:'not a numeric grade',kind:'excluded'};
  }

  if(!grade) return {include:false,reason:'waiting for final grade',kind:'pending'};
  if(['R','INC','P','F'].includes(upper)) return {include:false,reason:`${upper} is excluded`,kind:'excluded'};
  if(isNstpCourse(course)) return {include:false,reason:'NSTP excluded',kind:'excluded'};

  if(isPathFitCode(course.code)){
    const ay=academicYearStart();
    if(ay!==null && ay<2023) return {include:false,reason:'PATHFit excluded before AY2023–2024',kind:'excluded'};
    return {include:true,reason:'PATHFit included',kind:'included'};
  }

  const n=Number(grade);
  if(!Number.isFinite(n)) return {include:false,reason:'not a numeric grade',kind:'excluded'};
  return {include:true,reason:'included',kind:'included'};
}
function termCoursesForGwa(term){
  const ay=state.profile?.academicYear||'2026–2027';
  return (state.courses||[]).filter(c=>(c.academicYear||ay)===ay && (c.term||state.profile?.term||'Term 1')===term);
}
function computeTermGwa(term){
  const rows=termCoursesForGwa(term).map(course=>{
    const eg=effectiveGwaGrade(course);
    const inc=gwaInclusion(course);
    const units=Math.max(0,Number(course.units)||0);
    const numeric=Number(eg.grade);
    const honor=inc.include && Number.isFinite(numeric) ? units*numeric : 0;
    return {course,grade:eg.grade,projected:eg.projected,inc,units,honor};
  });
  const included=rows.filter(r=>r.inc.include);
  const totalUnits=included.reduce((s,r)=>s+r.units,0);
  const honorPoints=included.reduce((s,r)=>s+r.honor,0);
  const gwa=totalUnits>0?honorPoints/totalUnits:null;
  return {rows,totalUnits,honorPoints,gwa,projected:included.some(r=>r.projected)};
}
function setGradesMode(mode){
  gradesMode=['gradebook','gwa','quickgwa'].includes(mode)?mode:'gradebook';
  document.querySelectorAll('[data-grades-mode]').forEach(b=>b.classList.toggle('active',b.dataset.gradesMode===gradesMode));
  const gb=document.getElementById('gradebookRoot'),gwa=document.getElementById('gwaRoot'),quick=document.getElementById('quickGwaRoot');
  if(gb)gb.style.display=gradesMode==='gradebook'?'block':'none';
  if(gwa)gwa.style.display=gradesMode==='gwa'?'block':'none';
  if(quick)quick.style.display=gradesMode==='quickgwa'?'block':'none';
  if(gradesMode==='gwa')renderGwaCalculator();
  else if(gradesMode==='quickgwa')renderQuickGwa();
  else renderGradebook();
}
function gradeOptionsMarkup(course){
  const current=course.gwaFinalGrade||'';
  const estimate=gradePoint(overallGrade(course.id));
  return GWA_FINAL_GRADE_OPTIONS.map(o=>{
    let label=o.label;
    if(o.v==='estimate') label=estimate?`use gradebook estimate (${estimate})`:'gradebook estimate unavailable';
    return `<option value="${o.v}" ${current===o.v?'selected':''} ${o.v==='estimate'&&!estimate?'disabled':''}>${label}</option>`;
  }).join('');
}
function renderGwaCalculator(){
  const root=document.getElementById('gwaRoot');if(!root)return;
  const ay=state.profile?.academicYear||'2026–2027';
  const allCourses=(state.courses||[]).filter(c=>(c.academicYear||ay)===ay);
  if(!allCourses.length){
    root.innerHTML='<div class="card shell-empty"><div class="big">add a course first</div><p>Term GWA uses your course final grades and credit units.</p><button class="btn" id="gwaAddCourseEmpty">+ add course</button></div>';
    root.querySelector('#gwaAddCourseEmpty')?.addEventListener('click',()=>openCourseModal());
    return;
  }

  const terms=[...new Set(allCourses.map(c=>c.term||state.profile?.term||'Term 1'))];
  if(!selectedGwaTerm||!terms.includes(selectedGwaTerm)) selectedGwaTerm=(state.profile?.term&&terms.includes(state.profile.term))?state.profile.term:terms[0];
  const calc=computeTermGwa(selectedGwaTerm);

  const termOptions=terms.map(t=>`<option value="${escapeAttr(t)}" ${t===selectedGwaTerm?'selected':''}>${escapeHtml(t)}</option>`).join('');
  const rows=calc.rows.length?calc.rows.map(r=>{
    const c=r.course;
    const statusClass=r.inc.kind==='excluded'?'excluded':(r.inc.kind==='pending'?'pending':'');
    const mode=c.gwaMode||'auto';
    return `<tr>
      <td><div class="gwa-course-name">${escapeHtml(c.name)}</div><div class="gwa-course-code">${escapeHtml(c.code||'no code')}</div></td>
      <td><select data-gwa-grade="${c.id}">${gradeOptionsMarkup(c)}</select></td>
      <td><input type="number" min="0" max="20" step="0.5" value="${Number(c.units)||0}" data-gwa-units="${c.id}"></td>
      <td><select data-gwa-mode="${c.id}"><option value="auto" ${mode==='auto'?'selected':''}>Auto</option><option value="include" ${mode==='include'?'selected':''}>Force include</option><option value="exclude" ${mode==='exclude'?'selected':''}>Force exclude</option></select></td>
      <td><span class="gwa-status ${statusClass}">${escapeHtml(r.inc.reason)}${r.projected?' · projected':''}</span></td>
      <td><span class="gwa-honor">${r.inc.include?r.honor.toFixed(2):'—'}</span></td>
    </tr>`;
  }).join(''):`<tr><td colspan="6"><div class="shell-empty"><div class="big">no courses in ${escapeHtml(selectedGwaTerm)}</div><p>Edit a course and set its term, or add a new course.</p></div></td></tr>`;

  const gwa4=calc.gwa===null?'—':calc.gwa.toFixed(4);
  const gwa2=calc.gwa===null?'—':calc.gwa.toFixed(2);
  const label=calc.projected?'Projected Term GWA':'Term GWA';

  root.innerHTML=`
    <div class="gwa-hero">
      <div class="gwa-formula-card">
        <h3>${label}</h3>
        <p class="small-note">For one selected term only. Cramchy multiplies each included course’s final grade by its credit units to get Honor Points.</p>
        <div class="gwa-formula">GWA = Σ Honor Points ÷ Σ Credit Units</div>
        <p class="small-note">Computed to four decimal places, then shown rounded to two.</p>
      </div>
      <div class="gwa-summary">
        <div class="gwa-summary-card"><div class="k">Included units</div><div class="v">${calc.totalUnits.toFixed(1)}</div></div>
        <div class="gwa-summary-card"><div class="k">Honor points</div><div class="v">${calc.honorPoints.toFixed(2)}</div></div>
        <div class="gwa-summary-card"><div class="k">${label}</div><div class="v">${gwa2}</div><div class="small-note">${calc.gwa===null?'add final grades':`${gwa4} → ${gwa2}`}</div></div>
      </div>
    </div>

    <div class="gwa-toolbar">
      <div><label>term</label><select id="gwaTermSelect">${termOptions}</select></div>
      <button class="btn" id="gwaAddCourseBtn">+ add course</button>
    </div>

    <div class="gwa-table-wrap">
      <table class="gwa-table">
        <thead><tr><th>Course</th><th>Final Grade</th><th>Units</th><th>GWA Handling</th><th>Status</th><th>Honor Points</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

`;

  root.querySelector('#gwaTermSelect')?.addEventListener('change',e=>{selectedGwaTerm=e.target.value;renderGwaCalculator();});
  root.querySelector('#gwaAddCourseBtn')?.addEventListener('click',()=>openCourseModal());

  root.querySelectorAll('[data-gwa-grade]').forEach(el=>el.addEventListener('change',()=>{
    const c=state.courses.find(x=>x.id===el.dataset.gwaGrade);if(!c)return;
    c.gwaFinalGrade=el.value;saveState();renderGwaCalculator();
  }));
  root.querySelectorAll('[data-gwa-units]').forEach(el=>el.addEventListener('change',()=>{
    const c=state.courses.find(x=>x.id===el.dataset.gwaUnits);if(!c)return;
    c.units=Math.max(0,Math.min(20,Number(el.value)||0));saveState();renderGwaCalculator();renderDynamicCourses();renderDailyHome();
  }));
  root.querySelectorAll('[data-gwa-mode]').forEach(el=>el.addEventListener('change',()=>{
    const c=state.courses.find(x=>x.id===el.dataset.gwaMode);if(!c)return;
    c.gwaMode=el.value;saveState();renderGwaCalculator();
  }));
}
function initGradesModes(){
  document.querySelectorAll('[data-grades-mode]').forEach(b=>b.addEventListener('click',()=>setGradesMode(b.dataset.gradesMode)));
  setGradesMode('gradebook');
}


/* ===================== QUICK GWA ===================== */
const QUICK_GWA_GRADES=[
  {v:'',label:'select grade'},
  {v:'4.0',label:'4.0'},{v:'3.5',label:'3.5'},{v:'3.0',label:'3.0'},
  {v:'2.5',label:'2.5'},{v:'2.0',label:'2.0'},{v:'1.5',label:'1.5'},{v:'1.0',label:'1.0'},
  {v:'R',label:'R — Repeat'},{v:'INC',label:'INC — Incomplete'},
  {v:'P',label:'P — Pass'},{v:'F',label:'F — Fail'}
];
let quickGwaLastResult=null;

function quickGwaRows(){
  if(!Array.isArray(state.quickGwaRows)||!state.quickGwaRows.length){
    state.quickGwaRows=[{id:cryptoId(),grade:'',units:3}];
  }
  return state.quickGwaRows;
}
function quickGwaCompute(){
  let honor=0,units=0,count=0,excluded=0;
  quickGwaRows().forEach(r=>{
    const g=String(r.grade||'').toUpperCase();
    if(!g) return;
    if(['R','INC','P','F'].includes(g)){excluded++;return;}
    const grade=Number(g),u=Number(r.units);
    if(Number.isFinite(grade)&&Number.isFinite(u)&&u>0){
      honor+=grade*u; units+=u; count++;
    }
  });
  return {honor,units,count,excluded,gwa:units>0?honor/units:null};
}
function quickGradeOptions(current){
  return QUICK_GWA_GRADES.map(o=>`<option value="${o.v}" ${String(current||'')===o.v?'selected':''}>${o.label}</option>`).join('');
}
function addQuickGwaRow(){
  if(quickGwaRows().length>=40){showToast('maximum 40 rows');return;}
  state.quickGwaRows.push({id:cryptoId(),grade:'',units:3});
  quickGwaLastResult=null;
  saveState();renderQuickGwa();
}
function resetQuickGwa(){
  state.quickGwaRows=[
    {id:cryptoId(),grade:'',units:3},
    {id:cryptoId(),grade:'',units:3},
    {id:cryptoId(),grade:'',units:3},
    {id:cryptoId(),grade:'',units:3}
  ];
  quickGwaLastResult=null;
  saveState();renderQuickGwa();
}
function quickGwaHonorLabel(gwa){
  if(gwa>=3.50) return "Dean's List (First Honors)";
  if(gwa>=3.25) return "Dean's List (Second Honors)";
  return '';
}
function quickGwaMessage(gwa){
  const honor=quickGwaHonorLabel(gwa);
  if(honor) return `Congratulations! ${honor} ♡`;
  return 'GWA computed ♡';
}
function launchQuickConfetti(){
  const layer=document.getElementById('quickConfettiLayer'); if(!layer)return;
  layer.innerHTML='';
  const palette=['#e85d75','#ffb6c9','#a8c69f','#f3c86a','#b8a6d9'];
  const count=34;
  for(let i=0;i<count;i++){
    const p=document.createElement('span');
    p.className='quick-confetti-piece';
    p.style.left=`${Math.random()*100}%`;
    p.style.background=palette[i%palette.length];
    p.style.setProperty('--drift',`${Math.round((Math.random()-.5)*110)}px`);
    p.style.setProperty('--spin',`${Math.round(240+Math.random()*540)}deg`);
    p.style.animationDelay=`${Math.random()*.18}s`;
    layer.appendChild(p);
  }
  setTimeout(()=>{if(layer)layer.innerHTML='';},1900);
}
function calculateQuickGwa(){
  // Pull the current values directly from the visible inputs first.
  document.querySelectorAll('[data-quick-grade]').forEach(el=>{
    const row=state.quickGwaRows.find(r=>r.id===el.dataset.quickGrade);
    if(row) row.grade=el.value;
  });
  document.querySelectorAll('[data-quick-units]').forEach(el=>{
    const row=state.quickGwaRows.find(r=>r.id===el.dataset.quickUnits);
    if(row){
      const raw=el.value.trim();
      const n=raw===''?0:Number(raw);
      row.units=Number.isFinite(n)?Math.max(0,Math.min(20,n)):0;
    }
  });

  const calc=quickGwaCompute();
  if(calc.gwa===null){
    showToast('add at least one grade and its units');
    return;
  }
  quickGwaLastResult=calc;
  saveState();
  renderQuickGwa();
  setTimeout(launchQuickConfetti,60);
}
function renderQuickGwa(){
  const root=document.getElementById('quickGwaRoot');if(!root)return;
  const rows=quickGwaRows();
  const calc=quickGwaLastResult;
  const result=calc?.gwa!=null?calc.gwa.toFixed(2):'—';
  const honor=calc?.gwa!=null?quickGwaHonorLabel(calc.gwa):'';
  const message=calc?.gwa!=null?quickGwaMessage(calc.gwa):'';

  root.innerHTML=`<div class="quick-gwa-wrap">
    <div class="card" style="margin-bottom:12px;">
      <h3 style="color:var(--red-deep);">quick GWA calculator</h3>
      <p class="small-note" style="margin-top:5px;">Just enter each final grade and credit units. No course setup needed.</p>
    </div>

    <div class="quick-gwa-card">
      <div class="quick-gwa-head"><span>Course</span><span>Grade</span><span>Units</span><span></span></div>
      <div id="quickGwaRows">
        ${rows.map((r,i)=>`<div class="quick-gwa-row">
          <div class="quick-gwa-course">Course ${i+1}</div>
          <select aria-label="Grade for Course ${i+1}" data-quick-grade="${r.id}">${quickGradeOptions(r.grade)}</select>
          <input aria-label="Units for Course ${i+1}" inputmode="decimal" type="number" min="0" max="20" step="0.5" value="${r.units ?? ''}" data-quick-units="${r.id}">
          <button type="button" class="quick-gwa-remove" data-quick-remove="${r.id}" aria-label="Remove Course ${i+1}">×</button>
        </div>`).join('')}
      </div>
      <div class="quick-gwa-footer">
        <button class="more-shortcut" id="quickGwaAddBtn" type="button">＋ add course</button>
        <button class="more-shortcut" id="quickGwaResetBtn" type="button">clear all</button>
      </div>
    </div>

    <button class="quick-gwa-calc-btn" id="quickGwaCalculateBtn" type="button">calculate GWA ✦</button>

    <div class="quick-gwa-result ${calc?.gwa!=null?'show':''}" aria-live="polite">
      <div class="quick-confetti-layer" id="quickConfettiLayer"></div>
      <div class="label">Term GWA</div>
      <div class="number">${result}</div>
      ${honor?`<div class="quick-gwa-honor">${escapeHtml(honor)}</div>`:''}
      ${message?`<div class="quick-gwa-sub">${escapeHtml(message)}</div>`:''}
    </div>

    <div class="quick-gwa-note">
      
    </div>
  </div>`;

  root.querySelectorAll('[data-quick-grade]').forEach(el=>el.addEventListener('change',()=>{
    const row=state.quickGwaRows.find(r=>r.id===el.dataset.quickGrade);if(!row)return;
    row.grade=el.value;
    quickGwaLastResult=null;
    saveState();
  }));

  // Do not rerender while typing units. This fixes the unit-input glitch.
  root.querySelectorAll('[data-quick-units]').forEach(el=>{
    el.addEventListener('input',()=>{
      const row=state.quickGwaRows.find(r=>r.id===el.dataset.quickUnits);if(!row)return;
      const raw=el.value.trim();
      if(raw===''){ row.units=''; }
      else{
        const n=Number(raw);
        if(Number.isFinite(n)) row.units=Math.max(0,Math.min(20,n));
      }
      quickGwaLastResult=null;
      saveState();
    });
  });

  root.querySelectorAll('[data-quick-remove]').forEach(btn=>btn.addEventListener('click',()=>{
    if(state.quickGwaRows.length===1){state.quickGwaRows=[{id:cryptoId(),grade:'',units:3}];}
    else state.quickGwaRows=state.quickGwaRows.filter(r=>r.id!==btn.dataset.quickRemove);
    quickGwaLastResult=null;
    saveState();renderQuickGwa();
  }));
  root.querySelector('#quickGwaAddBtn')?.addEventListener('click',addQuickGwaRow);
  root.querySelector('#quickGwaResetBtn')?.addEventListener('click',resetQuickGwa);
  root.querySelector('#quickGwaCalculateBtn')?.addEventListener('click',calculateQuickGwa);
}


/* ===================== ACADEMIC TERMS + PERIOD-SPECIFIC EXAMS ===================== */
const TERM_OPTIONS=['Term 1','Term 2','Term 3'];

function academicKey(year,term){return `${year}::${term}`;}
function profileAcademicYear(){return state.profile?.academicYear||'2026–2027';}
function profileTerm(){return TERM_OPTIONS.includes(state.profile?.term)?state.profile.term:'Term 1';}
function activeExamYear(){return state.examContext?.academicYear||profileAcademicYear();}
function activeExamTerm(){return TERM_OPTIONS.includes(state.examContext?.term)?state.examContext.term:profileTerm();}
function activeAcademicKey(){return academicKey(activeExamYear(),activeExamTerm());}
function dailyAcademicKey(){return academicKey(profileAcademicYear(),profileTerm());}

function emptyExamPeriod(){return {exams:[],subjects:{},subjectNames:{}};}
function emptyTermRecord(){return {midterms:emptyExamPeriod(),finals:emptyExamPeriod()};}
function cloneJson(v){return JSON.parse(JSON.stringify(v));}
function normalizeAcademicName(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');}

function ensureTermRecord(year,term){
  if(!state.examData||typeof state.examData!=='object')state.examData={};
  const key=academicKey(year,term);
  if(!state.examData[key])state.examData[key]=emptyTermRecord();
  ['midterms','finals'].forEach(period=>{
    const p=state.examData[key][period]||(state.examData[key][period]=emptyExamPeriod());
    if(!Array.isArray(p.exams))p.exams=[];
    if(!p.subjects||typeof p.subjects!=='object')p.subjects={};
    if(!p.subjectNames||typeof p.subjectNames!=='object')p.subjectNames={};
  });
  return state.examData[key];
}
function ensureAcademicStructure(){
  if(!state.examContext||typeof state.examContext!=='object'){
    state.examContext={academicYear:profileAcademicYear(),term:profileTerm()};
  }
  if(!TERM_OPTIONS.includes(state.examContext.term))state.examContext.term=profileTerm();

  const year=profileAcademicYear(),term=profileTerm();
  const record=ensureTermRecord(year,term);

  // One-time migration: everything from the original Midterms SZN tracker
  // belongs to the CURRENT TERM'S MIDTERMS only. Finals starts clean.
  if((state.academicMigrationVersion||0)<1){
    record.midterms.exams=EXAMS.map(e=>({
      id:e.id,
      subjectId:e.id,
      name:e.name,
      start:e.start,
      end:e.end,
      room:e.room
    }));
    record.midterms.subjects=cloneJson(state.subjects||{});
    record.midterms.subjectNames={...SUBJECT_NAME};
    record.finals=emptyExamPeriod();
    state.academicMigrationVersion=1;
  }

  // Existing courses from older Cramchy builds are assigned to the current AY.
  (state.courses||[]).forEach(c=>{
    if(!c.academicYear)c.academicYear=year;
    if(!c.term)c.term=term;
  });
}
function coursesForTerm(year,term){
  return (state.courses||[]).filter(c=>(c.academicYear||profileAcademicYear())===year && (c.term||profileTerm())===term);
}
function coursesForCurrentTerm(){return coursesForTerm(profileAcademicYear(),profileTerm());}

function activePeriodData(period=state.examPeriod){
  const p=['midterms','finals'].includes(period)?period:'midterms';
  return ensureTermRecord(activeExamYear(),activeExamTerm())[p];
}
function dailyTermRecord(){return ensureTermRecord(profileAcademicYear(),profileTerm());}

function examSubjectCatalog(year=activeExamYear(),term=activeExamTerm()){
  const record=ensureTermRecord(year,term);
  const catalog=[];
  const byName=new Map();

  function add(id,name,courseId=''){
    const cleanName=String(name||'Untitled course').slice(0,100);
    const key=normalizeAcademicName(cleanName);
    if(!key)return;
    if(byName.has(key)){
      const existing=byName.get(key);
      if(courseId&&!existing.courseId)existing.courseId=courseId;
      return;
    }
    const item={id:String(id),name:cleanName,courseId};
    byName.set(key,item);catalog.push(item);
  }

  // Imported/current midterms establish the original subjects for Term 1.
  Object.entries(record.midterms.subjectNames||{}).forEach(([id,name])=>add(id,name));
  (record.midterms.exams||[]).forEach(e=>add(e.subjectId||e.id,e.name));

  // Courses belong to the TERM, therefore they are visible in BOTH midterms and finals.
  coursesForTerm(year,term).forEach(c=>{
    const match=catalog.find(x=>normalizeAcademicName(x.name)===normalizeAcademicName(c.name));
    if(match){match.courseId=c.id;return;}
    add(`course-${c.id}`,c.name,c.id);
  });

  // Keep subject objects created directly inside either period discoverable.
  ['midterms','finals'].forEach(period=>{
    const p=record[period];
    Object.keys(p.subjects||{}).forEach(id=>add(id,p.subjectNames?.[id]||id));
  });

  return catalog;
}
function ensureExamSubject(period,id,name){
  const p=activePeriodData(period);
  if(!p.subjects[id])p.subjects[id]=freshSubject();
  if(name&&!p.subjectNames[id])p.subjectNames[id]=String(name).slice(0,100);
  return p.subjects[id];
}
function activeExamSubjects(){
  const p=activePeriodData();
  examSubjectCatalog().forEach(item=>ensureExamSubject(state.examPeriod||'midterms',item.id,item.name));
  return p.subjects;
}
function examSubjectNameById(id,year=activeExamYear(),term=activeExamTerm()){
  const item=examSubjectCatalog(year,term).find(x=>x.id===id);
  if(item)return item.name;
  const record=ensureTermRecord(year,term);
  return record.midterms.subjectNames?.[id]||record.finals.subjectNames?.[id]||SUBJECT_NAME[id]||id;
}
function examForSubject(id){
  return (activePeriodData().exams||[]).find(e=>(e.subjectId||e.id)===id)||null;
}

function allDailyTermExams(){
  const r=dailyTermRecord();
  return [...(r.midterms.exams||[]),...(r.finals.exams||[])].sort((a,b)=>new Date(a.start)-new Date(b.start));
}
function getSortedExams(){
  if(state.examPeriod)return [...(activePeriodData().exams||[])].sort((a,b)=>new Date(a.start)-new Date(b.start));
  return allDailyTermExams();
}
function getClosestExam(){
  const sorted=getSortedExams();
  if(!sorted.length)return null;
  const now=Date.now();
  const upcoming=sorted.filter(e=>e.end&&new Date(e.end).getTime()>now);
  return upcoming.length?upcoming[0]:sorted[sorted.length-1];
}

function subjectStats(id){
  const subject=activeExamSubjects()[id]||freshSubject();
  const topics=subject.topics||[];
  const total=topics.length;
  const done=topics.filter(t=>t.status==='Done').length;
  return {total,done,percent:total?Math.round(done/total*100):0};
}
function overallStats(){
  let total=0,done=0;
  examSubjectCatalog().forEach(item=>{
    const s=subjectStats(item.id);total+=s.total;done+=s.done;
  });
  return {total,done,percent:total?Math.round(done/total*100):0};
}

function renderDashboard(){
  const overall=overallStats();
  const exams=state.examPeriod?(activePeriodData().exams||[]):getSortedExams();
  const statExams=document.getElementById('stat-exams');
  if(statExams)statExams.textContent=exams.length;
  document.getElementById('stat-topics').textContent=overall.total;
  document.getElementById('stat-done').textContent=overall.done;
  document.getElementById('stat-percent').textContent=overall.percent+'%';

  const exam=getClosestExam();
  const box=document.getElementById('closestExamBox');
  if(box){
    if(exam){
      box.innerHTML=`<span class="tag">NEXT EXAM</span><h3>${escapeHtml(exam.name)}</h3><div class="meta">${formatExamDate(exam.start)} • ${formatExamTime(exam.start)} – ${formatExamTime(exam.end)} • ${exam.room?`Room ${escapeHtml(exam.room)}`:'room not added'}</div><div class="countdown-big" data-countdown-start="${exam.start}" data-countdown-end="${exam.end}">${formatCountdown(exam.start,exam.end)}</div>`;
    }else{
      box.innerHTML=`<div class="exam-empty"><h3>no ${state.examPeriod||'upcoming'} exam added yet</h3><p>${state.examPeriod==='finals'?'Finals starts clean. Add the dates once your schedule is released.':'Add an exam when you have the schedule.'}</p>${state.examPeriod?'<button class="btn" id="dashboardAddExamBtn">+ add exam</button>':''}</div>`;
      document.getElementById('dashboardAddExamBtn')?.addEventListener('click',()=>openExamModal());
    }
  }
  renderMissions();
  renderMotivation();
}

function splitExamIso(iso){
  const m=String(iso||'').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m?{date:m[1],time:m[2]}:{date:'',time:''};
}
function openExamModal(examId=null,preferredSubjectId=''){
  if(!state.examPeriod){showToast('choose midterms or finals first');return;}
  const p=activePeriodData();
  const existing=(p.exams||[]).find(e=>e.id===examId);
  const catalog=examSubjectCatalog();
  if(!catalog.length){
    showToast('add a course first');
    return;
  }
  const startParts=splitExamIso(existing?.start),endParts=splitExamIso(existing?.end);
  const selectedId=preferredSubjectId||existing?.subjectId||catalog[0].id;
  const scrim=document.createElement('div');scrim.className='modal-scrim';
  scrim.innerHTML=`<div class="course-modal">
    <h3 style="color:var(--red-deep);">${existing?'edit':'add'} ${state.examPeriod} exam</h3>
    <p class="small-note">${escapeHtml(activeExamYear())} · ${escapeHtml(activeExamTerm())}. This schedule belongs only to ${state.examPeriod}.</p>
    <div class="course-form-grid">
      <div class="full"><label>course / subject</label><select id="examSubjectSelect">${catalog.map(c=>`<option value="${escapeAttr(c.id)}" ${c.id===selectedId?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
      <div><label>date</label><input id="examDate" type="date" value="${startParts.date}"></div>
      <div><label>room</label><input id="examRoom" value="${escapeAttr(existing?.room||'')}" placeholder="609"></div>
      <div><label>start time</label><input id="examStart" type="time" value="${startParts.time}"></div>
      <div><label>end time</label><input id="examEnd" type="time" value="${endParts.time}"></div>
    </div>
    <div class="modal-actions"><button class="more-shortcut" id="cancelExamModal">cancel</button><button class="btn" id="saveExamModal">${existing?'save changes':'add exam'}</button></div>
  </div>`;
  document.body.appendChild(scrim);
  scrim.querySelector('#cancelExamModal').addEventListener('click',()=>scrim.remove());
  scrim.addEventListener('click',e=>{if(e.target===scrim)scrim.remove();});
  scrim.querySelector('#saveExamModal').addEventListener('click',()=>{
    const subjectId=scrim.querySelector('#examSubjectSelect').value;
    const item=catalog.find(c=>c.id===subjectId);
    const date=scrim.querySelector('#examDate').value;
    const start=scrim.querySelector('#examStart').value;
    const end=scrim.querySelector('#examEnd').value;
    if(!date||!start||!end){showToast('add the date, start, and end time');return;}
    const obj={
      id:existing?.id||cryptoId(),
      subjectId,
      name:item?.name||'Exam',
      start:`${date}T${start}:00+08:00`,
      end:`${date}T${end}:00+08:00`,
      room:scrim.querySelector('#examRoom').value.trim().slice(0,50)
    };
    if(existing)p.exams=p.exams.map(e=>e.id===existing.id?obj:e);else p.exams.push(obj);
    ensureExamSubject(state.examPeriod,subjectId,item?.name||obj.name);
    saveState();scrim.remove();renderSchedule();renderDashboard();renderSubjectsTab();renderDailyHome();showToast(`${state.examPeriod} exam saved`);
  });
}

function renderSchedule(){
  const box=document.getElementById('timelineBox');if(!box)return;
  const heading=document.getElementById('examScheduleHeading');
  const context=document.getElementById('examScheduleContext');
  if(heading)heading.textContent=`${state.examPeriod||'exam'} schedule`;
  if(context)context.textContent=`${activeExamYear()} · ${activeExamTerm()} · Philippine Time (UTC+8)`;
  const sorted=getSortedExams();
  if(!sorted.length){
    box.innerHTML=`<div class="exam-empty"><span class="period-badge">${escapeHtml(activeExamTerm())} · ${escapeHtml(state.examPeriod||'exam')}</span><h3>no ${state.examPeriod||''} exams added yet</h3><p>${state.examPeriod==='finals'?'This is intentional: your finals dates are separate from midterms and start blank.':'Add your exam schedule when you have it.'}</p><button class="btn" id="emptyAddExamBtn">+ add exam</button></div>`;
    document.getElementById('emptyAddExamBtn')?.addEventListener('click',()=>openExamModal());
    return;
  }
  const closest=getClosestExam();
  box.innerHTML='';
  sorted.forEach(exam=>{
    const isNext=closest&&exam.id===closest.id;
    const item=document.createElement('div');
    item.className='timeline-item'+(isNext?' next':'');
    item.innerHTML=`<div class="exam-card ${isNext?'next-exam':''}">
      <div class="row1"><h4>${escapeHtml(exam.name)}</h4>${isNext?'<span class="next-tag">NEXT EXAM</span>':`<span class="date-pill">${formatExamDate(exam.start)}</span>`}</div>
      <div class="details">${formatExamDate(exam.start)} • ${formatExamTime(exam.start)} – ${formatExamTime(exam.end)} • ${exam.room?`Room ${escapeHtml(exam.room)}`:'room not added'}</div>
      <div class="countdown" data-countdown-start="${exam.start}" data-countdown-end="${exam.end}">${formatCountdown(exam.start,exam.end)}</div>
      <div class="exam-edit-actions"><button data-edit-exam="${exam.id}">edit</button><button class="danger" data-remove-exam="${exam.id}">remove</button></div>
    </div>`;
    box.appendChild(item);
  });
  box.querySelectorAll('[data-edit-exam]').forEach(btn=>btn.addEventListener('click',()=>openExamModal(btn.dataset.editExam)));
  box.querySelectorAll('[data-remove-exam]').forEach(btn=>btn.addEventListener('click',()=>{
    if(!confirm(`Remove this ${state.examPeriod} exam? Topics and notes for the subject will stay.`))return;
    const p=activePeriodData();p.exams=p.exams.filter(e=>e.id!==btn.dataset.removeExam);saveState();renderSchedule();renderDashboard();renderSubjectDetail();renderDailyHome();
  }));
}

function renderSubjectsTab(){
  const tabsBox=document.getElementById('subjectTabs');if(!tabsBox)return;
  const catalog=examSubjectCatalog();
  tabsBox.innerHTML='';
  if(!catalog.length){
    document.getElementById('subjectDetail').innerHTML=`<div class="exam-empty"><h3>no courses in ${escapeHtml(activeExamTerm())}</h3><p>Courses belong to the term. Go back to regular Cramchy and add your subjects first.</p></div>`;
    return;
  }
  if(!catalog.some(x=>x.id===state.activeSubject))state.activeSubject=catalog[0].id;
  catalog.forEach(item=>{
    ensureExamSubject(state.examPeriod||'midterms',item.id,item.name);
    const btn=document.createElement('button');
    btn.className='subject-tab-btn'+(state.activeSubject===item.id?' active':'');
    btn.textContent=item.name;
    btn.addEventListener('click',()=>{state.activeSubject=item.id;expandedAttachments={};saveState();renderSubjectsTab();});
    tabsBox.appendChild(btn);
  });
  renderSubjectDetail();
}

function renderSubjectDetail(){
  const id=state.activeSubject;
  const subj=ensureExamSubject(state.examPeriod||'midterms',id,examSubjectNameById(id));
  const exam=examForSubject(id);
  const stats=subjectStats(id);
  const readiness=readinessLabel(id);
  const detail=document.getElementById('subjectDetail');if(!detail)return;
  const period=state.examPeriod||'midterms';

  const examBlock=exam
    ? `<div class="details" style="color:var(--text-soft);font-weight:700;margin-top:6px;">${formatExamDate(exam.start)} • ${formatExamTime(exam.start)} – ${formatExamTime(exam.end)} • ${exam.room?`Room ${escapeHtml(exam.room)}`:'room not added'}</div><div class="countdown" style="color:var(--red-berry);font-weight:800;margin-top:6px;" data-countdown-start="${exam.start}" data-countdown-end="${exam.end}">${formatCountdown(exam.start,exam.end)}</div><div class="exam-edit-actions"><button id="subjectEditExamBtn">edit ${period} exam</button></div>`
    : `<div class="exam-empty" style="margin-top:12px;padding:16px;"><h3>no ${period} exam added yet</h3><p>${period==='finals'?'Your midterm date is not copied here. Add the finals date when it is announced.':'Add the exam date when you have it.'}</p><button class="btn" id="subjectAddExamBtn">+ add ${period} exam</button></div>`;

  detail.innerHTML=`<div class="card" style="margin-bottom:16px;">
    <div class="flex-between"><div><span class="period-badge">${escapeHtml(activeExamTerm())} · ${period}</span><h3 style="color:var(--red-deep);">${escapeHtml(examSubjectNameById(id))}</h3></div><span class="readiness-badge ${readiness.cls}">${readiness.text}</span></div>
    ${examBlock}
    <div style="margin-top:14px;"><div class="flex-between"><span style="font-weight:800;">${stats.done} / ${stats.total} topics done</span><span style="font-weight:800;color:var(--red-berry);">${stats.percent}%</span></div><div class="progress-bar-track"><div class="progress-bar-fill" style="width:${stats.percent}%"></div></div></div>
  </div>
  <div class="card" style="margin-bottom:16px;"><div class="field-label">${period} topics</div><div id="topicList"></div><div class="add-row"><input type="text" id="topicInput" placeholder="Type a ${period} topic..."><button class="btn" id="addTopicBtn">+ Add</button></div></div>
  <div class="grid grid-2"><div class="card"><label class="field-label">${period} Notes / Brain Dump</label><textarea id="notesArea" placeholder="professor emphasis, diagrams, reminders, confusing concepts...">${escapeHtml(subj.notes)}</textarea></div><div class="card"><label class="field-label">${period} Things I Keep Forgetting</label><textarea id="forgetArea" placeholder="facts that refuse to stay in your brain...">${escapeHtml(subj.forget)}</textarea></div></div>`;

  renderTopicList();
  document.getElementById('subjectAddExamBtn')?.addEventListener('click',()=>openExamModal(null,id));
  document.getElementById('subjectEditExamBtn')?.addEventListener('click',()=>openExamModal(exam.id,id));
  document.getElementById('addTopicBtn').addEventListener('click',addTopic);
  document.getElementById('topicInput').addEventListener('keydown',e=>{if(e.key==='Enter')addTopic();});
  let notesTimeout;
  document.getElementById('notesArea').addEventListener('input',e=>{activeExamSubjects()[id].notes=e.target.value;clearTimeout(notesTimeout);notesTimeout=setTimeout(saveState,300);});
  let forgetTimeout;
  document.getElementById('forgetArea').addEventListener('input',e=>{activeExamSubjects()[id].forget=e.target.value;clearTimeout(forgetTimeout);forgetTimeout=setTimeout(saveState,300);});
}

function renderTimerTab(){
  const sel=document.getElementById('timerSubjectSelect');if(!sel)return;
  const catalog=state.examPeriod?examSubjectCatalog():coursesForCurrentTerm().map(c=>({id:`course-${c.id}`,name:c.name}));
  const choices=catalog.length?catalog:[{id:'general',name:'General Study'}];
  if(!choices.some(x=>x.id===timerState.subject))timerState.subject=choices[0].id;
  sel.innerHTML=choices.map(x=>`<option value="${escapeAttr(x.id)}" ${timerState.subject===x.id?'selected':''}>${escapeHtml(x.name)}</option>`).join('');
  updateTimerDisplay();renderHistory();
}
function logStudySession(){
  state.studyHistory.unshift({
    subject:timerState.subject,
    minutes:timerState.presetMinutes,
    timestamp:Date.now(),
    academicKey:state.examPeriod?activeAcademicKey():dailyAcademicKey(),
    period:state.examPeriod||''
  });
  saveState();renderHistory();renderMatchaCorner();renderDailyHome();
}
function studyHistorySubjectName(h){
  if(h.subject==='general')return 'General Study';
  const courseId=String(h.subject||'').startsWith('course-')?String(h.subject).slice(7):'';
  if(courseId){
    const c=(state.courses||[]).find(x=>x.id===courseId);if(c)return c.name;
  }
  const [year,term]=(h.academicKey||activeAcademicKey()).split('::');
  return examSubjectNameById(h.subject,year||activeExamYear(),term||activeExamTerm());
}
function renderHistory(){
  const list=document.getElementById('historyList');if(!list)return;
  const totalMins=state.studyHistory.reduce((sum,h)=>sum+h.minutes,0);
  const hrs=Math.floor(totalMins/60),mins=totalMins%60;
  document.getElementById('totalFocusTime').textContent=hrs>0?`${hrs}h ${mins}m`:`${mins}m`;
  if(!state.studyHistory.length){list.innerHTML='<div class="empty-state">No sessions logged yet.</div>';return;}
  list.innerHTML='';
  state.studyHistory.slice(0,25).forEach(h=>{
    const d=new Date(h.timestamp),dateStr=d.toLocaleDateString('en-US',{month:'short',day:'numeric'}),timeStr=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const row=document.createElement('div');row.className='history-item';
    row.innerHTML=`<div><div class="subj">${escapeHtml(studyHistorySubjectName(h))}</div><div class="when">${dateStr} • ${timeStr}${h.period?` • ${h.period}`:''}</div></div><div class="mins">${h.minutes}m</div>`;
    list.appendChild(row);
  });
}

function renderDailyCountdown(){
  const box=document.getElementById('dailyCountdownBox');if(!box)return;
  const savedPeriod=state.examPeriod;
  state.examPeriod=null;
  const ex=getClosestExam();
  state.examPeriod=savedPeriod;
  if(!ex){box.innerHTML='<p class="small-note">no exam dates added for this term yet ♡</p>';return;}
  let period='exam';
  const r=dailyTermRecord();
  if((r.midterms.exams||[]).some(e=>e.id===ex.id))period='midterms';
  else if((r.finals.exams||[]).some(e=>e.id===ex.id))period='finals';
  box.innerHTML=`<span class="tag">${period.toUpperCase()}</span><h3>${escapeHtml(ex.name)}</h3><div class="meta">${formatExamDate(ex.start)}</div><div class="countdown-big">${formatCountdown(ex.start,ex.end)}</div>`;
}
function nextExamDays(){
  const saved=state.examPeriod;state.examPeriod=null;const ex=getClosestExam();state.examPeriod=saved;
  if(!ex)return '—';const diff=new Date(ex.start).getTime()-Date.now();if(diff<=0)return 'today';const days=Math.ceil(diff/86400000);return days===1?'1d':`${days}d`;
}
function renderDailyUpcoming(){
  const wrap=document.getElementById('dailyUpcomingList');if(!wrap)return;
  const ex=allDailyTermExams().filter(e=>new Date(e.end).getTime()>Date.now()).slice(0,3);
  if(!ex.length){wrap.innerHTML='<div class="small-note">no exam dates added yet ♡</div>';return;}
  wrap.innerHTML=ex.map(e=>{
    const r=dailyTermRecord();const period=(r.midterms.exams||[]).some(x=>x.id===e.id)?'midterms':'finals';
    return `<div class="upcoming-item"><strong>${escapeHtml(e.name)}</strong><span>${period} · ${escapeHtml(formatExamDate(e.start))} · ${formatCountdown(e.start,e.end)}</span></div>`;
  }).join('');
}

function availableAcademicYears(){
  const set=new Set([profileAcademicYear()]);
  Object.keys(state.examData||{}).forEach(k=>{const y=k.split('::')[0];if(y)set.add(y);});
  (state.courses||[]).forEach(c=>{if(c.academicYear)set.add(c.academicYear);});
  return [...set];
}
function renderExamChooserContext(){
  const yearSel=document.getElementById('examYearSelect'),termSel=document.getElementById('examTermSelect');
  if(!yearSel||!termSel)return;
  yearSel.innerHTML=availableAcademicYears().map(y=>`<option value="${escapeAttr(y)}" ${y===activeExamYear()?'selected':''}>${escapeHtml(y)}</option>`).join('');
  termSel.value=activeExamTerm();
}
function renderExamMode(){
  const active=state.examPeriod;
  document.body.classList.toggle('exam-mode-active',!!active);
  const brand=document.querySelector('.brand'),title=document.getElementById('examHeroTitle'),tagline=document.getElementById('examHeroTagline'),context=document.getElementById('examContextLine');
  if(active){
    const label=active==='midterms'?'midterms szn':'finals szn';
    if(brand)brand.dataset.examLabel=label;
    if(title)title.textContent=label;
    if(context)context.textContent=`${activeExamYear()} · ${activeExamTerm()} · ${active}`;
    if(tagline)tagline.textContent=`you gotta lock in, ${cramchyName().toLowerCase()}!`;
    document.title=`${label} · Cramchy`;
  }else{
    if(brand)brand.dataset.examLabel='';
    document.title='Cramchy. — study companion';
    renderExamChooserContext();
  }
}
function setExamPeriod(period){
  if(!['midterms','finals'].includes(period))return;
  const yearSel=document.getElementById('examYearSelect'),termSel=document.getElementById('examTermSelect');
  if(yearSel)state.examContext.academicYear=yearSel.value||profileAcademicYear();
  if(termSel)state.examContext.term=termSel.value||profileTerm();
  ensureTermRecord(activeExamYear(),activeExamTerm());
  state.examPeriod=period;
  const catalog=examSubjectCatalog();
  if(catalog.length&&!catalog.some(x=>x.id===state.activeSubject))state.activeSubject=catalog[0].id;
  saveState();renderExamMode();switchTab('dashboard');
  showToast(period==='midterms'?'midterms szn. lock in.':'finals szn. final boss mode.',{longer:true});
}
function leaveExamMode(goToChooser=false){
  state.examPeriod=null;saveState();renderExamMode();renderDailyHome();switchTab(goToChooser?'exam':'dashboard');
}

function resetActiveExamPeriod(){
  if(!state.examPeriod)return;
  const period=state.examPeriod,term=activeExamTerm();
  if(!confirm(`Reset ${term} ${period}? This removes ONLY its exam dates, topics, notes, and progress. The term's courses and the other exam period stay safe.`))return;
  ensureTermRecord(activeExamYear(),activeExamTerm())[period]=emptyExamPeriod();
  saveState();renderDashboard();renderSchedule();renderSubjectsTab();renderExamMode();renderDailyHome();
  showToast(`${term} ${period} reset`);
}

function renderTermManager(){
  const root=document.getElementById('termManagerStatus');if(!root)return;
  const key=dailyAcademicKey(),archived=(state.archivedTerms||[]).includes(key);
  const courses=coursesForCurrentTerm().length;
  const record=dailyTermRecord();
  root.className='term-manager-status';
  const archivedList=(state.archivedTerms||[]).length?`<div class="term-status-box" style="grid-column:1/-1;"><div class="k">Archived terms</div><div class="v" style="font-size:.82rem;">${(state.archivedTerms||[]).map(x=>escapeHtml(x.replace('::',' · '))).join(' · ')}</div></div>`:'';
  root.innerHTML=`<div class="term-status-box"><div class="k">Academic year</div><div class="v">${escapeHtml(profileAcademicYear())}</div></div><div class="term-status-box"><div class="k">Current term</div><div class="v">${escapeHtml(profileTerm())}${archived?' · archived':''}</div></div><div class="term-status-box"><div class="k">Term data</div><div class="v">${courses} course${courses===1?'':'s'} · ${(record.midterms.exams||[]).length} midterm exam${(record.midterms.exams||[]).length===1?'':'s'} · ${(record.finals.exams||[]).length} final exam${(record.finals.exams||[]).length===1?'':'s'}</div></div>${archivedList}`;
}
function archiveCurrentTerm(){
  const key=dailyAcademicKey();
  if(!state.archivedTerms)state.archivedTerms=[];
  if(state.archivedTerms.includes(key)){showToast('this term is already archived');return;}
  if(!confirm(`Archive ${profileAcademicYear()} ${profileTerm()}? Nothing will be deleted.`))return;
  state.archivedTerms.push(key);saveState();renderTermManager();showToast('term archived ♡');
}
function openStartTermModal(){
  const oldYear=profileAcademicYear(),oldTerm=profileTerm();
  const scrim=document.createElement('div');scrim.className='modal-scrim';
  scrim.innerHTML=`<div class="course-modal"><h3 style="color:var(--red-deep);">start / switch term</h3><div class="course-form-grid">
    <div><label>academic year</label><input id="newTermYear" value="${escapeAttr(oldYear)}" placeholder="2026–2027"></div>
    <div><label>term</label><select id="newTermName">${TERM_OPTIONS.map(t=>`<option ${t===oldTerm?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="full"><label class="term-copy-check"><input type="checkbox" id="copyTermCourses"><span><strong>copy my current course setup</strong><br><span class="small-note">Copies name, code, professor, units, color, and grading weights. It does NOT copy class schedules, tasks, grades, exam dates, topics, or study progress.</span></span></label></div>
    <div class="term-modal-note">Every new term gets a clean <strong>midterms</strong> and <strong>finals</strong> workspace. Your old term stays saved, so there is no need to reset it.</div>
  </div><div class="modal-actions"><button class="more-shortcut" id="cancelStartTerm">cancel</button><button class="btn" id="confirmStartTerm">switch term</button></div></div>`;
  document.body.appendChild(scrim);
  scrim.querySelector('#cancelStartTerm').addEventListener('click',()=>scrim.remove());
  scrim.addEventListener('click',e=>{if(e.target===scrim)scrim.remove();});
  scrim.querySelector('#confirmStartTerm').addEventListener('click',()=>{
    const year=scrim.querySelector('#newTermYear').value.trim().slice(0,30)||oldYear;
    const term=scrim.querySelector('#newTermName').value;
    const copy=scrim.querySelector('#copyTermCourses').checked;
    if(year===oldYear&&term===oldTerm){scrim.remove();showToast('you are already in that term');return;}
    ensureTermRecord(year,term);
    if(copy){
      const existingNames=new Set(coursesForTerm(year,term).map(c=>normalizeAcademicName(c.name)));
      coursesForTerm(oldYear,oldTerm).forEach(c=>{
        if(existingNames.has(normalizeAcademicName(c.name)))return;
        const id=cryptoId();
        state.courses.push({
          ...cloneJson(c),
          id,
          academicYear:year,
          term,
          schedules:[],
          schedule:'',
          room:'',
          gwaFinalGrade:'',
          gwaMode:'auto'
        });
        state.gradebook[id]={midterms:[],finals:[]};
      });
    }
    state.profile.academicYear=year;
    state.profile.term=term;
    state.examContext={academicYear:year,term};
    state.examPeriod=null;
    saveState();scrim.remove();renderAll();renderTermManager();showToast(`${term} is now your current term ♡`,{longer:true});
  });
}

function initAcademicTerms(){
  ensureAcademicStructure();

  document.getElementById('examYearSelect')?.addEventListener('change',e=>{state.examContext.academicYear=e.target.value;ensureTermRecord(activeExamYear(),activeExamTerm());saveState();});
  document.getElementById('examTermSelect')?.addEventListener('change',e=>{state.examContext.term=e.target.value;ensureTermRecord(activeExamYear(),activeExamTerm());saveState();});

  document.getElementById('addExamBtn')?.addEventListener('click',()=>openExamModal());
  document.getElementById('resetExamPeriodBtn')?.addEventListener('click',resetActiveExamPeriod);
  document.getElementById('startNewTermBtn')?.addEventListener('click',openStartTermModal);
  document.getElementById('archiveCurrentTermBtn')?.addEventListener('click',archiveCurrentTerm);

  // The Profile form may also change the current AY/term.
  document.getElementById('saveProfileBtn')?.addEventListener('click',()=>{
    if(!TERM_OPTIONS.includes(state.profile.term))state.profile.term='Term 1';
    state.examContext={academicYear:profileAcademicYear(),term:profileTerm()};
    ensureTermRecord(profileAcademicYear(),profileTerm());
    saveState();renderAll();renderTermManager();
  });

  renderExamChooserContext();
  renderTermManager();
}

/* ===================== END ACADEMIC TERMS ===================== */

/* ===================== INIT ===================== */
function renderAll(){
  renderDashboard();
  renderSchedule();
  renderSubjectsTab();
  renderTimerTab();
  renderCustomCountdown();
  renderMatchaCorner();
  renderCramchyTasks();
  renderCramchySettings();
  renderDynamicCourses();
  renderGradebook();
  renderDailyCountdown();
  renderExamMode();
  renderDailyHome();
  renderTermManager();
  renderExamChooserContext();
  applyCramchyPersonalization();
}
ensureAcademicStructure();
switchTab('dashboard');
renderAll();
updateBreakDisplay();
initCramchyShell();
initAcademicTerms();
initExamAndCourses();
initDailyHome();
initGradesModes();
initCloudSync();

})();
