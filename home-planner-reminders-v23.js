(function(){
  const STORAGE_KEY='cramchyPlannerEvents_v2';
  const OLD_STORAGE_KEY='cramchyPlannerEvents_v1';
  const TYPES=['class','task','exam','study','personal'];
  const TYPE_LABEL={class:'class',task:'task',exam:'exam',study:'study',personal:'personal'};
  const MAX_ITEMS=8;
  const DAYS_AHEAD=7;
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
  function todayIso(){
    const now=new Date();
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  }
  function dateObj(iso){
    const parts=String(iso||'').split('-').map(Number);
    return new Date(parts[0]||2026,(parts[1]||1)-1,parts[2]||1,12,0,0,0);
  }
  function addDays(iso,days){
    const d=dateObj(iso);
    d.setDate(d.getDate()+days);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function daysBetween(a,b){
    return Math.round((dateObj(b)-dateObj(a))/86400000);
  }
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
          done:Boolean(event.done)
        }))
        .filter(event=>event.date);
    }catch(error){
      console.warn('Home planner reminders could not read Planner events.',error);
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
  function whenLabel(event,today){
    const diff=daysBetween(today,event.date);
    if(diff===0) return 'today';
    if(diff===1) return 'tomorrow';
    if(diff>1) return `in ${diff} days`;
    return 'past';
  }
  function dateLabel(event,today){
    const when=whenLabel(event,today);
    const d=dateObj(event.date);
    const pretty=d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const time=timeLabel(event.start);
    return `${when} · ${pretty}${time?' · '+time:''}${event.course?' · '+event.course:''}`;
  }
  function upcomingPlannerEvents(){
    const today=todayIso();
    const end=addDays(today,DAYS_AHEAD);
    return readPlannerEvents()
      .filter(event=>event.date>=today&&event.date<=end)
      .filter(event=>!(event.type==='task'&&event.done))
      .sort((a,b)=>(a.date+' '+(a.start||'99:99')+' '+a.title).localeCompare(b.date+' '+(b.start||'99:99')+' '+b.title))
      .slice(0,MAX_ITEMS)
      .map(event=>({...event,homeWhen:whenLabel(event,today),homeDateLine:dateLabel(event,today)}));
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
          <div class="home-planner-reminders-title"><span class="dot" aria-hidden="true"></span><h3>planner reminders</h3></div>
          <span class="home-planner-reminders-chip">next 7 days</span>
        </div>
        <div class="home-planner-reminders-list" id="homePlannerRemindersList"></div>
        <button class="home-planner-open" type="button" id="homePlannerOpenBtn">open planner</button>`;
      section.querySelector('#homePlannerOpenBtn')?.addEventListener('click',()=>{
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
    const events=upcomingPlannerEvents();
    if(!events.length){
      list.innerHTML=`
        <div class="home-planner-reminders-empty">
          <span class="spark" aria-hidden="true">♡</span>
          <div><strong>nothing plotted this week</strong><p>Dates you add in Planner will bloom here.</p></div>
        </div>`;
      return;
    }
    list.innerHTML=events.map(event=>`
      <div class="home-planner-reminder ${event.type} ${event.homeWhen==='today'?'today':''}">
        <span class="home-planner-reminder-dot ${event.type}" aria-hidden="true"></span>
        <div class="home-planner-reminder-main">
          <strong title="${escapeHtml(event.title)}">${escapeHtml(event.title)}</strong>
          <span title="${escapeHtml(event.homeDateLine)}">${escapeHtml(event.homeDateLine)}</span>
        </div>
        <span class="home-planner-reminder-tag ${event.type}">${escapeHtml(TYPE_LABEL[event.type]||event.type)}</span>
      </div>`).join('');
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
