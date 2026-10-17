'use strict';
const {test,describe}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash,randomUUID}=require('node:crypto');
const root=path.join(__dirname,'..'),read=name=>readFileSync(path.join(root,name),'utf8');
const helper=import('../supabase/functions/_shared/adult-promotion-policy.mjs');
const good=enabled=>({data:{ok:true,enabled,policy_version:'match-tokens-v1'},error:null});
const guestImport='import {adultPromotionPolicy} from "../_shared/adult-promotion-policy.mjs";\n';
const guestGuard='   // Retire new issuance only; already issued 90-minute proofs still verify below.\n   const policy=await adultPromotionPolicy(db);\n   if(!policy.known)return response({ok:false,reason:"service_unavailable"},503,origin);\n   if(policy.retired)return response({ok:false,granted:false,reason:"monetization_policy_changed"},409,origin);\n';
const tiktokGuard='    // No server-issued pending promise exists in this legacy handoff protocol.\n    const policy=await adultPromotionPolicy(supabase);\n    if(!policy.known)return new Response(JSON.stringify({ok:false,error:"service_unavailable"}),{status:503,headers:cors(origin)});\n    if(policy.retired)return new Response(JSON.stringify({ok:false,granted:false,reason:"monetization_policy_changed"}),{status:409,headers:cors(origin)});\n\n';
function admin(result){const calls=[];return {calls,async rpc(name,args){calls.push({name,args});if(name==='get_matchapp_monetization_config'){if(result instanceof Error)throw result;return result;}assert.equal(name,'verified_guest_social_gateway');assert.equal(args.p_action,'start');return {data:{ok:true,proof_id:randomUUID(),challenge:'server-existing-proof'},error:null};}};}
async function guestStart(result,kind='match',extra={}){
 const {adultPromotionPolicy}=await helper,db=admin(result),source=read('supabase/functions/guest-social-proof/index.ts');
 const start=source.indexOf('  if(action==="start"){')+'  if(action==="start"){'.length,end=source.indexOf('\n  }',start);assert.ok(start>20&&end>start);
 const run=vm.runInNewContext('(async()=>{'+source.slice(start,end)+'})',{
  body:{kind,...extra},guestId:randomUUID(),db,adultPromotionPolicy,origin:'https://matchapp.tv',console,
  response:(body,status=200)=>({body,status})
 });
 return {response:await run(),calls:db.calls};
}
async function tiktokStart(result){
 const {adultPromotionPolicy}=await helper,db=admin(result),source=read('supabase/functions/tiktok-share-reward/index.ts');
 const start=source.indexOf('    // No server-issued pending promise'),end=source.indexOf('    const {count,error:countErr}',start);assert.ok(start>0&&end>start);
 const run=vm.runInNewContext('(async()=>{'+source.slice(start,end)+'return {continued:true};})',{
  supabase:db,adultPromotionPolicy,Response,JSON,origin:'https://matchapp.tv',cors:()=>({'Content-Type':'application/json'})
 });
 return {response:await run(),calls:db.calls};
}
describe('retirement of new adult social awards',()=>{
 test('policy off preserves all three original guest issuance paths and their gateway call',async()=>{
  for(const kind of ['match','watch_match','ask_ai']){const r=await guestStart(good(false),kind);assert.equal(r.response.status,200);assert.equal(r.response.body.ok,true);assert.equal(r.calls.length,2);assert.equal(r.calls[1].args.p_kind,kind);}
 });
 test('strict server enabled policy blocks new proof issuance regardless of client flags',async()=>{
  for(const kind of ['match','watch_match','ask_ai']){const r=await guestStart(good(true),kind,{enabled:false,policy_version:'old'});assert.equal(r.response.status,409);assert.equal(r.response.body.granted,false);assert.equal(r.response.body.reason,'monetization_policy_changed');assert.deepEqual(r.calls.map(c=>c.name),['get_matchapp_monetization_config']);}
 });
 test('malformed, string flags, unknown versions and outages fail new issuance closed',async()=>{
  for(const result of [good('true'),good('false'),{data:{ok:true,enabled:false},error:null},{data:{ok:true,enabled:false,policy_version:'wrong'},error:null},{data:null,error:{code:'unavailable'}},new Error('offline')]){
   const r=await guestStart(result);assert.equal(r.response.status,503);assert.equal(r.calls.length,1);
   const t=await tiktokStart(result);assert.equal(t.response.status,503);assert.equal(t.calls.length,1);
  }
 });
 test('existing guest validation rejects invalid kinds before any new policy or gateway call',async()=>{
  const r=await guestStart(good(false),'kids');assert.equal(r.response.status,400);assert.equal(r.calls.length,0);
 });
 test('TikTok new handoff awards stop only after policy activation; no legacy table mutation precedes the guard',async()=>{
  const before=await tiktokStart(good(false));assert.equal(before.response.continued,true);assert.equal(before.calls.length,1);
  const after=await tiktokStart(good(true));assert.equal(after.response.status,409);const body=await after.response.json();assert.equal(body.granted,false);assert.equal(body.reason,'monetization_policy_changed');assert.equal(after.calls.length,1);
 });
 test('the deployed guest body and public-post verifier are exact apart from the new-start guard',()=>{
  const source=read('supabase/functions/guest-social-proof/index.ts');assert.equal(source.split(guestGuard).length,2);
  const restored=source.replace(guestImport,'').replace(guestGuard,'').replace('const uuid=(v:unknown)=>','const uuid=v=>');
  assert.equal(createHash('sha256').update(restored).digest('hex'),'3d39044ac5b4b227482f715efcb87c80c34fc39b7e33ff9be53d7b4756acbb4a');
  assert.equal(createHash('sha256').update(read('supabase/functions/guest-social-proof/verification-core.mjs')).digest('hex'),'52348f39f683c12a081a5118ce8da98379f7d4f78313679cc38c3618b7e52348');
  const verifyBranch=source.slice(source.indexOf('  if(action!=="verify")'));
  assert.equal(verifyBranch.includes('adultPromotionPolicy'),false);assert.match(verifyBranch,/90\*60\*1000/);assert.match(verifyBranch,/verifyPublicSocialPost/);assert.match(verifyBranch,/p_action:"complete"/);
 });
 test('the previously untracked live TikTok function is exact apart from its new-award guard',()=>{
  const source=read('supabase/functions/tiktok-share-reward/index.ts');assert.equal(source.split(tiktokGuard).length,2);
  const restored=source.replace(guestImport,'').replace(tiktokGuard,'');
  assert.equal(createHash('sha256').update(restored).digest('hex'),'c98beca2676efa65b1aa1b64d1dcf519fb7fd61a2eaa09dc63ffcaa1b160b571');
 });
});
