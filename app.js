(function(){
  const LOGO_SRC = 'assets/cramchy-logo-hd.svg?v=2026-09-09-logo-hd-1';

  function fixLateNightGreeting(){
    const el = document.getElementById('dailyGreeting');
    if(!el) return;
    const text = el.textContent || '';
    if(text.startsWith('why are we still awake, ') && text.endsWith('.')){
      el.textContent = text.slice(0, -1) + '?';
    }
  }

  function applyHomeLogoRefresh(){
    const brandImg = document.querySelector('.topnav .brand .brand-wordmark');
    if(brandImg){
      brandImg.src = LOGO_SRC;
      brandImg.alt = 'Cramchy';
      brandImg.classList.add('brand-full-logo');
    }

    const home = document.querySelector('#view-dashboard .daily-home');
    if(home){
      const hero = Array.from(home.children).find(el => el.classList && el.classList.contains('hero'));
      const dailyHero = Array.from(home.children).find(el => el.classList && el.classList.contains('daily-hero'));
      const regularHero = hero ? hero.querySelector('.regular-brand-hero') : null;
      const dailyTitle = dailyHero ? dailyHero.querySelector('.daily-title') : null;

      if(hero && regularHero && dailyTitle){
        hero.classList.add('home-logo-shell');
        regularHero.classList.add('home-logo-hero');
        regularHero.innerHTML = '';

        const logo = document.createElement('img');
        logo.className = 'home-logo-art';
        logo.src = LOGO_SRC;
        logo.alt = 'Cramchy logo';

        regularHero.appendChild(logo);
        regularHero.appendChild(dailyTitle);
        dailyHero.classList.add('home-quick-add-row');
      }
    }

    fixLateNightGreeting();
    const greeting = document.getElementById('dailyGreeting');
    if(greeting){
      new MutationObserver(fixLateNightGreeting).observe(greeting, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
  }

  const base = document.createElement('script');
  base.src = 'app-base.js?v=2026-09-09-logo-hd-1';
  base.async = false;
  base.onload = applyHomeLogoRefresh;
  base.onerror = () => console.error('Cramchy base app failed to load.');
  document.head.appendChild(base);
})();
