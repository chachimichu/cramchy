(function(){
  const VERSION='2026-09-14-grade-rounding-55';
  const LEGACY_BASE_URL='app-base.js?v='+VERSION;
  let splashSafetyTimer=null;

  function installFavicon(){
    const href='/favicon.ico?v=51';
    const icons=[
      {rel:'icon',href,sizes:'any'},
      {rel:'shortcut icon',href}
    ];
    icons.forEach(config=>{
      const existing=document.querySelector(`link[rel="${config.rel}"]`);
      const link=existing||document.createElement('link');
      link.rel=config.rel;
      link.href=config.href;
      if(config.sizes) link.sizes=config.sizes;
      if(!existing) document.head.appendChild(link);
    });
  }

  function installBootSplash(){
    if(document.getElementById('cramchyBootSplash')) return;

    const style=document.createElement('style');
    style.id='cramchyBootSplashStyle';
    style.textContent=`
      #cramchyBootSplash{
        position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;
        background:
          radial-gradient(circle at 18% 14%,rgba(255,255,255,.96) 0 9%,transparent 31%),
          radial-gradient(circle at 82% 18%,rgba(255,211,223,.88),transparent 34%),
          radial-gradient(circle at 45% 94%,rgba(255,228,211,.82),transparent 39%),
          linear-gradient(135deg,#f8d6df 0%,#fff7f1 46%,#f4ced9 100%);
        opacity:1;visibility:visible;transition:opacity .28s ease,visibility .28s ease;
        overflow:hidden;
      }
      #cramchyBootSplash::before,#cramchyBootSplash::after{
        content:"";position:absolute;pointer-events:none;filter:blur(34px);opacity:.72;
      }
      #cramchyBootSplash::before{
        width:280px;height:280px;left:-55px;bottom:6%;background:#f2b9c8;
        border-radius:44% 56% 63% 37%/52% 40% 60% 48%;
      }
      #cramchyBootSplash::after{
        width:240px;height:240px;right:-35px;top:12%;background:#f7dfcc;
        border-radius:60% 40% 36% 64%/45% 58% 42% 55%;
      }
      #cramchyBootSplash.is-leaving{opacity:0;visibility:hidden;}
      .cramchy-boot-shell{
        position:relative;z-index:2;width:min(620px,calc(100vw - 32px));text-align:center;
        padding:46px 34px 42px;border-radius:40px;
        background:linear-gradient(180deg,rgba(255,252,248,.94),rgba(255,246,248,.92));
        border:1px solid rgba(255,255,255,.92);
        box-shadow:0 30px 80px rgba(118,68,82,.16),0 8px 26px rgba(118,68,82,.07);
        backdrop-filter:blur(14px);
      }
      .cramchy-boot-wordmark{
        margin:0;color:#c85f7e;font-family:'Playfair Display',Georgia,serif;
        font-size:clamp(58px,10vw,88px);font-weight:600;line-height:.92;letter-spacing:-.055em;
        text-shadow:0 8px 24px rgba(166,74,102,.08);
      }
      .cramchy-boot-sub{
        margin-top:12px;color:#a77a84;font-family:'Playfair Display',Georgia,serif;
        font-size:15px;font-style:italic;font-weight:600;letter-spacing:.18em;
      }
      .cramchy-boot-progress{
        width:min(320px,78%);height:9px;margin:42px auto 18px;padding:2px;
        border-radius:999px;background:rgba(231,174,190,.28);
        box-shadow:inset 0 1px 3px rgba(135,75,92,.08),0 5px 15px rgba(181,83,111,.07);
        overflow:hidden;
      }
      .cramchy-boot-progress span{
        display:block;width:100%;height:100%;border-radius:inherit;
        background:linear-gradient(90deg,#e788a2,#f4adc0,#d96f8d);
        transform:scaleX(.03);transform-origin:left center;
        animation:cramchyBootFill 1.75s cubic-bezier(.22,.75,.22,1) infinite;
        box-shadow:0 0 12px rgba(217,111,141,.18);
      }
      .cramchy-boot-copy{
        color:#a87280;font-family:'Nunito',system-ui,sans-serif;font-size:12px;font-weight:800;
        letter-spacing:.16em;text-transform:lowercase;
      }
      @keyframes cramchyBootFill{
        0%{transform:scaleX(.03);opacity:.72}
        72%{transform:scaleX(.88);opacity:1}
        92%{transform:scaleX(1);opacity:1}
        100%{transform:scaleX(1);opacity:0}
      }
      @media(max-width:600px){
        .cramchy-boot-shell{width:min(92vw,520px);padding:38px 22px 36px;border-radius:30px}
        .cramchy-boot-wordmark{font-size:clamp(54px,18vw,76px)}
        .cramchy-boot-sub{font-size:13px}.cramchy-boot-progress{margin-top:34px;width:min(280px,82%)}
      }
      @media(prefers-reduced-motion:reduce){
        #cramchyBootSplash{transition:none}.cramchy-boot-progress span{animation:none;transform:scaleX(.72);opacity:.85}
      }
    `;
    document.head.appendChild(style);

    const splash=document.createElement('div');
    splash.id='cramchyBootSplash';
    splash.setAttribute('role','status');
    splash.setAttribute('aria-live','polite');
    splash.innerHTML=`
      <div class="cramchy-boot-shell">
        <div class="cramchy-boot-wordmark">cramchy.</div>
        <div class="cramchy-boot-sub">study companion</div>
        <div class="cramchy-boot-progress" aria-hidden="true"><span></span></div>
        <div class="cramchy-boot-copy">opening your study space...</div>
      </div>`;
    document.body.appendChild(splash);

    splashSafetyTimer=setTimeout(()=>finishBootSplash(),9000);
  }

  function finishBootSplash(){
    if(splashSafetyTimer){clearTimeout(splashSafetyTimer);splashSafetyTimer=null;}
    const splash=document.getElementById('cramchyBootSplash');
    if(!splash) return;
    splash.classList.add('is-leaving');
    setTimeout(()=>{
      splash.remove();
      document.getElementById('cramchyBootSplashStyle')?.remove();
    },320);
  }

  function loadFreshStylesheet(file){
    return new Promise(resolve=>{
      const freshHref=file+'?v='+VERSION;
      if(document.querySelector(`link[href="${freshHref}"]`)) return resolve();

      const oldLinks=Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .filter(link=>(link.getAttribute('href')||'').split('?')[0]===file);
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=freshHref;
      link.onload=()=>{
        oldLinks.forEach(old=>{if(old!==link) old.remove();});
        resolve();
      };
      link.onerror=()=>{
        link.remove();
        console.warn('Fresh stylesheet failed to load:',file);
        resolve();
      };
      document.head.appendChild(link);
    });
  }

  function refreshStyles(){
    const sheets=['styles.css','styles/countdown.css','styles/motivation.css','styles/matcha-progress.css','design-v3.css','home-hero-v4.css','home-hierarchy-v5.css','home-command-v6.css','polish-v7.css','theme-gradients-v8.css','typography-polish-v17.css','home-planner-reminders-v23.css','mobile-shell-fix-v30.css','planner-mobile-hotfix-v44.css','grades-nu-polish-v1.css','grades-stable-v42.css','grades-quick-gwa-v43.css','exam-subject-stability-v49.css'];
    return Promise.all(sheets.map(loadFreshStylesheet));
  }

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.onload=resolve;
      script.onerror=()=>reject(new Error('Failed to load '+src));
      document.head.appendChild(script);
    });
  }

  async function forceFreshBaseBundle(){
    try{
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.map(key=>caches.delete(key)));
      }
    }catch(e){
      console.warn('Cramchy runtime cache cleanup skipped.',e);
    }
    try{
      const response=await fetch(LEGACY_BASE_URL,{cache:'no-store'});
      if(!response.ok) throw new Error('Base refresh returned '+response.status);
    }catch(e){
      console.warn('Cramchy base refresh fell back to normal loading.',e);
    }
  }

  installFavicon();
  installBootSplash();
  refreshStyles()
    .then(()=>forceFreshBaseBundle())
    .then(()=>loadScript('boot-resilience-v11.js?v='+VERSION))
    .then(()=>loadScript('js/countdown.js?v='+VERSION))
    .then(()=>loadScript('js/motivation.js?v='+VERSION))
    .then(()=>loadScript('js/streak.js?v='+VERSION))
    .then(()=>loadScript('js/collectibles.js?v='+VERSION))
    .then(()=>loadScript('js/brain-break.js?v='+VERSION))
    .then(()=>loadScript('js/chaowi.js?v='+VERSION))
    .then(()=>loadScript('js/pet-duo.js?v='+VERSION))
    .then(()=>loadScript('js/study-timer.js?v='+VERSION))
    .then(()=>loadScript('js/tasks.js?v='+VERSION))
    .then(()=>loadScript('app-logo-base.js?v='+VERSION))
    .then(()=>window.__cramchyBaseReady||Promise.resolve())
    .then(()=>loadScript('exam-nav-active-v14.js?v='+VERSION))
    .then(()=>loadScript('exam-subject-dedupe-v21.js?v='+VERSION))
    .then(()=>loadScript('planner-cloud-sync-v12.js?v='+VERSION))
    .then(()=>window.__cramchyPlannerCloudReady||Promise.resolve())
    .then(()=>loadScript('planner-root-compat-v4.js?v='+VERSION))
    .then(()=>loadScript('planner-v3.js?v='+VERSION))
    .then(()=>loadScript('planner-mobile-hotfix-v44.js?v='+VERSION))
    .then(()=>{ window.__cramchyPlannerCloudMarkLoaded?.(); })
    .then(()=>loadScript('home-hierarchy-v5.js?v='+VERSION))
    .then(()=>loadScript('home-command-v6.js?v='+VERSION))
    .then(()=>loadScript('polish-v7.js?v='+VERSION))
    .then(()=>loadScript('home-planner-reminders-v23.js?v='+VERSION))
    .then(()=>loadScript('mobile-modal-center-v30.js?v='+VERSION))
    .then(()=>loadScript('ui-copy-normalizer-v1.js?v='+VERSION))
    .then(()=>loadScript('grades-nu-polish-v1.js?v='+VERSION))
    .then(()=>loadScript('grades-quick-gwa-v43.js?v='+VERSION))
    .then(()=>loadScript('ask-cramchy-v53.js?v='+VERSION))
    .then(()=>loadScript('special-letter-v54.js?v='+VERSION))
    .then(()=>finishBootSplash())
    .catch(err=>{
      console.error('Cramchy startup failed.',err);
      finishBootSplash();
    });
})();
