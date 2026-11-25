'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
test('site audit closes page DOMs while preserving exact fragment and failure checks',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-audit-'));
 try{
  fs.mkdirSync(path.join(root,'tools'));
  fs.copyFileSync(path.join(__dirname,'../tools/audit-site.js'),path.join(root,'tools/audit-site.js'));
  fs.writeFileSync(path.join(root,'sitemap.xml'),'<urlset><url><loc>https://matchapp.tv/</loc></url></urlset>');
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({icons:[]}));
  fs.writeFileSync(path.join(root,'index.html'),'<a href="/other.html#named">legacy</a><a href="/other.html#quote%22%5D">literal</a><a href="/other.html#missing">missing</a><a href="/other.html#quote%22%5Dmissing">missing literal</a><img src="/missing.png"><div id="same"></div><div id="same"></div><script type="application/ld+json">{bad}</script>');
  fs.writeFileSync(path.join(root,'other.html'),'<a name="named"></a><div id="quote&quot;]"></div><a href="/index.html#same">back</a>');
  const result=spawnSync(process.execPath,['--max-old-space-size=128',path.join(root,'tools/audit-site.js')],{encoding:'utf8',env:{...process.env,NODE_PATH:path.dirname(path.dirname(require.resolve('jsdom/package.json')))}});
  assert.equal(result.status,1,result.stderr||result.stdout);
  const report=JSON.parse(fs.readFileSync(path.join(root,'audit-results.json'),'utf8'));
  assert.equal(report.html,2);
  assert.deepEqual(report.issues.filter(x=>x.kind==='missing-fragment').map(x=>x.detail),['/other.html#missing','/other.html#quote%22%5Dmissing']);
  assert.equal(report.issues.filter(x=>x.kind==='duplicate-id').length,1);
  assert.equal(report.issues.filter(x=>x.kind==='missing-local').length,1);
  assert.equal(report.issues.filter(x=>x.kind==='structured-data').length,1);
  assert.equal(report.issues.length,5);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
