(function(){
  const APP_STORAGE_KEY='strawberryMatchaMidtermsState_v1';
  const PLANNER_STORAGE_KEY='cramchyTermGwaPlanner_v2';
  const TERM_KEY='cramchyGradesSelectedTerm';
  const NUMERIC_GRADES=['4.0','3.5','3.0','2.5','2.0','1.5','1.0'];
  const ALL_GRADES=['4.0','3.5','3.0','2.5','2.0','1.5','1.0','R','INC','P','F'];
  const RAW_TARGETS=[
    {grade:'4.0',min:96},
    {grade:'3.5',min:90},
    {grade:'3.0',min:84},
    {grade:'2.5',min:78},
    {grade:'2.0',min:72}
  ];

  let suppressGwaObserver=false;
  let switchTimer=null;
  let loaderStartedAt=0;

  function readAppState(){
    try{return JSON.parse(localStorage.getItem(APP_STORAGE_KEY)||'{}')||{};}catch(e){return {};}
  }
  function readPlanner(){
    try{return JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)||'{}')||{};}catch(e){return {};}
  }
  function writePlanner(value){
    try{localStorage.setItem(PLANNER_STORAGE_KEY,JSON.stringify(value));}catch(e){console.warn('Term GWA planner save skipped.',e);}
  }
  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
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
  function pct(value){
    const n=toNumber(value);
    return n===null?'—':`${n.toFixed(2)}%`;
  }
  function rawToGrade(raw){
    const p=toNumber(raw);
    if(p===null) return '';
    if(p>=96) return '4.0';
    if(p>=90) return '3.5';
    if(p>=84) return '3.0';
    if(p>=78) return '2.5';
    if(p>=72) return '2.0';
    return 'R';
  }
  function targetMinimum(grade){
    return RAW_TARGETS.find(x=>x.grade===String(grade))?.min ?? 84;
  }
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
    const planner=readPlanner();
    return planner[courseId]&&typeof planner[courseId]==='object'?planner[courseId]:{mode:'none',targetGrade:'3.0'};
  }
  function updateInfo(courseId,patch){
    const planner=readPlanner();
    const current=planner[courseId]&&typeof planner[courseId]==='object'?planner[courseId]:{mode:'none',targetGrade:'3.0'};
    planner[courseId]={...current,...patch};
    writePlanner(planner);
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
      detail=raw===null?'enter your final raw percentage':`${pct(raw)} → ${grade}`;
    }else if(mode==='midfinal'){
      const mid=clampRaw(info.midtermRaw);
      const fin=clampRaw(info.finalsRaw);
      if(mid!==null&&fin!==null){
        raw=(mid+fin)/2;
        grade=rawToGrade(raw);
        detail=`final raw ${pct(raw)} → ${grade}`;
      }else if(mid!==null){
        detail=`midterm ${pct(mid)} · finals not added yet`;
      }else{
        detail='add your midterm raw grade first';
      }
    }

    return {
      info,mode,grade,raw,detail,
      units:unitFor(course,info),
      included:isNumericGrade(grade)
    };
  }
  function computeGwa(courses){
    let units=0;
    let weighted=0;
    let included=0;
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

  function ensureHeader(){
    const view=document.getElementById('view-grades');
    const tabs=view?.querySelector('.grades-main-tabs');
    if(!view||!tabs) return;

    const title=view.querySelector('.page-head-row h2');
    if(title) title.textContent='grades';

    let note=view.querySelector('[data-grades-note="nu"]');
    if(!note){
      note=document.createElement('div');
      note.className='grades-nu-note-strip';
      note.dataset.gradesNote='nu';
      tabs.parentNode.insertBefore(note,tabs);
    }
    note.innerHTML=`<strong>Based on National University's zero-based grading system.</strong><span>Track your scores, estimate your final grade, or calculate your GWA.</span>`;

    const labels={
      gradebook:['course gradebook','real scores'],
      gwa:['term GWA planner','midterm + finals'],
      quickgwa:['quick GWA','final grades only']
    };
    tabs.querySelectorAll('[data-grades-mode]').forEach(btn=>{
      const copy=labels[btn.dataset.gradesMode];
      if(copy) btn.innerHTML=`<span>${copy[0]}</span><small>${copy[1]}</small>`;
    });

    ensureLoader(view,tabs);
  }

  function ensureLoader(view,tabs){
    if(view.querySelector('#gradesSwitchLoader')) return;
    const loader=document.createElement('div');
    loader.id='gradesSwitchLoader';
    loader.className='grades-switch-loader';
    loader.setAttribute('aria-live','polite');
    loader.innerHTML=`<span>loading grades...</span><div class="grades-switch-bar"><i></i></div>`;
    tabs.insertAdjacentElement('afterend',loader);
  }

  function startSwitch(){
    const view=document.getElementById('view-grades');
    if(!view) return;
    clearTimeout(switchTimer);
    loaderStartedAt=performance.now();
    view.classList.add('grades-is-switching');
  }
  function finishSwitch(){
    const view=document.getElementById('view-grades');
    if(!view) return;
    const elapsed=performance.now()-loaderStartedAt;
    const wait=Math.max(0,90-elapsed);
    clearTimeout(switchTimer);
    switchTimer=setTimeout(()=>{
      requestAnimationFrame(()=>view.classList.remove('grades-is-switching'));
    },wait);
  }

  function currentMode(){
    return document.querySelector('#view-grades .grades-main-tabs [data-grades-mode].active')?.dataset.gradesMode||'gradebook';
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
    const target=info.targetGrade||'3.0';
    const targetRaw=targetMinimum(target);
    const finalRaw=mid!==null&&fin!==null?(mid+fin)/2:null;
    const needed=mid!==null?(targetRaw*2-mid):null;
    const highest=mid!==null?(mid+100)/2:null;
    const neededDisplay=needed===null?'—':`${Math.max(0,needed).toFixed(2)}%`;
    const neededNote=needed===null?'add midterm raw':needed>100?`${target} is not reachable with a 100% finals raw`:`needed in finals to reach ${target}`;

    return `<div class="grades-target-grid">
      <div><span>what-if final raw</span><strong>${pct(finalRaw)}</strong><em>${finalRaw===null?'add a finals raw grade':`equivalent ${rawToGrade(finalRaw)}`}</em></div>
      <div><span>needed finals raw</span><strong>${neededDisplay}</strong><em>${escapeHtml(neededNote)}</em></div>
      <div><span>highest possible</span><strong>${pct(highest)}</strong><em>${highest===null?'add midterm raw':`if finals raw is 100% · ${rawToGrade(highest)}`}</em></div>
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
      details=`<div class="grades-mode-fields"><div class="grades-field"><label>final raw percentage</label><input data-term-field="finalRaw" data-course="${attr(course.id)}" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${attr(info.finalRaw??'')}" placeholder="96"></div><div class="grades-inline-result">${escapeHtml(result.detail)}</div></div>`;
    }else if(result.mode==='midfinal'){
      details=`<div class="grades-mode-fields">
        <div class="grades-two-fields">
          <div class="grades-field"><label>midterm raw %</label><input data-term-field="midtermRaw" data-course="${attr(course.id)}" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${attr(info.midtermRaw??'')}" placeholder="72"></div>
          <div class="grades-field"><label>finals raw %</label><input data-term-field="finalsRaw" data-course="${attr(course.id)}" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${attr(info.finalsRaw??'')}" placeholder="leave blank if none"></div>
          <div class="grades-field"><label>target grade</label><select data-term-field="targetGrade" data-course="${attr(course.id)}">${RAW_TARGETS.map(t=>`<option value="${t.grade}" ${(info.targetGrade||'3.0')===t.grade?'selected':''}>${t.grade} · ${t.min}% final raw</option>`).join('')}</select></div>
        </div>
        ${targetPanel(info)}
      </div>`;
    }else{
      details=`<div class="grades-mode-fields"><div class="grades-empty-choice">Nothing yet is okay — this course simply stays out of your GWA estimate for now.</div></div>`;
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
    if(!root||root.style.display==='none') return;
    const state=readAppState();
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
          <p>Final equivalent, raw percentage, or just your midterm grade — choose what you have for each course.</p>
        </div>
        <div class="grades-gwa-result">
          <span>estimated GWA</span>
          <strong>${gwa}</strong>
          <em>${dean?escapeHtml(dean):(calc.gwa===null?'add a final grade to start':'weighted by course units')}</em>
        </div>
      </div>

      <div class="grades-gwa-toolbar">
        <div class="grades-field term-field"><label>term</label><select id="gradesTermSelect">${terms.map(t=>`<option value="${attr(t)}" ${t===term?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="grades-nu-formula"><strong>NU final raw:</strong> (midterm raw + finals raw) ÷ 2</div>
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
      setCurrentTerm(e.target.value);
      renderTermGwa();
    });

    root.querySelectorAll('[data-term-field]').forEach(el=>{
      el.addEventListener('change',()=>{
        const courseId=el.dataset.course;
        const field=el.dataset.termField;
        let value=el.value;
        if(field==='units'){
          const n=toNumber(value);
          value=n===null?'':Math.max(0,Math.min(20,n));
        }
        updateInfo(courseId,{[field]:value});
        renderTermGwa();
      });
    });
  }

  function refreshVisibleMode(){
    ensureHeader();
    const mode=currentMode();
    if(mode==='gwa') renderTermGwa();
    finishSwitch();
  }

  function installTabGuard(){
    const tabs=document.querySelector('#view-grades .grades-main-tabs');
    if(!tabs||tabs.dataset.stableGradesBound==='yes') return;
    tabs.dataset.stableGradesBound='yes';
    tabs.addEventListener('click',event=>{
      const button=event.target.closest('[data-grades-mode]');
      if(!button) return;
      startSwitch();
      setTimeout(refreshVisibleMode,0);
    },true);
  }

  function installGwaObserver(){
    const root=document.getElementById('gwaRoot');
    if(!root||root.dataset.stableGwaObserved==='yes') return;
    root.dataset.stableGwaObserved='yes';
    new MutationObserver(()=>{
      if(suppressGwaObserver||currentMode()!=='gwa'||root.style.display==='none') return;
      if(root.querySelector('[data-term-gwa-render="stable"]')) return;
      startSwitch();
      queueMicrotask(()=>{
        renderTermGwa();
        finishSwitch();
      });
    }).observe(root,{childList:true});
  }

  function installGradesEntryGuard(){
    document.addEventListener('click',event=>{
      const gradesNav=event.target.closest('[data-tab="grades"],[data-open-tab="grades"]');
      if(!gradesNav) return;
      setTimeout(()=>{
        ensureHeader();
        installTabGuard();
        installGwaObserver();
        if(currentMode()==='gwa') renderTermGwa();
      },0);
    },true);
  }

  function install(){
    ensureHeader();
    installTabGuard();
    installGwaObserver();
    installGradesEntryGuard();
    if(currentMode()==='gwa') renderTermGwa();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
