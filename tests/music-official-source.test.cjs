'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const catalogMatch=app.match(/const CONTENT_CATALOG = (\[[\s\S]*?\n\]);/);
test('official Spotify playlist identity has a legitimate deep link and source artwork',()=>{
 assert(catalogMatch,'main curated catalog must parse');
 const rows=vm.runInNewContext(catalogMatch[1]);
 const item=rows.find(x=>x.title==='Deep Focus'&&x.platform==='Spotify');
 assert(item,'the source-checked Spotify Deep Focus selection must exist');
 assert(item.cats.includes('Spotify playlist')&&item.moods.includes('cozy comfort watch'));
 assert.equal(item.watchUrl,'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ');
 assert.equal(item.officialArtwork,'https://i.scdn.co/image/ab67706f000000036020f2f6476db518ef747da4');
});
test('music never misattributes generated artwork as a verified original',()=>{
 assert.match(app,/selected\.title === 'Deep Focus' && selected\.watchUrl === 'https:\/\/open\.spotify\.com\/playlist/);
 assert.match(app,/selected\.officialArtwork/);
 assert.match(app,/if \(selected\.watchUrl\) \{\s*directBtn\.href = selected\.watchUrl;/);
});
