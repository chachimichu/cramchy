const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app-base.js'),'utf8');
function extract(name){const start=source.indexOf('function '+name+'(');assert(start>=0);const first=source.slice(start,source.indexOf('\n',start));return first.endsWith('}')?first:source.slice(start,source.indexOf('\n}',start)+2);}
class Node{
  constructor(){this.handlers={};this.dataset={};this.value='';this.textContent='';this.children=[];}
  set innerHTML(html){this.html=html;this.children=[];this.controls=[];for(const match of html.matchAll(/<(input|button)[^>]*data-id="([^"]+)"[^>]*>/g)){const node=new Node();node.tag=match[1];node.dataset.id=match[2];this.controls.push(node);}}
  get innerHTML(){return this.html||'';}
  appendChild(child){this.children.push(child);}
  addEventListener(type,fn){this.handlers[type]=fn;}
  querySelectorAll(selector){return this.children.flatMap(c=>c.controls||[]).filter(n=>n.tag===(selector.startsWith('input')?'input':'button'));}
}
const list=new Node(),input=new Node(),scope=new Node();let saves=0;
const ctx={state:{missions:[{id:'same',text:'Regular task',done:false}],examData:{},profile:{academicYear:'2026–2027',term:'Term 1'},examContext:{academicYear:'2026–2027',term:'Term 1'},examPeriod:'midterms'},TERM_OPTIONS:['Term 1','Term 2','Term 3'],SUBJECT_ORDER:[],freshState:()=>({subjects:{},missions:[],studyHistory:[],examData:{}}),document:{getElementById:id=>({missionList:list,missionInput:input,examMissionScope:scope}[id]),createElement:()=>new Node()},cryptoId:()=> 'same',escapeAttr:String,escapeHtml:s=>String(s).replaceAll('<','&lt;'),saveState:()=>saves++,showToast(){}};
vm.createContext(ctx);vm.runInContext(['academicKey','profileAcademicYear','profileTerm','activeExamYear','activeExamTerm','emptyExamPeriod','emptyTermRecord','ensureTermRecord','activePeriodData','renderMissions','addMission','sanitizeState'].map(extract).join('\n'),ctx);
function add(text){input.value=text;ctx.addMission();}
add('Midterm goal');assert.equal(ctx.state.missions.length,1);assert.equal(ctx.activePeriodData().missions.length,1);
ctx.state.examPeriod='finals';ctx.renderMissions();assert.equal(list.children.length,0);add('Finals goal');assert(scope.textContent.includes('finals'));
list.querySelectorAll('input')[0].checked=true;list.querySelectorAll('input')[0].handlers.change();assert.equal(ctx.activePeriodData().missions[0].done,true);assert.equal(ctx.state.missions[0].done,false);
list.querySelectorAll('button')[0].handlers.click();assert.equal(ctx.activePeriodData().missions.length,0);assert.equal(ctx.state.missions.length,1);
ctx.state.examPeriod='midterms';assert.equal(ctx.activePeriodData().missions[0].text,'Midterm goal');assert.equal(ctx.activePeriodData().missions[0].done,false);
ctx.state.examContext.term='Term 2';assert.equal(ctx.activePeriodData().missions.length,0);add('Term 2 goal');
ctx.state.examContext.academicYear='2027–2028';assert.equal(ctx.activePeriodData().missions.length,0);
const restored=ctx.sanitizeState(JSON.parse(JSON.stringify(ctx.state)));assert.equal(restored.examData['2026–2027::Term 1'].midterms.missions[0].text,'Midterm goal');assert.equal(restored.missions[0].text,'Regular task');assert.equal(restored.examData['2026–2027::Term 2'].midterms.missions[0].text,'Term 2 goal');
assert.equal(ctx.sanitizeState({examData:{old:{midterms:{},finals:{}}}}).examData.old.midterms.missions.length,0);
console.log('Exam missions: add, completion and deletion cannot affect regular tasks; midterms, finals, terms, years and saved-state normalization stay isolated.');
