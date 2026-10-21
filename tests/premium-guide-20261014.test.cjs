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
 assert.equal(w.document.querySelector('[data-guide-explain]').lang,'ar');
 d.window.close();
});
test('same-page language changes update the visible guide without resetting its chapter or leaving a stale speech language',()=>{
 const d=new JSDOM(html,{url:'https://matchapp.tv/how-it-works.html#chapter-3',runScripts:'outside-only'}),w=d.window;
 w.localStorage.setItem('match_lang','ar');w.eval(js);
 assert.equal(w.document.querySelector('.journey-chapter.is-active').dataset.guideStep,'2');
 assert.equal(w.document.querySelector('[data-guide-explain]').lang,'ar');
 w.localStorage.setItem('match_lang','pt-BR');w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
 assert.equal(w.document.documentElement.lang,'pt-BR');assert.equal(w.document.documentElement.dir,'ltr');
 assert.equal(w.document.querySelector('[data-guide-explain]').lang,'pt-BR');
 assert.match(w.document.querySelector('[data-guide-explain]').textContent,/página inicial/i);
 assert.equal(w.document.querySelector('.journey-chapter.is-active').dataset.guideStep,'2');assert.equal(w.location.hash,'#chapter-3');
 d.window.close();
});
test('Guide kickers and footer follow all fourteen languages without duplicate hooks or resetting the active chapter',()=>{
 const expected={
  en:['Field guide','Discovery','About','Privacy','Terms','All rights reserved','Legal'],
  'pt-BR':['Guia de exploração','Descoberta','Sobre','Privacidade','Termos','Todos os direitos reservados','Informações legais'],
  es:['Guía de exploración','Descubrimiento','Acerca de','Privacidad','Términos','Todos los derechos reservados','Información legal'],
  fr:['Guide de découverte','Découverte','À propos','Confidentialité','Conditions','Tous droits réservés','Informations légales'],
  de:['Entdeckungsführer','Entdeckung','Über uns','Datenschutz','Bedingungen','Alle Rechte vorbehalten','Rechtliches'],
  it:['Guida alla scoperta','Scoperta','Chi siamo','Privacy','Termini','Tutti i diritti riservati','Informazioni legali'],
  tr:['Keşif rehberi','Keşif','Hakkımızda','Gizlilik','Koşullar','Tüm hakları saklıdır','Yasal bilgiler'],
  ru:['Путеводитель','Открытие','О нас','Конфиденциальность','Условия','Все права защищены','Правовая информация'],
  ar:['دليل الاستكشاف','اكتشاف','نبذة عنا','الخصوصية','الشروط','جميع الحقوق محفوظة','معلومات قانونية'],
  hi:['खोज मार्गदर्शिका','खोज','हमारे बारे में','गोपनीयता','शर्तें','सर्वाधिकार सुरक्षित','कानूनी जानकारी'],
  id:['Panduan penjelajahan','Penjelajahan','Tentang kami','Privasi','Ketentuan','Hak cipta dilindungi','Informasi hukum'],
  ja:['探索ガイド','発見','アプリについて','プライバシー','利用規約','すべての権利を保有します','法的情報'],
  ko:['탐색 가이드','발견','앱 소개','개인정보 보호','이용약관','모든 권리 보유','법적 정보'],
  zh:['探索指南','发现','关于我们','隐私','条款','保留所有权利','法律信息']
 };
 const d=new JSDOM(html.replace('© 2026 MatchApp Ai','© 2031 MatchApp Ai'),{url:'https://matchapp.tv/how-it-works.html#chapter-6',runScripts:'outside-only'}),w=d.window,doc=w.document;
 const chapters=[...doc.querySelectorAll('.journey-chapter')],hooks=chapters.map(chapter=>chapter.querySelector('[data-guide-hook]'));
 const originalHooks=hooks.map(hook=>hook.textContent),links=[...doc.querySelectorAll('.journey-footer a')],routes=links.map(link=>link.getAttribute('href'));
 const navigation=[...doc.querySelectorAll('[data-guide-goto]')];
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.eval(js);
 try{
  for(const [locale,copy] of Object.entries(expected)){
   w.localStorage.setItem('match_lang',locale);doc.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
   assert.equal(doc.querySelector('.journey-eyebrow').textContent,'MatchApp Ai · '+copy[0],locale);
   assert.equal(doc.querySelector('.journey-footer > span').textContent,'© 2031 MatchApp Ai · '+copy[5],locale);
   assert.equal(doc.querySelector('.journey-footer nav').getAttribute('aria-label'),copy[6],locale);
   assert.deepEqual(links.map(link=>link.textContent),copy.slice(2,5),locale);
   assert.deepEqual(links.map(link=>link.getAttribute('href')),routes,locale);
   assert.deepEqual([...doc.querySelectorAll('.journey-footer a')],links,'preserve original footer links');
   assert.equal(doc.querySelector('.journey-chapter.is-active').id,'chapter-6',locale);
   assert.equal(w.location.hash,'#chapter-6',locale);
   assert.equal(doc.querySelector('#journey-position').textContent,'06 / 14',locale);
   chapters.forEach((chapter,i)=>{
    assert.equal(chapter.querySelector('.journey-number').textContent,copy[1]+' '+String(i+1).padStart(2,'0')+' / 14',locale);
    assert.equal(chapter.querySelector('[data-guide-hook]'),hooks[i],'preserve original hook node');
    assert.equal(hooks[i].hidden,locale!=='en',locale+' chapter '+(i+1));
    if(locale==='en') assert.equal(hooks[i].textContent,originalHooks[i]);
    else assert.equal(hooks[i].textContent,chapter.querySelector('[data-guide-title]').textContent,'only the redundant hook is hidden');
   });
  }
  w.localStorage.setItem('match_lang','en');doc.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
  assert.deepEqual(hooks.map(hook=>hook.textContent),originalHooks);
  assert.ok(hooks.every(hook=>!hook.hidden),'distinct English hooks are restored');
  assert.deepEqual([...doc.querySelectorAll('[data-guide-goto]')],navigation,'keep original chapter controls');
  navigation[8].click();assert.equal(doc.querySelector('.journey-chapter.is-active').id,'chapter-9');
  doc.querySelector('#journey-back').click();assert.equal(doc.querySelector('.journey-chapter.is-active').id,'chapter-8');
 }finally{w.close();}
});
test('chapter navigation reveals its content while scrolling the chapter index locally',()=>{
 const d=new JSDOM(html,{url:'https://matchapp.tv/how-it-works.html',runScripts:'outside-only'}),w=d.window,calls=[];
 w.HTMLElement.prototype.scrollIntoView=function(options){calls.push({node:this,options});};w.eval(js);
 const target=w.document.querySelector('[data-guide-goto="4"]'),rail=target.parentElement;
 Object.defineProperties(rail,{scrollWidth:{value:900},clientWidth:{value:280}});
 rail.getBoundingClientRect=()=>({left:0,right:280});target.getBoundingClientRect=()=>({left:600,right:740,top:0,bottom:54});
 rail.scrollBy=options=>calls.push({node:rail,options});target.click();
 assert.equal(calls.length,2);assert.equal(calls[0].node,w.document.querySelector('.journey-chapter.is-active'));assert.equal(calls[0].options.block,'start');
 assert.equal(calls[1].node,rail);assert.equal(calls[1].options.left,460);assert.equal(w.location.hash,'#chapter-5');
 assert.equal(w.document.activeElement,w.document.querySelector('.journey-chapter.is-active h2'));
 d.window.close();
});
test('shared control balancing preserves the dedicated chapter rail and its original actions',()=>{
 const d=new JSDOM(html,{url:'https://matchapp.tv/how-it-works.html',runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
 Object.defineProperty(w.document,'readyState',{get:()=> 'complete'});w.document.documentElement.classList.add('ma-reference');
 w.HTMLElement.prototype.getClientRects=()=>[{width:300,height:44}];w.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,right:300,top:0,bottom:44,width:300,height:44});
 w.Range.prototype.getClientRects=()=>[{top:0,width:30,height:14}];w.HTMLCanvasElement.prototype.getContext=()=>({measureText:text=>({width:text.length*6})});
 const rail=w.document.querySelector('.journey-chapter-links'),buttons=[...rail.children];rail.style.display='flex';let calls=0;buttons[4].addEventListener('click',()=>calls++);
 const ordinary=w.document.createElement('div');ordinary.className='button-group';ordinary.innerHTML='<button>One</button><button>Two</button><button>Three</button>';w.document.body.appendChild(ordinary);
 w.eval(read('patches/reference-density.js'));
 assert.equal(ordinary.getAttribute('data-ma-density'),'balanced','the shared pass still runs for normal action rows');
 assert.equal(rail.hasAttribute('data-ma-density'),false);assert.deepEqual([...rail.children],buttons);buttons[4].click();assert.equal(calls,1);
 d.window.close();
});
test('Home and Explore guide entry points reach the same premium route',()=>{
 assert.match(read('matchapp-ia.js'),/location\.href='\/how-it-works\.html'/);
 assert.match(read('explore.html'),/href="\/how-it-works\.html"/);
 const explore=new JSDOM(read('explore.html')).window.document;
 assert.equal(explore.querySelectorAll('.ref-secondary-topics a[href="/how-it-works.html"]').length,1);
 assert.ok(explore.querySelector('.ref-secondary-topics a[href="/how-it-works.html"] [data-i18n="how.title"]'));
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
