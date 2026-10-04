(function(){
  const root=document.getElementById('cramchyTaskList');if(!root)return;
  const shared=window.CramchySharedTasks,api=window.CramchyTaskBridge;
  const labels={task:'other task',quiz:'quiz',study:'study block',assignment:'assignment',exam:'exam reminder',personal:'personal'};
  let status='todo',filter='all';
  const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function render(){
    const tasks=api.tasks||[],now=today();
    const list=tasks.filter(t=>!!t.done===(status==='done')&&(filter==='all'||(filter==='other'?['task','exam','personal'].includes(t.type||'task'):t.type===filter))).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||(a.start||'99').localeCompare(b.start||'99'));
    root.innerHTML=`<div class="tw-status" role="group" aria-label="Completion filter">${[['todo','to do'],['done','completed']].map(([value,label])=>`<button type="button" data-tw-status="${value}" aria-pressed="${status===value}">${label} <span>${tasks.filter(t=>!!t.done===(value==='done')).length}</span></button>`).join('')}</div><div class="tw-filters" role="group" aria-label="Entry type filter">${[['all','all'],['quiz','quizzes'],['study','study'],['assignment','assignments'],['other','other']].map(([value,label])=>`<button type="button" data-tw-filter="${value}" aria-pressed="${filter===value}">${label}</button>`).join('')}</div><p class="tw-error" role="alert" hidden></p>`;
    const groups=status==='done'?[['completed',list]]:[['overdue',list.filter(t=>t.date&&t.date<now)],['today',list.filter(t=>t.date===now)],['upcoming',list.filter(t=>t.date>now)],['no date',list.filter(t=>!t.date)]];
    for(const [heading,items] of groups){if(!items.length)continue;
      root.insertAdjacentHTML('beforeend',`<section class="tw-group"><h3>${heading}<span>${items.length}</span></h3>${items.map(t=>{const type=shared.type(t.type);return `<article class="tw-entry ${t.done?'tw-done':''}" data-type="${type}"><input type="checkbox" data-tw-check="${escape(t.id)}" ${t.done?'checked':''} aria-label="${t.done?'Mark incomplete':'Complete'}: ${escape(t.text)}"><button class="tw-copy" type="button" data-tw-edit="${escape(t.id)}"><span class="tw-badge" data-type="${type}">${labels[type]}</span><strong>${escape(t.text)}</strong><span class="tw-meta">${escape([t.course,t.date?shared.dateLabel(t.date):'no date',t.start?(t.start+(t.end?'–'+t.end:'')):''].filter(Boolean).join(' · '))}</span></button><button class="tw-edit" type="button" data-tw-edit="${escape(t.id)}" aria-label="Edit ${escape(t.text)}">edit</button><button class="tw-delete" type="button" data-tw-delete="${escape(t.id)}" aria-label="Delete ${escape(t.text)}">×</button></article>`}).join('')}</section>`);
    }
    if(!list.length)root.insertAdjacentHTML('beforeend',`<div class="tw-empty"><h3>${status==='done'?'nothing completed yet':'nothing here yet'}</h3><p>${status==='done'?'Finished entries will stay here and in your schedule history.':filter==='all'?'Add a quiz, study block, assignment, or other task to get started.':'No entries match this filter.'}</p></div>`);
  }
  root.addEventListener('click',event=>{
    const target=event.target.closest('button');if(!target)return;
    if(target.dataset.twStatus){status=target.dataset.twStatus;render();return;}
    if(target.dataset.twFilter){filter=target.dataset.twFilter;render();return;}
    if(target.dataset.twEdit)window.CramchyPlannerTasks.edit(target.dataset.twEdit);
    if(target.dataset.twDelete){try{api.remove(target.dataset.twDelete)}catch{error('Could not delete this entry. Please try again.');}}
  });
  root.addEventListener('change',event=>{const id=event.target.dataset.twCheck;if(!id)return;try{api.toggle(id)}catch{event.target.checked=!event.target.checked;error('Could not save completion. Please try again.');}});
  function error(message){const node=root.querySelector('.tw-error');node.hidden=false;node.textContent=message;}
  window.CramchyTasksWorkspace={render};
  ['cramchy:tasks-changed','cramchy:backup-restored','cramchy:planner-cloud-loaded'].forEach(name=>window.addEventListener(name,render));
  render();
})();
