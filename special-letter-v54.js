(function(){
  'use strict';

  const APP_KEY='strawberryMatchaMidtermsState_v1';
  const SEEN_KEY='cramchySpecialLetterSeen_v3';
  const previewParams=new URLSearchParams(window.location.search);
  const previewWelcome=previewParams.has('preview-welcome')||previewParams.get('preview-letter')==='1';
  let previousFocus=null;
  let activeStep=0;

  const steps=[
    {
      kind:'letter',eyebrow:'a little note from chachi',title:'i’m so glad you’re here',icon:'✉',
      body:`<p class="welcome-hello">Hello, my dear user!</p>
        <p>I’m Charlene Mikaela Caco, a Psychology student from NU Clark and the person behind Cramchy.</p>
        <p>I made this little study space to make busy school days feel more manageable. Your plans, progress, and small wins all deserve a place to land.</p>
        <p>Let’s get you settled in. I’ll show you around, one small step at a time.</p>
        <p class="welcome-signoff">With love,<br><strong>Chachi</strong></p>`
    },
    {
      eyebrow:'01 · choose how to open it',title:'your study space can go anywhere',icon:'⌂',
      body:`<div class="welcome-choice"><span class="welcome-choice-icon">↗</span><div><strong>On iPhone</strong><p>Open Cramchy in Safari. Tap <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>. Open your new Cramchy icon whenever you want to study.</p></div></div>
        <div class="welcome-choice"><span class="welcome-choice-icon">↗</span><div><strong>On the web</strong><p>Open Cramchy in your browser and keep using it there. You can sign in whenever you’re ready.</p></div></div>
        <p class="welcome-note">Either way, it’s the same Cramchy. Your screen may look a little different on each device.</p>`
    },
    {
      eyebrow:'02 · keep your progress',title:'sign in when you want to sync',icon:'☁',
      body:`<p>Tap <b>☁ sign in</b>, enter your email, then type the 8-digit code sent to your inbox. Your signed-in account can sync your progress across devices.</p>
        <div class="welcome-callout"><span class="welcome-callout-number">1</span><span>Enter your email and tap <b>send code</b>.</span></div>
        <div class="welcome-callout"><span class="welcome-callout-number">2</span><span>Check your inbox for the 8-digit code.</span></div>
        <div class="welcome-callout"><span class="welcome-callout-number">3</span><span>Enter the code and tap <b>sign in</b>.</span></div>
        <p class="welcome-note">You can also keep using Cramchy as a guest on this device. Guest work stays local until you choose to sign in.</p>`
    },
    {
      eyebrow:'03 · start with your classes',title:'add courses once, use them everywhere',icon:'▤',
      body:`<p>In <b>Courses</b>, add each subject with its professor, class days and times, room, and grading weights. Your repeating weekly schedule becomes easy to scan in the schedule viewer.</p>
        <div class="welcome-mini-card"><span>MON</span><b>your class</b><small>time · room · course color</small></div>
        <p>Those courses are also ready to choose in your gradebook and exam season.</p>`
    },
    {
      eyebrow:'04 · plan the week',title:'planner events show up in tasks',icon:'▦',
      body:`<p>Add a quiz, study block, assignment, or reminder in the <b>Planner</b>. Choose its date and type so it’s easy to spot on your calendar.</p>
        <div class="welcome-sync"><span class="welcome-pill quiz">quiz</span><span class="welcome-sync-arrow">→</span><span class="welcome-pill todo">to do in Tasks</span></div>
        <p>Planner items automatically appear in <b>Tasks</b>. Check them off in Tasks when they’re done; the Planner stays a calendar view of what’s happening.</p>`
    },
    {
      eyebrow:'05 · see how you’re doing',title:'your grades, with the context',icon:'↗',
      body:`<p>Open <b>Grades → Course Gradebook</b> and choose a course. It’s built with National University (NU) students in mind: add scores in the categories your class uses and set weights to match your syllabus. The weights are flexible for other schools, too.</p>
        <div class="welcome-grade"><span>current standing</span><b>weighted by your course setup</b><i>scores · category weights · equivalent grade</i></div>
        <p>The dashboard brings your scores, category percentages, and equivalent grade together. <b>Term GWA</b> gives you a separate term-wide view.</p>`
    },
    {
      eyebrow:'06 · midterms & finals',title:'two exam seasons, kept separate',icon:'✎',
      body:`<p>Choose <b>Midterms</b> or <b>Finals</b> in Exam Mode. Cramchy keeps NU’s two exam seasons separate, each with its own schedule, subjects, topics, notes, and study progress for the selected term.</p>
        <div class="welcome-season-row"><span>midterms</span><span>finals</span></div>
        <p>Use the exam workspace to keep the details for that season together while your course list stays in Courses.</p>`
    },
    {
      eyebrow:'07 · make it yours',title:'find a rhythm that feels good',icon:'◷',
      body:`<p>Open the <b>Study</b> tab for a focused timer session. Choose a study space theme in <b>More → Appearance</b> whenever you want a change of scenery.</p>
        <div class="welcome-finish-card"><span class="welcome-finish-sparkle">✦</span><b>small steps count, too.</b><small>you can change your plans as you go.</small></div>
        <p>You’re all set. Start wherever you are; Cramchy can grow with your routine.</p>`
    }
  ];

  function readProfile(){
    try{const state=JSON.parse(localStorage.getItem(APP_KEY)||'{}');return state&&state.profile&&typeof state.profile==='object'?state.profile:{}}
    catch(e){return {}}
  }
  function shouldShow(){
    let seen=false;try{seen=localStorage.getItem(SEEN_KEY)==='1'}catch(e){}
    return !seen&&Boolean(String(readProfile().name||'').trim());
  }
  function installStyles(){
    if(document.getElementById('cramchyWelcomeStyles'))return;
    const style=document.createElement('style');style.id='cramchyWelcomeStyles';
    style.textContent=`
      .cramchy-letter-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;width:100%;height:100%;height:100dvh;box-sizing:border-box;overflow:hidden;padding:24px;background:rgba(56,31,42,.46);backdrop-filter:blur(9px);animation:welcomeFade .28s ease both}
      body.cramchy-letter-open{overflow:hidden!important}
      .cramchy-letter-card{position:relative;width:min(590px,100%);max-height:min(790px,calc(100dvh - 48px));display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.95);border-radius:32px;background:radial-gradient(circle at 8% 3%,rgba(255,255,255,.99),transparent 28%),radial-gradient(circle at 100% 90%,rgba(247,199,214,.5),transparent 32%),linear-gradient(145deg,#fffdfb,#fff5f7 58%,#ffedf1);color:#563843;box-shadow:0 30px 90px rgba(46,20,32,.3),0 8px 28px rgba(91,43,63,.12);animation:welcomeArrive .48s cubic-bezier(.2,.8,.2,1) both}
      .welcome-topline{height:5px;flex:0 0 5px;background:linear-gradient(90deg,#ef91a9,#d45a7c,#f4c0cd);transform-origin:left;animation:welcomeLine .8s ease both}
      .cramchy-letter-close{position:absolute;z-index:2;top:16px;right:16px;width:42px;height:42px;display:grid;place-items:center;border:1px solid #f2d9e0;border-radius:50%;background:rgba(255,255,255,.82);color:#845263;font:500 24px/1 system-ui,sans-serif;cursor:pointer;transition:transform .18s ease,background .18s ease,box-shadow .18s ease}
      .cramchy-letter-close:hover{background:#ffe7ee;transform:rotate(7deg) scale(1.06);box-shadow:0 5px 14px #d97d9830}
      .cramchy-letter-close:focus-visible,.welcome-arrow:focus-visible,.welcome-text-button:focus-visible,.welcome-back:focus-visible{outline:3px solid #d76483;outline-offset:3px}
      .welcome-content{min-height:0;display:flex;flex-direction:column;overflow:auto;overscroll-behavior:contain;padding:27px clamp(23px,6vw,52px) 0;scrollbar-width:thin;scrollbar-color:#e9a9bc transparent}
      .welcome-illustration{position:relative;align-self:center;width:90px;height:78px;display:grid;place-items:center;margin:0 auto 12px;color:#be5a78}
      .welcome-illustration::before{content:'';position:absolute;width:68px;height:68px;border-radius:26px;background:linear-gradient(145deg,#ffe9ef,#f8d4df);box-shadow:inset 0 1px 0 #fff,0 9px 22px #b85b761a;transform:rotate(-7deg);animation:welcomeBadge 4.8s ease-in-out infinite}
      .welcome-illustration span{position:relative;z-index:1;font:500 38px/1 Georgia,serif;animation:welcomeFloat 3.6s ease-in-out infinite}
      .welcome-illustration::after{content:'✦';position:absolute;right:1px;top:4px;color:#e3a44d;font-size:17px;animation:welcomeTwinkle 2.8s ease-in-out infinite}
      .welcome-eyebrow{margin:0 0 8px;text-align:center;color:#ba607c;font:800 11px/1.4 'Nunito',system-ui,sans-serif;letter-spacing:.13em;text-transform:uppercase}
      .cramchy-letter-kicker{margin:0 auto 20px;max-width:450px;text-align:center;color:#643b4a;font:800 clamp(25px,5.3vw,34px)/1.13 'Nunito',system-ui,sans-serif;letter-spacing:.005em}
      .cramchy-letter-body{font:500 15px/1.66 'Nunito',system-ui,sans-serif;color:#684b55}
      .cramchy-letter-body p{margin:0 0 14px}.cramchy-letter-body b{color:#704254;font-weight:850}
      .welcome-hello{color:#994c67;font-weight:900}.welcome-signoff{margin-top:18px!important;color:#9b5b70;font-family:'Playfair Display',Georgia,serif;font-style:italic}.welcome-signoff strong{font-size:20px}
      .welcome-note{margin-top:16px!important;padding:12px 14px;border-left:3px solid #e9a0b4;border-radius:0 12px 12px 0;background:#fff2f5;color:#825b69;font-size:13px;line-height:1.5}
      .welcome-choice{display:grid;grid-template-columns:44px minmax(0,1fr);gap:13px;align-items:start;margin:0 0 12px;padding:14px;border:1px solid #f2dbe2;border-radius:17px;background:rgba(255,255,255,.78)}
      .welcome-choice-icon{width:40px;height:40px;display:grid;place-items:center;border-radius:13px;background:#ffebf0;color:#b85675;font-size:21px;font-weight:800}
      .welcome-choice strong{display:block;margin:1px 0 4px;color:#643b4a;font-size:15px}.welcome-choice p{margin:0!important;font-size:13.5px;line-height:1.55}
      .welcome-callout{display:flex;gap:12px;align-items:center;margin:8px 0;color:#684b55;font-size:14px}
      .welcome-callout-number{width:26px;height:26px;flex:0 0 26px;display:grid;place-items:center;border-radius:50%;background:#f9dce4;color:#a44e6a;font-size:12px;font-weight:900}
      .welcome-mini-card{display:grid;grid-template-columns:48px 1fr;gap:2px 10px;align-items:center;margin:18px 0;padding:14px 16px;border:1px solid #efd7df;border-radius:17px;background:#fffdfd;box-shadow:0 8px 24px #8443550c}
      .welcome-mini-card span{grid-row:span 2;color:#b35370;font-size:11px;font-weight:900;letter-spacing:.1em}.welcome-mini-card b{font-size:14px;color:#684351}.welcome-mini-card small{font-size:12px;color:#987985}
      .welcome-sync{display:flex;justify-content:center;align-items:center;gap:12px;margin:19px 0;padding:14px 10px;border-radius:17px;background:#fffafa}
      .welcome-pill{padding:8px 12px;border-radius:999px;font-size:12px;font-weight:900}.welcome-pill.quiz{background:#fff0d9;color:#9a6419}.welcome-pill.todo{background:#f5e4eb;color:#904b65}.welcome-sync-arrow{color:#bb6d83;font-size:20px}
      .welcome-grade{display:grid;gap:5px;margin:17px 0;padding:16px;border:1px solid #f0d9e0;border-radius:18px;background:linear-gradient(130deg,#fff,#fff2f5)}.welcome-grade span{color:#a45c72;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.welcome-grade b{font-size:17px;color:#62404c}.welcome-grade i{font-size:12px;color:#987985;font-style:normal}
      .welcome-season-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:17px 0}.welcome-season-row span{padding:14px 8px;border:1px solid #f0d7e0;border-radius:15px;background:#fff;text-align:center;color:#914e65;font-size:14px;font-weight:900}.welcome-season-row span:first-child{background:#fff3f0;color:#9e5c4d}
      .welcome-finish-card{position:relative;display:grid;gap:5px;justify-items:center;margin:18px 0;padding:20px 15px;border:1px solid #f2d8e1;border-radius:19px;background:linear-gradient(130deg,#fff,#fff1f5);text-align:center}.welcome-finish-card b{color:#81465c;font-family:'Playfair Display',Georgia,serif;font-size:20px}.welcome-finish-card small{color:#987985;font-size:12px}.welcome-finish-sparkle{position:absolute;top:10px;right:18px;color:#d8a254;animation:welcomeTwinkle 2.6s ease-in-out infinite}
      .welcome-footer{flex:0 0 auto;padding:15px clamp(22px,6vw,52px) 22px;background:linear-gradient(180deg,rgba(255,248,249,.82),#fff5f7)}
      .welcome-progress{display:flex;align-items:center;gap:11px;margin-bottom:14px}.welcome-progress-track{height:5px;flex:1;overflow:hidden;border-radius:9px;background:#f1dce2}.welcome-progress-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#e88da7,#c85677);transition:width .35s cubic-bezier(.2,.8,.2,1)}.welcome-progress-label{min-width:58px;color:#98727e;text-align:right;font-size:11px;font-weight:800}
      .welcome-controls{display:flex;align-items:center;gap:11px}.welcome-back{width:47px;height:47px;flex:0 0 47px;display:grid;place-items:center;border:1px solid #eed7df;border-radius:50%;background:#fff;color:#92586b;font-size:22px;cursor:pointer;transition:transform .18s ease,background .18s ease}.welcome-back:hover:not(:disabled){transform:translateX(-2px);background:#fff0f4}.welcome-back:disabled{opacity:.38;cursor:default}
      .welcome-text-button{min-height:44px;margin-right:auto;padding:0 7px;border:0;background:transparent;color:#936d79;font:800 12px 'Nunito',system-ui,sans-serif;cursor:pointer}.welcome-arrow{width:100%;min-height:48px;display:flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:16px;background:linear-gradient(100deg,#f08ba4,#dc5e7f);box-shadow:0 9px 20px #cf5b7b38;color:white;font:900 14px 'Nunito',system-ui,sans-serif;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease}.welcome-arrow:hover{transform:translateY(-2px);box-shadow:0 12px 25px #cf5b7b48;filter:saturate(1.07)}.welcome-arrow:active{transform:scale(.98)}.welcome-arrow span{font-size:20px;line-height:1}
      .welcome-slide-enter{animation:welcomeSlideIn .3s cubic-bezier(.2,.8,.2,1) both}
      @keyframes welcomeFade{from{opacity:0}to{opacity:1}}@keyframes welcomeArrive{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:none}}@keyframes welcomeSlideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}@keyframes welcomeLine{from{transform:scaleX(.15)}to{transform:scaleX(1)}}@keyframes welcomeBadge{0%,100%{transform:rotate(-7deg) scale(1)}50%{transform:rotate(0) scale(1.04)}}@keyframes welcomeFloat{0%,100%{transform:translateY(1px)}50%{transform:translateY(-4px)}}@keyframes welcomeTwinkle{0%,100%{opacity:.48;transform:scale(.85) rotate(-10deg)}50%{opacity:1;transform:scale(1.12) rotate(12deg)}}
      @media(max-width:540px){.cramchy-letter-overlay{padding:max(10px,env(safe-area-inset-top,0px)) 11px max(10px,env(safe-area-inset-bottom,0px))}.cramchy-letter-card{max-height:calc(100dvh - 20px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));border-radius:25px}.welcome-content{padding:23px 22px 0}.welcome-illustration{width:76px;height:66px;margin-bottom:9px}.welcome-illustration::before{width:60px;height:60px;border-radius:23px}.welcome-illustration span{font-size:33px}.cramchy-letter-kicker{margin-bottom:15px;font-size:27px}.cramchy-letter-body{font-size:14px;line-height:1.58}.cramchy-letter-body p{margin-bottom:11px}.welcome-footer{padding:11px 21px max(15px,env(safe-area-inset-bottom,0px))}.welcome-progress{margin-bottom:10px}.welcome-choice{padding:11px;gap:10px}.welcome-choice p{font-size:12.5px}}
      @media(prefers-reduced-motion:reduce){.cramchy-letter-overlay,.cramchy-letter-card,.welcome-topline,.welcome-illustration::before,.welcome-illustration span,.welcome-illustration::after,.welcome-finish-sparkle,.welcome-slide-enter{animation:none!important}.welcome-progress-fill,.welcome-arrow,.welcome-back,.cramchy-letter-close{transition:none!important}}
    `;document.head.appendChild(style);
  }
  function finish(){
    const overlay=document.getElementById('cramchySpecialLetter');if(!overlay)return;
    overlay._welcomeProgressObserver?.disconnect();
    try{localStorage.setItem(SEEN_KEY,'1')}catch(e){}
    overlay.remove();document.body.classList.remove('cramchy-letter-open');
    if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();
  }
  function renderStep(direction=1){
    const overlay=document.getElementById('cramchySpecialLetter');if(!overlay)return;
    const step=steps[activeStep],count=steps.length;
    const content=overlay.querySelector('.welcome-content');
    content.classList.remove('welcome-slide-enter');
    content.innerHTML=`<div class="welcome-illustration" aria-hidden="true"><span>${step.icon}</span></div><p class="welcome-eyebrow">${step.eyebrow}</p><h2 class="cramchy-letter-kicker" id="cramchyLetterTitle" aria-live="polite">${step.title}</h2><div class="cramchy-letter-body">${step.body}</div>`;
    void content.offsetWidth;content.classList.add('welcome-slide-enter');content.scrollTop=0;
    overlay.querySelector('.welcome-progress-fill').style.width=`${((activeStep+1)/count)*100}%`;
    overlay.querySelector('.welcome-progress-label').textContent=`${activeStep+1} of ${count}`;
    const back=overlay.querySelector('.welcome-back');back.disabled=activeStep===0;back.setAttribute('aria-label',activeStep===0?'No previous step':'Previous step');
    overlay.querySelector('.welcome-text-button').textContent=activeStep===count-1?'':'skip guide';
    const next=overlay.querySelector('.welcome-arrow');
    next.innerHTML=activeStep===count-1?'let’s get started <span aria-hidden="true">✓</span>':'next <span aria-hidden="true">→</span>';
    next.setAttribute('aria-label',activeStep===count-1?'Finish welcome guide':'Next guide step');
    next.focus({preventScroll:true});
  }
  function move(direction){
    if(direction>0&&activeStep===steps.length-1){finish();return}
    activeStep=Math.max(0,Math.min(steps.length-1,activeStep+direction));renderStep(direction);
  }
  function show(force=false){
    if((!force&&!shouldShow())||document.getElementById('cramchySpecialLetter'))return false;
    installStyles();previousFocus=document.activeElement;activeStep=0;
    const overlay=document.createElement('div');overlay.id='cramchySpecialLetter';overlay.className='cramchy-letter-overlay';overlay.setAttribute('role','presentation');
    overlay.innerHTML=`<article class="cramchy-letter-card" role="dialog" aria-modal="true" aria-labelledby="cramchyLetterTitle"><div class="welcome-topline" aria-hidden="true"></div><button class="cramchy-letter-close" type="button" aria-label="Close welcome guide">×</button><div class="welcome-content" tabindex="-1"></div><footer class="welcome-footer"><div class="welcome-progress"><div class="welcome-progress-track" role="progressbar" aria-label="Welcome guide progress" aria-valuemin="1" aria-valuemax="${steps.length}"><div class="welcome-progress-fill"></div></div><span class="welcome-progress-label"></span></div><div class="welcome-controls"><button class="welcome-back" type="button" aria-label="Previous step">←</button><button class="welcome-text-button" type="button">skip guide</button><button class="welcome-arrow" type="button"></button></div></footer></article>`;
    document.body.appendChild(overlay);document.body.classList.add('cramchy-letter-open');
    overlay.querySelector('.cramchy-letter-close').addEventListener('click',finish);
    overlay.querySelector('.welcome-back').addEventListener('click',()=>move(-1));
    overlay.querySelector('.welcome-arrow').addEventListener('click',()=>move(1));
    overlay.querySelector('.welcome-text-button').addEventListener('click',finish);
    overlay.querySelector('.welcome-progress-track').setAttribute('aria-valuenow','1');
    const observer=new MutationObserver(()=>{const label=overlay.querySelector('.welcome-progress-label');const value=Number(label?.textContent.split(' ')[0]||1);overlay.querySelector('.welcome-progress-track')?.setAttribute('aria-valuenow',String(value))});overlay._welcomeProgressObserver=observer;observer.observe(overlay,{subtree:true,childList:true,characterData:true});
    renderStep();overlay.querySelector('.cramchy-letter-close').focus();return true;
  }
  function maybeShow(){
    if((!previewWelcome&&!shouldShow())||document.getElementById('cramchyOnboard'))return false;
    const splash=document.getElementById('cramchyBootSplash');if(splash&&!splash.classList.contains('is-leaving')){setTimeout(maybeShow,450);return false}
    return show(previewWelcome);
  }
  function install(){
    if(window.__cramchySpecialLetterInstalled)return;window.__cramchySpecialLetterInstalled=true;
    const originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){originalSetItem.call(this,key,value);if(this===window.localStorage&&key===APP_KEY)setTimeout(maybeShow,420)};
    document.addEventListener('click',event=>{if(event.target?.closest?.('#startCramchyBtn'))setTimeout(maybeShow,560)},true);
    document.addEventListener('keydown',event=>{if(!document.getElementById('cramchySpecialLetter'))return;if(event.key==='Escape'){finish();return}if(event.key==='ArrowRight')move(1);if(event.key==='ArrowLeft')move(-1)});
    const onboardingObserver=new MutationObserver(records=>{if(records.some(record=>Array.from(record.removedNodes||[]).some(node=>node&&node.id==='cramchyOnboard')))setTimeout(maybeShow,180)});onboardingObserver.observe(document.body,{childList:true});
    setTimeout(maybeShow,900);
  }
  window.__cramchySpecialLetter={shouldShow,show,dismiss:finish,maybeShow};
  if(typeof document!=='undefined'&&document.body)install();
})();
