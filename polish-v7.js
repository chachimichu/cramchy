(function(){
  function fixLateNightGreeting(){
    const el=document.getElementById('dailyGreeting');
    if(!el)return false;
    const text=(el.textContent||'').trim();
    if(/^why are we still awake,/i.test(text) && !text.endsWith('?')){
      el.textContent=text.replace(/[.!…]*$/,'')+'?';
    }
    return true;
  }

  function bindGreetingFix(){
    const el=document.getElementById('dailyGreeting');
    if(!el||el.dataset.questionFix==='1')return false;
    el.dataset.questionFix='1';
    fixLateNightGreeting();
    new MutationObserver(fixLateNightGreeting).observe(el,{childList:true,characterData:true,subtree:true});
    return true;
  }

  function init(){
    if(bindGreetingFix())return;
    let tries=0;
    const retry=()=>{
      tries++;
      if(bindGreetingFix()||tries>=14)return;
      setTimeout(retry,120);
    };
    retry();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
