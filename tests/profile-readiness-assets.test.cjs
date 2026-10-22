'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const isolated=fs.existsSync(path.join(root,'candidate','app.js'));
const sourceRoot=isolated?path.join(root,process.env.MATCHAPP_READINESS_SOURCE||'candidate'):root;
const fixtureRoot=isolated?path.join(root,'baseline'):root;
const read=file=>fs.readFileSync(path.join(fs.existsSync(path.join(sourceRoot,file))?sourceRoot:fixtureRoot,file),'utf8');
const version='20261022-1';
const htmlPaths=['callback.html','discover.html','ebooks/index.html','events-archive.html','friends.html','index.html','oauth/consent.html','pricing/pricing.html','profile/profile.html','purchase.html','together.html','platforms/roku-channel/index.html'];
const scriptURLs=html=>[...html.matchAll(/\bsrc=(['"])(\/(?:app|profile)\.js(?:\?[^'"]*)?)\1/g)].map(match=>match[2].replace(/&amp;/g,'&'));
const finalizer=read('tools/finalize-brand.js');
const start=finalizer.indexOf('function withQueryParams('),end=finalizer.indexOf('function name(',start);
assert(start>=0&&end>start,'actual runtime URL normalizer is available');
const context=vm.createContext({URLSearchParams});
vm.runInContext(finalizer.slice(start,end)+'\nthis.normalize=versionReferenceRuntimeAssets;',context,{filename:'tools/finalize-brand.js'});
const normalize=url=>scriptURLs(context.normalize('<script src="'+url.replace(/&/g,'&amp;')+'"></script>'))[0];

test('shipped app/profile loaders deliver the readiness repair on each existing entry point',()=>{
  let appCount=0,profileCount=0;
  for(const file of htmlPaths){
    const urls=scriptURLs(read(file));
    assert.equal(urls.length,file==='profile/profile.html'?2:1,file+' loader count');
    for(const value of urls){
      const url=new URL(value,'https://matchapp.tv');
      assert.deepEqual(url.searchParams.getAll('readiness'),[version],file+' cache key');
      if(url.pathname==='/app.js')appCount++;else profileCount++;
    }
  }
  assert.equal(appCount,12);assert.equal(profileCount,1);
});

test('the shared generator normalizer refreshes legacy archive and Roku app loaders',()=>{
  for(const file of ['tools/build-global-events.js','tools/build-roku-page.js']){
    const urls=scriptURLs(read(file));assert.equal(urls.length,1,file+' emitted loader');
    const before=new URL(urls[0],'https://matchapp.tv');
    const after=new URL(normalize(urls[0]),'https://matchapp.tv');
    assert.deepEqual(after.searchParams.getAll('readiness'),[version]);
    for(const [key,value]of before.searchParams){
      if(['androidqa','art','dialogs','readiness'].includes(key))continue;
      assert.equal(after.searchParams.get(key),value,file+' preserves '+key);
    }
  }
});

test('readiness normalization is idempotent and preserves existing versions, queries and fragments',()=>{
  for(const file of ['app.js','profile.js']){
    const input='/'+file+'?v=original&route=profile%20view&readiness=older#saved';
    const once=normalize(input),url=new URL(once,'https://matchapp.tv');
    assert.equal(normalize(once),once);
    assert.equal(url.searchParams.get('v'),'original');
    assert.equal(url.searchParams.get('route'),'profile view');
    assert.deepEqual(url.searchParams.getAll('readiness'),[version]);
    assert.equal(url.hash,'#saved');
  }
});

test('the readiness cache key does not spread to unchanged scripts, styles or external URLs',()=>{
  const inputs=['/settings.js?v=kept','/portfolio-history.js?v=kept','/patches/reference-system.js?v=kept','/brand.css?v=kept','https://cdn.example/app.js?v=kept','/unrelated.js?v=kept'];
  for(const input of inputs){
    const html='<script src="'+input+'"></script>',output=context.normalize(html);
    assert(!output.includes('readiness='),input);
    if(input.startsWith('https://')||input.startsWith('/unrelated.js'))assert.equal(output,html);
  }
});
