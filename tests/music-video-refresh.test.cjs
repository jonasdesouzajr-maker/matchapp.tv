'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {parseFeed,schema}=require('../tools/refresh-music-videos.js');
const channel='UC1234567890123456789012';
const entry=(title,owner=channel,date='2026-01-01T12:00:00Z')=>`<entry><yt:videoId>abcdefghijk</yt:videoId><yt:channelId>${owner}</yt:channelId><title>${title}</title><published>${date}</published><author><name>Artist</name></author></entry>`;
const feed=rows=>`<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015">${rows}</feed>`;
test('feed admits published official music videos from the exact trusted channel only',()=>{
 const rows=parseFeed(feed(entry('Artist - Song (Official Music Video)')+entry('Song (Official Lyric Video)')+entry('Song (Official Audio)')+entry('Trailer (Official Video)')+entry('Song (Official Video)','UCother')+entry('Song (Official Video)',channel,'2099-01-01T00:00:00Z')),channel);
 assert.equal(rows.length,1);assert.equal(rows[0].id,'abcdefghijk');
 assert.equal(parseFeed(feed(entry('Song (Official Video)',channel,'bad-date')),channel).length,0);
});
test('daily publisher retains shared serialization, complete validation and scoped staging',()=>{
 const y=fs.readFileSync('.github/workflows/music-video-refresh.yml','utf8');
 for(const text of ["cron: '10 3 * * *'",'group: matchapp-content-publish','cancel-in-progress: false','npm test','npm run audit:site','node tools/check-content-rotation.js','git reset --hard origin/main','gh workflow run pages-deploy.yml --ref main'])assert.ok(y.includes(text),text);
 assert.ok(!y.includes('git add -A'));assert.ok(!y.includes('continue-on-error'));
});
test('SEO emits exact video identity and omits unavailable duration',()=>{
 const rows=JSON.parse(fs.readFileSync('data/music-video-releases.json','utf8')).items;
 const seo=schema(rows);assert.equal(seo.numberOfItems,rows.length);
 seo.itemListElement.forEach((r,i)=>{assert.equal(r.item.url,rows[i].url);assert.equal(r.item.uploadDate,rows[i].publishedAt);assert.equal(Boolean(r.item.duration),Boolean(rows[i].durationSeconds));});
});
