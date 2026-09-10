(function(){
  const APP_STORAGE_KEY='strawberryMatchaMidtermsState_v1';
  const PLANNER_STORAGE_KEY='cramchyTermGwaPlanner_v2';
  const TERM_KEY='cramchyGradesSelectedTerm';
  const NUMERIC_GRADES=['4.0','3.5','3.0','2.5','2.0','1.5','1.0'];
  const ALL_GRADES=[...NUMERIC_GRADES,'R','INC','P','F'];
  const RAW_TARGETS=[
    {grade:'4.0',rounded:96,cutoff:95.5},
    {grade:'3.5',rounded:90,cutoff:89.5},
    {grade:'3.0',rounded:84,cutoff:83.5},
    {grade:'2.5',rounded:78,cutoff:77.5},
    {grade:'2.0',rounded:72,cutoff:71.5}
  ];

  let suppressGwaObserver=false;
  let stageBusy=false;
  let stageStartedAt=0;
  let stageFinishTimer=null;
  let gradebookPatchQueued=false;

  function readJson(key){
    try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(e){return {};}
  }
  function writeJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));}catch(e){console.warn('Grades save skipped.',e);}
  }
  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
  }
  function attr(value){return escapeHtml(value).replace(/`/g,'&#96;');}
  function toNumber(value){
    if(value===''||value===null||value===undefined) return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }
  function clampRaw(value){
    const n=toNumber(value);
    return n===null?null:Math.max(0,Math.min(100,n));
  }
  function roundedRaw(value){
    const n=toNumber(value);
    return n===null?null:Math.round(n);
  }
  function pct(value){
    const n=toNumber(value);
    return n===null?'—':`${n.toFixed(2)}%`;
  }
  function rawToGrade(value){
    const p=roundedRaw(value);
    if(p===null) return '';
    if(p>=96) return '4.0';
    if(p>=90) return '3.5';
    if(p>=84) return '3.0';
    if(p>=78) return '2.5';
    if(p>=72) return '2.0';
    return 'R';
  }
  function conversionText(raw){
    const n=toNumber(raw);
    if(n===null) return '';
    return `${pct(n)} → ${roundedRaw(n)} → ${rawToGrade(n)}`;
  }
  function targetFor(grade){return RAW_TARGETS.find(x=>x.grade===String(grade))||RAW_TARGETS[2];}
  function isNumericGrade(grade){return NUMERIC_GRADES.includes(String(grade));}
  function deanLabel(gwa){
    const g=toNumber(gwa);
    if(g===null) return '';
    if(g>=3.50) return "Dean's List — First Honors";
    if(g>=3.25) return "Dean's List — Second Honors";
    return '';
  }
  function profileYear(state){return state.profile?.academicYear||'2026–2027';}
  function profileTerm(state){return state.profile?.term||'Term 1';}
  function termsFor(state){
    const set=new Set([profileTerm(state)]);
    (state.courses||[]).forEach(c=>set.add(c.term||profileTerm(state)));
    return [...set].filter(Boolean);
  }
  function currentTerm(state){
    const terms=termsFor(state);
    let saved='';
    try{saved=localStorage.getItem(TERM_KEY)||'';}catch(e){}
    if(saved&&terms.includes(saved)) return saved;
    return terms.includes(profileTerm(state))?profileTerm(state):terms[0];
  }
  function setCurrentTerm(term){try{localStorage.setItem(TERM_KEY,term);}catch(e){}}
  function coursesFor(state,term){
    const year=profileYear(state);
    return (state.courses||[]).filter(c=>(c.academicYear||year)===year&&(c.term||profileTerm(state))===term);
  }
  function infoFor(courseId){
    const planner=readJson(PLANNER_STORAGE_KEY);
    return planner[courseId]&&typeof planner[courseId]==='object'?planner[courseId]:{mode:'none',targetGrade:'3.0'};
  }
  function updateInfo(courseId,patch){
    const planner=readJson(PLANNER_STORAGE_KEY);
    const current=planner[courseId]&&typeof planner[courseId]==='object'?planner[courseId]:{mode:'none',targetGrade:'3.0'};
    planner[courseId]={...current,...patch};
    writeJson(PLANNER_STORAGE_KEY,planner);
  }
  function unitFor(course,info){
    const override=toNumber(info.units);
    return override===null?Math.max(0,Number(course.units)||0):Math.max(0,Math.min(20,override));
  }

  function computeCourse(course){
    const info=infoFor(course.id);
    const mode=info.mode||'none';
    let grade='';
    let raw=null;
    let detail='not added yet';

    if(mode==='equiv'){
      grade=ALL_GRADES.includes(String(info.grade||''))?String(info.grade):'';
      detail=grade?`final grade ${grade}`:'choose your final grade';
    }else if(mode==='raw'){
      raw=clampRaw(info.finalRaw);
      grade=raw===null?'':rawToGrade(raw);
      detail=raw===null?'enter your final raw percentage':conversionText(raw);
    }else if(mode==='midfinal'){
      const mid=clampRaw(info.midtermRaw);
      const fin=clampRaw(info.finalsRaw);
      if(mid!==null&&fin!==null){
        raw=(mid+fin)/2;
        grade=rawToGrade(raw);
        detail=`final raw ${conversionText(raw)}`;
      }else if(mid!==null){
        detail=`midterm ${pct(mid)} · finals not added yet`;
      }else{
        detail='add your midterm raw grade first';
      }
    }

    return {info,mode,grade,raw,detail,units:unitFor(course,info),included:isNumericGrade(grade)};
  }
  function computeGwa(courses){
    let units=0,weighted=0,included=0;
    courses.forEach(course=>{
      const result=computeCourse(course);
      if(result.included&&result.units>0){
        units+=result.units;
        weighted+=Number(result.grade)*result.units;
        included++;
      }
    });
    return {gwa:units>0?weighted/units:null,units,included,pending:Math.max(0,courses.length-included)};
  }

  function view(){return document.getElementById('view-grades');}
  function currentMode(){
    return document.querySelector('#view-grades .grades-main-tabs [data-grades-mode].active')?.dataset.gradesMode||'gradebook';
  }
  function rootFor(mode){
    return document.getElementById(mode==='gwa'?'gwaRoot':mode==='quickgwa'?'quickGwaRoot':'gradebookRoot');
  }
  function visibleRoot(){
    return ['gradebook','gwa','quickgwa'].map(rootFor).find(el=>el&&getComputedStyle(el).display!=='none')||null;
  }

  function ensureHeader(){
    const shell=view();
    const tabs=shell?.querySelector('.grades-main-tabs');
    if(!shell||!tabs) return;

    const title=shell.querySelector('.page-head-row h2');
    if(title) title.textContent='grades';

    let note=shell.querySelector('[data-grades-note="nu"]');
    if(!note){
      note=document.createElement('div');
      note.className='grades-nu-note-strip';
      note.dataset.gradesNote='nu';
      tabs.parentNode.insertBefore(note,tabs);
    }
    note.innerHTML=`<strong>Based on National University's zero-based grading system.</strong><span>Raw percentages are rounded to the nearest whole number before the grade equivalent. 95.50% becomes 96, or 4.0.</span>`;

    let guide=shell.querySelector('[data-grades-tool-guide]');
    if(!guide){
      guide=document.createElement('div');
      guide.className='grades-tool-guide';
      guide.dataset.gradesToolGuide='';
      guide.innerHTML='<span class="grades-step-no">01</span><div><strong>choose what you want to do</strong><small>switch between your gradebook, term GWA, and quick GWA</small></div>';
      tabs.insertAdjacentElement('beforebegin',guide);
    }

    const labels={
      gradebook:['course gradebook','real scores'],
      gwa:['term GWA planner','midterm + finals'],
      quickgwa:['quick GWA','final grades only']
    };
    tabs.querySelectorAll('[data-grades-mode]').forEach(btn=>{
      const copy=labels[btn.dataset.gradesMode];
      if(copy) btn.innerHTML=`<span>${copy[0]}</span><small>${copy[1]}</small>`;
    });

    ensureStage(tabs);
  }

  function ensureStage(tabs){
    const shell=view();
    if(!shell||shell.querySelector('#gradesContentStage')) return shell?.querySelector('#gradesContentStage')||null;
    const roots=['gradebookRoot','gwaRoot','quickGwaRoot'].map(id=>document.getElementById(id)).filter(Boolean);
    if(roots.length!==3) return null;

    const stage=document.createElement('div');
    stage.id='gradesContentStage';
    stage.className='grades-content-stage';
    tabs.insertAdjacentElement('afterend',stage);
    roots.forEach(root=>stage.appendChild(root));

    const overlay=document.createElement('div');
    overlay.className='grades-stage-loader';
    overlay.setAttribute('aria-live','polite');
    overlay.innerHTML='<div class="grades-stage-loader-card"><div class="grades-stage-word">cramchy.</div><div class="grades-stage-copy">organizing your grades...</div><div class="grades-stage-bar"><span></span></div></div>';
    stage.appendChild(overlay);
    return stage;
  }

  function beginStage(message='organizing your grades...'){
    const shell=view();
    const tabs=shell?.querySelector('.grades-main-tabs');
    const stage=shell?.querySelector('#gradesContentStage')||ensureStage(tabs);
    if(!stage) return;

    clearTimeout(stageFinishTimer);
    const current=visibleRoot();
    const h=current?Math.max(190,Math.ceil(current.getBoundingClientRect().height)):Math.max(190,Math.ceil(stage.getBoundingClientRect().height));
    stage.style.height=`${h}px`;
    stage.style.minHeight=`${h}px`;
    const copy=stage.querySelector('.grades-stage-copy');
    if(copy) copy.textContent=message;
    stage.classList.remove('is-ready');
    stage.classList.add('is-loading');
    stageStartedAt=performance.now();
    stageBusy=true;
  }

  function settleStage(){
    const stage=view()?.querySelector('#gradesContentStage');
    if(!stage){stageBusy=false;return;}
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const next=visibleRoot();
      const nextH=next?Math.max(190,Math.ceil(next.getBoundingClientRect().height)):190;
      void stage.offsetHeight;
      stage.style.height=`${nextH}px`;
      stage.style.minHeight=`${Math.min(nextH,190)}px`;

      const elapsed=performance.now()-stageStartedAt;
      const wait=Math.max(90,240-elapsed);
      clearTimeout(stageFinishTimer);
      stageFinishTimer=setTimeout(()=>{
        stage.classList.add('is-ready');
        setTimeout(()=>{
          stage.classList.remove('is-loading','is-ready');
          stage.style.height='auto';
          stage.style.minHeight='';
          stageBusy=false;
        },190);
      },wait);
    }));
  }

  function modeOptions(selected){
    return [
      ['none','none yet'],
      ['equiv','final grade equivalent'],
      ['raw','final raw percentage'],
      ['midfinal','midterm + finals']
    ].map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('');
  }
  function gradeOptions(selected){
    return `<option value="">choose grade</option>`+ALL_GRADES.map(g=>`<option value="${g}" ${String(selected||'')===g?'selected':''}>${g}</option>`).join('');
  }
  function targetPanel(info){
    const mid=clampRaw(info.midtermRaw);
    const fin=clampRaw(info.finalsRaw);
    const target=targetFor(info.targetGrade||'3.0');
    const finalRaw=mid!==null&&fin!==null?(mid+fin)/2:null;
    const needed=mid!==null?(target.cutoff*2-mid):null;
    const highest=mid!==null?(mid+100)/2:null;
    const neededDisplay=needed===null?'—':`${Math.max(0,needed).toFixed(2)}%`;
    const neededNote=needed===null?'add midterm raw':needed>100?`${target.grade} is not reachable with a 100% finals raw`:`needed in finals to reach ${target.grade}`;

    return `<div class="grades-target-grid">
      <div><span>what-if final raw</span><strong>${pct(finalRaw)}</strong><em>${finalRaw===null?'add a finals raw grade':`rounds to ${roundedRaw(finalRaw)} · equivalent ${rawToGrade(finalRaw)}`}</em></div>
      <div><span>needed finals raw</span><strong>${neededDisplay}</strong><em>${escapeHtml(neededNote)}</em></div>
      <div><span>highest possible</span><strong>${pct(highest)}</strong><em>${highest===null?'add midterm raw':`rounds to ${roundedRaw(highest)} · equivalent ${rawToGrade(highest)}`}</em></div>
    </div>`;
  }

  function courseCard(course,index){
    const result=computeCourse(course);
    const info=result.info;
    const accents=['berry','matcha','lavender','blue','peach'];
    const accent=accents[index%accents.length];
    let details='';

    if(result.mode==='equiv'){
      details=`<div class="grades-mode-fields"><div class="grades-field"><label>final grade equivalent</label><select data-term-field="grade" data-course="${attr(course.id)}">${gradeOptions(info.grade)}</select></div></div>`;
    }else if(result.mode==='raw'){
      details=`<div class="grades-mode-fields"><div class="grades-field"><label>final raw percentage</label><input data-term-field="finalRaw" data-course="${attr(course.id)}" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${attr(info.finalRaw??'')}" placeholder="95.50"></div><div class="grades-inline-result">${escapeHtml(result.detail)}</div></div>`;
    }else if(result.mode==='midfinal'){
      details=`<div class="grades-mode-fields">
        <div class="grades-two-fields">
          <div class="grades-field"><label>midterm raw %</label><input data-term-field="midtermRaw" data-course="${attr(course.id)}" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${attr(info.midtermRaw??'')}" placeholder="72"></div>
          <div class="grades-field"><label>finals raw %</label><input data-term-field="finalsRaw" data-course="${attr(course.id)}" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${attr(info.finalsRaw??'')}" placeholder="leave blank if none"></div>
          <div class="grades-field"><label>target grade</label><select data-term-field="targetGrade" data-course="${attr(course.id)}">${RAW_TARGETS.map(t=>`<option value="${t.grade}" ${(info.targetGrade||'3.0')===t.grade?'selected':''}>${t.grade} · ${t.cutoff.toFixed(2)}%+ final raw</option>`).join('')}</select></div>
        </div>
        ${targetPanel(info)}
      </div>`;
    }else{
      details='<div class="grades-mode-fields"><div class="grades-empty-choice">Nothing yet is okay — this course simply stays out of your GWA estimate for now.</div></div>';
    }

    return `<article class="grades-gwa-course-card" data-accent="${accent}">
      <div class="grades-card-top">
        <div><h4>${escapeHtml(course.name||'Untitled course')}</h4><p>${escapeHtml(course.code||'no code')} · ${escapeHtml(course.term||'Term 1')}</p></div>
        <div class="grades-grade-pill">${escapeHtml(result.grade||'pending')}</div>
      </div>
      <div class="grades-card-controls">
        <div class="grades-field"><label>what do you have?</label><select data-term-field="mode" data-course="${attr(course.id)}">${modeOptions(result.mode)}</select></div>
        <div class="grades-field unit-field"><label>units</label><input data-term-field="units" data-course="${attr(course.id)}" type="number" min="0" max="20" step="0.5" inputmode="decimal" value="${attr(result.units)}"></div>
      </div>
      ${details}
      <div class="grades-card-foot"><span>${result.included?'included in GWA':'not included yet'}</span><span>${escapeHtml(result.detail)}</span></div>
    </article>`;
  }

  function renderTermGwa(){
    const root=document.getElementById('gwaRoot');
    if(!root||getComputedStyle(root).display==='none') return;
    const state=readJson(APP_STORAGE_KEY);
    const terms=termsFor(state);
    const term=currentTerm(state);
    const courses=coursesFor(state,term);
    const calc=computeGwa(courses);
    const gwa=calc.gwa===null?'—':calc.gwa.toFixed(2);
    const dean=deanLabel(calc.gwa);

    suppressGwaObserver=true;
    root.innerHTML=`<div class="grades-gwa-board" data-term-gwa-render="stable">
      <div class="grades-gwa-hero-card">
        <div class="grades-gwa-copy">
          <div class="grades-gwa-kicker">term GWA planner</div>
          <h3>add whatever grade you have.</h3>
          <p>Final equivalent, raw percentage, or your midterm + finals raw grades — choose what you actually have for each course.</p>
        </div>
        <div class="grades-gwa-result">
          <span>estimated GWA</span>
          <strong>${gwa}</strong>
          <em>${dean?escapeHtml(dean):(calc.gwa===null?'add a final grade to start':'weighted by course units')}</em>
        </div>
      </div>

      <div class="grades-gwa-toolbar">
        <div class="grades-field term-field"><label>term</label><select id="gradesTermSelect">${terms.map(t=>`<option value="${attr(t)}" ${t===term?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="grades-nu-formula"><strong>NU final raw:</strong> (midterm raw + finals raw) ÷ 2 · then round before the equivalent</div>
      </div>

      <div class="grades-gwa-summary-row">
        <div><span>courses included</span><strong>${calc.included}</strong><em>with numeric final grades</em></div>
        <div><span>units included</span><strong>${calc.units.toFixed(1)}</strong><em>used to weight your GWA</em></div>
        <div><span>still pending</span><strong>${calc.pending}</strong><em>not counted yet</em></div>
      </div>

      <div class="grades-gwa-course-list">
        ${courses.length?courses.map(courseCard).join(''):`<div class="grades-gwa-empty"><strong>no courses here yet</strong><span>Add courses for ${escapeHtml(term)} first.</span></div>`}
      </div>

      <div class="grades-dean-note"><strong>Dean's List:</strong> 3.25–3.49 = Second Honors · 3.50 and above = First Honors</div>
    </div>`;

    bindTermGwa(root);
    requestAnimationFrame(()=>{suppressGwaObserver=false;});
  }

  function bindTermGwa(root){
    root.querySelector('#gradesTermSelect')?.addEventListener('change',e=>{
      beginStage('updating your term...');
      setCurrentTerm(e.target.value);
      renderTermGwa();
      settleStage();
    });

    root.querySelectorAll('[data-term-field]').forEach(el=>{
      el.addEventListener('change',()=>{
        beginStage('recalculating your grades...');
        const courseId=el.dataset.course;
        const field=el.dataset.termField;
        let value=el.value;
        if(field==='units'){
          const n=toNumber(value);
          value=n===null?'':Math.max(0,Math.min(20,n));
        }
        updateInfo(courseId,{[field]:value});
        renderTermGwa();
        settleStage();
      });
    });
  }

  function patchGradebook(){
    const root=document.getElementById('gradebookRoot');
    if(!root||getComputedStyle(root).display==='none') return;
    const app=readJson(APP_STORAGE_KEY);
    const courses=new Map((app.courses||[]).map(c=>[String(c.id),c]));

    root.querySelectorAll('.grade-course-card[data-grade-course]').forEach(card=>{
      const id=card.dataset.gradeCourse;
      let raw=null;
      try{if(typeof overallGrade==='function') raw=overallGrade(id);}catch(e){}
      if(raw===null||!Number.isFinite(Number(raw))) return;
      const small=card.querySelector('.small');
      const course=courses.get(String(id));
      if(small) small.textContent=`rounded ${roundedRaw(raw)} · equivalent ${rawToGrade(raw)} · ${course?.code||'no code'}`;
    });

    try{
      const active=root.querySelector('.grade-course-card.active[data-grade-course]');
      if(active&&typeof termGrade==='function'&&typeof overallGrade==='function'){
        const id=active.dataset.gradeCourse;
        const values=[termGrade(id,'midterms'),termGrade(id,'finals'),overallGrade(id)];
        root.querySelectorAll('.grade-overview-row .grade-overview-card').forEach((card,index)=>{
          const raw=values[index];
          if(raw===null||!Number.isFinite(Number(raw))) return;
          const note=card.querySelector('.small-note');
          if(note) note.textContent=`${conversionText(raw)}${index===2?' · Midterms 50% / Finals 50%':''}`;
        });
      }
    }catch(e){}
  }

  function queueGradebookPatch(){
    if(gradebookPatchQueued) return;
    gradebookPatchQueued=true;
    requestAnimationFrame(()=>{
      gradebookPatchQueued=false;
      patchGradebook();
    });
  }

  function settleAfterBaseSwitch(){
    setTimeout(()=>{
      if(currentMode()==='gwa') renderTermGwa();
      else if(currentMode()==='gradebook') patchGradebook();
      settleStage();
    },0);
  }

  function installTabSwitch(){
    const tabs=document.querySelector('#view-grades .grades-main-tabs');
    if(!tabs||tabs.dataset.gradesStageBound==='yes') return;
    tabs.dataset.gradesStageBound='yes';
    tabs.addEventListener('click',event=>{
      const button=event.target.closest('[data-grades-mode]');
      if(!button||button.classList.contains('active')) return;
      if(stageBusy){
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      beginStage('switching your grade view...');
      settleAfterBaseSwitch();
    },true);
  }

  function installGradebookSwitch(){
    document.addEventListener('click',event=>{
      const course=event.target.closest('#gradebookRoot .grade-course-card[data-grade-course]');
      const period=event.target.closest('#gradebookRoot [data-grade-period]');
      const trigger=course||period;
      if(!trigger) return;
      if(trigger.classList.contains('active')) return;
      if(stageBusy){
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      beginStage(course?'opening your subject...':'switching grading period...');
      setTimeout(()=>{
        patchGradebook();
        settleStage();
      },0);
    },true);
  }

  function installGwaObserver(){
    const root=document.getElementById('gwaRoot');
    if(!root||root.dataset.stableGwaObserved==='yes') return;
    root.dataset.stableGwaObserved='yes';
    new MutationObserver(()=>{
      if(suppressGwaObserver||currentMode()!=='gwa'||getComputedStyle(root).display==='none') return;
      if(root.querySelector('[data-term-gwa-render="stable"]')) return;
      queueMicrotask(()=>renderTermGwa());
    }).observe(root,{childList:true});
  }

  function installGradebookObserver(){
    const root=document.getElementById('gradebookRoot');
    if(!root||root.dataset.gradesPatchObserved==='yes') return;
    root.dataset.gradesPatchObserved='yes';
    new MutationObserver(()=>queueGradebookPatch()).observe(root,{childList:true});
  }

  function installEntryGuard(){
    document.addEventListener('click',event=>{
      if(!event.target.closest('[data-tab="grades"],[data-open-tab="grades"]')) return;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        ensureHeader();
        installTabSwitch();
        installGwaObserver();
        installGradebookObserver();
        if(currentMode()==='gwa') renderTermGwa();
        else patchGradebook();
      }));
    },true);
  }

  function install(){
    ensureHeader();
    installTabSwitch();
    installGradebookSwitch();
    installGwaObserver();
    installGradebookObserver();
    installEntryGuard();
    if(currentMode()==='gwa') renderTermGwa();
    else patchGradebook();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
