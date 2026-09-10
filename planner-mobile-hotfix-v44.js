(function(){
  let wasOpen=false;

  function isPhone(){
    try{return window.matchMedia('(max-width:640px)').matches;}
    catch(e){return window.innerWidth<=640;}
  }
  function modal(){return document.getElementById('plannerModal');}
  function visibleHeight(){
    const vv=window.visualViewport;
    return Math.max(320,Math.round(vv?.height||window.innerHeight||640));
  }
  function setViewportHeight(){
    const el=modal();
    if(!el||!isPhone()) return;
    el.style.setProperty('--planner-mobile-visible-height',`${visibleHeight()}px`);
  }
  function blurPlannerField(){
    const active=document.activeElement;
    if(active&&active.closest&&active.closest('#plannerModal')){
      try{active.blur();}catch(e){}
    }
  }
  function setScrollLock(open){
    document.documentElement.classList.toggle('planner-mobile-modal-open',open);
    document.body.classList.toggle('planner-mobile-modal-open',open);
  }
  function syncModalState(){
    const el=modal();
    if(!el) return;
    if(!isPhone()){
      setScrollLock(false);
      wasOpen=el.classList.contains('open');
      return;
    }

    setViewportHeight();
    const open=el.classList.contains('open');
    el.setAttribute('aria-hidden',open?'false':'true');
    setScrollLock(open);

    if(open&&!wasOpen){
      el.scrollTop=0;
      const sheet=el.querySelector('.planner-modal');
      const form=el.querySelector('.planner-form');
      if(sheet) sheet.scrollTop=0;
      if(form) form.scrollTop=0;
      requestAnimationFrame(()=>{
        el.scrollTop=0;
        if(form) form.scrollTop=0;
      });
    }
    if(!open) blurPlannerField();
    wasOpen=open;
  }

  function normalizeClosedState(){
    const el=modal();
    if(!el) return;
    if(!el.classList.contains('open')){
      el.setAttribute('aria-hidden','true');
      blurPlannerField();
      setScrollLock(false);
      wasOpen=false;
    }else{
      syncModalState();
    }
  }

  document.addEventListener('click',event=>{
    if(!isPhone()) return;
    const add=event.target.closest('#view-planner [data-planner-add],#view-planner [data-planner-add-task]');
    if(add){
      setTimeout(()=>{
        const el=modal();
        if(el&&el.classList.contains('open')){
          blurPlannerField();
          syncModalState();
        }
      },80);
      return;
    }
    const close=event.target.closest('#view-planner [data-planner-close]');
    if(close){
      setTimeout(normalizeClosedState,0);
    }
  },true);

  const watchForModal=()=>{
    const el=modal();
    if(!el) return false;
    const observer=new MutationObserver(mutations=>{
      if(mutations.some(m=>m.type==='attributes'&&m.attributeName==='class')) syncModalState();
    });
    observer.observe(el,{attributes:true,attributeFilter:['class']});
    syncModalState();
    return true;
  };

  window.addEventListener('resize',setViewportHeight);
  window.addEventListener('orientationchange',()=>setTimeout(()=>{setViewportHeight();syncModalState();},120));
  window.visualViewport?.addEventListener('resize',setViewportHeight);
  window.visualViewport?.addEventListener('scroll',setViewportHeight);
  window.addEventListener('pageshow',normalizeClosedState);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden) setTimeout(normalizeClosedState,0);
  });

  function boot(){
    if(watchForModal()) return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(watchForModal()||tries>40) clearInterval(timer);
    },100);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
