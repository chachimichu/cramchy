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

const elements = {motivationText: element(), pushBtn: element()};
const state = {motivationIndex: 0};
const randomValues = [0, .99];
let saves = 0;
const window = {CramchyModules: {}};
const context = vm.createContext({window, document: {getElementById: id => elements[id]}, Math, Number, globalThis: window});
vm.runInContext(fs.readFileSync('js/motivation.js', 'utf8'), context);

const feature = window.CramchyModules.motivation.init({
  getState: () => state,
  saveState: () => saves++,
  random: () => randomValues.shift(),
  messages: ['first message', 'second message']
});

feature.render();
assert.equal(elements.motivationText.textContent, 'first message');
elements.pushBtn.click();
assert.equal(state.motivationIndex, 1);
assert.equal(elements.motivationText.textContent, 'second message');
assert.equal(saves, 1);
feature.destroy();
assert.equal(elements.pushBtn.hasListener('click'), false);
console.log('PASS: Motivation render, new-message selection, save and cleanup');
