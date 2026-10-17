// Raw-query verifier for Google's AdMob SSV protocol. No client reward authority.
// Protocol: https://developers.google.com/admob/android/ssv (verified 2026-10-17).
export const REWARDED_UNIT='ca-app-pub-9541435081010948/2802190985';
export const REWARDED_NUMERIC_UNIT='2802190985';
export const REWARD_AMOUNT=3;
export const REWARD_ITEM='Match Tokens';
// AdMob Console URL verification only. This identity can never earn a reward.
export const DIAGNOSTIC_USER_ID='00000000-0000-0000-0000-000000000000';
export const DIAGNOSTIC_CLAIM_NONCE='0'.repeat(64);
// Exact placeholders observed in Google's signed Console verification callback.
// They are accepted only together for the reserved non-creditable identity.
const CONSOLE_DIAGNOSTIC_UNIT='1234567890';
const CONSOLE_DIAGNOSTIC_TRANSACTION='123456789';
export const GOOGLE_KEY_URL='https://www.gstatic.com/admob/reward/verifier-keys.json';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const NONCE=/^[a-f0-9]{64}$/;
export class RewardVerificationError extends Error {
 constructor(code,status=400){super(code);this.name='RewardVerificationError';this.code=code;this.status=status;}
}
function fail(code,status=400){throw new RewardVerificationError(code,status);}
function decode(value){
 if(/%(?![a-f\d]{2})/i.test(value))fail('invalid_encoding');
 try{return decodeURIComponent(value.replace(/\+/g,' '));}catch(_){fail('invalid_encoding');}
}
function base64Bytes(value,urlSafe=false){
 if(typeof value!=='string'||value.length>2048||!(urlSafe?/^[A-Za-z0-9_-]+={0,2}$/:/^[A-Za-z0-9+/]+={0,2}$/).test(value))fail('invalid_signature');
 try{return Uint8Array.from(atob(urlSafe?value.replace(/-/g,'+').replace(/_/g,'/'):value),c=>c.charCodeAt(0));}catch(_){fail('invalid_signature');}
}
export function derToP1363(der){
 if(!(der instanceof Uint8Array)||der.length<8||der.length>72||der[0]!==0x30||der[1]!==der.length-2)fail('invalid_signature');
 let at=2;const output=new Uint8Array(64);
 for(let coordinate=0;coordinate<2;coordinate++){
  if(der[at++]!==0x02)fail('invalid_signature');
  const size=der[at++];if(size<1||size>33||at+size>der.length)fail('invalid_signature');
  let integer=der.subarray(at,at+size);at+=size;
  if(integer[0]&0x80)fail('invalid_signature');
  if(integer.length>1&&integer[0]===0){if(!(integer[1]&0x80))fail('invalid_signature');integer=integer.subarray(1);}
  if(integer.length>32)fail('invalid_signature');
  output.set(integer,coordinate*32+32-integer.length);
 }
 if(at!==der.length)fail('invalid_signature');return output;
}
export function parseRawCallback(url){
 if(typeof url!=='string'||url.length>12288||url.includes('#'))fail('invalid_query');
 const start=url.indexOf('?');if(start<0)fail('invalid_query');
 const raw=url.slice(start+1);if(!raw||raw.length>8192)fail('invalid_query');
 const parts=raw.split('&');if(parts.length<10||parts.length>20||!parts.at(-2).startsWith('signature=')||!parts.at(-1).startsWith('key_id='))fail('invalid_signature_order');
 const values=Object.create(null);
 for(const pair of parts){
  const separator=pair.indexOf('=');if(separator<1)fail('invalid_query');
  const name=pair.slice(0,separator);if(!/^[a-z_]+$/.test(name)||Object.hasOwn(values,name))fail('duplicate_or_invalid_parameter');
  values[name]=decode(pair.slice(separator+1));
 }
 for(const name of ['ad_network','ad_unit','custom_data','reward_amount','reward_item','timestamp','transaction_id','user_id','signature','key_id'])if(!values[name])fail('missing_parameter');
 if(!/^\d{1,16}$/.test(values.key_id)||!Number.isSafeInteger(Number(values.key_id)))fail('invalid_key_id');
 const signature=derToP1363(base64Bytes(values.signature,true));
 // Keep original bytes/order. Google's Console signs this fixed reward name
 // with a literal space but transports it as +. Only that exact field gets a
 // second candidate; nonce, account, unit, amount and all other bytes stay fixed.
 const signedParts=parts.slice(0,-2),signedText=signedParts.join('&');
 const itemText=signedParts.map(part=>part==='reward_item=Match+Tokens'||part==='reward_item=Match%20Tokens'?'reward_item=Match Tokens':part).join('&');
 const encoder=new TextEncoder();
 return {signed:encoder.encode(signedText),rewardItemSigned:itemText===signedText?null:encoder.encode(itemText),signature,keyId:String(Number(values.key_id)),values};
}
async function boundedText(response,maxBytes){
 const declared=Number(response.headers.get('content-length'));if(Number.isFinite(declared)&&declared>maxBytes)fail('key_server_unavailable',503);
 if(!response.body)fail('key_server_unavailable',503);
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>maxBytes){await reader.cancel();fail('key_server_unavailable',503);}chunks.push(value);}}
 finally{reader.releaseLock();}
 const all=new Uint8Array(total);let at=0;for(const chunk of chunks){all.set(chunk,at);at+=chunk.length;}
 return new TextDecoder('utf-8',{fatal:true}).decode(all);
}
export function createGoogleKeyCache({fetcher=globalThis.fetch,now=Date.now,subtle=globalThis.crypto.subtle}={}){
 // Six hours is below Google's maximum 24-hour key cache lifetime.
 const ttl=6*60*60*1000;let keys=new Map(),fetchedAt=0,pending=null;
 async function refresh(){
  if(pending)return pending;
  const job=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
   try{
    const response=await fetcher(GOOGLE_KEY_URL,{method:'GET',redirect:'error',headers:{Accept:'application/json'},signal:controller.signal});
    if(!response.ok)fail('key_server_unavailable',503);
    const data=JSON.parse(await boundedText(response,32768));if(!Array.isArray(data?.keys)||data.keys.length<1||data.keys.length>20)fail('key_server_unavailable',503);
    const fresh=new Map();
    for(const row of data.keys){
     if(!Number.isSafeInteger(row.keyId)||row.keyId<0||typeof row.base64!=='string')fail('key_server_unavailable',503);
     const id=String(row.keyId);if(fresh.has(id))fail('key_server_unavailable',503);
     const key=await subtle.importKey('spki',base64Bytes(row.base64),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);fresh.set(id,key);
    }
    keys=fresh;fetchedAt=now();
   }catch(error){if(error instanceof RewardVerificationError&&error.status===503)throw error;fail('key_server_unavailable',503);}
   finally{clearTimeout(timer);}
  })();
  pending=job;try{await job;}finally{if(pending===job)pending=null;}
 }
 return {async get(keyId){
  const stale=keys.size===0||now()-fetchedAt>=ttl;
  if(stale)await refresh();
  // Refresh on rotation, bounded to once a minute for unknown attacker-supplied IDs.
  if(!keys.has(keyId)&&!stale&&now()-fetchedAt>=60000)await refresh();
  if(!keys.has(keyId))fail('unknown_key',403);
  return keys.get(keyId);
 }};
}
export function callbackReward(values,now=Date.now()){
 if(!NONCE.test(values.custom_data)||!UUID.test(values.user_id))fail('invalid_reward_binding',403);
 if(!/^\d{1,20}$/.test(values.ad_network))fail('invalid_ad_network',403);
 if(![REWARDED_UNIT,REWARDED_NUMERIC_UNIT].includes(values.ad_unit)||values.reward_amount!=='3'||values.reward_item!==REWARD_ITEM)fail('reward_mismatch',403);
 if(!/^[a-fA-F0-9]{16,256}$/.test(values.transaction_id))fail('invalid_transaction',403);
 // Google's table labels milliseconds but also contains a 16-digit microsecond
 // example. Accept these two explicit epoch encodings, then enforce a real window.
 if(!/^(?:\d{13}|\d{16})$/.test(values.timestamp))fail('invalid_timestamp',403);
 const timestamp=Number(values.timestamp.length===16?BigInt(values.timestamp)/1000n:BigInt(values.timestamp));
 if(!Number.isSafeInteger(timestamp)||timestamp>now+60000||timestamp<now-86400000)fail('expired_timestamp',403);
 return {claimNonce:values.custom_data,userId:values.user_id,transactionId:values.transaction_id.toLowerCase(),adUnitId:REWARDED_UNIT,rewardAmount:REWARD_AMOUNT,rewardItem:REWARD_ITEM,eventAt:new Date(timestamp).toISOString()};
}
export async function verifyRewardCallback(url,{keyCache,now=Date.now(),subtle=globalThis.crypto.subtle}){
 const parsed=parseRawCallback(url),key=await keyCache.get(parsed.keyId);
 let valid=false;try{
  valid=await subtle.verify({name:'ECDSA',hash:'SHA-256'},key,parsed.signature,parsed.signed);
  if(!valid&&parsed.rewardItemSigned)valid=await subtle.verify({name:'ECDSA',hash:'SHA-256'},key,parsed.signature,parsed.rewardItemSigned);
 }catch(_){fail('invalid_signature',403);}
 if(!valid)fail('invalid_signature',403);
 const probeUser=parsed.values.user_id===DIAGNOSTIC_USER_ID,probeNonce=parsed.values.custom_data===DIAGNOSTIC_CLAIM_NONCE;
 if(probeUser||probeNonce){
  if(!probeUser||!probeNonce)fail('invalid_diagnostic_binding',403);
  // The Console uses synthetic unit/transaction values, even for a production
  // ad unit. Adapt only that exact signed pair to reuse every other validation.
  // Return its original identity; dispatch below can never send it to the ledger.
  const consoleProbe=parsed.values.ad_unit===CONSOLE_DIAGNOSTIC_UNIT&&parsed.values.transaction_id===CONSOLE_DIAGNOSTIC_TRANSACTION;
  const diagnosticValues=consoleProbe?{...parsed.values,ad_unit:REWARDED_NUMERIC_UNIT,transaction_id:'0'.repeat(16)}:parsed.values;
  const reward=callbackReward(diagnosticValues,now);
  if(Date.parse(reward.eventAt)<now-300000)fail('expired_diagnostic',403);
  return {...reward,adUnitId:parsed.values.ad_unit,transactionId:parsed.values.transaction_id,diagnostic:true};
 }
 return callbackReward(parsed.values,now);
}
// Keep the diagnostic branch before any database configuration or ledger access.
export async function dispatchRewardCallback(url,options,credit){
 const reward=await verifyRewardCallback(url,options);
 if(reward.diagnostic===true)return {ok:true,credited:false,diagnostic:true};
 return credit(reward);
}
export function rewardRequest(value){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('invalid_request');
 const {action}=value;
 const shapes={wallet:['action'],create:['action','requestId','surface'],native_validate:['action','claimNonce'],status:['action','claimNonce'],cancel:['action','claimNonce']};
 if(typeof action!=='string'||!Object.hasOwn(shapes,action))fail('invalid_request');
 const keys=shapes[action];
 if(Object.keys(value).some(key=>!keys.includes(key)))fail('invalid_request');
 if(action==='create'&&(!UUID.test(value.requestId)||!['one_match','ebook'].includes(value.surface)))fail('invalid_request');
 if(['native_validate','status','cancel'].includes(action)&&(!NONCE.test(value.claimNonce)||value.claimNonce===DIAGNOSTIC_CLAIM_NONCE))fail('invalid_claim');
 return value;
}
