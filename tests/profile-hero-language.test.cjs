'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../final-audit.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const names={
 en:'Private MatchApp Ai profile','pt-BR':'Perfil privado do MatchApp Ai',es:'Perfil privado de MatchApp Ai',fr:'Profil privé MatchApp Ai',
 de:'Privates MatchApp Ai Profil',it:'Profilo privato MatchApp Ai',tr:'Özel MatchApp Ai profili',ru:'Личный профиль MatchApp Ai',
 ar:'ملفك الشخصي الخاص في MatchApp Ai',hi:'आपकी निजी MatchApp Ai प्रोफ़ाइल',id:'Profil pribadi MatchApp Ai',
 ja:'MatchApp Ai の個人プロフィール',ko:'MatchApp Ai 개인 프로필',zh:'MatchApp Ai 私人资料'
};
const user={email:'qa@example.test',user_metadata:{full_name:'MatchApp QA'}};
function fixture(getUser){
 const dom=new JSDOM('<!doctype html><html lang="en"><body><div class="container"><section class="premium-card"><div class="identity-extras"></div><div class="core-identity-card"></div><button id="save-profile-btn">Save</button></section></div></body></html>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only'});
 const w=dom.window;let writes=0;
 w.localStorage.setItem('match_lang','pt-BR');
 w.localStorage.setItem('match_profile_locked','true');
 w.resolveUserAvatar=()=>'/qa-avatar.png';
 w.supabaseClient={auth:{getUser:getUser||(()=>Promise.resolve({data:{user}}))},from:()=>{writes++;throw Error('Presentation must not write account state');}};
 w.eval(source);
 return {dom,w,d:w.document,writes:()=>writes,close:()=>w.close()};
}
test('profile hero follows all14 selected languages while retaining account identity and lock state',async()=>{
 const h=fixture();
 try{
  await tick();await tick();
  for(const [lang,label]of Object.entries(names)){
   h.w.localStorage.setItem('match_lang',lang);
   h.d.dispatchEvent(new h.w.CustomEvent('matchapp:langchange',{detail:{lang}}));
   await tick();
   assert.equal(h.d.querySelector('.audit-profile-eyebrow').textContent,label);
   assert.equal(h.d.querySelector('#audit-profile-hero h1').textContent,'MatchApp QA');
   assert.equal(h.d.querySelector('#audit-profile-hero p').textContent,'qa@example.test');
   assert.equal(h.d.querySelector('#audit-profile-hero img').getAttribute('src'),'/qa-avatar.png');
   assert.equal(h.d.querySelector('#save-profile-btn').hidden,true);
   assert.equal(h.d.querySelector('.core-identity-card').classList.contains('is-locked'),true);
  }
  h.w.localStorage.setItem('match_lang','pt-BR');
  h.w.dispatchEvent(new h.w.StorageEvent('storage',{key:'match_lang'}));
  await tick();
  assert.match(h.d.querySelector('.audit-profile-badges').textContent,/Identidade protegida/);
  assert.match(h.d.querySelector('img').alt,/Seu avatar/);
  assert.equal(h.writes(),0);
 }finally{h.close();}
});
test('a delayed profile read paints the current choice instead of restoring English labels',async()=>{
 const pending=[],h=fixture(()=>new Promise(resolve=>pending.push(resolve)));
 try{
  h.w.localStorage.setItem('match_lang','en');
  await tick();
  h.w.localStorage.setItem('match_lang','ar');
  h.d.dispatchEvent(new h.w.CustomEvent('matchapp:langchange',{detail:{lang:'ar'}}));
  assert.ok(pending.length>=2);
  pending.at(-1)({data:{user}});await tick();
  pending[0]({data:{user}});await tick();
  assert.equal(h.d.querySelector('.audit-profile-eyebrow').textContent,names.ar);
  assert.equal(h.d.querySelector('#audit-profile-hero h1').textContent,'MatchApp QA');
  assert.equal(h.writes(),0);
 }finally{h.close();}
});
