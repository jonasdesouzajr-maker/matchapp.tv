'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),{JSDOM}=require('jsdom');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),discover=read('discover.js');
const extract=(a,b)=>discover.slice(discover.indexOf(a),discover.indexOf(b,discover.indexOf(a)+a.length));
test('verified spoken recommendations resolve concurrently and preserve genres and exact art',async()=>{
 let release;const blocked=new Promise(r=>release=r),calls=[];
 const records={'Ted Lasso':{title:'Ted Lasso',media_kind:'tv',year:2020,genres:['Comedy'],poster_url:'https://image.tmdb.org/t/p/w500/real.jpg'},'The Good Place':{title:'The Good Place',media_kind:'tv',genres:['Comedy']}};
 const window={MatchAppCatalogMedia:{lookup:async title=>{calls.push(title);if(title==='Ted Lasso')await blocked;return records[title]||null;}}};
 vm.runInNewContext(read('jonas/title-card-presentation-20261011.js'),{window});
 const running=window.MatchAppJonasTitlePresentation.fromAnswers('Ted Lasso and The Good Place are comedies.');
 await Promise.resolve();assert.ok(calls.includes('The Good Place'),'second title starts while first is pending');
 release();const cards=await running;assert.equal(cards.length,2);assert.ok(cards[0].cats.includes('Comedy'));assert.equal(cards[0]._catalogMedia.poster_url,records['Ted Lasso'].poster_url);
});
function renderer(){
 const dom=new JSDOM('<html><body></body></html>',{url:'https://matchapp.tv/discover.html',runScripts:'outside-only'});
 const w=dom.window;w.CONTENT_CATALOG=[];w.eval(read('matching-policy.js'));
 const ctx={window:w,document:w.document,CONTENT_CATALOG:[],lastDiscoverQuestion:'watch something funny',isDiscoverDisliked:()=>false,titleKey:t=>t.toLowerCase(),discoverCardHTML:item=>'<img src="'+(item._catalogMedia?.poster_url||'')+'" alt="'+item.title+'">',hydrateDiscoverCard:async()=>{},attachRelated:async()=>{}};
 vm.createContext(ctx);vm.runInContext(extract('function enrichDiscoverItem(','function itemFromTitle(')+extract('async function renderResultsInto(','/* ---------- The main ask flow ---------- */'),ctx);
 return {dom,w,ctx};
}
test('sparse AI records acquire verified genres before existing policy filtering',async()=>{
 const {dom,w,ctx}=renderer();let sourceYear;
 w.MatchAppCatalogMedia={lookup:async(title,opts)=>{sourceYear=opts.year;return {title,year:2020,media_kind:'tv',genres:['Comedy'],overview:'A kind football coach.',poster_url:'https://image.tmdb.org/t/p/w500/real.jpg'}},viewingTarget:()=>null};
 const grid={innerHTML:'',style:{},replaceChildren(){this.innerHTML=''}};
 await ctx.renderResultsInto(grid,[{title:'Ted Lasso',year:'2020-08-14',type:'series'}],0);
 assert.equal(sourceYear,'2020');assert.match(grid.innerHTML,/real.jpg/);
 const horror=ctx.enrichDiscoverItem({title:'Dark Crime',cats:['Horror'],synopsis:'A terrifying horror story'},'watch something funny');
 assert.equal(horror,null,'policy still rejects the wrong genre');dom.window.close();
});
test('verified cached poster paints while optional availability is pending without claiming a provider',async()=>{
 const {dom,w,ctx}=renderer();let release;w.MatchAppCatalogMedia={lookup:()=>new Promise(r=>release=r),viewingTarget:()=>null};
 const grid={innerHTML:'',style:{},replaceChildren(){this.innerHTML=''}},meta={title:'Ted Lasso',media_kind:'tv',genres:['Comedy'],poster_url:'https://image.tmdb.org/t/p/w500/real.jpg'};
 const running=ctx.renderResultsInto(grid,[{title:'Ted Lasso',cats:['Comedy'],_catalogMedia:meta}],0);
 await new Promise(resolve=>setImmediate(resolve));assert.match(grid.innerHTML,/real.jpg/);release(meta);await running;dom.window.close();
});
test('adult discovery deadlines leave ordinary matching and Kids provider budgets intact',()=>{
 const main=read('supabase/functions/gemini-proxy/index.ts');
 assert.match(main,/isDiscoverMode \? 26_000 : isRankMode \|\| isProposalMode \? 43_000 : 58_000/);
 assert.match(main,/isDiscoverMode && body\?\.kidsMode !== true \? 8_000 : PER_MODEL_TIMEOUT_MS/);
 for(const f of ['openai-primary.ts','openrouter-backup.ts'])assert.match(read('supabase/functions/gemini-proxy/'+f),/mode==="discover"\?6_000:/);
 assert.match(read('supabase/functions/gemini-proxy/groq-backup.ts'),/if\(remaining<=0\)return null/);
});

test('filtered cards keep their original Watch Later and dismiss action indices',async()=>{
 const {dom,w,ctx}=renderer();
 w.MatchAppCatalogMedia={lookup:async title=>({title,media_kind:'tv',genres:[title==='Dark Crime'?'Horror':'Comedy'],poster_url:'https://image.tmdb.org/t/p/w500/real.jpg'}),viewingTarget:()=>null};
 ctx.discoverCardHTML=(item,index)=>'<article data-index="'+index+'">'+item.title+'</article>';
 const grid={innerHTML:'',style:{},replaceChildren(){this.innerHTML=''}};
 await ctx.renderResultsInto(grid,[{title:'Dark Crime',type:'series'},{title:'Ted Lasso',type:'series'}],4);
 assert.match(grid.innerHTML,/data-index="5"/);assert.doesNotMatch(grid.innerHTML,/Dark Crime/);dom.window.close();
});

test('spoken possessive titles retain their exact identity',async()=>{
 const title="Schitt's Creek";const window={MatchAppCatalogMedia:{lookup:async name=>name===title?{title,media_kind:'tv',genres:['Comedy']}:null}};
 vm.runInNewContext(read('jonas/title-card-presentation-20261011.js'),{window});
 const cards=await window.MatchAppJonasTitlePresentation.fromAnswers("Schitt's Creek is a warm comedy.");assert.equal(cards[0]?.title,title);
});

test('non-Latin title verification never equates unrelated source names or their posters',async()=>{
 for(const [requested,other] of [['千と千尋の神隠し','となりのトトロ'],['기생충이라는영화','다른영화입니다'],['霸王别姬这部电影','卧虎藏龙这部电影'],['فيلم سينمائي','عمل مختلف']]){
  const window={MatchAppCatalogMedia:{lookup:async()=>({title:other,media_kind:'movie',poster_url:'https://image.tmdb.org/t/p/w500/other.jpg'})}};
  vm.runInNewContext(read('jonas/title-card-presentation-20261011.js'),{window});
  const cards=await window.MatchAppJonasTitlePresentation.fromAnswers('“'+requested+'”');
  assert.equal(cards.length,0,requested+' must not inherit '+other+' artwork');
  window.MatchAppCatalogMedia.lookup=async()=>({title:requested,media_kind:'movie',poster_url:'https://image.tmdb.org/t/p/w500/exact.jpg'});
  const exact=await window.MatchAppJonasTitlePresentation.fromAnswers('“'+requested+'”');
  assert.equal(exact[0]?.title,requested);
 }
});
