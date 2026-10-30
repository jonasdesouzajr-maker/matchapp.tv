'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');const root=path.resolve(__dirname,'..'),source=require('../tools/lumina-seo-copy.json'),builder=require('../tools/build-lumina-pages.cjs');
const guide=fs.readFileSync(path.join(root,'lumina-match/guide.js'),'utf8');
function fixture(t,options={}){
 const dom=new JSDOM('<html lang="pt-BR" data-lumina-guide-locale="pt-BR"><a data-lumina-play href="/">Jogar</a><a data-lumina-language="en" href="/lumina-match/#language-en">English</a></html>',{url:'https://matchapp.tv/lumina-match/pt-br/',runScripts:'outside-only'});t.after(()=>dom.window.close());
 const calls=[],w={location:{hash:'',assign(){},replace(){}},addEventListener(){},localStorage:{getItem(){return null},setItem(){}}};
 if(!options.missing)w.gtag=(...args)=>{if(options.throwing)throw Error('Collector failed');calls.push(args)};
 vm.runInNewContext(guide,{window:w,document:dom.window.document});dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 dom.window.document.addEventListener('click',e=>e.preventDefault());
 return{calls,dom,w,click(selector='[data-lumina-play]',extra={}){dom.window.document.querySelector(selector).dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true,button:0,...extra}));}};
}
test('a real unmodified Play intent emits one scoped event without personal data or consent changes',t=>{
 const f=fixture(t);f.click();assert.equal(f.calls.length,1);const [command,name,payload]=f.calls[0];assert.equal(command,'event');assert.equal(name,'lumina_guide_play');
 assert.deepEqual(JSON.parse(JSON.stringify(payload)),{game_name:'Lumina Match',guide_language:'pt-BR',source_path:'/lumina-match/pt-br/',target_path:'/',engagement_type:'play_intent'});
 assert.equal(f.dom.window.document.querySelector('[data-lumina-play]').getAttribute('href'),'/');
});
test('language navigation and modified clicks are not counted as a game play intent',t=>{
 const f=fixture(t);f.click('[data-lumina-language]');for(const mod of ['ctrlKey','metaKey','shiftKey','altKey'])f.click('[data-lumina-play]',{[mod]:true});assert.deepEqual(f.calls,[]);
});
test('absent or failing analytics cannot prevent language persistence and ordinary navigation',t=>{
 for(const option of [{missing:true},{throwing:true}]){const f=fixture(t,option);assert.doesNotThrow(()=>f.click());assert.equal(f.w.MATCH_LANG,'pt-BR');assert.equal(f.dom.window.document.querySelector('[data-lumina-play]').getAttribute('href'),'/');}
});
test('all language pages contain the useful new sections and a real reserved-size gameplay image',()=>{
 for(const [lang,copy] of Object.entries(source.locales)){
  assert.equal(copy.keywords.length,9);assert.equal(new Set(copy.keywords).size,9);assert(copy.h1.includes('250'));
  for(const id of ['memory-pairs-explained','fewer-moves']){const s=copy.sections.find(s=>s.id===id);assert(s);assert.equal(s.paragraphs.length,2);assert(s.paragraphs.every(p=>p.length>80));}
  assert.equal(copy.sections[0].paragraphs.length,2);assert(copy.socialAlt.length>20);
  const file=path.join(root,builder.route(lang).slice(1),'index.html'),dom=new JSDOM(fs.readFileSync(file,'utf8'));try{
   const d=dom.window.document,image=d.querySelector('.lumina-guide-gameplay img');assert(image);assert.equal(image.getAttribute('width'),'1200');assert.equal(image.getAttribute('height'),'630');assert.equal(image.getAttribute('loading'),'lazy');assert.equal(image.alt,copy.socialAlt);
   assert.equal(d.querySelector('meta[property="og:image:alt"]').content,copy.socialAlt);assert.equal(d.querySelector('meta[name="twitter:image:alt"]').content,copy.socialAlt);
   assert.equal(d.querySelectorAll('meta[name="keywords"]').length,0,'no useless keyword-stuffed meta tag');
   const graph=JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent)['@graph'];assert.deepEqual(graph.find(x=>x['@type']==='VideoGame').screenshot,builder.SOCIAL);
  }finally{dom.window.close();}
 }
});
test('new content cannot disappear silently from the generator source',()=>{
 const broken=structuredClone(source);broken.locales.en.sections.pop();assert.throws(()=>builder.validate(broken),/incomplete sections/);
 const empty=structuredClone(source);empty.locales.ar.socialAlt='';assert.throws(()=>builder.validate(empty),/missing socialAlt/);
});
