'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const profile=fs.readFileSync('profile/profile.html','utf8');
const settings=fs.readFileSync('settings.js','utf8');
const changed=['/legal-kit.js','/taste-profile.js','/profile-history.js','/registration-upgrade.js'];

test('profile details language helper executes before the dynamic account loaders',()=>{
  const dom=new JSDOM(profile,{url:'https://matchapp.tv/profile/profile.html'});
  try{
    const scripts=[...dom.window.document.scripts];
    const helper=scripts.filter(s=>new URL(s.src||'about:blank').pathname==='/profile-details-i18n.js');
    const loader=scripts.find(s=>new URL(s.src||'about:blank').pathname==='/settings.js');
    assert.equal(helper.length,1);
    assert(scripts.indexOf(helper[0])<scripts.indexOf(loader));
    assert.equal(helper[0].hasAttribute('async'),false);
    assert.equal(helper[0].hasAttribute('defer'),false);
    assert.equal(new URL(helper[0].src).searchParams.get('v'),'20261018-1');
    for(const file of ['/settings.js','/profile-geography.js','/registration-upgrade.js','/profile.js']){
      const script=scripts.find(s=>new URL(s.src||'about:blank').pathname===file);
      assert.equal(new URL(script.src).searchParams.get('details'),'20261018-1',file);
    }
  }finally{dom.window.close();}
});

for(const route of ['/profile/profile.html','/ebooks/']){
  test('settings loads current account copy only on its profile route: '+route,()=>{
    const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only'});
    try{
      dom.window.eval(settings);
      const urls=[...dom.window.document.scripts].map(s=>new URL(s.src));
      for(const file of changed){
        const url=urls.find(u=>u.pathname===file);
        if(route==='/profile/profile.html')assert.equal(url?.searchParams.get('details'),'20261018-1',file);
        else if(url)assert.equal(url.searchParams.has('details'),false,file);
      }
      const guarantee=urls.find(u=>u.pathname==='/match-guarantee.js');
      assert.equal(guarantee.searchParams.get('matching'),'20260928-session1');
      assert.equal(guarantee.searchParams.has('details'),false);
    }finally{dom.window.close();}
  });
}
