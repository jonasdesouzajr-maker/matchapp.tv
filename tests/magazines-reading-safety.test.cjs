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
test('24 official adult-only global magazine profiles contain real publisher routes, no fake issue cover or XXX titles',()=>{
 const w=setup(),items=w.MatchAppMagazines.items;
 assert.equal(items.length,24);
 assert.ok(items.some(x=>x.region==='BR'));
 assert.ok(items.some(x=>x.region==='AU'));
 assert.ok(items.some(x=>x.region==='JP'));
 assert.ok(items.every(x=>!w.MatchAppContentSafety.isExplicit(x)&&x.kind==='magazine'));
 for(const m of items){
  assert.ok(/^https:\/\//.test(m.issues)&&/^https:\/\//.test(m.site));
  assert.ok(/^https:\/\/[^/]+\/favicon\.ico$/.test(m.icon),'only original publisher-brand icons: '+m.title);
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
 assert.match(match,/if\(p\.format==='magazine'\)pick=chooseMagazine\(p\)/);
 assert.match(match,/if\(magazine\)\{renderMagazineResult\(root,book,p\);return;\}/);
 assert.match(match,/const allowed=await window\.checkDailyLimit\(\)/);
 assert.match(match,/data-ebook-save/);
 assert.match(match,/function consumeReadingDeepLink\(\)/);
 assert.match(match,/url\.searchParams\.get\('reading'\)/);
 assert.match(match,/p\.format=format;savePrefs\(p\)/);
 assert.match(read('discover.js'),/route\.href = '\/\?reading='/);

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
 assert.match(js,/if \(!bookIntent && wantsTitleRecommendations &&/);
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
 assert.match(gradle,/versionCode = 33/);assert.match(gradle,/versionName = "1\.1\.31"/);
 assert.match(main,/adult-reading-magazines-20260925-1/);
 assert.match(main,/MatchAppAiAndroid\/1\.1\.31/);
 assert.match(main,/MATCHAPP_ANDROID_KIDS_BLOCKED/);
 assert.doesNotMatch(read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt'),/adult-reading-magazines/);
});
