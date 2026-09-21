const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const checkin=fs.readFileSync(path.join(root,'daily-checkin.js'),'utf8');
const checkinCss=fs.readFileSync(path.join(root,'daily-checkin.css'),'utf8');
const iaCss=fs.readFileSync(path.join(root,'matchapp-ia.css'),'utf8');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase','migrations','20260921180605_repair_daily_checkin_claims.sql'),'utf8');

test('Daily Check-in grants one Extra Match and repairs a missing same-day reward once',()=>{
  assert.match(migration,/v_award int := 1/i);
  assert.match(migration,/v_award := case when v_reward then 6 else 1 end/i);
  assert.match(migration,/l\.pack in \('daily_checkin','weekly_checkin'\)/i);
  assert.match(migration,/not exists\s*\([\s\S]*match_pack_ledger/i);
  assert.match(migration,/purchased_matches = coalesce\(purchased_matches, 0\) \+ v_award/i);
  assert.match(migration,/revoke execute on function public\.daily_match_checkin\(\) from public, anon/i);
});

test('Daily Check-in only celebrates a confirmed award and publishes the server balance',()=>{
  assert.match(checkin,/if \(awarded > 0\) \{[\s\S]*celebrate\(data\)/);
  assert.match(checkin,/matchapp:matchbalancechange/);
  assert.match(checkin,/daily-reward-sparks/);
  assert.match(checkinCss,/@keyframes dcSparkBurst/);
  assert.match(checkinCss,/@keyframes dcClaimSuccess/);
});

test('Home match picker uses requested heading and keeps compact breathing room inside its field',()=>{
  assert.match(home,/data-fixed-copy="match-box-title">FInd what to watch here<\/h2>/);
  assert.match(iaCss,/\.ma-filter-row\{display:grid;gap:4px;/);
  assert.match(iaCss,/\.ma-chip-row\{display:flex;gap:5px;/);
  assert.match(iaCss,/\.ma-concierge #questionnaire-box\{padding:4px!important;overflow:hidden!important\}/);
  assert.match(iaCss,/\.ma-chip\{[^}]*max-width:100%/);
});
