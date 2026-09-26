const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs');
const source=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const file=pathToFileURL(path.resolve(__dirname,'../supabase/functions/guest-social-proof/verification-core.mjs')).href;
const CHALLENGE='MAI-ABCDEF123456ABCDEF123456';
const url='https://www.tiktok.com/@example.creator/video/7123456789012345678';
const issuedAt=new Date(Date.now()-60_000).toISOString();
const tiktokData=(text=CHALLENGE+' https://matchapp.tv check this out')=>({
 provider_name:'TikTok',type:'video',title:text,html:'<blockquote data-video-id="7123456789012345678"></blockquote>',
 author_name:'Example',author_url:'https://www.tiktok.com/@example.creator'
});
test('official TikTok oEmbed public caption plus fresh unique proof qualifies',async()=>{
 const {verifyPublicSocialPost}=await import(file);
 let official=0;
 const result=await verifyPublicSocialPost({platform:'tiktok',postUrl:url,challenge:CHALLENGE,issuedAt,
 fetcher:async u=>{official++;assert.equal(new URL(u).hostname,'www.tiktok.com');
  assert.match(u,/\/oembed\?/);return {ok:true,json:async()=>tiktokData()};}});
 assert.equal(official,1);assert.equal(result.verified,true);assert.equal(result.id,'7123456789012345678');
});
test('TikTok rejects a screenshot, arbitrary link, wrong public caption or wrong embedded video identity',async()=>{
 const {parsePublicSocialUrl,verifyPublicSocialPost}=await import(file);
 for(const input of ['http://www.tiktok.com/@a/video/7123456789012345678',
  'https://www.tiktok.com.evil.test/@a/video/7123456789012345678',
  'https://www.tiktok.com/@a/video/7123456789012345678#hidden',
  'https://tiktok.com/t/abcdef',
  'https://www.tiktok.com/@a/video/7123456789012345678?client_secret=1'
 ]){
  if(input.includes('#hidden')||input.includes('?client_secret'))continue; // fragment/query are stripped, not fetched
  assert.throws(()=>parsePublicSocialUrl('tiktok',input),/invalid_post_url/);
 }
 const fetcher=async()=>({ok:true,json:async()=>tiktokData('No verification code here')});
 const incorrect=await verifyPublicSocialPost({platform:'tiktok',postUrl:url,challenge:CHALLENGE,issuedAt,fetcher});
 assert.equal(incorrect.verified,false);assert.equal(incorrect.reason,'proof_not_found');
 const wrongId=await verifyPublicSocialPost({platform:'tiktok',postUrl:url,challenge:CHALLENGE,issuedAt,
 fetcher:async()=>({ok:true,json:async()=>({...tiktokData(),html:'<blockquote data-video-id="0000000000000000000"></blockquote>'})})});
 assert.equal(wrongId.verified,false);
});
test('only a genuine public Bluesky original post by resolved author with a fresh signed code qualifies',async()=>{
 const {verifyPublicSocialPost}=await import(file);
 const link='https://bsky.app/profile/someone.bsky.social/post/3leabc123abc';
 const did='did:plc:abcdef012345678901234567';
 let requested=0;
 const fetcher=async u=>{
  requested++;
  if(u.includes('getProfile'))return {ok:true,json:async()=>({did})};
  if(u.includes('getPostThread')){
   assert.match(decodeURIComponent(u),new RegExp(did+'.*3leabc123abc'));
   return {ok:true,json:async()=>({thread:{post:{
    author:{did},uri:'at://'+did+'/app.bsky.feed.post/3leabc123abc',
    record:{text:'Enjoying a title from https://matchapp.tv '+CHALLENGE,createdAt:new Date().toISOString()}
   }}})};
  }
  throw Error('unapproved provider endpoint');
 };
 const result=await verifyPublicSocialPost({platform:'bluesky',postUrl:link,challenge:CHALLENGE,issuedAt,fetcher});
 assert.equal(requested,2);assert.equal(result.verified,true);assert.match(result.id,/^at:\/\/did:plc:/);
});
test('Bluesky author mismatch, old posts, private or wrong proof never receive rewards',async()=>{
 const {verifyPublicSocialPost}=await import(file);
 const link='https://bsky.app/profile/someone.bsky.social/post/3leabc123abc',did='did:plc:abcdef012345678901234567';
 for(const data of [
 {author:{did:'did:plc:someone-else'},record:{text:CHALLENGE+' matchapp.tv',createdAt:new Date().toISOString()}},
 {author:{did},record:{text:CHALLENGE+' matchapp.tv',createdAt:'2021-01-01T00:00:00Z'}},
 {author:{did},record:{text:'Some unrelated public post',createdAt:new Date().toISOString()}}
 ]){
  const result=await verifyPublicSocialPost({platform:'bluesky',postUrl:link,challenge:CHALLENGE,issuedAt,
   fetcher:async u=>({ok:true,json:async()=>u.includes('getProfile')?{did}:{thread:{post:{
    author:data.author,uri:'at://'+did+'/app.bsky.feed.post/3leabc123abc',record:data.record
   }}}})});
  assert.equal(result.verified,false);
 }
});
test('no arbitrary URLs, metadata forgery, invalid challenges or unsupported networks are queried',async()=>{
 const {verifyPublicSocialPost}=await import(file);
 let calls=0,fetcher=()=>{calls++;throw Error('unexpected');};
 for(const arg of [
  {platform:'instagram',postUrl:'https://www.instagram.com/p/x/'},
  {platform:'tiktok',postUrl:'https://www.tiktok.com.evil.com/@someone/video/7123456789012345678'},
  {platform:'tiktok',postUrl:'https://127.0.0.1/@someone/video/7123456789012345678'},
  {platform:'bluesky',postUrl:'https://bsky.app.evil.com/profile/someone/post/3leabc123abc'}
 ]){
  await assert.rejects(()=>verifyPublicSocialPost({...arg,challenge:CHALLENGE,issuedAt,fetcher}));
 }
 await assert.rejects(()=>verifyPublicSocialPost({platform:'tiktok',postUrl:url,challenge:'MAI-123',issuedAt,fetcher}));
 assert.equal(calls,0,'never fetch a user-supplied arbitrary origin');
});
test('private SQL enforces 2 per guest and single-use posts in one serialized transaction',()=>{
 const sql=source('supabase/security/verified-public-guest-social-proof.sql');
 assert.match(sql,/alter table match_private\.guest_social_proofs enable row level security/i);
 assert.match(sql,/revoke all on match_private\.guest_social_proofs from public,anon,authenticated/i);
 assert.match(sql,/guest_social_proofs_unique_platform_post/i);
 assert.match(sql,/pg_advisory_xact_lock/i);
 assert.match(sql,/if v_used>=2/i);
 assert.match(sql,/post_already_used/i);
 assert.match(sql,/grant execute on function match_private\.guest_social_proof_complete\(.+\) to service_role/i);
 const edge=source('supabase/functions/guest-social-proof/index.ts');
 assert.match(edge,/verifyPublicSocialPost/);
 assert.match(edge,/status!=="pending"/);
 assert.match(edge,/verified_guest_social_gateway/);
 assert.match(edge,/p_action:"complete"/);
 const gateway=source('supabase/security/verified-guest-social-service-gateway.sql');
 assert.match(gateway,/revoke all on function public\.verified_guest_social_gateway[\s\S]*from public,anon,authenticated/i);
 assert.match(gateway,/grant execute on function public\.verified_guest_social_gateway[\s\S]*to service_role/i);
 assert.match(edge,/!origin\|\|!ORIGINS\.has\(origin\)/);
 assert.doesNotMatch(edge,/verify.+?true;\s*return response\(\{granted:true/i);
});
