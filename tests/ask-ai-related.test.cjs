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
  assert.match(html,/tmdb\.js\?v=193/);
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
  assert.match(settings,/20260918-onboard1/);
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
