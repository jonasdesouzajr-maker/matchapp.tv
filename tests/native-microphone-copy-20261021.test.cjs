'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../voice-input.js'),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
function scene({lang='en',htmlLang='en',native=true,kids=false,inputId='discover-new-input',route,ua,kidsOnly=false}={}){
 const dom=new JSDOM('<html lang="'+htmlLang+'"><body><textarea id="'+inputId+'" placeholder="Type here">Unsent draft</textarea><button id="mic" type="button">Mic</button></body></html>',{
  url:'https://matchapp.tv'+(route||(kids?'/kids/':'/discover.html')),runScripts:'outside-only'
 });
 const w=dom.window,calls={start:[],toast:[],submit:[],open:[],settings:0};
 if(ua)Object.defineProperty(w.navigator,'userAgent',{value:ua});
 if(kidsOnly)w.MATCHAPP_ANDROID_KIDS_ONLY=true;
 w.MATCH_LANG=lang;w.t=key=>key==='voice.micDenied'?'Existing browser permission guidance':key==='voice.listening'?'Listening':null;
 w.showToast=(...args)=>calls.toast.push(args);w.open=(...args)=>calls.open.push(args);
 w.fetch=()=>{throw Error('Denial copy must not perform network work');};
 w.MatchAppNativeExperience={openSettings:()=>{calls.settings++;}};
 if(native)w.MatchAppNativeVoice={start:language=>{calls.start.push(language);w.matchAppNativeVoiceError('permission-denied');}};
 else w.SpeechRecognition=class {start(){this.onstart?.();this.onerror?.({error:'not-allowed'});}abort(){}stop(){}};
 w.eval(source);w.initVoiceInput(inputId,'mic',value=>calls.submit.push(value));
 return {dom,w,calls,input:w.document.getElementById(inputId),mic:w.document.getElementById('mic')};
}
test('adult native denial has fourteen authored locale messages and retains typing without settings or permission retries',()=>{
 const messages=new Set();
 for(const lang of languages){
  const s=scene({lang,htmlLang:'en'});
  try{
   const originalUrl=s.w.location.href;s.mic.click();
   assert.equal(s.calls.start.length,1);assert.equal(s.calls.toast.length,1);
   const [message,error]=s.calls.toast[0];assert.equal(error,true);assert.match(message,/Android/);assert.match(message,/MatchApp Ai/);
   assert.notEqual(message,'Existing browser permission guidance');messages.add(message);
   assert.equal(s.input.value,'Unsent draft');assert.equal(s.input.disabled,false);assert.equal(s.input.readOnly,false);
   assert.equal(s.input.placeholder,'Type here');assert.equal(s.mic.classList.contains('mic-listening'),false);
   assert.deepEqual(s.calls.submit,[]);assert.deepEqual(s.calls.open,[]);assert.equal(s.calls.settings,0);assert.equal(s.w.location.href,originalUrl);
   s.input.value+=' and typing still works';s.input.dispatchEvent(new s.w.Event('input',{bubbles:true}));
   assert.equal(s.input.value,'Unsent draft and typing still works');assert.equal(s.calls.start.length,1);
  }finally{s.dom.window.close();}
 }
 assert.equal(messages.size,14,'all supported locales have distinct authored copy');
});
test('native denial follows the selected app language at error time, including regional aliases',()=>{
 const s=scene({lang:'pt-BR',htmlLang:'de'});
 try{
  s.mic.click();const portuguese=s.calls.toast[0][0];assert.match(portuguese,/continuar digitando/);assert.doesNotMatch(portuguese,/navegador/i);
  s.w.MATCH_LANG='pt';s.w.matchAppNativeVoiceError('permission-denied');assert.equal(s.calls.toast[1][0],portuguese);
  s.w.MATCH_LANG='es-MX';s.w.matchAppNativeVoiceError('not-allowed');assert.match(s.calls.toast[2][0],/seguir escribiendo/);
  s.w.MATCH_LANG='';s.w.matchAppNativeVoiceError('service-not-allowed');assert.match(s.calls.toast[3][0],/weiter tippen/);
  assert.equal(s.calls.start.length,1,'copy and language changes never start recognition again');
 }finally{s.dom.window.close();}
});
test('browser microphone guidance and the isolated Kids denial behavior remain unchanged',()=>{
 for(const options of [{native:false},{native:true,kids:true},{native:true,route:'/kids'},
  {native:true,ua:'MatchAppTVAndroid/1.1.26 MatchAppAiKidsAndroid/1.1.26'},
  {native:true,kidsOnly:true},{native:true,kids:true,inputId:'kids-question'}]){
  const s=scene(options);
  try{
   s.mic.click();
   if(options.inputId==='kids-question')assert.deepEqual(s.calls.toast,[]);
   else assert.deepEqual(s.calls.toast,[['Existing browser permission guidance',true]]);
   assert.deepEqual(s.calls.submit,[]);assert.deepEqual(s.calls.open,[]);assert.equal(s.calls.settings,0);
  }finally{s.dom.window.close();}
 }
});
