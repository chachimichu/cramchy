(function(){
  const BASE_MATCH='app-base.js';
  const VERSION='2026-09-09-boot-resilience-11';
  const head=document.head;
  if(!head||window.__cramchyBaseReady)return;

  let resolveBase,rejectBase;
  window.__cramchyBaseReady=new Promise((resolve,reject)=>{resolveBase=resolve;rejectBase=reject;});

  const nativeAppend=head.appendChild.bind(head);
  let intercepted=false;

  function restore(){
    try{delete head.appendChild;}catch(_){head.appendChild=nativeAppend;}
  }

  function patchedBootSource(source){
    const bootPattern=/switchTab\('dashboard'\);\s*renderAll\(\);\s*updateBreakDisplay\(\);\s*initCramchyShell\(\);\s*initAcademicTerms\(\);\s*initExamAndCourses\(\);\s*initDailyHome\(\);\s*initGradesModes\(\);\s*initCloudSync\(\);\s*initAskCramchy\(\);\s*showBootUpdateNotice\(\);\s*\}\)\(\);\s*$/;
    if(!bootPattern.test(source))throw new Error('Cramchy boot marker was not found.');

    const replacement=`switchTab('dashboard');\n\nfunction cramchyBootSafe(label,fn){\n  try{return fn();}\n  catch(err){\n    console.error('[Cramchy boot] '+label+' failed.',err);\n    window.__cramchyBootErrors=window.__cramchyBootErrors||[];\n    window.__cramchyBootErrors.push({label,message:String(err&&err.message||err)});\n    return null;\n  }\n}\n\ncramchyBootSafe('initial render',renderAll);\ncramchyBootSafe('break display',updateBreakDisplay);\ncramchyBootSafe('shell',initCramchyShell);\ncramchyBootSafe('academic terms',initAcademicTerms);\ncramchyBootSafe('exam and courses',initExamAndCourses);\ncramchyBootSafe('daily home',initDailyHome);\ncramchyBootSafe('grades',initGradesModes);\ntry{Promise.resolve(initCloudSync()).catch(err=>console.error('[Cramchy boot] cloud sync failed.',err));}\ncatch(err){console.error('[Cramchy boot] cloud sync failed.',err);}\ncramchyBootSafe('ask cramchy',initAskCramchy);\ncramchyBootSafe('boot notice',showBootUpdateNotice);\n\n})();`;
    return source.replace(bootPattern,replacement);
  }

  head.appendChild=function(node){
    const isBase=node&&node.tagName==='SCRIPT'&&String(node.src||'').includes(BASE_MATCH);
    if(!isBase||intercepted)return nativeAppend(node);
    intercepted=true;

    const originalOnload=node.onload;
    const originalOnerror=node.onerror;

    fetch('app-base.js?v='+VERSION,{cache:'no-store'})
      .then(response=>{if(!response.ok)throw new Error('Base bundle returned '+response.status);return response.text();})
      .then(source=>{
        const patched=patchedBootSource(source);
        const inline=document.createElement('script');
        inline.textContent=patched+'\n//# sourceURL=app-base-resilient-v11.js';
        nativeAppend(inline);
        restore();
        try{if(typeof originalOnload==='function')originalOnload.call(node);}catch(err){console.error('Cramchy logo refresh failed.',err);}
        resolveBase();
      })
      .catch(err=>{
        console.error('Cramchy resilient boot patch failed; using normal base bundle.',err);
        restore();
        node.src='app-base.js?v='+VERSION;
        node.onload=function(event){try{if(typeof originalOnload==='function')originalOnload.call(node,event);}finally{resolveBase();}};
        node.onerror=function(event){try{if(typeof originalOnerror==='function')originalOnerror.call(node,event);}finally{rejectBase(err);}};
        nativeAppend(node);
      });

    return node;
  };
})();
