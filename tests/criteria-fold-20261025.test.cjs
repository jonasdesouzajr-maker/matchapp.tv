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

test('opening another criterion folds the previous panel without losing selections', () => {
 const dom=setup(), w=dom.window;
 w.setMatchCriteria({mood:['romantic'],cat:['movie']});
 const mood=w.document.querySelector('#q-mood').parentElement;
 const cat=w.document.querySelector('#q-category').parentElement;
 mood.querySelector('.crit-toggle').click();
 cat.querySelector('.crit-toggle').click();
 assert.equal(mood.querySelector('.crit-chips').hidden,true);
 assert.equal(mood.querySelector('.crit-toggle').getAttribute('aria-expanded'),'false');
 assert.equal(cat.querySelector('.crit-chips').hidden,false);
 assert.deepEqual(Array.from(w.getMatchCriteria().mood),['romantic']);
 assert.deepEqual(Array.from(w.getMatchCriteria().cat),['movie']);
 dom.window.close();
});


test('parsed Home mounts filters before DOMContentLoaded and late startup cannot discard an early selection',()=>{
 const dom=new JSDOM(home,{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 try{
  assert.equal(w.document.readyState,'loading');
  w.localStorage.setItem('match_criteria_v1',JSON.stringify({cat:['movie'],mood:['romantic'],plat:['Netflix']}));
  w.eval(script);
  const toggle=w.document.querySelector('#q-mood').parentElement.querySelector('.crit-toggle');
  assert.ok(toggle,'early controls must not wait for optional scripts or DOMContentLoaded');
  assert.deepEqual(Array.from(w.getMatchCriteria().mood),['romantic']);
  toggle.click();
  w.document.querySelector('#q-mood').parentElement.querySelector('[data-value="funny"]').click();
  const choices=JSON.stringify(w.getMatchCriteria());
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  assert.equal(JSON.stringify(w.getMatchCriteria()),choices);
  assert.equal(w.document.querySelector('#q-mood').parentElement.querySelector('.crit-toggle'),toggle);
  assert.equal(w.document.querySelector('#q-category').value,'movie');
 }finally{w.close();}
});
test('Home preloads its sole criteria runtime and mounts it immediately after the matching owner',()=>{
 const dom=new JSDOM(home),doc=dom.window.document;
 try{
  const scripts=[...doc.querySelectorAll('script[src]')];
  const criteria=scripts.filter(s=>s.getAttribute('src').startsWith('/criteria.js?'));
  assert.equal(criteria.length,1);
  const at=scripts.indexOf(criteria[0]);
  assert.match(scripts[at-1].getAttribute('src'),/^\/app\.js\?/);
  assert.ok(at<scripts.findIndex(s=>s.getAttribute('src').startsWith('/ebooks/catalog.js?')));
  assert.equal(doc.querySelector('link[rel="preload"][href^="/criteria.js?"]').getAttribute('href'),criteria[0].getAttribute('src'));
 }finally{dom.window.close();}

});
