const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('verified curated books have source-backed, exact identities and safe HTTPS covers',()=>{
 const data=JSON.parse(read('ebooks/verified-book-index-20261011.json'));
 const seen=new Set();
 assert.equal(data.source,'Open Library');
 assert.ok(data.entries.length>=4);
 for(const e of data.entries){
  assert.match(e.cover,/^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-L\.jpg$/);
  assert.match(e.url,/^https:\/\/openlibrary\.org\/works\/OL\d+W$/);
  const key=e.title.normalize('NFKD').toLowerCase()+'|'+e.author.normalize('NFKD').toLowerCase();
  assert.ok(!seen.has(key));seen.add(key);
  assert.ok(Number.isInteger(e.year)&&e.year>=1500&&e.year<=2026);
  if(e.rating!==null){assert.ok(e.rating>=0&&e.rating<=5);assert.ok(Number.isInteger(e.count)&&e.count>0)}
 }
 assert.ok(data.entries.some(e=>e.title==='Odisseia'&&e.author==='Homero'));
});
test('browser uses same-origin catalog snapshot before cross-origin requests',async()=>{
 const oldWindow=global.window,oldFetch=global.fetch;
 const catalog=JSON.parse(read('ebooks/verified-book-index-20261011.json'));
 global.window={};let urls=[];
 global.fetch=async (url)=>{urls.push(String(url));if(String(url).startsWith('/ebooks/'))return {ok:true,json:async()=>catalog};throw Error('No cross-origin request expected for verified entry')};
 try{
  delete require.cache[require.resolve('../ebooks/book-details-20261011.js')];
  const details=require('../ebooks/book-details-20261011.js');
  const result=await details.lookup({title:'Odisseia',author:'Homero'});
  assert.ok(result?.cover?.includes('12606729-L.jpg'));
  assert.equal(result.source,'Open Library');
  assert.equal(result.rating,null);
  assert.deepEqual(urls,['/ebooks/verified-book-index-20261011.json?v=20261011-a1']);
 }finally{if(oldWindow===undefined)delete global.window;else global.window=oldWindow;global.fetch=oldFetch}
});
test('ebook header and Jonas legacy controls are visually constrained without altering controls',()=>{
 const header=read('ebooks/ebook-page-mobile-finish-20261011.css');
 const ebooks=read('ebooks/index.html');
 const jonas=read('discover.html');
 assert.match(header,/max-width:58px!important/);
 assert.match(header,/\.ebook-text-wordmark\{/);
 assert.match(header,/\.ebook-page-hero a\.ebook-page-cta\{/);
 assert.match(ebooks,/ebook-page-mobile-finish-20261011\.css\?v=20261011-device1/);
 assert.match(ebooks,/book-details-20261011\.js\?v=20261011-meta2/);
 assert.match(jonas,/id="ai-sidebar-toggle"[^>]*display:none!important/);
 assert.match(jonas,/premium-chat-finish-20261011\.css\?v=20261011-deviceqa6/);
});