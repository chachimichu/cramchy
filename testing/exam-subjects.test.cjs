const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const backup=require('../js/backup-data.js');
const source=fs.readFileSync(require.resolve('../app-base.js'),'utf8');
// Use the effective declarations from the shipped app, including its state factory.
function appFunction(name){
  const start=source.lastIndexOf('function '+name+'(');
  assert(start>=0,'Missing '+name);
  const end=source.indexOf('\n}',start)+2;
  assert(end>start);
  return source.slice(start,end);
}
const nodes=new Map();
class Element{
  constructor(){this.children=[];this.handlers={};this.style={};this.value='';this._ids=[];}
  set innerHTML(html){
    this._ids.forEach(id=>nodes.delete(id));this._ids=[];this.children=[];this.html=html;
    for(const match of html.matchAll(/\bid="([^"]+)"/g)){
      this._ids.push(match[1]);nodes.set(match[1],new Element());
    }
  }
  get innerHTML(){return this.html||'';}
  appendChild(node){this.children.push(node);}
  addEventListener(name,callback){this.handlers[name]=callback;}
  querySelectorAll(){return [];}
}
nodes.set('subjectTabs',new Element());nodes.set('subjectDetail',new Element());
const period=()=>({subjects:{},subjectNames:{},exams:[]});
const courses=[
  {id:'psych',name:'Psychology',code:'PSY101',academicYear:'2026–2027',term:'Term 1'},
  {id:'psych-next',name:'Psychology',code:'PSY101',academicYear:'2026–2027',term:'Term 2'}
];
let saved=0;
const context={
  SUBJECT_ORDER:['legacy'],SUBJECT_NAME:{legacy:'Legacy course'},APP_VERSION:'test',STATE_SCHEMA_VERSION:2,
  EXAM_BY_ID:new Proxy({}, {get(){throw Error('Readiness must not consult fixed legacy exams');}}),
  document:{getElementById:id=>nodes.get(id)||null,createElement:()=>new Element()},
  expandedAttachments:{},escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;'),escapeAttr:value=>String(value),
  formatExamDate:iso=>iso,formatExamTime:iso=>iso,formatCountdown:()=> 'countdown',
  openExamModal(){},renderAttachmentsPanel(){},saveState(){saved++;},showToast(){},
  setTimeout:callback=>{callback();return 1;},clearTimeout(){},Date,
  activeExamYear:()=>context.state.examContext.academicYear,activeExamTerm:()=>context.state.examContext.term,
  activePeriodData:(selected=context.state.examPeriod)=>context.state.examData[context.state.examContext.term][selected||'midterms'],
  examSubjectCatalog:()=>context.state.courses.filter(c=>c.academicYear===context.state.examContext.academicYear&&c.term===context.state.examContext.term).map(c=>({id:'course-'+c.id,name:c.name})),
};
vm.createContext(context);
vm.runInContext(['freshSubject','freshState','hoursUntil','ensureExamSubject','activeExamSubjects','examSubjectNameById','examForSubject','subjectStats','readinessLabel','renderTopicList','addTopic','renderSubjectsTab','renderSubjectDetail'].map(appFunction).join('\n'),context);
// Real app exports must be accepted by the new backup validator.
const actualFresh=context.freshState();
assert(Array.isArray(actualFresh.studyHistory));
assert.equal(backup.decode(actualFresh).legacy,true);
assert.equal(backup.decode(backup.create(actualFresh,{getItem:()=>null})).legacy,false);
context.state=actualFresh;
context.state.courses=courses;
context.state.examContext={academicYear:'2026–2027',term:'Term 1'};
context.state.examPeriod='midterms';
context.state.examData={'Term 1':{midterms:period(),finals:period()},'Term 2':{midterms:period(),finals:period()}};
// New course without a schedule opens its topics/notes instead of crashing.
context.renderSubjectsTab();
assert.equal(context.state.activeSubject,'course-psych');
assert(nodes.get('subjectDetail').innerHTML.includes('no midterms exam added yet'));
assert.equal(context.readinessLabel('course-psych').cls,'readiness-needs');
nodes.get('topicInput').value='Attention';nodes.get('addTopicBtn').handlers.click();
assert.equal(context.activeExamSubjects()['course-psych'].topics[0].name,'Attention');
assert(nodes.get('topicList').children[0].children[0].innerHTML.includes('Attention'));
nodes.get('notesArea').handlers.input({target:{value:'Saved midterm notes'}});
nodes.get('forgetArea').handlers.input({target:{value:'Review this definition'}});
assert.equal(context.activeExamSubjects()['course-psych'].notes,'Saved midterm notes');
assert(saved>0);
const mid=context.activePeriodData();
mid.exams.push({id:'exam-1',subjectId:'course-psych',start:new Date(Date.now()+24*3600000).toISOString(),end:new Date(Date.now()+25*3600000).toISOString(),room:'101'});
assert.equal(context.readinessLabel('course-psych').cls,'readiness-lock');
context.renderSubjectDetail();assert(nodes.get('subjectDetail').innerHTML.includes('edit midterms exam'));
// Readiness tracks completion, and absent/invalid/past dates do not crash or imply urgency.
mid.subjects['course-psych'].topics[0].status='Done';
assert.equal(context.readinessLabel('course-psych').cls,'readiness-slay');
mid.subjects['course-psych'].topics.push({name:'Memory',status:'Not Started'});
assert.equal(context.readinessLabel('course-psych').cls,'readiness-lock');
mid.exams[0].start='invalid date';assert.equal(context.readinessLabel('course-psych').cls,'readiness-track');
mid.exams[0].start=new Date(Date.now()-3600000).toISOString();assert.equal(context.readinessLabel('course-psych').cls,'readiness-track');
// Finals uses its own schedule and workspace, retaining midterm progress.
context.state.examPeriod='finals';context.renderSubjectsTab();
assert(nodes.get('subjectDetail').innerHTML.includes('no finals exam added yet'));
assert.equal(context.readinessLabel('course-psych').cls,'readiness-needs');
assert.equal(context.activeExamSubjects()['course-psych'].notes,'');
nodes.get('notesArea').handlers.input({target:{value:'Separate finals notes'}});
// A different term with the same code stays independent.
context.state.examContext.term='Term 2';context.renderSubjectsTab();
assert.equal(context.state.activeSubject,'course-psych-next');
assert.equal(context.activeExamSubjects()['course-psych-next'].topics.length,0);
// Simulate persisted state reload and reopen midterms.
context.state=JSON.parse(JSON.stringify(context.state));
context.state.examContext.term='Term 1';context.state.examPeriod='midterms';context.renderSubjectsTab();
assert.equal(context.activeExamSubjects()['course-psych'].notes,'Saved midterm notes');
assert.equal(context.activeExamSubjects()['course-psych'].forget,'Review this definition');
assert.equal(context.activeExamSubjects()['course-psych'].topics.length,2);
assert(nodes.get('subjectDetail').innerHTML.includes('Saved midterm notes'));
context.state.examPeriod='finals';context.renderSubjectsTab();
assert(nodes.get('subjectDetail').innerHTML.includes('Separate finals notes'));
console.log('Exam course rendering, schedules, readiness, topics/notes, period/term isolation, reload and real-state backup validation passed.');
