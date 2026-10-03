const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const accounts=require('../js/account-storage.js');
const backup=require('../js/backup-data.js');
const source=fs.readFileSync(require.resolve('../js/account-storage.js'),'utf8');
const MAIN='strawberryMatchaMidtermsState_v1',PLANNER='cramchyPlannerEvents_v2';
async function boot(values,user=null,{failKey=null,authError=false}={}){
  class Storage{
    getItem(k){return values.get(k)??null;}
    setItem(k,v){if(k===failKey)throw Error('QuotaExceededError');values.set(k,String(v));}
    removeItem(k){values.delete(k);}
  }
  const localStorage=new Storage(),otherStorage=new Storage(),listeners={},timers=[];
  let authChange,reloads=0,clients=0;
  const client={auth:{getSession:async()=>({data:{session:user?{user:{id:user}}:null},error:authError?Error('Auth unavailable'):null}),onAuthStateChange:cb=>authChange=cb}};
  const window={Storage,localStorage,supabase:{createClient:()=>{clients++;return client;}},
    CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},
    addEventListener:(type,cb)=>(listeners[type]??=[]).push(cb),
    dispatchEvent:event=>(listeners[event.type]||[]).forEach(cb=>cb(event)),
    setTimeout:cb=>timers.push(cb),location:{reload:()=>reloads++}};
  vm.runInNewContext(source,{window,console});
  let error=null;try{await window.CramchyAccounts.boot();}catch(e){error=e;}
  return {window,localStorage,otherStorage,error,clients,get reloads(){return reloads;},auth:(id,event='SIGNED_IN')=>authChange(event,id?{user:{id}}:null),flushTimers:()=>timers.splice(0).forEach(cb=>cb())};
}
(async()=>{
  const values=new Map([[MAIN,'guest academic data'],[PLANNER,'guest events'],['sb-auth-token','private token']]);
  let h=await boot(values);
  assert.equal(h.localStorage.getItem(MAIN),'guest academic data');assert.equal(h.localStorage.getItem(PLANNER),'guest events');
  assert.equal(values.get(MAIN),undefined);assert.equal(values.get('sb-auth-token'),'private token');assert.equal(h.clients,1);
  h.localStorage.setItem('cramchyStudyTimer_v1','guest timer');
  h=await boot(values,'a');assert.equal(h.localStorage.getItem(MAIN),null);assert.equal(h.localStorage.getItem(PLANNER),null);
  h.localStorage.setItem(MAIN,'A academic data');h.localStorage.setItem(PLANNER,'A events');h.localStorage.setItem('cramchyRecoveryBackup_v1','A recovery');
  h.localStorage.setItem('cramchyTrackerSync_v1','A baseline');
  h.auth('a','TOKEN_REFRESHED');h.flushTimers();assert.equal(h.reloads,0);
  h.window.CramchyAccounts.flushLocal=()=>h.localStorage.setItem(MAIN,'A pending edit');
  h.auth(null,'SIGNED_OUT');h.flushTimers();assert.equal(h.reloads,1);
  assert.throws(()=>h.localStorage.setItem(MAIN,'wrong account'),/changing/);
  h=await boot(values);assert.equal(h.localStorage.getItem(MAIN),'guest academic data');assert.equal(h.localStorage.getItem('cramchyStudyTimer_v1'),'guest timer');
  h=await boot(values,'b');assert.equal(h.localStorage.getItem(MAIN),null);assert.equal(h.localStorage.getItem('cramchyRecoveryBackup_v1'),null);assert.equal(h.localStorage.getItem('cramchyTrackerSync_v1'),null);
  h.localStorage.setItem(MAIN,'B academic data');h.localStorage.setItem('cramchyStudyTimer_v1','B timer');
  h=await boot(values,'a');assert.equal(h.localStorage.getItem(MAIN),'A pending edit');assert.equal(h.localStorage.getItem(PLANNER),'A events');
  assert.equal(h.localStorage.getItem('cramchyStudyTimer_v1'),null);
  const exported=backup.create({subjects:{},missions:[],studyHistory:[]},h.localStorage);
  assert.equal(exported.localData[PLANNER],'A events');assert.equal(exported.localData.cramchyStudyTimer_v1,null);
  assert(!JSON.stringify(exported).includes('private token'));
  const events=[];h.window.addEventListener('cramchy:account-storage',event=>events.push(event.detail.key));
  h.window.dispatchEvent({type:'storage',key:accounts.physical('b',MAIN)});assert.equal(events.length,0);
  h.window.dispatchEvent({type:'storage',key:accounts.physical('a',MAIN)});assert.deepEqual(events,[MAIN]);
  h.window.CramchyAccounts.flushLocal=()=>{throw Error('QuotaExceededError');};
  let blocked=false;h.window.addEventListener('cramchy:account-save-error',()=>blocked=true);
  h.auth('b');h.flushTimers();assert(blocked);assert.equal(h.reloads,0);assert.throws(()=>h.localStorage.setItem(MAIN,'B'),/changing/);
  // Legacy ownership is unknown even with an active session; never seed a new
  // account with it. Guest and exact-byte archive remain available instead.
  const legacy=new Map([[MAIN,'unknown legacy']]);h=await boot(legacy,'new');assert.equal(h.localStorage.getItem(MAIN),null);
  assert.equal(legacy.get(accounts.physical('guest',MAIN)),'unknown legacy');
  assert.equal(JSON.parse(legacy.get(accounts.PREFIX+'legacy-archive'))[MAIN],'unknown legacy');
  // A partial migration must leave every old value recoverable.
  const failed=new Map([[MAIN,'old main'],[PLANNER,'old planner']]);
  h=await boot(failed,'new',{failKey:accounts.physical('guest',PLANNER)});assert(h.error);
  assert.equal(failed.get(MAIN),'old main');assert.equal(failed.get(PLANNER),'old planner');assert.equal(failed.has(accounts.physical('guest',MAIN)),false);
  h=await boot(new Map([[MAIN,'do not assign']]),'new',{authError:true});assert(h.error);assert.equal(h.localStorage.getItem(MAIN),'do not assign');
  console.log('Guest migration, exact-byte recovery, A/B account separation, timer/backup/baseline isolation, sign-out flush, auth refresh and storage failures passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
