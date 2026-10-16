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
  function closeMobileGroups(except){
    nav.querySelectorAll('.mobile-nav-group').forEach(group=>{
      if(group===except)return;
      group.classList.remove('is-open');
      group.querySelector('.mobile-nav-group-trigger')?.setAttribute('aria-expanded','false');
    });
    if(!nav.querySelector('.mobile-nav-group.is-open'))document.body.classList.remove('mobile-nav-menu-open');
  }
  function addMobileGroups(){
    if(nav.querySelector('.mobile-nav-group'))return;
    const groups=[
      {key:'plan',label:'plan',icon:'planner',after:'dashboard',items:[['planner','planner','planner'],['tasks','tasks','tasks']]},
      {key:'study',label:'study',icon:'timer',after:'timer',items:[['timer','study timer','timer'],['exam','exam mode','exam']]}
    ];
    groups.forEach(def=>{
      const anchor=nav.querySelector('.navbtn[data-tab="'+def.after+'"]');
      if(!anchor)return;
      const group=document.createElement('div');group.className='mobile-nav-group';group.dataset.navGroup=def.key;
      const trigger=document.createElement('button');trigger.type='button';trigger.className='mobile-nav-group-trigger';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','mobile-nav-'+def.key+'-menu');
      const mark=document.createElement('span');mark.className='mobile-nav-icon';mark.appendChild(icon(def.icon));
      const label=document.createElement('span');label.className='mobile-nav-label';label.textContent=def.label;
      const caret=document.createElement('span');caret.className='mobile-nav-caret';caret.setAttribute('aria-hidden','true');caret.textContent='⌃';
      trigger.append(mark,label,caret);
      const menu=document.createElement('div');menu.id='mobile-nav-'+def.key+'-menu';menu.className='mobile-nav-menu';menu.setAttribute('role','group');menu.setAttribute('aria-label',def.label+' sections');
      def.items.forEach(([tab,title,iconName])=>{
        const item=document.createElement('button');item.type='button';item.className='mobile-nav-menu-item';item.dataset.mobileNav=tab;
        const itemIcon=document.createElement('span');itemIcon.className='mobile-nav-menu-icon';itemIcon.appendChild(icon(iconName));
        const itemLabel=document.createElement('span');itemLabel.textContent=title;
        item.append(itemIcon,itemLabel);menu.appendChild(item);
      });
      group.append(trigger,menu);anchor.after(group);
      trigger.addEventListener('click',()=>{
        const opening=!group.classList.contains('is-open');closeMobileGroups(group);
        group.classList.toggle('is-open',opening);trigger.setAttribute('aria-expanded',String(opening));
        document.body.classList.toggle('mobile-nav-menu-open',opening);
      });
      menu.addEventListener('click',event=>{
        const item=event.target.closest('[data-mobile-nav]');if(!item)return;
        nav.querySelector('.navbtn[data-tab="'+item.dataset.mobileNav+'"]')?.click();
        closeMobileGroups();
      });
    });
  }
  nav.addEventListener('click',event=>{
    const tab=event.target.closest('.navbtn[data-tab]');if(!tab)return;
    closeMobileGroups();
    nav.querySelectorAll('.mobile-nav-group').forEach(group=>group.classList.toggle('is-active',group.dataset.navGroup==='plan'?['planner','tasks'].includes(tab.dataset.tab):['timer','exam'].includes(tab.dataset.tab)));
  });
  document.addEventListener('click',event=>{if(!event.target.closest('.mobile-nav-group'))closeMobileGroups();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMobileGroups();});
  addIcons();addMobileGroups();
  new MutationObserver(()=>{addIcons();addMobileGroups();}).observe(nav,{childList:true,subtree:true});
})();
