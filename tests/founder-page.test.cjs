'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),copy=require('../data/founder-copy.json');
test('founder biography is crawlable, self-canonical, linked, and sitemap durable',()=>{
 const d=new JSDOM(read('founder/index.html')).window.document;
 assert.equal(d.querySelectorAll('h1').length,1);assert.equal(d.querySelector('link[rel=canonical]').href,'https://matchapp.tv/founder/');
 assert.equal(d.querySelector('meta[name=robots]').content,'index,follow,max-image-preview:large');
 assert.ok(d.querySelector('article').textContent.split(/\s+/).length>700);
 const graph=JSON.parse(d.querySelector('#founder-schema').textContent)['@graph'];assert.equal(graph[0]['@type'],'ProfilePage');assert.equal(graph[0].mainEntity.name,'Jonas Junior');assert.equal(graph[0].mainEntity['@type'],'Person');
 assert.match(read('index.html'),/href="\/founder\/" data-founder-link/);assert.match(read('about.html'),/href="\/founder\/" data-founder-link/);assert.match(read('sitemap.xml'),/<loc>https:\/\/matchapp.tv\/founder\/<\/loc>/);assert.ok(read('tools/update-sitemap.js').includes('${SITE}/founder/'));
 for(const a of d.querySelectorAll('a[href^="/"]')){const url=new URL(a.href,'https://matchapp.tv');let f=url.pathname==='/'?'index.html':url.pathname.slice(1);if(f.endsWith('/'))f+='index.html';assert.ok(fs.existsSync(path.join(root,f)),f);}
});
test('all 14 authored locales update biography, portrait, mailto, metadata and schema without changing destinations',()=>{
 assert.equal(Object.keys(copy).length,14);
 for(const [lang,t]of Object.entries(copy)){
 assert.deepEqual(Object.keys(t).sort(),Object.keys(copy.en).sort(),lang);
 const dom=new JSDOM(read('founder/index.html'),{url:'https://matchapp.tv/founder/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.MATCH_LANG=lang==='pt'?'pt-BR':lang;d.documentElement.lang=w.MATCH_LANG;w.eval(read('patches/founder-copy.js'));w.eval(read('patches/founder-page.js'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
 for(const n of d.querySelectorAll('[data-founder]'))assert.equal(n.textContent,t[n.dataset.founder],lang+' '+n.dataset.founder);
 assert.equal(d.querySelector('h1').textContent,t.heading);assert.equal(d.querySelector('meta[name=description]').content,t.pageDesc);assert.equal(d.querySelector('#founder-portrait').alt,t.alt);assert.ok(d.querySelector('#founder-email').href.startsWith('mailto:support@matchapp.tv?subject='));
 assert.equal(JSON.parse(d.querySelector('#founder-schema').textContent)['@graph'][0].name,t.heading);assert.equal(d.querySelector('link[rel=canonical]').href,'https://matchapp.tv/founder/');
 assert.equal(d.querySelector('[data-founder=supportButton]').getAttribute('href'),'/#ma-donate-support');dom.window.close();
 }
});
test('founder page preserves voluntary support and image identity disclosures',()=>{
 assert.match(copy.en.caption,/AI/);assert.match(copy.en.learning,/courses offered by Ivy League/);assert.doesNotMatch(copy.en.learning,/degree|honors|honours|valedictorian/);
 assert.match(copy.en.emailNote,/review and send/);assert.match(copy.en.supportNote,/do not buy shares/);
 const d=new JSDOM(read('founder/index.html')).window.document,img=d.querySelector('#founder-portrait');assert.equal(img.width/img.height,.8);assert.equal(d.querySelectorAll('form').length,0);
 assert.ok(!d.querySelector('[src*="adsbygoogle"],ins.adsbygoogle'));assert.match(read('patches/founder-page.css'),/object-fit:contain/);
});

test('founder header keeps translated support labels intact with a synchronized cache key',()=>{
 const css=read('patches/founder-page.css');
 assert.match(css,/@layer ma-screen-fit \{\s*html body\.ma-founder-page #ma-founder-header #ma-donate-shortcut\{flex:0 0 auto!important;width:auto!important;min-width:max-content!important\}/);
 assert.match(css,/html body\.ma-founder-page #ma-founder-header #ma-donate-shortcut span\{flex:0 0 auto!important;white-space:nowrap!important;text-wrap:nowrap!important;word-break:normal!important;overflow-wrap:normal!important\}/);
 const dom=new JSDOM(read('founder/index.html')),href=dom.window.document.querySelector('link[href*="founder-page.css"]').getAttribute('href');
 assert.equal(href,'/patches/founder-page.css?v=20261016-4');assert.ok(read('tools/build-founder-page.cjs').includes(href));dom.window.close();
});
