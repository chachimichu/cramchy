(function(){
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

  loadScript('app-logo-base.js?v=2026-09-09-design-2')
    .then(() => loadScript('planner.js?v=2026-09-09-design-2'))
    .catch(err => console.error('Cramchy startup failed.', err));
})();