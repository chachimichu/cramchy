const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function classList(){const values=new Set();return {add:(...items)=>items.forEach(x=>values.add(x)),remove:(...items)=>items.forEach(x=>values.delete(x)),toggle:(name,on)=>on?values.add(name):values.delete(name),contains:name=>values.has(name)};}
function element(){const listeners={};return {classList:classList(),style:{},textContent:'',title:'',offsetWidth:90,offsetHeight:28,addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:(name,fn)=>{if(listeners[name]===fn)delete listeners[name];},click(){listeners.click?.({stopPropagation(){}});},keydown(key){listeners.keydown?.({key,preventDefault(){}});},getBoundingClientRect:()=>({left:0,top:0,width:140,height:250}),hasListener:name=>!!listeners[name]};}
const ids=['petNook','petDuo','petReactionBubble','hanabiDog','kenkenDog','petNapBtn','petHideBtn','petRevealBtn'];
const elements=Object.fromEntries(ids.map(id=>[id,element()]));
const state={petDuoHidden:false,petDuoNap:false};let saves=0;const toasts=[];
const window={CramchyModules:{},setTimeout:()=>4,clearTimeout:()=>{}};
vm.runInContext(fs.readFileSync('js/pet-duo.js','utf8'),vm.createContext({window,document:{getElementById:id=>elements[id]},Math,globalThis:window}));
const feature=window.CramchyModules.petDuo.init({getState:()=>state,saveState:()=>saves++,showToast:message=>toasts.push(message),random:()=>0,setTimeoutFn:window.setTimeout,clearTimeoutFn:window.clearTimeout});
elements.petNapBtn.click();assert.equal(state.petDuoNap,true);assert.ok(elements.petNook.classList.contains('is-nap'));
elements.hanabiDog.click();assert.equal(state.petDuoNap,false);assert.match(toasts[0],/hanabi/);assert.equal(elements.petReactionBubble.textContent,'woof woof');
elements.petHideBtn.click();assert.equal(state.petDuoHidden,true);assert.ok(elements.petNook.classList.contains('is-hidden'));
elements.petRevealBtn.click();assert.equal(state.petDuoHidden,false);assert.ok(saves>=4);
feature.destroy();assert.equal(elements.hanabiDog.hasListener('click'),false);assert.equal(elements.petNapBtn.hasListener('click'),false);
console.log('PASS: Pet duo reactions, nap, hide, reveal, persistence and cleanup');
