const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function element(){
  const listeners={};
  return {
    innerHTML:'',textContent:'',value:'',dataset:{},checked:false,
    addEventListener(name,fn){listeners[name]=fn;},
    removeEventListener(name,fn){if(listeners[name]===fn)delete listeners[name];},
    dispatch(name,target=this,extra={}){listeners[name]?.({target,currentTarget:this,...extra});},
    click(){this.dispatch('click');},
    keydown(key){this.dispatch('keydown',this,{key});},
    hasListener:name=>Boolean(listeners[name])
  };
}

const ids=['missionList','missionInput','addMissionBtn','cramchyTaskList','cramchyTaskInput','cramchyAddTaskBtn','dailyTaskList','dailyTasksLeft'];
const elements=Object.fromEntries(ids.map(id=>[id,element()]));
const state={missions:[{id:'one',text:'Read notes',done:false},{id:'two',text:'Practice quiz',done:true}]};
let saves=0,nextId=3;
const toasts=[],reactions=[];
const window={CramchyModules:{}};
const document={getElementById:id=>elements[id]||null};
vm.runInContext(fs.readFileSync('js/tasks.js','utf8'),vm.createContext({window,document,String,Boolean,Array,Object,globalThis:window}));

const feature=window.CramchyModules.tasks.init({
  getState:()=>state,
  saveState:()=>saves++,
  showToast:message=>toasts.push(message),
  createId:()=>`task-${nextId++}`,
  escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;'),
  reactChaowi:kind=>reactions.push(kind)
});

feature.renderAll();
assert.match(elements.missionList.innerHTML,/Read notes/);
assert.match(elements.cramchyTaskList.innerHTML,/Practice quiz/);
assert.match(elements.dailyTaskList.innerHTML,/Read notes/);
assert.equal(elements.dailyTasksLeft.textContent,'1');

elements.missionInput.value='  Write reflection  ';
elements.addMissionBtn.click();
assert.equal(state.missions.at(-1).text,'Write reflection');
assert.equal(elements.missionInput.value,'');
assert.equal(toasts.at(-1),'mission added ♡');
assert.match(elements.cramchyTaskList.innerHTML,/Write reflection/);
assert.equal(elements.dailyTasksLeft.textContent,'2');

elements.cramchyTaskList.dispatch('change',{dataset:{taskAction:'toggle',taskId:'one'},checked:true});
assert.equal(state.missions[0].done,true);
assert.deepEqual(reactions,['topic']);
assert.equal(elements.dailyTasksLeft.textContent,'1');

elements.dailyTaskList.dispatch('change',{dataset:{taskAction:'toggle',taskId:'task-3'},checked:true});
assert.equal(state.missions.at(-1).done,true);
assert.deepEqual(reactions,['topic','topic']);
assert.equal(elements.dailyTasksLeft.textContent,'0');

elements.missionList.dispatch('click',{dataset:{taskAction:'delete',taskId:'two'}});
assert.equal(state.missions.some(item=>item.id==='two'),false);
assert.doesNotMatch(elements.cramchyTaskList.innerHTML,/Practice quiz/);
assert.equal(saves,4);

feature.destroy();
assert.equal(elements.addMissionBtn.hasListener('click'),false);
assert.equal(elements.cramchyTaskList.hasListener('change'),false);
console.log('PASS: Tasks add, toggle, delete, cross-surface rendering, persistence, reactions and cleanup');
