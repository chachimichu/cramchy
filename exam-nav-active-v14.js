(function(){
  const EXAM_COLOR_CLASSES=[
    'cramchy-status-not-started','cramchy-status-in-progress','cramchy-status-done',
    'cramchy-priority-low','cramchy-priority-medium','cramchy-priority-high'
  ];

  function activeExamTab(){
    const view=document.querySelector('main > .view.active');
    return view?.id?.replace(/^view-/,'')||'';
  }

  function ensureExamSelectStyles(){
    if(document.getElementById('cramchyExamSelectColorStyle')) return;
    const style=document.createElement('style');
    style.id='cramchyExamSelectColorStyle';
    style.textContent=`
      body.exam-mode-active select.cramchy-exam-semantic{
        font-weight:900!important;
        transition:background-color .18s ease,border-color .18s ease,color .18s ease,box-shadow .18s ease;
      }
      body.exam-mode-active select.cramchy-status-not-started{
        background:#fff0f4!important;color:#966273!important;border-color:#efc6d1!important;
        box-shadow:0 0 0 3px rgba(239,198,209,.16)!important;
      }
      body.exam-mode-active select.cramchy-status-in-progress{
        background:#fff4dc!important;color:#94662b!important;border-color:#efd09a!important;
        box-shadow:0 0 0 3px rgba(239,208,154,.16)!important;
      }
      body.exam-mode-active select.cramchy-status-done{
        background:#edf6e8!important;color:#557447!important;border-color:#c9ddb9!important;
        box-shadow:0 0 0 3px rgba(201,221,185,.18)!important;
      }
      body.exam-mode-active select.cramchy-priority-low{
        background:#eef5ff!important;color:#5f78a0!important;border-color:#cbdaf0!important;
        box-shadow:0 0 0 3px rgba(203,218,240,.16)!important;
      }
      body.exam-mode-active select.cramchy-priority-medium{
        background:#fff4dc!important;color:#94662b!important;border-color:#efd09a!important;
        box-shadow:0 0 0 3px rgba(239,208,154,.16)!important;
      }
      body.exam-mode-active select.cramchy-priority-high{
        background:#ffe9ec!important;color:#a3495a!important;border-color:#f1bcc6!important;
        box-shadow:0 0 0 3px rgba(241,188,198,.18)!important;
      }
    `;
    document.head.appendChild(style);
  }

  function selectedLabel(select){
    const option=select.options?.[select.selectedIndex];
    return (option?.textContent||select.value||'').toLowerCase().replace(/\s+/g,' ').trim();
  }

  function semanticClassFor(select){
    const label=selectedLabel(select);
    if(label.includes('not started')) return 'cramchy-status-not-started';
    if(label.includes('in progress')) return 'cramchy-status-in-progress';
    if(label==='done'||label.endsWith(' done')||label.startsWith('done ')) return 'cramchy-status-done';
    if(label==='low'||label.includes('low priority')) return 'cramchy-priority-low';
    if(label==='medium'||label.includes('medium priority')) return 'cramchy-priority-medium';
    if(label==='high'||label.includes('high priority')) return 'cramchy-priority-high';
    return '';
  }

  function syncExamSelectColors(){
    const inExamMode=document.body.classList.contains('exam-mode-active');
    document.querySelectorAll('select').forEach(select=>{
      EXAM_COLOR_CLASSES.forEach(name=>select.classList.remove(name));
      select.classList.remove('cramchy-exam-semantic');
      if(!inExamMode) return;
      const semantic=semanticClassFor(select);
      if(!semantic) return;
      select.classList.add('cramchy-exam-semantic',semantic);
    });
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

  function syncExamVisuals(){
    syncExamTabHighlight();
    syncExamSelectColors();
  }

  function observeExamNavigation(){
    ensureExamSelectStyles();
    syncExamVisuals();

    let queued=false;
    const queueSync=()=>{
      if(queued) return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;syncExamVisuals();});
    };

    const bodyObserver=new MutationObserver(queueSync);
    bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});

    document.querySelectorAll('main > .view').forEach(view=>{
      const observer=new MutationObserver(queueSync);
      observer.observe(view,{attributes:true,attributeFilter:['class']});
    });

    document.addEventListener('click',event=>{
      if(event.target.closest('[data-exam-tab]')) queueSync();
    });

    document.addEventListener('change',event=>{
      if(event.target instanceof HTMLSelectElement) queueSync();
    },true);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',observeExamNavigation,{once:true});
  }else{
    observeExamNavigation();
  }
})();
