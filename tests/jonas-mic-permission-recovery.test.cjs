const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('E:/android/MatchAppAi-AndroidReleaseFix-20261011/jonas/floating-voice-20261010-v5.js','utf8');
function testCase(code, expected, cancelBeforeRetry=false){
 const events={}, timers=[]; const active=new Set(); let calls=0;
 const cls={add(...x){x.forEach(y=>active.add(y))},remove(...x){x.forEach(y=>active.delete(y))},contains(x){return active.has(x)}};
 const input={value:'',addEventListener(){}};
 const mic={setAttribute(){},addEventListener(){}};
 const status={textContent:''};
 const form={addEventListener(){},requestSubmit(){}};
 const root={querySelector(s){return ({'#ma-jonas-home-input':input,'.jh-form':form,'#ma-jonas-home-mic':mic,'#ma-jonas-home-status':status})[s]||null},classList:cls,dataset:{},addEventListener(name,cb){events[name]=cb}};
 const panel={hidden:false};
 const doc={getElementById(id){return id==='ma-jonas-home'?root:id==='ma-jonas-home-panel'?panel:null},documentElement:{lang:'en'},hidden:false,addEventListener(){}};
 const win={speechSynthesis:{getVoices(){return []},cancel(){}},MATCH_LANG:'en',MatchAppJonasLocale:{speech(){return 'en-US'},t(key){return key}},MatchAppJonasSpeech:{stop(){},unlock(){},speak(msg,lang,callbacks){callbacks.onEnd()}},MatchAppNativeVoice:{start(){calls++; if(code)win.matchAppNativeVoiceError(code)}},addEventListener(){}};
 const context={window:win,document:doc,Image:class{constructor(){this.complete=false;this.naturalWidth=0}},setTimeout(cb){timers.push(cb);return timers.length},clearTimeout(){},clearInterval(){},setInterval(){},requestAnimationFrame(){return 1},cancelAnimationFrame(){},performance:{now(){return 0}},sessionStorage:{setItem(){}},location:{assign(){}},navigator:{language:'en'},console};
 vm.runInNewContext(source,context,{filename:'floating-voice-v5.js'});
 events['matchapp:jonas-open']();
 if(cancelBeforeRetry){events['matchapp:jonas-close']()}
 for(let k=0;timers.length&&k<4;k++){const t=timers.shift();t()}
 assert.equal(calls,expected,'unexpected native recognition attempt count');
 return status.textContent;
}
assert.match(testCase('unavailable',2),/Microphone unavailable/i);
assert.match(testCase('permission-denied',1),/Microphone unavailable/i);
assert.equal(testCase('unavailable',1,true),'mic');
assert.match(testCase(null,1),/Listening/i);
console.log('PASS: one transient retry, no denied retry, close cancellation, normal native recognition');
