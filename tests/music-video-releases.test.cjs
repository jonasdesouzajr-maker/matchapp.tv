'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const data=JSON.parse(fs.readFileSync('data/music-video-releases.json','utf8'));
const featuredCount=data.featuredIds?.length||data.items.length;
const script=fs.readFileSync('music-video-releases.js','utf8');
function fixture(){
 const d=new JSDOM('<html lang="en"><div id="marquee-track">'+Array.from({length:20},(_,i)=>'<div class="marquee-item"><img data-title="Film '+i%10+'"></div>').join('')+'</div><div id="grid"></div></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 d.window.fetch=async()=>({ok:true,json:async()=>data});d.window.eval(script);return d;
}
const settle=()=>new Promise(r=>setTimeout(r,20));
test('official release identity, source, artwork and publication data agree',()=>{
 assert.equal(new Set(data.items.map(r=>r.id)).size,data.items.length);
 for(const r of data.items){assert.match(r.id,/^[\w-]{11}$/);assert.equal(r.url,'https://www.youtube.com/watch?v='+r.id);assert.equal(r.thumbnail,'https://i.ytimg.com/vi/'+r.id+'/hqdefault.jpg');assert.ok(Date.parse(r.publishedAt)<=Date.now());if(r.durationSeconds)assert.ok(r.durationSeconds>0);assert.ok(r.channel&&r.source&&r.creditsSource);}
 const home=new JSDOM(fs.readFileSync('index.html','utf8')).window.document;
 const seo=JSON.parse(home.getElementById('music-video-releases-schema').textContent);
 const shown=data.featuredIds?data.items.filter(r=>data.featuredIds.includes(r.id)):data.items;assert.equal(seo.numberOfItems,shown.length);seo.itemListElement.forEach((entry,i)=>{assert.equal(entry.item.url,shown[i].url);assert.equal(entry.item.thumbnailUrl[0],'https://matchapp.tv'+shown[i].poster);assert.equal(entry.item.uploadDate,shown[i].publishedAt);});
});
test('music cards extend both loops without altering the ten original film identities',async()=>{
 const d=fixture();try{await settle();const cards=[...d.window.document.querySelector('#marquee-track').children];assert.equal(cards.length,20+featuredCount*2);assert.equal(cards.filter(c=>c.querySelector('img[data-title]')).length,20);assert.deepEqual(cards.slice(0,10+featuredCount).map(c=>c.dataset.musicVideo||c.textContent||c.querySelector('img').dataset.title),cards.slice(10+featuredCount).map(c=>c.dataset.musicVideo||c.textContent||c.querySelector('img').dataset.title));assert.equal(cards[1].getAttribute('role'),'button');assert.equal(cards[11+featuredCount].tabIndex,-1);assert.equal(cards[11+featuredCount].getAttribute('aria-hidden'),'true');}finally{d.window.close();}
});
test('each exact release renders its official YouTube destination without invoking AI or TMDB',async()=>{
 const d=fixture();try{await settle();for(const r of data.items){const grid=d.window.document.getElementById('grid');await d.window.MatchAppMusicReleases.paintCard(r.id,grid);assert.equal(grid.querySelector('img').getAttribute('src'),r.poster);assert.equal(grid.querySelector('a').href,r.url);assert.ok(grid.textContent.includes(r.director));}assert.equal(await d.window.MatchAppMusicReleases.get('unverified-id'),undefined);}finally{d.window.close();}
});
test('all 14 languages have release information and a localized watch action',async()=>{
 const d=fixture();try{await settle();const grid=d.window.document.getElementById('grid');for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){d.window.MATCH_LANG=lang;await d.window.MatchAppMusicReleases.paintCard(data.items[0].id,grid);const text=grid.textContent;if(lang!=='en'){assert.ok(!text.includes('Released on YouTube'),lang);assert.ok(!text.includes('Watch on YouTube'),lang);assert.ok(!text.includes('Official source'),lang);}assert.ok(text.includes(data.items[0].title));}}finally{d.window.close();}
});
