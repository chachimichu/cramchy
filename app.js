(function(){
  const VERSION='2026-09-09-task-home-sync-9';

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

  refreshStyles();
  loadScript('app-logo-base.js?v='+VERSION)
    .then(()=>loadScript('planner-root-compat-v4.js?v='+VERSION))
    .then(()=>loadScript('planner-v3.js?v='+VERSION))
    .then(()=>loadScript('home-hierarchy-v5.js?v='+VERSION))
    .then(()=>loadScript('home-command-v6.js?v='+VERSION))
    .then(()=>loadScript('polish-v7.js?v='+VERSION))
    .then(()=>loadScript('task-home-sync-v9.js?v='+VERSION))
    .catch(err=>console.error('Cramchy startup failed.',err));
})();
