'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('saved/share snapshots stay on rendered fallback until the initial original loads',()=>{
 const app=read('app.js');
 assert.match(app,/firstPoster\.src = firstCover;/,'The first match paint must already have a visible title-labelled image');
 assert.match(app,/if \(!originalShown\) posterEl\.src = localCover;/,'A slower provider cannot overwrite a decoded original');
 assert.match(app,/globalMatchPoster = firstFallback;\s*window\.globalMatchPoster = firstFallback;/,'Saved/share snapshots must not advertise a candidate before its pixels load');
 assert.match(app,/firstPoster\.addEventListener\('load', firstLoaded, \{ once: true \}\)/);
 assert.match(app,/window\.setLoadedMatchPoster = function\(url,title\)/);
 assert.match(read('catalog-media.js'),/if\(typeof window\.setLoadedMatchPoster==='function'\)window\.setLoadedMatchPoster\(winner,title\)/);
 assert.match(read('catalog-media.js'),/if\(img\.id==='res-poster-img'&&window\.globalMatchTitle===title\)/,'only matching title can update share snapshot after a successful original probe');
});

test('only the currently selected title may update both match portfolio and public sharing artwork',()=>{
 const src=read('app.js'),start=src.indexOf('window.setLoadedMatchPoster = function(url,title)');
 const end=src.indexOf('\n};',start);
 assert.ok(start>=0&&end>start);
 const win={globalMatchTitle:'Current Title',globalMatchPoster:'data:image/svg+xml,local'};
 const ctx={window:win};
 vm.runInNewContext('let globalMatchPoster="data:image/svg+xml,local";\n'+src.slice(start,end+3),ctx);
 assert.equal(win.setLoadedMatchPoster('https://image.tmdb.org/t/p/w780/wrong.jpg','Previous Title'),false);
 assert.equal(win.globalMatchPoster,'data:image/svg+xml,local');
 assert.equal(win.setLoadedMatchPoster('', 'Current Title'),false);
 assert.equal(win.setLoadedMatchPoster('https://image.tmdb.org/t/p/w780/right.jpg','Current Title'),true);
 assert.equal(win.globalMatchPoster,'https://image.tmdb.org/t/p/w780/right.jpg');
 // The lexical portfolio value and the public one must be identical.
 assert.equal(vm.runInNewContext('globalMatchPoster',ctx),win.globalMatchPoster);
});

test('failed actual poster display restores a title-labelled fallback in shared image state',()=>{
 const media=read('catalog-media.js');
 assert.match(media,/const cover=localPoster\(active\.title\);\s*img\.removeAttribute\?\.\('srcset'\);\s*img\.src=cover/);
 assert.match(media,/window\.setLoadedMatchPoster\(cover,active\.title\)/);
 // Never change Kids poster handling or accepted match criteria.
 assert.match(media,/if\(adultPosterSurface\(img\)\)recoverAdultPoster\(img,title\)/);
 assert.match(media,/else hardenImage\(img,title\)/);
});
