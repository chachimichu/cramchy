(function(root){
  'use strict';
  const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):'';
  function fields(event){return {text:String(event.title||'Untitled task').slice(0,200),done:!!event.done,date:date(event.date),course:String(event.course||'').slice(0,160),start:String(event.start||'').slice(0,8),end:String(event.end||'').slice(0,8),notes:String(event.notes||'').slice(0,2000)};}
  function project(tasks){return (tasks||[]).filter(t=>date(t.date)).map(t=>({id:t.id,title:t.text,type:'task',date:t.date,course:t.course||'',start:t.start||'',end:t.end||'',notes:t.notes||'',done:!!t.done,sharedTask:true}));}
  function migrate(tasks,imported,events){
    const next=[...(tasks||[])],seen=new Set(imported||[]);let changed=false;
    for(const event of events||[]){
      if(event.type!=='task'||event.sharedTask||seen.has(String(event.id)))continue;
      const id='planner-task:'+String(event.id);
      if(!next.some(t=>t.id===id))next.push({id,...fields(event)});
      seen.add(String(event.id));changed=true;
    }
    return {tasks:next,imported:[...seen],changed};
  }
  const api={fields,project,migrate};root.CramchySharedTasks=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
