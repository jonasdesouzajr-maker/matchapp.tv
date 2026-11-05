/* Authored language editions retain distinct crawlable URLs. No content refresh. */
(function () {
  'use strict';
  const host=document.querySelector('.us-trends-page');
  if(!host) return;
  const links=Array.from(document.querySelectorAll('.channel-language-list a[hreflang]'));
  const articleLanguage=normalized(host.getAttribute('data-us-trends-language')||document.documentElement.lang);
  function normalized(value) {
    const language=String(value||'').replace(/_/g,'-').toLowerCase();
    if(/^zh-(?:hant|tw|hk|mo)(?:-|$)/.test(language)) return 'zh-TW';
    const base=language.split('-')[0];
    return base==='pt'?'pt-BR':base;
  }
  function onLanguage(event) {
    const choice=normalized(event.detail?.lang||event.detail?.language||window.MATCH_LANG||'');
    if(!choice||choice===articleLanguage) return;
    const link=links.find(link=>link.hreflang===choice);
    if(link) location.assign(link.href+location.hash);
  }
  for(const name of ['matchapp:langchange','matchapp:languagechange','matchapp:language-changed']) document.addEventListener(name,onLanguage);
})();
