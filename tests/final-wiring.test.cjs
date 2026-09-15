const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const wiring=fs.readFileSync(path.join(root,'final-wiring.js'),'utf8');
const hardening=fs.readFileSync(path.join(root,'production-hardening.js'),'utf8');
const history=fs.readFileSync(path.join(root,'shown-history.js'),'utf8');

test('final wiring activates title integrity, no-repeat history and human conversation',()=>{
  assert.match(wiring,/production-hardening\.js/);
  assert.match(wiring,/shown-history\.js/);
  assert.match(wiring,/human-conversation\.js/);
  assert.match(wiring,/match-packs-section/);
  assert.match(hardening,/Kingdom-class fix/);
  assert.match(hardening,/platform:'any'/);
  assert.match(history,/Shown by MatchApp/);
});

test('install corner avoids false security claims',()=>{
  assert.match(wiring,/brand-install-corner/);
  assert.match(wiring,/install-corner\.js/);
  const corner=fs.readFileSync(path.join(root,'install-corner.js'),'utf8');
  assert.match(corner,/HTTPS/);
  assert.doesNotMatch(corner,/virus free|protected by google/i);
});
