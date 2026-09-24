const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const html=read('index.html'), css=read('matchapp-ia.css');
const patch=css.slice(css.indexOf('/* Homepage Ask Ai: keep all three controls'));
test('homepage Ask Ai has a dedicated composer without changing submit or voice IDs',()=>{
  const block=html.slice(html.indexOf('<article id="search-box"'),html.indexOf('</article>',html.indexOf('<article id="search-box"')));
  assert.match(block, /class="home-ask-composer"/);
  assert.match(block, /id="specific-search-input"/);
  assert.match(block, /id="mic-btn-index"/);
  assert.match(block, /onclick="smartSearch\(\)"/);
  assert.match(block, /onkeydown="if\(event.key==='Enter'\) smartSearch\(\)"/);
});
test('mobile input and mic occupy row one and Send occupies row two',()=>{
  assert.match(patch, /@media\(max-width:640px\)/);
  assert.match(patch, /grid-template-areas:"input mic" "send send"!important/);
  assert.match(patch, /#specific-search-input\{\s*grid-area:input!important/);
  assert.match(patch, /#mic-btn-index\{\s*grid-area:mic!important/);
  assert.match(patch, /\.gold-btn\{\s*grid-area:send!important/);
  assert.match(patch, /gap:10px!important/);
});
test('composer controls cannot stick, translate or animate across each other',()=>{
  const controls=patch.slice(patch.indexOf('> :is(input,button){'),patch.indexOf('> #specific-search-input{'));
  for(const rule of ['position:static!important','inset:auto!important','transform:none!important','translate:none!important','animation:none!important','transition:none!important']){
    assert.ok(controls.includes(rule),rule);
  }
  assert.doesNotMatch(patch, /position:(?:sticky|fixed|absolute)/);
  assert.doesNotMatch(patch, /(?:100vh|100dvh|overflow:hidden)/);
});
test('phone typing retains readable text, caret, sizing and contrast',()=>{
  for(const rule of ['color:#fff!important','-webkit-text-fill-color:#fff!important','caret-color:#ffe18a!important','font-size:16px!important','background:#171126!important','min-width:0!important','height:56px!important']){
    assert.ok(patch.includes(rule),rule);
  }
});
test('homepage requests a new stylesheet URL for the mobile composer release',()=>{
  assert.match(html,/\/matchapp-ia\.css\?v=\d{8}-[\w-]+/);
});
