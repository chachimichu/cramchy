const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../special-letter-v54.js'),'utf8');
assert(!source.includes("overlay.setAttribute('role','dialog')"),'Backdrop must not match relative-position dialog CSS');
assert(source.includes('class="cramchy-letter-card" role="dialog" aria-modal="true"'),'Inner card owns dialog semantics');
assert(source.includes('position:fixed;inset:0'),'Backdrop stays fixed');
assert(source.includes('100dvh'),'Use the mobile dynamic viewport');
assert(source.includes('overflow:auto;overscroll-behavior:contain'),'Only the letter card scrolls');
assert(source.includes('env(safe-area-inset-top'),'Respect iPhone/iPad safe areas');
console.log('Special letter: backdrop/card selector separation, dialog semantics, dynamic height, safe areas and internal scrolling passed.');
