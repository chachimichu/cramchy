const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const elements = {streakDisplay: {textContent: ''}, mascotCommentary: {textContent: ''}};
const state = {studyHistory: [
  {timestamp: Date.parse('2026-09-16T08:00:00Z')},
  {timestamp: Date.parse('2026-09-15T08:00:00Z')},
  {timestamp: Date.parse('2026-09-14T08:00:00Z')}
]};
const window = {CramchyModules: {}};
const context = vm.createContext({window, document: {getElementById: id => elements[id]}, Date, Set, Array, globalThis: window});
vm.runInContext(fs.readFileSync('js/streak.js', 'utf8'), context);

const feature = window.CramchyModules.streak.init({
  getState: () => state,
  now: () => new Date('2026-09-16T12:00:00Z')
});

assert.equal(feature.calculate(), 3);
feature.render();
assert.equal(elements.streakDisplay.textContent, '3 day streak');
assert.equal(elements.mascotCommentary.textContent, 'look at you, actually consistent ♡');
state.studyHistory = [];
feature.render();
assert.equal(elements.streakDisplay.textContent, '0 day streak');
assert.equal(elements.mascotCommentary.textContent, 'start today. matcha is watching.');
console.log('PASS: Streak consecutive-day calculation and commentary states');
