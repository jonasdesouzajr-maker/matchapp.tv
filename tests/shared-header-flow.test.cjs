'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('shared adult header reserves brand space and uses content-sized wrapping controls in the winning layer',()=>{
 const css=fs.readFileSync(path.join(root,'patches/adult-screen-fit-20261015.css'),'utf8');
 const repair=css.slice(css.indexOf('/* shared-header-content-flow-20261017 */'));
 assert.match(repair,/@layer ma-screen-fit/);assert.match(repair,/body\.page-shell header\.app-header\.mh-topbox/);
 assert.match(repair,/flex-wrap:wrap!important/);assert.match(repair,/grid-template-columns:none!important/);
 assert.match(repair,/min-height:44px!important;height:44px!important/);assert.match(repair,/white-space:nowrap!important/);
 assert.doesNotMatch(repair,/body\.page-home|body\.kids-body|display:none/);
 for(const name of ['brand.css'])assert.match(fs.readFileSync(path.join(root,name),'utf8'),/adult-screen-fit-20261015\.css\?[^"]*header=20261017-1/);
});

test('quick quiz launcher accounts for document scroll without changing voice or saved drag handling',()=>{
 const js=fs.readFileSync(path.join(root,'patches/jonas-premium-enhancer.js'),'utf8');assert.match(js,/headerBox\.top\+window\.scrollY/);assert.match(js,/dataset\.growthMode==='quick'/);assert.match(js,/!docked/);assert.match(js,/jonasPositionHeld/);
});
