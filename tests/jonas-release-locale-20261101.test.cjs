'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('Jonas keeps the chosen language through its own boot, a language change, and the next adult destination',async()=>{
 const html=read('jonas/index.html'),markup=new JSDOM(html);
 const loader=Array.from(markup.window.document.scripts).find(node=>node.getAttribute('src')?.startsWith('/i18n.js?'));
 assert.ok(loader,'Jonas must initialize the shared language owner before native capture');
 const jonas=new JSDOM(html,{url:'https://matchapp.tv/jonas/',runScripts:'outside-only'});
 const home=new JSDOM('<html lang="en"><body><div id="lang-switcher-host"></div></body></html>',{url:'https://matchapp.tv/?lang=en',runScripts:'outside-only'});
 try{
  jonas.window.localStorage.setItem('match_lang','pt-BR');
  jonas.window.eval(read(loader.getAttribute('src').split('?')[0].slice(1)));
  jonas.window.document.dispatchEvent(new jonas.window.Event('DOMContentLoaded'));
  assert.equal(jonas.window.MATCH_LANG,'pt-BR');
  assert.equal(jonas.window.document.documentElement.lang,'pt-BR');
  jonas.window.setLanguage('ja');
  home.window.localStorage.setItem('match_lang',jonas.window.localStorage.getItem('match_lang'));
  home.window.eval(read('i18n.js'));
  home.window.document.dispatchEvent(new home.window.Event('DOMContentLoaded'));
  assert.equal(home.window.MATCH_LANG,'ja','the English shared URL must not override the selected language');
  assert.equal(home.window.document.getElementById('lang-switcher').value,'ja');
  assert.equal(home.window.localStorage.getItem('match_lang'),'ja');
 }finally{markup.window.close();jonas.window.close();home.window.close();}
});
