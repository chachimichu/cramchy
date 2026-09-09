(function(){
  const VERSION='2026-09-09-planner-cloud-12';
  const LEGACY_BASE_URL='app-base.js?v='+VERSION;

  function refreshStyles(){
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
      const href=link.getAttribute('href')||'';
      if(href.includes('styles.css')) link.setAttribute('href','styles.css?v='+VERSION);
    });
    const sheets=['design-v3.css','home-hero-v4.css','home-hierarchy-v5.css','home-command-v6.css','polish-v7.css','theme-gradients-v8.css'];
    sheets.forEach(file=>{
      if(!document.querySelector(`link[href^="${file}"]`)){
        const link=document.createElement('link');
        link.rel='stylesheet';
        link.href=file+'?v='+VERSION;
        document.head.appendChild(link);
      }
    });
  }

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.onload=resolve;
      script.onerror=()=>reject(new Error('Failed to load '+src));
      document.head.appendChild(script);
    });
  }

  async function forceFreshBaseBundle(){
    try{
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.map(key=>caches.delete(key)));
      }
    }catch(e){
      console.warn('Cramchy runtime cache cleanup skipped.',e);
    }
    try{
      const response=await fetch(LEGACY_BASE_URL,{cache:'no-store'});
      if(!response.ok) throw new Error('Base refresh returned '+response.status);
    }catch(e){
      console.warn('Cramchy base refresh fell back to normal loading.',e);
    }
  }

  refreshStyles();
  forceFreshBaseBundle()
    .then(()=>loadScript('boot-resilience-v11.js?v='+VERSION))
    .then(()=>loadScript('app-logo-base.js?v='+VERSION))
    .then(()=>window.__cramchyBaseReady||Promise.resolve())
    .then(()=>loadScript('planner-cloud-sync-v12.js?v='+VERSION))
    .then(()=>window.__cramchyPlannerCloudReady||Promise.resolve())
    .then(()=>loadScript('planner-root-compat-v4.js?v='+VERSION))
    .then(()=>loadScript('planner-v3.js?v='+VERSION))
    .then(()=>{ window.__cramchyPlannerCloudMarkLoaded?.(); })
    .then(()=>loadScript('home-hierarchy-v5.js?v='+VERSION))
    .then(()=>loadScript('home-command-v6.js?v='+VERSION))
    .then(()=>loadScript('polish-v7.js?v='+VERSION))
    .then(()=>loadScript('task-home-sync-v9.js?v='+VERSION))
    .catch(err=>console.error('Cramchy startup failed.',err));
})();
