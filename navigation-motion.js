(function(){
  'use strict';
  const main=document.querySelector('main');if(!main)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),running=new WeakMap();
  function enter(el){
    if(!el||reduce.matches||typeof el.animate!=='function'||!el.getClientRects().length)return;
    running.get(el)?.cancel();
    const animation=el.animate([{opacity:.35},{opacity:1}],{duration:220,easing:'cubic-bezier(.2,.7,.3,1)'});
    running.set(el,animation);
    animation.addEventListener('finish',()=>{if(running.get(el)===animation)running.delete(el);},{once:true});
  }
  const visible=()=>Array.from(main.children).filter(el=>el.classList.contains('view')&&getComputedStyle(el).display!=='none');
  let current=visible();
  function sync(){const next=visible();next.filter(el=>!current.includes(el)).forEach(enter);current=next;}
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.target===document.body||r.target===main||(r.target.parentElement===main&&r.target.classList.contains('view'))))sync();
  });
  observer.observe(main,{subtree:true,attributes:true,attributeFilter:['class','style','hidden'],childList:true});
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  document.body.classList.add('cramchy-motion-ready');
  window.CramchyMotion={enter};
})();
