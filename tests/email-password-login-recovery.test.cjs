const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('app.js');
function section(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a);
 assert.ok(a>=0&&b>a,'expected live auth handler: '+start);
 return app.slice(a,b);
}
const login=section('window.handleEmailLogin = async function()','// 🔵 GOOGLE OAUTH');
const reset=section('window.handlePasswordReset = async function()','// ----------------------------------------------------\n// AUTH LOGIC');
function page(){
 const dom=new JSDOM('<input id="login-email" type="email"><input id="login-password" type="password">'+
 '<button id="login-submit">Log In</button><input id="forgot-email" type="email">'+
 '<button id="btn-forgot">Send reset link</button><p id="auth-message"></p>',{
 url:'https://matchapp.tv/',runScripts:'outside-only',virtualConsole:new VirtualConsole()
 });
 const w=dom.window,calls={closed:0,toast:[],signin:[],reset:[],restored:[]};
 w.closeAuthModal=()=>calls.closed++;
 w.showToast=text=>calls.toast.push(text);
 w.supabaseClient={auth:{
   signInWithPassword:async args=>{calls.signin.push(args);return {data:{
     user:{id:'new-member'},session:{access_token:'new-jwt',refresh_token:'new-refresh'}
   }};},
   getSession:async()=>({data:{session:{user:{id:'new-member'},access_token:'new-jwt'}}}),
   setSession:async args=>{calls.restored.push(args);return {error:null};},
   resetPasswordForEmail:async(email,options)=>{calls.reset.push({email,options});return {error:null};}
 }};
 w.eval('var supabaseClient=window.supabaseClient;');
 w.eval(reset);
 w.eval(login);
 const get=id=>w.document.getElementById(id);
 get('login-email').value='  member@example.test  ';
 get('login-password').value=' leading spaces are valid ';
 get('forgot-email').value='member@example.test';
 return {dom,w,get,calls};
}
test('real signInWithPassword preserves password bytes, verifies saved session and closes modal without forced reload',async()=>{
 const {dom,w,get,calls}=page();
 await w.handleEmailLogin();
 assert.deepEqual(JSON.parse(JSON.stringify(calls.signin)),[{email:'member@example.test',password:' leading spaces are valid '}]);
 assert.equal(calls.closed,1);
 assert.equal(get('login-submit').disabled,false);
 assert.match(get('auth-message').textContent,/signed in/i);
 dom.window.close();
});
test('wrong password or Google-only account never falsely claims signup or confirmation is missing',async()=>{
 const {dom,w,get,calls}=page();
 w.supabaseClient.auth.signInWithPassword=async()=>({error:{code:'invalid_credentials',message:'Invalid login credentials'}});
 await w.handleEmailLogin();
 assert.equal(calls.closed,0);
 assert.match(get('auth-message').textContent,/Google/);
 assert.match(get('auth-message').textContent,/Forgot your password/);
 assert.doesNotMatch(get('auth-message').textContent,/account exists/i);
 assert.equal(get('login-submit').disabled,false);
 dom.window.close();
});
test('unconfirmed account provides correct email resend, not a false signed-in state',async()=>{
 const {dom,w,get,calls}=page();
 w.supabaseClient.auth.signInWithPassword=async()=>({error:{code:'email_not_confirmed'}});
 await w.handleEmailLogin();
 assert.equal(calls.closed,0);
 assert.match(get('auth-message').textContent,/confirm your email/i);
 dom.window.close();
});
test('a stale cached account is restored only with the newly issued password-login session',async()=>{
 const {dom,w,calls}=page();
 let n=0;
 w.supabaseClient.auth.getSession=async()=>({data:{session:n++===0?
 {user:{id:'old-user'},access_token:'stale'}:
 {user:{id:'new-member'},access_token:'new-jwt'}}});
 await w.handleEmailLogin();
 assert.equal(calls.restored.length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(calls.restored[0])),{
   access_token:'new-jwt',refresh_token:'new-refresh'
 });
 assert.equal(calls.closed,1);
 dom.window.close();
});
test('no server-issued session never claims a successful login',async()=>{
 const {dom,w,get,calls}=page();
 w.supabaseClient.auth.signInWithPassword=async()=>({data:{user:{id:'new-member'},session:null}});
 await w.handleEmailLogin();
 assert.equal(calls.closed,0);
 assert.match(get('auth-message').textContent,/not completed/i);
 dom.window.close();
});
test('two quick clicks never generate competing sign-in requests',async()=>{
 const {dom,w,calls}=page();
 let finish;
 w.supabaseClient.auth.signInWithPassword=()=>new Promise(resolve=>finish=()=>resolve({
   data:{user:{id:'new-member'},session:{access_token:'new-jwt',refresh_token:'new-refresh'}}
 }));
 const p=w.handleEmailLogin();await Promise.resolve();
 await w.handleEmailLogin();
 assert.equal(w.__maEmailLoginPending,true);
 finish();await p;
 assert.equal(w.__maEmailLoginPending,false);
 assert.equal(calls.closed,1);
 dom.window.close();
});
test('recovery request checks the Supabase result; provider errors never claim an email was sent',async()=>{
 const {dom,w,get,calls}=page();
 w.supabaseClient.auth.resetPasswordForEmail=async()=>({error:{status:503,message:'SMTP unavailable'}});
 await w.handlePasswordReset();
 assert.match(get('auth-message').textContent,/could not be requested/i);
 assert.doesNotMatch(get('auth-message').textContent,/link has been requested/i);
 assert.equal(get('btn-forgot').disabled,false);
 assert.equal(calls.reset.length,0);
 dom.window.close();
});
test('successful reset sends link to recovery page and double taps do not invalidate first token',async()=>{
 const {dom,w,get,calls}=page();
 await w.handlePasswordReset();
 await w.handlePasswordReset();
 assert.equal(calls.reset.length,1);
 assert.deepEqual(JSON.parse(JSON.stringify(calls.reset[0])),{
   email:'member@example.test',options:{redirectTo:'https://matchapp.tv/reset.html'}
 });
 assert.match(get('auth-message').textContent,/check your inbox/i);
 assert.equal(get('btn-forgot').disabled,false);
 dom.window.close();
});
test('completed password reset returns to Log In, never Sign Up',()=>{
 const html=read('reset.html');
 assert.match(html,/window\.location\.href\s*=\s*'\/\?signIn=1'/);
 assert.doesNotMatch(html,/window\.location\.href\s*=\s*'\/index\.html\?openAuth=1'/);
 const home=read('index.html');
 assert.match(home,/id="login-submit"/);
 assert.match(read('auth-confirmation.js'),/directSignIn \? 'login' : 'signup'/);
});
