const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const countries=JSON.parse(read('profile-geography.js').match(/^const DATA=(.*);$/m)[1]);
function boot(url='https://matchapp.tv/discover.html'){
  const dom=new JSDOM('<!doctype html><html lang="en"><body></body></html>',{url,runScripts:'outside-only'});
  const w=dom.window;
  w.eval(read('viewer-country.js'));
  w.eval(read('catalog-media.js'));
  return {dom,w,api:w.MatchAppCatalogMedia};
}

test('all 249 registered countries retain their viewing country in every selected language',()=>{
  const {dom,w,api}=boot();
  try{
    assert.equal(countries.length,249);
    for(const [name,code,states] of countries){
      assert.equal(api.resolveCountryCode(name),code,name);
      assert.equal(api.resolveCountryCode(code.toLowerCase()),code,code);
      w.localStorage.setItem('match_user_country',name);
      w.localStorage.setItem('match_user_region',states[0]||'');
      for(const lang of ['en','pt-BR','es','de','ja']){
        w.MATCH_LANG=lang;
        assert.equal(api.regionCode(),code,`${name} / ${states[0]} / ${lang}`);
      }
    }
  }finally{dom.window.close();}
});

test('legacy explicit viewing countries resolve consistently while real subdivisions are never countries',()=>{
  const {dom,w,api}=boot();
  try{
    for(const [value,code] of [['Brasil','BR'],['U.S.A.','US'],['U.K.','GB'],['South Korea','KR'],['Russia','RU'],['Côte d’Ivoire','CI']])assert.equal(api.resolveCountryCode(value),code);
    w.localStorage.setItem('match_user_country','Brazil');
    w.localStorage.setItem('match_user_region','NO');
    assert.equal(api.regionCode(),'NO');
    for(const state of ['Ba','Ra']){
      w.localStorage.setItem('match_user_country','Fiji');
      w.localStorage.setItem('match_user_region',state);
      assert.equal(api.regionCode(),'FJ');
    }
    w.localStorage.setItem('match_user_country','Slovenia');
    w.localStorage.setItem('match_user_region','Ig');
    assert.equal(api.regionCode(),'SI');
    for(const value of ['ZZ','XX','not a country','São Paulo'])assert.equal(api.resolveCountryCode(value),'');
  }finally{dom.window.close();}
});

test('unknown adult country stays unknown and never becomes the interface or browser language',()=>{
  const {dom,w,api}=boot();
  try{
    for(const lang of ['en','pt-BR','es','ar','hi','zh']){
      w.MATCH_LANG=lang;
      assert.equal(api.regionCode(),'');
    }
    w.localStorage.setItem('match_user_country','Unrecognised country');
    w.localStorage.setItem('match_user_region','ZZ');
    assert.equal(api.regionCode(),'');
  }finally{dom.window.close();}
});

test('source origin and language never select a provider row, and a country change reuses only the right row',()=>{
  const {dom,w,api}=boot();
  try{
    const meta={tmdb_id:10,media_kind:'movie',origin_countries:['JP'],availability:{
      NO:{stream:['Netflix'],link:'https://www.themoviedb.org/movie/10/watch?locale=NO'},
      AT:{stream:['Prime Video'],link:'https://www.themoviedb.org/movie/10/watch?locale=AT'},
      BR:{stream:['Globoplay']},US:{stream:['Hulu']}
    }};
    w.localStorage.setItem('match_user_country','Norway');w.MATCH_LANG='pt-BR';
    assert.equal(api.viewingTarget(meta,'Exact title').provider,'Netflix');
    assert.equal(api.availability(meta).region,'NO');
    w.localStorage.setItem('match_user_country','Austria');w.MATCH_LANG='en';
    assert.equal(api.viewingTarget(meta,'Exact title').provider,'Prime Video');
    assert.equal(api.availability(meta).region,'AT');
    w.localStorage.clear();
    assert.equal(api.viewingTarget(meta,'Exact title').mode,'guide');
    assert.equal(api.providerLinks(meta,'Exact title').length,0);
  }finally{dom.window.close();}
});

test('unknown country offers the guest country picker without invalid provider or notification actions',()=>{
  const {dom,w,api}=boot();
  try{
    const host=w.document.createElement('div');w.document.body.append(host);
    const meta={title:'Exact title',tmdb_id:10,media_kind:'movie',genres:['Comedy'],availability:{US:{stream:['Hulu']}}};
    for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
      w.MATCH_LANG=lang;w.localStorage.setItem('match_lang',lang);
      api.renderAvailability(host,meta);
      const prompt=host.querySelector('.matchapp-availability-status a');
      assert.equal(prompt?.getAttribute('href'),'/#matchapp-viewer-country');
      assert(prompt.textContent.length>15,lang);
      assert.equal(host.querySelector('.matchapp-follow-availability'),null);
      assert.equal(host.querySelector('.matchapp-provider-actions'),null);
    }
  }finally{dom.window.close();}
});

test('the separately owned Kids country fallback remains unchanged',()=>{
  const {dom,w,api}=boot('https://matchapp.tv/kids/');
  try{
    w.MATCH_LANG='pt-BR';assert.equal(api.regionCode(),'BR');
    w.MATCH_LANG='en';assert.equal(api.regionCode(),'US');
  }finally{dom.window.close();}
});

test('documentary source fallback honors explicit viewing country separately from requested origin',async()=>{
  const {dom,w,api}=boot();
  try{
    let calls=0;
    const source={title:'Verified documentary',tmdb_id:7,media_kind:'tv',year:2024,
      genres:['Documentary'],origin_countries:['BR'],overview:'Verified source synopsis.',
      poster_url:'https://image.tmdb.org/t/p/w500/exact.jpg',availability:{
        NO:{stream:['Netflix'],link:'https://www.themoviedb.org/tv/7/watch?locale=NO'},
        BR:{stream:['Globoplay'],link:'https://www.themoviedb.org/tv/7/watch?locale=BR'}
      }};
    w.MatchAppCatalogMedia={...api,lookupLive:async()=>source};
    w.supabaseClient={functions:{invoke:async()=>{calls++;return {data:{results:[{title:source.title,tmdbId:7,kind:'tv',genreIds:[99]}]}};}}};
    w.eval(read('jonas/verified-documentary-series-20261011.js'));
    w.localStorage.setItem('match_user_country','Brazil');w.MATCH_LANG='pt-BR';
    const result=await w.MatchAppVerifiedDocumentaries.resolve('Brazilian documentary series available in Norway on Netflix',{country:'Brazil'});
    assert.equal(result.results.length,1);
    assert.equal(result.results[0]._verifiedDocRegion,'NO');
    assert.equal(result.results[0].platform,'Netflix');
    assert.equal(w.localStorage.getItem('match_user_country'),'Brazil');
    w.localStorage.clear();
    const before=calls;
    const unknown=await w.MatchAppVerifiedDocumentaries.resolve('Documentary series',{lang:'pt-BR'});
    assert.equal(unknown.results.length,0);
    assert.equal(calls,before,'Unknown country does not make a regionless provider request');
  }finally{dom.window.close();}
});
