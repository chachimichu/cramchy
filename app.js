(function(){
  const VERSION = '2026-09-09-design-bugfix-2';

  function refreshStylesheet(){
    const href = 'styles.css?v=' + VERSION;
    const fixHref = 'design-fixes.css?v=' + VERSION;
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      if(link.getAttribute('href') && link.getAttribute('href').includes('styles.css')){
        link.setAttribute('href', href);
      }
    });
    if(!document.querySelector('link[href^="design-fixes.css"]')){
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fixHref;
      document.head.appendChild(link);
    }
  }

  function loadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  refreshStylesheet();
  loadScript('app-logo-base.js?v=' + VERSION)
    .then(() => loadScript('planner.js?v=' + VERSION))
    .then(() => loadScript('planner-fixes.js?v=' + VERSION))
    .catch(err => console.error('Cramchy startup failed.', err));
})();