const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function element(dataset={}){
  const listeners={};
  return {dataset,textContent:'',innerHTML:'',disabled:false,children:[],addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:(name,fn)=>{if(listeners[name]===fn)delete listeners[name];},click(){listeners.click?.({currentTarget:this,target:this});},change(){listeners.change?.({target:this});},appendChild(child){this.children.push(child);},hasListener:name=>!!listeners[name]};
}
const elements={timerSubjectSelect:element(),timerDisplay:element(),timerStartBtn:element(),timerPauseBtn:element(),timerResetBtn:element(),historyList:element(),totalFocusTime:element()};
const presets=[element({mins:'25'}),element({mins:'45'})];
const state={studyHistory:[{subject:'course-old',minutes:30,timestamp:Date.now(),academicKey:'2026–2027::Term 1',period:''}]};
let tick,saves=0,matcha=0,home=0;
const reactions=[],toasts=[];
const window={CramchyModules:{},setInterval:fn=>(tick=fn,9),clearInterval:()=>{}};
const document={getElementById:id=>elements[id],querySelectorAll:selector=>selector==='[data-mins]'?presets:[],createElement:()=>element()};
vm.runInContext(fs.readFileSync('js/study-timer.js','utf8'),vm.createContext({window,document,Date,String,Number,Array,Object,Math,globalThis:window}));
const feature=window.CramchyModules.studyTimer.init({getState:()=>state,saveState:()=>saves++,showToast:message=>toasts.push(message),getChoices:()=>[{id:'course-cog',name:'Cognitive Psychology'}],getHistoryContext:()=>({academicKey:'2026–2027::Term 1',period:'midterms'}),getHistoryName:item=>item.subject==='course-old'?'Old Course':'Cognitive Psychology',renderMatchaProgress:()=>matcha++,renderDailyHome:()=>home++,reactChaowi:kind=>reactions.push(kind),escapeHtml:value=>String(value),defaultMinutes:1,secondsPerMinute:2,setIntervalFn:window.setInterval,clearIntervalFn:window.clearInterval});

feature.render();
assert.match(elements.timerSubjectSelect.innerHTML,/Cognitive Psychology/);
assert.equal(elements.totalFocusTime.textContent,'30m');
assert.equal(elements.timerDisplay.textContent,'01:00');
elements.timerStartBtn.click();assert.equal(feature.snapshot().running,true);
tick();tick();assert.equal(feature.snapshot().running,false);
assert.equal(state.studyHistory[0].minutes,1);assert.equal(state.studyHistory[0].period,'midterms');
assert.deepEqual(reactions,['start','complete']);assert.equal(saves,1);assert.equal(matcha,1);assert.equal(home,1);assert.match(toasts[0],/session complete/);
elements.timerStartBtn.click();elements.timerPauseBtn.click();assert.equal(elements.timerStartBtn.textContent,'RESUME');assert.equal(reactions.at(-1),'pause');
feature.destroy();assert.equal(elements.timerStartBtn.hasListener('click'),false);assert.equal(elements.timerSubjectSelect.hasListener('change'),false);
console.log('PASS: Study timer choices, controls, completion, history, persistence and cleanup');
