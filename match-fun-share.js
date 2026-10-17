/* Adults result-sharing invitation; the original button keeps its share flow. */
(function(){
  'use strict';
  const button=document.getElementById('btn-share-match');
  if(!button)return;
  const card=button.closest('.match-fun-share');
  const heading=document.querySelector('.match-fun-share__copy strong');
  const hint=document.querySelector('.match-fun-share__copy span');
  const originalButtonLabel=button.textContent;
  let ownedButtonLabel='';
  const copy={
    en:['Love this pick? Show your friends.','Share this recommendation with friends.','📢 Share this Match'],
    'pt-BR':['Gostou da indicação? Mostre aos amigos.','Compartilhe esta indicação com amigos.','📢 Compartilhar este Match'],
    es:['¿Te gustó esta elección? Muéstrala a tus amigos.','Comparte esta recomendación con tus amigos.','📢 Compartir este Match'],
    fr:['Cette sélection vous plaît ? Montrez-la à vos amis.','Partagez cette recommandation avec vos amis.','📢 Partager ce Match'],
    de:['Gefällt dir dieser Tipp? Zeig ihn deinen Freunden.','Teile diese Empfehlung mit deinen Freunden.','📢 Diesen Match teilen'],
    it:['Ti piace questa scelta? Mostrala agli amici.','Condividi questo consiglio con gli amici.','📢 Condividi questo Match'],
    tr:['Bu öneriyi beğendin mi? Arkadaşlarına göster.','Bu öneriyi arkadaşlarınla paylaş.','📢 Bu Match’i paylaş'],
    ru:['Понравилась рекомендация? Покажите друзьям.','Поделитесь этой рекомендацией с друзьями.','📢 Поделиться этим Match'],
    ar:['أعجبك هذا الاختيار؟ أطلِع أصدقاءك عليه.','شارك هذه التوصية مع أصدقائك.','📢 شارك هذا الاختيار'],
    hi:['यह सुझाव पसंद आया? दोस्तों को दिखाएँ।','यह सुझाव अपने दोस्तों के साथ साझा करें।','📢 यह सुझाव साझा करें'],
    id:['Suka pilihan ini? Tunjukkan kepada teman.','Bagikan rekomendasi ini kepada teman.','📢 Bagikan Match ini'],
    ja:['このおすすめが気に入りましたか？友達にも紹介しましょう。','このおすすめを友達と共有しましょう。','📢 このおすすめを共有'],
    ko:['이 추천이 마음에 드나요? 친구에게도 알려 주세요.','이 추천을 친구들과 공유하세요.','📢 이 추천 공유하기'],
    zh:['喜欢这个推荐吗？介绍给朋友吧。','与朋友分享这个推荐。','📢 分享这个推荐']
  };
  function locale(){
    let saved='';try{saved=localStorage.getItem('match_lang')||'';}catch(_){}
    for(const value of [window.MATCH_LANG,saved,document.documentElement.lang]){
      const lang=String(value||'').toLowerCase();
      const key=lang.startsWith('pt')?'pt-BR':lang.split('-')[0];
      if(copy[key])return key;
    }
    return 'en';
  }
  function localize(){
    const row=copy[locale()];
    if(heading&&heading.textContent!==row[0])heading.textContent=row[0];
    if(hint&&hint.textContent!==row[1])hint.textContent=row[1];
    if(card)card.setAttribute('aria-label',row[2].replace(/^📢\s*/,''));
    const restricted=window.currentMatchShareRestricted===true||button.classList.contains('share-restricted');
    if(window.MatchAppTokens?.retireLegacyPromotions===true&&!restricted){
      ownedButtonLabel=row[2];
      if(button.textContent!==ownedButtonLabel)button.textContent=ownedButtonLabel;
    }else if(window.MatchAppTokens?.retireLegacyPromotions!==true&&ownedButtonLabel){
      if(!restricted&&button.textContent===ownedButtonLabel){
        const translated=window.t?.('res.shareCta');
        button.textContent=translated&&translated!=='res.shareCta'?translated:originalButtonLabel;
      }
      ownedButtonLabel='';
    }
  }
  localize();
  document.addEventListener('matchapp:langchange',localize);
  document.addEventListener('matchapp:tokenpolicy',localize);
  document.addEventListener('matchapp:newmatch',localize);
  // The existing result/translation renderer may rewrite this same button later.
  // Observe only its presentation; never replace its share or safety handlers.
  new MutationObserver(localize).observe(button,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
})();
