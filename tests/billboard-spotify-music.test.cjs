'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const bb=require('../tools/billboard-music.js'),sp=require('../tools/spotify-music-videos.js');
const chart={name:'Billboard Hot 100',region:'US',chartDate:'2026-10-03',verifiedAt:'2026-10-01',sourceUrl:'https://www.officialcharts.com/charts/billboard-hot-100-chart/',entries:Array.from({length:10},(_,i)=>({rank:i+1,title:'Song '+i,artist:'Artist '+i}))};
const video={id:'abcdefghijk',artist:'Artist 0',title:'Song 0',url:'https://www.youtube.com/watch?v=abcdefghijk',poster:'/assets/music-videos/abcdefghijk.jpg',channelUrl:'https://www.youtube.com/@Artist',publishedAt:'2026-01-01T00:00:00Z',viewCount:10,seo:{description:'Official music video.'}};
test('Billboard parsing validates the exact chart and published period, rejects partial/duplicate/untrusted snapshots',()=>{
 const rows=chart.entries.map(e=>`<div class="chart-item"><span class="chart-key"><strong>${e.rank}</strong></span><a class="chart-name"><span>${e.title}</span></a><a class="chart-artist">${e.artist}</a></div>`).join('');
 const html='<h1>Billboard Hot 100</h1><p>30 September 2026 - 6 October 2026</p>'+rows;
 const parsed=bb.parseOfficialChart(html);assert.equal(parsed.chartDate,'2026-10-03');assert.equal(parsed.entries.length,10);
 for(const bad of [html.replace('Billboard Hot 100','Official Singles Chart'),html.replace(/<div class="chart-item">[\s\S]*?<\/div>/,''),html.replace('<strong>10</strong>','<strong>9</strong>')])assert.throws(()=>bb.parseOfficialChart(bad));
 assert.throws(()=>bb.validateChart({...chart,sourceUrl:'https://fake.example/chart/'}));
 assert.throws(()=>bb.parseBillboardChart('<title>Billboard Hot 100</title><p>Subscribe</p>'));
});
test('source outages and an older chart preserve the latest verified ranks/date rather than manufacture freshness',async()=>{
 const old={...chart,chartDate:'2026-10-10'};const before=JSON.stringify(old);
 const retained=await bb.refreshBillboard(old,[],async()=>{throw Error('Source offline');});assert.equal(retained.chartDate,old.chartDate);assert.equal(retained.verifiedAt,old.verifiedAt);assert.equal(JSON.stringify(old),before);
 await assert.rejects(bb.refreshBillboard(null,[],async()=>{throw Error('Source offline');}),/No verified/);
});
test('Billboard official video links require exact song, artist and edition with valid source metadata',()=>{
 assert.equal(bb.matchVideo(chart.entries[0],[video]).id,video.id);
 for(const bad of [{...video,title:'Song 0 remix'},{...video,artist:'Other artist'},{...video,url:'https://example.com/watch'},{...video,viewCount:null},{...video,publishedAt:'2099-01-01'}])assert.equal(bb.matchVideo(chart.entries[0],[bad]),undefined);
 const result=bb.attachVideos(chart,[video]);assert.equal(result.entries[0].videoId,video.id);assert.equal(result.entries[1].videoId,undefined);
 const ld=bb.chartSchema(chart,[video]);assert.equal(ld.itemListElement[0].item.subjectOf.url,video.url);assert.equal(ld.itemListElement[1].item.subjectOf,undefined);
});
const source='https://newsroom.spotify.com/2026-09-16/taylor-swift-music-videos-catalog-spotify/';
function announcement(body,title='Official Music Videos on Spotify'){return `<title>${title} — Spotify</title><meta property="article:published_time" content="2026-09-16T12:00:00Z"><article><h1>${title}</h1>${body}</article>`;}
test('Spotify only accepts official music-video evidence, not arbitrary audio/artist/album/podcast links',()=>{
 const html=announcement('<h2><a href="https://open.spotify.com/track/0Om9WAB5RS09L80DyOfTNa?si=abc">Tim McGraw</a></h2><p><a href="https://open.spotify.com/playlist/37i9dQZF1DXe7fP0uj1s1D">Video catalog</a></p><p><a href="https://open.spotify.com/track/1GEBsLDvJGw7kviySRI6GX">Related song</a></p><p><a href="https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02">Artist</a></p>');
 const rows=sp.parseAnnouncement(html,source);assert.equal(rows.length,2);assert.equal(rows[0].url,'https://open.spotify.com/track/0Om9WAB5RS09L80DyOfTNa');assert.equal(rows[0].kind,'music-video');assert.equal(rows[1].kind,'video-collection');
 assert.throws(()=>sp.parseAnnouncement(html,'https://impostor.com/video/'));
 assert.throws(()=>sp.parseAnnouncement(announcement('<p>Music</p>','Podcast videos on Spotify'),source));
 assert.equal(sp.spotifyUrl('https://open.spotify.com.evil.example/track/0Om9WAB5RS09L80DyOfTNa'),null);
 assert.equal(sp.spotifyUrl('https://open.spotify.com/album/0Om9WAB5RS09L80DyOfTNa'),null);
});
test('Spotify failures retain source-verified destinations without invented metadata or freshness',async()=>{
 const prior=[{title:'Video collection',url:'https://open.spotify.com/playlist/37i9dQZF1DXe7fP0uj1s1D',source,kind:'video-collection',announcedAt:'2026-09-16T12:00:00Z',verifiedAt:'2026-09-16'}];
 const retained=await sp.refreshSpotifyVideos(prior,async()=>{throw Error('Unavailable');});assert.deepEqual(retained,prior);
 const html=sp.renderSpotify(prior);assert.match(html,/Premium, account and country/);assert.doesNotMatch(html,/"@type":"VideoObject"/);assert.match(html,/target="_blank" rel="noopener noreferrer"/);
});
test('new music regions remain in the adult music area and translate immediately, preserving exact title/source links',()=>{
 const inventory=JSON.parse(fs.readFileSync('data/music-video-releases.json','utf8'));
 const home=fs.readFileSync('index.html','utf8'),d=new JSDOM(home,{url:'https://matchapp.tv/',runScripts:'outside-only'});
 try{
  const doc=d.window.document;assert.equal(doc.querySelectorAll('#billboard').length,1);assert.equal(doc.querySelectorAll('#spotify-videos').length,1);assert.ok(doc.getElementById('billboard').compareDocumentPosition(doc.getElementById('swifties-spotify'))&d.window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.ok(inventory.billboard.entries.filter(e=>e.videoId).length>=1);
  assert.ok(inventory.spotifyVideos.length>=1);
  const links=[...doc.querySelectorAll('#billboard a,#spotify-videos a')].map(a=>a.href);
  d.window.MATCH_LANG='pt-BR';d.window.eval(fs.readFileSync('billboard-music.js','utf8'));doc.dispatchEvent(new d.window.Event('DOMContentLoaded'));assert.match(doc.querySelector('#billboard summary').textContent,/Videoclipes oficiais/);assert.match(doc.querySelector('#spotify-videos summary').textContent,/Videoclipes/);assert.match(doc.querySelector('#spotify-videos .billboard-note').textContent,/conta e do país/);
  d.window.MATCH_LANG='ja';doc.dispatchEvent(new d.window.Event('matchapp:langchange'));assert.match(doc.querySelector('#billboard summary').textContent,/公式/);
  assert.deepEqual([...doc.querySelectorAll('#billboard a,#spotify-videos a')].map(a=>a.href),links);
  for(const path of ['kids/index.html','kids/ask.html'])if(fs.existsSync(path))assert.doesNotMatch(fs.readFileSync(path,'utf8'),/billboard-music\.js|id="spotify-videos"/);
 }finally{d.window.close();}
});
test('the existing serialized daily writer regenerates chart/video presentation and SEO without a second publisher',()=>{
 const daily=fs.readFileSync('.github/workflows/trending-refresh.yml','utf8');assert.match(daily,/15 3 \* \* \*/);assert.match(daily,/matchapp-content-publish/);assert.match(daily,/data\/music-video-releases.json/);
 const script=fs.readFileSync('tools/refresh-music-videos.js','utf8');assert.match(script,/refreshBillboard/);assert.match(script,/refreshSpotifyVideos/);
 const trending=fs.readFileSync('tools/refresh-trending.mjs','utf8');assert.match(trending,/chartKeywords/);assert.match(trending,/spotifyKeywords/);assert.match(trending,/renderSpotify/);
 assert.match(fs.readFileSync('trending/this-week/index.html','utf8'),/id="billboard"/);assert.match(fs.readFileSync('sitemap.xml','utf8'),/https:\/\/matchapp.tv\/trending\/this-week\//);
});

test('Spotify track metadata must contain a genuine dated VideoObject for the exact recording',()=>{
 const url='https://open.spotify.com/track/0Om9WAB5RS09L80DyOfTNa';
 const recording={'@type':'MusicRecording',url,name:'Song'};
 const video={'@type':'VideoObject',name:'Song — Artist | Music Video',uploadDate:'2026-09-16T12:00:00Z',thumbnailUrl:'https://i.scdn.co/image/abcdefghijk'};
 const html=rows=>'<meta property="og:description" content="Artist · Album · Song"><script type="application/ld+json">'+JSON.stringify(rows)+'</script>';
 const result=sp.destinationMetadata(html([recording,video]),url);assert.equal(result.artist,'Artist');assert.equal(result.video.uploadDate,video.uploadDate);
 assert.throws(()=>sp.destinationMetadata(html([recording]),url),/not confirmed/);
 assert.throws(()=>sp.destinationMetadata(html([{...recording,url:url+'wrong'},video]),url),/not confirmed/);
 assert.throws(()=>sp.destinationMetadata(html([recording,{...video,thumbnailUrl:'https://untrusted.example/video.jpg'}]),url),/not confirmed/);
});
