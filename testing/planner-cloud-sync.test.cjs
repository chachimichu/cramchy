const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const backup=require('../js/backup-data.js');
const KEY='cramchyPlannerEvents_v2';
const OLD='cramchyPlannerEvents_v1';
const event=id=>({id,title:'Review '+id,type:'study',course:'PSY101',date:'2026-10-04',start:'09:00',end:'10:00',notes:'Keep me',done:false});
const plain=value=>JSON.parse(JSON.stringify(value));
async function harness(options={}){
  class Storage{
    constructor(){this.values=new Map(Object.entries(options.local||{}));}
    getItem(key){return this.values.get(key)??null;}
    setItem(key,value){if(options.backupFailure&&key===backup.RECOVERY_KEY)throw Error('QuotaExceededError');this.values.set(key,String(value));}
    removeItem(key){this.values.delete(key);}
  }
  const localStorage=new Storage();
  const inserted=[],pushed=[],dispatched=[],timers=new Map(),listeners={};
  let timerId=0,authChange,realtime;
  const api={
    auth:{getSession:async()=>({data:{session:options.guest?null:{user:{id:'user-1'}}},error:null}),onAuthStateChange:cb=>{authChange=cb;}},
    from:table=>{
      assert.equal(table,'planner_state');
      return {
        select:columns=>{
          assert.equal(columns,'events, updated_at');
          return {eq:(column,id)=>{
            assert.equal(column,'user_id');assert.equal(id,'user-1');
            return {maybeSingle:async()=>{
              if(options.onSelect)await options.onSelect(localStorage,authChange);
              return {data:options.remote===undefined?null:{events:options.remote},error:options.selectError?Error('offline'):null};
            }};
          }};
        },
        insert:async row=>{inserted.push(plain(row));if(options.onInsert)await options.onInsert(localStorage);return {error:options.insertError?Error('insert failed'):null};},
        upsert:async row=>{pushed.push(plain(row));return {error:null};}
      };
    },
    channel:()=>({on:(type,filter,cb)=>{realtime=cb;return {subscribe(){}};}}),
    removeChannel(){}
  };
  const window={localStorage,CramchyBackup:backup,supabase:{createClient:()=>api},
    addEventListener:(name,cb)=>{listeners[name]=cb;},dispatchEvent:ev=>{dispatched.push(ev.type);}};
  const context={window,localStorage,Storage,console:{warn(){},error(){}},
    document:{visibilityState:'visible',body:{classList:{contains:()=>false}},querySelector:()=>null,addEventListener(){}},
    CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},
    setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),location:{reload(){throw Error('Unexpected reload');}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../planner-cloud-sync-v12.js'),'utf8'),context);
  await window.__cramchyPlannerCloudReady;
  return {localStorage,inserted,pushed,dispatched,options,
    signOut:()=>authChange('SIGNED_OUT',null),
    signIn:()=>authChange('SIGNED_IN',{user:{id:'user-1'}}),
    remote:payload=>realtime(payload),
    flush:async delay=>{for(const [id,timer] of [...timers])if(timer.delay===delay){timers.delete(id);await timer.fn();}},
    ready:window.__cramchyPlannerCloudReady};
}
(async()=>{
  let h=await harness({local:{[KEY]:JSON.stringify([event('guest')])}});
  assert.deepEqual(h.inserted[0].events,[event('guest')]);
  assert.deepEqual(JSON.parse(h.localStorage.getItem(KEY)),[event('guest')]);
  assert(!h.dispatched.includes('cramchy:planner-cloud-loaded'));
  h=await harness();assert.deepEqual(h.inserted[0].events,[]);
  h=await harness({local:{[OLD]:JSON.stringify([event('legacy')])}});
  assert.equal(h.inserted[0].events[0].id,'legacy');
  assert.equal(JSON.parse(h.localStorage.getItem(OLD))[0].id,'legacy');
  // Edits while the cloud query is loading are included in the first insert.
  h=await harness({local:{[KEY]:JSON.stringify([event('a')])},onSelect:async local=>local.setItem(KEY,JSON.stringify([event('a'),event('b')]))});
  assert.equal(h.inserted[0].events.length,2);
  // Edits while insertion is in flight stay local and are queued for the next save.
  h=await harness({local:{[KEY]:JSON.stringify([event('a')])},onInsert:async local=>local.setItem(KEY,JSON.stringify([event('a'),event('b')]))});
  assert.equal(h.inserted[0].events.length,1);
  assert.equal(JSON.parse(h.localStorage.getItem(KEY)).length,2);
  await h.flush(300);assert.equal(h.pushed[0].events.length,2);
  for(const failure of ['selectError','insertError']){
    h=await harness({local:{[KEY]:JSON.stringify([event('local')])},[failure]:true});
    assert.deepEqual(JSON.parse(h.localStorage.getItem(KEY)),[event('local')]);
    assert(h.dispatched.includes('cramchy:planner-cloud-error'));
  }
  for(const malformed of ['bad json','{}']){
    h=await harness({local:{[KEY]:malformed}});
    assert.equal(h.inserted.length,0);assert.equal(h.localStorage.getItem(KEY),malformed);
  }
  const main={subjects:{},missions:[],studyHistory:[]};
  h=await harness({local:{[backup.MAIN_KEY]:JSON.stringify(main),[KEY]:JSON.stringify([event('local')])},remote:[event('cloud')]});
  assert.equal(h.inserted.length,0);
  assert.equal(JSON.parse(h.localStorage.getItem(KEY))[0].id,'cloud');
  const snapshot=backup.decode(JSON.parse(h.localStorage.getItem(backup.RECOVERY_KEY)));
  assert.equal(JSON.parse(snapshot.extras[KEY])[0].id,'local');
  // Empty remote calendars are recoverable too; do not resurrect cloud deletions.
  h=await harness({local:{[backup.MAIN_KEY]:JSON.stringify(main),[KEY]:JSON.stringify([event('local')])},remote:[]});
  assert.deepEqual(JSON.parse(h.localStorage.getItem(KEY)),[]);
  assert.equal(JSON.parse(JSON.parse(h.localStorage.getItem(backup.RECOVERY_KEY)).localData[KEY])[0].id,'local');
  h=await harness({local:{[KEY]:JSON.stringify([event('local')])},remote:[event('cloud')],backupFailure:true});
  assert.equal(JSON.parse(h.localStorage.getItem(KEY))[0].id,'local');
  assert(h.dispatched.includes('cramchy:planner-cloud-error'));
  // Sign-out during a query ignores the previous account's response.
  h=await harness({guest:true,local:{[KEY]:JSON.stringify([event('local')])},onSelect:async(_,auth)=>auth('SIGNED_OUT',null)});
  h.signIn();await h.flush(0);
  assert.equal(h.inserted.length,0);assert.equal(JSON.parse(h.localStorage.getItem(KEY))[0].id,'local');
  h=await harness({remote:[event('cloud')]});
  h.signOut();h.remote({new:{events:[event('stale-account')]}});
  assert.equal(JSON.parse(h.localStorage.getItem(KEY))[0].id,'cloud');
  console.log('Planner first sign-in, legacy events, in-flight edits, errors, recovery and stale-account responses passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
