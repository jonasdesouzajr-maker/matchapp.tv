const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const LANGS=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function settle(){await tick();await tick();}
function setLanguage(w,lang){
  w.localStorage.setItem('match_lang',lang);
  w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang}}));
}
async function activity({lang='pt-BR',signedIn=true,response=async()=>({data:[],error:null})}={}){
  const dom=new JSDOM('<!doctype html><html lang="en"><body><section><div id="locked-info-card"></div></section></body></html>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only'});
  const w=dom.window,queries=[];let writes=0;
  w.localStorage.setItem('match_lang',lang);w.MATCH_LANG='en';
  if(signedIn)w.supabaseClient={
    from(table){return{select(columns){return{order(field,options){return{limit(count){queries.push({table,columns,field,options:JSON.parse(JSON.stringify(options)),count});return response();}};}};}};},
    rpc(){writes++;return Promise.resolve({data:null,error:null});}
  };
  w.eval(read('profile-details-i18n.js'));w.eval(read('profile-history.js'));await settle();
  return{dom,w,queries,writes:()=>writes,details:w.document.querySelector('.profile-history-fold')};
}
async function geography(){
  const dom=new JSDOM('<!doctype html><html lang="en"><body><select id="profile-country" required></select><select id="registration-region" required></select></body></html>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only'});
  const w=dom.window;w.localStorage.setItem('match_lang','pt-BR');w.MATCH_LANG='en';
  w.eval(read('profile-details-i18n.js'));w.eval(read('profile-geography.js'));await settle();
  const country=w.document.getElementById('profile-country'),region=w.document.getElementById('registration-region');
  w.MatchAppGeography.bindRegionSelect(region,'');
  return{dom,w,country,region,geo:w.MatchAppGeography};
}
test('private activity paints initial and signed-out states in the chosen language without a backend call',async()=>{
  const t=await activity({signedIn:false}),{dom,w,details}=t;
  try{
    const ui=w.MatchProfileDetailsI18n;
    assert.equal(details.querySelector('summary span').textContent,ui.text('activityTitle'));
    assert.equal(details.querySelector('summary small').textContent,ui.text('activitySubtitle'));
    assert.equal(details.querySelector('.profile-history-status').textContent,ui.text('activityOpen'));
    details.open=true;await settle();
    const status=details.querySelector('.profile-history-status');
    assert.equal(status.textContent,ui.text('activitySignIn'));
    setLanguage(w,'ar');assert.equal(status.textContent,ui.text('activitySignIn'));
    assert.equal(details.querySelector('.profile-history-status'),status);assert.equal(details.dir,'rtl');
    assert.equal(t.queries.length,0);assert.equal(t.writes(),0);assert.equal(w.MATCH_LANG,'en');
  }finally{dom.window.close();}
});
test('delayed empty and failed activity reads resolve in the current language and keep their status node on repaint',async()=>{
  for(const outcome of ['empty','error']){
    let release;const t=await activity({lang:'en',response:()=>new Promise(resolve=>{release=resolve;})}),{dom,w,details}=t;
    try{
      details.open=true;await settle();
      const body=details.querySelector('.profile-history-body');assert.equal(t.queries.length,1);assert.equal(body.getAttribute('aria-busy'),'true');
      setLanguage(w,'ja');assert.equal(t.queries.length,1);assert.equal(body.getAttribute('aria-busy'),'true');
      release(outcome==='empty'?{data:[],error:null}:{data:null,error:{message:'fixture read unavailable'}});await settle();
      const key=outcome==='empty'?'activityEmpty':'activityUnavailable',status=body.querySelector('.profile-history-status');
      assert.equal(status.textContent,w.MatchProfileDetailsI18n.text(key));assert.equal(body.hasAttribute('aria-busy'),false);
      assert.equal(details.dataset.loaded,outcome==='empty'?'1':undefined);
      setLanguage(w,'ar');assert.equal(body.querySelector('.profile-history-status'),status);assert.equal(status.textContent,w.MatchProfileDetailsI18n.text(key));
      assert.equal(t.queries.length,1);assert.equal(t.writes(),0);
    }finally{dom.window.close();}
  }
});
test('loaded activity keeps unknown labels, fallback event text and timestamp nodes through locale changes and reopening',async()=>{
  const rows=[
    {event_type:'provider_custom_event',event_label:'Café <Title> — 作品',event_data:{unused:'fixture'},created_at:'2026-10-17T12:34:56.000Z'},
    {event_type:'external_status_v2',event_label:null,event_data:{},created_at:'2026-10-16T09:08:07.000Z'}
  ];
  const t=await activity({response:async()=>({data:rows,error:null})}),{dom,w,details}=t;
  try{
    details.open=true;await settle();
    assert.deepEqual(t.queries,[{table:'user_activity_history',columns:'event_type,event_label,event_data,created_at',field:'created_at',options:{ascending:false},count:150}]);
    const records=[...details.querySelectorAll('ol li')],labels=records.map(row=>row.querySelector('span')),times=records.map(row=>row.querySelector('time'));
    assert.equal(records.length,2);assert.equal(labels[0].textContent,rows[0].event_label);assert.equal(labels[1].textContent,'external status v2');
    rows.forEach((row,index)=>{assert.equal(times[index].getAttribute('datetime'),row.created_at);assert.equal(times[index].textContent,new w.Date(row.created_at).toLocaleString());});
    const savedMarkup=records.map(row=>row.outerHTML),savedTimes=times.map(node=>node.textContent);
    for(const lang of ['ar','ja','pt-BR']){
      setLanguage(w,lang);
      assert.deepEqual([...details.querySelectorAll('ol li')],records);
      assert.deepEqual(records.map(row=>row.outerHTML),savedMarkup);assert.deepEqual(times.map(node=>node.textContent),savedTimes);
      assert.equal(t.queries.length,1);
    }
    details.open=false;await settle();details.open=true;await settle();
    w.document.dispatchEvent(new w.CustomEvent('matchapp:profilehydrated'));await settle();
    assert.equal(w.document.querySelectorAll('.profile-history-fold').length,1);
    assert.deepEqual([...details.querySelectorAll('ol li')],records);assert.equal(t.queries.length,1);assert.equal(t.writes(),0);
  }finally{dom.window.close();}
});
test('all14 geography prompts preserve canonical selections, actual field nodes and required/disabled states',async()=>{
  const {dom,w,country,region,geo}=await geography();
  try{
    assert.equal(geo.countryCount,249);assert.equal(geo.regionCount,4387);assert.equal(country.options.length,250);
    assert.equal(region.disabled,true);assert.equal(country.required,true);assert.equal(region.required,true);
    const canonicalCountries=[...country.options].map(option=>option.value).sort();
    country.value='Brazil';country.dispatchEvent(new w.Event('change',{bubbles:true}));
    region.value='Rio de Janeiro';assert.equal(geo.isRegion(country.value,region.value),true);
    const regionOptions=[...region.options],canonicalRegions=regionOptions.map(option=>option.value);
    country.disabled=true;
    const states=[country.required,country.disabled,region.required,region.disabled];
    for(const lang of LANGS){
      setLanguage(w,lang);
      assert.equal(w.document.getElementById('profile-country'),country);assert.equal(w.document.getElementById('registration-region'),region);
      assert.equal(country.value,'Brazil');assert.equal(region.value,'Rio de Janeiro');
      assert.equal(country.options[0].value,'');assert.equal(region.options[0].value,'');
      assert.equal(country.options[0].textContent,w.MatchProfileDetailsI18n.text('countryPrompt'));
      assert.equal(region.options[0].textContent,w.MatchProfileDetailsI18n.text('regionPrompt'));
      assert.deepEqual([...country.options].map(option=>option.value).sort(),canonicalCountries);
      assert.deepEqual([...region.options],regionOptions);assert.deepEqual([...region.options].map(option=>option.value),canonicalRegions);
      assert.deepEqual([country.required,country.disabled,region.required,region.disabled],states);
    }
    assert.equal(geo.getRegions('Japan').length,47);assert.equal(geo.getRegions('Australia').length,8);
  }finally{dom.window.close();}
});
test('country changes and region restoration retain dependent-selector behavior after translated prompt bindings',async()=>{
  const {dom,w,country,region,geo}=await geography();
  try{
    country.value='Brazil';country.dispatchEvent(new w.Event('change'));region.value='Rio de Janeiro';
    setLanguage(w,'ar');
    country.value='Japan';country.dispatchEvent(new w.Event('change'));
    assert.equal(region.value,'');assert.equal(region.disabled,false);assert.equal(geo.isRegion('Japan','Rio de Janeiro'),false);
    assert.equal(region.options.length,48);assert.equal(region.options[0].textContent,w.MatchProfileDetailsI18n.text('regionPrompt'));
    const selected=geo.getRegions('Japan')[0];region.restoreRegion(selected);
    assert.equal(country.value,'Japan');assert.equal(region.value,selected);assert.equal(region.required,true);
    setLanguage(w,'fr');assert.equal(region.value,selected);assert.equal(region.options[0].textContent,w.MatchProfileDetailsI18n.text('regionPrompt'));
    country.value='';country.dispatchEvent(new w.Event('change'));
    assert.equal(region.value,'');assert.equal(region.disabled,true);assert.equal(region.options.length,1);
    setLanguage(w,'ko');assert.equal(region.disabled,true);assert.equal(region.required,true);
    assert.equal(region.options[0].textContent,w.MatchProfileDetailsI18n.text('regionPrompt'));
  }finally{dom.window.close();}
});
