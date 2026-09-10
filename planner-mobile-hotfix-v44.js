(function(){
  function isPhone(){
    try{return window.matchMedia('(max-width:640px)').matches;}
    catch(e){return window.innerWidth<=640;}
  }

  function modal(){return document.getElementById('plannerModal');}

  function blurPlannerField(){
    const active=document.activeElement;
    if(active&&active.closest&&active.closest('#plannerModal')){
      try{active.blur();}catch(e){}
    }
  }

  function normalizeClosedState(){
    const el=modal();
    if(!el) return;
    if(!el.classList.contains('open')){
      el.setAttribute('aria-hidden','true');
      blurPlannerField();
    }
  }

  document.addEventListener('click',event=>{
    if(!isPhone()) return;

    const add=event.target.closest('#view-planner [data-planner-add],#view-planner [data-planner-add-task]');
    if(add){
      /* planner-v3 focuses the title shortly after opening. On phones that can
         immediately summon the keyboard and make the modal feel trapped. */
      setTimeout(()=>{
        const el=modal();
        if(el&&el.classList.contains('open')) blurPlannerField();
      },80);
      return;
    }

    const close=event.target.closest('#view-planner [data-planner-close]');
    if(close){
      /* Defensive close in case mobile browser event ordering gets weird while
         the keyboard is visible. The planner's own handler still runs too. */
      setTimeout(()=>{
        const el=modal();
        if(!el) return;
        blurPlannerField();
        el.classList.remove('open');
        el.setAttribute('aria-hidden','true');
      },0);
    }
  },true);

  window.addEventListener('pageshow',normalizeClosedState);
  window.addEventListener('orientationchange',()=>setTimeout(normalizeClosedState,120));
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden) setTimeout(normalizeClosedState,0);
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',normalizeClosedState,{once:true});
  else normalizeClosedState();
})();
