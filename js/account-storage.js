(function(root){
  'use strict';
  const PREFIX='cramchyAccount_v1:';
  const KEYS=['strawberryMatchaMidtermsState_v1','cramchyPlannerEvents_v2','cramchyPlannerEvents_v1',
    'cramchyTermGwaPlanner_v2','cramchyGradesSelectedTerm','cramchyStudyTimer_v1',
    'cramchyRecoveryBackup_v1','cramchySpecialLetterSeen_v2','cramchyLastAppVersion',
    'cramchyTrackerSync_v1','cramchyPlannerSync_v1'];
  function physical(owner,key){return PREFIX+encodeURIComponent(owner||'guest')+':'+key;}
  function migrateGuest(storage){
    // Old releases never recorded an owner. Keep their data in guest storage;
    // never silently assign an unknown person's work to a newly signed-in user.
    const marker=PREFIX+'legacy-migrated';
    if(storage.getItem(marker)) return;
    const writes=[];
    const originals={};
    KEYS.forEach(key=>{
      const raw=storage.getItem(key),target=physical('guest',key);
      if(raw!==null)originals[key]=raw;
      if(raw!==null&&storage.getItem(target)===null) writes.push([target,raw]);
    });
    // Keep exact legacy bytes too, including values that differ from an
    // existing guest profile. This archive contains only academic keys.
    if(Object.keys(originals).length)writes.push([PREFIX+'legacy-archive',JSON.stringify(originals)]);
    const written=[];
    try{
      writes.forEach(([key,value])=>{storage.setItem(key,value);written.push(key);});
      storage.setItem(marker,'1');
    }catch(error){written.forEach(key=>storage.removeItem(key));throw error;}
    // Only remove originals after all copies were saved successfully.
    KEYS.forEach(key=>storage.removeItem(key));
  }
  async function boot(){
    if(root.CramchyAccounts?.initialized) return;
    const storage=root.localStorage;
    const client=root.supabase?root.supabase.createClient(
      'https://pjgkadfnvqddfyjmktis.supabase.co','sb_publishable_1hoILah2SpoWwtZ0u2O6UQ_zgRsuNq_',
      {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
    let user=null;
    if(client){
      const result=await client.auth.getSession();
      if(result.error) throw result.error;
      user=result.data?.session?.user||null;
    }
    migrateGuest(storage);
    const owner=user?.id||'guest';
    const proto=root.Storage.prototype;
    const original={getItem:proto.getItem,setItem:proto.setItem,removeItem:proto.removeItem};
    const mapped=key=>KEYS.includes(String(key))?physical(owner,String(key)):key;
    let changing=false;
    for(const method of Object.keys(original)){
      proto[method]=function(key,...args){
        if(this===storage){
          if(changing&&KEYS.includes(String(key))&&method!=='getItem') throw Error('Account is changing.');
          return original[method].call(this,mapped(key),...args);
        }
        return original[method].call(this,key,...args);
      };
    }
    Object.assign(root.CramchyAccounts,{initialized:true,client,user,owner,
      active:id=>!changing&&(id||'guest')===owner,
      // Runs synchronously inside auth notification; no Supabase calls here.
      change(nextUser){
        if(changing||(nextUser?.id||'guest')===owner) return;
        let flushError=null;
        try{root.CramchyAccounts.flushLocal?.();}catch(error){flushError=error;}
        root.dispatchEvent(new root.CustomEvent('cramchy:account-leaving'));
        changing=true;
        root.CramchyAccounts.user=nextUser;
        if(flushError){
          root.dispatchEvent(new root.CustomEvent('cramchy:account-save-error'));
          return;
        }
        // Reload destroys old UI closures; data stays in its original namespace.
        root.setTimeout(()=>root.location.reload(),0);
      }
    });
    client?.auth.onAuthStateChange((event,session)=>root.CramchyAccounts.change(session?.user||null));
    root.addEventListener('storage',event=>{
      const prefix=physical(owner,'');
      if(event.key?.startsWith(prefix)){
        // Older UI patches listen for logical keys. Forward same-account changes
        // only; Supabase handles cross-tab auth events separately.
        root.dispatchEvent(new root.CustomEvent('cramchy:account-storage',{
          detail:{key:event.key.slice(prefix.length)}
        }));
      }
    });
  }
  const api={PREFIX,KEYS,physical,migrateGuest,boot};
  if(typeof module==='object'&&module.exports) module.exports=api;else root.CramchyAccounts=api;
})(typeof window==='object'?window:globalThis);
