/* Optional synopsis localization must never block a verified match reveal. */
(function(){'use strict';const cache=new Map();
 const names={en:'English','pt-BR':'Brazilian Portuguese',es:'Spanish',fr:'French',de:'German',it:'Italian',tr:'Turkish',ru:'Russian',ar:'Arabic',hi:'Hindi',id:'Indonesian',ja:'Japanese',ko:'Korean',zh:'Simplified Chinese'};
 window.localizeMatchSynopsis=async function(text,sourceLang='en'){
  const lang=window.MATCH_LANG||'en';if(!text)return '';if(sourceLang===lang)return text;
  const key=lang+'\n'+text;if(cache.has(key))return cache.get(key);
  let timer;
  try{
   if(!window.supabaseClient?.functions)return text;
   const request=window.supabaseClient.functions.invoke('gemini-proxy',{body:{adultMatch:true,prompt:'Translate the following synopsis into '+(names[lang]||'English')+'. Keep its facts. Return only the translated synopsis, no commentary.\n\n'+text}});
   const response=await Promise.race([request,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),15000);})]);
   const translated=response?.data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
   if(lang!==window.MATCH_LANG)return text;
   // A malformed proxy envelope is not a translated synopsis.
   if(!response?.error&&translated&&!/^[{\[]/.test(translated)&&!/^"(?:answer|synopsis|translation)"\s*:/.test(translated)){
    const value=translated.replace(/^["']|["']$/g,'');
    cache.set(key,value);return value;
   }
  }catch(_){/* The authentic source text remains visible. */}
  finally{if(timer!==undefined)clearTimeout(timer);}
  return text;
 };
})();
