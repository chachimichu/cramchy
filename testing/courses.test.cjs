const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function element(){
  const listeners={};
  return {innerHTML:'',addEventListener(name,fn){listeners[name]=fn;},removeEventListener(name,fn){if(listeners[name]===fn)delete listeners[name];},dispatch(name,target){listeners[name]?.({target,currentTarget:this});},click(){listeners.click?.({target:this,currentTarget:this});},hasListener:name=>Boolean(listeners[name])};
}
const elements={dynamicCourseGrid:element(),dailyCourseStrip:element(),addCourseBtn:element()};
const state={
  profile:{academicYear:'2026–2027',term:'Term 1'},
  courses:[
    {id:'cog',name:'Cognitive Psychology',code:'PSYCH12X',academicYear:'2026–2027',term:'Term 1',units:3,color:'pink',schedules:[{id:'s1',day:'Thursday',start:'09:00',end:'10:30',room:'609'}]},
    {id:'old',name:'Old Course',code:'OLD1',academicYear:'2025–2026',term:'Term 3',schedule:'Monday · 1:00 PM–2:00 PM · Room 1'}
  ],
  gradebook:{cog:{midterms:[],finals:[]},old:{midterms:[],finals:[]}},
  examData:{'2026–2027::Term 1':{midterms:{exams:[{id:'e1',subjectId:'course-cog'}],subjects:{'course-cog':{}},subjectNames:{'course-cog':'Cognitive Psychology'}},finals:{exams:[],subjects:{'course-cog':{}},subjectNames:{'course-cog':'Cognitive Psychology'}}}}
};
let saves=0,changes=0,removed='',modalArgs=null,opened=0,id=0;
const toasts=[];
const window={CramchyModules:{}};
const document={getElementById:id=>elements[id]||null};
vm.runInContext(fs.readFileSync('js/courses.js','utf8'),vm.createContext({window,document,Date,String,Number,Array,Object,Math,Boolean,globalThis:window}));
const feature=window.CramchyModules.courses.init({
  getState:()=>state,
  getAcademicContext:()=>({year:state.profile.academicYear,term:state.profile.term}),
  saveState:()=>saves++,showToast:message=>toasts.push(message),createId:()=>`generated-${++id}`,
  escapeHtml:value=>String(value),confirmAction:()=>true,openModal:(...args)=>{modalArgs=args;},
  onOpenCourses:()=>opened++,onChanged:()=>changes++,onRemoved:value=>{removed=value;},
  now:()=>new Date('2026-09-16T08:00:00+08:00')
});

assert.deepEqual(feature.current().map(course=>course.id),['cog']);
assert.equal(feature.displayTime('13:05'),'1:05 PM');
assert.equal(feature.scheduleText(state.courses[0].schedules[0]),'Thursday · 9:00 AM–10:30 AM · 609');
assert.equal(feature.normalizeSchedules(state.courses[1])[0].start,'13:00');
assert.equal(feature.nextLabel(),'PSYCH12X · 9:00 AM');

feature.renderCatalog();feature.renderHome();
assert.match(elements.dynamicCourseGrid.innerHTML,/Cognitive Psychology/);
assert.doesNotMatch(elements.dynamicCourseGrid.innerHTML,/Old Course/);
assert.match(elements.dailyCourseStrip.innerHTML,/Thursday/);

feature.upsert({id:'new',name:'Principles of Teaching',code:'EDUC03X',academicYear:'2026–2027',term:'Term 1',schedules:[]});
assert.ok(state.gradebook.new);assert.equal(saves,1);assert.equal(changes,1);assert.equal(toasts.at(-1),'course added');
feature.upsert({...state.courses.find(course=>course.id==='new'),code:'EDUC03Y'});
assert.equal(state.courses.find(course=>course.id==='new').code,'EDUC03Y');assert.equal(toasts.at(-1),'course updated');

assert.equal(feature.remove('cog'),true);
assert.equal(state.courses.some(course=>course.id==='cog'),false);
assert.equal(state.gradebook.cog,undefined);
assert.equal(state.examData['2026–2027::Term 1'].midterms.exams.length,0);
assert.equal(state.examData['2026–2027::Term 1'].finals.subjects['course-cog'],undefined);
assert.equal(removed,'cog');assert.equal(saves,3);assert.equal(changes,3);

elements.addCourseBtn.click();assert.deepEqual(modalArgs,[]);
const editTarget={dataset:{courseAction:'edit',courseId:'new'},closest(){return this;}};
elements.dynamicCourseGrid.dispatch('click',editTarget);assert.deepEqual(modalArgs,['new',false]);
const openTarget={dataset:{courseAction:'open',courseId:'new'},closest(){return this;}};
elements.dailyCourseStrip.dispatch('click',openTarget);assert.equal(opened,1);
feature.destroy();assert.equal(elements.addCourseBtn.hasListener('click'),false);
console.log('PASS: Courses term filtering, schedules, next class, views, upsert, cascade removal and cleanup');
