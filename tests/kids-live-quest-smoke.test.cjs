const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','tools','live-production-deep-matching.cjs'),'utf8');
test('live Kids deep smoke exercises the visible Lumi quest instead of hidden fine-tune selects',()=>{
  assert.match(src,/#kids-quest \.kids-quest-choice\[data-value="funny"\]/);
  assert.match(src,/kids-quest-choice\[data-value="series"\]/);
  assert.match(src,/kids-quest-choice\[data-value="2020"\]/);
  assert.match(src,/kids-quest \.kids-quest-reveal/);
  assert.doesNotMatch(src,/locator\('#kids-match-mood'\)\.selectOption\('funny'\)/);
});
