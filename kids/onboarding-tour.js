/* MatchApp Ai KIDS first-account tour — safe, short and grown-up aware. */
(function(){
'use strict';
const VERSION='v1',ELIGIBLE='matchapp_first_time_onboarding_v1',DONE='matchapp_onboarding_kids_v1';
let user=null,steps=[],i=0,card=null,spot=null,active=false,raf=0;
const copy={
 en:{steps:[
  ['Pick the adventure rules','Start with the age group, then choose a mood, show/movie/music and decade. Kids Mode only searches its reviewed, age-approved collection.'],
  ['Ask Luma by voice','Tap Luma and ask your question aloud. She can recommend only from the approved Kids collection; unknown titles stay out.'],
  ['Explore safely','Browse categories or search the Kids collection. Every result keeps the selected age band as a hard safety rule.'],
  ['Keep favorites in the treasure chest','Save something fun so it is easy to find again. Saving and sharing an open result do not spend another match.'],
  ['Grown-ups stay in control','Viewing links use a grown-up handoff, external sites are clearly identified, and the safety notes explain how Kids Mode makes choices.']
 ],next:'Next',back:'Back',finish:'Let’s explore!',skip:'Skip',label:'KIDS TOUR'},
 'pt-BR':{steps:[
  ['Escolha as regras da aventura','Comece pela idade e escolha humor, série/filme/música e década. O Kids Mode pesquisa apenas a coleção revisada e aprovada para a idade.'],
  ['Pergunte à Luma por voz','Toque na Luma e faça sua pergunta por voz. Ela só recomenda títulos da coleção Kids aprovada; títulos desconhecidos ficam de fora.'],
  ['Explore com segurança','Navegue pelas categorias ou pesquise a coleção Kids. A faixa etária escolhida continua sendo uma regra de segurança obrigatória.'],
  ['Guarde favoritos no baú','Salve algo divertido para encontrar de novo. Salvar e compartilhar um resultado aberto não gasta outro match.'],
  ['Adultos continuam no controle','Links para assistir passam por uma etapa para adultos, sites externos são indicados claramente e as notas explicam as regras de segurança.']
 ],next:'Próximo',back:'Voltar',finish:'Vamos explorar!',skip:'Pular',label:'TOUR KIDS'},
 es:{steps:[
  ['Elige las reglas de la aventura','Empieza por la edad y elige ánimo, serie/película/música y década. Kids Mode solo busca en su colección revisada y aprobada por edad.'],
  ['Pregunta a Luma por voz','Toca a Luma y pregunta en voz alta. Solo recomienda títulos de la colección Kids aprobada; los títulos desconocidos quedan fuera.'],
  ['Explora con seguridad','Navega por categorías o busca en la colección Kids. La franja de edad elegida sigue siendo una regla de seguridad obligatoria.'],
  ['Guarda favoritos en el tesoro','Guarda algo divertido para encontrarlo de nuevo. Guardar y compartir un resultado abierto no gasta otro match.'],
  ['Los adultos siguen al mando','Los enlaces para ver contenido pasan por una entrega para adultos, los sitios externos se identifican y las notas explican las reglas de seguridad.']
 ],next:'Siguiente',back:'Atrás',finish:'¡A explorar!',skip:'Saltar',label:'TOUR KIDS'}
};
Object.assign(copy,{
 "fr": {
  "steps": [
   [
    "Choisis les règles de l’aventure",
    "Choisis l’âge, une envie, le format et la décennie. Kids cherche uniquement dans sa collection examinée et approuvée pour cet âge."
   ],
   [
    "Parle à Luma",
    "Touche Luma et pose ta question à voix haute. Elle ne propose que des titres de la collection Kids approuvée."
   ],
   [
    "Explore en sécurité",
    "Parcours les catégories ou cherche dans la collection. La tranche d’âge choisie reste obligatoire."
   ],
   [
    "Garde tes favoris",
    "Enregistre une belle découverte. Enregistrer ou partager un résultat ouvert ne dépense pas de match supplémentaire."
   ],
   [
    "Les adultes gardent le contrôle",
    "Demande de l’aide avant d’ouvrir un site externe. Lis les notes de sécurité avec un adulte."
   ]
  ],
  "next": "Suivant",
  "back": "Retour",
  "finish": "Explorons !",
  "skip": "Passer",
  "label": "VISITE KIDS"
 },
 "de": {
  "steps": [
   [
    "Lege die Abenteuerregeln fest",
    "Wähle Alter, Stimmung, Format und Jahrzehnt. Kids sucht nur in seiner geprüften, für dieses Alter freigegebenen Sammlung."
   ],
   [
    "Sprich mit Luma",
    "Tippe Luma an und stelle deine Frage laut. Sie empfiehlt nur Titel aus der freigegebenen Kids-Sammlung."
   ],
   [
    "Entdecke sicher",
    "Stöbere in Kategorien oder suche in der Sammlung. Die gewählte Altersgruppe bleibt eine feste Regel."
   ],
   [
    "Bewahre deine Favoriten auf",
    "Speichere eine schöne Entdeckung. Das Speichern oder Teilen eines geöffneten Ergebnisses verbraucht keinen weiteren Match."
   ],
   [
    "Erwachsene behalten die Kontrolle",
    "Bitte um Hilfe, bevor du eine andere Website öffnest. Lies die Sicherheitshinweise mit einem Erwachsenen."
   ]
  ],
  "next": "Weiter",
  "back": "Zurück",
  "finish": "Los geht’s!",
  "skip": "Überspringen",
  "label": "KIDS-RUNDGANG"
 },
 "it": {
  "steps": [
   [
    "Scegli le regole dell’avventura",
    "Scegli età, emozione, formato e decennio. Kids cerca solo nella raccolta esaminata e approvata per quell’età."
   ],
   [
    "Parla con Luma",
    "Tocca Luma e fai la tua domanda a voce. Può consigliare solo titoli della raccolta Kids approvata."
   ],
   [
    "Esplora in sicurezza",
    "Esplora le categorie o cerca nella raccolta. La fascia d’età scelta resta una regola obbligatoria."
   ],
   [
    "Conserva i preferiti",
    "Salva una bella scoperta. Salvare o condividere un risultato aperto non usa un altro match."
   ],
   [
    "Gli adulti mantengono il controllo",
    "Chiedi aiuto prima di aprire un sito esterno. Leggi le note di sicurezza insieme a un adulto."
   ]
  ],
  "next": "Avanti",
  "back": "Indietro",
  "finish": "Esploriamo!",
  "skip": "Salta",
  "label": "TOUR KIDS"
 },
 "tr": {
  "steps": [
   [
    "Macera kurallarını seç",
    "Yaş, ruh hâli, biçim ve dönemi seç. Kids yalnızca o yaş için incelenmiş ve onaylanmış koleksiyonunda arar."
   ],
   [
    "Luma ile konuş",
    "Luma’ya dokun ve sorunu sesli sor. Yalnızca onaylı Kids koleksiyonundan yapımlar önerebilir."
   ],
   [
    "Güvenle keşfet",
    "Kategorileri gez veya koleksiyonda ara. Seçilen yaş grubu her zaman zorunlu bir kuraldır."
   ],
   [
    "Favorilerini sakla",
    "Güzel bir keşfi kaydet. Açık bir sonucu kaydetmek veya paylaşmak ek eşleşme harcamaz."
   ],
   [
    "Kontrol yetişkinlerde",
    "Başka bir siteyi açmadan önce yardım iste. Güvenlik notlarını bir yetişkinle oku."
   ]
  ],
  "next": "İleri",
  "back": "Geri",
  "finish": "Keşfedelim!",
  "skip": "Atla",
  "label": "ÇOCUK TURU"
 },
 "ru": {
  "steps": [
   [
    "Выбери правила приключения",
    "Выбери возраст, настроение, формат и десятилетие. Kids ищет только в проверенной коллекции, одобренной для этого возраста."
   ],
   [
    "Поговори с Luma",
    "Нажми на Luma и задай вопрос голосом. Она рекомендует только произведения из одобренной коллекции Kids."
   ],
   [
    "Исследуй безопасно",
    "Открывай категории или ищи в коллекции. Выбранная возрастная группа остаётся обязательным правилом."
   ],
   [
    "Сохрани любимое",
    "Сохрани интересную находку. Сохранение или отправка открытого результата не расходует дополнительный подбор."
   ],
   [
    "Взрослые сохраняют контроль",
    "Попроси помощи перед переходом на другой сайт. Прочитай примечания о безопасности вместе со взрослым."
   ]
  ],
  "next": "Далее",
  "back": "Назад",
  "finish": "Начнём!",
  "skip": "Пропустить",
  "label": "ОБЗОР KIDS"
 },
 "ar": {
  "steps": [
   [
    "اختر قواعد المغامرة",
    "اختر العمر والمزاج والنوع والعقد. يبحث Kids في مجموعته المراجعة والمعتمدة لهذا العمر فقط."
   ],
   [
    "تحدث مع Luma",
    "اضغط على Luma واسأل سؤالك بصوتك. لا تقترح إلا أعمالًا من مجموعة Kids المعتمدة."
   ],
   [
    "استكشف بأمان",
    "تصفح الفئات أو ابحث في المجموعة. تبقى الفئة العمرية المختارة قاعدة إلزامية."
   ],
   [
    "احتفظ بمفضلاتك",
    "احفظ اكتشافًا ممتعًا. لا يستهلك حفظ نتيجة مفتوحة أو مشاركتها اختيارًا إضافيًا."
   ],
   [
    "يبقى التحكم لدى الكبار",
    "اطلب المساعدة قبل فتح موقع خارجي. اقرأ ملاحظات السلامة مع شخص بالغ."
   ]
  ],
  "next": "التالي",
  "back": "السابق",
  "finish": "لنستكشف!",
  "skip": "تخطي",
  "label": "جولة الأطفال"
 },
 "hi": {
  "steps": [
   [
    "रोमांच के नियम चुनें",
    "उम्र, मूड, प्रारूप और दशक चुनें। Kids केवल उस उम्र के लिए समीक्षित और स्वीकृत संग्रह में खोजता है।"
   ],
   [
    "Luma से बात करें",
    "Luma पर टैप करके आवाज़ में सवाल पूछें। वह केवल स्वीकृत Kids संग्रह से सुझाव दे सकती है।"
   ],
   [
    "सुरक्षित खोज करें",
    "श्रेणियाँ देखें या संग्रह में खोजें। चुनी हुई आयु सीमा हमेशा लागू रहती है।"
   ],
   [
    "पसंदीदा सँभालें",
    "मज़ेदार खोज सहेजें। खुले परिणाम को सहेजने या साझा करने पर अतिरिक्त मैच नहीं लगता।"
   ],
   [
    "बड़ों के हाथ में नियंत्रण",
    "दूसरी साइट खोलने से पहले मदद माँगें। किसी बड़े के साथ सुरक्षा नोट पढ़ें।"
   ]
  ],
  "next": "आगे",
  "back": "पीछे",
  "finish": "चलो खोजें!",
  "skip": "छोड़ें",
  "label": "KIDS परिचय"
 },
 "id": {
  "steps": [
   [
    "Pilih aturan petualangan",
    "Pilih usia, suasana hati, format, dan dekade. Kids hanya mencari dalam koleksi yang ditinjau dan disetujui untuk usia itu."
   ],
   [
    "Bicara dengan Luma",
    "Ketuk Luma lalu tanyakan dengan suara. Ia hanya merekomendasikan judul dari koleksi Kids yang disetujui."
   ],
   [
    "Jelajahi dengan aman",
    "Telusuri kategori atau cari dalam koleksi. Kelompok usia yang dipilih selalu menjadi aturan wajib."
   ],
   [
    "Simpan favoritmu",
    "Simpan penemuan menarik. Menyimpan atau membagikan hasil yang terbuka tidak memakai match tambahan."
   ],
   [
    "Orang dewasa tetap mengendalikan",
    "Minta bantuan sebelum membuka situs lain. Baca catatan keselamatan bersama orang dewasa."
   ]
  ],
  "next": "Lanjut",
  "back": "Kembali",
  "finish": "Ayo jelajahi!",
  "skip": "Lewati",
  "label": "TUR KIDS"
 },
 "ja": {
  "steps": [
   [
    "冒険のルールを選ぼう",
    "年齢、気分、種類、年代を選びます。Kidsは、その年齢向けに審査・承認された作品集だけを検索します。"
   ],
   [
    "Lumaに話しかけよう",
    "Lumaをタップして声で質問してね。承認済みのKids作品集からだけおすすめします。"
   ],
   [
    "安全に探そう",
    "カテゴリーを見たり作品集を検索したりできます。選んだ年齢のルールは必ず守られます。"
   ],
   [
    "お気に入りを残そう",
    "楽しい発見を保存しよう。開いている結果の保存や共有で、追加のマッチは使いません。"
   ],
   [
    "大人が見守ります",
    "外部のサイトを開く前に助けを求めましょう。安全についての注意を大人と読んでください。"
   ]
  ],
  "next": "次へ",
  "back": "戻る",
  "finish": "探検しよう！",
  "skip": "スキップ",
  "label": "キッズガイド"
 },
 "ko": {
  "steps": [
   [
    "모험의 규칙을 골라요",
    "나이, 기분, 형식, 시대를 골라요. Kids는 해당 나이에 맞게 검토하고 승인한 모음에서만 찾아요."
   ],
   [
    "Luma에게 말해요",
    "Luma를 탭하고 목소리로 질문해요. 승인된 Kids 모음에 있는 작품만 추천할 수 있어요."
   ],
   [
    "안전하게 탐험해요",
    "카테고리를 둘러보거나 모음에서 검색해요. 고른 연령대는 항상 필수 규칙이에요."
   ],
   [
    "즐겨찾기를 보관해요",
    "재미있는 발견을 저장해요. 열린 결과를 저장하거나 공유해도 매치를 추가로 쓰지 않아요."
   ],
   [
    "어른이 지켜봐요",
    "외부 사이트를 열기 전에 도움을 요청해요. 어른과 함께 안전 안내를 읽어 보세요."
   ]
  ],
  "next": "다음",
  "back": "이전",
  "finish": "탐험해요!",
  "skip": "건너뛰기",
  "label": "키즈 안내"
 },
 "zh": {
  "steps": [
   [
    "选择冒险规则",
    "选择年龄、心情、类型和年代。Kids 只搜索针对该年龄审核并批准的作品集。"
   ],
   [
    "和 Luma 说话",
    "点一下 Luma，用声音提问。她只会推荐已批准的 Kids 作品集中的作品。"
   ],
   [
    "安全地探索",
    "浏览分类或搜索作品集。所选年龄段始终是必须遵守的规则。"
   ],
   [
    "保存喜欢的作品",
    "收藏有趣的发现。保存或分享已打开的结果不会额外消耗匹配次数。"
   ],
   [
    "大人始终掌握控制",
    "打开外部网站前请寻求帮助。和大人一起阅读安全说明。"
   ]
  ],
  "next": "下一步",
  "back": "上一步",
  "finish": "开始探索！",
  "skip": "跳过",
  "label": "儿童引导"
 }
});
function t(){const l=window.MATCH_LANG||document.documentElement.lang||'en';return copy[l]||copy[l.split('-')[0]]||copy.en;}
function fresh(u){const a=Date.parse(u?.created_at||''),b=Date.parse(u?.last_sign_in_at||'');return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<10*60*1000;}
async function meta(fields){try{await window.supabaseClient?.auth.updateUser({data:fields});user.user_metadata={...(user.user_metadata||{}),...fields};}catch(_){}}
async function eligible(){
 try{const {data:{user:u}}=await window.supabaseClient.auth.getUser();if(!u)return false;user=u;
  if(u.user_metadata?.[DONE]===true)return false;
  try{if(localStorage.getItem('matchapp_onboarding_kids_'+VERSION+'_'+u.id)==='1')return false;}catch(_){}
  if(u.user_metadata?.[ELIGIBLE]===true)return true;
  if(fresh(u)){await meta({[ELIGIBLE]:true});return true;}
 }catch(_){}
 return false;
}
function selectors(){return['.kids-match','#kids-lumi-assistant','#kids-chips','.kids-saved','.kids-parent-info'];}
function ensure(){
 if(card)return;
 spot=document.createElement('div');spot.className='kids-tour-spotlight';spot.hidden=true;document.body.appendChild(spot);
 card=document.createElement('aside');card.className='kids-tour-card';card.hidden=true;card.setAttribute('role','dialog');card.setAttribute('aria-labelledby','kids-tour-title');
 card.innerHTML='<div class="kids-tour-top"><strong></strong><button type="button" data-skip></button></div><div class="kids-tour-stars" aria-hidden="true">✦ ★ ✦</div><small data-count></small><h2 id="kids-tour-title"></h2><p data-copy></p><div class="kids-tour-actions"><button type="button" data-back></button><button type="button" data-next></button></div>';
 document.body.appendChild(card);
 card.querySelector('[data-skip]').onclick=()=>finish();
 card.querySelector('[data-back]').onclick=()=>show(Math.max(0,i-1));
 card.querySelector('[data-next]').onclick=()=>i>=steps.length-1?finish():show(i+1);
}
function place(){
 if(!active||!steps[i])return;cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const el=document.querySelector(steps[i]);if(!el)return;const r=el.getBoundingClientRect(),p=9;card.classList.toggle('kids-tour-clear-bottom',steps[i]==='#kids-lumi-assistant'&&r.top+r.height/2>innerHeight/2);spot.style.left=Math.max(6,r.left-p)+'px';spot.style.top=Math.max(6,r.top-p)+'px';spot.style.width=Math.min(innerWidth-12,r.width+p*2)+'px';spot.style.height=Math.min(innerHeight-12,r.height+p*2)+'px';});
}
function show(n){
 i=n;const el=document.querySelector(steps[i]);if(!el){steps.splice(i,1);return steps.length?show(Math.min(i,steps.length-1)):finish();}
 const x=t(),pair=x.steps[selectors().indexOf(steps[i])]||x.steps[i];
 card.querySelector('.kids-tour-top strong').textContent=x.label;card.querySelector('[data-skip]').textContent=x.skip;card.querySelector('[data-count]').textContent=(i+1)+' / '+steps.length;card.querySelector('h2').textContent=pair[0];card.querySelector('[data-copy]').textContent=pair[1];card.querySelector('[data-back]').textContent=x.back;card.querySelector('[data-back]').hidden=i===0;card.querySelector('[data-next]').textContent=i===steps.length-1?x.finish:x.next;
 card.hidden=false;spot.hidden=false;document.documentElement.classList.add('kids-tour-active');if(window.MatchAppScrollGate?.canAutoScroll?.())el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});setTimeout(place,380);place();
}
async function finish(){
 active=false;if(card)card.hidden=true;if(spot)spot.hidden=true;document.documentElement.classList.remove('kids-tour-active');
 if(user){try{localStorage.setItem('matchapp_onboarding_kids_'+VERSION+'_'+user.id,'1');}catch(_){}await meta({[ELIGIBLE]:true,[DONE]:true});}
}
async function start(){
 if(active||!window.supabaseClient||!await eligible())return;steps=selectors().filter(s=>document.querySelector(s));if(!steps.length)return;ensure();active=true;show(0);
}
document.getElementById('kids-lang')?.addEventListener('change',()=>{if(active)show(i)});
addEventListener('resize',place,{passive:true});addEventListener('scroll',place,{passive:true});
window.addEventListener('load',()=>setTimeout(start,1300),{once:true});
})();
