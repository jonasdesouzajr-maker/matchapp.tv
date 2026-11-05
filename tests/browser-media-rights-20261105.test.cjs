'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),images=require('../news-images.js');
const root=path.join(__dirname,'..');
function htmlFiles(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?htmlFiles(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
test('all frozen news cards use owned illustrations without modifying their source records',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(root,'news/data.json'),'utf8'));assert.equal(data.items.length,42);
 for(const item of data.items){const before=JSON.stringify(item),html=images.markup(item,'en');assert.match(html,/<img src="\/assets\/news\/topics\/[a-z]+\.svg"/);assert.ok(!/<img[^>]+src="https:/.test(html));assert.ok(!/figcaption[^>]+hidden/.test(html));assert.equal(JSON.stringify(item),before);}
});
test('all archived news social image metadata belongs to MatchApp, not a linked publisher',()=>{
 const files=htmlFiles(path.join(root,'news'));assert.ok(files.length>1000);let imagesChecked=0;
 for(const f of files){const html=fs.readFileSync(f,'utf8');for(const tag of html.match(/<meta\b[^>]*>/g)||[]){if(!/(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image)["']/.test(tag))continue;const value=tag.match(/content=["']([^"']*)["']/)?.[1];assert.ok(value?.startsWith('https://matchapp.tv/'),f+': '+value);imagesChecked++;}}
 assert.ok(imagesChecked>2000);
});
test('the static news page does not request a publisher photo before JavaScript runs',()=>{
 const html=fs.readFileSync(path.join(root,'news/index.html'),'utf8');const tags=html.match(/<img\b[^>]*>/g)||[];assert.ok(tags.length>=24);for(const tag of tags){const src=tag.match(/\bsrc=["']([^"']*)["']/)?.[1];assert.ok(src?.startsWith('/')||src?.startsWith('https://matchapp.tv/'),src);}
});
