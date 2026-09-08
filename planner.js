(function(){
  const STORAGE_KEY = 'cramchyPlannerEvents_v1';
  const FALLBACK_LOGO = 'assets/cramchy-wordmark.png';
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const hours = [8,9,10,11,12,13,14,15,16,17,18,19];
  const labels = { month:'September 2026', week:'Sep 6 – 12, 2026', day:'Wednesday, Sep 9, 2026' };
  const typeLabel = { class:'Class', task:'Task', exam:'Exam', study:'Study block', personal:'Personal' };
  const seeds = [
    {id:'p1',title:'Anaphy lab',type:'class',course:'Human Anatomy',date:'2026-09-07',start:'09:00',end:'11:00',notes:'Lab review'},
    {id:'p2',title:'EdTech class',type:'class',course:'Educational Technology',date:'2026-09-08',start:'08:00',end:'10:00',notes:'Room 806'},
    {id:'p3',title:'Submit activity',type:'task',course:'Educational Technology',date:'2026-09-08',start:'15:00',end:'15:30',notes:'Upload before night'},
    {id:'p4',title:'Review block',type:'study',course:'Educational Technology',date:'2026-09-09',start:'09:30',end:'10:15',notes:'Slides + active recall'},
    {id:'p5',title:'Planner reset',type:'personal',course:'',date:'2026-09-09',start:'15:00',end:'15:30',notes:'Organize deadlines'},
    {id:'p6',title:'Flashcards',type:'study',course:'Educational Technology',date:'2026-09-09',start:'17:00',end:'17:45',notes:'Quick recall'},
    {id:'p7',title:'EdTech Midterm',type:'exam',course:'Educational Technology',date:'2026-09-10',start:'13:00',end:'15:00',notes:'Room 806'},
    {id:'p8',title:'Research draft',type:'task',course:'Field Methods',date:'2026-09-11',start:'15:00',end:'16:00',notes:'Group work'},
    {id:'p9',title:'Principles class',type:'class',course:'Principles of Teaching',date:'2026-09-12',start:'17:00',end:'19:00',notes:'Room 603'}
  ];
  let selectedDate = '2026-09-09';
  let activeView = 'month';
  let events = loadEvents();

  function loadEvents(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return seeds.slice();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : seeds.slice();
    }catch(e){ return seeds.slice(); }
  }
  function saveEvents(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); }
  function uid(){ return 'planner-' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function byDate(date){ return events.filter(e => e.date === date).sort((a,b)=>(a.start||'').localeCompare(b.start||'')); }
  function dayName(date){ return new Date(date + 'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}); }
  function shortTime(t){ if(!t) return ''; const [h,m]=t.split(':').map(Number); const suffix=h>=12?'PM':'AM'; const hr=((h+11)%12)+1; return `${hr}:${String(m||0).padStart(2,'0')} ${suffix}`; }
  function compactTime(t){ if(!t) return ''; const [h,m]=t.split(':').map(Number); const suffix=h>=12?'PM':'AM'; const hr=((h+11)%12)+1; return m ? `${hr}:${String(m).padStart(2,'0')}` : `${hr}`; }
  function escapeHtml(s){ return String(s||'').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function injectFonts(){
    if(document.getElementById('cramchyPlannerFonts')) return;
    const link = document.createElement('link');
    link.id = 'cramchyPlannerFonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DynaPuff:wght@500;600;700&family=M+PLUS+Rounded+1c:wght@400;500;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  function injectPlannerShell(){
    if(document.getElementById('view-planner')) return;
    const timerBtn = document.querySelector('.topnav .navbtn[data-tab="timer"]');
    if(timerBtn && !document.querySelector('.topnav .navbtn[data-tab="planner"]')){
      timerBtn.insertAdjacentHTML('afterend','<button class="navbtn" data-tab="planner">Planner</button>');
    }
    const main = document.querySelector('main');
    if(!main) return;
    main.insertAdjacentHTML('beforeend', `
      <section class="view" id="view-planner">
        <div class="planner-page">
          <div class="planner-hero-card">
            <div class="planner-logo-wrap"><img class="planner-logo-sync planner-main-logo" src="${FALLBACK_LOGO}" alt="Cramchy logo"></div>
            <div class="planner-hero-copy">
              <div class="planner-kicker">planner preview</div>
              <h2>plan cuter,<br>study clearer</h2>
              <p>A Google Calendar-style space for classes, exams, tasks, study blocks, and personal reminders.</p>
              <div class="planner-actions"><button class="planner-primary" data-planner-open-modal>add event</button><button class="planner-light" data-planner-show="week">view week</button></div>
            </div>
          </div>

          <div class="planner-layout">
            <aside class="planner-sidebar">
              <div class="planner-panel"><button class="planner-add" data-planner-open-modal>+ add event</button><div class="planner-legend"><span><i class="planner-dot class"></i>Classes</span><span><i class="planner-dot task"></i>Tasks</span><span><i class="planner-dot exam"></i>Exams</span><span><i class="planner-dot study"></i>Study blocks</span><span><i class="planner-dot personal"></i>Personal</span></div></div>
              <div class="planner-panel"><h3>next exam</h3><div class="planner-next"><div class="planner-next-date"><b>10</b><small>SEP</small></div><div><strong>Educational Technology</strong><span>Thu · 1:00 PM · Room 806</span></div></div></div>
              <div class="planner-panel planner-rec"><h3>Cramchy recommends</h3><p>Friday looks packed. Add a short review block tonight so tomorrow feels lighter.</p><img class="planner-logo-sync" src="${FALLBACK_LOGO}" alt=""></div>
            </aside>

            <div class="planner-card">
              <div class="planner-head"><div><h2>Planner</h2><p>Month, week, and day views for academic planning.</p></div><div class="planner-tabs"><button class="active" data-planner-show="month">Month</button><button data-planner-show="week">Week</button><button data-planner-show="day">Day</button></div></div>
              <div class="planner-nav"><button type="button">‹</button><strong id="plannerLabel">September 2026</strong><button type="button">›</button></div>
              <div class="planner-view active" id="plannerMonthView"><div class="planner-month-grid" id="plannerMonthGrid"></div></div>
              <div class="planner-view" id="plannerWeekView"><div class="planner-week-scroll"><div class="planner-week-grid" id="plannerWeekGrid"></div></div></div>
              <div class="planner-view" id="plannerDayView"><div class="planner-day-grid"><div><div class="planner-today"><h3 id="plannerDayTitle">Wednesday, September 9</h3><p id="plannerDaySummary">Today has room for a calm review block.</p><div class="planner-exam-banner"><div class="planner-exam-icon">▣</div><div><strong>Next exam: Educational Technology</strong><span>Thu, Sep 10 · 1:00 PM · Room 806</span></div><div class="planner-days-left"><b>1</b>day left</div></div></div><div class="planner-agenda" id="plannerAgenda"></div></div><aside class="planner-tasks"><h3>tasks due today</h3><div id="plannerTasks"></div><button class="planner-add" data-planner-open-modal>add task</button></aside></div></div>
            </div>
          </div>
        </div>

        <div class="planner-modal-backdrop" id="plannerModal">
          <div class="planner-modal">
            <div class="planner-modal-head"><h3>add to planner</h3><button type="button" data-planner-close>×</button></div>
            <form id="plannerForm" class="planner-form">
              <label class="full">title<input id="plannerTitle" value="EdTech review block" required></label>
              <label>type<select id="plannerType"><option value="study">Study block</option><option value="class">Class</option><option value="task">Task</option><option value="exam">Exam</option><option value="personal">Personal</option></select></label>
              <label>course<input id="plannerCourse" value="Educational Technology"></label>
              <label>date<input id="plannerDate" type="date" value="2026-09-09"></label>
              <label>start<input id="plannerStart" type="time" value="17:00"></label>
              <label>end<input id="plannerEnd" type="time" value="17:45"></label>
              <label class="full">notes<textarea id="plannerNotes">Focus on the slides, then do active recall.</textarea></label>
              <div class="planner-modal-actions full"><button class="planner-light" type="button" data-planner-close>cancel</button><button class="planner-primary" type="submit">save event</button></div>
            </form>
          </div>
        </div>
      </section>`);
  }

  function setPlannerView(view){
    activeView = view;
    document.querySelectorAll('[data-planner-show]').forEach(b => b.classList.toggle('active', b.dataset.plannerShow === view));
    document.querySelectorAll('.planner-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('planner' + view[0].toUpperCase() + view.slice(1) + 'View');
    if(target) target.classList.add('active');
    const label = document.getElementById('plannerLabel');
    if(label) label.textContent = view === 'day' ? dayName(selectedDate) : labels[view];
    renderPlanner();
  }

  function renderMonth(){
    const grid = document.getElementById('plannerMonthGrid'); if(!grid) return;
    const cells = weekdays.map(w => `<div class="planner-weekday">${w}</div>`);
    const days = [
      ['2026-08-30',30,true],['2026-08-31',31,true],
      ...Array.from({length:30},(_,i)=>[`2026-09-${String(i+1).padStart(2,'0')}`,i+1,false]),
      ['2026-10-01',1,true],['2026-10-02',2,true],['2026-10-03',3,true]
    ];
    days.forEach(([date,num,muted]) => {
      const dayEvents = byDate(date).slice(0,3);
      cells.push(`<button class="planner-day-cell ${muted?'muted':''} ${date===selectedDate?'selected':''}" data-date="${date}" type="button"><span class="planner-date-num ${date==='2026-09-09'?'today':''}">${num}</span>${dayEvents.map(e=>`<span class="planner-event-pill ${e.type}"><i class="planner-dot ${e.type}"></i>${escapeHtml(e.title)}</span>`).join('')}</button>`);
    });
    grid.innerHTML = cells.join('');
    grid.querySelectorAll('[data-date]').forEach(btn => btn.addEventListener('click', () => { selectedDate = btn.dataset.date; setPlannerView('day'); }));
  }

  function renderWeek(){
    const grid = document.getElementById('plannerWeekGrid'); if(!grid) return;
    const week = ['2026-09-06','2026-09-07','2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12'];
    let html = '<div class="planner-week-head blank"></div>' + week.map(d => `<button type="button" class="planner-week-head ${d===selectedDate?'selected':''}" data-date="${d}"><small>${weekdays[new Date(d+'T12:00:00').getDay()]}</small><span>${Number(d.slice(-2))}</span></button>`).join('');
    hours.forEach(h => {
      html += `<div class="planner-time-label">${h>12?h-12:h} ${h>=12?'PM':'AM'}</div>`;
      week.forEach(d => {
        const slotEvents = byDate(d).filter(e => Number((e.start||'00:00').slice(0,2)) === h);
        html += `<div class="planner-week-slot">${slotEvents.map(e=>`<div class="planner-week-event ${e.type}">${escapeHtml(e.title)}<span>${compactTime(e.start)}${e.end?'–'+compactTime(e.end):''} · ${escapeHtml(e.course||typeLabel[e.type])}</span></div>`).join('')}</div>`;
      });
    });
    grid.innerHTML = html;
    grid.querySelectorAll('[data-date]').forEach(btn => btn.addEventListener('click', () => { selectedDate = btn.dataset.date; setPlannerView('day'); }));
  }

  function renderDay(){
    const title = document.getElementById('plannerDayTitle'); if(title) title.textContent = dayName(selectedDate);
    const todays = byDate(selectedDate);
    const agenda = document.getElementById('plannerAgenda');
    const tasks = document.getElementById('plannerTasks');
    if(agenda){
      agenda.innerHTML = todays.length ? todays.map(e => `<div class="planner-agenda-item ${e.type}"><div class="planner-agenda-time">${shortTime(e.start)}</div><div><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.course || typeLabel[e.type])}${e.notes?' · '+escapeHtml(e.notes):''}</span></div><button type="button">›</button></div>`).join('') : '<div class="planner-empty">nothing planned here yet</div>';
    }
    if(tasks){
      const due = todays.filter(e => e.type === 'task');
      tasks.innerHTML = due.length ? due.map((e,i)=>`<div class="planner-task-row"><span class="planner-check ${i===0?'done':''}"></span><div><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.course || 'Task')}</span></div></div>`).join('') : '<div class="planner-empty small">no tasks due today</div>';
    }
  }
  function renderPlanner(){ renderMonth(); renderWeek(); renderDay(); }

  function openModal(){ document.getElementById('plannerModal')?.classList.add('open'); }
  function closeModal(){ document.getElementById('plannerModal')?.classList.remove('open'); }

  function setupPlanner(){
    document.querySelectorAll('[data-planner-show]').forEach(btn => btn.addEventListener('click', () => setPlannerView(btn.dataset.plannerShow)));
    document.querySelectorAll('[data-planner-open-modal]').forEach(btn => btn.addEventListener('click', openModal));
    document.querySelectorAll('[data-planner-close]').forEach(btn => btn.addEventListener('click', closeModal));
    const modal = document.getElementById('plannerModal');
    if(modal) modal.addEventListener('click', e => { if(e.target === modal) closeModal(); });
    const form = document.getElementById('plannerForm');
    if(form){
      form.addEventListener('submit', e => {
        e.preventDefault();
        events.push({ id: uid(), title: plannerTitle.value.trim() || 'Untitled event', type: plannerType.value, course: plannerCourse.value.trim(), date: plannerDate.value, start: plannerStart.value, end: plannerEnd.value, notes: plannerNotes.value.trim() });
        selectedDate = plannerDate.value;
        saveEvents();
        closeModal();
        setPlannerView('day');
      });
    }
    const plannerNav = document.querySelector('.topnav .navbtn[data-tab="planner"]');
    if(plannerNav){
      plannerNav.addEventListener('click', () => {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-planner')?.classList.add('active');
        document.querySelectorAll('.navbtn').forEach(b => b.classList.remove('active'));
        plannerNav.classList.add('active');
      });
    }
    setPlannerView(activeView);
    syncPlannerLogo();
    setTimeout(syncPlannerLogo, 700);
    setTimeout(syncPlannerLogo, 1400);
  }

  function syncPlannerLogo(){
    const src = document.querySelector('.topnav .brand img.brand-full-logo')?.src || document.querySelector('.topnav .brand img')?.src || FALLBACK_LOGO;
    document.querySelectorAll('.planner-logo-sync').forEach(img => { if(img.src !== src) img.src = src; });
  }

  injectFonts();
  injectPlannerShell();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupPlanner); else setupPlanner();
  window.addEventListener('load', syncPlannerLogo);
})();
