const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function element(){
  const listeners={};
  return {value:'',textContent:'',addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener:(name,fn)=>{if(listeners[name]===fn)delete listeners[name];},click:()=>listeners.click?.()};
}

const elements={
  customCountdownDate:element(),customCountdownTime:element(),setCountdownBtn:element(),clearCountdownBtn:element(),
  customCountdownTarget:element(),customCountdownDisplay:element()
};
const state={customCountdown:null};
let saves=0,toasts=[],tick,destroyed=false;
const window={CramchyModules:{},setInterval:fn=>(tick=fn,1),clearInterval:()=>destroyed=true};
const context=vm.createContext({window,document:{getElementById:id=>elements[id]},Date,Number,globalThis:window});
vm.runInContext(fs.readFileSync('js/countdown.js','utf8'),context);
const feature=window.CramchyModules.countdown.init({getState:()=>state,saveState:()=>saves++,showToast:msg=>toasts.push(msg),now:()=>Date.parse('2026-09-16T12:00:00')});

feature.render();
assert.equal(elements.customCountdownDisplay.textContent,'Pick a date and time, then tap Set.');
elements.setCountdownBtn.click();
assert.match(toasts.at(-1),/pick both/);
elements.customCountdownDate.value='2026-09-17';elements.customCountdownTime.value='12:00';elements.setCountdownBtn.click();
assert.equal(state.customCountdown.date,'2026-09-17');assert.equal(state.customCountdown.time,'12:00');assert.equal(saves,1);assert.equal(elements.customCountdownDisplay.textContent,'1d 00:00:00');
tick();assert.equal(elements.customCountdownDisplay.textContent,'1d 00:00:00');
elements.clearCountdownBtn.click();assert.equal(state.customCountdown,null);assert.equal(saves,2);assert.equal(elements.customCountdownTime.value,'');
feature.destroy();assert.equal(destroyed,true);
console.log('PASS: Countdown empty, validation, set, display, clear, save and cleanup');
