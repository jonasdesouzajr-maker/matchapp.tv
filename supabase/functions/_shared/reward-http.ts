import {RewardVerificationError} from './reward-ssv.mjs';
export const REWARD_ORIGINS=new Set(['https://matchapp.tv','https://www.matchapp.tv']);
export async function rewardJson(req:Request,signal:AbortSignal):Promise<unknown>{
 if(!(req.headers.get('content-type')||'').toLowerCase().startsWith('application/json')||!req.body)throw new RewardVerificationError('invalid_request');
 const declared=Number(req.headers.get('content-length'));
 if(Number.isFinite(declared)&&declared>4096)throw new RewardVerificationError('request_too_large',413);
 const reader=req.body.getReader(),parts:Uint8Array[]=[];let length=0;
 const cancel=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
 try{
  while(true){
   if(signal.aborted)throw new RewardVerificationError('request_timeout',408);
   const {done,value}=await reader.read();if(signal.aborted)throw new RewardVerificationError('request_timeout',408);if(done)break;
   length+=value.length;if(length>4096){await reader.cancel();throw new RewardVerificationError('request_too_large',413);}parts.push(value);
  }
 }finally{signal.removeEventListener('abort',cancel);reader.releaseLock();}
 const bytes=new Uint8Array(length);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch(_){throw new RewardVerificationError('invalid_request');}
}
export function rewardErrorStatus(reason:string):number{
 if(reason==='rate_limited')return 429;
 if(['claim_not_found','no_profile'].includes(reason))return 404;
 if(['invalid_request','invalid_claim'].includes(reason))return 400;
 return 409;
}
