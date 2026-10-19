'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {JSDOM}=require('jsdom');
const {buildPilot}=require('../tools/build-growth-watch-pilot.cjs');
const ROOT=path.resolve(__dirname,'..');
const regions={BR:'Brazil',US:'United States',GB:'United Kingdom',PT:'Portugal'};
const description=file=>{const dom=new JSDOM(fs.readFileSync(file,'utf8'));try{return dom.window.document.querySelector('meta[name="description"]').content;}finally{dom.window.close();}};

test('regional watch hub descriptions identify their country and survive the owning generator',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'regional-hub-meta-'));
  try{
    fs.mkdirSync(path.join(dir,'data'));
    fs.writeFileSync(path.join(dir,'data/poster-identities.json'),JSON.stringify([{tmdbId:126308,kind:'tv',year:2024,poster:'https://image.tmdb.org/t/p/w780/fixture.jpg'}]));
    const generated=new Date().toISOString();
    const data={generated,titles:{Shogun:{kind:'tv',tmdbId:126308,year:2024,regions:Object.fromEntries(Object.keys(regions).map(code=>[code,{checkedAt:generated,stream:['Verified provider'],link:'https://www.themoviedb.org/tv/126308/watch?locale='+code}]))}}};
    const result=buildPilot({root:dir,origin:'https://matchapp.tv',catalog:[{title:'Shogun',year:2024,synopsis:'A political thriller set in feudal Japan following a shipwrecked English sailor caught in an intricate political power struggle.'}],data});
    assert.equal(result.hubs,5);
    const descriptions=[];
    for(const [code,name] of Object.entries(regions)){
      const route=path.join('en',code.toLowerCase(),'watch/index.html');
      const actual=description(path.join(dir,route));
      assert.ok(actual.includes(name));
      assert.ok(actual.length>=50&&actual.length<=160);
      assert.equal(actual,description(path.join(ROOT,route)),route+' stays synchronized with the generator');
      assert.doesNotMatch(actual,/free streaming|all movies|guaranteed/i);
      descriptions.push(actual);
    }
    assert.equal(new Set(descriptions).size,4);
    const ptRoute=path.join('pt/br/watch/index.html');
    assert.equal(description(path.join(dir,ptRoute)),description(path.join(ROOT,ptRoute)),'Portuguese keeps its existing authored metadata');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
