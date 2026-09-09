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

  function normalizeEvents(value){
    if(!Array.isArray(value)) return [];
    return value
      .filter(event=>event&&typeof event==='object'&&!/^p\d+$/.test(String(event.id||'')))
      .map(event=>({
        id:String(event.id||('planner-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8))).slice(0,120),
        title:String(event.title||'Untitled event').slice(0,240),
        type:['class','task','exam','study','personal'].includes(event.type)?event.type:'personal',
        course:String(event.course||'').slice(0,160),
        date:/^\d{4}-\d{2}-\d{2}$/.test(String(event.date||''))?String(event.date):'',
        start:String(event.start||'').slice(0,8),
        end:String(event.end||'').slice(0,8),
        notes:String(event.notes||'').slice(0,2000),
        done:Boolean(event.done)
      }));
  }

  function readLocalEvents(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      return normalizeEvents(raw?JSON.parse(raw):[]);
    }catch(error){
      console.warn('Planner local read failed.',error);
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

    writeLocalEvents(normalized);
    pendingRealtimeRefresh=true;
    window.dispatchEvent(new CustomEvent('cramchy:planner-cloud-loaded',{
      detail:{count:normalized.length,realtime:true}
    }));

    if(plannerLoaded&&plannerIsVisible()){
      setTimeout(()=>location.reload(),40);
    }
    return true;
  }

  async function getSignedInUser(){
    if(!client) return null;
    const {data,error}=await client.auth.getSession();
    if(error){
      console.warn('Planner cloud session check failed.',error);
      return null;
    }
    currentUser=data?.session?.user||null;
    return currentUser;
  }

  async function pushEvents(events){
    if(!client) return;
    const user=currentUser||await getSignedInUser();
    if(!user) return;
    const normalized=normalizeEvents(events);
    try{
      const {error}=await client.from('planner_state').upsert({
        user_id:user.id,
        events:normalized,
        updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(error) throw error;
      window.dispatchEvent(new CustomEvent('cramchy:planner-cloud-synced',{detail:{count:normalized.length}}));
    }catch(error){
      console.error('Planner cloud save failed.',error);
      window.dispatchEvent(new CustomEvent('cramchy:planner-cloud-error'));
    }
  }

  function queuePushFromLocal(){
    if(suppressPlannerWrite) return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>pushEvents(readLocalEvents()),300);
  }

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
    if(!client) return [];
    const user=currentUser||await getSignedInUser();
    if(!user) return readLocalEvents();

    try{
      const {data,error}=await client
        .from('planner_state')
        .select('events, updated_at')
        .eq('user_id',user.id)
        .maybeSingle();
      if(error) throw error;

      let cloudEvents;
      if(data){
        cloudEvents=normalizeEvents(data.events);
      }else{
        cloudEvents=[];
        const {error:insertError}=await client.from('planner_state').insert({
          user_id:user.id,
          events:cloudEvents,
          updated_at:new Date().toISOString()
        });
        if(insertError) throw insertError;
      }

      applyRemoteEvents(cloudEvents);
      return cloudEvents;
    }catch(error){
      console.error('Planner cloud load failed.',error);
      return readLocalEvents();
    }
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
      },payload=>{
        if(payload.eventType==='DELETE'){
          applyRemoteEvents([]);
          return;
        }
        if(payload.new&&Array.isArray(payload.new.events)){
          applyRemoteEvents(payload.new.events);
        }
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

    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
    });

    await getSignedInUser();
    if(currentUser){
      await pullCloud();
      subscribeRealtime(currentUser);
    }

    client.auth.onAuthStateChange((event,session)=>{
      const nextUser=session?.user||null;
      const changedUser=(nextUser?.id||null)!==(currentUser?.id||null);
      currentUser=nextUser;

      if(!nextUser){
        unsubscribeRealtime();
        return;
      }

      if(changedUser){
        setTimeout(async()=>{
          await pullCloud();
          subscribeRealtime(nextUser);
        },0);
      }else if(!realtimeChannel){
        subscribeRealtime(nextUser);
      }
    });

    document.addEventListener('visibilitychange',refreshIfNeeded);
    window.addEventListener('focus',refreshIfNeeded);
    window.addEventListener('online',refreshIfNeeded);
  }

  window.__cramchyPlannerCloudMarkLoaded=function(){plannerLoaded=true;};
  window.__cramchyPlannerCloudReady=boot();
})();
