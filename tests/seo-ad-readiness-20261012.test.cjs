'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const logo='https://matchapp.tv/assets/brand/matchapp-official-icon-512.webp';
test('contact schema names our real organization and its existing logo',()=>{
 const html=read('contact.html');
 const scripts=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 const org=scripts.map(m=>JSON.parse(m[1])).find(x=>x['@type']==='ContactPage')?.mainEntity;
 assert.equal(org?.name,'MatchApp Ai');
 assert.equal(org?.logo?.url,logo);
 assert.ok(fs.existsSync(path.join(root,'assets/brand/matchapp-official-icon-512.webp')));
});
test('where-to-watch hub contains actual indexable title links in valid CollectionPage JSON-LD',()=>{
 const html=read('where-to-watch/index.html');
 const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
 const schema=schemas.find(x=>x['@type']==='CollectionPage');
 assert.ok(schema,'CollectionPage missing');
 assert.equal(schema.url,'https://matchapp.tv/where-to-watch/');
 assert.equal(schema.mainEntity.numberOfItems,81);
 assert.equal(schema.mainEntity.itemListElement.length,81);
 assert.equal(new Set(schema.mainEntity.itemListElement.map(i=>i.url)).size,81);
 for(const i of schema.mainEntity.itemListElement){
   assert.equal(i['@type'],'ListItem');
   assert.ok(html.includes('href="'+new URL(i.url).pathname+'"'),i.url+' lacks visible link');
 }
 assert.match(html,/<link rel="canonical" href="https:\/\/matchapp.tv\/where-to-watch\/"/);
});
test('the higher-impression Kota guide offers original verifiable visitor details',()=>{
 const html=read('events/kota-dussehra-2026/index.html');
 const title=html.match(/<title>(.*?)<\/title>/s)?.[1];
 const description=html.match(/<meta name="description" content="([^"]+)/)?.[1];
 assert.ok(title?.includes('Kota Dussehra Mela 2026'));
 assert.ok(title.length<75, title);
 assert.ok(description?.length<160,description);
 assert.match(html,/Before visiting or looking for coverage/);
 assert.match(html,/in-person cultural fair/);
 assert.match(html,/does not independently confirm/);
 assert.match(html,/https:\/\/www.incredibleindia.gov.in/);
 assert.equal((html.match(/Before visiting or looking for coverage/g)||[]).length,1);
});
test('generated pages have source-owned instructions and protected pages untouched',()=>{
 const events=JSON.parse(read('tools/global-events.json'));
 const item=events.find(x=>x.slug==='kota-dussehra-2026');
 assert.equal(item.visitorNotes.length,3);
 assert.match(read('tools/build-global-events.js'),/visitorNotes/);
 assert.match(read('tools/build-watch-pages.js'),/CollectionPage/);
 assert.ok(!read('sitemap.xml').includes('/profile/profile.html'));
 assert.match(read('profile/profile.html'),/noindex/i);
});
