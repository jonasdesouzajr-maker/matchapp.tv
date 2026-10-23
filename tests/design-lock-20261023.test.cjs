'use strict';
// Guards owner-approved designs listed in DESIGN-LOCK.md. Change only with Jonas's explicit approval.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const R=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('design lock notice is present for agents',()=>{assert.match(R('DESIGN-LOCK.md'),/stop and ask Jonas/);assert.match(R('AGENTS.md'),/DESIGN-LOCK\.md/);});
test('approved poster-wall background values stay locked',()=>{
 const css=R('ui-fixes-20261023.css');
 assert.match(css,/rotateX\(9deg\) rotateZ\(-5deg\)/);
 assert.match(css,/filter:blur\(2px\) saturate\(1\.18\)/);
 assert.match(css,/filter:blur\(1\.5px\) saturate\(1\.15\)/);
 assert.match(css,/\.poster-wall\{background:#0d0820!important\}/);
 assert.match(css,/rgba\(230,195,106,\.08\)/);
 assert.match(css,/div\.poster-wall\.poster-wall\{position:fixed!important;inset:0!important/);
 assert.match(R('poster-wall.js'),/Math\.min\(cols\*rows,320\)/);
});
test('wordmark, face animation and locked assets remain',()=>{
 assert.match(R('patches/reference-header.css'),/\.ma-wordmark/);
 assert.match(R('cinematic-header.css'),/\.ma-wordmark/);
 assert.match(R('ui-fixes-20261023.js'),/MatchAppJonasFace/);
 for(const f of ['assets/brand/matchapp-ai-favicon.svg','assets/brand/matchapp-ai-icon-1024.png','guided-coach-20261022.js','guided-coach-20261022.css','patches/chat-resize-20261022.js','patches/reference-pills.css'])assert.ok(fs.existsSync(path.join(__dirname,'..',f)),f);
});
