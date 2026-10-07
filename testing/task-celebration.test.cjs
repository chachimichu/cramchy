const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const layers=[],animations=[],media={matches:false,addEventListener(name,fn){this.change=fn;}};
class Element{
  constructor(){this.children=[];this.attributes={};}
  setAttribute(k,v){this.attributes[k]=v;}
  appendChild(el){this.children.push(el);}
  remove(){this.removed=true;}
  animate(frames,options){const a={frames,options,finished:new Promise(()=>{}),cancel(){this.cancelled=true;}};animations.push(a);return a;}
}
const ctx={window:{},Element,innerWidth:390,innerHeight:844,matchMedia:()=>media,document:{createElement:()=>{const e=new Element();e.style={};return e;},body:{appendChild:el=>layers.push(el)}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../js/task-celebration.js'),'utf8'),ctx);
media.matches=true;ctx.window.CramchyCelebrate.task();assert.equal(layers.length,0);
media.matches=false;ctx.window.CramchyCelebrate.task({left:20,top:30,width:20,height:20});assert.equal(layers.length,1);assert.equal(animations.length,22);
assert(layers[0].style.cssText.includes('pointer-events:none'));assert.equal(layers[0].attributes['aria-hidden'],'true');
assert(layers[0].children.every(p=>p.style.cssText.includes('left:30px;top:40px;')));
assert.equal(animations[0].options.duration,850);
ctx.window.CramchyCelebrate.task({left:20,top:30,width:20,height:20});assert(layers[0].removed);assert(animations[0].cancelled);
media.matches=true;media.change();assert(layers[1].removed);assert(animations.at(-1).cancelled);
console.log('Original task confetti: checkbox origin, reduced motion, nonblocking overlay, repeat cleanup and preference-change cancellation passed.');
