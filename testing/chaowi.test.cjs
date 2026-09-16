const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function classList(){const values=new Set();return {add:(...items)=>items.forEach(x=>values.add(x)),remove:(...items)=>items.forEach(x=>values.delete(x)),toggle:(name,on)=>on?values.add(name):values.delete(name),contains:name=>values.has(name)};}
function element(){const listeners={};return {classList:classList(),textContent:'',title:'',addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:(name,fn)=>{if(listeners[name]===fn)delete listeners[name];},click(){listeners.click?.({stopPropagation(){}});},keydown(key){listeners.keydown?.({key,preventDefault(){}});},hasListener:name=>!!listeners[name]};}
const elements={chaowiCat:element(),chaowiNook:element(),chaowiModeBtn:element(),chaowiReveal:element()};
const state={chaowiMode:'awake'};let saves=0,nextTimer=0;const toasts=[];
const window={CramchyModules:{},matchMedia:()=>({matches:true}),setTimeout:()=>++nextTimer,clearTimeout:()=>{}};
vm.runInContext(fs.readFileSync('js/chaowi.js','utf8'),vm.createContext({window,document:{getElementById:id=>elements[id]},Math,globalThis:window}));
const feature=window.CramchyModules.chaowi.init({getState:()=>state,saveState:()=>saves++,showToast:(message,options)=>toasts.push({message,options}),personalizeMessage:message=>message.replace('{name}','chachi'),messageRandom:()=>0,setTimeoutFn:window.setTimeout,clearTimeoutFn:window.clearTimeout});
elements.chaowiModeBtn.click();assert.equal(state.chaowiMode,'nap');assert.ok(elements.chaowiNook.classList.contains('is-nap'));
feature.react('topic');assert.equal(state.chaowiMode,'awake');assert.match(toasts.at(-1).message,/topic/);
elements.chaowiModeBtn.click();elements.chaowiModeBtn.click();assert.equal(state.chaowiMode,'hidden');assert.ok(elements.chaowiNook.classList.contains('is-hidden'));
elements.chaowiReveal.click();assert.equal(state.chaowiMode,'awake');assert.ok(saves>=4);
feature.destroy();assert.equal(elements.chaowiCat.hasListener('click'),false);assert.equal(elements.chaowiModeBtn.hasListener('click'),false);
console.log('PASS: Chaowi reactions, mode cycle, persistence, reduced motion and cleanup');
