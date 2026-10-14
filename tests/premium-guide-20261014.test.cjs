'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('how-it-works.html'),js=read('patches/premium-journey-20261014.js'),css=read('patches/premium-journey-20261014.css'),type=read('patches/premium-type-20261014.css');
test('premium guide is complete and crawlable with fourteen authentic destination chapters',()=>{
 const d=new JSDOM(html,{url:'https://matchapp.tv/how-it-works.html'});
 const steps=[...d.window.document.querySelectorAll('.journey-chapter')];
 assert.equal(steps.length,14);
 assert.equal(d.window.document.querySelectorAll('.journey-nav-item').length,14);
 assert.match(html,/rel="canonical" href="https:\/\/matchapp\.tv\/how-it-works\.html"/);
 assert.match(read('sitemap.xml'),/<loc>https:\/\/matchapp\.tv\/how-it-works\.html<\/loc>/);
 for(const step of steps){
  const link=step.querySelector('.journey-visit');
  assert.ok(link,'chapter lacks actual route');
  const u=new URL(link.href),rel=u.pathname==='/'?'index.html':u.pathname.substring(1);
  assert.ok(fs.existsSync(path.join(root,rel.endsWith('/')?rel+'index.html':rel)),'missing '+u.pathname);
  assert.ok(step.querySelector('h2').textContent.trim());
  assert.ok(step.querySelector('.journey-explain').textContent.length>80);
 }
 assert.equal(steps[steps.length-1].querySelector('.journey-visit').getAttribute('href'),'/');
 assert.equal(d.window.document.querySelector('.journey-home').getAttribute('href'),'/');
 d.window.close();
});
test('chapter UI changes without navigation or starting sound automatically',()=>{
 const d=new JSDOM(html,{url:'https://matchapp.tv/how-it-works.html',runScripts:'outside-only'});
 const w=d.window;const calls=[];
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLHeadingElement.prototype.focus=function(){};
 w.navigator.vibrate=()=>{calls.push('vibration');return true};
 w.eval(js);
 assert.equal(calls.length,0);
 assert.equal(w.document.body.classList.contains('journey-ready'),true);
 assert.equal(w.document.querySelectorAll('.journey-chapter:not([hidden])').length,1);
 assert.equal(w.document.querySelector('#journey-back').disabled,true);
 w.document.querySelector('#journey-next').click();
 assert.equal(w.document.querySelectorAll('.journey-chapter:not([hidden])').length,1);
 assert.equal(w.document.querySelector('.journey-chapter.is-active').dataset.guideStep,'1');
 assert.equal(w.document.querySelector('#journey-back').disabled,false);
 assert.equal(w.document.querySelector('#journey-position').textContent,'02 / 14');
 w.document.querySelector('[data-guide-goto="13"]').click();
 assert.equal(w.document.querySelector('.journey-chapter.is-active').dataset.guideStep,'13');
 assert.match(w.document.querySelector('#journey-next').textContent,/Find Your Next Experience/);
 d.window.close();
});
test('the guide follows supported locale, including pt-BR and right-to-left Arabic',()=>{
 const d=new JSDOM(html,{url:'https://matchapp.tv/how-it-works.html',runScripts:'outside-only'});
 const w=d.window;w.HTMLElement.prototype.scrollIntoView=function(){};
 w.localStorage.setItem('match_lang','pt-BR');w.eval(js);
 assert.equal(w.document.documentElement.lang,'pt-BR');
 assert.match(w.document.querySelector('h1').textContent,/Encontre Sua Próxima Experiência/);
 assert.match(w.document.querySelector('[data-guide-explain]').textContent,/página inicial/i);
 assert.equal(w.document.querySelector('.journey-note').hidden,true);
 w.localStorage.setItem('match_lang','ar');
 w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang'}));
 assert.equal(w.document.documentElement.dir,'rtl');
 assert.equal(w.document.documentElement.lang,'ar');
 assert.equal(w.document.querySelector('[data-guide-explain]').lang,'en');
 d.window.close();
});
test('Home and Explore guide entry points reach the same premium route',()=>{
 assert.match(read('matchapp-ia.js'),/location\.href='\/how-it-works\.html'/);
 assert.match(read('explore.html'),/href="\/how-it-works\.html"/);
 const explore=new JSDOM(read('explore.html')).window.document;
 assert.equal(explore.querySelectorAll('#how-it-works a[href="/how-it-works.html"]').length,1);
 assert.equal(explore.querySelectorAll('#how-it-works ol').length,0);

 assert.match(read('patches/home-watch-focus.js'),/'#how-it-works':'\/how-it-works\.html'/);
});
test('adult typography preserves Kids branding, motion preference and original heading scale',()=>{
 assert.match(read('brand.css'),/premium-type-20261014\.css/);
 assert.match(type,/not\(\.page-kids\)/);
 assert.match(type,/not\(\.kids-body\)/);
 assert.match(type,/prefers-reduced-motion:reduce/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(type,/(?:\.adsbygoogle|#ma-ambient-jonas|(?:^|\\n)body\\.page-kids\\s*\\{)/);
 assert.doesNotMatch(read('kids/kids.css'),/premium-type-20261014/);
});
