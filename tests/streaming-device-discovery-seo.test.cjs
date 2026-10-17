'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const route='https://matchapp.tv/guides/streaming-device-discovery/';
const rel='guides/streaming-device-discovery/index.html';
const html=fs.readFileSync(path.join(root,rel),'utf8');
function dom(){return new JSDOM(html);}
test('device guide is indexable and uniquely useful with consistent brand identity',()=>{
 const {window}=dom(),d=window.document;
 assert.equal(d.documentElement.lang,'en');
 assert.equal(d.querySelectorAll('h1').length,1);
 assert.match(d.title,/Google TV, Chromecast, Roku & Fire TV/);
 assert.equal(d.querySelector('link[rel="canonical"]').href,route);
 assert.match(d.querySelector('meta[name="description"]').content,/mood with MatchApp Ai/);
 assert.match(d.querySelector('meta[name="robots"]').content,/index/);
 assert.ok(!d.querySelector('meta[name="keywords"]'),'No ranking-by-keyword stuffing');
 const text=d.body.textContent.replace(/\s+/g,' ').trim();
 assert.ok(text.length>6300,'Guide should have substantial original editorial value');
 for(const term of ['Google Home','Chromecast','Google TV','Roku','Fire TV','Apple TV 4K','Samsung TV Plus','LG Channels','Plex','Tubi','Pluto TV']){
  assert.ok(text.includes(term),'Missing researched device or service '+term);
 }
 assert.match(text,/does not.*remotely control your television/i);
 assert.match(text,/not affiliated with Google/i);
 assert.match(text,/country|region/i);
 window.close();
});
test('device and media services are distinguished without unsupported claims',()=>{
 const {window}=dom(),d=window.document;
 const text=d.body.textContent.replace(/\s+/g,' ').trim();
 assert.match(text,/Google Home is not the same thing as Google TV/);
 assert.match(text,/Roku device versus The Roku Channel/);
 assert.match(text,/Fire TV and Prime Video are different products/);
 assert.match(text,/Apple TV 4K.*Apple TV app/);
 assert.match(text,/not.*claim native Roku, Fire TV, tvOS/i);
 assert.ok(!/MatchApp Ai.*(?:casts directly|controls your Roku|unlocks Disney\+)/i.test(text));
 window.close();
});
test('internal CTA destinations exist and source links identify official operators',()=>{
 const {window}=dom(),d=window.document;
 for(const a of [...d.querySelectorAll('a[href]')]){
  const href=a.getAttribute('href');
  if(href.startsWith('#')){assert.ok(d.getElementById(href.slice(1)),href+' missing section');continue;}
  if(href.startsWith('/')){
   const u=new URL(href,route); let p=path.join(root,decodeURIComponent(u.pathname));
   if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
   assert.ok(fs.existsSync(p),'Missing internal landing page '+href);
  }else{
   const u=new URL(href);
   assert.equal(u.protocol,'https:','Only TLS-based official source links');
   assert.match(a.rel,/noopener/,'External link needs noreferrer/noopener');
  }
 }
 for(const host of ['support.google.com','tv.google','support.roku.com','digprjsurvey.amazon.com','apple.com','news.samsung.com','lg.com','support.plex.tv'])
  assert.ok([...d.querySelectorAll('a[href]')].some(a=>{try{return new URL(a.href).hostname===host;}catch{return false;}}),'Missing official '+host);
 window.close();
});
test('structured data describes visible guide, not fabricated offers',()=>{
 const {window}=dom(),d=window.document;
 const entities=[...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(el=>{const o=JSON.parse(el.textContent);return o['@graph']||[o];});
 const article=entities.find(e=>e['@type']==='Article'),crumb=entities.find(e=>e['@type']==='BreadcrumbList');
 assert.ok(article&&crumb);
 assert.equal(article.mainEntityOfPage,route);
 assert.equal(article.publisher.name,'MatchApp Ai');
 assert.equal(crumb.itemListElement.at(-1).item,route);
 assert.equal(article.datePublished,'2026-10-17');
 assert.ok(!entities.some(e=>e.offers||e.aggregateRating||e.review));
 window.close();
});
test('new route is linked and survives future sitemap regeneration',()=>{
 const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 const generator=fs.readFileSync(path.join(root,'tools/update-sitemap.js'),'utf8');
 const prior=fs.readFileSync(path.join(root,'guides/choose-what-to-watch/index.html'),'utf8');
 assert.equal(xml.split('<loc>'+route+'</loc>').length-1,1);
 assert.match(generator,/guides\/streaming-device-discovery\//);
 assert.match(prior,/href="\/guides\/streaming-device-discovery\/"/);
});
test('dedicated guide keeps responsive UI scoped and original ads untouched',()=>{
 const {window}=dom(),d=window.document;
 assert.ok(d.querySelector('#sd-article'));
 const css=d.querySelector('style').textContent;
 assert.match(css,/#sd-article \.card/);
 assert.match(css,/#sd-article \.panel/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.ok(!html.includes('adsbygoogle'),'No advertising inventory on editorial page');
 assert.ok(html.includes('GTM-M7J3NNBN'),'Reuse existing analytics container');
 window.close();
});
