const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const time=require('../js/planner-time.js');
const source=fs.readFileSync(require.resolve('../planner-v3.js'),'utf8');
function plannerFunction(name){const start=source.indexOf('  function '+name+'(');assert(start>=0);return source.slice(start,source.indexOf('\n  }',start)+4);}
const event=(id,start,end,date='2026-10-04')=>({id,title:id,type:'class',course:'PSY101',date,start,end,notes:'',done:false});
assert.equal(time.minutes('00:00'),0);assert.equal(time.minutes('23:59'),1439);
for(const bad of ['24:00','09:60','9:00','abc'])assert.equal(time.minutes(bad),null);
assert.equal(time.validate('',''),null);assert.equal(time.validate('06:00',''),null);assert.equal(time.validate('00:00','00:01'),null);
for(const [start,end,field] of [['06:00','05:00','end'],['06:00','06:00','end'],['','05:00','start'],['broken','','start'],['09:00','24:00','end']])assert.equal(time.validate(start,end).field,field);
assert.deepEqual(time.range([]),{firstHour:7,endHour:22});
assert.deepEqual(time.range([event('early','06:00','09:00'),event('late','23:00','23:45')]),{firstHour:6,endHour:24});
assert.deepEqual(time.range([event('midnight','00:00','01:00')]),{firstHour:0,endHour:22});
const overlapping=time.layout([event('a','09:00','12:00'),event('b','10:00','11:00'),event('c','11:00','13:00'),event('d','13:00','14:00')]);
assert.deepEqual(overlapping.map(x=>[x.event.id,x.lane,x.lanes]),[['a',0,2],['b',1,2],['c',1,2],['d',0,1]]);
assert.equal(time.interval(event('point','23:59','')).end,1440);
assert.equal(time.interval(event('old invalid','06:00','05:00')),null);

class Node{
  constructor(){this.value='';this.handlers={};this.dataset={};this.style={};this.hidden=true;this.textContent='';this.customValidity='';this.innerHTML='';}
  addEventListener(type,fn){this.handlers[type]=fn;}
  setCustomValidity(value){this.customValidity=value;}
  reportValidity(){this.reported=true;}
}
const selectors=['#view-planner','#plannerForm','#plannerTimeError','#plannerStart','#plannerEnd','#plannerTitle','#plannerType','#plannerCourse','#plannerDate','#plannerNotes','#plannerDeleteBtn','#plannerWeekGrid','#plannerModal','#plannerTaskHint','#plannerDateLabel'];
const nodes=new Map(selectors.map(selector=>[selector,new Node()]));
let writes=0,closes=0,renders=0,failWrite=false;
const context={window:{},syncTaskFields(){},TIME:time,HOUR_HEIGHT:74,events:[],selectedDate:'2026-10-04',editingId:null,monthCursor:null,TYPES:['class','task','exam','study','personal'],
  $:selector=>nodes.get(selector)||null,pad:value=>String(value).padStart(2,'0'),
  escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
  uid:()=> 'new',saveEvents:()=>{if(failWrite)throw Error('QuotaExceededError');writes++;},closeModal:()=>closes++,setPlannerView:()=>renders++,
  timeLabel:value=>value,prettyDate:date=>date,
  dateObj:date=>new Date(date+'T12:00:00Z'),startOfWeek:date=>date,
  addDays:(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);},
  byDate:date=>context.events.filter(e=>e.date===date)};
vm.createContext(context);vm.runInContext(['clearTimeError','showTimeError','bindPlanner','weekEventHtml','renderWeek'].map(plannerFunction).join('\n'),context);
context.bindPlanner();
let activated=0,prevented=0;
const cell={matches:selector=>selector==='.planner-day-cell',click:()=>activated++};
for(const key of ['Enter',' '])nodes.get('#view-planner').handlers.keydown({key,target:cell,preventDefault:()=>prevented++});
assert.equal(activated,2);assert.equal(prevented,2);
nodes.get('#view-planner').handlers.keydown({key:'Enter',target:{matches:()=>false},preventDefault:()=>{throw Error('Native button keyboard event must remain native');}});
function form(start,end){nodes.get('#plannerTitle').value='Class';nodes.get('#plannerType').value='class';nodes.get('#plannerDate').value='2026-10-04';nodes.get('#plannerStart').value=start;nodes.get('#plannerEnd').value=end;nodes.get('#plannerForm').handlers.submit({preventDefault(){}});}
form('06:00','05:00');assert.equal(writes,0);assert.equal(context.events.length,0);assert.equal(closes,0);assert.equal(nodes.get('#plannerTimeError').hidden,false);
assert(nodes.get('#plannerEnd').customValidity.includes('later'));
nodes.get('#plannerEnd').handlers.input();assert.equal(nodes.get('#plannerEnd').customValidity,'');assert.equal(nodes.get('#plannerTimeError').hidden,true);
form('06:00','09:00');assert.equal(writes,1);assert.equal(context.events.length,1);assert.equal(closes,1);assert.equal(renders,1);
context.editingId='new';form('06:00','06:00');assert.equal(writes,1);assert.equal(context.events[0].end,'09:00');
failWrite=true;form('06:00','10:00');assert.equal(context.events[0].end,'09:00');assert.equal(closes,1);assert(nodes.get('#plannerTimeError').textContent.includes('Could not save'));
context.events=[event('early','06:00','09:00'),event('late','23:00','23:45'),event('all day','',''),event('old invalid','06:00','05:00')];
context.renderWeek();let html=nodes.get('#plannerWeekGrid').innerHTML;
assert(html.includes('06:00'));assert(html.includes('23:00'));assert(html.includes('top:2px;height:218px'));
assert(html.includes('top:1260px;height:51.5px'));assert(html.includes('needs time correction'));assert(html.includes('data-planner-event="old invalid"'));
for(const item of context.events)assert.equal([...html.matchAll(new RegExp('data-planner-event="'+item.id+'"','g'))].length,1);
context.events=[event('night','00:15','01:15'),event('overlap','00:45','01:30'),event('point','23:59','')];
context.renderWeek();html=nodes.get('#plannerWeekGrid').innerHTML;
assert(html.includes('00:00'));assert(html.includes('left:calc(50% + 3px)'));assert(html.includes('width:calc(50% - 6px)'));
assert(html.includes('start only'));assert(!html.includes('NaN'));assert(!html.includes('Infinity'));
console.log('Planner time validation, midnight/early/late visibility, duration geometry, overlapping lanes, legacy warnings, form corrections and failed-save rollback passed.');

failWrite=false;let sharedWrites=0;context.window.CramchyTaskBridge={tasks:[],put(item){if(failWrite)throw Error('quota');sharedWrites++;this.tasks=[item];},remove(){}};context.renderAllPlanner=()=>renders++;nodes.get('#plannerType').value='task';nodes.get('#plannerDate').value='';nodes.get('#plannerStart').value='';nodes.get('#plannerEnd').value='';nodes.get('#plannerForm').handlers.submit({preventDefault(){}});assert.equal(sharedWrites,1);assert.equal(context.window.CramchyTaskBridge.tasks[0].date,'');assert.equal(context.window.CramchyTaskBridge.tasks[0].type,'task');failWrite=true;nodes.get('#plannerForm').handlers.submit({preventDefault(){}});assert.equal(sharedWrites,1);assert(nodes.get('#plannerTimeError').textContent.includes('Could not save this task'));assert(source.includes("document.body.appendChild($('#plannerModal'))"));
