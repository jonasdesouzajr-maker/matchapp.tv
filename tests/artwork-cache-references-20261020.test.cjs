'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {candidateFiles}=require('../tools/candidate-files.cjs');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const expected={
 'catalog-media.js':['posters','20261020-1'],'poster-wall.js':['posters','20261020-1'],'trending-rail.js':['posters','20261020-1'],'profile.js':['posters','20261020-1'],'portfolio-history.js':['posters','20261020-1'],'settings.js':['posters','20261020-1'],'title-captions.js':['posters','20261020-1'],
 'app.js':['art','20261020-source1'],'ebook-matcher.js':['art','20261020-source1'],'book-details-20261011.js':['art','20261020-source1'],'reading-ai.js':['art','20261020-source1'],
 'jonas-premium-glass.css':['stellar','20261020-1'],'jonas-premium-enhancer.js':['stellar','20261020-1'],'jonas-adult-page.js':['stellar','20261020-1'],
 'reference-system.css':['premium','20261020-2'],'reference-pages.css':['premium','20261020-2'],'reference-home.css':['premium','20261020-2'],'pricing.js':['premium','20261020-2']
};
test('every adult document requests current changed artwork/theme assets while retaining their original base versions',()=>{
 const files=candidateFiles(root).filter(file=>file.endsWith('.html')&&!/^(?:kids|private-voice|oauth|android-studio|tests|artifacts|reports|node_modules)\//.test(file));
 const counts={};
 for(const file of files){
  const html=read(file),refs=[...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map(match=>match[1].replace(/&amp;/g,'&'));
  for(const ref of refs){
   const url=new URL(ref,'https://matchapp.tv'),name=url.pathname.split('/').at(-1),rule=expected[name];
   if(!rule||url.origin!=='https://matchapp.tv')continue;
   assert.equal(url.searchParams.get(rule[0]),rule[1],file+' '+name);assert.ok(url.searchParams.get('v'),file+' preserves the existing v prefix');assert.equal(url.searchParams.getAll(rule[0]).length,1,file+' avoids duplicated cache keys');counts[name]=(counts[name]||0)+1;
   if(name==='reference-system.css')assert.equal(url.searchParams.get('pills'),'20261020-1',file+' current pill styles');
  }
 }
 assert.ok(counts['reference-system.css']>1400&&counts['reference-pages.css']>1400,'all generated adult families remain covered');
 for(const name of Object.keys(expected).filter(name=>name!=='reading-ai.js'))assert.ok(counts[name]>0,name+' has a live loading reference');
});
test('all adult dialog callers and the single shared loader request current sources without adding a callback runtime',()=>{
 const changed=new Set(['reference-system.js','profile.js','app.js','passkeys.js','pricing.js','settings.js']);
 const files=candidateFiles(root).filter(file=>file.endsWith('.html')&&!/^(?:kids|private-voice|oauth|android-studio|tests|artifacts|reports|node_modules)\//.test(file));
 const counts={};
 for(const file of files){
  for(const match of read(file).matchAll(/\bsrc=["']([^"']+)["']/g)){
   const url=new URL(match[1].replace(/&amp;/g,'&'),'https://matchapp.tv'),name=url.pathname.split('/').at(-1);
   if(url.origin!=='https://matchapp.tv'||!changed.has(name))continue;
   assert.equal(url.searchParams.get('dialogs'),'20261020-1',file+' '+name);assert.equal(url.searchParams.getAll('dialogs').length,1);counts[name]=(counts[name]||0)+1;
   if(name==='reference-system.js')assert.equal(url.searchParams.get('pills'),'20261020-1',file+' current pill loader');
  }
 }
 assert.ok(counts['reference-system.js']>1400);for(const name of changed)assert.ok(counts[name]>0,name);
 for(const file of ['callback.html','confirm.html'])assert.doesNotMatch(read(file),/<script\b[^>]*src=["']\/patches\/reference-system\.js/,'auth handoffs remain CSS-only');
 const loader=read('patches/reference-system.js');assert.match(loader,/dialogVersion\s*=\s*['"]20261020-1['"]/);assert.match(loader,/reference-dialogs\.css\?v=['"]\s*\+\s*dialogVersion/);assert.match(loader,/reference-dialogs\.js\?v=['"]\s*\+\s*dialogVersion/);
});
test('changed loader chains request the new premium runtime and only Profile receives the final-audit poster suffix',()=>{
 const settings=read('settings.js'),start=settings.indexOf("(function(){'use strict';const V="),end=settings.indexOf('\n\n/* MatchApp Ai shared loader',start);
 assert.ok(start>=0&&end>start);
 for(const route of ['/profile/profile.html','/ebooks/']){
  const dom=new JSDOM('<html><head></head><body></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only'});
  try{
   dom.window.eval(settings.slice(start,end));const script=[...dom.window.document.scripts].find(node=>new URL(node.src).pathname==='/premium-ui.js'),url=new URL(script.src);assert.equal(url.searchParams.get('v'),'20260923-cinemadim1');assert.equal(url.searchParams.get('posters'),'20261020-1');
   const legal=new URL([...dom.window.document.scripts].find(node=>new URL(node.src).pathname==='/legal-kit.js').src);assert.equal(legal.searchParams.get('v'),'20261015-cmp1');assert.equal(legal.searchParams.get('dialogs'),'20261020-1');assert.equal(legal.searchParams.get('details'),route.startsWith('/profile/')?'20261018-1':null);
  }finally{dom.window.close();}
 }
 const audit=read('title-captions.js').slice(read('title-captions.js').indexOf('/* Site-wide final audit layer.'));
 for(const route of ['/profile/profile.html','/pricing/pricing.html']){
  const dom=new JSDOM('<html><head></head><body></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only'});
  try{dom.window.eval(audit);const url=new URL(dom.window.document.querySelector('script[data-final-audit]').src);assert.equal(url.searchParams.get('posters'),route.startsWith('/profile/')?'20261020-1':null);assert.equal(url.searchParams.get('v'),'20260929-avatar1');}finally{dom.window.close();}
 }
});
test('ambient CSS imports, both debug mirrors and native timestamp URL reach the current stellar glass assets',()=>{
 for(const prefix of ['','android-studio/app/src/debug/assets/ambient-preview/']){
  assert.match(read(prefix+'jonas/android-ambient-assistant-20261011.css'),/jonas-premium-glass\.css\?v=corner20261020-1&stellar=20261020-1/);
  const source=read(prefix+'jonas/android-ambient-assistant-20261011.js');
  assert.match(source,/android-ambient-assistant-20261011\.css\?v=corner20261020-1&stellar=20261020-1/);
  assert.match(source,/jonas-premium-enhancer\.js\?v=corner20261020-1&stellar=20261020-1/);
 }
 assert.match(read('patches/jonas-adult-page.js'),/android-ambient-assistant-20261011\.js\?v=corner20261020-1&voicepair=20261014-1&instant=20261015-1&stellar=20261020-1/);
 const native=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(native,/android-ambient-assistant-20261011\.js\?live=' \+ Date\.now\(\) \+ '&stellar=20261020-1'/,'native keeps its unique live timestamp and appends the cache token');
});
