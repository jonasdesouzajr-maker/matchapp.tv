'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..'),source=fs.readFileSync(path.join(ROOT,'avatars.js'),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function user(id='owner-a',provider='google',url='https://lh3.googleusercontent.com/a/real-account-photo'){
 return {id,app_metadata:{provider},user_metadata:{avatar_url:'data:image/svg+xml,legacy-custom'},identities:[{id:provider+'-identity',user_id:id,provider,identity_data:{avatar_url:url}}]};
}
function fixture(auth){
 const w=new JSDOM('<!doctype html><html><body><a id="profile-link-tab" class="nav-avatar-link" href="/profile/profile.html"><span class="avatar-ring" data-avatar-slot><img id="photo"><span class="avatar-empty">AB</span><i class="avatar-online-dot"></i></span></a><div class="audit-profile-avatar" data-avatar-slot><img><span class="avatar-empty">Generic icon</span></div><div id="ma-jonas-home"><img id="jonas-face" src="/jonas-owner-face.jpg"></div></body></html>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only',pretendToBeVisual:true}).window;
 Object.defineProperty(w.document,'readyState',{value:'complete',configurable:true});
 const calls={writes:0};
 if(auth)w.supabaseClient={auth:{...auth,updateUser(){calls.writes++;throw Error('Photo display must not write Auth');}},from(){calls.writes++;throw Error('Photo display must not write profiles');},storage:{from(){calls.writes++;throw Error('Photo display must not upload');}}};
 w.eval(source);
 return {w,api:w.MatchAppAccountPhoto,calls,slot:()=>w.document.querySelector('[data-avatar-slot]'),image:()=>w.document.getElementById('photo'),link:()=>w.document.getElementById('profile-link-tab'),close:()=>w.close()};
}

test('only owned linked provider identity photos resolve, with deterministic provider preference',()=>{
 const f=fixture();try{
  const a=user(),github={id:'github-id',user_id:a.id,provider:'github',identity_data:{picture:'https://avatars.githubusercontent.com/u/123'}};
  assert.equal(f.api.fromUser(a),a.identities[0].identity_data.avatar_url);
  a.identities.push(github);a.app_metadata.provider='github';assert.equal(f.api.fromUser(a),github.identity_data.picture);
  a.app_metadata.provider='email';const expected=f.api.fromUser(a);a.identities.reverse();assert.equal(f.api.fromUser(a),expected,'linked identity order does not change selection');
  const linked={...user(),app_metadata:{provider:'email'},identities:[{provider:'email',user_id:'owner-a',identity_data:{avatar_url:'https://example.test/custom'}},github]};
  assert.equal(f.api.fromUser(linked),github.identity_data.picture);
  const mismatched=user();mismatched.identities[0].user_id='different-owner';assert.equal(f.api.fromUser(mismatched),null);
  mismatched.identities[0].user_id='';assert.equal(f.api.fromUser(mismatched),null,'an explicitly invalid owner cannot become an unowned identity');
  assert.equal(f.api.fromUser({...user(),is_anonymous:true}),null);assert.equal(f.api.fromUser(null),null);
 }finally{f.close();}
});

test('legacy uploads, generated SVGs, presets, metadata and unsafe URLs never become account photos',()=>{
 const f=fixture();try{
  for(const [key,value]of Object.entries({match_custom_avatar:'data:image/jpeg;base64,old',match_avatar_svg:'<svg>Old custom</svg>',match_preset_avatar:'clapper',match_user_avatar:'https://example.test/legacy-profile-row',match_avatar_character_v3:'{"skin":1}'}))f.w.localStorage.setItem(key,value);
  const before=JSON.stringify({...f.w.localStorage});
  for(const candidate of [undefined,'','data:image/svg+xml,<svg/>','blob:https://matchapp.tv/old','http://example.test/photo','javascript:alert(1)','/local-photo.jpg','https://user:secret@example.test/photo']){
   const candidateUser=user();candidateUser.identities[0].identity_data.avatar_url=candidate;
   assert.equal(f.api.fromUser(candidateUser),null,String(candidate));
  }
  for(const provider of ['email','phone'])assert.equal(f.api.fromUser(user('owner-a',provider,'https://example.test/metadata-photo')),null);
  f.api.setUser({id:'owner-a',user_metadata:{avatar_url:'https://example.test/custom-upload'},identities:[]});
  f.w.renderUserAvatar();assert.equal(f.w.resolveUserAvatar(),null);assert.equal(f.link().hidden,true);assert.equal(f.image().hasAttribute('src'),false);
  assert.equal(JSON.stringify({...f.w.localStorage}),before,'old records stay untouched and are simply ignored');
  assert.equal(f.w.avatarSVG,undefined);assert.equal(f.w.AVATAR_PRESETS,undefined);
 }finally{f.close();}
});

test('real account images appear only after load, and missing or failed images remove the whole circle',()=>{
 const f=fixture();try{
  assert.equal(f.link().hidden,true);assert.equal(f.slot().hidden,true);
  f.api.setUser(user());assert.equal(f.link().hidden,true,'no empty frame while loading');assert.equal(f.image().getAttribute('src'),f.api.fromUser(user()));
  f.image().onload();assert.equal(f.link().hidden,false);assert.equal(f.slot().hidden,false);assert.equal(f.image().hidden,false);
  assert.ok([...f.w.document.querySelectorAll('.avatar-empty,.avatar-online-dot')].every(node=>node.hidden));
  f.image().onerror();assert.equal(f.link().hidden,true);assert.equal(f.slot().hidden,true);assert.equal(f.w.resolveUserAvatar(),null);assert.equal(f.image().hasAttribute('src'),false);
  f.w.renderUserAvatar();assert.equal(f.link().style.getPropertyValue('display'),'none');assert.equal(f.link().style.getPropertyPriority('display'),'important');
  f.api.setUser({id:'owner-b',identities:[]});assert.equal(f.link().hidden,true);
  assert.equal(f.w.document.getElementById('jonas-face').getAttribute('src'),'/jonas-owner-face.jpg','Jonas is separate from the user photo');
 }finally{f.close();}
});

test('a delayed prior image cannot reappear after logout or a different account signs in',()=>{
 const f=fixture();try{
  f.api.setUser(user());const previousLoad=f.image().onload;
  const b=user('owner-b','github','https://avatars.githubusercontent.com/u/456');f.api.setUser(b);
  previousLoad();assert.equal(f.link().hidden,true);assert.equal(f.image().getAttribute('src'),f.api.fromUser(b));
  f.image().onload();assert.equal(f.link().hidden,false);
  const lateLoad=f.image().onload;f.api.clear();lateLoad();assert.equal(f.link().hidden,true);assert.equal(f.w.resolveUserAvatar(),null);
 }finally{f.close();}
});

test('startup verifies the Auth user, with no API writes or stale pending-session resurrection',async()=>{
 const requests=[],f=fixture({getUser:()=>new Promise(resolve=>requests.push(resolve))});try{
  await Promise.resolve();assert.equal(requests.length,1);assert.equal(f.link().hidden,true);
  f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:authchange',{detail:{signedIn:false}}));
  requests[0]({data:{user:user()}});await tick();assert.equal(f.w.resolveUserAvatar(),null);assert.equal(f.link().hidden,true);
  const first=f.api.refresh();await Promise.resolve();const oldRequest=requests[1];
  f.api.clear();const second=f.api.refresh();await Promise.resolve();
  requests[2]({data:{user:user('owner-b','github','https://avatars.githubusercontent.com/u/456')}});await second;
  oldRequest({data:{user:user()}});await first;
  assert.equal(f.w.resolveUserAvatar(),'https://avatars.githubusercontent.com/u/456');
  assert.equal(f.calls.writes,0);
 }finally{f.close();}
});

test('late-mounted profile slots share only the verified current account photo and sign-out clears them',async()=>{
 const f=fixture();try{
  f.api.setUser(user());
  const late=f.w.document.createElement('div');late.setAttribute('data-avatar-slot','');late.className='new-photo-slot';f.w.document.body.appendChild(late);await tick();
  assert.equal(late.hidden,true);assert.equal(late.querySelector('img').getAttribute('src'),f.api.fromUser(user()));
  late.querySelector('img').onload();assert.equal(late.hidden,false);
  f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:authchange',{detail:{signedIn:false}}));
  assert.equal(late.hidden,true);assert.equal(late.querySelector('img').hasAttribute('src'),false);
 }finally{f.close();}
});

test('profile no longer ships an editor, chooser, upload handler, studio deep link or generator assets',()=>{
 const profile=fs.readFileSync(path.join(ROOT,'profile/profile.html'),'utf8'),controller=fs.readFileSync(path.join(ROOT,'profile.js'),'utf8');
 assert.doesNotMatch(profile,/avatar-builder\.js|avatar-studio\.css|id="avatar-studio"|avatar-studio-deeplink|avatar-preview-button|avatar-maker-dialog|onchange="handleAvatar/);
 assert.doesNotMatch(controller,/window\.(?:handleAvatar|choosePresetAvatar|clearPresetAvatar)|function renderAvatarPicker|match_custom_avatar|match_preset_avatar/);
 const home=new JSDOM(fs.readFileSync(path.join(ROOT,'index.html'),'utf8')).window;
 try{assert.equal(home.document.querySelector('#profile-link-tab').getAttribute('href'),'/profile/profile.html');assert.equal(home.document.querySelector('#profile-link-tab .avatar-empty'),null);}finally{home.close();}
 assert.equal(fs.existsSync(path.join(ROOT,'avatar-builder.js')),false);assert.equal(fs.existsSync(path.join(ROOT,'avatar-studio.css')),false);
 assert.ok(fs.existsSync(path.join(ROOT,'jonas/android-avatar/runtime.js')),'native Jonas avatar remains intact');
 const hero=fs.readFileSync(path.join(ROOT,'final-audit.js'),'utf8').split('async function refreshProfileHero(){')[1].split('function organizeProfileIcons')[0];
 assert.doesNotMatch(hero,/avatar-empty|icon\('user'\)/);assert.match(hero,/data-avatar-slot hidden/);
});
