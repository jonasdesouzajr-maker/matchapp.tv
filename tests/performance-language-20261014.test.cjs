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
 const links=[...w.document.querySelectorAll('a')].map(a=>a.getAttribute('href'));
 w.eval(read('i18n.js')+'\nwindow.languages=I18N_LANGS;');w.eval(read('patches/explore-locales.js'));
 for(const lang of Object.keys(w.languages)){
  w.setLanguage(lang);
  for(const node of w.document.querySelectorAll('[data-hub-copy]')){
   assert.ok(node.textContent.trim(),lang+' '+node.dataset.hubCopy);
   assert.equal(node.children.length,0);
  }
  assert.equal(w.document.querySelector('#how-it-works summary').textContent,w.t('how.title'));
  assert.deepEqual([...w.document.querySelectorAll('a')].map(a=>a.getAttribute('href')),links);
 }
 assert.equal(w.document.querySelectorAll('#lang-switcher-host').length,1);w.close();
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
test('approved device speech begins before auth/network and keeps the selected language',async()=>{
 const s=speech([{name:'Ricardo',lang:'pt-BR',localService:true}]);let ends=0;
 const result=s.w.MatchAppJonasSpeech.speak('Olá','pt-BR',{onEnd:()=>ends++});
 assert.equal(s.utterances.length,1);assert.equal(s.requests(),0);
 assert.equal(s.utterances[0].lang,'pt-BR');
 s.utterances[0].onstart();s.utterances[0].onend();
 assert.equal(await result,true);assert.equal(ends,1);assert.equal(s.requests(),0);s.w.close();
});
test('wrong-language or female local voices never speak and failed cloud ends exactly once',async()=>{
 const s=speech([{name:'Daniel',lang:'en-US',localService:true},{name:'Maria',lang:'pt-BR',localService:true}]);let ends=0;
 assert.equal(await s.w.MatchAppJonasSpeech.speak('Olá','pt-BR',{onEnd:()=>ends++}),false);
 assert.equal(s.utterances.length,0);assert.equal(s.requests(),1);assert.equal(ends,1);s.w.close();
});
test('language switch cancels current local playback without starting speech in another language',async()=>{
 const s=speech([{name:'Ricardo',lang:'pt-BR',localService:true}]);
 const result=s.w.MatchAppJonasSpeech.speak('Olá','pt-BR',{});
 s.w.document.dispatchEvent(new s.w.CustomEvent('matchapp:langchange',{detail:{lang:'fr'}}));
 assert.equal(await result,false);assert.equal(s.requests(),0);s.w.close();
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
  assert.ok(fs.statSync(path.join(__dirname,'../jonas/greetings',clip.file)).size<25000);
  w.MATCH_LANG=language;w.eval(read('jonas/locales-20261009-v2.js'));
  assert.equal(w.MatchAppJonasLocale.t('greeting'),clip.text);
 }
 w.close();
});
