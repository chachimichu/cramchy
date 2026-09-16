(function(root){
  'use strict';

  root.CramchyModules = root.CramchyModules || {};

  root.CramchyModules.studyTimer = {
    init({
      getState,
      saveState,
      showToast,
      getChoices,
      getHistoryContext,
      getHistoryName,
      renderMatchaProgress,
      renderDailyHome,
      reactChaowi,
      escapeHtml,
      defaultMinutes=25,
      secondsPerMinute=60,
      setIntervalFn=root.setInterval.bind(root),
      clearIntervalFn=root.clearInterval.bind(root)
    }){
      const required={getState,saveState,showToast,getChoices,getHistoryContext,getHistoryName,renderMatchaProgress,renderDailyHome,reactChaowi,escapeHtml};
      Object.entries(required).forEach(([name,value])=>{if(typeof value!=='function')throw new Error(`Study timer requires ${name}.`);});

      const subjectSelect=document.getElementById('timerSubjectSelect');
      const display=document.getElementById('timerDisplay');
      const startButton=document.getElementById('timerStartBtn');
      const pauseButton=document.getElementById('timerPauseBtn');
      const resetButton=document.getElementById('timerResetBtn');
      const presetButtons=Array.from(document.querySelectorAll('[data-mins]'));
      const historyList=document.getElementById('historyList');
      const totalFocusTime=document.getElementById('totalFocusTime');
      const timer={remaining:defaultMinutes*secondsPerMinute,running:false,intervalId:null,presetMinutes:defaultMinutes,subject:''};

      function updateDisplay(){
        if(!display)return;
        const minutes=Math.floor(timer.remaining/secondsPerMinute);
        const seconds=timer.remaining%secondsPerMinute;
        display.textContent=`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
      }

      function updateControls(mode){
        if(!startButton||!pauseButton)return;
        if(mode==='running'){
          startButton.textContent='RESUME';startButton.disabled=true;pauseButton.disabled=false;
        }else{
          startButton.textContent=mode==='paused'?'RESUME':'START';startButton.disabled=false;pauseButton.disabled=true;
        }
      }

      function pauseInterval(){
        if(timer.intervalId!==null)clearIntervalFn(timer.intervalId);
        timer.intervalId=null;timer.running=false;
      }

      function renderHistory(){
        if(!historyList)return;
        const history=Array.isArray(getState().studyHistory)?getState().studyHistory:[];
        const totalMinutes=history.reduce((sum,item)=>sum+(Number(item.minutes)||0),0);
        const hours=Math.floor(totalMinutes/60),minutes=totalMinutes%60;
        if(totalFocusTime)totalFocusTime.textContent=hours>0?`${hours}h ${minutes}m`:`${minutes}m`;
        if(!history.length){historyList.innerHTML='<div class="empty-state">No sessions logged yet.</div>';return;}
        historyList.innerHTML='';
        history.slice(0,25).forEach(item=>{
          const date=new Date(item.timestamp);
          const dateText=date.toLocaleDateString('en-US',{month:'short',day:'numeric'});
          const timeText=date.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
          const row=document.createElement('div');
          row.className='history-item';
          row.innerHTML=`<div><div class="subj">${escapeHtml(getHistoryName(item))}</div><div class="when">${dateText} • ${timeText}${item.period?` • ${escapeHtml(item.period)}`:''}</div></div><div class="mins">${Number(item.minutes)||0}m</div>`;
          historyList.appendChild(row);
        });
      }

      function logSession(){
        const appState=getState();
        if(!Array.isArray(appState.studyHistory))appState.studyHistory=[];
        const context=getHistoryContext();
        appState.studyHistory.unshift({subject:timer.subject,minutes:timer.presetMinutes,timestamp:Date.now(),academicKey:context.academicKey,period:context.period||''});
        saveState();renderHistory();renderMatchaProgress();renderDailyHome();
      }

      function complete(){
        pauseInterval();logSession();updateControls('reset');
        timer.remaining=timer.presetMinutes*secondsPerMinute;updateDisplay();
        showToast('study session complete ✧');reactChaowi('complete');
      }

      function start(){
        if(timer.running)return;
        timer.running=true;reactChaowi('start');updateControls('running');
        timer.intervalId=setIntervalFn(()=>{timer.remaining--;updateDisplay();if(timer.remaining<=0)complete();},1000);
      }

      function pause(){
        if(!timer.running)return;
        pauseInterval();reactChaowi('pause');updateControls('paused');
      }

      function reset(){
        pauseInterval();timer.remaining=timer.presetMinutes*secondsPerMinute;updateDisplay();updateControls('reset');
      }

      function selectSubject(event){timer.subject=event.target.value;}
      function choosePreset(event){
        if(timer.running)return;
        const minutes=Number(event.currentTarget.dataset.mins);
        if(!Number.isFinite(minutes)||minutes<=0)return;
        timer.presetMinutes=minutes;timer.remaining=minutes*secondsPerMinute;updateDisplay();
      }

      function render(){
        const choices=getChoices();
        const available=choices.length?choices:[{id:'general',name:'General Study'}];
        if(!available.some(item=>item.id===timer.subject))timer.subject=available[0].id;
        if(subjectSelect)subjectSelect.innerHTML=available.map(item=>`<option value="${escapeHtml(item.id)}" ${timer.subject===item.id?'selected':''}>${escapeHtml(item.name)}</option>`).join('');
        updateDisplay();renderHistory();
      }

      subjectSelect?.addEventListener('change',selectSubject);
      presetButtons.forEach(button=>button.addEventListener('click',choosePreset));
      startButton?.addEventListener('click',start);
      pauseButton?.addEventListener('click',pause);
      resetButton?.addEventListener('click',reset);

      return {render,renderHistory,reset,snapshot:()=>({...timer,intervalId:timer.intervalId}),destroy(){
        pauseInterval();subjectSelect?.removeEventListener('change',selectSubject);
        presetButtons.forEach(button=>button.removeEventListener('click',choosePreset));
        startButton?.removeEventListener('click',start);pauseButton?.removeEventListener('click',pause);resetButton?.removeEventListener('click',reset);
      }};
    }
  };
})(typeof window==='undefined'?globalThis:window);
