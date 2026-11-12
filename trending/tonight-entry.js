/* Localize only the new browser discovery links; never alter native navigation. */
(function () {
  'use strict';
  const entries=Array.from(document.querySelectorAll('[data-tonight-entry]'));
  const sections=Array.from(document.querySelectorAll('[data-tonight-web-only]'));
  if(!entries.length&&!sections.length) return;
  const native=()=>/MatchAppTVAndroid|MatchAppAiAndroid|MatchAppAiKidsAndroid/i.test(navigator.userAgent||'')||Boolean(window.MatchAppNativeAuth||window.MatchAppNativeExperience||window.MatchAppNativePageState)||document.documentElement.classList.contains('matchapp-android')||new URLSearchParams(location.search).get('utm_source')==='android_app';
  function language() {
    let saved='';try{saved=localStorage.getItem('match_lang')||'';}catch(_){}
    const value=String(saved||window.MATCH_LANG||document.documentElement.lang||'en').replace(/_/g,'-').toLowerCase();
    if(/^zh-(?:hant|tw|hk|mo)(?:-|$)/.test(value)) return 'zh-TW';
    const base=value.split('-')[0];return base==='pt'?'pt-BR':base;
  }
  function paint() {
    if(native()||location.pathname.startsWith('/kids/')) {entries.concat(sections).forEach(entry=>entry.remove());return;}
    sections.forEach(section=>{section.hidden=false;section.style.removeProperty('display');});
    const lang=language(),copy=window.MatchAppTonight?.[lang];
    for(const entry of entries) {
      if(!copy){entry.hidden=true;entry.style.setProperty('display','none','important');continue;}
      entry.lang=lang;entry.dir=lang==='ar'?'rtl':'ltr';entry.href=copy.href+(entry.dataset.tonightSection?'#'+entry.dataset.tonightSection:'');
      (entry.querySelector('[data-tonight-label]')||entry).textContent=copy.label;
      entry.title=copy.intro;entry.hidden=false;entry.style.removeProperty('display');
    }
  }
  paint();
  for(const name of ['matchapp:langchange','matchapp:languagechange','matchapp:language-changed']){document.addEventListener(name,paint);window.addEventListener(name,paint);}
  window.addEventListener('storage',event=>{if(event.key==='match_lang')paint();});
  window.addEventListener('pageshow',paint);
})();
