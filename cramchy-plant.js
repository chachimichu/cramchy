/*
 * CramchyPlant: the study plant that grows while the timer runs.
 * No dependencies. Colors come from your theme CSS variables (with fallbacks):
 * --accent, --accent-strong, --soft, --secondary, --line, --card
 *
 * USAGE
 *   var plant = CramchyPlant.mount(document.getElementById('plantSlot'));
 *   plant.setProgress(0.42);   // 0 to 1, call on every timer tick (elapsed / total)
 *   plant.setRunning(true);    // sways while the timer is running, false when paused
 *   plant.bloom();             // session finished: flower opens, hearts pop
 *   plant.bloom({silent:true}) // same, without hearts (use when restoring a finished session)
 *   plant.reset();             // back to a seedling (timer reset)
 *   plant.destroy();           // remove it
 */
(function (root) {
  var LEAF = 'M0 0C8-11 24-11 32 0C24 11 8 11 0 0Z';
  var HEART = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
  var CSS = [
    '.cp{display:block;width:100%;height:auto;overflow:visible;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.cp .st{stroke:var(--line,#3d2420);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}',
    '.cp-sway,.cp-grow{transform-origin:50px 88px}',
    '.cp-grow{transform:scale(calc(.35 + var(--g,0)*.65));transition:transform .8s cubic-bezier(.3,1.4,.5,1)}',
    '.cp.run .cp-sway{animation:cp-sway 3.4s ease-in-out infinite}',
    '@keyframes cp-sway{50%{transform:rotate(4deg)}}',
    '.cp-leaf{transform-box:fill-box;transform-origin:0 50%;transform:scale(0);transition:transform .7s cubic-bezier(.3,1.8,.5,1)}',
    '.cp-leaf.on{transform:scale(1)}',
    '.cp-bud,.cp-flower{transform-box:fill-box;transform-origin:center;transform:scale(0)}',
    '.cp-bud{transition:transform .5s cubic-bezier(.3,1.8,.5,1)}.cp-bud.on{transform:scale(1)}',
    '.cp-flower{transition:transform .8s cubic-bezier(.3,1.9,.5,1) .15s}',
    '.cp.done .cp-flower{transform:scale(1)}.cp.done .cp-bud{transform:scale(0)}',
    '.cp-happy{display:none}.cp.done .cp-happy{display:inline}.cp.done .cp-eyes{display:none}',
    '.cp.wig{animation:cp-wig .6s}',
    '@keyframes cp-wig{30%{transform:rotate(-7deg)}60%{transform:rotate(6deg)}}',
    '.cp-heart{position:fixed;pointer-events:none;z-index:9999;line-height:0}.cp-heart svg{display:block;width:100%;fill:currentColor}',
    '@media (prefers-reduced-motion:reduce){.cp,.cp *{animation:none!important;transition:none!important}}'
  ].join('');

  function leaf(x, y, rot, s) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + s + ')"><g class="cp-leaf">' +
      '<path class="st" d="' + LEAF + '" fill="var(--secondary,#b8d4b4)"/><path d="M3 0H27" stroke="var(--line,#3d2420)" stroke-width="1.6" stroke-linecap="round"/></g></g>';
  }

  var SVG =
    '<svg class="cp" viewBox="0 0 100 130" role="img" aria-label="Study plant">' +
    '<ellipse cx="50" cy="127" rx="30" ry="3.5" fill="var(--soft,#ffd9e6)"/>' +
    '<g class="cp-sway"><g class="cp-grow">' +
    '<path class="st" d="M50 90C50 74 53 58 50 42" fill="none" stroke-width="3"/>' +
    leaf(50, 76, 150, 1) + leaf(50, 66, -28, 1) + leaf(50, 56, 200, 1) + leaf(50, 48, -55, .8) +
    '<circle class="st cp-bud" cx="50" cy="40" r="4.5" fill="var(--accent,#f684b0)"/>' +
    '<g class="cp-flower">' +
    '<circle class="st" cx="50" cy="26" r="7" fill="var(--accent,#f684b0)"/><circle class="st" cx="60" cy="33" r="7" fill="var(--accent,#f684b0)"/>' +
    '<circle class="st" cx="40" cy="33" r="7" fill="var(--accent,#f684b0)"/><circle class="st" cx="56" cy="20" r="7" fill="var(--accent,#f684b0)"/>' +
    '<circle class="st" cx="44" cy="20" r="7" fill="var(--accent,#f684b0)"/><circle class="st" cx="50" cy="28" r="6" fill="var(--soft,#ffd9e6)"/></g>' +
    '</g></g>' +
    '<rect class="st" x="23" y="84" width="54" height="13" rx="5" fill="var(--accent-strong,#d94b86)"/>' +
    '<path class="st" d="M28 97h44l-5 28H33Z" fill="var(--accent,#f684b0)"/>' +
    '<g class="cp-eyes"><circle cx="43" cy="109" r="2.2" fill="var(--line,#3d2420)"/><circle cx="57" cy="109" r="2.2" fill="var(--line,#3d2420)"/></g>' +
    '<path class="cp-happy" d="M40 110q3-5 6 0M54 110q3-5 6 0" fill="none" stroke="var(--line,#3d2420)" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M46 113q4 4 8 0" stroke="var(--line,#3d2420)" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="38" cy="113" rx="3.5" ry="2" fill="var(--accent-strong,#d94b86)" opacity=".55"/><ellipse cx="62" cy="113" rx="3.5" ry="2" fill="var(--accent-strong,#d94b86)" opacity=".55"/>' +
    '</svg>';

  function injectStyle() {
    if (document.getElementById('cramchy-plant-css')) return;
    var s = document.createElement('style'); s.id = 'cramchy-plant-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function hearts(svg) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var r = svg.getBoundingClientRect(), cols = ['#f684b0', '#d94b86', '#ffb3cf', '#ff7aa5'], n = 14;
    for (var i = 0; i < n; i++) {
      var e = document.createElement('span'); e.className = 'cp-heart';
      e.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + HEART + '"/></svg>';
      e.style.cssText = 'left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height * .25) + 'px;width:' + (10 + Math.random() * 12) + 'px;color:' + cols[i % 4];
      document.body.appendChild(e);
      var a = Math.PI * 2 * i / n + Math.random() * .5, d = 40 + Math.random() * 70;
      e.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + Math.cos(a) * d + 'px),calc(-50% + ' + (Math.sin(a) * d - 20) + 'px)) scale(1)', opacity: 1, offset: .6 },
        { transform: 'translate(calc(-50% + ' + Math.cos(a) * d * 1.2 + 'px),calc(-50% + ' + (Math.sin(a) * d * 1.2 + 30) + 'px)) scale(.3)', opacity: 0 }
      ], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = (function (el) { return function () { el.remove(); }; })(e);
    }
  }

  function mount(el, opts) {
    opts = opts || {};
    injectStyle();
    var holder = document.createElement('div'); holder.innerHTML = SVG;
    var svg = holder.firstChild; el.appendChild(svg);
    var leaves = svg.querySelectorAll('.cp-leaf'), bud = svg.querySelector('.cp-bud'), AT = [.12, .3, .5, .7], p = 0;
    if (opts.decorative) { svg.removeAttribute('role'); svg.setAttribute('aria-hidden', 'true'); }
    function apply() {
      svg.style.setProperty('--g', p);
      for (var i = 0; i < leaves.length; i++) leaves[i].classList.toggle('on', p >= AT[i]);
      bud.classList.toggle('on', p >= .88);
      if (!opts.decorative) svg.setAttribute('aria-label', 'Study plant, ' + Math.round(p * 100) + '% grown');
    }
    function wig() { svg.classList.remove('wig'); void svg.getBoundingClientRect(); svg.classList.add('wig'); }
    svg.addEventListener('click', wig);
    apply();
    return {
      el: svg,
      setProgress: function (v) { p = Math.max(0, Math.min(1, +v || 0)); if (p < 1) svg.classList.remove('done'); apply(); },
      setRunning: function (on) { svg.classList.toggle('run', !!on); },
      bloom: function (o) { p = 1; apply(); svg.classList.add('done'); svg.classList.remove('run'); if (!(o && o.silent)) hearts(svg); },
      reset: function () { p = 0; svg.classList.remove('done', 'run'); apply(); },
      destroy: function () { svg.remove(); }
    };
  }

  root.CramchyPlant = { mount: mount };
})(window);
