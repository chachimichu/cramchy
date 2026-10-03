(function(root){
  'use strict';
  const KEY='cramchyStudyTimer_v1';
  function fresh(subject='general',minutes=25){return {subject,presetMinutes:minutes,remaining:minutes*60,running:false,deadline:0,session:null};}
  function clean(value){
    if(!value||typeof value!=='object')return fresh();
    const minutes=Number.isInteger(value.presetMinutes)&&value.presetMinutes>=1&&value.presetMinutes<=180?value.presetMinutes:25;
    const out=fresh(typeof value.subject==='string'?value.subject.slice(0,160):'general',minutes);
    if(Number.isFinite(value.remaining))out.remaining=Math.max(0,Math.min(minutes*60,Math.ceil(value.remaining)));
    const session=value.session;
    if(session&&typeof session.id==='string'&&typeof session.subject==='string'){
      out.session={id:session.id.slice(0,160),subject:session.subject.slice(0,160),subjectName:String(session.subjectName||'').slice(0,100),minutes,
        academicKey:String(session.academicKey||'').slice(0,100),period:['midterms','finals'].includes(session.period)?session.period:''};
      out.subject=out.session.subject;
    }
    if(out.session&&value.running===true&&Number.isFinite(value.deadline)&&value.deadline>0){out.running=true;out.deadline=value.deadline;}
    return out;
  }
  function remaining(timer,now){return timer.running?Math.max(0,Math.ceil((timer.deadline-now)/1000)):timer.remaining;}
  function start(timer,now,metadata){
    const out=clean(timer);
    if(out.running)return out;
    out.session=out.session||{...metadata,subject:out.subject,minutes:out.presetMinutes};
    out.running=true;out.deadline=now+out.remaining*1000;
    return out;
  }
  function pause(timer,now){return {...clean(timer),remaining:remaining(timer,now),running:false,deadline:0};}
  function reset(timer){return fresh(timer.subject,timer.presetMinutes);}
  const api={KEY,fresh,clean,remaining,start,pause,reset};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CramchyStudyTimer=api;
})(typeof globalThis==='object'?globalThis:this);
