const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'),{JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'..');
const get=f=>fs.readFileSync(path.join(base,f),'utf8');
test('speech starts without waiting for the full typewriter and owns mic sequencing',()=>{
 const src=get('discover.js'),stage=get('jonas/discovery-avatar-stage-20261010.js');
 const start=src.indexOf('if (voiceOrigin && String(payload.answer ||');
 const type=src.indexOf('await typewriterReveal(bubble.textEl,payload.answer,8);');
 assert.ok(start>0&&type>start,'voice branch precedes typed animation');
 assert.match(src,/onProgress:p=>narration\?\.advance\?\.\(p\)/);
 assert.match(stage,/onEnd:ok=>\{opts\?\.onComplete\?\.\(ok\);endSpeaking\(ok&&opts\?\.autoListen===true\)\}/);
 assert.match(stage,/timer=setTimeout\(\(\)=>\{if\(voiceTurn[^;]+mic\.click\(\)\},380\)/);
});
test('transcript follows only characters actually spoken and clears line highlights',()=>{
 const dom=new JSDOM('<main><div id="chat-log"><div id="answer"></div></div></main>',{runScripts:'dangerously',url:'https://matchapp.tv/discover.html'});
 const {window:w}=dom;w.eval(get('jonas/narrated-transcript-20261011.js'));
 const answer=w.document.getElementById('answer');
 const long=('A complete sentence for the listener. ').repeat(42);
 const obj=w.MatchAppJonasNarration.prepare(answer,long);
 assert.ok(obj.nodes.length>2);assert.ok(answer.textContent.includes(long.trim().slice(650)));
 assert.ok(answer.querySelector('.jonas-unspoken-remainder'),'unsaid text stays visible and unmarked');
 w.MatchAppJonasNarration.advance(.65);
 assert.ok(answer.querySelectorAll('.jonas-spoken').length>=1);
 assert.equal(answer.querySelectorAll('.jonas-speaking-line').length,1);
 w.MatchAppJonasNarration.finish();
 assert.equal(answer.querySelectorAll('.jonas-speaking-line').length,0);
 assert.ok(answer.querySelectorAll('.jonas-spoken').length>1);
 dom.window.close();
});
test('exact-author book details never invent another work rating or cover',async()=>{
 const api=require(path.join(base,'ebooks/book-details-20261011.js'));
 const rows=[
  {title:'Verity',author_name:['Different Writer'],cover_i:1234,ratings_average:5,ratings_count:100},
  {title:'Verity',author_name:['Colleen Hoover'],cover_i:8747160,first_publish_year:2018,number_of_pages_median:340,ratings_average:3.875,ratings_count:128,key:'/works/OL1234W'}
 ];
 assert.equal(api.openLibraryMatch({title:'Verity',author:'Colleen Hoover'},rows).cover_i,8747160);
 assert.equal(api.openLibraryMatch({title:'Nonexistent',author:'Colleen Hoover'},rows),null);
 const old=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>({docs:rows})});
 try{
 const details=await api.lookup({title:'Verity',author:'Colleen Hoover'});
 assert.equal(details.year,2018);assert.equal(details.pages,340);assert.equal(details.count,128);
 assert.equal(details.rating,3.875);
 assert.ok(details.cover.startsWith('https://covers.openlibrary.org/b/id/8747160-'));
 }finally{global.fetch=old}
});
test('top E-books hub renders real cover elements with verified metadata support',()=>{
 const html=get('ebooks/index.html'),home=get('index.html'),ebook=get('ebooks/ebook-matcher.js');
 assert.match(html,/data-top-cover alt="" hidden/);
 assert.match(html,/MatchAppBookDetails\?\.hydrate/);
 assert.match(ebook,/MatchAppBookDetails\?\.hydrate/);
 assert.match(home,/book-details-20261011\.js/);
 assert.match(html,/book-details-20261011\.js/);
 const css=get('ebooks/ebook-matcher.css');
 assert.match(css,/ebook-home-picks>summary/);
 assert.match(css,/ebook-home-picks\{[^}]+border:0!important/s);
 assert.match(css,/ebook-verified-meta/);
});
test('global grid tokens are equal for all adult pages and do not target Kids/Ads',()=>{
 const css=get('premium-finish-20261011.css');
 assert.match(css,/--ma-grid-gap:12px/);
 assert.match(css,/--ma-grid-radius:20px/);
 assert.match(css,/--ma-grid-field-height:44px/);
 assert.match(css,/not\(\.page-kids\):not\(\.kids-body\)/);
 const pages=['index.html','discover.html','ebooks/index.html','profile/profile.html','pricing/pricing.html','friends.html'];
 for(const p of pages)assert.match(get(p),/premium-finish-20261011\.css\?v=20261011-grid3/,p);
});
