'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {stampBrandReferences}=require('../tools/stamp-discovery-assets.cjs');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh','zh-TW'];
function scene(saved='pt-BR') {
  const dom=new JSDOM(read('discover.html'),{url:'https://matchapp.tv/discover.html?lang=ko',runScripts:'outside-only'});
  const w=dom.window;
  Object.defineProperty(w.document,'readyState',{configurable:true,get:()=> 'complete'});
  Object.defineProperty(w.navigator,'languages',{configurable:true,value:['ko-KR']});
  w.localStorage.setItem('match_lang',saved);
  w.localStorage.setItem('match_history','[{"title":"Keep my saved result"}]');
  const context=dom.getInternalVMContext();
  const load=file=>vm.runInContext(read(file),context,{filename:file});
  load('discover-editorial-locales.js');
  return {dom,w,context,load,close:()=>dom.window.close()};
}
test('Ask guidance is available to the existing locale owner before its first render',t=>{
  const f=scene();t.after(f.close);
  const {w}=f,d=w.document,scripts=[...d.querySelectorAll('script[src]')].map(s=>new URL(s.src).pathname);
  assert(scripts.indexOf('/discover-editorial-locales.js')<scripts.indexOf('/i18n.js'));
  assert.equal(d.querySelectorAll('script[src^="/discover-editorial-locales.js"]').length,1);
  assert.equal(d.querySelector('script[src^="/discover-editorial-locales.js"]').defer,true);
  assert.equal(new URL(d.querySelector('script[src^="/i18n.js"]').src).searchParams.get('askguide'),'20261104-1');
  const section=d.querySelector('.ma-discover-editorial');
  const bindings=[...section.querySelectorAll('[data-i18n]')];
  assert.equal(bindings.length,30);
  assert.equal(section.querySelector('[data-i18n-html]'),null);
  const walker=d.createTreeWalker(section,w.NodeFilter.SHOW_TEXT);
  let node;
  while(node=walker.nextNode())if(node.textContent.trim())assert(node.parentElement.closest('[data-i18n]'),'Every authored text node has a locale owner');
  let rendered=0;
  d.addEventListener('matchapp:langchange',()=>{
    rendered++;
    assert.equal(section.querySelector('h2').textContent,w.MatchAppDiscoverEditorialCopy['pt-BR'].title);
  },{once:true});
  f.load('i18n.js');
  assert.equal(rendered,1,'No extra boot or competing language event');
  assert.equal(w.MATCH_LANG,'pt-BR','Saved selection wins over both device and shared-link language');
  assert.equal(d.documentElement.lang,'pt-BR');
  assert.equal(section.querySelector('h2').textContent,'Como pedir uma recomendação que você possa aproveitar');
});
test('all fifteen guidance translations rerender without replacing emphasis, links or handlers',t=>{
  const f=scene('en');t.after(f.close);
  const {w}=f,d=w.document,section=d.querySelector('.ma-discover-editorial');
  const bindings=[...section.querySelectorAll('[data-i18n]')],strong=[...section.querySelectorAll('strong')];
  const links=[...section.querySelectorAll('a')],hrefs=links.map(a=>a.getAttribute('href'));
  assert.deepEqual(hrefs,['/guides/worldwide-entertainment-discovery/','/guides/what-to-watch-september-2026/','/contact.html','/about.html']);
  assert.equal(strong.length,2);
  let clicks=0;links[0].addEventListener('click',event=>{event.preventDefault();clicks++;});
  f.load('i18n.js');
  assert.deepEqual(Object.keys(w.MatchAppDiscoverEditorialCopy).sort(),[...languages].sort());
  for(const language of languages) {
    w.setLanguage(language);
    const copy=w.MatchAppDiscoverEditorialCopy[language];
    assert.equal(Object.keys(copy).length,30,language);
    for(const binding of bindings) {
      const key=binding.getAttribute('data-i18n'),short=key.slice('dc.guide.'.length);
      assert.equal(typeof copy[short],'string',language+' '+short);
      assert.ok(copy[short].trim(),language+' '+short);
      assert.doesNotMatch(copy[short],/[<>\uFFFD]/,language+' plain safe text');
      assert.equal(binding.textContent,copy[short],language+' '+short);
      assert.equal(vm.runInContext('Object.hasOwn(I18N['+JSON.stringify(language)+'],'+JSON.stringify(key)+')',f.context),true,'No English fallback: '+language+' '+short);
    }
    for(const name of ['MatchApp Ai','Jonas','Netflix','Prime Video'])assert(section.textContent.includes(name),language+' preserves '+name);
    if(language!=='en')assert.notEqual(copy.title,w.MatchAppDiscoverEditorialCopy.en.title,language);
    assert.deepEqual([...section.querySelectorAll('strong')],strong,'Emphasis nodes survive '+language);
    assert.deepEqual([...section.querySelectorAll('a')],links,'Original link nodes survive '+language);
    assert.deepEqual(links.map(a=>a.getAttribute('href')),hrefs);
    assert.equal(w.localStorage.getItem('match_lang'),language);
    assert.equal(w.localStorage.getItem('match_history'),'[{"title":"Keep my saved result"}]');
    assert.equal(d.documentElement.dir,language==='ar'?'rtl':'ltr');
  }
  links[0].dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
  assert.equal(clicks,1,'Existing link handlers remain attached');
});
test('guidance follows cross-tab updates and keeps Korean, Traditional and Simplified Chinese distinct',t=>{
  const f=scene();t.after(f.close);const {w}=f;f.load('i18n.js');
  const title=w.document.querySelector('.ma-discover-editorial h2');
  w.localStorage.setItem('match_lang','ko');
  w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:'ko'}));
  assert.equal(title.textContent,w.MatchAppDiscoverEditorialCopy.ko.title);
  w.setLanguage('zh-Hant-HK');
  assert.equal(w.MATCH_LANG,'zh-TW');
  assert.equal(title.textContent,w.MatchAppDiscoverEditorialCopy['zh-TW'].title);
  const traditional=title.textContent;
  w.setLanguage('zh-Hans-TW');
  assert.equal(w.MATCH_LANG,'zh');
  assert.equal(title.textContent,w.MatchAppDiscoverEditorialCopy.zh.title);
  assert.notEqual(title.textContent,traditional);
  w.setLanguage('pt-BR');
  assert.equal(title.textContent,w.MatchAppDiscoverEditorialCopy['pt-BR'].title);
});
test('publication refreshes both header request levels without expiring other brand assets',()=>{
  const fixture='<script src="/patches/reference-system.js?v=kept&amp;comet=20261104-1"></script>';
  const stamped=stampBrandReferences(fixture,true),dom=new JSDOM(stamped,{url:'https://matchapp.tv'});
  try {
    const request=new URL(dom.window.document.querySelector('script').src);
    assert.equal(request.searchParams.get('v'),'kept');
    assert.equal(request.searchParams.get('headerlocale'),'20261104-1');
    const oldCache=new Map([['https://matchapp.tv/patches/reference-system.js?v=kept&comet=20261104-1','old loader']]);
    assert.equal(oldCache.get(request.href),undefined);
  } finally {dom.window.close();}
  const runtime=read('patches/reference-system.js');
  function nested(source) {
    const expression=source.match(/headerScript\.src=([^;]+);/);
    assert(expression);
    const context={headerScript:{}};vm.runInNewContext(expression[0],context);
    return new URL(context.headerScript.src,'https://matchapp.tv');
  }
  const old=nested(runtime),fresh=nested(stampBrandReferences(runtime));
  assert.equal(fresh.pathname,old.pathname);
  assert.equal(fresh.searchParams.get('headerlocale'),'20261104-1');
  for(const [key,value] of old.searchParams)assert.equal(fresh.searchParams.get(key),value,key);
  assert.notEqual(fresh.href,old.href);
  assert.equal(stampBrandReferences(stamped,true),stamped);
  const unrelated='"/assets/brand/matchapp-ai-mark.svg?comet=20261104-1" "/settings.js?comet=20261104-1" "/ads-init.js?v=locked"';
  assert.equal(stampBrandReferences(unrelated),unrelated);
});

function loadQuotaPresentation(f) {
  const source=read('discover.js');
  const label=source.match(/function discoverLabel\(key, fallback\) \{[\s\S]*?\n\}/);
  assert(label);
  const start=source.indexOf('function renderAiQuotaStatus(status) {');
  const end=source.indexOf('\nasync function refreshAiWorkspaceStatus()',start);
  assert(start>=0&&end>start);
  vm.runInContext(label[0]+'\n'+source.slice(start,end),f.context,{filename:'discover-quota-presentation.js'});
}
test('History allowance labels follow all fifteen selected languages without refreshing or changing quota',async t=>{
  const f=scene('en');t.after(f.close);const {w}=f,d=w.document;
  f.load('i18n.js');let requests=0;
  w.refreshQuotaStatus=()=>{requests++;throw Error('Language changes must not refresh allowance');};
  w.fetch=()=>{requests++;throw Error('Language changes must not request services');};
  w.localStorage.setItem('match_dailyCount','2');
  w.localStorage.setItem('match_guestBonusAiPrompts_v1','1');
  loadQuotaPresentation(f);
  w.renderAiQuotaStatus({anon:true,authenticated:false,remaining:2,limit:4,used:2,credits:1});
  const state=vm.runInContext('JSON.stringify(lastAiCostState)',f.context);
  const fill=d.getElementById('ai-usage-fill'),button=d.getElementById('ai-new-chat');
  assert.equal(fill.style.width,'50%');assert.equal(button.disabled,false);
  for(const language of languages) {
    w.setLanguage(language);
    await new Promise(resolve=>w.setTimeout(resolve,0));
    const copy=w.MatchAppDiscoverQuotaCopy[language];
    assert.equal(d.getElementById('ai-usage-value').textContent,copy.left.replace('{remaining}','2').replace('{limit}','4'),language);
    assert.equal(d.getElementById('ai-credit-line').textContent,copy.guest,language);
    assert.equal(vm.runInContext('JSON.stringify(lastAiCostState)',f.context),state);
    assert.equal(fill.style.width,'50%');assert.equal(button.disabled,false);
    assert.equal(w.localStorage.getItem('match_dailyCount'),'2');
    assert.equal(w.localStorage.getItem('match_guestBonusAiPrompts_v1'),'1');
  }
  assert.equal(requests,0);
  const request=new URL(d.querySelector('script[src^="/discover.js"]').src);
  assert.equal(request.searchParams.get('quotacopy'),'20261104-1');
});
test('History copy preserves exhausted, paid-credit and zero-limit branches and the existing button gate',async t=>{
  const f=scene('en');t.after(f.close);const {w}=f,d=w.document;f.load('i18n.js');loadQuotaPresentation(f);
  const cases=[
    {status:{anon:true,remaining:0,limit:3,used:3,credits:2},shares:0,credits:'2 free share AI prompts available.',width:'100%',locked:false},
    {status:{anon:true,remaining:0,limit:3,used:3,credits:0},shares:1,credits:'Share your last AI reply above to unlock +1 prompt.',width:'100%',locked:true},
    {status:{anon:true,remaining:0,limit:3,used:3,credits:0},shares:0,credits:'Guest preview complete · register free for +10 Matches and +10 AI prompts.',width:'100%',locked:true},
    {status:{anon:false,remaining:0,limit:3,used:3,credits:1},shares:0,credits:'1 Ask AI credit available after your included allowance.',width:'100%',locked:false},
    {status:{anon:false,remaining:0,limit:0,used:0,credits:0},shares:0,credits:'0 Ask AI credits available after your included allowance.',width:'0%',locked:true}
  ];
  for(const entry of cases) {
    w.MatchAppGuestShare={remainingShares:()=>entry.shares};
    w.setLanguage('en');
    // Establish a guest label first so a later non-guest branch cannot retain it.
    w.renderAiQuotaStatus({anon:true,remaining:3,limit:3,used:0,credits:0});
    w.renderAiQuotaStatus(entry.status);
    const state=vm.runInContext('JSON.stringify(lastAiCostState)',f.context);
    assert.equal(d.getElementById('ai-credit-line').textContent,entry.credits);
    assert.equal(d.getElementById('ai-usage-fill').style.width,entry.width);
    assert.equal(d.getElementById('ai-new-chat').disabled,entry.locked);
    w.setLanguage('zh-TW');await new Promise(resolve=>w.setTimeout(resolve,0));
    assert.equal(d.getElementById('ai-credit-line').textContent,entry.credits,'Unchanged branches stay untouched by the two-label repaint');
    assert.equal(d.getElementById('ai-usage-value').textContent,entry.status.limit?w.MatchAppDiscoverQuotaCopy['zh-TW'].left.replace('{remaining}','0').replace('{limit}','3'):'Ready');
    assert.equal(d.getElementById('ai-usage-fill').style.width,entry.width);
    assert.equal(d.getElementById('ai-new-chat').disabled,entry.locked);
    assert.equal(vm.runInContext('JSON.stringify(lastAiCostState)',f.context),state);
  }
});
