/* Browser-only Lumina integration regressions. Do not modify AdSense/Kids/native contracts. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');
const html = read('index.html');
const launcher = read('lumina-match/launcher.js');
const css = read('lumina-match/lumina.css');

test('new assets are loaded only by browser homepage, without extra Lumina route',()=>{
  assert.equal((html.match(/\/lumina-match\/launcher\.js/g)||[]).length,1);
  assert.equal((html.match(/\/lumina-match\/lumina\.css/g)||[]).length,1);
  assert.match(launcher,/nativeShell\(\)/);
  assert.match(launcher,/MatchAppTVAndroid/);
  assert.match(launcher,/matchapp-android/);
  assert.match(launcher,/import\('\/lumina-match\/game\.mjs/);
  assert.match(launcher,/hero\.insertAdjacentElement\('afterend', tray\)/);
  assert.match(launcher,/disposeGame/);
  assert.match(launcher,/previousFocus/);
  assert.match(launcher,/body\.style\.overflow/);
  assert.doesNotMatch(read('android/index.html'),/lumina-match/);
  assert.doesNotMatch(read('kids/index.html'),/lumina-match/);
});
test('premium game pill uses a compact dedicated grid and responsive labels',()=>{
  assert.match(css,/grid-template-columns:max-content!important/);
  assert.match(css,/width:max-content!important/);
  assert.match(css,/\.ma-luxe-text/);
  assert.match(css,/@media\(max-width:480px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('all actual card paths used by the browser game exist',()=>{
  const source=read('lumina-match/game.mjs');
  const start=source.indexOf('const ASSETS = [');
  const end=source.indexOf('];',start);
  assert.ok(start>0&&end>start);
  const assets=[...source.slice(start,end).matchAll(/'([a-z0-9_]+\.(?:jpg|webp))'/g)].map(m=>m[1]);
  assert.ok(assets.length>=40);
  for(const name of ['back.jpg',...assets])assert.ok(fs.existsSync(path.join(ROOT,'lumina-match/assets/card_'+name)),'Missing '+name);
});
test('game logic supports 350 levels and valid matching pairs',async()=>{
  const game=await import('../lumina-match/game.mjs');
  assert.equal(game.MAX_LEVEL,350);
  assert.deepEqual(game.levelSpec(1),{level:1,pairs:4,seconds:55,columns:3});
  assert.equal(game.levelSpec(350).pairs,12);
  assert.equal(game.levelSpec(9999).level,350);
  assert.equal(game.levelSpec(-5).level,1);
  const deck=game.shuffledCards(['panda','moon','star','owl','sun'],4,()=>.31);
  assert.equal(deck.length,8);
  assert.equal(new Set(deck.map(c=>c.id)).size,8);
  const counts=new Map();
  for(const card of deck) counts.set(card.art,(counts.get(card.art)||0)+1);
  assert.equal(counts.size,4);
  for(const count of counts.values())assert.equal(count,2);
  assert.throws(()=>game.shuffledCards(['a','a'],2),/Insufficient/);
});
test('ads do not mutate locked MatchApp Ai AdSense owner or slots',()=>{
  const sources=launcher+css+read('lumina-match/game.mjs');
  assert.doesNotMatch(sources,/adsbygoogle|ca-pub-9541435081010948|2595698117|googletag/);
  assert.doesNotMatch(sources,/android-studio|\/kids\//);
});