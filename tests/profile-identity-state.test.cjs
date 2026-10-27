'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(process.env.MATCHAPP_IDENTITY_SOURCE||path.join(__dirname,'..'));
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const source=read('profile.js');
const start=source.indexOf('function calculateAgeFromDOB('),end=source.indexOf('window.retryLockedProfile =',start);
assert(start>=0&&end>start,'actual age, startup and identity-state runtime is available');
const listener=source.match(/^document\.addEventListener\('matchapp:langchange',checkAndRenderProfileState\);$/m)?.[0];
assert(listener,'actual language event binding is available');

// This fixture checks state transitions and DOM writes. Real computed CSS,
// initializer ordering and browser focus are covered by the Chromium helper.
function fixture({status='ready',locked=true,date='2026-06-20T12:00:00Z',dob='05/03/1992',age='33'}={}){
  class Style{
    constructor(){this.values=new Map();}
    setProperty(key,value,priority=''){this.values.set(key,{value,priority});}
    removeProperty(key){const old=this.getPropertyValue(key);this.values.delete(key);return old;}
    getPropertyValue(key){return this.values.get(key)?.value||'';}
    getPropertyPriority(key){return this.values.get(key)?.priority||'';}
    get display(){return this.getPropertyValue('display');}
    set display(value){this.setProperty('display',value);}
  }
  class Element extends EventTarget{
    constructor(id){super();Object.assign(this,{id,style:new Style(),value:'',checked:false,disabled:false,hidden:false,innerText:'',textContent:'',attributes:{}});}
    setAttribute(key,value){this.attributes[key]=String(value);}
    getAttribute(key){return this.attributes[key]??null;}
  }
  const nodes=new Map(),controls=[],writes=[],observers=[];
  const add=id=>{const node=new Element(id);nodes.set(id,node);return node;};
  for(const id of ['editable-fields-section','locked-info-card','save-profile-btn','profile-instructions-text','identity-load-status','identity-load-retry','profile-age-display',...['name','country','region','dob','sign','age','sign-trait'].map(key=>'lock-val-'+key)])add(id);
  const section=nodes.get('editable-fields-section');section.querySelectorAll=()=>controls;
  const addControl=id=>{const control=add(id);controls.push(control);return control;};
  for(const id of ['profile-name','profile-country','profile-dob','profile-starsign','profile-gender'])addControl(id);
  const document=new EventTarget();document.getElementById=id=>nodes.get(id)||null;
  document.querySelectorAll=selector=>selector.startsWith('#editable-fields-section')?controls:[];
  const saved={match_profile_locked:String(locked),match_user_name:'Morgan Example',match_user_country:'Brazil',match_user_dob:dob,match_user_sign:'Pisces',match_user_age:age,match_user_region:'Paraná',match_lang:'en',fixture_sentinel:'unchanged'};
  const storage=new Map(Object.entries(saved).filter(([,value])=>value!==null));
  const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>{writes.push([key,String(value)]);storage.set(key,String(value));}};
  const RealDate=Date,fixed=Date.parse(date);
  class FixedDate extends RealDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}}
  class Observer{
    constructor(callback){this.callback=callback;observers.push(this);}
    observe(target,options){this.target=target;this.options=options;}
    disconnect(){this.target=null;}
  }
  const context=vm.createContext({document,localStorage,Date:FixedDate,MutationObserver:Observer,Event,STAR_SIGN_TRAITS:{Pisces:'Fictional trait'},formatSign:value=>value,populateEmail(){},renderProfileGrids(){},matchProfileState:{status,userId:'fictional-account'},saveProfileData(){},t:key=>key});
  context.window=context;
  vm.runInContext(source.slice(start,end)+'\n'+listener,context,{filename:'profile.js'});
  const insert=id=>{const node=addControl(id);return node;};
  const flush=()=>observers.filter(observer=>observer.target===section).forEach(observer=>observer.callback([{type:'childList',target:section}]));
  return {context,document,nodes,controls,section,storage,writes,observers,insert,flush,start:()=>document.dispatchEvent(new Event('DOMContentLoaded')),render:event=>context.checkAndRenderProfileState(event)};
}
function blocked(f){
  assert.equal(f.section.style.display,'none');
  assert.equal(f.section.style.getPropertyPriority('display'),'important','state wins over the approved important grid declaration');
  for(const node of f.controls)assert.equal(node.disabled,true,node.id+' is inert');
  assert.equal(f.nodes.get('save-profile-btn').disabled,true);
}

test('pending, error, signed-out and ready-locked states hide and disable original and late registration controls',()=>{
  for(const status of ['loading','error','signedout','ready'])for(const locked of [false,true]){
    if(status==='ready'&&!locked)continue;
    const f=fixture({status,locked});f.insert('registration-terms');f.start();blocked(f);
    for(const id of ['registration-region','registration-language','registration-privacy','registration-marketing','late-textarea','late-button'])f.insert(id);
    f.flush();blocked(f);
    assert.equal(f.nodes.get('locked-info-card').style.display,status==='ready'?'block':'none');
    assert.equal(f.nodes.get('save-profile-btn').hidden,status!=='ready');
    assert.deepEqual(f.writes,[]);
  }
});

test('a verified unlocked transition restores the approved layout and normal saved-field/save behavior',()=>{
  const f=fixture({status:'loading',locked:false});f.start();blocked(f);
  f.context.matchProfileState={status:'ready',userId:'fictional-account'};f.render();
  assert.equal(f.section.style.display,'');assert.equal(f.section.style.getPropertyPriority('display'),'');
  for(const node of f.controls)assert.equal(node.disabled,false,node.id);
  assert.equal(f.nodes.get('profile-name').value,'Morgan Example');
  assert.equal(f.nodes.get('profile-dob').value,'05/03/1992');
  assert.equal(f.nodes.get('save-profile-btn').onclick,f.context.saveProfileData);
  assert.equal(f.nodes.get('save-profile-btn').disabled,false);
  assert.equal(f.nodes.get('locked-info-card').style.display,'none');
  f.storage.set('match_profile_locked','true');f.render();blocked(f);
  assert.deepEqual(f.writes,[]);
});

test('late controls and language repaint preserve unlocked drafts, consents and a pending-save handler/disabled flags',()=>{
  const f=fixture({locked:false});f.start();
  const name=f.nodes.get('profile-name'),country=f.nodes.get('profile-country'),save=f.nodes.get('save-profile-btn');
  name.value='Taylor Draft';country.value='Japan';country.disabled=true;
  const terms=f.insert('registration-terms');terms.checked=true;
  const language=f.insert('registration-language');language.value='ja';language.disabled=true;
  const handler=()=>{};save.onclick=handler;save.disabled=true;
  const snapshot=()=>f.controls.map(node=>({id:node.id,value:node.value,checked:node.checked,disabled:node.disabled}));
  const before=snapshot();f.flush();f.document.dispatchEvent(new Event('matchapp:langchange'));
  assert.deepEqual(snapshot(),before);
  assert.equal(save.onclick,handler);assert.equal(save.disabled,true);
  assert.equal(f.section.style.display,'');assert.equal(f.section.style.getPropertyPriority('display'),'');
  assert.equal(f.observers.length,1,'startup installs only one scoped observer');
  assert.equal(f.observers[0].target,f.section);
  assert.equal(f.observers[0].options.childList,true);assert.equal(f.observers[0].options.subtree,true);
  assert.notEqual(f.observers[0].options.attributes,true,'style/disabled writes cannot trigger an attribute loop');
  assert.deepEqual(f.writes,[]);
});

test('summary and age label derive the current age from a valid saved DOB across birthday/leap boundaries without changing cached age',()=>{
  const cases=[
    ['2026-06-20T12:00:00Z','21/06/1992',33],['2026-06-20T12:00:00Z','20/06/1992',34],['2026-06-20T12:00:00Z','19/06/1992',34],
    ['2028-02-28T12:00:00Z','29/02/2000',27],['2028-02-29T12:00:00Z','29/02/2000',28],['2026-03-01T12:00:00Z','29/02/2000',26],
    ['2026-06-20T12:00:00Z','20/06/2026',0],['2026-06-20T12:00:00Z','20/06/1906',120]
  ];
  for(const [date,dob,expected]of cases){
    const f=fixture({date,dob,age:'7'});f.start();
    assert.equal(f.nodes.get('lock-val-age').innerText,expected+' years old',dob+'/'+date);
    assert.equal(f.nodes.get('profile-age-display').innerText,'AI Profile: '+expected+' Years Old');
    assert.equal(f.storage.get('match_user_age'),'7');assert.deepEqual(f.writes,[]);
  }
});

test('invalid or unavailable DOB uses only a valid bounded cached age, including zero',()=>{
  for(const dob of ['', '31/02/1992','29/02/1991','21/06/2026','20/06/1800','1992-03-05']){
    for(const [age,expected]of [[null,'N/A'],['','N/A'],[' ','N/A'],['-1','N/A'],['121','N/A'],['1.5','N/A'],['NaN','N/A'],['Infinity','N/A'],['0','0 years old'],['120','120 years old'],[' 34 ','34 years old']]){
      const f=fixture({dob,age});f.start();
      assert.equal(f.nodes.get('lock-val-age').innerText,expected,JSON.stringify({dob,age}));
      assert.deepEqual(f.writes,[]);
    }
  }
});

test('DOB input can display age zero and leaves saved identity untouched',()=>{
  const f=fixture({locked:false,dob:'',age:null});f.start();
  const dob=f.nodes.get('profile-dob'),display=f.nodes.get('profile-age-display');
  dob.value='20062026';dob.dispatchEvent(new Event('input'));
  assert.equal(dob.value,'20/06/2026');assert.equal(display.innerText,'AI Profile: 0 Years Old');
  assert.equal(display.style.display,'inline-block');assert.equal(f.storage.get('match_user_dob'),'');
  assert.deepEqual(f.writes,[]);
});

const version='20261022-1',html=read('profile/profile.html');
const urls=[...html.matchAll(/\bsrc=(['"])(\/(?:app|profile)\.js(?:\?[^'"]*)?)\1/g)].map(match=>new URL(match[2].replace(/&amp;/g,'&'),'https://matchapp.tv'));
const finalizer=read('tools/finalize-brand.js'),normalizerStart=finalizer.indexOf('function withQueryParams('),normalizerEnd=finalizer.indexOf('function name(',normalizerStart);
assert(normalizerStart>=0&&normalizerEnd>normalizerStart,'actual generator URL normalizer is available');
const normalizer=vm.createContext({URLSearchParams});
vm.runInContext(finalizer.slice(normalizerStart,normalizerEnd)+'\nthis.normalize=referenceRuntimeAssetURL;',normalizer);

test('the sole Profile runtime loader adds its identity key while preserving every existing query pin',()=>{
  assert.equal(urls.length,2);const profile=urls.filter(url=>url.pathname==='/profile.js');assert.equal(profile.length,1);
  const params=profile[0].searchParams;
  assert.deepEqual(params.getAll('identity'),[version]);
  const priorPins={v:'20260924-ui2',sbt:'20261004-1',details:'20261018-1',posters:'20261020-1',dialogs:'20261020-1',accountphoto:'20261020-1',readiness:version};
  for(const [key,value]of Object.entries(priorPins))assert.deepEqual(params.getAll(key),[value],key+' remains pinned exactly once');
  assert.equal(urls.filter(url=>url.pathname==='/app.js').length,1);
  assert.equal(urls.find(url=>url.pathname==='/app.js').searchParams.has('identity'),false);
});

test('profile identity normalization is idempotent and preserves original versions, queries, readiness and fragments',()=>{
  const input='/profile.js?v=original&route=profile%20view&readiness='+version+'&identity=older#saved';
  const once=normalizer.normalize(input),url=new URL(once,'https://matchapp.tv');
  assert.equal(normalizer.normalize(once),once);
  assert.equal(url.searchParams.get('v'),'original');assert.equal(url.searchParams.get('route'),'profile view');
  assert.deepEqual(url.searchParams.getAll('readiness'),[version]);assert.deepEqual(url.searchParams.getAll('identity'),[version]);
  assert.equal(url.hash,'#saved');
});

test('the identity key never spreads to unchanged app, registration, settings, final-audit, styles or external assets',()=>{
  for(const input of ['/app.js?v=kept&errors=20261027-2','/registration-upgrade.js?v=kept','/settings.js?v=kept&errors=20261027-2','/final-audit.js?v=kept&errors=20261027-2','/patches/reference-pages.css?v=kept','https://cdn.example/profile.js?v=kept']){
    const output=normalizer.normalize(input);assert.equal(new URL(output,'https://matchapp.tv').searchParams.has('identity'),false,input);
    if(/registration-upgrade|final-audit|^https:/.test(input))assert.equal(output,input);
  }
});
