'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tv=require('../tvmaze-source.js');
const gutenberg=require('../ebooks/gutenberg-source.js');
const books=require('../ebooks/live-book-source.js');
const soft='A gentle ensemble comedy about friendships and finding a place to call home in a peaceful village.';
const show={id:99,name:'Quiet Escapes',premiered:'2022-08-10',
  genres:['Comedy','Family'],type:'Scripted',summary:'<p>'+soft+'</p>',
  url:'https://www.tvmaze.com/shows/99/quiet-escapes',
  image:{original:'https://static.tvmaze.com/uploads/images/original_untouched/3/7893.jpg'}};
const criteria={cats:['series'],moods:['cozy comfort watch'],genres:['Comedy'],decades:[],
  platform:[],ratings:[],vibes:[]};
const checks={known:new Set(),blockedGenres:new Set(),blockedCountries:[],
  moodFits:(moods,genres,synopsis)=>!moods.length||genres.includes('Comedy')&&
     !/thriller|killer|violence/i.test(synopsis),blockedText:()=>false,explicit:()=>false};
test('independently attributed TV source requires genuine source URL, poster and exact genre, never fabricates stream rights',()=>{
 const hit=tv.select([show],criteria,checks);
 assert.equal(hit.title,show.name);
 assert.equal(hit.source,'tvmaze-source-verified');
 assert.equal(hit.platformVerified,false);
 assert.equal(hit._meta.sourceUrl,show.url);
 assert.equal(hit._meta.artwork,show.image.original);
 assert.equal(tv.select([{...show,url:'https://www.tvmaze.com/shows/666/wrong'}],criteria,checks),null);
 assert.equal(tv.select([{...show,image:{original:'https://evil.test/fake.jpg'}}],criteria,checks),null);
 assert.equal(tv.select([{...show,genres:['Thriller']}],criteria,checks),null);
 assert.equal(tv.select([{...show,summary:'<p>A serial killer thriller terrorizes the peaceful village all week.</p>'}],criteria,checks),null);
 assert.equal(tv.select([show],criteria,{...checks,known:new Set(['quietescapes'])}),null);
 assert.equal(tv.select([show],{...criteria,ratings:['all ages family friendly']},checks),null);
 assert.equal(tv.select([show],{...criteria,platform:['Netflix']},checks),null);
 assert.equal(tv.select([show],{...criteria,cats:['movie']},checks),null);
 assert.equal(tv.select([show],criteria,{...checks,blockedCountries:['BR']}),null);
});
test('TV source pagination is bounded, on-demand and does not confuse a source outage with inventory',async()=>{
 const seen=[];
 const hit=await tv.discover(criteria,checks,async(url)=>{seen.push(url);
  return {ok:true,json:async()=>seen.length===1?[{...show,genres:['Thriller']}]:[show]};
 });
 assert.equal(hit.title,'Quiet Escapes');
 assert.equal(seen.length,2);
 assert(seen.every(x=>x.startsWith('https://api.tvmaze.com/shows?page=')));
 assert.notEqual(new URL(seen[0]).searchParams.get('page'),new URL(seen[1]).searchParams.get('page'));
 const empty=await tv.discover({...criteria,cats:['movie']},checks,async()=>{throw Error('no network expected')});
 assert.equal(empty,null);
});
const classic={title:'Emma',author:'Jane Austen',access:['free','paid']};
const gutenbergRow={id:158,title:'Emma',media_type:'Text',copyright:false,
 authors:[{name:'Austen, Jane'}]};
test('Gutenberg adds actual independent free editions only after exact work and US rights proof',async()=>{
 const verified=gutenberg.verifiedUS(classic,[gutenbergRow],'US');
 assert.equal(verified.sourceUrl,'https://www.gutenberg.org/ebooks/158');
 assert.equal(gutenberg.verifiedUS(classic,[gutenbergRow],'BR'),null);
 assert.equal(gutenberg.verifiedUS(classic,[{...gutenbergRow,copyright:null}],'US'),null);
 assert.equal(gutenberg.verifiedUS(classic,[{...gutenbergRow,authors:[{name:'Austen, Other'}]}],'US'),null);
 const requests=[];
 const record=await gutenberg.search(classic,'US',async url=>{
  requests.push(url);return {ok:true,json:async()=>({results:[gutenbergRow]})};
 });
 assert.equal(record.verified,true);
 assert.equal(requests.length,1);
 assert.equal(new URL(requests[0]).hostname,'gutendex.com');
 assert.equal(new URL(requests[0]).searchParams.get('copyright'),'false');
});
const work={key:'/works/OL999W',title:'The Voyage Beyond',
 author_name:['Reader, Alex'],first_publish_year:2018,cover_i:1324,
 subject:['Fantasy fiction','Adventure stories']};
const volume={volumeInfo:{title:'The Voyage Beyond',authors:['Alex Reader'],pageCount:300,
 description:'A richly imagined adventure about friendship and discovery beyond the mountains and seas, following a journey across a mysterious fantasy world.',
 maturityRating:'NOT_MATURE'},saleInfo:{country:'BR',saleability:'FOR_SALE',
 buyLink:'https://play.google.com/store/books/details?id=verified123'}};
const prefs={format:'ebook',mood:'any',genre:'fantasy',pace:'any',length:'any',era:'recent',access:'paid'};
test('live book requires two independently exact sources, verified country sale, true original cover and substantive summary',()=>{
 const approved=books.approve(work,[volume],prefs,'BR');
 assert.equal(approved.id,'ol:OL999W');
 assert.equal(approved.sourcePage,'https://openlibrary.org/works/OL999W');
 assert.equal(approved.storeUrl,volume.saleInfo.buyLink);
 assert.equal(approved.verifiedCover,'https://covers.openlibrary.org/b/id/1324-L.jpg');
 assert.equal(approved.moods.length,0,'never infer subjective mood');
 assert.equal(approved.era,'recent');
 assert.equal(books.approve({...work,key:'/authors/OL1A'},[volume],prefs,'BR'),null);
 assert.equal(books.approve({...work,subject:['General fiction']},[volume],prefs,'BR'),null);
 assert.equal(books.approve(work,[{...volume,volumeInfo:{...volume.volumeInfo,authors:['Different Author']}}],prefs,'BR'),null);
 assert.equal(books.approve(work,[{...volume,saleInfo:{...volume.saleInfo,country:'US'}}],prefs,'BR'),null);
 assert.equal(books.approve(work,[{...volume,saleInfo:{...volume.saleInfo,saleability:'NOT_FOR_SALE'}}],prefs,'BR'),null);
 assert.equal(books.approve(work,[{...volume,volumeInfo:{...volume.volumeInfo,description:'Short'}}],prefs,'BR'),null);
 assert.equal(books.approve(work,[{...volume,volumeInfo:{...volume.volumeInfo,maturityRating:'MATURE'}}],prefs,'BR'),null);
 assert.equal(books.approve(work,[{...volume,volumeInfo:{...volume.volumeInfo,maturityRating:undefined}}],prefs,'BR'),null,'an unclassified retailer rating must not count as confirmed safe');
 assert.equal(books.approve(work,[{...volume,saleInfo:{...volume.saleInfo,buyLink:'https://books.google.com/books?id=preview'}}],prefs,'BR'),null,'a preview is not a retailer purchase link');
});
test('empty editorial e-book pool may search trusted libraries only when source can verify every hard criterion',async()=>{
 const seen=[];
 const fetchMock=async url=>{
  seen.push(url);
  return {ok:true,json:async()=>new URL(url).hostname==='openlibrary.org'?{docs:[work]}:{items:[volume]}};
 };
 const hit=await books.discover(prefs,{market:'BR',excluded:new Set()},fetchMock);
 assert.equal(hit.title,'The Voyage Beyond');
 assert.equal(seen.length,2);
 assert.equal(new URL(seen[0]).hostname,'openlibrary.org');
 assert.equal(new URL(seen[0]).pathname,'/search.json');
 assert.equal(new URL(seen[1]).hostname,'www.googleapis.com');
 assert.equal(new URL(seen[1]).pathname,'/books/v1/volumes');
 let blocked=0;
 const noMood=await books.discover({...prefs,mood:'cozy'},{market:'BR',excluded:new Set()},async()=>{blocked++;return null});
 assert.equal(noMood,null);assert.equal(blocked,0,'unknown source mood may not be invented');
 const noFree=await books.discover({...prefs,access:'free'},{market:'BR',excluded:new Set()},async()=>{blocked++;return null});
 assert.equal(noFree,null);assert.equal(blocked,0,'unknown free rights cannot be claimed');
});
test('same Match attempt inspects bounded source-verified TMDB windows before TVmaze fallback',()=>{
 const app=read('app.js');
 assert(app.includes('async function discoverVerifiedExactTMDB(requested)'));
 assert(app.includes('pagePlan=provider?[[1,3],[4,3]]:[[1,2],[3,2]]'),
  'wider TMDB coverage must use the existing main two-window strategy');
 assert(app.includes('Date.now()-sourceStarted>46000'),'search budget protects mobile WebViews');
 assert(app.includes('MAX_EXACT_DETAILS=14'),'bounded exact-identity detail checks');
 assert(app.includes('TMDB_DISCOVERY_CURSOR=new Map()'),'exhausted criteria must explore new source windows on a later attempt');
 assert(app.includes('const pageStart=relativeStart+offset'),'cursor must move the next batch beyond previous candidates');
 assert(app.includes('if(sawResults&&!sourceOutage)advance()'),'do not advance source windows on provider outage');
 assert(app.includes('if(!d&&prefs.countries.size)continue'),'unverified origin cannot evade a user country blocklist');
 assert(app.includes('if(!Array.isArray(candidates)||!candidates.length)'),
  'an unavailable source cannot prove inventory');
 assert(app.includes('withMatchSourceDeadline(()=>discoverVerifiedExactTMDB(requested),MATCH_SOURCE_DEADLINES.tmdb)'));
 assert(app.includes('withMatchSourceDeadline(()=>discoverVerifiedTVMaze(requested),MATCH_SOURCE_DEADLINES.tvmaze)'));
 assert(!app.includes("['broaden-mood'"),'never relax Comfort into a thriller');
});
test('only adult pages load independent source fallbacks; Kids manual-reviewed library is never widened by public search',()=>{
 const home=read('index.html'),discover=read('discover.html'),kids=read('kids/index.html');
 const app=read('app.js'),match=read('ebooks/ebook-matcher.js');
 assert(home.indexOf('/tvmaze-source.js')>=0&&home.indexOf('/tvmaze-source.js')<home.indexOf('/app.js'));
 assert(discover.indexOf('/tvmaze-source.js')>=0&&discover.indexOf('/tvmaze-source.js')<discover.indexOf('/app.js'));
 assert(home.indexOf('/ebooks/live-book-source.js')>=0&&home.indexOf('/ebooks/live-book-source.js')<home.indexOf('/ebooks/ebook-matcher.js'));
 assert(home.indexOf('/ebooks/gutenberg-source.js')>=0&&home.indexOf('/ebooks/gutenberg-source.js')<home.indexOf('/ebooks/ebook-matcher.js'));
 assert(!kids.includes('tvmaze-source.js')&&!kids.includes('live-book-source.js')&&!kids.includes('gutenberg-source.js'));
 assert(app.includes('discoverVerifiedTVMaze')&&app.includes('moodFits:moodFitsVerified'));
 assert(app.includes("if (selected.source !== 'tvmaze-source-verified') void getCuratedPoster(selected.title)"),
  'a same-name curated title must never overwrite the independent TV source image');
 assert(app.includes("|| selected.source === 'tvmaze-source-verified'"),
  'the selected independent source must take precedence over unrelated exact-title poster maps');
 assert(app.includes('static\\.tvmaze\\.com'), 'preserve already loaded official independent cover art');
 assert(match.includes('MatchAppLiveBookSource?.discover')&&match.includes('MatchAppGutenbergSource.search'));
 assert(app.includes("const terms=[term]"),'regional music and podcasts retry independently with exact format gates');
});
