(function(){
  'use strict';

  const APP_KEY='strawberryMatchaMidtermsState_v1';
  const SEEN_KEY='cramchySpecialLetterSeen_v2';
  let previousFocus=null;

  function readProfile(){
    try{
      const state=JSON.parse(localStorage.getItem(APP_KEY)||'{}');
      return state&&state.profile&&typeof state.profile==='object'?state.profile:{};
    }catch(e){return {};}
  }

  function shouldShow(){
    let seen=false;
    try{seen=localStorage.getItem(SEEN_KEY)==='1';}catch(e){}
    const profile=readProfile();
    return !seen&&Boolean(String(profile.name||'').trim());
  }

  function installStyles(){
    if(document.getElementById('cramchySpecialLetterStyles'))return;
    const style=document.createElement('style');
    style.id='cramchySpecialLetterStyles';
    style.textContent=`
      .cramchy-letter-overlay{
        position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;
        padding:24px;background:rgba(73,38,53,.48);backdrop-filter:blur(7px);
        animation:cramchyLetterFade .24s ease both;
      }
      body.cramchy-letter-open{overflow:hidden!important}
      .cramchy-letter-card{
        position:relative;width:min(620px,100%);max-height:min(780px,calc(100vh - 48px));
        overflow:auto;padding:clamp(32px,6vw,54px) clamp(24px,7vw,62px) clamp(34px,6vw,52px);
        border:1px solid rgba(255,255,255,.94);border-radius:30px;
        background:
          radial-gradient(circle at 10% 8%,rgba(255,255,255,.98),transparent 25%),
          radial-gradient(circle at 90% 92%,rgba(249,208,222,.56),transparent 30%),
          linear-gradient(145deg,#fffdfb 0%,#fff6f8 56%,#fdebf1 100%);
        color:#5d3b47;box-shadow:0 30px 90px rgba(57,27,40,.28),0 8px 28px rgba(91,43,63,.12);
        animation:cramchyLetterArrive .34s cubic-bezier(.2,.8,.2,1) both;
        scrollbar-width:thin;scrollbar-color:#e9a9bc transparent;
      }
      .cramchy-letter-card::before{
        content:'♡';position:absolute;top:17px;left:50%;transform:translateX(-50%);
        color:#df7f9c;font:700 19px/1 Georgia,serif;
      }
      .cramchy-letter-close{
        position:absolute;top:15px;right:16px;width:40px;height:40px;display:grid;place-items:center;
        border:0;border-radius:50%;background:rgba(239,190,204,.34);color:#8b5263;
        font:500 25px/1 system-ui,sans-serif;cursor:pointer;transition:transform .16s ease,background .16s ease;
      }
      .cramchy-letter-close:hover{background:rgba(225,143,168,.35);transform:rotate(4deg) scale(1.04)}
      .cramchy-letter-close:focus-visible{outline:3px solid rgba(203,91,126,.3);outline-offset:3px}
      .cramchy-letter-kicker{
        margin:7px 0 25px;text-align:center;color:#bd5d7c;
        font-family:'Playfair Display',Georgia,serif;font-size:clamp(28px,6vw,40px);font-weight:700;
        line-height:1.08;letter-spacing:-.025em;
      }
      .cramchy-letter-body{font-family:'Nunito',system-ui,sans-serif;font-size:16px;line-height:1.72}
      .cramchy-letter-body p{margin:0 0 17px}
      .cramchy-letter-hello{font-weight:800;color:#794a59}
      .cramchy-letter-signoff{margin-top:25px!important;color:#98556b;font-family:'Playfair Display',Georgia,serif;font-size:18px;line-height:1.5}
      .cramchy-letter-signoff strong{font-size:22px}
      .cramchy-letter-rule{width:76px;height:2px;margin:25px 0;background:linear-gradient(90deg,#df8da7,transparent);border:0}
      @keyframes cramchyLetterFade{from{opacity:0}to{opacity:1}}
      @keyframes cramchyLetterArrive{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:none}}
      @media(max-width:540px){
        .cramchy-letter-overlay{padding:12px;align-items:center}
        .cramchy-letter-card{max-height:calc(100vh - 24px);border-radius:24px;padding:42px 23px 30px}
        .cramchy-letter-kicker{margin-bottom:21px;font-size:31px}
        .cramchy-letter-body{font-size:15.5px;line-height:1.63}
        .cramchy-letter-body p{margin-bottom:14px}
      }
      @media(prefers-reduced-motion:reduce){.cramchy-letter-overlay,.cramchy-letter-card{animation:none}}
    `;
    document.head.appendChild(style);
  }

  function dismiss(){
    const overlay=document.getElementById('cramchySpecialLetter');
    if(!overlay)return;
    try{localStorage.setItem(SEEN_KEY,'1');}catch(e){}
    overlay.remove();
    document.body.classList.remove('cramchy-letter-open');
    if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();
  }

  function show(){
    if(!shouldShow()||document.getElementById('cramchySpecialLetter'))return false;
    installStyles();
    previousFocus=document.activeElement;
    const overlay=document.createElement('div');
    overlay.id='cramchySpecialLetter';
    overlay.className='cramchy-letter-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','cramchyLetterTitle');
    overlay.innerHTML=`
      <article class="cramchy-letter-card">
        <button class="cramchy-letter-close" type="button" aria-label="Close special letter">×</button>
        <h2 class="cramchy-letter-kicker" id="cramchyLetterTitle">A special letter for you ♡</h2>
        <div class="cramchy-letter-body">
          <p class="cramchy-letter-hello">Hello, my dear user!</p>
          <p>I’m Charlene Mikaela Caco, a Psychology student from NU Clark and the person behind Cramchy. ♡</p>
          <p>Thank you so much for using this little app. I created Cramchy because I know how overwhelming school can get, especially when everything seems to pile up all at once.</p>
          <p>I hope Cramchy helps make your days a little lighter, your tasks a little less scary, and studying a little more manageable. Even the smallest progress still counts, okay?</p>
          <p>I’m really happy that something I created gets to be part of your academic journey. I’m rooting for you, always. ♡</p>
          <hr class="cramchy-letter-rule">
          <p class="cramchy-letter-signoff">With love,<br><strong>Chachi ♡</strong></p>
        </div>
      </article>`;
    document.body.appendChild(overlay);
    document.body.classList.add('cramchy-letter-open');
    overlay.querySelector('.cramchy-letter-close')?.addEventListener('click',dismiss);
    overlay.querySelector('.cramchy-letter-close')?.focus();
    return true;
  }

  function maybeShow(){
    if(!shouldShow()||document.getElementById('cramchyOnboard'))return false;
    const splash=document.getElementById('cramchyBootSplash');
    if(splash&&!splash.classList.contains('is-leaving')){setTimeout(maybeShow,450);return false;}
    return show();
  }

  function install(){
    if(window.__cramchySpecialLetterInstalled)return;
    window.__cramchySpecialLetterInstalled=true;
    const originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      originalSetItem.call(this,key,value);
      if(this===window.localStorage&&key===APP_KEY)setTimeout(maybeShow,420);
    };
    document.addEventListener('click',event=>{
      if(event.target?.closest?.('#startCramchyBtn'))setTimeout(maybeShow,560);
    },true);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&document.getElementById('cramchySpecialLetter'))dismiss();
    });
    const onboardingObserver=new MutationObserver(records=>{
      const finished=records.some(record=>Array.from(record.removedNodes||[]).some(node=>node&&node.id==='cramchyOnboard'));
      if(finished)setTimeout(maybeShow,180);
    });
    onboardingObserver.observe(document.body,{childList:true});
    setTimeout(maybeShow,900);
  }

  window.__cramchySpecialLetter={shouldShow,show,dismiss,maybeShow};
  if(typeof document!=='undefined'&&document.body)install();
})();
