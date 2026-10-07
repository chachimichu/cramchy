const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const shared=require('../js/shared-tasks.js');
const legacy={id:'old-a',type:'task',title:'Essay',date:'2026-10-09',done:false,course:'CogPsy',notes:'Keep this',start:'09:00',end:'10:00'};
let state={missions:[{id:'quick',text:'Undated',done:false}]};
const source=fs.readFileSync(require.resolve('../app-base.js'),'utf8');
const bridge=source.slice(source.indexOf('window.CramchyTaskBridge='),source.indexOf('/* Explicit access to gradebook'));
const persisted=new Map();let failure=false;
const ctx={window:{CramchySharedTasks:shared},state,STORAGE_KEY:'main',localStorage:{setItem(k,v){if(failure)throw Error('quota');persisted.set(k,v);}},saveState(){},renderCramchyTasks(){},renderDashboard(){}};
vm.runInNewContext(bridge,ctx);const api=ctx.window.CramchyTaskBridge;
api.import([legacy,{...legacy,id:'class',type:'class'}]);assert.equal(api.tasks.length,2);assert.equal(api.events().length,1);assert.equal(api.events()[0].notes,'Keep this');
api.import([legacy]);assert.equal(api.tasks.length,2,'repeat migration creates no duplicate');
const id=api.events()[0].id;api.toggle(id);assert.equal(api.tasks[1].done,true);assert.equal(api.events()[0].done,true);
api.put({...api.events()[0],title:'Edited essay',date:'2026-10-10'});assert.equal(api.tasks[1].text,'Edited essay');assert.equal(api.events()[0].date,'2026-10-10');
api.put({...api.events()[0],date:''});assert.equal(api.events().length,0,'clearing due date removes calendar projection');assert.equal(api.tasks.length,2);
api.remove(id);api.import([legacy]);assert.equal(api.tasks.length,1,'deleted imported task cannot reappear on refresh');
failure=true;assert.throws(()=>api.put({...legacy,id:'new'}));assert.equal(api.tasks.length,1,'failed save rolls back state');failure=false;
ctx.state=JSON.parse(persisted.get('main'));assert.equal(api.tasks.length,1);api.import([legacy]);assert.equal(api.tasks.length,1,'migration markers survive reload');
ctx.state={missions:[]};assert.equal(api.events().length,0,'bridge reads replacement account state');
api.import([legacy]);assert.equal(api.tasks.length,1,'migration markers are scoped to the account state');
console.log('Shared tasks: one-time migration, field preservation, edits, completion, unscheduling, deletion, reload, account replacement and failed-save rollback passed.');

const cleanStart=source.indexOf('function sanitizeState(');const clean=source.slice(cleanStart,source.indexOf('\n}',cleanStart)+2);ctx.SUBJECT_ORDER=[];ctx.freshState=()=>({missions:[],subjects:{},studyHistory:[]});vm.runInNewContext(clean,ctx);const restored=ctx.sanitizeState({missions:[{id:'dated',text:'Essay',done:true,date:'2026-10-09',course:'CogPsy',notes:'Keep me',start:'09:00',end:'10:00'}],importedPlannerTasks:['old-a']});assert.equal(restored.missions[0].date,'2026-10-09');assert.equal(restored.missions[0].notes,'Keep me');assert.equal(restored.importedPlannerTasks[0],'old-a');

assert.equal(shared.dateLabel('2026-10-05'),'Monday · Oct 5, 2026');assert.equal(shared.dateLabel('2026-10-04'),'Sunday · Oct 4, 2026');assert.equal(shared.dateLabel(''),'');assert.equal(shared.dateLabel('2026-02-30'),'2026-02-30');

const types=['quiz','study','assignment','exam','task'];const old=types.map((type,i)=>({...legacy,id:'typed-'+i,type,done:i===0}));
const migrated=shared.migrate([],[],[...old,{...legacy,id:'personal',type:'personal',showInTasks:true},{...legacy,id:'private',type:'personal'},{...legacy,id:'class',type:'class'}]);
assert.equal(migrated.tasks.length,7);assert.deepEqual(migrated.tasks.slice(0,5).map(t=>t.type),types);assert.equal(migrated.tasks[0].done,true);
assert.equal(shared.migrate(migrated.tasks,migrated.imported,old).changed,false);
assert.deepEqual(shared.project(migrated.tasks).slice(0,5).map(e=>e.type),types);
for(const type of [...types,'personal']){const cleanState=ctx.sanitizeState({missions:[{...migrated.tasks[0],type}]});assert.equal(cleanState.missions[0].type,type);}
console.log('All checklist types survive migration, projection and state reload; classes stay separate and personal entries appear automatically.');

const home=fs.readFileSync(require.resolve('../home-planner-reminders-v23.js'),'utf8');const begin=home.indexOf('  function calendarEvents(');
const homeCtx={window:{CramchySharedTasks:shared,CramchyTaskBridge:{events:()=>shared.project(migrated.tasks)}},calendar:require('../js/home-calendar.js'),readPlannerEvents:()=>old};
vm.createContext(homeCtx);vm.runInContext(home.slice(begin,home.indexOf('\n  }',begin)+4),homeCtx);
assert.equal(homeCtx.calendarEvents().length,7,'Home calendar lists each imported entry once, retaining completed schedule history');
assert.equal(new Set(homeCtx.calendarEvents().map(e=>e.id)).size,7);
