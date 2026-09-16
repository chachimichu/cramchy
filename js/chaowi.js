(function(root){
  'use strict';

  root.CramchyModules=root.CramchyModules||{};
  const MESSAGES=['chaowi is watching you scroll.','meow. that means go study.','chaowi sat on your notes. pick them back up.','she believes in you. barely.','purr... now go finish a topic.','chaowi says one more topic.','mrrp. open the reviewer.','chaowi did not wake up for you to procrastinate.','pspspsps... back to studying.',"chaowi says you're doing better than you think. now continue.",'she brought emotional support. unfortunately you still have to study.','chaowi inspected your reviewer. suspiciously unfinished.','meow meow. academic translation: lock in.','chaowi requests one completed topic as payment.',"she's judging your screen time.",'{name}, opening cramchy does not count as studying.','{name}, academic weapon era starts with one task.','{name}, chaowi has reviewed the situation. lock in.','{name}, that reviewer is not going to read itself.'];
  const EVENT_MESSAGES={start:['chaowi says lock in ♡','study time. she is supervising.','mrrp. focus mode.'],pause:['chaowi will allow this break.','tiny pause. then back to it ♡'],complete:['chaowi is proud of you ♡','session complete. acceptable. very acceptable.','you did it!! chaowi approves.'],topic:['chaowi witnessed that. +1 topic ♡','one less thing to panic about.','good. feed her another completed topic.']};

  root.CramchyModules.chaowi={
    init({getState,saveState,showToast,personalizeMessage,messageRandom=Math.random,setTimeoutFn=root.setTimeout.bind(root),clearTimeoutFn=root.clearTimeout.bind(root)}){
      if(typeof getState!=='function'||typeof saveState!=='function'||typeof showToast!=='function'||typeof personalizeMessage!=='function')throw new Error('Chaowi dependencies are incomplete.');
      const cat=document.getElementById('chaowiCat'),nook=document.getElementById('chaowiNook'),modeButton=document.getElementById('chaowiModeBtn'),revealButton=document.getElementById('chaowiReveal');
      if(!cat||!nook)return {render(){},react(){},destroy(){}};
      let idleTimer=null,busyTimer=null,busy=false;
      const reducedMotion=!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);
      const randomOf=list=>list[Math.floor(messageRandom()*list.length)];
      const currentMode=()=>['awake','nap','hidden'].includes(getState().chaowiMode)?getState().chaowiMode:'awake';
      function clearAnimations(){cat.classList.remove('is-jumping','is-meowing','is-scratching','is-headtilt','is-stretching','is-excited','is-tailfast','is-eartwitch','is-celebrating');}
      function scheduleIdle(){
        if(idleTimer!==null)clearTimeoutFn(idleTimer);
        if(currentMode()!=='awake')return;
        idleTimer=setTimeoutFn(runIdle,8000+(messageRandom()*12000));
      }
      function render(mode=currentMode(),persist=false){
        getState().chaowiMode=['awake','nap','hidden'].includes(mode)?mode:'awake';
        nook.classList.toggle('is-nap',getState().chaowiMode==='nap');nook.classList.toggle('is-hidden',getState().chaowiMode==='hidden');
        if(modeButton){
          if(getState().chaowiMode==='awake'){modeButton.textContent='☾';modeButton.title='Let Chaowi nap';}
          else if(getState().chaowiMode==='nap'){modeButton.textContent='×';modeButton.title='Hide Chaowi';}
          else{modeButton.textContent='♡';modeButton.title='Wake Chaowi';}
        }
        scheduleIdle();if(persist)saveState();
      }
      function animate(kind,done){
        if(busy||currentMode()!=='awake'){done?.();return;}
        busy=true;if(busyTimer!==null)clearTimeoutFn(busyTimer);clearAnimations();
        const cls={jump:'is-jumping',meow:'is-meowing',scratch:'is-scratching',headtilt:'is-headtilt',stretch:'is-stretching',excited:'is-excited',tail:'is-tailfast',ear:'is-eartwitch',celebrate:'is-celebrating'}[kind];
        if(cls)cat.classList.add(cls);if(kind==='celebrate'&&!reducedMotion)cat.classList.add('is-excited','is-tailfast');
        let duration={meow:1200,scratch:1050,jump:800,celebrate:1250}[kind]||900;
        if(reducedMotion&&['jump','scratch','stretch','excited','celebrate'].includes(kind))duration=450;
        busyTimer=setTimeoutFn(()=>{clearAnimations();busy=false;done?.();},duration);
      }
      function say(message,longer=true){showToast(personalizeMessage(message),{chaowi:true,longer});}
      function clickReaction(){
        if(currentMode()==='hidden')return;
        if(currentMode()==='nap'){render('awake',true);say('mrrp... you woke chaowi. better make it worth it ♡');animate('stretch');return;}
        say(randomOf(MESSAGES));if(busy)return;
        animate(randomOf(reducedMotion?['meow','headtilt','tail','ear']:['meow','jump','scratch','headtilt','tail','stretch','excited']));
      }
      function runIdle(){
        if(currentMode()!=='awake'||busy){scheduleIdle();return;}
        animate(randomOf(reducedMotion?['ear','tail']:['ear','tail','headtilt','stretch']),scheduleIdle);
      }
      function react(kind='click'){
        if(currentMode()==='hidden')return;
        if(currentMode()==='nap'&&(kind==='complete'||kind==='topic'))render('awake',true);
        if(EVENT_MESSAGES[kind])say(randomOf(EVENT_MESSAGES[kind]));
        if(busy||currentMode()!=='awake')return;
        if(kind==='complete')animate('celebrate');else if(kind==='topic')animate(reducedMotion?'tail':'excited');else if(kind==='start')animate(reducedMotion?'ear':'excited');else if(kind==='pause')animate('headtilt');else clickReaction();
      }
      const onKey=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();clickReaction();}};
      const onMode=event=>{event.stopPropagation();const mode=currentMode();if(mode==='awake'){render('nap',true);say('chaowi is napping. shhh ♡');}else if(mode==='nap'){render('hidden',true);showToast('chaowi hid in her little corner. tap the paw to bring her back ♡');}else render('awake',true);};
      const onReveal=event=>{event.stopPropagation();render('awake',true);say('chaowi has returned. supervision resumed.');animate('stretch');};
      cat.addEventListener('click',clickReaction);cat.addEventListener('keydown',onKey);modeButton?.addEventListener('click',onMode);revealButton?.addEventListener('click',onReveal);render();
      return {render,react,destroy(){
        if(idleTimer!==null)clearTimeoutFn(idleTimer);if(busyTimer!==null)clearTimeoutFn(busyTimer);clearAnimations();
        cat.removeEventListener('click',clickReaction);cat.removeEventListener('keydown',onKey);modeButton?.removeEventListener('click',onMode);revealButton?.removeEventListener('click',onReveal);
      }};
    }
  };
})(typeof window==='undefined'?globalThis:window);
