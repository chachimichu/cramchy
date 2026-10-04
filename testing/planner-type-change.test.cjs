const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../planner-v3.js'),'utf8');
function extract(name){const a=source.indexOf('  function '+name+'(');assert(a>=0);return source.slice(a,source.indexOf('\n  }',a)+4);}
class Node{constructor(){this.value='';this.handlers={};this.style={};this.dataset={};}addEventListener(t,fn){this.handlers[t]=fn}setCustomValidity(){}reportValidity(){}}
const nodes=new Map();const $=s=>{if(!nodes.has(s))nodes.set(s,new Node());return nodes.get(s)};
let saved=[],closed=0,failPlanner=false,failTask=false;
const api={tasks:[],put(item){if(failTask)throw Error('task quota');const task={...item,text:item.title};this.tasks=this.tasks.some(t=>t.id===item.id)?this.tasks.map(t=>t.id===item.id?task:t):[...this.tasks,task]},remove(id){if(failTask)throw Error('task quota');this.tasks=this.tasks.filter(t=>t.id!==id)}};
const ctx={window:{CramchyTaskBridge:api},$,$all:()=>[],events:[],editingId:null,selectedDate:'2026-10-05',TYPES:['class','task','exam','quiz','study','personal'],TIME:require('../js/planner-time.js'),uid:()=> 'new',
 saveEvents(){if(failPlanner)throw Error('planner quota');saved=JSON.parse(JSON.stringify(ctx.events.filter(e=>!e.academicExam&&!e.sharedTask&&e.type!=='task')))},
 closeModal(){closed++},renderAllPlanner(){},setPlannerView(){},dateObj:d=>new Date(d+'T12:00:00Z'),clearTimeError(){},showTimeError:m=>ctx.error=m,syncTaskFields(){}};
vm.createContext(ctx);vm.runInContext(['fillForm','bindPlanner'].map(extract).join('\n'),ctx);ctx.bindPlanner();
const original={id:'keep-id',title:'Review',type:'study',date:'2026-10-05',start:'09:00',end:'10:00',notes:'Keep notes',course:'CogPsy',done:true};
function edit(item,type){ctx.fillForm(item);assert.equal($('#plannerType').disabled,false);$('#plannerType').value=type;$('#plannerForm').handlers.submit({preventDefault(){}})}
ctx.events=[{...original}];edit(original,'quiz');assert.equal(saved[0].type,'quiz');assert.equal(saved[0].id,original.id);assert.equal(saved[0].notes,original.notes);
edit(ctx.events[0],'task');assert.equal(saved.length,0);assert.equal(api.tasks.length,1);assert.equal(api.tasks[0].id,original.id);assert.equal(api.tasks[0].done,true);
const task={...api.tasks[0],sharedTask:true};ctx.events=[task];edit(task,'personal');assert.equal(api.tasks.length,0);assert.equal(saved.length,1);assert.equal(saved[0].type,'personal');assert.equal(saved[0].start,'09:00');assert.equal(saved[0].notes,'Keep notes');
// An undated task opened from Tasks has no calendar projection to replace.
const undated={...original,id:'undated',type:'task',date:'',sharedTask:true};api.tasks=[undated];ctx.events=[];edit(undated,'study');assert.equal(saved.length,1);assert.equal(saved[0].date,'2026-10-05');assert.equal(api.tasks.length,0);
// A failed destination write keeps the original entry and the form open.
ctx.events=[{...original}];ctx.saveEvents();const beforeClosed=closed;failTask=true;edit(original,'task');assert.equal(saved.length,1);assert.equal(saved[0].type,'study');assert.equal(ctx.events[0].type,'study');assert.equal(closed,beforeClosed);failTask=false;
api.tasks=[task];ctx.events=[task];ctx.saveEvents();failTask=true;edit(task,'class');assert.equal(saved.length,0);assert.equal(api.tasks.length,1);assert.equal(ctx.events[0].sharedTask,true);failTask=false;
failPlanner=true;edit(task,'quiz');assert.equal(api.tasks.length,1);assert.equal(ctx.events[0].sharedTask,true);failPlanner=false;
console.log('Planner type edits: ordinary types, task conversions, undated tasks, field preservation and failed-write rollback passed.');
