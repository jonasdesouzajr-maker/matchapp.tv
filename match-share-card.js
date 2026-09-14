/* Original on-device artwork; each participant chooses whether and where to share. */
(function(){
 'use strict';
 function canvasFor(title){
  const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'#33215a');g.addColorStop(0.65,'#121d41');g.addColorStop(1,'#443460');x.fillStyle=g;x.fillRect(0,0,1080,1350);
  x.fillStyle='#ffd77c';x.font='bold 42px system-ui';x.fillText('MATCHAPP.TV',78,108);x.font='24px system-ui';x.fillStyle='#d8def8';x.fillText('TWO FRIENDS. ONE GREAT PICK.',78,152);
  for(let n=0;n<55;n++){const a=(n*197)%1000+40,b=(n*367)%1000+190;x.beginPath();x.arc(a,b,n%4+1,0,Math.PI*2);x.fillStyle=n%2?'#fae6a7':'#a5dbf6';x.fill();}
  x.strokeStyle='#b4b6f3';x.lineWidth=8;[385,695].forEach((cx,n)=>{x.beginPath();x.arc(cx,410,150,0,Math.PI*2);x.fillStyle=n?'#ffbd89':'#9ee3e0';x.fill();x.stroke();x.fillStyle='#302155';x.beginPath();x.arc(cx-42,395,12,0,Math.PI*2);x.arc(cx+42,395,12,0,Math.PI*2);x.fill();x.beginPath();x.arc(cx,415,48,0.12,Math.PI-0.12);x.strokeStyle='#302155';x.lineWidth=7;x.stroke();});
  x.fillStyle='#fff5d7';x.font='bold 30px system-ui';x.textAlign='center';x.fillText('WE MATCHED TOGETHER',540,672);
  x.font='bold 64px system-ui';x.fillStyle='white';let line='',rows=[];for(const word of String(title).slice(0,220).split(/\s+/)){const next=line?line+' '+word:word;if(x.measureText(next).width>900 && line){rows.push(line);line=word;}else line=next;}if(line)rows.push(line);
  if(rows.length>4){x.font='bold 44px system-ui';rows=[];line='';for(const word of String(title).slice(0,220).split(/\s+/)){const next=line?line+' '+word:word;if(x.measureText(next).width>900&&line){rows.push(line);line=word;}else line=next;}rows.push(line);}
  rows.slice(0,5).forEach((row,i)=>x.fillText(row,540,770+i*80));
  x.fillStyle='#ffd77c';x.fillRect(78,1182,924,5);x.font='bold 36px system-ui';x.fillText('JOIN FREE · ADD YOUR FRIEND · FIND YOUR MATCH',540,1250);x.font='26px system-ui';x.fillStyle='#d8def8';x.fillText('matchapp.tv  #MatchApp  #MatchTogether',540,1305);return c;
 }
 function mount(host,title,token){
  host.replaceChildren();const card=canvasFor(title);card.style.cssText='width:100%;max-width:320px;height:auto;border-radius:20px';card.setAttribute('role','img');card.setAttribute('aria-label','MatchApp branded share card for '+title);host.append(card);
  const url=token?'https://matchapp.tv/friends.html?add='+token:'https://matchapp.tv/friends.html';
  const hashtag=String(title).normalize('NFKD').replace(/[^a-zA-Z0-9]/g,'').slice(0,40);
  const caption='We matched “'+title+'” together on MatchApp.tv! Register free at https://matchapp.tv and add me to your friends: '+url+' #MatchApp #MatchTogether'+(hashtag?' #'+hashtag:'');
  const p=document.createElement('p');p.textContent='Share your own card and invitation. Sharing is optional and never posts automatically.';host.append(p);
  function b(label,fn){const e=document.createElement('button');e.type='button';e.textContent=label;e.onclick=async()=>{try{await fn();}catch(_){p.textContent='Sharing was cancelled or unavailable. You can download the card and copy the caption.';}};host.append(e);}
  const blob=()=>new Promise(resolve=>card.toBlob(resolve,'image/png'));
  b('Share this match',async()=>{const file=new File([await blob()],'matchapp-match-together.png',{type:'image/png'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'Our MatchApp match',text:caption});else if(navigator.share)await navigator.share({title:'Our MatchApp match',text:caption,url});else{await navigator.clipboard.writeText(caption);p.textContent='Caption copied. Download the card and paste it in your social app.';}});
  b('Download share card',async()=>{const u=URL.createObjectURL(await blob());const a=document.createElement('a');a.href=u;a.download='matchapp-match-together.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);});
  b('Copy invitation + hashtags',async()=>{await navigator.clipboard.writeText(caption);p.textContent='Caption and friend invitation copied.';});
  for(const [label,href]of [['WhatsApp','https://wa.me/?text='+encodeURIComponent(caption)],['Telegram','https://t.me/share/url?url='+encodeURIComponent(url)+'&text='+encodeURIComponent(caption)],['Instagram DM','https://www.instagram.com/direct/inbox/'],['Messenger','https://www.messenger.com/']]){const a=document.createElement('a');a.textContent=label;a.href=href;a.target='_blank';a.rel='noopener noreferrer';host.append(a);}
 }
 window.matchShareCard=Object.freeze({canvasFor,mount});
})();
