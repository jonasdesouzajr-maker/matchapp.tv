'use strict';

// Deterministic boundary for callers of the browser's atomic guest ledger.
// Production IndexedDB transactions are verified separately by helper/browser tests.
function createGuestReservations(){
 const scopes=new Map();let transactions=Promise.resolve();
 const atomic=job=>{const result=transactions.then(job);transactions=result.catch(()=>{});return result;};
 const keysOf=keys=>Array.from(new Set((Array.isArray(keys)?keys:[]).filter(key=>typeof key==='string'&&key)));
 const rowsFor=(scope,keys)=>{
  if(!scopes.has(scope))scopes.set(scope,new Map());
  const index=scopes.get(scope),rows=keys.map(key=>index.get(key));
  return {index,rows};
 };
 return {
  reserve({scope,keys,token}){return atomic(()=>{
   keys=keysOf(keys);if(!['audiovisual','reading'].includes(scope)||!keys.length||!token)return {claimed:false,releasedTokens:[]};
   const {index,rows}=rowsFor(scope,keys);
   if(rows.some(row=>row&&row.state!=='released'))return {claimed:false,releasedTokens:[]};
   const releasedTokens=Array.from(new Set(rows.filter(row=>row?.state==='released').map(row=>row.token)));
   for(const key of keys)index.set(key,{token,state:'reserved'});
   return {claimed:true,releasedTokens};
  });},
  settle({scope,keys,state}){return atomic(()=>{
   keys=keysOf(keys);if(!['audiovisual','reading'].includes(scope)||!keys.length||!['shown','lifetime'].includes(state))return false;
   const {index,rows}=rowsFor(scope,keys);
   keys.forEach((key,i)=>index.set(key,{token:rows[i]?.token||'',state:rows[i]?.state==='lifetime'?'lifetime':state}));return true;
  });},
  release({scope,keys,token}){return atomic(()=>{
   keys=keysOf(keys);if(!['audiovisual','reading'].includes(scope)||!keys.length||!token)return false;
   const {rows}=rowsFor(scope,keys);
   if(rows.some(row=>!row||row.state!=='reserved'||row.token!==token))return false;
   for(const row of rows)row.state='released';return true;
  });}
 };
}
function installGuestReservations(window,coordinator=createGuestReservations()){
 window.MatchAppGuestReservations=coordinator;return coordinator;
}
module.exports={createGuestReservations,installGuestReservations};
