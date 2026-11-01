'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {MARKER,SCRIPT,consentSourceEdit,firstGoogleTag}=require('../tools/finalize-brand.js');
const code=SCRIPT.slice(SCRIPT.indexOf('>')+1,SCRIPT.lastIndexOf('</script>'));
const purposes=['ad_storage','analytics_storage','ad_user_data','ad_personalization'];
function run(choice,queue=[],blocked=false){
 const w={dataLayer:queue,localStorage:{getItem(){if(blocked)throw Error('blocked');return choice}}};
 w.window=w;vm.runInNewContext(code,w);return w;
}
test('first visit queues only denied regional defaults; legacy acceptance never grants consent',()=>{
 for(const choice of [null,'all']){
  const w=run(choice);assert.equal(w.dataLayer.length,1);
  const [type,command,value]=w.dataLayer[0];assert.equal(type,'consent');assert.equal(command,'default');
  for(const p of purposes)assert.equal(value[p],'denied');
  assert.equal(value.wait_for_update,2000);
  for(const region of ['DE','GB','CH','IS','LI','NO'])assert.ok(value.region.includes(region));
  assert.equal(w.googlefc,undefined);assert.equal(w.__tcfapi,undefined);
 }
});
test('existing defaults stay intact and explicit stored refusal is queued before tags',()=>{
 for(const existing of [{ad_storage:'denied',region:['DE']},{ad_storage:'denied',wait_for_update:500}]){
  const original=['consent','default',existing];const w=run(null,[original]);
  assert.equal(w.dataLayer.length,1);assert.equal(w.dataLayer[0],original);
  const refused=run('essential',[original]);assert.equal(refused.dataLayer.length,2);
  const value=refused.dataLayer[1][2];assert.equal(value.region,undefined);
  for(const p of purposes)assert.equal(value[p],'denied');
 }
});
test('storage restrictions cannot prevent denied initialization',()=>{
 assert.equal(run(null,[],true).dataLayer[0][2].ad_storage,'denied');
});
test('source edit precedes actual tags, ignores inert examples and remains idempotent',()=>{
 const fake='<script type="application/ld+json">{"example":"googletagmanager.com/gtm.js"}</script><!-- <script src="https://www.googletagmanager.com/gtm.js"></script> -->';
 const source='<html><head>'+fake+'<script src="https://www.googletagmanager.com/gtag/js?id=example"></script></head><body></body></html>';
 const dom=new JSDOM(source,{includeNodeLocations:true});
 const edit=consentSourceEdit(dom,source);assert.equal(edit[0],source.indexOf('<script src=',source.indexOf('-->')));
 const next=source.slice(0,edit[0])+edit[2]+source.slice(edit[1]);dom.window.close();
 const again=new JSDOM(next,{includeNodeLocations:true});assert.equal(consentSourceEdit(again,next),null);again.window.close();
 const inert=new JSDOM('<html><head>'+fake+'</head></html>',{includeNodeLocations:true});assert.equal(consentSourceEdit(inert,fake),null);inert.window.close();
});
test('published browser routes establish defaults before requesting Google tags',()=>{
 const root=path.join(__dirname,'..');
 for(const file of ['index.html','events-archive.html','about.html','privacy.html','pricing/pricing.html','oauth/consent.html','news/index.html']){
  const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'));
  try{
   const scripts=[...dom.window.document.scripts],tag=firstGoogleTag(dom.window.document);
   const marker=scripts.find(s=>s.hasAttribute(MARKER));assert.ok(marker,file);assert.ok(scripts.indexOf(marker)<scripts.indexOf(tag),file);
   const w={localStorage:{getItem(){return 'essential'}}};w.window=w;
   vm.createContext(w);
   for(const s of scripts.slice(0,scripts.indexOf(tag)))if(!s.src&&(/['"]consent['"]\s*,\s*['"]default['"]/.test(s.textContent)||s===marker))vm.runInContext(s.textContent,w);
   assert.ok(w.dataLayer.length,file);for(const p of purposes)assert.equal(w.dataLayer.at(-1)[2][p],'denied',file);
  }finally{dom.window.close()}
 }
});
test('every tagged public browser document carries the canonical early defaults',()=>{
 const result=require('../tools/audit-publisher-consent.cjs').audit();
 assert.ok(result.checked>1500);assert.deepEqual(result.failures,[]);
});
test('the shared generator finalizer protects future tagged pages without refreshing source content',()=>{
 const {cinemaAssets}=require('../tools/finalize-brand.js');
 const input='<html><head><meta charset="UTF-8"><script src="https://www.googletagmanager.com/gtm.js?id=example"></script></head><body><article>Existing source copy</article></body></html>';
 const next=cinemaAssets(input,'news/articles/example.html');
 assert.ok(next.indexOf(MARKER)<next.indexOf('https://www.googletagmanager.com/gtm.js'));
 assert.ok(next.includes('<article>Existing source copy</article>'));
 assert.equal(cinemaAssets(next,'news/articles/example.html'),next);
});
