const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('shared adult topbox reserves physical space between MatchApp and Ai',()=>{
 const css=fs.readFileSync(path.join(root,'brand-headline.css'),'utf8');
 const lock=fs.readFileSync(path.join(root,'brand-lock-20261011.js'),'utf8');
 new vm.Script(lock,{filename:'brand-lock-20261011.js'});
 assert.match(lock,/ma-brand-title-line/);
 assert.match(css,/\.ma-brand-copy\s*>\s*\.ma-brand-title-line\s*\{[\s\S]*?display:inline-flex!important/);
 assert.match(css,/\.ma-brand-copy\s*>\s*\.ma-brand-title-line\s*\{[\s\S]*?column-gap:clamp\(10px,1\.35vw,17px\)!important/);
 assert.match(css,/@media\s*\(max-width:420px\)[\s\S]*?\.ma-brand-title-line\s*\{[\s\S]*?column-gap:8px!important/);
 assert.match(css,/body:not\(\.page-kids\):not\(\.kids-body\)/);
});
