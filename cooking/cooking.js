(function(){'use strict';
 const C=window.MatchCooking,form=document.getElementById('cooking-form'),results=document.getElementById('cooking-results');if(!C||!form||!results)return;
 function link(text,url){const a=document.createElement('a');a.textContent=text;a.href=url;a.className='gold-btn';return a;}
 function render(){
  const q=document.getElementById('cooking-query').value.slice(0,300),kind=document.getElementById('cooking-kind').value,found=C.find(q,kind);
  document.getElementById('cooking-status').textContent=found.fallback?'No reviewed recipe matches those words yet. Explore these official cooking sources; these are alternatives, not exact recipe matches.':'Explore '+found.items.length+' reviewed '+(kind==='channels'?'cooking channels':'recipes')+'. Check each source for ingredients, dietary suitability and availability.';
  results.replaceChildren();
  found.items.forEach(item=>{const channel=item.channelId?C.channels.find(c=>c.id===item.channelId):item;const card=document.createElement('article');card.className='cooking-card';
   if(item.video||item.image){const img=document.createElement('img');img.src=item.image||'https://i.ytimg.com/vi/'+item.video+'/hqdefault.jpg';img.alt=(item.title||item.name)+' — original '+channel.name+' artwork';img.width=480;img.height=360;img.loading='lazy';img.decoding='async';img.onerror=()=>{img.hidden=true;};card.append(img);}
   const h=document.createElement('h3');h.textContent=item.title||item.name;const p=document.createElement('p');p.textContent=item.description;const credit=document.createElement('p');credit.className='cooking-note';credit.textContent=channel.name+' · '+channel.language;card.append(h,p,credit);
   const actions=document.createElement('div');actions.className='cooking-actions';actions.append(link('Original source',item.url));
   if(item.video){const b=document.createElement('button');b.className='gold-btn';b.type='button';b.textContent='Play original video';b.addEventListener('click',()=>{const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+item.video;frame.title=item.title+' — '+channel.name;frame.allow='encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';const wrap=document.createElement('div');wrap.className='cooking-video';wrap.append(frame);actions.before(wrap);b.remove();});actions.append(b);}
   else if(item.channel)actions.append(link('Official YouTube channel',item.channel));
   actions.append(link('Ask AI about this', '/discover.html?q='+encodeURIComponent('Help me with recipes from '+channel.name+'. '+(item.title||channel.specialty)+'. Original source: '+item.url+'. Explain the cooking technique and label any adaptations.')));card.append(actions);results.append(card);
  });
 }
 form.addEventListener('submit',e=>{e.preventDefault();render();});
 document.getElementById('cooking-query').value=new URLSearchParams(location.search).get('q')||'';render();
})();
