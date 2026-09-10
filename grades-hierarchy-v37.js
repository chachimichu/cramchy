(function(){
  function loadTransitionAssets(){
    if(!document.getElementById('gradesTransitionV38Css')){
      const link=document.createElement('link');
      link.id='gradesTransitionV38Css';
      link.rel='stylesheet';
      link.href='grades-transition-v38.css?v=2026-09-10-38';
      document.head.appendChild(link);
    }
    if(!document.getElementById('gradesTransitionV38Js')){
      const script=document.createElement('script');
      script.id='gradesTransitionV38Js';
      script.src='grades-transition-v38.js?v=2026-09-10-38';
      script.async=false;
      document.head.appendChild(script);
    }
  }

  function ensureToolGuide(){
    const view=document.getElementById('view-grades');
    const tabs=view?.querySelector('.grades-main-tabs');
    if(!view||!tabs) return;
    if(!view.querySelector('[data-grades-tool-guide]')){
      const guide=document.createElement('div');
      guide.className='grades-tool-guide';
      guide.setAttribute('data-grades-tool-guide','');
      guide.innerHTML='<span class="grades-step-no">01</span><div><strong>choose what you want to do</strong><small>switch between your gradebook, term GWA, and quick GWA</small></div>';
      tabs.insertAdjacentElement('beforebegin',guide);
    }
  }

  function ensureSubjectGuide(){
    const root=document.getElementById('gradebookRoot');
    if(!root||root.style.display==='none') return;
    const grid=root.querySelector('.grade-course-grid');
    if(!grid) return;
    if(root.querySelector('[data-grades-subject-guide]')) return;
    const guide=document.createElement('div');
    guide.className='grades-subject-guide';
    guide.setAttribute('data-grades-subject-guide','');
    guide.innerHTML='<span class="grades-step-no">02</span><div><strong>choose a subject</strong><small>tap a subject below to open its scores and grade details</small></div>';
    grid.insertAdjacentElement('beforebegin',guide);
  }

  function refreshHierarchy(){
    ensureToolGuide();
    ensureSubjectGuide();
  }

  function install(){
    loadTransitionAssets();
    refreshHierarchy();
    document.addEventListener('click',event=>{
      if(event.target.closest('#view-grades [data-grades-mode], #view-grades .grade-course-card, [data-tab="grades"], [data-open-tab="grades"]')){
        requestAnimationFrame(()=>requestAnimationFrame(refreshHierarchy));
      }
    },true);
    document.addEventListener('change',event=>{
      if(event.target.closest('#view-grades')) requestAnimationFrame(refreshHierarchy);
    },true);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
