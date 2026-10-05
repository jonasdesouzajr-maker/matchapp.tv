'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const url='https://matchapp.tv/guides/streaming-music-books-october-2026/';

test('October streaming, music and books guide remains indexable after sitemap regeneration',()=>{
 const html=read('guides/streaming-music-books-october-2026/index.html');
 const generator=read('tools/update-sitemap.js');
 const sitemap=read('sitemap.xml');
 assert.match(html,/name="robots" content="index,follow/);
 assert.match(html,/rel="canonical" href="https:\/\/matchapp\.tv\/guides\/streaming-music-books-october-2026\//);
 assert.ok(generator.includes(url),'sitemap generator must own the editorial URL');
 assert.ok(sitemap.includes('<loc>'+url+'</loc>'),'generated sitemap must retain the editorial URL');
 for(const official of ['netflix.com/tudum/top10','officialcharts.com','us.macmillan.com','penguinrandomhouse.com']){
  assert.ok(html.includes(official),official+' source missing');
 }
});
