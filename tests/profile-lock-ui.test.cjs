const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),extract=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a))),tick=()=>new Promise(r=>setTimeout(r,20));
function boot(result){const d=new JSDOM('<p id="identity-load-status"></p><button id="identity-load-retry"></button><div id="editable-fields-section"><input id="profile-name" value="Typed name"><input id="profile-country"><input id="profile-dob"><select id="profile-starsign"></select></div><div id="locked-info-card"><span id="lock-val-name"></span></div><button id="save-profile-btn"></button>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only'}),w=d.window;
 w.supabaseClient={auth:{getSession:async()=>({data:{session:{user:{id:'u'}}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:result})})})};
 w.eval('var supabaseClient=window.supabaseClient,seenList=[],savedList=[],dislikedList=[],userRatings={},titleNotes={},recentTitles=[];var SESSION_SHOWN=new Set();var STAR_SIGN_TRAITS={};function formatSign(v){return v}function populateEmail(){}function promptProfileCompletion(){}');
 w.eval(extract(read('app.js'),'const REQUIRED_PROFILE_FIELDS =','// Non-blocking nudge'));
 w.eval(extract(read('profile.js'),'function checkAndRenderProfileState()','window.handleAvatar ='));
 return {d,w};}
test('a fresh sign-in keeps identity fields closed until the saved server lock has loaded',async()=>{
 let release;const {d,w}=boot(()=>new Promise(r=>release=r));const loading=w.hydrateProfileFromAuth({id:'u',user_metadata:{}});await tick();assert.equal(w.document.getElementById('editable-fields-section').style.display,'none');assert(w.document.getElementById('save-profile-btn').disabled);
 release({data:{profile_locked:true,full_name:'Saved name',country:'Brazil',dob:'10/09/1990',star_sign:'Virgo',age:36}});await loading;assert.equal(w.matchProfileState.status,'ready');assert.equal(w.document.getElementById('locked-info-card').style.display,'block');assert.equal(w.document.getElementById('lock-val-name').innerText,'Saved name');assert.equal(w.document.getElementById('editable-fields-section').style.display,'none');assert(w.document.getElementById('save-profile-btn').disabled);d.window.close();
});
test('failed server reads show retry instead of an empty unlocked identity form',async()=>{
 const {d,w}=boot(async()=>({error:{message:'offline'}}));await w.hydrateProfileFromAuth({id:'u',user_metadata:{}});assert.equal(w.matchProfileState.status,'error');assert.equal(w.document.getElementById('editable-fields-section').style.display,'none');assert.equal(w.document.getElementById('identity-load-retry').hidden,false);assert.equal(w.document.getElementById('profile-name').value,'Typed name');d.window.close();
});
test('slow history synchronization cannot hold the saved identity lock hostage',async()=>{
 const {d,w}=boot(async()=>({data:{profile_locked:true,full_name:'Saved name'}}));w.matchPolicy={attach:()=>new Promise(()=>{})};await w.hydrateProfileFromAuth({id:'u',user_metadata:{}});assert.equal(w.matchProfileState.status,'ready');assert.equal(w.localStorage.getItem('match_profile_locked'),'true');d.window.close();
});


test('profile photo stays circular with gold outlines and Profile reuses the Home poster backdrop',()=>{
 const html=read('profile/profile.html'),wall=read('poster-wall.css'),audit=read('final-audit.css');
 assert.match(html,/<body class="page-profile">/);
 assert.match(html,/#profile-pic-preview \{[\s\S]*border:3px solid var\(--gold\)!important[\s\S]*clip-path:circle\(50% at 50% 50%\)!important[\s\S]*background:transparent!important/);
 assert.match(audit,/\.audit-profile-avatar\{[\s\S]*border:3px solid var\(--audit-gold\)[\s\S]*background:transparent!important/);
 assert.match(audit,/\.audit-profile-avatar img\{[\s\S]*border-radius:50%[\s\S]*clip-path:circle\(50% at 50% 50%\)/);
 assert.match(wall,/body:is\(\.page-home,\.page-profile\) \.poster-wall/);
 assert.match(wall,/body:is\(\.page-home,\.page-profile\) \.poster-wall \.poster-wall-grid/);
 assert.match(wall,/body:is\(\.page-home,\.page-profile\) \.poster-wall::after/);
});
