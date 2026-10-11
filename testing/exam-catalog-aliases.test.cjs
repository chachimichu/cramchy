const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app-base.js'),'utf8');
const start=source.lastIndexOf('function examSubjectCatalog(');
const end=source.indexOf('\n}',start)+2;
const period=()=>({subjects:{},subjectNames:{},exams:[]});
const names={field:'Field Methods in Psychology',edtech:'Educational Technology',anatomy:'Human Anatomy',cogpsych:'Cognitive Psychology',teaching:'Principle of Teaching'};
const record={midterms:period(),finals:period()};
record.midterms.subjectNames={...names};
const courses=Object.entries(names).map(([id,name])=>({id,name:id==='anatomy'?'Human Anatomy and Physiology':id==='teaching'?'Principles of Teaching':name}));
const ctx={state:{examPeriod:'finals'},activeExamYear:()=> '2026–2027',activeExamTerm:()=> 'Term 1',
  ensureTermRecord:(y,t)=>t==='Term 1'?record:{midterms:period(),finals:period()},coursesForTerm:(y,t)=>t==='Term 1'?courses:[],
  normalizeAcademicName:v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ')};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
// Reproduce the screenshot's five courses plus two old preset label variants.
for(const id of Object.keys(names))record.finals.subjects[id]={topics:[],notes:'',forget:''};
record.finals.subjects['course-anatomy']={topics:[],notes:'',forget:''};
record.finals.subjects['course-teaching']={topics:[],notes:'',forget:''};
const before=JSON.stringify({record,courses});
let list=ctx.examSubjectCatalog();
assert.equal(list.length,5);
assert.equal(list.find(x=>x.courseId==='anatomy').name,'Human Anatomy and Physiology');
assert.equal(list.find(x=>x.courseId==='teaching').id,'teaching');
assert.equal(JSON.stringify({record,courses}),before,'Rendering never rewrites or deletes saved data');
record.finals.subjects['course-anatomy'].notes='Danica’s finals notes';
record.finals.exams.push({id:'final-anatomy',subjectId:'course-anatomy',start:'2026-12-01T09:00'});
list=ctx.examSubjectCatalog();
assert.equal(list.find(x=>x.courseId==='anatomy').id,'course-anatomy','Saved course-linked exam and notes remain reachable');
record.midterms.subjects.anatomy={topics:[{text:'Midterm topic',done:true}],notes:'midterm notes'};
ctx.state.examPeriod='midterms';
assert.equal(ctx.examSubjectCatalog().find(x=>x.courseId==='anatomy').id,'anatomy','Midterms retains its original progress identity');
ctx.state.examPeriod='finals';
record.finals.subjects.anatomy={topics:[{text:'Separate saved topic'}]};
assert.equal(ctx.examSubjectCatalog().filter(x=>['anatomy','course-anatomy'].includes(x.id)).length,2,'Never hide separately populated trackers');
courses.push({id:'anatomy-two',name:'Human Anatomy and Physiology'});
assert(ctx.examSubjectCatalog().some(x=>x.id==='anatomy'),'Multiple actual courses are not inferred to be one');
assert.equal(ctx.examSubjectCatalog('2026–2027','Term 2').length,0,'Aliases never bring courses into another term');
console.log('Exam catalog: preset alias choices, exact course labels, saved exam/progress identities, period isolation and non-destructive rendering passed.');
