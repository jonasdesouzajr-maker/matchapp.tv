'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');const read=p=>fs.readFileSync(p,'utf8');
const baseCopy=JSON.parse(read('data/partnership-copy.json')),directoryCopy=JSON.parse(read('data/streaming-directory-copy.json'));
const copy=Object.fromEntries(Object.entries(baseCopy).map(([lang,t])=>[lang,{...t,...directoryCopy[lang]}]));
const directory=JSON.parse(read('data/regional-services.json'));
test('new page copy is authored for all app languages and every rendered key exists',()=>{
 assert.equal(Object.keys(copy).length,14);
 for(const lang of Object.keys(copy))assert.deepEqual(Object.keys(copy[lang]).sort(),Object.keys(copy.en).sort(),lang);
 for(const file of ['sponsor/index.html','streaming/index.html']){
  const dom=new JSDOM(read(file));for(const el of dom.window.document.querySelectorAll('[data-mp]'))for(const lang of Object.keys(copy))assert(copy[lang][el.dataset.mp],lang+':'+el.dataset.mp);
  assert.equal(dom.window.document.querySelectorAll('h1').length,1);
  assert(!dom.window.document.querySelector('script[src*="adsbygoogle"],ins.adsbygoogle'));
 }
});
test('sponsor inquiry encodes untrusted input, does not send requests, and preserves validation',async()=>{
 const dom=new JSDOM(read('sponsor/index.html'),{url:'https://matchapp.tv/sponsor/',runScripts:'outside-only'}),w=dom.window;
 w.MATCHAPP_PARTNERSHIP_COPY=copy;w.localStorage.setItem('match_lang','pt-BR');let copied='';
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async x=>{copied=x;}}});
 w.eval(read('patches/partnership-pages.js'));
 assert.equal(w.document.documentElement.lang,'pt-BR');assert.equal(w.document.querySelector('h1').textContent,copy.pt.title);
 const form=w.document.getElementById('mp-brief');assert.equal(form.checkValidity(),false);
 form.elements.company.value='<script>alert(1)</script>';form.elements.market.value='Brasil';form.elements.goal.value='Film launch';
 w.document.getElementById('mp-copy').click();await new Promise(r=>setImmediate(r));
 assert(copied.includes('<script>alert(1)</script>'));assert(!w.document.querySelector('#mp-brief script'));assert.equal(w.localStorage.length,1);
 w.document.getElementById('mp-language').value='ar';w.document.getElementById('mp-language').dispatchEvent(new w.Event('change'));
 assert.equal(w.document.documentElement.dir,'rtl');assert.equal(w.document.querySelector('h1').textContent,copy.ar.title);assert.equal(form.elements.company.value,'<script>alert(1)</script>');
 assert.doesNotMatch(read('patches/partnership-pages.js'),/fetch\(|sendBeacon|\.submit\(/);w.close();
});
test('regional filtering retains official links and works independently of matching',()=>{
 const dom=new JSDOM(read('streaming/index.html'),{url:'https://matchapp.tv/streaming/',runScripts:'outside-only'}),w=dom.window;w.MATCHAPP_PARTNERSHIP_COPY=copy;w.eval(read('patches/partnership-pages.js'));
 const cover=w.document.querySelector('.mp-title img');cover.dispatchEvent(new w.Event('error'));assert.equal(cover.hidden,true);assert(w.document.querySelector('.mp-title a').href.startsWith('https://play.mercadolivre.com.br/'));
 const filter=w.document.getElementById('mp-market');filter.value='BR';filter.dispatchEvent(new w.Event('change'));
 const visible=[...w.document.querySelectorAll('.mp-service')].filter(e=>!e.hidden);assert.equal(visible.length,directory.filter(s=>s.markets.includes('BR')).length);assert(visible.some(n=>n.querySelector('h3').textContent==='Mercado Play'));
 filter.value='GB';filter.dispatchEvent(new w.Event('change'));assert.equal([...w.document.querySelectorAll('.mp-service')].filter(e=>!e.hidden).length,directory.filter(s=>s.markets.includes('GB')).length);
 for(const a of w.document.querySelectorAll('.mp-service a')){assert.equal(new URL(a.href).protocol,'https:');assert(a.rel.includes('noopener'));}
 filter.value='';filter.dispatchEvent(new w.Event('change'));assert.equal([...w.document.querySelectorAll('.mp-service')].filter(e=>!e.hidden).length,directory.length);w.close();
});
test('Mercado catalog uses official exact art and BR-only offers without changing regional filtering',()=>{
 const s=read('app.js'),a=s.indexOf('const CONTENT_CATALOG'),b=s.indexOf('const VERTICAL_DRAMA_TITLES');
 const catalog=vm.runInNewContext(s.slice(a,b)+';CONTENT_CATALOG');
 const records=catalog.filter(x=>x.platform==='Mercado Play');assert.equal(records.length,3);
 const regionFn=s.slice(s.indexOf('function regionAvailabilityFits('),s.indexOf('async function rankVerifiedCuratedMatch('));
 for(const row of records){assert.deepEqual(Array.from(row.availabilityRegions),['BR']);assert.match(row.watchUrl,/^https:\/\/play\.mercadolivre\.com\.br\/assistir\//);assert.match(row._meta.artwork,/^https:\/\/http2\.mlstatic\.com\//);assert(row.cast.length||row.presenter);assert(row.checked==='2026-10-16');
  for(const [region,want]of [['BR',true],['US',false],['MX',false]]){
   const ctx={row,window:{MatchAppCatalogMedia:{regionCode:()=>region}},normCriteria:v=>v||[]};assert.equal(vm.runInNewContext(regionFn+';regionAvailabilityFits(row,{plat:["Mercado Play"]})',ctx),want);
  }
 }
 const platforms=vm.runInNewContext('('+s.match(/const PLATFORMS = (\{[\s\S]*?\n\});/)[1]+')');assert.deepEqual(Array.from(platforms['Mercado Play'].countries),['Brazil','Brasil']);
 assert(!read('kids/index.html').includes('partnership-pages'));assert(!read('kids/kids.js').includes('Mercado Play'));
});
test('new routes have crawlable internal links, self canonicals, and durable sitemap entries',()=>{
 const home=new JSDOM(read('index.html')).window.document;
 for(const route of ['sponsor','streaming']){
  assert(home.querySelector(`a[href="/${route}/"]`));
  const doc=new JSDOM(read(route+'/index.html')).window.document;
  assert.equal(doc.querySelector('link[rel="canonical"]').href,`https://matchapp.tv/${route}/`);
  assert(read('sitemap.xml').includes(`https://matchapp.tv/${route}/`));assert(read('tools/update-sitemap.js').includes('/'+route+'/'));
  for(const node of doc.querySelectorAll('script[type="application/ld+json"]'))JSON.parse(node.textContent);
 }
});
