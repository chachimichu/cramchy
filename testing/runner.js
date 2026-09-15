'use strict';
const frame=document.getElementById('app');
let snapshot={},busy=false;
// Executed before any app code. Never reads browser storage or auth sessions.
function installMemoryStorage(initial, scripts){
  const memory=new Map(Object.entries(initial));
  const storage=Object.create(Storage.prototype);
  Object.defineProperties(storage,{
    length:{get:()=>memory.size},
    getItem:{value:key=>memory.has(String(key))?memory.get(String(key)):null},
    setItem:{value:(key,value)=>{memory.set(String(key),String(value));}},
    removeItem:{value:key=>memory.delete(String(key))},
    clear:{value:()=>memory.clear()},
    key:{value:i=>Array.from(memory.keys())[i]??null}
  });
  Object.defineProperty(window,'localStorage',{value:storage});
  Object.defineProperty(window,'sessionStorage',{value:storage});
  Object.defineProperty(window,'caches',{value:{keys:async()=>[],delete:async()=>false}});
  window.testStorageSnapshot=()=>Object.fromEntries(memory);
  // Fail closed: app scripts are inserted only after all isolation succeeds.
  document.addEventListener('DOMContentLoaded',async()=>{
    for(const src of scripts) await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=src;
      script.onload=resolve;script.onerror=reject;document.head.appendChild(script);
    });
  },{once:true});
}
async function start(data){
  if(busy)return;
  busy=true;
  const status=document.getElementById('status');
  try{
    const response=await fetch('../index.html',{cache:'no-store'});
    if(!response.ok)throw new Error('Could not load app shell');
    const doc=new DOMParser().parseFromString(await response.text(),'text/html');
    const scripts=[];
    doc.querySelectorAll('script').forEach(s=>{
      if(s.src){const url=new URL(s.getAttribute('src'),new URL('../',location.href));if(url.origin===location.origin)scripts.push(url.href);}
      else if(s.textContent.trim())throw new Error('App shell now has inline scripts; review the test runner before loading.');
      s.remove();
    });
    const base=doc.createElement('base');base.href=new URL('../',location.href).href;
    const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';
    policy.content="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; form-action 'none'; object-src 'none'";
    const init=doc.createElement('script');
    init.textContent=`(${installMemoryStorage.toString()})(${JSON.stringify(data).replace(/</g,'\\u003c')},${JSON.stringify(scripts)});`;
    doc.head.prepend(policy,base,init);
    snapshot=data;
    frame.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;
    document.getElementById('reload').disabled=false;
    status.textContent='Test session loaded. Use Reload test app to retain in-memory edits; Load sample data resets only this test session.';
  }catch(e){status.textContent=e.message;}finally{busy=false;}
}
document.getElementById('seed').onclick=()=>start(seedCramchyTestData());
document.getElementById('fresh').onclick=()=>start({});
document.getElementById('reload').onclick=async()=>{
  // Let the legacy 260ms debounced save finish before capturing test state.
  await new Promise(resolve=>setTimeout(resolve,500));
  start(frame.contentWindow.testStorageSnapshot?.() || snapshot);
};
