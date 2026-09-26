'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function modules(userAgent='Mozilla/5.0 Chrome/120.0'){
 const win={location:{pathname:'/'},navigator:{language:'pt-BR',userAgent,standalone:false},matchMedia:()=>({matches:false})};
 const context={window:win,URL,document:{createElement:()=>({})},localStorage:{getItem:()=>''},Math,console};
 for(const file of ['content-safety.js','ebooks/magazines.js','ebooks/affiliate-links.js','ebooks/reading-ai.js'])
  vm.runInNewContext(read(file),context,{filename:file});
 return win;
}
test('magazines are a distinct explicitly selected adult matching format',()=>{
 const match=read('ebooks/ebook-matcher.js');
 assert.match(match,/\['magazine','📰','Magazine only'\]/);
 assert.match(match,/p\.format==='magazine'\)pick=chooseMagazine\(p\)/);
 assert.match(match,/renderMagazineResult\(root,book,p\)/);
 assert.doesNotMatch(read('kids/index.html'),/MatchAppMagazines|magazines\.js|reading-ai\.js/);
});
test('curated global magazines use original publisher destinations and exclude XXX',()=>{
 const w=modules(),m=w.MatchAppMagazines.items,safe=w.MatchAppContentSafety;
 assert.equal(m.length,24);
 assert(m.some(x=>x.region==='BR')&&m.some(x=>x.region==='JP')&&m.some(x=>x.region==='AU'));
 for(const item of m){
  assert(!safe.isExplicit(item),'explicit magazine: '+item.title);
  for(const key of ['site','issues','subscription','icon']){
   assert.equal(new URL(item[key]).protocol,'https:',key+' uses a secure official destination');
   assert.equal(safe.unsafeLink(item[key]),false,key+' points to blocked site');
  }
  assert(!/\.pdf(?:\?|$)/i.test(item.issues),'do not promise unlicensed PDF downloads');
 }
});
test('mainstream health and education are not rejected by XXX title classifier',()=>{
 const policy=modules().MatchAppContentSafety;
 for(const request of ['find XXX videos','Pornhub magazine','hardcore sex videos','hentai anime']){
  assert.equal(policy.isPornographicRequest(request),true,request);
 }
 for(const title of ['Sex Education','sexual health reporting','The New Yorker','National Geographic']){
  assert.equal(policy.isPornographicRequest(title),false,title);
 }
 assert.equal(policy.unsafeLink('https://www.pornhub.com/test'),true);
 assert.equal(policy.unsafeLink('https://www.onlyfans.com/test'),true);
});
test('magazine recommendations obey mood, genre, region and saved exclusions',()=>{
 const w=modules(),api=w.MatchAppMagazines;
 const available=api.items.filter(x=>x.region==='BR'&&x.genres.includes('science')&&x.moods.includes('curious'));
 assert(available.length>0);
 const chosen=api.select({mood:'curious',genre:'science',access:'any'},'BR',[]);
 assert(chosen&&chosen.region==='BR'&&chosen.genres.includes('science'));
 assert.equal(api.select({mood:'not-a-matching-mood',genre:'science',access:'any'},'BR',[]),null,'magazine fallback must not discard an explicit mood');
 const blocked=api.items.map(x=>x.id);
 assert.equal(api.select({mood:'any',genre:'any',access:'any'},'BR',blocked),null);
});
test('Brazil Amazon search has permitted web tag and precedes publisher routes',()=>{
 const w=modules(),mag=w.MatchAppMagazines.items[0],aff=w.MatchAppEbookAffiliate;
 const offers=w.MatchAppMagazines.buyLinks(mag,'BR',aff);
 assert.match(offers[0].url,/amazon\.com\.br/);
 assert.equal(new URL(offers[0].url).searchParams.get('tag'),'matchapp06-20');
 assert.equal(aff.isAffiliateLink(offers[0].url),true);
 assert.equal(offers[1].url,mag.subscription);
 assert.match(aff.disclosure('pt-BR'),/compras qualificadas/);
});
test('native Android and other markets never inherit unapproved Amazon affiliate tags',()=>{
 const w=modules('MatchAppAiAndroid/1.1.28'),mag=w.MatchAppMagazines.items[0],a=w.MatchAppEbookAffiliate;
 assert.equal(a.amazonMagazineSearchUrl(mag,'BR'),'','native Android has no unapproved Amazon magazine destination');
 const web=modules().MatchAppEbookAffiliate;
 assert.equal(new URL(web.amazonMagazineSearchUrl(mag,'JP')).searchParams.get('tag'),null);
 assert.equal(new URL(web.amazonMagazineSearchUrl(mag,'AU')).searchParams.get('tag'),null);
});
test('Ask AI routes English, Portuguese, Spanish and Japanese reading formats',()=>{
 const intent=modules().MatchAppReadingAI.intent;
 assert.equal(intent('recommend a fashion magazine'),'magazine');
 assert.equal(intent('quero uma revista de ciência'),'magazine');
 assert.equal(intent('recomiéndame revistas'),'magazine');
 assert.equal(intent('おすすめの雑誌を教えて'),'magazine');
 assert.equal(intent('オーディオブックを探しています'),'audiobook');
 assert.equal(intent('recomende um audiolivro'),'audiobook');
 assert.equal(intent('recommend an ebook'),'ebook');
 const discover=read('discover.js');
 assert.match(discover,/雑誌\|オーディオブック/);
 assert.match(discover,/MatchAppContentSafety\?\.safeEntries/);
});
test('SEO describes magazines truthfully on existing indexed URLs only',()=>{
 const home=read('index.html'),hub=read('ebooks/index.html'),ask=read('discover.html');
 assert.match(home,/global magazine recommendations|AI magazine recommendations/i);
 assert.match(hub,/AI magazine matcher/);
 assert.match(hub,/Discover magazines worldwide by subject and mood/);
 assert.match(hub,/original publisher|official publisher/i);
 assert.match(ask,/AI magazine finder/);
 assert.match(hub,/rel="canonical" href="https:\/\/matchapp\.tv\/ebooks\/"/);
 assert.match(hub,/"@type":"CollectionPage"/);
 assert.match(hub,/"@type":"Service"/);
});


test('a harmless title cannot hide a blocked XXX destination in adult results or source cards',()=>{
 const policy=modules().MatchAppContentSafety;
 const forbidden=[
  {title:'Film recommendation',watchUrl:'https://www.pornhub.com/view_video.php?test=1'},
  {title:'Reading recommendation',links:[{label:'Read',url:'https://onlyfans.com/example'}]},
  {title:'Cover artwork',imageUrl:'https://img.xnxx.com/cover.jpg'},
  {title:'Store result',sources:[{href:'https://subdomain.xhamster.com/abc'}]},
  {title:'Music recommendation',url:'https://www.redtube.com/123'}
 ];
 const accepted=[
  {title:'Sex Education',watchUrl:'https://www.netflix.com/title/example'},
  {title:'Health journalism',url:'https://sciencefocus.com/health'},
  {title:'Documentary',watchUrl:'/watch/title'}
 ];
 assert.equal(Array.from(policy.safeEntries(forbidden)).length,0,'blocked sources must never be displayed');
 assert.deepEqual(Array.from(policy.safeEntries(accepted)),accepted);
 for(const term of ['xvideos','xnxx','xhamster','redtube','youporn','brazzers'])
  assert.equal(policy.isPornographicRequest('Find '+term+' videos'),true,term);
 assert.equal(policy.unsafeLink('https://pornhub.com.evil.example'),false,'no substring host false positives');
 const server=read('supabase/functions/gemini-proxy/index.ts');
 assert.match(server,/hasBlockedXXXDestination\(r\)/,'server must filter unsafe provider URLs before returning results');
 assert.match(server,/hasBlockedXXXDestination\(\{url:m\[0\]\}\)/,'server must also reject unsafe URLs embedded in answer text');
});


test('all adult entrypoints request the updated XXX safety guard instead of a stale cached copy',()=>{
 for(const page of ['index.html','discover.html','ebooks/index.html']){
  const html=read(page);
  assert.match(html,/\/content-safety\.js\?v=20260925-xxx2/,page);
  assert.doesNotMatch(html,/\/content-safety\.js\?v=20260925-xxx1/,page);
 }
 assert.doesNotMatch(read('kids/index.html'),/content-safety\.js/);
});
