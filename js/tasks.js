(function(root){
  'use strict';

  root.CramchyModules = root.CramchyModules || {};

  root.CramchyModules.tasks = {
    init({getState,saveState,showToast,createId,escapeHtml,reactChaowi}){
      const required={getState,saveState,showToast,createId,escapeHtml,reactChaowi};
      Object.entries(required).forEach(([name,value])=>{if(typeof value!=='function')throw new Error(`Tasks requires ${name}.`);});

      const dashboardList=document.getElementById('missionList');
      const dashboardInput=document.getElementById('missionInput');
      const dashboardAdd=document.getElementById('addMissionBtn');
      const taskList=document.getElementById('cramchyTaskList');
      const taskInput=document.getElementById('cramchyTaskInput');
      const taskAdd=document.getElementById('cramchyAddTaskBtn');
      const homeList=document.getElementById('dailyTaskList');
      const homeCount=document.getElementById('dailyTasksLeft');

      function missions(){
        const state=getState();
        if(!Array.isArray(state.missions))state.missions=[];
        return state.missions;
      }

      function renderDashboard(){
        if(!dashboardList)return;
        const items=missions();
        if(!items.length){dashboardList.innerHTML='<div class="empty-state">Add a few realistic goals for today.</div>';return;}
        dashboardList.innerHTML=items.map(item=>`<div class="mission-row ${item.done?'done':''}">
          <input type="checkbox" data-task-action="toggle" data-task-id="${escapeHtml(item.id)}" ${item.done?'checked':''}>
          <span>${escapeHtml(item.text)}</span>
          <button class="del" data-task-action="delete" data-task-id="${escapeHtml(item.id)}">✕</button>
        </div>`).join('');
      }

      function renderTaskPage(){
        if(!taskList)return;
        const items=missions();
        if(!items.length){taskList.innerHTML='<div class="shell-empty"><div class="big">nothing here yet ♡</div><p>Add a quick task below. Course-linked tasks, deadlines, priorities, and subtasks come in the full Tasks build.</p></div>';return;}
        taskList.innerHTML=items.map(item=>`<div class="mission-row"><input type="checkbox" data-task-action="toggle" data-task-id="${escapeHtml(item.id)}" ${item.done?'checked':''}><span style="flex:1;${item.done?'text-decoration:line-through;opacity:.6;':''}">${escapeHtml(item.text)}</span><button class="icon-btn" data-task-action="delete" data-task-id="${escapeHtml(item.id)}" aria-label="Delete">×</button></div>`).join('');
      }

      function renderHome(){
        const items=missions();
        if(homeCount)homeCount.textContent=String(items.filter(item=>!item.done).length);
        if(!homeList)return;
        const visible=items.slice(0,5);
        if(!visible.length){homeList.innerHTML='<div class="shell-empty" style="padding:18px 10px;"><div class="big">nothing due here ♡</div><p>Add a task and it will show up on your daily dashboard.</p></div>';return;}
        homeList.innerHTML=visible.map(item=>`<label class="daily-task-row ${item.done?'done':''}">
          <input type="checkbox" data-task-action="toggle" data-task-id="${escapeHtml(item.id)}" ${item.done?'checked':''}>
          <span class="task-text">${escapeHtml(item.text)}</span>
        </label>`).join('');
      }

      function renderAll(){renderDashboard();renderTaskPage();renderHome();}

      function add(text,{toast=false}={}){
        const clean=String(text||'').trim().slice(0,200);
        if(!clean)return false;
        missions().push({id:createId(),text:clean,done:false});
        saveState();renderAll();
        if(toast)showToast('mission added ♡');
        return true;
      }

      function addDashboard(){if(add(dashboardInput?.value,{toast:true})&&dashboardInput)dashboardInput.value='';}
      function addTaskPage(){if(add(taskInput?.value)&&taskInput)taskInput.value='';}

      function toggle(id,checked,{react=false}={}){
        const item=missions().find(entry=>entry.id===id);
        if(!item)return false;
        const completed=!item.done&&Boolean(checked);
        item.done=Boolean(checked);saveState();renderAll();
        if(completed&&react)reactChaowi('topic');
        return true;
      }

      function remove(id){
        const state=getState();
        const next=missions().filter(item=>item.id!==id);
        if(next.length===state.missions.length)return false;
        state.missions=next;saveState();renderAll();return true;
      }

      function handleListChange(event){
        const target=event.target;
        if(target?.dataset?.taskAction==='toggle')toggle(target.dataset.taskId,target.checked,{react:event.currentTarget!==dashboardList});
      }
      function handleListClick(event){
        const target=event.target;
        if(target?.dataset?.taskAction==='delete')remove(target.dataset.taskId);
      }
      function handleDashboardKey(event){if(event.key==='Enter')addDashboard();}
      function handleTaskKey(event){if(event.key==='Enter')addTaskPage();}

      [dashboardList,taskList,homeList].forEach(list=>{
        list?.addEventListener('change',handleListChange);
        list?.addEventListener('click',handleListClick);
      });
      dashboardAdd?.addEventListener('click',addDashboard);
      dashboardInput?.addEventListener('keydown',handleDashboardKey);
      taskAdd?.addEventListener('click',addTaskPage);
      taskInput?.addEventListener('keydown',handleTaskKey);

      return {renderDashboard,renderTaskPage,renderHome,renderAll,add,toggle,remove,destroy(){
        [dashboardList,taskList,homeList].forEach(list=>{
          list?.removeEventListener('change',handleListChange);
          list?.removeEventListener('click',handleListClick);
        });
        dashboardAdd?.removeEventListener('click',addDashboard);
        dashboardInput?.removeEventListener('keydown',handleDashboardKey);
        taskAdd?.removeEventListener('click',addTaskPage);
        taskInput?.removeEventListener('keydown',handleTaskKey);
      }};
    }
  };
})(typeof window==='undefined'?globalThis:window);
