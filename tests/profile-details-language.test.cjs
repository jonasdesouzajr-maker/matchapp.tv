const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const LANGS=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const markup=`<!doctype html><html lang="en"><body><section id="account-details">
<div id="editable-fields-section"><div class="input-group"><label for="profile-name">Name</label><input id="profile-name" value="Fixture Name"></div>
<div class="input-group"><label for="profile-country">Country</label><select id="profile-country"></select></div>
<div class="input-group"><label for="profile-dob">Birth date</label><input id="profile-dob" value="01/01/1990"></div>
<div class="input-group"><label for="profile-starsign">Sign</label><select id="profile-starsign"><option value="Aries">Aries</option></select></div></div>
<div id="locked-info-card"></div><button id="save-profile-btn"></button></section></body></html>`;
async function mount({lang='pt-BR',late=false,rpc,preferences=null}={}){
  const dom=new JSDOM(markup,{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
  const calls=[],toasts=[];let signedOut=0;
  w.localStorage.setItem('match_lang',lang);w.MATCH_LANG='en';
  w.showToast=(message,isError)=>toasts.push({message,isError});
  w.saveProfileData=()=>{throw Error('Unexpected legacy save');};
  w.hydrateProfileFromAuth=async()=>{};w.checkAndRenderProfileState=()=>{};
  w.supabaseClient={
    auth:{getUser:async()=>({data:{user:{id:'fixture-user'}}}),getSession:async()=>({data:{session:{user:{id:'fixture-user'}}}}),signOut:async()=>{signedOut++;}},
    from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:preferences})})})}),
    rpc:async(name,args)=>{calls.push({name,args});return rpc?rpc(name,args):{data:null,error:null};}
  };
  w.eval(read('profile-details-i18n.js'));if(late)await tick();
  w.eval(read('profile-geography.js'));w.eval(read('registration-upgrade.js'));w.eval(read('legal-kit.js'));
  await tick();
  return {dom,w,calls,toasts,signedOut:()=>signedOut};
}
function language(w,lang,event='matchapp:langchange'){
  w.localStorage.setItem('match_lang',lang);
  if(event==='storage')w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:lang}));
  else w.document.dispatchEvent(new w.CustomEvent(event,{detail:{lang}}));
}
function choose(w){
  const country=w.document.getElementById('profile-country');country.value='Brazil';country.dispatchEvent(new w.Event('change',{bubbles:true}));
  const region=w.document.getElementById('registration-region');region.value='Rio de Janeiro';region.dispatchEvent(new w.Event('change',{bubbles:true}));
  w.document.getElementById('registration-terms').checked=true;w.document.getElementById('registration-privacy').checked=true;
}
test('53 details keys are authored in all14 languages with single consent-link tokens and the unchanged brand',async()=>{
  const src=read('profile-details-i18n.js'),catalog=JSON.parse(src.slice(src.indexOf('const COPY=')+11,src.indexOf(';\n  const bindings=')));
  assert.deepEqual(Object.keys(catalog),LANGS);assert.equal(Object.keys(catalog.en).length,53);
  for(const lang of LANGS){
    assert.deepEqual(Object.keys(catalog[lang]),Object.keys(catalog.en));
    for(const [key,value]of Object.entries(catalog[lang])){
      assert.equal(typeof value,'string');assert.ok(value.trim(),lang+':'+key);
      if(lang!=='en')assert.notEqual(value,catalog.en[key],lang+':'+key);
      if(value.includes('MatchApp'))assert.ok(!/MatchApp(?! Ai)/.test(value),lang+':'+key);
    }
    for(const key of ['termsConsent','privacyConsent'])assert.equal(catalog[lang][key].split('{link}').length,2);
  }
});
test('early and late profile modules paint every language without changing controls, consent links or making writes',async()=>{
  for(const late of [false,true])for(const lang of LANGS){
    const {dom,w,calls}=await mount({lang,late}),d=w.document,ui=w.MatchProfileDetailsI18n;
    assert.equal(calls.length,0);
    for(const node of d.querySelectorAll('[data-registration-copy]'))assert.equal(node.textContent,ui.text(node.dataset.registrationCopy));
    assert.equal(d.querySelector('.ma-delete-box h3').textContent,ui.text('deleteTitle'));
    for(const [id,key,linkKey,url]of [['registration-terms','termsConsent','termsLink','/terms.html'],['registration-privacy','privacyConsent','privacyLink','/privacy.html']]){
      const input=d.getElementById(id),sentence=input.nextElementSibling,link=sentence.querySelector('a');
      assert.equal(input.required,true);assert.equal(input.checked,false);
      assert.equal(sentence.textContent,ui.text(key).replace('{link}',ui.text(linkKey)));
      assert.equal(link.getAttribute('href'),url);assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener');
    }
    assert.equal(d.getElementById('registration-marketing').required,false);
    assert.equal(d.getElementById('registration-account-fields').dir,lang==='ar'?'rtl':'ltr');
    assert.equal(w.MATCH_LANG,'en');assert.equal(d.documentElement.lang,'en');
    dom.window.close();
  }
});
test('language and storage repaints preserve unsaved values, checkboxes, focus, selected options and original consent anchors',async()=>{
  const {dom,w,calls}=await mount(),d=w.document;choose(w);
  d.getElementById('profile-name').value='Unsaved typed name';d.getElementById('profile-dob').value='22/03/1991';
  const preferred=d.getElementById('registration-language');preferred.value='ja';preferred.focus();
  d.getElementById('registration-marketing').checked=true;
  const ids=['profile-name','profile-dob','profile-country','profile-starsign','registration-region','registration-language','registration-terms','registration-privacy','registration-marketing'];
  const nodes=ids.map(id=>d.getElementById(id)),snapshot=nodes.map(n=>[n.value,n.checked,n.required,n.disabled]);
  const anchors=[...d.querySelectorAll('[data-registration-consent] a')],options=[...preferred.options];
  for(const [lang,event]of [['ar','matchapp:langchange'],['de','matchapp:languagechange'],['pt-PT','storage']]){
    language(w,lang,event);
    ids.forEach((id,index)=>{assert.equal(d.getElementById(id),nodes[index]);assert.deepEqual([nodes[index].value,nodes[index].checked,nodes[index].required,nodes[index].disabled],snapshot[index]);});
    assert.deepEqual([...preferred.options],options);assert.deepEqual([...d.querySelectorAll('[data-registration-consent] a')],anchors);
    assert.equal(d.activeElement,preferred);assert.equal(calls.length,0);
  }
  assert.equal(w.MatchProfileDetailsI18n.language(),'pt-BR');dom.window.close();
});
test('pending registration keeps its request and nodes, and confirmed success uses the language selected before completion',async()=>{
  let release;const {dom,w,calls}=await mount({lang:'en',rpc:()=>new Promise(resolve=>{release=resolve;})}),d=w.document;
  choose(w);const button=d.getElementById('save-profile-btn'),pending=w.saveProfileData();await tick();
  assert.equal(calls.length,1);assert.equal(calls[0].name,'complete_registration');assert.equal(button.disabled,true);
  const fields=[...d.querySelectorAll('input,select')];language(w,'ar');
  assert.equal(calls.length,1);assert.equal(d.getElementById('save-profile-btn'),button);assert.equal(button.disabled,true);
  assert.deepEqual([...d.querySelectorAll('input,select')],fields);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)),{p_name:'Fixture Name',p_country:'Brazil',p_dob:'01/01/1990',p_sign:'Aries',p_language:'en',p_region:'Rio de Janeiro',p_marketing:false,p_accept_terms:true,p_accept_privacy:true});
  release({data:{full_name:'Fixture Name',country:'Brazil',dob:'01/01/1990',star_sign:'Aries',age:36,profile_locked:true,registration_completed:true},error:null});await pending;
  assert.equal(w.localStorage.getItem('match_profile_locked'),'true');
  const home=d.getElementById('registration-success-home');assert.equal(d.activeElement,home);
  assert.equal(d.getElementById('registration-save-success-title').textContent,w.MatchProfileDetailsI18n.text('successTitle'));
  language(w,'pt-BR');assert.equal(d.getElementById('registration-success-home'),home);assert.equal(d.activeElement,home);
  assert.equal(home.textContent,w.MatchProfileDetailsI18n.text('successHome'));assert.equal(calls.length,1);dom.window.close();
});
test('failed registration response uses the newly selected language and keeps the editable identity unlocked',async()=>{
  let release;const {dom,w,calls,toasts}=await mount({lang:'en',rpc:()=>new Promise(resolve=>{release=resolve;})});choose(w);
  const pending=w.saveProfileData();await tick();language(w,'ja');release({data:null,error:{message:'Invalid birthdate'}});await pending;
  assert.equal(calls.length,1);assert.equal(toasts.at(-1).message,w.MatchProfileDetailsI18n.text('errBirthdate'));
  assert.notEqual(w.localStorage.getItem('match_profile_locked'),'true');assert.equal(w.document.getElementById('profile-name').value,'Fixture Name');
  assert.equal(w.document.getElementById('save-profile-btn').disabled,false);dom.window.close();
});
test('deletion cancellation writes nothing; a confirmed mocked completion repaints without repeating the request',async()=>{
  let release;const {dom,w,calls,signedOut}=await mount({rpc:()=>new Promise(resolve=>{release=resolve;})}),d=w.document,button=d.getElementById('ma-delete-btn');
  let prompt;w.confirm=value=>{prompt=value;return false;};button.click();await tick();assert.equal(calls.length,0);assert.equal(prompt,w.MatchProfileDetailsI18n.text('deleteConfirm'));
  w.confirm=()=>true;button.click();await tick();assert.equal(calls.length,1);assert.equal(calls[0].name,'request_account_deletion');
  language(w,'ar');release({data:{message:'Deletion scheduled. The same email can return after 72 hours.'},error:null});await tick();
  const msg=d.getElementById('ma-delete-msg');assert.equal(msg.textContent,w.MatchProfileDetailsI18n.text('deleteScheduled'));assert.equal(signedOut(),1);
  language(w,'fr');assert.equal(msg.textContent,w.MatchProfileDetailsI18n.text('deleteScheduled'));assert.equal(d.getElementById('ma-delete-btn'),button);assert.equal(calls.length,1);dom.window.close();
});
test('an unknown backend deletion message remains verbatim and uses automatic text direction',async()=>{
  const message='Unrecognized backend detail: 保留原文';const {dom,w,calls}=await mount({rpc:async()=>({data:{message},error:null})});
  w.confirm=()=>true;w.document.getElementById('ma-delete-btn').click();await tick();language(w,'ar');
  const msg=w.document.getElementById('ma-delete-msg');assert.equal(msg.textContent,message);assert.equal(msg.dir,'auto');assert.equal(calls.length,1);dom.window.close();
});
test('helper normalizes saved aliases, never falls back to another catalog language, and retains source text direction',async()=>{
  const {dom,w}=await mount(),ui=w.MatchProfileDetailsI18n,node=w.document.createElement('span');node.dir='auto';w.document.body.appendChild(node);
  ui.bind(node,()=>{node.textContent='Stranger Things';});language(w,'ar_EG');assert.equal(ui.language(),'ar');assert.equal(node.dir,'auto');
  assert.equal(ui.from({en:{onlyEnglish:'English'}},'onlyEnglish'),'');assert.equal(ui.text('missingKey'),'');
  language(w,'zh-HK');assert.equal(ui.language(),'zh');language(w,'pt_PT');assert.equal(ui.language(),'pt-BR');
  Object.defineProperty(w,'localStorage',{get(){throw Error('blocked');}});w.MATCH_LANG='ko';ui.refresh();assert.equal(ui.language(),'ko');assert.equal(node.dir,'auto');dom.window.close();
});
