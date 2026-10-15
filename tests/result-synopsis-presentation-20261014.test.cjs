'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../patches/result-synopsis-visible-20261014.js'),'utf8');
function fixture(lang='pt-BR',original='en'){
 const dom=new JSDOM('<!doctype html><html lang="'+lang+'"><body class="page-home"><p id="res-synopsis"></p></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window;w.MATCH_LANG=lang;w.globalMatchTitle='WEIRD: The Al Yankovic Story';
 w.currentSynopsisSource={title:w.globalMatchTitle,text:'The story of an aspiring musician whose extraordinary parody songs take him on a hilarious journey.',lang:original};
 w.t=key=>({'global.guide':'Guia para assistir','res.findwhere':'▶ Ver onde assistir'})[key]||'';
 w.matchTranslationUnavailable=()=> 'Tradução indisponível';
 w.eval(source);return {dom,w,p:w.document.getElementById('res-synopsis')};
}
test('all 14 supported languages have authored, explicit untranslated-source labels',()=>{
 const f=fixture(),labels=f.w.MatchAppSynopsisPresentation.labels;
 for(const code of ['en','pt','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'])assert.ok(labels[code].length>=(['zh','ja','ko'].includes(code)?4:10),code);
 assert.equal(Object.keys(labels).length,14);f.w.close();
});
test('localized guide placeholder is replaced with the verified original synopsis, explicitly attributed',async()=>{
 const f=fixture();f.p.textContent='Guia para assistir · ▶ Ver onde assistir';
 await new Promise(done=>setTimeout(done,1510));
 assert.match(f.p.textContent,/^Sinopse original \(sem tradução\) \[en\]: The story of/);
 assert.doesNotMatch(f.p.textContent,/Guia para assistir/);
 assert.equal(f.p.dataset.sourceLanguage,'en');
 f.p.textContent='A história de um músico e suas canções cômicas.';
 await new Promise(done=>setTimeout(done,90));
 assert.equal(f.p.textContent,'A história de um músico e suas canções cômicas.','valid Portuguese translation wins');
 f.w.close();
});
test('a synopsis already written in the chosen language is never replaced by a fallback',async()=>{
 const f=fixture('pt-BR','pt');f.p.textContent='Uma história engraçada sobre música e paródias.';
 await new Promise(done=>setTimeout(done,1450));
 assert.equal(f.p.textContent,'Uma história engraçada sobre música e paródias.');
 f.w.close();
});
