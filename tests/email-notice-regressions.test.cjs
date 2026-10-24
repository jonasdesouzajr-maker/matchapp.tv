'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
function read(p){return fs.readFileSync(path.join(ROOT,p),'utf8');}
function nodes(value,found=[]){
 if(!value||typeof value!=='object')return found;
 if(Array.isArray(value)){value.forEach(row=>nodes(row,found));return found;}
 if([].concat(value['@type']||[]).includes('VideoObject'))found.push(value);
 Object.values(value).forEach(row=>nodes(row,found));return found;
}
function schema(doc){
 const d=new JSDOM(doc).window.document;
 return [...d.querySelectorAll('script[type="application/ld+json"]')].map(script=>JSON.parse(script.textContent));
}
test('Google video structured data exposes real players, never a YouTube watch URL as a video file',()=>{
 for(const page of ['index.html','trending/this-week/index.html']){
  const video=schema(read(page)).flatMap(obj=>nodes(obj));assert.ok(video.length>0,page+' has no videos');
  for(const v of video){
   assert.ok(v.embedUrl||v.contentUrl,page+': '+v.name+' missing embed or content');
   assert.ok(v.name&&v.thumbnailUrl&&v.uploadDate,page+': incomplete '+v.name);
   assert.ok(!v.contentUrl||!v.contentUrl.includes('/watch?v='),page+': watch page mistaken for media file');
   if(v.embedUrl)assert.match(v.embedUrl,/^https:\/\/(?:www\.)?youtube\.com\/embed\/[\w-]{11}$/);
  }
 }
});
test('Spotify destinations without a publicly available video player use music and web schema rather than VideoObject',()=>{
 const spotify=require('../tools/spotify-music-videos.js');
 const inventory=JSON.parse(read('data/music-video-releases.json'));
 const html=spotify.renderSpotify(inventory.spotifyVideos);
 const d=schema(html)[0];
 assert.equal(d.itemListElement.length,inventory.spotifyVideos.length);
 for(let i=0;i<d.itemListElement.length;i++){
  const {item}=d.itemListElement[i],r=inventory.spotifyVideos[i];
  assert.equal(item['@type'],r.video?'MusicRecording':'WebPage');
  assert.equal(item.url,r.url);
  assert.equal(item.citation,r.source);
  if(r.video)assert.equal(item.image,r.video.thumbnailUrl);
 }
 for(const page of ['index.html','trending/this-week/index.html']){
  const d=new JSDOM(read(page)).window.document;
  const stored=JSON.parse(d.getElementById('spotify-music-schema').textContent);
  assert.equal(stored.itemListElement.length,inventory.spotifyVideos.length);
  assert.equal(nodes(stored).length,0);
 }
});
test('Gemini request builders omit deprecated thinking budget and sampling settings on every retry',()=>{
 const code=read('supabase/functions/gemini-proxy/index.ts');
 assert.doesNotMatch(code,/\b(?:thinkingBudget|temperature|topP|topK|top_p|top_k)\s*:/);
 assert.match(code,/generationConfig:\s*withGeminiLatency\(kidsCandidates\s*\? kidsGenerationConfig\(buildGenerationConfig\([\s\S]*?: buildGenerationConfig\(isDiscoverMode,isProposalMode,isRankMode\),model,body\?\.kidsMode === true\)/);
 assert.match(code,/responseMimeType:\s*"application\/json"/);
 assert.match(code,/maxOutputTokens:\s*8192/);
 assert.match(code,/geminiRes\.status\s*===\s*400/);
});
test('Dated US book-to-screen discovery expires after its source window without inventing global availability',()=>{
 const generator=read('tools/refresh-trending.mjs'),d=new JSDOM(read('trending/this-week/index.html')).window.document;
 const cutoff=Date.parse('2026-10-22T00:00:00Z');
 assert.match(generator,/bookSpotlight=Date\.now\(\)<Date\.parse\('2026-10-22T00:00:00Z'\)/);
 for(const expected of ['United States','Verity','Heated Rivalry','available in your country'])assert.ok(generator.includes(expected),'missing source contract: '+expected);
 for(const expectedLink of ['Compare%20the%20book%20and%20screen%20versions','Recommend%20romance%20movies%20and%20shows'])assert.ok(generator.includes(expectedLink),'missing book trend discovery link: '+expectedLink);
 const section=d.querySelector('#book-to-screen-trends');
 if(Date.now()<cutoff)assert.ok(section,'missing active book trend section');
 if(section){
  assert.match(section.textContent,/United States/);
  assert.match(section.textContent,/Verity/);
  assert.match(section.textContent,/Heated Rivalry/);
  assert.match(section.textContent,/available in your country/);
  assert.equal(section.querySelectorAll('a[href^="/discover.html?q="]').length,2);
 }
 assert.ok(d.querySelector('meta[name="viewport"]'));
});

test('Founder ProfilePage dates are real, chronological ISO 8601 timestamps matching its generator',()=>{
 const founder=schema(read('founder/index.html')).flatMap(row=>row['@graph']||[row]).find(row=>row['@type']==='ProfilePage');
 assert.ok(founder,'missing founder ProfilePage');
 for(const key of ['dateCreated','dateModified']){
  assert.match(founder[key],/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,key+' must have ISO 8601 date and time');
  assert.ok(Number.isFinite(Date.parse(founder[key])),key+' must be parseable');
  assert.equal(new Date(founder[key]).toISOString().replace('.000Z','Z'),founder[key],key+' must be a real UTC date');
 }
 assert.ok(Date.parse(founder.dateCreated)<=Date.parse(founder.dateModified));
 const generator=read('tools/build-founder-page.cjs');
 for(const key of ['dateCreated','dateModified'])assert.ok(generator.includes(key+':'+JSON.stringify(founder[key]).replace(/"/g,"'")),'generator and output disagree: '+key);
});
