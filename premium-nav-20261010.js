/* Appearance-only localization for functional premium shortcuts.
 * Does not interfere with the site's locale, navigation or account systems. */
(function(){
'use strict';
const labels={
'en':['Home','Talk to Jonas','Trending','Together','Profile','Kids'],
'pt':['Início','Falar com Jonas','Em alta','Juntos','Perfil','Crianças'],
'es':['Inicio','Hablar con Jonas','Tendencias','Juntos','Perfil','Niños'],
'fr':['Accueil','Parler à Jonas','Tendances','À deux','Profil','Enfants'],
'de':['Start','Mit Jonas reden','Trends','Gemeinsam','Profil','Kinder'],
'it':['Home','Parla con Jonas','Tendenze','Insieme','Profilo','Bambini'],
'tr':['Ana sayfa','Jonas ile konuş','Trendler','Birlikte','Profil','Çocuklar'],
'ru':['Главная','Чат с Йонасом','Тренды','Вместе','Профиль','Дети'],
'ar':['الرئيسية','تحدث مع جوناس','الرائج','معًا','الملف','الأطفال'],
'hi':['होम','जोनास से बात करें','ट्रेंडिंग','साथ में','प्रोफ़ाइल','बच्चे'],
'id':['Beranda','Bicara ke Jonas','Tren','Bersama','Profil','Anak-anak'],
'ja':['ホーム','Jonasと話す','人気作品','一緒に','プロフィール','キッズ'],
'ko':['홈','Jonas와 대화','인기 콘텐츠','함께','프로필','키즈'],
'zh':['首页','与 Jonas 聊天','热门趋势','一起观看','个人资料','儿童']
};
function chosen(){
 const v=String(window.MATCH_LANG||document.querySelector('#lang-switcher-host select')?.value
 ||document.documentElement.lang||'en').toLowerCase();
 return v.startsWith('pt')?'pt':v.split('-')[0];
}
function paint(){
 const nav=document.querySelector('#mh-topbox .ma-luxe-shortcuts');
 if(!nav)return;
 const dict=labels[chosen()]||labels.en;
 nav.querySelectorAll('[data-ma-nav]').forEach((link)=>{
  const idx=Number(link.dataset.maNav);
  const name=dict[idx]||labels.en[idx];
  const caption=link.querySelector('.ma-luxe-text');
  if(caption)caption.textContent=name;
  link.setAttribute('aria-label',name);
  link.setAttribute('title',name);
 });
}
function init(){
 paint();
 window.addEventListener('matchapp:languagechange',paint);
 window.addEventListener('languagechange',paint);
 document.addEventListener('change',e=>{
  if(e.target?.closest?.('#lang-switcher-host'))queueMicrotask(paint);
 });
 new MutationObserver(()=>queueMicrotask(paint)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();