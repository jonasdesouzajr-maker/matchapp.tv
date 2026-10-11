const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const src=fs.readFileSync(path.join(__dirname,'..','passkeys.js'),'utf8');
const delay=()=>new Promise(r=>setTimeout(r,30));
test('Google SIGNED_IN refreshes passkey card on profile without a page reload',async()=>{
const d=new JSDOM('<!doctype html><body><h3 data-passkey-text="title"></h3><p data-passkey-text="help"></p><button data-passkey-action="add">Add</button><a data-passkey-sign-in-first href="/?signIn=1">Sign in first</a><p data-passkey-identity hidden></p><p data-passkey-status></p><div id="passkey-list"></div></body>',{url:'https://matchapp.tv/profile/',runScripts:'dangerously'});
const w=d.window;let user=null,onAuth=null,added=0;
Object.defineProperty(w,'isSecureContext',{configurable:true,value:true});
Object.defineProperty(w,'PublicKeyCredential',{configurable:true,value:function(){}});
Object.defineProperty(w.navigator,'credentials',{configurable:true,value:{create(){},get(){}}});
w.MATCH_LANG='en';
w.supabaseClient={auth:{
getUser:async()=>({data:{user},error:null}),
signInWithPasskey:async()=>({data:{session:{},user},error:null}),
registerPasskey:async()=>{added++;return {data:{id:'credential-1'},error:null}},
onAuthStateChange:cb=>{onAuth=cb;return {data:{subscription:{unsubscribe(){}}}}},
passkey:{list:async()=>({data:[],error:null})}
}};
w.eval(src);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await delay();
assert.equal(w.document.querySelector('[data-passkey-sign-in-first]').hidden,false);
assert.equal(w.document.querySelector('[data-passkey-action="add"]').disabled,true);
user={id:'google-account-1',email_confirmed_at:'2026-10-01T00:00:00Z'};
onAuth('SIGNED_IN',{user});await delay();
assert.equal(w.document.querySelector('[data-passkey-sign-in-first]').hidden,true);
assert.equal(w.document.querySelector('[data-passkey-action="add"]').disabled,false);
assert.equal(w.document.querySelector('[data-passkey-identity]').hidden,false);
w.document.querySelector('[data-passkey-action="add"]').click();await delay();
assert.equal(added,1);
d.window.close();
});