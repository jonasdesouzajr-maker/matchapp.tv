'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const assets=path.join(__dirname,'..','android-studio','app','src','main');
const script=fs.readFileSync(path.join(assets,'assets/avatar-ai/android-jonas-inline.js'),'utf8');
const activity=fs.readFileSync(path.join(assets,'java/com/jonas/papercup/MainActivity.kt'),'utf8');
function page(url='https://matchapp.tv/'){
 const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body class="page-home"><div id="ma-ai-entry"><div id="ma-panel-ask"><article id="search-box"><h2>Ask MatchApp Ai</h2><p>Search by title or ask a question</p><div class="home-ask-composer"><textarea id="specific-search-input"></textarea><button>Search</button></div><section id="ma-avatar-home"><div class="ma-av-portrait">Jonas</div></section></article></div></div></body></html>',{url,runScripts:'outside-only'});
 dom.window.MATCHAPP_ANDROID=true;return dom;
}
test('native script keeps the same avatar and replaces visible Ask field without removing AI form handlers',()=>{
 const d=page(),w=d.window,doc=w.document;
 w.eval(script);
 const box=doc.getElementById('search-box');
 assert.equal(box.querySelectorAll('#ma-avatar-home').length,1);
 assert.equal(box.querySelectorAll('#ma-jonas-inline-caption').length,1);
 assert.ok(doc.getElementById('specific-search-input'));
 assert.match(doc.getElementById('ma-native-jonas-inline-style')?.textContent||'',/#search-box>\.home-ask-composer/);
 assert.match(doc.getElementById('ma-native-jonas-inline-style')?.textContent||'',/#ma-avatar-home\[data-open="true"\]/);
 w.eval(script);
 assert.equal(box.querySelectorAll('#ma-jonas-inline-caption').length,1);
 d.window.close();
});
test('native home caption localizes and Kids Mode cannot run this script',()=>{
 const d=page(),w=d.window;
 w.MATCH_LANG='pt-BR';w.eval(script);
 assert.equal(w.document.querySelector('#ma-jonas-inline-caption small').textContent,'Toque no rosto do Jonas para conversar.');
 d.window.close();
 const kids=page('https://matchapp.tv/kids/');
 kids.window.eval(script);
 assert.equal(kids.window.document.getElementById('ma-native-jonas-inline-style'),null);
 kids.window.close();
});
test('Kotlin loads this asset after the premium avatar without overriding voice or billing',()=>{
 assert.match(activity,/avatar-ai\/android-jonas-inline\.js/);
 assert.match(activity,/jonasPremiumJs \+ ";" \+ androidSurfacePolishJs/);
 assert.match(activity,/androidHeaderPanelsJs \+ ";" \+ androidJonasInlineJs/);
 assert.doesNotMatch(script,/supabase.*\.update\(|Stripe|purchase\(|window\.askAI\s*=/i);
});
