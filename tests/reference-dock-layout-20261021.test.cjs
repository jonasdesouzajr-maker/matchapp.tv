'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../patches/reference-dock.js'), 'utf8');
const routes = ['home', 'explore', 'matches', 'list', 'profile'];
const hrefs = ['/', '/explore.html', '/#questionnaire-box', '/profile/profile.html#tab-watchlater', '/profile/profile.html'];

function fixture(labels, widths) {
 const dom = new JSDOM('<!doctype html><html class="ma-reference"><body><nav class="ma-cinema-dock">' + routes.map((route, i) =>
  '<a data-cinema-route="' + route + '" href="' + hrefs[i] + '"><span data-cinema-copy="' + route + '">' + labels[i] + '</span></a>'
 ).join('') + '</nav></body></html>', {url:'https://matchapp.tv/discover.html', runScripts:'outside-only', pretendToBeVisual:true});
 const w = dom.window, nav = w.document.querySelector('nav'), anchors = Array.from(nav.querySelectorAll('a'));
 const frames = [];
 let width = 306, calls = 0;
 w.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
 w.matchMedia = () => ({matches:true, addEventListener(){}});
 w.ResizeObserver = class { observe(){} };
 w.HTMLCanvasElement.prototype.getContext = () => ({font:'', measureText:word => ({width:widths[word] || 20})});
 w.getComputedStyle = node => node === nav ? {paddingLeft:'2px', paddingRight:'2px', columnGap:'2px'} :
  node.matches('[data-cinema-copy]') ? {font:'15.232px system-ui', letterSpacing:'normal', paddingLeft:'2px', paddingRight:'2px'} :
  {paddingLeft:'0px', paddingRight:'0px'};
 Object.defineProperty(nav, 'clientWidth', {get:() => width});
 nav.getBoundingClientRect = () => ({height:nav.dataset.maDockWrap === 'true' ? 150 : 100, bottom:w.innerHeight - 6});
 const originalClick = () => { calls++; };
 anchors[1].onclick = originalClick;
 w.eval(source);
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 function flush() { let count = 0; while(frames.length) { assert.ok(count++ < 10, 'measurement settles without a frame loop'); frames.shift()(); } }
 flush();
 return {w, nav, anchors, originalClick, get calls(){return calls;}, flush, resize(value){width=value;w.dispatchEvent(new w.Event('resize'));flush();}, close(){w.close();}};
}

test('larger text keeps all five original controls and intact labels when their minimum widths fit', () => {
 const labels = ['Home','Explore','Matches','My List','Profile'];
 const f = fixture(labels, {Home:45, Explore:57, Matches:64, My:24, List:27, Profile:48});
 try {
  assert.equal(f.nav.dataset.maDockWrap, 'false');
  assert.equal(f.w.document.body.style.getPropertyValue('--ma-reference-dock-clearance'), '114px');
  assert.deepEqual(Array.from(f.nav.querySelectorAll('a')), f.anchors);
  assert.deepEqual(f.anchors.map(a=>a.getAttribute('href')), hrefs);
  assert.deepEqual(f.anchors.map(a=>a.querySelector('[data-cinema-copy]').textContent), labels);
  assert.equal(f.nav.querySelectorAll('svg.ma-dock-icon').length, 5);
  assert.equal(f.anchors[1].onclick, f.originalClick);
  f.anchors[1].onclick();
  assert.equal(f.calls, 1);
 } finally { f.close(); }
});

test('long localized labels use a second row only while needed and reserve the actual resulting dock height', () => {
 const labels = ['Главная','Обзор','Подборки','Мой список','Профиль'];
 const f = fixture(labels, {'Главная':66,'Обзор':49,'Подборки':79,'Мой':32,'список':56,'Профиль':73});
 try {
  assert.equal(f.nav.dataset.maDockWrap, 'true');
  assert.equal(f.w.document.body.style.getPropertyValue('--ma-reference-dock-clearance'), '164px');
  f.resize(626);
  assert.equal(f.nav.dataset.maDockWrap, 'false');
  assert.equal(f.w.document.body.style.getPropertyValue('--ma-reference-dock-clearance'), '114px');
  f.resize(306);
  assert.equal(f.nav.dataset.maDockWrap, 'true');
  assert.equal(f.w.document.body.style.getPropertyValue('--ma-reference-dock-clearance'), '164px');
  assert.deepEqual(f.anchors.map(a=>a.getAttribute('href')), hrefs);
  assert.deepEqual(f.anchors.map(a=>a.querySelector('[data-cinema-copy]').textContent), labels);
  assert.equal(f.anchors[1].onclick, f.originalClick);
 } finally { f.close(); }
});
