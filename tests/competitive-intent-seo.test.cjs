'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const route='https://matchapp.tv/guides/choose-what-to-watch/';
const pagePath=path.join(root,'guides/choose-what-to-watch/index.html');
function document(){return new JSDOM(fs.readFileSync(pagePath,'utf8')).window.document;}
test('new cross-platform editorial guide has original visible crawlable content',()=>{
 const d=document();
 assert.equal(d.querySelector('html').lang,'en');
 assert.equal(d.querySelectorAll('h1').length,1);
 assert.match(d.title,/Netflix or Disney\+/);
 assert.match(d.querySelector('meta[name="description"]').content,/MatchApp Ai/);
 assert.equal(d.querySelector('link[rel="canonical"]').href,route);
 assert.match(d.querySelector('meta[name="robots"]').content,/index/);
 const text=d.body.textContent.replace(/\s+/g,' ').trim();
 assert.ok(text.length>3500,'substantive editorial content required');
 assert.match(text,/not affiliated with Netflix, Disney\+/i);
 assert.match(text,/(?:change|vary) by country/i);
});
test('editorial guide points only to existing on-site routes',()=>{
 const d=document();
 const links=[...d.querySelectorAll('a[href^="/"]')];
 assert.ok(links.length>=10);
 for(const a of links){
  const u=new URL(a.getAttribute('href'),'https://matchapp.tv/');
  let p=path.join(root,u.pathname);
  if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
  assert.ok(fs.existsSync(p),'Missing internal destination '+u.pathname);
 }
});
test('Article and BreadcrumbList schema describe the page faithfully',()=>{
 const d=document();
 const nodes=[...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(s=>{
  const v=JSON.parse(s.textContent);return v['@graph']||[v];
 });
 const article=nodes.find(n=>n['@type']==='Article');
 const crumb=nodes.find(n=>n['@type']==='BreadcrumbList');
 assert.ok(article&&crumb);
 assert.equal(article.mainEntityOfPage,route);
 assert.equal(article.publisher.name,'MatchApp Ai');
 assert.equal(crumb.itemListElement.at(-1).item,route);
});
test('new route has one sitemap entry and a persistent generator entry',()=>{
 const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 const generator=fs.readFileSync(path.join(root,'tools/update-sitemap.js'),'utf8');
 assert.equal(xml.split('<loc>'+route+'</loc>').length-1,1);
 assert.match(generator,/guides\/choose-what-to-watch\//);
});
test('existing worldwide discovery guide links to the canonical editorial route',()=>{
 const src=fs.readFileSync(path.join(root,'guides/worldwide-entertainment-discovery/index.html'),'utf8');
 assert.match(src,/href="\/guides\/choose-what-to-watch\/"/);
 assert.match(src,/Netflix, Disney\+ and AI recommendations/);
});
