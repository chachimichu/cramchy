
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

const STORAGE_KEY = 'strawberryMatchaMidtermsState_v1';
const APP_VERSION = '2026.09.08-stability.1';
const APP_VERSION_KEY = 'cramchyLastAppVersion';
const STATE_SCHEMA_VERSION = 2;
let pendingBootToast = '';
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
    academicMigrationVersion: 1,
    stateSchemaVersion: STATE_SCHEMA_VERSION,
    lastAppVersion: APP_VERSION
  };
}

let state = loadState();
const countdownFeature = window.CramchyModules?.countdown?.init({
  getState: () => state,
  saveState,
  showToast
});
if(!countdownFeature) throw new Error('Countdown module failed to initialize.');
const motivationFeature = window.CramchyModules?.motivation?.init({
  getState: () => state,
  saveState
});
if(!motivationFeature) throw new Error('Motivation module failed to initialize.');
const streakFeature = window.CramchyModules?.streak?.init({ getState: () => state });
if(!streakFeature) throw new Error('Streak module failed to initialize.');
const collectiblesFeature = window.CramchyModules?.collectibles?.init({
  getCompletedCount: () => overallStats().done
});
if(!collectiblesFeature) throw new Error('Collectibles module failed to initialize.');
const brainBreakFeature = window.CramchyModules?.brainBreak?.init({ showToast });
if(!brainBreakFeature) throw new Error('Brain break module failed to initialize.');
const chaowiFeature = window.CramchyModules?.chaowi?.init({
  getState: () => state,
  saveState,
  showToast,
  personalizeMessage: message => personalizeMascotText(message)
});
if(!chaowiFeature) throw new Error('Chaowi module failed to initialize.');
const petDuoFeature = window.CramchyModules?.petDuo?.init({ getState: () => state, saveState, showToast });
if(!petDuoFeature) throw new Error('Pet duo module failed to initialize.');
const studyTimerFeature = window.CramchyModules?.studyTimer?.init({
  getState: () => state,
  saveState,
  showToast,
  getChoices: () => {
    if(state.examPeriod) return examSubjectCatalog();
    return coursesForCurrentTerm().map(course => ({id:`course-${course.id}`,name:course.name}));
  },
  getHistoryContext: () => ({
    academicKey: state.examPeriod ? activeAcademicKey() : dailyAcademicKey(),
    period: state.examPeriod || ''
  }),
  getHistoryName: studyHistorySubjectName,
  renderMatchaProgress,
  renderDailyHome,
  reactChaowi: kind => chaowiFeature.react(kind),
  escapeHtml
});
if(!studyTimerFeature) throw new Error('Study timer module failed to initialize.');
const tasksFeature = window.CramchyModules?.tasks?.init({
  getState: () => state,
  saveState,
  showToast,
  createId: cryptoId,
  escapeHtml,
  reactChaowi: kind => chaowiFeature.react(kind)
});
if(!tasksFeature) throw new Error('Tasks module failed to initialize.');
const coursesFeature = window.CramchyModules?.courses?.init({
  getState: () => state,
  getAcademicContext: () => ({year:profileAcademicYear(),term:profileTerm()}),
  saveState,
  showToast,
  createId: cryptoId,
  escapeHtml,
  confirmAction: message => confirm(message),
  openModal: (id,focusSchedules) => openCourseModal(id,focusSchedules),
  onOpenCourses: () => switchTab('subjects'),
  onChanged: () => { renderDynamicCourses(); renderDailyHome(); renderGradebook(); renderGwaCalculator(); },
  onRemoved: id => { if(selectedGradeCourseId===id)selectedGradeCourseId=null; }
});
if(!coursesFeature) throw new Error('Courses module failed to initialize.');

function renderMatchaProgress(){
  streakFeature.render();
  collectiblesFeature.render();
}

function loadState(){
  try{
    syncAppVersionFlag();
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return freshState();
    const parsed = JSON.parse(raw);
    const cleaned = sanitizeState(parsed);
    const changed = applyStateMigrations(cleaned, parsed);
    if(changed){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  }catch(e){
    console.warn('Failed to load state, repairing with a fresh safe shape.', e);
    pendingBootToast = 'Cramchy repaired a loading problem. Your app is safe to use again ✦';
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
  if(tab === 'countdown') countdownFeature.render();
  if(tab === 'matcha') renderMatchaProgress();
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
  motivationFeature.render();
}

function renderMissions(){
  tasksFeature.renderDashboard();
}

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

/* ===================== STUDY TIMER + COMPANIONS ===================== */
function renderTimerTab(){ studyTimerFeature.render(); }
function renderHistory(){ studyTimerFeature.renderHistory(); }
function chaowiReact(kind){ chaowiFeature.react(kind || "click"); }
function studyHistorySubjectName(item){
  if(item.subject==='general') return 'General Study';
  const courseId=String(item.subject||'').startsWith('course-')?String(item.subject).slice(7):'';
  if(courseId){
    const course=(state.courses||[]).find(candidate=>candidate.id===courseId);
    if(course) return course.name;
  }
  const [year,term]=(item.academicKey||activeAcademicKey()).split('::');
  return examSubjectNameById(item.subject,year||activeExamYear(),term||activeExamTerm());
}


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
      applyStateMigrations(state, parsed);
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
      applyStateMigrations(state, data.state);
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
  tasksFeature.renderTaskPage();
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
  document.getElementById('saveProfileBtn')?.addEventListener('click',()=>{
    state.profile.name=(document.getElementById('profileName')?.value||'').trim().slice(0,40);
    state.profile.academicYear=(document.getElementById('profileYear')?.value||'2026–2027').trim().slice(0,30);
    state.profile.term=document.getElementById('profileTerm')?.value||'Term 1';
    state.profile.motivation=document.getElementById('profileMotivation')?.value||'mixed';state.profile.onboarded=true;
    saveState();applyCramchyPersonalization();showToast('profile saved ♡');
  });
  document.querySelectorAll('[data-open-tab]').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.openTab)));
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
    saveState(); renderDynamicCourses(); renderDailyHome(); renderGradebook(); scrim.remove(); showToast(existing?'course updated ♡':'course added ♡');
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
  tasksFeature.renderHome();
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
  return coursesFeature.normalizeSchedules(course);
}
function displayTime24(t){
  return coursesFeature.displayTime(t);
}
function scheduleText(s){
  return coursesFeature.scheduleText(s);
}
function nextClassOccurrence(){
  return coursesFeature.nextClass();
}
function nextCourseLabel(){
  return coursesFeature.nextLabel();
}

function renderDynamicCourses(){
  coursesFeature.renderCatalog();
}
function removeCourse(courseId){
  return coursesFeature.remove(courseId);
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
    coursesFeature.upsert(course);scrim.remove();
  });
}

function renderDailyCourses(){
  coursesFeature.renderHome();
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
function gradePoint(p){if(p===null||!Number.isFinite(p))return null;const rounded=Math.round(p);if(rounded>=96)return '4.0';if(rounded>=90)return '3.5';if(rounded>=84)return '3.0';if(rounded>=78)return '2.5';if(rounded>=72)return '2.0';return 'R';}
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
  return coursesFeature.forTerm(year,term);
}
function coursesForCurrentTerm(){return coursesFeature.current();}

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
  motivationFeature.render();
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

function renderDailyCountdown(){
  const box=document.getElementById('dailyCountdownBox');if(!box)return;
  const savedPeriod=state.examPeriod;
  state.examPeriod=null;
  const ex=getClosestExam();
  state.examPeriod=savedPeriod;
  if(!ex){box.innerHTML='<p class="small-note">no upcoming exam for this term ♡</p>';return;}
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
  if(!ex.length){wrap.innerHTML='<div class="small-note">no upcoming exams right now ♡</div>';return;}
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



/* ===================== ASK CRAMCHY (LOCAL V1.1) ===================== */
const ASK_CRAMCHY_ICON='assets/ask-cramchy.png';
let askCramchyContext={
  lastCourseId:null,
  lastIntent:null,
  lastDateKey:null,
  lastPeriod:null,
  lastExamId:null,
  lastExamPeriod:null,
  lastTopicName:null,
  lastExamChoices:[]
};

function askNormalize(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function askCurrentCourses(){return coursesForCurrentTerm();}
function askTodayStart(){const d=new Date();d.setHours(0,0,0,0);return d;}
function askDateKey(d){const x=new Date(d);if(Number.isNaN(x.getTime()))return '';return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;}
function askSameDay(a,b){return askDateKey(a)===askDateKey(b);}
function askPrettyDate(d){const x=new Date(d);return x.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});}
function askDateLabel(d){
  const x=new Date(d),now=new Date();if(Number.isNaN(x.getTime()))return '';
  const a=new Date(now.getFullYear(),now.getMonth(),now.getDate()),b=new Date(x.getFullYear(),x.getMonth(),x.getDate());
  const diff=Math.round((b-a)/86400000);if(diff===0)return 'today';if(diff===1)return 'tomorrow';if(diff===-1)return 'yesterday';
  return askPrettyDate(x);
}
function askRememberDate(d){const key=askDateKey(d);if(key)askCramchyContext.lastDateKey=key;}
function askDateFromKey(key){if(!key)return null;const d=new Date(`${key}T12:00:00`);return Number.isNaN(d.getTime())?null:d;}
function askPeriodFromQuery(raw){
  const q=askNormalize(raw);
  if(/\b(final|finals)\b/.test(q))return 'finals';
  if(/\b(midterm|midterms)\b/.test(q))return 'midterms';
  if(/\b(that period|this period|it)\b/.test(q)&&askCramchyContext.lastPeriod)return askCramchyContext.lastPeriod;
  return null;
}
function askResolveDate(raw,allowContext=true){
  const s=String(raw||'').toLowerCase(),q=askNormalize(raw),today=askTodayStart();
  if(allowContext&&/\b(that day|same day|that date|on it)\b/.test(q)&&askCramchyContext.lastDateKey)return askDateFromKey(askCramchyContext.lastDateKey);
  if(/\btoday\b/.test(q))return today;
  if(/\btomorrow\b/.test(q)){const d=new Date(today);d.setDate(d.getDate()+1);return d;}
  if(/\byesterday\b/.test(q)){const d=new Date(today);d.setDate(d.getDate()-1);return d;}
  const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayIdx=days.findIndex(x=>new RegExp(`\\b${x}\\b`).test(q));
  if(dayIdx>=0){
    const d=new Date(today);let delta=(dayIdx-today.getDay()+7)%7;
    if(/\bnext\b/.test(q)&&delta===0)delta=7;
    d.setDate(d.getDate()+delta);return d;
  }
  const months={january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11,jan:0,feb:1,mar:2,apr:3,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11};
  const mm=s.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i);
  if(mm){const yr=mm[3]?Number(mm[3]):today.getFullYear();const d=new Date(yr,months[mm[1].toLowerCase()],Number(mm[2]));if(!Number.isNaN(d.getTime()))return d;}
  const num=s.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if(num){let yr=num[3]?Number(num[3]):today.getFullYear();if(yr<100)yr+=2000;const d=new Date(yr,Number(num[1])-1,Number(num[2]));if(!Number.isNaN(d.getTime()))return d;}
  return null;
}
function askDateRange(raw){
  const q=askNormalize(raw),today=askTodayStart();
  if(/\bthis week\b/.test(q)){const end=new Date(today);const delta=((8-end.getDay())%7)||7;end.setDate(end.getDate()+delta);return {start:today,end};}
  if(/\bnext week\b/.test(q)){const start=new Date(today);start.setDate(start.getDate()+((8-start.getDay())%7||7));const end=new Date(start);end.setDate(end.getDate()+7);return {start,end};}
  if(/\b(this )?weekend\b/.test(q)){const start=new Date(today);let delta=(6-start.getDay()+7)%7;start.setDate(start.getDate()+delta);const end=new Date(start);end.setDate(end.getDate()+2);return {start,end};}
  return null;
}
function askFindCourse(query){
  const q=askNormalize(query),courses=askCurrentCourses();if(!q)return null;
  let best=null,bestScore=0;
  courses.forEach(c=>{
    const name=askNormalize(c.name),code=askNormalize(c.code),qTokens=q.split(' '),tokens=[...new Set((name+' '+code).split(' ').filter(x=>x.length>1))];let score=0;
    if(name&&q.includes(name))score+=20;if(code&&q.includes(code))score+=20;
    tokens.forEach(t=>{if(qTokens.includes(t))score+=t.length>=6?4:(t.length>=4?3:1);});
    // Common shortened academic wording: "cog psych" etc.
    const initials=name.split(' ').filter(x=>x.length>2).map(x=>x[0]).join('');if(initials.length>=2&&qTokens.includes(initials))score+=8;
    if(score>bestScore){bestScore=score;best=c;}
  });
  return bestScore>=3?best:null;
}
function askCourseForExam(item){
  if(!item)return null;const catalog=examSubjectCatalog(profileAcademicYear(),profileTerm());
  const sid=item.exam?.subjectId||item.exam?.id;const cat=catalog.find(x=>String(x.id)===String(sid)||normalizeAcademicName(x.name)===normalizeAcademicName(item.exam?.name));
  if(cat?.courseId){const c=askCurrentCourses().find(x=>x.id===cat.courseId);if(c)return c;}
  return askFindCourse(item.exam?.name||'');
}
function askCourseFromContext(query){
  const explicit=askFindCourse(query);if(explicit)return explicit;
  const q=askNormalize(query);
  // Only reuse a previous course when the user's wording actually points back to it.
  // Do NOT silently inherit the currently selected gradebook course for generic questions
  // such as “what are my next exams?” — that made past CogPsy look like the next exam.
  if(/\b(this|that|it|its|subject|subj|course|class|exam)\b/.test(q)&&askCramchyContext.lastCourseId){return askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId)||null;}
  if(askCramchyContext.lastCourseId&&/\b(why|what about|how about|what else|which one|for it|for that|dragging|left|finished|unfinished)\b/.test(q))return askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId)||null;
  if(askCurrentCourses().length===1)return askCurrentCourses()[0];
  return null;
}
function askRememberCourse(course){if(course)askCramchyContext.lastCourseId=course.id;}

function askAllExamItems(){
  const record=dailyTermRecord(),items=[];
  ['midterms','finals'].forEach(period=>(record[period]?.exams||[]).forEach(exam=>{const when=new Date(exam.start);if(!Number.isNaN(when.getTime()))items.push({exam,period,when});}));
  return items.sort((a,b)=>a.when-b.when);
}
function askNextUpcomingExam(){
  const now=Date.now();return askAllExamItems().find(x=>{const end=new Date(x.exam.end||x.exam.start).getTime();return Number.isFinite(end)&&end>now;})||null;
}
function askRememberExam(item){
  if(!item)return;askCramchyContext.lastExamChoices=[];askCramchyContext.lastIntent='exam';askCramchyContext.lastExamId=item.exam.id;askCramchyContext.lastExamPeriod=item.period;askCramchyContext.lastPeriod=item.period;askRememberDate(item.when);
  const c=askCourseForExam(item);if(c)askRememberCourse(c);
}
function askExamSubject(period,exam){
  const record=dailyTermRecord()[period],id=exam?.subjectId||exam?.id;return {id,subject:record?.subjects?.[id]||freshSubject(),name:exam?.name||record?.subjectNames?.[id]||examSubjectNameById(id,profileAcademicYear(),profileTerm())};
}
function askExamLine(item){const room=item.exam.room?` · room ${item.exam.room}`:'';return `${item.exam.name} (${item.period}) · ${askPrettyDate(item.when)} · ${formatExamTime(item.exam.start)}${room}`;}
function askListExams(items,title='Your exams'){
  if(!items.length)return `${title}: none saved yet.`;
  if(items.length===1)askRememberExam(items[0]);
  else{
    askCramchyContext.lastExamChoices=items.slice(0,12).map(x=>({id:x.exam.id,period:x.period,name:x.exam.name}));
    askCramchyContext.lastIntent='exam';
    const firstKey=askDateKey(items[0].when);if(items.every(x=>askDateKey(x.when)===firstKey))askRememberDate(items[0].when);
  }
  let msg=`${title}:\n`+items.slice(0,12).map(x=>`• ${askExamLine(x)}`).join('\n');if(items.length>12)msg+=`\n…and ${items.length-12} more.`;return msg;
}
function askExamsOnDate(date,period=null){return askAllExamItems().filter(x=>(!period||x.period===period)&&askSameDay(x.when,date));}
function askMissingExamDates(period=null){
  const exams=askAllExamItems().filter(x=>!period||x.period===period),courses=askCurrentCourses();
  const missing=courses.filter(c=>!exams.some(x=>{const ec=askCourseForExam(x);return ec?.id===c.id||normalizeAcademicName(x.exam.name)===normalizeAcademicName(c.name);}));
  if(!missing.length)return `Every course has an exam date saved${period?` for ${period}`:''} ♡`;
  return `These courses don't have an exam date saved${period?` for ${period}`:''}:\n`+missing.map(c=>`• ${c.name}`).join('\n');
}
function askExamQuery(raw,course=null){
  const q=askNormalize(raw),period=askPeriodFromQuery(raw);if(period)askCramchyContext.lastPeriod=period;
  const explicitDate=askResolveDate(raw,true),range=askDateRange(raw);let items=askAllExamItems().filter(x=>!period||x.period===period);
  if(/\b(no exam|missing exam|without exam|no date|not have.*exam|still has no exam)\b/.test(q))return askMissingExamDates(period);
  const explicitCourse=askFindCourse(raw),dateWide=!!explicitDate&&!explicitCourse&&/\b(all|what else|anything else|exams on|that day|same day|that date)\b/.test(q);
  if(course&&!dateWide){askRememberCourse(course);items=items.filter(x=>{const c=askCourseForExam(x);return c?.id===course.id||normalizeAcademicName(x.exam.name)===normalizeAcademicName(course.name);});}
  if(explicitDate&&(/\b(that day|same day|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|on|date)\b/.test(q)||!course||dateWide)){askRememberDate(explicitDate);items=items.filter(x=>askSameDay(x.when,explicitDate));return askListExams(items,`Exams on ${askPrettyDate(explicitDate)}`);}
  if(range){items=items.filter(x=>x.when>=range.start&&x.when<range.end);return askListExams(items,/next week/.test(q)?'Exams next week':(/weekend/.test(q)?'Exams this weekend':'Exams this week'));}
  if(/\b(same day|two exams|multiple exams|busiest exam day)\b/.test(q)){
    const groups=new Map();items.forEach(x=>{const k=askDateKey(x.when);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);});const clashes=[...groups.entries()].filter(([,v])=>v.length>1);
    if(!clashes.length)return `You don't have multiple exams saved on the same day.`;
    return clashes.map(([k,v])=>`${askPrettyDate(askDateFromKey(k))}:\n${v.map(x=>`• ${x.exam.name} · ${formatExamTime(x.exam.start)}`).join('\n')}`).join('\n\n');
  }
  if(/\b(how many|count)\b/.test(q)){if(/\b(left|remaining|upcoming)\b/.test(q))items=items.filter(x=>new Date(x.exam.end||x.exam.start).getTime()>Date.now());return `You have ${items.length} ${period?period+' ':''}exam${items.length===1?'':'s'}${/left|remaining|upcoming/.test(q)?' still coming up':''}.`;}
  if(/\b(last exam|final exam of|last one)\b/.test(q)&&items.length){const item=items[items.length-1];askRememberExam(item);return `Your last saved${period?' '+period:''} exam is ${askExamLine(item)}.`;}
  if(course){
    if(!items.length)return `I couldn't find a${period?' '+period:''} exam date saved for ${course.name}.`;
    const future=items.filter(x=>new Date(x.exam.end||x.exam.start).getTime()>Date.now());
    if(/\b(next|upcoming|coming up|left|remaining)\b/.test(q)){
      if(!future.length)return `${course.name} doesn't have another upcoming${period?' '+period:''} exam saved. Its saved exam date${items.length===1?' is':'s are'} already in the past.`;
      const chosen=future[0];askRememberExam(chosen);return `${course.name}${period?` ${period}`:''} is ${askPrettyDate(chosen.when)} at ${formatExamTime(chosen.exam.start)}${chosen.exam.room?` · room ${chosen.exam.room}`:''}.`;
    }
    const chosen=future[0]||items[items.length-1];askRememberExam(chosen);
    if(/\b(when|what time|room|where)\b/.test(q)&&items.length===1)return `${course.name}${period?` ${period}`:''} is ${askPrettyDate(chosen.when)} at ${formatExamTime(chosen.exam.start)}${chosen.exam.room?` · room ${chosen.exam.room}`:''}.`;
    return askListExams(items,`${course.name} exams`);
  }
  if(/\b(next exams|upcoming exams|exams left|remaining exams)\b/.test(q)){
    const future=items.filter(x=>new Date(x.exam.end||x.exam.start).getTime()>Date.now());
    return askListExams(future.slice(0,8),period?`Upcoming ${period} exams`:'Your upcoming exams');
  }
  if(/\b(all|show|list|what are my exams|exam schedule)\b/.test(q)&&!/^.*next exam/.test(q))return askListExams(items,period?`${period[0].toUpperCase()+period.slice(1)} exams`:'Your saved exams');
  const n=(period?items.filter(x=>new Date(x.exam.end||x.exam.start).getTime()>Date.now())[0]:askNextUpcomingExam());
  if(!n)return `I couldn't find an upcoming ${period||'midterms or finals'} exam for this term.`;
  askRememberExam(n);return `Your next exam is ${n.exam.name} (${n.period}) ${askDateLabel(n.when)} at ${formatExamTime(n.exam.start)}${n.exam.room?` · room ${n.exam.room}`:''}.`;
}

function askScheduleOccurrencesForDate(date){
  const day=DAY_NAMES[new Date(date).getDay()],rows=[];
  askCurrentCourses().forEach(course=>normalizeCourseSchedules(course).forEach(s=>{if(s.day===day&&s.start)rows.push({course,schedule:s});}));
  return rows.sort((a,b)=>String(a.schedule.start).localeCompare(String(b.schedule.start)));
}
function askNextClass(){
  const n=nextClassOccurrence();if(!n)return `I couldn't find an upcoming class. Check that your course schedules have a day and start time.`;
  askRememberCourse(n.course);askCramchyContext.lastIntent='schedule';askRememberDate(n.when);
  const place=n.schedule.room?` · room ${n.schedule.room}`:'';return `Your next class is ${n.course.name}${n.course.code?` (${n.course.code})`:''} ${askDateLabel(n.when)} at ${displayTime24(n.schedule.start)}${place}.`;
}
function askCourseSchedule(course){
  askRememberCourse(course);const schedules=normalizeCourseSchedules(course).filter(s=>s.day||s.start||s.room);if(!schedules.length)return `${course.name} doesn't have a class schedule saved yet.`;
  return `${course.name} schedule:\n`+schedules.map(s=>`• ${scheduleText(s)}`).join('\n');
}
function askScheduleQuery(raw,course=null){
  const q=askNormalize(raw);askCramchyContext.lastIntent='schedule';
  if(course&&/\b(when is|what days|schedule|what time|when do i have)\b/.test(q))return askCourseSchedule(course);
  if(/\b(next class|class next|what class comes next)\b/.test(q))return askNextClass();
  const date=askResolveDate(raw,true);
  if(date){
    askRememberDate(date);const rows=askScheduleOccurrencesForDate(date);if(!rows.length)return `You don't have any classes saved for ${askPrettyDate(date)}.`;
    if(/\b(how many|count)\b/.test(q))return `You have ${rows.length} class${rows.length===1?'':'es'} on ${askPrettyDate(date)}.`;
    const pick=/\bfirst class\b/.test(q)?[rows[0]]:(/\blast class\b/.test(q)?[rows[rows.length-1]]:rows);pick.forEach(x=>askRememberCourse(x.course));
    return `${pick.length===1&&(/first class|last class/.test(q))?'That class':'Your classes'} on ${askPrettyDate(date)}:\n`+pick.map(x=>`• ${x.course.name} · ${displayTime24(x.schedule.start)}${x.schedule.end?`–${displayTime24(x.schedule.end)}`:''}${x.schedule.room?` · room ${x.schedule.room}`:''}`).join('\n');
  }
  if(course)return askCourseSchedule(course);
  if(/\b(free|anything after|anything before)\b/.test(q))return `Tell me a day too — like “am I free tomorrow?” or “do I have anything after 3 PM on Friday?”`;
  return askNextClass();
}

function askSubjectEntryForCourse(course,period){
  if(!course)return null;const catalog=examSubjectCatalog(profileAcademicYear(),profileTerm());const cat=catalog.find(x=>x.courseId===course.id||normalizeAcademicName(x.name)===normalizeAcademicName(course.name));if(!cat)return null;
  const p=dailyTermRecord()[period];return {id:cat.id,name:course.name,subject:p?.subjects?.[cat.id]||null,period};
}
function askResolveTopicTarget(course,raw){
  let period=askPeriodFromQuery(raw)||askCramchyContext.lastPeriod;
  if(!course&&askCramchyContext.lastExamId){const item=askAllExamItems().find(x=>x.exam.id===askCramchyContext.lastExamId&&x.period===askCramchyContext.lastExamPeriod);if(item){course=askCourseForExam(item);period=period||item.period;}}
  if(!course){const n=askNextUpcomingExam();if(n){course=askCourseForExam(n);period=period||n.period;askRememberExam(n);}}
  if(course)askRememberCourse(course);return {course,period};
}
function askTopicsQuery(raw,course=null){
  const q=askNormalize(raw),target=askResolveTopicTarget(course,raw);course=target.course;let periods=target.period?[target.period]:['midterms','finals'];if(!course)return `Tell me which course you mean, or add an upcoming exam so I know what you're preparing for.`;
  const entries=periods.map(p=>askSubjectEntryForCourse(course,p)).filter(x=>x?.subject);if(!entries.length)return `I couldn't find exam topics saved for ${course.name} yet.`;
  if(/\b(keep forgetting|things i keep forgetting|forget|forgetting)\b/.test(q)){const vals=entries.filter(e=>String(e.subject.forget||'').trim());if(!vals.length)return `You haven't written anything under “Things I Keep Forgetting” for ${course.name} yet.`;return vals.map(e=>`${e.period} — ${e.subject.forget.trim()}`).join('\n\n');}
  let rows=[];entries.forEach(e=>(e.subject.topics||[]).forEach(t=>rows.push({...t,period:e.period})));
  if(!rows.length)return `There aren't any review topics saved for ${course.name} yet.`;
  const mode=/\b(done|finished|completed)\b/.test(q)?'done':(/\b(left|unfinished|not started|remaining|need to review)\b/.test(q)?'unfinished':'all');
  if(mode==='done')rows=rows.filter(t=>t.status==='Done');if(mode==='unfinished')rows=rows.filter(t=>t.status!=='Done');
  if(/\b(how many|count)\b/.test(q))return `${course.name} has ${rows.length} ${mode==='all'?'saved':mode} topic${rows.length===1?'':'s'}${target.period?` for ${target.period}`:''}.`;
  if(!rows.length)return `No ${mode} topics found for ${course.name}${target.period?` (${target.period})`:''} ♡`;
  rows.slice(0,12).forEach(t=>{askCramchyContext.lastTopicName=t.name;});
  let msg=`${mode==='unfinished'?'Topics still to review':mode==='done'?'Finished topics':'Saved topics'} for ${course.name}${target.period?` (${target.period})`:''}:\n`+rows.slice(0,12).map(t=>`• ${t.name} · ${t.status}${t.priority?` · ${t.priority} priority`:''}`).join('\n');if(rows.length>12)msg+=`\n…and ${rows.length-12} more.`;return msg;
}
function askStudyAdvice(course=null,raw=''){
  const target=askResolveTopicTarget(course,raw);course=target.course;const record=dailyTermRecord(),priorityRank={High:0,Medium:1,Low:2},statusRank={'In Progress':0,'Not Started':1,'Done':2};let candidates=[],targetLabel='',forget='';
  const periods=target.period?[target.period]:['midterms','finals'];
  if(course){periods.forEach(period=>{const e=askSubjectEntryForCourse(course,period);if(!e?.subject)return;(e.subject.topics||[]).filter(t=>t.status!=='Done').forEach(t=>candidates.push({...t,period,subjectName:course.name}));if(e.subject.forget&&!forget)forget=e.subject.forget;});targetLabel=course.name;}
  if(!candidates.length&&!course){const next=askNextUpcomingExam();if(next){const info=askExamSubject(next.period,next.exam);targetLabel=`${info.name} (${next.period})`;forget=info.subject.forget||'';(info.subject.topics||[]).filter(t=>t.status!=='Done').forEach(t=>candidates.push({...t,period:next.period,subjectName:info.name}));askRememberExam(next);}}
  if(!candidates.length){['midterms','finals'].forEach(period=>Object.entries(record[period]?.subjects||{}).forEach(([id,s])=>{(s.topics||[]).filter(t=>t.status!=='Done').forEach(t=>candidates.push({...t,period,subjectName:record[period]?.subjectNames?.[id]||examSubjectNameById(id,profileAcademicYear(),profileTerm())}));}));}
  candidates.sort((a,b)=>(priorityRank[a.priority]??1)-(priorityRank[b.priority]??1)||(statusRank[a.status]??1)-(statusRank[b.status]??1));
  if(!candidates.length)return targetLabel?`You don't have unfinished review topics for ${targetLabel} right now ♡`:`I couldn't find unfinished exam topics yet. Add some in Exam Mode and I'll prioritize them.`;
  const q=askNormalize(raw);let limit=3;const min=q.match(/\b(\d{1,3})\s*(minute|minutes|min)\b/);const hr=q.match(/\b(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs)\b/);if(min){const n=Number(min[1]);limit=n<=30?1:n<=60?2:3;}else if(hr){const n=Number(hr[1]);limit=n<=0.5?1:n<=1?2:3;}
  const top=candidates.slice(0,limit);let msg=targetLabel?`For ${targetLabel}, I'd study these first:`:`I'd start with these:`;msg+='\n'+top.map((t,i)=>`${i+1}. ${t.name}${t.priority==='High'?' · high priority':''}${t.status==='In Progress'?' · already in progress':''}`).join('\n');
  if(forget)msg+=`\n\nBefore you stop, peek at your “Things I Keep Forgetting” note too.`;if(min||hr)msg+=`\n\nI kept the list short for the study time you gave me.`;askCramchyContext.lastIntent='study';return msg;
}

function askCourseStanding(course){
  if(!course)return null;const overall=overallGrade(course.id),m=termGrade(course.id,'midterms'),f=termGrade(course.id,'finals');askRememberCourse(course);askCramchyContext.lastIntent='grade';
  if(overall===null)return `You don't have any scores entered for ${course.name} yet. Add some in Grades and I can calculate your standing.`;
  let msg=`Your current available standing in ${course.name} is ${fmtPct(overall)} (${gradePoint(overall)||'no equivalent yet'}).`;const parts=[];if(m!==null)parts.push(`midterms ${fmtPct(m)}`);if(f!==null)parts.push(`finals ${fmtPct(f)}`);if(parts.length)msg+=`\n${parts.join(' · ')}`;return msg;
}
function askWeakestCategory(course){
  if(!course)return `Tell me which course you mean first.`;askRememberCourse(course);const data=gradeData(course.id);const requested=askCramchyContext.lastPeriod;const period=requested||((data.finals||[]).length?'finals':((data.midterms||[]).length?'midterms':null));if(!period)return `There aren't any scores in ${course.name} yet, so I can't tell what's pulling it down.`;
  const scheme=courseScheme(course);let weakest=null;Object.keys(GRADE_CATEGORIES).forEach(key=>{const st=categoryStats(course.id,period,key);if(st.pct===null)return;const drag=(100-st.pct)*(scheme[key]||0)/100;if(!weakest||drag>weakest.drag)weakest={key,pct:st.pct,drag,weight:scheme[key]||0};});
  if(!weakest)return `I don't have enough category scores yet to compare ${course.name}.`;return `For ${course.name}, the biggest drag in your ${period} estimate is ${GRADE_CATEGORIES[weakest.key]} at ${fmtPct(weakest.pct)}. It carries ${weakest.weight}% of the term grade.`;
}
function askAllStandings(){
  const rows=askCurrentCourses().map(c=>({c,g:overallGrade(c.id)}));if(!rows.length)return `You haven't added courses for ${profileTerm()} yet.`;const withScores=rows.filter(x=>x.g!==null);if(!withScores.length)return `Your courses are here, but there aren't any gradebook scores yet.`;return `Here's your current available standing:\n`+withScores.map(x=>`• ${x.c.code||x.c.name}: ${fmtPct(x.g)} (${gradePoint(x.g)||'—'})`).join('\n');
}
function askGradeRanking(which='highest'){
  const rows=askCurrentCourses().map(c=>({c,g:overallGrade(c.id)})).filter(x=>x.g!==null).sort((a,b)=>b.g-a.g);if(!rows.length)return `I don't have enough grade data to rank your courses yet.`;const x=which==='lowest'?rows[rows.length-1]:rows[0];askRememberCourse(x.c);return `Your ${which} current available standing is ${x.c.name} at ${fmtPct(x.g)} (${gradePoint(x.g)||'—'}).`;
}
function askCategoryGrade(course,key,period=null){
  if(!course)return `Tell me which course you mean first.`;askRememberCourse(course);const data=gradeData(course.id);period=period||((data.finals||[]).length?'finals':((data.midterms||[]).length?'midterms':null));if(!period)return `There aren't any scores in ${course.name} yet.`;const st=categoryStats(course.id,period,key);if(st.pct===null)return `You don't have any ${GRADE_CATEGORIES[key]} scores entered for ${course.name} ${period} yet.`;return `${course.name} · ${period} · ${GRADE_CATEGORIES[key]}: ${fmtPct(st.pct)}.`;
}
function askGwa(){
  const result=computeTermGwa(profileTerm());if(result.gwa===null)return `I can't calculate your ${profileTerm()} GWA yet because there aren't any included numeric final grades.`;const honor=result.gwa>=3.5?' · First Honors standing':(result.gwa>=3.25?' · Second Honors standing':'');return `Your current ${profileTerm()} GWA is ${result.gwa.toFixed(2)}${honor}. It uses ${result.totalUnits} included unit${result.totalUnits===1?'':'s'}.`;
}
function askGradeQuery(raw,course=null){
  const q=askNormalize(raw),period=askPeriodFromQuery(raw);if(period)askCramchyContext.lastPeriod=period;askCramchyContext.lastIntent='grade';
  if(/\bgwa\b/.test(q))return askGwa();
  if(/\b(drag|dragging|weakest|pulling|bring.*down|why.*grade|lowering)\b/.test(q))return askWeakestCategory(course||askCurrentCourses().find(c=>c.id===askCramchyContext.lastCourseId));
  if(/\b(highest|best grade|doing best)\b/.test(q))return askGradeRanking('highest');if(/\b(lowest grade|worst grade|doing worst)\b/.test(q))return askGradeRanking('lowest');
  const categories=[['ww',/\b(quiz|quizzes|written work|written works)\b/],['pt',/\b(enabling activit|performance task)\b/],['attendance',/\battendance\b/],['exam',/\bmajor exam\b/]];for(const [key,re] of categories)if(re.test(q))return askCategoryGrade(course,key,period);
  if(/\b(pass|passing|am i okay)\b/.test(q)&&course){const g=overallGrade(course.id);if(g===null)return `I don't have enough scores to judge ${course.name} yet.`;return g>=72?`Based on the scores entered, ${course.name} is currently ${fmtPct(g)} — above the R range.`:`Based on the scores entered, ${course.name} is currently ${fmtPct(g)}, which falls in the R range in your saved scale.`;}
  return course?askCourseStanding(course):askAllStandings();
}

function askTasks(raw=''){
  const q=askNormalize(raw),all=state.missions||[],undone=all.filter(m=>!m.done),done=all.filter(m=>m.done);askCramchyContext.lastIntent='tasks';
  if(/\b(due|deadline|overdue|this week|tomorrow|today)\b/.test(q)){let msg=`Quick tasks in Cramchy don't have due dates yet, so I can't truthfully filter them by deadline.`;if(undone.length)msg+=`\n\nYou do have ${undone.length} unfinished task${undone.length===1?'':'s'}:\n`+undone.slice(0,5).map((m,i)=>`${i+1}. ${m.text}`).join('\n');return msg;}
  if(/\b(done|finished|completed)\b/.test(q))return done.length?`You've completed ${done.length} quick task${done.length===1?'':'s'}:\n`+done.slice(0,8).map(m=>`• ${m.text}`).join('\n'):`No completed quick tasks are saved right now.`;
  if(/\b(how many|count)\b/.test(q))return `You have ${undone.length} unfinished quick task${undone.length===1?'':'s'}.`;
  if(!undone.length)return `You don't have any unfinished quick tasks right now ♡`;
  const shown=undone.slice(0,7);let msg=`You have ${undone.length} unfinished quick task${undone.length===1?'':'s'}:\n`+shown.map((m,i)=>`${i+1}. ${m.text}`).join('\n');if(undone.length>shown.length)msg+=`\n…and ${undone.length-shown.length} more in Tasks.`;return msg;
}

function askCourseInfoQuery(raw,course=null){
  const q=askNormalize(raw);askCramchyContext.lastIntent='course';
  if(/\b(what courses|my courses|courses am i taking|list courses|how many courses)\b/.test(q)&&!course){const cs=askCurrentCourses();if(/how many/.test(q))return `You're taking ${cs.length} course${cs.length===1?'':'s'} in ${profileTerm()}.`;return cs.length?`Your ${profileTerm()} courses:\n`+cs.map(c=>`• ${c.name}${c.code?` (${c.code})`:''} · ${c.units||0} unit${Number(c.units)===1?'':'s'}`).join('\n'):`You haven't added courses for ${profileTerm()} yet.`;}
  if(!course)return `Tell me which course you mean.`;askRememberCourse(course);
  if(/\b(professor|prof|teacher|instructor)\b/.test(q))return course.professor?`${course.name} is taught by ${course.professor}.`:`You haven't saved a professor for ${course.name} yet.`;
  if(/\b(units|unit)\b/.test(q))return `${course.name} is ${course.units||0} unit${Number(course.units)===1?'':'s'}.`;
  if(/\b(section)\b/.test(q))return course.section?`${course.name} is under section ${course.section}.`:`You haven't saved a section for ${course.name} yet.`;
  if(/\b(code|course code)\b/.test(q))return course.code?`${course.name} course code: ${course.code}.`:`You haven't saved a course code for ${course.name} yet.`;
  if(/\b(grading|weights|breakdown|percentage|percent)\b/.test(q)){const s=courseScheme(course);return `${course.name} grading scheme:\n• Written Works & Quizzes: ${s.ww}%\n• Enabling Activities: ${s.pt}%\n• Attendance: ${s.attendance}%\n• Major Exam: ${s.exam}%`;}
  if(/\b(room|where)\b/.test(q)){const sch=normalizeCourseSchedules(course).filter(s=>s.room);if(sch.length)return `${course.name} room${sch.length===1?'':'s'}: `+sch.map(s=>`${s.day||'class'} — ${s.room}`).join(' · ');return course.room?`${course.name} room: ${course.room}.`:`You haven't saved a room for ${course.name} yet.`;}
  if(/\b(schedule|when|what days|time)\b/.test(q))return askCourseSchedule(course);
  return `${course.name}${course.code?` (${course.code})`:''} · ${course.units||0} unit${Number(course.units)===1?'':'s'}${course.professor?` · ${course.professor}`:''}.`;
}

function askStudyHistory(raw=''){
  const q=askNormalize(raw),rows=(state.studyHistory||[]).filter(h=>!h.academicKey||h.academicKey===academicKey(profileAcademicYear(),profileTerm()));
  if(!rows.length)return `You don't have any study sessions logged for this term yet.`;
  const today=askTodayStart(),todayMin=rows.filter(h=>new Date(h.timestamp)>=today).reduce((s,h)=>s+h.minutes,0);
  if(/\btoday\b/.test(q))return `You've logged ${todayMin} focused minute${todayMin===1?'':'s'} today.`;
  const total=rows.reduce((s,h)=>s+h.minutes,0);return `You've logged ${total} focused minute${total===1?'':'s'} in the study history I can see for this term.`;
}

function askNavigation(raw){
  const q=askNormalize(raw);if(/\bgrades?\b/.test(q))return `Open Grades in the top navigation. That's where Course Gradebook, Term GWA, and Quick GWA live.`;if(/\bexam|topics?\b/.test(q))return `Open Exam Mode, choose your term and midterms/finals, then use Subjects/Topics.`;if(/\btasks?\b/.test(q))return `Open Tasks from the regular Cramchy navigation.`;if(/\bcourses?\b/.test(q))return `Open Courses to add or edit course details and class schedules.`;return `Try asking “where are my grades?”, “where do I add exam topics?”, or “where are my tasks?”`;
}
function askFriendly(raw){
  const q=askNormalize(raw),name=cramchyName();if(/^(hi|hello|hey|beh|hii|hiii)\b/.test(q))return `hiii ${name} ♡ what are we checking today?`;
  if(/\b(thank you|thanks|ty|salamat)\b/.test(q))return `always, beh ♡ now go collect those academic receipts.`;
  if(/\b(i m cooked|im cooked|am i cooked|cooked)\b/.test(q)){const n=askNextUpcomingExam(),tasks=(state.missions||[]).filter(m=>!m.done).length;if(n){const days=Math.max(0,Math.ceil((n.when-askTodayStart())/86400000));return `not cooked. maybe lightly toasted 😭 you have ${tasks} unfinished task${tasks===1?'':'s'} and your next exam is in about ${days} day${days===1?'':'s'}.`;}return `not cooked 😭 I just need more saved deadlines/exams before I can diagnose the academic situation.`;}
  if(/\b(tired|dont want to study|don t want to study|lazy|motivate|motivation|hype me|can i rest)\b/.test(q))return `tiny plan: pick one unfinished topic, do one focused block, then reassess. you do not need to conquer the whole semester in one sitting ♡`;
  if(/\b(i finished|i m done|im done|i passed|passed)\b/.test(q))return `OH?? academic weapon behavior detected ✦ proud of that progress, beh.`;
  if(/\b(bye|good night|goodnight)\b/.test(q))return `bye beh ♡ Cramchy will keep the receipts.`;return null;
}
function askHelp(){return `I can help with your class schedule, exams, exam topics, what to study, tasks, grades/GWA, course details, and study history. I also remember follow-ups like “that day,” “that subject,” and “for it.”`;}

function askStudyTips(raw='',course=null){
  const q=askNormalize(raw),next=askNextUpcomingExam();
  let intro=`study tips that actually do something ✦`;
  if(course)intro=`For ${course.name}, here's the move ✦`;
  else if(next){const c=askCourseForExam(next);if(c)intro=`For ${c.name} coming up in ${askTimeUntilText(next.exam.start)}, here's the move ✦`;}
  const tips=[
    `1. active recall first — close the notes and try to say/write what you remember before rereading.`,
    `2. practice > pretty notes — answer questions, label diagrams, explain concepts, or make yourself retrieve the answer.`,
    `3. study in small rounds — one topic at a time, then take a short break before the next one.`,
    `4. revisit weak stuff — spend more time on what you keep forgetting, not what already feels easy.`,
    `5. finish with a mini self-test — if you can explain it without looking, that's a much better sign than “I read it twice.”`
  ];
  if(/memor|terms|definitions/.test(q))tips[1]=`2. use retrieval cards — question on one side, answer from memory on the other; don't flip until you've actually tried.`;
  if(/exam|test|quiz/.test(q))tips[4]=`5. end with exam-style questions — mix topics so your brain has to decide which idea applies.`;
  return `${intro}\n\n${tips.join('\n')}`;
}
function askShouldStudyNow(raw=''){
  const q=askNormalize(raw),next=askNextUpcomingExam(),undone=(state.missions||[]).filter(m=>!m.done).length;
  const today=askTodayStart();
  const todayMinutes=(state.studyHistory||[]).filter(h=>(!h.academicKey||h.academicKey===academicKey(profileAcademicYear(),profileTerm()))&&new Date(h.timestamp)>=today).reduce((s,h)=>s+(Number(h.minutes)||0),0);
  if(next){
    const course=askCourseForExam(next),remaining=course?askUnfinishedTopics(course,next.period):[],diff=askExamStartMs(next.exam)-Date.now(),hours=diff/3600000;
    if(hours<=24){
      const topic=remaining[0]?.name;return `yeah beh — ${next.exam.name} starts in ${askTimeUntilText(next.exam.start)}. I'd do a focused review now${topic?`, starting with ${topic}`:''}, then stop before you fry your brain 😭${todayMinutes?` You've already logged ${todayMinutes} focused minute${todayMinutes===1?'':'s'} today, so keep the next block reasonable.`:''}`;
    }
    if(hours<=72){
      const topic=remaining[0]?.name;return `I'd start now, but keep it manageable. ${next.exam.name} is in ${askTimeUntilText(next.exam.start)}${remaining.length?` and you still have ${remaining.length} unfinished review topic${remaining.length===1?'':'s'}`:''}.${topic?` Start with ${topic}.`:''} A short focused block is enough to make progress.`;
    }
    if(hours<=168){
      return `yes, a light study block now would be worth it. ${next.exam.name} is in ${askTimeUntilText(next.exam.start)}${remaining.length?`, with ${remaining.length} unfinished review topic${remaining.length===1?'':'s'} saved`:''}. No need to cram — even 20–30 focused minutes counts.`;
    }
    if(undone>0)return `you don't look urgently cooked 😭 your next exam is still ${askTimeUntilText(next.exam.start)} away, but you do have ${undone} unfinished quick task${undone===1?'':'s'}. I'd clear one small thing now, then call it a win.`;
    return `nothing looks urgent from the data I can see. Your next exam is ${askTimeUntilText(next.exam.start)} away and your quick-task list is clear. If you have energy, do a light recall pass; if you're sleepy, planning tomorrow and resting is also reasonable.`;
  }
  if(undone>0)return `you have ${undone} unfinished quick task${undone===1?'':'s'}, so I'd do one short focused block now and knock out the easiest or most important one. I don't see an upcoming exam date saved, so there's no need to panic-cram.`;
  return `Cramchy doesn't see an upcoming exam or unfinished quick task right now. If you want to study anyway, make it a light review; otherwise you're allowed to be done for the moment ♡`;
}
function askIntent(raw){
  const q=askNormalize(raw);
  if(/\b(where|how do i|how can i|take me|open|go to)\b/.test(q)&&!/\b(where is|where s|what room)\b/.test(q))return 'navigation';
  if(/\b(study streak|focused minutes|how much.*stud|studied today|study history|study time)\b/.test(q))return 'studyhistory';
  if(/\b(topic|topics|coverage|covered|keep forgetting|things i keep forgetting|unfinished topics|finished topics)\b/.test(q))return 'topics';
  if(/\b(what should i study|what should i review|study tonight|review tonight|study first|review first|focus on|prioritize|prepare for|aaral|aralin|revise)\b/.test(q))return 'study';
  if(/\b(task|tasks|to do|todo|deadline|deadlines|due|overdue|submission)\b/.test(q))return 'tasks';
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
  const q=askNormalize(raw);if(!q)return `Ask me something about your Cramchy data ♡`;
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
  askAddMessage('bot',`hiii ${cramchyName()} ♡ ask me about your classes, exams, grades, tasks, or what to study.`);askAddChips([{label:'what should I study?',query:'what should I study?'},{label:"what's my next class?",query:"what's my next class?"},{label:'how are my grades?',query:'how are my grades?'},{label:"when's my next exam?",query:"when's my next exam?"}]);
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
  if(period){const m=missingFor(period);return m.length?`These courses don't have a ${period} exam date saved:\n`+m.map(c=>`• ${c.name}`).join('\n'):`Every course has a ${period} exam date saved ♡`;}
  const mid=missingFor('midterms'),fin=missingFor('finals');
  if(!mid.length&&!fin.length)return `Every course has both midterms and finals exam dates saved ♡`;
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
    const rows=askCurrentCourses().map(c=>({c,n:['midterms','finals'].reduce((sum,p)=>sum+askUnfinishedTopics(c,p).length,0)})).sort((a,b)=>b.n-a.n);if(!rows.length||rows[0].n===0)return `You don't have unfinished review topics saved right now ♡`;askRememberCourse(rows[0].c);return `${rows[0].c.name} has the most unfinished review topics right now: ${rows[0].n}.`;
  }
  const target=askResolveTopicTarget(course,raw);course=target.course;const periods=target.period?[target.period]:['midterms','finals'];if(!course)return `Tell me which course you mean, or add an upcoming exam so I know what you're preparing for.`;
  const entries=periods.map(p=>askSubjectEntryForCourse(course,p)).filter(x=>x?.subject);if(!entries.length)return `I couldn't find exam topics saved for ${course.name} yet.`;
  if(/\b(keep forgetting|things i keep forgetting|forget|forgetting)\b/.test(q)){const vals=entries.filter(e=>String(e.subject.forget||'').trim());if(!vals.length)return `You haven't written anything under “Things I Keep Forgetting” for ${course.name} yet.`;return vals.map(e=>`${e.period} — ${e.subject.forget.trim()}`).join('\n\n');}
  let rows=[];entries.forEach(e=>(e.subject.topics||[]).forEach(t=>rows.push({...t,period:e.period})));
  if(!rows.length)return `There aren't any review topics saved for ${course.name} yet.`;
  const mode=/\b(done|finished|completed)\b/.test(q)?'done':(/\b(left|unfinished|not started|remaining|need to review)\b/.test(q)?'unfinished':'all');
  if(mode==='done')rows=rows.filter(t=>t.status==='Done');if(mode==='unfinished')rows=rows.filter(t=>t.status!=='Done');
  if(/\b(how many|count)\b/.test(q))return `${course.name} has ${rows.length} ${mode==='all'?'saved':mode} topic${rows.length===1?'':'s'}${target.period?` for ${target.period}`:''}.`;
  if(!rows.length)return `No ${mode} topics found for ${course.name}${target.period?` (${target.period})`:''} ♡`;
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
  if(!candidates.length){const e=period?askSubjectEntryForCourse(course,period):null;const allDone=e&&(e.subject?.topics||[]).length>0&&(e.subject.topics||[]).every(t=>t.status==='Done');return allDone?`You're caught up on the saved ${period} topics for ${course.name} ♡ I'd do a quick recall pass or check “Things I Keep Forgetting” instead.`:`I couldn't find unfinished review topics for ${course.name}${period?` (${period})`:''} yet.`;}
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
  if(/\b(what should i do first|which task first|prioritize.*task)\b/.test(q)){if(!undone.length)return `You don't have any unfinished quick tasks right now ♡`;return `Quick Tasks don't have deadlines yet, so I can't rank urgency. If we're using list order, start with “${undone[0].text}.”`;}
  if(!undone.length)return `You don't have any unfinished quick tasks right now ♡`;
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
  const q=askNormalize(raw),name=cramchyName();if(/^(hi|hello|hey|beh|hii|hiii)\b/.test(q)&&q.split(' ').length<=4)return `hiii ${name} ♡ what are we checking today?`;
  if(/\b(thank you|thanks|ty|salamat)\b/.test(q))return `always, beh ♡ now go collect those academic receipts.`;
  if(/\b(i m cooked|im cooked|am i cooked|cooked)\b/.test(q)){const n=askNextUpcomingExam(),tasks=(state.missions||[]).filter(m=>!m.done).length;if(n){const when=askExamState(n.exam)==='in-progress'?'right now':`in ${askTimeUntilText(n.exam.start)}`;return `not cooked. maybe lightly toasted 😭 you have ${tasks} unfinished task${tasks===1?'':'s'} and your next exam is ${when}.`; }return `not cooked 😭 I just need more saved deadlines/exams before I can diagnose the academic situation.`;}
  if(/\b(do i have a lot to do|how bad is it)\b/.test(q)){const tasks=(state.missions||[]).filter(m=>!m.done).length,n=askNextUpcomingExam();return n?`You have ${tasks} unfinished quick task${tasks===1?'':'s'}, and ${n.exam.name} starts in ${askTimeUntilText(n.exam.start)}.`:`You have ${tasks} unfinished quick task${tasks===1?'':'s'} and no upcoming exam date saved for this term.`;}
  if(/\b(tired|dont want to study|don t want to study|lazy|motivate|motivation|hype me|can i rest)\b/.test(q))return `tiny plan: pick one unfinished topic, do one focused block, then reassess. you do not need to conquer the whole semester in one sitting ♡`;
  if(/\b(i finished|i m done|im done|i passed|passed)\b/.test(q))return `OH?? academic weapon behavior detected ✦ proud of that progress, beh.`;
  if(/\b(bye|good night|goodnight)\b/.test(q))return `bye beh ♡ Cramchy will keep the receipts.`;return null;
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
function askHelp(){return `ask me almost anything about what's saved in Cramchy ✦\n\n• classes — “what's my next class?”, “am I free tomorrow?”, “what comes after that?”\n• exams — “what are my next exams?”, “what else is on that day?”, “what room?”\n• studying — “what should I study?”, “should I start studying now?”, “give me study tips”\n• topics — “what's left for anaphy?”, “what do I keep forgetting?”\n• grades — “how am I doing in cogpsy?”, “what's dragging it down?”, “what's my GWA?”\n• tasks — “what tasks are left?”, “how many have I finished?”\n• courses — professors, rooms, units, codes, schedules, grading schemes\n• study history — focused minutes, streak, last studied, most/least studied\n\nYou can use cogpsy, edtech, fm, anaphy, and printea too ♡ and I understand follow-ups like “that day,” “for it,” and “after that.”`;}
function openAskCramchy(){
  if(document.getElementById('askCramchyPanel')){closeAskCramchy();return;}
  askResetContext();
  const panel=document.createElement('section');panel.id='askCramchyPanel';panel.className='ask-cramchy-panel';panel.setAttribute('aria-label','Ask Cramchy');
  panel.innerHTML=`<div class="ask-cramchy-head"><div class="ask-cramchy-avatar"><img src="${ASK_CRAMCHY_ICON}" alt="Ask Cramchy icon"></div><div class="ask-cramchy-title"><strong>ask cramchy</strong><span>your academic bestie with receipts ✦</span></div><button class="ask-cramchy-close" id="askCramchyClose" aria-label="Close">×</button></div><div class="ask-cramchy-messages" id="askCramchyMessages"></div><div class="ask-cramchy-compose"><textarea class="ask-cramchy-input" id="askCramchyInput" rows="1" maxlength="280" placeholder="ask me something..."></textarea><button class="ask-cramchy-send" id="askCramchySend" aria-label="Send">↑</button></div>`;
  document.body.appendChild(panel);document.getElementById('askCramchyLauncher')?.setAttribute('aria-expanded','true');document.getElementById('askCramchyClose')?.addEventListener('click',closeAskCramchy);
  askAddMessage('bot',`hiii ${cramchyName()} ♡ ask me about your classes, exams, grades, tasks, or what to study.`);askAddChips([{label:'what should I study?',query:'what should I study?'},{label:"what's my next class?",query:"what's my next class?"},{label:'how are my grades?',query:'how are my grades?'},{label:"when's my next exam?",query:"when's my next exam?"}]);
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
  countdownFeature.render();
  renderMatchaProgress();
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
  petDuoFeature.render();
  chaowiFeature.render();
}
ensureAcademicStructure();
switchTab('dashboard');
renderAll();
brainBreakFeature.render();
initCramchyShell();
initAcademicTerms();
initExamAndCourses();
initDailyHome();
initGradesModes();
initCloudSync();
  initAskCramchy();
showBootUpdateNotice();

})();
