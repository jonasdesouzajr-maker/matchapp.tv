/* A retailer only receives a search after the visitor follows its link. */
(function () {
  'use strict';
  const panel=document.querySelector('[data-retailer-search]');
  if(!panel) return;
  const api=window.MatchAppEbookAffiliate;
  const input=panel.querySelector('[data-shop-query]');
  const store=panel.querySelector('select');
  const amazon=panel.querySelector('[data-shop-amazon]'), mercado=panel.querySelector('[data-shop-mercado]');
  const notice=panel.querySelector('[data-shop-disclosure]'), paid=panel.querySelector('[data-shop-paid]');
  const presets=[...panel.querySelectorAll('[data-shop-preset]')];
  function setLink(link,href) {
    if(href){link.href=href;link.removeAttribute('aria-disabled');}
    else {link.removeAttribute('href');link.setAttribute('aria-disabled','true');}
  }
  function update(){
    const term=input.value.trim();
    const preset=presets.find(b=>b.textContent===term);
    const href=api?.amazonRetailSearchUrl(term,store.value,preset?.dataset.shopPreset);
    setLink(amazon,href);
    const words=term.normalize('NFKC').match(/[\p{L}\p{M}\p{N}]+/gu);
    setLink(mercado,words?'https://lista.mercadolivre.com.br/'+encodeURIComponent(words.join('-')):'');
    const tagged=href && api.isAffiliateLink(href);
    notice.hidden=paid.hidden=!tagged;
    amazon.rel=tagged?'sponsored noopener':'noopener';
  }
  for(const button of presets) button.addEventListener('click',()=>{input.value=button.textContent;update();});
  const country=window.MatchAppCountry?.regionCode?.();
  if(country&&Array.from(store.options).some(o=>o.value===country))store.value=country;
  try {
    const draft=sessionStorage.getItem('matchapp_shop_query');sessionStorage.removeItem('matchapp_shop_query');
    if(location.hash==='#shop' && draft) input.value=draft.slice(0,120);
  } catch {}
  store.addEventListener('change',update);
  input.addEventListener('input',update);
  update();
})();
