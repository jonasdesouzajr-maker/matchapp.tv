'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const vm=require('node:vm');
const {stampDiscoveryAssets,stampLocaleRuntime,stampSourceCreditHtml,stampSourceCreditRuntime,stampPublicHtml}=require('../tools/stamp-discovery-assets.cjs');
const root=path.join(__dirname,'..');

test('published script URLs track the actual feedback and shopping bytes while keeping existing query keys',()=>{
  for(const url of ['/channels/labels.js','/channels/discovery.js','/patches/immersive-feedback-20261014.js']) {
    const revision=createHash('sha256').update(fs.readFileSync(path.join(root,url))).digest('hex').slice(0,12);
    const original='<script defer src="'+url+'?v=3&amp;dock=keep"></script>';
    const stamped=stampDiscoveryAssets(original);
    assert.equal(stamped,original.replace('dock=keep','dock=keep&amp;assetrev='+revision));
    assert.equal(stampDiscoveryAssets(stamped),stamped);
    assert.equal(stampDiscoveryAssets(stamped.replace(revision,'stale')),stamped);
  }
});
test('distribution stamps adult runtime references without modifying fixtures, other apps or unrelated URLs',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ma-discovery-cache-'));
  try {
    const html='<script src="/channels/discovery.js"></script><script src="/another/discovery.js?v=1"></script>';
    for(const name of ['explore','kids','android-studio','tests']) {
      fs.mkdirSync(path.join(dir,name));fs.writeFileSync(path.join(dir,name,'index.html'),html);
    }
    assert.equal(stampPublicHtml(dir),1);
    assert.equal(stampPublicHtml(dir),0);
    assert.equal(fs.readFileSync(path.join(dir,'explore/index.html'),'utf8'),stampDiscoveryAssets(html));
    assert.ok(stampDiscoveryAssets(html).includes('src="/another/discovery.js?v=1"'));
    for(const name of ['kids','android-studio','tests'])
      assert.equal(fs.readFileSync(path.join(dir,name,'index.html'),'utf8'),html);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('source-credit release refreshes exact runtime requests and preserves parameters and fragments',()=>{
  for(const url of ['/catalog-media.js','/discover.js','/ebooks/ebook-matcher.js','/ebooks/reading-ai.js','/source-credits-browser.mjs']){
    const original='<script defer src="'+url+'?v=old&amp;sourcecredit=stale&amp;keep=a%2Bb#part"></script>';
    const stamped=stampSourceCreditHtml(original,'discover.html');
    assert.equal(stamped,'<script defer src="'+url+'?sourcecredit=20261105-2&amp;v=old&amp;keep=a%2Bb#part"></script>');
    assert.equal(stampSourceCreditHtml(stamped,'discover.html'),stamped);
    const preload='<link rel="preload" as="script" href="'+url+'?v=old">';
    assert.match(stampSourceCreditHtml(preload),/sourcecredit=20261105-2&amp;v=old/);
  }
  const unrelated='<script src="https://example.test/catalog-media.js?v=old"></script><script src="/ads-init.js?v=locked"></script><a href="/discover.js">source</a>';
  assert.equal(stampSourceCreditHtml(unrelated),unrelated);
  const ancestor='<script src="/build-meta.js?v=keep"></script>';
  for(const file of ['index.html','discover.html','together.html'])assert.match(stampSourceCreditHtml(ancestor,file),/sourcecredit=20261105-2/);
  for(const file of ['about.html','ebooks/index.html','profile/profile.html','events/sample/index.html'])assert.equal(stampSourceCreditHtml(ancestor,file),ancestor);
});

test('source-credit distribution refreshes both lazy-loader chains without changing loader branches',()=>{
  for(const file of ['build-meta.js','ebooks/reading-ai.js']){
    const source=fs.readFileSync(path.join(root,file),'utf8');
    const stamped=stampSourceCreditRuntime(stampLocaleRuntime(source,file),file);
    assert.equal(stampSourceCreditRuntime(stampLocaleRuntime(stamped,file),file),stamped);
    const target=file==='build-meta.js'?'final-wiring.js':'ebooks/ebook-matcher.js';
    assert.ok(stamped.includes('/'+target+'?sourcecredit=20261105-2&locale71=1&v='));
  }
  const file='final-wiring.js',source=fs.readFileSync(path.join(root,file),'utf8');
  const stamped=stampSourceCreditRuntime(stampLocaleRuntime(source,file),file);
  assert.equal(stampSourceCreditRuntime(stampLocaleRuntime(stamped,file),file),stamped);
  const loader=stamped.slice(stamped.indexOf('function js(src){'),stamped.indexOf('\n  function upsertMeta'));
  const appended=[];
  const document={
    querySelector(selector){const expected=selector.match(/src\^="([^"]+)"/)?.[1];return appended.find(s=>s.src.startsWith(expected));},
    createElement(){return {src:'',setAttribute(key,value){this[key]=value;},getAttribute(key){return this[key];}};},
    head:{appendChild(s){appended.push(s);}}
  };
  const js=vm.runInNewContext(loader+'\njs',{document,V:'unchanged',NEWS_V:'news'});
  js('/catalog-media.js');js('/catalog-media.js');js('/weekly-pick.js');
  assert.equal(appended.length,2,'existing duplicate-load detection remains effective');
  const catalog=new URL(appended[0].src,'https://matchapp.tv');
  assert.deepEqual(catalog.searchParams.getAll('sourcecredit'),['20261105-2']);
  assert.equal(catalog.searchParams.get('v'),'unchanged');
  assert.equal(catalog.searchParams.get('androidqa'),'20261021-1');
  assert.equal(catalog.searchParams.get('repair'),'20261023-1');
  assert.equal(appended[0].async,false);assert.equal(appended[0].defer,true);
  assert.equal(new URL(appended[1].src,'https://matchapp.tv').searchParams.has('sourcecredit'),false);
  assert.equal(stampSourceCreditRuntime("script.src='/ebooks/ebook-matcher.js?v='+version;",'ebooks/reading-ai.js'),
    "script.src='/ebooks/ebook-matcher.js?sourcecredit=20261105-2&v='+version;");
});

test('source-credit distribution is idempotent and preserves excluded products, callbacks and ad assets',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ma-source-credit-cache-'));
  const fixture='<script src="/catalog-media.js?v=old"></script><script src="/build-meta.js?v=old"></script><script src="/ads-init.js?v=locked"></script><script>import("/source-credits-browser.mjs?v=20261105-1")</script>';
  const protectedFiles=['kids/index.html','android-studio/index.html','lumina-match/index.html','reelforge/index.html','oauth/index.html','private-voice/index.html','artifacts/index.html','reports/index.html','tests/index.html','tools/index.html','callback.html','confirm.html','ads-init.js'];
  const put=(name,content)=>{fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true});fs.writeFileSync(path.join(dir,name),content);};
  try{
    for(const file of protectedFiles)put(file,fixture);
    for(const file of ['index.html','discover.html','together.html','about.html','where-to-watch/example/index.html'])put(file,fixture);
    for(const file of ['build-meta.js','final-wiring.js','ebooks/reading-ai.js'])put(file,fs.readFileSync(path.join(root,file),'utf8'));
    const helperCallers=['catalog-media.js','ebooks/ebook-matcher.js','copyright.html'];
    for(const file of helperCallers)put(file,fs.readFileSync(path.join(root,file),'utf8'));
    assert.equal(stampPublicHtml(dir),11);
    assert.equal(stampPublicHtml(dir),0);
    for(const file of protectedFiles)assert.equal(fs.readFileSync(path.join(dir,file),'utf8'),fixture,file);
    for(const file of helperCallers){
      const result=fs.readFileSync(path.join(dir,file),'utf8');
      assert.ok(result.includes("import('/source-credits-browser.mjs?sourcecredit=20261105-2&v=20261105-1')"),file);
      assert.ok(!result.includes("import('/source-credits-browser.mjs?v=20261105-1')"),file);
    }
    for(const file of ['index.html','discover.html','together.html'])assert.match(fs.readFileSync(path.join(dir,file),'utf8'),/build-meta\.js\?sourcecredit=20261105-2/);
    for(const file of ['about.html','where-to-watch/example/index.html']){
      const result=fs.readFileSync(path.join(dir,file),'utf8');
      assert.match(result,/catalog-media\.js\?sourcecredit=20261105-2/);
      assert.doesNotMatch(result,/build-meta\.js\?sourcecredit=/);
      assert.ok(result.includes('/ads-init.js?v=locked'));
    }
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
