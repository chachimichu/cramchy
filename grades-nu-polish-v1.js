(function(){
  const STORAGE_KEY='strawberryMatchaMidtermsState_v1';
  const TERM_KEY='cramchyGradesSelectedTerm';
  const GRADE_OPTIONS=['4.0','3.5','3.0','2.5','2.0','1.5','1.0','R','INC','P','F'];
  const NUMERIC_GRADES=['4.0','3.5','3.0','2.5','2.0','1.5','1.0'];
  const RAW_TARGETS=[
    {grade:'4.0',min:96},
    {grade:'3.5',min:90},
    {grade:'3.0',min:84},
    {grade:'2.5',min:78},
    {grade:'2.0',min:72}
  ];
  let rendering=false;
  let scheduled=null;

  function readState(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(e){return {};}
  }
  function writeState(state){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){console.warn('Grades save skipped.',e);}
  }
  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function attr(value){return escapeHtml(value).replace(/`/g,'&#96;');}
  function toNum(value){
    if(value===''||value===null||value===undefined) return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }
  function clampRaw(value){
    const n=toNum(value);
    if(n===null) return null;
    return Math.max(0,Math.min(100,n));
  }
  function pct(value){
    const n=toNum(value);
    return n===null?'—':`${n.toFixed(2)}%`;
  }
  function rawToGrade(raw){
    const p=toNum(raw);
    if(p===null) return '';
    if(p>=96) return '4.0';
    if(p>=90) return '3.5';
    if(p>=84) return '3.0';
    if(p>=78) return '2.5';
    if(p>=72) return '2.0';
    return 'R';
  }
  function targetMin(grade){
    const item=RAW_TARGETS.find(x=>x.grade===String(grade));
    return item?item.min:84;
  }
  function isNumericGrade(grade){return NUMERIC_GRADES.includes(String(grade));}
  function deanLabel(gwa){
    const g=toNum(gwa);
    if(g===null) return '';
    if(g>=3.50) return "Dean's List — First Honors";
    if(g>=3.25) return "Dean's List — Second Honors";
    return '';
  }
  function profileYear(state){return state.profile?.academicYear||'2026–2027';}
  function profileTerm(state){return state.profile?.term||'Term 1';}
  function allTerms(state){
    const set=new Set();
    (state.courses||[]).forEach(c=>set.add(c.term||profileTerm(state)));
    set.add(profileTerm(state));
    return [...set].filter(Boolean);
  }
  function selectedTerm(state){
    const terms=allTerms(state);
    const saved=localStorage.getItem(TERM_KEY);
    if(saved&&terms.includes(saved)) return saved;
    return terms.includes(profileTerm(state))?profileTerm(state):terms[0];
  }
  function setSelectedTerm(term){try{localStorage.setItem(TERM_KEY,term);}catch(e){}}
  function coursesForTerm(state,term){
    const ay=profileYear(state);
    return (state.courses||[]).filter(c=>(c.academicYear||ay)===ay && (c.term||profileTerm(state))===term);
  }
  function termInfo(course){
    if(!course.cramchyTermGwa || typeof course.cramchyTermGwa!=='object') course.cramchyTermGwa={mode:'none'};
    if(!course.cramchyTermGwa.mode) course.cramchyTermGwa.mode=course.gwaFinalGrade?'equiv':'none';
    return course.cramchyTermGwa;
  }
  function gradeOptions(selected,placeholder='choose grade'){
    return [`<option value="">${placeholder}</option>`].concat(GRADE_OPTIONS.map(g=>`<option value="${g}" ${String(selected||'')===g?'selected':''}>${g}</option>`)).join('');
  }
  function modeOptions(selected){
    const modes=[
      ['equiv','final grade equivalent'],
      ['raw','final raw percentage'],
      ['midfinal','midterm + finals'],
      ['none','none yet']
    ];
    return modes.map(([v,l])=>`<option value="${v}" ${selected===v?'selected':''}>${l}</option>`).join('');
  }
  function computeCourse(course){
    const info=termInfo(course);
    const mode=info.mode||'none';
    let grade='',raw=null,note='not included yet';
    if(mode==='equiv'){
      grade=info.grade || course.gwaFinalGrade || '';
      note=grade?`using final grade equivalent ${grade}`:'choose the final grade equivalent';
    }else if(mode==='raw'){
      raw=clampRaw(info.finalRaw);
      grade=raw===null?'':rawToGrade(raw);
      note=raw===null?'enter final raw percentage':`${pct(raw)} converts to ${grade}`;
    }else if(mode==='midfinal'){
      const mid=clampRaw(info.midtermRaw), fin=clampRaw(info.finalsRaw);
      if(mid!==null&&fin!==null){
        raw=(mid+fin)/2;
        grade=rawToGrade(raw);
        note=`${pct(mid)} midterm + ${pct(fin)} finals → ${pct(raw)}`;
      }else if(mid!==null){
        const highest=(mid+100)/2;
        note=`finals not added yet · highest possible ${pct(highest)} (${rawToGrade(highest)})`;
      }else{
        note='enter midterm raw first';
      }
    }
    const include=isNumericGrade(grade);
    return {mode,grade,raw,note,include,units:Number(course.units)||0};
  }
  function computeGwa(courses){
    let total=0,weighted=0,included=0,pending=0;
    courses.forEach(course=>{
      const c=computeCourse(course);
      if(c.include && c.units>0){weighted+=Number(c.grade)*c.units;total+=c.units;included++;}
      else pending++;
    });
    const gwa=total>0?weighted/total:null;
    return {gwa,total,included,pending};
  }
  function updateCourse(courseId,updater){
    const state=readState();
    const course=(state.courses||[]).find(c=>c.id===courseId);
    if(!course) return;
    const info=termInfo(course);
    updater(course,info,state);
    const computed=computeCourse(course);
    course.gwaFinalGrade=computed.grade||'';
    course.gwaMode=computed.include?'include':'auto';
    writeState(state);
    renderGwa(true);
  }
  function cleanGradesHeader(){
    const view=document.getElementById('view-grades');
    const tabs=view?.querySelector('.grades-main-tabs');
    if(!view||!tabs) return;
    const head=view.querySelector('.page-head-row h2');
    if(head) head.textContent='grades';
    let note=view.querySelector('[data-grades-note="nu"]');
    if(!note){
      note=document.createElement('div');
      note.className='grades-nu-note-strip';
      note.setAttribute('data-grades-note','nu');
      tabs.parentNode.insertBefore(note,tabs);
    }
    note.innerHTML=`<strong>Based on National University's zero-based grading system.</strong><span>Subject grades use fixed equivalents. GWA/CGWA can have decimals because it averages grades with units.</span>`;
    const labels={gradebook:'course gradebook',gwa:'term GWA planner',quickgwa:'quick GWA'};
    const subs={gradebook:'real scores',gwa:'final grades',quickgwa:'fast compute'};
    tabs.querySelectorAll('[data-grades-mode]').forEach(btn=>{
      const mode=btn.dataset.gradesMode;
      btn.innerHTML=`<span>${labels[mode]||btn.textContent}</span><small>${subs[mode]||''}</small>`;
    });
  }
  function addSmallGuide(root,kind){
    if(!root||root.style.display==='none'||root.querySelector('[data-grades-mini-guide]')) return;
    const copy={
      gradebook:['pick a course first','Input midterm and finals scores separately. Cramchy uses your course weights to compute the raw percentage.'],
      quick:['quick GWA','Use this when you already know the final grade equivalents for each course.']
    }[kind];
    if(!copy) return;
    root.insertAdjacentHTML('afterbegin',`<div class="grades-mini-guide" data-grades-mini-guide><strong>${copy[0]}</strong><span>${copy[1]}</span></div>`);
  }
  function targetPanel(info){
    const mid=clampRaw(info.midtermRaw), fin=clampRaw(info.finalsRaw), target=info.targetGrade||'3.0';
    const targetRaw=targetMin(target);
    const whatIf=(mid!==null&&fin!==null)?(mid+fin)/2:null;
    const needed=mid!==null?(targetRaw*2-mid):null;
    const highest=mid!==null?(mid+100)/2:null;
    const neededText=needed===null?'—':`${Math.max(0,needed).toFixed(2)}%`;
    const neededNote=needed===null?'add midterm raw':(needed>100?`not reachable if finals max is 100%`:`to reach ${target}`);
    return `<div class="grades-target-grid">
      <div><span>what-if final raw</span><strong>${pct(whatIf)}</strong><em>${whatIf===null?'add finals raw':`equivalent ${rawToGrade(whatIf)}`}</em></div>
      <div><span>needed finals raw</span><strong>${neededText}</strong><em>${neededNote}</em></div>
      <div><span>highest possible</span><strong>${pct(highest)}</strong><em>${highest===null?'add midterm raw':`if finals is 100% · ${rawToGrade(highest)}`}</em></div>
    </div>`;
  }
  function courseCard(course,index){
    const info=termInfo(course);
    const c=computeCourse(course);
    const accent=['berry','matcha','lavender','blue','peach'][index%5];
    const gradeLabel=c.grade||'pending';
    const includeLabel=c.include?'included in GWA':'not included yet';
    let fields='';
    if(c.mode==='equiv'){
      fields=`<div class="grades-field"><label>final grade equivalent</label><select data-gwa-field="grade" data-course="${attr(course.id)}">${gradeOptions(info.grade||course.gwaFinalGrade)}</select></div>`;
    }else if(c.mode==='raw'){
      fields=`<div class="grades-field"><label>final raw %</label><input data-gwa-field="finalRaw" data-course="${attr(course.id)}" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${attr(info.finalRaw||'')}" placeholder="96"></div><div class="grades-compute-note">${escapeHtml(c.note)}</div>`;
    }else if(c.mode==='midfinal'){
      fields=`<div class="grades-two-fields"><div class="grades-field"><label>midterm raw %</label><input data-gwa-field="midtermRaw" data-course="${attr(course.id)}" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${attr(info.midtermRaw||'')}" placeholder="72"></div><div class="grades-field"><label>finals raw %</label><input data-gwa-field="finalsRaw" data-course="${attr(course.id)}" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${attr(info.finalsRaw||'')}" placeholder="leave blank if none"></div><div class="grades-field"><label>target equivalent</label><select data-gwa-field="targetGrade" data-course="${attr(course.id)}">${RAW_TARGETS.map(t=>`<option value="${t.grade}" ${(info.targetGrade||'3.0')===t.grade?'selected':''}>${t.grade} · needs ${t.min}% final raw</option>`).join('')}</select></div></div>${targetPanel(info)}`;
    }else{
      fields=`<div class="grades-empty-choice">No final grade yet. This course will be skipped in the GWA estimate for now.</div>`;
    }
    return `<article class="grades-gwa-course-card" data-accent="${accent}">
      <div class="grades-card-top">
        <div><h4>${escapeHtml(course.name||'Untitled course')}</h4><p>${escapeHtml(course.code||'no code')} · ${escapeHtml(course.term||'Term 1')}</p></div>
        <div class="grades-grade-pill">${escapeHtml(gradeLabel)}</div>
      </div>
      <div class="grades-card-controls">
        <div class="grades-field"><label>what do you have?</label><select data-gwa-field="mode" data-course="${attr(course.id)}">${modeOptions(c.mode)}</select></div>
        <div class="grades-field unit-field"><label>units</label><input data-gwa-field="units" data-course="${attr(course.id)}" type="number" min="0" max="20" step="0.5" inputmode="decimal" value="${attr(course.units??3)}"></div>
      </div>
      <div class="grades-mode-fields">${fields}</div>
      <div class="grades-card-foot"><span>${escapeHtml(includeLabel)}</span><span>${escapeHtml(c.note)}</span></div>
    </article>`;
  }
  function renderGwa(force=false){
    const root=document.getElementById('gwaRoot');
    if(!root||root.style.display==='none'||rendering) return;
    if(root.dataset.gradesRedone==='yes'&&!force) return;
    rendering=true;
    const state=readState();
    const terms=allTerms(state);
    const term=selectedTerm(state);
    const courses=coursesForTerm(state,term);
    const calc=computeGwa(courses);
    const gwaText=calc.gwa===null?'—':calc.gwa.toFixed(2);
    const dean=deanLabel(calc.gwa);
    root.dataset.gradesRedone='yes';
    root.innerHTML=`<div class="grades-gwa-board">
      <div class="grades-gwa-hero-card">
        <div>
          <div class="grades-gwa-kicker">term GWA planner</div>
          <h3>add what you have first.</h3>
          <p>Use a final grade equivalent if you already have it. Use raw percentage if that was released. Use midterm + finals if you still need to estimate.</p>
        </div>
        <div class="grades-gwa-result">
          <span>estimated GWA</span>
          <strong>${gwaText}</strong>
          <em>${dean?escapeHtml(dean):(calc.gwa===null?'add a grade to start':'computed from included courses')}</em>
        </div>
      </div>

      <div class="grades-gwa-toolbar">
        <div class="grades-field"><label>term</label><select id="gradesTermSelect">${terms.map(t=>`<option value="${attr(t)}" ${t===term?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></div>
        <button class="btn" type="button" id="gradesAddCourseBtn">+ add course</button>
      </div>

      <div class="grades-gwa-mini-formula">
        <strong>NU final grade:</strong> final raw = (midterm raw + finals raw) ÷ 2. Then Cramchy converts it to the fixed NU grade equivalent.
      </div>

      <div class="grades-gwa-summary-row">
        <div><span>included courses</span><strong>${calc.included}</strong></div>
        <div><span>included units</span><strong>${calc.total.toFixed(1)}</strong></div>
        <div><span>Dean's List guide</span><strong>3.25+</strong><em>3.25–3.49 Second Honors · 3.50+ First Honors</em></div>
      </div>

      <div class="grades-gwa-course-list">
        ${courses.length?courses.map(courseCard).join(''):`<div class="grades-empty-choice wide"><strong>no courses in ${escapeHtml(term)} yet</strong><span>Add a course first, then it will appear here.</span></div>`}
      </div>
    </div>`;

    bindGwa(root);
    rendering=false;
  }
  function bindGwa(root){
    root.querySelector('#gradesTermSelect')?.addEventListener('change',e=>{setSelectedTerm(e.target.value);renderGwa(true);});
    root.querySelector('#gradesAddCourseBtn')?.addEventListener('click',()=>{
      const original=document.getElementById('gwaAddCourseBtn')||document.getElementById('gradeAddCourseBtn');
      if(original) original.click();
      else document.querySelector('[data-tab="courses"]')?.click();
    });
    root.querySelectorAll('[data-gwa-field]').forEach(el=>{
      const eventName=el.tagName==='SELECT'?'change':'change';
      el.addEventListener(eventName,()=>{
        const id=el.getAttribute('data-course');
        const field=el.getAttribute('data-gwa-field');
        updateCourse(id,(course,info)=>{
          if(field==='units') course.units=Math.max(0,Math.min(20,Number(el.value)||0));
          else if(field==='mode') info.mode=el.value;
          else if(field==='grade') info.grade=el.value;
          else if(field==='finalRaw') info.finalRaw=el.value;
          else if(field==='midtermRaw') info.midtermRaw=el.value;
          else if(field==='finalsRaw') info.finalsRaw=el.value;
          else if(field==='targetGrade') info.targetGrade=el.value;
        });
      });
    });
  }
  function currentMode(){
    return document.querySelector('.grades-main-tabs [data-grades-mode].active')?.dataset?.gradesMode||'gradebook';
  }
  function enhance(){
    cleanGradesHeader();
    const mode=currentMode();
    if(mode==='gwa') renderGwa(false);
    if(mode==='gradebook') addSmallGuide(document.getElementById('gradebookRoot'),'gradebook');
    if(mode==='quickgwa') addSmallGuide(document.getElementById('quickGwaRoot'),'quick');
  }
  function schedule(){
    clearTimeout(scheduled);
    scheduled=setTimeout(enhance,80);
  }
  function install(){
    enhance();
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',()=>setTimeout(enhance,120),true);
    document.addEventListener('change',()=>setTimeout(enhance,120),true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
