const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let notify,starts=0,cancels=0;
const preference={matches:false};
function view(display){return {display,parentElement:null,classList:{contains:k=>k==='view'},getClientRects(){return this.display==='none'?[]:[{}];},animate(frames,options){starts++;assert(frames.every(f=>!('transform' in f)));assert.equal(options.duration,220);return {cancel(){cancels++;},addEventListener(){}};}};}
const home=view('block'),planner=view('none'),main={children:[home,planner]};home.parentElement=planner.parentElement=main;
const body={classList:{add(){}}},ctx={window:{},document:{body,querySelector:()=>main},matchMedia:()=>preference,getComputedStyle:el=>({display:el.display}),MutationObserver:class{constructor(fn){notify=fn;}observe(){}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../navigation-motion.js'),'utf8'),ctx);
notify([{target:body}]);assert.equal(starts,0);
home.display='none';planner.display='block';notify([{target:planner}]);assert.equal(starts,1);
notify([{target:planner}]);assert.equal(starts,1,'unrelated render must not repeat entrance');
ctx.window.CramchyMotion.enter(planner);assert.equal(starts,2);assert.equal(cancels,1);
ctx.window.CramchyMotion.enter(home);assert.equal(starts,2,'hidden views must not animate');
preference.matches=true;ctx.window.CramchyMotion.enter(planner);assert.equal(starts,2,'reduced motion must skip animation');
console.log('Navigation motion: route changes, repeat suppression, cancellation, hidden views, reduced motion and transform-free entrance passed.');
