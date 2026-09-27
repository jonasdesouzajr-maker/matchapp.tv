/* MatchApp Ai: optional server-ranked ordering of source-verified ADULT titles.
   The AI chooses only among caller-provided eligible source records. On quota,
   network or provider failure the caller keeps its existing honest source path.
   This module never generates a title, claims rights or spends a Match credit. */
(function(){
 'use strict';
 const MAX=20;
 const clean=(value,max)=>String(value||'').slice(0,max);
 const encode=entry=>({
   id:clean(entry.id,32),title:clean(entry.title,130),format:clean(entry.format,36),
   genres:clean(entry.genres,150),mood:clean(entry.mood,130),
   synopsis:clean(entry.synopsis,240),country:clean(entry.country,40)
 });
 async function rank(entries,criteria){
   const sb=window.supabaseClient;
   if(!sb?.functions?.invoke || !Array.isArray(entries)||!entries.length) return null;
   const selected=entries.slice(0,MAX)
      .map((entry,i)=>({entry,wire:encode({...entry,id:'c'+i})}))
      .filter(row=>row.wire.title.trim());
   if(!selected.length)return null;
   // No AI decision is needed for a single already-verified, criteria-safe title.
   // Preserve OpenAI for real ranking choices and Ask AI instead of wasting its daily cap.
   if(selected.length===1)return selected[0].entry;
   // After a genuine upstream quota response, avoid re-spending the same
   // provider chain for every matching attempt; verified catalog curation wins.
   if(Date.now()<Number(window.__matchappAIDownUntil||0))return null;
   const body={mode:'rank_candidates',adultMatch:true,
     criteria:criteria&&typeof criteria==='object'?criteria:{},
     candidates:selected.map(x=>x.wire)};
   // A single bounded attempt; do not send concurrent billable retry bursts.
   let timeout;
   try{
     const result=await Promise.race([
       sb.functions.invoke('gemini-proxy',{body}),
       new Promise(resolve=>{timeout=setTimeout(()=>resolve(null),45000);})
     ]);
     if(result?.error || !result?.data?.candidates){
       const status=Number(result?.error?.context?.status||result?.data?.status||0);
       if(status===429)window.__matchappAIDownUntil=Date.now()+45000;
       return null;
     }
     const raw=result.data.candidates[0]?.content?.parts?.map(x=>x.text||'').join('')||'';
     const parsed=JSON.parse(raw);
     const ids=Array.isArray(parsed?.ids)?parsed.ids:[];
     for(const id of ids){
       const found=selected.find(x=>x.wire.id===id);
       if(found)return found.entry;
     }
   }catch(_){}
   finally{if(timeout)clearTimeout(timeout);}
   return null;
 }
 window.MatchAppAIRank=Object.freeze({rank});
})();
