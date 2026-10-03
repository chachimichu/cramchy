(function(){
  const selector='.modal-scrim,#plannerModal.open';
  const controls='button,input,select,textarea,a[href],[tabindex]';
  let active=null,returnFocus=null,serial=0;
  function visible(el){return !el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';}
  function focusable(){return active?Array.from(active.querySelectorAll(controls)).filter(el=>!el.disabled&&el.tabIndex>=0&&visible(el)&&el.getClientRects().length):[];}
  function focusFirst(){
    const items=focusable(),phone=window.matchMedia?.('(max-width:640px)').matches;
    (phone?(items.find(el=>el.matches('button'))||items[0]||active):(items.find(el=>el.matches('input,select,textarea'))||items[0]||active))?.focus({preventScroll:true});
  }
  function prepare(overlay){
    const card=overlay.querySelector('.course-modal,.planner-modal')||overlay;
    card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
    if(!card.hasAttribute('aria-labelledby')&&!card.hasAttribute('aria-label')){
      const heading=card.querySelector('h1,h2,h3');
      if(heading){if(!heading.id)heading.id='cramchy-dialog-title-'+(++serial);card.setAttribute('aria-labelledby',heading.id);}
      else card.setAttribute('aria-label','Cramchy form');
    }
    if(!overlay.hasAttribute('tabindex'))overlay.tabIndex=-1;
    card.querySelectorAll('label').forEach(label=>{
      if(label.htmlFor||label.querySelector('input,select,textarea'))return;
      const field=label.nextElementSibling;
      if(field?.matches('input,select,textarea')){if(!field.id)field.id='cramchy-field-'+(++serial);label.htmlFor=field.id;}
    });
  }
  function sync(){
    const overlays=Array.from(document.querySelectorAll(selector)).filter(visible);
    const next=overlays.at(-1)||null;
    if(next===active)return;
    const previous=active;
    if(!previous&&next)returnFocus=document.activeElement;
    active=next;
    if(document.body.classList.contains('cramchy-dialog-open')!==Boolean(active))document.body.classList.toggle('cramchy-dialog-open',Boolean(active));
    if(active){prepare(active);if(!active.contains(document.activeElement))focusFirst();}
    else if(previous){
      const target=returnFocus?.isConnected&&visible(returnFocus)?returnFocus:document.querySelector('#view-planner [data-planner-add],.topnav .navbtn.active');
      target?.focus({preventScroll:true});returnFocus=null;
    }
  }
  document.addEventListener('keydown',event=>{
    sync();if(!active)return;
    if(event.key==='Escape'){
      const close=active.querySelector('[data-planner-close],button[id^="cancel"],button[id^="Cancel"]');
      if(close){event.preventDefault();close.click();sync();}
      return;
    }
    if(event.key!=='Tab')return;
    const items=focusable(),first=items[0],last=items.at(-1);
    if(!first){event.preventDefault();active.focus();return;}
    if(event.shiftKey&&(document.activeElement===first||!items.includes(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!items.includes(document.activeElement))){event.preventDefault();first.focus();}
  },true);
  document.addEventListener('focusin',()=>{if(active&&!active.contains(document.activeElement))focusFirst();});
  new MutationObserver(sync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
  sync();
})();
