(function(){
  'use strict';
  const APP_KEY='strawberryMatchaMidtermsState_v1';
  const SEEN_KEY='cramchySpecialLetterSeen_v2';
  let previousFocus=null;
  const previewGuide=new URLSearchParams(window.location.search).get('preview-guide')==='1'||new URLSearchParams(window.location.search).get('preview-letter')==='1';

  function readProfile(){
    try{const state=JSON.parse(localStorage.getItem(APP_KEY)||'{}');return state&&state.profile&&typeof state.profile==='object'?state.profile:{};}catch(e){return {};}
  }
  function shouldShow(){
    let seen=false;try{seen=localStorage.getItem(SEEN_KEY)==='1';}catch(e){}
    return !seen&&Boolean(String(readProfile().name||'').trim());
  }
  function dismiss(){
    const overlay=document.getElementById('cramchySpecialLetter');if(!overlay)return;
    try{localStorage.setItem(SEEN_KEY,'1');}catch(e){}
    overlay.remove();document.body.classList.remove('cramchy-letter-open');
    if(previousFocus&&typeof previousFocus.focus==='function'&&previousFocus.isConnected)previousFocus.focus();
  }
  function show(force=false){
    if((!force&&!shouldShow())||document.getElementById('cramchySpecialLetter'))return false;
    previousFocus=document.activeElement;
    const overlay=document.createElement('div');overlay.id='cramchySpecialLetter';overlay.className='cramchy-guide-frame-overlay';overlay.setAttribute('role','presentation');
    const theme=String(document.body.dataset.theme||'strawberry-matcha');
    const src='cramchy-app-guide.html?embedded=1&theme='+encodeURIComponent(theme)+'&v=20261023';
    overlay.innerHTML='<iframe class="cramchy-guide-frame" title="Cramchy app guide" src="'+src+'"></iframe>';
    document.body.appendChild(overlay);document.body.classList.add('cramchy-letter-open');
    return true;
  }
  function maybeShow(){
    if((!previewGuide&&!shouldShow())||document.getElementById('cramchyOnboard'))return false;
    const splash=document.getElementById('cramchyBootSplash');
    if(splash&&!splash.classList.contains('is-leaving')){setTimeout(maybeShow,450);return false;}
    return show(previewGuide);
  }
  function installStyles(){
    if(document.getElementById('cramchyGuideFrameStyles'))return;
    const style=document.createElement('style');style.id='cramchyGuideFrameStyles';
    style.textContent=`.cramchy-guide-frame-overlay{position:fixed;inset:0;z-index:2147483000;width:100vw;height:100vh;height:100dvh;overflow:hidden;background:transparent}
      body.cramchy-letter-open{overflow:hidden!important}
      .cramchy-guide-frame{display:block;width:100%;height:100%;border:0;background:transparent}
      @media(prefers-reduced-motion:reduce){.cramchy-guide-frame{scroll-behavior:auto}}`;
    document.head.appendChild(style);
  }
  function install(){
    if(window.__cramchySpecialLetterInstalled)return;
    window.__cramchySpecialLetterInstalled=true;installStyles();
    const originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){originalSetItem.call(this,key,value);if(this===window.localStorage&&key===APP_KEY)setTimeout(maybeShow,420);};
    document.addEventListener('click',event=>{
      if(event.target?.closest?.('#startCramchyBtn'))setTimeout(maybeShow,560);
      if(event.target?.closest?.('#openCramchyGuideBtn')){event.preventDefault();show(true);}
    },true);
    window.addEventListener('message',event=>{
      const frame=document.querySelector('#cramchySpecialLetter iframe');
      if(frame&&event.source===frame.contentWindow&&event.data?.type==='cramchy-guide-close')dismiss();
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.getElementById('cramchySpecialLetter'))dismiss();});
    const onboardingObserver=new MutationObserver(records=>{
      const finished=records.some(record=>Array.from(record.removedNodes||[]).some(node=>node&&node.id==='cramchyOnboard'));
      if(finished)setTimeout(maybeShow,180);
    });
    onboardingObserver.observe(document.body,{childList:true});setTimeout(maybeShow,900);
  }
  window.__cramchySpecialLetter={shouldShow,show,dismiss,maybeShow};
  window.__cramchyGuide=window.__cramchySpecialLetter;
  if(typeof document!=='undefined'&&document.body)install();
})();