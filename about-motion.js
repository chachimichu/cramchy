(() => {
  const progress = document.querySelector('.scroll-progress span');
  let scheduled = false;
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const amount = max > 0 ? window.scrollY / max : 0;
    if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, amount))})`;
    scheduled = false;
  };
  const onScroll = () => {
    if (!scheduled) {
      window.requestAnimationFrame(updateProgress);
      scheduled = true;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateProgress();

  const items = [...document.querySelectorAll('[data-reveal]')];
  items.forEach((item) => {
    if (item.dataset.delay) item.style.setProperty('--reveal-delay', `${item.dataset.delay}ms`);
  });
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -35px 0px' });
  items.forEach((item) => observer.observe(item));
})();
