const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=(p,encoding='utf8')=>fs.readFileSync(path.join(root,p),encoding);
const android='android-studio/',assets=android+'app/src/main/assets/',kit=android+'play/release-1.1.72/';
const source=require('../channels/copy.json');
test('each native Explore edition uses the channel names visitors see on the destination page',()=>{
 const copy=JSON.parse(read(assets+'native-explore.json'));
 assert.deepEqual(Object.keys(copy).sort(),Object.keys(source).sort());
 for(const [lang,text] of Object.entries(copy)){
  assert.equal(text.tech,source[lang].tech);assert.equal(text.trail,source[lang].trail);
  for(const field of ['pick','heading','close','all','matchHint','techHint','trailHint'])assert.ok(text[field]?.trim(),lang+' '+field);
 }
});
test('new Play artwork and 15 localized listings meet upload dimensions and text limits',()=>{
 const icon=read(android+'play/refresh-20261110/artwork/matchapp-ai-play-512.png',null),feature=read(android+'play/refresh-20261104/artwork/feature-graphic.png',null);
 for(const [image,w,h] of [[icon,512,512],[feature,1024,500]]){assert.equal(image.readUInt32BE(16),w);assert.equal(image.readUInt32BE(20),h);}
 assert.ok(icon.length<=1024*1024);assert.ok(icon.equals(read(android+'play/icon-512.png',null)),'Current Play icon must match the release artwork');
 for(const locale of ['en-US','pt-BR','es-419','fr-FR','de-DE','it-IT','tr-TR','ru-RU','ar','hi-IN','id','ja-JP','ko-KR','zh-CN','zh-TW']){
  assert.equal(read(kit+locale+'/title.txt').trim(),'MatchApp Ai');
  for(const [key,limit] of [['short-description',80],['full-description',4000],['release-notes',500]]){
   const text=read(kit+locale+'/'+key+'.txt').trim();assert.ok(text.length>0 && [...text].length<=limit,locale+' '+key);
  }
 }
});