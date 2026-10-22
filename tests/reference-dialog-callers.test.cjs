'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function scene(markup='',route='/profile/profile.html'){
 const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body>'+markup+'</body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true});
 Object.defineProperty(dom.window.document,'readyState',{configurable:true,get:()=> 'complete'});
 return dom;
}
function deletionScene(){
 const dom=scene('<section><div id="locked-info-card"></div></section>'),w=dom.window,calls={rpc:[],signout:0};
 w.supabaseClient={rpc:async name=>{calls.rpc.push(name);return{data:{},error:null};},auth:{signOut:async()=>{calls.signout++;}}};
 w.eval(read('legal-kit.js'));
 return{dom,w,calls,button:w.document.getElementById('ma-delete-btn')};
}
test('account deletion waits for a strict affirmative once and cancellation or failure writes nothing',async()=>{
 const {dom,w,calls,button}=deletionScene(),questions=[];let answer=deferred();
 w.confirm=()=>{throw Error('The available themed helper must own confirmation');};
 w.MatchAppDialogs={confirm:(message,options)=>{questions.push({message,options});return answer.promise;}};
 button.click();button.click();assert.equal(questions.length,1);assert.equal(calls.rpc.length,0);assert.equal(button.disabled,true);
 assert.equal(questions[0].message,'Delete your MatchApp account? You can recreate it with the same email after 72 hours.');
 assert.equal(questions[0].options.trigger,button);
 answer.resolve(false);await tick();assert.equal(calls.rpc.length,0);assert.equal(calls.signout,0);assert.equal(button.disabled,false);
 answer=deferred();button.click();answer.reject(Error('Dialog unavailable'));await tick();assert.equal(calls.rpc.length,0);assert.equal(button.disabled,false);
 answer=deferred();button.click();button.click();answer.resolve('true');await tick();assert.equal(calls.rpc.length,0,'truthy strings cannot authorize deletion');
 answer=deferred();button.click();button.click();answer.resolve(true);await tick();
 assert.deepEqual(calls.rpc,['request_account_deletion']);assert.equal(calls.signout,1);assert.equal(button.disabled,false);
 dom.window.close();
});
test('account deletion retains native confirmation fallback when the helper is absent',async()=>{
 const {dom,w,calls,button}=deletionScene();let count=0;
 w.confirm=()=>{count++;return false;};button.click();await tick();assert.equal(count,1);assert.equal(calls.rpc.length,0);
 w.confirm=()=>{count++;return true;};button.click();await tick();assert.equal(count,2);assert.deepEqual(calls.rpc,['request_account_deletion']);assert.equal(calls.signout,1);
 dom.window.close();
});
test('an account change while confirmation is pending cannot authorize deletion of the next account',async()=>{
 const {dom,w,calls,button}=deletionScene(),answer=deferred();w.matchProfileState={status:'ready',userId:'original-account'};
 w.MatchAppDialogs={confirm:()=>answer.promise};button.click();w.matchProfileState={status:'ready',userId:'other-account'};answer.resolve(true);await tick();
 assert.equal(calls.rpc.length,0);assert.equal(calls.signout,0);assert.equal(button.disabled,false);dom.window.close();
});
async function passkeyScene(){
 const dom=scene('<button data-passkey-action="add">Add</button><p data-passkey-status></p><div id="passkey-list"></div>'),w=dom.window,calls=[];
 Object.defineProperty(w,'isSecureContext',{value:true});w.PublicKeyCredential=class{};w.navigator.credentials={};
 w.supabaseClient={auth:{getUser:async()=>({data:{user:{id:'owner-id'}},error:null}),onAuthStateChange:callback=>{w.testAuthChange=callback;return{};},signInWithPasskey:async()=>({}),passkey:{list:async()=>({data:[{id:'verified-passkey-id',friendly_name:'Owner device'}],error:null}),delete:async input=>{calls.push(input);return{error:null};}}}};
 w.eval(read('passkeys.js'));await tick();await tick();
 return{dom,w,calls};
}
test('passkey removal keeps the exact credential and question, rejects cancellation, and confirms once',async()=>{
 const {dom,w,calls}=await passkeyScene(),prompts=[];let answer=deferred();
 w.MatchAppDialogs={confirm:(message,options)=>{prompts.push({message,options});return answer.promise;}};
 w.confirm=()=>{throw Error('Native confirmation must not replace an available helper');};
 let button=w.document.querySelector('.passkey-remove');assert.ok(button);button.click();button.click();
 assert.equal(prompts.length,1);assert.equal(calls.length,0);assert.equal(w.document.querySelector('[data-passkey-action=add]').disabled,true);
 assert.equal(prompts[0].message,'Remove this passkey from MatchApp? You can still sign in with Google or email.');assert.equal(prompts[0].options.trigger,button);
 answer.resolve(false);await tick();assert.equal(calls.length,0);assert.equal(button.disabled,false);
 answer=deferred();button.click();answer.reject(Error('Dialog unavailable'));await tick();assert.equal(calls.length,0);assert.equal(button.disabled,false);
 answer=deferred();button.click();button.click();answer.resolve(true);await tick();await tick();
 assert.equal(calls.length,1);assert.equal(calls[0].passkeyId,'verified-passkey-id');assert.equal(w.document.querySelector('[data-passkey-action=add]').disabled,false);
 dom.window.close();
});
test('passkey removal retains native cancellation and affirmative fallbacks',async()=>{
 const {dom,w,calls}=await passkeyScene();w.confirm=()=>false;w.document.querySelector('.passkey-remove').click();await tick();assert.equal(calls.length,0);
 w.confirm=()=>true;w.document.querySelector('.passkey-remove').click();await tick();assert.equal(calls.length,1);assert.equal(calls[0].passkeyId,'verified-passkey-id');dom.window.close();
});
test('signing out while a passkey confirmation is open cannot authorize credential removal',async()=>{
 const {dom,w,calls}=await passkeyScene(),answer=deferred();w.MatchAppDialogs={confirm:()=>answer.promise};
 w.document.querySelector('.passkey-remove').click();w.testAuthChange('SIGNED_OUT',null);answer.resolve(true);await tick();
 assert.equal(calls.length,0);dom.window.close();
});
test('guest portfolio alert is awaited before opening sign-in and cannot save a record',async()=>{
 const dom=scene('', '/'),w=dom.window,answer=deferred();let auth=0,alerts=[];
 w.openAuthModal=()=>{auth++;};w.MatchAppDialogs={alert:message=>{alerts.push(message);return answer.promise;}};
 w.eval('var globalMatchTitle="Original title",isUserLoggedIn=false;');
 const source=read('app.js'),start=source.indexOf('window.recordAction = async function(type)'),end=source.indexOf('\n// ----------------------------------------------------\n// PRIVATE TITLE NOTES',start);
 assert.ok(start>0&&end>start);w.eval(source.slice(start,end));
 const pending=w.recordAction('save');assert.equal(auth,0);assert.deepEqual(alerts,['💎 Join for FREE!\n\nTo save titles to your Portfolio, please create a free account.']);
 answer.resolve(false);await pending;assert.equal(auth,1);assert.equal(w.localStorage.length,0);
 delete w.MatchAppDialogs;w.alert=message=>alerts.push(message);await w.recordAction('save');assert.equal(auth,2);assert.equal(alerts.length,2);assert.equal(w.localStorage.length,0);dom.window.close();
});
test('locked profile notice uses the themed helper and preserves its immutable fields',async()=>{
 const dom=scene('<section id="editable-fields-section"><input value="Original identity"></section><div id="locked-info-card"></div><button id="save-profile-btn"></button>'),w=dom.window;
 w.localStorage.setItem('match_profile_locked','true');w.matchProfileState={status:'ready'};
 w.eval('var STAR_SIGN_TRAITS={};function formatSign(value){return value}function populateEmail(){}');
 const source=read('profile.js'),start=source.indexOf('function checkAndRenderProfileState('),end=source.indexOf('\nwindow.checkAndRenderProfileState =',start);
 w.eval(source.slice(source.indexOf('function calculateAgeFromDOB('),source.indexOf('function renderProfileAgeLabel(')));
 w.eval(source.slice(start,end));w.checkAndRenderProfileState();let messages=[];
 w.MatchAppDialogs={alert:async message=>messages.push(message)};const button=w.document.getElementById('save-profile-btn');await button.onclick();
 assert.deepEqual(messages,['Core identity fields are permanently locked to maintain consistent AI matching.']);assert.equal(button.disabled,true);assert.equal(w.localStorage.getItem('match_profile_locked'),'true');
 delete w.MatchAppDialogs;w.alert=message=>messages.push(message);await button.onclick();assert.equal(messages.length,2);assert.equal(w.document.querySelector('input').value,'Original identity');dom.window.close();
});
test('pricing notices preserve toast priority and only replace the native alert fallback',()=>{
 const dom=scene('', '/pricing/pricing.html'),w=dom.window,calls=[];
 const notify=read('pricing.js').split('\n').find(line=>line.startsWith('function notify('));assert.ok(notify);w.eval(notify);
 w.showToast=(message,error)=>calls.push(['toast',message,error]);w.MatchAppDialogs={alert:message=>{calls.push(['dialog',message]);return Promise.resolve(true);}};w.alert=message=>calls.push(['native',message]);
 w.notify('Original billing error',true);delete w.showToast;w.notify('Original billing error',true);delete w.MatchAppDialogs;w.notify('Original billing error',true);
 assert.deepEqual(calls,[['toast','Original billing error',true],['dialog','Original billing error'],['native','Original billing error']]);dom.window.close();
});
test('adult reference shell loads exactly one dialog helper pair and respects isolated routes',()=>{
 for(const route of ['/','/profile/profile.html','/kids/','/confirm.html','/callback.html']){
  const dom=scene('',route),w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){}});w.eval(read('patches/reference-system.js'));w.eval(read('patches/reference-system.js'));
  const expected=/^\/(kids|confirm|callback)/.test(route)?0:1;
  assert.equal(w.document.querySelectorAll('script[data-cinema-dialogs]').length,expected,route);
  assert.equal(w.document.querySelectorAll('link[href^="/patches/reference-dialogs.css?"]').length,expected,route);
  dom.window.close();
 }
});
