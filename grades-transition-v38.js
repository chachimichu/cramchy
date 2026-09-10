(function(){
  let bypass=false;
  let busy=false;

  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function view(){return document.getElementById('view-grades');}
  function roots(){
    return ['gradebookRoot','gwaRoot','quickGwaRoot'].map(id=>document.getElementById(id)).filter(Boolean);
  }
  function visibleRoot(){
    return roots().find(el=>getComputedStyle(el).display!=='none')||null;
  }
  function reducedMotion(){
    return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function animateEl(el,keyframes,options){
    if(!el||reducedMotion()||typeof el.animate!=='function') return Promise.resolve();
    try{return el.animate(keyframes,options).finished.catch(()=>{});}catch(e){return Promise.resolve();}
  }
  async function waitForStableSwitch(maxMs=240){
    const start=performance.now();
    while(performance.now()-start<maxMs){
      const v=view();
      if(!v?.classList.contains('grades-is-switching')) return;
      await wait(16);
    }
  }

  async function softSwitch(button){
    if(busy) return;
    const v=view();
    if(!v) return;
    const from=visibleRoot();
    const loader=document.getElementById('gradesSwitchLoader');
    busy=true;

    loader?.classList.add('is-soft-active');

    await animateEl(from,[
      {opacity:1,transform:'translateY(0) scale(1)'},
      {opacity:.18,transform:'translateY(-5px) scale(.997)'},
      {opacity:0,transform:'translateY(-7px) scale(.995)'}
    ],{duration:105,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});

    bypass=true;
    try{button.click();}finally{bypass=false;}

    await waitForStableSwitch();
    await wait(18);

    const to=visibleRoot();
    if(to){
      to.style.opacity='0';
      to.style.transform='translateY(8px) scale(.997)';
    }

    loader?.classList.remove('is-soft-active');

    if(to){
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      await animateEl(to,[
        {opacity:0,transform:'translateY(8px) scale(.997)'},
        {opacity:1,transform:'translateY(0) scale(1)'}
      ],{duration:175,easing:'cubic-bezier(.22,.8,.28,1)',fill:'forwards'});
      to.style.opacity='';
      to.style.transform='';
    }

    if(from&&from!==to){
      from.style.opacity='';
      from.style.transform='';
    }
    busy=false;
  }

  function animateSubjectDetail(){
    const root=document.getElementById('gradebookRoot');
    if(!root||root.style.display==='none') return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const detail=[...root.children].find(el=>el.classList?.contains('card'))||root.querySelector('.grade-overview-row')?.closest('.card');
      animateEl(detail,[
        {opacity:.35,transform:'translateY(4px)'},
        {opacity:1,transform:'translateY(0)'}
      ],{duration:150,easing:'cubic-bezier(.22,.8,.28,1)'});
    }));
  }

  function install(){
    document.addEventListener('click',event=>{
      const tool=event.target.closest('#view-grades .grades-main-tabs [data-grades-mode]');
      if(tool&&!bypass){
        if(tool.classList.contains('active')||busy) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        softSwitch(tool);
        return;
      }
      if(event.target.closest('#view-grades .grade-course-card')) animateSubjectDetail();
    },true);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
