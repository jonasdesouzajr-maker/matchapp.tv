(function(){
 'use strict';
 const avatars={fox:['#ffbd74','🦊'],bear:['#d9a972','🐻'],cat:['#c4a5ff','🐱'],frog:['#92dda0','🐸'],panda:['#d6e7ed','🐼'],rabbit:['#ffc3df','🐰'],owl:['#d6b089','🦉'],rocket:['#8ce3f5','🚀'],planet:['#b7acff','🪐'],star:['#ffda73','⭐'],whale:['#99caff','🐳'],robot:['#a9e2dd','🤖']};
 let state=null,timer=null,matchTimer=null,inviteFriend=null,currentCode=null,busy=false;
 const $=id=>document.getElementById(id);
 const isPt=()=>String(window.MATCH_LANG||navigator.language).startsWith('pt');
 const tr=(en,pt)=>isPt()?pt:en;
 function note(text){$('friends-status').textContent=text;}
 async function rpc(action,payload={}){
  const sb=window.supabaseClient;if(!sb)throw Error('Connection unavailable');
  const {data,error}=await sb.rpc('friends_action',{p_action:action,p_payload:payload});
  if(error)throw Error(tr('Friends are temporarily unavailable. Please try again.','Amigos indisponíveis no momento. Tente novamente.'));
  return data;
 }
 function button(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>run(action));return b;}
 async function run(action){if(busy)return;busy=true;try{await action();}catch(e){note(e.message);}finally{busy=false;}}
 function avatarElement(key){
  const [color]=avatars[key]||avatars.fox;
  // Original vector avatars. No photographs or remote profile assets.
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('aria-hidden','true');svg.classList.add('friend-avatar');
  const group=document.createElementNS(svg.namespaceURI,'g');svg.append(group);
  function shape(tag,attrs){const e=document.createElementNS(svg.namespaceURI,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);group.append(e);}
  shape('circle',{cx:50,cy:50,r:48,fill:color});
  if(['rocket','planet','star','robot'].includes(key)){
   if(key==='star')shape('path',{d:'M50 16 60 37 84 41 66 58 70 82 50 70 30 82 34 58 16 41 40 37Z',fill:'#fff4ba',stroke:'#46336a','stroke-width':3});
   else if(key==='planet'){shape('circle',{cx:50,cy:50,r:23,fill:'#6650ac'});shape('ellipse',{cx:50,cy:50,rx:39,ry:12,fill:'none',stroke:'#fff3be','stroke-width':6,transform:'rotate(-25 50 50)'});}
   else if(key==='rocket'){shape('path',{d:'M50 15Q28 35 35 70L50 63 65 70Q72 35 50 15ZM35 59 22 75 35 72M65 59 78 75 65 72',fill:'#fff',stroke:'#4a3c7a','stroke-width':3});shape('circle',{cx:50,cy:41,r:9,fill:'#66bedb'});shape('path',{d:'M43 74 50 88 57 74',fill:'#ff795e'});}
   else {shape('rect',{x:24,y:29,width:52,height:46,rx:12,fill:'#fff3d7',stroke:'#4a3c7a','stroke-width':3});shape('path',{d:'M50 29V19M36 60H64',stroke:'#4a3c7a','stroke-width':4});shape('circle',{cx:50,cy:16,r:5,fill:'#ff827c'});[38,62].forEach(cx=>shape('circle',{cx,cy:46,r:5,fill:'#4a3c7a'}));}
  } else {
   if(key==='rabbit'){[36,64].forEach(cx=>shape('ellipse',{cx,cy:26,rx:9,ry:20,fill:'#fff3e3'}));}
   else if(['fox','cat','owl'].includes(key))shape('path',{d:'M24 48 22 18 44 33M76 48 78 18 56 33',fill:'#fff3e3'});
   else [28,72].forEach(cx=>shape('circle',{cx,cy:34,r:14,fill:key==='panda'?'#463b60':'#fff3e3'}));
   shape('ellipse',{cx:50,cy:56,rx:31,ry:29,fill:'#fff3e3'});
   if(key==='panda'){[37,63].forEach(cx=>shape('ellipse',{cx,cy:51,rx:10,ry:12,fill:'#463b60'}));}
   [38,62].forEach(cx=>shape('circle',{cx,cy:51,r:4,fill:key==='panda'?'white':'#463b60'}));
   shape('path',{d:'M44 65Q50 72 56 65',stroke:'#463b60','stroke-width':3,fill:'none','stroke-linecap':'round'});shape('circle',{cx:50,cy:59,r:3,fill:'#ed8c85'});
   if(key==='whale')shape('path',{d:'M21 71 10 65 13 82 32 78',fill:'#477bb5'});
  }
  return svg;
 }
 function render(data){
  state=data;const settings=data.settings||{};
  if(document.activeElement!==$('friend-alias'))$('friend-alias').value=settings.alias||'';
  $('friend-sharing').checked=!!settings.sharing;$('friend-presence').checked=!!settings.presence;
  const link=settings.token?'https://matchapp.tv/friends.html?add='+encodeURIComponent(settings.token):'';
  $('friend-invite-link').value=link;$('friend-share-tools').hidden=!link;
  const caption=tr('Add me on MatchApp.tv and find something to watch together. ','Me adicione no MatchApp.tv para encontrar o que assistir juntos. ')+link;
  $('friend-wa').href='https://wa.me/?text='+encodeURIComponent(caption);
  $('friend-telegram').href='https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent(caption);
  const host=$('friends-list');host.replaceChildren();
  (data.friends||[]).forEach(f=>{
   const card=document.createElement('article');card.className='friend-card';card.append(avatarElement(f.avatar));
   const h=document.createElement('h3');h.textContent=f.alias;const status=document.createElement('p');status.className=f.online?'friend-online':'friend-offline';status.textContent=f.online?tr('● Online','● Online'):tr('● Offline','● Offline');
   const select=document.createElement('select');select.setAttribute('aria-label',tr('Illustrated avatar for ','Avatar ilustrado de ')+f.alias);
   Object.keys(avatars).forEach(k=>{const option=document.createElement('option');option.value=k;option.textContent=k;select.append(option);});select.value=f.avatar;select.addEventListener('change',()=>run(async()=>{await rpc('avatar',{friend:f.friend,avatar:select.value});await refresh();}));
   card.append(h,status,select,button(tr('Match Together','Match juntos'),async()=>{inviteFriend=f.friend;currentCode=null;$('friend-match-title').textContent=tr('Choose a match for ','Escolha um match com ')+f.alias;showMatchForm();}),button(tr('Remove friend','Remover amigo'),async()=>{await rpc('remove',{id:f.id});await refresh();}));host.append(card);
  });
  if(!host.children.length)host.textContent=tr('Share your private invite link to add your first friend.','Compartilhe seu convite privado para adicionar seu primeiro amigo.');
  const requests=$('friend-requests');requests.replaceChildren();
  (data.requests||[]).forEach(r=>{const p=document.createElement('article');p.className='friend-request';const name=document.createElement('span');name.textContent=r.alias+(r.incoming?tr(' wants to be your friend',' quer ser seu amigo'):tr(' · Waiting for approval',' · Aguardando aprovação'));p.append(name);if(r.incoming)p.append(button(tr('Accept','Aceitar'),async()=>{await rpc('accept',{id:r.id});await refresh();}));p.append(button(tr('Decline / cancel','Recusar / cancelar'),async()=>{await rpc('remove',{id:r.id});await refresh();}));requests.append(p);});
  const matches=$('friend-match-invites');matches.replaceChildren();
  (data.matches||[]).slice(-20).reverse().forEach(m=>{const p=document.createElement('article');p.className='friend-request';const text=document.createElement('span');text.textContent=m.alias+' · '+(m.matched?tr('Your shared match','Seu match juntos'):m.incoming?tr('Match Together invitation','Convite para um match juntos'):tr('Waiting for your friend','Aguardando seu amigo'));const a=document.createElement('a');a.href='/friends.html?match='+encodeURIComponent(m.code);a.textContent=tr('Open','Abrir');p.append(text,a,button(tr('Dismiss','Dispensar'),async()=>{await rpc('decline_match',{code:m.code});await refresh();}));matches.append(p);});
 }
 async function refresh(){if(!window.isUserLoggedIn)return;render(await rpc('list'));}
 function showMatchForm(){
  $('friend-match').hidden=false;$('friend-match-result').hidden=true;$('friend-match-form').hidden=false;
  for(const [field,prop]of Object.entries({cat:'cats',plat:'platform',mood:'moods',vibe:'vibes',rating:'ratings'})){
   const sel=$('friend-match-'+field);if(sel.options.length>1)continue;
   const values=new Set();if(typeof CONTENT_CATALOG!=='undefined')CONTENT_CATALOG.forEach(e=>(Array.isArray(e[prop])?e[prop]:[e[prop]]).forEach(v=>{if(v && v!=='any')values.add(v);}));
   [...values].sort().forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;sel.append(o);});
  }
  $('friend-match').scrollIntoView({behavior:'smooth',block:'start'});
 }
 function prefs(){const p={};['cat','plat','mood','vibe','rating'].forEach(k=>p[k]=[$('friend-match-'+k).value].filter(v=>v!=='any'));return p;}
 async function pollMatch(){
  if(!currentCode || document.hidden || !window.isUserLoggedIn)return;
  const data=await rpc('match',{code:currentCode});
  if(data.result){
   clearInterval(matchTimer);matchTimer=null;
   const r=data.result;$('friend-match-form').hidden=true;$('friend-match-result').hidden=false;
   $('friend-result-title').textContent=r.title;$('friend-result-synopsis').textContent=r.synopsis||'';
   const image=$('friend-result-poster'),fallback=()=>generateLocalPosterSVG(r.title,r);image.src=fallback();image.onerror=()=>{image.onerror=null;image.src=fallback();};
   getRealCoverImage(r.title,r).then(url=>{if(url)image.src=url;}).catch(()=>{});
   const link=$('friend-result-watch');link.href=r.watchUrl || platformSearchUrl(r.platform,r.title);link.textContent=tr('Find where to watch','Onde assistir');
   window.matchPolicy?.remember({title:r.title,posterUrl:fallback(),streamUrl:link.href},'matched');
   window.matchShareCard?.mount($('friend-result-share'),r.title,state?.settings?.token);
   note(tr('You both have the same match. Each of you can share your own card below.','Vocês têm o mesmo match. Cada um pode compartilhar seu próprio cartão abaixo.'));
  }else{note(data.ready?tr('No fresh title fits both sets of criteria. Adjust your choices together. No filters or history exclusions were relaxed.','Nenhum título novo atende às escolhas de ambos. Ajustem os critérios juntos.'):tr('Choose your criteria, then wait for your friend to choose theirs.','Escolha seus critérios e aguarde as escolhas do seu amigo.'));}
 }
 async function auth(){
  const signed=window.isUserLoggedIn===true;$('friends-signed-in').hidden=!signed;$('friends-sign-in').hidden=signed;
  clearInterval(timer);clearInterval(matchTimer);timer=null;matchTimer=null;
  if(!signed){state=null;$('friends-list').replaceChildren();return;}
  await window.matchPolicy?.ready();
  try {await refresh();$('friends-unavailable').hidden=true;}
  catch (_) {$('friends-signed-in').hidden=true;$('friends-unavailable').hidden=false;note(tr('Private friends are not available yet. Existing solo matches and Match Together remain available.','A lista privada de amigos ainda não está disponível. Matches individuais e Match Together continuam disponíveis.'));return;}
  timer=setInterval(()=>{if(!document.hidden)run(async()=>{if(state?.settings?.presence)await rpc('heartbeat');await refresh();});},30000);
  if(state?.settings?.presence)await rpc('heartbeat');
  const query=new URLSearchParams(location.search),token=query.get('add'),code=query.get('match');
  if(token && /^[a-f0-9]{32}$/.test(token)){$('friend-add-invite').hidden=false;$('friend-add-request').onclick=()=>run(async()=>{await rpc('request',{token});$('friend-add-invite').hidden=true;note(tr('Request sent. Your friend must approve before presence is shared.','Pedido enviado. Seu amigo precisa aceitar para compartilhar o status online.'));await refresh();});}
  if(code && /^[a-f0-9]{32}$/.test(code)){currentCode=code;showMatchForm();await pollMatch();matchTimer=setInterval(()=>run(pollMatch),5000);}
 }
 function init(){
  $('friend-save-settings').onclick=()=>run(async()=>{await rpc('settings',{alias:$('friend-alias').value,sharing:$('friend-sharing').checked,presence:$('friend-presence').checked});await refresh();note(tr('Privacy choices saved.','Preferências de privacidade salvas.'));});
  $('friend-rotate').onclick=()=>run(async()=>{await rpc('rotate');await refresh();note(tr('Previous invite link no longer accepts new requests.','O convite anterior não aceita mais novos pedidos.'));});
  $('friend-copy').onclick=()=>run(async()=>{await navigator.clipboard.writeText($('friend-invite-link').value);note(tr('Invite copied. Paste it in your friend’s DM.','Convite copiado. Cole na mensagem privada para seu amigo.'));});
  $('friend-native-share').onclick=()=>run(async()=>{const url=$('friend-invite-link').value;if(navigator.share)await navigator.share({title:'MatchApp.tv · Friends',text:tr('Add me and find a match together.','Me adicione para fazer um match juntos.'),url});else{await navigator.clipboard.writeText(url);note(tr('Invite copied.','Convite copiado.'));}});
  $('friend-match-form').onsubmit=e=>{e.preventDefault();run(async()=>{await window.matchPolicy?.flush();if(inviteFriend){const result=await rpc('invite_match',{friend:inviteFriend,prefs:prefs()});location.href='/friends.html?match='+result.code;}else{await rpc('choose',{code:currentCode,prefs:prefs()});await pollMatch();}});};
  document.addEventListener('matchapp:authchange',()=>run(auth));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && window.isUserLoggedIn)run(async()=>{if(state?.settings?.presence)await rpc('heartbeat');await refresh();await pollMatch();});});
  run(auth);
 }
 window.matchFriendAvatars=Object.freeze({keys:Object.keys(avatars),element:avatarElement});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
