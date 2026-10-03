(function(root){
  'use strict';
  function minutes(value){
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)))return null;
    const [hour,minute]=value.split(':').map(Number);return hour*60+minute;
  }
  function validate(start,end){
    if(!start&&!end)return null;
    if(!start)return {field:'start',message:'Add a start time before setting an end time.'};
    const from=minutes(start),to=end?minutes(end):null;
    if(from===null)return {field:'start',message:'Enter a valid start time.'};
    if(end&&to===null)return {field:'end',message:'Enter a valid end time.'};
    if(end&&to<=from)return {field:'end',message:'End time must be later than start time on the same date. Add overnight plans as separate events for each date.'};
    return null;
  }
  function interval(event){
    if(!event.start||validate(event.start,event.end))return null;
    const start=minutes(event.start),point=!event.end;
    return {event,start,end:point?Math.min(1440,start+30):minutes(event.end),point};
  }
  function range(events){
    const timed=events.map(interval).filter(Boolean);
    return {
      firstHour:Math.min(7,...timed.map(item=>Math.floor(item.start/60))),
      endHour:Math.min(24,Math.max(22,...timed.map(item=>Math.ceil(item.end/60))))
    };
  }
  function layout(events){
    const sorted=events.map(interval).filter(Boolean).sort((a,b)=>a.start-b.start||b.end-a.end||String(a.event.id).localeCompare(String(b.event.id)));
    const output=[];let group=[],lanes=[],until=-1;
    function finish(){group.forEach(item=>{item.lanes=lanes.length;output.push(item);});group=[];lanes=[];until=-1;}
    sorted.forEach(item=>{
      if(group.length&&item.start>=until)finish();
      let lane=lanes.findIndex(end=>end<=item.start);
      if(lane<0)lane=lanes.length;
      lanes[lane]=item.end;item.lane=lane;group.push(item);until=Math.max(until,item.end);
    });
    finish();return output;
  }
  const api={minutes,validate,interval,range,layout};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CramchyPlannerTime=api;
})(typeof globalThis==='object'?globalThis:this);
