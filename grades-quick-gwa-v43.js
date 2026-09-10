(function(){
  const FIRST=3.50;
  const SECOND=3.25;
  const palette=['#e85d75','#ffb6c9','#8fa86c','#f3c86a','#9b82c7','#7198c9','#f3a6b8','#f7d6a4'];

  function getGwa(){
    const text=document.querySelector('#quickGwaRoot .quick-gwa-result.show .number')?.textContent?.trim();
    const gwa=Number(text);
    return Number.isFinite(gwa)?gwa:null;
  }

  function honorMessage(gwa){
    if(gwa===null) return '';
    if(gwa>=FIRST) return "Congratulations! You're on the Dean's List (First Honors)! 🎉";
    if(gwa>=SECOND) return "Congratulations! You're on the Dean's List (Second Honors)! 🎉";
    return '';
  }

  function patchLabels(){
    const tab=document.querySelector('#view-grades .grades-main-tabs [data-grades-mode="quickgwa"]');
    if(tab){
      const title=tab.querySelector('span');
      const small=tab.querySelector('small');
      if(title) title.textContent='quick GWA calculator';
      if(small) small.textContent='final grades only';
    }
    const heading=document.querySelector('#quickGwaRoot .quick-gwa-wrap > .card h3');
    if(heading) heading.textContent='quick GWA calculator';
  }

  function patchResult(){
    patchLabels();
    const result=document.querySelector('#quickGwaRoot .quick-gwa-result.show');
    if(!result) return;
    result.querySelector('.quick-gwa-honor')?.remove();
    const gwa=getGwa();
    const sub=result.querySelector('.quick-gwa-sub');
    const message=honorMessage(gwa);
    if(sub&&message){
      sub.textContent=message;
      sub.classList.add('quick-gwa-congrats');
    }else if(sub){
      sub.classList.remove('quick-gwa-congrats');
    }
  }

  function extraConfetti(){
    const gwa=getGwa();
    if(gwa===null||gwa<SECOND) return;
    const layer=document.getElementById('quickConfettiLayer');
    if(!layer||layer.dataset.extraBurst==='yes') return;
    layer.dataset.extraBurst='yes';

    const count=76;
    for(let i=0;i<count;i++){
      const piece=document.createElement('span');
      piece.className='quick-confetti-extra';
      const shape=i%7===0?'dot':i%5===0?'streamer':'paper';
      piece.dataset.shape=shape;
      piece.style.setProperty('--left',`${Math.random()*100}%`);
      piece.style.setProperty('--drift',`${(Math.random()*150-75).toFixed(0)}px`);
      piece.style.setProperty('--spin',`${(Math.random()*900-450).toFixed(0)}deg`);
      piece.style.setProperty('--dur',`${(1.55+Math.random()*1.35).toFixed(2)}s`);
      piece.style.setProperty('--delay',`${(Math.random()*.38).toFixed(2)}s`);
      piece.style.setProperty('--size',`${(5+Math.random()*7).toFixed(1)}px`);
      piece.style.background=palette[i%palette.length];
      layer.appendChild(piece);
    }
    setTimeout(()=>{
      layer.querySelectorAll('.quick-confetti-extra').forEach(el=>el.remove());
      delete layer.dataset.extraBurst;
    },3600);
  }

  function afterQuickRender(withParty=false){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      patchResult();
      if(withParty) setTimeout(extraConfetti,80);
    }));
  }

  function install(){
    patchLabels();
    document.addEventListener('click',event=>{
      if(event.target.closest('#quickGwaCalculateBtn')){
        setTimeout(()=>afterQuickRender(true),70);
        return;
      }
      if(event.target.closest('#view-grades [data-grades-mode="quickgwa"],[data-tab="grades"],[data-open-tab="grades"]')){
        setTimeout(()=>afterQuickRender(false),260);
      }
    },true);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
