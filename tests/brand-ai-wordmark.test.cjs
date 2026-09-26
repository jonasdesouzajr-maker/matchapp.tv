'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('adult Home paints integrated MatchApp Ai beside the unchanged official orb at first paint',()=>{
 const doc=new JSDOM(read('index.html')).window.document;
 const lockup=doc.querySelector('#mh-topbox #home-brand-lockup .ma-brand-lockup');
 assert.ok(lockup,'Canonical header must exist even before scripts run');
 const home=lockup.querySelector('a.ma-brand-home-link');
 assert.equal(home.getAttribute('aria-label'),'MatchApp Ai home');
 assert.match(home.querySelector('.ma-brand-orb').getAttribute('src'),/matchapp-home-orb-transparent\.webp/);
 assert.equal(home.querySelector('.ma-brand-orb').getAttribute('alt'),'','decorative image avoids repeated text');
 assert.equal(home.querySelector('.ma-word-match').textContent,'Match');
 assert.equal(home.querySelector('.ma-word-app').textContent,'App');
 assert.equal(home.querySelector('[data-ma-brand-ai]').textContent,'Ai');
 assert.equal(lockup.querySelector('.ma-tv'),null,'No legacy TV word remains');
 assert.equal(lockup.querySelector('.ma-ai-brand-button'),null,'No orphaned glow-button Ai remains');
 assert.equal(lockup.querySelectorAll('[data-ma-brand-ai]').length,1);
 assert.match(read('index.html'),/brand-headline\.css\?v=20260926-brandai1/);
 assert.match(read('index.html'),/matchapp-ia\.js\?v=20260926-brandai1/);
});

test('other adult route headers replace old raster/SVG TV wordmark without changing navigation',()=>{
 const html='<!doctype html><html lang="en"><head><title>Discover | MatchApp TV Ai</title></head><body>'+
   '<header class="app-header"><a href="/" class="header-brand-area matchapp-brand-link" aria-label="MatchApp TV Ai">'+
   '<img class="matchapp-wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg" alt="MatchApp TV Ai"></a>'+
   '<nav><a id="keep-action" href="/pricing/">Existing action</a></nav></header><h1>Discover</h1></body></html>';
 const dom=new JSDOM(html,{url:'https://matchapp.tv/discover.html',runScripts:'outside-only'});
 const w=dom.window;
 w.eval(read('page-shell.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const header=w.document.querySelector('body.page-shell header.app-header.mh-topbox');
 assert.ok(header);
 assert.equal(header.querySelectorAll('.ma-brand-lockup').length,1);
 assert.equal(header.querySelectorAll('.matchapp-wordmark').length,0,'Static TV graphic must be replaced');
 assert.equal(header.querySelector('.ma-brand-copy').textContent.replace(/\s+/g,''),'MatchAppAi');
 assert.match(header.querySelector('.ma-brand-orb').getAttribute('src'),/matchapp-home-orb-transparent\.webp/);
 assert.equal(header.querySelector('.ma-brand-home-link').getAttribute('aria-label'),'MatchApp Ai home');
 assert.equal(header.querySelector('#keep-action').getAttribute('href'),'/pricing/','Route account/nav survives');
 assert.ok(header.querySelector('#mh-home-btn'),'Shared Home control remains');
 w.MATCH_LANG='pt-BR';
 w.document.documentElement.lang='pt-BR';
 w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang:'pt-BR'}}));
 assert.equal(header.querySelector('[data-ma-brand-ai]').textContent,'iA');
 assert.equal(header.querySelector('.ma-brand-home-link').getAttribute('aria-label'),'MatchApp iA home');
 w.MATCH_LANG='en';
 w.document.documentElement.lang='en';
 w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang:'en'}}));
 assert.equal(header.querySelector('[data-ma-brand-ai]').textContent,'Ai');
 assert.equal(header.querySelectorAll('[data-ma-brand-ai]').length,1,'Repeated switching cannot duplicate branding');
 dom.window.close();
});

test('shared runtime fallback changes only the brand and rerenders English/PT-BR without creating detached Ai',()=>{
 const js=read('matchapp-ia.js');
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'matchapp-ia.js'}));
 assert.match(js,/class="ma-word-ai" data-ma-brand-ai>Ai/);
 assert.match(js,/function applyBrandLocale\(\)/);
 assert.match(js,/langKey\(\)==='pt-BR'\?'MatchApp iA':'MatchApp Ai'/);
 assert.match(js,/document\.addEventListener\('matchapp:langchange',\(\)=>setTimeout\(applyLanguage,0\)\)/);
 assert.doesNotMatch(js,/'<button type="button" class="ma-ai-brand-button"/);
 assert.match(js,/\.ma-tab/,'Existing dedicated Ask AI tab must not be removed');
 assert.match(read('home-approved.js'),/ma-hero-ask/,'Keep direct Ask AI shortcut on Home');
});

test('signature metallic type stays bold, bounded, responsive and accessible on all adult routes',()=>{
 const css=read('brand-headline.css');
 assert.match(css,/font-weight:950!important/);
 assert.match(css,/\.ma-word-match/);
 assert.match(css,/\.ma-word-app/);
 assert.match(css,/\.ma-word-ai/);
 assert.match(css,/linear-gradient\(165deg,#FFF4C0/);
 assert.match(css,/linear-gradient\(104deg,#D4A8FF/);
 assert.match(css,/@keyframes maSignatureWordmarkGlint/);
 assert.match(css,/7\.6s ease-out 1 both/,'One-time shimmer only; never loop GPU filters');
 // User-approved AI energy is confined to the tiny branded letters.
 assert.ok(css.includes('@keyframes maAiIntelligenceGlint'));
 assert.ok(css.includes('@keyframes maAiSignalMote'));
 assert.ok(css.includes('@keyframes maAiSignatureStar'));
 assert.ok(css.includes('maAiIntelligenceGlint 13s'));
 assert.ok(css.includes('maAiSignalMote 9.5s'));
 assert.ok(css.includes('maAiSignatureStar 6.7s'));
 assert.doesNotMatch(css,/animation:[^;]*filter[^;]*infinite/);
 assert.ok(css.includes('@media(max-width:700px),(pointer:coarse)'));
 assert.ok(css.includes('html.reduce-motion body.ebook-page'));
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/html\.reduce-motion body\.page-home/);
 assert.match(css,/html body\.page-shell header\.app-header\.mh-topbox/);
 assert.match(read('page-shell.css'),/^@import url\("\/brand-headline\.css\?v=20260926-brandai1"\);/);
});

test('normal submitted Android package inherits web typography; Kids remains separate',()=>{
 const android=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(android,/https:\/\/matchapp\.tv/);
 assert.match(android,/keep production pages fresh|Keep production pages fresh/i);
 assert.match(read('android-studio/app/src/main/res/values/strings.xml'),/<string name="app_name">MatchApp Ai<\/string>/);
 assert.doesNotMatch(read('kids/index.html'),/brand-headline\.css|ma-word-ai/);
 assert.match(read('AGENTS.md'),/CANONICAL MATCHAPP AI\/iA HEADER WORDMARK/);
 assert.match(read('AGENTS.md'),/MANDATORY POST-CHANGE MATCHING, BOOKWORMS, AI AND ORIGINAL ART REGRESSION/);
});
