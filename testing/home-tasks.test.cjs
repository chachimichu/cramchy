const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app-base.js'),'utf8');
function appFunction(name){
  const start=source.lastIndexOf('function '+name+'(');assert(start>=0);
  return source.slice(start,source.indexOf('\n}',start)+2);
}
class Element{
  constructor(){this.dataset={};this.handlers={};this.checked=false;this.value='';this.textContent='';}
  set innerHTML(html){
    this.html=html;this.controls=[];
    for(const match of html.matchAll(/<(input|button)\b[^>]*>/g)){
      const el=new Element();el.tag=match[1];el.markup=match[0];el.checked=/\bchecked\b/.test(el.markup);
      for(const attr of el.markup.matchAll(/data-([\w-]+)="([^"]*)"/g)){
        const key=attr[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
        el.dataset[key]=attr[2].replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&');
      }
      this.controls.push(el);
    }
  }
  get innerHTML(){return this.html||'';}
  querySelectorAll(selector){const attr=selector.match(/^\[data-([\w-]+)\]$/);return (this.controls||[]).filter(el=>attr&&Object.hasOwn(el.dataset,attr[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())));}
  addEventListener(name,callback){this.handlers[name]=callback;}
}
const nodes=new Map(['dailyTasksLeft','dailyTaskList','cramchyTaskList','cramchyTaskInput','saveIndicator'].map(id=>[id,new Element()]));
let clock=0,nextTimer=0,nextTask=0,cloudSaves=0;
const timers=new Map(),persisted=new Map([['strawberryMatchaMidtermsState_v1',JSON.stringify({missions:[]})]]);
const context={
  state:{missions:[]},STORAGE_KEY:'strawberryMatchaMidtermsState_v1',APP_VERSION:'test',STATE_SCHEMA_VERSION:2,saveTimeout:null,
  document:{getElementById:id=>nodes.get(id)||null},
  localStorage:{getItem:key=>persisted.get(key)??null,setItem:(key,value)=>persisted.set(key,value)},
  setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,at:clock+delay});return id;},clearTimeout:id=>timers.delete(id),
  escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
  escapeAttr:value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;'),
  cryptoId:()=> 'task-'+(++nextTask),queueCloudSave:()=>cloudSaves++,renderDashboard(){},chaowiApi:null,console
};
vm.createContext(context);
vm.runInContext(['saveState','renderDailyTasks','renderHomeTaskSummary','renderCramchyTasks','addCramchyQuickTask'].map(appFunction).join('\n'),context);
context.renderDailyHome=()=>context.renderHomeTaskSummary();
function advance(ms){clock+=ms;for(const [id,timer] of [...timers])if(timer.at<=clock){timers.delete(id);timer.fn();}}
const count=()=>nodes.get('dailyTasksLeft').textContent;
const homeChecks=()=>nodes.get('dailyTaskList').querySelectorAll('[data-daily-task]');
const taskChecks=()=>nodes.get('cramchyTaskList').querySelectorAll('[data-cramchy-task-check]');
function add(text){nodes.get('cramchyTaskInput').value=text;context.addCramchyQuickTask();}
function change(el,checked){el.checked=checked;el.handlers.change();}
context.renderHomeTaskSummary();assert.equal(count(),'0');
add('Review psychology');
assert.equal(count(),'1');assert(nodes.get('dailyTaskList').innerHTML.includes('Review psychology'));
assert.equal(JSON.parse(persisted.get(context.STORAGE_KEY)).missions.length,0,'Home must update before persistence');
// An older loader can still request the retired asset, but it cannot repaint stale data.
vm.runInNewContext(fs.readFileSync(require.resolve('../task-home-sync-v9.js'),'utf8'),{
  localStorage:new Proxy({}, {get(){throw Error('Retired patch must not read storage');}})
});
advance(0);assert.equal(count(),'1');
add('Study anatomy');assert.equal(count(),'2');assert.equal(homeChecks().length,2);
change(taskChecks()[0],true);
assert.equal(count(),'1');assert.equal(homeChecks()[0].checked,true);
change(taskChecks()[0],false);
assert.equal(count(),'2');assert.equal(homeChecks()[0].checked,false);
// Home edits update app state and the Tasks page without a hidden mirror checkbox.
change(homeChecks()[1],true);
assert.equal(count(),'1');assert.equal(context.state.missions[1].done,true);assert.equal(taskChecks()[1].checked,true);
const deleteButton=nodes.get('cramchyTaskList').querySelectorAll('[data-cramchy-task-delete]')[0];
deleteButton.handlers.click();
assert.equal(count(),'0');assert.equal(homeChecks().length,1);assert.equal(homeChecks()[0].dataset.dailyTask,'task-2');
assert(!nodes.get('dailyTaskList').innerHTML.includes('Review psychology'));
advance(260);
assert.equal(cloudSaves,1,'Rapid changes should retain the existing debounced save');
assert.deepEqual(JSON.parse(persisted.get(context.STORAGE_KEY)).missions,JSON.parse(JSON.stringify(context.state.missions)));
// A missing Tasks-page container does not stop the Home checkbox from saving.
nodes.delete('cramchyTaskList');change(homeChecks()[0],false);assert.equal(count(),'1');advance(260);
assert.equal(JSON.parse(persisted.get(context.STORAGE_KEY)).missions[0].done,false);
// Persisted state can be reloaded, and backup/cloud replacements render their new state.
context.state=JSON.parse(persisted.get(context.STORAGE_KEY));context.renderHomeTaskSummary();assert.equal(count(),'1');
context.state.missions=[];context.renderHomeTaskSummary();assert.equal(count(),'0');assert(nodes.get('dailyTaskList').innerHTML.includes('nothing due here'));
context.state.missions=[{id:'imported',text:'<script> is just text',done:false}];context.renderHomeTaskSummary();
assert.equal(count(),'1');assert(nodes.get('dailyTaskList').innerHTML.includes('&lt;script&gt;'));
// Other state saves must keep the existing task count accurate as well.
context.saveState();assert.equal(count(),'1');advance(260);
console.log('Immediate Home add/complete/undo/delete, direct checkbox updates, rapid saves, reload and replacement state passed.');
