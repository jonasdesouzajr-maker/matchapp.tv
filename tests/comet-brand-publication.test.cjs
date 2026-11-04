'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {stampBrandReferences}=require('../tools/stamp-discovery-assets.cjs');
const root=path.join(__dirname,'..');
test('the adult brand master is the approved Play icon and the header and favicon are self-contained',()=>{
  const icon=fs.readFileSync(path.join(root,'assets/brand/matchapp-ai-icon-512.png'));
  assert.equal(crypto.createHash('sha256').update(icon).digest('hex'),'ec3f8d0e4319524af724ba704f7422a8d0d9e473f7c349996362e53bc1b93fa3');
  for(const file of ['matchapp-ai-mark.svg','matchapp-ai-favicon.svg']) {
    const svg=fs.readFileSync(path.join(root,'assets/brand',file),'utf8');
    assert.match(svg,/viewBox="0 0 512 512"/);
    assert.match(svg,/xlink:href="data:image\/png;base64,/);
  }
});
test('preloads and the matching CSS import use one URL while Google keeps its stable favicon URL',()=>{
  const uri='/patches/reference-header.css?v=one&masthead=two';
  const preload=stampBrandReferences('<link href="'+uri.replace(/&/g,'&amp;')+'">',true);
  const style=stampBrandReferences("@import url('"+uri+"');");
  assert.equal(preload.match(/href="([^"]+)/)[1].replace(/&amp;/g,'&'),style.match(/url\('([^']+)/)[1]);
  assert.equal(stampBrandReferences(preload,true),preload);
  assert.match(style,/comet=20261104-1/);
  const favicon='<link rel="icon" href="/assets/brand/matchapp-ai-favicon.svg">';
  assert.equal(stampBrandReferences(favicon,true),favicon);
});
