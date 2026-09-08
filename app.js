(function(){
  const VERSION='2026-09-09-stable-design-3';

  function refreshStyles(){
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
      const href=link.getAttribute('href')||'';
      if(href.includes('styles.css')) link.setAttribute('href','styles.css?v='+VERSION);
    });
    if(!document.querySelector('link[href^="design-v3.css"]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='design-v3.css?v='+VERSION;
      document.head.appendChild(link);
    }
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
    .then(()=>loadScript('planner-v3.js?v='+VERSION))
    .catch(err=>console.error('Cramchy startup failed.',err));
})();
