'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
test('+SBT is a Brazil-scoped first-class provider',()=>{
 const app=read('app.js'),block=app.match(/const PLATFORMS = (\{[\s\S]*?\n\});/);
 assert(block,'PLATFORMS must parse');
 const plats=vm.runInNewContext('('+block[1]+')');
 assert(plats['+SBT']); assert.equal(plats['+SBT'].group,'Brazil'); assert(plats['+SBT'].countries.includes('Brazil')); assert.equal(plats['+SBT'].url,'https://mais.sbt.com.br');
});
test('+SBT seed is first-party, current, keyword-rich and Brazil-only',()=>{
 const source=JSON.parse(read('tools/plus-sbt-titles.json')); assert.equal(source.platform,'+SBT'); assert(source.titles.length>=20);
 for(const row of source.titles){assert.equal(row.platform,'+SBT');assert.equal(row.checked,'2026-10-04');assert.deepEqual(row.availabilityCountries,['Brazil']);assert.match(row.watchUrl,/^https:\/\/mais\.sbt\.com\.br\//);assert.match(row.sourceUrl,/^https:\/\/mais\.sbt\.com\.br\//);assert(row.keywords.length>=5);assert(row.longTailKeywords.length>=4);}
});
test('+SBT participates in adult matching without mutating Kids Mode',()=>{
 assert.match(read('catalog-plus.js'),/"platform":"\+SBT"/); assert.doesNotMatch(read('kids/kids.js'),/\+SBT/); assert.match(read('index.html'),/<option value="\+SBT">\+SBT<\/option>/); assert.match(read('together.html'),/<option value="\+SBT">\+SBT<\/option>/);
});
test('+SBT SEO route and official-link safety are wired',()=>{
 const page=read('platforms/plus-sbt/index.html'); assert.match(page,/canonical" href="https:\/\/matchapp\.tv\/platforms\/plus-sbt\//); assert.match(page,/meta name="keywords"/); assert.match(page,/application\/ld\+json/); assert.match(read('supabase/functions/rapidapi-streaming/streaming-core.mjs'),/mais\.sbt\.com\.br/); assert.match(read('discover.js'),/'\+sbt'/); assert.match(read('tools/update-sitemap.js'),/plus-sbt-urls\.json/);
});