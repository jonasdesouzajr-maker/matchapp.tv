'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('adult movie/TV source discovery expands only after a bounded identity-checked first batch',()=>{
 const app=read('app.js');
 const m=app.slice(app.indexOf('async function discoverVerifiedExactTMDB('),app.indexOf('async function aiProposedVerifiedExact('));
 assert.match(m,/pagePlan=provider\?\[\[1,3\],\[4,3\]\]:\[\[1,2\],\[3,2\]\]/);
 assert.match(m,/MAX_EXACT_DETAILS=14/);
 assert.match(m,/sourceStarted>46000/);
 assert.match(m,/window\.tmdbDetails\(base\.tmdbId,base\.kind/);
 assert.match(m,/moodFitsVerified\(mood,genres/);
 assert.match(m,/realGenres\.length&&!genres\.some/);
 assert.match(m,/country|countries/);
 assert.match(m,/platformVerified:platform\.length>0/);
});
test('iTunes music and podcast expansion uses legal exact media, country, explicit and Apple original',()=>{
 const app=read('app.js'),media=read('catalog-media.js');
 assert.match(app,/cat === 'Spotify playlist' \|\| cat === 'Spotify single'\) return null/);
 assert.match(app,/entity=cat==='music album'\?'album'/);
 assert.match(app,/cat==='podcast'\?'podcast'/);
 assert.match(app,/limit=\$\{limit\}&country=\$\{encodeURIComponent\(region\)\}&explicit=No/);
 assert.match(app,/selected\.source==='itunes-live'/);
 assert.match(media,/if\(identity\.itunesAudio===true\)/);
 assert.match(media,/audio-ssl\\\.itunes\\\.apple\\\.com/);
 assert.match(media,/renderPreview\(host,\{title,preview_kind:preview\?'audio':null/);
 assert.match(media,/if\(image&&identity\.artwork\)recoverAdultPoster/);
 assert(!read('kids/index.html').includes('/ebooks/audiobooks.js'));
});
