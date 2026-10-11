const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'ebooks/verified-book-index-20261011.json'),'utf8'));
test('verified covers do not deadlock behind hidden lazy-loading or erase the fallback prematurely',async()=>{
 const doc=new JSDOM('<article class="ebook-top-card"><div class="ebook-top-cover"><img data-top-cover hidden><div class="ebook-cover-fallback">Text fallback</div></div><div class="ebook-top-copy"><div class="ebook-top-actions"></div></div></article>',{url:'https://matchapp.tv/ebooks/'});
 const oldWindow=global.window,oldDocument=global.document,oldFetch=global.fetch;
 global.window=doc.window;global.document=doc.window.document;
 global.fetch=async url=>({ok:true,json:async()=>data});
 try{
  delete require.cache[require.resolve('../ebooks/book-details-20261011.js')];
  const details=require('../ebooks/book-details-20261011.js');
  const el=doc.window.document.querySelector('article');
  await details.hydrate(el,{title:'Odisseia',author:'Homero'},{format:'ebook'});
  const img=el.querySelector('img'),fallback=el.querySelector('.ebook-cover-fallback');
  assert.equal(img.loading,'eager','a lazily loaded hidden image never requests its URL');
  assert.equal(img.hidden,false,'renderable image is allowed to request its URL');
  assert.equal(img.style.opacity,'0','text fallback remains visually present while loading');
  assert.equal(fallback.hidden,false);
  Object.defineProperty(img,'naturalWidth',{configurable:true,value:325});
  img.dispatchEvent(new doc.window.Event('load'));
  assert.equal(img.style.opacity,'1');
  assert.equal(img.hidden,false);
  assert.equal(fallback.hidden,true);
  const css=fs.readFileSync(path.join(root,'ebooks/ebook-page-mobile-finish-20261011.css'),'utf8');
  assert.match(css,/ebook-top-cover>img\[data-top-cover\]:not\(\[hidden\]\)/);
 }finally{
  if(oldWindow===undefined)delete global.window;else global.window=oldWindow;
  if(oldDocument===undefined)delete global.document;else global.document=oldDocument;
  global.fetch=oldFetch;doc.window.close()
 }
});
test('failed verified image shows original fallback instead of a broken cover',async()=>{
 const doc=new JSDOM('<article class="ebook-top-card"><div class="ebook-top-cover"><img data-top-cover hidden><div class="ebook-cover-fallback">Fallback</div></div><div class="ebook-top-copy"><div class="ebook-top-actions"></div></div></article>',{url:'https://matchapp.tv/ebooks/'});
 const oldWindow=global.window,oldDocument=global.document,oldFetch=global.fetch;
 global.window=doc.window;global.document=doc.window.document;global.fetch=async()=>({ok:true,json:async()=>data});
 try{
  delete require.cache[require.resolve('../ebooks/book-details-20261011.js')];
  const d=require('../ebooks/book-details-20261011.js');
  const el=doc.window.document.querySelector('article');
  await d.hydrate(el,{title:'Odisseia',author:'Homero'},{format:'ebook'});
  const img=el.querySelector('img'),fallback=el.querySelector('.ebook-cover-fallback');
  img.dispatchEvent(new doc.window.Event('error'));
  assert.equal(img.hidden,true);
  assert.equal(fallback.hidden,false);
 }finally{
  if(oldWindow===undefined)delete global.window;else global.window=oldWindow;
  if(oldDocument===undefined)delete global.document;else global.document=oldDocument;
  global.fetch=oldFetch;doc.window.close()
 }
});