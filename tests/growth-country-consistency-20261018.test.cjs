'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const registeredCountries=JSON.parse(read('profile-geography.js').match(/^const DATA=(.*);$/m)[1]).map(row=>row[1]);
const settle=()=>new Promise(resolve=>setImmediate(resolve));

async function boot({country='',region='',language='pt-BR',query='',invite=false,viewingMode='shared'}={}){
 const dom=new JSDOM('<!doctype html><html lang="en"><body><main><section id="growth-root"></section></main></body></html>',{
  url:'https://matchapp.tv/together.html'+query+(invite?'#invite='+'a'.repeat(64):''),runScripts:'outside-only',pretendToBeVisual:true
 });
 const w=dom.window,calls=[];let userReads=0;
 Object.defineProperty(w.navigator,'language',{value:'en-US',configurable:true});
 w.MATCH_LANG=language;
 if(country)w.localStorage.setItem('match_user_country',country);
 if(region)w.localStorage.setItem('match_user_region',region);
 w.supabaseClient={supabaseKey:'public-test-key',supabaseUrl:'https://example.supabase.co',auth:{
  getSession:async()=>({data:{session:null}}),getUser:async()=>{userReads++;return {data:{user:null}};}
 }};
 w.fetch=async(url,options)=>{
  const body=JSON.parse(options.body);calls.push(body);
  return {ok:true,json:async()=>body.action==='preview'?{ok:true,hostName:'Fixture host',viewingMode,viewingCountry:'RO',joined:false}:{ok:true,status:'no_match'}};
 };
 for(const file of ['viewer-country.js','growth-bootstrap.js','growth-core.js','growth-copy.js','growth-together.js'])w.eval(read(file));
 await settle();
 const click=key=>{
  const label=w.MatchAppGrowthCopy.text(key),button=[...w.document.querySelectorAll('#growth-root button')].find(row=>row.textContent===label);
  assert.ok(button,'button '+key);button.click();
 };
 const chooseStep=()=>{w.MatchAppGrowthTogether.start();click('next');click('next');};
 return {dom,w,calls,click,chooseStep,userReads:()=>userReads,countrySelect:()=>w.document.querySelector('#growth-root select:not(.growth-language)')};
}

test('Quick Together accepts exactly the same 249 country codes as registration',async()=>{
 const {COUNTRIES,validatePrefs}=await import('../supabase/functions/growth-together/eligibility.mjs');
 assert.equal(registeredCountries.length,249);
 assert.deepEqual([...COUNTRIES].sort(),[...registeredCountries].sort());
 for(const country of registeredCountries){
  assert.equal(validatePrefs({country}).country,country);
  assert.equal(validatePrefs({country:' '+country.toLowerCase()+' '}).country,country);
 }
 for(const country of ['',null,'ZZ','XX','Unknown','en-US','Romania'])assert.throws(()=>validatePrefs({country}),/country_required/);
});

test('actual Quick Together selector preserves profile country independently of language and subdivisions',async()=>{
 const cases=[
  {country:'Romania',region:'Bucharest',expected:'RO'},
  {country:'Fiji',region:'Ba',expected:'FJ'},
  {country:'Slovenia',region:'Ig',expected:'SI'},
  {country:'Norway',region:'Oslo',query:'?country=ro',expected:'RO'},
  {country:'Romania',query:'?country=ZZ',expected:'RO'}
 ];
 for(const fixture of cases){
  const app=await boot(fixture);
  try{
   app.chooseStep();const select=app.countrySelect();assert.ok(select);
   assert.equal(select.value,fixture.expected);
   assert.deepEqual([...select.options].map(option=>option.value).filter(Boolean).sort(),[...registeredCountries].sort());
   assert.equal(app.calls.length,0,'country selection should not query providers');
  }finally{app.dom.window.close();}
 }
});

test('unknown Quick Together country stays an actionable choice and cannot start an implicit US or Brazil match',async()=>{
 for(const fixture of [{},{country:'Unknown',region:'Unknown',query:'?country=ZZ'}]){
  const app=await boot(fixture);
  try{
   app.chooseStep();assert.equal(app.countrySelect().value,'');
   app.click('create');await settle();
   assert.equal(app.countrySelect().value,'');
   assert.equal(app.countrySelect().disabled,false,'the country chooser remains usable');
   assert.equal(app.userReads(),0,'invalid country must be caught before asking for an account');
   assert.equal(app.calls.length,0,'invalid country must not reach matching or provider services');
  }finally{app.dom.window.close();}
 }
});

test('newly supported countries still require fresh source evidence and a viewing link for that exact country',async()=>{
 const {validatePrefs,countryOptions}=await import('../supabase/functions/growth-together/eligibility.mjs');
 const now=Date.now(),stamp=new Date(now).toISOString(),prefs=validatePrefs({country:'RO',providers:['Netflix']});
 const offer=country=>({stream:['Netflix'],link:'https://www.themoviedb.org/movie/123/watch?locale='+country});
 const source={tmdbId:123,kind:'movie',checkedAt:stamp,regions:{US:offer('US'),BR:offer('BR')}};
 assert.equal(countryOptions([source],prefs,now),null,'availability elsewhere cannot stand in for Romania');
 source.regions.RO=offer('US');
 assert.equal(countryOptions([source],prefs,now),null,'country label does not override a US source URL');
 source.regions.RO=offer('RO');
 const verified=countryOptions([source],prefs,now);
 assert.equal(verified.country,'RO');assert.equal(verified.sourceUrl,offer('RO').link);
 assert.deepEqual(verified.offers,[{provider:'Netflix',access:'subscription'}]);
 assert.equal(countryOptions([{...source,checkedAt:new Date(now-4*86400000).toISOString()}],prefs,now),null);
 assert.equal(countryOptions([source],validatePrefs({country:'RO',providers:['Hulu']}),now),null);
});

test('Quick Together sends the host country for a shared screen and the guest country for separate screens',async()=>{
 for(const viewingMode of ['shared','separate']){
  const app=await boot({country:'Norway',region:'Oslo',invite:true,viewingMode});
  try{
   assert.equal(app.calls[0].action,'preview');
   app.chooseStep();
   if(viewingMode==='shared')assert.equal(app.countrySelect(),null,'shared-screen note uses the host viewing country');
   else assert.equal(app.countrySelect().value,'NO');
   app.click('find');await settle();
   const join=app.calls.find(call=>call.action==='join');assert.ok(join);
   assert.equal(join.prefs.country,viewingMode==='shared'?'RO':'NO');
  }finally{app.dom.window.close();}
 }
});
