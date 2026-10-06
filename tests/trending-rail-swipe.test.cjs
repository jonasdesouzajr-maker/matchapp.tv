const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('weekly rail defines its label and leaves motion to the shared native rail controller',()=>{
  const src=fs.readFileSync('trending-rail.js','utf8');
  const shown=src.indexOf('const shown=');
  const use=src.indexOf("setAttribute('aria-label',shown)");
  assert.ok(shown>0&&use>shown,'label is defined before it is used');
  assert.doesNotMatch(src,/setInterval\(|scrollLeft\+=1\.1|function start\(vp\)/,'weekly renderer must not run a second autoplay loop');
  assert.doesNotMatch(src,/style\.touchAction|style\.overflowX/,'weekly renderer must not override native swipe behavior');
  assert.match(src,/requestAnimationFrame\(\(\)=>window\.dispatchEvent\(new Event\('resize'\)\)\)/,'repaint resyncs the shared loop seam');
  assert.match(src,/filter\(item=>item\?\.kind!=='music-video'\)/,'generic rail excludes music videos');
  assert.match(src,/matchapp:trendingpainted/,'weekly repaint notifies the verified music-card renderer');
});
