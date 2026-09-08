(function(){
  const FALLBACK_LOGO='assets/cramchy-wordmark.png';

  function $(s,r=document){return r.querySelector(s);}
  function logoSrc(){return $('.topnav .brand img.brand-full-logo')?.src||$('.topnav .brand img')?.src||$('.hero-wordmark')?.src||FALLBACK_LOGO;}

  function buildHomeHero(){
    const home=$('#view-dashboard .daily-home');
    if(!home)return false;

    const oldGreeting=$('#dailyGreeting',home);
    const oldMeta=$('#dailyMeta',home);
    const quickAdd=$('#dailyQuickAddBtn',home);
    const greetingText=oldGreeting?.textContent||'good day';
    const metaText=oldMeta?.textContent||'';

    const existing=$('.cramchy-home-header',home);
    if(existing)existing.remove();

    const legacyHero=$(':scope > .hero',home);
    const legacyDailyHero=$(':scope > .daily-hero',home);

    const header=document.createElement('div');
    header.className='planner-hero-card cramchy-home-header';
    header.innerHTML=`
      <div class="planner-logo-wrap cramchy-home-logo-zone">
        <img class="planner-logo-sync planner-main-logo cramchy-home-logo" src="${logoSrc()}" alt="Cramchy logo">
        <span class="cramchy-home-sparkle one">✦</span>
        <span class="cramchy-home-sparkle two">✧</span>
      </div>
      <div class="planner-hero-copy cramchy-home-copy">
        <h2 id="dailyGreeting"></h2>
        <p id="dailyMeta"></p>
        <div class="planner-actions cramchy-home-actions"></div>
      </div>`;

    $('#dailyGreeting',header).textContent=greetingText;
    $('#dailyMeta',header).textContent=metaText;
    const actions=$('.cramchy-home-actions',header);
    if(quickAdd)actions.appendChild(quickAdd);

    home.insertBefore(header,home.firstChild);
    if(legacyHero)legacyHero.remove();
    if(legacyDailyHero)legacyDailyHero.remove();

    document.body.classList.add('cramchy-home-enhanced');
    return true;
  }

  function init(){
    if(buildHomeHero())return;
    let tries=0;
    const retry=()=>{
      tries++;
      if(buildHomeHero()||tries>=12)return;
      setTimeout(retry,120);
    };
    retry();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
