'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages=['index.html','explore.html','how-it-works.html','discover.html','music.html',
'together.html','friends.html','cooking/index.html','ebooks/index.html','news/index.html',
'profile/profile.html','pricing/pricing.html','about.html','contact.html','privacy.html',
'terms.html','where-to-watch/index.html','android/index.html'];
test('18 main adult routes enable lightweight sensory feedback, Kids is excluded',()=>{
 for(const file of pages){
  const body=read(file);
  assert.match(body, /<script defer src="\/patches\/immersive-feedback-20261014\.js\?v=immersive1"><\/script>/,file);
  assert.equal((body.match(/immersive-feedback-20261014\.js/g)||[]).length,1,file);
 }
 assert.doesNotMatch(read('kids/index.html'),/immersive-feedback-20261014\.js/);
});
test('hourly news hub regeneration preserves its approved adult presentation assets',()=>{
 const source=read('tools/refresh-news-rss.js');
 const hub=source.split('function hub(items,generated){')[1]?.split('function readSports()')[0];
 assert.ok(hub,'news hub template must exist');
 assert.match(hub,/<link rel="stylesheet" href="\/brand\.css\?v=20261015-spacing1">/);
 assert.match(hub,/<script defer src="\/patches\/jonas-adult-page\.js\?v=20261014-fastlang1"><\/script>/);
 assert.match(hub,/<script defer src="\/patches\/immersive-feedback-20261014\.js\?v=immersive1"><\/script>/);
});
test('original bundled video keeps its soundtrack, with media volume below full scale',()=>{
 const src=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(src,/player\.setVolume\(0\.55f, 0\.55f\)/);
 assert.doesNotMatch(src,/player\.setVolume\(0f, 0f\)/);
 const mp4=fs.readFileSync(path.join(root,'android-studio/app/src/main/res/raw/matchapp_launch_intro.mp4'));
 assert.ok(mp4.includes(Buffer.from('soun'))&&mp4.includes(Buffer.from('mp4a')));
});
test('feedback respects sound mute, haptic and motion settings with no startup timers',()=>{
 const js=read('patches/immersive-feedback-20261014.js');
 assert.match(js,/match_soundEnabled/);
 assert.match(js,/match_hapticsEnabled/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/mic\?115:12/);
 assert.match(js,/kind==='result'/);
 assert.match(js,/!e\.isTrusted/);
 assert.doesNotMatch(js,/setInterval\(|requestAnimationFrame\(|mutationObserver/i);
});
test('existing sound engine gains mic notes and retains result cue',()=>{
 assert.match(read('app.js'),/mic:\s*\[\{freq:493\.88/);
 assert.match(read('app.js'),/result:\s*\[\{freq:392/);
 assert.match(read('matchapp-ia.js'),/kind==='mic'/);
});
