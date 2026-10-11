const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path');const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const phoneJS=fs.readFileSync(path.join(root,'profile-phone-20261011.js'),'utf8');
const lib=require(path.join(root,'libphonenumber-max-1.12.25.js'));
const html=`<!doctype html><body>
<h3 id="pf-phone-title"></h3><p id="pf-phone-intro"></p><p id="pf-phone-signedout"></p>
<div id="pf-phone-entry" hidden><p id="pf-phone-current" hidden></p>
<span id="pf-phone-country-label"></span><select id="pf-phone-country"></select><span id="pf-phone-number-label"></span>
<input id="pf-phone-number" inputmode="numeric" type="tel" />
<button id="pf-phone-send"></button>
<div id="pf-phone-code-row" hidden><input id="pf-phone-code" /><button id="pf-phone-verify"></button><button id="pf-phone-resend"></button></div>
<input id="pf-sms-consent" type="checkbox" /><span id="pf-phone-sms-label"></span><p id="pf-phone-sms-help"></p></div>
<p id="pf-phone-status"></p></body>`;
const flush=()=>new Promise(r=>setTimeout(r,25));
test('phone profile links a verified number to existing Google account, requires consent',async()=>{
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://matchapp.tv/profile/'});
 const {window:w}=dom;w.libphonenumber=lib;w.MATCH_LANG='pt-BR';w.matchProfileState={country:'BR'};
 const user={id:'google-owner-1',email:'user@example.org',email_confirmed_at:'2026-10-01T00:00:00Z',phone:null,phone_confirmed_at:null};
 const calls={update:[],verify:[],rpc:[],consent:[]};
 const profileDb={
   select:()=>({eq:()=>({maybeSingle:async()=>({data:{sms_communications_opt_in:false},error:null})})}),
   update:x=>({eq:()=>({select:()=>({maybeSingle:async()=>{calls.consent.push(x);return {data:{id:user.id},error:null};}})})})
 };
 const client={auth:{
  getUser:async()=>({data:{user:{...user}},error:null}),
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  updateUser:async({phone})=>{calls.update.push(phone);return {error:null}},
  verifyOtp:async(args)=>{calls.verify.push(args);user.phone=args.phone;user.phone_confirmed_at='2026-10-11T00:00:00Z';return {data:{user:{...user}},error:null}},
  resend:async()=>({error:null})
 },rpc:async(name,args)=>{calls.rpc.push([name,args]);return {data:true,error:null}},from:()=>profileDb};
 w.supabaseClient=client;w.eval(phoneJS);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await flush();
 assert.equal(w.document.getElementById('pf-phone-entry').hidden,false);
 assert.equal(w.document.getElementById('pf-phone-country').value,'BR');
 const input=w.document.getElementById('pf-phone-number');input.value='21999998888';input.dispatchEvent(new w.Event('input'));w.document.getElementById('pf-phone-send').click();await flush();
 assert.deepEqual(calls.update,['+5521999998888']);
 assert.equal(w.document.getElementById('pf-phone-code-row').hidden,false);
 assert.equal(calls.rpc[0][0],'can_link_phone_for_profile');
 const code=w.document.getElementById('pf-phone-code');code.value='123456';w.document.getElementById('pf-phone-verify').click();await flush();
 assert.equal(calls.verify[0].type,'phone_change');
 assert.equal(calls.verify[0].phone,'+5521999998888');
 assert.equal(w.document.getElementById('pf-sms-consent').disabled,false);
 assert.equal(w.document.getElementById('pf-sms-consent').checked,false);
 w.document.getElementById('pf-sms-consent').checked=true;w.document.getElementById('pf-sms-consent').dispatchEvent(new w.Event('change'));await flush();
 assert.equal(calls.consent[0].sms_communications_opt_in,true);
 dom.window.close();
});
test('refuses to link if preflight rejects another account pending the number',async()=>{
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://matchapp.tv/profile/'});
 const {window:w}=dom;w.libphonenumber=lib;w.MATCH_LANG='en';
 const user={id:'user-1',email_confirmed_at:'2026-01-01',phone:null,phone_confirmed_at:null};
 let updateCount=0;
 w.supabaseClient={auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:()=>({}),updateUser:async()=>{updateCount++;return {error:null}}},
 rpc:async()=>({data:false,error:null}),from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{sms_communications_opt_in:false},error:null})})})})};
 w.eval(phoneJS);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await flush();
 const input=w.document.getElementById('pf-phone-number');input.value='4155552671';w.document.getElementById('pf-phone-country').value='US';input.dispatchEvent(new w.Event('input'));w.document.getElementById('pf-phone-send').click();await flush();
 assert.equal(updateCount,0);
 assert.equal(w.document.getElementById('pf-phone-code-row').hidden,true);
 dom.window.close();
});