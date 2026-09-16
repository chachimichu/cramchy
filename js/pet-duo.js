(function(root){
  'use strict';

  root.CramchyModules=root.CramchyModules||{};
  const HANABI_MESSAGES=['hanabi brought the book. your turn ♡','hanabi says one more page.','tail wag = she approves. keep studying.','hanabi is waiting for you to finish that topic.','study buddy reporting for duty.','hanabi says you can do one more.'];
  const KENKEN_MESSAGES=['kenken popped up to check on you ♡','kenken says keep going.','tiny peek of encouragement.','one more topic and kenken approves.','kenken is watching your progress.','hi. now back to studying ♡'];

  root.CramchyModules.petDuo={
    init({getState,saveState,showToast,random=Math.random,setTimeoutFn=root.setTimeout.bind(root),clearTimeoutFn=root.clearTimeout.bind(root)}){
      if(typeof getState!=='function'||typeof saveState!=='function'||typeof showToast!=='function')throw new Error('Pet duo dependencies are incomplete.');
      const nook=document.getElementById('petNook'),duo=document.getElementById('petDuo'),bubble=document.getElementById('petReactionBubble');
      const hanabi=document.getElementById('hanabiDog'),kenken=document.getElementById('kenkenDog'),nap=document.getElementById('petNapBtn'),hide=document.getElementById('petHideBtn'),reveal=document.getElementById('petRevealBtn');
      let reactionTimer=null;
      if(!nook||!duo)return {render(){},destroy(){}};

      function render(){
        const state=getState();
        nook.classList.toggle('is-hidden',!!state.petDuoHidden);nook.classList.toggle('is-nap',!!state.petDuoNap);
        if(nap){nap.textContent=state.petDuoNap?'☀':'☾';nap.title=state.petDuoNap?'Wake Hanabi and Kenken':'Let Hanabi and Kenken nap';}
      }
      function setState(key,value){getState()[key]=value;saveState();render();}
      function showBubble(text,anchor){
        if(!bubble)return;
        bubble.textContent=text;
        const rootRect=nook.getBoundingClientRect(),anchorRect=(anchor||nook).getBoundingClientRect();
        const width=bubble.offsetWidth||90,height=bubble.offsetHeight||28;
        bubble.style.left=`${Math.max(0,Math.min((anchorRect.left-rootRect.left)+(anchorRect.width/2)-(width/2),Math.max(0,rootRect.width-width)))}px`;
        bubble.style.top=`${Math.max(-14,(anchorRect.top-rootRect.top)-height-6)}px`;bubble.style.right='auto';
        bubble.classList.remove('show');void bubble.offsetWidth;bubble.classList.add('show');
      }
      function react(which){
        const state=getState(),anchor=which==='hanabi'?hanabi:kenken;
        if(state.petDuoNap){state.petDuoNap=false;saveState();render();showBubble('awake! ♡',anchor);}
        const messages=which==='hanabi'?HANABI_MESSAGES:KENKEN_MESSAGES;
        duo.classList.remove('react-hanabi','react-kenken');void duo.offsetWidth;duo.classList.add(which==='hanabi'?'react-hanabi':'react-kenken');
        if(reactionTimer!==null)clearTimeoutFn(reactionTimer);
        reactionTimer=setTimeoutFn(()=>duo.classList.remove('react-hanabi','react-kenken'),1000);
        showBubble(which==='hanabi'?'woof woof':'i want chicken',anchor);showToast(messages[Math.floor(random()*messages.length)],{longer:true});
      }
      const clickHanabi=event=>{event.stopPropagation();react('hanabi');},clickKenken=event=>{event.stopPropagation();react('kenken');};
      const keyHanabi=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();react('hanabi');}};
      const keyKenken=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();react('kenken');}};
      const toggleNap=event=>{event.stopPropagation();setState('petDuoNap',!getState().petDuoNap);};
      const hidePets=event=>{event.stopPropagation();setState('petDuoHidden',true);};
      const showPets=event=>{event.stopPropagation();setState('petDuoHidden',false);};
      hanabi?.addEventListener('click',clickHanabi);hanabi?.addEventListener('keydown',keyHanabi);kenken?.addEventListener('click',clickKenken);kenken?.addEventListener('keydown',keyKenken);
      nap?.addEventListener('click',toggleNap);hide?.addEventListener('click',hidePets);reveal?.addEventListener('click',showPets);render();
      return {render,react,destroy(){
        if(reactionTimer!==null)clearTimeoutFn(reactionTimer);
        hanabi?.removeEventListener('click',clickHanabi);hanabi?.removeEventListener('keydown',keyHanabi);kenken?.removeEventListener('click',clickKenken);kenken?.removeEventListener('keydown',keyKenken);
        nap?.removeEventListener('click',toggleNap);hide?.removeEventListener('click',hidePets);reveal?.removeEventListener('click',showPets);
      }};
    }
  };
})(typeof window==='undefined'?globalThis:window);
