'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('home Ask AI tab and branded entry never open keyboard before user opts to type',()=>{
 const code=read('matchapp-ia.js');
 const brand=code.slice(code.indexOf('function openAskFromBrand'),code.indexOf('function brandHeader'));
 const tab=code.slice(code.indexOf('function tab(which)'),code.indexOf("bm.addEventListener",code.indexOf('function tab(which)')));
 assert(brand.includes('ma-ai-focus-pulse'));
 assert.doesNotMatch(brand,/input\.focus\s*\(/);
 assert.doesNotMatch(tab,/input\?\.focus\s*\(/);
});
test('standalone Ask AI leaves typing unfocused and voice available',()=>{
 const code=read('matchapp-ia.js'),discover=code.slice(code.indexOf('function mountDiscover'),code.indexOf('function mountTogether'));
 assert.match(discover,/removeAttribute\('autofocus'\)/);
 assert.doesNotMatch(discover,/setAttribute\('autofocus'|input\?\.focus\s*\(/);
 const page=read('discover.html');
 assert(page.includes('/voice-input.js?'));
 assert(page.includes('id="discover-new-input"'));
});
test('adult pages all invalidate previous cached input focus script',()=>{
 for(const p of ['index.html','discover.html','together.html','pricing/pricing.html']){
   assert(read(p).includes('/matchapp-ia.js?v=20260925-manualfocus2'),p);
 }
 const kids=read('kids/index.html');
 assert(!kids.includes('20260925-manualfocus2'));
});