'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {versionReferenceRuntimeAssets}=require('../tools/finalize-brand.js');
const REPAIR='20261023-1';
const BASE='https://matchapp.tv';
const ASSETS=[
 '/app.js','/catalog-media.js','/omdb-ratings.js','/discover.js',
 '/jonas/android-ambient-assistant-20261011.js','/jonas/android-ambient-embed-20261011.css',
 '/jonas/discovery-avatar-stage-20261010.js','/jonas/floating-home-20261010-v3.js',
 '/patches/chat-resize-20261022.js','/ui-fixes-20261023.css',
 '/patches/jonas-adult-page.js','/final-wiring.js','/build-meta.js'
];
function urls(document){
 return [...document.querySelectorAll('script[src],link[href]')]
  .map(node=>new URL(node.getAttribute(node.localName==='script'?'src':'href'),BASE));
}
function assertRepair(url,label){
 assert.deepEqual(url.searchParams.getAll('repair'),[REPAIR],label+' must request the repaired asset exactly once');
}
function asset(document,pathname,label){
 const matches=urls(document).filter(url=>url.origin===BASE&&url.pathname===pathname);
 assert.equal(matches.length,1,label+' must have one '+pathname+' loader');
 return matches[0];
}

test('the three adult entrypoints load their repaired matching and chat assets',()=>{
 const expected={
  'index.html':['/app.js','/catalog-media.js','/omdb-ratings.js','/patches/jonas-adult-page.js','/patches/chat-resize-20261022.js','/build-meta.js'],
  'discover.html':['/app.js','/catalog-media.js','/discover.js','/patches/jonas-adult-page.js','/build-meta.js'],
  'explore.html':['/patches/jonas-adult-page.js']
 };
 for(const [file,paths] of Object.entries(expected)){
  const dom=new JSDOM(read(file));
  try{
   for(const pathname of paths)assertRepair(asset(dom.window.document,pathname,file),file+' '+pathname);
   for(const url of urls(dom.window.document)){
    if(url.origin===BASE&&ASSETS.includes(url.pathname))assertRepair(url,file+' '+url.pathname);
   }
  }finally{dom.window.close();}
 }
});

test('the exported generator refreshes every repaired asset while preserving queries and fragments',()=>{
 for(const pathname of ASSETS){
  for(const suffix of ['', '?v=original&route=profile%20view&keep=one&keep=two&repair=old&repair=older#saved']){
   const value=(pathname+suffix).replace(/&/g,'&amp;');
   const input=pathname.endsWith('.css')?'<link rel="stylesheet" href="'+value+'">':'<script defer src="'+value+'"></script>';
   const once=versionReferenceRuntimeAssets(input);
   assert.equal(versionReferenceRuntimeAssets(once),once,pathname+' normalization is idempotent');
   const dom=new JSDOM(once);
   try{
    const url=asset(dom.window.document,pathname,'generator');
    assertRepair(url,pathname);
    if(suffix){
     assert.equal(url.searchParams.get('v'),'original',pathname+' keeps its original version');
     assert.equal(url.searchParams.get('route'),'profile view');
     assert.deepEqual(url.searchParams.getAll('keep'),['one','two']);
     assert.equal(url.hash,'#saved');
    }
   }finally{dom.window.close();}
  }
 }
});

test('the repair pin does not spread to unrelated assets or third-party URLs',()=>{
 for(const input of ['/unrelated.js?v=keep','/unrelated.css?v=keep','https://cdn.example/app.js?v=keep&errors=20261027-2']){
  const html='<script src="'+input+'"></script>';
  assert.equal(versionReferenceRuntimeAssets(html),html,input);
 }
});

test('regenerating a page keeps one existing versioned Jonas loader and is stable on the next run',()=>{
 // Run the actual generator against one temporary page, never the working site.
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-repair-generator-'));
 try{
  const input='<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Cache fixture</title>'+
   '<script defer src="/patches/jonas-adult-page.js?v=existing&amp;resize=retained&amp;repair='+REPAIR+'"></script>'+
   '</head><body><main>Existing page content</main></body></html>';
  fs.writeFileSync(path.join(temporary,'index.html'),input);
  const module={exports:{}};
  vm.runInNewContext(read('tools/finalize-brand.js'),{module,exports:module.exports,require,
   __dirname:path.join(temporary,'tools'),URLSearchParams,console},{filename:'tools/finalize-brand.js'});
  module.exports.finalizeBrand(['index.html']);
  const once=fs.readFileSync(path.join(temporary,'index.html'),'utf8');
  const dom=new JSDOM(once);
  try{
   const url=asset(dom.window.document,'/patches/jonas-adult-page.js','regenerated page');
   assertRepair(url,'regenerated Jonas');
   assert.equal(url.searchParams.get('v'),'existing','the original loader is retained');
   assert.equal(url.searchParams.get('resize'),'retained');
  }finally{dom.window.close();}
  module.exports.finalizeBrand(['index.html']);
  assert.equal(fs.readFileSync(path.join(temporary,'index.html'),'utf8'),once,'regeneration must not append duplicate loaders');
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
});

test('the adult Jonas bootstrap refreshes its assistant and UI stylesheet without duplicating either',()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:BASE+'/explore.html',runScripts:'outside-only'});
 try{
  const source=read('patches/jonas-adult-page.js');
  dom.window.eval(source);dom.window.eval(source);
  for(const pathname of ['/jonas/android-ambient-assistant-20261011.js','/ui-fixes-20261023.css']){
   assertRepair(asset(dom.window.document,pathname,'adult bootstrap'),pathname);
  }
 }finally{dom.window.close();}
});

test('the metadata bootstrap requests the repaired final wiring only once',()=>{
 const source=read('build-meta.js');
 const marker=source.indexOf('script[data-matchapp-final-wiring]');
 const start=source.lastIndexOf('(function(){',marker),end=source.indexOf('})();',marker)+5;
 assert(marker>=0&&start>=0&&end>marker,'the production final-wiring bootstrap is available');
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:BASE+'/',runScripts:'outside-only'});
 try{
  const loader=source.slice(start,end);
  dom.window.eval(loader);dom.window.eval(loader);
  assertRepair(asset(dom.window.document,'/final-wiring.js','metadata bootstrap'),'final wiring');
 }finally{dom.window.close();}
});

test('final wiring pins its catalog fallback and recognizes an existing loader with any query order',()=>{
 const source=read('final-wiring.js');
 const start=source.indexOf('function js('),end=source.indexOf('function upsertMeta(',start);
 assert(start>=0&&end>start,'the production script loader is available');
 const calls=[...source.matchAll(/\bjs\((['"])(\/catalog-media\.js[^'"]*)\1\)/g)].map(match=>match[2]);
 assert.deepEqual(calls,['/catalog-media.js'],'the loader call must use an unversioned path for prefix matching');
 for(const existing of ['', '<script src="/catalog-media.js?repair='+REPAIR+'&amp;v=existing"></script>']){
  const dom=new JSDOM('<!doctype html><html><head>'+existing+'</head><body></body></html>');
  try{
   const load=vm.runInNewContext(source.slice(start,end)+'\njs;',{
    document:dom.window.document,V:'existing-base-version',NEWS_V:'existing-news-version'
   });
   load(calls[0]);load(calls[0]);
   const url=asset(dom.window.document,'/catalog-media.js','final wiring');
   assertRepair(url,'catalog fallback');
   assert.equal(url.searchParams.get('v'),existing?'existing':'existing-base-version');
   assert.equal((url.href.match(/\?/g)||[]).length,1,'query additions must not become a second query string');
  }finally{dom.window.close();}
 }
});
