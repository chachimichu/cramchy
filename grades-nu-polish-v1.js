(function(){
  const STORAGE_KEY='strawberryMatchaMidtermsState_v1';
  const TARGETS=[
    {grade:'4.0',min:96},
    {grade:'3.5',min:90},
    {grade:'3.0',min:84},
    {grade:'2.5',min:78},
    {grade:'2.0',min:72}
  ];

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
  function clampPercent(value){
    const n=Number(value);
    if(!Number.isFinite(n)) return null;
    return Math.max(0,Math.min(100,n));
  }
  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function ensureGradesIntro(){
    const view=document.getElementById('view-grades');
    const tabs=view?.querySelector('.grades-main-tabs');
    if(!view||!tabs) return;
    view.classList.add('grades-nu-clean');
    if(view.querySelector('.grades-nu-hero')) return;

    const intro=document.createElement('div');
    intro.className='grades-nu-hero';
    intro.innerHTML=`
      <div class="grades-nu-title-row">
        <div>
          <span class="grades-nu-kicker">NU zero-based grading</span>
          <h3>grades</h3>
        </div>
        <span class="grades-nu-formula">midterm 50% + finals 50%</span>
      </div>
      <p>Based on the zero-based grading system used by National University. Use the course gradebook for real scores, the term GWA planner for midterm + finals final grades, and quick GWA when you already know your final grade equivalents.</p>`;
    tabs.parentNode.insertBefore(intro,tabs);
  }

  function setTabLabels(){
    const labels={
      gradebook:['course gradebook','actual scores'],
      gwa:['term GWA planner','midterm + finals'],
      quickgwa:['quick GWA','final grades only']
    };
    Object.entries(labels).forEach(([mode,[title,sub]])=>{
      const btn=document.querySelector(`[data-grades-mode="${mode}"]`);
      if(!btn||btn.dataset.gradesLabelReady==='1') return;
      btn.innerHTML=`<span>${title}</span><small>${sub}</small>`;
      btn.dataset.gradesLabelReady='1';
    });
  }

  function addGradebookHint(){
    const root=document.getElementById('gradebookRoot');
    if(!root||root.style.display==='none') return;
    if(root.querySelector('[data-grades-clean="gradebook-hint"]')) return;
    root.insertAdjacentHTML('afterbegin',`
      <div class="grades-clean-note" data-grades-clean="gradebook-hint">
        <strong>choose a course, then pick midterms or finals.</strong>
        <span>Add scores under the right period. Cramchy computes the raw grade using your saved weights.</span>
      </div>`);
  }

  function estimatorMarkup(){
    const opts=TARGETS.map(x=>`<option value="${x.grade}">${x.grade} · needs final raw ${x.min}%+</option>`).join('');
    return `<div class="grades-final-estimator" data-grades-clean="final-estimator">
      <div class="estimator-copy">
        <strong>final grade estimator</strong>
        <span>Check what finals raw grade you need for your target NU equivalent.</span>
      </div>
      <div class="estimator-fields">
        <label>midterm raw %<input id="nuMidtermRaw" type="number" min="0" max="100" step="0.01" inputmode="decimal" placeholder="72"></label>
        <label>what-if finals %<input id="nuFinalsWhatIf" type="number" min="0" max="100" step="0.01" inputmode="decimal" placeholder="90"></label>
        <label>target<select id="nuTargetGrade">${opts}</select></label>
      </div>
      <div class="estimator-result" id="nuEstimatorResult" aria-live="polite">
        <span><b>what-if:</b> —</span>
        <span><b>needed finals:</b> —</span>
        <span><b>highest possible:</b> —</span>
      </div>
      <div class="estimator-formula">formula: final raw = (midterm raw + finals raw) ÷ 2</div>
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

    const finalCopy=finalRaw===null?'—':`${pctLabel(finalRaw)} · ${gradePoint(finalRaw)}`;
    const neededCopy=needed===null?'—':(needed>100?`${needed.toFixed(2)}% · not reachable`:(`${Math.max(0,needed).toFixed(2)}%`));
    const highestCopy=highest===null?'—':`${pctLabel(highest)} · ${gradePoint(highest)}`;

    result.innerHTML=`
      <span><b>what-if:</b> ${escapeHtml(finalCopy)}</span>
      <span><b>needed finals:</b> ${escapeHtml(neededCopy)}</span>
      <span><b>highest possible:</b> ${escapeHtml(highestCopy)}</span>`;
  }

  function addGwaEstimator(){
    const root=document.getElementById('gwaRoot');
    if(!root||root.style.display==='none') return;
    if(!root.querySelector('[data-grades-clean="final-estimator"]')){
      root.insertAdjacentHTML('afterbegin',estimatorMarkup());
      ['nuMidtermRaw','nuFinalsWhatIf'].forEach(id=>document.getElementById(id)?.addEventListener('input',runEstimator));
      document.getElementById('nuTargetGrade')?.addEventListener('change',runEstimator);
    }

    root.querySelectorAll('.gwa-formula-card h3,.quick-gwa-result .label').forEach(el=>{
      const text=(el.textContent||'').trim();
      if(text==='Projected Term GWA') el.textContent='projected term GWA';
      if(text==='Term GWA') el.textContent='term GWA';
      if(text==='Projected term GWA') el.textContent='projected term GWA';
    });
  }

  function addQuickHint(){
    const root=document.getElementById('quickGwaRoot');
    if(!root||root.style.display==='none') return;
    if(root.querySelector('[data-grades-clean="quick-hint"]')) return;
    root.insertAdjacentHTML('afterbegin',`
      <div class="grades-clean-note quick" data-grades-clean="quick-hint">
        <strong>use this when you already know the equivalent grades.</strong>
        <span>Enter each final grade equivalent and units, then calculate.</span>
      </div>`);
  }

  function removeOldVerboseHelpers(){
    document.querySelectorAll('.grades-guide-grid,.grades-guide-card,.grades-section-guide,.grades-nu-estimator,[data-grades-helper]').forEach(el=>el.remove());
  }

  function enhance(){
    if(!document.getElementById('view-grades')) return;
    removeOldVerboseHelpers();
    ensureGradesIntro();
    setTabLabels();
    addGradebookHint();
    addGwaEstimator();
    addQuickHint();
  }

  function install(){
    enhance();
    let timer=null;
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(enhance,90);};
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',()=>setTimeout(enhance,150),true);
    document.addEventListener('change',()=>setTimeout(enhance,150),true);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
