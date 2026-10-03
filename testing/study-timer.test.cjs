const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const timer=require('../js/study-timer.js');
const backup=require('../js/backup-data.js');
const source=fs.readFileSync(require.resolve('../app-base.js'),'utf8');
function appFunction(name){const start=source.lastIndexOf('function '+name+'(');assert(start>=0);return source.slice(start,source.indexOf('\n}',start)+2);}
const plain=value=>JSON.parse(JSON.stringify(value));
const clock={value:100000};
const values=new Map();
class Element{
  constructor(){this.handlers={};this.textWrites=0;this.textContent='';this.disabled=false;this.innerHTML='';}
  get textContent(){return this._textContent;}
  set textContent(value){this._textContent=value;this.textWrites++;}
  addEventListener(name,callback){this.handlers[name]=callback;}
}
function boot(){
  const elements=new Map(['timerDisplay','timerStartBtn','timerPauseBtn','timerResetBtn','timerSubjectSelect'].map(id=>[id,new Element()]));
  const presets=[25,45,60].map(mins=>Object.assign(new Element(),{dataset:{mins:String(mins)}}));
  const listeners={},intervals=new Map(),messages=[];let id=0,failNext=false;
  const defaultState={courses:[{id:'psych',name:'Psychology'}],studyHistory:[],examPeriod:'midterms'};
  const ctx={CramchyStudyTimer:timer,CramchyBackup:backup,state:JSON.parse(values.get(backup.MAIN_KEY)||JSON.stringify(defaultState)),
    Date:class extends Date{static now(){return clock.value;}},
    localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(key===timer.KEY&&failNext){failNext=false;throw Error('QuotaExceededError');}values.set(key,value);},removeItem:key=>values.delete(key)},
    document:{getElementById:id=>elements.get(id),querySelectorAll:()=>presets,addEventListener:(name,fn)=>{listeners[name]=fn;}},
    window:{addEventListener:(name,fn)=>{listeners[name]=fn;}},
    setInterval:fn=>{const i=++id;intervals.set(i,fn);return i;},clearInterval:i=>intervals.delete(i),
    showToast:message=>messages.push(message),chaowiReact(){},cryptoId:()=> 'session-'+clock.value,
    activeAcademicKey:()=> '2026–2027::Term 1',dailyAcademicKey:()=> '2026–2027::Term 1',
    examSubjectNameById:()=> 'Psychology',examSubjectCatalog:()=>ctx.state.examPeriod==='midterms'?[{id:'course-psych',name:'Psychology'}]:[{id:'course-next',name:'Next course'}],
    coursesForCurrentTerm:()=>ctx.state.courses,escapeAttr:String,escapeHtml:String,
    saveState(){},renderHistory(){},renderMatchaCorner(){},renderDailyHome(){},console
  };
  vm.createContext(ctx);
  const start=source.indexOf('let timerState=readStudyTimer();');
  const end=source.indexOf('\nfunction logStudySession(){',start);
  vm.runInContext(source.slice(start,end)+'\n'+['renderTimerTab','logStudySession','studyHistorySubjectName'].map(appFunction).join('\n'),ctx);
  ctx.renderTimerTab();
  return {ctx,elements,presets,messages,click:id=>elements.get(id).handlers.click(),
    tick:()=>{for(const fn of [...intervals.values()])fn();},
    snapshot:()=>plain(vm.runInContext('timerState',ctx)),fail:()=>{failNext=true;},restore:()=>listeners['cramchy:backup-restored']()};
}
let app=boot();assert.equal(app.elements.get('timerDisplay').textContent,'25:00');
assert.equal(app.elements.get('timerStartBtn').textContent,'start');
const idleWrites=app.elements.get('timerStartBtn').textWrites;
app.tick();app.tick();assert.equal(app.elements.get('timerStartBtn').textWrites,idleWrites,'Repeated idle updates must not rewrite the button');
app.click('timerStartBtn');assert.equal(app.snapshot().running,true);assert(values.has(timer.KEY));
assert.equal(app.elements.get('timerStartBtn').textContent,'resume');
const runningWrites=app.elements.get('timerStartBtn').textWrites;
app.tick();app.tick();assert.equal(app.elements.get('timerStartBtn').textWrites,runningWrites,'Countdown ticks must not rewrite the button');
const original=app.snapshot().session;
assert.equal(original.subject,'course-psych');assert.equal(original.period,'midterms');
assert.equal(app.elements.get('timerSubjectSelect').disabled,true);assert(app.presets.every(el=>el.disabled));
clock.value+=62000;app.tick();assert.equal(app.elements.get('timerDisplay').textContent,'23:58');
app=boot();assert.equal(app.elements.get('timerDisplay').textContent,'23:58');assert.equal(app.snapshot().session.id,original.id);
app.click('timerPauseBtn');assert.equal(app.snapshot().remaining,1438);assert.equal(app.snapshot().running,false);
clock.value+=300000;app=boot();assert.equal(app.elements.get('timerDisplay').textContent,'23:58');
app.click('timerStartBtn');assert.equal(app.snapshot().session.id,original.id);
const deadline=app.snapshot().deadline;
// Repeated or late callbacks use elapsed wall time, not the callback count.
clock.value+=120000;app.tick();app.tick();assert.equal(app.elements.get('timerDisplay').textContent,'21:58');
app.ctx.state.examPeriod='finals';app.ctx.state.courses=[];app.ctx.renderTimerTab();
assert(app.elements.get('timerSubjectSelect').innerHTML.includes('Psychology'));
app.elements.get('timerSubjectSelect').handlers.change({target:{value:'course-next'}});
app.presets[2].handlers.click();assert.equal(app.snapshot().session.subject,original.subject);assert.equal(app.snapshot().presetMinutes,25);
// Reload after the deadline records one completed session with its original context.
clock.value=deadline+5000;app=boot();app.ctx.cloudLoading=true;app.tick();
assert.equal(app.ctx.state.studyHistory.length,0);app.ctx.cloudLoading=false;app.tick();
assert.equal(app.ctx.state.studyHistory.length,1);
let record=app.ctx.state.studyHistory[0];assert.equal(record.subject,'course-psych');assert.equal(record.subjectName,'Psychology');
assert.equal(record.academicKey,'2026–2027::Term 1');assert.equal(record.period,'midterms');assert.equal(record.minutes,25);assert.equal(record.timestamp,deadline);
assert.equal(app.snapshot().running,false);assert.equal(app.snapshot().session,null);
app.tick();app=boot();app.tick();assert.equal(app.ctx.state.studyHistory.length,1);
assert.equal(app.ctx.studyHistorySubjectName(record),'Psychology');
Object.assign(app.ctx,{SUBJECT_ORDER:['legacy'],SUBJECT_NAME:{legacy:'Legacy'},APP_VERSION:'test',STATE_SCHEMA_VERSION:2});
vm.runInContext(['freshSubject','freshState','sanitizeAttachments','sanitizeState'].map(appFunction).join('\n'),app.ctx);
const sanitized=app.ctx.sanitizeState(app.ctx.state);
assert.equal(sanitized.studyHistory[0].sessionId,record.sessionId);
assert.equal(sanitized.studyHistory[0].subjectName,'Psychology');
// Reset discards a partial session and unlocks course/duration controls.
app.click('timerStartBtn');clock.value+=30000;app.click('timerResetBtn');
assert.equal(app.snapshot().remaining,1500);assert.equal(app.snapshot().session,null);assert.equal(app.ctx.state.studyHistory.length,1);
assert.equal(app.elements.get('timerSubjectSelect').disabled,false);
app.presets[1].handlers.click();assert.equal(app.snapshot().presetMinutes,45);assert.equal(app.elements.get('timerDisplay').textContent,'45:00');
// A failed start leaves the timer idle. A failed completion stays recoverable.
app.fail();app.click('timerStartBtn');assert.equal(app.snapshot().running,false);
app.click('timerStartBtn');clock.value=app.snapshot().deadline;app.fail();app.tick();
assert.equal(app.snapshot().running,true);assert.equal(app.ctx.state.studyHistory.length,1);
assert.equal(JSON.parse(values.get(backup.MAIN_KEY)).studyHistory.length,1);
app.tick();assert.equal(app.ctx.state.studyHistory.length,2);app.tick();assert.equal(app.ctx.state.studyHistory.length,2);
// History persisted before a crash deduplicates replay of the same timer snapshot.
const completed=app.ctx.state.studyHistory[0];
values.set(timer.KEY,JSON.stringify({...timer.fresh(completed.subject,completed.minutes),running:true,deadline:clock.value,
  session:{id:completed.sessionId,subject:completed.subject,subjectName:completed.subjectName,academicKey:completed.academicKey,period:completed.period}}));
app=boot();app.tick();assert.equal(app.ctx.state.studyHistory.length,2);
// Timer backups round-trip; old complete backups keep the current device timer.
const state={subjects:{},missions:[],studyHistory:[]};
const store={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
const payload=backup.create(state,store);assert(Object.hasOwn(payload.localData,timer.KEY));
const decoded=backup.decode(payload);assert.equal(decoded.extras[timer.KEY],values.get(timer.KEY));
delete payload.localData[timer.KEY];assert(!Object.hasOwn(backup.decode(payload).extras,timer.KEY));
// Reset/restore reads the saved timer and rebuilds its controls.
values.delete(timer.KEY);app.restore();assert.equal(app.snapshot().session,null);assert.equal(app.elements.get('timerSubjectSelect').disabled,false);
assert.equal(timer.clean({presetMinutes:-5,remaining:Infinity,running:true,deadline:Infinity}).presetMinutes,25);
assert.equal(timer.clean({running:true,deadline:Infinity}).running,false);
console.log('Timer running/paused reload, background drift, original context, completion dedupe, reset, failed saves and backup compatibility passed.');
