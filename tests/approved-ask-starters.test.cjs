'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../approved-ask-starters-20261013.js'),'utf8');
function fixture(lang='en',page='ai-chat-page'){
 const dom=new JSDOM(`<html lang="${lang}"><body class="${page}"><select id="lang-switcher"><option value="en">English</option><option value="pt">Português</option></select><form><div class="approved-ask-starters">${Array.from({length:4},()=>'<button type="button"><span class="approved-starter-label"></span></button>').join('')}</div><textarea id="discover-new-input"></textarea></form></body></html>`,{runScripts:'outside-only'});
 dom.window.document.getElementById('lang-switcher').value=lang;return dom;
}
test('suggestions remain editable and never submit an AI request or spend allowance',()=>{
 const dom=fixture(),w=dom.window,d=w.document;let requests=0,submits=0,inputs=0;
 w.fetch=()=>{requests++;throw Error('Suggestion must not request AI');};
 d.querySelector('form').addEventListener('submit',()=>submits++);
 d.querySelector('textarea').addEventListener('input',()=>inputs++);
 try{w.eval(source);d.querySelectorAll('button')[1].click();assert.equal(d.querySelector('textarea').value,'Find a show');assert.equal(d.activeElement,d.querySelector('textarea'));assert.equal(inputs,1);assert.equal(requests,0);assert.equal(submits,0);}finally{w.close();}
});
test('changing interface language localizes shortcuts without overwriting the composed question',()=>{
 const dom=fixture(),w=dom.window,d=w.document;
 try{w.eval(source);d.querySelector('textarea').value='My own detailed question';const language=d.querySelector('select');language.value='pt';language.dispatchEvent(new w.Event('change'));assert.equal(d.querySelector('button').textContent,'O que assistir');assert.equal(d.querySelector('textarea').value,'My own detailed question');}finally{w.close();}
});
test('the presentation shortcuts do not initialize on Kids pages',()=>{
 const dom=fixture('en','page-kids');try{dom.window.eval(source);dom.window.document.querySelector('button').click();assert.equal(dom.window.document.querySelector('textarea').value,'');}finally{dom.window.close();}
});
