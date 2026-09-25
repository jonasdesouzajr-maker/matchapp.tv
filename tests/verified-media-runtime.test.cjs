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
 assert(home.includes('/ebooks/cover-identity.js?v=20260925-original2'));
 assert(!kids.includes('/ebooks/audiobooks.js')&&!kids.includes('/ebooks/ebook-matcher.js'));
});
