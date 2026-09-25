const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('Ask AI cards include watch now, watch later, not for me and synopsis',()=>{
  const js=read('discover.js');
  assert.match(js,/discoverWatchUrl/);
  assert.match(js,/res\.watchlater/);
  assert.match(js,/res\.notforme/);
  assert.match(js,/discover-synopsis/);
  assert.match(js,/notForMeDiscoverItem/);
  assert.match(js,/attachRelated/);
  assert.match(js,/tmdbRelated/);
  assert.match(js,/catalogCousins/);
  assert.match(js,/justWatchLocale/);
  assert.match(js,/match_dislikedList/);
  assert.match(js,/is-hidden/);
  assert.match(js,/matchapp:langchange/);
  assert.doesNotMatch(js,/items=items\.filter\(item=>!window\.matchPolicy\?\.known\(\)/);
  assert.match(js,/why: 'idea'/);
  assert.doesNotMatch(js,/localizeMatchSynopsis/);
  const html=read('discover.html');
  assert.match(html,/discover-nfm/);
  assert.match(html,/discover-related-head/);
  assert.match(html,/discover\.js\?v=\d+/);
  assert.match(html,/tmdb\.js\?v=\d{8}-[\w-]+/);
});

test('related copy exists in every supported language',()=>{
  const polish=read('polish-i18n.js');
  for(const key of ['discover.moreLike','discover.sameDirector','discover.sameIdea','discover.hiddenToast']){
    assert.match(polish,new RegExp(key.replace('.','\\.')));
  }
  for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
    assert.match(polish,new RegExp(lang.replace('-','\\-')));
  }
});

test('TMDB proxy only fetches related for a typed identity and never returns adult works',()=>{
  const src=read('supabase/functions/tmdb-proxy/index.ts');
  assert.match(src,/append_to_response/);
  assert.match(src,/\["credits", "similar", "recommendations"\]/);
  assert.match(src,/combined_credits/);
  assert.match(src,/body\.related === true/);
  assert.match(src,/Number\.isSafeInteger\(body\.tmdb_id\)/);
  assert.doesNotMatch(src,/body\.path/);
  assert.match(src,/r\.adult !== true/);
  assert.match(src,/job === "Director"/);
});

test('tmdbRelated keeps identity, language and adult guards',()=>{
  const js=read('tmdb.js');
  assert.match(js,/window\.tmdbRelated = async function/);
  assert.match(js,/related: true/);
  assert.match(js,/safeRelatedPoster/);
  assert.match(js,/r\.adult !== true/);
  assert.match(js,/image\\.tmdb\\.org/);
  assert.match(js,/locales\[window\.MATCH_LANG\]/);
});

test('discover card markup keeps synopsis and the three actions',()=>{
  const js=read('discover.js');
  const start=js.indexOf('function discoverCardHTML');
  const html=js.slice(start, js.indexOf('let DISCOVER_ITEMS'));
  assert.match(html,/discover-play/);
  assert.match(html,/discover-save/);
  assert.match(html,/discover-nfm/);
  assert.match(html,/discover-synopsis/);
  assert.match(html,/Watch Later/);
  assert.match(html,/Not For Me/);
});

test('Ask AI localization keeps original title identity',()=>{
  const locale=read('locale-results.js');
  assert.match(locale,/item\.displayTitle = await translateText\(item\.title, 'title'\)/);
  assert.doesNotMatch(locale,/item\.title = await translateText\(item\.title/);
  const settings=read('settings.js');
  assert.match(settings,/installKidsModeToggle/);
  assert.match(settings,/matchapp-ia\.js\?v=20260919-/);
});

test('Ask AI strips stock opening lines instead of appending one',()=>{
  const human=read('human-conversation.js');
  assert.match(human,/cleanAskOpening/);
  assert.match(human,/humanizeAskAI/);
  assert.doesNotMatch(human,/I.d start with \{title\}/);
  const guarantee=read('match-guarantee.js');
  assert.doesNotMatch(guarantee,/Here are titles that match what you asked for/);
  assert.doesNotMatch(guarantee,/Aqui est[aã]o t[ií]tulos que combinam/);
  const proxy=read('supabase/functions/gemini-proxy/index.ts');
  assert.match(proxy,/Do not open with stock lines/);
});

test('stock openings are stripped at runtime',()=>{
  const vm=require('node:vm');
  const window={MATCH_LANG:'en',addEventListener(){},askAIConversational:null};
  window.window=window;
  const ctx=vm.createContext({
    window,
    document:{readyState:'complete',addEventListener(){},querySelectorAll:()=>[]},
    localStorage:{getItem:()=>null,setItem(){}},
    setTimeout(){},
    speechSynthesis:{cancel(){},getVoices:()=>[],speak(){}}
  });
  vm.runInContext(read('human-conversation.js'), ctx);
  const clean=ctx.window.cleanAskOpening;
  assert.equal(clean('Here are titles that match what you asked for. Ted Lasso is a warm comedy.'), 'Ted Lasso is a warm comedy.');
  assert.equal(clean("I'd start with Ted Lasso — it feels like the strongest fit for what you're asking for. A feel-good sitcom."), 'A feel-good sitcom.');
  assert.equal(clean('Sure! Based on your request, a riotous workplace comedy.'), 'a riotous workplace comedy.');
  const out=ctx.window.humanizeAskAI({answer:'',results:[{title:'Ted Lasso',synopsis:'An American coach takes a Premier League side.'}]},[]);
  assert.equal(out.answer,'Ted Lasso — An American coach takes a Premier League side.');
  assert.doesNotMatch(out.answer,/Here are titles/);
  assert.doesNotMatch(out.answer,/strongest fit/);
});

test('trending posters open the pinned Ask AI title card without spending a credit',()=>{
  const app=read('app.js');
  const start=app.indexOf('window.selectMarqueeItem');
  const fn=app.slice(start, app.indexOf('function eventStateFor'));
  assert.match(fn,/discover\.html\?title=/);
  assert.match(fn,/encodeURIComponent\(titleName\)/);
  assert.doesNotMatch(fn,/Tell me about/);
  assert.doesNotMatch(fn,/checkDailyLimit/);
  const js=read('discover.js');
  assert.match(js,/getQueryParam\('title'\)/);
  assert.match(js,/async function showTitleInfoCard/);
  assert.match(js,/discoverFactsHTML/);
  assert.match(js,/discover\.whereToWatch/);
  assert.match(js,/discover\.whenItStarts/);
  assert.match(js,/discover\.nowStreaming/);
  assert.match(js,/titleCardIntro/);
  const card=js.slice(js.indexOf('async function showTitleInfoCard'), js.indexOf('async function runDiscovery'));
  assert.doesNotMatch(card,/checkDailyLimit/);
  assert.doesNotMatch(card,/askAndRender/);
  assert.match(card,/hydrateDiscoverCard/);
  const html=read('discover.html');
  assert.match(html,/discover-facts/);
  assert.match(html,/discover\.js\?v=\d+/);
});

test('title-card copy exists in every supported language',()=>{
  const polish=read('polish-i18n.js');
  for(const key of ['discover.whereToWatch','discover.whenItStarts','discover.nowStreaming','discover.premiered','discover.startsIn','discover.sinceYear','discover.titleCardIntro']){
    assert.match(polish,new RegExp(key.replace('.','\\.')));
  }
  for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
    assert.match(polish,new RegExp(lang.replace('-','\\-')));
  }
});


test('Ask AI composer stays visible and voice works in the active language',()=>{
  const html=read('discover.html'),css=read('matchapp-ia.css'),voice=read('voice-input.js'),js=read('discover.js');
  const composer=html.slice(html.indexOf('<div class="newsearch-row">'),html.indexOf('</section>',html.indexOf('<div class="newsearch-row">')));
  assert.match(composer,/class="composer-input-label"/);
  assert.match(composer,/for="discover-new-input"/);
  assert.match(composer,/id="discover-new-input"/);
  assert.match(css,/On phones the writing surface must read as a real input/);
  assert.match(composer,/Type your question here/);
  assert.match(composer,/aria-describedby="discover-compose-help"/);
  assert.match(composer,/id="mic-btn-discover"/);
  assert.doesNotMatch(composer,/mic-btn-discover[^>]+display\s*:\s*none/);
  assert.match(html,/matchapp-ia\.css\?v=\d{8}-[\w-]+/);
  assert.match(html,/discover\.js\?v=\d{8}-[\w-]+/);
  assert.match(html,/voice-input\.js\?v=\d{8}-[\w-]+/);
  assert.match(css,/body\.ai-chat-page \.composer textarea\{/);
  assert.match(css,/caret-color:var\(--ma-gold-hot\)!important/);
  assert.match(css,/body\.ai-chat-page \.composer \.mic-btn\{[\s\S]*display:inline-flex!important/);
  assert.match(voice,/MatchAppNativeVoice/);
  assert.match(voice,/SPEECH_LANG_MAP/);
  assert.match(voice,/aria-disabled/);
  assert.doesNotMatch(voice,/style\.display\s*=\s*['"]none['"]/);
  assert.match(js,/const TTS_LANG_MAP/);
  assert.match(js,/function voiceMatchesLang/);
  assert.match(js,/utter\.lang = voice\?\.lang \|\| targetLang/);
  assert.doesNotMatch(js,/autoReadEnabled|match_voice_autoread/);
  assert.match(js,/speak\.onclick = \(\) => window\.readAloud\(text, speak\)/);
  assert.match(js,/TTS is user-initiated only/);
});

test('Ask AI has a bounded local catalogue recovery without polling or UI mutation',()=>{
  const js=read('discover.js');
  assert.match(js,/function catalogFallbackForQuestion\(question\)/);
  assert.match(js,/payload\.results = local/);
  assert.match(js,/catalog-recovery/);
  const recovery=js.slice(js.indexOf('function catalogFallbackForQuestion'),js.indexOf('\/\* ---------- Typewriter reveal'));
  assert.doesNotMatch(recovery,/setInterval|MutationObserver|requestAnimationFrame/);
  assert.match(recovery,/fitsQuestion\(e, question\)/);
  assert.match(recovery,/isDiscoverDisliked\(e\.title\)/);
});


test('Ask AI never claims AI-guessed streaming availability if verified source is missing or throws',async()=>{
  const vm=require('node:vm'),src=read('discover.js');
  const start=src.indexOf('async function enrichDiscoverMedia(item) {');
  const end=src.indexOf('\nfunction itemFromTitle(',start);
  assert(start>=0&&end>start);
  const code=src.slice(start,end)+'\nenrichDiscoverMedia;';
  const noSource=vm.runInNewContext(code,{window:{}});
  const absent={title:'A Real Comedy',type:'movie',platform:'Netflix'};
  await noSource(absent);
  assert.equal(absent.platform,'');
  assert.equal(absent._aiPlatformHint,'Netflix');
  assert.equal(absent._availabilityVerified,false);
  const throwing=vm.runInNewContext(code,{window:{MatchAppCatalogMedia:{
    lookup:async()=>{throw Error('source offline')},viewingTarget:()=>null
  }}});
  const errored={title:'A Real Comedy',type:'series',platform:'Netflix'};
  await throwing(errored);
  assert.equal(errored.platform,'');
  assert.equal(errored._availabilityVerified,false);
  assert.equal(errored._viewing,null);
  const noTitleMeta=vm.runInNewContext(code,{window:{MatchAppCatalogMedia:{
    lookup:async()=>null,lookupLive:async()=>null
  }}});
  const missing={title:'A Real Comedy',type:'movie',platform:'Netflix'};
  await noTitleMeta(missing);
  assert.equal(missing.platform,'');
  assert.equal(missing._availabilityVerified,false);
  const source=vm.runInNewContext(code,{window:{MatchAppCatalogMedia:{
    lookup:async()=>({year:2024,overview:'Verified synopsis',genres:['Comedy']}),
    viewingTarget:()=>({mode:'stream',provider:'Verified Provider',href:'https://www.justwatch.com/br'})
  }}});
  const good={title:'A Real Comedy',type:'movie',platform:'Unverified Service'};
  await source(good);
  assert.equal(good.platform,'Verified Provider');
  assert.equal(good._availabilityVerified,true);
});

test('Ask AI audiobook questions lead into the existing verified adult book matcher rather than guessing Spotify availability',async()=>{
  const vm=require('node:vm'),js=read('discover.js'),home=read('index.html');
  assert.match(js,/if \(\/audiobook\/i\.test/);
  assert.match(js,/return '\/#ebook-matcher-root'/);
  assert.match(home,/id="ebook-matcher-root"/);
  const from=js.indexOf('async function enrichDiscoverMedia(item) {');
  const to=js.indexOf('\nfunction itemFromTitle(',from);
  const fn=vm.runInNewContext(js.slice(from,to)+'\nenrichDiscoverMedia;',{window:{}});
  const audio={title:'A Genuine Audiobook',type:'audiobook',platform:'Spotify'};
  await fn(audio);
  assert.equal(audio.platform,'');
  assert.equal(audio._availabilityVerified,false);
  assert.equal(audio._aiPlatformHint,'Spotify');
});


test('unverified visual recommendations never use guessed/stale platform deep links',()=>{
 const vm=require('node:vm'),src=read('discover.js');
 const a=src.indexOf('function discoverWatchUrl(item) {');
 const b=src.indexOf('// Hard exclusions',a);
 assert(a>=0&&b>a);
 const local={MATCH_LANG:'pt-BR'},context={
   window:local,
   localStorage:{getItem:key=>key==='match_user_country'?'Brazil':null},
   justWatchLocale:()=> 'br',encodeURIComponent
 };
 const fn=vm.runInNewContext(src.slice(a,b)+'\ndiscoverWatchUrl;',context);
 const example={title:'Known Real Movie',type:'movie',
    platform:'',_availabilityVerified:false,
    watchUrl:'https://unverified-streaming-service.example/watch/incorrect',
    _viewing:{href:'https://unverified-streaming-service.example/watch/incorrect'}
 };
 const result=fn(example);
 assert.equal(result,'https://www.justwatch.com/br/search?q=Known%20Real%20Movie');
 assert(!result.includes('unverified-streaming-service'));
 const verified={title:'Known Real Movie',type:'movie',_availabilityVerified:true,
   _viewing:{mode:'stream',provider:'Verified Provider',href:'https://www.justwatch.com/br/provider/verified'}};
 assert.equal(fn(verified),'https://www.justwatch.com/br/provider/verified');
 const audiobook={title:'A Real Audiobook',type:'audiobook',platform:'',_availabilityVerified:false};
 assert.equal(fn(audiobook),'/#ebook-matcher-root');
});

test('Ask AI book/audiobook questions never fall back to unrelated movie or music suggestions',()=>{
 const vm=require('node:vm'),js=read('discover.js');
 const start=js.indexOf('function mediaIntentQuestion'),end=js.indexOf('/* ---------- AI conversational answer',start);
 assert(start>=0&&end>start);
 const ctx=vm.createContext({window:{}});
 vm.runInContext(js.slice(start,end),ctx);
 assert.equal(vm.runInContext("detectBookIntent('Find me a romantic audiobook')",ctx),true);
 assert.equal(vm.runInContext("detectBookIntent('Recommend Brazilian e-books')",ctx),true);
 assert.equal(vm.runInContext("detectBookIntent('Quero audiolivros brasileiros')",ctx),true);
 assert.equal(vm.runInContext("detectBookIntent('Comedy movies on Netflix')",ctx),false);
 const fallback=js.slice(js.indexOf('async function fallbackSearch'),js.indexOf('function catalogFallbackForQuestion'));
 assert(fallback.indexOf('if (detectBookIntent(question))')<fallback.indexOf('const audioIntent'));
 assert.match(js,/function catalogFallbackForQuestion\(question\)[\s\S]*?detectBookIntent\(question\)\) return \[\]/);
 assert.match(js,/if \(!bookIntent && wantsTitleRecommendations && !newItems\.length/);
 assert.match(js,/!payload\?\._live && window\.matchPolicy/,'valid conversational answers must not be replaced with film recommendations');
 assert.match(js,/bookIntent \? \[\] : \(payload\.results \|\| \[\]\)/);
});
test('book Ask AI suggestions open verified matcher rather than guessed streaming/buy URLs',()=>{
 const js=read('discover.js'),html=read('discover.html'),proxy=read('supabase/functions/gemini-proxy/index.ts');
 assert.match(js,/if \(\/\\b\(book\|ebook\|e-book\|audiobook\|novel\|magazine\)\\b\/i\.test/);
 assert.match(js,/return '\/#ebook-matcher-root'/);
 assert.match(js,/discover-book-matcher-link/);
 assert.match(js,/if \(isAudio \|\| isBook \|\| !window\.MatchAppCatalogMedia\?\.lookup\) return unverified\(\)/);
 assert(html.includes('/discover.js?v=20260925-guarantee2'));
 assert(html.includes('.discover-book-matcher-link'));
 assert.match(proxy,/function detectBookIntent/);
 assert.match(proxy,/const visualIntent/);
 assert.match(proxy,/A movie adaptation and a song are NOT valid substitutes/);
 assert.match(proxy,/const safeNickname =/);
 assert.match(proxy,/body\.nickname\.slice\(0, 32\)/);
});
