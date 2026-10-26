'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('final-audit.js','utf8');
const hero=source.slice(source.indexOf('async function refreshProfileHero(){'),source.indexOf('\n  function loadProfileRegistrationUpgrade()'));
const profile=fs.readFileSync('profile.js','utf8');
const state=profile.slice(profile.indexOf('function checkAndRenderProfileState('),profile.indexOf('\nlet profileIdentityObserver'));
for(const status of ['signedout','loading','error','ready'])test('hero repaint respects '+status+' profile state',async()=>{
 const dom=new JSDOM('<div class="container"><article class="premium-card"><div id="editable-fields-section"><input></div><div id="locked-info-card"></div><p id="identity-load-status"></p><button id="identity-load-retry"></button><button id="save-profile-btn" hidden></button></article></div>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only'});
 const w=dom.window;
 try{
  w.matchProfileState={status};w.saveProfileData=()=>{};
  w.eval(state+';window.checkAndRenderProfileState=checkAndRenderProfileState;');
  const save=w.document.querySelector('#save-profile-btn');
  w.checkAndRenderProfileState();
  // A pending save belongs to the registration handler, including its draft.
  if(status==='ready'){save.disabled=true;w.document.querySelector('input').value='Unsaved draft';}
  w.eval('const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],esc=s=>s,icon=()=>"",profileLabels=()=>({});'+hero+';window.paintHero=refreshProfileHero;');
  await w.paintHero();await w.paintHero();
  assert.equal(save.hidden,status!=='ready');assert.equal(save.disabled,true);
  if(status==='ready')assert.equal(w.document.querySelector('input').value,'Unsaved draft');
 }finally{w.close();}
});
test('App Links bind both the recorded Play certificate and the installed Play build',()=>{
 const live=JSON.parse(fs.readFileSync('.well-known/assetlinks.json'));
 assert.deepEqual(live,JSON.parse(fs.readFileSync('android-studio/play/assetlinks.json')));
 const fingerprints=live[0].target.sha256_cert_fingerprints;
 assert.ok(fingerprints.includes('66:EB:B2:FF:31:C6:57:42:FB:D9:9E:0D:89:0A:B2:F1:56:E4:DA:5C:19:1A:AF:67:5A:DA:4E:D5:FF:EE:74:B8'));
 assert.ok(fingerprints.includes('12:E6:EE:F1:E7:B6:3D:04:96:3B:FD:A7:8B:55:8D:CE:CD:93:10:72:38:6C:9E:92:70:EE:AC:5E:90:53:87:80'));
});
