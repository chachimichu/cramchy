const assert=require('node:assert/strict');
const sync=require('../js/cloud-sync.js');
const copy=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function database(initial){
  const rows=new Map(initial?Object.entries(copy(initial)):[]),writes=[];
  let revision=0,failRead=false,failWrite=false,holdRead=null,holdWrite=null;
  const client={from:table=>({
    select:()=>({eq:(_,id)=>({maybeSingle:async()=>{
      const data=copy(rows.get(id)||null);if(holdRead)await holdRead.promise;
      return {data,error:failRead?Error('offline'):null};
    }})}),
    insert:row=>({select:()=>({maybeSingle:async()=>{
      if(holdWrite)await holdWrite.promise;
      if(failWrite)return {data:null,error:Error('offline')};
      if(rows.has(row.user_id))return {data:null,error:{code:'23505'}};
      const data={...copy(row),updated_at:'v'+(++revision)};rows.set(row.user_id,data);writes.push({kind:'insert',...data});return {data:copy(data),error:null};
    }})}),
    update:patch=>{
      const filters={};const query={eq:(key,value)=>{filters[key]=value;return query;},select:()=>({maybeSingle:async()=>{
        if(holdWrite)await holdWrite.promise;
        if(failWrite)return {data:null,error:Error('offline')};
        const existing=rows.get(filters.user_id);
        if(!existing||existing.updated_at!==filters.updated_at)return {data:null,error:null};
        const data={...existing,...copy(patch),updated_at:'v'+(++revision)};rows.set(filters.user_id,data);writes.push({kind:'update',...data,requestVersion:patch.updated_at,expectedVersion:filters.updated_at});return {data:copy(data),error:null};
      }})};return query;
    }
  })};
  return {client,rows,writes,get failRead(){return failRead;},set failRead(v){failRead=v;},set failWrite(v){failWrite=v;},set holdRead(v){holdRead=v;},set holdWrite(v){holdWrite=v;}};
}
function device(db,{value={},base=null,user='a',hasLocal=true}={}){
  let local=copy(value),active=true;
  const values=new Map(),applied=[],states=[],conflicts=[];
  if(base)values.set('meta',JSON.stringify({base,conflict:null}));
  const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const engine=sync.create({client:db.client,table:'test',column:'state',key:'meta',storage,userId:user,
    active:()=>active,read:()=>local,hasLocal:()=>hasLocal,normalize:copy,empty:()=>({}),
    apply:v=>{applied.push(copy(v));local=copy(v);},onStatus:s=>states.push(s),onConflict:c=>conflicts.push(copy(c))});
  return {engine,values,applied,states,conflicts,get local(){return local;},edit:v=>local=copy(v),leave:()=>{active=false;engine.stop();}};
}
if(require.main===module)(async()=>{
  // First cloud save seeds the latest local data without replaying old values.
  let db=database(),d=device(db,{value:{tasks:['first']}});
  const hold=deferred();db.holdRead=hold;
  const first=d.engine.pull();d.edit({tasks:['first','during read']});hold.resolve();await first;
  assert.deepEqual(db.rows.get('a').state,d.local);assert.equal(d.applied.length,0);
  db=database();d=device(db,{value:{tasks:['first']}});
  const insertion=deferred();db.holdWrite=insertion;
  const insert=d.engine.pull();await Promise.resolve();await Promise.resolve();d.edit({tasks:['second']});insertion.resolve();await insert;
  assert.deepEqual(d.local,{tasks:['second']});assert.equal(d.states.at(-1),'pending');
  db.holdWrite=null;await d.engine.push();assert.deepEqual(db.rows.get('a').state,d.local);
  // Two clean devices start from one version. One edit wins; the other keeps
  // its work and the remote candidate instead of overwriting either copy.
  db=database({a:{state:{tasks:[]},updated_at:'start'}});
  const a=device(db,{value:{tasks:[]},hasLocal:false}),b=device(db,{value:{tasks:[]},hasLocal:false});
  await a.engine.pull();await b.engine.pull();a.edit({tasks:['A']});b.edit({tasks:['B']});
  await a.engine.push();assert.equal(await b.engine.push(),false);
  assert.deepEqual(db.rows.get('a').state,{tasks:['A']});assert.deepEqual(b.local,{tasks:['B']});
  assert.deepEqual(b.engine.conflict.state,{tasks:['A']});
  // Conflicts survive refresh and repeated pulls; they are never auto-uploaded.
  const restored=sync.create({client:db.client,table:'test',column:'state',key:'meta',storage:{getItem:k=>b.values.get(k),setItem:(k,v)=>b.values.set(k,v)},userId:'a',active:()=>true,read:()=>b.local,hasLocal:()=>true});
  assert(restored.conflict);assert.equal(await restored.push(),false);
  assert.equal(await b.engine.resolve('local'),true);assert.deepEqual(db.rows.get('a').state,{tasks:['B']});
  a.edit({tasks:['A edited']});await a.engine.push();assert(a.engine.conflict);
  await a.engine.resolve('cloud');assert.deepEqual(a.local,{tasks:['B']});
  // Another cloud update after a choice was displayed needs a fresh choice.
  b.edit({tasks:['new B']});await b.engine.push();a.edit({tasks:['new A']});await a.engine.push();
  b.edit({tasks:['even newer B']});await b.engine.push();
  assert.equal(await a.engine.resolve('local'),false);assert.deepEqual(db.rows.get('a').state,{tasks:['even newer B']});
  // Edits during a pull must not be overwritten by the response it captured.
  db=database({a:{state:{tasks:['cloud']},updated_at:'later'}});
  d=device(db,{value:{tasks:[]},base:{version:'earlier',payload:{tasks:[]}}});
  const read=deferred();db.holdRead=read;const fetching=d.engine.pull();d.edit({tasks:['typing']});read.resolve();await fetching;
  assert.deepEqual(d.local,{tasks:['typing']});assert(d.engine.conflict);assert.equal(d.applied.length,0);
  // Concurrent saves are serialized and a second edit gets the returned version.
  db=database({a:{state:{n:0},updated_at:'start'}});d=device(db,{value:{n:0},hasLocal:false});await d.engine.pull();
  const write=deferred();db.holdWrite=write;d.edit({n:1});const saving=d.engine.push();d.edit({n:2});const also=d.engine.push();write.resolve();await Promise.all([saving,also]);
  assert.equal(db.rows.get('a').state.n,2);assert.equal(db.writes.length,2);
  // Query errors do not mark an unknown baseline safe for an unconditional write.
  db=database({a:{state:{n:9},updated_at:'start'}});d=device(db,{value:{n:1}});db.failRead=true;
  assert.equal(await d.engine.pull(),false);assert.equal(await d.engine.push(),false);assert.equal(db.writes.length,0);
  // Account changes invalidate both in-flight reads and writes' UI responses.
  db=database({a:{state:{n:9},updated_at:'start'}});d=device(db,{value:{n:0},hasLocal:false});
  const stale=deferred();db.holdRead=stale;const pending=d.engine.pull();d.leave();stale.resolve();await pending;
  assert.equal(d.applied.length,0);assert.equal(d.values.size,0);assert.equal(db.writes.length,0);
  // Client timestamps advance even if the prior device's clock was ahead.
  const future='2100-01-01T00:00:00.000Z';
  db=database({a:{state:{n:0},updated_at:future}});d=device(db,{value:{n:0},hasLocal:false});await d.engine.pull();d.edit({n:1});await d.engine.push();
  assert.equal(Date.parse(db.writes[0].requestVersion),Date.parse(future)+1);
  // Remote row deletions are conflicts too. A cloud choice clears the local
  // copy; a device choice can explicitly recreate it without an upsert.
  db=database({a:{state:{n:0},updated_at:'v0'}});d=device(db,{value:{n:0},hasLocal:false});await d.engine.pull();db.rows.delete('a');d.edit({n:2});await d.engine.push();
  assert(d.engine.conflict.deleted);await d.engine.resolve('local');assert.equal(db.rows.get('a').state.n,2);
  db.rows.delete('a');await d.engine.pull();await d.engine.resolve('cloud');assert.deepEqual(d.local,{});
  console.log('Cloud version checks, concurrent devices, in-flight edits, persisted conflicts, explicit resolution, errors and stale account responses passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={database};
