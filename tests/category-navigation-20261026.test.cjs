const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=f=>fs.readFileSync(f,'utf8');
const registry=read('app.js').match(/const PLATFORMS = (\{[\s\S]*?\n\});/)[1];
function setup(){
 const dom=new JSDOM(read('index.html'),{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 // A top-level lexical const deliberately is NOT a window property, as in app.js.
 w.eval('const PLATFORMS = '+registry+'; window.registryForTest=PLATFORMS;');
 // JSDOM eval lexical scope differs across evals; retain the browser shape via one script.
 w.eval('const PLATFORMS = '+registry+';\n'+read('locale-results.js'));
 w.eval(read('matching-policy.js'));w.eval(read('topic-focus.js'));w.eval(read('criteria.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return dom;
}
test('all canonical provider/category pairs remain selectable; unknown metadata never means empty',()=>{
 const d=setup(),w=d.window;
 for(const [platform,pf] of Object.entries(w.registryForTest))for(const category of pf.cats){
  assert.equal(w.criteriaCompatible('cat',category,{plat:[platform],mood:['romantic']}),true,platform+' / '+category);
  assert.equal(w.criteriaCompatible('plat',platform,{cat:[category]}),true,category+' / '+platform);
 }
 for(const platform of ['Mercado Play','Tubi','Viki','Globoplay','ReelShort']){
  w.setMatchCriteria({cat:[],plat:[platform],mood:['romantic']});
  const movie=w.document.querySelector('#q-category').parentElement.querySelector('[data-value="movie"]');
  assert.equal(movie.disabled,!w.registryForTest[platform].cats.includes('movie'),platform);
 }
 assert.equal(w.criteriaCompatible('cat','movie',{plat:['New provider']}),true);
 assert.equal(w.criteriaCompatible('cat','movie',{plat:['Spotify','Netflix']}),true);
 assert.equal(w.criteriaCompatible('cat','movie',{plat:['Spotify']}),false);
 d.window.close();
});
test('real chip taps select a category with Mercado Play and preserve unrelated DOM and mirrors',()=>{
 const d=setup(),w=d.window,doc=w.document;
 w.setMatchCriteria({cat:[],plat:['Mercado Play'],mood:['romantic']});
 const mood=doc.querySelector('#q-mood').parentElement.querySelector('[data-value="romantic"]');
 const category=doc.querySelector('#q-category');
 let changes=0;category.addEventListener('change',()=>changes++);
 const panel=category.parentElement.querySelector('.crit-chips');
 panel.querySelector('[data-value="movie"]').click();
 assert.deepEqual(Array.from(w.getMatchCriteria().cat),['movie']);
 assert.equal(category.value,'movie');assert.equal(changes,1);
 assert.equal(doc.querySelector('#q-mood').parentElement.querySelector('[data-value="romantic"]'),mood);
 doc.dispatchEvent(new w.Event('matchapp:langchange'));
 assert.equal(changes,1,'label refresh must not re-trigger category/platform rebuilding');
 panel.querySelector('[data-clear]').click();assert.equal(category.value,'any');
 assert.equal(changes,2);
 w.setMatchCriteria({cat:['movie']});
 w.setMatchCriteria({cat:['movie','series']});
 assert.equal(changes,4,'adding a second choice must notify dependants even when the first value stays the same');
 d.window.close();
});
test('the localization decorator cannot re-enable genuinely conflicting genre chips',()=>{
 const d=setup(),w=d.window;
 w.setMatchCriteria({cat:[],plat:[],mood:['cozy comfort watch'],genre:[]});
 w.document.dispatchEvent(new w.Event('matchapp:criteriachange'));
 const chip=w.document.querySelector('#q-genre').parentElement.querySelector('[data-value="Horror"]');
 assert.equal(chip.disabled,true);chip.click();assert.equal(w.getMatchCriteria().genre.length,0);
 w.setMatchCriteria({mood:[]});w.document.dispatchEvent(new w.Event('matchapp:criteriachange'));
 w.document.querySelector('#q-genre').parentElement.querySelector('[data-toggle-more]').click();
 assert.equal(w.document.querySelector('#q-genre').parentElement.querySelector('[data-value="Horror"]').disabled,false);
 d.window.close();
});
