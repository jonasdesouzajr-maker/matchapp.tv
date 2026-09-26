const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM, VirtualConsole} = require('jsdom');

const root = path.join(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const token = 'f'.repeat(64);
const next = () => new Promise(resolve => setTimeout(resolve, 5));
function page(url) {
  const console = new VirtualConsole();
  // jsdom cannot actually navigate to the production domain.
  console.on('jsdomError', () => {});
  const dom = new JSDOM(read('confirm.html'), {
    url, runScripts:'outside-only', virtualConsole:console
  });
  const w=dom.window;
  return {dom,w,button:w.document.getElementById('confirm-email'),
    status:w.document.getElementById('confirmation-status')};
}

test('GET and security-scanner prefetch never spend a signup OTP',async()=>{
  const {dom,w,button,status}=page('https://matchapp.tv/confirm.html?token_hash='+token+'&type=email');
  let verified=0;
  w.supabase={createClient:()=>({auth:{verifyOtp:async()=>{verified++;return {data:{}};}}})};
  w.eval(read('auth-confirmation-page.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await next();
  assert.equal(verified,0,'verification must only happen on a deliberate click');
  assert.equal(button.disabled,false);
  assert.equal(status.textContent,'');
  dom.window.close();
});

test('valid deliberate click verifies token and persists session before home redirect',async()=>{
  const {dom,w,button,status}=page('https://matchapp.tv/confirm.html?token_hash='+token+'&type=email');
  const calls=[];
  w.supabase={createClient:(_url,_key,options)=>{
    assert.equal(options.auth.detectSessionInUrl,false);
    return {auth:{
      verifyOtp:async args=>{calls.push(args);return {data:{user:{id:'test'}}};},
      getSession:async()=>({data:{session:{user:{id:'test'}}}})
    }};
  }};
  w.eval(read('auth-confirmation-page.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  button.click();
  await next();
  assert.equal(calls.length,1);
  assert.equal(calls[0].token_hash,token);
  assert.equal(calls[0].type,'email');
  assert.equal(status.dataset.state,'success');
  assert.match(status.textContent,/confirmed/i);
  assert.ok(!w.location.search.includes('token_hash='),'never retain verified token in history');
  dom.window.close();
});

test('invalid one-time link gives recovery guidance, not a false signed-in result',async()=>{
  const {dom,w,button,status}=page('https://matchapp.tv/confirm.html?token_hash='+token+'&type=email');
  w.supabase={createClient:()=>({auth:{verifyOtp:async()=>({error:{code:'otp_expired'}})}})};
  w.eval(read('auth-confirmation-page.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  button.click();
  await next();
  assert.equal(status.dataset.state,'error');
  assert.match(status.textContent,/invalid, expired/i);
  assert.ok(!w.location.search.includes('token_hash='));
  assert.ok(w.document.querySelector('a[href="/?signIn=1"]'));
  dom.window.close();
});

test('missing or malformed confirmation token cannot be submitted',async()=>{
  const {dom,w,button,status}=page('https://matchapp.tv/confirm.html?type=email');
  let called=false;
  w.supabase={createClient:()=>{called=true;return {}}};
  w.eval(read('auth-confirmation-page.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  assert.equal(button.disabled,true);
  button.click();
  await next();
  assert.equal(called,false);
  assert.equal(status.dataset.state,'error');
  dom.window.close();
});

test('custom confirmation template requires user click and frontend recognizes verified return',()=>{
  const manual=read('auth-confirmation-page.js');
  const landing=read('auth-confirmation.js');
  const guide=read('docs/supabase-confirm-signup-email-template.md');
  assert.match(guide,/confirm\.html\?token_hash=\{\{ \.TokenHash \}\}/);
  assert.match(landing,/verifiedReturn = query\.get\('authReturn'\) === 'verified'/);
  assert.doesNotMatch(manual,/addEventListener\(['"]DOMContentLoaded['"]\s*,\s*verify/);
  assert.match(read('confirm.html'),/<meta name="referrer" content="no-referrer">/);
});
