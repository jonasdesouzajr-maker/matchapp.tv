/* Async descriptions cannot overwrite the user's chosen language. */
(function(){'use strict';const cache=new Map();
 const names={en:'English','pt-BR':'Brazilian Portuguese',es:'Spanish',fr:'French',de:'German',it:'Italian',tr:'Turkish',ru:'Russian',ar:'Arabic',hi:'Hindi',id:'Indonesian',ja:'Japanese',ko:'Korean',zh:'Simplified Chinese'};
 const fallback=()=>window.t?window.t('global.guide')+' · '+window.t('res.findwhere'):'';
 window.localizeMatchSynopsis=async function(text,sourceLang='en'){
  const lang=window.MATCH_LANG||'en';if(!text)return fallback();if(sourceLang===lang)return text;
  const key=lang+'\n'+text;if(cache.has(key))return cache.get(key);
  try{
   const {data,error}=await window.supabaseClient.functions.invoke('gemini-proxy',{body:{prompt:'Translate the following synopsis into '+names[lang]+'. Keep its facts. Return only the translated synopsis, no commentary.\n\n'+text}});
   const translated=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
   if(lang!==window.MATCH_LANG)return fallback();
   if(!error&&translated&&!(sourceLang!==lang&&translated===text)){cache.set(key,translated);return translated;}
  }catch(_){}
  return fallback();
 };
})();
