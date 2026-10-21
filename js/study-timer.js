(function(root){
  'use strict';
  const KEY='cramchyStudyTimer_v1';
  function fresh(subject='general',minutes=25,mode='focus'){return {subject,presetMinutes:minutes,remaining:minutes*60,running:false,deadline:0,session:null,mode:mode==='pomodoro'?'pomodoro':'focus',phase:'focus',round:1};}
  function phaseMinutes(timer){return timer.phase==='shortBreak'?5:timer.phase==='longBreak'?15:timer.presetMinutes;}
  function clean(value){
    if(!value||typeof value!=='object')return fresh();
    const minutes=Number.isInteger(value.presetMinutes)&&value.presetMinutes>=1&&value.presetMinutes<=180?value.presetMinutes:25;
    const mode=value.mode==='pomodoro'?'pomodoro':'focus';
    const phase=mode==='pomodoro'&&['focus','shortBreak','longBreak'].includes(value.phase)?value.phase:'focus';
    const round=Number.isInteger(value.round)&&value.round>=1&&value.round<=4?value.round:1;
    const out=fresh(typeof value.subject==='string'?value.subject.slice(0,160):'general',minutes,mode);
    out.phase=phase;out.round=round;
    const duration=phaseMinutes(out)*60;
    if(Number.isFinite(value.remaining))out.remaining=Math.max(0,Math.min(duration,Math.ceil(value.remaining)));
    const session=value.session;
    if(phase==='focus'&&session&&typeof session.id==='string'&&typeof session.subject==='string'){
      out.session={id:session.id.slice(0,160),subject:session.subject.slice(0,160),subjectName:String(session.subjectName||'').slice(0,100),minutes,
        academicKey:String(session.academicKey||'').slice(0,100),period:['midterms','finals'].includes(session.period)?session.period:''};
      out.subject=out.session.subject;
    }
    const canResume=phase!=='focus'||Boolean(out.session);
    if(canResume&&value.running===true&&Number.isFinite(value.deadline)&&value.deadline>0){out.running=true;out.deadline=value.deadline;}
    return out;
  }
  function remaining(timer,now){return timer.running?Math.max(0,Math.ceil((timer.deadline-now)/1000)):timer.remaining;}
  function start(timer,now,metadata){
    const out=clean(timer);
    if(out.running)return out;
    if(out.phase==='focus')out.session=out.session||{...metadata,subject:out.subject,minutes:out.presetMinutes};
    else out.session=null;
    out.running=true;out.deadline=now+out.remaining*1000;
    return out;
  }
  function pause(timer,now){return {...clean(timer),remaining:remaining(timer,now),running:false,deadline:0};}
  function reset(timer){return fresh(timer.subject,timer.presetMinutes,timer.mode);}
  const api={KEY,fresh,clean,phaseMinutes,remaining,start,pause,reset};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CramchyStudyTimer=api;
})(typeof globalThis==='object'?globalThis:this);
