(function(){
  const STORAGE_KEY='cramchyPlannerEvents_v2';
  const OLD_STORAGE_KEY='cramchyPlannerEvents_v1';
  const TYPES=['class','task','exam','quiz','study','personal','assignment'];
  const TYPE_LABEL={class:'class',task:'task',exam:'exam',quiz:'quiz',study:'study',personal:'personal',assignment:'assignment'};
  const MAX_ITEMS=3;
  const calendar=window.CramchyHomeCalendar;
  let selectedDate=calendar.iso(new Date());
  let renderTimer=null;

  function escapeHtml(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/\"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }
  function pad(num){return String(num).padStart(2,'0');}
  function readPlannerEvents(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(OLD_STORAGE_KEY)||'[]';
      const parsed=JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      return parsed
        .filter(event=>event&&typeof event==='object'&&!/^p\d+$/.test(String(event.id||'')))
        .map(event=>({
          id:String(event.id||''),
          title:String(event.title||'Untitled event').trim()||'Untitled event',
          type:TYPES.includes(event.type)?event.type:'personal',
          course:String(event.course||'').trim(),
          date:/^\d{4}-\d{2}-\d{2}$/.test(String(event.date||''))?String(event.date):'',
          start:String(event.start||'').slice(0,5),
          end:String(event.end||'').slice(0,5),
          done:Boolean(event.done),showInTasks:!!event.showInTasks
        }))
        .filter(event=>event.date);
    }catch(error){
      console.warn('Home calendar could not read Planner events.',error);
      return [];
    }
  }
  function timeLabel(value){
    if(!value) return '';
    const parts=String(value).split(':').map(Number);
    const hour=parts[0];
    const minute=parts[1]||0;
    if(Number.isNaN(hour)) return '';
    const suffix=hour>=12?'PM':'AM';
    const displayHour=((hour+11)%12)+1;
    return `${displayHour}:${pad(minute)} ${suffix}`;
  }
  function calendarEvents(){
    return calendar.merge(readPlannerEvents().filter(e=>!window.CramchyTaskBridge||!window.CramchySharedTasks.actionable(e)),window.CramchyTaskBridge?.events()||[],window.CramchySchedules?.events()||[]);
  }
  function findTaskCard(){
    const tasks=document.getElementById('dailyTaskList');
    if(!tasks) return null;
    return tasks.closest('.card')||tasks.closest('.task-card')||tasks.parentElement;
  }
  function ensureLeftStack(){
    const grid=document.querySelector('#view-dashboard .home-command-grid');
    const todayPanel=document.querySelector('#view-dashboard .home-today-panel');
    if(!grid||!todayPanel) return null;

    if(todayPanel.parentElement?.classList.contains('home-command-left')){
      return todayPanel.parentElement;
    }

    const stack=document.createElement('div');
    stack.className='home-command-left';
    grid.insertBefore(stack,todayPanel);
    stack.appendChild(todayPanel);
    return stack;
  }
  function ensureSection(){
    let section=document.getElementById('homePlannerReminders');
    if(!section){
      section=document.createElement('section');
      section.id='homePlannerReminders';
      section.className='home-command-panel home-theme-surface home-planner-reminders';
      section.innerHTML=`
        <div class="home-planner-reminders-head">
          <div class="home-planner-reminders-title"><span class="dot" aria-hidden="true"></span><h3>my calendar</h3></div>
          <button class="home-calendar-today" type="button" data-home-calendar-today>today</button>
        </div>
        <div id="homeMiniCalendar"></div>
        <div class="home-calendar-agenda" id="homePlannerRemindersList" aria-live="polite"></div>
        <button class="home-planner-open" type="button" id="homePlannerOpenBtn">open planner →</button>`;
      section.addEventListener('click',event=>{
        const target=event.target.closest('[data-home-calendar-date],[data-home-calendar-shift],[data-home-calendar-today]');if(!target)return;
        if(target.hasAttribute('data-home-calendar-date'))selectedDate=target.dataset.homeCalendarDate;
        else if(target.hasAttribute('data-home-calendar-shift'))selectedDate=calendar.shift(selectedDate,Number(target.dataset.homeCalendarShift));
        else selectedDate=calendar.iso(new Date());
        const focusAttr=target.hasAttribute('data-home-calendar-date')?`[data-home-calendar-date="${selectedDate}"]`:target.hasAttribute('data-home-calendar-shift')?`[data-home-calendar-shift="${target.dataset.homeCalendarShift}"]`:'[data-home-calendar-today]';
        render();section.querySelector(focusAttr)?.focus({preventScroll:true});
      });
      section.querySelector('#homePlannerOpenBtn')?.addEventListener('click',()=>{
        if(window.CramchyPlannerCalendar){window.CramchyPlannerCalendar.open(selectedDate);return;}
        const plannerBtn=document.querySelector('.topnav .navbtn[data-tab="planner"]');
        if(plannerBtn){plannerBtn.click();return;}
        document.querySelector('#view-planner')?.scrollIntoView({behavior:'smooth',block:'start'});
      });
    }else{
      section.classList.add('home-command-panel','home-theme-surface','home-planner-reminders');
    }

    const leftStack=ensureLeftStack();
    if(leftStack){
      const todayPanel=leftStack.querySelector('.home-today-panel');
      if(section.parentElement!==leftStack || section.previousElementSibling!==todayPanel){
        todayPanel?.insertAdjacentElement('afterend',section);
      }
      return section;
    }

    const taskCard=findTaskCard();
    if(taskCard?.parentElement && section.previousElementSibling!==taskCard){
      taskCard.insertAdjacentElement('afterend',section);
    }
    return section.parentElement?section:null;
  }
  function render(){
    const section=ensureSection();
    if(!section) return;
    const list=section.querySelector('#homePlannerRemindersList');
    if(!list) return;
    const all=calendarEvents(),today=calendar.iso(new Date());
    const grid=section.querySelector('#homeMiniCalendar');
    const pretty=value=>calendar.date(value).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    grid.innerHTML=`<div class="home-calendar-month"><button type="button" data-home-calendar-shift="-1" aria-label="Previous month">‹</button><strong>${calendar.date(selectedDate).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong><button type="button" data-home-calendar-shift="1" aria-label="Next month">›</button></div><div class="home-calendar-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=>`<span class="home-calendar-weekday" aria-hidden="true">${day}</span>`).join('')}${calendar.cells(selectedDate).map(value=>{
      if(!value)return '<span aria-hidden="true"></span>';
      const entries=all.filter(e=>e.date===value),types=[...new Set(entries.map(e=>TYPES.includes(e.type)?e.type:'personal'))];
      return `<button type="button" class="home-calendar-day ${value===today?'is-today':''}" data-home-calendar-date="${value}" aria-pressed="${value===selectedDate}" ${value===today?'aria-current="date"':''} aria-label="${escapeHtml(pretty(value))}, ${entries.length} ${entries.length===1?'event':'events'}"><span>${calendar.date(value).getDate()}</span><span class="home-calendar-dots" aria-hidden="true">${types.slice(0,3).map(type=>`<i class="${type}"></i>`).join('')}${types.length>3?'<small>+</small>':''}</span></button>`;
    }).join('')}</div><p class="home-calendar-hint">tap a date to see its events</p>`;
    const events=all.filter(e=>e.date===selectedDate);
    list.innerHTML=`<div class="home-calendar-day-heading"><strong>${calendar.date(selectedDate).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</strong><span>${events.length} ${events.length===1?'event':'events'}</span></div>`+(events.length?events.slice(0,MAX_ITEMS).map(event=>`
      <div class="home-planner-reminder ${event.type}">
        <span class="home-planner-reminder-dot ${event.type}" aria-hidden="true"></span>
        <div class="home-planner-reminder-main">
          <strong title="${escapeHtml(event.title)}">${escapeHtml(event.title)}</strong>
          <span>${escapeHtml(event.start?timeLabel(event.start)+(event.end?' – '+timeLabel(event.end):''):'all day')}${event.course?' · '+escapeHtml(event.course):''}${event.done?' · completed':''}</span>
        </div>
        <span class="home-planner-reminder-tag ${event.type}">${escapeHtml(TYPE_LABEL[event.type]||event.type)}</span>
      </div>`).join('')+(events.length>MAX_ITEMS?`<p class="home-calendar-hint">${events.length-MAX_ITEMS} more in Planner</p>`:''):'<p class="home-calendar-empty">nothing scheduled for this day</p>');
  }
  function scheduleRender(){
    clearTimeout(renderTimer);
    renderTimer=setTimeout(render,30);
  }
  function installStorageBridge(){
    if(window.__cramchyHomePlannerReminderStorageBridge) return;
    window.__cramchyHomePlannerReminderStorageBridge=true;
    const originalSetItem=Storage.prototype.setItem;
    const originalRemoveItem=Storage.prototype.removeItem;
    Storage.prototype.setItem=function(key,value){
      const result=originalSetItem.call(this,key,value);
      if(this===window.localStorage&&(key===STORAGE_KEY||key===OLD_STORAGE_KEY)) scheduleRender();
      return result;
    };
    Storage.prototype.removeItem=function(key){
      const result=originalRemoveItem.call(this,key);
      if(this===window.localStorage&&(key===STORAGE_KEY||key===OLD_STORAGE_KEY)) scheduleRender();
      return result;
    };
  }
  function boot(){
    installStorageBridge();
    scheduleRender();
    window.addEventListener('cramchy:planner-cloud-loaded',scheduleRender);
    window.addEventListener('cramchy:schedules-changed',scheduleRender);
    window.addEventListener('cramchy:tasks-changed',scheduleRender);
    window.addEventListener('cramchy:backup-restored',scheduleRender);
    window.addEventListener('cramchy:planner-cloud-synced',scheduleRender);
    window.addEventListener('storage',event=>{
      if(event.key===STORAGE_KEY||event.key===OLD_STORAGE_KEY) scheduleRender();
    });
    document.addEventListener('click',event=>{
      const target=event.target instanceof Element?event.target:null;
      if(!target) return;
      if(target.closest('[data-planner-add],#plannerSaveBtn,#plannerDeleteBtn,[data-planner-toggle-task]')){
        setTimeout(scheduleRender,120);
      }
    },true);
    document.addEventListener('change',event=>{
      const target=event.target instanceof Element?event.target:null;
      if(target&&target.closest('#plannerForm,#view-planner')) setTimeout(scheduleRender,120);
    },true);
    let tries=0;
    const waitForHome=()=>{
      tries++;
      render();
      if(document.getElementById('homePlannerReminders')||tries>=18) return;
      setTimeout(waitForHome,150);
    };
    waitForHome();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
