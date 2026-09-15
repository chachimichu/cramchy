const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const refs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
assert.equal(refs.length, 2);
for (const route of ['/testing', '/testing/', '/testing/index.html']) {
  for (const ref of refs) {
    const url = new URL(ref, 'https://example.test' + route);
    assert.ok(url.pathname.startsWith('/testing/'), route + ': wrong script directory');
    assert.ok(fs.existsSync(path.join(root, url.pathname)), 'Missing script: ' + url.pathname);
  }
}
console.log('PASS: test scripts resolve for clean URL, trailing slash, and index.html routes');
