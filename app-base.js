
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

const quickGwaRules = window.CramchyModules?.quickGwaRules;
if(!quickGwaRules) throw new Error('Quick GWA rules module failed to initialize.');

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
  "hanabi brought the book. your turn",
  "hanabi says one more page.",
  "tail wag = she approves. keep studying.",
  "hanabi is waiting for you to finish that topic.",
  "study buddy reporting for duty.",
  "hanabi says you can do one more."
];

const KENKEN_MESSAGES = [
  "kenken popped up to check on you",
  "kenken says keep going.",
  "tiny peek of encouragement.",
  "one more topic and kenken approves.",
  "kenken is watching your progress.",
  "hi. now back to studying"
];

const COLLECTIBLE_ICONS = ['🍓','🍵','🎀','🧋','🍰','🍡','🌸','⭐','✨','🫧','🍒','🧁'];

const STORAGE_KEY = 'strawberryMatchaMidtermsState_v1';
const APP_VERSION = '2026.09.08-stability.1';
const APP_VERSION_KEY = 'cramchyLastAppVersion';
const STATE_SCHEMA_VERSION = 2;
let pendingBootToast = '';
const SUPABASE_URL = 'https://pjgkadfnvqddfyjmktis.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1hoILah2SpoWwtZ0u2O6UQ_zgRsuNq_';
const sb = window.CramchyAccounts?.client || null;
let cloudUser = null;
let cloudReady = false;
let cloudSaveTimer = null;
let cloudLoading = false;
let trackerSync = null;

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
    academicMigrationVersion: 1,
    stateSchemaVersion: STATE_SCHEMA_VERSION,
    lastAppVersion: APP_VERSION
  };
}

let state = loadState();

function loadState(){
  try{
    syncAppVersionFlag();
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return freshState();
    const parsed = JSON.parse(raw);
    const cleaned = sanitizeState(parsed);
    const changed = applyStateMigrations(cleaned, parsed);
    if(changed){
      if(!localStorage.getItem(CramchyBackup.RECOVERY_KEY)) CramchyBackup.preserve(localStorage, 'before loading migration');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  }catch(e){
    console.warn('Failed to load state, repairing with a fresh safe shape.', e);
    try{
      if(!localStorage.getItem(CramchyBackup.RECOVERY_KEY)) CramchyBackup.preserve(localStorage, 'loading problem');
    }catch(backupError){console.error('Recovery backup could not be saved.',backupError);}
    pendingBootToast = 'Saved data could not be loaded. Export Previous Backup before adding new progress.';
    return freshState();
  }
}

function syncAppVersionFlag(){
  try{
    const previous = localStorage.getItem(APP_VERSION_KEY);
    if(previous !== APP_VERSION){
      localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
      if(previous) pendingBootToast = 'new Cramchy update loaded ✦';
      clearRuntimeCaches();
    }
  }catch(e){
    console.warn('Could not update app version flag.', e);
  }
}

function applyStateMigrations(cleaned, original){
  let changed = false;
  const previousSchema = Number(original?.stateSchemaVersion || 0);

  if(previousSchema < STATE_SCHEMA_VERSION) changed = true;
  if(cleaned.stateSchemaVersion !== STATE_SCHEMA_VERSION){
    cleaned.stateSchemaVersion = STATE_SCHEMA_VERSION;
    changed = true;
  }
  if(cleaned.lastAppVersion !== APP_VERSION){
    cleaned.lastAppVersion = APP_VERSION;
    changed = true;
  }

  if(!Array.isArray(cleaned.courses)){ cleaned.courses = []; changed = true; }
  if(!cleaned.gradebook || typeof cleaned.gradebook !== 'object'){ cleaned.gradebook = {}; changed = true; }
  cleaned.courses.forEach(course => {
    if(course && course.id && !cleaned.gradebook[course.id]){
      cleaned.gradebook[course.id] = { midterms: [], finals: [] };
      changed = true;
    }
    if(course && course.id){
      const book = cleaned.gradebook[course.id];
      if(book && typeof book === 'object'){
        if(!Array.isArray(book.midterms)){ book.midterms = []; changed = true; }
        if(!Array.isArray(book.finals)){ book.finals = []; changed = true; }
      }
    }
  });

  if(!cleaned.examData || typeof cleaned.examData !== 'object'){ cleaned.examData = {}; changed = true; }
  if(!cleaned.profile || typeof cleaned.profile !== 'object'){
    cleaned.profile = freshState().profile;
    changed = true;
  }
  if(!cleaned.examContext || typeof cleaned.examContext !== 'object'){
    cleaned.examContext = { academicYear: cleaned.profile.academicYear || '2026–2027', term: cleaned.profile.term || 'Term 1' };
    changed = true;
  }

  return changed;
}

async function clearRuntimeCaches(){
  try{
    if('caches' in window){
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
  }catch(e){
    console.warn('Cache cleanup skipped.', e);
  }
}

function repairLocalAppData(){
  try{
    CramchyBackup.preserve(localStorage, 'before repair', state);
    const before = JSON.stringify(state);
    state = sanitizeState(state);
    applyStateMigrations(state, {});
    ensureAcademicStructure();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
    clearRuntimeCaches();
    renderAll();
    const changed = before !== JSON.stringify(state);
    showToast(changed ? 'Cramchy repaired your app data ✦' : 'Cramchy data already looks healthy ✦', { longer: true });
  }catch(e){
    console.error('Repair failed', e);
    showToast('repair had a tiny problem. export a backup, then message me.', { longer: true });
  }
}

function showBootUpdateNotice(){
  if(pendingBootToast){
    setTimeout(() => showToast(pendingBootToast, { longer: true }), 700);
    pendingBootToast = '';
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
      subjectName:typeof h.subjectName==='string'?h.subjectName.slice(0,100):'',
      sessionId:typeof h.sessionId==='string'?h.sessionId.slice(0,160):'',
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
    const allowed=quickGwaRules.allowedGrades;
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
  if(Number.isFinite(+parsed.stateSchemaVersion)) out.stateSchemaVersion = Math.max(0, Math.floor(+parsed.stateSchemaVersion));
  if(typeof parsed.lastAppVersion === 'string') out.lastAppVersion = parsed.lastAppVersion.slice(0,60);
  return out;
}

function cryptoId(){ return 'id-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }

/* ===================== SAVE (debounced with indicator) ===================== */
let saveTimeout = null;
function saveState(){
  state.stateSchemaVersion = STATE_SCHEMA_VERSION;
  state.lastAppVersion = APP_VERSION;
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
  renderHomeTaskSummary();
  if(typeof renderTermManager==='function')renderTermManager();
  if(typeof window!=='undefined')window.dispatchEvent(new Event('cramchy:schedules-changed'));
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
  const exam = examForSubject(id);
  const hrs = exam?.start ? hoursUntil(exam.start) : null;
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
  showToast('mission added');
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
  el.textContent = diff <= 0 ? 'time\'s up' : formatCustomCountdownPrecise(diff);
}

document.getElementById('setCountdownBtn').addEventListener('click', () => {
  const dateVal = document.getElementById('customCountdownDate').value;
  const timeVal = document.getElementById('customCountdownTime').value;
  if(!dateVal || !timeVal){
    showToast('pick both a date and a time first');
    return;
  }
  state.customCountdown = { date: dateVal, time: timeVal };
  saveState();
  updateCustomCountdownDisplay();
  showToast('countdown set');
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
    list.innerHTML = `<div class="empty-state">No topics yet. Add your first one below</div>`;
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
        showToast('topic completed! matcha is pleased');
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
    showToast('link added');
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
  showToast('topic added');
}

/* ===================== STUDY TIMER ===================== */
let timerState=readStudyTimer();
let timerIntervalId=null;
function readStudyTimer(){
  try{return CramchyStudyTimer.clean(JSON.parse(localStorage.getItem(CramchyStudyTimer.KEY)||'null'));}
  catch(error){console.warn('Study timer could not be loaded.',error);return CramchyStudyTimer.fresh();}
}
function persistStudyTimer(next){
  try{
    localStorage.setItem(CramchyStudyTimer.KEY,JSON.stringify(next));
    timerState=next;
    return true;
  }catch(error){showToast('timer could not be saved. Please export a backup and free some device storage.',{longer:true});return false;}
}
function updateTimerDisplay(){
  const remaining=CramchyStudyTimer.remaining(timerState,Date.now());
  const m=Math.floor(remaining/60),s=remaining%60;
  document.getElementById('timerDisplay').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  // Ring and digits share this exact remaining-time snapshot; no second clock.
  const duration=timerState.presetMinutes*60;
  const fraction=Math.max(0,Math.min(1,remaining/duration));
  document.getElementById('timerRingProgress')?.setAttribute('stroke-dashoffset',String((1-fraction)*100));
  const dial=document.getElementById('timerDial');
  if(dial){
    dial.setAttribute('aria-valuemax',String(duration));
    dial.setAttribute('aria-valuenow',String(remaining));
    dial.setAttribute('aria-valuetext',`${m} minutes ${s} seconds remaining`);
  }
  const start=document.getElementById('timerStartBtn'),pause=document.getElementById('timerPauseBtn');
  start.disabled=timerState.running;
  const startLabel=timerState.session?'resume':'start';
  if(start.textContent!==startLabel)start.textContent=startLabel;
  pause.disabled=!timerState.running;
  document.getElementById('timerSubjectSelect').disabled=Boolean(timerState.session);
  document.querySelectorAll('[data-mins]').forEach(btn=>{btn.disabled=Boolean(timerState.session);});
}
function tickStudyTimer(){
  if(timerState.running&&CramchyStudyTimer.remaining(timerState,Date.now())===0){
    // Finish after an incoming cloud snapshot so it cannot erase this new log.
    if(typeof cloudLoading!=='undefined'&&cloudLoading){updateTimerDisplay();return;}
    if(!logStudySession(timerState.session))return;
    clearInterval(timerIntervalId);timerIntervalId=null;
    showToast('study session complete ✧');chaowiReact('complete');
    renderTimerTab();
  }
  updateTimerDisplay();
}
function runStudyTimer(){
  clearInterval(timerIntervalId);
  timerIntervalId=timerState.running?setInterval(tickStudyTimer,1000):null;
}
document.getElementById('timerSubjectSelect').addEventListener('change',e=>{
  if(timerState.session)return;
  if(!persistStudyTimer({...timerState,subject:e.target.value}))renderTimerTab();
});
document.querySelectorAll('[data-mins]').forEach(btn=>btn.addEventListener('click',()=>{
  if(timerState.session)return;
  if(persistStudyTimer(CramchyStudyTimer.fresh(timerState.subject,+btn.dataset.mins)))updateTimerDisplay();
}));
document.getElementById('timerStartBtn').addEventListener('click',()=>{
  if(timerState.running)return;
  const course=(state.courses||[]).find(c=>`course-${c.id}`===timerState.subject);
  const next=CramchyStudyTimer.start(timerState,Date.now(),{
    id:cryptoId(),subjectName:course?.name||(timerState.subject==='general'?'General Study':examSubjectNameById(timerState.subject)),
    academicKey:state.examPeriod?activeAcademicKey():dailyAcademicKey(),period:state.examPeriod||''
  });
  if(!persistStudyTimer(next))return;
  chaowiReact('start');runStudyTimer();tickStudyTimer();
});
document.getElementById('timerPauseBtn').addEventListener('click',()=>{
  if(!timerState.running)return;
  if(CramchyStudyTimer.remaining(timerState,Date.now())===0){tickStudyTimer();return;}
  if(!persistStudyTimer(CramchyStudyTimer.pause(timerState,Date.now())))return;
  clearInterval(timerIntervalId);timerIntervalId=null;chaowiReact('pause');updateTimerDisplay();
});
document.getElementById('timerResetBtn').addEventListener('click',()=>{
  if(!persistStudyTimer(CramchyStudyTimer.reset(timerState)))return;
  clearInterval(timerIntervalId);timerIntervalId=null;renderTimerTab();
});
window.addEventListener('cramchy:backup-restored',()=>{
  timerState=readStudyTimer();runStudyTimer();renderTimerTab();
});
document.addEventListener('visibilitychange',tickStudyTimer);
window.addEventListener('focus',tickStudyTimer);
runStudyTimer();

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
  const commentary = streak >= 3 ? "look at you, actually consistent" : (streak >= 1 ? "keep it going, don't break the chain." : "start today. matcha is watching.");
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
      state.petDuoNap=false; saveState(); applyPetState(); showBubble('awake!', anchorEl);
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
  start: ["chaowi says lock in", "study time. she is supervising.", "mrrp. focus mode."],
  pause: ["chaowi will allow this break.", "tiny pause. then back to it"],
  complete: ["chaowi is proud of you", "session complete. acceptable. very acceptable.", "you did it!! chaowi approves."],
  topic: ["chaowi witnessed that. +1 topic", "one less thing to panic about.", "good. feed her another completed topic."]
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
      else { modeBtn.textContent = '☀'; modeBtn.title = 'Wake Chaowi'; }
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
      showChaowiMessage('mrrp... you woke chaowi. better make it worth it');
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
        showChaowiMessage('chaowi is napping. shhh');
      }else if(mode === 'nap'){
        applyMode('hidden');
        showToast('chaowi hid in her little corner. tap the paw to bring her back');
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
      showToast('break over. back to the academic trenches');
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
window.addEventListener('cramchy:planner-cloud-loaded',event=>{
  if(event.detail?.recoverySaved) showToast('Planner synced. Your previous calendar is available in Export Previous Backup.',{longer:true});
});
window.addEventListener('cramchy:planner-cloud-error',()=>{
  showToast('Planner sync could not finish. Your local events were kept.',{longer:true});
});
function downloadCramchyBackup(backup,filename){
  const blob = new Blob([JSON.stringify(backup,null,2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.getElementById('exportBtn').addEventListener('click', () => {
  try{
    downloadCramchyBackup(CramchyBackup.create(state,localStorage),'cramchy-backup.json');
    showToast('complete backup exported');
  }catch(error){showToast('backup could not be exported. Please try again.');}
});
document.getElementById('recoveryExportBtn')?.addEventListener('click', () => {
  try{
    const raw=localStorage.getItem(CramchyBackup.RECOVERY_KEY);
    if(!raw){showToast('no previous backup saved yet');return;}
    downloadCramchyBackup(JSON.parse(raw),'cramchy-previous-backup.json');
    showToast('previous backup exported');
  }catch(error){showToast('previous backup could not be exported.');}
});
function replaceLocalProgress(next,extras){
  const previous=state;
  try{
    state=next;
    ensureAcademicStructure();
    CramchyBackup.restore(localStorage,state,extras);
  }catch(error){state=previous;throw error;}
  clearTimeout(saveTimeout);
  // Persistence succeeded even if an unrelated view has a rendering error.
  try{renderAll();}catch(error){console.error('Backup view refresh failed. Reload to refresh the view.',error);}
  window.dispatchEvent(new CustomEvent('cramchy:backup-restored'));
  queueCloudSave();
}
document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try{
      const backup=CramchyBackup.decode(JSON.parse(evt.target.result));
      const next=sanitizeState(backup.state);
      applyStateMigrations(next,backup.state);
      CramchyBackup.preserve(localStorage,'before import',state);
      replaceLocalProgress(next,backup.extras);
      showToast(backup.legacy?'older backup imported; current Planner and Term GWA entries kept':'complete backup imported',{longer:true});
    }catch(err){
      console.error('Backup import failed.',err);
      showToast('backup could not be imported. Your current progress was kept.');
    }
  };
  reader.onerror=()=>showToast('that file could not be read.');
  reader.readAsText(file);
  e.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  showModal(
    'Reset everything?',
    'This deletes courses, grades, tasks, Planner events, Term GWA entries, topics, notes, and study progress. Export a complete backup first. A previous backup will also be saved on this device.',
    () => {
      try{
        CramchyBackup.preserve(localStorage,'before reset',state);
        const extras=Object.fromEntries(CramchyBackup.EXTRA_KEYS.map(key=>[key,null]));
        replaceLocalProgress(freshState(),extras);
        showToast('everything has been reset');
      }catch(error){showToast('reset could not be completed. Your progress was kept.');}
    }
  );
});

document.getElementById('repairDataBtn')?.addEventListener('click', repairLocalAppData);

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
  if(!trackerSync || !cloudUser || !window.CramchyAccounts.active(cloudUser.id)) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(saveStateToCloud, 700);
}
async function saveStateToCloud(){
  if(!trackerSync) return false;
  return trackerSync.push();
}
async function loadCloudStateForUser(user){
  if(!sb || !user || !window.CramchyAccounts.active(user.id)) return false;
  if(!trackerSync){
    const initial=CramchyCloudSync.canonical(state);
    trackerSync=CramchyCloudSync.create({
      client:sb,table:'midterms_tracker_state',column:'state',key:'cramchyTrackerSync_v1',
      userId:user.id,storage:localStorage,active:()=>window.CramchyAccounts.active(user.id),
      read:()=>state,empty:freshState,
      hasLocal:()=>localStorage.getItem(STORAGE_KEY)!==null||CramchyCloudSync.canonical(state)!==initial,
      normalize:raw=>{if(!CramchyBackup.decode(raw).state)throw Error('Invalid cloud data');const next=sanitizeState(raw);applyStateMigrations(next,raw);return next;},
      apply:remote=>{
        CramchyBackup.preserve(localStorage,'before tracker cloud replacement',state);
        clearTimeout(saveTimeout);saveTimeout=null;
        localStorage.setItem(STORAGE_KEY,JSON.stringify(remote));state=remote;
        ensureAcademicStructure();renderAll();
      },
      onStatus:status=>{
        cloudLoading=status==='loading';cloudReady=!['error','loading','conflict'].includes(status);
        const labels={loading:'☁ loading…',saving:'☁ syncing…',pending:'☁ pending',synced:'☁ synced',error:'☁ sync error',conflict:'☁ choose copy'};
        setCloudButton(labels[status]||'☁ pending',status==='synced'?'synced':status==='saving'?'syncing':'');
        if(status==='pending')queueCloudSave();
      },
      onConflict:()=>notifyCloudConflict('study progress'),
      onError:error=>{console.error('Cloud sync kept local progress.',error);showToast('Cloud sync could not finish. Your local progress was kept.');}
    });
    window.CramchySyncEngines=window.CramchySyncEngines||{};
    window.CramchySyncEngines['study progress']=trackerSync;
  }
  window.__cramchyTrackerCloudReady=trackerSync.pull();
  return window.__cramchyTrackerCloudReady;
}
function notifyCloudConflict(label){
  showToast('Your '+label+' differs from the cloud. Open cloud sync to choose which copy to use.',{longer:true});
  renderCloudConflictChoices();
}
window.addEventListener('cramchy:sync-conflict',event=>notifyCloudConflict(event.detail?.label||'Planner'));
function renderCloudConflictChoices(){
  const root=document.getElementById('cloudConflictChoices');if(!root)return;
  root.innerHTML='';
  Object.entries(window.CramchySyncEngines||{}).forEach(([label,engine])=>{
    if(!engine.conflict)return;
    const section=document.createElement('div');
    const title=document.createElement('p');title.textContent=label+': both copies were kept. Choose which one to use.';section.appendChild(title);
    const actions=document.createElement('div');actions.className='cloud-auth-actions';
    for(const [choice,text] of [['local','keep this device'],['cloud','use cloud copy']]){
      const btn=document.createElement('button');btn.className='cloud-secondary';btn.textContent=text;
      btn.addEventListener('click',async()=>{
        actions.querySelectorAll('button').forEach(button=>button.disabled=true);
        const ok=await engine.resolve(choice);
        const msg=document.getElementById('cloudAuthMsg');
        if(msg)msg.textContent=ok?'Your chosen copy is saved.':'Could not finish. Both copies were kept; check the current choices.';
        renderCloudConflictChoices();
      });actions.appendChild(btn);
    }
    section.appendChild(actions);root.appendChild(section);
  });
}
window.addEventListener('cramchy:account-leaving',()=>{
  clearTimeout(saveTimeout);clearTimeout(cloudSaveTimer);trackerSync?.stop();
  clearInterval(timerIntervalId);
  cloudUser=null;cloudReady=false;cloudLoading=false;
});
window.CramchyAccounts.flushLocal=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
window.addEventListener('cramchy:account-save-error',()=>{
  // Stop the old account's UI being used under a new session if disk is full.
  document.querySelector('main').style.display='none';
  closeCloudModal();
  const notice=document.createElement('div');notice.className='card';
  const text=document.createElement('p');text.textContent='Your account changed, but the last edits could not be saved on this device. Export them before refreshing.';notice.appendChild(text);
  const exportBtn=document.createElement('button');exportBtn.className='btn';exportBtn.textContent='export unsaved backup';
  exportBtn.addEventListener('click',()=>downloadCramchyBackup(CramchyBackup.create(state,localStorage),'cramchy-unsaved-backup.json'));
  notice.appendChild(exportBtn);document.body.appendChild(notice);
});
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
        <h3>cloud sync</h3>
        <p>Cramchy is signed in and can sync across devices.</p>
        <div class="cloud-user">${escapeHtml(cloudUser.email || 'signed in')}</div>
        <div class="cloud-auth-actions">
          <button class="cloud-primary" id="cloudSyncNowBtn">sync now</button>
          <button class="cloud-secondary" id="cloudSignOutBtn">sign out</button>
        </div>
        <div id="cloudConflictChoices"></div>
        <p class="cloud-msg" id="cloudAuthMsg"></p>
      </div>`;
  }else{
    overlay.innerHTML = `
      <div class="cloud-auth-card">
        <button class="cloud-close" id="cloudCloseBtn" aria-label="Close">×</button>
        <h3>save it in the cloud</h3>
        <p>Signed-in accounts have their own progress. Your guest work stays on this device and returns when you sign out. To move guest work into an account, export it first, then import it after signing in.</p>
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
    renderCloudConflictChoices();
    overlay.querySelector('#cloudSyncNowBtn')?.addEventListener('click', async () => {
      const msg = overlay.querySelector('#cloudAuthMsg');
      if(msg) msg.textContent = 'syncing…';
      const results=await Promise.all(Object.values(window.CramchySyncEngines||{}).map(engine=>engine.push()));
      if(msg) msg.textContent = results.every(Boolean)?'synced':'Sync needs attention. Your local copies were kept.';
      renderCloudConflictChoices();
    });
    overlay.querySelector('#cloudSignOutBtn')?.addEventListener('click', async () => {
      const {error}=await sb.auth.signOut();
      if(error){overlay.querySelector('#cloudAuthMsg').textContent='Sign-out could not finish. Try again.';return;}
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
    if(!email){ msgEl.textContent='enter your email first'; return; }

    msgEl.textContent='sending your 8-digit code…';
    const { error } = await sb.auth.signInWithOtp({
      email,
      options:{ shouldCreateUser: true }
    });

    if(error){ msgEl.textContent=error.message; return; }

    pendingOtpEmail = email;
    if(emailEl) emailEl.disabled = true;
    if(codeArea) codeArea.style.display = 'block';
    msgEl.textContent='code sent check your email, then enter the 8-digit code here.';
    setTimeout(() => codeEl?.focus(), 0);
  });

  overlay.querySelector('#cloudVerifyCodeBtn')?.addEventListener('click', async () => {
    const email = pendingOtpEmail || (emailEl?.value || '').trim();
    const token = (codeEl?.value || '').replace(/\D/g, '').slice(0, 8);

    if(!email){ msgEl.textContent='enter your email first'; return; }
    if(token.length !== 8){ msgEl.textContent='enter the 8-digit code from your email'; return; }

    msgEl.textContent='signing you in…';
    const { data, error } = await sb.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });

    if(error){ msgEl.textContent=error.message; return; }

    if(data?.session){
      msgEl.textContent='signed in your session will stay on this device.';
      setTimeout(closeCloudModal, 450);
    }else{
      msgEl.textContent='signed in';
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
  if(!sb){setCloudButton('☁ local only');return;}
  btn?.addEventListener('click', openCloudModal);
  cloudUser=window.CramchyAccounts.user;
  if(cloudUser)await loadCloudStateForUser(cloudUser);
  else setCloudButton('☁ sign in');
  const refresh=()=>{
    if(document.visibilityState==='hidden'||!cloudUser)return;
    loadCloudStateForUser(cloudUser);
  };
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('focus',refresh);
  window.addEventListener('online',refresh);
  window.addEventListener('cramchy:account-storage',event=>{
    if(event.detail?.key===STORAGE_KEY){
      // A second tab changed this account. Reload rather than leave stale
      // in-memory state that could overwrite its work on the next edit.
      trackerSync?.stop();clearTimeout(saveTimeout);clearTimeout(cloudSaveTimer);
      try{
        CramchyBackup.preserve(localStorage,'before another tab refreshed this account',state);
        location.reload();
      }catch(error){
        console.error('Another tab changed the saved copy; this tab kept its in-memory copy.',error);
        showToast('Another tab changed your progress. Export a backup of this tab before refreshing.',{longer:true});
      }
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
  const endings={sweet:'one little step at a time',chaotic:'academic weapon era starts now.',strict:'let’s get through today’s list.',mixed:'we are absolutely locking in today.'};
  return `${greeting}, ${name} · ${term} · ${endings[style]||endings.mixed}`;
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
  renderTermManager();
  const name=document.getElementById('profileName'),yr=document.getElementById('profileYear'),term=document.getElementById('profileTerm'),mot=document.getElementById('profileMotivation');
  if(name)name.value=state.profile.name||'';if(yr)yr.value=state.profile.academicYear||'';
  if(term){if(!Array.from(term.options).some(o=>o.value===state.profile.term)){const o=document.createElement('option');o.value=o.textContent=state.profile.term;term.appendChild(o);}term.value=state.profile.term;}
  if(mot)mot.value=state.profile.motivation||'mixed';
  const picker=document.getElementById('settingsThemePicker');
  if(picker){picker.innerHTML=themePickerMarkup(state.profile.theme);picker.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>setThemeChoice(b.dataset.themeChoice,picker)));}
}
function renderCramchyTasks(){
  const wrap=document.getElementById('cramchyTaskList');if(!wrap)return;
  if(!state.missions.length){wrap.innerHTML=`<div class="shell-empty"><div class="big">nothing here yet</div><p>Add a quick task below. Course-linked tasks, deadlines, priorities, and subtasks come in the full Tasks build.</p></div>`;return;}
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
    <label>choose your study space</label><div class="theme-picker" id="onboardThemePicker">${themePickerMarkup(selected)}</div>
    <button class="onboard-start" id="startCramchyBtn">enter my academic weapon era →</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#onboardTerm').value=state.profile?.term||'Term 1';overlay.querySelector('#onboardMotivation').value=state.profile?.motivation||'mixed';
  overlay.querySelectorAll('[data-theme-choice]').forEach(btn=>btn.addEventListener('click',()=>{selected=btn.dataset.themeChoice;overlay.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('selected',b===btn));document.body.dataset.theme=selected;}));
  overlay.querySelector('#startCramchyBtn').addEventListener('click',()=>{
    const name=overlay.querySelector('#onboardName').value.trim();if(!name){overlay.querySelector('#onboardName').focus();return;}
    state.profile={name:name.slice(0,40),academicYear:overlay.querySelector('#onboardYear').value.trim().slice(0,30)||'2026–2027',term:overlay.querySelector('#onboardTerm').value,motivation:overlay.querySelector('#onboardMotivation').value,theme:selected,onboarded:true};
    saveState();applyCramchyPersonalization();overlay.remove();renderAll();showToast(`welcome to cramchy, ${name.toLowerCase()}`,{longer:true});
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
    saveState();ensureAcademicStructure();renderAll();showToast('profile saved');
  });
  document.querySelectorAll('[data-open-tab]').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.openTab)));
  if(typeof CHAOWI_MESSAGES!=='undefined'){
    ["{name}, opening cramchy does not count as studying.","{name}, academic weapon era starts with one task.","{name}, chaowi has reviewed the situation. lock in.","{name}, that reviewer is not going to read itself."].forEach(x=>{if(!CHAOWI_MESSAGES.includes(x))CHAOWI_MESSAGES.push(x);});
  }
  if(!state.profile?.onboarded)setTimeout(async()=>{
    await window.__cramchyTrackerCloudReady;
    if(!state.profile?.onboarded)openCramchyOnboarding();
  },180);
}


/* ===================== DYNAMIC COURSES + EXAM MODE ===================== */
function renderDailyCountdown(){
  const box=document.getElementById('dailyCountdownBox'); if(!box) return;
  const ex=getClosestExam();
  if(!ex){ box.innerHTML='<p class="small-note">nothing urgent yet</p>'; return; }
  box.innerHTML=`<span class="tag">COMING UP</span><h3>${escapeHtml(ex.subject||'Upcoming exam')}</h3><div class="meta">${escapeHtml(formatExamDate(ex.start))}</div><div class="countdown-big">${formatCountdown(ex.start,ex.end)}</div>`;
}
function renderDynamicCourses(){
  const grid=document.getElementById('dynamicCourseGrid'); if(!grid) return;
  const courses=state.courses||[];
  if(!courses.length){
    grid.innerHTML='<div class="card shell-empty" style="grid-column:1/-1;"><div class="big">no courses yet</div><p>Add your first course so Cramchy can connect tasks, grades, study sessions, and exams to it.</p></div>';
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
    <h3 style="color:var(--red-deep);">${existing?'edit course':'add course'}</h3>
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
      academicYear:existing?.academicYear||state.profile?.academicYear||'2026–2027',
      term:scrim.querySelector('#courseTerm').value.trim().slice(0,30),
      schedule:scrim.querySelector('#courseSchedule').value.trim().slice(0,120),
      schedules:Array.isArray(existing?.schedules)?existing.schedules:[],
      gradingScheme:existing?.gradingScheme||{ww:30,pt:20,attendance:10,exam:40},
      gwaFinalGrade:existing?.gwaFinalGrade||'',
      gwaMode:existing?.gwaMode||'auto'
    };
    if(existing) state.courses=state.courses.map(c=>c.id===existing.id?course:c); else state.courses.push(course);
    if(!state.gradebook || typeof state.gradebook !== 'object') state.gradebook = {};
    if(!state.gradebook[course.id]) state.gradebook[course.id] = { midterms: [], finals: [] };
    ensureAcademicStructure();
    saveState(); renderDynamicCourses(); renderDailyHome(); renderGradebook(); scrim.remove(); showToast(existing?'course updated':'course added');
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
    wrap.innerHTML='<div class="shell-empty" style="padding:18px 10px;"><div class="big">nothing due here</div><p>Add a task and it will show up on your daily dashboard.</p></div>';
    return;
  }
  wrap.innerHTML=tasks.map(m=>`<label class="daily-task-row ${m.done?'done':''}">
    <input type="checkbox" data-daily-task="${escapeAttr(m.id)}" ${m.done?'checked':''}>
    <span class="task-text">${escapeHtml(m.text)}</span>
  </label>`).join('');
  wrap.querySelectorAll('[data-daily-task]').forEach(el=>el.addEventListener('change',()=>{
    const item=state.missions.find(m=>m.id===el.dataset.dailyTask); if(item)item.done=el.checked;
    saveState(); renderDailyHome(); renderCramchyTasks(); renderDashboard();
  }));
}
function renderHomeTaskSummary(){
  const count=document.getElementById('dailyTasksLeft');
  if(count)count.textContent=String((state.missions||[]).filter(task=>task&&!task.done).length);
  renderDailyTasks();
}
function renderDailyCourses(){
  const strip=document.getElementById('dailyCourseStrip'); if(!strip) return;
  const courses=(state.courses||[]).slice(0,6);
  if(!courses.length){
    strip.innerHTML='<div class="card shell-empty" style="grid-column:1/-1;"><div class="big">add your courses</div><p>Once added, your daily dashboard will pull course info from them.</p><button class="btn" id="homeAddCourseBtn">+ add course</button></div>';
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
  if(!ex.length){wrap.innerHTML='<div class="small-note">nothing urgent right now</div>';return;}
  wrap.innerHTML=ex.map(e=>`<div class="upcoming-item"><strong>${escapeHtml(e.subject)}</strong><span>${escapeHtml(formatExamDate(e.start))} · ${formatCountdown(e.start,e.end)}</span></div>`).join('');
}…29440 tokens truncated…t(q))return 'tasks';
  if(/\b(exam|exams|midterm|midterms|final|finals)\b/.test(q))return 'exam';
  if(/\b(next class|class today|class tomorrow|classes|class|schedule|am i free|free tomorrow)\b/.test(q))return 'schedule';
  if(/\b(gwa|grade|grades|standing|scores|score|dragging|weakest|passing|doing best|doing worst)\b/.test(q))return 'grade';
  if(/\b(professor|prof|teacher|instructor|units|section|course code|grading scheme|what courses|my courses|courses am i taking|what room|room is|where is)\b/.test(q))return 'course';
  if(/\b(that day|same day|that date|what else|anything else|what about|how about|for it|for that|after that)\b/.test(q)&&askCramchyContext.lastIntent)return askCramchyContext.lastIntent;
  return 'friendly';
}
function askHandleIntent(raw){
  const explicitCourse=askFindCourse(raw);let intent=askIntent(raw),q=askNormalize(raw);
  if(intent==='friendly'&&explicitCourse&&askCramchyContext.lastIntent)intent=askCramchyContext.lastIntent;
  if(!explicitCourse&&askCramchyContext.lastExamChoices?.length>1&&/\b(it|that exam|for it|for that|which one)\b/.test(q)&&['study','topics','exam','course'].includes(intent)){
    askCramchyContext.lastIntent=intent;
    const names=[...new Set(askCramchyContext.lastExamChoices.map(x=>x.name))];
    return `Which exam do you mean — ${names.slice(0,4).join(' or ')}?`;
  }
  let course=askCourseFromContext(raw);
  if(intent==='exam'&&!explicitCourse&&/\b(all|what else|anything else|that day|same day|that date)\b/.test(q))course=null;
  if(!course&&['study','topics'].includes(intent)&&askCramchyContext.lastCourseId)course=askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId)||null;
  if(course)askRememberCourse(course);askCramchyContext.lastIntent=intent;
  if(intent==='exam')return askExamQuery(raw,course);
  if(intent==='schedule')return askScheduleQuery(raw,course);
  if(intent==='topics')return askTopicsQuery(raw,course);
  if(intent==='study')return askStudyAdvice(course,raw);
  if(intent==='tasks')return askTasks(raw);
  if(intent==='grade')return askGradeQuery(raw,course);
  if(intent==='course')return askCourseInfoQuery(raw,course);
  if(intent==='studyhistory')return askStudyHistory(raw);
  if(intent==='navigation')return askNavigation(raw);
  return askFriendly(raw);
}
function askSplitClauses(raw){
  const s=String(raw||'').trim();if(!s)return [];
  const pieces=s.split(/\s+(?:and|then|also)\s+/i).map(x=>x.trim()).filter(Boolean);
  if(pieces.length<=1)return [s];
  // Only treat it as multi-intent when at least two clauses clearly map to different useful intents.
  const intents=pieces.map(askIntent),meaningful=intents.filter(x=>x!=='friendly');
  return new Set(meaningful).size>=2?pieces:[s];
}
function askCramchyReply(raw){
  const q=askNormalize(raw);if(!q)return `Ask me something about your Cramchy data`;
  const metaHelp=/^(help|help me|what can i ask|what can i ask you|what can you do|what do you do|what do you know|what are your commands|commands|options|show me what you can do|how can you help|how can you help me|what are your features)\??$/.test(q);
  if(metaHelp)return askHelp();
  const friendly=askFriendly(raw);if(friendly&&askIntent(raw)==='friendly')return friendly;
  const clauses=askSplitClauses(raw),replies=[];
  clauses.forEach(clause=>{const reply=askHandleIntent(clause);if(reply)replies.push(reply);});
  if(replies.length)return replies.join('\n\n');
  return `I don't have a rule for that exact question yet 😭 but I can still help with your Cramchy data. Ask “what can I ask you?” and I'll show you what I know.`;
}

function askAddMessage(kind,text){
  const wrap=document.getElementById('askCramchyMessages');if(!wrap)return;const row=document.createElement('div');row.className=`ask-msg ${kind}`;const bubble=document.createElement('div');bubble.className='ask-bubble';bubble.textContent=text;row.appendChild(bubble);wrap.appendChild(row);wrap.scrollTop=wrap.scrollHeight;
}
function askAddChips(items){
  const wrap=document.getElementById('askCramchyMessages');if(!wrap)return;const row=document.createElement('div');row.className='ask-chip-row';items.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='ask-chip';b.textContent=item.label;b.addEventListener('click',()=>askSubmit(item.query||item.label));row.appendChild(b);});wrap.appendChild(row);wrap.scrollTop=wrap.scrollHeight;
}
function askSubmit(forcedText=''){
  const input=document.getElementById('askCramchyInput');const text=String(forcedText||input?.value||'').trim();if(!text)return;if(input){input.value='';input.style.height='42px';}
  askAddMessage('user',text);window.setTimeout(()=>askAddMessage('bot',askCramchyReply(text)),90);
}
function closeAskCramchy(){document.getElementById('askCramchyPanel')?.remove();document.getElementById('askCramchyLauncher')?.setAttribute('aria-expanded','false');}
function openAskCramchy(){
  if(document.getElementById('askCramchyPanel')){closeAskCramchy();return;}
  const panel=document.createElement('section');panel.id='askCramchyPanel';panel.className='ask-cramchy-panel';panel.setAttribute('aria-label','Ask Cramchy');
  panel.innerHTML=`<div class="ask-cramchy-head"><div class="ask-cramchy-avatar"><img src="${ASK_CRAMCHY_ICON}" alt="Ask Cramchy icon"></div><div class="ask-cramchy-title"><strong>ask cramchy</strong><span>your academic bestie with receipts ✦</span></div><button class="ask-cramchy-close" id="askCramchyClose" aria-label="Close">×</button></div><div class="ask-cramchy-messages" id="askCramchyMessages"></div><div class="ask-cramchy-compose"><textarea class="ask-cramchy-input" id="askCramchyInput" rows="1" maxlength="280" placeholder="ask me something..."></textarea><button class="ask-cramchy-send" id="askCramchySend" aria-label="Send">↑</button></div>`;
  document.body.appendChild(panel);document.getElementById('askCramchyLauncher')?.setAttribute('aria-expanded','true');document.getElementById('askCramchyClose')?.addEventListener('click',closeAskCramchy);
  askAddMessage('bot',`hiii ${cramchyName()} ask me about your classes, exams, grades, tasks, or what to study.`);askAddChips([{label:'what should I study?',query:'what should I study?'},{label:"what's my next class?",query:"what's my next class?"},{label:'how are my grades?',query:'how are my grades?'},{label:"when's my next exam?",query:"when's my next exam?"}]);
  const input=document.getElementById('askCramchyInput'),send=document.getElementById('askCramchySend');send?.addEventListener('click',()=>askSubmit());input?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();askSubmit();}});input?.addEventListener('input',()=>{input.style.height='42px';input.style.height=Math.min(input.scrollHeight,96)+'px';});window.setTimeout(()=>input?.focus(),80);
}
function initAskCramchy(){
  if(document.getElementById('askCramchyLauncher'))return;const btn=document.createElement('button');btn.type='button';btn.id='askCramchyLauncher';btn.className='ask-cramchy-launcher';btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-controls','askCramchyPanel');btn.innerHTML=`<span class="ask-spark"><img src="${ASK_CRAMCHY_ICON}" alt="Ask Cramchy icon"></span><span class="ask-label">ask cramchy</span>`;btn.addEventListener('click',openAskCramchy);document.body.appendChild(btn);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('askCramchyPanel'))closeAskCramchy();});
}

/* ===================== ASK CRAMCHY LOGIC V1.2 ===================== */
function askResetContext(){
  askCramchyContext={
    lastCourseId:null,lastIntent:null,lastDateKey:null,lastPeriod:null,
    lastExamId:null,lastExamPeriod:null,lastTopicName:null,lastExamChoices:[],
    lastClassWhenMs:null,lastClassCourseId:null,lastClassRoom:'',lastStudyPlan:[]
  };
}
function askNow(){return new Date();}
function askExamStartMs(exam){const n=new Date(exam?.start||'').getTime();return Number.isFinite(n)?n:NaN;}
function askExamEndMs(exam){const e=new Date(exam?.end||'').getTime();if(Number.isFinite(e))return e;return askExamStartMs(exam);}
function askExamState(exam,nowMs=Date.now()){
  const start=askExamStartMs(exam),end=askExamEndMs(exam);
  if(!Number.isFinite(start))return 'unscheduled';
  if(nowMs<start)return 'upcoming';
  if(Number.isFinite(end)&&nowMs<end)return 'in-progress';
  return 'passed';
}
function askTimeUntilText(iso){
  const target=new Date(iso).getTime(),diff=target-Date.now();
  if(!Number.isFinite(target))return '';
  if(diff<=0)return 'now';
  let mins=Math.floor(diff/60000);
  const days=Math.floor(mins/1440);mins-=days*1440;
  const hours=Math.floor(mins/60);mins-=hours*60;
  const parts=[];
  if(days)parts.push(`${days} day${days===1?'':'s'}`);
  if(hours&&parts.length<2)parts.push(`${hours} hour${hours===1?'':'s'}`);
  if(!days&&mins&&parts.length<2)parts.push(`${mins} minute${mins===1?'':'s'}`);
  return parts.join(' ')||'less than a minute';
}
function askExamCountdownSentence(item){
  if(!item)return '';
  const stateNow=askExamState(item.exam);
  if(stateNow==='in-progress')return `${item.exam.name} is in progress right now.`;
  if(stateNow==='passed')return `${item.exam.name} has already passed.`;
  return `${item.exam.name} starts in ${askTimeUntilText(item.exam.start)}.`;
}
function getClosestExam(){
  const now=Date.now();
  return getSortedExams().find(e=>askExamEndMs(e)>now)||null;
}
function nextExamDays(){
  const saved=state.examPeriod;state.examPeriod=null;const ex=getClosestExam();state.examPeriod=saved;
  if(!ex)return '—';
  const status=askExamState(ex);if(status==='in-progress')return 'now';
  const diff=askExamStartMs(ex)-Date.now();if(diff<=0)return 'today';
  const mins=Math.floor(diff/60000),days=Math.floor(mins/1440),hours=Math.floor((mins%1440)/60);
  if(days>0)return `${days}d ${hours}h`;
  if(hours>0)return `${hours}h`;
  return `${Math.max(1,mins)}m`;
}

function askPeriodFromQuery(raw){
  const q=askNormalize(raw);
  if(/\b(final|finals)\b/.test(q))return 'finals';
  if(/\b(midterm|midterms)\b/.test(q))return 'midterms';
  if(/\b(that period|this period|same period)\b/.test(q)&&askCramchyContext.lastPeriod)return askCramchyContext.lastPeriod;
  return null;
}
function askCourseCandidates(query){
  const q=askNormalize(query),compact=q.replace(/\s+/g,'');if(!q)return [];
  const stop=new Set(['the','of','in','and','for','to','my','course','subject','class','exam','psychology']);
  const out=[];
  askCurrentCourses().forEach(c=>{
    const name=askNormalize(c.name),code=askNormalize(c.code),nameCompact=name.replace(/\s+/g,'');
    const words=name.split(' ').filter(w=>w.length>1),meaningful=words.filter(w=>!stop.has(w)),aliasWords=words.filter(w=>!['the','of','in','and','for','to','my'].includes(w));
    const aliases=new Set();
    if(name)aliases.add(nameCompact);if(code)aliases.add(code.replace(/\s+/g,''));
    if(aliasWords.length){
      aliases.add(aliasWords.map(w=>w[0]).join(''));
      aliases.add(aliasWords.map(w=>w.slice(0,3)).join(''));
      if(aliasWords.length===2){aliases.add(aliasWords[0].slice(0,2)+aliasWords[1].slice(0,4));aliases.add(aliasWords[0].slice(0,3)+aliasWords[1].slice(0,3));}
    }
    // Cramchy course nicknames / shorthand used throughout Ask Cramchy.
    // Keep these explicit so short names like "fm" are resolved reliably
    // without depending on generated initials.
    if(/cognitive psychology/.test(name)||c.id==='cogpsych')aliases.add('cogpsy');
    if(/educational technology/.test(name)||c.id==='edtech')aliases.add('edtech');
    if(/field methods/.test(name)||c.id==='field')aliases.add('fm');
    if(/human anatomy/.test(name)||/anatomy/.test(name)||c.id==='anatomy')aliases.add('anaphy');
    if(/principles? of teaching/.test(name)||c.id==='teaching')aliases.add('printea');
    let score=0;
    if(name&&q.includes(name))score=100;
    if(code&&new RegExp(`\\b${code.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}\\b`).test(q))score=Math.max(score,100);
    if(nameCompact&&compact.includes(nameCompact))score=Math.max(score,95);
    aliases.forEach(a=>{
      if(!a)return;
      // Two-letter aliases (currently "fm") must match as a whole normalized token.
      if(a.length===2){
        const qTokens=q.split(' ');
        if(qTokens.includes(a))score=Math.max(score,92);
      }else if(a.length>=3&&compact.includes(a)){
        score=Math.max(score,a.length>=6?90:82);
      }
    });
    const qTokens=q.split(' ');
    let tokenScore=0,matched=0;
    meaningful.forEach(w=>{if(qTokens.includes(w)){tokenScore+=w.length>=6?7:4;matched++;}else if(w.length>=5&&qTokens.some(t=>t.length>=3&&(w.startsWith(t)||t.startsWith(w.slice(0,4))))){tokenScore+=3;matched++;}});
    if(matched)score=Math.max(score,tokenScore);
    if(score>0)out.push({course:c,score});
  });
  return out.sort((a,b)=>b.score-a.score||String(a.course.name).localeCompare(String(b.course.name)));
}
function askCourseResolution(query){
  const rows=askCourseCandidates(query);if(!rows.length)return {course:null,ambiguous:[]};
  const top=rows[0];const tied=rows.filter(r=>r.score===top.score&&r.score<90);
  if(tied.length>1)return {course:null,ambiguous:tied.slice(0,4).map(r=>r.course)};
  if(top.score<3)return {course:null,ambiguous:[]};
  return {course:top.course,ambiguous:[]};
}
function askFindCourse(query){return askCourseResolution(query).course;}
function askHasCourseReference(q){return /\b(it|its|that course|this course|same course|that subject|this subject|same subject|that class|this class|same class|for it|for that|what about|how about)\b/.test(q);}
function askCourseFromContext(query){
  const resolved=askCourseResolution(query);if(resolved.course)return resolved.course;
  const q=askNormalize(query);
  if(askHasCourseReference(q)&&askCramchyContext.lastCourseId)return askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId)||null;
  if(askCurrentCourses().length===1&&/\b(my grade|my standing|my schedule|my professor|my class)\b/.test(q))return askCurrentCourses()[0];
  return null;
}
function askLastExamItem(){
  if(!askCramchyContext.lastExamId)return null;
  return askAllExamItems().find(x=>x.exam.id===askCramchyContext.lastExamId&&x.period===askCramchyContext.lastExamPeriod)||null;
}
function askUpcomingExamItems(period=null){
  const now=Date.now();return askAllExamItems().filter(x=>(!period||x.period===period)&&askExamEndMs(x.exam)>now);
}
function askNextUpcomingExam(period=null){return askUpcomingExamItems(period)[0]||null;}
function askExamItemsForCourse(course,period=null){
  if(!course)return [];
  return askAllExamItems().filter(x=>(!period||x.period===period)&&(()=>{const c=askCourseForExam(x);return c?.id===course.id||normalizeAcademicName(x.exam.name)===normalizeAcademicName(course.name);})());
}
function askRememberExam(item){
  if(!item)return;askCramchyContext.lastExamChoices=[];askCramchyContext.lastIntent='exam';askCramchyContext.lastExamId=item.exam.id;askCramchyContext.lastExamPeriod=item.period;askCramchyContext.lastPeriod=item.period;askRememberDate(item.when);
  const c=askCourseForExam(item);if(c)askRememberCourse(c);
}
function askExamDetail(item,prefix=''){if(!item)return '';
  const room=item.exam.room?` · room ${item.exam.room}`:' · room not added';
  const end=item.exam.end?`–${formatExamTime(item.exam.end)}`:'';
  return `${prefix}${item.exam.name} (${item.period}) · ${askPrettyDate(item.when)} · ${formatExamTime(item.exam.start)}${end}${room}`;
}
function askListExams(items,title='Your exams'){
  if(!items.length)return `${title}: none.`;
  if(items.length===1)askRememberExam(items[0]);else{
    askCramchyContext.lastExamChoices=items.slice(0,12).map(x=>({id:x.exam.id,period:x.period,name:x.exam.name}));
    askCramchyContext.lastIntent='exam';
    const firstKey=askDateKey(items[0].when);if(items.every(x=>askDateKey(x.when)===firstKey))askRememberDate(items[0].when);
  }
  let msg=`${title}:\n`+items.slice(0,12).map(x=>`• ${askExamDetail(x)}`).join('\n');if(items.length>12)msg+=`\n…and ${items.length-12} more.`;return msg;
}
function askMissingExamDates(period=null){
  const courses=askCurrentCourses();
  const missingFor=p=>courses.filter(c=>!askExamItemsForCourse(c,p).some(x=>Number.isFinite(askExamStartMs(x.exam))));
  if(period){const m=missingFor(period);return m.length?`These courses don't have a ${period} exam date saved:\n`+m.map(c=>`• ${c.name}`).join('\n'):`Every course has a ${period} exam date saved`;}
  const mid=missingFor('midterms'),fin=missingFor('finals');
  if(!mid.length&&!fin.length)return `Every course has both midterms and finals exam dates saved`;
  const parts=[];if(mid.length)parts.push(`Midterms missing:\n${mid.map(c=>`• ${c.name}`).join('\n')}`);if(fin.length)parts.push(`Finals missing:\n${fin.map(c=>`• ${c.name}`).join('\n')}`);return parts.join('\n\n');
}
function askExamQuery(raw,course=null){
  const q=askNormalize(raw),period=askPeriodFromQuery(raw);if(period)askCramchyContext.lastPeriod=period;
  if(/\b(no exam|missing exam|without exam|no date|still has no exam|which.*no exam)\b/.test(q))return askMissingExamDates(period);
  const explicitDate=askResolveDate(raw,true),range=askDateRange(raw),explicitCourse=askFindCourse(raw);
  let items=askAllExamItems().filter(x=>!period||x.period===period);
  const dateWide=!!explicitDate&&!explicitCourse&&/\b(all|what else|anything else|exams on|that day|same day|that date|how many)\b/.test(q);
  if(course&&!dateWide)items=items.filter(x=>{const c=askCourseForExam(x);return c?.id===course.id||normalizeAcademicName(x.exam.name)===normalizeAcademicName(course.name);});
  if(explicitDate){askRememberDate(explicitDate);items=items.filter(x=>askSameDay(x.when,explicitDate));}
  if(range)items=items.filter(x=>x.when>=range.start&&x.when<range.end);
  if(/\b(past|passed|already done|already finished)\b/.test(q))items=items.filter(x=>askExamState(x.exam)==='passed');
  if(/\b(upcoming|next exams|exams left|remaining exams|still coming|left)\b/.test(q))items=items.filter(x=>askExamEndMs(x.exam)>Date.now());

  if(!explicitCourse&&!explicitDate&&!range&&!/\b(next|upcoming)\s+exam/.test(q)&&askCramchyContext.lastExamId&&/^(what|when|where|which)?\s*(room|time|date)|\bwhat room\b|\bwhat time\b|\bwhere is it\b|\bwhen is it\b/.test(q)){
    const last=askLastExamItem();if(last){askRememberExam(last);return askExamDetail(last);}
  }
  if(/\b(current exam|exam now|in progress)\b/.test(q)){
    const cur=items.find(x=>askExamState(x.exam)==='in-progress');return cur?(askRememberExam(cur),`${cur.exam.name} is in progress now until ${formatExamTime(cur.exam.end||cur.exam.start)}${cur.exam.room?` · room ${cur.exam.room}`:''}.`):`You don't have an exam in progress right now.`;
  }
  if(/\b(same day|two exams|multiple exams|busiest exam day)\b/.test(q)&&!explicitDate){
    const groups=new Map();items.forEach(x=>{const k=askDateKey(x.when);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);});
    let groupsArr=[...groups.entries()].filter(([,v])=>v.length>1).sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]));
    if(!groupsArr.length)return `You don't have multiple exams saved on the same day.`;
    if(/busiest exam day/.test(q))groupsArr=groupsArr.slice(0,1);
    return groupsArr.map(([k,v])=>`${askPrettyDate(askDateFromKey(k))}:\n${v.map(x=>`• ${x.exam.name} · ${formatExamTime(x.exam.start)}`).join('\n')}`).join('\n\n');
  }
  if(/\b(how many|count)\b/.test(q))return `You have ${items.length} ${period?period+' ':''}exam${items.length===1?'':'s'}${explicitDate?` on ${askPrettyDate(explicitDate)}`:range?' in that range':''}.`;
  if(/\b(how long|how many days|days until|time until)\b/.test(q)){
    const n=items.find(x=>askExamEndMs(x.exam)>Date.now())||(!course?askNextUpcomingExam(period):null);if(!n)return `I couldn't find an upcoming exam to count down to.`;askRememberExam(n);return askExamState(n.exam)==='in-progress'?`${n.exam.name} is in progress right now.`:`${n.exam.name} starts in ${askTimeUntilText(n.exam.start)} — ${askPrettyDate(n.when)} at ${formatExamTime(n.exam.start)}.`;
  }
  if(explicitDate||range){const title=explicitDate?`Exams on ${askPrettyDate(explicitDate)}`:(/next week/.test(q)?'Exams next week':(/weekend/.test(q)?'Exams this weekend':'Exams this week'));return askListExams(items,title);}
  if(/\b(first exam|earliest exam)\b/.test(q)&&items.length){const x=items[0];askRememberExam(x);return `Your first saved${period?' '+period:''} exam is ${askExamDetail(x)}.`;}
  if(/\b(last exam|last one|latest exam)\b/.test(q)&&items.length){const x=items[items.length-1];askRememberExam(x);return `Your last saved${period?' '+period:''} exam is ${askExamDetail(x)}.`;}
  if(course){
    if(!items.length)return `I couldn't find a${period?' '+period:''} exam date saved for ${course.name}.`;
    const future=items.filter(x=>askExamEndMs(x.exam)>Date.now());
    const wantsUpcoming=/\b(next|upcoming|coming up|left|remaining)\b/.test(q);
    if(wantsUpcoming&&!future.length){const latest=items[items.length-1];return `${course.name} doesn't have another upcoming${period?' '+period:''} exam saved. Its latest saved exam was ${askPrettyDate(latest.when)}.`;}
    const chosen=wantsUpcoming?future[0]:(future[0]||items[items.length-1]);askRememberExam(chosen);
    if(/\b(when|what time|room|where|next|upcoming)\b/.test(q)&&items.length===1)return askExamDetail(chosen);
    return askListExams(items,`${course.name} exams`);
  }
  if(/\b(next exams|upcoming exams|exams left|remaining exams|what are my next exams)\b/.test(q))return askListExams(items.filter(x=>askExamEndMs(x.exam)>Date.now()).slice(0,8),period?`Upcoming ${period} exams`:'Your upcoming exams');
  if(/\b(all|show|list|what are my exams|exam schedule)\b/.test(q))return askListExams(items,period?`${period[0].toUpperCase()+period.slice(1)} exams`:'Your saved exams');
  const n=items.find(x=>askExamEndMs(x.exam)>Date.now())||(!period?askNextUpcomingExam():null);
  if(!n)return `I couldn't find an upcoming ${period||'midterms or finals'} exam for this term.`;
  askRememberExam(n);const status=askExamState(n.exam);if(status==='in-progress')return `${n.exam.name} (${n.period}) is in progress right now until ${formatExamTime(n.exam.end||n.exam.start)}${n.exam.room?` · room ${n.exam.room}`:''}.`;
  return `Your next exam is ${n.exam.name} (${n.period}) ${askDateLabel(n.when)} at ${formatExamTime(n.exam.start)}${n.exam.room?` · room ${n.exam.room}`:''}. That's in ${askTimeUntilText(n.exam.start)}.`;
}

function askClockMinutes(raw){
  const s=String(raw||'').toLowerCase();const m=s.match(/\b(?:after|before|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);if(!m)return null;
  let h=Number(m[1]),min=Number(m[2]||0),ap=(m[3]||'').toLowerCase();if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;if(h>23||min>59)return null;
  return {mins:h*60+min,relation:s.slice(m.index,m.index+m[0].length).startsWith('before')?'before':(s.slice(m.index,m.index+m[0].length).startsWith('after')?'after':'at')};
}
function askScheduleRowsForDate(date){
  return askScheduleOccurrencesForDate(date).map(x=>{const [h,m]=String(x.schedule.start||'').split(':').map(Number),[eh,em]=String(x.schedule.end||'').split(':').map(Number);return {...x,startMins:Number.isFinite(h)?h*60+(m||0):null,endMins:Number.isFinite(eh)?eh*60+(em||0):null};});
}
function askRememberClass(row,date){
  if(!row)return;askRememberCourse(row.course);askRememberDate(date);askCramchyContext.lastClassCourseId=row.course.id;askCramchyContext.lastClassRoom=row.schedule.room||'';
  const d=new Date(date);if(Number.isFinite(row.startMins)){d.setHours(Math.floor(row.startMins/60),row.startMins%60,0,0);askCramchyContext.lastClassWhenMs=d.getTime();}
}
function askNextClassAfter(ms){
  const start=new Date(Number.isFinite(ms)?ms:Date.now());let best=null;
  for(let off=0;off<=14;off++){
    const d=new Date(start);d.setHours(0,0,0,0);d.setDate(d.getDate()+off);
    askScheduleRowsForDate(d).forEach(r=>{if(!Number.isFinite(r.startMins))return;const when=new Date(d);when.setHours(Math.floor(r.startMins/60),r.startMins%60,0,0);if(when.getTime()<=start.getTime())return;if(!best||when<best.when)best={...r,when};});
  }
  return best;
}
function askNextClass(){
  const n=askNextClassAfter(Date.now());if(!n)return `I couldn't find an upcoming class. Check that your course schedules have a day and start time.`;
  askRememberClass(n,n.when);const place=n.schedule.room?` · room ${n.schedule.room}`:'';return `Your next class is ${n.course.name}${n.course.code?` (${n.course.code})`:''} ${askDateLabel(n.when)} at ${displayTime24(n.schedule.start)}${place}.`;
}
function askScheduleSummaryByDay(){
  const counts=DAY_NAMES.map(day=>({day,count:0,rows:[]}));askCurrentCourses().forEach(c=>normalizeCourseSchedules(c).forEach(s=>{const i=DAY_NAMES.indexOf(s.day);if(i>=0&&s.start){counts[i].count++;counts[i].rows.push({course:c,schedule:s});}}));return counts;
}
function askScheduleQuery(raw,course=null){
  const q=askNormalize(raw);askCramchyContext.lastIntent='schedule';
  if(course&&/\b(when is|what days|schedule|what time|when do i have|when is my|days do i have)\b/.test(q))return askCourseSchedule(course);
  if(!course&&askCramchyContext.lastCourseId&&/^(what room|where|what professor|who teaches)\b/.test(q))course=askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId)||null;
  if(/\b(class now|current class|what class.*now|in class now)\b/.test(q)){
    const now=askNow(),mins=now.getHours()*60+now.getMinutes(),rows=askScheduleRowsForDate(now).filter(r=>r.startMins!==null&&r.endMins!==null&&mins>=r.startMins&&mins<r.endMins);
    if(!rows.length)return `You don't have a class in progress right now.`;const r=rows[0];askRememberClass(r,now);return `You're in ${r.course.name} right now until ${displayTime24(r.schedule.end)}${r.schedule.room?` · room ${r.schedule.room}`:''}.`;
  }
  if(/\b(after that|after it|what comes after|class comes after)\b/.test(q)&&askCramchyContext.lastClassWhenMs){const n=askNextClassAfter(askCramchyContext.lastClassWhenMs);if(!n)return `I couldn't find another class after that.`;askRememberClass(n,n.when);return `After that, you have ${n.course.name} ${askDateLabel(n.when)} at ${displayTime24(n.schedule.start)}${n.schedule.room?` · room ${n.schedule.room}`:''}.`;}
  if(/\b(next class|class next|what class comes next)\b/.test(q))return askNextClass();
  if(/\bbusiest day\b/.test(q)){const rows=askScheduleSummaryByDay().sort((a,b)=>b.count-a.count);if(!rows[0]?.count)return `You don't have recurring class schedules saved yet.`;const top=rows.filter(x=>x.count===rows[0].count);return `Your busiest class day${top.length>1?'s are':' is'} ${top.map(x=>`${x.day} (${x.count})`).join(' and ')}.`;}
  if(/\b(earliest class|latest class)\b/.test(q)){const all=[];askCurrentCourses().forEach(c=>normalizeCourseSchedules(c).forEach(s=>{if(s.start)all.push({course:c,schedule:s,mins:Number(s.start.slice(0,2))*60+Number(s.start.slice(3,5))});}));if(!all.length)return `You don't have class times saved yet.`;all.sort((a,b)=>a.mins-b.mins);const r=/latest/.test(q)?all[all.length-1]:all[0];return `Your ${/latest/.test(q)?'latest':'earliest'} recurring class is ${r.course.name} on ${r.schedule.day} at ${displayTime24(r.schedule.start)}.`;}
  if(/\b(overlap|overlapping|conflict|clash)\b/.test(q)){const conflicts=[];DAY_NAMES.forEach(day=>{const rows=[];askCurrentCourses().forEach(c=>normalizeCourseSchedules(c).forEach(s=>{if(s.day===day&&s.start&&s.end)rows.push({course:c,s,start:Number(s.start.slice(0,2))*60+Number(s.start.slice(3,5)),end:Number(s.end.slice(0,2))*60+Number(s.end.slice(3,5))});}));rows.sort((a,b)=>a.start-b.start);for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(rows[j].start<rows[i].end&&rows[i].start<rows[j].end)conflicts.push(`${day}: ${rows[i].course.name} and ${rows[j].course.name}`);});return conflicts.length?`I found these class overlaps:\n${[...new Set(conflicts)].map(x=>`• ${x}`).join('\n')}`:`I don't see any overlapping recurring class schedules.`;}
  if(/\b(next free day|free day)\b/.test(q)&&!askResolveDate(raw,false)){const today=askTodayStart();for(let i=1;i<=7;i++){const d=new Date(today);d.setDate(d.getDate()+i);if(!askScheduleRowsForDate(d).length){askRememberDate(d);return `Your next class-free day is ${askPrettyDate(d)}.`;}}return `You have at least one class every day in the next 7 days.`;}
  const date=askResolveDate(raw,true);
  if(date){
    askRememberDate(date);let rows=askScheduleRowsForDate(date);const clock=askClockMinutes(raw);if(clock){if(clock.relation==='after')rows=rows.filter(r=>r.startMins>clock.mins);if(clock.relation==='before')rows=rows.filter(r=>r.startMins<clock.mins);if(clock.relation==='at')rows=rows.filter(r=>r.startMins<=clock.mins&&(r.endMins===null||r.endMins>clock.mins));}
    if(/\b(free|am i free)\b/.test(q)){if(!rows.length)return `Yes — I don't see a saved class${clock?` ${clock.relation} ${String(raw).match(/(?:after|before|at)\s+[^?]+/i)?.[0]?.replace(/^(after|before|at)\s+/i,'')||''}`:''} on ${askPrettyDate(date)}.`;return `Not completely — you have ${rows.length} class${rows.length===1?'':'es'} on ${askPrettyDate(date)}:\n`+rows.map(r=>`• ${r.course.name} · ${displayTime24(r.schedule.start)}${r.schedule.end?`–${displayTime24(r.schedule.end)}`:''}`).join('\n');}
    if(/\b(how many|count)\b/.test(q))return `You have ${rows.length} class${rows.length===1?'':'es'} on ${askPrettyDate(date)}${clock?` ${clock.relation} that time`:''}.`;
    if(!rows.length)return `You don't have any classes saved for ${askPrettyDate(date)}${clock?` ${clock.relation} that time`:''}.`;
    const pick=/\bfirst class\b/.test(q)?[rows[0]]:(/\blast class\b/.test(q)?[rows[rows.length-1]]:rows);pick.forEach(x=>askRememberClass(x,date));
    return `${pick.length===1&&(/first class|last class/.test(q))?'That class':'Your classes'} on ${askPrettyDate(date)}:\n`+pick.map(x=>`• ${x.course.name} · ${displayTime24(x.schedule.start)}${x.schedule.end?`–${displayTime24(x.schedule.end)}`:''}${x.schedule.room?` · room ${x.schedule.room}`:''}`).join('\n');
  }
  if(course)return askCourseSchedule(course);
  if(/\b(free|anything after|anything before)\b/.test(q))return `Tell me a day too — like “am I free tomorrow?” or “do I have anything after 3 PM on Friday?”`;
  return askNextClass();
}

function askBestPeriodForCourse(course,raw=''){
  const explicit=askPeriodFromQuery(raw);if(explicit)return explicit;
  const q=askNormalize(raw),last=askLastExamItem();
  if(last&&askHasCourseReference(q)){const lc=askCourseForExam(last);if(!course||lc?.id===course.id)return last.period;}
  const upcoming=askExamItemsForCourse(course).find(x=>askExamEndMs(x.exam)>Date.now());if(upcoming)return upcoming.period;
  const available=['midterms','finals'].filter(p=>{const e=askSubjectEntryForCourse(course,p);return e?.subject&&((e.subject.topics||[]).length||String(e.subject.forget||'').trim()||String(e.subject.notes||'').trim());});
  if(available.length===1)return available[0];
  if(state.examPeriod&&available.includes(state.examPeriod))return state.examPeriod;
  return null;
}
function askResolveTopicTarget(course,raw){
  const q=askNormalize(raw);let period=course?askBestPeriodForCourse(course,raw):askPeriodFromQuery(raw);
  if(!course&&askCramchyContext.lastExamId&&(askHasCourseReference(q)||/\b(topics? left|coverage|what should i study|what should i review)\b/.test(q))){const item=askLastExamItem();if(item){course=askCourseForExam(item);period=period||item.period;}}
  if(!course){const n=askNextUpcomingExam(period);if(n){course=askCourseForExam(n);period=period||n.period;askRememberExam(n);}}
  if(course)askRememberCourse(course);return {course,period};
}
function askUnfinishedTopics(course,period){
  const periods=period?[period]:['midterms','finals'],rows=[];periods.forEach(p=>{const e=askSubjectEntryForCourse(course,p);if(!e?.subject)return;(e.subject.topics||[]).filter(t=>t.status!=='Done').forEach(t=>rows.push({...t,period:p,subjectName:course.name}));});return rows;
}
function askTopicsQuery(raw,course=null){
  const q=askNormalize(raw);
  if(!course&&/\b(which course|what course).*(most|many).*(unfinished|left|topics)|most unfinished topics\b/.test(q)){
    const rows=askCurrentCourses().map(c=>({c,n:['midterms','finals'].reduce((sum,p)=>sum+askUnfinishedTopics(c,p).length,0)})).sort((a,b)=>b.n-a.n);if(!rows.length||rows[0].n===0)return `You don't have unfinished review topics saved right now`;askRememberCourse(rows[0].c);return `${rows[0].c.name} has the most unfinished review topics right now: ${rows[0].n}.`;
  }
  const target=askResolveTopicTarget(course,raw);course=target.course;const periods=target.period?[target.period]:['midterms','finals'];if(!course)return `Tell me which course you mean, or add an upcoming exam so I know what you're preparing for.`;
  const entries=periods.map(p=>askSubjectEntryForCourse(course,p)).filter(x=>x?.subject);if(!entries.length)return `I couldn't find exam topics saved for ${course.name} yet.`;
  if(/\b(keep forgetting|things i keep forgetting|forget|forgetting)\b/.test(q)){const vals=entries.filter(e=>String(e.subject.forget||'').trim());if(!vals.length)return `You haven't written anything under “Things I Keep Forgetting” for ${course.name} yet.`;return vals.map(e=>`${e.period} — ${e.subject.forget.trim()}`).join('\n\n');}
  let rows=[];entries.forEach(e=>(e.subject.topics||[]).forEach(t=>rows.push({...t,period:e.period})));
  if(!rows.length)return `There aren't any review topics saved for ${course.name} yet.`;
  const mode=/\b(done|finished|completed)\b/.test(q)?'done':(/\b(left|unfinished|not started|remaining|need to review)\b/.test(q)?'unfinished':'all');
  if(mode==='done')rows=rows.filter(t=>t.status==='Done');if(mode==='unfinished')rows=rows.filter(t=>t.status!=='Done');
  if(/\b(how many|count)\b/.test(q))return `${course.name} has ${rows.length} ${mode==='all'?'saved':mode} topic${rows.length===1?'':'s'}${target.period?` for ${target.period}`:''}.`;
  if(!rows.length)return `No ${mode} topics found for ${course.name}${target.period?` (${target.period})`:''}`;
  askCramchyContext.lastTopicName=rows[0].name;
  let msg=`${mode==='unfinished'?'Topics still to review':mode==='done'?'Finished topics':'Saved topics'} for ${course.name}${target.period?` (${target.period})`:''}:\n`+rows.slice(0,12).map(t=>`• ${t.name} · ${t.status}${t.priority?` · ${t.priority} priority`:''}`).join('\n');if(rows.length>12)msg+=`\n…and ${rows.length-12} more.`;return msg;
}
function askStudyAdvice(course=null,raw=''){
  const q=askNormalize(raw),explicitCourse=!!course;let target=askResolveTopicTarget(course,raw);course=target.course;let period=target.period;
  let candidates=[],targetLabel='',forget='',examItem=null;
  if(course){candidates=askUnfinishedTopics(course,period);targetLabel=course.name;const entries=(period?[period]:['midterms','finals']).map(p=>askSubjectEntryForCourse(course,p)).filter(Boolean);forget=entries.map(e=>e.subject?.forget||'').find(x=>String(x).trim())||'';examItem=askExamItemsForCourse(course,period).find(x=>askExamEndMs(x.exam)>Date.now())||null;}
  if(!course||(!explicitCourse&&!candidates.length)){
    for(const ex of askUpcomingExamItems()){
      const c=askCourseForExam(ex);if(!c)continue;const cand=askUnfinishedTopics(c,ex.period);if(cand.length){course=c;period=ex.period;candidates=cand;targetLabel=`${c.name} (${ex.period})`;const e=askSubjectEntryForCourse(c,ex.period);forget=e?.subject?.forget||'';examItem=ex;askRememberExam(ex);break;}
    }
  }
  if(!course){return `I couldn't find an upcoming exam with saved review topics yet. Add topics in Exam Mode and I'll prioritize them.`;}
  if(!candidates.length){const e=period?askSubjectEntryForCourse(course,period):null;const allDone=e&&(e.subject?.topics||[]).length>0&&(e.subject.topics||[]).every(t=>t.status==='Done');return allDone?`You're caught up on the saved ${period} topics for ${course.name} I'd do a quick recall pass or check “Things I Keep Forgetting” instead.`:`I couldn't find unfinished review topics for ${course.name}${period?` (${period})`:''} yet.`;}
  const priorityRank={High:0,Medium:1,Low:2},statusRank={'In Progress':0,'Not Started':1,'Done':2};candidates.sort((a,b)=>(priorityRank[a.priority]??1)-(priorityRank[b.priority]??1)||(statusRank[a.status]??1)-(statusRank[b.status]??1));
  let limit=3;const min=q.match(/\b(\d{1,3})\s*(minute|minutes|min)\b/),hr=q.match(/\b(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs)\b/);if(min){const n=Number(min[1]);limit=n<=30?1:n<=60?2:3;}else if(hr){const n=Number(hr[1]);limit=n<=.5?1:n<=1?2:n<=2?3:4;}
  const top=candidates.slice(0,limit);askCramchyContext.lastStudyPlan=top.map(t=>t.name);let msg=`For ${targetLabel||course.name}, I'd study these first:`;msg+='\n'+top.map((t,i)=>`${i+1}. ${t.name}${t.priority==='High'?' · high priority':''}${t.status==='In Progress'?' · already in progress':''}`).join('\n');
  if(examItem&&askExamState(examItem.exam)==='upcoming')msg+=`\n\nYour exam starts in ${askTimeUntilText(examItem.exam.start)}.`;if(forget)msg+=`\nBefore you stop, peek at your “Things I Keep Forgetting” note too.`;if(min||hr)msg+=`\nI kept the list short for the study time you gave me.`;askCramchyContext.lastIntent='study';return msg;
}

function askWeakestCategory(course,period=null,strongest=false){
  if(!course)return `Tell me which course you mean first.`;askRememberCourse(course);const data=gradeData(course.id);period=period||((data.finals||[]).length?'finals':((data.midterms||[]).length?'midterms':null));if(!period)return `There aren't any scores in ${course.name} yet, so I can't compare categories.`;
  const scheme=courseScheme(course);let chosen=null;Object.keys(GRADE_CATEGORIES).forEach(key=>{const st=categoryStats(course.id,period,key);if(st.pct===null)return;const drag=(100-st.pct)*(scheme[key]||0)/100;const value=strongest?st.pct:drag;if(!chosen||(strongest?value>chosen.value:value>chosen.value))chosen={key,pct:st.pct,value,weight:scheme[key]||0};});
  if(!chosen)return `I don't have enough category scores yet to compare ${course.name}.`;return strongest?`Your strongest ${period} category in ${course.name} is ${GRADE_CATEGORIES[chosen.key]} at ${fmtPct(chosen.pct)}.`:`For ${course.name}, the biggest drag in your ${period} estimate is ${GRADE_CATEGORIES[chosen.key]} at ${fmtPct(chosen.pct)}. It carries ${chosen.weight}% of the term grade.`;
}
function askNextGradeThreshold(g){if(g<72)return 72;if(g<78)return 78;if(g<84)return 84;if(g<90)return 90;if(g<96)return 96;return null;}
function askGradeQuery(raw,course=null){
  const q=askNormalize(raw),explicitPeriod=askPeriodFromQuery(raw);let period=explicitPeriod;
  if(!period&&askCramchyContext.lastIntent==='grade'&&/\b(it|that grade|that course|what about|how about|dragging|strongest|weakest)\b/.test(q))period=askCramchyContext.lastPeriod;
  if(explicitPeriod)askCramchyContext.lastPeriod=explicitPeriod;askCramchyContext.lastIntent='grade';
  if(/\bgwa\b/.test(q))return askGwa();
  if(period&&course&&/\b(grade|standing|midterm|midterms|final|finals|how am i doing)\b/.test(q)){const g=termGrade(course.id,period);askRememberCourse(course);return g===null?`You don't have enough ${period} scores entered for ${course.name} yet.`:`Your current ${period} estimate in ${course.name} is ${fmtPct(g)} (${gradePoint(g)||'—'}).`;}
  if(period&&!course&&/\b(grade|grades|standing|how are|how am i doing)\b/.test(q)){const rows=askCurrentCourses().map(c=>({c,g:termGrade(c.id,period)})).filter(x=>x.g!==null);return rows.length?`${period[0].toUpperCase()+period.slice(1)} estimates:\n`+rows.map(x=>`• ${x.c.name}: ${fmtPct(x.g)} (${gradePoint(x.g)||'—'})`).join('\n'):`You don't have any ${period} grade estimates yet.`;}
  if(/\b(grade went down|grade go down|changed in my grade|did my grade improve|improved)\b/.test(q))return `Cramchy stores your current gradebook scores, but not historical grade snapshots yet, so I can't truthfully tell how your standing changed over time.`;
  if(/\b(rank|ranking|rank my)\b/.test(q)){const rows=askCurrentCourses().map(c=>({c,g:overallGrade(c.id)})).filter(x=>x.g!==null).sort((a,b)=>b.g-a.g);return rows.length?`Your current standings, highest to lowest:\n`+rows.map((x,i)=>`${i+1}. ${x.c.name} — ${fmtPct(x.g)} (${gradePoint(x.g)||'—'})`).join('\n'):`I don't have enough grade data to rank your courses yet.`;}
  if(/\b(drag|dragging|weakest|pulling|bring.*down|why.*grade|lowering)\b/.test(q))return askWeakestCategory(course||askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId),period,false);
  if(/\b(strongest category|best category|highest category)\b/.test(q))return askWeakestCategory(course||askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId),period,true);
  if(/\b(highest|best grade|doing best)\b/.test(q))return askGradeRanking('highest');if(/\b(lowest grade|worst grade|doing worst)\b/.test(q))return askGradeRanking('lowest');
  const categories=[['ww',/\b(quiz|quizzes|written work|written works)\b/],['pt',/\b(enabling activit|performance task)\b/],['attendance',/\battendance\b/],['exam',/\bmajor exam\b/]];for(const [key,re] of categories)if(re.test(q))return askCategoryGrade(course,key,period);
  if(course&&/\b(how far|need to reach|away from)\b/.test(q)){const g=overallGrade(course.id);if(g===null)return `I don't have enough scores for ${course.name} yet.`;let target=null;if(/\b4(?:\.0)?\b/.test(q))target=96;else if(/\b3\.5\b/.test(q))target=90;else{const m=q.match(/\b(7[2-9]|8\d|9\d|100)\b/);if(m)target=Number(m[1]);}if(target!==null){const gap=Math.max(0,target-g);return gap===0?`${course.name} is already at or above ${target}%.`:`${course.name} is ${gap.toFixed(2)} percentage point${gap===1?'':'s'} below ${target}% based on the scores entered.`;}}
  if(/\b(closest.*next grade|closest.*grade bracket|next grade bracket)\b/.test(q)){const rows=askCurrentCourses().map(c=>({c,g:overallGrade(c.id)})).filter(x=>x.g!==null).map(x=>({...x,t:askNextGradeThreshold(x.g)})).filter(x=>x.t!==null).map(x=>({...x,gap:x.t-x.g})).sort((a,b)=>a.gap-b.gap);if(!rows.length)return `I don't have a course below another numeric grade bracket right now.`;const x=rows[0];askRememberCourse(x.c);return `${x.c.name} is closest to its next bracket: ${x.gap.toFixed(2)} points away from ${x.t}%.`;}
  if(/\b(pass|passing|am i okay)\b/.test(q)&&course){const g=overallGrade(course.id);if(g===null)return `I don't have enough scores to judge ${course.name} yet.`;return g>=72?`Based on the scores entered, ${course.name} is currently ${fmtPct(g)} — above the R range.`:`Based on the scores entered, ${course.name} is currently ${fmtPct(g)}, which falls in the R range in your saved scale.`;}
  return course?askCourseStanding(course):askAllStandings();
}

function askTasks(raw=''){
  const q=askNormalize(raw),all=state.missions||[],undone=all.filter(m=>!m.done),done=all.filter(m=>m.done);askCramchyContext.lastIntent='tasks';
  if(/\b(due|deadline|overdue|this week|tomorrow|today)\b/.test(q)){let msg=`Quick tasks in Cramchy don't have due dates yet, so I can't truthfully filter them by deadline.`;if(undone.length)msg+=`\n\nYou do have ${undone.length} unfinished task${undone.length===1?'':'s'}:\n`+undone.slice(0,5).map((m,i)=>`${i+1}. ${m.text}`).join('\n');return msg;}
  if(/\b(done|finished|completed)\b/.test(q))return done.length?`You've completed ${done.length} quick task${done.length===1?'':'s'}:\n`+done.slice(0,8).map(m=>`• ${m.text}`).join('\n'):`No completed quick tasks are saved right now.`;
  if(/\b(how many|count)\b/.test(q))return `You have ${undone.length} unfinished quick task${undone.length===1?'':'s'}.`;
  if(/\b(what should i do first|which task first|prioritize.*task)\b/.test(q)){if(!undone.length)return `You don't have any unfinished quick tasks right now`;return `Quick Tasks don't have deadlines yet, so I can't rank urgency. If we're using list order, start with “${undone[0].text}.”`;}
  if(!undone.length)return `You don't have any unfinished quick tasks right now`;
  const shown=undone.slice(0,7);let msg=`You have ${undone.length} unfinished quick task${undone.length===1?'':'s'}:\n`+shown.map((m,i)=>`${i+1}. ${m.text}`).join('\n');if(undone.length>shown.length)msg+=`\n…and ${undone.length-shown.length} more in Tasks.`;return msg;
}
function askAcademicQuery(raw=''){
  const q=askNormalize(raw);askCramchyContext.lastIntent='academic';
  if(/\bacademic year|school year|what ay|which ay\b/.test(q))return `You're currently in Academic Year ${profileAcademicYear()}.`;
  if(/\bwhat term|which term|term am i|current term\b/.test(q))return `Your current Cramchy term is ${profileTerm()} · ${profileAcademicYear()}.`;
  if(/\b(current period|viewing period|midterms or finals|exam period)\b/.test(q))return state.examPeriod?`You're currently viewing ${state.examPeriod} in Exam Mode.`:`You're in regular Cramchy right now, not inside a midterms/finals Exam Mode period.`;
  if(/\barchive|archived\b/.test(q)){const rows=state.archivedTerms||[];return rows.length?`Archived terms:\n${rows.map(x=>`• ${x}`).join('\n')}`:`You don't have archived terms yet.`;}
  return `${profileAcademicYear()} · ${profileTerm()}.`;
}
function askCourseInfoQuery(raw,course=null){
  const q=askNormalize(raw);askCramchyContext.lastIntent='course';
  if(/\b(what courses|my courses|courses am i taking|list courses|how many courses)\b/.test(q)&&!course){const cs=askCurrentCourses();if(/how many/.test(q))return `You're taking ${cs.length} course${cs.length===1?'':'s'} in ${profileTerm()}.`;return cs.length?`Your ${profileTerm()} courses:\n`+cs.map(c=>`• ${c.name}${c.code?` (${c.code})`:''} · ${c.units||0} unit${Number(c.units)===1?'':'s'}`).join('\n'):`You haven't added courses for ${profileTerm()} yet.`;}
  if(/\b(most units|highest units)\b/.test(q)&&!course){const cs=askCurrentCourses().slice().sort((a,b)=>(Number(b.units)||0)-(Number(a.units)||0));if(!cs.length)return `You haven't added courses yet.`;return `${cs[0].name} has the most units at ${cs[0].units||0}.`;}
  if(!course&&askCramchyContext.lastCourseId&&/^(who|what|where|when)\b/.test(q))course=askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId)||null;
  if(!course)return `Tell me which course you mean.`;askRememberCourse(course);
  if(/\b(professor|prof|teacher|instructor|who teaches|who is teaching)\b/.test(q))return course.professor?`${course.name} is taught by ${course.professor}.`:`You haven't saved a professor for ${course.name} yet.`;
  if(/\b(units|unit)\b/.test(q))return `${course.name} is ${course.units||0} unit${Number(course.units)===1?'':'s'}.`;
  if(/\b(section)\b/.test(q))return course.section?`${course.name} is under section ${course.section}.`:`You haven't saved a section for ${course.name} yet.`;
  if(/\b(code|course code)\b/.test(q))return course.code?`${course.name} course code: ${course.code}.`:`You haven't saved a course code for ${course.name} yet.`;
  if(/\b(grading|weights|breakdown|percentage|percent)\b/.test(q)){const s=courseScheme(course);return `${course.name} grading scheme:\n• Written Works & Quizzes: ${s.ww}%\n• Enabling Activities: ${s.pt}%\n• Attendance: ${s.attendance}%\n• Major Exam: ${s.exam}%`;}
  if(/\b(room|where)\b/.test(q)){const sch=normalizeCourseSchedules(course).filter(s=>s.room);if(sch.length)return `${course.name} room${sch.length===1?'':'s'}: `+sch.map(s=>`${s.day||'class'} — ${s.room}`).join(' · ');return course.room?`${course.name} room: ${course.room}.`:`You haven't saved a room for ${course.name} yet.`;}
  if(/\b(schedule|when|what days|time)\b/.test(q))return askCourseSchedule(course);
  return `${course.name}${course.code?` (${course.code})`:''} · ${course.units||0} unit${Number(course.units)===1?'':'s'}${course.professor?` · ${course.professor}`:''}.`;
}
function askStudyHistory(raw='',course=null){
  const q=askNormalize(raw);let rows=(state.studyHistory||[]).filter(h=>!h.academicKey||h.academicKey===academicKey(profileAcademicYear(),profileTerm()));
  if(course){rows=rows.filter(h=>{const n=askNormalize(studyHistorySubjectName(h));return n===askNormalize(course.name)||String(h.subject||'')===`course-${course.id}`||String(h.subject||'')===course.id;});}
  if(!rows.length)return course?`You don't have any study sessions logged for ${course.name} this term.`:`You don't have any study sessions logged for this term yet.`;
  const today=askTodayStart(),weekStart=new Date(today);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
  if(/\b(last|when did i last)\b/.test(q)){const h=rows.slice().sort((a,b)=>b.timestamp-a.timestamp)[0];return `You last studied ${studyHistorySubjectName(h)} on ${new Date(h.timestamp).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} for ${h.minutes} minute${h.minutes===1?'':'s'}.`;}
  if(/\b(most|least)\b/.test(q)&&/\b(studied|study|course|subject)\b/.test(q)){const m=new Map();rows.forEach(h=>{const name=studyHistorySubjectName(h);m.set(name,(m.get(name)||0)+h.minutes);});const arr=[...m.entries()].sort((a,b)=>b[1]-a[1]);const x=/least/.test(q)?arr[arr.length-1]:arr[0];return `You've studied ${x[0]} the ${/least/.test(q)?'least':'most'} this term: ${x[1]} focused minutes.`;}
  if(/\bstreak\b/.test(q)){const days=new Set(rows.map(h=>askDateKey(new Date(h.timestamp))));let d=new Date(today),count=0;if(!days.has(askDateKey(d))){d.setDate(d.getDate()-1);}while(days.has(askDateKey(d))){count++;d.setDate(d.getDate()-1);}return `Your current study streak is ${count} day${count===1?'':'s'} based on logged sessions.`;}
  if(/\bthis week|week\b/.test(q)){const total=rows.filter(h=>new Date(h.timestamp)>=weekStart).reduce((s,h)=>s+h.minutes,0);return `You've logged ${total} focused minute${total===1?'':'s'} this week${course?` for ${course.name}`:''}.`;}
  if(/\btoday\b/.test(q)){const total=rows.filter(h=>new Date(h.timestamp)>=today).reduce((s,h)=>s+h.minutes,0);return `You've logged ${total} focused minute${total===1?'':'s'} today${course?` for ${course.name}`:''}.`;}
  const total=rows.reduce((s,h)=>s+h.minutes,0);return `You've logged ${total} focused minute${total===1?'':'s'} this term${course?` for ${course.name}`:''}.`;
}
function askFriendly(raw){
  const q=askNormalize(raw),name=cramchyName();if(/^(hi|hello|hey|beh|hii|hiii)\b/.test(q)&&q.split(' ').length<=4)return `hiii ${name} what are we checking today?`;
  if(/\b(thank you|thanks|ty|salamat)\b/.test(q))return `always, beh now go collect those academic receipts.`;
  if(/\b(i m cooked|im cooked|am i cooked|cooked)\b/.test(q)){const n=askNextUpcomingExam(),tasks=(state.missions||[]).filter(m=>!m.done).length;if(n){const when=askExamState(n.exam)==='in-progress'?'right now':`in ${askTimeUntilText(n.exam.start)}`;return `not cooked. maybe lightly toasted 😭 you have ${tasks} unfinished task${tasks===1?'':'s'} and your next exam is ${when}.`; }return `not cooked 😭 I just need more saved deadlines/exams before I can diagnose the academic situation.`;}
  if(/\b(do i have a lot to do|how bad is it)\b/.test(q)){const tasks=(state.missions||[]).filter(m=>!m.done).length,n=askNextUpcomingExam();return n?`You have ${tasks} unfinished quick task${tasks===1?'':'s'}, and ${n.exam.name} starts in ${askTimeUntilText(n.exam.start)}.`:`You have ${tasks} unfinished quick task${tasks===1?'':'s'} and no upcoming exam date saved for this term.`;}
  if(/\b(tired|dont want to study|don t want to study|lazy|motivate|motivation|hype me|can i rest)\b/.test(q))return `tiny plan: pick one unfinished topic, do one focused block, then reassess. you do not need to conquer the whole semester in one sitting`;
  if(/\b(i finished|i m done|im done|i passed|passed)\b/.test(q))return `OH?? academic weapon behavior detected ✦ proud of that progress, beh.`;
  if(/\b(bye|good night|goodnight)\b/.test(q))return `bye beh Cramchy will keep the receipts.`;return null;
}
function askIntent(raw){
  const q=askNormalize(raw);
  if(/\b(what can i ask|what can i ask you|what can you do|what do you do|what do you know|commands|options|your features|how can you help|show me what you can do)\b/.test(q))return 'help';
  if(/\b(study tips?|tips for studying|study advice|how should i study|how do i study|how can i study better|best way to study|study better|help me study)\b/.test(q))return 'studytips';
  if(/\b(should i (begin|start|study|review)|should i be studying|do i need to study|is (it )?(a )?good time to study|study now or|should i study now|should i review now|can i study later)\b/.test(q))return 'studycheck';
  if(/\b(where|how do i|how can i|take me|open|go to)\b/.test(q)&&!/\b(where is|where s|what room|where is it)\b/.test(q))return 'navigation';
  if(/\b(academic year|school year|what term|which term|term am i|current term|exam period|viewing period|archived terms?)\b/.test(q))return 'academic';
  if(/\b(study streak|focused minutes|how much.*stud|studied today|study history|study time|last studied|studied most|studied least)\b/.test(q))return 'studyhistory';
  if(/\b(topic|topics|coverage|covered|keep forgetting|things i keep forgetting|unfinished topics|finished topics)\b/.test(q))return 'topics';
  if(/\b(what should i study|what should i review|study tonight|review tonight|study first|review first|focus on|prioritize|prepare for|aaral|aralin|revise|choose for me)\b/.test(q))return 'study';
  if(/\b(task|tasks|to do|todo|deadline|deadlines|due|overdue|submission)\b/.test(q))return 'tasks';
  if(/\b(gwa|grade|grades|standing|scores|score|dragging|weakest|passing|doing best|doing worst|grade bracket)\b/.test(q))return 'grade';
  if(/\b(exam|exams|midterm|midterms|final|finals)\b/.test(q))return 'exam';
  if(/\b(next class|class today|class tomorrow|classes|class now|current class|schedule|am i free|free tomorrow|busiest day|earliest class|latest class|overlap|class-free|free day|anything after|anything before)\b/.test(q))return 'schedule';
  if(/\b(professor|prof|teacher|instructor|units|section|course code|grading scheme|what courses|my courses|courses am i taking|what room|room is|where is|who teaches)\b/.test(q))return 'course';
  if(/\b(that day|same day|that date|what else|anything else|what about|how about|for it|for that|after that)\b/.test(q)&&askCramchyContext.lastIntent)return askCramchyContext.lastIntent;
  return 'friendly';
}
function askHandleIntent(raw){
  const q=askNormalize(raw),resolution=askCourseResolution(raw),explicitCourse=resolution.course;
  if(resolution.ambiguous.length)return `Which course do you mean — ${resolution.ambiguous.map(c=>c.name).join(' or ')}?`;
  let intent=askIntent(raw);
  if(intent==='friendly'&&explicitCourse)intent=/\b(when|where|who|professor|units|section|code|schedule|room|time)\b/.test(q)?'course':(askCramchyContext.lastIntent||'course');
  if(intent==='friendly'&&/\b(what about|how about)\b/.test(q)&&askCramchyContext.lastIntent)intent=askCramchyContext.lastIntent;
  if(!explicitCourse&&askCramchyContext.lastExamChoices?.length>1&&/\b(it|that exam|for it|for that|which one)\b/.test(q)&&['study','topics','exam','course'].includes(intent)){
    const names=[...new Set(askCramchyContext.lastExamChoices.map(x=>x.name))];return `Which exam do you mean — ${names.slice(0,4).join(' or ')}?`;
  }
  let course=explicitCourse;
  if(!course&&['grade','course','schedule'].includes(intent)&&askHasCourseReference(q))course=askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId)||null;
  if(!course&&['grade','course'].includes(intent)&&askCramchyContext.lastCourseId&&/^(what|who|where|when|why|how)\b/.test(q)&&askCramchyContext.lastIntent===intent)course=askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId)||null;
  if(!course&&['study','topics'].includes(intent)&&(askHasCourseReference(q)||askCramchyContext.lastIntent==='exam'||askCramchyContext.lastIntent==='study'||askCramchyContext.lastIntent==='topics'))course=askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId)||null;
  if(course)askRememberCourse(course);
  const previousIntent=askCramchyContext.lastIntent;
  if(!explicitCourse&&previousIntent==='exam'&&askCramchyContext.lastExamId&&(intent==='course'||intent==='friendly')&&/\b(room|what time|when|where|date)\b/.test(q)){const reply=askExamQuery(raw,null);askCramchyContext.lastIntent='exam';return reply;}
  if(intent==='friendly'&&previousIntent==='exam'&&/\b(time|room|when|where|date)\b/.test(q))intent='exam';
  if(intent==='friendly'&&previousIntent==='schedule'&&/\b(after that|what time|what room|where|when)\b/.test(q))intent='schedule';
  let reply=null;
  if(intent==='help')reply=askHelp();
  else if(intent==='studytips')reply=askStudyTips(raw,course);
  else if(intent==='studycheck')reply=askShouldStudyNow(raw);
  else if(intent==='exam')reply=askExamQuery(raw,course);
  else if(intent==='schedule')reply=askScheduleQuery(raw,course);
  else if(intent==='topics')reply=askTopicsQuery(raw,course);
  else if(intent==='study')reply=askStudyAdvice(course,raw);
  else if(intent==='tasks')reply=askTasks(raw);
  else if(intent==='grade')reply=askGradeQuery(raw,course);
  else if(intent==='course')reply=askCourseInfoQuery(raw,course);
  else if(intent==='studyhistory')reply=askStudyHistory(raw,course);
  else if(intent==='academic')reply=askAcademicQuery(raw);
  else if(intent==='navigation')reply=askNavigation(raw);
  else reply=askFriendly(raw);
  askCramchyContext.lastIntent=intent==='friendly'?(previousIntent||'friendly'):intent;
  return reply;
}
function askHelp(){return `ask me almost anything about what's saved in Cramchy ✦\n\n• classes — “what's my next class?”, “am I free tomorrow?”, “what comes after that?”\n• exams — “what are my next exams?”, “what else is on that day?”, “what room?”\n• studying — “what should I study?”, “should I start studying now?”, “give me study tips”\n• topics — “what's left for anaphy?”, “what do I keep forgetting?”\n• grades — “how am I doing in cogpsy?”, “what's dragging it down?”, “what's my GWA?”\n• tasks — “what tasks are left?”, “how many have I finished?”\n• courses — professors, rooms, units, codes, schedules, grading schemes\n• study history — focused minutes, streak, last studied, most/least studied\n\nYou can use cogpsy, edtech, fm, anaphy, and printea too and I understand follow-ups like “that day,” “for it,” and “after that.”`;}
function openAskCramchy(){
  if(document.getElementById('askCramchyPanel')){closeAskCramchy();return;}
  askResetContext();
  const panel=document.createElement('section');panel.id='askCramchyPanel';panel.className='ask-cramchy-panel';panel.setAttribute('aria-label','Ask Cramchy');
  panel.innerHTML=`<div class="ask-cramchy-head"><div class="ask-cramchy-avatar"><img src="${ASK_CRAMCHY_ICON}" alt="Ask Cramchy icon"></div><div class="ask-cramchy-title"><strong>ask cramchy</strong><span>your academic bestie with receipts ✦</span></div><button class="ask-cramchy-close" id="askCramchyClose" aria-label="Close">×</button></div><div class="ask-cramchy-messages" id="askCramchyMessages"></div><div class="ask-cramchy-compose"><textarea class="ask-cramchy-input" id="askCramchyInput" rows="1" maxlength="280" placeholder="ask me something..."></textarea><button class="ask-cramchy-send" id="askCramchySend" aria-label="Send">↑</button></div>`;
  document.body.appendChild(panel);document.getElementById('askCramchyLauncher')?.setAttribute('aria-expanded','true');document.getElementById('askCramchyClose')?.addEventListener('click',closeAskCramchy);
  askAddMessage('bot',`hiii ${cramchyName()} ask me about your classes, exams, grades, tasks, or what to study.`);askAddChips([{label:'what should I study?',query:'what should I study?'},{label:"what's my next class?",query:"what's my next class?"},{label:'how are my grades?',query:'how are my grades?'},{label:"when's my next exam?",query:"when's my next exam?"}]);
  const input=document.getElementById('askCramchyInput'),send=document.getElementById('askCramchySend');send?.addEventListener('click',()=>askSubmit());input?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();askSubmit();}});input?.addEventListener('input',()=>{input.style.height='42px';input.style.height=Math.min(input.scrollHeight,96)+'px';});window.setTimeout(()=>input?.focus(),80);
}
/* ===================== END ASK CRAMCHY LOGIC V1.2 ===================== */


/* ===================== END ASK CRAMCHY ===================== */

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
  window.dispatchEvent(new Event('cramchy:schedules-changed'));
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
  initAskCramchy();
showBootUpdateNotice();


/* Explicit access to gradebook state kept inside the app closure. */
window.CramchyGradebookBridge={
  get state(){return state;},
  escapeHtml,
  escapeAttr,
  profileAcademicYear,
  profileTerm,
  courseScheme,
  gradeData,
  saveState,
  openCourseModal,
  cryptoId,
  showToast,
  calculateTarget,
  deleteAssessment,
  GRADE_CATEGORIES,
  TERM_OPTIONS,
  COURSE_COLORS,
  get setGradesMode(){return setGradesMode;}, set setGradesMode(value){setGradesMode=value;},
  get switchTab(){return switchTab;}, set switchTab(value){switchTab=value;},
  get renderGradebook(){return renderGradebook;}, set renderGradebook(value){renderGradebook=value;},
  get openAssessmentModal(){return openAssessmentModal;}, set openAssessmentModal(value){openAssessmentModal=value;},
  get gradesMode(){return gradesMode;}, set gradesMode(value){gradesMode=value;},
  get selectedGradeCourseId(){return selectedGradeCourseId;}, set selectedGradeCourseId(value){selectedGradeCourseId=value;},
  get selectedGradePeriod(){return selectedGradePeriod;}, set selectedGradePeriod(value){selectedGradePeriod=value;}
};
})();
