const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
let observer,overlays=[],phone=false;
const handlers={},classes=new Set();
const doc={activeElement:null,body:{classList:{contains:key=>classes.has(key),toggle:(key,on)=>on?classes.add(key):classes.delete(key)}},
  querySelectorAll:()=>overlays,querySelector:()=>trigger,addEventListener:(name,fn)=>handlers[name]=fn};
class Node{
  constructor(kind='button'){this.kind=kind;this.tabIndex=0;this.isConnected=true;this.attrs={};this.items=[];this.style={};}
  querySelectorAll(selector){return selector==='label'?[]:this.items;}
  querySelector(selector){if(selector.includes('.course-modal'))return this;if(selector==='h1,h2,h3')return this.heading;return this.close;}
  setAttribute(key,value){this.attrs[key]=value;}
  hasAttribute(key){return Object.hasOwn(this.attrs,key);}
  getClientRects(){return this.hidden?[]:[{}];}
  matches(selector){return selector.split(',').includes(this.kind);}
  contains(node){return node===this||this.items.includes(node);}
  focus(){doc.activeElement=this;}
  click(){overlays=[];this.owner.isConnected=false;observer();}
}
const trigger=new Node();trigger.focus();
vm.runInNewContext(fs.readFileSync(require.resolve('../js/dialog-accessibility.js'),'utf8'),{
  document:doc,window:{matchMedia:()=>({matches:phone})},getComputedStyle:el=>({display:el.hidden?'none':'block',visibility:'visible'}),
  MutationObserver:class{constructor(fn){observer=fn;}observe(){}}});
function open(){const modal=new Node('div'),first=new Node(),field=new Node('input'),last=new Node(),disabled=new Node();disabled.disabled=true;
  modal.items=[first,field,last,disabled];modal.close=first;first.owner=modal;modal.heading={id:''};overlays=[modal];observer();return {modal,first,field,last};}
function key(key,shiftKey=false){let prevented=false;handlers.keydown({key,shiftKey,preventDefault:()=>prevented=true});return prevented;}
let m=open();assert.equal(doc.activeElement,m.field);assert.equal(m.modal.attrs.role,'dialog');assert(m.modal.attrs['aria-labelledby']);assert(classes.has('cramchy-dialog-open'));
m.last.focus();assert(key('Tab'));assert.equal(doc.activeElement,m.first);
m.first.focus();assert(key('Tab',true));assert.equal(doc.activeElement,m.last);
trigger.focus();handlers.focusin();assert.equal(doc.activeElement,m.field,'Focus cannot escape an open dialog');
assert(key('Escape'));assert.equal(doc.activeElement,trigger);assert(!classes.has('cramchy-dialog-open'));
phone=true;m=open();assert.equal(doc.activeElement,m.first,'Phone opening focuses a button without forcing the keyboard');
m.first.disabled=true;m.field.hidden=true;m.last.focus();assert(key('Tab'));assert.equal(doc.activeElement,m.last,'Disabled and hidden fields cannot enter the tab loop');
overlays=[];observer();assert.equal(doc.activeElement,trigger,'Programmatic close also restores focus');
console.log('Dialog keyboard focus, Tab/Shift+Tab loops, disabled/hidden controls, Escape, close restoration and phone focus passed.');
