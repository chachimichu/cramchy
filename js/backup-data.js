(function(root){
  'use strict';
  const MAIN_KEY='strawberryMatchaMidtermsState_v1';
  const RECOVERY_KEY='cramchyRecoveryBackup_v1';
  // Explicit allowlist: never export Supabase sessions or authentication tokens.
  const EXTRA_KEYS=['cramchyPlannerEvents_v2','cramchyPlannerEvents_v1','cramchyTermGwaPlanner_v2','cramchyGradesSelectedTerm'];
  const FORMAT='cramchy-backup';
  function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
  function validState(value){return object(value)&&object(value.subjects)&&Array.isArray(value.missions)&&Array.isArray(value.history);}
  function collect(storage){
    const out={};
    EXTRA_KEYS.forEach(key=>{out[key]=storage.getItem(key);});
    return out;
  }
  function create(state,storage){
    return {format:FORMAT,version:1,exportedAt:new Date().toISOString(),state,localData:collect(storage)};
  }
  function decode(value){
    if(!object(value)) throw new Error('Choose a Cramchy JSON backup.');
    if(value.format===FORMAT){
      if(value.version!==1||!validState(value.state)||!object(value.localData)) throw new Error('Unsupported backup format.');
      const extras={};
      EXTRA_KEYS.forEach(key=>{
        if(!Object.prototype.hasOwnProperty.call(value.localData,key)) throw new Error('Incomplete backup.');
        const raw=value.localData[key];
        if(raw!==null&&typeof raw!=='string') throw new Error('Invalid backup data.');
        if(raw!==null&&key!=='cramchyGradesSelectedTerm'){
          const parsed=JSON.parse(raw);
          if(key.includes('PlannerEvents')?!Array.isArray(parsed):!object(parsed)) throw new Error('Invalid backup data.');
        }
        extras[key]=raw;
      });
      return {state:value.state,extras,legacy:false};
    }
    // Legacy exports contained the state directly. Preserve separately saved data.
    if(value.format||!validState(value)) throw new Error('Choose a Cramchy JSON backup.');
    return {state:value,extras:{},legacy:true};
  }
  function preserve(storage,reason,state){
    const raw=storage.getItem(MAIN_KEY);
    const snapshot={format:FORMAT,version:1,exportedAt:new Date().toISOString(),reason,
      state:state||null,rawState:raw,localData:collect(storage)};
    if(!snapshot.state&&raw){try{snapshot.state=JSON.parse(raw);}catch(_){/* Preserve original bytes. */}}
    storage.setItem(RECOVERY_KEY,JSON.stringify(snapshot));
    return snapshot;
  }
  function restore(storage,state,extras){
    const writes={[MAIN_KEY]:JSON.stringify(state),...extras};
    const before={};
    Object.keys(writes).forEach(key=>{before[key]=storage.getItem(key);});
    try{
      Object.entries(writes).forEach(([key,raw])=>{if(raw===null)storage.removeItem(key);else storage.setItem(key,raw);});
    }catch(error){
      Object.entries(before).forEach(([key,raw])=>{if(raw===null)storage.removeItem(key);else storage.setItem(key,raw);});
      throw error;
    }
  }
  const api={MAIN_KEY,RECOVERY_KEY,EXTRA_KEYS,create,decode,preserve,restore};
  if(typeof module==='object'&&module.exports) module.exports=api; else root.CramchyBackup=api;
})(typeof globalThis==='object'?globalThis:this);
