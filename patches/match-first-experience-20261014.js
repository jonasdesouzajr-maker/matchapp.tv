/* Discovery-first brand language. Only copy changes, never match scores or algorithm. */
(function(){'use strict';
var copy={"en":["Find Your Next Experience","Your entertainment, matched.","Discover with Jonas","Find Your Next Match","YOUR MATCH UNIVERSE"],"pt-BR":["Encontre Sua Próxima Experiência","Seu entretenimento, do seu jeito.","Descubra com Jonas","Encontre Seu Próximo Match","SEU UNIVERSO DE MATCHES"],"es":["Encuentra Tu Próxima Experiencia","Tu entretenimiento, a tu medida.","Descubre con Jonas","Encuentra Tu Próximo Match","TU UNIVERSO DE MATCHES"],"fr":["Trouvez Votre Prochaine Expérience","Vos divertissements, sur mesure.","Découvrez avec Jonas","Trouvez Votre Prochain Match","VOTRE UNIVERS DE DÉCOUVERTES"],"de":["Entdecke Dein Nächstes Erlebnis","Unterhaltung, die zu dir passt.","Entdecke mit Jonas","Finde Dein Nächstes Match","DEINE MATCH-WELT"],"it":["Trova La Tua Prossima Esperienza","L'intrattenimento su misura per te.","Scopri con Jonas","Trova Il Tuo Prossimo Match","IL TUO UNIVERSO DI MATCH"],"tr":["Sıradaki Deneyimini Keşfet","Sana uygun eğlence, tam isabet.","Jonas ile Keşfet","Yeni Eşleşmeni Keşfet","EŞLEŞME EVRENİN"],"ru":["Найдите Новое Впечатление","Развлечения, подобранные для вас.","Открывайте с Йонасом","Найдите Свой Следующий Матч","ВАША ВСЕЛЕННАЯ ОТКРЫТИЙ"],"ar":["اكتشف تجربتك القادمة","ترفيه يناسب ذوقك.","اكتشف مع جوناس","اكتشف اختيارك القادم","عالم اختياراتك"],"hi":["अपना अगला अनुभव खोजें","मनोरंजन, आपकी पसंद के अनुरूप।","जोनास के साथ खोजें","अपना अगला मैच खोजें","आपकी मैच की दुनिया"],"id":["Temukan Pengalaman Berikutnya","Hiburan yang cocok untukmu.","Jelajahi bersama Jonas","Temukan Match Berikutnya","DUNIA MATCH-MU"],"ja":["次の体験を見つけよう","あなたにぴったりのエンタメ。","ジョナスと発見する","次のお気に入りを見つけよう","あなただけのマッチの世界"],"ko":["다음 경험을 찾아보세요","취향에 맞는 엔터테인먼트.","조나스와 발견하기","다음 매치를 찾아보세요","나만의 매치 세계"],"zh":["发现你的下一段精彩体验","为你量身匹配的娱乐。","与乔纳斯一起探索","发现你的下一个心动之选","你的专属匹配世界"]};
function currentLanguage(){
 var lang=String(window.MATCH_LANG||document.documentElement.lang||'en').trim();
 if(/^pt(?:-|$)/i.test(lang))return 'pt-BR';
 return copy[lang]?lang:(copy[lang.split('-')[0]]?lang.split('-')[0]:'en');
}
function paint(){
 var row=copy[currentLanguage()]||copy.en;
 [['data-match-experience-heading',0],['data-match-brand-story',1],['data-match-experience-nav',2],
  ['data-match-experience-dialog',3],['data-match-experience-eyebrow',4]].forEach(function(pair){
  document.querySelectorAll('['+pair[0]+']').forEach(function(node){node.textContent=row[pair[1]];});
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
document.addEventListener('matchapp:langchange',paint);
window.addEventListener('matchapp:languagechange',paint);
window.addEventListener('pageshow',paint);
})();
