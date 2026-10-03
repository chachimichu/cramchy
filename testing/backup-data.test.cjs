const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const backup=require('../js/backup-data.js');
function storage(initial={}){
  const map=new Map(Object.entries(initial));
  return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};
}
const state={subjects:{},missions:[{id:'task',text:'Review'}],studyHistory:[{minutes:25}],
  courses:[
    {id:'t1',code:'PSY101',name:'Psychology',academicYear:'2026–2027',term:'Term 1'},
    {id:'t2',code:'PSY101',name:'Psychology',academicYear:'2026–2027',term:'Term 2'},
    {id:'next-year',code:'PSY101',name:'Psychology',academicYear:'2027–2028',term:'Term 1'},
    {id:'section-b',code:'PSY101',name:'Psychology',academicYear:'2026–2027',term:'Term 1',section:'B'}
  ],gradebook:{t1:{midterms:[{score:18,total:20}]},t2:{finals:[{score:90,total:100}]}},
  examData:{'2026–2027::Term 1':{midterms:{subjects:{'course-t1':{notes:'Keep these notes'}}}}}};
const source=storage({
  [backup.MAIN_KEY]:JSON.stringify(state),
  cramchyPlannerEvents_v2:JSON.stringify([{id:'event',title:'Study',date:'2026-10-04'}]),
  cramchyPlannerEvents_v1:JSON.stringify([{id:'old-event',title:'Legacy event'}]),
  cramchyTermGwaPlanner_v2:JSON.stringify({t1:{mode:'equiv',grade:'4.0',units:3}}),
  cramchyGradesSelectedTerm:'Term 2',
  'sb-project-auth-token':'must-never-be-exported'
});
const exported=JSON.parse(JSON.stringify(backup.create(state,source)));
assert(!JSON.stringify(exported).includes('must-never-be-exported'));
const decoded=backup.decode(exported);
const destination=storage();
backup.restore(destination,decoded.state,decoded.extras);
assert.deepEqual(JSON.parse(destination.getItem(backup.MAIN_KEY)),state);
for(const key of backup.EXTRA_KEYS)assert.equal(destination.getItem(key),source.getItem(key));
// New backups restore absent fields as absent, rather than retaining unrelated data.
const empty=storage();
const emptyBackup=backup.decode(backup.create(state,empty));
backup.restore(destination,emptyBackup.state,emptyBackup.extras);
for(const key of backup.EXTRA_KEYS)assert.equal(destination.getItem(key),null);
// Legacy imports retain Planner and Term GWA data.
const legacy=backup.decode(state);
assert.equal(legacy.legacy,true);
backup.restore(source,legacy.state,legacy.extras);
assert.equal(JSON.parse(source.getItem('cramchyPlannerEvents_v2'))[0].id,'event');
assert.equal(JSON.parse(source.getItem('cramchyTermGwaPlanner_v2')).t1.grade,'4.0');
for(const malformed of [null,[],{}, {format:'cramchy-backup',version:2,state,localData:{}},
  {...exported,state:{}}, {...exported,localData:{...exported.localData,cramchyPlannerEvents_v2:'{}'}},
  {...exported,localData:{...exported.localData,cramchyTermGwaPlanner_v2:'bad json'}}]){
  assert.throws(()=>backup.decode(malformed));
}
// Simulated quota failure after the main state write rolls every field back.
const failing=storage({[backup.MAIN_KEY]:'original',cramchyPlannerEvents_v2:'old events'});
const normalSet=failing.setItem;
let failOnce=true;
failing.setItem=(key,value)=>{if(key==='cramchyPlannerEvents_v2'&&failOnce){failOnce=false;throw Error('QuotaExceededError');}normalSet(key,value);};
assert.throws(()=>backup.restore(failing,state,decoded.extras));
assert.equal(failing.getItem(backup.MAIN_KEY),'original');
assert.equal(failing.getItem('cramchyPlannerEvents_v2'),'old events');
// A corrupt original is retained byte-for-byte for recovery.
const corrupt=storage({[backup.MAIN_KEY]:'{"unfinished":'});
backup.preserve(corrupt,'loading problem');
assert.equal(JSON.parse(corrupt.getItem(backup.RECOVERY_KEY)).rawState,'{"unfinished":');
backup.preserve(source,'before reset',state);
const recovery=backup.decode(JSON.parse(source.getItem(backup.RECOVERY_KEY)));
assert.deepEqual(recovery.state,state);
assert.equal(recovery.extras.cramchyGradesSelectedTerm,'Term 2');
// Execute the actual dedupe boot: storage reads/writes are forbidden and all
// distinct course identities must remain visible, even with identical names.
const elements=state.courses.map(course=>({dataset:{subjectId:'course-'+course.id},removed:false,remove(){this.removed=true;}}));
elements.push({dataset:{subjectId:'course-t1'},removed:false,remove(){this.removed=true;}});
const root={querySelectorAll:()=>elements};
const forbiddenStorage=new Proxy({}, {get(){throw Error('Dedupe must not touch storage');}});
vm.runInNewContext(fs.readFileSync(require.resolve('../exam-subject-dedupe-v21.js'),'utf8'),{
  localStorage:forbiddenStorage,sessionStorage:forbiddenStorage,
  document:{readyState:'complete',body:{classList:{contains:()=>true}},
    querySelector:selector=>selector==='#subjectTabs'?root:null,addEventListener(){}},
  requestAnimationFrame:fn=>fn(),MutationObserver:class{observe(){}}
});
assert(elements.slice(0,4).every(el=>!el.removed));
assert.equal(elements[4].removed,true);
assert.equal(state.courses.length,4);
console.log('Backup round trips, legacy imports, validation, quota rollback, recovery and course identities passed.');
