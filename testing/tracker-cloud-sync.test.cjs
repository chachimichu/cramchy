const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const backup=require('../js/backup-data.js');
const sync=require('../js/cloud-sync.js');
const {database}=require('./cloud-sync.test.cjs');
const source=fs.readFileSync(require.resolve('../app-base.js'),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
function appFunction(name){const start=source.lastIndexOf('function '+name+'(');assert(start>=0);return source.slice(start,source.indexOf('\n}',start)+2);}
const state=tasks=>({subjects:{},missions:tasks.map(id=>({id,title:id,done:false})),studyHistory:[]});
class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.handlers={};this.textContent='';this.disabled=false;}
  set innerHTML(value){this.children=[];}
  appendChild(child){this.children.push(child);}
  addEventListener(type,cb){this.handlers[type]=cb;}
  querySelectorAll(tag){return this.children.flatMap(child=>[...(child.tag===tag?[child]:[]),...child.querySelectorAll(tag)]);}
}
function harness(db,{local=state([]),base=null,persisted=true}={}){
  const values=new Map(),timers=new Map(),messages=[],statuses=[],nodes=new Map(['cloudConflictChoices','cloudAuthMsg'].map(id=>[id,new Element()]));
  if(persisted)values.set(backup.MAIN_KEY,JSON.stringify(local));
  if(base)values.set('cramchyTrackerSync_v1',JSON.stringify({base}));
  let active=true,rendered=0,nextTimer=0,failRecovery=false;
  const context={state:copy(local),STORAGE_KEY:backup.MAIN_KEY,sb:db.client,cloudUser:{id:'a'},cloudReady:false,cloudLoading:false,trackerSync:null,cloudSaveTimer:null,saveTimeout:1,
    CramchyBackup:backup,CramchyCloudSync:sync,window:{CramchyAccounts:{active:()=>active}},
    localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(failRecovery&&key===backup.RECOVERY_KEY)throw Error('QuotaExceededError');values.set(key,String(value));}},
    sanitizeState:copy,applyStateMigrations(){},ensureAcademicStructure(){},renderAll(){rendered++;},
    setCloudButton:label=>statuses.push(label),showToast:message=>messages.push(message),
    clearTimeout:id=>timers.delete(id),setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,fn);return id;},
    document:{getElementById:id=>nodes.get(id)||null,createElement:tag=>new Element(tag)},
    console:{error(){}},freshState:()=>state([])};
  vm.createContext(context);
  vm.runInContext(['queueCloudSave','renderCloudConflictChoices','notifyCloudConflict'].map(appFunction).join('\n')+'\nasync '+appFunction('saveStateToCloud')+'\nasync '+appFunction('loadCloudStateForUser'),context);
  return {context,values,messages,statuses,nodes,edit:tasks=>context.state=state(tasks),leave:()=>active=false,set failRecovery(value){failRecovery=value;},get rendered(){return rendered;}};
}
(async()=>{
  // Existing clean cached data receives its account's remote copy and preserves
  // the actual in-memory state through the shipped backup implementation.
  let db=database({a:{state:state(['cloud']),updated_at:'new'}});
  let h=harness(db,{local:state(['local']),base:{version:'old',payload:state(['local'])}});
  await h.context.loadCloudStateForUser({id:'a'});
  assert.equal(h.context.state.missions[0].id,'cloud');assert.equal(h.rendered,1);
  assert.equal(JSON.parse(h.values.get(backup.RECOVERY_KEY)).state.missions[0].id,'local');assert.equal(h.context.saveTimeout,null);
  // Dirty cache keeps its own state and renders concrete conflict actions.
  h=harness(db,{local:state(['unsynced']),base:{version:'old',payload:state(['local'])}});
  await h.context.loadCloudStateForUser({id:'a'});
  assert.equal(h.context.state.missions[0].id,'unsynced');assert(h.context.trackerSync.conflict);
  assert(h.statuses.includes('☁ choose copy'));
  const buttons=h.nodes.get('cloudConflictChoices').querySelectorAll('button');
  assert.deepEqual(buttons.map(b=>b.textContent),['keep this device','use cloud copy']);
  await buttons[1].handlers.click();
  assert.equal(h.context.state.missions[0].id,'cloud');assert.equal(h.nodes.get('cloudConflictChoices').children.length,0);
  assert.equal(JSON.parse(h.values.get(backup.RECOVERY_KEY)).state.missions[0].id,'unsynced');
  // A recovery write failure aborts cloud replacement, retaining current work.
  h=harness(db,{local:state(['local']),base:{version:'old',payload:state(['local'])}});h.failRecovery=true;
  assert.equal(await h.context.loadCloudStateForUser({id:'a'}),false);assert.equal(h.context.state.missions[0].id,'local');assert.equal(h.rendered,0);
  // A new account without cached data can load its own cloud state; an unknown
  // baseline with cached edits cannot overwrite it through "sync now".
  h=harness(db,{persisted:false});await h.context.loadCloudStateForUser({id:'a'});assert.equal(h.context.state.missions[0].id,'cloud');
  h=harness(db,{local:state(['offline'])});await h.context.loadCloudStateForUser({id:'a'});assert.equal(await h.context.saveStateToCloud(),false);assert.equal(db.writes.length,0);
  // Startup query errors leave the device copy intact and clear loading state.
  db.failRead=true;h=harness(db,{local:state(['offline'])});await h.context.loadCloudStateForUser({id:'a'});
  assert.equal(h.context.cloudLoading,false);assert.equal(h.context.cloudReady,false);assert.equal(h.context.state.missions[0].id,'offline');
  console.log('Actual tracker adapters, cloud controls, conflict choices, recovery failures, new-account loads and startup errors passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
