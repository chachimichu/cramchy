(() => {
  const progress = document.querySelector('.scroll-progress span');
  let framePending = false;
  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = max > 0 ? window.scrollY / max : 0;
    if (progress) progress.style.transform = `scaleX(${Math.max(0, Math.min(1, fraction))})`;
    framePending = false;
  }
  function onScroll() {
    if (!framePending) {
      requestAnimationFrame(updateProgress);
      framePending = true;
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  updateProgress();

  const reveals = [...document.querySelectorAll('[data-reveal]')];
  reveals.forEach((item) => {
    if (item.dataset.delay) item.style.setProperty('--reveal-delay', `${item.dataset.delay}ms`);
  });
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    reveals.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, current) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          current.unobserve(entry.target);
        }
      });
    }, { threshold: 0.13, rootMargin: '0px 0px -45px 0px' });
    reveals.forEach((item) => observer.observe(item));
  }

  const heart = document.querySelector('.heart-cursor');
  const burstLayer = document.querySelector('.heart-burst-layer');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  if (heart && finePointer.matches && !reduceMotion.matches) {
    document.body.classList.add('has-heart-cursor');
    let targetX = -80, targetY = -80, currentX = targetX, currentY = targetY, followFrame = 0;
    const move = (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      heart.classList.add('is-on');
      if (followFrame) return;
      const follow = () => {
        currentX += (targetX - currentX) * .24;
        currentY += (targetY - currentY) * .24;
        heart.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
        if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > .25) followFrame = requestAnimationFrame(follow);
        else followFrame = 0;
      };
      followFrame = requestAnimationFrame(follow);
    };
    const focusable = 'a, button, input, select, textarea, [role="button"], .feature-card';
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', () => heart.classList.remove('is-on'));
    document.addEventListener('pointerover', (event) => {
      if (event.target.closest(focusable)) heart.classList.add('is-hover');
    });
    document.addEventListener('pointerout', (event) => {
      if (event.target.closest(focusable)) heart.classList.remove('is-hover');
    });
  }

  // Small hearts rise from a click or tap; no full-screen confetti.
  let lastBurst = 0;
  function burst(x, y) {
    if (!burstLayer || reduceMotion.matches) return;
    const now = performance.now();
    if (now - lastBurst < 90) return;
    lastBurst = now;
    const count = 4;
    for (let i = 0; i < count; i++) {
      const heartlet = document.createElement('span');
      heartlet.className = 'mini-heart';
      heartlet.textContent = i === 3 ? '♡' : '♥';
      const angle = -132 + i * 44 + (Math.random() * 18 - 9);
      const radians = angle * Math.PI / 180;
      const distance = 24 + Math.random() * 25;
      heartlet.style.left = `${x}px`;
      heartlet.style.top = `${y}px`;
      heartlet.style.setProperty('--dx', `${Math.cos(radians) * distance}px`);
      heartlet.style.setProperty('--dy', `${Math.sin(radians) * distance - 10}px`);
      heartlet.style.setProperty('--angle', `${Math.random() * 28 - 14}deg`);
      heartlet.style.setProperty('--duration', `${520 + Math.random() * 180}ms`);
      burstLayer.appendChild(heartlet);
      heartlet.addEventListener('animationend', () => heartlet.remove(), { once: true });
    }
  }
  document.addEventListener('pointerdown', (event) => burst(event.clientX, event.clientY), { passive: true });
  document.addEventListener('click', (event) => {
    if (event.detail === 0) {
      const rect = event.target.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  });

  // Feature cards gently tilt on desktop and flip on click/tap.
  const cards = [...document.querySelectorAll('.feature-card')];
  cards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || reduceMotion.matches || card.classList.contains('is-flipped')) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = `perspective(850px) rotateX(${y * -3}deg) rotateY(${x * 4}deg)`;
    });
    card.addEventListener('pointerleave', () => {
      if (!card.classList.contains('is-flipped')) card.style.transform = '';
    });
    card.addEventListener('click', () => {
      card.classList.toggle('is-flipped');
      card.style.transform = '';
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.classList.toggle('is-flipped');
      }
    });
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${card.querySelector('h3')?.textContent || 'Feature'} — click to see details`);
  });
})();
