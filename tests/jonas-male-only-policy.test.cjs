'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const context={};context.window=context;vm.createContext(context);
vm.runInContext(read('jonas/male-voice-policy-20261010.js'),context);
const choose=context.MatchAppJonasVoicePolicy.select;
const voice=(name,lang='en-US')=>({name,lang,localService:true});

test('Jonas never speaks in female-only or unnamed voice configurations',()=>{
 assert.equal(choose([voice('Samantha'),voice('Google US English')],'en-US'),null);
 assert.equal(choose([voice('Female Male'),voice('Jenny Female')],'en-US'),null);
 assert.equal(choose([], 'en-US'),null);
 assert.equal(choose([voice('Daniel','fr-FR')],'en-US'),null);
 assert.equal(choose([{name:'Daniel',lang:'en-US',localService:false}],'en-US'),null,'network voice must not trigger default fallback');
 assert.equal(choose([voice('Daniel'),voice('Samantha')],'en-US').name,'Daniel');
 assert.equal(choose([voice('Google UK English Male','en-GB')],'en-US').name,'Google UK English Male');
});
test('all actual browser entrypoints load the voice policy before Jonas synthesis',()=>{
 const home=read('index.html'),jonas=read('jonas/index.html');
 assert.ok(home.includes('secure-speech-20261010.js'));
 assert.ok(jonas.includes('secure-speech-20261010.js'));
 assert.ok(home.indexOf('male-voice-policy-20261010.js')<home.indexOf('floating-voice-20261010-v5.js'));
 assert.ok(jonas.indexOf('male-voice-policy-20261010.js')<jonas.indexOf('jonas-20261010-v3.js'));
 for(const p of ['jonas/floating-voice-20261010-v5.js','jonas/jonas-20261010-v3.js']){
  const script=read(p);
  assert.match(script,/MatchAppJonasVoicePolicy/);
  assert.doesNotMatch(script,/matching\[0\]\|\|null|choices\[0\]\|\|null/);
 }
});
test('Android speech has no female/default fallback or pitch-disguising',()=>{
 const kotlin=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(kotlin,/!chooseJonasVoice\(engine, locale\)/);
 assert.match(kotlin,/val eligible = engine\.voices\.orEmpty\(\)/);
 assert.match(kotlin,/filterNot \{ femaleOrUnknownGender\.containsMatchIn/);
 assert.doesNotMatch(kotlin,/engine\.setPitch\(0\.78f\)|engine\.setPitch\(0\.88f\)|engine\.language = locale/);
});
