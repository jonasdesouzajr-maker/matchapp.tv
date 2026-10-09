'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const app=path.join(__dirname,'..','android-studio','app','src','main');
const kotlin=fs.readFileSync(path.join(app,'java','com','jonas','papercup','MainActivity.kt'),'utf8');
const css=fs.readFileSync(path.join(app,'assets','jonas','experience.css'),'utf8');
const match=kotlin.match(/private fun closeActiveChatOrNavigateBack\(\) \{[\s\S]*?web\.evaluateJavascript\(\s*"""([\s\S]*?)"""\.trimIndent\(\)/);
const backJs=match?.[1]?.trim();

test('Android Back closes packaged Jonas chat rather than exiting the activity',()=>{
  assert.match(kotlin,/else -> closeActiveChatOrNavigateBack\(\)/);
  assert.ok(backJs,'native Back handler must evaluate a dismissal script');
  const dom=new JSDOM('<aside id="chat-sheet"></aside><button id="close-chat">Close</button>',{runScripts:'outside-only'});
  const doc=dom.window.document;
  doc.getElementById('close-chat').addEventListener('click',()=>{doc.getElementById('chat-sheet').hidden=true});
  assert.equal(dom.window.eval(backJs),true);
  assert.equal(doc.getElementById('chat-sheet').hidden,true);
  assert.equal(dom.window.eval(backJs),false);
  dom.window.close();
});

test('Android Back also dismisses the production floating Jonas conversation',()=>{
  const dom=new JSDOM('<div id="ma-avatar-home" data-open="true"><button id="ma-av-dismiss">Close</button></div>',{runScripts:'outside-only'});
  const doc=dom.window.document;
  doc.getElementById('ma-av-dismiss').addEventListener('click',()=>{doc.getElementById('ma-avatar-home').dataset.open='false'});
  assert.equal(dom.window.eval(backJs),true);
  assert.equal(doc.getElementById('ma-avatar-home').dataset.open,'false');
  assert.equal(dom.window.eval(backJs),false);
  dom.window.close();
});

test('small Android screens receive a compact keyboard-safe chat and readable heading tracking',()=>{
  assert.match(css,/@media\(max-width:839px\)\{\s*\.chat-sheet\{top:auto;height:min\(500px,calc\(100dvh - 28px - var\(--keyboard\)\)\)\}/);
  assert.match(css,/\.hero-copy h1\{letter-spacing:-\.025em;line-height:1\.12;text-wrap:balance\}/);
  assert.match(css,/\.section-heading h2\{letter-spacing:-\.015em;line-height:1\.2\}/);
});

test('premium Jonas DOM polish never retriggers its own mutation observer indefinitely',async()=>{
  const premium=fs.readFileSync(path.join(app,'assets','avatar-ai','premium-jonas.js'),'utf8');
  assert.match(premium,/if\(dismiss\.textContent!=='×'\)dismiss\.textContent='×'/);
  const dom=new JSDOM('<!doctype html><html><head></head><body><div id="ma-avatar-home" data-open="false"><button id="ma-av-dismiss">Close</button><div class="ma-av-portrait"></div></div></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  w.MATCHAPP_ANDROID=true;
  w.MatchAppNativeVoice={};
  w.matchMedia=()=>({matches:true});
  let mutations=0;
  const OriginalObserver=w.MutationObserver;
  w.MutationObserver=class extends OriginalObserver{
    constructor(callback){super((records)=>{mutations++;callback(records);});}
  };
  try{
    w.eval(premium);
    await new Promise(resolve=>setTimeout(resolve,90));
    assert.equal(w.document.getElementById('ma-av-dismiss').textContent,'×');
    assert.ok(mutations<8,'polish observer must settle instead of recursively replacing dismiss text');
  }finally{dom.window.close();}
});
