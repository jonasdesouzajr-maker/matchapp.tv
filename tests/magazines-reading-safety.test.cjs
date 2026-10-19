'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function setup(ua='Mozilla/5.0',region='pt-BR'){
 const context={window:{navigator:{userAgent:ua,language:region},matchMedia:()=>({matches:false})},URL};
 vm.runInNewContext(read('content-safety.js'),context,{filename:'content-safety.js'});
 vm.runInNewContext(read('ebooks/magazines.js'),context,{filename:'magazines.js'});
 vm.runInNewContext(read('ebooks/affiliate-links.js'),context,{filename:'affiliate-links.js'});
 return context.window;
}
test('permanent no-XXX restriction excludes pornography without censoring mainstream science/journalism',()=>{
 const w=setup(),safe=w.MatchAppContentSafety;
 for(const label of ['XXX magazine','Pornography','OnlyFans channel','hardcore videos','erotic magazines'])
  assert.equal(safe.isExplicit(label),true,label);
 for(const label of ['Sex Education','sexual health reporting','adult science education','National Geographic','Scientific American'])
  assert.equal(safe.isExplicit(label),false,label);
 assert.equal(safe.unsafeLink('https://www.pornhub.com/example'),true);
 assert.equal(safe.unsafeLink('https://time.com/'),false);
});
test('expanded official adult-only global magazine profiles contain real publisher routes, no fake issue cover or XXX titles',()=>{
 const w=setup(),items=w.MatchAppMagazines.items;
 assert.ok(items.length>=37);
 assert.ok(items.some(x=>x.region==='BR'));
 assert.ok(items.some(x=>x.region==='AU'));
 assert.ok(items.some(x=>x.region==='JP'));
 assert.ok(items.every(x=>!w.MatchAppContentSafety.isExplicit(x)&&x.kind==='magazine'));
 for(const m of items){
  assert.ok(/^https:\/\//.test(m.issues)&&/^https:\/\//.test(m.site));
  const icon=new URL(m.icon),publisher=new URL(m.site);
  assert.equal(icon.hostname,publisher.hostname,'publisher icon must be served from its official host: '+m.title);
  if(m.id==='mag-monocle')
    assert.equal(icon.href,'https://monocle.com/wp-content/uploads/2025/11/cropped-MONOCLE_DIGI_BLACK-BGWHITE-M-MARK_1.png?fit=192%2C192',
      'Monocle uses the visible original icon published by its homepage, not its transparent root favicon');
  else assert.ok(icon.pathname.endsWith('/favicon.ico'),'use original publisher-brand icon: '+m.title);
  if(m.id==='mag-vogue')
    assert.equal(icon.pathname,'/verso/static/vogue-global/assets/us/favicon.ico',
      'Vogue icon must point at the published brand asset, not an assumed root path');
  assert.deepEqual(Array.from(m.access),['free','paid']);
 }
});
test('magazine-only selection respects topics, exclusions, and source priority without mixing in e-books',()=>{
 const api=setup().MatchAppMagazines;
 const one=api.select({genre:'science',mood:'any',access:'free'},'BR',new Set());
 assert.ok(one&&one.kind==='magazine'&&one.genres.includes('science'));
 const exclude=new Set(api.items.map(m=>m.id));
 assert.equal(api.select({genre:'science',mood:'any',access:'free'},'BR',exclude),null);
 assert.equal(api.select({genre:'fantasy',mood:'any',access:'any'},'BR',new Set()),null);
 const match=read('ebooks/ebook-matcher.js');
 assert.match(match,/\['magazine','📰','Magazine only'\]/);
 assert.match(match,/p\.format==='magazine'\)pick=await chooseMagazine\(p\)/);
 assert.match(match,/if\(magazine\)\{renderMagazineResult\(root,book,p,pick\);return;\}/);
 assert.match(match,/const allowed=await window\.checkDailyLimit\('match',tokenContext\)/);
 assert.match(match,/if\(!allowed\)return;/);
 assert.match(match,/data-ebook-save/);
 assert.match(match,/function consumeReadingDeepLink\(\)/);
 assert.match(match,/url\.searchParams\.get\('reading'\)/);
 assert.match(match,/p\.format=format;savePrefs\(p\)/);
 assert.match(read('discover.js'),/route\.href = '\/\?reading='/);

});
test('magazine matching retains the original shared allowance when the actual token policy is disabled',async()=>{
 const w=new JSDOM('<html><body><section id="reading"><button data-ebook-match></button><div data-ebook-note></div><div data-ebook-result></div></section></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true}).window;
 const calls=[],order=[],claims=new Map(),rootNode=w.document.getElementById('reading');let allowed=true,found=true;
 w.supabaseClient={auth:{getSession:async()=>({data:{session:null}})},rpc:async name=>{calls.push(name);return{data:{ok:true,enabled:false,policy_version:'match-tokens-v1',authenticated:false}};}};
 w.eval(read('match-tokens.js'));await w.MatchAppTokens.refresh();
 const quota=async(action,context)=>{order.push('quota');assert.equal(action,'match');assert.equal(context.surface,'ebook');return allowed;};w.checkDailyLimit=quota;
 const magazine=setup().MatchAppMagazines.items[0];
 const context={window:w,console,prefs:()=>({format:'magazine',access:'free'}),chooseMagazine:async()=>{order.push('source');return found?{book:magazine,magazine:true}:null;},matchNote:()=>'',read:()=>[],K:{saved:'saved',disliked:'disliked',seen:'existing-seen'},renderResult:()=>order.push('reveal'),renderReadingDiscovery:()=>order.push('source-fallback'),
  readingOwner:'guest',readingEpoch:0,readingClaims:claims,cloudHydrate:async()=>true,cloudSync:async()=>{},readingHistoryNotice:()=>{throw Error('history unexpectedly unavailable');},
  claimReading:async id=>{order.push('claim');claims.set('guest:'+id,'fixture-reservation-token');return true;},releaseReading:async id=>{order.push('release');claims.delete('guest:'+id);},queueReading:()=>order.push('history')};
 const match=read('ebooks/ebook-matcher.js'),start=match.indexOf('async function doMatch(root){'),end=match.indexOf('\nfunction syncBookControls',start);
 vm.createContext(context);vm.runInContext(match.slice(start,end)+'\nthis.matchMagazine=doMatch;',context);
 try{
  await context.matchMagazine(rootNode);assert.deepEqual(order,['source','claim','quota','history','reveal']);assert.equal(w.checkDailyLimit,quota);assert.equal(w.MatchAppTokens.enabled,false);
  order.length=0;allowed=false;await context.matchMagazine(rootNode);assert.deepEqual(order,['source','claim','quota','release'],'denied shared allowance releases the unused claim without history or reveal');
  order.length=0;found=false;await context.matchMagazine(rootNode);assert.deepEqual(order,['source','source-fallback'],'failed source resolution never reaches the shared debit');
  assert.ok(calls.every(name=>name==='match_token_status'),'disabled token policy never consumes an additional token');assert.equal(rootNode.dataset.audioBusy,'0');assert.equal(rootNode.querySelector('button').disabled,false);
 }finally{w.close();}
});
test('Amazon BR is the first magazine search on approved web, other stores and unapproved Android remain untagged',()=>{
 const web=setup(),mag=web.MatchAppMagazines.items[0];
 const offers=web.MatchAppMagazines.buyLinks(mag,'BR',web.MatchAppEbookAffiliate);
 assert.equal(offers[0].name,'Amazon — search for this magazine');
 const link=new URL(offers[0].url);
 assert.equal(link.hostname,'www.amazon.com.br');
 assert.equal(link.searchParams.get('tag'),'matchapp06-20');
 assert.equal(link.searchParams.has('i'),false,'magazine searches must not be restricted to Kindle');
 assert.equal(offers[1].name,'Publisher subscription / issue options');
 assert.equal(offers[1].url,mag.subscription);
 for(const market of ['GB','AU','JP','US','CA','PT']){
  assert.equal(new URL(web.MatchAppMagazines.buyLinks(mag,market,web.MatchAppEbookAffiliate)[0].url).searchParams.has('tag'),false);
 }
 const native=setup('Mozilla/5.0 MatchAppAiAndroid/1.1.29');
 const nativeOffers=native.MatchAppMagazines.buyLinks(mag,'BR',native.MatchAppEbookAffiliate);
 assert.equal(nativeOffers.length,1,'unapproved native app must show publisher only');
 assert.equal(nativeOffers[0].name,'Publisher subscription / issue options');
 assert.equal(native.MatchAppEbookAffiliate.amazonMagazineSearchUrl(mag,'BR'),'');
});
test('adult Home, magazine hub and Ask AI wire publisher data while Kids cannot load it',()=>{
 const home=read('index.html'),hub=read('ebooks/index.html'),ask=read('discover.html'),kids=read('kids/index.html');
 for(const html of [home,hub,ask]){
  assert.ok(html.includes('/content-safety.js'));
  assert.ok(html.includes('/ebooks/magazines.js'));
 }
 assert.ok(ask.indexOf('/ebooks/magazines.js')<ask.indexOf('/ebooks/reading-ai.js'));
 assert.ok(ask.indexOf('/ebooks/reading-ai.js')<ask.indexOf('/discover.js'));
 assert.match(hub,/id="magazines"/);
 assert.match(hub,/Original covers/);
 assert.match(hub,/Magazine only/);
 assert.doesNotMatch(kids,/content-safety|magazines\.js|reading-ai\.js|ebook-matcher/);
});
test('Ask AI never substitutes film matches for requested e-books, audiobooks or magazines',()=>{
 const js=read('discover.js'),server=read('supabase/functions/gemini-proxy/index.ts');
 assert.match(js,/const bookIntent = detectBookIntent\(question\)/);
 assert.match(js,/if \(preparedRecommendations===null && !bookIntent && wantsTitleRecommendations &&/);
 assert.match(js,/!payload\?\._live \|\| !String\(payload\.answer \|\| ''\)\.trim\(\)/,'live AI replies without title cards must remain intact');
 assert.match(js,/MatchAppReadingAI\?\.render/);
 assert.match(js,/MatchAppContentSafety\?\.safeEntries/);
 assert.match(js,/MatchAppContentSafety\?\.isPornographicRequest/);
 assert.match(server,/const magazineIntent = !kidsMode/);
 assert.match(server,/PERMANENT SAFETY:/);
 assert.match(server,/EXPLICIT_XXX\.test\(body\.question\)/);
 assert.match(server,/parsed\.results=parsed\.results\.filter/);
 const doc=new JSDOM(askHtml()).window.document;
 assert.match(doc.querySelector('meta[name=description]').content,/magazines/);
 function askHtml(){return read('discover.html')}
});
test('publisher original source pages and magazine SEO are indexable on the existing e-books page',()=>{
 const doc=new JSDOM(read('ebooks/index.html')).window.document;
 assert.equal(doc.querySelector('link[rel=canonical]').getAttribute('href'),'https://matchapp.tv/ebooks/');
 const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
 assert.ok(graph.some(x=>x['@type']==='CollectionPage'&&x.keywords.some(k=>/magazine/.test(k))));
 assert.ok(graph.some(x=>x['@type']==='Service'&&/magazine/.test(x.serviceType)));
 assert.match(read('tools/update-sitemap.js'),/SITE}\/ebooks\//);
 assert.match(read('sitemap.xml'),/https:\/\/matchapp\.tv\/ebooks\//);
});
test('adult native Android WebView receives magazine-only update, Kids binaries stay isolated',()=>{
 const gradle=read('android-studio/app/build.gradle.kts'),main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(gradle,/versionCode = 55/);assert.match(gradle,/versionName = "1\.1\.55"/);
 assert.match(main,/adult-mobile-match-ai-runtime-20260927-1/);
 assert.match(main,/MatchAppAiAndroid\/1\.1\.55/);
 assert.match(main,/MATCHAPP_ANDROID_KIDS_BLOCKED/);
 assert.doesNotMatch(read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt'),/adult-reading-magazines/);
});
