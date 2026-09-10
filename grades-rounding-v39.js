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

  function readJson(key){
    try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(e){return {};}
  }
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
  function roundedRaw(value){
    const n=toNumber(value);
    return n===null?null:Math.round(n);
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
  function targetFor(grade){
    return RAW_TARGETS.find(x=>x.grade===String(grade))||RAW_TARGETS[2];
  }
  function deanLabel(gwa){
    const g=toNumber(gwa);
    if(g===null) return '';
    if(g>=3.50) return "Dean's List — First Honors";
    if(g>=3.25) return "Dean's List — Second Honors";
    return '';
  }

  function installGlobalGradePoint(){
    const roundedGradePoint=function(p){
      const n=toNumber(p);
      if(n===null) return null;
      return rawToGrade(n);
    };
    try{window.gradePoint=roundedGradePoint;}catch(e){}
    try{gradePoint=roundedGradePoint;}catch(e){}
  }

  function patchNuNote(){
    const note=document.querySelector('#view-grades [data-grades-note="nu"]');
    if(!note) return;
    const strong=note.querySelector('strong');
    const span=note.querySelector('span');
    if(strong) strong.textContent="Based on National University's zero-based grading system.";
    if(span) span.textContent='Raw percentages are rounded to the nearest whole number before the grade equivalent — 95.50% becomes 96, or 4.0.';
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
          if(note) note.textContent=`${pct(raw)} → ${roundedRaw(raw)} → ${rawToGrade(raw)}`;
        });
      }
    }catch(e){}
  }

  function currentTerm(app){
    const profileTerm=app.profile?.term||'Term 1';
    const select=document.getElementById('gradesTermSelect');
    if(select?.value) return select.value;
    try{return localStorage.getItem(TERM_KEY)||profileTerm;}catch(e){return profileTerm;}
  }
  function coursesForTerm(app,term){
    const year=app.profile?.academicYear||'2026–2027';
    const profileTerm=app.profile?.term||'Term 1';
    return (app.courses||[]).filter(c=>(c.academicYear||year)===year&&(c.term||profileTerm)===term);
  }
  function termCourseResult(course,planner){
    const info=planner[course.id]&&typeof planner[course.id]==='object'?planner[course.id]:{mode:'none'};
    const mode=info.mode||'none';
    let raw=null,grade='',detail='not added yet';
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
      }else detail='add your midterm raw grade first';
    }
    const unitOverride=toNumber(info.units);
    const units=unitOverride===null?Math.max(0,Number(course.units)||0):Math.max(0,Math.min(20,unitOverride));
    return {info,mode,raw,grade,detail,units,included:NUMERIC_GRADES.includes(grade)};
  }

  function patchTargetCard(card,result){
    if(result.mode!=='midfinal') return;
    const info=result.info;
    const mid=clampRaw(info.midtermRaw);
    const fin=clampRaw(info.finalsRaw);
    const target=targetFor(info.targetGrade||'3.0');
    const finalRaw=mid!==null&&fin!==null?(mid+fin)/2:null;
    const needed=mid!==null?(target.cutoff*2-mid):null;
    const highest=mid!==null?(mid+100)/2:null;
    const grid=card.querySelector('.grades-target-grid');
    if(!grid) return;
    const cells=[...grid.children];

    if(cells[0]){
      const strong=cells[0].querySelector('strong'),em=cells[0].querySelector('em');
      if(strong) strong.textContent=pct(finalRaw);
      if(em) em.textContent=finalRaw===null?'add a finals raw grade':`${roundedRaw(finalRaw)} after rounding · equivalent ${rawToGrade(finalRaw)}`;
    }
    if(cells[1]){
      const strong=cells[1].querySelector('strong'),em=cells[1].querySelector('em');
      if(strong) strong.textContent=needed===null?'—':`${Math.max(0,needed).toFixed(2)}%`;
      if(em) em.textContent=needed===null?'add midterm raw':needed>100?`${target.grade} is not reachable with a 100% finals raw`:`needed in finals to reach ${target.grade}`;
    }
    if(cells[2]){
      const strong=cells[2].querySelector('strong'),em=cells[2].querySelector('em');
      if(strong) strong.textContent=pct(highest);
      if(em) em.textContent=highest===null?'add midterm raw':`rounds to ${roundedRaw(highest)} · equivalent ${rawToGrade(highest)}`;
    }

    const select=card.querySelector('[data-term-field="targetGrade"]');
    if(select){
      [...select.options].forEach(option=>{
        const t=targetFor(option.value);
        option.textContent=`${t.grade} · ${t.cutoff.toFixed(2)}%+ final raw`;
      });
    }
  }

  function patchTermGwa(){
    const root=document.getElementById('gwaRoot');
    if(!root||getComputedStyle(root).display==='none'||!root.querySelector('[data-term-gwa-render="stable"]')) return;
    const app=readJson(APP_STORAGE_KEY);
    const planner=readJson(PLANNER_STORAGE_KEY);
    const term=currentTerm(app);
    const courses=coursesForTerm(app,term);
    let weighted=0,units=0,included=0;

    courses.forEach(course=>{
      const result=termCourseResult(course,planner);
      if(result.included&&result.units>0){
        weighted+=Number(result.grade)*result.units;
        units+=result.units;
        included++;
      }
      const field=root.querySelector(`[data-term-field="mode"][data-course="${CSS.escape(String(course.id))}"]`);
      const card=field?.closest('.grades-gwa-course-card');
      if(!card) return;
      const pill=card.querySelector('.grades-grade-pill');
      if(pill) pill.textContent=result.grade||'pending';
      const foot=card.querySelector('.grades-card-foot');
      if(foot){
        const spans=foot.querySelectorAll('span');
        if(spans[0]) spans[0].textContent=result.included?'included in GWA':'not included yet';
        if(spans[1]) spans[1].textContent=result.detail;
      }
      const inline=card.querySelector('.grades-inline-result');
      if(inline&&result.mode==='raw') inline.textContent=result.detail;
      patchTargetCard(card,result);
    });

    const gwa=units>0?weighted/units:null;
    const resultBox=root.querySelector('.grades-gwa-result');
    if(resultBox){
      const strong=resultBox.querySelector('strong'),em=resultBox.querySelector('em');
      if(strong) strong.textContent=gwa===null?'—':gwa.toFixed(2);
      if(em) em.textContent=deanLabel(gwa)||(gwa===null?'add a final grade to start':'weighted by course units');
    }
    const summary=root.querySelectorAll('.grades-gwa-summary-row>div');
    if(summary[0]?.querySelector('strong')) summary[0].querySelector('strong').textContent=String(included);
    if(summary[1]?.querySelector('strong')) summary[1].querySelector('strong').textContent=units.toFixed(1);
    if(summary[2]?.querySelector('strong')) summary[2].querySelector('strong').textContent=String(Math.max(0,courses.length-included));

    const formula=root.querySelector('.grades-nu-formula');
    if(formula) formula.innerHTML='<strong>NU final raw:</strong> (midterm raw + finals raw) ÷ 2 · round to the nearest whole number before the grade equivalent';
  }

  function patchAll(){
    patchNuNote();
    patchGradebook();
    patchTermGwa();
  }
  function schedulePatch(){
    queueMicrotask(patchAll);
    requestAnimationFrame(()=>requestAnimationFrame(patchAll));
    setTimeout(patchAll,180);
  }

  function install(){
    installGlobalGradePoint();
    try{if(typeof renderGradebook==='function') renderGradebook();}catch(e){}
    patchAll();
    document.addEventListener('click',event=>{
      if(event.target.closest('#view-grades,[data-tab="grades"],[data-open-tab="grades"]')) schedulePatch();
    },true);
    document.addEventListener('change',event=>{
      if(event.target.closest('#view-grades')) schedulePatch();
    },true);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
