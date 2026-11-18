const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const css = fs.readFileSync(require.resolve('../patches/home-center-grid-20261118.css'), 'utf8');
const js = fs.readFileSync(require.resolve('../patches/home-center-grid-20261118.js'), 'utf8');
const adult = fs.readFileSync(require.resolve('../patches/jonas-adult-page.js'), 'utf8');
const home = fs.readFileSync(require.resolve('../index.html'), 'utf8');

test('home center rules join ma-reference and do not resize ad rails', () => {
  assert.match(css, /@layer ma-reference/);
  assert.match(css, /--home-grid-offset:\s*0px !important/);
  assert.match(css, /--home-grid-width:\s*100% !important/);
  assert.match(css, /margin-inline-start:\s*0 !important/);
  assert.match(css, /#lm-launch-grid#lm-launch-grid #lm-launch#lm-launch\.lm-launch/);
  assert.match(css, /poster-wall\.poster-wall/);
  assert.match(css, /animation:\s*none !important/);
  assert.match(css, /min-height:\s*clamp\(128px, 15vw, 188px\)/);
  assert.doesNotMatch(css, /grid-template-columns/);
  assert.doesNotMatch(css, /sidebar-ad/);
  const embedded = JSON.parse(js.match(/var CSS = ("(?:\\.|[^"])*");/)[1]);
  assert.equal(embedded, css);
  assert.match(adult, /home-center-grid-20261118\.js\?v=20261118-4/);
  assert.match(home, /jonas-adult-page\.js\?v=20261118-grid4/);
  assert.match(home, /top-titles-draft\.js\?v=20261118-left1/);
  assert.match(home, /top-titles-draft\.css\?v=20261118-left1/);
});
