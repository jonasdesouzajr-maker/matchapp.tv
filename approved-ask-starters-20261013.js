/* Presentation shortcuts populate the existing composer; only Send submits. */
(function () {
 'use strict';
 const host=document.querySelector('.approved-ask-starters');
 const input=document.getElementById('discover-new-input');
 if(!host||!input||!document.body.classList.contains('ai-chat-page'))return;
 const labels={
  en:['What to watch','Find a show','Live & upcoming','Sports insights'],
  pt:['O que assistir','Encontrar uma série','Ao vivo e em breve','Esportes'],
  es:['Qué ver','Buscar una serie','En vivo y próximos','Deportes'],
  fr:['Que regarder','Trouver une série','En direct et à venir','Sports'],
  de:['Was ansehen','Eine Serie finden','Live und demnächst','Sport'],
  it:['Cosa guardare','Trova una serie','Live e in arrivo','Sport'],
  tr:['Ne izlemeli','Dizi bul','Canlı ve yakında','Spor'],
  ru:['Что посмотреть','Найти сериал','Сейчас и скоро','Спорт'],
  ar:['ماذا أشاهد','ابحث عن مسلسل','مباشر وقريباً','الرياضة'],
  hi:['क्या देखें','सीरीज़ खोजें','लाइव और आगामी','खेल'],
  id:['Tonton apa','Cari serial','Langsung & mendatang','Olahraga'],
  ja:['何を観る？','ドラマを探す','ライブ・近日公開','スポーツ'],
  ko:['무엇을 볼까요','시리즈 찾기','라이브 및 예정','스포츠'],
  zh:['看什么','寻找剧集','直播与即将上线','体育']
 };
 function localize(){
  const lang=String(document.getElementById('lang-switcher')?.value||document.documentElement.lang||'en').split('-')[0];
  const texts=labels[lang]||labels.en;
  host.querySelectorAll('button').forEach((button,i)=>{button.querySelector('.approved-starter-label').textContent=texts[i];});
 }
 host.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button||!host.contains(button))return;
  input.value=button.querySelector('.approved-starter-label').textContent;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.focus();
 });
 document.getElementById('lang-switcher')?.addEventListener('change',localize);
 window.addEventListener('matchapp:langchange',localize);
 localize();
})();
