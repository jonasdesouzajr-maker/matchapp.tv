'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const actionLabels=['Matches','Resultados','Coincidencias','Correspondances','Treffer','Match','Eşleşmeler','Совпадения','التطابقات','मेल परिणाम','Kecocokan','マッチ結果','일치 결과','匹配结果'];
const homeLabels=['MatchApp home','Início MatchApp','Inicio de MatchApp','Accueil MatchApp','MatchApp Startseite','Home MatchApp','MatchApp ana sayfa','Главная MatchApp','الرئيسية في MatchApp','MatchApp होम','Beranda MatchApp','MatchApp ホーム','MatchApp 홈','MatchApp 首页'];
const variants=['ma-brand-lockup','matchapp-brand-link','ma-brand-home-link','ebook-text-wordmark','ebook-brand-local','ma-reference-header-brand'];
function scene(){
 const link=(name,index)=>'<a class="'+name+'" data-brand="'+index+'" href="/?brand='+index+'" data-book-aria="brand.home"><img src="/assets/brand/matchapp-wordmark.svg" width="28" height="28" alt="MatchApp"><span>Match</span><span>App</span><span>Ai</span></a>';
 const markup=variants.map(link).join('');
 const dom=new JSDOM('<!doctype html><html lang="en"><body class="ebook-page"><div id="ma-reference-header"><header>'+link('ma-reference-header-brand','header')+'<button id="header-arbitrary">Match</button><button id="header-explicit"><span>Match</span><i aria-hidden="true">✦</i></button></header></div><main class="ebook-matcher-root">'+markup+'<button id="ordinary"><span>Match</span><i aria-hidden="true">✦</i></button></main></body></html>',{url:'https://matchapp.tv/ebooks/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;Object.defineProperty(w.document,'readyState',{configurable:true,get:()=> 'complete'});w.MATCH_LANG='en';
 w.I18N=Object.fromEntries(languages.map((lang,index)=>[lang,{'act.matches':actionLabels[index]}]));
 w.t=key=>w.I18N[w.MATCH_LANG]?.[key]||key;
 const brands=[...w.document.querySelectorAll('[data-brand]')].map(node=>({node,children:[...node.childNodes],texts:[...node.querySelectorAll('span')].map(span=>({span,text:span.firstChild,value:span.textContent})),img:node.querySelector('img'),imgAttrs:[...node.querySelector('img').attributes].map(a=>[a.name,a.value]),href:node.getAttribute('href')}));
 let clicks=0;for(const {node}of brands)node.addEventListener('click',event=>{event.preventDefault();clicks++;});
 const language=lang=>{w.MATCH_LANG=lang;w.localStorage.setItem('match_lang',lang);w.document.documentElement.lang=lang;w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang}}));};
 const assertBrands=()=>{for(const item of brands){assert.equal(w.document.querySelector('[data-brand="'+item.node.dataset.brand+'"]'),item.node);assert.deepEqual([...item.node.childNodes],item.children);assert.equal(item.node.getAttribute('href'),item.href);assert.equal(item.node.querySelector('img'),item.img);assert.deepEqual([...item.img.attributes].map(a=>[a.name,a.value]),item.imgAttrs);for(const value of item.texts){assert.equal(value.span.firstChild,value.text);assert.equal(value.text.nodeValue,value.value);}}};
 return{w,brands,language,assertBrands,clicks:()=>clicks,close:()=>dom.window.close()};
}

test('real AI composer preserves every standalone brand owner across14 colliding action translations',t=>{
 const f=scene();t.after(f.close);const {w}=f,action=w.document.getElementById('ordinary'),text=action.querySelector('span').firstChild,icon=action.querySelector('i');let actionClicks=0;action.addEventListener('click',()=>actionClicks++);
 w.eval(read('ai-composer.js'));
 for(const [index,lang]of languages.entries()){f.language(lang);f.assertBrands();assert.equal(text.nodeValue,actionLabels[index],lang+' ordinary action still translates');assert.equal(action.querySelector('span').firstChild,text);assert.equal(action.querySelector('i'),icon);assert.equal(icon.textContent,'✦');}
 for(const {node}of f.brands)node.click();action.click();assert.equal(f.clicks(),variants.length+1);assert.equal(actionClicks,1);
});

test('real Books helper excludes brand and arbitrary header discovery while explicit aria and text bindings still translate',t=>{
 const f=scene();t.after(f.close);const {w}=f;w.eval(read('ebooks/locale.js'));const api=w.MatchAppBooksLocale;
 api.register(Object.fromEntries(languages.map((lang,index)=>[lang,{'ui.collision':actionLabels[index],'brand.home':homeLabels[index]}])));
 // Italian contains the real collision: act.matches and the first wordmark span both read Match.
 const explicit=w.document.querySelector('#header-explicit span').firstChild,explicitIcon=w.document.querySelector('#header-explicit i'),arbitrary=w.document.querySelector('#header-arbitrary').firstChild,ordinary=w.document.querySelector('#ordinary span').firstChild;
 api.bind(explicit,'ui.collision');api.paint();
 for(const [index,lang]of languages.entries()){f.language(lang);f.assertBrands();assert.equal(arbitrary.nodeValue,'Match',lang+' arbitrary header text belongs to its original owner');assert.equal(explicit.nodeValue,actionLabels[index],lang+' explicit header binding');assert.equal(w.document.querySelector('#header-explicit span').firstChild,explicit);assert.equal(w.document.querySelector('#header-explicit i'),explicitIcon);assert.equal(ordinary.nodeValue,actionLabels[index],lang+' Books action discovery outside header');for(const {node}of f.brands)assert.equal(node.getAttribute('aria-label'),homeLabels[index],lang+' explicit brand aria');}
 for(const {node}of f.brands)node.click();assert.equal(f.clicks(),variants.length+1);
});

test('a generically translated control releases Books ownership when moved into the shared header',t=>{
 const f=scene();t.after(f.close);const {w}=f;w.eval(read('ebooks/locale.js'));const api=w.MatchAppBooksLocale;
 api.register(Object.fromEntries(languages.map((lang,index)=>[lang,{'ui.collision':actionLabels[index]}])));
 const action=w.document.getElementById('ordinary'),text=action.querySelector('span').firstChild,icon=action.querySelector('i');let clicks=0;action.addEventListener('click',()=>clicks++);
 api.paint();f.language('pt-BR');assert.equal(text.nodeValue,actionLabels[1],'generic Books binding initially translates outside header');
 w.document.querySelector('#ma-reference-header header').append(action);text.nodeValue='Header owner label';f.language('ja');
 assert.equal(text.nodeValue,'Header owner label','moving into the header releases the earlier generic binding');assert.equal(action.querySelector('span').firstChild,text);assert.equal(action.querySelector('i'),icon);
 api.bind(text,'ui.collision');assert.equal(text.nodeValue,actionLabels[languages.indexOf('ja')],'an explicit owner can bind the same node after the move');
 for(const [index,lang]of languages.entries()){f.language(lang);assert.equal(text.nodeValue,actionLabels[index],lang+' explicit replacement binding');assert.equal(action.querySelector('span').firstChild,text);assert.equal(action.querySelector('i'),icon);}
 action.click();assert.equal(clicks,1);
});
