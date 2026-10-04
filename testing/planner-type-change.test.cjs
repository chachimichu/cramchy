const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../planner-v3.js'),'utf8');
function extract(name){const a=source.indexOf('  function '+name+'(');assert(a>=0);return source.slice(a,source.indexOf('\n  }',a)+4);}
class Node{constructor(){this.value='';this.handlers={};this.style={};this.dataset={};}addEventListener(t,fn){this.handlers[t]=fn}setCustomValidity(){}reportValidity(){}}
const nodes=new Map();const $=s=>{if(!nodes.has(s))nodes.set(s,new Node());return nodes.get(s)};
let saved=[],closed=0,failPlanner=false,failTask=false;
const api={tasks:[],put(item){if(failTask)throw Error('task quota');const task={...item,text:item.title};this.tasks=this.tasks.some(t=>t.id===item.id)?this.tasks.map(t=>t.id===item.id?task:t):[...this.tasks,task]},remove(id){if(failTask)throw Error('task quota');this.tasks=this.tasks.filter(t=>t.id!==id)}};
const ctx={window:{CramchyTaskBridge:api,CramchySharedTasks:require('../js/shared-tasks.js')},$,$all:()=>[],events:[],editingId:null,selectedDate:'2026-10-05',TYPES:['class','task','exam','quiz','study','assignment','personal'],TIME:require('../js/planner-time.js'),uid:()=> 'new',
 saveEvents(){if(failPlanner)throw Error('planner quota');saved=JSON.parse(JSON.stringify(ctx.events.filter(e=>!e.academicExam&&!e.sharedTask&&!ctx.window.CramchySharedTasks.actionable(e))))},
 closeModal(){closed++},renderAllPlanner(){},setPlannerView(){},dateObj:d=>new Date(d+'T12:00:00Z'),clearTimeError(){},showTimeError:m=>ctx.error=m,syncTaskFields(){}};
vm.createContext(ctx);vm.runInContext(['fillForm','bindPlanner'].map(extract).join('\n'),ctx);ctx.bindPlanner();
const original={id:'keep-id',title:'Review',type:'study',date:'2026-10-05',start:'09:00',end:'10:00',notes:'Keep notes',course:'CogPsy',done:true};
function edit(item,type){ctx.fillForm(item);assert.equal($('#plannerType').disabled,false);$('#plannerType').value=type;$('#plannerForm').handlers.submit({preventDefault(){}})}
ctx.events=[{...original,type:'class'}];edit(ctx.events[0],'quiz');assert.equal(saved.length,0);assert.equal(api.tasks[0].type,'quiz');assert.equal(api.tasks[0].notes,original.notes);
for(const type of ['study','assignment','task','quiz','personal']){const task={...api.tasks[0],title:api.tasks[0].text,sharedTask:true};ctx.events=[task];edit(task,type);assert.equal(api.tasks.length,1);assert.equal(api.tasks[0].type,type);assert.equal(api.tasks[0].id,original.id);assert.equal(api.tasks[0].done,true);}
const task={...api.tasks[0],title:api.tasks[0].text,sharedTask:true};ctx.events=[task];edit(task,'class');assert.equal(api.tasks.length,0);assert.equal(saved.length,1);assert.equal(saved[0].type,'class');assert.equal(saved[0].start,'09:00');assert.equal(saved[0].notes,'Keep notes');
const undated={...original,id:'undated',type:'task',date:'',sharedTask:true};api.tasks=[undated];ctx.events=[];edit(undated,'class');assert.equal(saved.length,1);assert.equal(saved[0].date,'2026-10-05');assert.equal(api.tasks.length,0);
// Failed conversions keep the old entry and the form open.
const ordinary={...original,type:'class'};ctx.events=[ordinary];ctx.saveEvents();const beforeClosed=closed;failTask=true;edit(ordinary,'quiz');assert.equal(saved.length,1);assert.equal(saved[0].type,'class');assert.equal(ctx.events[0].type,'class');assert.equal(closed,beforeClosed);failTask=false;
api.tasks=[task];ctx.events=[task];ctx.saveEvents();failTask=true;edit(task,'class');assert.equal(saved.length,0);assert.equal(api.tasks.length,1);assert.equal(ctx.events[0].sharedTask,true);failTask=false;
failPlanner=true;edit(task,'class');assert.equal(api.tasks.length,1);assert.equal(ctx.events[0].sharedTask,true);failPlanner=false;
console.log('Typed checklist edits, conversions, field preservation, undated entries and failed-write rollback passed.');

assert(!source.includes('plannerShowInTasks'),'No opt-in is needed to show an entry in Tasks');assert(!source.includes('data-planner-toggle-task'),'Planner presents events without duplicate completion controls');
