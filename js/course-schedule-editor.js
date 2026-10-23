(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CramchyScheduleEditor=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function group(schedules,dayNames){
    const groups=[];
    schedules.forEach(schedule=>{
      const day=dayNames.includes(schedule.day)?schedule.day:'';
      const match=day?groups.find(group=>group.start===(schedule.start||'')&&group.end===(schedule.end||'')&&group.room===(schedule.room||'')&&!group.days.includes(day)):null;
      if(match)match.days.push(day);
      else groups.push({days:day?[day]:[],start:schedule.start||'',end:schedule.end||'',room:schedule.room||''});
    });
    return groups;
  }
  function expand(days,start,end,room,idFactory){
    const selected=days.length?days:[''];
    return selected.map(day=>({id:idFactory(),day,start,end,room}));
  }
  return {group,expand};
});
