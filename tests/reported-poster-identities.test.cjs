const{test}=require('node:test');const assert=require('node:assert/strict'),fs=require('node:fs');
test('reported match titles have verified TMDB identities',()=>{
  const avail=JSON.parse(fs.readFileSync('data/availability.json','utf8')).titles;
  const posters=JSON.parse(fs.readFileSync('data/poster-identities.json','utf8'));
  for(const [title,id] of [['Laapataa Ladies',1163194],['Deadpool & Wolverine',533535],['Weird: The Al Yankovic Story',928344]]){
    assert.equal(avail[title].tmdbId,id);
    assert.equal(avail[title].kind,'movie');
    assert.ok(posters.some(row=>row.title===title&&row.tmdbId===id&&row.adult===false));
  }
});
