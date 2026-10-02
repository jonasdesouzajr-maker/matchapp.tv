/* MatchApp Ai KIDS entitlement + history bridge.
   The grown-up account owns the entitlement, but Kids usage, top-ups, share
   rewards and title history are isolated from the adult Match/Ask AI system. */
(function(){
 'use strict';
 let owner=null;
 const DAY_KEY='match_kids_dailyDate',COUNT_KEY='match_kids_dailyCount',BONUS_KEY='match_kids_bonusMatches';
 const HISTORY_KEYS=['match_kids_shownList','match_kids_seenList','match_kids_savedList','match_kids_dislikedList'];
 async function session(){const sb=window.supabaseClient;if(!sb)throw Error('connection');const result=await sb.auth.getSession();if(result.error)throw result.error;return result.data?.session?.user||null}
 async function attach(user){
  const id=user?.id||null;if(owner===id)return;owner=id;
  if(user&&localStorage.getItem('match_kids_portfolio_owner')!==id){HISTORY_KEYS.forEach(k=>localStorage.removeItem(k));localStorage.setItem('match_kids_portfolio_owner',id)}
 }
 function key(title){return String(title||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
 function list(k){try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}}
 function known(){const out=new Set();HISTORY_KEYS.forEach(k=>list(k).forEach(v=>out.add(key(v?.title||v))));return out}
 function today(){return new Date().toLocaleDateString()}
 function num(k){const n=Number.parseInt(localStorage.getItem(k)||'0',10);return Number.isFinite(n)?Math.max(0,n):0}
 function guestStatus(){const used=localStorage.getItem(DAY_KEY)===today()?num(COUNT_KEY):0;return{authenticated:false,kids:true,used,limit:3,remaining:Math.max(0,3-used),kids_purchased_matches:num(BONUS_KEY),kids_credits:0,anon:true,userId:null}}
 function announce(data){try{document.dispatchEvent(new CustomEvent('matchapp:kids-quota',{detail:data||{}}))}catch(_){}return data}
 async function consumeKind(reason,isCurrent=()=>true){
  const user=await session();await attach(user);if(!isCurrent())throw Error('cancelled');
  if(user){const {data,error}=await window.supabaseClient.rpc('consume_kids_action',{p_reason:reason});if(error||!data)throw error||Error('quota');const current=await session();if(current?.id!==user.id)throw Error('account_changed');return announce({...data,userId:user.id})}
  const status=guestStatus();
  if(status.used<status.limit){localStorage.setItem(DAY_KEY,today());localStorage.setItem(COUNT_KEY,String(status.used+1));return announce({...status,allowed:true,reason,used:status.used+1,remaining:status.limit-(status.used+1)})}
  if(reason==='match'&&status.kids_purchased_matches>0){const balance=status.kids_purchased_matches-1;localStorage.setItem(BONUS_KEY,String(balance));return announce({...status,allowed:true,reason,remaining:0,kids_purchased_matches:balance,paid_with_kids_match_pack:true})}
  return announce({...status,allowed:false,reason:'limit_reached',requested:reason,remaining:0})
 }
 const consume=isCurrent=>consumeKind('match',isCurrent),consumeAI=isCurrent=>consumeKind('ask_ai',isCurrent);
 async function claimShareReward(){
  const user=await session();await attach(user);
  if(user){const {data,error}=await window.supabaseClient.rpc('claim_kids_share_reward');if(error||!data)throw error||Error('reward');if((await session())?.id!==user.id)throw Error('account_changed');return announce({...data,userId:user.id})}
  const windowMs=6*60*60*1000,now=Date.now(),cutoff=now-windowMs,max=3;let log=[];try{log=JSON.parse(localStorage.getItem('match_kids_shareLog')||'[]');if(!Array.isArray(log))log=[]}catch(_){}
  log=log.map(Number).filter(ts=>Number.isFinite(ts)&&ts>cutoff);if(log.length>=max){const oldest=Math.min(...log);localStorage.setItem('match_kids_shareLog',JSON.stringify(log));return announce({granted:false,reason:'window_full',remaining_rewards:0,reset_in_seconds:Math.max(0,Math.ceil((oldest+windowMs-now)/1000)),kids_purchased_matches:num(BONUS_KEY),userId:null})}
  log.push(now);localStorage.setItem('match_kids_shareLog',JSON.stringify(log));const balance=num(BONUS_KEY)+1;localStorage.setItem(BONUS_KEY,String(balance));return announce({granted:true,remaining_rewards:max-log.length,kids_purchased_matches:balance,matches:balance,userId:null})
 }
 async function status(){const user=await session();await attach(user);if(user){const {data,error}=await window.supabaseClient.rpc('kids_status');if(error||!data)throw error||Error('quota');return announce({...data,userId:user.id})}return announce(guestStatus())}
 async function remember(item,action,userId){
  if(!['shown','save','seen','loved','dislike'].includes(action))throw Error('action');
  const user=await session();if((user?.id||null)!==userId)throw Error('account_changed');
  const entry={...item,action,addedAt:Date.now(),kids:true};
  const storageKey=action==='shown'?'match_kids_shownList':action==='save'?'match_kids_savedList':action==='dislike'?'match_kids_dislikedList':'match_kids_seenList';
  const current=list(storageKey);localStorage.setItem(storageKey,JSON.stringify([entry,...current.filter(i=>key(i?.title||i)!==key(item.title))].slice(0,250)))
 }
 function loadCatalogMedia(){if(document.querySelector('script[data-kids-catalog-media]'))return;const s=document.createElement('script');s.src='/catalog-media.js?v=20260925-verified2';s.defer=true;s.async=false;s.dataset.kidsCatalogMedia='1';document.head.appendChild(s)}
 window.KidsAccount=Object.freeze({consume,consumeMatch:consume,consumeAI,remember,claimShareReward,status,known,key,prepare:async()=>attach(await session())});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCatalogMedia,{once:true});else loadCatalogMedia();
})();