const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'page-fluidity.css'),'utf8');
const js=fs.readFileSync(path.join(root,'page-fluidity.js'),'utf8');
const settings=fs.readFileSync(path.join(root,'settings.js'),'utf8');
const build=fs.readFileSync(path.join(root,'build-meta.js'),'utf8');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const roadmap=fs.readFileSync(path.join(root,'roadmap-runtime.css'),'utf8');
const discoverHtml=fs.readFileSync(path.join(root,'discover.html'),'utf8');
const discoverJs=fs.readFileSync(path.join(root,'discover.js'),'utf8');
const kidsCss=fs.readFileSync(path.join(root,'kids/kids.css'),'utf8');
const kidsJs=fs.readFileSync(path.join(root,'kids/kids.js'),'utf8');

test('every page loads fluidity CSS and JS',()=>{
  assert.match(settings,/page-fluidity\.css/);
  assert.match(settings,/page-fluidity\.js/);
  assert.match(settings,/20260918-onboard1/);
});

test('startup no longer staggers home scripts by more than a frame',()=>{
  assert.match(build,/HOME STARTUP SCHEDULER/);
  assert.match(build,/restoreNativeListener/);
  assert.doesNotMatch(build,/1500,60\+\(slot\+\+\*85\)/);
  assert.match(build,/Math\.min\(72,slot\+\+\*12\)/);
});

test('page motion uses native momentum and does not hide cards until they are scrolled to',()=>{
  assert.match(css,/overflow-x:\s*clip/);
  assert.match(css,/-webkit-overflow-scrolling:\s*touch/);
  assert.match(css,/scroll-snap-type:\s*x proximity/);
  assert.match(css,/\.fade-in:not\(#res-poster-img\)/);
  assert.match(css,/animation:\s*none/);
  assert.match(css,/prefers-reduced-motion:\s*reduce/);
  assert.match(css,/pointer:\s*coarse/);
  assert.match(js,/loading='eager'/);
  assert.match(js,/rootMargin:'1200px 640px'/);
  assert.match(js,/deltaY/);
  assert.match(js,/MutationObserver/);
  assert.match(home,/rootMargin: '120% 0px'/);
  assert.match(roadmap,/content-visibility:\s*visible/);
  assert.doesNotMatch(js,/requestAnimationFrame\s*\(/);
});

test('ask AI and kids cards paint immediately instead of staggering in',()=>{
  assert.doesNotMatch(discoverHtml,/animation:\s*cardIn/);
  assert.doesNotMatch(discoverJs,/animation-delay:\$\{idx \* 70\}ms/);
  assert.doesNotMatch(kidsCss,/animation:arrive \.45s both/);
  assert.match(kidsJs,/rootMargin:'900px 200px'/);
});
