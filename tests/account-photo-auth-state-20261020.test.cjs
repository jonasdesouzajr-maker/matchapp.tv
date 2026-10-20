'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../matchapp-ia.js'),'utf8');
const sync=source.slice(source.indexOf('function syncHeaderAuth(){'),source.indexOf('function ensureBrandMeta(){'));
for(const signed of [true,false])test('header account controls follow Auth when the provider photo is '+(signed?'absent':'visible'),()=>{
 const dom=new JSDOM('<body><a id="profile-link-tab"></a><button id="nav-reg-btn">Sign in</button><button id="nav-logout-btn">Logout</button></body>',{runScripts:'outside-only'});const w=dom.window;
 try{
  w.isUserLoggedIn=signed;w.document.getElementById('profile-link-tab').style.display=signed?'none':'inline-flex';
  w.eval('function qs(s){return document.querySelector(s)}\n'+sync+'\nsyncHeaderAuth();');
  assert.equal(w.document.body.classList.contains('ma-signed-in'),signed);
  assert.equal(w.document.body.classList.contains('ma-guest'),!signed);
  assert.equal(w.document.getElementById('nav-logout-btn').hidden,!signed);
  assert.equal(w.document.getElementById('nav-reg-btn').hidden,signed);
  assert.equal(w.document.getElementById('profile-link-tab').style.display,signed?'none':'inline-flex','auth decoration does not create or show a photo');
 }finally{w.close()}
});
