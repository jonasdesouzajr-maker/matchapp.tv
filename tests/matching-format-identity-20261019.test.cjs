'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const policy=fs.readFileSync(path.join(__dirname,'../matching-policy.js'),'utf8');

test('saved and rejected series retain their source identity across format spellings and reload',async()=>{
 for(const action of ['save','dislike']){
  const dom=new JSDOM('<body></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
  try{
   w.eval(policy);await w.matchPolicy.attach(null);
   assert.equal(w.matchPolicy.savePreference({title:'Dark',tmdbId:70523,type:'series'},action),true);
   w.eval(policy);await w.matchPolicy.attach(null);
   assert.equal(w.matchPolicy.excludes({title:'A different localized title',tmdb_id:'70523',media_type:'tv'},{hardOnly:true}),true);
   assert.equal(w.matchPolicy.excludes({title:'An unrelated movie',tmdbId:70523,kind:'movie'},{hardOnly:true}),false);
   assert(w.matchPolicy.history()[0].identityKeys.includes('tmdb:tv:70523'));
  }finally{w.close();}
 }
});

test('movie and series aliases normalize nested metadata without guessing a source from generic IDs',async()=>{
 const dom=new JSDOM('<body></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 try{
  w.eval(policy);await w.matchPolicy.attach(null);
  for(const [record,expected] of [
   [{title:'Film',tmdbId:123,type:'film'},'tmdb:movie:123'],
   [{title:'Series',tmdbId:124,kind:'series'},'tmdb:tv:124'],
   [{title:'Nested',type:'series',_meta:{tmdbId:125}},'tmdb:tv:125'],
   [{title:'Source',type:'book',_tmdb:{tmdbId:126,kind:'movie'}},'tmdb:movie:126']
  ])assert(w.matchPolicy.identityKeys(record).has(expected),JSON.stringify(record));
  for(const record of [
   {title:'A book',tmdbId:123,type:'book'},
   {title:'Unknown source',id:123,type:'movie'},
   {title:'Invalid source',tmdbId:-1,type:'series'},
   {title:'Genre is not a format',tmdbId:123,type:'drama'}
  ])assert(![...w.matchPolicy.identityKeys(record)].some(key=>key.startsWith('tmdb:')),JSON.stringify(record));
 }finally{w.close();}
});

test('existing saved-list records gain normalized exclusion keys without rewriting user preferences',async()=>{
 const dom=new JSDOM('<body></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 try{
  const saved=JSON.stringify([{title:'Previously saved series',tmdbId:'70523',type:'series'}]);
  w.localStorage.setItem('match_savedList',saved);
  w.eval(policy);await w.matchPolicy.attach(null);
  assert(w.matchPolicy.excludes({title:'New locale',tmdbId:70523,kind:'tv'},{hardOnly:true}));
  assert.equal(w.localStorage.getItem('match_savedList'),saved,'loading the policy does not migrate or replace the saved list');
 }finally{w.close();}
});
