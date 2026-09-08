(function(){
  const STORAGE_KEY = 'cramchyPlannerEvents_v2';
  const OLD_STORAGE_KEY = 'cramchyPlannerEvents_v1';
  const FALLBACK_LOGO = 'assets/cramchy-wordmark.png';
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const weekDates = ['2026-09-06','2026-09-07','2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12'];
  const hours = [7,8,9,10,11,12,13,14,15,16,17,18,19,20,21];
  const typeLabel = { class:'Class', task:'Task', exam:'Exam', study:'Study block', personal:'Personal' };
  const viewLabels = { month:'September 2026', week:'Sep 6 – 12, 2026' };

  let selectedDate = '2026-09-09';
  let activeView = 'month';
  let editingId = null;
  let events = loadEvents();

  function $(selector, root=document){ return root.querySelector(selector); }
  function $all(selector, root=document){ return Array.from(root.querySelectorAll(selector)); }
  function escapeHtml(s){ return String(s||'').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function uid(){ return 'planner-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8); }
  function safeDate(date){ return /^\d{4}-\d{2}-\d{2}$/.test(String(date||'')) ? date : selectedDate; }
  function byDate(date){ return events.filter(e => e.date === date).sort((a,b)=>(a.start||'99:99').localeCompare(b.start||'99:99')); }
  function shortTime(t){
    if(!t) return 'anytime';
    const [h,m] = String(t).split(':').map(Number);
    if(Number.isNaN(h)) return t;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hr = ((h + 11) % 12) + 1;
    return `${hr}:${String(m || 0).padStart(2,'0')} ${suffix}`;
  }
  function compactTime(t){
    if(!t) return '';
    const [h,m] = String(t).split(':').map(Number);
    if(Number.isNaN(h)) return t;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hr = ((h + 11) % 12) + 1;
    return m ? `${hr}:${String(m).padStart(2,'0')}` : `${hr}`;
  }
  function prettyDate(date){
    try{ return new Date(date + 'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}); }
    catch(e){ return date; }
  }
  function loadEvents(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY);
      if(!raw) return [];
      const parsed = JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      return parsed
        .filter(e => e && typeof e === 'object')
        .filter(e => !/^p\d+$/.test(String(e.id || '')))
        .map(e => ({
          id: e.id || uid(),
          title: e.title || 'Untitled event',
          type: ['class','task','exam','study','personal'].includes(e.type) ? e.type : 'personal',
          course: e.course || '',
          date: safeDate(e.date),
          start: e.start || '',
          end: e.end || '',
          notes: e.notes || '',
          done: Boolean(e.done)
        }));
    }catch(e){ return []; }
  }
  function saveEvents(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); }
  function getLogoSrc(){
    return $('.topnav .brand img.brand-full-logo')?.src || $('.topnav .brand img')?.src || $('.hero-wordmark')?.src || FALLBACK_LOGO;
  }

  function injectFonts(){
    if($('#cramchyPlannerFonts')) return;
    const link = document.createElement('link');
    link.id = 'cramchyPlannerFonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DynaPuff:wght@500;600;700&family=M+PLUS+Rounded+1c:wght@400;500;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  function enhanceHomeHero(){
    const home = $('#view-dashboard .daily-home');
    if(!home || $('.cramchy-home-header', home)) return false;

    const oldHero = $(':scope > .hero', home);
    const dailyHero = $(':scope > .daily-hero', home);
    const dailyTitle = dailyHero ? $('.daily-title', dailyHero) : null;
    const quickAdd = dailyHero ? $('#dailyQuickAddBtn', dailyHero) : $('#dailyQuickAddBtn');
    if(!dailyTitle) return false;

    const header = document.createElement('div');
    header.className = 'cramchy-home-header';
    header.innerHTML = `
      <div class="cramchy-home-logo-zone">
        <img class="cramchy-home-logo planner-logo-sync" src="${escapeHtml(getLogoSrc())}" alt="Cramchy logo">
        <span class="cramchy-sticker sticker-one">small steps, big receipts</span>
        <span class="cramchy-sparkle sparkle-a">✦</span>
        <span class="cramchy-sparkle sparkle-b">✧</span>
      </div>
      <div class="cramchy-home-copy"></div>`;

    const copy = $('.cramchy-home-copy', header);
    const kicker = document.createElement('div');
    kicker.className = 'cramchy-home-kicker';
    kicker.textContent = 'today in cramchy';
    copy.appendChild(kicker);
    copy.appendChild(dailyTitle);
    if(quickAdd){
      const actions = document.createElement('div');
      actions.className = 'cramchy-home-actions';
      actions.appendChild(quickAdd);
      copy.appendChild(actions);
    }

    home.insertBefore(header, oldHero || home.firstChild);
    if(oldHero) oldHero.remove();
    if(dailyHero && dailyHero.children.length === 0) dailyHero.remove();
    return true;
  }

  function injectPlannerShell(){
    if($('#view-planner')) return true;
    const nav = $('.topnav');
    const main = $('main');
    if(!nav || !main) return false;

    if(!$('.topnav .navbtn[data-tab="planner"]')){
      const gradesBtn = $('.topnav .navbtn[data-tab="grades"]');
      const html = '<button class="navbtn" data-tab="planner" type="button">Planner</button>';
      if(gradesBtn) gradesBtn.insertAdjacentHTML('beforebegin', html);
      else nav.insertAdjacentHTML('beforeend', html);
    }

    main.insertAdjacentHTML('beforeend', `
      <section class="view" id="view-planner">
        <div class="planner-page">
          <div class="planner-hero-card">
            <div class="planner-logo-wrap">
              <img class="planner-logo-sync planner-main-logo" src="${escapeHtml(getLogoSrc())}" alt="Cramchy logo">
              <span class="planner-sticker">deadlines, but make it managed</span>
            </div>
            <div class="planner-hero-copy">
              <h2>plot the cram,<br>survive the week</h2>
              <p>Your classes, deadlines, exams, and study blocks finally sitting together like they have their life together.</p>
              <div class="planner-actions">
                <button class="planner-primary" data-planner-add type="button">add event</button>
                <button class="planner-light" data-planner-show="week" type="button">view week</button>
              </div>
            </div>
          </div>

          <div class="planner-layout">
            <aside class="planner-sidebar">
              <div class="planner-panel">
                <button class="planner-add" data-planner-add type="button">+ add event</button>
                <div class="planner-legend">
                  <span><i class="planner-dot class"></i>Classes</span>
                  <span><i class="planner-dot task"></i>Tasks</span>
                  <span><i class="planner-dot exam"></i>Exams</span>
                  <span><i class="planner-dot study"></i>Study blocks</span>
                  <span><i class="planner-dot personal"></i>Personal</span>
                </div>
              </div>
              <div class="planner-panel" id="plannerNextPanel"></div>
              <div class="planner-panel planner-rec">
                <h3>Cramchy recommends</h3>
                <p id="plannerRecText">Add your first exam or deadline and Cramchy will help you see what needs attention.</p>
                <img class="planner-logo-sync" src="${escapeHtml(getLogoSrc())}" alt="">
              </div>
            </aside>

            <div class="planner-card">
              <div class="planner-head">
                <div><h2>Planner</h2><p>Switch between month, week, and day so nothing jumpscares you later.</p></div>
                <div class="planner-tabs">
                  <button class="active" data-planner-show="month" type="button">Month</button>
                  <button data-planner-show="week" type="button">Week</button>
                  <button data-planner-show="day" type="button">Day</button>
                </div>
              </div>
              <div class="planner-nav"><button type="button" aria-label="previous">‹</button><strong id="plannerLabel">September 2026</strong><button type="button" aria-label="next">›</button></div>
              <div class="planner-view active" id="plannerMonthView"><div class="planner-month-grid" id="plannerMonthGrid"></div></div>
              <div class="planner-view" id="plannerWeekView"><div class="planner-week-scroll"><div class="planner-week-grid" id="plannerWeekGrid"></div></div></div>
              <div class="planner-view" id="plannerDayView">
                <div class="planner-day-grid">
                  <div>
                    <div class="planner-today">
                      <h3 id="plannerDayTitle">Wednesday, September 9, 2026</h3>
                      <p id="plannerDaySummary">No academic jump scares scheduled yet.</p>
                      <div id="plannerDayHighlight"></div>
                    </div>
                    <div class="planner-agenda" id="plannerAgenda"></div>
                  </div>
                  <aside class="planner-tasks">
                    <h3>tasks due today</h3>
                    <div id="plannerTasks"></div>
                    <button class="planner-add" data-planner-add-task type="button">add task</button>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="planner-modal-backdrop" id="plannerModal" aria-hidden="true">
          <div class="planner-modal" role="dialog" aria-modal="true" aria-labelledby="plannerModalTitle">
            <div class="planner-modal-head">
              <h3 id="plannerModalTitle">add to planner</h3>
              <button type="button" data-planner-close aria-label="close">×</button>
            </div>
            <form id="plannerForm" class="planner-form">
              <label class="full">title<input id="plannerTitle" autocomplete="off" placeholder="ex. anaphy quiz review" required></label>
              <label>type<select id="plannerType"><option value="study">Study block</option><option value="class">Class</option><option value="task">Task</option><option value="exam">Exam</option><option value="personal">Personal</option></select></label>
              <label>course<input id="plannerCourse" autocomplete="off" placeholder="course or subject"></label>
              <label>date<input id="plannerDate" type="date" value="2026-09-09"></label>
              <label>start<input id="plannerStart" type="time"></label>
              <label>end<input id="plannerEnd" type="time"></label>
              <label class="full">notes<textarea id="plannerNotes" placeholder="tiny notes, room, reminders, links..."></textarea></label>
              <div class="planner-modal-actions full">
                <button class="planner-danger" id="plannerDeleteBtn" type="button">delete</button>
                <span></span>
                <button class="planner-light" type="button" data-planner-close>cancel</button>
                <button class="planner-primary" type="submit" id="plannerSaveBtn">save event</button>
              </div>
            </form>
          </div>
        </div>
      </section>`);
    return true;
  }

  function syncPlannerLogo(){
    const src = getLogoSrc();
    $all('.planner-logo-sync').forEach(img => { if(img && img.src !== src) img.src = src; });
  }

  function setPlannerView(view){
    activeView = view;
    $all('[data-planner-show]').forEach(btn => btn.classList.toggle('active', btn.dataset.plannerShow === view));
    $all('.planner-view').forEach(v => v.classList.remove('active'));
    const target = $('#planner' + view[0].toUpperCase() + view.slice(1) + 'View');
    if(target) target.classList.add('active');
    const label = $('#plannerLabel');
    if(label) label.textContent = view === 'day' ? prettyDate(selectedDate) : viewLabels[view];
    renderPlanner();
  }

  function renderMonth(){
    const grid = $('#plannerMonthGrid');
    if(!grid) return;
    const cells = weekdays.map(w => `<div class="planner-weekday">${w}</div>`);
    const days = [
      ['2026-08-30',30,true],['2026-08-31',31,true],
      ...Array.from({length:30},(_,i)=>[`2026-09-${String(i+1).padStart(2,'0')}`,i+1,false]),
      ['2026-10-01',1,true],['2026-10-02',2,true],['2026-10-03',3,true]
    ];
    days.forEach(([date,num,muted]) => {
      const dayEvents = byDate(date).slice(0,4);
      const pills = dayEvents.map(e => `<button class="planner-event-pill ${escapeHtml(e.type)}" data-planner-event="${escapeHtml(e.id)}" type="button"><i class="planner-dot ${escapeHtml(e.type)}"></i><span>${escapeHtml(e.title)}</span></button>`).join('');
      const more = byDate(date).length > 4 ? `<button class="planner-more" data-planner-date="${date}" type="button">+${byDate(date).length - 4} more</button>` : '';
      cells.push(`<div class="planner-day-cell ${muted?'muted':''} ${date===selectedDate?'selected':''}" data-planner-date="${date}" role="button" tabindex="0"><span class="planner-date-num ${date===selectedDate?'today':''}">${num}</span>${pills}${more}</div>`);
    });
    grid.innerHTML = cells.join('');
  }

  function renderWeek(){
    const grid = $('#plannerWeekGrid');
    if(!grid) return;
    let html = '<div class="planner-week-head blank"></div>' + weekDates.map(d => `<button type="button" class="planner-week-head ${d===selectedDate?'selected':''}" data-planner-date="${d}"><small>${weekdays[new Date(d+'T12:00:00').getDay()]}</small><span>${Number(d.slice(-2))}</span></button>`).join('');
    hours.forEach(h => {
      html += `<div class="planner-time-label">${h>12?h-12:h} ${h>=12?'PM':'AM'}</div>`;
      weekDates.forEach(d => {
        const slotEvents = byDate(d).filter(e => Number((e.start||'99:99').slice(0,2)) === h);
        html += `<div class="planner-week-slot" data-planner-date="${d}" data-planner-hour="${h}">${slotEvents.map(e => `<button class="planner-week-event ${escapeHtml(e.type)}" data-planner-event="${escapeHtml(e.id)}" type="button"><strong>${escapeHtml(e.title)}</strong><span>${compactTime(e.start)}${e.end?'–'+compactTime(e.end):''}${e.course?' · '+escapeHtml(e.course):''}</span></button>`).join('')}</div>`;
      });
    });
    grid.innerHTML = html;
  }

  function renderDay(){
    const title = $('#plannerDayTitle');
    const summary = $('#plannerDaySummary');
    if(title) title.textContent = prettyDate(selectedDate);
    const todays = byDate(selectedDate);
    if(summary){
      summary.textContent = todays.length ? `${todays.length} thing${todays.length>1?'s':''} planned. Manageable. We love pretending to be organized.` : 'No academic jump scares scheduled yet.';
    }
    renderDayHighlight(todays);

    const agenda = $('#plannerAgenda');
    if(agenda){
      agenda.innerHTML = todays.length ? todays.map(e => `<button class="planner-agenda-item ${escapeHtml(e.type)}" data-planner-event="${escapeHtml(e.id)}" type="button"><div class="planner-agenda-time">${shortTime(e.start)}</div><div><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.course || typeLabel[e.type])}${e.notes?' · '+escapeHtml(e.notes):''}</span></div><i>›</i></button>`).join('') : '<div class="planner-empty">nothing planned here yet</div>';
    }

    const tasks = $('#plannerTasks');
    if(tasks){
      const due = todays.filter(e => e.type === 'task');
      tasks.innerHTML = due.length ? due.map(e => `<div class="planner-task-row"><button class="planner-check ${e.done?'done':''}" data-planner-toggle-task="${escapeHtml(e.id)}" type="button" aria-label="toggle task"></button><button class="planner-task-copy" data-planner-event="${escapeHtml(e.id)}" type="button"><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.course || 'Task')}</span></button></div>`).join('') : '<div class="planner-empty small">no tasks due today</div>';
    }
  }

  function renderDayHighlight(todays){
    const highlight = $('#plannerDayHighlight');
    if(!highlight) return;
    const nextExam = [...events].filter(e => e.type === 'exam' && e.date >= selectedDate).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))[0];
    if(!nextExam){ highlight.innerHTML = ''; return; }
    const start = new Date(selectedDate + 'T12:00:00');
    const examDate = new Date(nextExam.date + 'T12:00:00');
    const daysLeft = Math.max(0, Math.round((examDate - start) / 86400000));
    highlight.innerHTML = `<button class="planner-exam-banner" data-planner-event="${escapeHtml(nextExam.id)}" type="button"><div class="planner-exam-icon">▣</div><div><strong>Next exam: ${escapeHtml(nextExam.title)}</strong><span>${escapeHtml(prettyDate(nextExam.date))}${nextExam.start?' · '+shortTime(nextExam.start):''}${nextExam.course?' · '+escapeHtml(nextExam.course):''}</span></div><div class="planner-days-left"><b>${daysLeft}</b>${daysLeft===1?'day':'days'} left</div></button>`;
  }

  function renderSidebar(){
    const panel = $('#plannerNextPanel');
    if(panel){
      const nextExam = [...events].filter(e => e.type === 'exam').sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))[0];
      if(nextExam){
        const d = new Date(nextExam.date + 'T12:00:00');
        panel.innerHTML = `<h3>next exam</h3><button class="planner-next" data-planner-event="${escapeHtml(nextExam.id)}" type="button"><div class="planner-next-date"><b>${String(d.getDate()).padStart(2,'0')}</b><small>${d.toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</small></div><div><strong>${escapeHtml(nextExam.title)}</strong><span>${shortTime(nextExam.start)}${nextExam.course?' · '+escapeHtml(nextExam.course):''}</span></div></button>`;
      }else{
        panel.innerHTML = '<h3>next exam</h3><div class="planner-empty small">add an exam when you know the date</div>';
      }
    }
    const rec = $('#plannerRecText');
    if(rec){
      const tasks = events.filter(e => e.type === 'task').length;
      const exams = events.filter(e => e.type === 'exam').length;
      rec.textContent = exams ? 'Add one tiny review block before each exam. Future you will be less dramatic.' : tasks ? 'Deadlines are listed. Now give them study blocks before they start yelling.' : 'Add your first exam or deadline and Cramchy will help you see what needs attention.';
    }
  }

  function renderPlanner(){
    renderMonth();
    renderWeek();
    renderDay();
    renderSidebar();
    syncPlannerLogo();
    cleanOldMicrocopy();
  }

  function resetForm(type){
    editingId = null;
    $('#plannerModalTitle').textContent = type === 'task' ? 'add task' : 'add to planner';
    $('#plannerSaveBtn').textContent = 'save event';
    $('#plannerDeleteBtn').style.display = 'none';
    $('#plannerTitle').value = '';
    $('#plannerType').value = type || 'study';
    $('#plannerCourse').value = '';
    $('#plannerDate').value = selectedDate;
    $('#plannerStart').value = '';
    $('#plannerEnd').value = '';
    $('#plannerNotes').value = '';
  }
  function fillForm(e){
    editingId = e.id;
    $('#plannerModalTitle').textContent = 'event details';
    $('#plannerSaveBtn').textContent = 'save changes';
    $('#plannerDeleteBtn').style.display = 'inline-flex';
    $('#plannerTitle').value = e.title || '';
    $('#plannerType').value = e.type || 'personal';
    $('#plannerCourse').value = e.course || '';
    $('#plannerDate').value = e.date || selectedDate;
    $('#plannerStart').value = e.start || '';
    $('#plannerEnd').value = e.end || '';
    $('#plannerNotes').value = e.notes || '';
  }
  function openModal(type){
    resetForm(type);
    const modal = $('#plannerModal');
    if(modal){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); setTimeout(() => $('#plannerTitle')?.focus(), 40); }
  }
  function openEvent(id){
    const event = events.find(e => e.id === id);
    if(!event) return;
    fillForm(event);
    const modal = $('#plannerModal');
    if(modal){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
  }
  function closeModal(){
    const modal = $('#plannerModal');
    if(modal){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
  }

  function setupPlanner(){
    const plannerSection = $('#view-planner');
    if(!plannerSection || plannerSection.dataset.ready === 'true') return;
    plannerSection.dataset.ready = 'true';

    document.addEventListener('click', e => {
      const navPlanner = e.target.closest('.topnav .navbtn[data-tab="planner"]');
      if(navPlanner){
        e.preventDefault();
        $all('main > .view').forEach(v => v.classList.remove('active'));
        $('#view-planner')?.classList.add('active');
        $all('.topnav .navbtn').forEach(b => b.classList.remove('active'));
        navPlanner.classList.add('active');
      }

      const show = e.target.closest('[data-planner-show]');
      if(show){ e.preventDefault(); setPlannerView(show.dataset.plannerShow); }

      const add = e.target.closest('[data-planner-add]');
      if(add){ e.preventDefault(); openModal('study'); }
      const addTask = e.target.closest('[data-planner-add-task]');
      if(addTask){ e.preventDefault(); openModal('task'); }

      const eventBtn = e.target.closest('[data-planner-event]');
      if(eventBtn){ e.preventDefault(); e.stopPropagation(); openEvent(eventBtn.dataset.plannerEvent); }

      const toggle = e.target.closest('[data-planner-toggle-task]');
      if(toggle){
        e.preventDefault(); e.stopPropagation();
        const item = events.find(ev => ev.id === toggle.dataset.plannerToggleTask);
        if(item){ item.done = !item.done; saveEvents(); renderPlanner(); }
      }

      const dateTarget = e.target.closest('[data-planner-date]');
      if(dateTarget && !e.target.closest('[data-planner-event]')){
        selectedDate = dateTarget.dataset.plannerDate;
        if(activeView !== 'day') setPlannerView('day'); else renderPlanner();
      }

      if(e.target.closest('[data-planner-close]')){ e.preventDefault(); closeModal(); }
      const modal = $('#plannerModal');
      if(modal && e.target === modal) closeModal();
    });

    const form = $('#plannerForm');
    if(form){
      form.addEventListener('submit', e => {
        e.preventDefault();
        const data = {
          id: editingId || uid(),
          title: $('#plannerTitle').value.trim() || 'Untitled event',
          type: $('#plannerType').value,
          course: $('#plannerCourse').value.trim(),
          date: safeDate($('#plannerDate').value),
          start: $('#plannerStart').value,
          end: $('#plannerEnd').value,
          notes: $('#plannerNotes').value.trim(),
          done: editingId ? Boolean(events.find(ev => ev.id === editingId)?.done) : false
        };
        if(editingId){ events = events.map(ev => ev.id === editingId ? data : ev); }
        else{ events.push(data); }
        selectedDate = data.date;
        saveEvents();
        closeModal();
        setPlannerView('day');
      });
    }

    const del = $('#plannerDeleteBtn');
    if(del){
      del.addEventListener('click', () => {
        if(!editingId) return;
        events = events.filter(ev => ev.id !== editingId);
        saveEvents();
        closeModal();
        renderPlanner();
      });
    }

    setPlannerView(activeView);
  }

  function cleanOldMicrocopy(){
    const replacements = new Map([
      ['nothing due here ♡','nothing due here'],
      ['♡ today\'s tasks','today\'s tasks'],
      ['♡ todays tasks','today\'s tasks'],
      ['pick something for me ✦','pick something for me'],
      ['good afternoon, girl.','good afternoon, girl'],
      ['good morning, girl.','good morning, girl'],
      ['good evening, girl.','good evening, girl']
    ]);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let text = node.nodeValue;
      replacements.forEach((value, key) => { text = text.replaceAll(key, value); });
      node.nodeValue = text;
    });
  }

  function boot(){
    injectFonts();
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const okHome = enhanceHomeHero();
      const okPlanner = injectPlannerShell();
      if(okPlanner) setupPlanner();
      syncPlannerLogo();
      cleanOldMicrocopy();
      if((okHome && okPlanner) || attempts > 30) clearInterval(timer);
    }, 120);

    const observer = new MutationObserver(() => {
      enhanceHomeHero();
      syncPlannerLogo();
      cleanOldMicrocopy();
    });
    if(document.body) observer.observe(document.body, {childList:true, subtree:true, characterData:true});
    window.addEventListener('load', () => { enhanceHomeHero(); syncPlannerLogo(); cleanOldMicrocopy(); renderPlanner(); });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();