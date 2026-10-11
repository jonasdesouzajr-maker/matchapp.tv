const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('all current curated titles have exact verified Apple or Open Library sources and safe HTTPS art',()=>{
 const data=JSON.parse(read('ebooks/verified-book-index-20261011.json'));
 const seen=new Set();
 assert.equal(data.source,'Open Library + Apple Books');
 assert.equal(data.entries.length,12);
 for(const e of data.entries){
  assert.ok(['Open Library','Apple Books'].includes(e.source));
  if(e.source==='Open Library'){
   assert.match(e.cover,/^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-L\.jpg$/);
   assert.match(e.url,/^https:\/\/openlibrary\.org\/works\/OL\d+W$/);
  }else{
   assert.match(e.cover,/^https:\/\/is\d+-ssl\.mzstatic\.com\/image\/thumb\/.+\/600x600bb\.jpg$/);
   assert.match(e.url,/^https:\/\/books\.apple\.com\/(?:br|us)\/book\/[^\s]+\/id\d+/);
  }
  const key=e.title.normalize('NFKD').toLowerCase()+'|'+e.author.normalize('NFKD').toLowerCase();
  assert.ok(!seen.has(key));seen.add(key);
  if(e.year!==null)assert.ok(Number.isInteger(e.year)&&e.year>=1500&&e.year<=2026);
  if(e.rating!==null){assert.ok(e.rating>=0&&e.rating<=5);assert.ok(Number.isInteger(e.count)&&e.count>0)}
 }
 assert.ok(data.entries.some(e=>e.title==='Odisseia'&&e.author==='Homero'&&e.source==='Open Library'));
 assert.ok(data.entries.some(e=>e.title==='Crime e Castigo'&&e.source==='Apple Books'));
});
test('browser uses same-origin verified snapshot before external searches',async()=>{
 const oldWindow=global.window,oldFetch=global.fetch;
 const catalog=JSON.parse(read('ebooks/verified-book-index-20261011.json'));
 global.window={};let urls=[];
 global.fetch=async url=>{urls.push(String(url));if(String(url).startsWith('/ebooks/'))return {ok:true,json:async()=>catalog};throw Error('Cross-origin request not expected for curated entry')};
 try{
  delete require.cache[require.resolve('../ebooks/book-details-20261011.js')];
  const d=require('../ebooks/book-details-20261011.js');
  const odisseia=await d.lookup({title:'Odisseia',author:'Homero'});
  assert.ok(odisseia.cover.includes('12606729-L.jpg'));assert.equal(odisseia.source,'Open Library');
  const crime=await d.lookup({title:'Crime e Castigo',author:'Fiódor Dostoiévski'});
  assert.equal(crime.source,'Apple Books');assert.match(crime.cover,/mzstatic\.com/);
  assert.ok(crime.url.includes('books.apple.com'));
  assert.deepEqual(urls,['/ebooks/verified-book-index-20261011.json?v=20261011-a2']);
 }finally{if(oldWindow===undefined)delete global.window;else global.window=oldWindow;global.fetch=oldFetch}
});
test('ebook header, visual loading, and Jonas legacy controls are constrained',()=>{
 const css=read('ebooks/ebook-page-mobile-finish-20261011.css');
 const ebooks=read('ebooks/index.html'),jonas=read('discover.html');
 assert.match(css,/img\[data-matchapp-canonical-logo\]/);
 assert.match(css,/ebook-top-cover>img\[data-top-cover\]:not\(\[hidden\]\)/);
 assert.match(css,/max-width:58px!important/);
 assert.match(ebooks,/ebook-page-mobile-finish-20261011\.css\?v=20261011-device2/);
 assert.match(ebooks,/book-details-20261011\.js\?v=20261011-meta3/);
 assert.match(jonas,/id="ai-sidebar-toggle"[^>]*display:none!important/);
 assert.match(jonas,/premium-chat-finish-20261011\.css\?v=20261011-deviceqa6/);
});