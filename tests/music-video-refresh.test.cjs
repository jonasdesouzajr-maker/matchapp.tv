'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {parseFeed,parseViewCount,schema,confirmExistingRelease,seoForRelease,releaseTitle}=require('../tools/refresh-music-videos.js');
const channel='UC1234567890123456789012';
const entry=(title,owner=channel,date='2026-01-01T12:00:00Z')=>`<entry><yt:videoId>abcdefghijk</yt:videoId><yt:channelId>${owner}</yt:channelId><title>${title}</title><published>${date}</published><author><name>Artist</name></author></entry>`;
const feed=rows=>`<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015">${rows}</feed>`;
test('daily source confirmation renews an existing release without replacing its credits or identity',()=>{
 const artist={artist:'Artist',channelUrl:'https://www.youtube.com/@Artist'};
 const row=parseFeed(feed(entry('Artist - Song (Official Music Video)')),channel)[0];
 const prior={...row,artist:'Artist',channelUrl:artist.channelUrl,director:'Verified director',verifiedAt:'2026-01-01'};
 const info={author_url:artist.channelUrl,title:row.rawTitle};
 const updated=confirmExistingRelease(prior,row,artist,channel,info,'2026-09-30');
 assert.equal(updated.verifiedAt,'2026-09-30');assert.equal(updated.director,prior.director);assert.equal(updated.id,prior.id);assert.equal(prior.verifiedAt,'2026-01-01');
 for(const wrong of [{...info,author_url:'https://www.youtube.com/@Impostor'},{...info,title:'Different song'}])assert.throws(()=>confirmExistingRelease(prior,row,artist,channel,wrong,'2026-09-30'),/identity mismatch/);
 assert.throws(()=>confirmExistingRelease({...prior,publishedAt:'2025-01-01'},row,artist,channel,info,'2026-09-30'),/identity mismatch/);
 const collaboration=confirmExistingRelease({...prior,artist:'Artist & Guest',publishedAt:'2026-01-01'},row,artist,channel,info,'2026-09-30');
 assert.equal(collaboration.artist,'Artist & Guest');assert.equal(collaboration.publishedAt,row.publishedAt);
});
test('feed admits published official music videos from the exact trusted channel only',()=>{
 const rows=parseFeed(feed(entry('Artist - Song (Official Music Video)')+entry('Song (Official Lyric Video)')+entry('Song (Official Audio)')+entry('Trailer (Official Video)')+entry('Song (Official Video)','UCother')+entry('Song (Official Video)',channel,'2099-01-01T00:00:00Z')),channel);
 assert.equal(rows.length,1);assert.equal(rows[0].id,'abcdefghijk');
 assert.equal(parseFeed(feed(entry('Song (Official Video)',channel,'bad-date')),channel).length,0);
});
test('public YouTube page parsing captures exact numeric view counts without inventing values',()=>{
 assert.equal(parseViewCount('<meta itemprop="interactionCount" content="1234567">'),1234567);
 assert.equal(parseViewCount('{"videoDetails":{"viewCount":"7654321"}}'),7654321);
 assert.equal(parseViewCount('<html>no count</html>'),null);
});
test('official MV releases qualify only on the monitored owner channel, while behind-scenes and audio stay excluded',()=>{
 const rows=parseFeed(feed(entry('BTS ‘Song’ Official MV')+entry('BTS ‘Song’ Official MV Behind the Scenes')+entry('BTS Song (Official Audio)')+entry('BTS ‘Song’ Official MV','UCimpostor')),channel);
 assert.equal(rows.length,1);assert.equal(rows[0].rawTitle,'BTS ‘Song’ Official MV');
 assert.equal(releaseTitle('BTS (방탄소년단) ‘Merry Go Round’ Official MV','BTS'),'Merry Go Round');
 assert.equal(releaseTitle('Artist - Song (Official Music Video)','Artist'),'Song');
 assert.equal(releaseTitle('BAD BUNNY ft. Chuwi - WELTiTA (Video Oficial) | DeBÍ TiRAR MáS FOToS','Bad Bunny'),'WELTiTA');
 const roster=JSON.parse(fs.readFileSync('data/music-video-artists.json','utf8'));
 for(const name of ['BTS','Bad Bunny','The Weeknd'])assert(roster.some(x=>x.artist===name));
});
test('daily Top Titles owns music-video discovery while the old workflow is manual recovery only',()=>{
 const daily=fs.readFileSync('.github/workflows/trending-refresh.yml','utf8'),manual=fs.readFileSync('.github/workflows/music-video-refresh.yml','utf8');
 for(const text of ["cron: '15 3 * * *'",'node tools/refresh-music-videos.js','node tools/refresh-trending.mjs','data/music-video-releases.json','data/trending-keywords.json','trending/this-week/index.html','group: matchapp-content-publish','cancel-in-progress: false','npm test','npm run audit:site','node tools/check-content-rotation.js','gh workflow run pages-deploy.yml --ref main'])assert.ok(daily.includes(text),text);
 assert.ok(daily.indexOf('node tools/refresh-music-videos.js')<daily.indexOf('node tools/refresh-trending.mjs'),'music discovery must happen before Top Titles generation');
 assert.doesNotMatch(manual,/schedule:|cron:/);assert.match(manual,/workflow_dispatch:/);
 assert.ok(!daily.includes('git add -A'));assert.ok(!daily.includes('continue-on-error'));
});
test('music release SEO metadata includes exact identity, release date, keywords and verified views',()=>{
 const r={artist:'Artist',title:'Song',publishedAt:'2026-10-03T12:00:00Z',viewCount:1234567,keywords:['official music video']};
 const seo=seoForRelease(r);assert.match(seo.title,/Artist.*Song.*MatchApp Ai/);assert.match(seo.description,/2026-10-03/);assert.match(seo.description,/1,234,567 verified views/);assert.ok(seo.keywords.includes('latest official music videos'));assert.match(seo.canonicalQuery,/Artist Song official music video/);
});
test('SEO emits exact video identity and omits unavailable duration',()=>{
 const rows=JSON.parse(fs.readFileSync('data/music-video-releases.json','utf8')).items;
 const seo=schema(rows);assert.equal(seo.numberOfItems,rows.length);
 seo.itemListElement.forEach((r,i)=>{assert.equal(r.item.url,rows[i].url);assert.equal(r.item.uploadDate,rows[i].publishedAt);assert.equal(Boolean(r.item.duration),Boolean(rows[i].durationSeconds));assert.equal(Boolean(r.item.interactionStatistic),Number.isSafeInteger(Number(rows[i].viewCount)));});
});
