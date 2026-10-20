'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(file,'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
async function boot(selected='en'){
 const dom=new JSDOM(read('cooking/index.html'),{url:'https://matchapp.tv/cooking/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.localStorage.setItem('match_lang',selected);w.MATCH_LANG='ja';
 let finds=0,fetches=0;w.fetch=()=>{fetches++;throw Error('localization must not fetch');};
 w.eval(read('i18n.js'));w.eval(read('cooking/i18n.js'));w.eval(read('cooking/catalog.js'));
 const original=w.MatchCooking,baseline=JSON.stringify({channels:original.channels,recipes:original.recipes});
 w.MatchCooking={...original,find(...args){finds++;return original.find(...args);}};
 w.eval(read('cooking/cooking.js'));
 if(w.document.readyState==='loading')await new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
 return{dom,w,original,baseline,finds:()=>finds,fetches:()=>fetches};
}
test('all14 authored cooking dictionaries have complete keys and interpolation parity',async()=>{
 const x=await boot();try{
  const L=x.w.MatchCookingI18n,keys=Object.keys(L.copy.en);
  assert.equal(keys.length,55);assert.deepEqual(Array.from(L.languages),languages);
  for(const lang of languages){const dict=L.copy[lang];assert.deepEqual(Object.keys(dict).sort(),keys.slice().sort(),lang);
   for(const key of keys){assert.equal(typeof dict[key],'string');assert(dict[key].trim(),lang+'/'+key);assert.deepEqual((dict[key].match(/\{\w+\}/g)||[]).sort(),(L.copy.en[key].match(/\{\w+\}/g)||[]).sort(),lang+'/'+key);}
   if(lang!=='en')assert.notEqual(dict.heading,L.copy.en.heading,lang+' cannot silently use English');
  }
  assert.equal(x.w.document.querySelectorAll('#lang-switcher').length,1);assert.equal(x.w.document.querySelectorAll('#lang-switcher option').length,14);
  for(const node of x.w.document.querySelectorAll('[data-cooking-i18n]'))assert(keys.includes(node.dataset.cookingI18n));
 }finally{x.dom.window.close();}
});
test('language changes preserve edited fields, result identities and an open original player without searching or fetching',async()=>{
 const x=await boot('pt-BR');try{
  const {w}=x,d=w.document,L=w.MatchCookingI18n;assert.equal(L.language(),'pt-BR');
  const form=d.getElementById('cooking-form'),query=d.getElementById('cooking-query'),kind=d.getElementById('cooking-kind'),results=d.getElementById('cooking-results');
  const cards=Array.from(results.children),images=Array.from(results.querySelectorAll('img')),titles=Array.from(results.querySelectorAll('h3')).map(n=>n.textContent);
  const sourceLinks=Array.from(results.querySelectorAll('.cooking-actions>a:first-child')).map(n=>n.href);
  results.querySelector('button').click();const frame=results.querySelector('iframe'),src=frame.src;frame.__playerState={seconds:37};
  query.value='my unsent dish <keep> 🥗';kind.value='channels';
  let sourceMutations=0;const observer=new w.MutationObserver(records=>{sourceMutations+=records.filter(r=>r.attributeName==='src').length;});observer.observe(results,{subtree:true,attributes:true,attributeFilter:['src']});
  for(const lang of languages){w.setLanguage(lang);assert.equal(L.language(),lang);assert.equal(d.documentElement.lang,lang);assert.equal(d.documentElement.dir,lang==='ar'?'rtl':'ltr');
   assert.equal(d.getElementById('cooking-form'),form);assert.equal(d.getElementById('cooking-query'),query);assert.equal(d.getElementById('cooking-kind'),kind);assert.equal(query.value,'my unsent dish <keep> 🥗');assert.equal(kind.value,'channels');
   assert.deepEqual(Array.from(results.children),cards);assert.deepEqual(Array.from(results.querySelectorAll('img')),images);assert.deepEqual(Array.from(results.querySelectorAll('h3')).map(n=>n.textContent),titles);assert.deepEqual(Array.from(results.querySelectorAll('.cooking-actions>a:first-child')).map(n=>n.href),sourceLinks);
   assert.equal(results.querySelector('iframe'),frame);assert.equal(frame.src,src);assert.equal(frame.__playerState.seconds,37);assert.equal(x.finds(),1);
   assert.equal(d.querySelector('h1').textContent,L.copy[lang].heading);assert.equal(d.getElementById('cooking-status').textContent,L.t('statusRecipes',{count:5}));assert.equal(query.placeholder,L.copy[lang].queryPlaceholder);
   const prompt=new URL(results.querySelector('.cooking-actions>a:last-child').href).searchParams.get('q');assert.equal(prompt,L.t('prompt',{creator:'Maangchi',subject:titles[0],url:x.original.recipes[0].url}));assert(images[0].alt.includes(titles[0])&&images[0].alt.includes('Maangchi'));
  }
  await Promise.resolve();assert.equal(sourceMutations,0);observer.disconnect();assert.equal(x.fetches(),0);assert.equal(JSON.stringify({channels:x.original.channels,recipes:x.original.recipes}),x.baseline);
 }finally{x.dom.window.close();}
});
test('storage preference wins over stale globals and repeated script boot never adds a submit handler',async()=>{
 const x=await boot();try{
  const {w}=x,d=w.document,L=w.MatchCookingI18n;
  w.eval(read('cooking/i18n.js'));w.eval(read('cooking/cooking.js'));assert.equal(x.finds(),1);
  w.localStorage.setItem('match_lang','ar');w.MATCH_LANG='ja';w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:'ar'}));
  assert.equal(L.language(),'ar');assert.equal(d.querySelector('h1').textContent,L.copy.ar.heading);assert.equal(x.finds(),1);
  d.getElementById('cooking-query').value='unknown dish xyz';const submit=new w.Event('submit',{cancelable:true});d.getElementById('cooking-form').dispatchEvent(submit);assert(submit.defaultPrevented);assert.equal(x.finds(),2);
  const cards=Array.from(d.getElementById('cooking-results').children);for(const lang of languages){w.setLanguage(lang);assert.equal(x.finds(),2);assert.deepEqual(Array.from(d.getElementById('cooking-results').children),cards);assert.equal(d.getElementById('cooking-status').textContent,L.copy[lang].statusFallback);assert.equal(d.querySelector('#cooking-results p').textContent,L.copy[lang].channelMaangchi);assert.equal(d.querySelector('#cooking-results .cooking-actions>a:nth-child(2)').textContent,L.copy[lang].officialChannel);}
  assert.equal(x.fetches(),0);assert.equal(d.querySelectorAll('iframe').length,0);
 }finally{x.dom.window.close();}
});
test('all126 actual localized Ask AI links keep cooking intent while real watch requests stay excluded',async()=>{
 const x=await boot();try{
  const {w}=x,d=w.document;let checked=0;
  for(const kind of ['recipes','channels']){
   if(kind==='channels'){d.getElementById('cooking-kind').value=kind;d.getElementById('cooking-form').dispatchEvent(new w.Event('submit',{cancelable:true}));}
   for(const lang of languages){w.setLanguage(lang);const links=Array.from(d.querySelectorAll('#cooking-results .cooking-actions>a:last-child'));
    assert.equal(links.length,kind==='recipes'?5:4);
    for(const link of links){const prompt=new URL(link.href).searchParams.get('q');assert(x.original.isCooking(prompt),lang+'/'+kind+': '+prompt);checked++;}
   }
  }
  assert.equal(checked,126);assert.equal(x.finds(),2);assert.equal(x.fetches(),0);
  for(const query of ['watch cooking shows','watch a movie about cooking','stream a cooking series','a documentary about Maangchi','assistir filmes de culinária','ver películas de cocina','Recommend a funny movie','unknown subject xyz','https://example.test/recipes/watch?v=abc'])assert.equal(x.original.isCooking(query),false,query);
  assert.equal(JSON.stringify({channels:x.original.channels,recipes:x.original.recipes}),x.baseline);
 }finally{x.dom.window.close();}
});
