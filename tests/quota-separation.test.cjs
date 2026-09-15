const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const policy=fs.readFileSync(path.join(__dirname,'..','matching-policy.js'),'utf8');
const migration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','008_separate_ask_ai_and_match_packs.sql'),'utf8');

test('Match and Ask AI have independent server balances',()=>{
  assert.match(migration,/create or replace function public\.consume_match\(\)/i);
  assert.match(migration,/create or replace function public\.consume_credit\(p_reason text default 'ask_ai'\)/i);
  assert.match(migration,/purchased_matches/i);
});

test('legacy app Match requests are narrowly routed to consume_match until direct migration',()=>{
  assert.match(policy,/fn === 'consume_ai_action' && args && args\.p_reason === 'match'/);
  assert.match(policy,/return rpc\('consume_match', undefined, options\)/);
  assert.doesNotMatch(policy,/p_reason === 'ask_ai'[^\n]*consume_match/);
});
