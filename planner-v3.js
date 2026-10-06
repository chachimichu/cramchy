(function(){
  const STORAGE_KEY='cramchyPlannerEvents_v2';
  const OLD_STORAGE_KEY='cramchyPlannerEvents_v1';
  const FALLBACK_LOGO='assets/cramchy-wordmark.png';
  const TYPES=['class','task','exam','quiz','study','personal','assignment'];
  const TYPE_LABEL={class:'Class',task:'Task',exam:'Exam',quiz:'Quiz',study:'Study block',personal:'Personal',assignment:'Assignment'};
  const TIME=window.CramchyPlannerTime;
  const HOUR_HEIGHT=74;

  let events=loadEvents();
  let legacyTasks=events.filter(e=>window.CramchySharedTasks.actionable(e));
  let selectedDate=isoDate(new Date());
  let activeView='month';
  let editingId=null;
  let monthCursor=new Date(dateObj(selectedDate).getFullYear(),dateObj(selectedDate).getMonth(),1,12);

  function $(s,r=document){return r.querySelector(s)}
  function $all(s,r=document){return Array.from(r.querySelectorAll(s))}
  function pad(n){return String(n).padStart(2,'0')}
  function isoDate(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
  function dateObj(iso){const [y,m,d]=String(iso).split('-').map(Number);return new Date(y||2026,(m||1)-1,d||1,12)}
  function addDays(iso,days){const d=dateObj(iso);d.setDate(d.getDate()+days);return isoDate(d)}
  function startOfWeek(iso){const d=dateObj(iso);d.setDate(d.getDate()-d.getDay());return isoDate(d)}
  function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function uid(){return 'planner-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
  function prettyDate(iso){return dateObj(iso).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
  function monthLabel(d){return d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
  function shortDate(iso){return dateObj(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
  function timeLabel(t){if(!t)return'anytime';const[h,m]=String(t).split(':').map(Number);const suffix=h>=12?'PM':'AM';return `${((h+11)%12)+1}:${pad(m||0)} ${suffix}`}
  function compactTime(t){if(!t)return'';const[h,m]=String(t).split(':').map(Number);const suffix=h>=12?'PM':'AM';return m?`${((h+11)%12)+1}:${pad(m)}`:`${((h+11)%12)+1} ${suffix}`}
  function byDate(iso){return events.filter(e=>e.date===iso).sort((a,b)=>(a.start||'99:99').localeCompare(b.start||'99:99'))}
  function getLogoSrc(){return $('.topnav .brand img.brand-full-logo')?.src||$('.topnav .brand img')?.src||$('.hero-wordmark')?.src||FALLBACK_LOGO}

  function loadEvents(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(OLD_STORAGE_KEY);
      if(!raw)return[];
      const parsed=JSON.parse(raw);
      if(!Array.isArray(parsed))return[];
      return parsed
        .filter(e=>e&&typeof e==='object'&&!/^p\d+$/.test(String(e.id||'')))
        .map(e=>({
          id:e.id||uid(),
          title:String(e.title||'Untitled event'),
          type:TYPES.includes(e.type)?e.type:'personal',
          course:String(e.course||''),
          date:/^\d{4}-\d{2}-\d{2}$/.test(String(e.date||''))?e.date:isoDate(new Date()),
          start:String(e.start||''),end:String(e.end||''),notes:String(e.notes||''),done:Boolean(e.done),showInTasks:!!e.showInTasks
        }));
    }catch(err){return[]}
  }
  function saveEvents(){localStorage.setItem(STORAGE_KEY,JSON.stringify([...legacyTasks,...events.filter(e=>!e.academicExam&&!e.sharedTask&&!window.CramchySharedTasks.actionable(e))]))}

  function syncLogo(){
    const src=getLogoSrc();
    $all('.planner-logo-sync,.cramchy-home-logo').forEach(img=>{if(img&&img.src!==src)img.src=src});
  }

  function enhanceHomeHero(){
    const home=$('#view-dashboard .daily-home');
    if(!home)return false;
    if($('.cramchy-home-header',home)){
      document.body.classList.add('cramchy-home-enhanced');
      syncLogo();
      return true;
    }
    const dailyHero=$(':scope > .daily-hero',home);
    const dailyTitle=dailyHero?$('.daily-title',dailyHero):$('.daily-title',home);
    const quickAdd=$('#dailyQuickAddBtn',home);
    if(!dailyTitle)return false;

    const header=document.createElement('div');
    header.className='cramchy-home-header';
    header.innerHTML=`
      <div class="cramchy-home-logo-zone">
        <img class="cramchy-home-logo planner-logo-sync" src="${escapeHtml(getLogoSrc())}" alt="Cramchy logo">
        <span class="cramchy-home-sparkle one">✦</span>
        <span class="cramchy-home-sparkle two">✧</span>
      </div>
      <div class="cramchy-home-copy"><div class="cramchy-home-kicker">today in cramchy</div></div>`;
    const copy=$('.cramchy-home-copy',header);
    copy.appendChild(dailyTitle);
    if(quickAdd){
      const actions=document.createElement('div');
      actions.className='cramchy-home-actions';
      actions.appendChild(quickAdd);
      copy.appendChild(actions);
    }
    home.insertBefore(header,home.firstChild);
    document.body.classList.add('cramchy-home-enhanced');
    syncLogo();
    return true;
  }

  function ensurePlannerNav(){
    let btn=$('.topnav .navbtn[data-tab="planner"]');
    if(btn)return btn;
    const grades=$('.topnav .navbtn[data-tab="grades"]');
    if(!grades)return null;
    grades.insertAdjacentHTML('beforebegin','<button class="navbtn" data-tab="planner" type="button">Planner</button>');
    return $('.topnav .navbtn[data-tab="planner"]');
  }

  function injectPlanner(){
    if($('#view-planner'))return true;
    const main=$('main');
    if(!main||!ensurePlannerNav())return false;
    main.insertAdjacentHTML('beforeend',`
      <section class="view" id="view-planner">
        <div class="planner-page">
          <div class="planner-hero-card">
            <div class="planner-logo-wrap"><img class="planner-logo-sync planner-main-logo" src="${escapeHtml(getLogoSrc())}" alt="Cramchy logo"></div>
            <div class="planner-hero-copy">
              <h2>plan at your own pace</h2>
              <p>Keep your classes, quizzes, deadlines, and study plans in one place.</p>
              <div class="planner-actions"><button class="planner-primary" data-planner-add type="button">add event</button><button class="planner-light" data-planner-add-course-exam type="button">add course exam</button><button class="planner-light" data-planner-show="week" type="button">view week</button></div>
            </div>
          </div>

          <div class="planner-layout">
            <aside class="planner-sidebar">
              <div class="planner-panel"><button class="planner-add" data-planner-add type="button">+ add event</button><div class="planner-legend"><span><i class="planner-dot class"></i>Classes</span><span><i class="planner-dot task"></i>Tasks</span><span><i class="planner-dot exam"></i>Exams</span><span><i class="planner-dot quiz"></i>Quizzes</span><span><i class="planner-dot study"></i>Study blocks</span><span><i class="planner-dot assignment"></i>Assignments</span><span><i class="planner-dot personal"></i>Personal</span></div></div>
              <div class="planner-panel" id="plannerNextPanel"></div>
              <div class="planner-panel planner-rec"><h3>Cramchy recommends</h3><p id="plannerRecText">Add an exam or deadline and Cramchy will help you see what needs attention.</p><img class="planner-logo-sync" src="${escapeHtml(getLogoSrc())}" alt=""></div>
            </aside>

            <div class="planner-card">
              <div class="planner-head"><div><h2>Planner</h2><p>Switch between month, week, and day so nothing jumpscares you later.</p></div><div class="planner-tabs"><button class="active" aria-pressed="true" data-planner-show="month" type="button">Month</button><button aria-pressed="false" data-planner-show="week" type="button">Week</button><button aria-pressed="false" data-planner-show="day" type="button">Day</button></div></div>
              <div class="planner-nav"><button type="button" data-planner-nav="prev" aria-label="previous">‹</button><strong id="plannerLabel"></strong><button type="button" data-planner-nav="next" aria-label="next">›</button></div>
              <div class="planner-view active" id="plannerMonthView"><div class="planner-month-grid" id="plannerMonthGrid"></div></div>
              <div class="planner-view" id="plannerWeekView"><div class="planner-week-scroll" tabindex="0" role="region" aria-label="Weekly calendar; scroll horizontally for other days"><div class="planner-week-grid" id="plannerWeekGrid"></div></div></div>
              <div class="planner-view" id="plannerDayView"><div class="planner-day-grid"><div><div class="planner-today"><h3 id="plannerDayTitle"></h3><p id="plannerDaySummary"></p><div id="plannerDayHighlight"></div></div><button class="planner-add planner-day-add" id="plannerDayAdd" data-planner-add type="button" aria-label="Add event for the selected date">+ add event</button><div class="planner-agenda" id="plannerAgenda"></div></div></div></div>
            </div>
          </div>
        </div>

        <div class="planner-modal-backdrop" id="plannerModal" aria-hidden="true">
          <div class="planner-modal" role="dialog" aria-modal="true" aria-labelledby="plannerModalTitle">
            <div class="planner-modal-head"><h3 id="plannerModalTitle">add to planner</h3><button type="button" data-planner-close aria-label="close">×</button></div>
            <form id="plannerForm" class="planner-form">
              <label class="full">title<input id="plannerTitle" autocomplete="off" placeholder="ex. anaphy quiz review" required></label>
              <label>type<select id="plannerType"><option value="study">Study block</option><option value="class">Class</option><option value="task">Other task</option><option value="assignment">Assignment</option><option value="exam">Exam reminder (Planner only)</option><option value="quiz">Quiz</option><option value="personal">Personal</option></select></label>
              <label>course<input id="plannerCourse" autocomplete="off" placeholder="course or subject"></label>
              <label><span id="plannerDateLabel">date</span><input id="plannerDate" type="date"></label>
              <label>start<input id="plannerStart" type="time"></label>
              <label>end<input id="plannerEnd" type="time"></label>
              <label class="full">notes<textarea id="plannerNotes" placeholder="tiny notes, room, reminders, links..."></textarea></label>
              <p class="full shared-task-note" id="plannerTaskHint" hidden>Appears in Tasks automatically, with its type and color. Check it off in Tasks; add a date to show it in Planner.</p><p class="full" id="plannerTimeError" role="alert" hidden></p>
              <div class="planner-modal-actions full"><button class="planner-danger" id="plannerDeleteBtn" type="button">delete</button><span></span><button class="planner-light" type="button" data-planner-close>cancel</button><button class="planner-primary" type="submit" id="plannerSaveBtn">save event</button></div>
            </form>
          </div>
        </div>
      </section>`);
    document.body.appendChild($('#plannerModal'));
    return true;
  }

  function showPlanner(){
    const section=$('#view-planner');
    const btn=$('.topnav .navbtn[data-tab="planner"]');
    if(!section||!btn)return;
    document.body.classList.add('planner-mode-active');
    $all('main > .view').forEach(v=>v.classList.remove('active'));
    section.classList.add('active');
    $all('.topnav .navbtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderAllPlanner();
  }
  function hidePlanner(){
    if(!document.body.classList.contains('planner-mode-active'))return;
    document.body.classList.remove('planner-mode-active');
    $('#view-planner')?.classList.remove('active');
    $('.topnav .navbtn[data-tab="planner"]')?.classList.remove('active');
  }

  function bindTopNav(){
    const nav=$('.topnav');
    if(!nav||nav.dataset.plannerV3Nav==='1')return;
    nav.dataset.plannerV3Nav='1';
    nav.addEventListener('click',e=>{
      const btn=e.target.closest('.navbtn');
      if(!btn)return;
      if(btn.dataset.tab==='planner'){
        e.preventDefault();
        e.stopPropagation();
        showPlanner();
      }else{
        hidePlanner();
      }
    },true);
  }

  function setPlannerView(view){
    if(!['month','week','day'].includes(view))return;
    activeView=view;
    $all('[data-planner-show]','#view-planner').forEach(b=>{b.classList.toggle('active',b.dataset.plannerShow===view);b.setAttribute('aria-pressed',String(b.dataset.plannerShow===view));});
    $all('.planner-view','#view-planner').forEach(v=>v.classList.remove('active'));
    $('#planner'+view[0].toUpperCase()+view.slice(1)+'View')?.classList.add('active');
    renderAllPlanner();
    window.CramchyMotion?.enter($('#planner'+view[0].toUpperCase()+view.slice(1)+'View'));
  }

  function renderMonth(){
    const grid=$('#plannerMonthGrid');if(!grid)return;
    const y=monthCursor.getFullYear(),m=monthCursor.getMonth();
    const first=new Date(y,m,1,12);
    const start=new Date(y,m,1-first.getDay(),12);
    const cells=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(w=>`<div class="planner-weekday">${w}</div>`);
    for(let i=0;i<42;i++){
      const d=new Date(start);d.setDate(start.getDate()+i);
      const iso=isoDate(d);const muted=d.getMonth()!==m;const list=byDate(iso);
      const pills=list.slice(0,3).map(ev=>`<button class="planner-event-pill ${ev.type} ${ev.done?'shared-task-done':''}" data-planner-event="${escapeHtml(ev.id)}" type="button" aria-label="${escapeHtml(ev.title)} · ${escapeHtml(TYPE_LABEL[ev.type])} · ${escapeHtml(timeLabel(ev.start))}"><i class="planner-dot ${ev.type}"></i><span>${escapeHtml(ev.title)}</span></button>`).join('');
      const more=list.length>3?`<button class="planner-more" data-planner-date="${iso}" type="button">+${list.length-3} more</button>`:'';
      cells.push(`<div class="planner-day-cell ${muted?'muted':''} ${iso===selectedDate?'selected':''}" data-planner-date="${iso}" tabindex="0" role="group" aria-label="${escapeHtml(prettyDate(iso))}; press Enter to open day"><span class="planner-date-num ${iso===isoDate(new Date())?'today':''}">${d.getDate()}</span>${pills}${more}</div>`);
    }
    grid.innerHTML=cells.join('');
  }

  function renderWeek(){
    const grid=$('#plannerWeekGrid');if(!grid)return;
    const start=startOfWeek(selectedDate);
    const days=Array.from({length:7},(_,i)=>addDays(start,i));
    const range=TIME.range(events.filter(event=>days.includes(event.date)));
    const hours=Array.from({length:range.endHour-range.firstHour},(_,i)=>i+range.firstHour);
    const height=hours.length*HOUR_HEIGHT;
    let html='<div class="planner-week-head blank"></div>'+days.map(d=>`<button type="button" class="planner-week-head ${d===selectedDate?'selected':''}" data-planner-date="${d}"><small>${dateObj(d).toLocaleDateString('en-US',{weekday:'short'})}</small><span>${dateObj(d).getDate()}</span></button>`).join('');
    html+='<div class="planner-time-label">all day / check time</div>'+days.map(d=>`<div class="planner-week-slot">${byDate(d).filter(e=>!TIME.interval(e)).map(e=>weekEventHtml(e)).join('')}</div>`).join('');
    html+='<div class="planner-week-timeline"><div class="planner-week-times">'+hours.map(hour=>`<div class="planner-time-label">${timeLabel(pad(hour)+':00')}</div>`).join('')+'</div>';
    days.forEach(d=>{
      html+=`<div class="planner-week-day" style="height:${height}px">`;
      html+=hours.map(hour=>`<div class="planner-week-slot" data-planner-date="${d}" data-planner-hour="${hour}"></div>`).join('');
      html+=TIME.layout(byDate(d)).map(item=>{
        const eventHeight=Math.max(18,item.point?36:(item.end-item.start)*HOUR_HEIGHT/60-4);
        const top=Math.min(height-eventHeight,(item.start-range.firstHour*60)*HOUR_HEIGHT/60+2);
        const width=100/item.lanes,left=width*item.lane;
        const style=`top:${top}px;height:${eventHeight}px;left:calc(${left}% + 3px);width:calc(${width}% - 6px)`;
        return weekEventHtml(item.event,style);
      }).join('');
      html+='</div>';
    });
    html+='</div>';grid.innerHTML=html;
  }
  function weekEventHtml(e,style=''){
    const issue=TIME.validate(e.start,e.end);
    const startLabel=e.start?(TIME.minutes(e.start)!==null?timeLabel(e.start):'invalid start time'):e.end?'start missing':'all day';
    const endLabel=e.end?(TIME.minutes(e.end)!==null?timeLabel(e.end):'invalid end time'):'';
    const label=startLabel+(e.end?' – '+endLabel:e.start?' · start only':'');
    const accessible=e.title+', '+prettyDate(e.date)+', '+label+(issue?', needs time correction':'');
    return `<button class="planner-week-event ${e.type} ${e.done?'shared-task-done':''}" data-planner-event="${escapeHtml(e.id)}" type="button" aria-label="${escapeHtml(accessible)}" title="${escapeHtml(accessible)}" ${style?`style="${style}"`:''}><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(label)}${e.course?' · '+escapeHtml(e.course):''}</span>${issue?'<small class="planner-week-time-warning">needs time correction</small>':''}</button>`;
  }

  function renderDay(){
    const todays=byDate(selectedDate);
    const title=$('#plannerDayTitle');if(title)title.textContent=prettyDate(selectedDate);
    const summary=$('#plannerDaySummary');if(summary)summary.textContent=todays.length?`${todays.length} thing${todays.length===1?'':'s'} planned. Very organized of you.`:'No academic jump scares scheduled yet.';
    renderDayHighlight();
    const agenda=$('#plannerAgenda');
    if(agenda)agenda.innerHTML=todays.length?todays.map(e=>`<button class="planner-agenda-item ${e.type} ${e.done?'shared-task-done':''}" data-planner-event="${escapeHtml(e.id)}" type="button"><div class="planner-agenda-time">${timeLabel(e.start)}</div><div><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.course||TYPE_LABEL[e.type])}${e.notes?' · '+escapeHtml(e.notes):''}</span></div><i>›</i></button>`).join(''):'<div class="planner-empty">nothing planned here yet</div>';

  }

  function renderDayHighlight(){
    const box=$('#plannerDayHighlight');if(!box)return;
    const exam=events.filter(e=>['exam','quiz'].includes(e.type)&&e.date>=selectedDate).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))[0];
    if(!exam){box.innerHTML='';return}
    const days=Math.max(0,Math.round((dateObj(exam.date)-dateObj(selectedDate))/86400000));
    box.innerHTML=`<button class="planner-exam-banner" data-planner-event="${escapeHtml(exam.id)}" type="button"><div class="planner-exam-icon">▣</div><div><strong>Next ${exam.type==='quiz'?'quiz':'exam'}: ${escapeHtml(exam.title)}</strong><span>${shortDate(exam.date)}${exam.start?' · '+timeLabel(exam.start):''}${exam.course?' · '+escapeHtml(exam.course):''}</span></div><div class="planner-days-left"><b>${days}</b>${days===1?'day':'days'} left</div></button>`;
  }

  function renderSidebar(){
    const panel=$('#plannerNextPanel');
    if(panel){
      const today=isoDate(new Date());
      const exam=events.filter(e=>['exam','quiz'].includes(e.type)&&e.date>=today).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))[0];
      panel.innerHTML=exam?`<h3>next ${exam.type==='quiz'?'quiz':'exam'}</h3><button class="planner-next" data-planner-event="${escapeHtml(exam.id)}" type="button"><div class="planner-next-date"><b>${dateObj(exam.date).getDate()}</b><small>${dateObj(exam.date).toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</small></div><div><strong>${escapeHtml(exam.title)}</strong><span>${exam.start?timeLabel(exam.start):'time not set'}${exam.course?' · '+escapeHtml(exam.course):''}</span></div></button>`:'<h3>next exam</h3><div class="planner-empty small">add an exam when you know the date</div>';
    }
    const rec=$('#plannerRecText');
    if(rec){
      const exams=events.filter(e=>['exam','quiz'].includes(e.type)).length,tasks=events.filter(e=>e.type==='task'&&!e.done).length;
      rec.textContent=exams?'Give future you a tiny review block before each exam or quiz.':tasks?'Deadlines are listed. Now give them study blocks before they start yelling.':'Add an exam or deadline and Cramchy will help you see what needs attention.';
    }
  }

  function renderLabel(){
    const label=$('#plannerLabel');if(!label)return;
    if(activeView==='month')label.textContent=monthLabel(monthCursor);
    else if(activeView==='day')label.textContent=prettyDate(selectedDate);
    else{
      const start=startOfWeek(selectedDate),end=addDays(start,6);
      label.textContent=`${shortDate(start)} – ${shortDate(end)}, ${dateObj(end).getFullYear()}`;
    }
  }
  function renderAllPlanner(){
    const taskApi=window.CramchyTaskBridge;
    let imported=false;
    if(taskApi){try{taskApi.import(legacyTasks);imported=true;}catch(error){console.warn('Planner task import kept for retry.',error);}}
    events=[...events.filter(e=>!e.academicExam&&!e.sharedTask&&(!imported||!window.CramchySharedTasks.actionable(e))), ...(taskApi?.events()||[]),...(window.CramchySchedules?.events()||[])];
    renderLabel();renderMonth();renderWeek();renderDay();renderSidebar();syncLogo()}

  function moveCalendar(dir){
    if(activeView==='month'){
      monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()+dir,1,12);
      selectedDate=isoDate(monthCursor);
    }else if(activeView==='week')selectedDate=addDays(selectedDate,dir*7);
    else selectedDate=addDays(selectedDate,dir);
    monthCursor=new Date(dateObj(selectedDate).getFullYear(),dateObj(selectedDate).getMonth(),1,12);
    renderAllPlanner();
  }

  function resetForm(type='study'){
    clearTimeError();
    editingId=null;
    $('#plannerModalTitle').textContent=type==='task'?'add task':'add to planner';
    $('#plannerSaveBtn').textContent='save event';
    $('#plannerDeleteBtn').style.display='none';
    $('#plannerType').disabled=false;
    $('#plannerTitle').value='';$('#plannerType').value=type;$('#plannerCourse').value='';$('#plannerDate').value=selectedDate;$('#plannerStart').value='';$('#plannerEnd').value='';$('#plannerNotes').value='';
    syncTaskFields();
  }
  function fillForm(e){
    clearTimeError();
    editingId=e.id;
    $('#plannerModalTitle').textContent='event details';$('#plannerSaveBtn').textContent='save changes';$('#plannerDeleteBtn').style.display='inline-flex';
    $('#plannerTitle').value=e.title;$('#plannerType').value=e.type;$('#plannerCourse').value=e.course;$('#plannerDate').value=e.date;$('#plannerStart').value=e.start;$('#plannerEnd').value=e.end;$('#plannerNotes').value=e.notes;
    $('#plannerType').disabled=false;syncTaskFields();
  }
  function syncTaskFields(){const shared=window.CramchySharedTasks.actionable({type:$('#plannerType').value});$('#plannerTaskHint').hidden=!shared;$('#plannerDateLabel').textContent=shared?'date (optional)':'date';}
  function openModal(type){resetForm(type);const modal=$('#plannerModal');modal?.classList.add('open');modal?.setAttribute('aria-hidden','false');setTimeout(()=>{const phone=window.matchMedia?.('(max-width:640px)').matches;$(phone?'#plannerModal [data-planner-close]':'#plannerTitle')?.focus()},20)}
  function openEvent(id){const e=events.find(x=>x.id===id);if(!e)return;if(e.academicExam){window.CramchySchedules?.edit(e);return;}fillForm(e);const modal=$('#plannerModal');modal?.classList.add('open');modal?.setAttribute('aria-hidden','false')}
  function closeModal(){const modal=$('#plannerModal');modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true')}

  function clearTimeError(){
    $('#plannerStart')?.setCustomValidity('');$('#plannerEnd')?.setCustomValidity('');
    const error=$('#plannerTimeError');if(error){error.textContent='';error.hidden=true;}
  }
  function showTimeError(message,field){
    const error=$('#plannerTimeError');if(error){error.textContent=message;error.hidden=false;}
    if(field){const input=$(field==='start'?'#plannerStart':'#plannerEnd');input.setCustomValidity(message);input.reportValidity();}
  }

  function bindPlanner(){
    const section=$('#view-planner');if(!section||section.dataset.plannerV3==='1')return;
    section.dataset.plannerV3='1';
    section.addEventListener('keydown',event=>{
      if((event.key==='Enter'||event.key===' ')&&event.target.matches('.planner-day-cell')){
        event.preventDefault();event.target.click();
      }
    });
    const onPlannerClick=e=>{
      const show=e.target.closest('[data-planner-show]');if(show){e.preventDefault();setPlannerView(show.dataset.plannerShow);return}
      const nav=e.target.closest('[data-planner-nav]');if(nav){e.preventDefault();moveCalendar(nav.dataset.plannerNav==='next'?1:-1);return}
      if(e.target.closest('[data-planner-add-course-exam]')){e.preventDefault();window.CramchySchedules?.add();return;}
      const add=e.target.closest('[data-planner-add]');if(add){e.preventDefault();openModal('study');return}
      const ev=e.target.closest('[data-planner-event]');if(ev){e.preventDefault();e.stopPropagation();openEvent(ev.dataset.plannerEvent);return}
      const date=e.target.closest('[data-planner-date]');if(date){selectedDate=date.dataset.plannerDate;monthCursor=new Date(dateObj(selectedDate).getFullYear(),dateObj(selectedDate).getMonth(),1,12);setPlannerView('day');return}
      if(e.target.closest('[data-planner-close]')){e.preventDefault();closeModal();return}
      if(e.target===$('#plannerModal'))closeModal();
    };
    section.addEventListener('click',onPlannerClick);$('#plannerModal').addEventListener('click',onPlannerClick);
    $('#plannerType').addEventListener('change',syncTaskFields);
    const form=$('#plannerForm');
    ['#plannerStart','#plannerEnd'].forEach(selector=>$(selector)?.addEventListener('input',clearTimeError));
    form?.addEventListener('submit',e=>{
      e.preventDefault();
      const item={
        id:editingId||uid(),title:$('#plannerTitle').value.trim()||'Untitled event',type:TYPES.includes($('#plannerType').value)?$('#plannerType').value:'personal',course:$('#plannerCourse').value.trim(),showInTasks:true,date:window.CramchySharedTasks.actionable({type:$('#plannerType').value})?$('#plannerDate').value:$('#plannerDate').value||selectedDate,start:$('#plannerStart').value,end:$('#plannerEnd').value,notes:$('#plannerNotes').value.trim(),done:editingId?Boolean(window.CramchyTaskBridge?.tasks.find(x=>x.id===editingId)?.done||events.find(x=>x.id===editingId)?.done):false
      };
      clearTimeError();
      const issue=TIME.validate(item.start,item.end);
      if(issue){showTimeError(issue.message,issue.field);return;}
      if(window.CramchySharedTasks.actionable(item)&&window.CramchyTaskBridge){
        const previous=events;
        const converting=editingId&&events.some(x=>x.id===editingId&&!x.sharedTask);
        let plannerSaved=false;
        try{
          if(converting){events=events.filter(x=>x.id!==editingId);saveEvents();plannerSaved=true;}
          window.CramchyTaskBridge.put(item);
        }catch(error){
          events=previous;
          if(plannerSaved){try{saveEvents();}catch(rollbackError){console.warn('Planner conversion rollback kept in memory.',rollbackError);}}
          showTimeError('Could not save this task. Your previous entry and this form were kept.');return;
        }
        closeModal();if(item.date){selectedDate=item.date;monthCursor=new Date(dateObj(selectedDate).getFullYear(),dateObj(selectedDate).getMonth(),1,12);}renderAllPlanner();return;
      }
      const previous=events;
      const convertingTask=editingId&&window.CramchyTaskBridge?.tasks.some(t=>t.id===editingId);
      if(editingId&&events.some(x=>x.id===editingId))events=events.map(x=>x.id===editingId?item:x);else events=[...events,item];
      let plannerSaved=false;
      try{
        saveEvents();plannerSaved=true;
        if(convertingTask)window.CramchyTaskBridge.remove(editingId);
      }catch(error){
        events=previous;
        if(plannerSaved){try{saveEvents();}catch(rollbackError){console.warn('Planner conversion rollback kept in memory.',rollbackError);}}
        showTimeError('Could not save this event. Your previous entry and this form were kept.');return;
      }
      selectedDate=item.date;monthCursor=new Date(dateObj(selectedDate).getFullYear(),dateObj(selectedDate).getMonth(),1,12);closeModal();setPlannerView('day');
    });
    $('#plannerDeleteBtn')?.addEventListener('click',()=>{
      if(!editingId)return;
      const shared=window.CramchyTaskBridge?.tasks.some(t=>t.id===editingId);
      try{if(shared)window.CramchyTaskBridge.remove(editingId);else{const previous=events;events=events.filter(x=>x.id!==editingId);try{saveEvents();}catch(error){events=previous;throw error;}}}catch(error){showTimeError('Could not delete this item. Please try again.');return;}
      closeModal();renderAllPlanner();
    });
  }

  function cleanMicrocopyOnce(){
    const replacements=[['nothing due here','nothing due here'],['nothing here yet','nothing here yet'],['no courses yet','no courses yet'],['add your courses','add your courses']];
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{let t=node.nodeValue;replacements.forEach(([a,b])=>{t=t.split(a).join(b)});if(t!==node.nodeValue)node.nodeValue=t});
  }

  function init(){
    ensurePlannerNav();
    const plannerReady=injectPlanner();
    bindTopNav();
    if(plannerReady)bindPlanner();
    enhanceHomeHero();
    syncLogo();
    cleanMicrocopyOnce();
    renderAllPlanner();
  }

  window.CramchyPlannerTasks={add(){openModal('task');$('#plannerDate').value='';},edit(id){const task=window.CramchyTaskBridge?.tasks.find(t=>t.id===id);if(!task)return;fillForm({id:task.id,title:task.text,type:task.type||'task',showInTasks:true,date:task.date||'',course:task.course||'',start:task.start||'',end:task.end||'',notes:task.notes||''});const modal=$('#plannerModal');modal.classList.add('open');modal.setAttribute('aria-hidden','false');}};
  $('#sharedTaskAdd')?.addEventListener('click',()=>window.CramchyPlannerTasks.add());
  window.addEventListener('cramchy:planner-cloud-loaded',()=>{events=loadEvents();legacyTasks=events.filter(e=>window.CramchySharedTasks.actionable(e));renderAllPlanner();});
  window.addEventListener('cramchy:schedules-changed',renderAllPlanner);
  window.addEventListener('cramchy:tasks-changed',renderAllPlanner);
  window.addEventListener('cramchy:backup-restored',()=>{
    events=loadEvents();legacyTasks=events.filter(e=>window.CramchySharedTasks.actionable(e));
    closeModal();
    renderAllPlanner();
  });

  function boot(){
    let tries=0;
    const attempt=()=>{
      tries++;
      init();
      if((document.body.classList.contains('cramchy-home-enhanced')&&$('#view-planner'))||tries>=12)return;
      setTimeout(attempt,120);
    };
    attempt();
    window.addEventListener('load',()=>{init();cleanMicrocopyOnce()},{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
