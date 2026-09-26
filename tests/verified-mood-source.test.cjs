'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
test('multiple compatible moods may never override Comfort safety in exact TMDB discovery',()=>{
 const start=app.indexOf('const MOOD_SOURCE_GENRES=');
 const end=app.indexOf('function canonicalProviderName(',start);
 assert(start>0&&end>start);
 const ctx={};
 vm.runInNewContext(app.slice(start,end)+'\nthis.moodFitsVerified=moodFitsVerified;',ctx);
 const check=ctx.moodFitsVerified;
 for(const moods of [['cozy comfort watch','romantic'],['romantic','cozy comfort watch']]){
  assert.equal(check(moods,['Romance','Thriller'],'A happy couple fall in love.'),false);
  assert.equal(check(moods,['Comedy','Romance'],'A brutal crime draws a family together.'),false);
  assert.equal(check(moods,['Comedy','Romance'],'Two gentle friends find love on their holiday.'),true);
 }
});
test('iTunes fallback honors Comfort even if another mood was selected first and cannot claim Spotify',()=>{
 assert.match(app,/selectedMoods=normCriteria\(mood\)/);
 assert.match(app,/selectedMoods\.includes\('cozy comfort watch'\)/);
 assert.match(app,/COZY_HEAVY_TEXT\.test\(\[r\.longDescription,r\.shortDescription\]/);
 assert.match(app,/cat === 'Spotify playlist' \|\| cat === 'Spotify single'\) return null/);
});
