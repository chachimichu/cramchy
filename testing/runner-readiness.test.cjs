const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const runner = fs.readFileSync(path.join(__dirname, 'runner.js'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const waitCall = runner.indexOf('await waitForAppReady()');
const readyMessage = runner.indexOf("status.textContent='Test session ready.");

assert.ok(runner.includes('appWindow?.__cramchyBaseReady'), 'runner must wait for the app base readiness promise');
assert.ok(waitCall >= 0, 'runner must await app readiness');
assert.ok(readyMessage > waitCall, 'runner must not announce readiness before the wait finishes');
assert.ok(runner.includes("frame.classList.add('is-loading')"), 'runner must block iframe interaction while loading');
assert.ok(runner.includes("frame.classList.remove('is-loading')"), 'runner must restore iframe interaction afterward');
assert.match(index, /iframe\.is-loading\{[^}]*pointer-events:none/, 'loading iframe must ignore taps');

console.log('PASS: test runner waits for Cramchy before enabling interaction');
