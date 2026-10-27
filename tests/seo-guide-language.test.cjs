'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const guides=['choose-what-to-watch','streaming-device-discovery'];
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const source=fs.readFileSync(path.join(root,'patches/seo-guide-locale.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const payload=(guide,lang)=>JSON.parse(fs.readFileSync(path.join(root,'assets/i18n/seo',guide,lang+'.json'),'utf8'));
function bindings(d){
 const rows=[...d.querySelectorAll('[data-seo-copy]')].map(node=>({node,key:node.dataset.seoCopy,value:()=>node.textContent}));
 for(const node of d.querySelectorAll('[data-seo-attr]'))for(const part of node.dataset.seoAttr.split(';')){
  const colon=part.indexOf(':'),attribute=part.slice(0,colon),key=part.slice(colon+1);
  assert.ok(['content','aria-label','alt','title'].includes(attribute));
  rows.push({node,key,attribute,value:()=>node.getAttribute(attribute)});
 }
 return rows;
}
function response(value){return {ok:true,text:async()=>JSON.stringify(value)};}
async function mount(guide,lang='en',fetcher){
 const html=fs.readFileSync(path.join(root,'guides',guide,'index.html'),'utf8');
 const dom=new JSDOM(html,{url:'https://matchapp.tv/guides/'+guide+'/?lang=de',runScripts:'outside-only'});
 const w=dom.window,d=w.document,requests=[];
 w.localStorage.setItem('match_lang',lang);
 w.MATCH_LANG='fr';
 w.AbortController=AbortController;
 w.fetch=(url,options)=>{
  requests.push({url,options});
  if(fetcher)return fetcher(url,options);
  const match=url.match(/\/([^/]+)\.json\?v=/);
  return Promise.resolve(response(payload(guide,match[1])));
 };
 const script=d.querySelector('script[src^="/patches/seo-guide-locale.js"]');
 assert.ok(script,'shared scoped binder missing');
 assert.equal(script.dataset.seoGuide,guide);
 assert.equal(script.defer,false);
 Object.defineProperty(d,'currentScript',{configurable:true,value:script});
 w.eval(source);
 await tick();await tick();
 return {dom,w,d,requests,close:()=>w.close()};
}
function change(h,lang){
 h.w.localStorage.setItem('match_lang',lang);
 h.d.dispatchEvent(new h.w.CustomEvent('matchapp:langchange',{detail:{lang}}));
}
function schema(d){return [...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(n=>{const v=JSON.parse(n.textContent);return v['@graph']||[v];});}
for(const guide of guides){
 test(guide+' has complete authored copy and English crawlable source for all14 languages',()=>{
  const d=new JSDOM(fs.readFileSync(path.join(root,'guides',guide,'index.html'),'utf8')).window.document;
  const rows=bindings(d),keys=rows.map(r=>r.key).sort();
  assert.ok(keys.length>=75);
  assert.equal(new Set(keys).size,keys.length);
  const english=payload(guide,'en').copy;
  for(const row of rows)assert.equal(row.value(),english[row.key],row.key+' static English baseline');
  assert.equal(d.documentElement.lang,'en');
  assert.ok([...d.querySelectorAll('header [lang],main [lang],footer [lang]')].every(n=>n.lang==='en'));
  for(const lang of languages){
   const data=payload(guide,lang);
   assert.equal(data.language,lang);assert.equal(data.guide,guide);
   assert.deepEqual(Object.keys(data.copy).sort(),keys);
   for(const key of keys)assert.equal(typeof data.copy[key]==='string'&&data.copy[key].trim().length>0,true,lang+':'+key);
   if(lang!=='en')assert.notEqual(JSON.stringify(data.copy),JSON.stringify(english));
  }
 });
 test(guide+' renders every selected locale, localized metadata and schema without changing destinations',async()=>{
  const h=await mount(guide);
  try{
   const originalLinks=[...h.d.querySelectorAll('a[href]')].map(n=>n.getAttribute('href'));
   const originalSchemas=[...h.d.querySelectorAll('script[type="application/ld+json"]')].map(n=>n.textContent);
   for(const lang of [...languages.slice(1),'en']){
    change(h,lang);await tick();await tick();
    assert.equal(h.d.documentElement.dataset.seoLocaleState,'ready',lang);
    assert.equal(h.d.documentElement.lang,lang);
    assert.equal(h.d.documentElement.dir,lang==='ar'?'rtl':'ltr');
    assert.equal(h.d.querySelector('main').hasAttribute('inert'),false);
    for(const row of bindings(h.d))assert.equal(row.value(),payload(guide,lang).copy[row.key],lang+':'+row.key);
    assert.deepEqual([...h.d.querySelectorAll('a[href]')].map(n=>n.getAttribute('href')),originalLinks);
    const article=schema(h.d).find(n=>n['@type']==='Article');
    assert.equal(article.inLanguage,lang);
    if(lang!=='en'){
     assert.equal(article.headline,h.d.querySelector('h1').textContent.trim());
     assert.equal(article.description,h.d.querySelector('meta[name="description"]').content);
    }
   }
   assert.deepEqual([...h.d.querySelectorAll('script[type="application/ld+json"]')].map(n=>n.textContent),originalSchemas);
   assert.equal(h.requests.length,13,'English uses the static source; other languages load once');
   for(const request of h.requests){
    assert.equal(request.options.credentials,'omit');
    assert.equal(request.options.redirect,'error');
    assert.equal(request.options.mode,'same-origin');
   }
  }finally{h.close();}
 });
}
test('saved Portuguese choice overrides ambient language and query; selector persists later choice',async()=>{
 const h=await mount(guides[0],'pt');
 try{
  assert.equal(h.d.documentElement.lang,'pt-BR');
  const select=h.d.querySelector('#seo-guide-language');
  assert.equal(select.value,'pt-BR');
  assert.equal(select.options.length,14);
  assert.equal(h.d.querySelector('label[for="seo-guide-language"]').textContent,'Idioma');
  select.value='ja';select.dispatchEvent(new h.w.Event('change',{bubbles:true}));
  await tick();await tick();
  assert.equal(h.w.localStorage.getItem('match_lang'),'ja');
  assert.equal(h.w.MATCH_LANG,'ja');
  assert.equal(h.d.documentElement.lang,'ja');
  h.w.localStorage.setItem('match_lang','ar');
  h.w.dispatchEvent(new h.w.StorageEvent('storage',{key:'match_lang'}));
  await tick();await tick();
  assert.equal(h.d.documentElement.lang,'ar');assert.equal(h.d.documentElement.dir,'rtl');
 }finally{h.close();}
});
test('late previous-language response cannot replace a newer selected language',async()=>{
 const pending=[];
 const h=await mount(guides[0],'pt-BR',(url,options)=>new Promise(resolve=>pending.push({url,options,resolve})));
 try{
  assert.equal(h.d.documentElement.dataset.seoLocaleState,'loading');
  assert.equal(h.d.querySelector('main').hasAttribute('inert'),true);
  assert.equal(h.d.querySelector('.seo-guide-locale').hasAttribute('inert'),false);
  change(h,'es');
  assert.equal(pending[0].options.signal.aborted,true);
  pending[1].resolve(response(payload(guides[0],'es')));await tick();await tick();
  pending[0].resolve(response(payload(guides[0],'pt-BR')));await tick();await tick();
  assert.equal(h.d.documentElement.lang,'es');
  assert.equal(h.d.querySelector('h1').textContent,payload(guides[0],'es').copy[h.d.querySelector('h1 [data-seo-copy],h1[data-seo-copy]').dataset.seoCopy]);
  assert.equal(h.d.querySelector('main').hasAttribute('inert'),false);
 }finally{h.close();}
});
test('incomplete translation fails visibly in selected language, keeps unnamed links inert and can retry',async()=>{
 let good=false;
 const h=await mount(guides[0],'pt-BR',async()=>{
  const value=payload(guides[0],'pt-BR');
  if(!good)delete value.copy[Object.keys(value.copy)[5]];
  return response(value);
 });
 try{
  assert.equal(h.d.documentElement.dataset.seoLocaleState,'error');
  assert.equal(h.d.documentElement.lang,'pt-BR');
  assert.match(h.d.querySelector('.seo-guide-locale-status').textContent,/Não foi possível carregar/);
  assert.equal(h.d.querySelector('main').hasAttribute('inert'),true);
  assert.equal(h.d.querySelector('footer').hasAttribute('inert'),true);
  for(const child of h.d.querySelector('header').children)if(!child.matches('.seo-guide-locale,.seo-guide-locale-status'))assert.equal(child.hasAttribute('inert'),true);
  good=true;h.d.querySelector('.seo-guide-locale-status button').click();
  await tick();await tick();
  assert.equal(h.d.documentElement.dataset.seoLocaleState,'ready');
  assert.equal(h.d.querySelector('.seo-guide-locale-status').hidden,true);
  assert.equal(h.d.querySelector('main').hasAttribute('inert'),false);
 }finally{h.close();}
});

 test('updated Portuguese guide bypasses old translation URL and revalidates HTTP cache', async()=>{
  const guide=guides[0];
  const current=payload(guide,'pt-BR');
  const stale=JSON.parse(JSON.stringify(current));
  stale.copy.c015='OLD CACHED COPY';
  const h=await mount(guide,'pt-BR',async(url,options)=>{
   const fresh=new URL(url,'https://matchapp.tv').searchParams.get('v')!=='20261018-1';
   return response(fresh && options.cache==='no-cache' ? current : stale);
  });
  try {
   assert.equal(h.d.querySelector('[data-seo-copy="c015"]').textContent,current.copy.c015);
   assert.equal(h.d.documentElement.lang,'pt-BR');
   change(h,'en');await tick();
   change(h,'pt-BR');await tick();
   assert.equal(h.requests.length,1,'revalidated copy remains shared within the page');
  } finally {h.close();}
 });
