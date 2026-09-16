const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const speed=fs.readFileSync(path.join(root,'match-speed.js'),'utf8');
const hardening=fs.readFileSync(path.join(root,'production-hardening.js'),'utf8');
const css=fs.readFileSync(path.join(root,'urgent-fixes.css'),'utf8');
const cinema=fs.readFileSync(path.join(root,'premium-cinema.css'),'utf8');

test('match click keeps the cinematic meter for the full wait',()=>{
  assert.match(app,/MIN_WAIT_MS = \(isVIP\) \? 3000 : 13500/);
  assert.match(app,/match-searching/);
  assert.match(app,/body\.classList\.add\('match-searching'\)/);
  assert.doesNotMatch(speed,/Math\.min\(ms,350\)/);
  assert.doesNotMatch(speed,/window\.setTimeout\s*=/);
  assert.match(speed,/30000/);
});

test('result card is not skipped as already-seen after the title is remembered',()=>{
  const trigger=app.slice(app.indexOf('window.triggerMatch'),app.indexOf('async function renderResult'));
  const renderStart=app.indexOf('async function renderResult');
  const render=app.slice(renderStart, renderStart+4500);
  assert.doesNotMatch(trigger,/rememberShownTitle\(matchResult\.title\)[\s\S]{0,80}matchapp:newmatch/);
  assert.match(render,/rememberShownTitle\(selected\.title\)/);
  assert.match(render,/matchapp:newmatch/);
  assert.match(render,/confetti/);
  assert.match(render,/is-revealed/);
  assert.doesNotMatch(render,/known\(\)\.has\(window\.matchPolicy\.key\(selected\.title\)\)/);
});

test('integrity repair never hides a revealed match',()=>{
  assert.doesNotMatch(hardening,/box\.style\.display='none';renderRecovery/);
  assert.match(css,/body\.match-searching #loading-box/);
  assert.match(css,/#result-box\.is-revealed/);
  assert.match(cinema,/animation: maTitleCard[^;]*forwards/);
  assert.doesNotMatch(cinema,/maTitleCard[^;]*both/);
});
