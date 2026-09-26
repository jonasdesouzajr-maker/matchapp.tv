'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const audio=require('../ebooks/audiobooks.js');
const book={title:'The Wonderful Wizard of Oz',author:'L. Frank Baum',access:['free','paid']};
const appleRow={
 collectionName:'The Wonderful Wizard of Oz',artistName:'L. Frank Baum',
 collectionViewUrl:'https://books.apple.com/us/audiobook/the-wonderful-wizard-of-oz/id123456',
 wrapperType:'audiobook'
};
const libriRow={
 title:'The Wonderful Wizard of Oz',
 authors:[{first_name:'L. Frank',last_name:'Baum'}],
 url_librivox:'https://librivox.org/the-wonderful-wizard-of-oz/'
};
test('exact verified Apple audiobook title, author and storefront, not a loosely related ebook',()=>{
 const matched=audio.verifyApple(book,[appleRow],'US');
 assert.equal(matched.provider,'Apple Books');
 assert.equal(matched.region,'US');
 assert.equal(matched.verified,true);
 assert.equal(matched.kind,'paid');
 assert.equal(audio.verifyApple(book,[{...appleRow,artistName:'John Smith'}],'US'),null);
 assert.equal(audio.verifyApple(book,[{...appleRow,artistName:'Martin Baum'}],'US'),null);
 assert.equal(audio.verifyApple(book,[{...appleRow,artistName:'Frank Unknown'}],'US'),null);
 assert.equal(audio.verifyApple(book,[{...appleRow,collectionName:'The Other Wizard of Oz'}],'US'),null);
 assert.equal(audio.verifyApple(book,[{...appleRow,collectionViewUrl:'https://books.apple.com/gb/audiobook/test/id7'}],'US'),null);
 assert.equal(audio.verifyApple(book,[{...appleRow,collectionViewUrl:'http://books.apple.com/us/audiobook/test/id7'}],'US'),null);
 assert.equal(audio.verifyApple(book,[{...appleRow,collectionViewUrl:'https://books.apple.com.evil.example/us/audiobook/test/id7'}],'US'),null);
});
test('LibriVox exact book and author matches qualify for US, not all countries',()=>{
 assert.equal(audio.verifyLibriVox(book,[libriRow],'US').kind,'free-us');
 assert.equal(audio.verifyLibriVox(book,[libriRow],'BR'),null);
 assert.equal(audio.verifyLibriVox(book,[{...libriRow,authors:[{first_name:'Unknown',last_name:'Reader'}]}],'US'),null);
 assert.equal(audio.verifyLibriVox(book,[{...libriRow,url_librivox:'https://librivox.org.evil.example/story/'}],'US'),null);
});
test('full verified Apple search uses audiobook-only media and correct market',async()=>{
 let calls=[];
 const mock=async(url)=>{calls.push(String(url));return {ok:true,json:async()=>({results:[appleRow]})}};
 const found=await audio.verify(book,'US','paid',mock);
 assert.equal(found.apple.verified,true);
 assert.equal(found.free,null);
 assert.equal(calls.length,1);
 const u=new URL(calls[0]);
 assert.equal(u.hostname,'itunes.apple.com');
 assert.equal(u.searchParams.get('media'),'audiobook');
 assert.equal(u.searchParams.get('entity'),'audiobook');
 assert.equal(u.searchParams.get('country'),'us');
 assert.equal(u.searchParams.get('limit'),'40');
});
test('eligible US free LibriVox verification does not mistakenly call paid stores',async()=>{
 let calls=[];
 const mock=async(url)=>{calls.push(String(url));return {ok:true,json:async()=>({books:[libriRow]})}};
 const found=await audio.verify(book,'US','free',mock);
 assert.equal(found.apple,null);
 assert.equal(found.free.provider,'LibriVox');
 assert.equal(calls.length,1);
 assert(new URL(calls[0]).hostname==='librivox.org');
 assert.equal(new URL(calls[0]).searchParams.get('limit'),'20');
});
test('free audiobook match outside the US is not falsely shown as public domain',async()=>{
 let calls=0;
 const found=await audio.verify(book,'BR','free',async()=>{calls++;throw Error('no network needed')});
 assert.equal(found.apple,null);
 assert.equal(found.free,null);
 assert.equal(calls,0);
});
test('store searches are clearly unverified and never carry any affiliate tags',()=>{
 const searches=audio.sourceSearches(book,'BR');
 assert.deepEqual(searches.map(x=>x.provider),['Google Play Books','Audible','Kobo']);
 assert(searches.every(x=>x.verified===false&&x.kind==='search-only'&&x.url.startsWith('https://')));
 assert(searches.some(x=>new URL(x.url).hostname==='www.audible.com.br'));
 assert(searches.every(x=>!new URL(x.url).searchParams.has('tag')&&!x.url.includes('matchapp06-20')&&!x.url.includes('GGKEY')));
});
test('only the adult reader/listener matcher loads audiobook logic, preserving Kids guard',()=>{
 const html=read('index.html'),kids=read('kids/index.html'),match=read('ebooks/ebook-matcher.js');
 const catalog=html.indexOf('/ebooks/catalog.js'),affiliate=html.indexOf('/ebooks/affiliate-links.js');
 const audioIndex=html.indexOf('/ebooks/audiobooks.js'),matcher=html.indexOf('/ebooks/ebook-matcher.js');
 assert(catalog>=0&&affiliate>catalog&&audioIndex>affiliate&&matcher>audioIndex);
 assert(!kids.includes('/ebooks/audiobooks.js'));
 assert.match(match,/format:\[\['any'/);
 assert.match(match,/chooseVerifiedAudio/);
 assert.match(match,/if\(!pick\)[\s\S]*?return;/);
 assert(match.indexOf('const allowed=await window.checkDailyLimit()')>match.indexOf('if(!pick)'));
 assert.match(match,/data-ebook-check-audio/);
 assert.match(match,/paintAudio/);
 assert(match.includes('audio.free'));
});
test('new audiobook controls preserve responsive artwork fit, existing sitemap and SEO',()=>{
 const css=read('ebooks/ebook-matcher.css'),hub=read('ebooks/index.html'),sitemap=read('sitemap.xml');
 assert.match(css,/ebook-audio-verified/);
 assert.match(css,/ebook-audio-search/);
 assert.match(css,/object-fit:contain/);
 assert.match(hub,/verified audiobook editions/i);
 assert.match(hub,/librivox\.org/);
 assert.match(hub,/audiobook recommendations by genre/i);
 assert(sitemap.includes('<loc>https://matchapp.tv/ebooks/</loc>'));
});

test('only exact verified Apple editions expose real vendor preview audio',()=>{
 const preview='https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview/valid.m4a';
 const good=audio.verifyApple(book,[{...appleRow,previewUrl:preview}],'US');
 assert.equal(good.previewUrl,preview);
 assert.equal(audio.safeApplePreview('https://audio-ssl.itunes.apple.com.evil.example/itunes-assets/valid.m4a'),null);
 assert.equal(audio.safeApplePreview('http://audio-ssl.itunes.apple.com/itunes-assets/valid.m4a'),null);
 assert.equal(audio.verifyApple(book,[{...appleRow,previewUrl:'https://evil.example/fake.mp3'}],'US').previewUrl,null);
 assert.equal(audio.verifyApple(book,[{...appleRow,trackExplicitness:'explicit'}],'US'),null);
 const matcher=read('ebooks/ebook-matcher.js');
 assert.match(matcher,/audio\?\.apple\?\.verified&&audio\.apple\.previewUrl/);
 assert.match(matcher,/class="ebook-audio-preview"/);
});

test('completed zero-hit edition checks receive a short cache; source failures remain retryable',async()=>{
 const unknown={...book,title:'Unlikely Real Book For Source Test',author:'Distinct Writer'};
 let calls=0;
 const none=async()=>{calls++;return{ok:true,json:async()=>({results:[]})}};
 const first=await audio.verify(unknown,'AU','paid',none);
 const second=await audio.verify(unknown,'AU','paid',none);
 assert.equal(first.apple,null);assert.equal(second.apple,null);assert.equal(calls,1);
 const failedBook={...unknown,title:'Transient Distinct Book'};
 let attempts=0;
 const fail=async()=>{attempts++;throw Error('upstream temporarily down')};
 await audio.verify(failedBook,'JP','paid',fail);
 await audio.verify(failedBook,'JP','paid',fail);
 assert.equal(attempts,2);
});
