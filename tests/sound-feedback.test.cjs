const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('adult sound control uses a centered speaker state icon instead of a music mark',()=>{
  const app=read('app.js'),css=read('matchapp-ia.css');
  assert.match(app,/function soundIconMarkup\(enabled\)/);
  assert.match(app,/sound-state-icon/);
  assert.match(app,/sound-speaker/);
  assert.match(app,/sound-wave/);
  assert.match(app,/sound-slash/);
  assert.doesNotMatch(app,/class=\\"sound-star\\"/);
  assert.match(css,/MA-SOUND-CONTROL:START/);
  assert.match(css,/sound-toggle-btn::before,[\s\S]*sound-toggle-btn::after\{[\s\S]*content:none!important;[\s\S]*display:none!important;/);
  assert.match(css,/sound-state-icon\{[\s\S]*place-items:center!important;[\s\S]*margin:auto!important;/);
});

test('adult interaction sounds are categorized and the result reveal is quiet and distinct',()=>{
  const app=read('app.js'),ia=read('matchapp-ia.js');
  for(const key of ['tap','nav','select','tab','open','primary','share','save','like','back','result','together','soundOn']){
    assert.match(app,new RegExp('\\b'+key+':\\s*\\['),key+' cue missing');
  }
  assert.match(app,/window\.playMatchAppSound\?\.\('result'\)/);
  assert.match(app,/window\.playMatchAppSound\?\.\('like'\)/);
  assert.match(app,/window\.playMatchAppSound\?\.\('nav'\)/);
  assert.doesNotMatch(app,/gain\.gain\.setValueAtTime\(0\.09/);
  assert.doesNotMatch(app,/gain\.gain\.setValueAtTime\(0\.28/);
  assert.match(ia,/target\.closest\('\.app-header'\)/);
  assert.match(ia,/kind='share'/);
  assert.match(ia,/kind='like'/);
  assert.match(ia,/kind='save'/);
  assert.match(ia,/kind='back'/);
  assert.match(ia,/kind='primary'/);
});

test('adult entry pages invalidate cached sound runtime without changing top-box structure',()=>{
  for(const page of ['index.html','discover.html','together.html']){
    const html=read(page);
    assert.match(html,/\/app\.js\?v=[^"']*sound=20261001-modern1/);
    assert.match(html,/\/matchapp-ia\.js\?v=[^"']*sound=20261001-modern1/);
    assert.match(html,/\/matchapp-ia\.css\?v=[^"']*sound=20261001-modern1/);
  }
  const home=read('index.html');
  assert.match(home,/class="sound-toggle-btn" onclick="toggleSound\(\)"/);
  assert.match(home,/class="mh-deck"/);
});
