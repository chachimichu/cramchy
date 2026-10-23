const assert=require('node:assert/strict');
const editor=require('../js/course-schedule-editor.js');
const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const source=[
  {id:'a',day:'Tuesday',start:'10:00',end:'11:30',room:'204'},
  {id:'b',day:'Friday',start:'10:00',end:'11:30',room:'204'},
  {id:'c',day:'Thursday',start:'13:00',end:'14:00',room:'Lab'},
  {id:'d',day:'',start:'',end:'',room:'TBA'}
];
const before=JSON.stringify(source);
const grouped=editor.group(source,days);
assert.deepEqual(grouped,[
  {days:['Tuesday','Friday'],start:'10:00',end:'11:30',room:'204'},
  {days:['Thursday'],start:'13:00',end:'14:00',room:'Lab'},
  {days:[],start:'',end:'',room:'TBA'}
]);
assert.equal(JSON.stringify(source),before,'grouping leaves saved course data untouched');
let id=0;
assert.deepEqual(editor.expand(['Tuesday','Friday'],'10:00','11:30','204',()=>`new-${++id}`),[
  {id:'new-1',day:'Tuesday',start:'10:00',end:'11:30',room:'204'},
  {id:'new-2',day:'Friday',start:'10:00',end:'11:30',room:'204'}
]);
assert.deepEqual(editor.expand([],'','','TBA',()=>`new-${++id}`),[
  {id:'new-3',day:'',start:'',end:'',room:'TBA'}
],'incomplete existing schedule rows remain representable');
assert.equal(editor.group([
  {day:'Monday',start:'09:00',end:'10:00',room:''},
  {day:'Monday',start:'09:00',end:'10:00',room:''}
],days).length,2,'duplicate same-day schedules are not collapsed');
console.log('Schedule editor: matching days group, differing schedules stay separate, expansion preserves per-day records, incomplete records remain representable, and duplicate same-day entries stay distinct.');
