const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const covers=require('../ebooks/cover-identity.js'),audio=require('../ebooks/audiobooks.js');

test('second original cover source requires full author identity, exact work and safe image host',()=>{
 const book={title:'The Thoroughbreds',author:'Elin Hilderbrand & Shelby Cunningham'};
 const volume={volumeInfo:{title:book.title,authors:['Elin Hilderbrand','Shelby Cunningham'],imageLinks:{thumbnail:'http://books.google.com/books/content?id=real&img=1'}}};
 assert.equal(covers.verifiedGoogleCoverUrl(book,[volume]),'https://books.google.com/books/content?id=real&img=1');
 for(const v of [
  {...volume.volumeInfo,authors:['Elin Hilderbrand']},
  {...volume.volumeInfo,title:'A Different Book'},
  {...volume.volumeInfo,imageLinks:{thumbnail:'https://books.google.com.evil.test/books/content?id=wrong'}}
 ])assert.equal(covers.verifiedGoogleCoverUrl(book,[{volumeInfo:v}]),null);
 assert.equal(covers.normalize('村上 春樹'),'村上 春樹');
});
test('Apple artwork is accepted only from an exact legitimate audiobook record',()=>{
 const b={title:'Pride and Prejudice',author:'Jane Austen'};
 const row={collectionName:b.title,artistName:b.author,collectionViewUrl:'https://books.apple.com/us/audiobook/pride-and-prejudice/id123',artworkUrl600:'https://is1-ssl.mzstatic.com/image/thumb/Books/verified/600x600bb.jpg'};
 assert.equal(audio.verifyApple(b,[row],'US')?.coverUrl,row.artworkUrl600);
 assert.equal(audio.verifyApple(b,[{...row,artworkUrl600:'https://is1-ssl.mzstatic.com.evil.test/image/thumb/wrong.jpg'}],'US')?.coverUrl,null);
 assert.equal(audio.verifyApple(b,[{...row,collectionName:'Another Book'}],'US'),null);
});
test('a stalled audiobook source cannot hang after ignoring abort',async()=>{
 const s=read('ebooks/audiobooks.js'),i=s.indexOf(' const pausePromise='),j=s.indexOf(' async function appleSearch(',i);
 assert(i>=0&&j>i);
 let aborted=0;
 class Controller{signal={};abort(){aborted++}}
 const scope=vm.createContext({AbortController:Controller,setTimeout:fn=>{fn();return 1},clearTimeout(){}});
 const bounded=vm.runInContext(s.slice(i,j)+'\npausePromise',scope);
 await assert.rejects(bounded(1,()=>new Promise(()=>{})),/timed out/i);
 assert.equal(aborted,1);
});
test('failed catalogue poster SQL is retryable and cannot poison a normal title match',async()=>{
 const source=read('catalog-media.js'),start=source.indexOf('  async function lookup('),end=source.indexOf('  async function lookupLive(',start);
 assert(start>=0&&end>start);
 let count=0;
 const result={title:'The Bear',poster_large_url:'https://image.tmdb.org/t/p/w780/correct.jpg'};
 const replies=[{data:null,error:{message:'network'}},{data:[result],error:null}];
 const q={select(){return this},eq(){return this},order(){return this},limit(){count++;return Promise.resolve(replies.shift())}};
 const ctx=vm.createContext({window:{supabaseClient:{from:()=>q}},TABLE:'catalog_media_metadata',CACHE:new Map(),INFLIGHT:new Map(),NEGATIVE_UNTIL:new Map(),normalise:t=>t.toLowerCase()});
 const lookup=vm.runInContext(source.slice(start,end)+'\nlookup',ctx);
 assert.equal(await lookup('The Bear'),null);
 assert.equal((await lookup('The Bear'))?.poster_large_url,result.poster_large_url);
 assert.equal(count,2);
});
test('an exact numeric TMDB identity cannot fall through to unrelated same-name artwork',async()=>{
 const s=read('catalog-media.js'),start=s.indexOf('  async function lookupLive('),end=s.indexOf('  async function refreshExact(',start);
 assert(start>=0&&end>start);
 let fuzzy=0;
 const ctx=vm.createContext({window:{tmdbDetails:async()=>null,tmdbLookup:async()=>{fuzzy++;return{title:'Wrong',tmdbId:4444,kind:'tv'}}},LIVE_CACHE:new Map(),normalise:t=>t.toLowerCase()});
 const lookupLive=vm.runInContext(s.slice(start,end)+'\nlookupLive',ctx);
 assert.equal(await lookupLive('The Bear',{tmdbId:136315,kind:'tv'}),null);
 assert.equal(fuzzy,0);
});
test('two rapid e-book matching requests can debit the shared quota only once',async()=>{
 const dom=new JSDOM('<main><div id="search-box"></div></main>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 w.MATCHAPP_EBOOK_CATALOG=[{id:'one',title:'Pride and Prejudice',author:'Jane Austen',year:1813,genres:['romance'],moods:['romantic'],pace:'balanced',length:'long',era:'classic',access:['free','paid'],summary:'A novel'}];
 w.MATCHAPP_TOP_EBOOKS=[];w.MatchAppBookCoverIdentity=covers;w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async()=>{throw Error('offline')};
 let charges=0,release;
 w.checkDailyLimit=()=>{charges++;return new Promise(resolve=>{release=resolve})};
 w.eval(read('ebooks/ebook-matcher.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await new Promise(resolve=>setTimeout(resolve,0));
 const first=w.MatchAppEbooks.match(),second=w.MatchAppEbooks.match();
 assert.equal(charges,1);assert.equal(w.document.querySelector('[data-ebook-match]').disabled,true);
 release(true);await Promise.all([first,second]);
 assert.equal(charges,1);assert.equal(w.document.querySelector('[data-ebook-match]').disabled,false);
 assert.match(w.document.querySelector('[data-ebook-result]').textContent,/Pride and Prejudice/);
 dom.window.close();
});
test('normal matching, audiobook matching and conversational AI retain separate safe routes',()=>{
 const app=read('app.js'),book=read('ebooks/ebook-matcher.js'),chat=read('discover.js'),home=read('index.html'),kids=read('kids/index.html');
 assert.match(app,/window\.triggerMatch = async function/);
 assert.match(book,/chooseVerifiedAudio\(p,/);
 assert.match(book,/const allowed=await window\.checkDailyLimit\(\)/);
 assert.match(chat,/async function askAIConversational/);
 assert(home.includes('/ebooks/cover-identity.js?v=20261001-coverquality1'));
 assert(!kids.includes('/ebooks/audiobooks.js')&&!kids.includes('/ebooks/ebook-matcher.js'));
});

test('optional third cover source uses exact Apple book identity, region and genuine edition art only',()=>{
 const book={title:'The Posthumous Memoirs of Brás Cubas',author:'Machado de Assis',year:1881};
 const row={trackName:book.title,artistName:book.author,kind:'ebook',
  trackViewUrl:'https://books.apple.com/br/book/the-posthumous-memoirs-of-bras-cubas/id123',
  artworkUrl600:'https://is1-ssl.mzstatic.com/image/thumb/Books111/v4/official.jpg'};
 assert.equal(covers.verifiedAppleBookCoverUrl(book,[row],'BR'),row.artworkUrl600);
 const reject=[
  {...row,artistName:'Another Writer'},
  {...row,trackName:'Unrelated Memoir'},
  {...row,trackViewUrl:'https://books.apple.com/us/book/foreign-region/id123'},
  {...row,trackViewUrl:'https://books.apple.com.evil.example/br/book/title/id123'},
  {...row,artworkUrl600:'https://is1-ssl.mzstatic.com.evil.test/image/thumb/wrong.jpg'},
  {...row,trackExplicitness:'explicit'},
  {...row,kind:'audiobook'}
 ];
 for(const item of reject)assert.equal(covers.verifiedAppleBookCoverUrl(book,[item],'BR'),null);
 const matcher=read('ebooks/ebook-matcher.js');
 assert.match(matcher,/verifiedAppleBookCoverUrl/);
 assert.match(matcher,/\['openlibrary','google','apple'\]/);
});

 test('Apple thumbnail sharpening preserves verified asset and rejects unrelated origins',()=>{
  const original='https://is1-ssl.mzstatic.com/image/thumb/Publication211/v4/exact/edition.jpg/100x100';
  assert.equal(covers.sharpAppleCoverUrl(original),original.replace('/100x100','/600x600bb.jpg'));
  assert.equal(covers.sharpAppleCoverUrl(original.replace('mzstatic.com','mzstatic.com.evil.test')),null);
  assert.equal(covers.sharpAppleCoverUrl(original.replace('/image/thumb/','/other/')),null);
  assert.equal(covers.sharpAppleCoverUrl(original.replace('/100x100','/600x600bb.jpg')),null);
  assert.equal(covers.sharpAppleCoverUrl('bad'),null);
 });

test('failed sharper Apple rendition falls back to the verified thumbnail',async()=>{
 const source=read('ebooks/ebook-matcher.js');
 const start=source.indexOf('async function showSourceCover('),end=source.indexOf('async function hydrateCover(',start);
 const calls=[],original='https://is1-ssl.mzstatic.com/image/thumb/Books/exact/100x100';
 const ctx=vm.createContext({window:{MatchAppBookCoverIdentity:covers},showVerifiedCover:async(_img,_fall,url,timeout)=>{calls.push({url,timeout});return url===original}});
 const show=vm.runInContext(source.slice(start,end)+';showSourceCover',ctx);
 assert.equal(await show({},null,original),true);
 assert.equal(calls.length,2);assert.equal(calls[0].timeout,2500);assert.equal(calls[1].url,original);
});

test('fresh rich artwork is reused while pinned source art retains priority',async()=>{
 const source=read('app.js'),start=source.indexOf('    let realCover;'),end=source.indexOf('    // Track the current match globally',start);
 let calls=0;
 const context=vm.createContext({selected:{title:'Exact Movie'},meta:{artwork:'https://official.example/exact.jpg'},verified:null,skipLiveLookup:false,matchHints:{},
  exactSpotifyPlaylistCover:()=>null,getRealCoverImage:async()=>{calls++;return 'https://other.example/cover.jpg'},generatedCover:()=>null});
 const run=()=>vm.runInContext('(async()=>{'+source.slice(start,end)+'return realCover})()',context);
 assert.equal(await run(),'https://official.example/exact.jpg');assert.equal(calls,0);
 context.verified='https://pinned.example/exact.jpg';assert.equal(await run(),context.verified);assert.equal(calls,0);
});
