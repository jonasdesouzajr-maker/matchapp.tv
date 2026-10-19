'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../matching-policy.js'),'utf8');
function policy(){const dom=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'});dom.window.eval(source);return {dom,p:dom.window.matchPolicy};}
const comedy={title:'Comedy fixture',type:'movie Comedy',cats:['movie','Comedy']};
const drama={title:'Drama fixture',type:'movie Science Fiction Drama',cats:['movie','Science Fiction','Drama']};

test('an explicit negative genre clause cannot admit the unwanted drama or reject the requested comedy',()=>{
 const {dom,p}=policy();try{
  const q='Recommend one laugh-out-loud comedy movie. Do not recommend a serious science fiction drama.';
  assert(p.fitsQuestion(comedy,q));assert(!p.fitsQuestion(drama,q));
  const intent=p.intentFromText(q);assert.deepEqual([...intent.families],['comedy']);assert.equal(intent.requestedGenre,null);
 }finally{dom.window.close();}
});

test('explicit exclusions still reject hybrid genres while preserving positive science-fiction criteria',()=>{
 const {dom,p}=policy();try{
  const q="Recommend a science fiction comedy. Don't recommend horror.";
  const sciComedy={...comedy,type:'movie Science Fiction Comedy',cats:['movie','Science Fiction','Comedy']};
  assert(p.fitsQuestion(sciComedy,q));assert(!p.fitsQuestion(comedy,q));assert(!p.fitsQuestion(drama,q));
  assert(!p.fitsQuestion({...sciComedy,type:sciComedy.type+' Horror',cats:[...sciComedy.cats,'Horror']},q));
 }finally{dom.window.close();}
});

test('comma-separated negative clauses and multiple rejected families remain hard exclusions',()=>{
 const {dom,p}=policy();try{
  assert(p.fitsQuestion(comedy,'Avoid recommending horror, recommend comedy.'));
  const q='Recommend comedy; do not include romance or horror.';
  assert(p.fitsQuestion(comedy,q));
  for(const genre of ['Romance','Horror'])assert(!p.fitsQuestion({...comedy,type:'movie Comedy '+genre,cats:['movie','Comedy',genre]},q),genre);
 }finally{dom.window.close();}
});

test('ordinary positive genres, factual prose and unsupported negative phrases keep their previous constraints',()=>{
 const {dom,p}=policy();try{
  assert(p.fitsQuestion(drama,'Recommend a science fiction drama.'));
  assert(!p.fitsQuestion(drama,'Recommend a comedy.'));
  assert(p.fitsQuestion(comedy,'Recommend a comedy. Do not include spoilers.'));
  assert(!p.fitsQuestion(drama,'Recommend a comedy. Do not include spoilers.'));
  assert(p.fitsQuestion(comedy,"Tell me about the comedy Don't Look Up."));
  assert.equal(p.intentFromText("Why don't people recommend horror?").excluded.length,0);
  assert.equal(p.intentFromText("I don't know which comedy to pick.").excluded.length,0);
 }finally{dom.window.close();}
});
