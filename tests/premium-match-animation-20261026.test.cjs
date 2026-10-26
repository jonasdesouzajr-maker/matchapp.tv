const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const source = fs.readFileSync('patches/premium-match-animation-20261026.js', 'utf8');
const home = fs.readFileSync('index.html', 'utf8');
const loader = home.match(/<article id="loading-box"[\s\S]*?<\/article>/)[0];
const tick = () => new Promise(resolve => setImmediate(resolve));
async function setup(path = '/') {
  const dom = new JSDOM(`<body class="page-home">${loader}<article id="result-box" hidden style="display:none"></article></body>`, {url:'https://matchapp.tv'+path, runScripts:'outside-only', pretendToBeVisual:true});
  const w = dom.window;
  const box = w.document.getElementById('loading-box');
  const reduced = {matches:false, addEventListener(_event, cb){this.change = cb;}};
  w.matchMedia = () => reduced;
  let pending = new Map(), draws = 0, cues = 0;
  w.requestAnimationFrame = cb => {const id = Math.random(); pending.set(id, cb); return id;};
  w.cancelAnimationFrame = id => pending.delete(id);
  w.HTMLCanvasElement.prototype.getContext = () => ({clearRect(){},beginPath(){},arc(){},fill(){draws++;}});
  w.playMatchAppSound = () => cues++;
  w.navigator.vibrate = () => cues++;
  box.getClientRects = () => box.style.display === 'none' || box.hidden ? [] : [{}];
  w.eval(source);
  await tick();
  const link = w.document.getElementById('premium-match-animation-css');
  return {dom,w,box,reduced,link,pending,get draws(){return draws;}, get cues(){return cues;}};
}
test('explicit Home wiring; donation shortcut no longer loads matching code', () => {
  assert.equal((home.match(/src="\/patches\/premium-match-animation-20261026.js\?/g)||[]).length, 1);
  assert.ok(!fs.readFileSync('patches/donate-shortcut.js','utf8').includes('premium-match-animation'));
});
test('upgrades only after CSS success; preserves translated text and core progress references', async () => {
  const s = await setup();
  try {
    const ids = ['ai-progress-bar','meter-pct','loading-headline','loading-substep'];
    const nodes = ids.map(id => s.w.document.getElementById(id));
    nodes[2].textContent = 'Buscando seu próximo match';
    assert.equal(s.box.dataset.premiumInjected, undefined);
    s.link.onload();
    ids.forEach((id,i) => assert.equal(s.w.document.getElementById(id), nodes[i]));
    assert.equal(nodes[2].textContent,'Buscando seu próximo match');
    nodes[0].style.width = '58%'; nodes[1].textContent = '58%';
    assert.equal(s.box.querySelector('.premium-meter-fill').style.width, '58%');
    s.w.eval(source); await tick();
    assert.equal(s.box.querySelectorAll('.premium-match-stage').length,1);
    assert.equal(s.w.document.querySelectorAll('#premium-match-animation-css').length,1);
  } finally {s.dom.window.close();}
});
test('one sparkle loop per visible search; no observer loop or duplicated feedback; stops and resumes for reduced motion', async () => {
  const s = await setup();
  try {
    s.link.onload();
    assert.equal(s.pending.size,0);
    s.box.style.display = 'block'; await tick();
    assert.equal(s.pending.size,1); assert.ok(s.draws > 0);
    s.box.style.opacity = '1'; await tick();
    assert.equal(s.pending.size,1);
    s.reduced.matches = true; s.reduced.change();
    assert.equal(s.pending.size,0);
    s.reduced.matches = false; s.reduced.change();
    assert.equal(s.pending.size,1);
    s.w.document.documentElement.classList.add('reduce-motion'); await tick();
    assert.equal(s.pending.size,0);
    s.w.document.documentElement.classList.remove('reduce-motion'); await tick();
    assert.equal(s.pending.size,1);
    s.box.hidden = true; await tick();
    assert.equal(s.pending.size,0);
    s.box.hidden = false; await tick();
    assert.equal(s.pending.size,1);
    s.box.style.display = 'none'; await tick();
    assert.equal(s.pending.size,0); assert.equal(s.cues,0);
  } finally {s.dom.window.close();}
});
test('does not activate on Kids paths even if loader markup exists', async () => {
  const s = await setup('/kids/');
  try { assert.equal(s.link,null); } finally {s.dom.window.close();}
});
