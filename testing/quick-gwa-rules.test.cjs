const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const window={CramchyModules:{}};
vm.runInContext(fs.readFileSync('js/quick-gwa-rules.js','utf8'),vm.createContext({window,globalThis:window,String,Number,Array,Object,Map}));
const rules=window.CramchyModules.quickGwaRules;

assert.deepEqual(Array.from(rules.allowedGrades),['','4.0','3.5','3.0','2.5','2.0','1.5','1.0','INC','R']);
assert.equal(rules.allowedGrades.includes('P'),false);
assert.equal(rules.allowedGrades.includes('F'),false);

const calculate=rows=>rules.compute(rows.map(([grade,units])=>({grade,units})));
let result=calculate([['4.0',3],['INC',3]]);
assert.equal(result.gwa,4);assert.equal(result.eligible,false);assert.equal(result.message,"Here's your GWA ♡");
result=calculate([['4.0',3],['R',3]]);assert.equal(result.eligible,false);
result=calculate([['4.0',9],['2.0',1]]);assert.equal(result.gwa,3.8);assert.equal(result.eligible,false);
result=calculate([['4.0',3],['2.5',1]]);assert.equal(result.gwa,3.625);assert.equal(result.eligible,true);
result=calculate([['3.5',3],['3.0',3]]);assert.equal(result.honorLabel,"Dean's List (Second Honors)");

console.log('PASS: Quick GWA choices and Dean\'s List rules');
