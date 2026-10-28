'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('private diagnostic RPC accepts enums only, aggregates without identity and denies public reads',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite();
 try{
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(fs.readFileSync('supabase/migrations/20261027141009_private_ui_error_counts.sql','utf8'));
  await db.exec('set role anon');
  const call=async(code,surface='web',page='home')=>(await db.query('select public.record_ui_error_20261027($1,$2,$3,$4) as ok',[code,surface,page,'phone'])).rows[0].ok;
  assert.equal(await call('ui-error'),true);assert.equal(await call('ui-error'),true);
  assert.equal(await call('secret@example.com'),false);assert.equal(await call('kids-quota','kids','kids'),true);assert.equal(await call('kids-quota','kids','home'),false);
  assert.equal(await call(null),false);await assert.rejects(db.query('select * from match_private.ui_error_counts'),/permission denied/);
  await db.exec('reset role');const rows=(await db.query('select * from match_private.ui_error_counts order by code')).rows;
  assert.equal(rows.length,2);assert.equal(rows.find(r=>r.code==='ui-error').occurrences,2);assert.deepEqual(Object.keys(rows[0]).sort(),['code','hour','occurrences','page','revision','surface','viewport'].sort());
  await db.exec("update match_private.ui_error_counts set occurrences=1000 where code='ui-error'");assert.equal(await call('ui-error'),false);
  await db.exec("update match_private.ui_error_counts set hour=now()-interval '31 days'");await call('ui-error');assert.equal((await db.query('select count(*)::integer as n from match_private.ui_error_counts')).rows[0].n,1);
 }finally{await db.close()}
});
