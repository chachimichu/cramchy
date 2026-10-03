(function(root){
  const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  function minutes(t){const m=/^(\d{2}):(\d{2})$/.exec(t||'');return m&&+m[1]<24&&+m[2]<60?+m[1]*60 + +m[2]:null;}
  function build(courses,normalize){
    const events=[],missing=[];
    courses.forEach(c=>{const schedules=normalize(c);let valid=0;
      schedules.forEach((s,i)=>{const start=minutes(s.start),end=minutes(s.end),day=days.indexOf(s.day);
        if(day<0||start===null||end===null||end<=start)return;
        valid++;events.push({course:c,id:String(c.id)+':'+i,day,start,end,room:s.room||c.room||'',lane:0,lanes:1,conflict:false});});
      if(!valid||valid<schedules.length)missing.push(c);
    });
    days.forEach((_,day)=>{const sorted=events.filter(e=>e.day===day).sort((a,b)=>a.start-b.start||a.end-b.end);let group=[],until=0;
      function finish(){const ends=[];group.forEach(e=>{let lane=ends.findIndex(end=>end<=e.start);if(lane<0)lane=ends.length;e.lane=lane;ends[lane]=e.end;});group.forEach(e=>{e.lanes=ends.length;e.conflict=group.some(other=>other!==e&&other.start<e.end&&other.end>e.start);});group=[];}
      sorted.forEach(e=>{if(group.length&&e.start>=until)finish();if(!group.length)until=e.end;group.push(e);until=Math.max(until,e.end);});finish();
    });
    const start=events.length?Math.floor(Math.min(...events.map(e=>e.start))/60)*60:8*60;
    const end=events.length?Math.ceil(Math.max(...events.map(e=>e.end))/60)*60:17*60;
    return {events,missing,start,end:Math.max(start+60,end),conflicts:events.filter(e=>e.conflict).length};
  }
  const api={days,minutes,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.CramchyTimetable=api;
})(typeof globalThis==='object'?globalThis:this);
