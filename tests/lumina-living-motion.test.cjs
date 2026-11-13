const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../lumina-match/browser/living-world.js'), 'utf8');
function harness(t, reduced = false, width=120, height=180, art='lantern') {
  const dom = new JSDOM('<div id="app"><div class="board-area"><button class="card flipped" data-card="0"><span class="front" style="background-image:url(lantern.jpg)"></span></button></div></div>', {runScripts:'outside-only', pretendToBeVisual:true, url:'https://example.test/'});
  t.after(() => dom.window.close());
  const w = dom.window, queue = new Map(), draws=[]; let serial=0, paints=0;
  w.document.querySelector('.front').style.backgroundImage='url('+art+'.jpg)';
  const media = {matches:reduced, addEventListener(){}};
  w.matchMedia = () => media;
  w.requestAnimationFrame = fn => {queue.set(++serial,fn);return serial;};
  w.cancelAnimationFrame = id => queue.delete(id);
  const ctx = new Proxy({}, {get:(_,p) => p==='createLinearGradient'||p==='createRadialGradient' ? () => ({addColorStop(){}}) : p==='drawImage' ? (...args) => {paints++;draws.push(args.slice(5));} : () => {}});
  w.HTMLCanvasElement.prototype.getContext = () => ctx;
  w.Image = class { complete=true; naturalWidth=120; naturalHeight=180; };
  Object.defineProperties(w.HTMLElement.prototype, {clientWidth:{get:()=>width},clientHeight:{get:()=>height}});
  w.HTMLElement.prototype.getBoundingClientRect=()=>({width,height});
  w.eval(source);
  const flush=async()=>{await Promise.resolve();await Promise.resolve();};
  const frame=async now=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(f=>f(now));await flush();};
  return {w,queue,draws,frame,flush,media,get paints(){return paints;}};
}
test('living artwork preserves card identity and survives a board rerender without duplicate canvases', async t=>{
  const h=harness(t);await h.frame(100);const card=h.w.document.querySelector('.card');
  assert.equal(card.dataset.card,'0');assert.equal(card.querySelectorAll('canvas').length,1);assert.ok(h.paints>0);
  assert.match(card.querySelector('.front').style.backgroundImage,/lantern.jpg/);
  h.w.document.querySelector('.board-area').innerHTML=card.outerHTML;await h.flush();await h.frame(200);
  assert.equal(h.w.document.querySelectorAll('.lm-living-world').length,1);
  assert.equal(h.w.document.querySelectorAll('.card canvas').length,1);
});
test('paused board stops the frame loop and resume restarts it',async t=>{
  const h=harness(t);await h.frame(100);assert.equal(h.queue.size,1);
  h.w.document.querySelector('.board-area').classList.add('is-paused');await h.flush();await h.frame(200);
  assert.equal(h.queue.size,0);assert.ok(h.w.document.documentElement.classList.contains('lm-world-paused'));
  h.w.document.querySelector('.board-area').classList.remove('is-paused');await h.flush();await h.frame(300);
  assert.equal(h.queue.size,1);
});
test('reduced motion renders a readable face once without a continuous loop',async t=>{
  const h=harness(t,true);await h.frame(100);await h.frame(200);
  assert.equal(h.queue.size,0);assert.ok(h.paints>0);
});
test('pagehide cancels queued work and bfcache restoration creates one active loop',async t=>{
  const h=harness(t);await h.frame(100);h.w.dispatchEvent(new h.w.PageTransitionEvent('pagehide'));
  assert.equal(h.queue.size,0);h.w.dispatchEvent(new h.w.PageTransitionEvent('pageshow',{persisted:true}));await h.frame(200);
  assert.equal(h.queue.size,1);assert.equal(h.w.document.querySelectorAll('.card canvas').length,1);
});
test('animated and still faces cover the complete card without open gutters or gaps',async t=>{
  for(const reduced of [false,true])for(const [width,height] of [[48,72],[120,180],[300,450],[110,143]])for(const art of ['butterfly','ocean','fern','lantern']){
    const h=harness(t,reduced,width,height,art);
    for(let now=100;now<=500;now+=100){
      h.draws.length=0;await h.frame(now);
      if(!h.draws.length)continue;
      const canvas=h.w.document.querySelector('.front canvas');
      let bottom=0;
      for(let row=0;row<h.draws.length;row+=3){
        const parts=h.draws.slice(row,row+3);
        assert.ok(parts[0][0]<=0.001,'left edge covered');
        assert.ok(parts[2][0]+parts[2][2]>=canvas.width,'right edge covered');
        assert.ok(parts[0][1]<=bottom+.001,'no vertical gaps');
        for(let k=1;k<3;k++)assert.ok(parts[k-1][0]+parts[k-1][2]>=parts[k][0],'no internal gaps');
        bottom=parts[0][1]+parts[0][3];
      }
      assert.ok(bottom>=canvas.height,'bottom edge covered');
    }
  }
});
