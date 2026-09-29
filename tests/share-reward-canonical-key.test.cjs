'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'..','supabase/migrations/20260929120000_canonicalize_match_share_reward_keys.sql'),'utf8');

test('three distinct result shares use the same canonical title identity as match history',()=>{
  // The old whitespace-only key let \"Star Wars\" and \"Star-Wars\" count twice.
  assert.match(sql,/v_key text := match_private\.title_key\(p_title\)/);
  assert.match(sql,/h\.title_key=match_private\.title_key\(p_title\)/);
  assert.match(sql,/values\(v_uid,v_key\) on conflict do nothing/);
  assert.doesNotMatch(sql,/v_key text := lower\(trim\(/);
});

test('canonicalization deduplicates previously recorded variants without changing rewards or access',()=>{
  assert.match(sql,/PARTITION BY user_id, match_private\.title_key\(title_key\)/);
  assert.match(sql,/SET title_key=match_private\.title_key\(title_key\)/);
  assert.match(sql,/interval '6 hours'/);
  assert.match(sql,/v_count % 3 <> 0/);
  assert.match(sql,/on conflict do nothing/);
  assert.match(sql,/revoke all on function public\.claim_match_result_share\(text\) from public,anon/);
  assert.match(sql,/grant execute on function public\.claim_match_result_share\(text\) to authenticated/);
});
