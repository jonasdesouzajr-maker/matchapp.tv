/* MatchApp Ai | Frontend result-synopsis integrity.
 * Preserve the verified source text when an authorized localization request
 * fails or is pending. Never show "where to watch" as a fake synopsis.
 * Translation results still take precedence; matching/AI APIs are unchanged.
 */
(function(){
 'use strict';
 if(!document.body||!document.body.classList.contains('page-home'))return;
 var labels={
  en:'Original synopsis (not translated)',pt:'Sinopse original (sem tradução)',
  es:'Sinopsis original (sin traducir)',fr:'Synopsis original (non traduit)',
  de:'Originalinhaltsangabe (nicht übersetzt)',it:'Sinossi originale (non tradotta)',
  tr:'Özgün özet (çevrilmemiş)',ru:'Оригинальное описание (без перевода)',
  ar:'الملخص الأصلي (غير مترجم)',hi:'मूल सारांश (अनुवादित नहीं)',
  id:'Sinopsis asli (belum diterjemahkan)',ja:'原文のあらすじ（未翻訳）',
  ko:'원문 줄거리(번역되지 않음)',zh:'原文简介（未翻译）'
 };
 var synopsis=document.getElementById('res-synopsis'),task=null;
 if(!synopsis)return;
 function lang(){var code=String(window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase().split('-')[0];return labels[code]?code:'en'}
 function t(key){try{return String(window.t?.(key)||'').trim()}catch(_){return ''}}
 function placeholder(value){
  var text=String(value||'').trim(),guide=t('global.guide'),stream=t('res.findwhere');
  var unavailable='';try{unavailable=String(window.matchTranslationUnavailable?.()||'').trim()}catch(_){}
  return !text||!!(guide&&(text===guide||text===guide+' · '+stream||text.startsWith(guide+' · ')))||!!(unavailable&&text===unavailable);
 }
 function paint(){
  var source=window.currentSynopsisSource;
  if(!source||!source.title||!source.text||!synopsis.isConnected)return;
  if(window.globalMatchTitle&&window.globalMatchTitle!==source.title)return;
  var srcLang=String(source.lang||'en').toLowerCase().split('-')[0];
  if(srcLang===lang())return;
  if(!placeholder(synopsis.textContent))return;
  var genuine=String(source.text).trim();
  if(genuine.length<25)return;
  synopsis.textContent=labels[lang()]+' ['+srcLang+']: '+genuine;
  synopsis.dataset.sourceLanguage=srcLang;
  synopsis.dataset.untranslated='true';
 }
 function schedule(){if(task!==null)clearTimeout(task);task=setTimeout(function(){task=null;paint()},1350)}
 var observer=new MutationObserver(function(){
  if(placeholder(synopsis.textContent))schedule();
  else if(synopsis.dataset.untranslated==='true'&&!synopsis.textContent.startsWith(labels[lang()]))delete synopsis.dataset.untranslated;
 });
 observer.observe(synopsis,{characterData:true,childList:true,subtree:true});
 document.addEventListener('matchapp:langchange',schedule);
 if(placeholder(synopsis.textContent))schedule();
 window.MatchAppSynopsisPresentation={labels:labels,needsFallback:placeholder};
})();
