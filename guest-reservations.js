/* Atomic, durable guest identity claims. No network, account or credit access. */
(function () {
  'use strict';
  let opening=null;
  const unavailable=()=>({claimed:false,releasedTokens:[]});
  function database(){
    if(opening)return opening;
    opening=new Promise(resolve=>{
      let request,done=false;
      const finish=value=>{if(done){if(value)value.close();return;}done=true;clearTimeout(timer);if(!value)opening=null;resolve(value);};
      const timer=setTimeout(()=>finish(null),5000);
      try{
        request=window.indexedDB.open('matchapp-guest-reservations',1);
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('identities'))request.result.createObjectStore('identities',{keyPath:'identity'});};
        request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null;};finish(db);};
        request.onerror=request.onblocked=()=>finish(null);
      }catch(_){finish(null);}
    });
    const pending=opening;
    pending.then(value=>{if(!value&&opening===pending)opening=null;});
    return pending;
  }
  async function transaction(input,fallback,change){
    if(!input||!['audiovisual','reading'].includes(input.scope)||!Array.isArray(input.keys)||!input.keys.length||input.keys.length>1000||input.keys.some(key=>typeof key!=='string'||!/^[^\u0000-\u001f]{1,400}$/u.test(key)))return fallback;
    const keys=[...new Set(input.keys)],db=await database();if(!db)return fallback;
    return new Promise(resolve=>{
      let tx,result=fallback,done=false;
      const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};
      const timer=setTimeout(()=>{try{tx?.abort();}catch(_){}finish(fallback);},5000);
      try{
        tx=db.transaction('identities','readwrite');
        const store=tx.objectStore('identities'),rows=new Array(keys.length);let remaining=keys.length;
        tx.oncomplete=()=>finish(result);tx.onabort=tx.onerror=()=>finish(fallback);
        keys.forEach((key,index)=>{
          const identity=input.scope+'\n'+key,request=store.get(identity);
          request.onsuccess=()=>{
            rows[index]=request.result;
            if(--remaining===0){try{result=change(rows,(index,row)=>store.put({...row,identity:input.scope+'\n'+keys[index]}));}catch(_){tx.abort();}}
          };
        });
      }catch(_){try{tx?.abort();}catch(_){}finish(fallback);}
    });
  }
  function reserve(input){
    if(typeof input?.token!=='string'||!input.token||input.token.length>100)return Promise.resolve(unavailable());
    return transaction(input,unavailable(),(rows,put)=>{
      if(rows.some(row=>row&&row.state!=='released'))return unavailable();
      const releasedTokens=[...new Set(rows.filter(row=>row?.state==='released').map(row=>row.token).filter(Boolean))];
      rows.forEach((_row,index)=>put(index,{token:input.token,state:'reserved'}));
      return {claimed:true,releasedTokens};
    });
  }
  function settle(input){
    if(!['shown','lifetime'].includes(input?.state))return Promise.resolve(false);
    return transaction(input,false,(rows,put)=>{rows.forEach((row,index)=>put(index,{token:row?.token||'',state:row?.state==='lifetime'?'lifetime':input.state}));return true;});
  }
  function release(input){
    if(typeof input?.token!=='string'||!input.token)return Promise.resolve(false);
    return transaction(input,false,(rows,put)=>{
      if(rows.some(row=>!row||row.state!=='reserved'||row.token!==input.token))return false;
      rows.forEach((row,index)=>put(index,{token:row.token,state:'released'}));return true;
    });
  }
  window.MatchAppGuestReservations=Object.freeze({reserve,settle,release});
})();
