(function(){
  const STORAGE_KEY='cramchyPlannerEvents_v2';
  const OLD_STORAGE_KEY='cramchyPlannerEvents_v1';
  const FALLBACK_LOGO='assets/cramchy-wordmark.png';
  const TYPES=['class','task','exam','study','personal'];
  const TYPE_LABEL={class:'Class',task:'Task',exam:'Exam',study:'Study block',personal:'Personal'};
  const HOURS=Array.from({length:15},(_,i)=>i+7);

  let events=loadEvents();
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
          start:String(e.start||''),end:String(e.end||''),notes:String(e.notes||''),done:Boolean(e.done)
        }));
    }catch(err){return[]}
  }
  function saveEvents(){localStorage.setItem(STORAGE_KEY,JSON.stringify(events))}

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
              <h2>plot the cram,<br>survive the week</h2>
              <p>Your classes, deadlines, exams, and study blocks finally sitting together like they have their life together.</p>
              <div class="planner-actions"><button class="planner-primary" data-planner-add type="button">add event</button><button class="planner-light" data-planner-show="week" type="button">view week</button></div>
            </div>
          </div>

          <div class="planner-layout">
            <aside class="planner-sidebar">
              <div class="planner-panel"><button class="planner-add" data-planner-add type="button">+ add event</button><div class="planner-legend"><span><i class="planner-dot class"></i>Classes</span><span><i class="planner-dot task"></i>Tasks</span><span><i class="planner-dot exam"></i>Exams</span><span><i class="planner-dot study"></i>Study blocks</span><span><i class="planner-dot personal"></i>Personal</span></div></div>
              <div class="planner-panel" id="plannerNextPanel"></div>
              <div class="planner-panel planner-rec"><h3>Cramchy recommends</h3><p id="plannerRecText">Add an exam or deadline and Cramchy will help you see what needs attention.</p><img class="planner-logo-sync" src="${escapeHtml(getLogoSrc())}" alt=""></div>
            </aside>

            <div class="planner-card">
              <div class="planner-head"><div><h2>Planner</h2><p>Switch between month, week, and day so nothing jumpscares you later.</p></div><div class="planner-tabs"><button class="active" data-planner-show="month" type="button">Month</button><button data-planner-show="week" type="button">Week</button><button data-planner-show="day" type="button">Day</button></div></div>
              <div class="planner-nav"><button type="button" data-planner-nav="prev" aria-label="previous">‹</button><strong id="plannerLabel"></strong><button type="button" data-planner-nav="next" aria-label="next">›</button></div>
              <div class="planner-view active" id="plannerMonthView"><div class="planner-month-grid" id="plannerMonthGrid"></div></div>
              <div class="planner-view" id="plannerWeekView"><div class="planner-week-scroll"><div class="planner-week-grid" id="plannerWeekGrid"></div></div></div>
              <div class="planner-view" id="plannerDayView"><div class="planner-day-grid"><div><div class="planner-today"><h3 id="plannerDayTitle"></h3><p id="plannerDaySummary"></p><div id="plannerDayHighlight"></div></div><div class="planner-agenda" id="plannerAgenda"></div></div><aside class="planner-tasks"><h3>tasks due today</h3><div id="plannerTasks"></div><button class="planner-add" data-planner-add-task type="button">add task</button></aside></div></div>
            </div>
          </div>
        </div>

        <div class="planner-modal-backdrop" id="plannerModal" aria-hidden="true">
          <div class="planner-modal" role="dialog" aria-modal="true" aria-labelledby="plannerModalTitle">
            <div class="planner-modal-head"><h3 id="plannerModalTitle">add to planner</h3><button type="button" data-planner-close aria-label="close">×</button></div>
            <form id="plannerForm" class="planner-form">
              <label class="full">title<input id="plannerTitle" autocomplete="off" placeholder="ex. anaphy quiz review" required></label>
              <label>type<select id="plannerType"><option value="study">Study block</option><option value="class">Class</option><option value="task">Task</option><option value="exam">Exam</option><option value="personal">Personal</option></select></label>
              <label>course<input id="plannerCourse" autocomplete="off" placeholder="course or subject"></label>
              <label>date<input id="plannerDate" type="date"></label>
              <label>start<input id="plannerStart" type="time"></label>
              <label>end<input id="plannerEnd" type="time"></label>
              <label class="full">notes<textarea id="plannerNotes" placeholder="tiny notes, room, reminders, links..."></textarea></label>
              <div class="planner-modal-actions full"><button class="planner-danger" id="plannerDeleteBtn" type="button">delete</button><span></span><button class="planner-light" type="button" data-planner-close>cancel</button><button class="planner-primary" type="submit" id="plannerSaveBtn">save event</button></div>
            </form>
          </div>
        </div>
      </section>`);
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
    $all('[data-planner-show]','#view-planner').forEach(b=>b.classList.toggle('active',b.dataset.plannerShow===view));
    $all('.planner-view','#view-planner').forEach(v=>v.classList.remove('active'));
    $('#planner'+view[0].toUpperCase()+view.slice(1)+'View')?.classList.add('active');
    renderAllPlanner();
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
      const pills=list.slice(0,3).map(ev=>`<button class="planner-event-pill ${ev.type}" data-planner-event="${escapeHtml(ev.id)}" type="button"><i class="planner-dot ${ev.type}"></i><span>${escapeHtml(ev.title)}</span></button>`).join('');
      const more=list.length>3?`<button class="planner-more" data-planner-date="${iso}" type="button">+${list.length-3} more</button>`:'';
      cells.push(`<div class="planner-day-cell ${muted?'muted':''} ${iso===selectedDate?'selected':''}" data-planner-date="${iso}" tabindex="0"><span class="planner-date-num ${iso===isoDate(new Date())?'today':''}">${d.getDate()}</span>${pills}${more}</div>`);
    }
    grid.innerHTML=cells.join('');
  }

  function renderWeek(){
    const grid=$('#plannerWeekGrid');if(!grid)return;
    const start=startOfWeek(selectedDate);
    const days=Array.from({length:7},(_,i)=>addDays(start,i));
    let html='<div class="planner-week-head blank"></div>'+days.map(d=>`<button type="button" class="planner-week-head ${d===selectedDate?'selected':''}" data-planner-date="${d}"><small>${dateObj(d).toLocaleDateString('en-US',{weekday:'short'})}</small><span>${dateObj(d).getDate()}</span></button>`).join('');
    html+='<div class="planner-time-label">all day</div>'+days.map(d=>`<div class="planner-week-slot">${byDate(d).filter(e=>!e.start).map(e=>weekEventHtml(e)).join('')}</div>`).join('');
    HOURS.forEach(hour=>{
      const suffix=hour>=12?'PM':'AM';const label=`${hour>12?hour-12:hour} ${suffix}`;
      html+=`<div class="planner-time-label">${label}</div>`;
      days.forEach(d=>{
        const list=byDate(d).filter(e=>e.start&&Number(e.start.slice(0,2))===hour);
        html+=`<div class="planner-week-slot" data-planner-date="${d}" data-planner-hour="${hour}">${list.map(e=>weekEventHtml(e)).join('')}</div>`;
      });
    });
    grid.innerHTML=html;
  }
  function weekEventHtml(e){return `<button class="planner-week-event ${e.type}" data-planner-event="${escapeHtml(e.id)}" type="button"><strong>${escapeHtml(e.title)}</strong><span>${e.start?compactTime(e.start):'all day'}${e.end?'–'+compactTime(e.end):''}${e.course?' · '+escapeHtml(e.course):''}</span></button>`}

  function renderDay(){
    const todays=byDate(selectedDate);
    const title=$('#plannerDayTitle');if(title)title.textContent=prettyDate(selectedDate);
    const summary=$('#plannerDaySummary');if(summary)summary.textContent=todays.length?`${todays.length} thing${todays.length===1?'':'s'} planned. Very organized of you.`:'No academic jump scares scheduled yet.';
    renderDayHighlight();
    const agenda=$('#plannerAgenda');
    if(agenda)agenda.innerHTML=todays.length?todays.map(e=>`<button class="planner-agenda-item ${e.type}" data-planner-event="${escapeHtml(e.id)}" type="button"><div class="planner-agenda-time">${timeLabel(e.start)}</div><div><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.course||TYPE_LABEL[e.type])}${e.notes?' · '+escapeHtml(e.notes):''}</span></div><i>›</i></button>`).join(''):'<div class="planner-empty">nothing planned here yet</div>';
    const tasks=$('#plannerTasks');
    if(tasks){
      const due=todays.filter(e=>e.type==='task');
      tasks.innerHTML=due.length?due.map(e=>`<div class="planner-task-row"><button class="planner-check ${e.done?'done':''}" data-planner-toggle-task="${escapeHtml(e.id)}" type="button" aria-label="toggle task"></button><button class="planner-task-copy" data-planner-event="${escapeHtml(e.id)}" type="button"><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.course||'Task')}</span></button></div>`).join(''):'<div class="planner-empty small">no tasks due today</div>';
    }
  }

  function renderDayHighlight(){
    const box=$('#plannerDayHighlight');if(!box)return;
    const exam=events.filter(e=>e.type==='exam'&&e.date>=selectedDate).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))[0];
    if(!exam){box.innerHTML='';return}
    const days=Math.max(0,Math.round((dateObj(exam.date)-dateObj(selectedDate))/86400000));
    box.innerHTML=`<button class="planner-exam-banner" data-planner-event="${escapeHtml(exam.id)}" type="button"><div class="planner-exam-icon">▣</div><div><strong>Next exam: ${escapeHtml(exam.title)}</strong><span>${shortDate(exam.date)}${exam.start?' · '+timeLabel(exam.start):''}${exam.course?' · '+escapeHtml(exam.course):''}</span></div><div class="planner-days-left"><b>${days}</b>${days===1?'day':'days'} left</div></button>`;
  }

  function renderSidebar(){
    const panel=$('#plannerNextPanel');
    if(panel){
      const today=isoDate(new Date());
      const exam=events.filter(e=>e.type==='exam'&&e.date>=today).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))[0];
      panel.innerHTML=exam?`<h3>next exam</h3><button class="planner-next" data-planner-event="${escapeHtml(exam.id)}" type="button"><div class="planner-next-date"><b>${dateObj(exam.date).getDate()}</b><small>${dateObj(exam.date).toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</small></div><div><strong>${escapeHtml(exam.title)}</strong><span>${exam.start?timeLabel(exam.start):'time not set'}${exam.course?' · '+escapeHtml(exam.course):''}</span></div></button>`:'<h3>next exam</h3><div class="planner-empty small">add an exam when you know the date</div>';
    }
    const rec=$('#plannerRecText');
    if(rec){
      const exams=events.filter(e=>e.type==='exam').length,tasks=events.filter(e=>e.type==='task'&&!e.done).length;
      rec.textContent=exams?'Give future you a tiny review block before each exam.':tasks?'Deadlines are listed. Now give them study blocks before they start yelling.':'Add an exam or deadline and Cramchy will help you see what needs attention.';
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
  function renderAllPlanner(){renderLabel();renderMonth();renderWeek();renderDay();renderSidebar();syncLogo()}

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
    editingId=null;
    $('#plannerModalTitle').textContent=type==='task'?'add task':'add to planner';
    $('#plannerSaveBtn').textContent='save event';
    $('#plannerDeleteBtn').style.display='none';
    $('#plannerTitle').value='';$('#plannerType').value=type;$('#plannerCourse').value='';$('#plannerDate').value=selectedDate;$('#plannerStart').value='';$('#plannerEnd').value='';$('#plannerNotes').value='';
  }
  function fillForm(e){
    editingId=e.id;
    $('#plannerModalTitle').textContent='event details';$('#plannerSaveBtn').textContent='save changes';$('#plannerDeleteBtn').style.display='inline-flex';
    $('#plannerTitle').value=e.title;$('#plannerType').value=e.type;$('#plannerCourse').value=e.course;$('#plannerDate').value=e.date;$('#plannerStart').value=e.start;$('#plannerEnd').value=e.end;$('#plannerNotes').value=e.notes;
  }
  function openModal(type){resetForm(type);const modal=$('#plannerModal');modal?.classList.add('open');modal?.setAttribute('aria-hidden','false');setTimeout(()=>$('#plannerTitle')?.focus(),20)}
  function openEvent(id){const e=events.find(x=>x.id===id);if(!e)return;fillForm(e);const modal=$('#plannerModal');modal?.classList.add('open');modal?.setAttribute('aria-hidden','false')}
  function closeModal(){const modal=$('#plannerModal');modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true')}

  function bindPlanner(){
    const section=$('#view-planner');if(!section||section.dataset.plannerV3==='1')return;
    section.dataset.plannerV3='1';
    section.addEventListener('click',e=>{
      const show=e.target.closest('[data-planner-show]');if(show){e.preventDefault();setPlannerView(show.dataset.plannerShow);return}
      const nav=e.target.closest('[data-planner-nav]');if(nav){e.preventDefault();moveCalendar(nav.dataset.plannerNav==='next'?1:-1);return}
      const add=e.target.closest('[data-planner-add]');if(add){e.preventDefault();openModal('study');return}
      const addTask=e.target.closest('[data-planner-add-task]');if(addTask){e.preventDefault();openModal('task');return}
      const ev=e.target.closest('[data-planner-event]');if(ev){e.preventDefault();e.stopPropagation();openEvent(ev.dataset.plannerEvent);return}
      const toggle=e.target.closest('[data-planner-toggle-task]');if(toggle){e.preventDefault();const item=events.find(x=>x.id===toggle.dataset.plannerToggleTask);if(item){item.done=!item.done;saveEvents();renderAllPlanner()}return}
      const date=e.target.closest('[data-planner-date]');if(date){selectedDate=date.dataset.plannerDate;monthCursor=new Date(dateObj(selectedDate).getFullYear(),dateObj(selectedDate).getMonth(),1,12);setPlannerView('day');return}
      if(e.target.closest('[data-planner-close]')){e.preventDefault();closeModal();return}
      if(e.target===$('#plannerModal'))closeModal();
    });
    const form=$('#plannerForm');
    form?.addEventListener('submit',e=>{
      e.preventDefault();
      const item={
        id:editingId||uid(),title:$('#plannerTitle').value.trim()||'Untitled event',type:TYPES.includes($('#plannerType').value)?$('#plannerType').value:'personal',course:$('#plannerCourse').value.trim(),date:$('#plannerDate').value||selectedDate,start:$('#plannerStart').value,end:$('#plannerEnd').value,notes:$('#plannerNotes').value.trim(),done:editingId?Boolean(events.find(x=>x.id===editingId)?.done):false
      };
      if(editingId)events=events.map(x=>x.id===editingId?item:x);else events.push(item);
      selectedDate=item.date;monthCursor=new Date(dateObj(selectedDate).getFullYear(),dateObj(selectedDate).getMonth(),1,12);saveEvents();closeModal();setPlannerView('day');
    });
    $('#plannerDeleteBtn')?.addEventListener('click',()=>{
      if(!editingId)return;
      events=events.filter(x=>x.id!==editingId);saveEvents();closeModal();renderAllPlanner();
    });
  }

  function cleanMicrocopyOnce(){
    const replacements=[['nothing due here ♡','nothing due here'],['nothing here yet ♡','nothing here yet'],['no courses yet ♡','no courses yet'],['add your courses ♡','add your courses']];
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
