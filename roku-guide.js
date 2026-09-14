(function(){'use strict';let generation=0;
 const region={en:'The Roku Channel is available on web and mobile in the US, Canada and UK, and on Roku devices in Mexico. Catalogs vary by region. A Roku device in Brazil does not guarantee access to The Roku Channel.','pt-BR':'The Roku Channel está disponível na web e no celular nos EUA, Canadá e Reino Unido; no México, em dispositivos Roku. Os catálogos variam. Ter um aparelho Roku no Brasil não garante acesso ao The Roku Channel.',es:'The Roku Channel está disponible en web y móvil en EE. UU., Canadá y Reino Unido; en México, en dispositivos Roku. Los catálogos varían. Tener un Roku en Brasil no garantiza acceso al canal.'};
 async function paint(){const current=++generation,lang=window.MATCH_LANG||'en';
  const label=document.querySelector('[data-roku-region]');if(label)label.textContent=region[lang]||'The Roku Channel · US / CA / GB: '+t('global.guide')+' · MX: Roku TV · BR: '+t('res.findwhere');
  for(const card of document.querySelectorAll('[data-catalog-title]')){
   const title=card.dataset.catalogTitle,synopsis=card.querySelector('[data-roku-synopsis]');if(lang==='pt-BR')synopsis.textContent=synopsis.dataset.pt;else if(lang!=='en')synopsis.textContent=title+' · '+card.dataset.year+' · '+t('global.guide');
   window.localizedTitle(title,{year:card.dataset.year}).then(name=>{if(current===generation&&card.isConnected)card.querySelector('[data-roku-caption]').textContent=name;});
  }
 }
 document.querySelectorAll('img[data-fallback]').forEach(img=>img.onerror=()=>{img.onerror=null;img.src=img.dataset.fallback;});
 document.addEventListener('matchapp:langchange',paint);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();
})();
