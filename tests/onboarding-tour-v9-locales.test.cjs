'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const expected=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
test('the premium walkthrough has complete authored text in every supported locale',()=>{
 const env={window:{}};vm.runInNewContext(read('onboarding-tour-locales-20261010.js'),env);
 const result=env.window.MatchAppGuideLocales;
 assert.deepEqual(Object.keys(result).sort(),[...expected].sort());
 for(const lang of expected){
  const terms=result[lang];
  for(const name of ['pick','mood','format','platform','more','book','bookFormat','ai','latest','kids','profile']){
   assert.equal(terms[name].length,2,lang+' '+name);
   assert.ok(terms[name][0].trim().length>=4,lang+' '+name+' title');
   assert.ok(terms[name][1].trim().length>=12,lang+' '+name+' description');
   assert.doesNotMatch(terms[name].join(' '),/�|\bundefined\b/,lang);
  }
  for(const key of ['tap','next','back','finish','skip'])assert.ok(terms[key],lang+' '+key);
  if(lang!=='en')assert.notEqual(terms.ai[1],result.en.ai[1],lang+' has local copy');
 }
});
test('stable spotlight anchors and Android Kids exclusion are part of v9',()=>{
 const source=read('onboarding-tour.js');
 assert.match(source,/const VERSION='v10'/);
 assert.match(source,/selector:'#trending-rail,#trending-rail/);
 assert.match(source,/selector:'#ma-jonas-home-bubble,#search-box h2/);
 assert.match(source,/if\(step\.key==='kids'&&isAndroid\)return false/);
 assert.match(source,/restoreBookFold\(\)/);
 assert.match(source,/restoreMatchFold\(\)/);
 assert.match(source,/restoreFilters\(\)/);
 assert.match(source,/panel\.dataset\.step=step\.key/);
 assert.match(source,/function score\(c\)/);
});
test('homepage loads localized copy before the versioned guide, without changing Kids site',()=>{
 const html=read('index.html'),a=html.indexOf('/onboarding-tour-locales-20261010.js'),b=html.indexOf('/onboarding-tour.js?v=20261010-tour-v10');
 assert.ok(a>=0&&a<b);
 assert.ok(html.includes('/onboarding-tour.css?v=20261010-tour-v10'));
 assert.ok(read('kids/index.html').length>100);
});
test('guide animations respect reduced motion and Arabic writing direction',()=>{
 const css=read('onboarding-tour.css'),js=read('onboarding-tour.js');
 assert.match(css,/matchappTourContentEnter/);
 assert.match(css,/matchappTourOrbit/);
 assert.match(css,/matchappTourSheen/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/matchapp-tour-card\[dir="rtl"\]/);
 assert.match(js,/panel\.dir=panel\.lang\.split\('-'\)\[0\]==='ar'/);
});
