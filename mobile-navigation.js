(function(){
  'use strict';
  const nav=document.querySelector('.topnav');
  if(!nav)return;
  const icons={
    dashboard:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    subjects:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h8"/>',
    tasks:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9M8 7h.01M8 17h.01"/>',
    timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 2h6M12 2v3M19 6l1.5-1.5"/>',
    planner:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6"/>',
    grades:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    exam:'<path d="M3 7 12 3l9 4-9 4zM6 9.5V15c3.5 3 8.5 3 12 0V9.5M21 7v7"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    schedule:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
    countdown:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2M9 2h6"/>',
    matcha:'<path d="M5 8h12v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM17 10h2a2 2 0 1 1 0 4h-2M8 4c0 1 1 1 1 2M12 3c0 1 1 1 1 2"/>'
  };
  function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.innerHTML=icons[name]||icons.more;return svg;}
  function addIcons(){
    nav.querySelectorAll('.navbtn[data-tab]').forEach(button=>{
      if(button.querySelector('.nav-icon'))return;
      const name=button.dataset.tab;
      if(!icons[name])return;
      const wrap=document.createElement('span');wrap.className='nav-icon';wrap.appendChild(icon(name));button.prepend(wrap);
    });
    nav.querySelectorAll('.exam-nav-set .navbtn[data-exam-tab]').forEach(button=>{
      if(button.querySelector('.nav-icon'))return;
      const map={dashboard:'dashboard',schedule:'schedule',subjects:'subjects',timer:'timer',countdown:'countdown',matcha:'matcha'};
      const name=map[button.dataset.examTab];if(!name)return;
      const wrap=document.createElement('span');wrap.className='nav-icon';wrap.appendChild(icon(name));button.prepend(wrap);
    });
  }
  function addMobileMoreLinks(){
    const more=document.getElementById('view-more');
    const intro=more?.querySelector(':scope > .small-note');
    if(!more||!intro||more.querySelector('.mobile-more-shortcuts'))return;
    const section=document.createElement('section');section.className='mobile-more-shortcuts';section.setAttribute('aria-label','More sections');
    section.innerHTML='<p>more places to go</p><div class="mobile-more-shortcut-grid"></div>';
    const grid=section.querySelector('.mobile-more-shortcut-grid');
    [['subjects','Courses','subjects'],['timer','Study timer','timer'],['exam','Exam Mode','exam']].forEach(([tab,label,iconName])=>{
      const button=document.createElement('button');button.type='button';button.className='mobile-more-shortcut';button.dataset.mobileNav=tab;
      const mark=document.createElement('span');mark.className='mobile-more-shortcut-icon';mark.appendChild(icon(iconName));
      const text=document.createElement('span');text.textContent=label;button.append(mark,text);grid.appendChild(button);
    });
    intro.after(section);
    section.addEventListener('click',event=>{
      const button=event.target.closest('[data-mobile-nav]');if(!button)return;
      nav.querySelector('.navbtn[data-tab="'+button.dataset.mobileNav+'"]')?.click();
    });
  }
  addIcons();addMobileMoreLinks();
  new MutationObserver(()=>{addIcons();addMobileMoreLinks();}).observe(nav,{childList:true,subtree:true});
})();
