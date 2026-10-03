const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app-base.js'),'utf8');
function appFunction(name){const start=source.lastIndexOf('function '+name+'(');assert(start>=0);return source.slice(start,source.indexOf('\n}',start)+2);}
const root={innerHTML:''};
const ctx={state:{profile:{academicYear:'2026–2027',term:'Term 1'},courses:[],examData:{},archivedTerms:[]},
  document:{getElementById:id=>id==='termManagerStatus'?root:null},escapeHtml:String,TERM_OPTIONS:['Term 1','Term 2','Term 3'],
  STATE_SCHEMA_VERSION:2,APP_VERSION:'test',saveTimeout:null,setTimeout:()=>1,clearTimeout(){},renderHomeTaskSummary(){}};
vm.createContext(ctx);
for(const name of ['academicKey','profileAcademicYear','profileTerm','activeExamYear','activeExamTerm','dailyAcademicKey','emptyExamPeriod','emptyTermRecord','ensureTermRecord','coursesForTerm','coursesForCurrentTerm','dailyTermRecord','renderTermManager','renderCramchySettings','saveState'])vm.runInContext(appFunction(name),ctx);
ctx.state.courses=[{id:'first',academicYear:'2026–2027',term:'Term 1'},{id:'second',academicYear:'2026–2027',term:'Term 2'}];
ctx.renderCramchySettings();assert(root.innerHTML.includes('Term 1'));assert(root.innerHTML.includes('1 course'));
ctx.state.examData['2026–2027::Term 1'].midterms.exams=[{id:'exam'}];
ctx.saveState();assert(root.innerHTML.includes('1 midterm exam'),'Exam saves must refresh More before debounce');
ctx.state.examData['2026–2027::Term 1'].midterms.exams=[];
ctx.saveState();assert(root.innerHTML.includes('0 midterm exams'),'Removal/reset must refresh counts');
ctx.state.profile.term='Term 2';ctx.renderCramchySettings();assert(root.innerHTML.includes('Term 2'));assert(root.innerHTML.includes('1 course'));
ctx.state.examPeriod='finals';ctx.state.examContext={academicYear:'2025–2026',term:'Term 3'};
ctx.saveState();assert(root.innerHTML.includes('Active exam workspace'));assert(root.innerHTML.includes('2025–2026 · Term 3 · finals'));
assert(root.innerHTML.includes('Current term'));assert(root.innerHTML.includes('Term 2'),'Current term must remain distinct from an older exam workspace');
ctx.state.examPeriod=null;ctx.saveState();assert(!root.innerHTML.includes('Active exam workspace'));
ctx.state.profile.academicYear='2027–2028';ctx.state.archivedTerms=['2027–2028::Term 2'];ctx.saveState();
assert(root.innerHTML.includes('2027–2028'));assert(root.innerHTML.includes('Term 2 · archived'));assert(root.innerHTML.includes('0 courses'));
console.log('More status: live exam counts, removal/reset, term/year switches, archived labels and distinct active exam workspace passed.');
