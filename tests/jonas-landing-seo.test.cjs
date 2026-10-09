'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'jonas/index.html'),'utf8'),asset=path.join(root,'jonas/og-jonas.jpg');
test('Jonas page has original, specific search metadata and one canonical',()=>{
 assert.match(html,/<title>Jonas AI:/);assert.match(html,/content="index,follow,max-image-preview:large"/);
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
 assert.ok(html.includes('https://matchapp.tv/jonas/'));assert.ok(html.includes('/jonas/og-jonas.jpg'));
 assert.ok(fs.statSync(asset).size>30000);
});
test('structured data describes supported features with no fabricated reviews',()=>{
 const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);assert.ok(match);
 const data=JSON.parse(match[1]),parts=data['@graph'];assert.equal(parts.length,2);
 assert.equal(parts[1]['@type'],'WebApplication');
 assert.equal(parts[1].name,'Jonas by MatchApp Ai');
 assert.equal(parts[1].inLanguage.length,14);
 assert.ok(!JSON.stringify(data).includes('aggregateRating'));
 assert.ok(!JSON.stringify(data).includes('reviewCount'));
});
test('new landing content offers useful discovery context and honest provider disclaimers',()=>{
 assert.match(html,/Find what to watch next with Jonas/);
 assert.match(html,/Availability changes between Netflix/);
 assert.match(html,/Microphone access requires your permission/);
 assert.match(html,/Questions about Jonas/);
 assert.match(html,/AI-generated|AI-generated|AI/);
 for(const target of ['collections/movie/index.html','collections/series/index.html','discover.html','pricing/pricing.html']){
  assert.ok(fs.existsSync(path.join(root,target)),target);
 }
 assert.ok(fs.existsSync(path.join(root,'jonas/seo-content.css')));
});
