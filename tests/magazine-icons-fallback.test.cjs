'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');

function createReadingPage(){
 const dom=new JSDOM('<!doctype html><html><body><main id="results"></main></body></html>',{
  url:'https://matchapp.tv/discover.html',runScripts:'outside-only'
 });
 const w=dom.window;
 const mag={id:'mag-vogue',title:'Vogue',publisher:'Condé Nast',
  icon:'https://www.vogue.com/verso/static/vogue-global/assets/us/favicon.ico',
  issues:'https://www.vogue.com/magazine',site:'https://www.vogue.com/',
  subscription:'https://www.vogue.com/subscribe/',genres:['contemporary'],
  summary:'Fashion and style journalism',region:'GLOBAL'};
 w.MatchAppMagazines={items:[mag],buyLinks:()=>[
  {name:'Publisher subscription / issue options',url:mag.subscription}
 ]};
 w.MatchAppContentSafety={safeEntries:entries=>entries,isPornographicRequest:()=>false,
  unsafeLink:()=>false};
 w.MatchAppEbookAffiliate={isAffiliateLink:()=>false};
 w.eval(read('ebooks/reading-ai.js'));
 const resultCount=w.MatchAppReadingAI.render('suggest Vogue magazines',
  w.document.getElementById('results'));
 assert.equal(resultCount,1);
 return {dom,w,icon:w.document.querySelector('[data-reading-publisher-icon]'),
  fallback:w.document.querySelector('[data-reading-publisher-name]')};
}

test('Ask AI never shows empty magazine art when publisher blocks hotlinking',()=>{
 const view=createReadingPage();
 assert(view.icon);
 assert(view.fallback);
 assert.equal(view.icon.hasAttribute('onerror'),false,'avoid inline handlers and CSP conflicts');
 assert.equal(view.fallback.textContent,'Vogue');
 assert.equal(view.fallback.hidden,false);
 Object.defineProperty(view.icon,'naturalWidth',{configurable:true,get:()=>0});
 view.icon.dispatchEvent(new view.w.Event('error'));
 assert.equal(view.icon.hidden,true);
 assert.equal(view.fallback.hidden,false);
 view.dom.window.close();
});

test('Ask AI displays a genuine icon only when the image actually loaded',()=>{
 const view=createReadingPage();
 Object.defineProperty(view.icon,'naturalWidth',{configurable:true,get:()=>32});
 Object.defineProperty(view.icon,'complete',{configurable:true,get:()=>true});
 view.icon.dispatchEvent(new view.w.Event('load'));
 assert.equal(view.icon.hidden,false);
 assert.equal(view.fallback.hidden,true);
 view.dom.window.close();
});

test('all magazine matches retain the visible genuine publisher-name fallback on failed icons',()=>{
 const s=read('ebooks/ebook-matcher.js'),css=read('ebooks/ebook-matcher.css');
 assert.match(s,/<div data-magazine-brand>/);
 assert.match(s,/data-magazine-publisher-icon src=[\\s\\S]*?loading="eager"/,'selected magazine icon cannot remain lazy while hidden');
 assert.match(read('ebooks/reading-ai.js'),/data-reading-publisher-icon loading="eager"/);
 assert.match(s,/img\.onerror=\(\)=>\{img\.hidden=true;fallback\.hidden=false\}/);
 assert.match(css,/\.reading-ai-icon \[data-reading-publisher-name\]/);
});
