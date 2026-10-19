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

test('homepage versions the parent stylesheet so the shared fix cannot be held by an old cache key', () => {
 // Editorial generators may serialize '&' as '&amp;'. Verify the actual
 // browser URL, not the equivalent HTML spelling of the query separator.
 const { JSDOM } = require('jsdom');
 const dom = new JSDOM(read('index.html'), { url: 'https://matchapp.tv/' });
 try {
  const links = [...dom.window.document.querySelectorAll('link[rel="stylesheet"]')]
   .filter(link => new URL(link.href).pathname === '/brand.css');
  assert.equal(links.length, 1);
  const url = new URL(links[0].href);
  assert.equal(url.origin, 'https://matchapp.tv');
  assert.equal(url.searchParams.get('v'), '20261018-nativeheader1');
  assert.equal(url.searchParams.get('headerauth'), '20261016-1');
 } finally { dom.window.close(); }
});


test('editorial brand normalization retains the homepage cache key and is idempotent', () => {
 const { versionBrandStylesheet } = require('../tools/finalize-brand');
 const { JSDOM } = require('jsdom');
 for (const query of ['', '?v=195', '?v=20261015-spacing1', '?v=20261015-spacing1&headerauth=20261016-1', '?v=20261015-spacing1&amp;headerauth=20261016-1']) {
  const input='<link rel="stylesheet" href="/brand.css'+query+'"><script src="/app.js?v=unchanged"></script>';
  const output=versionBrandStylesheet(input,true);
  assert.equal(versionBrandStylesheet(output,true),output);
  assert.ok(output.endsWith('<script src="/app.js?v=unchanged"></script>'));
  const dom=new JSDOM(output,{url:'https://matchapp.tv/'});
  try { const url=new URL(dom.window.document.querySelector('link').href);
   assert.equal(url.searchParams.get('headerauth'),'20261016-1');
   assert.equal(url.searchParams.getAll('headerauth').length,1);
   assert.equal(url.searchParams.get('v'),'20261018-nativeheader1');
  } finally { dom.window.close(); }
 }
 const other='<link rel="stylesheet" href="/brand.css?v=20261015-spacing1">';
 assert.equal(versionBrandStylesheet(other,false),'<link rel="stylesheet" href="/brand.css?v=20261018-nativeheader1">');
 assert.ok(read('tools/finalize-brand.js').includes("html=versionBrandStylesheet(html,rel==='index.html');"));
});
