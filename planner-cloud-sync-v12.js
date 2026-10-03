(function(){
  const STORAGE_KEY='cramchyPlannerEvents_v2';
  const OLD_STORAGE_KEY='cramchyPlannerEvents_v1';
  const SUPABASE_URL='https://pjgkadfnvqddfyjmktis.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_1hoILah2SpoWwtZ0u2O6UQ_zgRsuNq_';

  let client=null;
  let currentUser=null;
  let saveTimer=null;
  let suppressPlannerWrite=false;
  let plannerLoaded=false;
  let realtimeChannel=null;
  let pendingRealtimeRefresh=false;
  let syncEngine=null;

  function normalizeEvents(value){
    if(!Array.isArray(value)) return [];
    return value
      .filter(event=>event&&typeof event==='object'&&!/^p\d+$/.test(String(event.id||'')))
      .map(event=>({
        id:String(event.id||('planner-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8))).slice(0,120),
        title:String(event.title||'Untitled event').slice(0,240),
        type:['class','task','exam','quiz','study','personal'].includes(event.type)?event.type:'personal',
        course:String(event.course||'').slice(0,160),
        date:/^\d{4}-\d{2}-\d{2}$/.test(String(event.date||''))?String(event.date):'',
        start:String(event.start||'').slice(0,8),
        end:String(event.end||'').slice(0,8),
        notes:String(event.notes||'').slice(0,2000),
        done:Boolean(event.done)
      }));
  }

  function readLocalEvents(strict=false){
    try{
      const raw=localStorage.getItem(STORAGE_KEY)??localStorage.getItem(OLD_STORAGE_KEY);
      const parsed=raw?JSON.parse(raw):[];
      if(!Array.isArray(parsed)) throw new Error('Saved Planner events are not an array.');
      return normalizeEvents(parsed);
    }catch(error){
      console.warn('Planner local read failed.',error);
      if(strict) throw error;
      return [];
    }
  }

  function writeLocalEvents(events){
    const normalized=normalizeEvents(events);
    suppressPlannerWrite=true;
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));
      localStorage.removeItem(OLD_STORAGE_KEY);
    }finally{
      suppressPlannerWrite=false;
    }
    return normalized;
  }

  function plannerIsVisible(){
    return document.body?.classList.contains('planner-mode-active') || document.querySelector('#view-planner.active');
  }

  function applyRemoteEvents(events){
    const normalized=normalizeEvents(events);
    if(JSON.stringify(readLocalEvents())===JSON.stringify(normalized)) return false;
    let recoverySaved=false;

    // Keep the local version recoverable before another device/account replaces it.
    // If the backup cannot be saved, abort the replacement.
    if(localStorage.getItem(STORAGE_KEY)!==null||localStorage.getItem(OLD_STORAGE_KEY)!==null){
      window.CramchyBackup.preserve(localStorage,'before Planner cloud replacement');
      recoverySaved=true;
    }
    writeLocalEvents(normalized);
    pendingRealtimeRefresh=true;
    window.dispatchEvent(new CustomEvent('cramchy:planner-cloud-loaded',{
      detail:{count:normalized.length,realtime:true,recoverySaved}
    }));

    if(plannerLoaded&&plannerIsVisible()){
      setTimeout(()=>location.reload(),40);
    }
    return true;
  }

  async function getSignedInUser(){
    return currentUser;
  }

  async function pushEvents(){
    return syncEngine?syncEngine.push():false;
  }

  function queuePushFromLocal(){
    if(suppressPlannerWrite) return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>pushEvents(readLocalEvents()),300);
  }

  window.addEventListener('cramchy:backup-restored',queuePushFromLocal);

  function installStorageBridge(){
    if(window.__cramchyPlannerStorageBridgeInstalled) return;
    window.__cramchyPlannerStorageBridgeInstalled=true;
    const originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      const result=originalSetItem.call(this,key,value);
      if(this===window.localStorage&&key===STORAGE_KEY&&!suppressPlannerWrite){
        queuePushFromLocal();
      }
      return result;
    };
  }

  async function pullCloud(){
    return syncEngine?syncEngine.pull():readLocalEvents();
  }

  function unsubscribeRealtime(){
    if(!client||!realtimeChannel) return;
    client.removeChannel(realtimeChannel);
    realtimeChannel=null;
  }

  function subscribeRealtime(user){
    unsubscribeRealtime();
    if(!client||!user) return;

    realtimeChannel=client
      .channel('cramchy-planner-'+user.id)
      .on('postgres_changes',{
        event:'*',
        schema:'public',
        table:'planner_state',
        filter:'user_id=eq.'+user.id
      },()=>{
        if(currentUser?.id!==user.id) return;
        // Re-read the row through the version guard instead of applying a
        // potentially out-of-order realtime payload over unsaved edits.
        pullCloud();
      })
      .subscribe(status=>{
        window.dispatchEvent(new CustomEvent('cramchy:planner-realtime-status',{detail:{status}}));
        if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
          console.warn('Planner realtime channel status:',status);
        }
      });
  }

  async function refreshIfNeeded(){
    if(document.visibilityState!=='visible') return;
    const user=await getSignedInUser();
    if(!user) return;
    if(!realtimeChannel) subscribeRealtime(user);
    await pullCloud();
  }

  function installPlannerNavRefresh(){
    document.addEventListener('click',event=>{
      if(!pendingRealtimeRefresh) return;
      const plannerBtn=event.target.closest('.topnav .navbtn[data-tab="planner"]');
      if(!plannerBtn) return;
      pendingRealtimeRefresh=false;
      event.preventDefault();
      event.stopImmediatePropagation();
      location.reload();
    },true);
  }

  async function boot(){
    installStorageBridge();
    installPlannerNavRefresh();
    if(!window.supabase){
      console.warn('Planner cloud sync unavailable: Supabase client missing.');
      return;
    }

    client=window.CramchyAccounts.client;
    currentUser=window.CramchyAccounts.user;
    window.addEventListener('cramchy:account-leaving',()=>{
      clearTimeout(saveTimer);syncEngine?.stop();currentUser=null;unsubscribeRealtime();
    });
    if(currentUser){
      const user=currentUser;
      const initial=window.CramchyCloudSync.canonical(readLocalEvents());
      syncEngine=window.CramchyCloudSync.create({
        client,table:'planner_state',column:'events',key:'cramchyPlannerSync_v1',userId:user.id,
        storage:localStorage,active:()=>window.CramchyAccounts.active(user.id)&&currentUser?.id===user.id,
        read:()=>readLocalEvents(true),empty:()=>[],normalize:raw=>{
          if(!Array.isArray(raw))throw Error('Cloud Planner events are invalid.');return normalizeEvents(raw);
        },
        hasLocal:()=>localStorage.getItem(STORAGE_KEY)!==null||localStorage.getItem(OLD_STORAGE_KEY)!==null||window.CramchyCloudSync.canonical(readLocalEvents(true))!==initial,
        // Do not reload the Planner or accept a new baseline while an event
        // form still contains uncommitted edits.
        canApply:()=>!document.querySelector('#plannerModal.open'),
        apply:applyRemoteEvents,
        onStatus:status=>{
          if(status==='pending')queuePushFromLocal();
          if(status==='synced')window.dispatchEvent(new CustomEvent('cramchy:planner-cloud-synced'));
        },
        onConflict:()=>window.dispatchEvent(new CustomEvent('cramchy:sync-conflict',{detail:{label:'Planner'}})),
        onError:error=>{
          console.error('Planner cloud sync kept local events.',error);
          window.dispatchEvent(new CustomEvent('cramchy:planner-cloud-error'));
        }
      });
      window.CramchySyncEngines=window.CramchySyncEngines||{};
      window.CramchySyncEngines.Planner=syncEngine;
      await pullCloud();
      if(window.CramchyAccounts.active(user.id))subscribeRealtime(user);
    }
    window.addEventListener('cramchy:account-storage',event=>{
      if([STORAGE_KEY,OLD_STORAGE_KEY].includes(event.detail?.key)){
        syncEngine?.stop();clearTimeout(saveTimer);location.reload();
      }
    });

    document.addEventListener('visibilitychange',refreshIfNeeded);
    window.addEventListener('focus',refreshIfNeeded);
    window.addEventListener('online',refreshIfNeeded);
  }

  window.__cramchyPlannerCloudMarkLoaded=function(){plannerLoaded=true;};
  window.__cramchyPlannerCloudReady=boot();
})();
