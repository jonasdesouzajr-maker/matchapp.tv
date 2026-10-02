const{test}=require('node:test');const assert=require('node:assert/strict'),fs=require('node:fs');
test('reported match titles have verified TMDB identities',()=>{
  const avail=JSON.parse(fs.readFileSync('data/availability.json','utf8')).titles;
  const posters=JSON.parse(fs.readFileSync('data/poster-identities.json','utf8'));
  for(const [title,id] of [['Laapataa Ladies',1163194],['Deadpool & Wolverine',533535],['Weird: The Al Yankovic Story',928344]]){
    const key=Object.keys(avail).find(k=>k.toLowerCase()===title.toLowerCase());
    assert.ok(key,`${title}: availability identity is required`);
    assert.equal(avail[key].tmdbId,id);
    assert.equal(avail[key].kind,'movie');
    assert.ok(posters.some(row=>row.title.toLowerCase()===title.toLowerCase()&&row.tmdbId===id&&row.adult===false));
  }
});
