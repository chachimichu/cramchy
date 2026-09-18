const assert=require('node:assert/strict');
const fs=require('node:fs');

const index=fs.readFileSync('index.html','utf8');
const runner=fs.readFileSync('testing/runner.js','utf8');

const analyticsTags=[...index.matchAll(/<script\b[^>]*src=["']\/_vercel\/insights\/script\.js["'][^>]*><\/script>/gi)];
assert.equal(analyticsTags.length,1,'production shell must load Vercel Web Analytics exactly once');
assert.match(analyticsTags[0][0],/\bdefer\b/i,'analytics script must not block app rendering');
assert.match(analyticsTags[0][0],/data-cramchy-analytics=["']pageviews["']/i,'analytics script should be identifiable during maintenance');
assert.ok(runner.includes("url.pathname!=='/_vercel/insights/script.js'"),'synthetic test app must exclude analytics');
console.log('PASS: Vercel Web Analytics is installed once and excluded from synthetic test traffic');
