'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..','android-studio','app','src','main');
const home = fs.readFileSync(path.join(root,'assets/avatar-ai/home-preview.js'),'utf8');
const companion = fs.readFileSync(path.join(root,'assets/avatar-ai/companion-v44.js'),'utf8');
const android = fs.readFileSync(path.join(root,'java/com/jonas/papercup/MainActivity.kt'),'utf8');

test('Jonas is the sole visible Android avatar across first-party adult pages',()=>{
  assert.match(home,/PERSONAS=\{jonas:/);
  assert.doesNotMatch(home,/PERSONAS=\{[^\n]*aureya/i);
  assert.doesNotMatch(home,/choose Jonas or Aureya/i);
  assert.doesNotMatch(companion,/choose Jonas or Aureya/i);
  assert.match(home,/ma-avatar-global-host/);
  assert.match(companion,/ma-jonas-continue/);
  assert.match(companion,/matchapp-jonas-global-position-v1/);
  assert.match(companion,/pointerdown/);
  assert.match(companion,/pointermove/);
  assert.match(companion,/setPointerCapture/);
});

test('production Jonas defers to the existing full-site credit checked Ask AI and protects Kids',()=>{
  assert.match(android,/isMatchAppHost\(uri.host.orEmpty\(\)\) && !isKidsUri\(uri\)/);
  assert.match(android,/if\(document.body\)/);
  assert.match(companion,/newDiscoverSearch\(\)/);
  assert.match(companion,/home-ask-composer/);
  assert.match(companion,/ma-jonas-pending-question/);
  assert.doesNotMatch(companion,/OPENAI_API_KEY|GROQ_API_KEY|OPENROUTER_API_KEY|gemini-proxy|\/api\/ask/);
  assert.match(home,/\/kids/);
});
