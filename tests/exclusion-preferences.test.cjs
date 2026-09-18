const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('normal Match criteria never silently relax mood or other selected fields',()=>{
  const app=read('app.js');
  const start=app.indexOf('function pickGuaranteedCatalog(');
  const end=app.indexOf('// ----------------------------------------------------\n// PRUNE UNSTOCKED CRITERIA OPTIONS',start);
  const fn=app.slice(start,end);
  assert.match(fn,/Selected criteria are hard requirements/);
  assert.doesNotMatch(fn,/\['mood',/);
  assert.doesNotMatch(fn,/mood:\[\]/);
  assert.doesNotMatch(fn,/ratingOnly|category-exhausted/);
  assert.match(app,/discoverVerifiedExactTMDB/);
});

test('country and real-genre exclusions are persistent hard Match preferences',()=>{
  const settings=read('settings.js'),app=read('app.js'),profile=read('profile/profile.html');
  assert.match(settings,/blockedOriginCountries:\[\]/);
  assert.match(settings,/blockedGenres:\[\]/);
  assert.match(app,/entryPassesPreferenceExclusions/);
  assert.match(app,/countries\.some\(x=>prefs\.countries/);
  assert.match(app,/genres\.some\(g=>prefs\.genres/);
  assert.match(profile,/What I don’t want to see in my matches/);
  assert.match(read('profile.js'),/\['ES','Spain'\]/);
});
