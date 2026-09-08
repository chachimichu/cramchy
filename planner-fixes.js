(function(){
  const LOGO_FALLBACK = 'assets/cramchy-wordmark.png';

  function $(selector, root=document){ return root.querySelector(selector); }
  function $all(selector, root=document){ return Array.from(root.querySelectorAll(selector)); }
  function logoSrc(){ return $('.topnav .brand img.brand-full-logo')?.src || $('.topnav .brand img')?.src || $('.hero-wordmark')?.src || LOGO_FALLBACK; }
  function escapeHtml(value){ return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function cleanMicrocopy(){
    if(!document.body) return;
    const replacements = [
      ['nothing due here ♡','nothing due here.'],
      ['nothing due here♡','nothing due here.'],
      ['nothing due here ❤','nothing due here.'],
      ['nothing due here ♥','nothing due here.'],
      ['♡ today\'s tasks','today\'s tasks'],
      ['♡ todays tasks','today\'s tasks']
    ];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let text = node.nodeValue;
      replacements.forEach(([from,to]) => { text = text.split(from).join(to); });
      node.nodeValue = text;
    });
  }

  function syncLogo(){
    const src = logoSrc();
    $all('.planner-logo-sync,.cramchy-home-logo').forEach(img => {
      if(img && img.src !== src) img.src = src;
    });
  }

  function enhanceHomeHero(){
    const home = $('#view-dashboard .daily-home');
    if(!home){ document.body.classList.remove('cramchy-home-enhanced'); return false; }

    let header = $('.cramchy-home-header', home);
    const dailyTitle = $('.daily-title', home);
    const quickAdd = $('#dailyQuickAddBtn', home);

    if(!header){
      if(!dailyTitle){ document.body.classList.remove('cramchy-home-enhanced'); return false; }
      header = document.createElement('div');
      header.className = 'cramchy-home-header';
      header.innerHTML = `
        <div class="cramchy-home-logo-zone">
          <img class="cramchy-home-logo planner-logo-sync" src="${escapeHtml(logoSrc())}" alt="Cramchy logo">
          <span class="cramchy-sticker sticker-one">small steps, big receipts</span>
          <span class="cramchy-sparkle sparkle-a">✦</span>
          <span class="cramchy-sparkle sparkle-b">✧</span>
        </div>
        <div class="cramchy-home-copy">
          <div class="cramchy-home-kicker">today in cramchy</div>
        </div>
      `;
      home.insertBefore(header, home.firstChild);
    }

    const copy = $('.cramchy-home-copy', header);
    if(copy && dailyTitle && !copy.contains(dailyTitle)) copy.appendChild(dailyTitle);
    if(copy && quickAdd && !copy.contains(quickAdd)){
      let actions = $('.cramchy-home-actions', copy);
      if(!actions){ actions = document.createElement('div'); actions.className = 'cramchy-home-actions'; copy.appendChild(actions); }
      actions.appendChild(quickAdd);
    }

    document.body.classList.add('cramchy-home-enhanced');
    syncLogo();
    return true;
  }

  function hidePlanner(){
    document.body.classList.remove('planner-mode-active');
    $('#view-planner')?.classList.remove('active');
    $('.topnav .navbtn[data-tab="planner"]')?.classList.remove('active');
  }

  function showPlanner(){
    const planner = $('#view-planner');
    const plannerBtn = $('.topnav .navbtn[data-tab="planner"]');
    if(!planner || !plannerBtn) return false;
    document.body.classList.add('planner-mode-active');
    $all('main > .view').forEach(view => view.classList.toggle('active', view.id === 'view-planner'));
    $all('.topnav .navbtn').forEach(btn => btn.classList.toggle('active', btn === plannerBtn));
    syncLogo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }

  function purgeLegacySamples(){
    ['cramchyPlannerEvents_v1','cramchyPlannerEvents_v2'].forEach(key => {
      try{
        const raw = localStorage.getItem(key);
        if(!raw) return;
        const parsed = JSON.parse(raw);
        if(!Array.isArray(parsed)) return;
        const cleaned = parsed.filter(item => item && !/^p\d+$/.test(String(item.id || '')));
        if(cleaned.length !== parsed.length) localStorage.setItem(key, JSON.stringify(cleaned));
      }catch(error){}
    });
  }

  function bindNavSafety(){
    if(document.body.dataset.plannerFixNav === 'true') return;
    document.body.dataset.plannerFixNav = 'true';
    document.addEventListener('click', event => {
      const plannerBtn = event.target.closest('.topnav .navbtn[data-tab="planner"]');
      if(plannerBtn){
        event.preventDefault();
        event.stopImmediatePropagation();
        if(!showPlanner()) setTimeout(showPlanner, 250);
        return;
      }
      const otherNav = event.target.closest('.topnav .navbtn:not([data-tab="planner"])');
      if(otherNav){
        hidePlanner();
        setTimeout(hidePlanner, 0);
      }
    }, true);
  }

  function boot(){
    purgeLegacySamples();
    bindNavSafety();
    cleanMicrocopy();
    enhanceHomeHero();
    syncLogo();

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      purgeLegacySamples();
      cleanMicrocopy();
      enhanceHomeHero();
      syncLogo();
      if(tries > 80) clearInterval(timer);
    }, 150);

    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        cleanMicrocopy();
        enhanceHomeHero();
        syncLogo();
      });
    });
    if(document.body) observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    window.addEventListener('load', () => { cleanMicrocopy(); enhanceHomeHero(); syncLogo(); });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();