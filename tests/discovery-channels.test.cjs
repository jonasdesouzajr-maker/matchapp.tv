const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const {route,pages,render} = require('../tools/build-discovery-channels.cjs');
const copy = require('../channels/copy.json');
const localMedia = require('../channels/local-media.json');
const root = path.join(__dirname,'..');
const read = rel => fs.readFileSync(path.join(root,rel),'utf8');

test('all localized discovery routes have static content, reciprocal alternates and a self-canonical',()=>{
  assert.ok(copy['zh-TW'] && copy.zh && copy.ko);
  const sitemap = read('sitemap.xml');
  for(const [page,groups] of Object.entries(pages)) for(const [lang,t] of Object.entries(copy)) {
    const url = 'https://matchapp.tv'+route(page,lang);
    const html = read(route(page,lang)+'index.html');
    assert.equal(html,render(page,lang));
    const dom = new JSDOM(html,{url});
    const doc = dom.window.document;
    assert.equal(doc.documentElement.lang,lang);
    assert.equal(doc.documentElement.dir,lang==='ar'?'rtl':'ltr');
    assert.equal(doc.querySelector('h1').textContent,t[page]);
    assert.equal(doc.querySelector('[rel=canonical]').href,url);
    assert.ok(sitemap.includes('<loc>'+url+'</loc>'));
    for(const other of Object.keys(copy)) assert.equal(doc.querySelector('[hreflang="'+other+'"]').href,'https://matchapp.tv'+route(page,other));
    if(page==='tech') {
      const [section,entry]=Object.entries(localMedia[lang])[0];
      assert.equal(doc.getElementById(section).querySelector('a').href,entry[2]);
    }
    const graph=JSON.parse(doc.querySelector('[type="application/ld+json"]').textContent);
    assert.equal(graph.mainEntity.numberOfItems,doc.querySelectorAll('article li').length);
    for(const group of groups) assert.ok(doc.getElementById(group).querySelectorAll('a').length>=2);
    dom.window.close();
  }
});
test('Jonas suggests only same-site channel destinations and keeps language, format and frame handoff',()=>{
  const dom=new JSDOM('',{url:'https://matchapp.tv/discover.html',runScripts:'outside-only'});
  for(const script of ['channels/labels.js','channels/discovery.js'])dom.window.eval(read(script));
  const channels=dom.window.MatchAppChannels;
  for(const [q,lang,group] of [
    ['Suggest a tech audiobook','en','audiobook'],['Um podcast de tecnologia','pt-BR','podcast'],
    ['Quiero un libro de tecnología','es','book'],['プログラミングの動画','ja','video'],['推荐科技有声书','zh','audiobook'],
    ['推薦科技有聲書','zh-TW','audiobook'],['程式設計影片','zh-TW','video'],['기술 팟캐스트','ko','podcast'],['كتب عن البرمجة','ar','book'],['तकनीक की किताब','hi','book'],
    ['книги о технологиях','ru','book'],['Technik Hörbuch','de','audiobook'],['podcast di tecnologia','it','podcast'],
    ['podcast sur la technologie','fr','podcast'],['teknoloji sesli kitap','tr','audiobook'],['buku teknologi','id','book']
  ])assert.equal(channels.linkFor(q,lang).getAttribute('href'),route('tech',lang)+'#'+group);
  for(const alias of ['zh-Hant','zh-HK','zh-MO','zh-Hant-HK']) assert.equal(channels.linkFor('科技有聲書',alias).getAttribute('href'),'/tech/zh-tw/#audiobook');
  assert.equal(channels.linkFor('科技有声书','zh-Hans-TW').getAttribute('href'),'/tech/zh/#audiobook');
  assert.equal(channels.linkFor('find a romantic movie','en'),null);
  assert.equal(channels.linkForKey('javascript:alert(1)','en'),null);
  assert.equal(channels.isNavigation('open the tech channel'),true);
  assert.equal(channels.isNavigation('recommend a tech audiobook'),false);
  for(const t of Object.values(copy))assert.equal(channels.isNavigation(t.tech),true);
  dom.window.close();
});
