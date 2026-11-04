'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {stampLocaleHtml,stampLocaleRuntime,stampPublicHtml}=require('../tools/stamp-discovery-assets.cjs');
const manifest=require('../tools/locale-assets-71.json');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const assets=new Set([...manifest.assets,...manifest.loaderAncestors]);
const url=value=>new URL(value,'https://matchapp.tv/');
function sameExistingParameters(before,after) {
  const old=url(before),fresh=url(after);
  assert.equal(fresh.pathname,old.pathname);
  assert.equal(fresh.hash,old.hash);
  for(const key of new Set(old.searchParams.keys()))
    if(key!=='locale71')assert.deepEqual(fresh.searchParams.getAll(key),old.searchParams.getAll(key),key);
  assert.deepEqual(fresh.searchParams.getAll('locale71'),['1']);
}

test('locale preloads and scripts share one fresh URL without changing other requests',()=>{
  const html='<link rel="preload" as="script" href="/i18n.js?v=old&amp;flag=a%2Bb#part">'+
    '<script src="/i18n.js?v=old&amp;flag=a%2Bb&amp;locale71=0#part"></script>'+
    '<script src="/ads-init.js?v=locked"></script><script src="https://cdn.example/i18n.js?v=external"></script>'+
    '<link rel="stylesheet" href="/settings.css?v=keep"><a href="/i18n.js?v=download">source</a>';
  const stamped=stampLocaleHtml(html),dom=new JSDOM(stamped,{url:'https://matchapp.tv/'});
  try {
    const preload=dom.window.document.querySelector('link[as="script"]');
    const script=dom.window.document.querySelector('script');
    assert.equal(preload.href,script.src);
    sameExistingParameters('/i18n.js?v=old&flag=a%2Bb#part',script.src);
    assert(stamped.includes('<script src="/ads-init.js?v=locked"></script>'));
    assert(stamped.includes('https://cdn.example/i18n.js?v=external'));
    assert(stamped.includes('/settings.css?v=keep'));
    assert(stamped.includes('<a href="/i18n.js?v=download">source</a>'));
    assert.equal(stampLocaleHtml(stamped),stamped);
  } finally {dom.window.close();}
});

test('pricing, together and purchase receive every changed locale dependency on publication',()=>{
  for(const file of ['pricing/pricing.html','together.html','purchase.html']) {
    const before=new JSDOM(read(file),{url:'https://matchapp.tv/'+file});
    const after=new JSDOM(stampLocaleHtml(read(file),file),{url:'https://matchapp.tv/'+file});
    try {
      const old=[...before.window.document.querySelectorAll('script[src]')];
      const fresh=[...after.window.document.querySelectorAll('script[src]')];
      assert.equal(fresh.length,old.length);
      let changed=0;
      old.forEach((script,index)=>{
        if(assets.has(new URL(script.src).pathname.slice(1))) {
          sameExistingParameters(script.src,fresh[index].src);
          changed++;
        } else assert.equal(fresh[index].src,script.src);
      });
      assert(changed>=3,file+' must exercise real locale dependencies');
      assert(fresh.some(script=>new URL(script.src).pathname==='/i18n.js'));
    } finally {before.window.close();after.window.close();}
  }
});

function requestFromLoader(source,target) {
  const found=source.match(/function js\(src\)\{[\s\S]*?document\.head\.appendChild\(s\);?\}/);
  assert(found,'real js(src) loader is present');
  const requests=[];
  const context={
    V:'base-version',NEWS_V:'news-version',
    location:{pathname:'/profile/profile.html'},
    document:{querySelector:()=>null,createElement:()=>({}),head:{appendChild:node=>requests.push(node.src)}}
  };
  vm.runInNewContext(found[0]+';js('+JSON.stringify(target)+');',context);
  assert.equal(requests.length,1);
  return requests[0];
}

test('warm cache cannot keep old children behind settings or final-wiring, and path branches survive',()=>{
  const cases={
    'settings.js':['/activity.js','/ai-composer.js','/experience-v2.js','/legal-kit.js','/locale-results.js','/match-guarantee.js','/onboarding-tour.js','/taste-profile.js'],
    'final-wiring.js':['/brand-corrections.js','/catalog-media.js','/install-corner.js','/install-device-choice.js','/latest-news.js','/live-news-loader.js','/news-images.js','/production-hardening.js','/weekly-pick.js']
  };
  for(const [file,children] of Object.entries(cases)) {
    const original=read(file),stamped=stampLocaleRuntime(original,file);
    assert.equal(stampLocaleRuntime(stamped,file),stamped);
    for(const child of children) {
      const stale=requestFromLoader(original,child),fresh=requestFromLoader(stamped,child);
      sameExistingParameters(stale,fresh);
      const warmCache=new Map([[stale,'old fourteen-language bytes']]);
      assert.equal(warmCache.get(fresh),undefined,'must request fresh bytes for '+child);
    }
    const unchanged=file==='settings.js'?'/notifications.js':'/shown-history.js';
    assert.equal(requestFromLoader(stamped,unchanged),requestFromLoader(original,unchanged));
  }
  const settings=stampLocaleRuntime(read('settings.js'),'settings.js');
  const legal=url(requestFromLoader(settings,'/legal-kit.js'));
  assert.equal(legal.searchParams.get('details'),'20261018-1');
  assert.equal(legal.searchParams.get('dialogs'),'20261020-1');
  assert.equal(url(requestFromLoader(settings,'/match-guarantee.js')).searchParams.get('matching'),'20260928-session1');
});

test('direct loader URLs preserve expressions and pathname identity checks',()=>{
  const reference=stampLocaleRuntime(read('patches/reference-system.js'),'patches/reference-system.js');
  const expression=reference.match(/dialogScript\.src=([^;]+);/)[0];
  const context={dialogScript:{},dialogVersion:'20261020-1'};
  vm.runInNewContext(expression,context);
  assert.equal(url(context.dialogScript.src).searchParams.get('v'),'20261020-1');
  assert.equal(url(context.dialogScript.src).searchParams.get('locale71'),'1');
  const ambient=stampLocaleRuntime(read('jonas/android-ambient-assistant-20261011.js'),'jonas/android-ambient-assistant-20261011.js');
  assert(ambient.includes("pathname==='/app.js'"),'route identity must stay unversioned');
  assert(ambient.includes('/jonas/secure-speech-20261010.js?locale71=1&v='));
  for(const file of ['build-meta.js','final-wiring.js','patches/jonas-adult-page.js',
    'patches/reference-system.js','settings.js','title-captions.js','ebooks/reading-ai.js',
    'jonas/android-ambient-assistant-20261011.js']) {
    const stamped=stampLocaleRuntime(read(file),file);
    assert.notEqual(stamped,read(file),file+' must publish fresh child URLs');
    assert.equal(stampLocaleRuntime(stamped,file),stamped);
    new vm.Script(stamped,{filename:file});
  }
  assert.equal(stampLocaleRuntime("import('/jonas/message-language.mjs?v=old')",'discover.js'),
    "import('/jonas/message-language.mjs?locale71=1&v=old')");
});

test('distribution is idempotent and leaves separate products, sensitive callbacks and ad assets byte-identical',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ma-locale71-cache-'));
  const protectedFiles=['kids/index.html','lumina-match/index.html','reelforge/index.html',
    'oauth/index.html','private-voice/index.html','android-studio/index.html','reports/index.html',
    'tests/index.html','tools/index.html','callback.html','confirm.html','ads-init.js','unchanged.js','layout.css'];
  const fixture='<script src="/i18n.js?v=old"></script><script src="/ads-init.js?v=locked"></script>';
  function put(file,content) {
    fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});
    fs.writeFileSync(path.join(dir,file),content);
  }
  try {
    for(const file of protectedFiles)put(file,fixture);
    put('pricing/pricing.html',read('pricing/pricing.html'));
    put('settings.js',read('settings.js'));
    put('build-meta.js',read('build-meta.js'));
    put('final-wiring.js',read('final-wiring.js'));
    assert(stampPublicHtml(dir)>=4);
    assert.equal(stampPublicHtml(dir),0);
    for(const file of protectedFiles)assert.equal(fs.readFileSync(path.join(dir,file),'utf8'),fixture,file);
    assert.equal(stampLocaleHtml(fixture,'oauth/index.html'),fixture);
    assert.equal(stampLocaleHtml(fixture,'callback.html'),fixture);
    for(const file of assets) {
      assert(!/^(?:kids|lumina-match|reelforge|oauth|private-voice|android-studio|supabase|tools|tests|reports)\//.test(file),file);
      assert(fs.existsSync(path.join(root,file)),file);
    }
    assert(!assets.has('ads-init.js'));
    assert(!assets.has('channels/discovery.js'),'content-hashed assets keep their existing owner');
    assert.deepEqual(manifest.loaderAncestors,['build-meta.js','final-wiring.js','patches/jonas-adult-page.js']);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
