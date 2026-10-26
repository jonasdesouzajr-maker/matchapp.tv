/* Scoped adult navigation and dismiss controls. No account, Kids or billing state changes. */
(function(){
 'use strict';
 const labels={
  en:['Back','Home','Back to choices','Go to Home'], 'pt-BR':['Voltar','Início','Voltar às escolhas','Ir ao início'],
  es:['Volver','Inicio','Volver a las opciones','Ir al inicio'],fr:['Retour','Accueil','Retour aux choix','Aller à l’accueil'],
  de:['Zurück','Startseite','Zurück zur Auswahl','Zur Startseite'],it:['Indietro','Home','Torna alle scelte','Vai alla home'],
  tr:['Geri','Ana sayfa','Seçimlere dön','Ana sayfaya git'],ru:['Назад','Главная','К выбору','На главную'],
  ar:['رجوع','الرئيسية','العودة للاختيارات','الذهاب للرئيسية'],hi:['वापस','होम','विकल्पों पर वापस','होम पर जाएं'],
  id:['Kembali','Beranda','Kembali ke pilihan','Ke beranda'],ja:['戻る','ホーム','選択に戻る','ホームへ'],
  ko:['뒤로','홈','선택으로 돌아가기','홈으로'],zh:['返回','首页','返回选择','前往首页']
 };
 function locale(){
  let raw='';try{raw=localStorage.getItem('match_lang')||'';}catch(_){}
  raw=String(raw||window.MATCH_LANG||document.documentElement.lang||'en').replace('_','-').toLowerCase();
  if(raw.startsWith('pt'))return 'pt-BR';
  return Object.keys(labels).find(key=>key.toLowerCase()===raw)||raw.split('-')[0];
 }
 function sync(){
  const [back,home,choices,goHome]=labels[locale()]||labels.en;
  for(const el of document.querySelectorAll('[data-ma-nav-back],#ma-match-back')){
   el.textContent=back;el.setAttribute('aria-label',el.id==='ma-match-back'?choices:back);
  }
  for(const el of document.querySelectorAll('[data-ma-nav-home],#ma-match-home')){
   el.textContent=home;el.setAttribute('aria-label',goHome);
  }
 }
 window.matchappSafeBack=function(){
  try{
   const source=new URL(document.referrer);
   if(source.origin===location.origin&&window.history.length>1){window.history.back();return;}
  }catch(_){}
  location.assign('/');
 };
 function closeOpenLayer(event){
  if(event.key!=='Escape'||event.defaultPrevented)return;
  const zoom=document.getElementById('poster-zoom-overlay');
  if(zoom&&getComputedStyle(zoom).display!=='none'&&window.closePosterZoom){window.closePosterZoom();event.preventDefault();return;}
  const chat=document.getElementById('ma-jonas-home-panel');
  if(chat&&!chat.hidden&&getComputedStyle(chat).display!=='none'){
   document.getElementById('ma-jonas-home-close')?.click();event.preventDefault();return;
  }
  const result=document.getElementById('result-box');
  if(result&&!result.hidden&&result.style.display!=='none'&&window.dismissMatchResult){
   window.dismissMatchResult();event.preventDefault();
  }
 }
 document.addEventListener('keydown',closeOpenLayer);
 document.addEventListener('matchapp:langchange',sync);
 document.addEventListener('DOMContentLoaded',sync,{once:true});
 if(document.readyState!=='loading')sync();
})();