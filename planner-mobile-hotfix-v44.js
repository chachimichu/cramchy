(function(){
  let observedModal=null;
  let modalObserver=null;
  let wasOpen=false;

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

  function setScrollLock(open){
    document.documentElement.classList.toggle('planner-modal-open',open);
    document.body.classList.toggle('planner-modal-open',open);
  }

  function hardClose(){
    const el=modal();
    if(!el)return;
    blurPlannerField();
    el.classList.remove('open');
    el.setAttribute('aria-hidden','true');
    setScrollLock(false);
    wasOpen=false;
  }

  function syncModalState(){
    const el=modal();
    if(!el)return;
    const open=el.classList.contains('open');
    el.setAttribute('aria-hidden',open?'false':'true');
    setScrollLock(open);

    if(open&&!wasOpen){
      el.scrollTop=0;
      const card=el.querySelector('.planner-modal');
      if(card)card.scrollTop=0;
      requestAnimationFrame(()=>{
        el.scrollTop=0;
        if(card)card.scrollTop=0;
      });
    }
    if(!open)blurPlannerField();
    wasOpen=open;
  }

  function bindPortalEvents(el){
    if(el.dataset.plannerPortalBound==='1')return;
    el.dataset.plannerPortalBound='1';
    el.addEventListener('click',event=>{
      const close=event.target.closest('[data-planner-close]');
      if(close){
        event.preventDefault();
        hardClose();
        return;
      }
      if(event.target===el)hardClose();
    });
  }

  function observeModal(el){
    if(observedModal===el)return;
    if(modalObserver)modalObserver.disconnect();
    observedModal=el;
    modalObserver=new MutationObserver(mutations=>{
      if(mutations.some(m=>m.type==='attributes'&&m.attributeName==='class'))syncModalState();
    });
    modalObserver.observe(el,{attributes:true,attributeFilter:['class']});
  }

  function portalPlannerModal(){
    const el=modal();
    if(!el)return false;

    /* The Planner used to keep this fixed overlay inside #view-planner.
       Moving it under body gives it the same viewport behavior as Add Course. */
    if(el.parentElement!==document.body)document.body.appendChild(el);

    bindPortalEvents(el);
    observeModal(el);
    syncModalState();
    return true;
  }

  document.addEventListener('click',event=>{
    const plannerTrigger=event.target.closest('#view-planner [data-planner-add],#view-planner [data-planner-add-task],#view-planner [data-planner-event]');
    if(plannerTrigger){
      setTimeout(()=>{
        portalPlannerModal();
        if(isPhone()&&plannerTrigger.matches('[data-planner-add],[data-planner-add-task]')){
          /* planner-v3 auto-focuses the title; suppress immediate keyboard takeover on phones */
          blurPlannerField();
        }
        syncModalState();
      },60);
      return;
    }

    const nav=event.target.closest('.topnav .navbtn');
    if(nav&&nav.dataset.tab!=='planner'&&modal()?.classList.contains('open'))hardClose();
  },true);

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&modal()?.classList.contains('open'))hardClose();
  });

  window.addEventListener('pageshow',()=>setTimeout(portalPlannerModal,0));
  window.addEventListener('orientationchange',()=>setTimeout(syncModalState,120));

  function boot(){
    if(portalPlannerModal())return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(portalPlannerModal()||tries>50)clearInterval(timer);
    },80);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
