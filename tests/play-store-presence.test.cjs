'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').trim();

test('Play store presence keeps the adult brand, limits and first-party support targets',()=>{
  const cfg=JSON.parse(read('android-studio/play/store-presence.json'));
  assert.equal(cfg.packageName,'com.jonas.papercup');
  assert.equal(cfg.appName,'MatchApp Ai');
  assert.equal(cfg.targetCategory,'ENTERTAINMENT');
  assert.equal(cfg.supportWebsite,'https://matchapp.tv/');
  assert.equal(cfg.privacyPolicy,'https://matchapp.tv/privacy.html');
  assert.equal(cfg.supportEmail,'support@matchapp.tv');
  assert.ok(fs.existsSync(path.join(root,'privacy.html')));
  for(const locale of ['en-US','pt-BR']){
    const title=read('android-studio/play/store-listing/'+locale+'/title.txt');
    const short=read('android-studio/play/store-listing/'+locale+'/short-description.txt');
    const full=read('android-studio/play/store-listing/'+locale+'/full-description.txt');
    assert.equal(title,'MatchApp Ai',locale+' exact brand');
    assert.ok(title.length<=30,locale+' Play title limit');
    assert.ok(short.length<=80,locale+' Play short-description limit');
    assert.ok(full.length<=4000,locale+' Play full-description limit');
    assert.doesNotMatch(title,/MatchApp iA/);
    assert.doesNotMatch(full,/#1|best of play|app of the year/i);
  }
  assert.match(read('android-studio/play/store-listing/pt-BR/full-description.txt'),/O MatchApp Ai/);
});
