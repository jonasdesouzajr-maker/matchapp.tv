'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'discover.html'),'utf8');
const css=fs.readFileSync(path.join(root,'jonas','settings-header-touch-target-20261011.css'),'utf8');
test('Ask AI loads its menu sizing patch after the existing composer stylesheet',()=>{
 const original=html.indexOf('/jonas/composer-quota-row-20261011.css');
 const patch=html.indexOf('/jonas/settings-header-touch-target-20261011.css?v=20261011-touch1');
 assert.ok(original>=0 && patch>original);
 assert.equal(html.split('settings-header-touch-target-20261011.css').length-1,1);
});
test('menu button keeps complete 40x43 touch area without altering its handler',()=>{
 assert.match(css,/header\.mh-topbox\s*>\s*nav\.mh-deck\s*>\s*\.ma-menu-wrap\s*>\s*button\.ma-menu-button/);
 assert.match(css,/width:\s*40px\s*!important/);
 assert.match(css,/min-width:\s*40px\s*!important/);
 assert.match(css,/height:\s*43px\s*!important/);
 assert.match(css,/@media\s*\(max-width:\s*800px\)/);
 assert.doesNotMatch(css,/<script|addEventListener|fetch\s*\(|\.click\s*\(/i);
});
