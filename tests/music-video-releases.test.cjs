'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const data=JSON.parse(fs.readFileSync('data/music-video-releases.json','utf8'));
const featuredCount=data.featuredIds?.length||data.items.length;
const script=fs.readFileSync('music-video-releases.js','utf8');
function fixture(payload=data){
 const d=new JSDOM('<html lang="en"><div id="marquee-track">'+Array.from({length:52},(_,i)=>'<div class="marquee-item" '+(i>=26?'aria-hidden="true" tabindex="-1"':'role="button" tabindex="0"')+'><img data-title="Film '+i%26+'"></div>').join('')+'</div><div id="grid"></div></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 // Test a fresh snapshot at its check date rather than expiring with wall time.
 d.window.Date.now=()=>Math.max(...payload.items.map(r=>Date.parse(r.verifiedAt+'T12:00:00Z')),...payload.items.map(r=>Date.parse(r.publishedAt)));
 d.window.fetch=async()=>({ok:true,json:async()=>payload});d.window.eval(script);return d;
}
const settle=()=>new Promise(r=>setTimeout(r,20));
test('official release identity, source, artwork and publication data agree',()=>{
 assert.equal(new Set(data.items.map(r=>r.id)).size,data.items.length);
 for(const r of data.items){assert.match(r.id,/^[\w-]{11}$/);assert.equal(r.url,'https://www.youtube.com/watch?v='+r.id);assert.equal(r.thumbnail,'https://i.ytimg.com/vi/'+r.id+'/hqdefault.jpg');assert.ok(Date.parse(r.publishedAt)<=Date.now());if(r.durationSeconds)assert.ok(r.durationSeconds>0);assert.ok(r.channel&&r.source&&r.creditsSource);}
 const home=new JSDOM(fs.readFileSync('index.html','utf8')).window.document;
 const seo=JSON.parse(home.getElementById('music-video-releases-schema').textContent);
 const shown=data.featuredIds?data.items.filter(r=>data.featuredIds.includes(r.id)):data.items;assert.equal(seo.numberOfItems,shown.length);seo.itemListElement.forEach((entry,i)=>{assert.equal(entry.item.url,shown[i].url);assert.equal(entry.item.thumbnailUrl[0],'https://matchapp.tv'+shown[i].poster);assert.equal(entry.item.uploadDate,shown[i].publishedAt);});
});
test('featured Top Titles music videos always have complete poster metadata',()=>{
 const rows=data.featuredIds?data.items.filter(r=>data.featuredIds.includes(r.id)):data.items;
 assert.ok(rows.length);
 for(const r of rows){assert.ok(Date.parse(r.publishedAt));assert.ok(Number.isFinite(Number(r.viewCount))&&Number(r.viewCount)>=0,r.id+' missing viewCount');assert.equal(r.url,'https://www.youtube.com/watch?v='+r.id);}
});
test('music cards extend both loops without altering the regional film/TV identities',async()=>{
 const d=fixture();try{await settle();const cards=[...d.window.document.querySelector('#marquee-track').children],half=26+featuredCount;assert.equal(cards.length,52+featuredCount*2);assert.equal(cards.filter(c=>c.querySelector('img[data-title]')).length,52);assert.deepEqual(cards.slice(0,half).map(c=>c.dataset.musicVideo||c.textContent||c.querySelector('img').dataset.title),cards.slice(half).map(c=>c.dataset.musicVideo||c.textContent||c.querySelector('img').dataset.title));assert.equal(cards[0].getAttribute('role'),'button');assert.equal(cards[half].tabIndex,-1);assert.equal(cards[half].getAttribute('aria-hidden'),'true');}finally{d.window.close();}
});
test('Top Titles music-video posters always expose release date, views and visible YouTube link',async()=>{
 const first=data.items[0],payload={...data,items:data.items.map(r=>r.id===first.id?{...r,viewCount:1234567}:r),featuredIds:[first.id]};
 const d=fixture(payload);try{await settle();const card=d.window.document.querySelector('[data-music-video="'+first.id+'"]');assert.ok(card);assert.ok(card.querySelector('.music-cover-release').textContent.trim());assert.match(card.querySelector('.music-cover-views').textContent,/views|visualiza|vues|Aufrufe|visualizzazioni|görüntüleme|просмотров|مشاهدة|व्यूज़|tayangan|再生|조회수|观看/i);assert.equal(card.querySelector('.music-cover-link').textContent,'youtu.be/'+first.id);assert.equal(card.querySelector('.music-cover-link').title,first.url);}finally{d.window.close();}
});
test('each exact release renders its official YouTube destination without invoking AI or TMDB',async()=>{
 const d=fixture();try{await settle();for(const r of data.items){const grid=d.window.document.getElementById('grid');await d.window.MatchAppMusicReleases.paintCard(r.id,grid);assert.equal(grid.querySelector('img').getAttribute('src'),r.poster);assert.equal(grid.querySelector('a').href,r.url);assert.ok(grid.textContent.includes(r.director));}assert.equal(await d.window.MatchAppMusicReleases.get('unverified-id'),undefined);}finally{d.window.close();}
});
test('all 14 languages have release information and a localized watch action',async()=>{
 const d=fixture();try{await settle();const grid=d.window.document.getElementById('grid');for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){d.window.MATCH_LANG=lang;await d.window.MatchAppMusicReleases.paintCard(data.items[0].id,grid);const text=grid.textContent;if(lang!=='en'){assert.ok(!text.includes('Released on YouTube'),lang);assert.ok(!text.includes('Watch on YouTube'),lang);assert.ok(!text.includes('Official source'),lang);}assert.ok(text.includes(data.items[0].title));}}finally{d.window.close();}
});
test('latest artist videos use dated exact official identities, descending dates and context',async()=>{
 const d=fixture();try{await settle();const api=d.window.MatchAppMusicReleases;
 for(const q of ['latest music videos of Taylor Swift','latest videos of Taylor Swift','videoclipes mais recentes de Taylor Swift']){
 const p=await api.query(q);assert.ok(p.results.length);assert.ok(p.results.every(r=>r.title.startsWith('Taylor Swift — ')));assert.equal(p.results[0]._musicVideoId,data.items.filter(r=>r.artist==='Taylor Swift').sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0].id);
 const grid=d.window.document.getElementById('grid');grid.replaceChildren();for(const item of p.results)await api.paintCard(item._musicVideoId,grid,true);
 assert.equal(grid.children.length,p.results.length);for(const card of grid.children){const id=card.dataset.musicVideoId;assert.equal(card.querySelector('iframe').src,'https://www.youtube-nocookie.com/embed/'+id);assert.equal(card.querySelector('a').href,'https://www.youtube.com/watch?v='+id);assert.ok(!card.textContent.includes('Cinemas'));}
 }
 assert.ok((await api.query('latest videos of her',[{text:'Taylor Swift'}])).results.length);
 assert.equal(await api.query('latest movies'),null);
 assert.equal((await api.query('latest music videos of Unknown Artist')).results.length,0);
 for(const artist of ['Lady Gaga','Shakira']){
  const p=await api.query('latest videos of '+artist);
  const expected=data.items.filter(r=>r.artist.split(/\s+&\s+/).includes(artist)).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  const fresh=expected.filter(r=>{const age=d.window.Date.now()-Date.parse(r.verifiedAt+'T00:00:00Z');return age>=0&&age<=2*86400000;});
  if(fresh.length){assert.ok(p.results.length,artist);assert.equal(p.results[0]._musicVideoId,fresh[0].id);}
  else{assert.equal(p.results.length,0,artist+' stale inventory must fail closed');assert.match(p.answer,/could not confirm|não consegui confirmar|no pude confirmar/i);}
 }
 assert.ok((await api.query('latest music videos of Lady Gaga & Doechii')).results.length);
 assert.ok((await api.query('latest videos of them',[{text:'Lady Gaga & Doechii'}])).results.length);
 d.window.document.dispatchEvent(new d.window.Event('matchapp:langchange'));await settle();assert.ok(d.window.document.querySelectorAll('.discover-music-card').length>1);
 }finally{d.window.close();}
});
test('stale artist inventory cannot be passed off as current',async()=>{
 const d=new JSDOM('<html lang="en"></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});try{d.window.fetch=async()=>({ok:true,json:async()=>({...data,items:data.items.map(r=>({...r,verifiedAt:'2020-01-01'}))})});d.window.eval(script);const p=await d.window.MatchAppMusicReleases.query('latest videos of Taylor Swift');assert.equal(p.results.length,0);assert.match(p.answer,/could not confirm/);}finally{d.window.close();}
});
test('future verification dates cannot authorize current release claims',async()=>{
 const d=fixture();try{await settle();d.window.Date.now=()=>Date.parse('2020-01-01');const p=await d.window.MatchAppMusicReleases.query('latest music videos of Taylor Swift');assert.equal(p.results.length,0);}finally{d.window.close();}
});
test('a synchronous request setup failure is recoverable on the next lookup',async()=>{
 const d=new JSDOM('<html lang="en"></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});try{
 d.window.fetch=()=>{throw Error('Network setup failed');};d.window.eval(script);
 assert.equal(await d.window.MatchAppMusicReleases.get(data.items[0].id),undefined);
 d.window.fetch=async()=>({ok:true,json:async()=>data});
 assert.equal((await d.window.MatchAppMusicReleases.get(data.items[0].id)).id,data.items[0].id);
 }finally{d.window.close();}
});
