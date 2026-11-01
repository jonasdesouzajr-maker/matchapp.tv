'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=app.indexOf('function sharedMatchAuthClient()');
const end=app.indexOf('let globalMatchTitle',start);
const boot=app.slice(start,end);
const session=id=>({data:{session:id?{access_token:'test-token',user:{id}}:null},error:null});
function harness({client,parent,create}={}) {
 const w={location:{origin:'https://matchapp.tv',pathname:'/discover.html'},supabaseClient:client,
  supabase:{createClient:()=>create()},MatchAppNativeAuth:null};
 w.window=w;w.top=parent||w;
 const context=vm.createContext({window:w,SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public'});
 vm.runInContext(boot,context);
 return w;
}
test('an existing client is reused and concurrent getSession calls share one read',async()=>{
 let reads=0,release,creates=0;
 const client={auth:{getSession(){reads++;return new Promise(r=>release=r);}}};
 const w=harness({client,create:()=>{creates++;throw Error('duplicate client');}});
 const first=w.supabaseClient.auth.getSession(),second=w.supabaseClient.auth.getSession();
 await Promise.resolve();
 assert.equal(creates,0);assert.equal(reads,1);assert.equal(first,second);
 release(session('member'));await first;
 const third=w.supabaseClient.auth.getSession();await Promise.resolve();
 assert.equal(reads,2,'settled sessions are read again, never cached');
 release(session(null));assert.equal((await third).data.session,null);
});
test('a same-origin Jonas frame reuses the parent session owner',async()=>{
 let creates=0;
 const parent={location:{origin:'https://matchapp.tv',pathname:'/news/'},supabaseClient:{auth:{getSession:async()=>session('member')}}};
 const w=harness({parent,create:()=>{creates++;throw Error('duplicate client');}});
 assert.equal(w.supabaseClient,parent.supabaseClient);assert.equal(creates,0);
 assert.equal((await w.supabaseClient.auth.getSession()).data.session.user.id,'member');
});
test('cross-origin and Kids parent contexts cannot provide the adult session owner',()=>{
 for(const parent of [
  {location:{origin:'https://other.example',pathname:'/'},supabaseClient:{}},
  {location:{origin:'https://matchapp.tv',pathname:'/kids/'},supabaseClient:{}}
 ]){
  let creates=0;const own={auth:{getSession:async()=>session(null)}};
  const w=harness({parent,create:()=>{creates++;return own;}});
  assert.equal(creates,1);assert.equal(w.supabaseClient,own);
 }
});
test('a rejected session read releases the flight for a later retry',async()=>{
 let reads=0;
 const w=harness({client:{auth:{getSession:()=>++reads===1?Promise.reject(Error('offline')):Promise.resolve(session('member'))}}});
 await assert.rejects(w.supabaseClient.auth.getSession(),/offline/);
 assert.equal((await w.supabaseClient.auth.getSession()).data.session.user.id,'member');
 assert.equal(reads,2);
});
function oauthHarness(getSession,signInWithOAuth=async()=>({data:{url:''}})){
 const from=app.indexOf('async function loginWithOAuthProvider('),to=app.indexOf('window.loginWithGoogle =',from);
 let closed=0;const w={location:{origin:'https://matchapp.tv'},closeAuthModal(){closed++;}};
 const context=vm.createContext({window:w,document:{getElementById:()=>null},supabaseClient:{auth:{getSession,signInWithOAuth}}});
 vm.runInContext(app.slice(from,to)+';window.login=loginWithOAuthProvider;',context);
 return {w,closed:()=>closed};
}
test('an already signed-in user closes the stale modal without opening Google again',async()=>{
 let oauth=0;const h=oauthHarness(async()=>session('member'),async()=>{oauth++;});
 await h.w.login('google','Google');
 assert.equal(oauth,0);assert.equal(h.closed(),1);assert.equal(h.w.__maOAuthPending,false);
});
test('two simultaneous Google taps restore the session and start only one provider flow',async()=>{
 let release,oauth=0;const h=oauthHarness(()=>new Promise(r=>release=r),async()=>{oauth++;return {data:{}};});
 const first=h.w.login('google','Google'),second=h.w.login('google','Google');
 release(session(null));await Promise.all([first,second]);
 assert.equal(oauth,1);assert.equal(h.w.__maOAuthPending,false);
});
test('session restoration failure does not start another OAuth flow',async()=>{
 let oauth=0;const h=oauthHarness(async()=>({error:Error('session_unavailable')}),async()=>{oauth++;});
 await h.w.login('google','Google');assert.equal(oauth,0);assert.equal(h.w.__maOAuthPending,false);
});
test('an auth transition invalidates the old identity read without letting its completion clear the new flight',async()=>{
 const releases=[];let reads=0;
 const w=harness({client:{auth:{getSession(){reads++;return new Promise(r=>releases.push(r));}}}});
 const old=w.supabaseClient.auth.getSession();await Promise.resolve();
 w.supabaseClient.auth.__matchappInvalidateSessionRead();
 const current=w.supabaseClient.auth.getSession();await Promise.resolve();
 releases[0](session('old-account'));await old;
 assert.equal(w.supabaseClient.auth.getSession(),current);
 releases[1](session('new-account'));
 assert.equal((await current).data.session.user.id,'new-account');assert.equal(reads,2);
});
test('direct sign-in links wait for the existing session before opening any provider prompt',async()=>{
 const {JSDOM}=require('jsdom');
 const dom=new JSDOM('',{url:'https://matchapp.tv/?signIn=1',runScripts:'outside-only'}),w=dom.window;
 let opened=0,closed=0,reads=0;
 w.openAuthModal=()=>opened++;w.closeAuthModal=()=>closed++;
 w.eval(fs.readFileSync(path.join(__dirname,'..','auth-confirmation.js'),'utf8'));
 await w.MatchAppEmailAuth.handleLanding({auth:{getSession:async()=>{reads++;return session('member');}}});
 assert.equal(reads,1);assert.equal(opened,0);assert.equal(closed,1);assert.equal(w.location.search,'');
 dom.window.close();
});
