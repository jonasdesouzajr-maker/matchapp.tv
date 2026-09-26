const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('app.js'),audit=read('final-audit.js');
const first=app.indexOf('window.handleEmailSignup = async function()');
const last=app.indexOf('\nwindow.handleEmailLogin = async function()',first);
assert.ok(first>=0&&last>first,'the real email signup handler is present');
const signup=app.slice(first,last);

function runner(signUp){
  const button={disabled:false},message={style:{},innerText:''};
  const fields={'reg-email':{value:'new@example.test'},'reg-password':{value:'strong-password'},
    'auth-message':message};
  const window={};
  const document={
    getElementById:id=>fields[id]||null,
    querySelector:selector=>selector==='#form-signup .gold-btn'?button:null
  };
  vm.runInNewContext(signup,{window,document,
    supabaseClient:{auth:{signUp}},setTimeout:()=>{}});
  return {window,button,message};
}

test('double-clicking email signup starts only one verification email request',async()=>{
  let release,calls=0;
  const pending=new Promise(resolve=>release=resolve);
  const site=runner(()=>{calls++;return pending;});
  const firstRequest=site.window.handleEmailSignup();
  const secondRequest=site.window.handleEmailSignup();
  assert.equal(calls,1);
  assert.equal(site.button.disabled,true);
  assert.equal(site.window.__maEmailSignupPending,true);
  release({data:{user:{id:'pending'},session:null},error:null});
  await Promise.all([firstRequest,secondRequest]);
  assert.equal(site.button.disabled,false);
  assert.equal(site.window.__maEmailSignupPending,false);
  assert.match(site.message.innerText,/confirm your email/i);
});

test('failed email signup can be retried and never leaves the submit button stuck',async()=>{
  let calls=0;
  const site=runner(async()=>{calls++;return calls===1?
    {error:{message:'Provider temporarily unavailable'}}:
    {data:{user:{id:'pending'},session:null},error:null};});
  await site.window.handleEmailSignup();
  assert.equal(site.window.__maEmailSignupPending,false);
  assert.equal(site.button.disabled,false);
  assert.match(site.message.innerText,/temporarily unavailable/);
  await site.window.handleEmailSignup();
  assert.equal(calls,2);
  assert.match(site.message.innerText,/confirm your email/i);
});

test('late-loaded registration override has the same cross-handler single-flight guard',()=>{
  assert.match(audit,/if\(window\.__maEmailSignupPending\)return/);
  assert.match(audit,/window\.__maEmailSignupPending=true/);
  assert.match(audit,/finally\{window\.__maEmailSignupPending=false/);
  assert.match(app,/window\.__maEmailSignupPending = false/);
  assert.match(read('title-captions.js'),/final-audit\.js\?v=20260926-emailsingle1/);
  assert.match(read('index.html'),/auth-confirmation\.js\?v=20260926-emailsingle1/);
});