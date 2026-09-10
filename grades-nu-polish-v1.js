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
  const CATEGORIES=['ww','pt','attendance','exam'];
  const DEFAULT_SCHEME={ww:30,pt:20,attendance:10,exam:40};

  let suppressGwaObserver=false;
  let switchTimer=null;
  let settleTimer=null;
  let gradebookPatchQueued=false;

  function readJson(key){
    try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(e){return {};}
  }
  function writeJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));}catch(e){console.warn('Grades save skipped.',e);}
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
  function roundedRaw(value){
    const n=toNumber(value);
    return n===null?null:Math.round(n);
  }
  function pct(value){
    const n=toNumber(value);
    return n===null?'—':`${n.toFixed(2)}%`;
  }
  function rawToGrade(value){
    const rounded=roundedRaw(value);
    if(rounded===null) return '';
    if(rounded>=96) return '4.0';
    if(rounded>=90) return '3.5';
    if(rounded>=84) return '3.0';
    if(rounded>=78) return '2.5';
    if(rounded>=72) return '2.0';
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
  function view(){return document.getElementById('view-grades');}
  function rootFor(mode){
    return document.getElementById(mode==='gwa'?'gwaRoot':mode==='quickgwa'?'quickGwaRoot':'gradebookRoot');
  }
  function visibleRoot(){
    return ['gradebook','gwa','quickgwa'].map(rootFor).find(el=>el&&getComputedStyle(el).display!=='none')||null;
  }
  function currentMode(){
    return document.querySelector('#view-grades .grades-main-tabs [data-grades-mode].active')?.dataset.gradesMode||'gradebook';
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
  function courseScheme(course){
    const scheme=course?.gradingScheme&&typeof course.gradingScheme==='object'?course.gradingScheme:DEFAULT_SCHEME;
    return {
      ww:Number.isFinite(+scheme.ww)?+scheme.ww:30,
      pt:Number.isFinite(+scheme.pt)?+scheme.pt:20,
      attendance:Number.isFinite(+scheme.attendance)?+scheme.attendance:10,
      exam:Number.isFinite(+scheme.exam)?+scheme.exam:40
    };
  }
  function assessmentPct(item){
    const total=Number(item?.total)||0;
    return total>0?(Number(item.score)||0)/total*100:null;
  }
  function categoryStats(app,courseId,period,key){
    const arr=(app.gradebook?.[courseId]?.[period]||[]).filter(a=>a&&a.category===key);
    let earned=0,total=0;
    arr.forEach(a=>{earned+=Number(a.score)||0;total+=Number(a.total)||0;});
    return {count:arr.length,pct:total>0?(earned/total*100):null};
  }
  function termGradeFromApp(app,course,period){
    if(!course) return null;
    const scheme=courseScheme(course);
    let sum=0,used=0;
    CATEGORIES.forEach(key=>{
      const st=categoryStats(app,course.id,period,key);
      if(st.pct!==null){
        const weight=scheme[key]||0;
        sum+=st.pct*weight;
        used+=weight;
      }
    });
    return used>0?sum/used:null;
  }
  function overallFromApp(app,course){
    const mid=termGradeFromApp(app,course,'midterms');
    const fin=termGradeFromApp(app,course,'finals');
    if(mid!==null&&fin!==null) return (mid+fin)/2;
    if(mid!==null) return mid;
    if(fin!==null) return fin;
    return null;
  }

  function computeTermCourse(course){
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
      const result=computeTermCourse(course);
      if(result.included&&result.units>0){
        units+=result.units;
        weighted+=Number(result.grade)*result.units;
        included++;
      }
    });
    return {gwa:units>0?weighted/units:null,units,included,pending:Math.max(0,courses.length-included)};
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
    note.innerHTML=`<strong>Based on National University's zero-based grading system.</strong><span>Raw percentages round to the nearest whole number before the grade equivalent. Example: 95.50% becomes 96, or 4.0.</span>`;

    const labels={
      gradebook:['course gradebook','real scores'],
      gwa:['term GWA planner','midterm + finals'],
      quickgwa:['quick GWA','final grades only']
    };
    tabs.querySelectorAll('[data-grades-mode]').forEach(btn=>{
      const copy=labels[btn.dataset.gradesMode];
      if(copy) btn.innerHTML=`<span>${copy[0]}</span><small>${copy[1]}</small>`;
    });

    ensureCalmLoader(shell,tabs);
  }
  function ensureCalmLoader(shell,tabs){
    if(shell.querySelector('#gradesCalmLoader')) return;
    const loader=document.createElement('div');
    loader.id='gradesCalmLoader';
    loader.className='grades-calm-loader';
    loader.setAttribute('aria-live','polite');
    loader.innerHTML=`<div class="grades-calm-card"><div class="grades-calm-word">cramchy.</div><div class="grades-calm-sub">organizing your grades...</div><div class="grades-calm-bar"><span></span></div></div>`;
    tabs.insertAdjacentElement('afterend',loader);
  }
  function beginTabSwitch(){
    const shell=view();
    if(!shell) return;
    const root=visibleRoot();
    const height=root?Math.max(180,Math.ceil(root.getBoundingClientRect().height)):240;
    shell.style.setProperty('--grades-calm-height',`${height}px`);
    shell.dataset.gradesCalm='switching';
    clearTimeout(switchTimer);
  }
  function finishTabSwitch(){
    const shell=view();
    if(!shell) return;
    clearTimeout(switchTimer);
    switchTimer=setTimeout(()=>{
      patchVisible();
      shell.dataset.gradesCalm='';
      shell.style.removeProperty('--grades-calm-height');
      const root=visibleRoot();
      if(root){
        root.classList.remove('grades-calm-enter');
        void root.offsetWidth;
        root.classList.add('grades-calm-enter');
        setTimeout(()=>root.classList.remove('grades-calm-enter'),240);
      }
    },185);
  }
  function beginRootSettle(root){
    if(!root||getComputedStyle(root).display==='none') return;
    root.style.setProperty('--grades-root-height',`${Math.max(160,Math.ceil(root.getBoundingClientRect().height))}px`);
    root.classList.add('grades-root-settling');
    clearTimeout(settleTimer);
  }
  function finishRootSettle(root){
    if(!root) return;
    clearTimeout(settleTimer);
    settleTimer=setTimeout(()=>{
      patchVisible();
      root.classList.remove('grades-root-settling');
      root.style.removeProperty('--grades-root-height');
      root.classList.remove('grades-calm-enter');
      void root.offsetWidth;
      root.classList.add('grades-calm-enter');
      setTimeout(()=>root.classList.remove('grades-calm-enter'),220);
    },170);
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
    const result=computeTermCourse(course);
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
      details=`<div class="grades-mode-fields"><div class="grades-empty-choice">Nothing yet is okay — this course stays out of your GWA estimate for now.</div></div>`;
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
          <p>Choose final grade, raw percentage, or midterm + finals per course. Cramchy rounds raw grades before assigning the NU equivalent.</p>
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
      beginRootSettle(root);
      setCurrentTerm(e.target.value);
      renderTermGwa();
      finishRootSettle(root);
    });

    root.querySelectorAll('[data-term-field]').forEach(el=>{
      el.addEventListener('change',()=>{
        beginRootSettle(root);
        const courseId=el.dataset.course;
        const field=el.dataset.termField;
        let value=el.value;
        if(field==='units'){
          const n=toNumber(value);
          value=n===null?'':Math.max(0,Math.min(20,n));
        }
        updateInfo(courseId,{[field]:value});
        renderTermGwa();
        finishRootSettle(root);
      });
    });
  }

  function patchGradebook(){
    const root=document.getElementById('gradebookRoot');
    if(!root||getComputedStyle(root).display==='none') return;
    const app=readJson(APP_STORAGE_KEY);
    const courses=new Map((app.courses||[]).map(c=>[String(c.id),c]));

    root.querySelectorAll('.grade-course-card[data-grade-course]').forEach(card=>{
      const course=courses.get(String(card.dataset.gradeCourse));
      if(!course) return;
      const raw=overallFromApp(app,course);
      const small=card.querySelector('.small');
      if(raw===null){
        if(small) small.textContent=`no scores yet · ${course.code||'no code'}`;
        return;
      }
      if(small) small.textContent=`rounds to ${roundedRaw(raw)} · equivalent ${rawToGrade(raw)} · ${course.code||'no code'}`;
    });

    const active=root.querySelector('.grade-course-card.active[data-grade-course]');
    const course=active?courses.get(String(active.dataset.gradeCourse)):null;
    if(course){
      const values=[termGradeFromApp(app,course,'midterms'),termGradeFromApp(app,course,'finals'),overallFromApp(app,course)];
      root.querySelectorAll('.grade-overview-row .grade-overview-card').forEach((card,index)=>{
        const raw=values[index];
        const note=card.querySelector('.small-note');
        if(!note) return;
        note.textContent=raw===null?'no scores':conversionText(raw)+(index===2?' · Midterms 50% / Finals 50%':'');
      });
    }
  }
  function patchVisible(){
    ensureHeader();
    patchGradebook();
    if(currentMode()==='gwa') renderTermGwa();
  }
  function queueGradebookPatch(){
    if(gradebookPatchQueued) return;
    gradebookPatchQueued=true;
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        gradebookPatchQueued=false;
        patchVisible();
      });
    });
  }

  function installTabSwitch(){
    const tabs=document.querySelector('#view-grades .grades-main-tabs');
    if(!tabs||tabs.dataset.gradesCalmTabs==='yes') return;
    tabs.dataset.gradesCalmTabs='yes';
    tabs.addEventListener('click',event=>{
      const button=event.target.closest('[data-grades-mode]');
      if(!button||button.classList.contains('active')) return;
      beginTabSwitch();
      setTimeout(()=>{
        patchVisible();
        finishTabSwitch();
      },45);
    },true);
  }
  function installGradebookStabilizer(){
    document.addEventListener('click',event=>{
      const trigger=event.target.closest('#view-grades .grade-course-card[data-grade-course], #view-grades [data-grade-period]');
      if(!trigger) return;
      const root=document.getElementById('gradebookRoot');
      beginRootSettle(root);
      queueGradebookPatch();
      setTimeout(()=>finishRootSettle(root),50);
    },true);
  }
  function installObservers(){
    const gwa=document.getElementById('gwaRoot');
    if(gwa&&gwa.dataset.gradesCalmObserved!=='yes'){
      gwa.dataset.gradesCalmObserved='yes';
      new MutationObserver(()=>{
        if(suppressGwaObserver||currentMode()!=='gwa'||getComputedStyle(gwa).display==='none') return;
        if(gwa.querySelector('[data-term-gwa-render="stable"]')) return;
        renderTermGwa();
      }).observe(gwa,{childList:true});
    }
    const gb=document.getElementById('gradebookRoot');
    if(gb&&gb.dataset.gradesPatchObserved!=='yes'){
      gb.dataset.gradesPatchObserved='yes';
      new MutationObserver(()=>queueGradebookPatch()).observe(gb,{childList:true,subtree:false});
    }
  }
  function installEntryGuard(){
    document.addEventListener('click',event=>{
      if(!event.target.closest('[data-tab="grades"],[data-open-tab="grades"]')) return;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        ensureHeader();
        installTabSwitch();
        installObservers();
        patchVisible();
      }));
    },true);
  }

  function install(){
    ensureHeader();
    installTabSwitch();
    installGradebookStabilizer();
    installObservers();
    installEntryGuard();
    patchVisible();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
