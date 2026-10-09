'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const localeCode=read('jonas/locales.js'),widget=read('jonas/floating-home.js'),voice=read('jonas/floating-voice.js'),homepage=read('index.html');
const start=homepage.indexOf('<aside id="ma-jonas-home"'),markup=homepage.slice(start,homepage.indexOf('</aside>',start)+8);
function fixture(lang){
 const dom=new JSDOM('<!doctype html><html lang="'+lang+'"><body class="page-home"><div id="ma-ai-entry"><div id="search-box"><textarea id="specific-search-input"></textarea></div></div>'+markup+'</body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,voiceState={said:[],langs:[],permission:0};
 w.MATCH_LANG=lang;w.matchMedia=()=>({matches:false});
 w.navigator.mediaDevices={getUserMedia:()=>{voiceState.permission++;return Promise.resolve({getTracks:()=>[{stop(){}}]})}};
 w.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
 w.speechSynthesis={cancel(){},speak:u=>voiceState.said.push(u),getVoices:()=>[]};
 w.SpeechRecognition=class{start(){voiceState.langs.push(this.lang)}abort(){}};
 w.eval(localeCode);w.eval(widget);w.eval(voice);
 return {dom,w,doc:w.document,state:voiceState};
}
test('every supported top-box language has localized Jonas UI and a BCP47 voice code',()=>{
 const i18n=read('i18n.js');const matched=i18n.match(/const I18N_LANGS = \{([\s\S]*?)\n\s*\};/);assert.ok(matched);
 const expected=[...matched[1].matchAll(/'([^']+)':\s*\{/g)].map(m=>m[1]);
 const d=fixture('en');
 assert.deepEqual([...d.w.MatchAppJonasLocale.codes],expected);
 for(const language of expected){
  d.w.MATCH_LANG=language;d.doc.documentElement.lang=language;
  d.doc.dispatchEvent(new d.w.CustomEvent('matchapp:langchange',{detail:{lang:language}}));
  const translation=d.w.MatchAppJonasLocale.get();
  assert.ok(translation.greeting.length>15,language);
  assert.equal(d.doc.querySelector('.jh-greeting').textContent,translation.greeting);
  assert.equal(d.doc.querySelector('.jh-title small').textContent,translation.companion);
  assert.equal(d.doc.getElementById('ma-jonas-home-input').placeholder,translation.placeholder);
  assert.equal(d.doc.querySelector('.jh-suggestion').textContent,translation.doc);
  assert.equal(d.doc.querySelector('.jh-form').getAttribute('action'),'/discover.html');
  assert.equal(new URL(d.doc.querySelector('.jh-suggestion').href).searchParams.get('q'),translation.qdoc);
  assert.ok(/^[a-z]{2,3}-[A-Z]{2}$/.test(translation.speech),translation.speech);
  assert.equal(d.doc.getElementById('ma-jonas-home-panel').getAttribute('dir'),language==='ar'?'rtl':'ltr');
 }
 d.dom.window.close();
});
test('speech and recognition track selected top-box language, and do not start on drag',()=>{
 for(const code of ['es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh','pt-BR']){
  const {dom,w,doc,state}=fixture(code);
  doc.getElementById('ma-jonas-home-bubble').click();
  assert.equal(state.said.length,1,code);
  assert.equal(state.said[0].lang,w.MatchAppJonasLocale.speech(),code);
  assert.equal(state.said[0].text,w.MatchAppJonasLocale.t('greeting'),code);
  state.said[0].onend();
  assert.equal(state.langs.at(-1),w.MatchAppJonasLocale.speech(),code);
  doc.getElementById('ma-jonas-home-close').click();
  dom.window.close();
 }
});
