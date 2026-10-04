const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const schedule=require('../js/academic-schedule.js');
const year='2026–2027',term='Term 1',key=`${year}::${term}`;
const exam={id:'same-id',name:'Psychology',subjectId:'course-psy',start:'2026-10-05T07:00:00+08:00',end:'2026-10-05T09:00:00+08:00',room:'609'};
const state={examData:{[key]:{midterms:{exams:[exam]},finals:{exams:[{...exam,start:'2026-12-05T07:00:00+08:00'}]}},[`${year}::Term 2`]:{midterms:{exams:[exam]}}}};
const original=JSON.stringify(state);
let list=schedule.project(state,year,term);
assert.equal(list.length,2);assert.notEqual(list[0].id,list[1].id);
assert.equal(list[0].date,'2026-10-05');assert.equal(list[0].start,'07:00');assert.equal(list[0].end,'09:00');assert(list[0].notes.includes('609'));
assert.equal(schedule.project(state,year,term,'finals').length,1);
assert.equal(schedule.project(state,year,'Term 3').length,0);
assert.equal(JSON.stringify(state),original,'Projection must never mutate or duplicate persisted records');
state.examData[key].midterms.exams[0]={...exam,start:'2026-10-06T06:00:00+08:00'};
assert.equal(schedule.project(state,year,term)[0].date,'2026-10-06');
state.examData[key].midterms.exams=[];
assert.equal(schedule.project(state,year,term).length,1,'Deletion removes calendar projection immediately');
state.examData[key].midterms.exams=[exam];
// Exercise the shipped bridge and Planner adapters, rather than a parallel implementation.
const app=fs.readFileSync(require.resolve('../app-base.js'),'utf8');
const planner=fs.readFileSync(require.resolve('../planner-v3.js'),'utf8');
const calls=[];let stored;
const ctx={state,window:{CramchyAcademicSchedule:schedule},profileAcademicYear:()=>year,profileTerm:()=>term,
  activeExamYear:()=>ctx.state.examContext.academicYear,activeExamTerm:()=>ctx.state.examContext.term,
  saveState:()=>calls.push('save'),renderExamMode:()=>calls.push('mode'),switchTab:tab=>calls.push(tab),openExamModal:id=>calls.push(id||'new'),showToast:()=>{},
  legacyTasks:[],events:[{id:'manual',title:'Personal exam reminder',type:'exam',date:'2026-10-05'}],STORAGE_KEY:'planner',localStorage:{setItem:(key,value)=>{stored=JSON.parse(value);}},
  renderLabel(){},renderMonth(){},renderWeek(){},renderDay(){},renderSidebar(){},syncLogo(){}};
vm.createContext(ctx);
vm.runInContext(app.slice(app.indexOf('window.CramchySchedules='),app.indexOf('\nfunction allDailyTermExams')),ctx);
for(const name of ['saveEvents','renderAllPlanner','openEvent']){
  const start=planner.indexOf('  function '+name+'(');
  const line=planner.slice(start,planner.indexOf('\n',start));
  const code=line.endsWith('}')?line:planner.slice(start,planner.indexOf('\n  }',start)+4);
  vm.runInContext(code,ctx);
}
ctx.renderAllPlanner();ctx.renderAllPlanner();assert.equal(ctx.events.length,3,'Repeated renders must not duplicate exams');
ctx.saveEvents();assert.equal(stored.length,1);assert.equal(stored[0].id,'manual','Derived exams must never enter Planner cloud payloads');
ctx.openEvent(ctx.events[2].id);
assert.equal(ctx.state.examPeriod,'finals');assert.equal(ctx.state.examContext.term,term);
assert.deepEqual(calls.slice(-4),['save','mode','schedule','same-id']);
ctx.renderAllPlanner();assert.equal(ctx.events.length,2,'Selected period must isolate its course exams');
ctx.window.CramchySchedules.add();assert.deepEqual(calls.slice(-2),['schedule','new']);
ctx.state.examPeriod=null;ctx.window.CramchySchedules.add();assert.equal(calls.at(-2),'exam');
assert(planner.includes("window.addEventListener('cramchy:schedules-changed',renderAllPlanner)"));
const home=fs.readFileSync(require.resolve('../home-planner-reminders-v23.js'),'utf8');
assert(home.includes('window.CramchySchedules?.events()'));assert(home.includes("'cramchy:schedules-changed',scheduleRender"));
Object.assign(ctx,{DAYS_AHEAD:7,MAX_ITEMS:8,todayIso:()=> '2026-10-03',addDays:()=> '2026-10-10',readPlannerEvents:()=>[ctx.events[0]],whenLabel:()=> 'tomorrow',dateLabel:e=>e.date});
const start=home.indexOf('  function upcomingPlannerEvents(');
vm.runInContext(home.slice(start,home.indexOf('\n  }',start)+4),ctx);
assert.equal(ctx.upcomingPlannerEvents().length,2,'Home reminders include the canonical midterm exam plus the manual reminder');
state.examData[key].midterms.exams[0]={...exam,start:'2026-10-07T08:00:00+08:00'};
assert(ctx.upcomingPlannerEvents().some(e=>e.date==='2026-10-07'),'Home reads live edits before the debounced storage write');
state.examData[key].midterms.exams=[];
assert.equal(ctx.upcomingPlannerEvents().length,1,'Home removes deleted exams');
console.log('Shared exams: term/period isolation, edit/delete propagation, canonical edit routing, no duplicate projections and no derived Planner writes passed.');
