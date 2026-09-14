const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
test('Postgres executes private friends/history rules and rejects cross-user access with rolled-back fixtures',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const db=await PGlite.create();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,is_anonymous boolean,raw_user_meta_data jsonb);grant usage on schema auth to authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
  const schema=fs.readFileSync(path.join(__dirname,'../supabase/security/private-friends-and-history.sql'),'utf8').replace(/commit;\s*$/i,'');
  const fixtures=fs.readFileSync(path.join(__dirname,'private-friends.rollback.sql'),'utf8');
  const result=await db.exec(schema+fixtures);assert(result.some(r=>r.rows?.some(row=>String(row.verification).startsWith('PASS:'))));
  const schemas=await db.query("select schema_name from information_schema.schemata where schema_name='match_private'");assert.equal(schemas.rows.length,0,'all DDL and fixtures rolled back');
 }finally{await db.close();}
});
