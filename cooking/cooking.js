(function(){'use strict';
 const C=window.MatchCooking,L=window.MatchCookingI18n,form=document.getElementById('cooking-form'),results=document.getElementById('cooking-results');if(!C||!L||!form||!results||window.MatchCookingDirectory)return;
 const channelCopy={maangchi:'channelMaangchi',jamie:'channelJamie',panelinha:'channelPanelinha',foodwishes:'channelFoodwishes'};
 const recipeCopy={bibimbap:'recipeBibimbap','scrambled-eggs':'recipeEggs','rita-omelet':'recipeRitaOmelet','tomato-soup':'recipeSoup',omelete:'recipeOmelete'};
 const specialties={maangchi:'specialtyMaangchi',jamie:'specialtyJamie',panelinha:'specialtyPanelinha',foodwishes:'specialtyFoodwishes'};
 let cards=[],lastResult=null,renderedKind='recipes';
 function text(node,value){if(node&&node.textContent!==value)node.textContent=value;}
 function link(url){const a=document.createElement('a');a.href=url;a.className='gold-btn';return a;}
 function localize(){
  if(!lastResult)return;
  text(document.getElementById('cooking-status'),L.t(lastResult.fallback?'statusFallback':renderedKind==='channels'?'statusChannels':'statusRecipes',{count:lastResult.items.length}));
  cards.forEach(record=>{const {item,channel}=record;
   text(record.description,L.t(item.channelId?recipeCopy[item.id]:channelCopy[item.id]));
   text(record.credit,channel.name+' · '+L.t(channel.language==='English'?'languageEnglish':'languagePortuguese'));
   text(record.source,L.t('source'));
   if(record.play?.isConnected)text(record.play,L.t('play'));
   if(record.official)text(record.official,L.t('officialChannel'));
   text(record.ask,L.t('askAbout'));
   record.ask.href='/discover.html?q='+encodeURIComponent(L.t('prompt',{creator:channel.name,subject:item.title||L.t(specialties[channel.id]),url:item.url}));
   if(record.image)record.image.alt=L.t('artAlt',{title:item.title||item.name,creator:channel.name});
  });
 }
 function render(){
  const q=document.getElementById('cooking-query').value.slice(0,300),kind=document.getElementById('cooking-kind').value,found=C.find(q,kind);
  lastResult=found;renderedKind=kind;cards=[];results.replaceChildren();
  found.items.forEach(item=>{const channel=item.channelId?C.channels.find(c=>c.id===item.channelId):item;const card=document.createElement('article');card.className='cooking-card';
   const record={item,channel,card};
   if(item.video||item.image){const img=document.createElement('img');img.src=item.image||'https://i.ytimg.com/vi/'+item.video+'/hqdefault.jpg';img.width=480;img.height=360;img.loading='lazy';img.decoding='async';img.onerror=()=>{img.hidden=true;};card.append(img);record.image=img;}
   const h=document.createElement('h3');h.textContent=item.title||item.name;h.translate=false;const p=document.createElement('p');const credit=document.createElement('p');credit.className='cooking-note';card.append(h,p,credit);record.description=p;record.credit=credit;
   const actions=document.createElement('div');actions.className='cooking-actions';record.source=link(item.url);actions.append(record.source);
   if(item.video){const b=document.createElement('button');b.className='gold-btn';b.type='button';b.addEventListener('click',()=>{const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+item.video;frame.title=item.title+' — '+channel.name;frame.allow='encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';const wrap=document.createElement('div');wrap.className='cooking-video';wrap.append(frame);actions.before(wrap);b.remove();});actions.append(b);record.play=b;}
   else if(item.channel){record.official=link(item.channel);actions.append(record.official);}
   record.ask=link('/discover.html');actions.append(record.ask);card.append(actions);results.append(card);cards.push(record);
  });
  localize();
 }
 window.MatchCookingDirectory=Object.freeze({localize:localize});
 form.addEventListener('submit',e=>{e.preventDefault();render();});
 document.addEventListener('matchapp:cookinglanguagechange',localize);
 document.getElementById('cooking-query').value=new URLSearchParams(location.search).get('q')||'';render();
})();
