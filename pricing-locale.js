/* Presentation-only labels for the dynamic purchase hub. */
(function(){
 'use strict';
 const labels={
  en:['In-App Purchases','Your included daily AI-action allowance is used first. After that, Matches and Ask AI use separate top-up balances.','Purchase type','★ Extra Matches','✦ Ask AI Credits','Buy More Matches','For Matches only. Extra Matches do not expire and never consume Ask AI credits.','Extra Matches','Buy Matches','Buy Ask AI Credits','1 credit = 1 Ask AI prompt. Credits are for Ask AI only and never buy Matches.','Ask AI Credits','Buy Credits','Most popular','Best value'],
  'pt-BR':['Compras no app','Sua cota diária de ações de IA é usada primeiro. Depois, Matches e Pergunte à IA usam saldos extras separados.','Tipo de compra','★ Matches extras','✦ Créditos de IA','Comprar mais Matches','Somente para recomendações. Matches extras não expiram e não usam créditos de IA.','Matches extras','Comprar Matches','Comprar créditos de IA','1 crédito = 1 pergunta à IA. Esses créditos são somente para perguntas à IA e não compram Matches.','Créditos de IA','Comprar créditos','Mais popular','Melhor custo-benefício']
 };
 function render(){
  const hub=document.getElementById('purchase-hub');if(!hub)return;
  const lang=window.MATCH_LANG||document.documentElement.lang||'en';
  // Preserve existing language fallbacks outside the two observed UI locales.
  const text=labels[/^pt(?:-|$)/i.test(lang)?'pt-BR':lang];if(!text)return;
  const set=(selector,value)=>hub.querySelectorAll(selector).forEach(el=>{el.textContent=value});
  set('#purchase-hub-title',text[0]);set(':scope > p',text[1]);
  hub.querySelector('.purchase-tabs')?.setAttribute('aria-label',text[2]);
  set('#purchase-tab-matches',text[3]);set('#purchase-tab-credits',text[4]);
  set('#match-packs-section h3',text[5]);set('#match-packs-section > p',text[6]);
  set('#match-packs-section .purchase-pack small',text[7]);set('[data-match-pack]',text[8]);
  set('#ask-ai-credits h3',text[9]);set('#ask-ai-credits > p',text[10]);
  set('#ask-ai-credits .purchase-pack small',text[11]);set('[data-credit-pack]',text[12]);
  hub.querySelectorAll('.purchase-badge').forEach(el=>{
   const key=el.parentElement.querySelector('button')?.dataset;
   const product=key?.matchPack||key?.creditPack||'';
   el.textContent=/^(matches_25|credits_75)$/.test(product)?text[13]:text[14];
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
 document.addEventListener('matchapp:langchange',render);
}());
