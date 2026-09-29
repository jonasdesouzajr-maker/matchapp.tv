const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const checkin=fs.readFileSync(path.join(root,'daily-checkin.js'),'utf8');
const checkinCss=fs.readFileSync(path.join(root,'daily-checkin.css'),'utf8');
const bubbleCss=fs.readFileSync(path.join(root,'daily-checkin-bubble.css'),'utf8');
const iaCss=fs.readFileSync(path.join(root,'matchapp-ia.css'),'utf8');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase','migrations','20260921181338_repair_daily_checkin_reward_delta.sql'),'utf8');

test('Daily Check-in grants one Extra Match and repairs only a missing same-day delta',()=>{
  assert.match(migration,/v_award int := 1/i);
  assert.match(migration,/v_expected := case when v\.streak = 7 then 6 else 1 end/i);
  assert.match(migration,/select coalesce\(sum\(l\.delta\), 0\)::int/i);
  assert.match(migration,/l\.pack in \('daily_checkin','weekly_checkin'\)/i);
  assert.match(migration,/v_award := v_expected - v_granted/i);
  assert.match(migration,/v_award := greatest\(0, v_expected - v_granted\)/i);
  assert.match(migration,/purchased_matches = coalesce\(purchased_matches, 0\) \+ v_award/i);
  assert.match(migration,/revoke execute on function public\.daily_match_checkin\(\) from public, anon/i);
});

test('Daily Check-in celebrates only a committed award and publishes the actual server balance',()=>{
  assert.match(checkin,/if\s*\(awarded\s*>\s*0\)\s*\{[\s\S]*celebrate\(data\)/);
  assert.match(checkin,/matchapp:matchbalancechange/);
  assert.match(checkin,/daily-reward-sparks/);
  assert.match(checkinCss,/@keyframes dcSparkBurst/);
  assert.match(checkinCss,/@keyframes dcClaimSuccess/);
  assert.match(bubbleCss,/\.daily-reward\.daily-reward-toast/);
  assert.match(bubbleCss,/@media\(prefers-reduced-motion:reduce\)/);
});

test('The reminder is fixed, compact, and releases page space on mobile and desktop',()=>{
  assert.match(checkin,/daily-checkin-bubble\.css/);
  assert.match(checkin,/root\.className='daily-checkin dc checkin-bubble/);
  assert.match(bubbleCss,/#daily-match-checkin\.dc\.checkin-bubble/);
  assert.match(bubbleCss,/position:fixed!important/);
  assert.match(bubbleCss,/is-hidden\s*\{display:none!important\}/);
  assert.match(bubbleCss,/@media\(max-width:600px\)/);
});

test('Home match picker uses requested heading and keeps compact breathing room inside its field',()=>{
  assert.match(home,/data-i18n="q.title">Find what to watch here<\/h2>/);
  assert.match(iaCss,/\.ma-filter-row\{display:grid;gap:4px;/);
  assert.match(iaCss,/\.ma-chip-row\{display:flex;gap:5px;/);
  assert.match(iaCss,/\.ma-concierge #questionnaire-box\{padding:4px!important;overflow:hidden!important\}/);
  assert.match(iaCss,/\.ma-chip\{[^}]*max-width:100%/);
});
