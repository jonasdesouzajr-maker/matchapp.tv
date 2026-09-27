'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const tracks=[
 ['Patient Zero','49JeKZqejPtqJKpK7x9Ew4'],
 ['Cleveland!','7uxkx8HPBYkJKcimOyggUM'],
 ['Pink Clouding','3gyJbNBTRVRdZDA1yO3clm'],
 ['Babylon','2j7wI9QWrP8cjKDdOLVQTU']
];
const albumUrl='https://open.spotify.com/album/4hF2gTGuPYlykYuphDxi8J';
const officialArt='https://i.scdn.co/image/ab67616d0000b273cf3de6b538d8b1ed73a4d5d1';

test('Adult Swift spotlight has original artwork, official release and track links without changing video collection',()=>{
 const doc=new JSDOM(read('index.html')).window.document;
 const section=doc.querySelector('#swifties-spotify');
 assert.ok(section,'preserve existing Swifties fold');
 const album=section.querySelector('a.swifties-new-album');
 assert.equal(album?.href,albumUrl);
 const art=album.querySelector('img');
 assert.equal(art.src,officialArt);
 assert.equal(art.getAttribute('width'),'96');
 assert.equal(art.getAttribute('height'),'96');
 const songs=section.querySelector('[aria-label="Taylor Swift latest verified music releases on Spotify"]');
 for(const [name,id] of tracks){
  const link=[...songs.querySelectorAll('a')].find(a=>a.textContent.includes(name));
  assert.equal(link?.href,'https://open.spotify.com/track/'+id,name);
  assert.equal(link?.getAttribute('rel'),'noopener noreferrer');
 }
 assert.equal(section.querySelector('.swifties-video-embed')?.getAttribute('data-src')?.includes('37i9dQZF1DXe7fP0uj1s1D'),true);
 assert.equal(section.querySelector('.swifties-fold')?.getAttribute('aria-controls'),'swifties-spotify-body');
 assert.ok(read('matchapp-ia.css').includes('object-fit:contain'),'original art must never crop');
});

test('Taylor album structured data reflects verified release and links',()=>{
 const doc=new JSDOM(read('index.html')).window.document;
 const schemas=[...doc.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
 const album=schemas.find(s=>s['@type']==='MusicAlbum'&&s.name==='The Life of a Showgirl: The Encore');
 assert.ok(album);
 assert.equal(album.datePublished,'2026-09-25');
 assert.equal(album.url,albumUrl);
 assert.equal(album.image,officialArt);
 assert.equal(album.numTracks,16);
 for(const [name,id] of tracks)assert.ok(album.track.some(t=>t.name===name&&t.url==='https://open.spotify.com/track/'+id));
});

test('Taylor music catalog uses authentic Spotify media identities without unverified mood labels or duplicate injection',()=>{
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://matchapp.tv/'});
 dom.window.eval('var CONTENT_CATALOG = [];');
 const src=read('catalog-plus.js');
 dom.window.eval(src);
 const entries=dom.window.eval('CONTENT_CATALOG');
 const wanted=['The Life of a Showgirl: The Encore',...tracks.map(([name])=>name+' — Taylor Swift')];
 for(const title of wanted){
  const matches=entries.filter(e=>e.title===title);
  assert.equal(matches.length,1,title);
  assert.equal(matches[0].platform,'Spotify');
  assert.equal(matches[0].spotifyArtwork,officialArt);
  assert.deepEqual(Array.from(matches[0].moods),[],'do not invent the mood of an unheard track');
 }
 const initial=entries.length;
 dom.window.eval(src);
 assert.equal(entries.length,initial,'duplicate content injection is forbidden');
 dom.window.close();
});
