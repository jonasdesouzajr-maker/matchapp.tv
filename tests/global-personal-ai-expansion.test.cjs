const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('app.js'),proxy=read('supabase/functions/gemini-proxy/index.ts');
const primary=read('supabase/functions/gemini-proxy/openai-primary.ts');
const helper=read('match-ai-rank.js'),books=read('ebooks/ebook-matcher.js');
const home=read('index.html'),events=JSON.parse(read('tools/global-events.json'));
const site=read('sitemap.xml');

test('only source-candidate allowlisted OpenAI ranking may reorder verified adult matches',()=>{
 assert.match(proxy,/body\?\.mode === "rank_candidates" && body\?\.adultMatch === true && body\?\.kidsMode !== true/);
 assert.match(proxy,/rankCandidateIds=candidates\.map\(v=>v\.id\)/);
 assert.match(proxy,/const allowed=new Set\(rankCandidateIds\)/);
 assert.match(primary,/rank_candidates/);
 assert.match(primary,/allowed\.has\(id\)/);
 assert.match(primary,/store:false/);
 assert.match(proxy,/LANG_NAMES\[langCode\.split\("-"\)\[0\]\]/);
 assert.match(proxy,/Mexican Spanish/);
 assert.match(proxy,/warm, thoughtful friend/);
 assert(proxy.indexOf('const answer = await callOpenAIPrimary')<proxy.indexOf('const routes = ['),'OpenAI serves before Gemini fallback');
});

test('opaque ranking returns only a byte-identical input candidate and fails gracefully',async()=>{
 const w={supabaseClient:{functions:{invoke:async()=>({data:{candidates:[{content:{parts:[{text:'{"ids":["injected","c1"]}'}]}}]}})}}};
 vm.runInNewContext(helper,{window:w,setTimeout,clearTimeout});
 const a={id:'a',title:'Original Song',originalArt:'source-only'},b={id:'b',title:'Official Movie',originalArt:'source-only'};
 assert.strictEqual(await w.MatchAppAIRank.rank([a,b],{mood:'funny'}),b);
 w.supabaseClient.functions.invoke=async()=>({error:{message:'temporary outage'}});
 assert.strictEqual(await w.MatchAppAIRank.rank([a,b],{mood:'funny'}),null);
});

test('all adult match formats keep hard filters and no unrequested recycles',()=>{
 assert.match(app,/rankVerifiedCuratedMatch\(requested\)/);
 const rank=app.indexOf('preflight=await withMatchSourceDeadline(()=>rankVerifiedCuratedMatch(requested)');
 const catalog=app.indexOf('preflight=pickFromCatalog(requested.cat');
 assert(rank>=0&&catalog>rank);
 assert.match(app,/regionAvailabilityFits\(e,criteria\)/);
 assert.match(app,/!isSpecificSearch && !preflight && typeof pickRecycledCatalog/);
 assert.doesNotMatch(app,/matchappAllowSeenAgain === true && typeof pickRecycledCatalog/);
 assert.match(app,/Previously suggested · matches all your choices/);
 assert.match(app,/pickGuaranteedCatalog\(requested\.cat,requested\.plat,requested\.mood,requested\.vibe,requested\.rating,requested\.decade,window\.matchappAllowSeenAgain !== true\)/);
 assert.match(app,/const ranked=await window\.MatchAppAIRank\.rank\(rows/);
 assert.match(books,/async function rankBooks\(approved,p\)/);
 // User-approved reading fallback may recycle previously seen profiles only
 // after fresh source profiles run out. Saved and disliked remain excluded.
 assert.match(books,/const unseen=bookCandidates\(p,false\)/);
 assert.match(books,/const ranked=unseen.length\?unseen:bookCandidates\(p,true\)/);
 assert.match(books,/for\(const allowSeen of \[false,true\]\)/);
 assert.match(books,/excluded=new Set\(\[\.\.\.read\(K.saved\),\.\.\.read\(K.disliked\)\]\)/);
 assert.match(books,/async function chooseMagazine\(p\)/);
 assert.match(books,/if\(verified.length\)return/);
});

test('home marquee keeps curated originals with native swipe tap suppression and keyboard activation',()=>{
 const section=home.match(/<div class="marquee-track" id="marquee-track">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/)?.[1]||'';
 const cards=[...section.matchAll(/<img[^>]*data-title="([^"]+)"[^>]*data-tmdb-id="([^"]+)"[^>]*src="([^"]+)"/g)];
 assert.equal(cards.length,20);
 for(let i=0;i<10;i++)assert.deepEqual(cards[i].slice(1,4),cards[i+10].slice(1,4));
 assert(home.indexOf('/match-ai-rank.js')<home.indexOf('/app.js?v='));
 assert.equal((section.split('role="button"').length-1),10);
 assert.match(app,/if\(vp\.id==='marquee-viewport'\)/);
 assert.match(app,/vp\.addEventListener\('pointermove'/);
 assert.match(app,/e\.stopImmediatePropagation\(\)/);
 assert.match(app,/window\.selectMarqueeItem\?\.\(title\)/);
});

test('India and Mexico editorial catalogs use real country identity without fabricated verified availability',()=>{
 const match=app.match(/\/\/ ---- Source-referenced Indian Hindi cinema and Mexican titles[^\n]*\n([\s\S]*?)    \{ title: "Business Proposal"/);
 assert(match,'region-specific canonical catalog insertion');
 const items=match[1].split('\n').filter(l=>l.trim().startsWith('{')).map(l=>JSON.parse(l.trim().replace(/,$/,'')));
 assert.equal(items.length,29);
 assert.equal(items.filter(x=>x.countryCode==='IN').length,14);
 assert.equal(items.filter(x=>x.countryCode==='MX').length,15);
 assert.equal(new Set(items.map(x=>x.title.toLowerCase())).size,29);
 assert(items.every(x=>x.title&&x.synopsis&&x.metadataSource&&x.platformVerified===false));
 assert(items.filter(x=>x.platform==='Netflix').every(x=>x.availabilityRegions.includes(x.countryCode)));
 assert.doesNotMatch(app,/\{ title: "RRR"[^\n]*cats: \["Bollywood","movie"\]/);
});

test('regional original events, rich pages and sitemaps agree without claiming editorial art is official',()=>{
 const expected=['kota-dussehra-2026','mexico-day-of-dead-2026','mexico-city-race-weekend-2026'];
 assert.equal(events.length,20);
 for(const slug of expected){
   const e=events.find(x=>x.slug===slug);assert(e&&e.official&&e.source);
   assert.equal(e.poster,'/assets/events/'+slug+'.svg');
   assert.match(e.posterCredit,/original/i);
   assert(fs.existsSync(path.join(__dirname,'..','assets/events',slug+'.svg')));
   const page=read('events/'+slug+'/index.html');
   assert.match(page,/application\/ld\+json/);
   assert(page.includes('https://matchapp.tv/events/'+slug+'/'));
   assert(page.includes('original independent MatchApp editorial illustration'));
   assert(home.includes('data-event-slug="'+slug+'"'));
   assert(site.includes('https://matchapp.tv/events/'+slug+'/'));
 }
 for(const slug of ['indian-cinema','mexican-series-films']){
   const html=read('collections/'+slug+'/index.html');
   assert.match(html,/application\/ld\+json/);
   assert.match(html,/rel="canonical"/);
   assert(html.includes('https://matchapp.tv/collections/'+slug+'/'));
   assert(site.includes('https://matchapp.tv/collections/'+slug+'/'));
 }
 assert.equal(JSON.parse(read('tools/event-urls.json')).length,events.length);
 assert.match(read('tools/update-sitemap.js'),/collections\/indian-cinema/);
 assert.match(read('tools/build-global-events.js'),/artLabel/);
});
