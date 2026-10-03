(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CramchyAcademicSchedule=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  function project(state,year,term,period=null){
    const record=state.examData?.[`${year}::${term}`];
    if(!record)return [];
    const events=[];
    for(const p of ['midterms','finals']){
      if(period&&period!==p)continue;
      for(const exam of record[p]?.exams||[]){
        const start=String(exam.start||'').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
        const end=String(exam.end||'').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
        if(!start)continue;
        events.push({id:'academic-exam:'+JSON.stringify([year,term,p,exam.id]),
          academicExam:{year,term,period:p,id:exam.id},type:'exam',
          title:`${exam.name||'Course'} · ${p}`,course:String(exam.name||''),
          date:start[1],start:start[2],end:end?.[1]===start[1]?end[2]:'',
          notes:`${year} · ${term}${exam.room?' · Room '+exam.room:''}`,done:false});
      }
    }
    return events;
  }
  return {project};
});
