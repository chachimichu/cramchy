(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

  // Scroll progress and gentle section entrances.
  const progress = document.querySelector('.scroll-progress span');
  let scrollQueued = false;
  const storyLine = document.querySelector('.origin-lead');
  const storyWords = [];
  if (storyLine) {
    const pieces = storyLine.textContent.split(/(\s+)/);
    storyLine.replaceChildren();
    pieces.forEach((piece) => {
      if (!piece.trim()) storyLine.append(document.createTextNode(piece));
      else {
        const word = document.createElement('span');
        word.className = 'story-word';
        word.textContent = piece;
        storyLine.append(word);
        storyWords.push(word);
      }
    });
  }
  const updateProgress = () => {
    const range = document.documentElement.scrollHeight - innerHeight;
    const amount = range > 0 ? scrollY / range : 0;
    if (progress) progress.style.transform = `scaleX(${Math.max(0, Math.min(1, amount))})`;
    if (storyLine && storyWords.length) {
      const rect = storyLine.getBoundingClientRect();
      const through = Math.max(0, Math.min(1, (innerHeight * .82 - rect.top) / (rect.height + innerHeight * .42)));
      const lit = reducedMotion.matches ? storyWords.length : Math.round(through * storyWords.length);
      storyWords.forEach((word, index) => word.classList.toggle('is-lit', index < lit));
    }
    scrollQueued = false;
  };
  const queueProgress = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateProgress);
  };
  addEventListener('scroll', queueProgress, { passive: true });
  addEventListener('resize', queueProgress);
  updateProgress();

  const reveals = [...document.querySelectorAll('[data-reveal]')];
  reveals.forEach((item) => {
    if (item.dataset.delay) item.style.setProperty('--reveal-delay', `${item.dataset.delay}ms`);
  });
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    reveals.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, current) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          current.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -35px 0px' });
    reveals.forEach((item) => observer.observe(item));
  }

  // The custom heart follows a mouse; small bursts also work on touch.
  const heart = document.querySelector('.heart-cursor');
  if (heart && finePointer.matches && !reducedMotion.matches) {
    document.body.classList.add('has-heart-cursor');
    let x = -80, y = -80, tx = x, ty = y, frame = 0;
    document.addEventListener('pointermove', (event) => {
      tx = event.clientX;
      ty = event.clientY;
      heart.classList.add('is-on');
      if (frame) return;
      const follow = () => {
        x += (tx - x) * .25;
        y += (ty - y) * .25;
        heart.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
        if (Math.abs(tx - x) + Math.abs(ty - y) > .25) frame = requestAnimationFrame(follow);
        else frame = 0;
      };
      frame = requestAnimationFrame(follow);
    }, { passive: true });
    document.addEventListener('pointerleave', () => heart.classList.remove('is-on'));
    const interactive = 'a,button,input,label,[role="tab"]';
    document.addEventListener('pointerover', (event) => {
      if (event.target.closest(interactive)) heart.classList.add('is-hover');
    });
    document.addEventListener('pointerout', (event) => {
      if (event.target.closest(interactive)) heart.classList.remove('is-hover');
    });
  }

  const burstLayer = document.querySelector('.heart-burst-layer');
  let lastBurst = 0;
  function burst(clientX, clientY) {
    if (!burstLayer || reducedMotion.matches || performance.now() - lastBurst < 75) return;
    lastBurst = performance.now();
    for (let i = 0; i < 5; i++) {
      const bit = document.createElement('span');
      bit.className = 'mini-heart';
      bit.textContent = i === 4 ? '✦' : '♥';
      const angle = (-145 + i * 35 + Math.random() * 18) * Math.PI / 180;
      const distance = 26 + Math.random() * 30;
      bit.style.left = `${clientX}px`;
      bit.style.top = `${clientY}px`;
      bit.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      bit.style.setProperty('--dy', `${Math.sin(angle) * distance - 8}px`);
      bit.style.setProperty('--angle', `${Math.random() * 24 - 12}deg`);
      bit.style.setProperty('--duration', `${500 + Math.random() * 170}ms`);
      burstLayer.appendChild(bit);
      bit.addEventListener('animationend', () => bit.remove(), { once: true });
    }
  }
  document.addEventListener('pointerdown', (event) => burst(event.clientX, event.clientY), { passive: true });
  document.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    const rect = event.target.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  // Interactive weekly schedule: tap a cell to add or remove a sample event.
  document.querySelectorAll('[data-calendar-demo] .calendar-slot').forEach((slot) => {
    slot.addEventListener('click', () => {
      const active = slot.getAttribute('aria-pressed') === 'true';
      slot.setAttribute('aria-pressed', String(!active));
      if (!slot.dataset.fullLabel) {
        slot.dataset.fullLabel = slot.getAttribute('aria-label') || 'Class time';
        slot.dataset.emptyLabel = slot.dataset.fullLabel.replace(/ (class|study)/i, '');
      }
      slot.setAttribute('aria-label', active ? slot.dataset.emptyLabel : slot.dataset.fullLabel);
      slot.classList.toggle('is-class', !active);
      slot.classList.toggle('is-study', !active && slot.dataset.kind === 'study');
      slot.textContent = active ? '' : (slot.dataset.kind === 'study' ? 'study' : 'class');
      slot.classList.remove('is-pop');
      void slot.offsetWidth;
      slot.classList.add('is-pop');
    });
  });

  // Tasks share one progress indicator, just like a connected checklist.
  document.querySelectorAll('[data-task-demo]').forEach((demo) => {
    const boxes = [...demo.querySelectorAll('input[type="checkbox"]')];
    const fill = demo.querySelector('.task-progress-fill');
    const hint = demo.querySelector('.demo-hint');
    const update = () => {
      const done = boxes.filter((box) => box.checked).length;
      if (fill) fill.style.width = `${done / boxes.length * 100}%`;
      if (hint) hint.textContent = done === boxes.length ? 'All done—nice work!' : `${done} of ${boxes.length} complete`;
    };
    boxes.forEach((box) => box.addEventListener('change', update));
    update();
  });

  // Accurate countdown demo with selectable focus lengths.
  document.querySelectorAll('[data-timer-demo]').forEach((demo) => {
    const readout = demo.querySelector('.timer-readout strong');
    const ring = demo.querySelector('.timer-progress');
    const toggle = demo.querySelector('.timer-toggle');
    const reset = demo.querySelector('.timer-reset');
    const presets = [...demo.querySelectorAll('[data-minutes]')];
    const hint = demo.querySelector('.demo-hint');
    const circumference = 2 * Math.PI * 69;
    let duration = 25 * 60;
    let remaining = duration;
    let endsAt = 0;
    let interval = 0;
    const paint = () => {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      readout.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      ring.style.strokeDasharray = String(circumference);
      ring.style.strokeDashoffset = String(circumference * (1 - remaining / duration));
    };
    const stop = () => {
      clearInterval(interval);
      interval = 0;
      toggle.textContent = 'start';
    };
    const tick = () => {
      remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      paint();
      if (remaining === 0) {
        stop();
        hint.textContent = 'Session complete. Take a breath.';
        ring.style.stroke = '#8fa77d';
      }
    };
    presets.forEach((button) => {
      button.addEventListener('click', () => {
        stop();
        duration = Number(button.dataset.minutes) * 60;
        remaining = duration;
        presets.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        hint.textContent = 'Pick a time and press start';
        ring.style.stroke = '';
        paint();
      });
    });
    toggle.addEventListener('click', () => {
      if (interval) {
        remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        stop();
        paint();
        hint.textContent = 'Paused—resume when you’re ready';
        return;
      }
      if (remaining <= 0) remaining = duration;
      endsAt = Date.now() + remaining * 1000;
      toggle.textContent = 'pause';
      hint.textContent = 'You’ve got this. One thing at a time.';
      interval = setInterval(tick, 200);
      tick();
    });
    reset.addEventListener('click', () => {
      stop();
      remaining = duration;
      hint.textContent = 'Pick a time and press start';
      ring.style.stroke = '';
      paint();
    });
    paint();
  });

  // Separate topic progress for Midterms and Finals.
  document.querySelectorAll('[data-exam-demo]').forEach((demo) => {
    const tabs = [...demo.querySelectorAll('[data-period]')];
    const topicBox = demo.querySelector('.exam-topics');
    const progress = demo.querySelector('.exam-progress span');
    const hint = demo.querySelector('.demo-hint');
    const checkedByPeriod = { midterms: [false, false, false], finals: [false, false, false] };
    const topics = {
      midterms: ['Review lecture notes', 'Practice key terms', 'Try sample questions'],
      finals: ['List topics to cover', 'Review hardest unit', 'Do a final recall check']
    };
    let period = 'midterms';
    const render = () => {
      topicBox.replaceChildren();
      topics[period].forEach((topic, index) => {
        const label = document.createElement('label');
        label.className = 'exam-topic';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = checkedByPeriod[period][index];
        const text = document.createElement('span');
        text.textContent = topic;
        input.addEventListener('change', () => {
          checkedByPeriod[period][index] = input.checked;
          update();
        });
        label.append(input, text);
        topicBox.append(label);
      });
      update();
    };
    const update = () => {
      const done = checkedByPeriod[period].filter(Boolean).length;
      progress.style.width = `${done / 3 * 100}%`;
      hint.textContent = `${done} of 3 topics ready`;
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        period = tab.dataset.period;
        tabs.forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
        render();
      });
      tab.addEventListener('keydown', (event) => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[next].focus();
        tabs[next].click();
      });
    });
    render();
  });

  // An illustrative weighted-score calculator. The labels explicitly say it is a sample.
  document.querySelectorAll('[data-grade-demo]').forEach((demo) => {
    const inputs = [...demo.querySelectorAll('input[type="range"]')];
    const result = demo.querySelector('.grade-demo-heading strong b');
    const weights = [30, 20, 10, 40];
    const update = () => {
      const score = inputs.reduce((sum, input, index) => sum + Number(input.value) * weights[index] / 100, 0);
      result.textContent = String(Math.round(score));
    };
    inputs.forEach((input) => input.addEventListener('input', update));
    update();
  });

  // Light pointer tilt adds depth without making the whole card flip.
  if (finePointer.matches && !reducedMotion.matches) {
    document.querySelectorAll('.feature-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.transform = `perspective(950px) rotateX(${y * -2.3}deg) rotateY(${x * 3}deg) translateY(-3px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  // The snack illustration gets a tiny nudge when brought into view.
  const snack = document.querySelector('.snack-bag');
  if (snack && 'IntersectionObserver' in window && !reducedMotion.matches) {
    const snackObserver = new IntersectionObserver(([entry], current) => {
      if (entry.isIntersecting) {
        snack.classList.add('snack-arrived');
        current.disconnect();
      }
    }, { threshold: .6 });
    snackObserver.observe(snack);
  }
})();
