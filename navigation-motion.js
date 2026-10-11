(function(){
  'use strict';
  const main=document.querySelector('main');if(!main)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),running=new WeakMap(),active=new Set();
  function animate(el,frames,options){
    running.get(el)?.cancel();
    const animation=el.animate(frames,options),entry={el,animation};
    running.set(el,animation);
    active.add(entry);
    const release=()=>{active.delete(entry);if(running.get(el)===animation)running.delete(el);};
    animation.addEventListener('finish',release,{once:true});
    animation.addEventListener('cancel',release,{once:true});
  }
  function enter(el){
    if(!el||reduce.matches||typeof el.animate!=='function'||!el.getClientRects().length)return;
    // Never transform a route: its fixed dialogs must stay attached to the viewport.
    // One shared fade: cards keep their positions and appear together.
    animate(el,[{opacity:.7},{opacity:1}],{duration:180,easing:'ease-out'});
  }
  const visible=()=>Array.from(main.children).filter(el=>el.classList.contains('view')&&getComputedStyle(el).display!=='none');
  const examMode=()=>document.body.classList.contains('exam-mode-active');
  let current=visible(),context=examMode();
  function sync(){
    const next=visible(),mode=examMode();
    for(const entry of active){if(current.some(view=>!next.includes(view)&&(view===entry.el||view.contains(entry.el)))){entry.animation.cancel();active.delete(entry);}}
    next.filter(el=>!current.includes(el)||mode!==context).forEach(enter);
    current=next;context=mode;
  }
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.target===document.body||r.target===main||(r.target.parentElement===main&&r.target.classList.contains('view'))))sync();
  });
  observer.observe(main,{subtree:true,attributes:true,attributeFilter:['class','style','hidden'],childList:true});
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  reduce.addEventListener?.('change',()=>{if(reduce.matches){for(const entry of active)entry.animation.cancel();active.clear();}});
  document.body.classList.add('cramchy-motion-ready');
  window.CramchyMotion={enter};
})();
