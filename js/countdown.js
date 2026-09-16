(function(root){
  'use strict';

  root.CramchyModules = root.CramchyModules || {};

  root.CramchyModules.countdown = {
    init({getState, saveState, showToast, now=()=>Date.now(), setIntervalFn=root.setInterval.bind(root), clearIntervalFn=root.clearInterval.bind(root)}){
      if(typeof getState!=='function' || typeof saveState!=='function' || typeof showToast!=='function'){
        throw new Error('Countdown requires state, saveState, and showToast dependencies.');
      }

      const dateInput=document.getElementById('customCountdownDate');
      const timeInput=document.getElementById('customCountdownTime');
      const setButton=document.getElementById('setCountdownBtn');
      const clearButton=document.getElementById('clearCountdownBtn');
      let timerId=null;

      function formatPrecise(diff){
        const days=Math.floor(diff/86400000);
        const hours=Math.floor((diff%86400000)/3600000);
        const mins=Math.floor((diff%3600000)/60000);
        const secs=Math.floor((diff%60000)/1000);
        const hh=String(hours).padStart(2,'0');
        const mm=String(mins).padStart(2,'0');
        const ss=String(secs).padStart(2,'0');
        return days>0?`${days}d ${hh}:${mm}:${ss}`:`${hh}:${mm}:${ss}`;
      }

      function updateDisplay(){
        const targetEl=document.getElementById('customCountdownTarget');
        const display=document.getElementById('customCountdownDisplay');
        if(!display || !targetEl)return;
        const countdown=getState().customCountdown;
        if(!countdown){
          targetEl.textContent='';
          display.textContent='Pick a date and time, then tap Set.';
          return;
        }
        const target=new Date(`${countdown.date}T${countdown.time}:00`);
        if(Number.isNaN(target.getTime())){
          targetEl.textContent='';
          display.textContent='Pick a valid date and time.';
          return;
        }
        const timeLabel=target.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
        const dateLabel=target.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        targetEl.textContent=`Counting down to ${dateLabel}, ${timeLabel}`;
        const diff=target.getTime()-now();
        display.textContent=diff<=0?"time's up ♡":formatPrecise(diff);
      }

      function render(){
        if(!dateInput || !timeInput)return;
        const countdown=getState().customCountdown;
        if(countdown){
          dateInput.value=countdown.date;
          timeInput.value=countdown.time;
        }else if(!dateInput.value){
          dateInput.value=new Date(now()).toLocaleDateString('en-CA');
        }
        updateDisplay();
      }

      function setCountdown(){
        const dateVal=dateInput?.value;
        const timeVal=timeInput?.value;
        if(!dateVal || !timeVal){
          showToast('pick both a date and a time first ♡');
          return;
        }
        getState().customCountdown={date:dateVal,time:timeVal};
        saveState();
        updateDisplay();
        showToast('countdown set ♡');
      }

      function clearCountdown(){
        getState().customCountdown=null;
        saveState();
        if(timeInput)timeInput.value='';
        updateDisplay();
      }

      setButton?.addEventListener('click',setCountdown);
      clearButton?.addEventListener('click',clearCountdown);
      timerId=setIntervalFn(updateDisplay,1000);

      return {
        render,
        updateDisplay,
        destroy(){
          setButton?.removeEventListener('click',setCountdown);
          clearButton?.removeEventListener('click',clearCountdown);
          if(timerId!==null)clearIntervalFn(timerId);
          timerId=null;
        }
      };
    }
  };
})(typeof window==='undefined'?globalThis:window);
