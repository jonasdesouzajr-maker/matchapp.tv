'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script id="mh-footer-fold">([\s\S]*?)<\/script>/)[1];
const labels={en:'Browse all streaming guides','pt-BR':'Ver todos os guias de streaming',es:'Ver todas las guías de streaming',fr:'Voir tous les guides de streaming',de:'Alle Streaming-Guides ansehen',it:'Scopri tutte le guide streaming',tr:'Tüm yayın rehberlerini görüntüle',ru:'Все руководства по стримингу',ar:'عرض جميع أدلة المشاهدة',hi:'स्ट्रीमिंग की सभी गाइड देखें',id:'Lihat semua panduan streaming',ja:'配信ガイドをすべて見る',ko:'모든 스트리밍 가이드 보기',zh:'查看所有流媒体指南'};
function scene(saved){
 const begin=html.indexOf('<footer class="seo-footer">'),end=html.indexOf('</footer>',begin)+9;
 const dom=new JSDOM('<!doctype html><html lang="en"><body>'+html.slice(begin,end)+'</body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window;w.MATCH_LANG='en';if(saved)w.localStorage.setItem('match_lang',saved);
 const before={links:[...w.document.querySelectorAll('a')],support:w.document.getElementById('ma-donate-support'),supportChildren:[...w.document.getElementById('ma-donate-support').children],legal:w.document.querySelector('.seo-footer-legal')};
 w.eval(script);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const fold=w.document.querySelector('details.seo-fold'),summary=fold?.querySelector(':scope > summary');
 return{w,before,fold,summary,close:()=>w.close()};
}
function intact(f){
 const {w,before,fold,summary}=f,d=w.document;
 assert.equal(d.querySelectorAll('details.seo-fold').length,1);assert.equal(d.querySelector('details.seo-fold'),fold);assert.equal(fold.querySelector(':scope > summary'),summary);
 assert.deepEqual([...d.querySelectorAll('a')],before.links);assert.equal(d.getElementById('ma-donate-support'),before.support);assert.deepEqual([...before.support.children],before.supportChildren);
 assert.equal(before.support.closest('details.seo-fold'),null);assert.equal(before.support.previousElementSibling,fold);assert.equal(d.querySelector('.seo-footer-legal'),before.legal);
}
test('saved Portuguese is authoritative when footer folding runs before document/global language hydration',t=>{
 const f=scene('pt-BR');t.after(f.close);
 assert.equal(f.w.document.documentElement.lang,'en');assert.equal(f.w.MATCH_LANG,'en');assert.equal(f.summary.textContent,labels['pt-BR']);assert.equal(f.fold.open,false);intact(f);
});
test('late hydration and language events update the existing summary without changing open state, links or support',t=>{
 const f=scene();t.after(f.close);const {w}=f;assert.equal(f.summary.textContent,labels.en);f.fold.open=true;
 const link=f.before.links[0];let clicks=0;link.addEventListener('click',event=>{event.preventDefault();clicks++;});
 w.MATCH_LANG='pt-BR';w.document.dispatchEvent(new w.Event('matchapp:langchange'));
 assert.equal(f.summary.textContent,labels['pt-BR']);assert.equal(f.fold.open,true);intact(f);link.click();assert.equal(clicks,1);
 w.MATCH_LANG='fr';w.dispatchEvent(new w.Event('matchapp:languagechange'));
 assert.equal(f.summary.textContent,labels.fr);assert.equal(f.fold.open,true);intact(f);
 w.dispatchEvent(new w.Event('resize'));assert.equal(f.fold.open,true);intact(f);
});
test('all fourteen explicit app languages have authored guide labels and retain the same fold/control nodes',t=>{
 const f=scene();t.after(f.close);const {w}=f;const seen=new Set();
 for(const[lang,label]of Object.entries(labels)){
  f.fold.open=!f.fold.open;const open=f.fold.open;w.localStorage.setItem('match_lang',lang);w.MATCH_LANG='en';w.document.documentElement.lang='en';w.document.dispatchEvent(new w.Event('matchapp:langchange'));
  assert.equal(f.summary.textContent,label,lang);seen.add(f.summary.textContent);assert.equal(f.fold.open,open);intact(f);
 }
 assert.equal(seen.size,14);
});
test('cross-tab storage language changes and unavailable storage use the existing selected-language fallbacks',t=>{
 const f=scene('en');t.after(f.close);const {w}=f;f.fold.open=true;
 w.localStorage.setItem('match_lang','pt-BR');w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:'pt-BR'}));assert.equal(f.summary.textContent,labels['pt-BR']);
 w.localStorage.setItem('match_lang','de');w.dispatchEvent(new w.StorageEvent('storage',{key:'unrelated',newValue:'de'}));assert.equal(f.summary.textContent,labels['pt-BR']);
 w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:'de'}));assert.equal(f.summary.textContent,labels.de);
 Object.defineProperty(w,'localStorage',{get(){throw new Error('Storage unavailable');}});w.MATCH_LANG='ja';w.document.dispatchEvent(new w.Event('matchapp:langchange'));assert.equal(f.summary.textContent,labels.ja);
 w.MATCH_LANG='';w.document.documentElement.lang='pt-BR';w.dispatchEvent(new w.StorageEvent('storage',{key:null}));assert.equal(f.summary.textContent,labels['pt-BR']);assert.equal(f.fold.open,true);intact(f);
 const invalid=scene('constructor');t.after(invalid.close);invalid.w.MATCH_LANG='pt-BR';invalid.w.document.dispatchEvent(new invalid.w.Event('matchapp:langchange'));assert.equal(invalid.summary.textContent,labels['pt-BR']);intact(invalid);
});
