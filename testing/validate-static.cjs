const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const localPath = value => value.split('?')[0].replace(/^\//, '');
const checked = new Set();

function requireFile(value, source) {
  if (!value || /^(?:https?:|data:|#)/.test(value)) return;
  const file = localPath(value);
  assert.ok(exists(file), `${source} references missing ${file}`);
  checked.add(file);
}

const index = read('index.html');
for (const match of index.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi)) {
  requireFile(match[1], 'index.html');
}

const app = read('app.js');
for (const match of app.matchAll(/['"]([^'"]+\.(?:js|css))(?:\?[^'"]*)?['"]/g)) {
  requireFile(match[1], 'app.js');
}

for (const cssFile of [...checked].filter(file => file.endsWith('.css'))) {
  for (const match of read(cssFile).matchAll(/@import\s+url\(["']?([^"')]+)["']?\)/g)) {
    requireFile(match[1], cssFile);
  }
}

const manifest = JSON.parse(read('site.webmanifest'));
for (const icon of manifest.icons || []) requireFile(icon.src, 'site.webmanifest');

console.log(`PASS: ${checked.size} declared local runtime assets exist`);
