const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const block = css => {
  const a = css.indexOf('/* MA-DEPTH-3D:START');
  const b = css.indexOf('/* MA-DEPTH-3D:END */');
  assert.ok(a > -1 && b > a, 'depth block markers present');
  return css.slice(a, b);
};

test('3D depth layer is identical in style.css and brand.css', () => {
  assert.strictEqual(block(read('style.css')), block(read('brand.css')));
});

test('3D depth layer stays static and never touches visibility or layout', () => {
  const css = block(read('style.css'));
  assert.match(css, /@layer ma-depth\s*\{/);
  assert.doesNotMatch(css, /@keyframes|animation\s*:|infinite|filter\s*:|backdrop-filter|will-change/);
  // Script-driven show/hide and page layout must never be overridden from here.
  assert.doesNotMatch(css, /(^|[\s;{])(display|visibility|position|width|height|margin|padding|top|left|z-index)\s*:/m);
  // A guard list must be joined to its selector, never a descendant combinator.
  assert.doesNotMatch(css, /\)\s+:where\(:not/);
  // Motion is hover-only for mouse devices and respects reduced motion.
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\)/);
});

test('Home header respects the guest state for the avatar and logout controls', () => {
  const ia = read('matchapp-ia.css');
  assert.match(ia, /#nav-logout-btn\):not\(\[hidden\]\):not\(\[style\*="display: none"\]\):not\(\[style\*="display:none"\]\)\{display:grid!important\}/);
  const html = read('index.html');
  const rule = html.match(/a#profile-link-tab\.nav-avatar-link\{[^}]*\}/);
  assert.ok(rule, 'home avatar rule present');
  assert.doesNotMatch(rule[0], /display\s*:/);
});
