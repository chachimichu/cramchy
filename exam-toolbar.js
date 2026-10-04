(function () {
  const menus = [...document.querySelectorAll('.exam-toolbar-menu')];
  function sync(menu) {
    const trigger = menu.querySelector('summary');
    const panel = menu.querySelector('.exam-toolbar-panel');
    trigger?.setAttribute('aria-expanded', String(menu.open));
    if (panel) panel.hidden = !menu.open;
  }
  function setOpen(menu, open) {
    menu.open = open;
    sync(menu);
  }
  menus.forEach(menu => {
    sync(menu);
    menu.addEventListener('toggle', () => sync(menu));
    new MutationObserver(() => sync(menu)).observe(menu, { attributes: true, attributeFilter: ['open'] });
  });
  // Use one click path for touch, mouse and native keyboard activation.
  // Cancel the native details action so it cannot toggle a second time.
  document.addEventListener('click', event => {
    const trigger = event.target.closest('.exam-toolbar-menu > summary');
    if (trigger) {
      event.preventDefault();
      event.stopPropagation();
      const menu = trigger.closest('.exam-toolbar-menu');
      const nextOpen = !menu.open;
      menus.forEach(other => setOpen(other, other === menu && nextOpen));
      return;
    }
    if (!event.target.closest('.exam-toolbar-menu') ||
        event.target.closest('#applyExamToolbarPeriod, #changeExamPeriodBtn, #resetExamPeriodBtn')) {
      menus.forEach(menu => setOpen(menu, false));
    }
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const menu = menus.find(item => item.open);
    if (menu) {
      menus.forEach(item => setOpen(item, false));
      menu.querySelector('summary')?.focus();
    }
  });
})();
