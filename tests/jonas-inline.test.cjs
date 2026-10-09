'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(ROOT,'jonas/floating-home.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'jonas/floating-home.css'),'utf8');
const homepage=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const start=homepage.indexOf('<aside id="ma-jonas-home"'),end=homepage.indexOf('</aside>',start);
const widget=homepage.slice(start,end+8);
function fixture(locale='en'){
 const html='<!doctype html><html lang="'+locale+'"><head></head><body class="page-home"><div class="lazy-head">Ask MatchApp Ai</div><section id="ma-ai-entry"><div id="ma-panel-ask"><article id="search-box"><textarea id="specific-search-input"></textarea></article></div></section>'+widget+'</body></html>';
 const dom=new JSDOM(html,{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 dom.window.matchMedia=()=>({matches:false});
 dom.window.eval(script);
 return dom;
}
test('Jonas replaces Ask field without deleting the original matching/AI form',()=>{
 const d=fixture(),doc=d.window.document;
 assert.ok(doc.body.classList.contains('ma-jonas-inline'));
 assert.ok(doc.querySelector('#ma-ai-entry>#ma-jonas-inline-dock>#ma-jonas-home'));
 assert.equal(doc.querySelectorAll('#ma-jonas-home').length,1);
 assert.ok(doc.getElementById('specific-search-input'));
 assert.ok(doc.querySelector('#ma-ai-entry #ma-panel-ask'));
 assert.ok(css.includes('#ma-ai-entry > :not(#ma-jonas-inline-dock)'));
 assert.ok(doc.querySelector('.ma-jonas-legacy-head'));
 assert.ok(css.includes('.ma-jonas-legacy-head'));
 d.window.close();
});
test('mouse/touch dragging moves Jonas without opening the conversation; returning restores his dock',()=>{
 const d=fixture(),w=d.window,doc=w.document,bubble=doc.getElementById('ma-jonas-home-bubble');
 function pointer(type,x,y){const event=new w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});Object.defineProperty(event,'pointerId',{value:4});return event;}
 bubble.dispatchEvent(pointer('pointerdown',120,300));
 w.dispatchEvent(pointer('pointermove',180,240));
 w.dispatchEvent(pointer('pointerup',180,240));
 assert.ok(doc.getElementById('ma-jonas-home').classList.contains('is-floating'));
 assert.equal(doc.getElementById('ma-jonas-home').parentElement,doc.body);
 assert.equal(doc.getElementById('ma-jonas-home-panel').hidden,true);
 assert.ok(doc.querySelector('#ma-jonas-inline-dock .jh-return'));
 assert.ok(w.localStorage.getItem('matchapp-jonas-inline-position-v1'));
 doc.querySelector('.jh-return').click();
 assert.ok(doc.querySelector('#ma-ai-entry>#ma-jonas-inline-dock>#ma-jonas-home'));
 assert.ok(!w.localStorage.getItem('matchapp-jonas-inline-position-v1'));
 assert.equal(doc.getElementById('ma-jonas-home').classList.contains('is-floating'),false);
 d.window.close();
});
test('Portuguese caption and original secure AI route stay available',()=>{
 const d=fixture('pt-BR'),doc=d.window.document;
 assert.match(doc.querySelector('.jh-inline-copy small').textContent,/Arraste/);
 assert.equal(doc.querySelector('.jh-form').getAttribute('action'),'/discover.html');
 assert.match(css,/body\.ma-jonas-inline #ma-jonas-home\.is-floating/);
 assert.match(css,/@media\(max-width:390px\)/);
 d.window.close();
});
