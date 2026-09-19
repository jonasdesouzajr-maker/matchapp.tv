const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('normal Match fallback is progressive, transparent and keeps hard safety/exclusion fields',()=>{
  const app=read('app.js');
  const start=app.indexOf('function pickGuaranteedCatalog(');
  const end=app.indexOf('// ----------------------------------------------------\n// PRUNE UNSTOCKED CRITERIA OPTIONS',start);
  const fn=app.slice(start,end);
  assert.match(fn,/Exact always wins/);
  assert.match(fn,/\['exact', requested\]/);
  assert.match(fn,/\['broaden-vibe'/);
  assert.match(fn,/\['broaden-era'/);
  assert.match(fn,/\['broaden-mood'/);
  assert.match(fn,/\['broaden-platform'/);
  assert.doesNotMatch(fn,/rating:\[\]/);
  assert.doesNotMatch(fn,/cat:\[\]/);
  assert.match(fn,/hardExcluded/);
  assert.match(app,/Closest available · secondary filters broadened/);
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
