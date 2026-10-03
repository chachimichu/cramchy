(function(){
  'use strict';
  const api=window.CramchyCourseBridge,math=window.CramchyTimetable;
  const panel=document.querySelector('#view-subjects .regular-courses-panel'),grid=document.getElementById('dynamicCourseGrid');
  if(!api||!math||!panel||!grid)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>{const day=new Date().getDay();return day===0?6:day-1;};
  let mode='courses',layout='week',day=today(),selected=null;
  const mobile=matchMedia('(max-width:700px)');
  panel.classList.add('cs-workspace');
  const header=panel.querySelector('.page-head-row'),title=header.querySelector('h2'),subtitle=header.querySelector('p');
  const toolbar=document.createElement('div');toolbar.className='cs-toolbar';
  toolbar.innerHTML='<div class="cs-switch" role="group" aria-label="Courses view"><button type="button" data-cs-mode="courses" aria-pressed="true">courses</button><button type="button" data-cs-mode="schedule" aria-pressed="false">schedule</button></div><span class="cs-term"></span>';
  header.insertAdjacentElement('afterend',toolbar);
  const view=document.createElement('div');view.className='cs-schedule';view.hidden=true;grid.insertAdjacentElement('afterend',view);
  function fmt(n){const h=Math.floor(n/60),m=n%60;return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;}
  function accent(c){return api.COURSE_COLORS[c.color]||api.COURSE_COLORS.pink;}
  function show(){grid.hidden=mode!=='courses';view.hidden=mode!=='schedule';title.textContent=mode==='schedule'?'class schedule':'my courses';subtitle.textContent=mode==='schedule'?'Your recurring classes, all in one place.':'add, edit, schedule, or remove your subjects anytime.';toolbar.querySelectorAll('[data-cs-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.csMode===mode)));render();}
  toolbar.querySelectorAll('[data-cs-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.csMode;show();}));
  function render(){
    toolbar.querySelector('.cs-term').textContent=`${api.profileAcademicYear()} · ${api.profileTerm()}`;
    if(mode!=='schedule')return;
    const model=math.build(api.coursesForCurrentTerm(),api.normalizeCourseSchedules),isDay=mobile.matches||layout==='day';
    const height=(model.end-model.start)*1.1;
    const events=model.events;
    const times=()=>'<div class="cs-times" style="height:'+height+'px">'+Array.from({length:(model.end-model.start)/60+1},(_,i)=>`<span style="top:${i*66}px">${fmt(model.start+i*60)}</span>`).join('')+'</div>';
    const lane=d=>`<div class="cs-lane ${d===today()?'cs-today':''}" style="height:${height}px">${events.filter(e=>e.day===d).map(e=>`<button type="button" class="cs-class ${e.conflict?'cs-conflict':''}" data-cs-event="${esc(e.id)}" aria-pressed="${selected===e.id}" aria-label="${esc(e.course.name)}, ${math.days[d]}, ${fmt(e.start)} to ${fmt(e.end)}${e.conflict?', schedule overlap':''}" style="--cs-color:${accent(e.course)};top:${(e.start-model.start)*1.1+3}px;height:${(e.end-e.start)*1.1-6}px;left:calc(${e.lane/e.lanes*100}% + 4px);width:calc(${100/e.lanes}% - 8px)"><strong data-preserve-case>${esc(isDay?e.course.name:e.course.code||e.course.name)}</strong><span>${fmt(e.start)}–${fmt(e.end)}</span>${e.end-e.start>=60?`<small>${esc(e.room||'room not set')}</small>`:''}${e.conflict?'<small>overlap</small>':''}</button>`).join('')}</div>`;
    const schedule=events.length?(isDay?(events.some(e=>e.day===day)?`<div class="cs-day-grid">${times()}${lane(day)}</div>`:`<p class="cs-no-class">No classes on ${math.days[day]}.</p>`):`<div class="cs-week-grid"><div></div>${math.days.map((d,i)=>`<div class="cs-day-heading ${i===today()?'cs-today':''}">${d.slice(0,3)}${i===today()?'<small>today</small>':''}</div>`).join('')}${times()}${math.days.map((_,d)=>lane(d)).join('')}</div>`):'<div class="cs-empty"><h3>your week starts here</h3><p>Add a class schedule to any course and it will appear automatically.</p><button type="button" class="btn" data-cs-new>+ add course</button></div>';
    view.innerHTML=`<section class="cs-board"><div class="cs-board-heading"><div><h3>your class week</h3><p>Repeats weekly throughout the term.</p></div><div class="cs-switch cs-layout" role="group" aria-label="Timetable view"><button type="button" data-cs-layout="week" aria-pressed="${layout==='week'}">week</button><button type="button" data-cs-layout="day" aria-pressed="${layout==='day'}">day</button></div></div>${isDay?`<div class="cs-day-picker" role="group" aria-label="Day of week">${math.days.map((d,i)=>`<button type="button" data-cs-day="${i}" aria-pressed="${day===i}">${d.slice(0,3)}</button>`).join('')}</div>`:''}${model.conflicts?'<p class="cs-overlap-note">Some class times overlap. Select a highlighted class to review its schedule.</p>':''}${schedule}</section><div class="cs-details" aria-live="polite"></div>${model.missing.length?`<section class="cs-missing"><h3>subjects needing a schedule</h3><p>Missing or incomplete times stay off the timetable.</p><div>${model.missing.map(c=>`<button type="button" data-cs-edit="${esc(c.id)}"><span data-preserve-case>${esc(c.name)}</span><b>edit schedule →</b></button>`).join('')}</div></section>`:''}`;
    view.querySelectorAll('[data-cs-layout]').forEach(b=>b.addEventListener('click',()=>{layout=b.dataset.csLayout;render();}));
    view.querySelectorAll('[data-cs-day]').forEach(b=>b.addEventListener('click',()=>{day=Number(b.dataset.csDay);render();}));
    view.querySelectorAll('[data-cs-event]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.csEvent;details(model);view.querySelectorAll('[data-cs-event]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));}));
    view.querySelectorAll('[data-cs-edit]').forEach(b=>b.addEventListener('click',()=>api.openCourseModal(b.dataset.csEdit,true)));
    view.querySelector('[data-cs-new]')?.addEventListener('click',()=>api.openCourseModal());
    details(model);
  }
  function details(model){const e=model.events.find(e=>e.id===selected),box=view.querySelector('.cs-details');if(!box)return;if(!e){box.innerHTML='<p>Select a class for its professor, room, and schedule details.</p>';return;}
    box.innerHTML=`<div><h3 data-preserve-case>${esc(e.course.name)}</h3><p>${math.days[e.day]} · ${fmt(e.start)}–${fmt(e.end)} · ${esc(e.room||'room not set')}</p><p>${esc(e.course.professor||'professor not set')}${e.course.section?' · '+esc(e.course.section):''} · ${esc(e.course.units??0)} units</p>${e.conflict?'<p class="cs-overlap-note">This class overlaps another scheduled class.</p>':''}</div><button type="button" class="more-shortcut" data-cs-edit-detail>edit course & schedule</button>`;
    box.querySelector('[data-cs-edit-detail]').addEventListener('click',()=>api.openCourseModal(e.course.id,true));
  }
  window.addEventListener('cramchy:schedules-changed',render);window.addEventListener('cramchy:backup-restored',render);
  mobile.addEventListener('change',render);
  const observer=new MutationObserver(()=>{if(mode==='schedule')render();else toolbar.querySelector('.cs-term').textContent=`${api.profileAcademicYear()} · ${api.profileTerm()}`;});observer.observe(grid,{childList:true});
  show();
})();
