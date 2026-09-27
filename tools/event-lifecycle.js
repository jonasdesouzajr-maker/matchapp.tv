'use strict';
// Shared build-time rules; global-events.js updates badges between nightly builds.
const DAY=86400000,RETAIN_ENDED_DAYS=3;
function statusAt(event,now=Date.now()){
 const start=Date.parse(event.start),end=Date.parse(event.end);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)
  throw new Error('Invalid global event dates: '+String(event.slug||event.title||'unnamed'));
 return now<start?'upcoming':now>end?'ended':'live';
}
function homeEventOrder(events,now=Date.now()){
 return events.filter(e=>statusAt(e,now)!=='ended'||now<=Date.parse(e.end)+RETAIN_ENDED_DAYS*DAY)
  .sort((a,b)=>{
   const ae=statusAt(a,now)==='ended',be=statusAt(b,now)==='ended';
   if(ae!==be)return ae?1:-1;
   return ae?Date.parse(b.end)-Date.parse(a.end):0;
  });
}
module.exports={statusAt,homeEventOrder,RETAIN_ENDED_DAYS};
