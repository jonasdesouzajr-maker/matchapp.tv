const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(process.env.VOICE_SOURCE||'voice-input.js','utf8');
function setup({prefix='',path='/',native=false}={}){
 const handlers={},input={value:prefix,scrollHeight:200,style:{},getAttribute:()=>'',dispatchEvent(){},addEventListener(k,f){handlers[k]=f}},mic={style:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(k,f){handlers['mic:'+k]=f}};
 let sr;class SR{constructor(){sr=this}start(){this.onstart()}stop(){this.onend()}abort(){this.onend()}}
 const win={MATCH_LANG:'pt-BR',SpeechRecognition:SR};if(native)win.MatchAppNativeVoice={start(){}};
 const ctx={window:win,location:{pathname:path},document:{getElementById:id=>id==='specific-search-input'?input:mic},Event:class Event{constructor(){this.isTrusted=false}}};
 vm.runInNewContext(source,ctx);let calls=[];
 win.initVoiceInput('specific-search-input','mic-btn-index',text=>calls.push(text));
 const result=(final,text)=>Object.assign([{transcript:text}],{isFinal:final});
 return {win,input,handlers,calls,get sr(){return sr},result};
}
test('live dictation keeps typed prefix and accumulates earlier final results',()=>{
 const c=setup({prefix:'Netflix:'});c.handlers['mic:click']();
 c.sr.onresult({resultIndex:0,results:[c.result(true,'o que assistir'),c.result(false,'depois')]});
 assert.equal(c.input.value,'Netflix: o que assistir depois');assert.equal(c.calls.length,0);
 c.sr.onresult({resultIndex:1,results:[c.result(true,'o que assistir'),c.result(true,'depois de Breaking Bad')]});
 c.sr.onend();assert.equal(c.input.value,'Netflix: O que assistir depois de Breaking Bad?');assert.equal(c.calls.length,1);
 c.sr.onend();assert.equal(c.calls.length,1);
});
test('keyboard edits win over late recognizer results',()=>{
 const c=setup();c.handlers['mic:click']();c.input.value='Minha pergunta digitada';
 c.handlers.input({isTrusted:true});c.sr.onresult({resultIndex:0,results:[c.result(true,'texto atrasado')]});c.sr.onend();
 assert.equal(c.input.value,'Minha pergunta digitada');assert.equal(c.calls.length,0);
});
test('native final dictation handles punctuation and empty results',()=>{
 const c=setup({native:true});c.handlers['mic:click']();c.win.matchAppNativeVoiceResult('quero comédia vírgula sem violência ponto final');
 assert.equal(c.input.value,'Quero comédia, sem violência.');
 const empty=setup({native:true,prefix:'Não apagar'});empty.handlers['mic:click']();empty.win.matchAppNativeVoiceResult('');
 assert.equal(empty.input.value,'Não apagar');assert.equal(empty.calls.length,0);
});
test('Kids retains original voice path',()=>{
 const c=setup({path:'/kids/',prefix:'anterior'});c.handlers['mic:click']();assert.equal(c.input.value,'');
 c.sr.onresult({resultIndex:0,results:[c.result(true,'divertido')]});
 assert.equal(c.input.value,'divertido');assert.equal(c.calls.length,1);
});
