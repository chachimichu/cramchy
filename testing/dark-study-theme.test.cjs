const assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync(require.resolve('../dark-study.css'),'utf8');
for(const block of css.replace(/\/\*[\s\S]*?\*\//g,'').split('}').filter(b=>b.includes('{'))){
  const selectors=block.slice(0,block.indexOf('{'));
  assert(selectors.trim().startsWith('body[data-theme="dark-study"]'),'Theme overrides must stay scoped to dark study');
}
const luminance=hex=>hex.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
for(const [fg,bg] of [['f2e8ed','2d2932'],['cbbcc4','39313d'],['ffffff','a33660'],['bfaebc','242128'],['f7bfd3','49303c'],['d8e8cf','303d2e']])assert(contrast(fg,bg)>=4.5,`${fg}/${bg}`);
assert(css.includes('#plannerModal .planner-modal-head'));
assert(css.includes('.btn:not(.ghost):not(.secondary):not(.danger)'));
const app=fs.readFileSync(require.resolve('../app.js'),'utf8');assert(app.includes("'tasks-workspace.css','dark-study.css'"),'Dark theme fixes must load after existing styles');
console.log('Dark study overrides remain scoped, load last, cover modal/button specificity and use readable text/control palettes.');
