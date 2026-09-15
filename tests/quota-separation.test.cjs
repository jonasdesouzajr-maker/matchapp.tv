const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const policy=fs.readFileSync(path.join(__dirname,'..','matching-policy.js'),'utf8');
const migration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','008_separate_ask_ai_and_match_packs.sql'),'utf8');

test('Match and Ask AI use independent server balances',()=>{
  assert.match(migration,/create or replace function public\.consume_match\(\)/i);
  assert.match(migration,/create or replace function public\.consume_credit\(p_reason text default 'ask_ai'\)/i);
  assert.match(migration,/purchased_matches/i);
});

test('legacy shared-credit messaging cannot return to Match quota UI',()=>{
  assert.doesNotMatch(app,/Credits work for matches and Ask AI/i);
  assert.doesNotMatch(app,/Credits carry you past it/i);
  assert.doesNotMatch(app,/Get more credits/i);
});

test('Match quota CTA targets Match packs',()=>{
  assert.match(app,/focus=matches#matches/);
});

test('temporary RPC interception is removed after direct app migration',()=>{
  assert.doesNotMatch(policy,/__matchQuotaSeparated/);
  assert.doesNotMatch(policy,/Billing\/quota separation hotfix/);
});
