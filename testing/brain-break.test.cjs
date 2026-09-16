const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function element(){
  const listeners = {};
  return {
    textContent: '',
    addEventListener: (name, fn) => { listeners[name] = fn; },
    removeEventListener: (name, fn) => { if(listeners[name] === fn) delete listeners[name]; },
    click: () => listeners.click?.(),
    hasListener: name => !!listeners[name]
  };
}

const elements = {breakDisplay: element(), breakStartBtn: element(), breakResetBtn: element()};
let tick;
let clears = 0;
const toasts = [];
const window = {CramchyModules: {}, setInterval: fn => (tick = fn, 7), clearInterval: () => clears++};
const context = vm.createContext({window, document: {getElementById: id => elements[id]}, String, globalThis: window});
vm.runInContext(fs.readFileSync('js/brain-break.js', 'utf8'), context);

const feature = window.CramchyModules.brainBreak.init({
  showToast: message => toasts.push(message),
  durationSeconds: 2,
  setIntervalFn: window.setInterval,
  clearIntervalFn: window.clearInterval
});

feature.render();
assert.equal(elements.breakDisplay.textContent, '00:02');
elements.breakStartBtn.click();
assert.equal(feature.snapshot().running, true);
tick();
assert.equal(elements.breakDisplay.textContent, '00:01');
tick();
assert.equal(elements.breakDisplay.textContent, '00:02');
assert.equal(feature.snapshot().running, false);
assert.match(toasts.at(-1), /break over/);
elements.breakStartBtn.click();
elements.breakStartBtn.click();
assert.equal(feature.snapshot().running, false);
elements.breakResetBtn.click();
assert.equal(elements.breakDisplay.textContent, '00:02');
feature.destroy();
assert.equal(elements.breakStartBtn.hasListener('click'), false);
assert.equal(elements.breakResetBtn.hasListener('click'), false);
assert.ok(clears >= 2);
console.log('PASS: Brain break start, tick, completion, pause, reset and cleanup');
