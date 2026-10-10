const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('adult cooking Ask AI is source-bound and uses existing quota, never cinema fallback',()=>{
  const ask=fs.readFileSync('discover.js','utf8');
  const html=fs.readFileSync('discover.html','utf8');
  assert(ask.includes("const cookingIntent ="));
  assert.match(ask,/!bookIntent && !cookingIntent && wantsTitleRecommendations/);
  assert.match(ask,/bookIntent \|\| cookingIntent/);
  assert(ask.includes("window.MatchCooking.channels.forEach"));
  assert(html.indexOf('/cooking/catalog.js?v=')<html.indexOf('/discover-male-only-20261010.js'));
  assert(!fs.readFileSync('kids/index.html','utf8').includes('/cooking/catalog.js'));
});

test('Supabase cooking prompt stays opt-in adults, truthful on recipe sources and keeps Kids isolated',()=>{
  const proxy=fs.readFileSync('supabase/functions/gemini-proxy/index.ts','utf8');
  assert.match(proxy,/cookingIntent = !kidsMode && !watchIntent/);
  assert(proxy.includes('This is a COOKING request.'));
  assert(proxy.includes('Return an empty results array: the client renders independently reviewed cooking source links'));
  const cookingUrl = proxy.match(/The user can browse (\S+) for original sources and videos\./)?.[1];
  assert.equal(cookingUrl, 'https://matchapp.tv/cooking/');
  assert(proxy.includes('Never claim to have retrieved recipe text not supplied here'));
});
