(function(){
  let animation=null;

  function reducedMotion(){
    return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function visibleRoot(){
    return ['gradebookRoot','gwaRoot','quickGwaRoot']
      .map(id=>document.getElementById(id))
      .find(el=>el&&getComputedStyle(el).display!=='none')||null;
  }

  function animateIncoming(){
    const root=visibleRoot();
    if(!root||reducedMotion()||typeof root.animate!=='function') return;

    try{animation?.cancel();}catch(e){}
    try{
      animation=root.animate([
        {opacity:.62,transform:'translateY(6px)'},
        {opacity:1,transform:'translateY(0)'}
      ],{
        duration:170,
        easing:'cubic-bezier(.22,.8,.28,1)',
        fill:'none'
      });
    }catch(e){}
  }

  function scheduleIncoming(){
    /* Base Grades switching happens on the button itself. Run after that click
       and after the Term GWA replacement microtask, then animate the final panel. */
    requestAnimationFrame(()=>requestAnimationFrame(animateIncoming));
  }

  function install(){
    const tabs=document.querySelector('#view-grades .grades-main-tabs');
    if(!tabs||tabs.dataset.smoothGradesV40==='yes') return;
    tabs.dataset.smoothGradesV40='yes';

    /* Bubble phase is intentional: the base tab handler switches content first. */
    tabs.addEventListener('click',event=>{
      const button=event.target.closest('[data-grades-mode]');
      if(!button) return;
      scheduleIncoming();
    },false);
  }

  function installOnEntry(){
    document.addEventListener('click',event=>{
      if(!event.target.closest('[data-tab="grades"],[data-open-tab="grades"]')) return;
      requestAnimationFrame(()=>{
        install();
        animateIncoming();
      });
    },true);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{install();installOnEntry();},{once:true});
  }else{
    install();
    installOnEntry();
  }
})();
