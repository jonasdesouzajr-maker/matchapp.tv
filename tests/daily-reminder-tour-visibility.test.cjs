'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
test('active coach hides only the reminder and restores it without changing dismissal or reward state',()=>{
 const css=fs.readFileSync(path.join(root,'daily-checkin-bubble.css'),'utf8');
 const dom=new JSDOM('<html><head><style>'+css+'</style></head><body class="page-home"><section id="daily-match-checkin" class="dc checkin-bubble"><button>Claim</button></section><button id="list">My List</button></body></html>');
 try {
  const {document:d}=dom.window,b=d.querySelector('section');
  assert.equal(dom.window.getComputedStyle(b).display,'block');
  d.documentElement.classList.add('ma-coach-active');
  assert.equal(dom.window.getComputedStyle(b).display,'none');
  assert.notEqual(dom.window.getComputedStyle(d.querySelector('#list')).display,'none');
  assert.equal(b.className,'dc checkin-bubble');
  assert.equal(b.textContent,'Claim');
  d.documentElement.classList.remove('ma-coach-active');
  assert.equal(dom.window.getComputedStyle(b).display,'block');
  b.classList.add('is-hidden');
  d.documentElement.classList.add('ma-coach-active');
  d.documentElement.classList.remove('ma-coach-active');
  assert.equal(dom.window.getComputedStyle(b).display,'none','previously dismissed reminder stays hidden');
 } finally {dom.window.close();}
});
