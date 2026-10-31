'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const {render, apps} = require('../tools/founder-testing.cjs');
const {invite} = require('../tools/founder-tester-invite.cjs');
const words = require('../data/founder-testing.json');
const script = fs.readFileSync(require.resolve('../patches/founder-testing.js'), 'utf8');

function page(roster) {
  const dom = new JSDOM('<main><a href="#closed-testing" data-test-app="reelforge">Test</a>' + render() + '</main>', {url:'https://matchapp.tv/founder/', runScripts:'outside-only'});
  const d = dom.window.document;
  if (roster) {
    const config = d.querySelector('#founder-testing-config');
    const data = JSON.parse(config.textContent);
    data.groups.reelforge = roster;
    config.textContent = JSON.stringify(data);
  }
  dom.window.eval(script);
  return dom;
}
test('application composes one chosen app with matching Gmail and explicit consent', () => {
  const dom = page(), w = dom.window, d = w.document;
  const form = d.querySelector('form');
  assert.equal(form.action, 'https://mail.google.com/mail/');
  assert.equal(form.querySelector('[name="to"]').value, 'support@matchapp.tv');
  d.querySelector('[data-test-app]').click();
  assert.equal(d.querySelector('select').value, 'reelforge');
  assert.equal(d.querySelector('#tester-optin').href, 'https://play.google.com/apps/testing/com.reelforge.cinemaclash');
  assert.ok(!form.checkValidity());
  d.querySelector('input[type=email]').value = 'unit+local@gmail.com';
  assert.ok(!form.checkValidity());
  d.querySelector('[type=checkbox]').checked = true;
  assert.ok(form.checkValidity());
  form.dispatchEvent(new w.Event('submit', {cancelable:true}));
  const payload = new w.URLSearchParams(new w.FormData(form));
  assert.equal(payload.get('su'), 'Founder closed testing | ReelForge: Cinema Clash');
  assert.ok(payload.get('body').includes('App: reelforge\nGmail: unit+local@gmail.com\nLanguage: en\nConsent: yes'));
  d.querySelector('input[type=email]').value = 'unit@example.org';
  assert.ok(!form.checkValidity());
  dom.window.close();
});
test('embedded roster text cannot become a navigable group URL', () => {
  const dom = page('https://groups.google.com/g/example-verified-roster'), w = dom.window, d = w.document;
  d.querySelector('[data-test-app]').click();
  assert.ok(d.querySelector('#tester-group').hidden);
  assert.ok(!d.querySelector('#tester-existing').hidden);
  assert.ok(!d.querySelector('#tester-group-link').hasAttribute('href'));
  assert.equal(d.querySelector('#tester-optin').href, 'https://play.google.com/apps/testing/com.reelforge.cinemaclash');
  const select = d.querySelector('select');
  select.value = 'lumina';
  select.dispatchEvent(new w.Event('change'));
  assert.equal(d.querySelector('#tester-optin').href, 'https://play.google.com/apps/testing/com.jonas.luminamatch');
  dom.window.close();
});
test('all application languages and invitation formats have app-scoped Google links and assets', () => {
  const dom = page(), w = dom.window, d = w.document;
  for (const [locale, strings] of Object.entries(words)) {
    w.MATCH_LANG = locale; d.dispatchEvent(new w.Event('matchapp:langchange'));
    for (const n of d.querySelectorAll('[data-tester-copy]')) assert.equal(n.textContent, strings[n.dataset.testerCopy]);
    for (const [id, app] of Object.entries(apps)) {
      const email = invite(id, locale);
      assert.ok(email.text.includes('/apps/testing/' + app.package));
      assert.ok(email.text.includes('/store/apps/details?id=' + app.package));
      const parsed = new JSDOM(email.html);
      assert.equal(parsed.window.document.querySelectorAll('img').length, 2);
      assert.ok(email.text.includes('14'));
      const other = Object.entries(apps).find(([key]) => key !== id)[1];
      assert.ok(!email.html.includes(other.package));
      parsed.window.close();
    }
  }
  assert.throws(() => invite('unknown','en'));
  dom.window.close();
});