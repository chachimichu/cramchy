const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../grades-nu-polish-v1.js'),'utf8');
function appFunction(name){
  const start=source.indexOf('  function '+name+'(');
  assert(start>=0,'Missing '+name);
  const end=source.indexOf('\n  }',start)+4;
  return source.slice(start,end);
}
const values=new Map();
const root={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
const context={window:{CramchyModules:{}},localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)},
  document:{getElementById:id=>id==='gwaRoot'?root:null},getComputedStyle:()=>({display:'block'}),
  requestAnimationFrame:fn=>fn(),console,suppressGwaObserver:false};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../js/quick-gwa-rules.js'),'utf8'),context);
const constants=source.slice(source.indexOf('  const APP_STORAGE_KEY'),source.indexOf('  let suppressGwaObserver'));
const functions=['readJson','writeJson','escapeHtml','attr','toNumber','clampRaw','roundedRaw','pct','rawToGrade','conversionText','targetFor','isNumericGrade','profileYear','profileTerm','termsFor','currentTerm','setCurrentTerm','coursesFor','infoFor','updateInfo','unitFor','computeCourse','computeGwa','honorsStatus','modeOptions','gradeOptions','targetPanel','courseCard','renderTermGwa','bindTermGwa'];
vm.runInContext(constants+'\n'+functions.map(appFunction).join('\n'),context);
function setup(entries){
  const courses=entries.map((entry,index)=>({id:'c'+index,name:'Course '+index,code:'PSY'+index,units:entry.units??3,term:'Term 1',academicYear:'2026–2027'}));
  values.set('cramchyTermGwaPlanner_v2',JSON.stringify(Object.fromEntries(entries.map((entry,index)=>['c'+index,{mode:'equiv',...entry}]))));
  values.set('strawberryMatchaMidtermsState_v1',JSON.stringify({profile:{term:'Term 1',academicYear:'2026–2027'},courses}));
  return courses;
}
function calculate(entries){return context.computeGwa(setup(entries));}
for(const grade of ['INC','R','F']){
  const calc=calculate([{grade:'4.0',units:9},{grade,units:3}]);
  assert.equal(calc.gwa,4);assert.equal(calc.eligible,false);assert.equal(calc.honorLabel,'');
  assert(calc.blockers.some(item=>item.grade===grade));assert.equal(calc.pending,0);assert.equal(calc.excluded,1);
  context.renderTermGwa();
  const status=root.innerHTML.match(/<em>(.*?)<\/em>/s)[1];
  assert(status.includes('blocked'));assert(status.includes(grade));assert(!status.includes('First Honors'));
  assert(root.innerHTML.includes('0 pending · 1 excluded'));
}
let calc=calculate([{grade:'4.0',units:9},{grade:'2.0',units:1}]);
assert.equal(calc.gwa,3.8);assert.equal(calc.eligible,false);assert.equal(calc.honorLabel,'');
calc=calculate([{grade:'4.0',units:3},{grade:'2.5',units:1}]);
assert.equal(calc.gwa,3.625);assert.equal(calc.eligible,true);assert(calc.honorLabel.includes('First Honors'));
calc=calculate([{grade:'3.5'},{grade:'3.0'}]);
assert.equal(calc.gwa,3.25);assert(calc.honorLabel.includes('Second Honors'));
calc=calculate([{grade:'3.5'}]);assert(calc.honorLabel.includes('First Honors'));
calc=calculate([{grade:'4.0',units:0.249},{grade:'3.0',units:0.751}]);
assert.equal(calc.gwa.toFixed(2),'3.25');assert.equal(calc.honorLabel,'');
calc=calculate([{grade:'4.0',units:0.499},{grade:'3.0',units:0.501}]);
assert.equal(calc.gwa.toFixed(2),'3.50');assert(calc.honorLabel.includes('Second Honors'));
// Final grades and units must be complete before showing an honors estimate.
calc=calculate([{grade:'4.0'},{mode:'none'}]);
assert.equal(calc.gwa,4);assert.equal(calc.pending,1);assert.equal(calc.honorLabel,'');
context.renderTermGwa();assert(root.innerHTML.includes('Honors estimate pending: 1 course needs a final grade'));
calc=calculate([{grade:'4.0'},{mode:'midfinal',midtermRaw:96,finalsRaw:''}]);
assert.equal(calc.pending,1);assert.equal(calc.honorLabel,'');
calc=calculate([{grade:'4.0'},{grade:'4.0',units:0}]);
assert.equal(calc.unweighted,1);assert.equal(calc.honorLabel,'');
calc=calculate([{grade:'4.0'},{grade:'2.0',units:0}]);assert.equal(calc.eligible,false);
// P contributes no numeric weight; F remains a blocker even with zero units.
calc=calculate([{grade:'4.0'},{grade:'P'}]);
assert.equal(calc.gwa,4);assert.equal(calc.units,3);assert.equal(calc.excluded,1);assert.equal(calc.pending,0);
assert(calc.honorLabel.includes('First Honors'));
calc=calculate([{grade:'4.0'},{grade:'F',units:0}]);assert.equal(calc.eligible,false);
for(const entries of [[],[{grade:'P'}],[{grade:'INC'}]]){
  calc=calculate(entries);assert.equal(calc.gwa,null);assert.equal(calc.honorLabel,'');
}
// Converted raw and midterm/finals grades feed the same shared eligibility rules.
calc=calculate([{mode:'raw',finalRaw:95.5},{mode:'midfinal',midtermRaw:96,finalsRaw:96}]);
assert.equal(calc.gwa,4);assert(calc.honorLabel.includes('First Honors'));
calc=calculate([{mode:'raw',finalRaw:96},{mode:'raw',finalRaw:70}]);
assert(calc.blockers.some(item=>item.grade==='R'));assert.equal(calc.honorLabel,'');
const courses=setup([{grade:'4.0'}]);
const app=JSON.parse(values.get('strawberryMatchaMidtermsState_v1'));
app.courses.push({id:'other-term',name:'Other term',units:3,term:'Term 2',academicYear:'2026–2027'},
  {id:'other-year',name:'Other year',units:3,term:'Term 1',academicYear:'2027–2028'});
values.set('strawberryMatchaMidtermsState_v1',JSON.stringify(app));
const planner=JSON.parse(values.get('cramchyTermGwaPlanner_v2'));
planner['other-term']={mode:'equiv',grade:'INC'};planner['other-year']={mode:'equiv',grade:'R'};
values.set('cramchyTermGwaPlanner_v2',JSON.stringify(planner));
context.renderTermGwa();assert(root.innerHTML.includes("List (First Honors)"));assert(root.innerHTML.includes('grade-based estimate'));
// Persisted planner entries retain their results on a subsequent render.
context.renderTermGwa();assert(root.innerHTML.includes('grade-based estimate'));
console.log('Term GWA blockers, pending grades/units, P/F, raw conversion, thresholds, scoped courses and rendered eligibility passed.');
