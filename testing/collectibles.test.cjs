const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const grid = {innerHTML: 'old', children: [], appendChild(item){ this.children.push(item); }};
const window = {CramchyModules: {}};
const document = {
  getElementById: id => id === 'collectiblesGrid' ? grid : null,
  createElement: () => ({className: '', textContent: ''})
};
const context = vm.createContext({window, document, Math, Number, Array, globalThis: window});
vm.runInContext(fs.readFileSync('js/collectibles.js', 'utf8'), context);

const feature = window.CramchyModules.collectibles.init({
  getCompletedCount: () => 7,
  icons: ['one', 'two', 'three', 'four']
});
feature.render();
assert.equal(grid.innerHTML, '');
assert.equal(grid.children.length, 4);
assert.equal(grid.children.filter(item => item.className.includes('unlocked')).length, 2);
assert.equal(grid.children[0].textContent, 'one');
console.log('PASS: Collectibles unlock one item per three completed topics');
