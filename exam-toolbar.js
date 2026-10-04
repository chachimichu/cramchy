(function () {
  const menus = [...document.querySelectorAll('.exam-toolbar-menu')];
  function setOpen(menu, open) {
    menu.classList.toggle('is-open', open);
    menu.querySelector('.exam-menu-trigger').setAttribute('aria-expanded', String(open));
    menu.querySelector('.exam-toolbar-panel').hidden = !open;
  }
  function closeAll() { menus.forEach(menu => setOpen(menu, false)); }
  menus.forEach(menu => {
    const trigger = menu.querySelector('.exam-menu-trigger');
    setOpen(menu, false);
    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') !== 'true';
      closeAll();
      setOpen(menu, open);
    });
  });
  // Safari may omit click events when a touch lands on noninteractive page space.
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.exam-toolbar-menu')) closeAll();
  }, true);
  document.addEventListener('click', event => {
    if (!event.target.closest('.exam-toolbar-menu') ||
        event.target.closest('#applyExamToolbarPeriod, #changeExamPeriodBtn, #resetExamPeriodBtn')) closeAll();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const menu = menus.find(item => item.classList.contains('is-open'));
    if (menu) {
      closeAll();
      menu.querySelector('.exam-menu-trigger').focus();
    }
  });
  // Restoring a page from Safari's back/forward cache starts with closed panels.
  window.addEventListener('pageshow', closeAll);
})();
