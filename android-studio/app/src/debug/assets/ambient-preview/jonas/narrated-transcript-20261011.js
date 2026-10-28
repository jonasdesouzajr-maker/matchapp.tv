/* Speech-synced transcript presentation only.
 * Uses genuine playback position/boundary callbacks, never a fake mouth timer.
 * The existing TTS / credits / microphone machinery remains authoritative. */
(function(){
 'use strict';
 if(window.MatchAppJonasNarration)return;
 let current=null;
 function split(text){
  const source=String(text||'');
  const sentences=source.match(/[^.!?。！？\n]+(?:[.!?。！？]+|$)|\n/g)||[source];
  const pieces=[];
  for(const sentence of sentences){
   if(sentence.length<=145){pieces.push(sentence);continue}
   let rest=sentence;
   while(rest.length>145){
    let end=rest.lastIndexOf(' ',138);
    if(end<48)end=138;
    else end+=1;
    pieces.push(rest.slice(0,end));rest=rest.slice(end);
   }
   if(rest)pieces.push(rest);
  }
  return pieces.filter(Boolean);
 }
 function prepare(element,text,spokenLimit=650){
  finish();
  if(!element)return null;
  element.replaceChildren();
  // Only highlight speech actually requested from TTS, never long text that
  // the compact assistant displayed but has not spoken.
  const full=String(text||'');
  const maxSpoken=Number.isFinite(spokenLimit)?Math.max(1,Math.min(650,Math.round(spokenLimit))):650;
  const spoken=full.trim().slice(0,maxSpoken);
  const lines=split(spoken),nodes=[];
  for(const part of lines){
   const node=document.createElement('span');
   node.className='jonas-speech-line';
   node.textContent=part;
   element.append(node);
   nodes.push(node);
  }
  if(full.trim().length>spoken.length){
   const remainder=document.createElement('span');
   remainder.className='jonas-unspoken-remainder';
   remainder.textContent=full.trim().slice(spoken.length);
   element.append(remainder);
  }
  const log=element.closest('#chat-log');
  const ends=[];let count=0;
  for(const line of lines){count+=line.length;ends.push(count)}
  current={element,log,nodes,ends,total:count,index:-1};
  advance(0);
  return current;
 }
 function advance(progress,expected){
  const session=current;
  if(!session||(expected&&expected!==session)||!session.element.isConnected)return;
  const p=Math.max(0,Math.min(1,Number(progress)||0));
  const chars=p*session.total;
  const found=session.ends.findIndex(end=>chars<end);
  const idx=found<0?session.nodes.length-1:found;
  session.index=idx;
  for(let i=0;i<session.nodes.length;i++){
   const node=session.nodes[i];
   node.classList.toggle('jonas-spoken',i<idx);
   node.classList.toggle('jonas-speaking-line',i===idx);
  }
  const log=session.log,active=session.nodes[idx];
  if(log&&active){
   const bounds=log.getBoundingClientRect(),line=active.getBoundingClientRect();
   const inset=Math.min(12,Math.max(0,(log.clientHeight-24)/4));
   // Keep the spoken sentence in the reading area without moving the page.
   if(line.top>=bounds.top+inset&&line.bottom<=bounds.top+log.clientHeight-16)return;
   const target=log.scrollTop+line.top-bounds.top-inset;
   log.scrollTop=Math.max(0,Math.min(log.scrollHeight-log.clientHeight,target));
  }
 }
 function finish(expected){
  if(!current||(expected&&expected!==current))return;
  for(const node of current.nodes){
   node.classList.remove('jonas-speaking-line');
   node.classList.add('jonas-spoken');
  }
  current=null;
 }
 const strings={
  en:['New chat','History'], 'pt-BR':['Novo chat','Histórico'],es:['Nuevo chat','Historial'],
  fr:['Nouveau chat','Historique'],de:['Neuer Chat','Verlauf'],it:['Nuova chat','Cronologia'],
  tr:['Yeni sohbet','Geçmiş'],ru:['Новый чат','История'],ar:['محادثة جديدة','السجل'],
  hi:['नई चैट','इतिहास'],id:['Chat baru','Riwayat'],ja:['新しいチャット','履歴'],
  ko:['새 채팅','기록'],zh:['新对话','历史']
 };
 function localizeHead(){
  let l=window.MATCH_LANG||document.documentElement.lang||navigator.language||'en';
  if(/^pt/i.test(l))l='pt-BR';else l=l.split('-')[0];
  const s=strings[l]||strings.en;
  const newChat=document.querySelector('.jonas-top-new'),history=document.querySelector('.jonas-top-history');
  if(newChat){newChat.setAttribute('aria-label',s[0]);newChat.querySelector('[data-jonas-head="new"]')?.replaceChildren(document.createTextNode(s[0]));}
  if(history){history.setAttribute('aria-label',s[1]);history.querySelector('[data-jonas-head="history"]')?.replaceChildren(document.createTextNode(s[1]));}
 }
 document.addEventListener('DOMContentLoaded',localizeHead);
 document.addEventListener('matchapp:langchange',localizeHead);
 window.addEventListener('matchapp:languagechange',localizeHead);
 window.MatchAppJonasNarration=Object.freeze({prepare,advance,finish});
})();