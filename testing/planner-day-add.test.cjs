const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../planner-v3.js'),'utf8');
const markup=source.match(/<button[^>]*id="plannerDayAdd"[^>]*>[\s\S]*?<\/button>/)?.[0];
assert(markup&&markup.includes('data-planner-add')&&markup.includes('type="button"'));
assert(source.indexOf(markup)>source.indexOf('id="plannerDayView"'));
assert(source.indexOf(markup)<source.indexOf('id="plannerAgenda"'));
assert(source.includes("if(add){e.preventDefault();openModal('study');return}"));
assert(!source.includes('data-planner-toggle-task'));
const nodes=new Map();const $=selector=>{if(!nodes.has(selector))nodes.set(selector,{value:'',style:{}});return nodes.get(selector)};
const ctx={$,editingId:'old',selectedDate:'2026-10-12',clearTimeError(){},syncTaskFields(){}};
vm.createContext(ctx);
const begin=source.indexOf('  function resetForm(');vm.runInContext(source.slice(begin,source.indexOf('\n  }',begin)+4),ctx);
for(const date of ['2026-10-12','2026-10-18','2026-11-01']){ctx.selectedDate=date;$('#plannerTitle').value='Old draft';ctx.resetForm('study');assert.equal($('#plannerDate').value,date);assert.equal($('#plannerTitle').value,'');assert.equal(ctx.editingId,null);}
console.log('Selected-day add button uses the existing add flow, prefills each chosen date and does not restore completion controls.');
