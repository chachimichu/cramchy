(() => {
  const $ = (id) => document.getElementById(id);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const heartSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
  const heartColors = ['#f684b0', '#d94b86', '#ffb3cf', '#ff7aa5'];

  // Small hearts lift gently from a click. Keep the burst close to the pointer.
  function burst(x, y, amount = 6) {
    if (reducedMotion) return;
    for (let i = 0; i < amount; i++) {
      const heart = document.createElement('span');
      heart.className = 'mh';
      heart.innerHTML = heartSvg;
      const angle = (-151 + (i * 30 / Math.max(1, amount - 1)) + Math.random() * 12) * Math.PI / 180;
      const distance = 30 + Math.random() * 30;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 7;
      heart.style.cssText = `left:${x}px;top:${y}px;width:${8 + Math.random() * 6}px;color:${heartColors[i % heartColors.length]}`;
      document.body.append(heart);
      heart.animate([
        { transform: 'translate(-50%,-50%) scale(.35)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: .95, offset: .16 },
        { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.2) rotate(${Math.random() * 35 - 17}deg)`, opacity: 0 }
      ], { duration: 560 + Math.random() * 130, easing: 'cubic-bezier(.2,.7,.25,1)' }).onfinish = () => heart.remove();
    }
  }
  addEventListener('pointerdown', (event) => burst(event.clientX, event.clientY), { passive: true });
  document.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    const box = event.target.getBoundingClientRect();
    burst(box.left + box.width / 2, box.top + box.height / 2);
  });

  // The weekly board can be tapped to toggle its little sample class blocks.
  document.querySelectorAll('.blk:not(.e)').forEach((block, index) => {
    block.setAttribute('aria-pressed', 'true');
    block.addEventListener('click', () => {
      const isSet = block.getAttribute('aria-pressed') === 'true';
      block.setAttribute('aria-pressed', String(!isSet));
      block.classList.toggle('p', !isSet);
      block.classList.remove('hop');
      void block.offsetWidth;
      block.classList.add('hop');
      block.setAttribute('aria-label', `Schedule sample block ${!isSet ? 'shown' : 'hidden'}`);
    });
    if (!block.getAttribute('aria-label')) block.setAttribute('aria-label', `Sample schedule block ${index + 1}`);
  });

  // Interactive task checklist.
  const taskChecks = [...document.querySelectorAll('.list input[type="checkbox"]')];
  const taskCount = $('cnt');
  function updateTasks() {
    const count = taskChecks.filter((box) => box.checked).length;
    if (taskCount) taskCount.textContent = count === taskChecks.length ? 'all done!' : `${count} of ${taskChecks.length} done`;
  }
  taskChecks.forEach((box) => box.addEventListener('change', updateTasks));
  updateTasks();

  // Accurate timer: calculate remaining time from a deadline to avoid interval drift.
  const timerTotal = 1500;
  let duration = timerTotal;
  let remaining = duration;
  let endsAt = 0;
  let timerInterval = 0;
  const timerText = $('tt');
  const timerRing = $('fg');
  const startButton = $('go');
  const circumference = 2 * Math.PI * 70;
  const timerHint = document.querySelector('.timer')?.parentElement?.querySelector('.hint');

  function drawTimer() {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    if (timerText) timerText.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (timerRing) timerRing.style.strokeDashoffset = String(circumference * (1 - remaining / duration));
  }
  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = 0;
    if (startButton) startButton.textContent = 'start';
  }
  function timerTick() {
    remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    drawTimer();
    if (remaining === 0) {
      stopTimer();
      if (timerHint) timerHint.textContent = 'Session complete. Take a breath.';
      if (timerRing) timerRing.style.stroke = '#d94b86';
      const box = startButton?.getBoundingClientRect();
      if (box) burst(box.left + box.width / 2, box.top + box.height / 2, 5);
    }
  }
  function chooseDuration(button) {
    stopTimer();
    duration = Number(button.dataset.m) * 60;
    remaining = duration;
    document.querySelectorAll('.chips [data-m]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    if (timerHint) timerHint.textContent = 'pick a time, press start';
    if (timerRing) timerRing.style.stroke = '';
    drawTimer();
  }
  document.querySelectorAll('.chips [data-m]').forEach((button) => button.addEventListener('click', () => chooseDuration(button)));
  startButton?.addEventListener('click', () => {
    if (timerInterval) {
      remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      stopTimer();
      drawTimer();
      if (timerHint) timerHint.textContent = 'paused—resume when you’re ready';
      return;
    }
    if (remaining <= 0) remaining = duration;
    endsAt = Date.now() + remaining * 1000;
    startButton.textContent = 'pause';
    if (timerHint) timerHint.textContent = 'one thing at a time';
    timerInterval = setInterval(timerTick, 200);
    timerTick();
  });
  drawTimer();

  // Separate Midterms and Finals demo state, with keyboard-accessible tabs.
  const examTabs = [...document.querySelectorAll('.tabbar [role="tab"]')];
  const topicState = { m: [false, false, false], f: [false, false, false] };
  const topicNames = ['Review lecture notes', 'Practice key terms', 'Try sample questions'];
  let currentTerm = 'm';
  function drawTopics() {
    const topics = $('topics');
    if (!topics) return;
    topics.replaceChildren();
    topicNames.forEach((name, index) => {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = topicState[currentTerm][index];
      const text = document.createElement('span');
      text.textContent = name;
      checkbox.addEventListener('change', () => {
        topicState[currentTerm][index] = checkbox.checked;
        updateTopicProgress();
      });
      label.append(checkbox, text);
      topics.append(label);
    });
    updateTopicProgress();
  }
  function updateTopicProgress() {
    const count = topicState[currentTerm].filter(Boolean).length;
    const complete = $('pb');
    const progressText = $('pt');
    if (complete) complete.style.width = `${count / topicNames.length * 100}%`;
    if (progressText) progressText.textContent = `${currentTerm === 'm' ? 'midterms szn' : 'finals szn'}: ${count} of ${topicNames.length} lessons done`;
  }
  function selectExamTab(tab) {
    currentTerm = tab.dataset.t;
    examTabs.forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
    drawTopics();
  }
  examTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectExamTab(tab));
    tab.addEventListener('keydown', (event) => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % examTabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + examTabs.length) % examTabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = examTabs.length - 1;
      else return;
      event.preventDefault();
      examTabs[next].focus();
      selectExamTab(examTabs[next]);
    });
  });
  drawTopics();

  // Sample score bars animate and update a clearly labeled example average.
  const scoreBars = [...document.querySelectorAll('.bars [data-score]')];
  const scoreLabel = $('grade-sample');
  function paintScores() {
    const scores = scoreBars.map((bar) => Number(bar.dataset.score));
    scoreBars.forEach((bar, index) => {
      const value = scores[index];
      bar.style.setProperty('--score', value);
      bar.querySelector('span').textContent = String(value);
      const subject = ['Written works', 'Activities', 'Attendance', 'Major exam'][index];
      bar.setAttribute('aria-label', `${subject} sample score ${value} percent. Activate to adjust`);
    });
    if (scoreLabel) scoreLabel.textContent = `sample course scores · ${Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)}% average`;
  }
  scoreBars.forEach((bar) => {
    bar.addEventListener('click', () => {
      const current = Number(bar.dataset.score);
      bar.dataset.score = String(current >= 100 ? 60 : Math.min(100, current + 5));
      bar.classList.remove('hop');
      void bar.offsetWidth;
      bar.classList.add('hop');
      paintScores();
    });
    bar.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      const current = Number(bar.dataset.score);
      bar.dataset.score = String(Math.max(0, Math.min(100, current + (event.key === 'ArrowUp' ? 5 : -5))));
      paintScores();
    });
  });
  paintScores();

  // Scroll word highlight in the story.
  const big = document.querySelector('.story .big');
  if (big) {
    (function wrapText(node) {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const fragment = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part.trim()) fragment.append(document.createTextNode(part));
            else {
              const word = document.createElement('span');
              word.className = 'sw';
              word.textContent = part;
              fragment.append(word);
            }
          });
          child.replaceWith(fragment);
        } else wrapText(child);
      });
    })(big);
  }
  const storyWords = [...document.querySelectorAll('.story .sw')];
  function highlightStory() {
    if (!big || reducedMotion) return;
    const rect = big.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight * .85 - rect.top) / (rect.height + innerHeight * .3)));
    const litCount = Math.round(progress * storyWords.length);
    storyWords.forEach((word, index) => word.classList.toggle('on', index < litCount));
  }

  // Reveal the story and draw a small heart along the reading progress line.
  const revealItems = [...document.querySelectorAll('.rv')];
  if (reducedMotion || !('IntersectionObserver' in window)) revealItems.forEach((item) => item.classList.add('in'));
  else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .22 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const progressBar = $('prog');
  const progressHeart = $('ph');
  if (progressHeart) progressHeart.innerHTML = heartSvg;
  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    const percent = maxScroll > 0 ? scrollY / maxScroll * 100 : 0;
    if (progressBar) progressBar.style.setProperty('--p', `${percent}%`);
    if (progressHeart) progressHeart.style.left = `calc(${percent}% - ${percent * .2}px)`;
    highlightStory();
  }
  function onScroll() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(updateScroll);
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  updateScroll();

  if (reducedMotion) {
    if (progressBar) progressBar.style.display = 'none';
    return;
  }

  // Drifting mini hearts, speed controlled by the tiny slider.
  const background = $('bgh');
  let pace = 1;
  if (background) {
    for (let i = 0; i < 16; i++) {
      const piece = document.createElement('span');
      piece.innerHTML = heartSvg;
      piece.setAttribute('aria-hidden', 'true');
      piece.style.cssText = `left:${Math.random() * 100}%;width:${12 + Math.random() * 26}px;animation-duration:${10 + Math.random() * 10}s;animation-delay:-${Math.random() * 18}s;color:${i % 3 ? '#ffc4da' : '#f9a6c6'}`;
      background.append(piece);
    }
  }
  const paceSlider = $('pace');
  paceSlider?.addEventListener('input', () => {
    pace = Number(paceSlider.value);
    const label = $('pl');
    if (label) label.textContent = pace < .7 ? 'slow' : pace < 1.6 ? 'steady' : 'fast';
    background?.getAnimations?.({ subtree: true }).forEach((animation) => animation.updatePlaybackRate(pace));
  });

  // Small parallax and drag-to-arrange on the floating school notes.
  const floaters = [...document.querySelectorAll('.fl')];
  const offsets = new Map();
  floaters.forEach((floater, index) => {
    floater.tabIndex = 0;
    floater.setAttribute('role', 'group');
    floater.setAttribute('aria-label', index === 0 ? 'Drag the sample task note to move it' : 'Drag the exam season note to move it');
    offsets.set(floater, { x: 0, y: 0, startX: 0, startY: 0, dragging: false });
  });
  let mx = 0, my = 0, rafQueued = false;
  const drawParallax = () => {
    rafQueued = false;
    floaters.forEach((floater, index) => {
      const offset = offsets.get(floater);
      if (offset.dragging) return;
      const speed = Number(floater.dataset.speed || 0);
      floater.style.transform = `translate3d(${mx * speed * -60 + offset.x}px,${scrollY * speed + my * speed * -60 + offset.y}px,0) rotate(${index === 0 ? 4 : 0}deg) scale(var(--float-scale,1))`;
    });
    if (background) background.style.transform = `translate3d(${mx * -30}px,${my * -20}px,0)`;
  };
  function queueParallax() {
    if (rafQueued) return;
    rafQueued = true;
    requestAnimationFrame(drawParallax);
  }
  addEventListener('scroll', queueParallax, { passive: true });
  if (finePointer) {
    document.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      mx = event.clientX / innerWidth - .5;
      my = event.clientY / innerHeight - .5;
      queueParallax();
    }, { passive: true });
  }
  floaters.forEach((floater) => {
    const offset = offsets.get(floater);
    floater.addEventListener('pointerdown', (event) => {
      if (event.target.closest('input')) return;
      offset.dragging = true;
      offset.startX = event.clientX - offset.x;
      offset.startY = event.clientY - offset.y;
      floater.setPointerCapture(event.pointerId);
      floater.classList.add('drag');
    });
    floater.addEventListener('pointermove', (event) => {
      if (!offset.dragging) return;
      offset.x = event.clientX - offset.startX;
      offset.y = event.clientY - offset.startY;
      queueParallax();
    });
    const release = () => {
      offset.dragging = false;
      floater.classList.remove('drag');
      queueParallax();
    };
    floater.addEventListener('pointerup', release);
    floater.addEventListener('pointercancel', release);
    floater.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 25 : 10;
      if (event.key === 'ArrowLeft') offset.x -= step;
      else if (event.key === 'ArrowRight') offset.x += step;
      else if (event.key === 'ArrowUp') offset.y -= step;
      else if (event.key === 'ArrowDown') offset.y += step;
      else if (event.key === 'Home') { offset.x = 0; offset.y = 0; }
      else return;
      event.preventDefault();
      queueParallax();
    });
  });

  // The portrait and feature illustrations tip a little with the pointer.
  const photo = document.querySelector('.photo');
  const aboutSection = $('who');
  if (finePointer && photo && aboutSection) {
    aboutSection.addEventListener('pointermove', (event) => {
      const rect = photo.getBoundingClientRect();
      const dx = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const dy = (event.clientY - rect.top - rect.height / 2) / rect.height;
      photo.style.transform = `perspective(800px) rotateY(${dx * 8}deg) rotateX(${dy * -8}deg)`;
    });
    aboutSection.addEventListener('pointerleave', () => { photo.style.transform = ''; });
    document.querySelectorAll('.art').forEach((art) => {
      art.addEventListener('pointermove', (event) => {
        const rect = art.getBoundingClientRect();
        const dx = (event.clientX - rect.left) / rect.width - .5;
        const dy = (event.clientY - rect.top) / rect.height - .5;
        art.style.transform = `perspective(900px) rotateY(${dx * 5}deg) rotateX(${dy * -5}deg)`;
      });
      art.addEventListener('pointerleave', () => { art.style.transform = ''; });
    });
  }

  // Cute heart cursor that follows only while a mouse is available.
  const cursor = $('cur');
  if (cursor && finePointer) {
    let x = -100, y = -100, currentX = x, currentY = y, followFrame = 0;
    let lastTrail = 0;
    cursor.innerHTML = heartSvg;
    document.documentElement.classList.add('hc');
    document.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      x = event.clientX;
      y = event.clientY;
      cursor.classList.add('on');
      const now = performance.now();
      if (Math.hypot(event.movementX, event.movementY) > 18 && now - lastTrail > 55) {
        lastTrail = now;
        const fleck = document.createElement('span');
        fleck.className = 'mh';
        fleck.innerHTML = heartSvg;
        fleck.style.cssText = `left:${x}px;top:${y}px;width:${7 + Math.random() * 6}px;color:${heartColors[Math.random() * heartColors.length | 0]}`;
        document.body.append(fleck);
        fleck.animate([
          { transform: 'translate(-50%,-50%) scale(.9)', opacity: .8 },
          { transform: `translate(calc(-50% + ${Math.random() * 16 - 8}px),calc(-50% + 24px)) scale(.2)`, opacity: 0 }
        ], { duration: 520, easing: 'ease-out' }).onfinish = () => fleck.remove();
      }
      if (followFrame) return;
      const follow = () => {
        currentX += (x - currentX) * .28;
        currentY += (y - currentY) * .28;
        cursor.style.transform = `translate3d(${currentX}px,${currentY}px,0) rotate(${Math.max(-20, Math.min(20, (x - currentX) * 1.2))}deg)`;
        if (Math.abs(x - currentX) + Math.abs(y - currentY) > .25) followFrame = requestAnimationFrame(follow);
        else followFrame = 0;
      };
      followFrame = requestAnimationFrame(follow);
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.remove('on'));
    document.addEventListener('pointerdown', () => cursor.classList.add('down'));
    document.addEventListener('pointerup', () => cursor.classList.remove('down'));
    document.addEventListener('pointerover', (event) => cursor.classList.toggle('big', !!event.target.closest('a,button,label,input')));
  }
})();
