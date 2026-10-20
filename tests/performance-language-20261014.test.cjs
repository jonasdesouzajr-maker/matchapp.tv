'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function scene(html='<html><body></body></html>',url='https://matchapp.tv/'){
 return new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});
}
test('all supported dictionaries have complete primary UI, profile and current how-to copy',()=>{
 const d=scene(),w=d.window;
 w.eval(read('i18n.js')+'\nwindow.dictionary=I18N;window.languages=I18N_LANGS;');
 const keys=Object.keys(w.dictionary.en);
 for(const lang of Object.keys(w.languages)){
  for(const key of keys)assert.ok(w.dictionary[lang][key],lang+' missing '+key);
  assert.match(w.dictionary[lang]['how.title'],/MatchApp Ai/);
  assert.doesNotMatch(w.dictionary[lang]['how.intro'],/15 seconds|15 segundos|15 Sekunden/);
 }
 w.setLanguage('pt-BR');assert.equal(w.MATCH_LANG,'pt-BR');
 // Explicit saved choice beats a shared link and the device language on a new route.
 assert.equal(w.detectLanguage(), 'pt-BR');w.close();
});
test('Explore translates every authored navigation/card and preserves destinations for every language',()=>{
 const d=scene(read('explore.html'),'https://matchapp.tv/explore.html'),w=d.window;
 w.eval(read('i18n.js')+'\nwindow.languages=I18N_LANGS;');
 w.eval(read('patches/explore-locales.js'));
 w.eval(read('patches/reference-explore.js'));
 w.eval(read('patches/reference-system.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const links=[...w.document.querySelectorAll('a')].map(a=>a.getAttribute('href'));
 const expectedKeys=['title','intro','explore','awaited','premiere','weekly','curated','books','recipes','news','events','taylor','ask','more','askDescription','friends','donate'];
 const expectedTitles={en:'Explore more','pt-BR':'Explore mais',es:'Explora más',fr:'Explorer plus',de:'Mehr entdecken',it:'Esplora altro',tr:'Daha fazlası',ru:'Откройте больше',ar:'اكتشف المزيد',hi:'और खोजें',id:'Jelajahi lainnya',ja:'もっと見る',ko:'더 둘러보기',zh:'探索更多'};
 const english=new Map();
 assert.equal(Object.keys(w.languages).length,14,'all supported languages must be exercised');
 for(const lang of Object.keys(w.languages)){
  w.setLanguage(lang);w.MatchCinemaShell.paint();
  for(const node of w.document.querySelectorAll('[data-hub-copy]')){
   assert.ok(node.textContent.trim(),lang+' '+node.dataset.hubCopy);
   assert.equal(node.children.length,0);
  }
  const reference=[...w.document.querySelectorAll('[data-ref-explore]')];
  assert.deepEqual(reference.map(node=>node.dataset.refExplore).sort(),[...expectedKeys].sort(),'every reference label must be covered');
  for(const node of reference){
   const key=node.dataset.refExplore,text=node.textContent.trim();
   assert.ok(text&&!/undefined|null/.test(text),lang+' missing reference '+key);
   assert.equal(node.children.length,0,'translated label must retain its surrounding link/icon structure');
   if(lang==='en')english.set(key,text);
   // Retain artist identity and the authored German loanword ‘Events’.
   else if(lang==='de'&&key==='events')assert.equal(text,'Events');
   else if(key!=='taylor')assert.notEqual(text,english.get(key),lang+' silently kept English '+key);
  }
  assert.equal(w.document.querySelector('#explore-title').textContent,expectedTitles[lang]);
  const guide=w.document.querySelectorAll('.ref-secondary-topics a[href="/how-it-works.html"]');
  assert.equal(guide.length,1,'the consolidated guide action remains reachable');
  assert.equal(guide[0].querySelector('[data-i18n="how.title"]').textContent,w.t('how.title'));
  const controls=w.document.querySelector('.ref-explore-tools>summary');
  assert.equal(controls.getAttribute('aria-label'),w.MatchCinemaShell.labels[lang==='pt-BR'?'pt':lang][10]);
  assert.equal(controls.querySelector('[data-cinema-copy="controls"]').textContent,controls.getAttribute('aria-label'));
  assert.equal(w.document.querySelector('#lang-switcher').value,lang);
  assert.equal(w.localStorage.getItem('match_lang'),lang);
  assert.equal(w.document.documentElement.dir,lang==='ar'?'rtl':'ltr');
  assert.deepEqual([...w.document.querySelectorAll('a')].map(a=>a.getAttribute('href')),links,'language switch must retain every route');
 }
 assert.equal(w.document.querySelectorAll('#lang-switcher-host').length,1);
 assert.equal(w.document.querySelectorAll('.ref-explore-tools #lang-switcher-host').length,1);
 w.close();
});
function speech(voices){
 const d=scene(),w=d.window,utterances=[];let requests=0;
 w.MATCH_LANG='pt-BR';w.eval(read('jonas/male-voice-policy-20261010.js'));
 w.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
 w.speechSynthesis={getVoices:()=>voices,cancel(){},speak:u=>utterances.push(u)};
 w.fetch=async()=>{requests++;throw new Error('offline')};
 w.eval(read('jonas/secure-speech-20261010.js'));
 return {w,utterances,requests:()=>requests};
}
test('installed device voices cannot replace the approved provider identities',async()=>{
 const s=speech([{name:'Ricardo',lang:'pt-BR',localService:true}]);let ends=0;
 const result=s.w.MatchAppJonasSpeech.speak('Olá','pt-BR',{onEnd:()=>ends++});
 assert.equal(await result,false);assert.equal(s.utterances.length,0);
 assert.equal(ends,1);assert.equal(s.requests(),1);s.w.close();
});
test('wrong-language or female local voices never speak and failed cloud ends exactly once',async()=>{
 const s=speech([{name:'Daniel',lang:'en-US',localService:true},{name:'Maria',lang:'pt-BR',localService:true}]);let ends=0;
 assert.equal(await s.w.MatchAppJonasSpeech.speak('Olá','pt-BR',{onEnd:()=>ends++}),false);
 assert.equal(s.utterances.length,0);assert.equal(s.requests(),1);assert.equal(ends,1);s.w.close();
});
test('language switch cancels provider playback without substituting a device voice',async()=>{
 const s=speech([{name:'Ricardo',lang:'pt-BR',localService:true}]);
 const result=s.w.MatchAppJonasSpeech.speak('Olá','pt-BR',{});
 s.w.document.dispatchEvent(new s.w.CustomEvent('matchapp:langchange',{detail:{lang:'fr'}}));
 assert.equal(await result,false);assert.equal(s.utterances.length,0);s.w.close();
});
test('speech-recognition language switch discards previous-language interim/final transcript',()=>{
 const d=scene('<html><body><input id="discover-new-input"><button id="mic-btn-discover"></button></body></html>'),w=d.window;
 const recognizers=[];w.MATCH_LANG='pt-BR';w.t=()=>'';
 w.SpeechRecognition=class{constructor(){recognizers.push(this)}start(){this.onstart?.()}abort(){this.onend?.()}};
 w.eval(read('voice-input.js'));w.initVoiceInput('discover-new-input','mic-btn-discover');
 w.document.querySelector('button').click();assert.equal(recognizers[0].lang,'pt-BR');
 w.MATCH_LANG='ja';w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang:'ja'}}));
 assert.ok(!w.document.querySelector('button').classList.contains('mic-listening'));
 w.document.querySelector('button').click();assert.equal(recognizers[1].lang,'ja-JP');w.close();
});
test('Home paints body before loading SDK while retaining dependency order and one SDK owner',()=>{
 const html=read('index.html'),sdk=html.indexOf('<script src="https://cdn.jsdelivr.net/npm/@supabase/');
 assert.ok(sdk>html.indexOf('<body'));assert.ok(sdk<html.indexOf('<script src="/app.js'));
 assert.equal((html.match(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase\//g)||[]).length,1);
});
test('exact recorded greetings use same-origin audio with no synthesis/auth request',async()=>{
 const d=scene(),w=d.window;w.MATCH_LANG='pt-BR';const requests=[],players=[];
 w.speechSynthesis={getVoices:()=>[],cancel(){}};
 w.fetch=async url=>{requests.push(url);return {ok:true,blob:async()=>new w.Blob([new Uint8Array(1000)],{type:'audio/mpeg'})}};
 w.URL.createObjectURL=()=> 'blob:local-greeting';w.URL.revokeObjectURL=()=>{};
 w.Audio=class{constructor(){players.push(this)}play(){return Promise.resolve()}pause(){}};
 w.supabaseClient={auth:{getSession(){throw new Error('Greeting must not wait for auth')}}};
 w.eval(read('jonas/secure-speech-20261010.js'));
 const promise=w.MatchAppJonasSpeech.speak('Olá, sou o Jonas. Como posso ajudar?','pt-BR',{});
 await new Promise(r=>setImmediate(r));assert.equal(players.length,1);players[0].onended();
 assert.equal(await promise,true);assert.equal(requests.length,1);assert.match(requests[0],/^\/jonas\/greetings\/pt-BR\.mp3/);
 const manifest=JSON.parse(read('jonas/greetings/manifest.json'));
 for(const [language,clip] of Object.entries(manifest.clips)){
  assert.ok(fs.statSync(path.join(__dirname,'../jonas/greetings',clip.file)).size<200000);
  w.MATCH_LANG=language;w.eval(read('jonas/locales-20261009-v2.js'));
  assert.equal(w.MatchAppJonasLocale.t('greeting'),clip.text);
 }
 w.close();
});
test('late-inserted cookie controls are not dropped behind another queued localization paint',async()=>{
 const d=scene('<html><body class="page-home"><div></div></body></html>'),w=d.window,frames=[];
 w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};
 w.MATCH_LANG='pt-BR';w.eval(read('i18n.js'));w.setLanguage('pt-BR');w.eval(read('ai-composer.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 w.document.body.appendChild(w.document.createElement('section'));
 await Promise.resolve();
 const cookie=w.document.createElement('div');cookie.className='ma-cookie';
 cookie.innerHTML='<p>We use essential cookies to run MatchApp. Analytics and Google AdSense may use cookies to measure visits and fund the free service. <a href="/cookies.html">Details</a>.</p><button>Accept</button><button>Essential only</button>';
 w.document.body.appendChild(cookie);await Promise.resolve();
 for(const fn of frames.splice(0))fn();
 assert.match(cookie.querySelector('p').textContent,/Usamos cookies essenciais/);
 assert.equal(cookie.querySelector('button').textContent,'Aceitar');assert.equal(cookie.querySelector('a').getAttribute('href'),'/cookies.html');w.close();
});
