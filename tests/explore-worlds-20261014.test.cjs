'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(root,'index.html'),'utf8');
const explore = fs.readFileSync(path.join(root,'explore.html'),'utf8');
const css = fs.readFileSync(path.join(root,'patches/explore-worlds-20261014.css'),'utf8');
const code = fs.readFileSync(path.join(root,'patches/explore-worlds-20261014.js'),'utf8');

function setup(){
  const dom = new JSDOM(home, {url:'https://matchapp.tv/',runScripts:'outside-only'});
  dom.window.playMatchAppSound = ()=>{};
  dom.window.MATCH_LANG = 'en';
  dom.window.eval(code);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom;
}
test('five-focus Home retains watch form, Trending, premiere and choice without old Together entry', ()=>{
  assert.match(home, /id="mh-topbox"/);
  assert.match(home, /id="trending-rail"/);
  assert.match(home, /id="questionnaire-box"/);
  assert.match(home, /id="premiere-disclosure"[^>]*open/);
  assert.match(css, /ma-watch-focused \.tg-entry\{display:none!important\}/);
  assert.match(css, /ma-watch-focused #premiere-disclosure\{display:block!important/);
  assert.match(home, /weekly|choice|matchapp ai choice/i);
});
test('one top-box trigger replaces duplicate Explore shortcut and leaves Kids link intact', ()=>{
  assert.equal((home.match(/id="ma-worlds-trigger"/g)||[]).length,1);
  assert.equal((home.match(/id="ma-explore-worlds-panel"/g)||[]).length,1);
  assert.equal((home.match(/class="ma-luxe-shortcut ma-discovery-cta"/g)||[]).length,0);
  assert.match(home, /href="\/kids\/" class="ma-luxe-shortcut ma-browser-kids"/);
});
test('all nine Worlds routes resolve to the existing site files', ()=>{
  const dom = setup();
  const links=[...dom.window.document.querySelectorAll('.ma-world-card')];
  assert.equal(links.length,9);
  for(const anchor of links){
    const u=new URL(anchor.href);
    const p=decodeURIComponent(u.pathname);
    const local=path.join(root, p.endsWith('/')?p.slice(1)+'index.html':p.slice(1));
    assert.ok(fs.existsSync(local),p+' missing');
  }
  dom.window.close();
});
test('Explore Worlds opens, traps semantic dialog, closes on Escape and translates', ()=>{
  const dom=setup(), {document,Event,KeyboardEvent}=dom.window;
  const trigger=document.querySelector('#ma-worlds-trigger');
  const overlay=document.querySelector('#ma-explore-worlds-panel');
  assert.equal(overlay.hidden,true);
  trigger.click();
  assert.equal(overlay.hidden,false);
  assert.equal(trigger.getAttribute('aria-expanded'),'true');
  assert.equal(overlay.parentNode,document.body);
  assert.equal(overlay.querySelector('[role="dialog"]').getAttribute('aria-modal'),'true');
  dom.window.MATCH_LANG='pt-BR';
  document.dispatchEvent(new Event('matchapp:langchange'));
  assert.match(overlay.querySelector('h2').textContent,/Explore mais/i);
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(overlay.hidden,true);
  assert.equal(trigger.getAttribute('aria-expanded'),'false');
  dom.window.close();
});
test('Explore hub exposes dedicated topics with no duplicate premiere card',()=>{
  assert.match(explore,/href="\/together.html"/);
  assert.match(explore,/href="\/friends.html"/);
  assert.match(explore,/href="\/ebooks\/#ebook-matcher-root"/);
  assert.doesNotMatch(explore,/class="explore-card" href="\/featured\//);
});
