(function(){
  // Names/codes are not unique identities. Never merge persisted course records.
  function removeRepeatedIds(root,selector){
    if(!root) return;
    const seen=new Set();
    Array.from(root.querySelectorAll(selector)).forEach(el=>{
      const id=el.dataset.subjectId||el.dataset.subject||el.dataset.courseId;
      if(!id) return;
      if(seen.has(id)) el.remove(); else seen.add(id);
    });
  }
  function cleanVisibleDuplicates(){
    if(!document.body.classList.contains('exam-mode-active')) return;
    removeRepeatedIds(document.querySelector('#subjectTabs'),'.subject-tab-btn,button');
    removeRepeatedIds(document.querySelector('#view-subjects .legacy-subjects-panel'),'.subject-card,.exam-subject-card,.course-card,[data-subject-id],[data-subject]');
  }
  function boot(){
    let queued=false;
    const queue=()=>{
      if(queued) return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;cleanVisibleDuplicates();});
    };
    queue();
    new MutationObserver(queue).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('click',queue,true);
    document.addEventListener('change',queue,true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
