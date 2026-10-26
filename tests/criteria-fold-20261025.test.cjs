const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const home = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('criteria.js', 'utf8');
function setup() {
  const dom = new JSDOM(home, { url: 'https://matchapp.tv/', runScripts: 'outside-only' });
  dom.window.eval(script);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom;
}
test('every matching filter closes after selection, retaining title and selected choice', () => {
  const dom = setup(), w = dom.window;
  for (const sel of w.document.querySelectorAll('select[data-crit-mounted]')) {
    const wrap = sel.parentElement, toggle = wrap.querySelector('.crit-toggle'), panel = wrap.querySelector('.crit-chips');
    const title = wrap.querySelector('.crit-toggle-label').textContent;
    assert(title);
    assert.equal(panel.hidden, true);
    assert.equal(toggle.getAttribute('aria-controls'), panel.id);
    toggle.click();
    const chip = panel.querySelector('[data-value]'), choice = chip.textContent;
    chip.click();
    // The density enhancer must not force a closed panel back on screen.
    panel.dataset.maDensity = 'balanced';
    toggle.click();
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(panel.hidden, true);
    assert.equal(wrap.querySelector('.crit-toggle-label').textContent, title);
    assert(wrap.querySelector('.crit-toggle-summary').textContent.includes(choice));
    assert(!panel.matches('[data-ma-density="balanced"]:not([hidden])'));
    toggle.click();
    assert.equal(panel.hidden, false);
    assert.equal(panel.querySelector('[data-value].is-on').textContent, choice);
    toggle.click();
  }
  dom.window.close();
});
test('all selected names survive folding, rerender and language changes without badge digits in headings', () => {
  const dom = setup(), w = dom.window, wrap = w.document.querySelector('#q-mood').parentElement;
  w.setMatchCriteria({mood:['funny','romantic','light and feel-good']});
  w.setMatchCriteria({mood:['funny','romantic','light and feel-good']});
  const summary = wrap.querySelector('.crit-toggle-summary').textContent;
  for (const text of ['Laugh Out Loud','Romantic','Light']) assert(summary.includes(text));
  assert.equal(wrap.querySelector('.crit-toggle-label').textContent, 'Mood');
  wrap.querySelector('label').firstChild.textContent = 'Humor';
  w.document.querySelector('#q-mood option[value="funny"]').textContent = 'Rir muito';
  w.document.dispatchEvent(new w.Event('matchapp:langchange'));
  assert.equal(wrap.querySelector('.crit-toggle-label').textContent,'Humor');
  assert(wrap.querySelector('.crit-toggle-summary').textContent.includes('Rir muito'));
  assert.equal(wrap.querySelector('.crit-chips').hidden, true);
  dom.window.close();
});
test('all topics shortcut opens the same accessible panel', () => {
  const dom=setup(), w=dom.window;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.document.querySelector('[data-topic-more]').click();
  const wrap=w.document.querySelector('#q-category').parentElement;
  assert.equal(wrap.querySelector('.crit-chips').hidden,false);
  assert.equal(wrap.querySelector('.crit-toggle').getAttribute('aria-expanded'),'true');
  dom.window.close();
});
