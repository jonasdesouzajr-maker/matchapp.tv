"use strict";
const {test,describe,before}=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync,sign,randomUUID}=require('node:crypto');
describe('AdMob signed callback verification',()=>{
let m;
const now=Date.UTC(2026,9,17,12,0,0);
const owner='11111111-1111-4111-8111-111111111111';
const first=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const second=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const keyRow=(pair=first,keyId=123)=>({keyId,base64:pair.publicKey.export({format:'der',type:'spki'}).toString('base64')});
const values=(changes={})=>({ad_network:'5450213213286189855',ad_unit:'2802190985',custom_data:'a'.repeat(64),reward_amount:'3',reward_item:'Match Tokens',timestamp:String(now),transaction_id:'1a'.repeat(16),user_id:owner,...changes});
const signed=(raw,pair=first,keyId=123)=>'https://example.supabase.co/functions/v1/reward-ssv?'+raw+'&signature='+sign('sha256',Buffer.from(raw),{key:pair.privateKey,dsaEncoding:'der'}).toString('base64url')+'&key_id='+keyId;
const raw=(v=values())=>Object.entries(v).map(([key,value])=>key+'='+encodeURIComponent(value)).join('&');
const url=(changes={},pair=first,keyId=123)=>signed(raw(values(changes)),pair,keyId);
const cache=(rows=[keyRow()])=>m.createGoogleKeyCache({now:()=>now,fetcher:async(address,options)=>{assert.equal(address,m.GOOGLE_KEY_URL);assert.equal(options.redirect,'error');return Response.json({keys:rows});}});
const verify=(address,keys=cache())=>m.verifyRewardCallback(address,{keyCache:keys,now});
before(async()=>{m=await import('../supabase/functions/_shared/reward-ssv.mjs');});

test('real ECDSA DER signature verifies the exact numeric unit, nonce, owner and three-token reward',async()=>{
 const reward=await verify(url());assert.deepEqual(reward,{claimNonce:'a'.repeat(64),userId:owner,transactionId:'1a'.repeat(16),adUnitId:m.REWARDED_UNIT,rewardAmount:3,rewardItem:'Match Tokens',eventAt:new Date(now).toISOString()});
 assert.equal((await verify(url({ad_unit:m.REWARDED_UNIT}))).adUnitId,m.REWARDED_UNIT);
});
test('raw percent encoding and plus characters remain signed byte-for-byte',async()=>{
 const address=signed(raw().replace('Match%20Tokens','Match+Tokens'));assert.equal((await verify(address)).rewardAmount,3);
 await assert.rejects(verify(address.replace('Match+Tokens','Match%20Tokens')),/invalid_signature/);
});
test('only the exact configured reward-name space has a signed transport alternative',async()=>{
 const literal=signed(raw().replace('Match%20Tokens','Match Tokens'));
 for(const encoded of ['Match+Tokens','Match%20Tokens']){
  const address=literal.replace('Match Tokens',encoded);
  assert.equal((await verify(address)).rewardAmount,3);
  for(const [oldValue,newValue] of [['reward_amount=3','reward_amount=30'],['ad_unit=2802190985','ad_unit=2802190986'],['custom_data='+('a'.repeat(64)),'custom_data=%61'+('a'.repeat(63))]]){
   await assert.rejects(verify(address.replace(oldValue,newValue)),/invalid_signature/);
  }
 }
 for(const encoded of ['Match%2520Tokens','Match++Tokens','Match%20Tokens%26reward_amount%3D30'])await assert.rejects(verify(literal.replace('Match Tokens',encoded)),m.RewardVerificationError);
});
test('the actual Google-signed Console callback verifies with its recorded public key and cannot credit',async()=>{
 const at=1792246786110;
 const googleKey={keyId:3335741209,base64:'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE+nzvoGqvDeB9+SzE6igTl7TyK4JBbglwir9oTcQta8NuG26ZpZFxt+F2NDk7asTE6/2Yc8i1ATcGIqtuS5hv0Q=='};
 const address='https://example.supabase.co/functions/v1/reward-ssv?ad_network=5450213213286189855&ad_unit=1234567890&custom_data=0000000000000000000000000000000000000000000000000000000000000000&reward_amount=3&reward_item=Match+Tokens&timestamp=1792246786110&transaction_id=123456789&user_id=00000000-0000-0000-0000-000000000000&signature=MEYCIQD7CnLu_FyFK5XtWCntVxJqB3aeC2BnfpcT4sDCRtmQUQIhANp-i-JTlz-jEqHdK1P4OetI_jOej5AY3KfpJQGiBict&key_id=3335741209';
 const keyCache=cache([googleKey]);let credits=0;
 const result=await m.dispatchRewardCallback(address,{keyCache,now:at},async()=>{credits++;throw Error('Google diagnostic must not credit');});
 assert.deepEqual(result,{ok:true,credited:false,diagnostic:true});assert.equal(credits,0);
 await assert.rejects(m.dispatchRewardCallback(address.replace('reward_amount=3','reward_amount=4'),{keyCache,now:at},async()=>{credits++;}),/invalid_signature/);
 assert.equal(credits,0);
});
test('changing any signed reward, nonce, user or timestamp fails cryptographic verification',async()=>{
 const address=url();for(const [before,after] of [['reward_amount=3','reward_amount=30'],['ad_unit=2802190985','ad_unit=2802190986'],['custom_data='+('a'.repeat(64)),'custom_data='+('b'.repeat(64))],['user_id='+owner,'user_id='+randomUUID()],['timestamp='+now,'timestamp='+(now+1)]])await assert.rejects(verify(address.replace(before,after)),/invalid_signature/);
});
test('even correctly signed callbacks cannot change the configured unit, amount, item or account format',async()=>{
 for(const changes of [{ad_unit:'9999999999'},{reward_amount:'300'},{reward_amount:'3.0'},{reward_item:'Credits'},{custom_data:'short'},{user_id:'anonymous'},{transaction_id:'not-a-hex-transaction'},{ad_network:'google'}])await assert.rejects(verify(url(changes)),m.RewardVerificationError);
});
test('duplicate, encoded-name, missing and malformed parameters are rejected before key lookup',async()=>{
 const bad=[raw()+'&reward_amount=3',raw()+'&%72eward_amount=3',raw().replace('custom_data='+('a'.repeat(64))+'&',''),raw().replace('Match%20Tokens','Match%2ZTokens'),raw().replace('Match%20Tokens','%C0%AF'),raw()+'&custom_data=x'];
 for(const input of bad)await assert.rejects(verify(signed(input)),m.RewardVerificationError);
});
test('signature and key ID must be the final two parameters with no fragment or duplicate signature',async()=>{
 const address=url(),query=address.split('?')[1],parts=query.split('&');
 const base=address.slice(0,address.indexOf('?')+1);
 for(const bad of [address+'&extra=1',address+'#ignored',base+[...parts.slice(0,-2),parts.at(-1),parts.at(-2)].join('&'),signed(raw()+'&signature=abc')])await assert.rejects(verify(bad),m.RewardVerificationError);
});
test('noncanonical or malformed ASN.1 ECDSA signatures fail closed',()=>{
 for(const bytes of [[],[0x30,0],[0x30,6,2,1,0x80,2,1,1],[0x30,7,2,2,0,1,2,1,1],[0x30,6,2,1,1,2,1,1,0],[0x30,0x81,6,2,1,1,2,1,1]])assert.throws(()=>m.derToP1363(Uint8Array.from(bytes)),m.RewardVerificationError);
 assert.equal(m.derToP1363(Uint8Array.from([0x30,6,2,1,1,2,1,1])).length,64);
});
test('unknown signing key and wrong public key cannot verify a callback',async()=>{
 await assert.rejects(verify(url({},first,999)),/unknown_key/);await assert.rejects(verify(url(),cache([keyRow(second,123)])),/invalid_signature/);
});
test('trusted keys are fetched once for parallel callers from only the fixed HTTPS endpoint',async()=>{
 let calls=0;const keys=m.createGoogleKeyCache({now:()=>now,fetcher:async(address,options)=>{calls++;assert.equal(address,'https://www.gstatic.com/admob/reward/verifier-keys.json');assert.equal(options.redirect,'error');return Response.json({keys:[keyRow()]});}});
 const results=await Promise.all(Array.from({length:20},()=>verify(url(),keys)));assert.equal(results.length,20);assert.equal(calls,1);
 await assert.rejects(verify(url({},first,998),keys),/unknown_key/);await assert.rejects(verify(url({},first,999),keys),/unknown_key/);assert.equal(calls,1);
});
test('rotated keys refresh while expired cache and failed downloads never bypass verification',async()=>{
 let clock=now,calls=0,mode='old';const keys=m.createGoogleKeyCache({now:()=>clock,fetcher:async()=>{calls++;if(mode==='fail')throw Error('offline');return Response.json({keys:[mode==='old'?keyRow():keyRow(second,456)]});}});
 await verify(url(),keys);clock+=61000;mode='new';await m.verifyRewardCallback(url({},second,456),{keyCache:keys,now});assert.equal(calls,2);
 mode='fail';clock+=6*60*60*1000+1;await assert.rejects(m.verifyRewardCallback(url({},second,456),{keyCache:keys,now}),error=>error.code==='key_server_unavailable'&&error.status===503);
});
test('malformed, duplicate, excessive or oversized key-server responses fail closed',async()=>{
 for(const data of [{keys:[]},{keys:[keyRow(),keyRow()]},{keys:[{keyId:123,base64:'garbage'}]},{keys:Array.from({length:21},(_,i)=>keyRow(first,i))}]){
  const keys=m.createGoogleKeyCache({fetcher:async()=>Response.json(data)});await assert.rejects(verify(url(),keys),error=>error.status===503);
 }
 const keys=m.createGoogleKeyCache({fetcher:async()=>new Response('x'.repeat(40000))});await assert.rejects(verify(url(),keys),error=>error.status===503);
});
test('only explicit realistic millisecond or microsecond epochs are accepted within the bounded window',async()=>{
 assert.equal((await verify(url({timestamp:String(BigInt(now)*1000n+123n)}))).eventAt,new Date(now).toISOString());
 for(const stamp of [String(now/1000),String(now-86400001),String(now+60001),'9999999999999999','0','NaN'])await assert.rejects(verify(url({timestamp:stamp})),m.RewardVerificationError);
});
test('client reward requests are allowlisted and cannot submit credits, earned state, owner, or Kids surface',()=>{
 assert.equal(m.rewardRequest({action:'create',requestId:owner,surface:'one_match'}).action,'create');
 assert.equal(m.rewardRequest({action:'native_validate',claimNonce:'a'.repeat(64)}).action,'native_validate');
 for(const value of [null,[],{action:'earned'},{action:'constructor'},{action:'__proto__'},{action:'wallet',credits:3},{action:'status',claimNonce:'a'.repeat(64),userId:owner},{action:'create',requestId:owner,surface:'kids'},{action:'create',requestId:owner,surface:'one_match',amount:3},{action:'native_validate',claimNonce:'bad'}])assert.throws(()=>m.rewardRequest(value),m.RewardVerificationError);
});

test('only a fresh Google-signed reserved Console probe succeeds without touching the ledger',async()=>{
 let credits=0;const credit=async()=>{credits++;throw Error('diagnostic must not access ledger');};
 const probe={user_id:m.DIAGNOSTIC_USER_ID,custom_data:m.DIAGNOSTIC_CLAIM_NONCE};
 for(const changes of [{},{ad_unit:m.REWARDED_UNIT},{timestamp:String(now-300000)},{timestamp:String(now+60000)}]){
  const result=await m.dispatchRewardCallback(url({...probe,...changes}),{keyCache:cache(),now},credit);
  assert.deepEqual(result,{ok:true,credited:false,diagnostic:true});
 }
 assert.equal(credits,0);
});
test('forged, stale, future, wrong-unit and mixed-identity probes fail without any ledger call',async()=>{
 let credits=0;const credit=async()=>{credits++;return {ok:true,credited:true};};
 const probe={user_id:m.DIAGNOSTIC_USER_ID,custom_data:m.DIAGNOSTIC_CLAIM_NONCE};
 const invalid=[
  url(probe).replace('reward_amount=3','reward_amount=4'),url(probe,second),
  ...[{timestamp:String(now-300001)},{timestamp:String(now+60001)},{ad_unit:'9999999999'},
   {reward_amount:'2'},{reward_item:'Credits'},{user_id:owner},{custom_data:'a'.repeat(64)}].map(change=>url({...probe,...change}))
 ];
 for(const address of invalid)await assert.rejects(m.dispatchRewardCallback(address,{keyCache:cache(),now},credit),error=>error instanceof m.RewardVerificationError&&error.status===403);
 assert.equal(credits,0);
});
test('Console synthetic unit and short transaction are accepted only as the exact signed non-creditable pair',async()=>{
 let credits=0;const credit=async()=>{credits++;throw Error('Console verification must not credit');};
 const probe={user_id:m.DIAGNOSTIC_USER_ID,custom_data:m.DIAGNOSTIC_CLAIM_NONCE,ad_unit:'1234567890',transaction_id:'123456789'};
 const address=signed(raw(values(probe)).replace('Match%20Tokens','Match+Tokens'));
 assert.deepEqual(await m.dispatchRewardCallback(address,{keyCache:cache(),now},credit),{ok:true,credited:false,diagnostic:true});
 for(const changes of [{user_id:owner},{custom_data:'a'.repeat(64)},{user_id:owner,custom_data:'a'.repeat(64)},
  {ad_unit:'2802190985'},{ad_unit:'1234567891'},{transaction_id:'123456788'},{transaction_id:'1a'.repeat(16)},
  {reward_amount:'30'},{reward_item:'Credits'},{timestamp:String(now-300001)},{timestamp:String(now+60001)}]){
  await assert.rejects(m.dispatchRewardCallback(url({...probe,...changes}),{keyCache:cache(),now},credit),m.RewardVerificationError);
 }
 await assert.rejects(m.dispatchRewardCallback(address.replace('reward_amount=3','reward_amount=4'),{keyCache:cache(),now},credit),/invalid_signature/);
 assert.equal(credits,0);
});
test('reserved probe nonce cannot become a client reward claim and ordinary signed callbacks retain ledger authority',async()=>{
 for(const action of ['native_validate','status','cancel'])assert.throws(()=>m.rewardRequest({action,claimNonce:m.DIAGNOSTIC_CLAIM_NONCE}),/invalid_claim/);
 let credits=0;
 const result=await m.dispatchRewardCallback(url(),{keyCache:cache(),now},async reward=>{credits++;assert.equal(reward.userId,owner);assert.equal(reward.claimNonce,'a'.repeat(64));assert.equal(reward.diagnostic,undefined);return {ok:true,credited:true,duplicate:false};});
 assert.deepEqual(result,{ok:true,credited:true,duplicate:false});assert.equal(credits,1);
 await assert.rejects(m.dispatchRewardCallback(url(),{keyCache:cache(),now},async()=>{throw new m.RewardVerificationError('reward_not_verified',403);}),error=>error.code==='reward_not_verified'&&error.status===403);
});

});
