/* Optional synopsis localization must never block a verified match reveal. */
(function(){'use strict';const cache=new Map();
 const fallback=()=>window.t?window.t('global.guide')+' · '+window.t('res.findwhere'):'';
 const names={en:'English','pt-BR':'Brazilian Portuguese',es:'Spanish',fr:'French',de:'German',it:'Italian',tr:'Turkish',ru:'Russian',ar:'Arabic',hi:'Hindi',id:'Indonesian',ja:'Japanese',ko:'Korean',zh:'Simplified Chinese'};
 window.localizeMatchSynopsis=async function(text,sourceLang='en'){
  const lang=window.MATCH_LANG||'en';if(!text)return '';if(sourceLang===lang)return text;
  const key=lang+'\n'+text;if(cache.has(key))return cache.get(key);
  let timer;
  try{
   if(!window.supabaseClient?.functions)return fallback();
   const request=window.supabaseClient.functions.invoke('gemini-proxy',{body:{prompt:'Translate the following synopsis into '+(names[lang]||'English')+'. Keep its facts. Return only the translated synopsis, no commentary.\n\n'+text}});
   const response=await Promise.race([request,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),15000);})]);
   const translated=response?.data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
   if(lang!==window.MATCH_LANG)return fallback();
   if(!response?.error&&translated&&translated!==text){cache.set(key,translated);return translated;}
  }catch(_){/* The authentic source text remains visible. */}
  finally{if(timer!==undefined)clearTimeout(timer);}
  return fallback();
 };
})();
