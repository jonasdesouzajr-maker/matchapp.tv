'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('shared header presentation does not force the sign-in control over account state', () => {
 const css = read('patches/adult-screen-fit-20261015.css');
 const rule = css.match(/html body\.page-home #mh-topbox #nav-reg-btn\{([^}]+)\}/);
 assert.ok(rule, 'Shared sign-in presentation rule remains available');
 assert.doesNotMatch(rule[1], /display\s*:\s*flex\s*!important/);
 assert.match(rule[1], /display\s*:\s*flex\s*;/);
});

test('hidden account controls stay out of layout across every shared adult header', () => {
 const css = read('patches/adult-screen-fit-20261015.css');
 const guard = css.slice(css.indexOf('/* Authentication owns visibility.'));
 assert.match(guard, /@layer ma-screen-fit/);
 assert.match(guard, /body:not\(\.page-kids\):not\(\.kids-body\) \.app-header/);
 assert.match(guard, /:is\(#nav-reg-btn,#nav-logout-btn,#profile-link-tab\)/);
 for (const flag of ['[hidden]', '[style*="display: none"]', '[style*="display:none"]']) assert.ok(guard.includes(flag));
 assert.match(guard, /display:none!important/);
 assert.doesNotMatch(guard, /pointer-events:none|opacity:0|visibility:hidden/);
});

test('shared stylesheet refresh is versioned without changing authentication handlers', () => {
 assert.ok(read('brand.css').includes('/patches/adult-screen-fit-20261015.css?v=consistency2&auth=20261016-1'));
 const app = read('app.js');
 assert.ok(app.includes("if (regBtn) regBtn.style.display = 'none';"));
 assert.ok(app.includes("if (regBtn) regBtn.style.display = 'inline-flex';"));
 assert.ok(app.includes("if (outBtn) outBtn.style.display = 'none';"));
});
