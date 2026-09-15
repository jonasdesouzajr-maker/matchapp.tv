const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const wiring=fs.readFileSync(path.join(root,'final-wiring.js'),'utf8');
const hardening=fs.readFileSync(path.join(root,'production-hardening.js'),'utf8');
const history=fs.readFileSync(path.join(root,'shown-history.js'),'utf8');
const speed=fs.readFileSync(path.join(root,'match-speed.js'),'utf8');

test('final wiring activates title integrity, no-repeat history, speed guard and human conversation',()=>{
  assert.match(wiring,/production-hardening\.js/);
  assert.match(wiring,/shown-history\.js/);
  assert.match(wiring,/match-speed\.js/);
  assert.match(wiring,/human-conversation\.js/);
  assert.match(wiring,/match-packs-section/);
  assert.match(hardening,/Kingdom-class fix/);
  assert.match(hardening,/platform:'any'/);
  assert.match(history,/Shown by MatchApp/);
  assert.doesNotMatch(history,/characterData\s*:\s*true/,'history tracking must never observe every text mutation');
  assert.match(history,/matchapp:newmatch/,'history tracking should use the result event instead of global text observation');
  assert.match(history,/childList\s*:\s*true/,'dynamic result cards must still be discovered');
  assert.match(speed,/18000/,'stalled matches must have a bounded recovery watchdog');
  assert.match(speed,/Math\.min\(ms,350\)/,'ready results must not wait on the old theatrical delay');
  assert.match(speed,/activePromise/,'rapid double taps must not launch competing matches');
});

test('install corner avoids false security claims',()=>{
  assert.match(wiring,/brand-install-corner/);
  assert.match(wiring,/install-corner\.js/);
  const corner=fs.readFileSync(path.join(root,'install-corner.js'),'utf8');
  assert.match(corner,/HTTPS/);
  assert.doesNotMatch(corner,/virus free|protected by google/i);
});
