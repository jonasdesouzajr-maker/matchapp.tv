const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const source=read('phone-auth.js');
const panel='<button id="phone-auth-entry" hidden><span></span></button>'+
  '<div id="phone-auth-panel" hidden><h4 id="phone-auth-title"></h4>'+
  '<p id="phone-auth-help"></p><div id="phone-auth-number-step">'+
  '<input id="phone-auth-number"><input id="phone-auth-name"><p id="phone-auth-name-help"></p>'+
  '<button id="phone-auth-send"></button><button id="phone-auth-have-code"></button></div>'+
  '<div id="phone-auth-code-step" hidden><p id="phone-auth-code-help"></p>'+
  '<input id="phone-auth-code"><button id="phone-auth-verify"></button>'+
  '<button id="phone-auth-resend"></button><button id="phone-auth-change"></button></div>'+
  '<p id="phone-auth-status" hidden></p></div>';
function setup(url='https://matchapp.tv/',opts={}){
  const dom=new JSDOM('<!doctype html><html lang="en"><body>'+panel+'</body></html>',{
    url,runScripts:'outside-only',virtualConsole:new VirtualConsole()
  });
  const w=dom.window,calls={sent:[],verified:[],validated:0,updated:[]};
  if(opts.pending)w.sessionStorage.setItem('matchapp_phone_verify_pending_v1',JSON.stringify(opts.pending));
  w.fetch=async()=>({ok:true,json:async()=>({external:{phone:opts.provider!==false}})});
  w.supabaseClient={supabaseUrl:'https://test.supabase.co',supabaseKey:'public-test-key',auth:{
    signInWithOtp:async payload=>{calls.sent.push(payload);return {error:opts.sendError||null};},
    verifyOtp:async payload=>{calls.verified.push(payload);return opts.badOtp?
      {error:{message:'OTP expired'}}:{data:{session:{access_token:'real-session',user:{id:'user-1'}}}};},
    getSession:async()=>({data:{session:{access_token:'real-session',user:{id:'user-1'}}}}),
    getUser:async()=>{calls.validated++;return {data:{user:{
      id:opts.wrongUser?'other-user':'user-1',
      phone:opts.wrongPhone?'+5511988877665':'+5521999999999',
      phone_confirmed_at:opts.unconfirmed?null:'2026-09-26T18:00:00Z',
      user_metadata:opts.existing?{full_name:'Existing Member'}:{}
    }}};},
    updateUser:async payload=>{calls.updated.push(payload);return {error:null};}
  }};
  w.eval(read('phone-auth-i18n.js'));
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return {dom,w,calls,byId:id=>w.document.getElementById(id)};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('real phone signup submits E.164 number, first-time name and SMS channel immediately',async()=>{
  const ctx=setup();await settle();
  ctx.byId('phone-auth-number').value='+55 (21) 99999-9999';
  ctx.byId('phone-auth-name').value='New Member';
  await ctx.w.MatchAppPhoneAuth.sendCode();
  assert.equal(ctx.calls.sent.length,1);
  assert.equal(ctx.calls.sent[0].phone,'+5521999999999');
  assert.equal(ctx.calls.sent[0].options.channel,'sms');
  assert.equal(ctx.calls.sent[0].options.shouldCreateUser,true);
  assert.equal(ctx.calls.sent[0].options.data.full_name,'New Member');
  assert.equal(ctx.byId('phone-auth-code-step').hidden,false);
  assert.match(ctx.byId('phone-auth-status').textContent,/sent/i);
  const saved=JSON.parse(ctx.w.sessionStorage.getItem('matchapp_phone_verify_pending_v1'));
  assert.equal(saved.phone,'+5521999999999');
  assert.ok(!('token' in saved),'never store SMS code with pending signup');
  ctx.dom.window.close();
});

test('SMS link opens verification step and accepts original code without sending another SMS',async()=>{
  const ctx=setup('https://matchapp.tv/?phoneVerify=1');await settle();
  assert.equal(ctx.byId('phone-auth-panel').hidden,false);
  assert.equal(ctx.w.location.search,'','link marker is cleaned after opening');
  ctx.byId('phone-auth-number').value='+55 21 99999 9999';
  ctx.byId('phone-auth-have-code').click();
  assert.equal(ctx.byId('phone-auth-code-step').hidden,false);
  assert.equal(ctx.calls.sent.length,0);
  ctx.byId('phone-auth-code').value='123456';
  let successes=0;
  ctx.w.document.addEventListener('matchapp:phoneauthsuccess',()=>successes++);
  await ctx.w.MatchAppPhoneAuth.verifyCode();
  assert.equal(ctx.calls.verified.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.calls.verified[0])),{phone:'+5521999999999',token:'123456',type:'sms'});
  assert.equal(ctx.calls.validated,1);
  assert.equal(successes,1);
  assert.match(ctx.byId('phone-auth-status').textContent,/verified/i);
  assert.match(source,/location\.assign\('\/profile\/profile\.html\?welcome=phone'\)/);
  ctx.dom.window.close();
});

test('verified new phone account passes supplied name into server Auth metadata',async()=>{
  const ctx=setup();await settle();
  ctx.byId('phone-auth-number').value='+5521999999999';
  ctx.byId('phone-auth-name').value='New Member';
  await ctx.w.MatchAppPhoneAuth.sendCode();
  ctx.byId('phone-auth-code').value='123456';
  await ctx.w.MatchAppPhoneAuth.verifyCode();
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.calls.updated)),[{data:{full_name:'New Member',name:'New Member'}}]);
  ctx.dom.window.close();
});

test('existing phone sign-in never overwrites existing name',async()=>{
  const ctx=setup(undefined,{existing:true});await settle();
  ctx.byId('phone-auth-number').value='+5521999999999';
  ctx.byId('phone-auth-name').value='Another Person';
  await ctx.w.MatchAppPhoneAuth.sendCode();
  ctx.byId('phone-auth-code').value='123456';
  await ctx.w.MatchAppPhoneAuth.verifyCode();
  assert.equal(ctx.calls.updated.length,0);
  ctx.dom.window.close();
});

test('wrong or unconfirmed server phone cannot unlock a profile',async()=>{
  for(const opts of [{wrongUser:true},{wrongPhone:true},{unconfirmed:true},{badOtp:true}]){
    const ctx=setup(undefined,opts);await settle();
    ctx.byId('phone-auth-number').value='+5521999999999';
    ctx.w.MatchAppPhoneAuth.useExistingCode();
    ctx.byId('phone-auth-code').value='123456';
    let successes=0;
    ctx.w.document.addEventListener('matchapp:phoneauthsuccess',()=>successes++);
    await ctx.w.MatchAppPhoneAuth.verifyCode();
    assert.equal(successes,0,'Must reject unauthorized session '+JSON.stringify(opts));
    assert.equal(ctx.byId('phone-auth-status').dataset.state,'error');
    ctx.dom.window.close();
  }
});

test('a linked SMS resumes a pending number without storing the OTP',async()=>{
  const ctx=setup('https://matchapp.tv/?phoneVerify=1',{pending:{
    phone:'+5521999999999',name:'Saved Name',at:Date.now()
  }});
  await settle();
  assert.equal(ctx.byId('phone-auth-number').value,'+5521999999999');
  assert.equal(ctx.byId('phone-auth-name').value,'Saved Name');
  assert.equal(ctx.byId('phone-auth-code-step').hidden,false);
  assert.equal(ctx.byId('phone-auth-code').value,'','No SMS code should be persisted');
  assert.equal(ctx.w.location.search,'');
  ctx.dom.window.close();
});

test('verified phone link opens existing profile only after server-validated phone',async()=>{
  const html=read('profile/profile.html');
  const code=html.match(/<script id="verified-email-profile-entry">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(code);
  async function visit(user){
    const dom=new JSDOM('<button data-profile-target="account-details"></button>'+
      '<article id="account-details" hidden><h3>My details</h3>'+
      '<input id="profile-name"></article>',{
      url:'https://matchapp.tv/profile/profile.html?welcome=phone',runScripts:'outside-only'
    });
    const w=dom.window;
    w.supabaseClient={auth:{getUser:async()=>({data:{user}})}};
    w.document.querySelector('button').addEventListener('click',()=>{
      w.document.getElementById('account-details').hidden=false;
    });
    w.eval(code);
    w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
    await settle();
    return {dom,w};
  }
  const valid=await visit({id:'test',phone:'+5521999999999',phone_confirmed_at:'2026-09-26',
    user_metadata:{full_name:'Validated Member'}});
  assert.equal(valid.w.document.getElementById('account-details').hidden,false);
  assert.equal(valid.w.document.getElementById('profile-name').value,'Validated Member');
  assert.match(valid.w.document.getElementById('verified-phone-welcome').textContent,/Phone verified/i);
  valid.dom.window.close();
  const forged=await visit({id:'test',phone:'+5521999999999',phone_confirmed_at:null});
  assert.equal(forged.w.document.getElementById('account-details').hidden,true);
  assert.equal(forged.w.document.getElementById('verified-phone-welcome'),null);
  forged.dom.window.close();
});

test('homepage loads versioned phone recovery UI but not in Kids',()=>{
  const home=read('index.html');
  assert.match(home,/id="phone-auth-name"/);
  assert.match(home,/id="phone-auth-have-code"/);
  assert.match(home,/phone-auth\.js\?v=20260926-phoneverify1/);
  assert.doesNotMatch(read('kids/index.html'),/phone-auth-name/);
});