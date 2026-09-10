(function(){
  function isMobile(){
    try{return window.matchMedia('(max-width:640px)').matches;}catch(e){return window.innerWidth<=640;}
  }

  const OVERLAY_HINTS=['backdrop','modal-backdrop','welcome','onboard','auth','profile'];
  const DIALOG_SELECTORS=[
    '.modal-content',
    '.profile-modal',
    '.welcome-modal',
    '.onboarding-modal',
    '.auth-modal',
    '.welcome-card',
    '.onboarding-card',
    '.auth-card',
    '[role="dialog"]'
  ].join(',');

  function isPlannerOverlay(el){
    return el instanceof HTMLElement && (el.id==='plannerModal'||el.classList.contains('planner-modal-backdrop'));
  }

  function important(el,prop,value){
    if(el&&el.style) el.style.setProperty(prop,value,'important');
  }

  function looksLikeOverlay(el){
    if(!(el instanceof HTMLElement)||isPlannerOverlay(el)) return false;
    const name=(String(el.id||'')+' '+String(el.className||'')).toLowerCase();
    if(!OVERLAY_HINTS.some(h=>name.includes(h))) return false;
    const style=getComputedStyle(el);
    return style.display!=='none' && style.visibility!=='hidden';
  }

  function findDialog(overlay){
    const direct=overlay.querySelector(DIALOG_SELECTORS);
    if(direct instanceof HTMLElement) return direct;
    const children=Array.from(overlay.children).filter(child=>child instanceof HTMLElement);
    return children.find(child=>child.querySelector('input,button,select,textarea'))||children[0]||null;
  }

  function centerOverlay(overlay){
    if(isPlannerOverlay(overlay))return;
    important(overlay,'inset','0');
    important(overlay,'left','0');
    important(overlay,'right','0');
    important(overlay,'width','100%');
    important(overlay,'max-width','100%');
    important(overlay,'min-width','0');
    important(overlay,'transform','none');
    important(overlay,'box-sizing','border-box');
    important(overlay,'display','grid');
    important(overlay,'grid-template-columns','minmax(0,1fr)');
    important(overlay,'place-items','center');
    important(overlay,'justify-items','center');
    important(overlay,'align-items','center');
    important(overlay,'padding-left','20px');
    important(overlay,'padding-right','20px');
    important(overlay,'padding-top','18px');
    important(overlay,'padding-bottom','18px');
    important(overlay,'overflow-x','hidden');
    important(overlay,'overflow-y','auto');

    const dialog=findDialog(overlay);
    if(!(dialog instanceof HTMLElement)) return;
    important(dialog,'position','relative');
    important(dialog,'inset','auto');
    important(dialog,'left','auto');
    important(dialog,'right','auto');
    important(dialog,'top','auto');
    important(dialog,'bottom','auto');
    important(dialog,'transform','none');
    important(dialog,'float','none');
    important(dialog,'width','100%');
    important(dialog,'max-width','420px');
    important(dialog,'min-width','0');
    important(dialog,'margin-left','auto');
    important(dialog,'margin-right','auto');
    important(dialog,'margin-inline','auto');
    important(dialog,'box-sizing','border-box');

    dialog.querySelectorAll('input,select,textarea').forEach(field=>{
      important(field,'width','100%');
      important(field,'max-width','100%');
      important(field,'min-width','0');
      important(field,'box-sizing','border-box');
      important(field,'font-size','16px');
    });
  }

  function fixVisibleModals(){
    if(!isMobile()) return;
    document.documentElement.classList.add('cramchy-mobile-modal-centered');
    Array.from(document.body.children).forEach(el=>{
      if(looksLikeOverlay(el)) centerOverlay(el);
    });
    document.querySelectorAll('.modal-backdrop,.profile-backdrop,.welcome-backdrop,.onboarding-backdrop,.auth-backdrop').forEach(el=>{
      if(!isPlannerOverlay(el))centerOverlay(el);
    });
  }

  function schedule(){
    clearTimeout(schedule.timer);
    schedule.timer=setTimeout(fixVisibleModals,30);
  }

  window.addEventListener('resize',schedule);
  window.addEventListener('orientationchange',()=>setTimeout(schedule,120));
  document.addEventListener('click',()=>setTimeout(schedule,60),true);
  document.addEventListener('focusin',schedule,true);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','open']});
})();
