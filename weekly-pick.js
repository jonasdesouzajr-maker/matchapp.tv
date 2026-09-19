/* MatchApp weekly featured title + AHS13 official trailer.
   The featured title is intentionally configured in one object so the weekly
   choice can be swapped without rebuilding the homepage component. */
(function(){
'use strict';

const LANGS=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const PICK={
  title:'A Gata Comeu',year:1985,country:'Brazil',countryCode:'BR',platform:'Globoplay',episodes:160,rating:'12',
  author:'Ivani Ribeiro',cast:['Christiane Torloni','Nuno Leal Maia'],
  poster:'https://cdn.ome.lt/images/tv/95544/poster/pt.webp',
  watchUrl:'https://globoplay.globo.com/a-gata-comeu/t/ckHsdc6HmP/detalhes/',
  sourceUrl:'https://memoriaglobo.globo.com/entretenimento/novelas/a-gata-comeu/noticia/a-gata-comeu.ghtml',
  previewId:'sLCptaI_N-Y',
  synopsis:'A classic Brazilian romantic comedy-drama about Jô Penteado and teacher Fábio Coutinho, whose relationship changes after a sea excursion leaves their group stranded on an island.',
  cats:['novela brasileira','telenovela','series'],moods:['romantic','funny','light and feel-good'],
  vibes:['long running series','slow burn','guilty pleasure'],ratings:['teen PG-13','any']
};
const AHS={title:'American Horror Story: 13',trailerId:'gQf4Vya5PbI',date:'2026-09-24'};

const COPY={
'en':{
 weeklyHeading:'Top MatchApp TV Ai choice this week',weeklyEyebrow:'This week’s featured classic',
 agataDesc:'A 1985 TV Globo romantic comedy-drama by Ivani Ribeiro. Jô Penteado and teacher Fábio Coutinho develop feelings after a sea excursion leaves their group stranded on an island. The 160-episode classic is available on Globoplay.',
 year:'Year',network:'Network',episodes:'episodes',rating:'Age rating',watch:'▶ Watch on Globoplay',save:'⭐ Save to Watch Later',notForMe:'👎 Not For Me',preview:'Official Globoplay preview',sources:'Verified sources',sourceNote:'Title facts and availability checked against Globoplay and Memória Globo.',
 ahsDesc:'American Horror Story season 13 premieres September 24, 2026 on FX and Hulu in the U.S., with Disney+ availability in Latin America.',ahsTrailer:'Official FX trailer',premieres:'Premieres',us:'FX & Hulu (U.S.)',latam:'Disney+ (Latin America)',ahsEpisodes:'13 episodes',openWeekly:'Open this week’s MatchApp choice',openAhs:'Open the AHS13 premiere',
 saved:'Saved to Watch Later.',disliked:'Marked Not For Me.'
},
'pt-BR':{
 weeklyHeading:'Escolha da semana do MatchApp TV Ai',weeklyEyebrow:'Clássico em destaque nesta semana',
 agataDesc:'Comédia romântica dramática da TV Globo de 1985, de Ivani Ribeiro. Jô Penteado e o professor Fábio Coutinho se aproximam depois que uma excursão marítima deixa o grupo preso em uma ilha. O clássico de 160 capítulos está disponível no Globoplay.',
 year:'Ano',network:'Emissora',episodes:'capítulos',rating:'Classificação',watch:'▶ Assistir no Globoplay',save:'⭐ Salvar para depois',notForMe:'👎 Não é para mim',preview:'Prévia oficial do Globoplay',sources:'Fontes verificadas',sourceNote:'Informações do título e disponibilidade conferidas no Globoplay e Memória Globo.',
 ahsDesc:'A 13ª temporada de American Horror Story estreia em 24 de setembro de 2026 no FX e Hulu nos EUA, com disponibilidade no Disney+ na América Latina.',ahsTrailer:'Trailer oficial do FX',premieres:'Estreia',us:'FX e Hulu (EUA)',latam:'Disney+ (América Latina)',ahsEpisodes:'13 episódios',openWeekly:'Abrir a escolha da semana do MatchApp',openAhs:'Abrir a estreia de AHS13',
 saved:'Salvo para assistir depois.',disliked:'Marcado como Não é para mim.'
},
'es':{
 weeklyHeading:'Elección de la semana de MatchApp TV Ai',weeklyEyebrow:'Clásico destacado de esta semana',
 agataDesc:'Comedia dramática romántica de TV Globo de 1985, escrita por Ivani Ribeiro. Jô Penteado y el profesor Fábio Coutinho se acercan después de que una excursión marítima deja al grupo varado en una isla. El clásico de 160 episodios está disponible en Globoplay.',
 year:'Año',network:'Canal',episodes:'episodios',rating:'Clasificación por edad',watch:'▶ Ver en Globoplay',save:'⭐ Guardar para después',notForMe:'👎 No es para mí',preview:'Avance oficial de Globoplay',sources:'Fuentes verificadas',sourceNote:'Datos del título y disponibilidad verificados con Globoplay y Memória Globo.',
 ahsDesc:'La temporada 13 de American Horror Story se estrena el 24 de septiembre de 2026 en FX y Hulu en EE. UU., con disponibilidad en Disney+ en Latinoamérica.',ahsTrailer:'Tráiler oficial de FX',premieres:'Estreno',us:'FX y Hulu (EE. UU.)',latam:'Disney+ (Latinoamérica)',ahsEpisodes:'13 episodios',openWeekly:'Abrir la elección semanal de MatchApp',openAhs:'Abrir el estreno de AHS13',
 saved:'Guardado para ver más tarde.',disliked:'Marcado como No es para mí.'
},
'fr':{
 weeklyHeading:'Choix MatchApp TV Ai de la semaine',weeklyEyebrow:'Classique à l’honneur cette semaine',
 agataDesc:'Comédie dramatique romantique de TV Globo datant de 1985, écrite par Ivani Ribeiro. Jô Penteado et le professeur Fábio Coutinho se rapprochent après une excursion en mer qui laisse leur groupe bloqué sur une île. Ce classique de 160 épisodes est disponible sur Globoplay.',
 year:'Année',network:'Chaîne',episodes:'épisodes',rating:'Classification',watch:'▶ Regarder sur Globoplay',save:'⭐ À regarder plus tard',notForMe:'👎 Pas pour moi',preview:'Extrait officiel Globoplay',sources:'Sources vérifiées',sourceNote:'Informations et disponibilité vérifiées auprès de Globoplay et Memória Globo.',
 ahsDesc:'La saison 13 d’American Horror Story débute le 24 septembre 2026 sur FX et Hulu aux États-Unis, avec une disponibilité sur Disney+ en Amérique latine.',ahsTrailer:'Bande-annonce officielle FX',premieres:'Première',us:'FX et Hulu (États-Unis)',latam:'Disney+ (Amérique latine)',ahsEpisodes:'13 épisodes',openWeekly:'Ouvrir le choix MatchApp de la semaine',openAhs:'Ouvrir la première AHS13',
 saved:'Ajouté à À regarder plus tard.',disliked:'Marqué Pas pour moi.'
},
'de':{
 weeklyHeading:'MatchApp TV Ai Wahl der Woche',weeklyEyebrow:'Klassiker der Woche',
 agataDesc:'Romantische TV-Globo-Dramedy von 1985 von Ivani Ribeiro. Jô Penteado und Lehrer Fábio Coutinho kommen sich näher, nachdem ein Seeausflug ihre Gruppe auf einer Insel stranden lässt. Der Klassiker mit 160 Folgen ist auf Globoplay verfügbar.',
 year:'Jahr',network:'Sender',episodes:'Folgen',rating:'Altersfreigabe',watch:'▶ Auf Globoplay ansehen',save:'⭐ Für später speichern',notForMe:'👎 Nichts für mich',preview:'Offizielle Globoplay-Vorschau',sources:'Verifizierte Quellen',sourceNote:'Titeldaten und Verfügbarkeit mit Globoplay und Memória Globo geprüft.',
 ahsDesc:'American Horror Story Staffel 13 startet am 24. September 2026 bei FX und Hulu in den USA und ist in Lateinamerika auf Disney+ verfügbar.',ahsTrailer:'Offizieller FX-Trailer',premieres:'Start',us:'FX & Hulu (USA)',latam:'Disney+ (Lateinamerika)',ahsEpisodes:'13 Folgen',openWeekly:'MatchApp-Wahl der Woche öffnen',openAhs:'AHS13-Premiere öffnen',
 saved:'Für später gespeichert.',disliked:'Als Nichts für mich markiert.'
},
'it':{
 weeklyHeading:'Scelta MatchApp TV Ai della settimana',weeklyEyebrow:'Classico in evidenza questa settimana',
 agataDesc:'Commedia drammatica romantica di TV Globo del 1985, scritta da Ivani Ribeiro. Jô Penteado e l’insegnante Fábio Coutinho si avvicinano dopo che un’escursione in mare lascia il gruppo bloccato su un’isola. Il classico di 160 episodi è disponibile su Globoplay.',
 year:'Anno',network:'Rete',episodes:'episodi',rating:'Classificazione',watch:'▶ Guarda su Globoplay',save:'⭐ Salva per dopo',notForMe:'👎 Non fa per me',preview:'Anteprima ufficiale Globoplay',sources:'Fonti verificate',sourceNote:'Informazioni e disponibilità verificate con Globoplay e Memória Globo.',
 ahsDesc:'La stagione 13 di American Horror Story debutta il 24 settembre 2026 su FX e Hulu negli Stati Uniti, con disponibilità su Disney+ in America Latina.',ahsTrailer:'Trailer ufficiale FX',premieres:'Debutto',us:'FX e Hulu (USA)',latam:'Disney+ (America Latina)',ahsEpisodes:'13 episodi',openWeekly:'Apri la scelta MatchApp della settimana',openAhs:'Apri la première di AHS13',
 saved:'Salvato per dopo.',disliked:'Contrassegnato come Non fa per me.'
},
'tr':{
 weeklyHeading:'Haftanın MatchApp TV Ai seçimi',weeklyEyebrow:'Bu haftanın öne çıkan klasiği',
 agataDesc:'Ivani Ribeiro’nun yazdığı 1985 yapımı TV Globo romantik komedi-draması. Jô Penteado ile öğretmen Fábio Coutinho, bir deniz gezisinin grubu adada mahsur bırakmasının ardından yakınlaşır. 160 bölümlük klasik Globoplay’de izlenebilir.',
 year:'Yıl',network:'Kanal',episodes:'bölüm',rating:'Yaş sınıflandırması',watch:'▶ Globoplay’de izle',save:'⭐ Sonra izlemek için kaydet',notForMe:'👎 Bana göre değil',preview:'Resmî Globoplay önizlemesi',sources:'Doğrulanmış kaynaklar',sourceNote:'Başlık bilgileri ve erişilebilirlik Globoplay ve Memória Globo ile doğrulandı.',
 ahsDesc:'American Horror Story 13. sezon, ABD’de 24 Eylül 2026’da FX ve Hulu’da başlıyor; Latin Amerika’da Disney+ üzerinden sunuluyor.',ahsTrailer:'Resmî FX fragmanı',premieres:'Başlangıç',us:'FX ve Hulu (ABD)',latam:'Disney+ (Latin Amerika)',ahsEpisodes:'13 bölüm',openWeekly:'Haftanın MatchApp seçimini aç',openAhs:'AHS13 prömiyerini aç',
 saved:'Sonra izlemek için kaydedildi.',disliked:'Bana göre değil olarak işaretlendi.'
},
'ru':{
 weeklyHeading:'Выбор недели MatchApp TV Ai',weeklyEyebrow:'Классика недели',
 agataDesc:'Романтическая комедийная драма TV Globo 1985 года по сценарию Ивани Рибейру. Жо Пентеаду и учитель Фабиу Коутинью сближаются после морской экскурсии, из-за которой группа оказывается на острове. Классический сериал из 160 эпизодов доступен на Globoplay.',
 year:'Год',network:'Канал',episodes:'эпизодов',rating:'Возрастной рейтинг',watch:'▶ Смотреть на Globoplay',save:'⭐ Сохранить на потом',notForMe:'👎 Не для меня',preview:'Официальный ролик Globoplay',sources:'Проверенные источники',sourceNote:'Данные и доступность проверены по Globoplay и Memória Globo.',
 ahsDesc:'13-й сезон American Horror Story выходит 24 сентября 2026 года на FX и Hulu в США и доступен на Disney+ в Латинской Америке.',ahsTrailer:'Официальный трейлер FX',premieres:'Премьера',us:'FX и Hulu (США)',latam:'Disney+ (Латинская Америка)',ahsEpisodes:'13 эпизодов',openWeekly:'Открыть выбор MatchApp недели',openAhs:'Открыть премьеру AHS13',
 saved:'Сохранено на потом.',disliked:'Отмечено как Не для меня.'
},
'ar':{
 weeklyHeading:'اختيار MatchApp TV Ai لهذا الأسبوع',weeklyEyebrow:'كلاسيكية هذا الأسبوع',
 agataDesc:'دراما كوميدية رومانسية من TV Globo عام 1985 للكاتبة Ivani Ribeiro. تتقارب Jô Penteado مع المعلّم Fábio Coutinho بعد رحلة بحرية تترك المجموعة عالقة على جزيرة. العمل الكلاسيكي المكوّن من 160 حلقة متاح على Globoplay.',
 year:'السنة',network:'القناة',episodes:'حلقة',rating:'التصنيف العمري',watch:'▶ المشاهدة على Globoplay',save:'⭐ حفظ للمشاهدة لاحقًا',notForMe:'👎 ليس مناسبًا لي',preview:'معاينة رسمية من Globoplay',sources:'مصادر موثّقة',sourceNote:'تم التحقق من معلومات العمل وتوفّره عبر Globoplay وMemória Globo.',
 ahsDesc:'يُعرض الموسم 13 من American Horror Story في 24 سبتمبر 2026 على FX وHulu في الولايات المتحدة، مع توفره على Disney+ في أمريكا اللاتينية.',ahsTrailer:'الإعلان الرسمي من FX',premieres:'العرض الأول',us:'FX وHulu (الولايات المتحدة)',latam:'Disney+ (أمريكا اللاتينية)',ahsEpisodes:'13 حلقة',openWeekly:'فتح اختيار MatchApp لهذا الأسبوع',openAhs:'فتح عرض AHS13 الأول',
 saved:'تم الحفظ للمشاهدة لاحقًا.',disliked:'تم وضع علامة ليس مناسبًا لي.'
},
'hi':{
 weeklyHeading:'इस सप्ताह की MatchApp TV Ai पसंद',weeklyEyebrow:'इस सप्ताह का चुनिंदा क्लासिक',
 agataDesc:'Ivani Ribeiro द्वारा लिखित 1985 की TV Globo रोमांटिक कॉमेडी-ड्रामा। समुद्री भ्रमण के बाद समूह के एक द्वीप पर फँस जाने से Jô Penteado और शिक्षक Fábio Coutinho करीब आते हैं। 160 एपिसोड वाला यह क्लासिक Globoplay पर उपलब्ध है।',
 year:'वर्ष',network:'नेटवर्क',episodes:'एपिसोड',rating:'आयु रेटिंग',watch:'▶ Globoplay पर देखें',save:'⭐ बाद में देखने के लिए सेव करें',notForMe:'👎 मेरे लिए नहीं',preview:'आधिकारिक Globoplay प्रीव्यू',sources:'सत्यापित स्रोत',sourceNote:'शीर्षक की जानकारी और उपलब्धता Globoplay और Memória Globo से सत्यापित की गई है।',
 ahsDesc:'American Horror Story सीज़न 13 का प्रीमियर 24 सितंबर 2026 को अमेरिका में FX और Hulu पर होगा, और लैटिन अमेरिका में Disney+ पर उपलब्ध होगा।',ahsTrailer:'आधिकारिक FX ट्रेलर',premieres:'प्रीमियर',us:'FX और Hulu (अमेरिका)',latam:'Disney+ (लैटिन अमेरिका)',ahsEpisodes:'13 एपिसोड',openWeekly:'इस सप्ताह की MatchApp पसंद खोलें',openAhs:'AHS13 प्रीमियर खोलें',
 saved:'बाद में देखने के लिए सेव किया गया।',disliked:'मेरे लिए नहीं के रूप में चिह्नित।'
},
'id':{
 weeklyHeading:'Pilihan MatchApp TV Ai minggu ini',weeklyEyebrow:'Klasik pilihan minggu ini',
 agataDesc:'Drama komedi romantis TV Globo tahun 1985 karya Ivani Ribeiro. Jô Penteado dan guru Fábio Coutinho semakin dekat setelah perjalanan laut membuat kelompok mereka terdampar di sebuah pulau. Karya klasik 160 episode ini tersedia di Globoplay.',
 year:'Tahun',network:'Jaringan',episodes:'episode',rating:'Rating usia',watch:'▶ Tonton di Globoplay',save:'⭐ Simpan untuk nanti',notForMe:'👎 Bukan untuk saya',preview:'Pratinjau resmi Globoplay',sources:'Sumber terverifikasi',sourceNote:'Informasi judul dan ketersediaan diverifikasi melalui Globoplay dan Memória Globo.',
 ahsDesc:'American Horror Story musim 13 tayang perdana 24 September 2026 di FX dan Hulu di AS, serta tersedia di Disney+ di Amerika Latin.',ahsTrailer:'Trailer resmi FX',premieres:'Tayang perdana',us:'FX & Hulu (AS)',latam:'Disney+ (Amerika Latin)',ahsEpisodes:'13 episode',openWeekly:'Buka pilihan MatchApp minggu ini',openAhs:'Buka penayangan perdana AHS13',
 saved:'Disimpan untuk ditonton nanti.',disliked:'Ditandai Bukan untuk saya.'
},
'ja':{
 weeklyHeading:'今週のMatchApp TV Aiおすすめ',weeklyEyebrow:'今週の注目クラシック',
 agataDesc:'Ivani Ribeiro脚本による1985年のTV Globoロマンティック・コメディドラマ。海の遠足で一行が島に取り残されたことをきっかけに、Jô Penteadoと教師Fábio Coutinhoが惹かれ合っていきます。全160話の名作はGloboplayで配信されています。',
 year:'年',network:'放送局',episodes:'話',rating:'年齢区分',watch:'▶ Globoplayで見る',save:'⭐ あとで見るに保存',notForMe:'👎 好みではない',preview:'Globoplay公式プレビュー',sources:'確認済み情報源',sourceNote:'作品情報と配信状況はGloboplayとMemória Globoで確認済みです。',
 ahsDesc:'American Horror Storyシーズン13は2026年9月24日に米国のFXとHuluで初公開され、ラテンアメリカではDisney+で配信されます。',ahsTrailer:'FX公式トレーラー',premieres:'初公開',us:'FX・Hulu（米国）',latam:'Disney+（ラテンアメリカ）',ahsEpisodes:'全13話',openWeekly:'今週のMatchAppおすすめを開く',openAhs:'AHS13プレミアを開く',
 saved:'あとで見るに保存しました。',disliked:'好みではないとして記録しました。'
},
'ko':{
 weeklyHeading:'이번 주 MatchApp TV Ai 추천작',weeklyEyebrow:'이번 주 추천 클래식',
 agataDesc:'Ivani Ribeiro가 집필한 1985년 TV Globo 로맨틱 코미디 드라마입니다. 바다 소풍 중 일행이 섬에 고립된 뒤 Jô Penteado와 교사 Fábio Coutinho가 가까워집니다. 160부작 클래식은 Globoplay에서 볼 수 있습니다.',
 year:'연도',network:'방송사',episodes:'회',rating:'연령 등급',watch:'▶ Globoplay에서 보기',save:'⭐ 나중에 보기 저장',notForMe:'👎 내 취향 아님',preview:'Globoplay 공식 미리보기',sources:'확인된 출처',sourceNote:'작품 정보와 시청 가능 여부는 Globoplay와 Memória Globo에서 확인했습니다.',
 ahsDesc:'American Horror Story 시즌 13은 2026년 9월 24일 미국 FX와 Hulu에서 공개되며, 라틴아메리카에서는 Disney+에서 제공됩니다.',ahsTrailer:'FX 공식 예고편',premieres:'공개일',us:'FX 및 Hulu(미국)',latam:'Disney+(라틴아메리카)',ahsEpisodes:'13부작',openWeekly:'이번 주 MatchApp 추천 열기',openAhs:'AHS13 프리미어 열기',
 saved:'나중에 보기에 저장했습니다.',disliked:'내 취향 아님으로 표시했습니다.'
},
'zh':{
 weeklyHeading:'本周 MatchApp TV Ai 精选',weeklyEyebrow:'本周经典推荐',
 agataDesc:'Ivani Ribeiro 编剧的1985年 TV Globo 浪漫喜剧剧情剧。一次海上旅行让一行人被困孤岛后，Jô Penteado 与教师 Fábio Coutinho 的感情逐渐升温。这部160集的经典作品可在 Globoplay 观看。',
 year:'年份',network:'电视网',episodes:'集',rating:'年龄分级',watch:'▶ 在 Globoplay 观看',save:'⭐ 保存到稍后观看',notForMe:'👎 不适合我',preview:'Globoplay 官方预告',sources:'已核实来源',sourceNote:'作品信息和观看可用性已通过 Globoplay 与 Memória Globo 核实。',
 ahsDesc:'American Horror Story 第13季将于2026年9月24日在美国 FX 和 Hulu 首播，并在拉丁美洲通过 Disney+ 提供。',ahsTrailer:'FX 官方预告片',premieres:'首播',us:'FX 与 Hulu（美国）',latam:'Disney+（拉丁美洲）',ahsEpisodes:'13集',openWeekly:'打开本周 MatchApp 精选',openAhs:'打开 AHS13 首播',
 saved:'已保存到稍后观看。',disliked:'已标记为不适合我。'
}
};

function lang(){const raw=(window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase();if(raw.startsWith('pt'))return'pt-BR';const base=raw.split('-')[0];return LANGS.includes(base)?base:'en';}
function c(){return COPY[lang()]||COPY.en;}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function fmtDate(iso){try{return new Intl.DateTimeFormat(lang(),{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z'));}catch(_){return iso;}}
function reduce(){return matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion');}

function addCatalogEntry(){
  try{
    if(typeof CONTENT_CATALOG!=='undefined'&&Array.isArray(CONTENT_CATALOG)&&!CONTENT_CATALOG.some(x=>String(x.title).toLowerCase()===PICK.title.toLowerCase())){
      CONTENT_CATALOG.push({title:PICK.title,year:PICK.year,country:PICK.country,countryCode:PICK.countryCode,cast:PICK.cast.slice(),synopsis:PICK.synopsis,platform:PICK.platform,watchUrl:PICK.watchUrl,cats:PICK.cats.slice(),moods:PICK.moods.slice(),vibes:PICK.vibes.slice(),ratings:PICK.ratings.slice()});
    }
    if(typeof VERIFIED_POSTERS!=='undefined'&&VERIFIED_POSTERS)VERIFIED_POSTERS[PICK.title]=PICK.poster;
  }catch(e){console.warn('Weekly pick catalog registration skipped',e);}
}

function style(){if(document.getElementById('weekly-pick-style'))return;const s=document.createElement('style');s.id='weekly-pick-style';s.textContent=`
#weekly-pick-disclosure{margin-top:var(--stack-gap,18px)}
#weekly-pick .weekly-pick-video,#spotlight-ahs13 .weekly-pick-video{margin:14px 0 16px;max-width:620px}
.weekly-pick-video-label{display:flex;align-items:center;gap:7px;margin:0 0 7px;color:var(--gold,#E5C158);font-size:12px;font-weight:800}
.weekly-pick-video-frame{position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;border:1px solid rgba(229,193,88,.28);background:#08060d;box-shadow:0 12px 30px rgba(0,0,0,.3)}
.weekly-pick-video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
#weekly-pick .spotlight-poster{cursor:default}
.weekly-pick-source{font-size:11.5px;line-height:1.5;color:#bdb3cc;margin:8px 0 0}.weekly-pick-source a{color:var(--gold,#E5C158)}
.weekly-pick-actions{display:flex;flex-wrap:wrap;gap:9px;align-items:center}.weekly-pick-actions a,.weekly-pick-actions button{min-height:42px}
.weekly-pick-dislike{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.055);color:#eee;border-radius:999px;padding:10px 15px;font-weight:800;cursor:pointer}
@media(max-width:700px){#weekly-pick .weekly-pick-video,#spotlight-ahs13 .weekly-pick-video{max-width:100%}.weekly-pick-actions{gap:7px}.weekly-pick-actions a,.weekly-pick-actions button{font-size:12px;padding:9px 11px}}
`;document.head.appendChild(s);}

function player(id,label,title){return `<div class="weekly-pick-video"><p class="weekly-pick-video-label">🎬 ${esc(label)}</p><div class="weekly-pick-video-frame"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0" title="${esc(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></div>`;}

function ensureWeekly(){
  const premiere=document.getElementById('premiere-disclosure');if(!premiere)return;
  let d=document.getElementById('weekly-pick-disclosure');
  if(!d){d=document.createElement('details');d.id='weekly-pick-disclosure';d.className='premiere-disclosure weekly-pick-disclosure';d.open=false;d.innerHTML=`<summary><span data-weekly="weeklyHeading"></span></summary><article id="weekly-pick" class="premium-card spotlight-card"><div class="spotlight-glow" aria-hidden="true"></div><div class="spotlight-inner"><div class="spotlight-poster"><img src="${PICK.poster}" alt="A Gata Comeu (1985) official poster" referrerpolicy="no-referrer"><div class="spotlight-ribbon">1985 · TV GLOBO</div></div><div class="spotlight-body"><span class="spotlight-eyebrow" data-weekly="weeklyEyebrow"></span><h2 class="spotlight-title">A Gata Comeu</h2><p class="spotlight-desc" data-weekly="agataDesc"></p><div class="spotlight-meta weekly-pick-meta"></div><div class="weekly-pick-preview"></div><div class="weekly-pick-actions"><a class="gold-btn" href="${PICK.watchUrl}" target="_blank" rel="noopener noreferrer" data-weekly="watch"></a><button class="gold-btn weekly-save" type="button" data-weekly="save"></button><button class="weekly-pick-dislike weekly-dislike" type="button" data-weekly="notForMe"></button></div><p class="weekly-pick-source"><strong data-weekly="sources"></strong>: <a href="${PICK.watchUrl}" target="_blank" rel="noopener noreferrer">Globoplay</a> · <a href="${PICK.sourceUrl}" target="_blank" rel="noopener noreferrer">Memória Globo</a>. <span data-weekly="sourceNote"></span></p></div></div></article>`;premiere.insertAdjacentElement('afterend',d);
    const swift=document.getElementById('swifties-spotify');
    if(swift&&swift.parentNode===d.parentNode)d.parentNode.insertBefore(swift,d);
    d.open=!document.body.classList.contains('lazy-mode');
    d.querySelector('.weekly-save').addEventListener('click',()=>record('save'));
    d.querySelector('.weekly-dislike').addEventListener('click',()=>record('dislike'));
    d.addEventListener('toggle',()=>{try{window.track?.('weekly_pick_toggle',{open:d.open,title:PICK.title});}catch(_){}});
  }
}

async function record(type){
  if(typeof window.recordAction!=='function')return;
  let old={};
  try{
    old={title:typeof globalMatchTitle==='undefined'?undefined:globalMatchTitle,poster:typeof globalMatchPoster==='undefined'?undefined:globalMatchPoster,platform:typeof globalPlatform==='undefined'?undefined:globalPlatform,wt:window.globalMatchTitle,wp:window.globalMatchPoster,wpl:window.globalPlatform};
    globalMatchTitle=PICK.title;globalMatchPoster=PICK.poster;globalPlatform=PICK.platform;
    window.globalMatchTitle=PICK.title;window.globalMatchPoster=PICK.poster;window.globalPlatform=PICK.platform;
    await window.recordAction(type);
    window.track?.('weekly_pick_action',{title:PICK.title,action:type});
  }finally{
    try{if(old.title!==undefined)globalMatchTitle=old.title;if(old.poster!==undefined)globalMatchPoster=old.poster;if(old.platform!==undefined)globalPlatform=old.platform;}catch(_){}
    window.globalMatchTitle=old.wt||'';window.globalMatchPoster=old.wp||'';window.globalPlatform=old.wpl||'';
  }
}

function ensureAhsTrailer(){
  const body=document.querySelector('#spotlight-ahs13 .spotlight-body');if(!body)return;
  let host=body.querySelector('.ahs13-official-trailer');if(!host){host=document.createElement('div');host.className='ahs13-official-trailer';const meta=body.querySelector('.spotlight-meta');(meta||body.querySelector('.spotlight-desc'))?.insertAdjacentElement('afterend',host);}
}

function apply(){
  const x=c();document.querySelectorAll('[data-weekly]').forEach(el=>{const k=el.dataset.weekly;if(x[k])el.textContent=x[k];});
  const meta=document.querySelector('#weekly-pick .weekly-pick-meta');if(meta)meta.innerHTML=`<span class="spotlight-chip">📅 <strong>${esc(x.year)} ${PICK.year}</strong></span><span class="spotlight-chip">📺 TV Globo</span><span class="spotlight-chip">🎞️ ${PICK.episodes} ${esc(x.episodes)}</span><span class="spotlight-chip">🔞 ${esc(x.rating)} ${PICK.rating}</span>`;
  const p=document.querySelector('#weekly-pick .weekly-pick-preview');if(p)p.innerHTML=player(PICK.previewId,x.preview,`${x.preview} — ${PICK.title}`);
  const ahs=document.querySelector('#spotlight-ahs13');if(ahs){const desc=ahs.querySelector('.spotlight-desc');if(desc)desc.textContent=x.ahsDesc;const m=ahs.querySelector('.spotlight-meta');if(m)m.innerHTML=`<span class="spotlight-chip">📅 <strong>${esc(x.premieres)} ${esc(fmtDate(AHS.date))}</strong></span><span class="spotlight-chip">📺 ${esc(x.us)}</span><span class="spotlight-chip">🌎 ${esc(x.latam)}</span><span class="spotlight-chip">🎞️ ${esc(x.ahsEpisodes)}</span>`;const h=ahs.querySelector('.ahs13-official-trailer');if(h)h.innerHTML=player(AHS.trailerId,x.ahsTrailer,`${x.ahsTrailer} — ${AHS.title}`);const poster=ahs.querySelector('.spotlight-poster');if(poster)poster.setAttribute('aria-label',x.openAhs);}
  const sum=document.querySelector('#weekly-pick-disclosure summary');if(sum)sum.setAttribute('aria-label',x.openWeekly);
  document.querySelectorAll('[data-weekly-page]').forEach(page=>{page.querySelectorAll('[data-weekly-page-key]').forEach(el=>{const k=el.dataset.weeklyPageKey;if(x[k])el.textContent=x[k];});});
}

function enrichSeo(){
  const kw=document.querySelector('meta[name="keywords"]');const extra='A Gata Comeu, A Gata Comeu 1985, A Gata Comeu Globoplay, onde assistir A Gata Comeu, novela A Gata Comeu, Ivani Ribeiro, Christiane Torloni, Nuno Leal Maia, American Horror Story 13, AHS13, American Horror Story season 13 trailer, AHS 13 FX Hulu Disney+, September 24 2026';if(kw&&!kw.content.includes('A Gata Comeu'))kw.content+=', '+extra;
  const desc=document.querySelector('meta[name="description"]');if(desc&&!desc.content.includes('A Gata Comeu'))desc.content=(desc.content.replace(/\s*$/,'')+' Featured this week: A Gata Comeu (1985), plus American Horror Story 13 premiere and official trailer.').slice(0,300);
  if(!document.getElementById('weekly-pick-schema')){const s=document.createElement('script');s.id='weekly-pick-schema';s.type='application/ld+json';s.textContent=JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'TVSeries','@id':'https://matchapp.tv/featured/a-gata-comeu/#series',name:PICK.title,datePublished:'1985-04-15',numberOfEpisodes:PICK.episodes,genre:['Romance','Comedy','Drama'],countryOfOrigin:{'@type':'Country',name:'Brazil'},author:{'@type':'Person',name:PICK.author},actor:PICK.cast.map(name=>({'@type':'Person',name})),contentRating:'12',image:PICK.poster,url:'https://matchapp.tv/featured/a-gata-comeu/',sameAs:[PICK.watchUrl,PICK.sourceUrl],potentialAction:{'@type':'WatchAction',target:PICK.watchUrl}},{'@type':'VideoObject',name:'A Gata Comeu — official Globoplay preview',uploadDate:'2026-04-08',thumbnailUrl:`https://i.ytimg.com/vi/${PICK.previewId}/hqdefault.jpg`,contentUrl:`https://www.youtube.com/watch?v=${PICK.previewId}`,embedUrl:`https://www.youtube-nocookie.com/embed/${PICK.previewId}`},{'@type':'VideoObject',name:'American Horror Story: 13 — Official Trailer | FX',uploadDate:'2026-09-10',thumbnailUrl:`https://i.ytimg.com/vi/${AHS.trailerId}/hqdefault.jpg`,contentUrl:`https://www.youtube.com/watch?v=${AHS.trailerId}`,embedUrl:`https://www.youtube-nocookie.com/embed/${AHS.trailerId}`} ]});document.head.appendChild(s);}
}

function hash(){const h=location.hash.toLowerCase();if(!['#weekly-pick','#a-gata-comeu','#spotlight-ahs13'].includes(h))return;const isAhs=h==='#spotlight-ahs13';const d=document.getElementById(isAhs?'premiere-disclosure':'weekly-pick-disclosure');const target=document.getElementById(isAhs?'spotlight-ahs13':'weekly-pick');if(d)d.open=true;requestAnimationFrame(()=>target?.scrollIntoView({behavior:reduce()?'auto':'smooth',block:'start'}));}

function boot(){addCatalogEntry();style();ensureWeekly();ensureAhsTrailer();apply();enrichSeo();hash();const mo=new MutationObserver(m=>{if(m.some(x=>x.attributeName==='lang'||x.attributeName==='dir'))apply();});mo.observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});window.addEventListener('hashchange',hash);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
