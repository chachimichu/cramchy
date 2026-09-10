(function(){
  const STORAGE_KEY='strawberryMatchaMidtermsState_v1';
  const TARGETS=[
    {grade:'4.0',min:96},
    {grade:'3.5',min:90},
    {grade:'3.0',min:84},
    {grade:'2.5',min:78},
    {grade:'2.0',min:72}
  ];

  function readState(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(e){return {};}
  }
  function pctLabel(value){
    const n=Number(value);
    if(!Number.isFinite(n)) return '—';
    return `${n.toFixed(2)}%`;
  }
  function gradePoint(raw){
    const p=Number(raw);
    if(!Number.isFinite(p)) return '—';
    if(p>=96) return '4.0';
    if(p>=90) return '3.5';
    if(p>=84) return '3.0';
    if(p>=78) return '2.5';
    if(p>=72) return '2.0';
    return 'R';
  }
  function targetMin(grade){
    const item=TARGETS.find(x=>x.grade===String(grade));
    return item?item.min:84;
  }
  function clampPercent(n){
    n=Number(n);
    if(!Number.isFinite(n)) return null;
    return Math.max(0,Math.min(100,n));
  }
  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function ensureHero(){
    const view=document.getElementById('view-grades');
    const tabs=view?.querySelector('.grades-main-tabs');
    if(!view||!tabs||view.querySelector('.grades-nu-hero')) return;
    const hero=document.createElement('div');
    hero.className='grades-nu-hero';
    hero.innerHTML=`
      <div class="grades-nu-kicker">NU zero-based grading system</div>
      <h3>grades that actually explain themselves</h3>
      <p>Cramchy is NU-first for now. Use the gradebook for real scores, the term GWA planner for midterm + finals final grades, and quick GWA when you already know your final grade equivalents.</p>
      <div class="grades-guide-grid">
        <div class="grades-guide-card"><strong>1. course gradebook</strong><span>enter actual scores for midterms and finals separately. Cramchy computes the raw percentage from your weights.</span></div>
        <div class="grades-guide-card"><strong>2. term GWA planner</strong><span>combine midterm raw and finals raw using NU’s 50/50 rule, then use the equivalent grade for GWA.</span></div>
        <div class="grades-guide-card"><strong>3. quick GWA</strong><span>already know your final grades? enter grade equivalents and units for a fast GWA estimate.</span></div>
      </div>`;
    tabs.parentNode.insertBefore(hero,tabs);
  }

  function tabGuide(mode){
    const copy={
      gradebook:{
        title:'start by choosing a course',
        body:'Each course has two periods: midterms and finals. Add quizzes, activities, attendance, and major exams under the correct period so the raw grade stays accurate.',
        pill:'actual scores'
      },
      gwa:{
        title:'plan the final grade before the GWA',
        body:'For NU-style computation, the final raw grade is the average of midterm raw and finals raw. After that, Cramchy converts the final raw into its grade equivalent.',
        pill:'50% + 50%'
      },
      quickgwa:{
        title:'fast GWA, no setup needed',
        body:'Use this when you already know the final grade equivalent for each subject. Add the grade and units, then calculate.',
        pill:'quick mode'
      }
    }[mode];
    return `<div class="grades-section-guide" data-grades-helper="guide"><div><strong>${copy.title}</strong><p>${copy.body}</p></div><span class="pill">${copy.pill}</span></div>`;
  }

  function currentMode(){
    const active=document.querySelector('.grades-main-tabs [data-grades-mode].active');
    return active?.dataset?.gradesMode||'gradebook';
  }

  function addGradebookGuide(){
    const root=document.getElementById('gradebookRoot');
    if(!root||root.style.display==='none'||root.querySelector('[data-grades-helper="guide"]')) return;
    root.insertAdjacentHTML('afterbegin',tabGuide('gradebook'));
    const periodTabs=root.querySelector('.grade-period-tabs');
    if(periodTabs&&!root.querySelector('[data-grades-helper="period-note"]')){
      periodTabs.insertAdjacentHTML('beforebegin',`<div class="grades-nu-note" data-grades-helper="period-note">tip: input midterm scores under <strong>midterms</strong> and finals scores under <strong>finals</strong>. The overall grade combines both periods as 50% midterm + 50% finals.</div>`);
    }
  }

  function estimatorMarkup(){
    const opts=TARGETS.map(x=>`<option value="${x.grade}">${x.grade} minimum ${x.min}%</option>`).join('');
    return `<div class="grades-nu-estimator" data-grades-helper="nu-estimator">
      <h3>NU finals target estimator</h3>
      <p class="helper">Use this when your midterm raw grade is already released. Try a finals score, or choose a target equivalent and Cramchy will tell you what finals raw grade you need.</p>
      <div class="grades-estimator-grid">
        <div><label>midterm raw %</label><input id="nuMidtermRaw" type="number" min="0" max="100" step="0.01" inputmode="decimal" placeholder="72"></div>
        <div><label>what-if finals %</label><input id="nuFinalsWhatIf" type="number" min="0" max="100" step="0.01" inputmode="decimal" placeholder="90"></div>
        <div><label>target equivalent</label><select id="nuTargetGrade">${opts}</select></div>
        <button class="btn" id="nuGradeEstimateBtn" type="button">calculate target</button>
      </div>
      <div class="grades-estimator-result" id="nuEstimatorResult" aria-live="polite">
        <div class="result-card"><div class="k">what-if final raw</div><div class="v">—</div><div class="note">enter midterm + finals raw</div></div>
        <div class="result-card"><div class="k">needed finals raw</div><div class="v">—</div><div class="note">choose target equivalent</div></div>
        <div class="result-card"><div class="k">highest possible</div><div class="v">—</div><div class="note">assumes 100% finals raw</div></div>
      </div>
      <div class="grades-nu-note"><strong>formula:</strong> final raw = (midterm raw + finals raw) ÷ 2. Equivalent grades are based on the NU zero-based scale currently used in Cramchy.</div>
    </div>`;
  }

  function runEstimator(){
    const mid=clampPercent(document.getElementById('nuMidtermRaw')?.value);
    const whatIf=clampPercent(document.getElementById('nuFinalsWhatIf')?.value);
    const target=document.getElementById('nuTargetGrade')?.value||'3.0';
    const targetRaw=targetMin(target);
    const result=document.getElementById('nuEstimatorResult');
    if(!result) return;

    const finalRaw=(mid!==null&&whatIf!==null)?((mid+whatIf)/2):null;
    const needed=mid!==null?(targetRaw*2-mid):null;
    const highest=mid!==null?((mid+100)/2):null;
    const neededText=needed===null?'—':(needed>100?`${needed.toFixed(2)}%`:(needed<0?'0.00%':`${needed.toFixed(2)}%`));
    const neededNote=needed===null?'enter midterm raw':(needed>100?`not reachable with 100% max finals for ${target}`:`to reach ${target} / at least ${targetRaw}% final raw`);
    const finalNote=finalRaw===null?'enter midterm + finals raw':`equivalent ${gradePoint(finalRaw)}`;
    const highestNote=highest===null?'enter midterm raw':`equivalent ${gradePoint(highest)} if finals is 100%`;

    result.innerHTML=`
      <div class="result-card"><div class="k">what-if final raw</div><div class="v">${pctLabel(finalRaw)}</div><div class="note">${escapeHtml(finalNote)}</div></div>
      <div class="result-card"><div class="k">needed finals raw</div><div class="v">${neededText}</div><div class="note">${escapeHtml(neededNote)}</div></div>
      <div class="result-card"><div class="k">highest possible</div><div class="v">${pctLabel(highest)}</div><div class="note">${escapeHtml(highestNote)}</div></div>`;
  }

  function addGwaGuide(){
    const root=document.getElementById('gwaRoot');
    if(!root||root.style.display==='none') return;
    if(!root.querySelector('[data-grades-helper="guide"]')) root.insertAdjacentHTML('afterbegin',tabGuide('gwa'));
    if(!root.querySelector('[data-grades-helper="nu-estimator"]')){
      const guide=root.querySelector('[data-grades-helper="guide"]');
      guide?.insertAdjacentHTML('afterend',estimatorMarkup());
      ['nuMidtermRaw','nuFinalsWhatIf','nuTargetGrade'].forEach(id=>document.getElementById(id)?.addEventListener('input',runEstimator));
      document.getElementById('nuTargetGrade')?.addEventListener('change',runEstimator);
      document.getElementById('nuGradeEstimateBtn')?.addEventListener('click',runEstimator);
    }
  }

  function addQuickGuide(){
    const root=document.getElementById('quickGwaRoot');
    if(!root||root.style.display==='none'||root.querySelector('[data-grades-helper="guide"]')) return;
    root.insertAdjacentHTML('afterbegin',tabGuide('quickgwa'));
  }

  function updateTabLabels(){
    document.querySelector('[data-grades-mode="gradebook"]')&&(document.querySelector('[data-grades-mode="gradebook"]').textContent='course gradebook');
    document.querySelector('[data-grades-mode="gwa"]')&&(document.querySelector('[data-grades-mode="gwa"]').textContent='term GWA planner');
    document.querySelector('[data-grades-mode="quickgwa"]')&&(document.querySelector('[data-grades-mode="quickgwa"]').textContent='quick GWA');
  }

  function enhance(){
    if(!document.getElementById('view-grades')) return;
    ensureHero();
    updateTabLabels();
    const mode=currentMode();
    if(mode==='gradebook') addGradebookGuide();
    if(mode==='gwa') addGwaGuide();
    if(mode==='quickgwa') addQuickGuide();
  }

  function install(){
    enhance();
    let timer=null;
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(enhance,90);};
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',()=>setTimeout(enhance,160),true);
    document.addEventListener('change',()=>setTimeout(enhance,160),true);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
