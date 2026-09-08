(function(){
  const STORAGE_KEY='strawberryMatchaMidtermsState_v1';
  let syncTimer=null;

  function readState(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(e){return {};}
  }

  function escapeHtml(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function syncHomeTasks(){
    const state=readState();
    const missions=Array.isArray(state.missions)?state.missions:[];
    const left=missions.filter(m=>m&&!m.done).length;
    const count=document.getElementById('dailyTasksLeft');
    if(count)count.textContent=String(left);

    const wrap=document.getElementById('dailyTaskList');
    if(!wrap)return;
    const tasks=missions.filter(Boolean).slice(0,5);

    if(!tasks.length){
      wrap.innerHTML='<div class="shell-empty" style="padding:18px 10px;"><div class="big">nothing due here</div><p>Add a task and it will show up on your daily dashboard.</p></div>';
      return;
    }

    wrap.innerHTML=tasks.map(m=>`<label class="daily-task-row ${m.done?'done':''}">
      <input type="checkbox" data-home-sync-task="${escapeHtml(m.id)}" ${m.done?'checked':''}>
      <span class="task-text">${escapeHtml(m.text)}</span>
    </label>`).join('');
  }

  function scheduleSync(){
    clearTimeout(syncTimer);
    syncTimer=setTimeout(syncHomeTasks,0);
  }

  function findTaskPageCheckbox(id){
    return Array.from(document.querySelectorAll('[data-cramchy-task-check]'))
      .find(el=>String(el.dataset.cramchyTaskCheck||'')===String(id));
  }

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;
    if(!target)return;
    if(target.closest('#cramchyAddTaskBtn')||target.closest('[data-cramchy-task-delete]'))scheduleSync();
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&event.target&&event.target.id==='cramchyTaskInput')scheduleSync();
  });

  document.addEventListener('change',event=>{
    const target=event.target;
    if(!(target instanceof HTMLInputElement))return;

    if(target.matches('[data-cramchy-task-check]')){
      scheduleSync();
      return;
    }

    if(target.matches('[data-home-sync-task]')){
      const mirror=findTaskPageCheckbox(target.dataset.homeSyncTask);
      if(mirror){
        if(mirror.checked!==target.checked)mirror.checked=target.checked;
        mirror.dispatchEvent(new Event('change',{bubbles:true}));
      }else{
        scheduleSync();
      }
    }
  });
})();
