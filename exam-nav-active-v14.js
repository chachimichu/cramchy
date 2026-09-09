(function(){
  function activeExamTab(){
    const view=document.querySelector('main > .view.active');
    return view?.id?.replace(/^view-/,'')||'';
  }

  function syncExamTabHighlight(){
    const inExamMode=document.body.classList.contains('exam-mode-active');
    const tab=activeExamTab();
    document.querySelectorAll('.exam-nav-set [data-exam-tab]').forEach(button=>{
      button.classList.toggle('active',inExamMode&&button.dataset.examTab===tab);
      if(inExamMode&&button.dataset.examTab===tab){
        button.setAttribute('aria-current','page');
      }else{
        button.removeAttribute('aria-current');
      }
    });
  }

  function observeExamNavigation(){
    syncExamTabHighlight();

    const bodyObserver=new MutationObserver(syncExamTabHighlight);
    bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});

    document.querySelectorAll('main > .view').forEach(view=>{
      const observer=new MutationObserver(syncExamTabHighlight);
      observer.observe(view,{attributes:true,attributeFilter:['class']});
    });

    document.addEventListener('click',event=>{
      if(event.target.closest('[data-exam-tab]')){
        requestAnimationFrame(syncExamTabHighlight);
      }
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',observeExamNavigation,{once:true});
  }else{
    observeExamNavigation();
  }
})();
