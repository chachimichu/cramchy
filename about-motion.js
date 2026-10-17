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
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -35px 0px' });
    items.forEach((item) => observer.observe(item));
  }

  const heart = document.querySelector('.heart-cursor');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!heart || !finePointer.matches || reduceMotion.matches) return;

  document.body.classList.add('has-heart-cursor');
  let targetX = -80, targetY = -80, currentX = targetX, currentY = targetY;
  let frame = 0;
  const move = (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    heart.classList.add('is-on');
    if (frame) return;
    const follow = () => {
      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      heart.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.25) frame = requestAnimationFrame(follow);
      else frame = 0;
    };
    frame = requestAnimationFrame(follow);
  };
  const leave = () => heart.classList.remove('is-on');
  const focusable = 'a, button, input, select, textarea, [role="button"]';
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerleave', leave);
  document.addEventListener('pointerover', (event) => {
    if (event.target.closest(focusable)) heart.classList.add('is-hover');
  });
  document.addEventListener('pointerout', (event) => {
    if (event.target.closest(focusable)) heart.classList.remove('is-hover');
  });
})();
