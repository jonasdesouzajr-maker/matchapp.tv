'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {stampDiscoveryAssets,stampPublicHtml}=require('../tools/stamp-discovery-assets.cjs');
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
