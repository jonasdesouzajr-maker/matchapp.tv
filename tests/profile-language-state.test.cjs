'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const repo=path.resolve(__dirname,'..');
const base=process.env.MATCH_PROFILE_TEST_BASE||repo;
const read=name=>fs.readFileSync(fs.existsSync(path.join(repo,name))?path.join(repo,name):path.join(base,name),'utf8');
const source=read('profile.js').replace(/\r\n/g,'\n');
const start=source.indexOf('function checkAndRenderProfileState(');
const end=source.indexOf('\nwindow.checkAndRenderProfileState = checkAndRenderProfileState;',start);
assert.ok(start>=0&&end>start,'actual profile-state function is present');
const actual=source.slice(start,end);
const ageHelpers=source.slice(source.indexOf('function calculateAgeFromDOB('),source.indexOf('function renderProfileAgeLabel('));
const listener=source.match(/^document\.addEventListener\('matchapp:langchange',checkAndRenderProfileState\);$/m)?.[0];
assert.ok(listener,'actual language event binding is present');
function fixture({status='ready',locked=false,lang='en'}={}){
 const calls={saved:0,pending:0,email:0,alerts:[],writes:[],requests:[]},errors=[];
 const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error));
 const dom=new JSDOM('<!doctype html><html><body>'+
  '<p id="identity-load-status" hidden></p><button id="identity-load-retry" hidden></button>'+
  '<section id="editable-fields-section">'+
  '<input id="profile-name" type="text"><select id="profile-country"><option value=""></option><option value="Brazil">Brazil</option><option value="Japan">Japan</option></select>'+
  '<input id="profile-dob" type="text"><select id="profile-starsign"><option value=""></option><option value="Aries">Aries</option><option value="Libra">Libra</option></select>'+
  '<select id="profile-region"><option value="SP">SP</option><option value="13">13</option></select>'+
  '<input id="profile-preference" type="checkbox"><input id="profile-consent" type="checkbox">'+
  '</section><section id="locked-info-card" style="display:none">'+
  ['name','country','region','dob','sign','age','sign-trait'].map(name=>'<span id="lock-val-'+name+'"></span>').join('')+
  '</section><button id="save-profile-btn" hidden></button><p id="profile-instructions-text"></p>'+
  '</body></html>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 const w=dom.window;
 const RealDate=w.Date,fixedTime=Date.parse('2026-10-18T12:00:00Z');
 w.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[fixedTime]));}static now(){return fixedTime;}};
 const saved={match_lang:lang,match_profile_locked:String(locked),match_user_name:'Saved person',match_user_country:'Brazil',match_user_dob:'01/01/1984',match_user_sign:'Aries',match_user_region:'SP',match_user_age:'42',match_owned_wallet_test:JSON.stringify({match:10,ask:10})};
 for(const [key,value]of Object.entries(saved))w.localStorage.setItem(key,value);
 const rawSet=w.Storage.prototype.setItem;
 w.Storage.prototype.setItem=function(key,value){calls.writes.push({key,value:String(value)});return rawSet.call(this,key,value);};
 w.matchProfileState={status,userId:'synthetic-profile-user'};
 w.saveProfileData=()=>{calls.saved++;};
 w.t=key=>w.localStorage.getItem('match_lang')+':'+key;
 w.formatSign=value=>'sign:'+value;w.STAR_SIGN_TRAITS={Aries:'Saved canonical trait'};
 w.populateEmail=()=>{calls.email++;};w.alert=value=>calls.alerts.push(value);
 w.fetch=async url=>{calls.requests.push(url);throw new Error('Live requests are forbidden in this fixture');};
 w.eval(ageHelpers+'\n'+actual+'\nwindow.checkAndRenderProfileState=checkAndRenderProfileState;\n'+listener);
 const select=language=>{rawSet.call(w.localStorage,'match_lang',language);w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange'));};
 const snapshot=()=>Object.fromEntries(Object.keys(w.localStorage).filter(key=>key!=='match_lang').map(key=>[key,w.localStorage.getItem(key)]));
 return {dom,w,calls,errors,select,snapshot};
}
const inputSnapshot=w=>[...w.document.querySelectorAll('#editable-fields-section input,#editable-fields-section select')].map(input=>({
 node:input,id:input.id,value:input.value,checked:input.checked,disabled:input.disabled,readOnly:input.readOnly
}));
function enterDraft(w){
 w.document.getElementById('profile-name').value='Unsaved identity draft';
 w.document.getElementById('profile-country').value='Japan';
 w.document.getElementById('profile-dob').value='02/03/1993';
 w.document.getElementById('profile-starsign').value='Libra';
 w.document.getElementById('profile-region').value='13';
 w.document.getElementById('profile-region').disabled=true;
 w.document.getElementById('profile-preference').checked=true;
 w.document.getElementById('profile-preference').disabled=true;
 w.document.getElementById('profile-consent').checked=true;
 w.document.getElementById('profile-country').disabled=true;
 w.document.getElementById('profile-dob').readOnly=true;
}

test('ready unlocked language repaint preserves unsaved identity, pending save handler, disabled states, focus and caret',t=>{
 const f=fixture();t.after(()=>f.dom.window.close());const {w}=f;
 w.checkAndRenderProfileState();enterDraft(w);
 const name=w.document.getElementById('profile-name'),save=w.document.getElementById('save-profile-btn');
 const pendingHandler=()=>{f.calls.pending++;};save.onclick=pendingHandler;save.disabled=true;
 name.focus();name.setSelectionRange(3,12,'backward');
 const inputs=inputSnapshot(w),state=f.snapshot(),handler=save.onclick;
 const section=w.document.getElementById('editable-fields-section'),card=w.document.getElementById('locked-info-card');
 for(const lang of ['pt-BR','ar','ja']){
  f.select(lang);
  assert.deepEqual(inputSnapshot(w),inputs);
  assert.equal(w.document.activeElement,name);
  assert.equal(name.selectionStart,3);assert.equal(name.selectionEnd,12);assert.equal(name.selectionDirection,'backward');
  assert.equal(save.disabled,true);assert.equal(save.onclick,handler);
  assert.equal(save.innerText,lang+':profile.saveIdentity');
  assert.equal(save.getAttribute('data-i18n'),'profile.saveIdentity');
  assert.equal(w.document.getElementById('editable-fields-section'),section);
  assert.equal(w.document.getElementById('locked-info-card'),card);
  assert.equal(section.style.display,'');assert.equal(card.style.display,'none');
  assert.equal(w.document.getElementById('identity-load-status').hidden,true);
 }
 assert.deepEqual(f.snapshot(),state);assert.deepEqual(f.calls.writes,[]);
 assert.equal(f.calls.saved,0);assert.equal(f.calls.pending,0);assert.equal(f.calls.email,0);
 assert.deepEqual(f.calls.requests,[]);assert.deepEqual(f.errors,[]);
});

test('ordinary calls and non-language hydration still restore saved values and the original editable save behavior',t=>{
 for(const event of [undefined,{type:'matchapp:profilehydrated'}]){
  const f=fixture({lang:'pt-BR'});t.after(()=>f.dom.window.close());const {w}=f;
  enterDraft(w);const save=w.document.getElementById('save-profile-btn');
  save.disabled=true;save.onclick=()=>{f.calls.pending++;};
  for(const input of w.document.querySelectorAll('#editable-fields-section input,#editable-fields-section select'))input.disabled=true;
  const before=f.snapshot();w.checkAndRenderProfileState(event);
  assert.equal(w.document.getElementById('profile-name').value,'Saved person');
  assert.equal(w.document.getElementById('profile-country').value,'Brazil');
  assert.equal(w.document.getElementById('profile-dob').value,'01/01/1984');
  assert.equal(w.document.getElementById('profile-starsign').value,'Aries');
  assert.equal(w.document.getElementById('profile-region').value,'13');
  assert.equal(w.document.getElementById('profile-preference').checked,true);
  assert.equal(w.document.getElementById('profile-consent').checked,true);
  assert.equal(w.document.getElementById('profile-dob').readOnly,true);
  for(const input of w.document.querySelectorAll('#editable-fields-section input,#editable-fields-section select'))assert.equal(input.disabled,false,input.id);
  assert.equal(save.disabled,false);assert.equal(save.hidden,false);assert.equal(save.onclick,w.saveProfileData);
  assert.equal(save.innerText,'pt-BR:profile.saveIdentity');
  assert.equal(w.document.getElementById('editable-fields-section').style.display,'');
  assert.equal(w.document.getElementById('locked-info-card').style.display,'none');
  assert.deepEqual(f.snapshot(),before);assert.deepEqual(f.calls.writes,[]);assert.deepEqual(f.calls.requests,[]);
  assert.equal(f.calls.saved,0);assert.equal(f.calls.pending,0);assert.deepEqual(f.errors,[]);
 }
});

test('language changes still enforce loading, error and signed-out gates before any editable hydration',t=>{
 const expected={
  loading:'Carregando sua identidade salva…',
  error:'Não foi possível verificar sua identidade. Seus dados continuam protegidos. Tente novamente.',
  signedout:'Entre na sua conta para recuperar sua identidade salva.'
 };
 for(const status of ['loading','error','signedout']){
  const f=fixture({status});t.after(()=>f.dom.window.close());const {w}=f;
  enterDraft(w);const save=w.document.getElementById('save-profile-btn');
  save.hidden=false;save.disabled=false;
  const before=f.snapshot();f.select('pt-BR');
  for(const input of w.document.querySelectorAll('#editable-fields-section input,#editable-fields-section select'))assert.equal(input.disabled,true,status+'/'+input.id);
  assert.equal(w.document.getElementById('editable-fields-section').style.display,'none');
  assert.equal(w.document.getElementById('locked-info-card').style.display,'none');
  assert.equal(save.disabled,true);assert.equal(save.hidden,true);
  assert.equal(w.document.getElementById('profile-name').value,'Unsaved identity draft');
  assert.equal(w.document.getElementById('profile-country').value,'Japan');
  const notice=w.document.getElementById('identity-load-status'),retry=w.document.getElementById('identity-load-retry');
  assert.equal(notice.hidden,false);assert.equal(notice.textContent,expected[status]);
  assert.equal(retry.hidden,status==='loading');assert.equal(retry.textContent,status==='signedout'?'Entrar':'Tentar novamente');
  assert.deepEqual(f.snapshot(),before);assert.deepEqual(f.calls.writes,[]);assert.deepEqual(f.calls.requests,[]);
  assert.equal(f.calls.saved,0);assert.equal(f.calls.email,0);assert.deepEqual(f.errors,[]);
 }
});

test('ready locked language repaint preserves the permanent lock and paints saved canonical identity',t=>{
 const f=fixture({locked:true});t.after(()=>f.dom.window.close());const {w}=f;
 enterDraft(w);const save=w.document.getElementById('save-profile-btn');
 save.disabled=false;save.onclick=w.saveProfileData;
 const before=f.snapshot();f.select('pt-BR');
 assert.equal(w.document.getElementById('editable-fields-section').style.display,'none');
 assert.equal(w.document.getElementById('locked-info-card').style.display,'block');
 assert.equal(w.document.getElementById('lock-val-name').innerText,'Saved person');
 assert.equal(w.document.getElementById('lock-val-country').innerText,'Brazil');
 assert.equal(w.document.getElementById('lock-val-region').innerText,'SP');
 assert.equal(w.document.getElementById('lock-val-dob').innerText,'01/01/1984');
 assert.equal(w.document.getElementById('lock-val-sign').innerText,'sign:Aries');
 assert.equal(w.document.getElementById('lock-val-age').innerText,'42 years old');
 assert.equal(w.document.getElementById('lock-val-sign-trait').innerText,'Saved canonical trait');
 assert.equal(save.disabled,true);assert.equal(save.hidden,false);assert.notEqual(save.onclick,w.saveProfileData);
 assert.equal(save.getAttribute('data-i18n'),'identity.locked');
 assert.equal(save.innerText,'pt-BR:identity.locked');
 assert.equal(w.document.getElementById('avatar-change-badge'),null,'retired avatar-edit badge stays absent');
 assert.doesNotMatch(actual,/identity\.avatarEditable|handleAvatar|renderAvatarPicker|choosePresetAvatar/,'identity repaint has no avatar editor label or handler');
 assert.doesNotMatch(read('profile/profile.html'),/id=["'](?:avatar-change-badge|avatar-studio|profile-pic-preview)["']|avatar-builder\.js|avatar-studio\.css/,'actual Profile has no avatar chooser entry point');
 save.click();assert.equal(f.calls.saved,0);assert.equal(f.calls.email,1);
 assert.deepEqual(f.snapshot(),before);assert.deepEqual(f.calls.writes,[]);assert.deepEqual(f.calls.requests,[]);assert.deepEqual(f.errors,[]);
});

test('the real details helper localizes every identity state and locked age while preserving gates and canonical data',t=>{
 const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
 const noticeKeys={loading:'identityLoading',error:'identityUnavailable',signedout:'identitySignIn'};
 const helper=read('profile-details-i18n.js');
 for(const locked of [false,true])for(const status of Object.keys(noticeKeys)){
  const f=fixture({status,locked});t.after(()=>f.dom.window.close());const {w}=f,d=w.document;
  w.MATCH_LANG='en';d.documentElement.lang='en';w.eval(helper);
  const ui=w.MatchProfileDetailsI18n;assert.ok(ui,'actual profile details helper loaded');
  enterDraft(w);
  const save=d.getElementById('save-profile-btn'),notice=d.getElementById('identity-load-status'),retry=d.getElementById('identity-load-retry');
  const section=d.getElementById('editable-fields-section'),card=d.getElementById('locked-info-card');
  const handler=()=>{f.calls.pending++;};save.onclick=handler;save.hidden=false;save.disabled=false;
  d.getElementById('profile-consent').required=true;
  const required=[...section.querySelectorAll('input,select')].map(node=>[node,node.required]);
  const expectedInputs=inputSnapshot(w).map(input=>({...input,disabled:true}));
  const stored=f.snapshot(),profileState=w.matchProfileState;
  for(const lang of languages){
   f.select(lang);
   assert.equal(ui.language(),lang);assert.ok(ui.text(noticeKeys[status]),lang+'/'+status);
   assert.equal(d.getElementById('identity-load-status'),notice);assert.equal(d.getElementById('identity-load-retry'),retry);
   assert.equal(notice.hidden,false);assert.equal(notice.textContent,ui.text(noticeKeys[status]),lang+'/'+status);
   assert.equal(retry.hidden,status==='loading');
   assert.equal(retry.textContent,ui.text(status==='signedout'?'identityEnter':'identityRetry'),lang+'/'+status+'/retry');
   assert.equal(d.getElementById('editable-fields-section'),section);assert.equal(section.style.display,'none');
   assert.equal(d.getElementById('locked-info-card'),card);assert.equal(card.style.display,'none');
   assert.equal(save.hidden,true);assert.equal(save.disabled,true);assert.equal(save.onclick,handler);
   assert.deepEqual(inputSnapshot(w),expectedInputs);required.forEach(([node,value])=>assert.equal(node.required,value));
   assert.equal(w.matchProfileState,profileState);assert.equal(w.matchProfileState.status,status);
   assert.equal(w.localStorage.getItem('match_profile_locked'),String(locked));assert.deepEqual(f.snapshot(),stored);
  }
  assert.deepEqual(f.calls.writes,[]);assert.deepEqual(f.calls.requests,[]);assert.deepEqual(f.errors,[]);
  assert.equal(f.calls.saved,0);assert.equal(f.calls.pending,0);assert.equal(f.calls.email,0);assert.deepEqual(f.calls.alerts,[]);
 }
 const f=fixture({status:'ready',locked:true});t.after(()=>f.dom.window.close());const {w}=f,d=w.document;
 w.MATCH_LANG='en';d.documentElement.lang='en';w.eval(helper);enterDraft(w);
 const ui=w.MatchProfileDetailsI18n,stored=f.snapshot(),expectedInputs=inputSnapshot(w).map(input=>({...input,disabled:true}));
 const save=d.getElementById('save-profile-btn'),age=d.getElementById('lock-val-age'),help=d.getElementById('profile-instructions-text');
 const canonical={name:'Saved person',country:'Brazil',region:'SP',dob:'01/01/1984',sign:'sign:Aries','sign-trait':'Saved canonical trait'};
 const canonicalNodes=Object.fromEntries(Object.keys(canonical).map(key=>[key,d.getElementById('lock-val-'+key)]));
 for(const lang of languages){
  f.select(lang);
  assert.equal(d.getElementById('editable-fields-section').style.display,'none');assert.equal(d.getElementById('locked-info-card').style.display,'block');
  assert.equal(save.disabled,true);assert.equal(save.hidden,false);assert.equal(save.getAttribute('data-i18n'),'identity.locked');
  assert.equal(d.getElementById('lock-val-age'),age);assert.equal(age.innerText,ui.text('ageValue',{age:'42'}));
  assert.ok(ui.text('identityLockedHelp'));assert.equal(help.innerText||help.textContent,ui.text('identityLockedHelp'));
  for(const [key,value]of Object.entries(canonical)){
   assert.equal(d.getElementById('lock-val-'+key),canonicalNodes[key]);assert.equal(canonicalNodes[key].innerText,value);
  }
  assert.deepEqual(inputSnapshot(w),expectedInputs);assert.equal(w.localStorage.getItem('match_profile_locked'),'true');
  const alertCount=f.calls.alerts.length;save.click();assert.equal(f.calls.alerts.length,alertCount,'native disabled save remains inert');
  // Invoke only the synthetic informational handler to verify its current-language copy.
  assert.equal(typeof save.onclick,'function');save.onclick.call(save,new w.MouseEvent('click'));
  assert.ok(ui.text('identityLockedAlert'));assert.equal(f.calls.alerts.at(-1),ui.text('identityLockedAlert'));
  assert.deepEqual(f.snapshot(),stored);
 }
 assert.equal(f.calls.email,languages.length);assert.equal(f.calls.alerts.length,languages.length);
 assert.equal(f.calls.saved,0);assert.equal(f.calls.pending,0);assert.deepEqual(f.calls.writes,[]);assert.deepEqual(f.calls.requests,[]);assert.deepEqual(f.errors,[]);
});

test('the real age DOMContentLoaded and input runtime repaints saved and calculated ages without resetting drafts or invalid-date behavior',async t=>{
 const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
 const ageStart=source.indexOf('function calculateAgeFromDOB('),ageEnd=source.indexOf('\nfunction checkAndRenderProfileState(',ageStart);
 assert.ok(ageStart>=0&&ageEnd>ageStart,'actual age calculation and DOMContentLoaded runtime are present');
 const ageRuntime=source.slice(ageStart,ageEnd);
 const f=fixture();t.after(()=>f.dom.window.close());const {w}=f,d=w.document;
 const RealDate=w.Date,fixedTime=Date.parse('2026-10-18T12:00:00Z');
 w.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[fixedTime]));}static now(){return fixedTime;}};
 w.MATCH_LANG='en';d.documentElement.lang='en';w.eval(read('profile-details-i18n.js'));
 const ui=w.MatchProfileDetailsI18n;assert.ok(ui,'actual profile details helper loaded');
 const age=d.createElement('span');age.id='profile-age-display';age.style.display='none';d.body.appendChild(age);
 const dob=d.getElementById('profile-dob'),stored=f.snapshot();let renders=0;
 w.renderProfileGrids=()=>{renders++;};
 const ready=new Promise(resolve=>d.addEventListener('DOMContentLoaded',resolve,{once:true}));
 w.eval(ageRuntime);await ready;
 assert.equal(renders,1);assert.equal(age.style.display,'inline-block');assert.equal(age.innerText,ui.text('ageSummary',{age:'42'}));
 assert.equal(dob.value,'01/01/1984');assert.equal(w.localStorage.getItem('match_user_age'),'42');assert.deepEqual(f.snapshot(),stored);
 const savedInputs=inputSnapshot(w);
 for(const lang of languages){
  f.select(lang);
  assert.equal(d.getElementById('profile-age-display'),age);assert.equal(age.innerText,ui.text('ageSummary',{age:'42'}));
  assert.deepEqual(inputSnapshot(w),savedInputs);assert.deepEqual(f.snapshot(),stored);
 }
 dob.value='02031991';dob.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText'}));
 assert.equal(dob.value,'02/03/1991');assert.equal(age.innerText,ui.text('ageSummary',{age:35}));
 dob.focus();dob.setSelectionRange(3,5,'backward');
 const draftInputs=inputSnapshot(w);
 for(const lang of languages){
  f.select(lang);
  assert.equal(ui.language(),lang);assert.equal(d.getElementById('profile-dob'),dob);assert.equal(d.getElementById('profile-age-display'),age);
  assert.equal(age.innerText,ui.text('ageSummary',{age:35}),lang+'/calculated-age');assert.equal(age.style.display,'inline-block');
  assert.equal(dob.value,'02/03/1991');assert.equal(d.activeElement,dob);
  assert.equal(dob.selectionStart,3);assert.equal(dob.selectionEnd,5);assert.equal(dob.selectionDirection,'backward');
  assert.deepEqual(inputSnapshot(w),draftInputs);assert.equal(w.localStorage.getItem('match_user_age'),'42');assert.deepEqual(f.snapshot(),stored);
 }
 for(const [value,inputType,formatted]of [
  ['31021991','insertText','31/02/1991'],
  ['120','insertText','12/0'],
  ['02/03/199','deleteContentBackward','02/03/199']
 ]){
  dob.value=value;dob.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType}));
  assert.equal(dob.value,formatted);assert.equal(age.innerText,ui.text('ageSummary',{age:35}));assert.equal(age.style.display,'inline-block');
 }
 dob.setSelectionRange(2,6,'forward');f.select('ar');
 assert.equal(dob.value,'02/03/199');assert.equal(d.activeElement,dob);assert.equal(dob.selectionStart,2);assert.equal(dob.selectionEnd,6);
 assert.equal(age.innerText,ui.text('ageSummary',{age:35}));assert.equal(w.localStorage.getItem('match_user_age'),'42');
 assert.equal(renders,1);assert.deepEqual(f.snapshot(),stored);assert.deepEqual(f.calls.writes,[]);assert.deepEqual(f.calls.requests,[]);
 assert.equal(f.calls.saved,0);assert.equal(f.calls.pending,0);assert.equal(f.calls.email,0);assert.deepEqual(f.calls.alerts,[]);assert.deepEqual(f.errors,[]);
});
