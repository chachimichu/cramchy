(function(){
  const FIRST=3.50;
  const SECOND=3.25;

  function getGwa(){
    const text=document.querySelector('#quickGwaRoot .quick-gwa-result.show .number')?.textContent?.trim();
    const gwa=Number(text);
    return Number.isFinite(gwa)?gwa:null;
  }

  function honorMessage(gwa){
    if(gwa===null) return '';
    if(gwa>=FIRST) return "Congratulations! You're on the Dean's List (First Honors)! 🎉";
    if(gwa>=SECOND) return "Congratulations! You're on the Dean's List (Second Honors)! 🎉";
    return '';
  }

  function patchLabels(){
    const tab=document.querySelector('#view-grades .grades-main-tabs [data-grades-mode="quickgwa"]');
    if(tab){
      const title=tab.querySelector('span');
      const small=tab.querySelector('small');
      if(title&&title.textContent!=='quick GWA calculator') title.textContent='quick GWA calculator';
      if(small&&small.textContent!=='final grades only') small.textContent='final grades only';
    }
    const heading=document.querySelector('#quickGwaRoot .quick-gwa-wrap > .card h3');
    if(heading&&heading.textContent!=='quick GWA calculator') heading.textContent='quick GWA calculator';
  }

  function ensureSubjectGuide(){
    const root=document.getElementById('gradebookRoot');
    if(!root) return;
    let guide=root.querySelector(':scope > [data-grades-subject-guide-v47]');
    if(guide) return;
    guide=document.createElement('div');
    guide.className='grades-tool-guide grades-subject-guide-v47';
    guide.dataset.gradesSubjectGuideV47='';
    guide.innerHTML='<span class="grades-step-no">02</span><div><strong>choose a subject</strong><small>tap a subject below to open its scores and grade details</small></div>';
    root.insertBefore(guide,root.firstChild);
  }

  function patchResult(){
    patchLabels();
    ensureSubjectGuide();
    const result=document.querySelector('#quickGwaRoot .quick-gwa-result.show');
    if(!result) return;

    result.querySelector('.quick-gwa-honor')?.remove();
    const gwa=getGwa();
    const eligible=result.dataset.dlEligible==='yes';
    const message=eligible?honorMessage(gwa):(result.dataset.dlReason||'');
    const sub=result.querySelector('.quick-gwa-sub');

    result.classList.toggle('quick-gwa-dean',eligible&&Boolean(message));
    if(sub&&message){
      sub.textContent=message;
      sub.classList.toggle('quick-gwa-congrats',eligible);
    }else if(sub){
      sub.classList.remove('quick-gwa-congrats');
    }
    result.classList.add('quick-gwa-polished');
  }

  function observeQuickRoot(){
    const root=document.getElementById('quickGwaRoot');
    if(!root||root.dataset.quickGwaPolishObserved==='yes') return;
    root.dataset.quickGwaPolishObserved='yes';
    new MutationObserver(()=>patchResult()).observe(root,{childList:true});
  }

  function observeGradebook(){
    const root=document.getElementById('gradebookRoot');
    if(!root||root.dataset.subjectGuideObserved==='yes') return;
    root.dataset.subjectGuideObserved='yes';
    new MutationObserver(()=>ensureSubjectGuide()).observe(root,{childList:true});
  }

  function observeTabs(){
    const tabs=document.querySelector('#view-grades .grades-main-tabs');
    if(!tabs||tabs.dataset.quickLabelObserved==='yes') return;
    tabs.dataset.quickLabelObserved='yes';
    new MutationObserver(()=>patchLabels()).observe(tabs,{childList:true,subtree:true,characterData:true});
  }

  function install(){
    patchLabels();
    ensureSubjectGuide();
    patchResult();
    observeQuickRoot();
    observeGradebook();
    observeTabs();

    document.addEventListener('click',event=>{
      if(event.target.closest('#quickGwaCalculateBtn')){
        /* Base calculator renders + launches its original confetti first.
           Patch in the same event cycle so the old result never paints. */
        queueMicrotask(patchResult);
        return;
      }
      if(event.target.closest('#gradebookRoot .grade-course-card[data-grade-course]')){
        queueMicrotask(ensureSubjectGuide);
        return;
      }
      if(event.target.closest('#view-grades [data-grades-mode],[data-tab="grades"],[data-open-tab="grades"]')){
        queueMicrotask(()=>{
          patchLabels();
          ensureSubjectGuide();
          patchResult();
        });
      }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
