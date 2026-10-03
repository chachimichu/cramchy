(function(root){
  'use strict';
  function canonical(value){
    if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
    return JSON.stringify(value);
  }
  function create(options){
    const o=options,normalize=o.normalize|| (value=>value);
    let base=null,conflict=null,pulling=null,saving=null,stopped=false;
    try{const saved=JSON.parse(o.storage.getItem(o.key)||'null');base=saved?.base||null;conflict=saved?.conflict||null;}catch(_){}
    const active=()=>!stopped&&o.active();
    const local=()=>normalize(o.read());
    const signature=value=>canonical(normalize(value));
    const persist=()=>o.storage.setItem(o.key,JSON.stringify({base,conflict}));
    function status(value){if(active())o.onStatus?.(value);}
    function clash(remote){
      if(!active())return;
      conflict=remote;
      persist();status('conflict');o.onConflict?.(remote);
    }
    function acknowledge(row,payload){
      if(!row?.updated_at)throw Error('Cloud version missing; local data kept.');
      base={version:row.updated_at,payload:normalize(payload)};conflict=null;persist();
    }
    async function fetchRow(){
      const {data,error}=await o.client.from(o.table).select(o.column+', updated_at').eq('user_id',o.userId).maybeSingle();
      if(error)throw error;
      if(data&&!data.updated_at)throw Error('Cloud version missing; local data kept.');
      return data;
    }
    async function pullWork(){
      if(!active())return false;
      status('loading');
      try{
        const row=await fetchRow();
        if(!active())return false;
        if(!row){
          if(base){clash({deleted:true});return false;}
          const payload=local();
          const {data,error}=await o.client.from(o.table).insert({user_id:o.userId,[o.column]:payload}).select(o.column+', updated_at').maybeSingle();
          if(!active())return false;
          if(error){
            // Another device may have inserted since our query. Never upsert it.
            if(error.code==='23505'){const latest=await fetchRow();if(active()&&latest)clash(latest);return false;}
            throw error;
          }
          acknowledge(data,payload);
          status(signature(local())===signature(payload)?'synced':'pending');return true;
        }
        const remote=normalize(row[o.column]);
        if(signature(local())===signature(remote)){
          acknowledge(row,remote);status('synced');return true;
        }
        const dirty=base?signature(local())!==signature(base.payload):o.hasLocal();
        if(dirty){
          if(base&&row.updated_at===base.version){status('pending');return true;}
          clash(row);return false;
        }
        // Read the current local value after the await above. Edits during the
        // query count as dirty and never get replayed over by its old response.
        if(o.canApply&&!o.canApply()){status('deferred');return false;}
        o.apply(remote);
        acknowledge(row,remote);status('synced');return true;
      }catch(error){if(active()){status('error');o.onError?.(error);}return false;}
    }
    function pull(){
      if(saving)return saving.then(()=>pull());
      if(pulling)return pulling;
      pulling=pullWork().finally(()=>{pulling=null;});return pulling;
    }
    async function pushWork(){
      if(!active())return false;
      if(pulling)await pulling;
      if(!active())return false;
      if(!base&&!conflict){if(!await pull())return false;}
      if(!active()||conflict||!base)return false;
      const payload=local();
      if(signature(payload)===signature(base.payload)){status('synced');return true;}
      status('saving');
      try{
        const previousTime=Date.parse(base.version);
        // Planner has no timestamp trigger. Advance beyond its prior value
        // even when two sequential client writes occur in the same millisecond.
        const updatedAt=new Date(Math.max(Date.now(),Number.isFinite(previousTime)?previousTime+1:0)).toISOString();
        // The database atomically checks the version. Zero returned rows means
        // another device changed it, not a successful save.
        const {data,error}=await o.client.from(o.table)
          .update({[o.column]:payload,updated_at:updatedAt})
          .eq('user_id',o.userId).eq('updated_at',base.version)
          .select(o.column+', updated_at').maybeSingle();
        if(!active())return false;
        if(error)throw error;
        if(!data){const latest=await fetchRow();if(active())clash(latest||{deleted:true});return false;}
        acknowledge(data,payload);
        const changed=signature(local())!==signature(payload);
        status(changed?'pending':'synced');return true;
      }catch(error){if(active()){status('error');o.onError?.(error);}return false;}
    }
    async function push(){
      if(saving)return saving;
      saving=(async()=>{
        let result=await pushWork();
        // Serialize writes and catch edits made while the first write awaited.
        while(result&&active()&&!conflict&&base&&signature(local())!==signature(base.payload))result=await pushWork();
        return result;
      })().finally(()=>{saving=null;});return saving;
    }
    async function resolve(choice){
      if(!active()||!conflict)return false;
      if(pulling)await pulling;
      if(saving)await saving;
      try{
        const selected=conflict,latest=await fetchRow();
        if(!active())return false;
        if(!latest&&selected.deleted){
          if(choice==='cloud'){
            const payload=normalize(o.empty());o.apply(payload);base=null;conflict=null;persist();status('synced');return true;
          }
          if(choice==='local'){
            const payload=local();
            const {data,error}=await o.client.from(o.table).insert({user_id:o.userId,[o.column]:payload}).select(o.column+', updated_at').maybeSingle();
            if(!active())return false;
            if(error){if(error.code==='23505'){clash(await fetchRow());return false;}throw error;}
            acknowledge(data,payload);status('synced');return true;
          }
          return false;
        }
        if(!latest||selected.deleted||latest.updated_at!==selected.updated_at){clash(latest||{deleted:true});return false;}
        if(choice==='cloud'){
          const payload=normalize(latest[o.column]);o.apply(payload);acknowledge(latest,payload);status('synced');return true;
        }
        if(choice==='local'){
          // User explicitly chooses this copy against the displayed version.
          base={version:latest.updated_at,payload:normalize(latest[o.column])};conflict=null;persist();
          return push();
        }
        return false;
      }catch(error){if(active()){status('error');o.onError?.(error);}return false;}
    }
    return {pull,push,resolve,stop(){stopped=true;},get conflict(){return conflict;}};
  }
  const api={canonical,create};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CramchyCloudSync=api;
})(typeof globalThis==='object'?globalThis:this);
