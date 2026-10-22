/* MatchApp Ai 2026 — presentation-only information architecture.
   Reuses existing MatchApp functions and DOM ids; no quota/auth/payment/matching rule changes. */
(function(){
'use strict';
const BRAND='/assets/brand/brandkit/logo-horizontal.svg?v=20260919-brand1';
const ICON='/assets/brand/matchapp-official-icon-512.webp?v=20260920-official1';
const HOME_ICON='/assets/brand/matchapp-ai-mark.svg?v=20261022-vector1';
const path=(location.pathname||'/').replace(/\/+$/,'')||'/';
const isHome=path==='/'||path==='/index.html';
const isDiscover=path==='/discover.html';
const isTogether=path==='/together.html';
const isPricing=path==='/pricing'||path==='/pricing/pricing.html';

const COPY={
 en:{title:'What should you watch tonight?',sub:'Pick a mood. Get one title and where it plays.',match:'🎯 Find My Perfect Match',ask:'✨ Ask MatchApp Ai',mood:'Mood',format:'Format',platform:'Platform',fine:'Fine-tune',find:'Find something to watch',together:'Watching with someone? Match Together',send:'Send',quota:'Included actions left today',askph:'Ask what to watch, where it plays, or anything about a title…',comfort:'Comfort',funny:'Funny',intense:'Intense',romance:'Romance',smart:'Smart',scary:'Scary',short:'Something short',surprise:'Surprise me',any:'Any',movie:'Movie',series:'Series',anime:'Anime',novela:'Novela',kids:'Kids',podcast:'Podcast',free:'Free',latest:'Latest titles',discover:'Ask MatchApp Ai',pricingTitle:'Watch with fewer limits.',pricingSub:'One daily action is either a Match or an Ask. Top-ups stay separate.',freePlan:'Free',account:'Account',vip:'VIP',daily:'included AI actions daily',monthly:'Monthly',annual:'Annual',start:'Start matching',join:'Create free account'},
 'pt-BR':{title:'O que você deve assistir hoje?',sub:'Escolha um clima. Receba um título e onde assistir.',match:'🎯 Encontre Meu Match Perfeito',ask:'✨ Pergunte ao MatchApp Ai',mood:'Clima',format:'Formato',platform:'Plataforma',fine:'Ajustar',find:'Encontrar algo para assistir',together:'Vai assistir com alguém? Match Together',send:'Enviar',quota:'Ações incluídas restantes hoje',askph:'Pergunte o que assistir, onde passa ou qualquer coisa sobre um título…',comfort:'Conforto',funny:'Engraçado',intense:'Intenso',romance:'Romance',smart:'Inteligente',scary:'Assustador',short:'Algo curto',surprise:'Surpreenda-me',any:'Qualquer',movie:'Filme',series:'Série',anime:'Anime',novela:'Novela',kids:'Kids',podcast:'Podcast',free:'Grátis',latest:'Títulos recentes',discover:'Pergunte ao MatchApp Ai',pricingTitle:'Assista com menos limites.',pricingSub:'Uma ação diária é um Match ou uma pergunta. Recargas continuam separadas.',freePlan:'Grátis',account:'Conta',vip:'VIP',daily:'ações de IA incluídas por dia',monthly:'Mensal',annual:'Anual',start:'Começar',join:'Criar conta grátis'},
 es:{title:'¿Qué deberías ver esta noche?',sub:'Elige un ánimo. Recibe un título y dónde verlo.',match:'🎯 Encuentra Mi Match Perfecto',ask:'✨ Pregunta a MatchApp Ai',mood:'Ánimo',format:'Formato',platform:'Plataforma',fine:'Afinar',find:'Encontrar algo para ver',together:'¿Ves con alguien? Match Together',send:'Enviar',quota:'Acciones incluidas restantes hoy',askph:'Pregunta qué ver, dónde está o cualquier cosa sobre un título…',comfort:'Confort',funny:'Divertido',intense:'Intenso',romance:'Romance',smart:'Inteligente',scary:'Terror',short:'Algo corto',surprise:'Sorpréndeme',any:'Cualquiera',movie:'Película',series:'Serie',anime:'Anime',novela:'Telenovela',kids:'Niños',podcast:'Podcast',free:'Gratis',latest:'Títulos recientes',discover:'Pregunta a MatchApp Ai',pricingTitle:'Mira con menos límites.',pricingSub:'Una acción diaria es un Match o una pregunta. Las recargas son separadas.',freePlan:'Gratis',account:'Cuenta',vip:'VIP',daily:'acciones de IA incluidas al día',monthly:'Mensual',annual:'Anual',start:'Empezar',join:'Crear cuenta gratis'},
 fr:{title:'Que regarder ce soir ?',sub:'Choisissez une humeur. Obtenez un titre et où le voir.',match:'🎯 Trouver Mon Match Parfait',ask:'✨ Demander à MatchApp Ai',mood:'Humeur',format:'Format',platform:'Plateforme',fine:'Affiner',find:'Trouver quelque chose à regarder',together:'Vous regardez à deux ? Match Together',send:'Envoyer',quota:"Actions incluses restantes aujourd'hui",askph:'Demandez quoi regarder, où le voir ou tout sur un titre…',comfort:'Réconfort',funny:'Drôle',intense:'Intense',romance:'Romance',smart:'Malin',scary:'Effrayant',short:'Quelque chose de court',surprise:'Surprenez-moi',any:'Tous',movie:'Film',series:'Série',anime:'Anime',novela:'Novela',kids:'Kids',podcast:'Podcast',free:'Gratuit',latest:'Titres récents',discover:'Demander à MatchApp Ai',pricingTitle:'Regardez avec moins de limites.',pricingSub:'Une action quotidienne est un Match ou une question. Les recharges restent séparées.',freePlan:'Gratuit',account:'Compte',vip:'VIP',daily:'actions IA incluses par jour',monthly:'Mensuel',annual:'Annuel',start:'Commencer',join:'Créer un compte'},
 de:{title:'Was solltest du heute Abend schauen?',sub:'Stimmung wählen. Einen Titel plus Anbieter bekommen.',match:'🎯 Mein perfektes Match finden',ask:'✨ MatchApp Ai fragen',mood:'Stimmung',format:'Format',platform:'Plattform',fine:'Feinabstimmen',find:'Etwas zum Anschauen finden',together:'Mit jemandem schauen? Match Together',send:'Senden',quota:'Inklusive Aktionen heute übrig',askph:'Frag, was du schauen sollst, wo es läuft oder nach einem Titel…',comfort:'Gemütlich',funny:'Lustig',intense:'Intensiv',romance:'Romantik',smart:'Clever',scary:'Gruselig',short:'Etwas Kurzes',surprise:'Überrasch mich',any:'Alle',movie:'Film',series:'Serie',anime:'Anime',novela:'Novela',kids:'Kids',podcast:'Podcast',free:'Kostenlos',latest:'Neue Titel',discover:'MatchApp Ai fragen',pricingTitle:'Schauen mit weniger Limits.',pricingSub:'Eine tägliche Aktion ist Match oder Ask. Aufladungen bleiben getrennt.',freePlan:'Kostenlos',account:'Konto',vip:'VIP',daily:'inklusive KI-Aktionen täglich',monthly:'Monatlich',annual:'Jährlich',start:'Starten',join:'Kostenloses Konto'},
 it:{title:'Cosa dovresti guardare stasera?',sub:'Scegli un umore. Ottieni un titolo e dove guardarlo.',match:'🎯 Trova il Mio Match Perfetto',ask:'✨ Chiedi a MatchApp Ai',mood:'Umore',format:'Formato',platform:'Piattaforma',fine:'Affina',find:'Trova qualcosa da guardare',together:'Guardate insieme? Match Together',send:'Invia',quota:'Azioni incluse rimaste oggi',askph:'Chiedi cosa guardare, dove si trova o qualsiasi cosa su un titolo…',comfort:'Comfort',funny:'Divertente',intense:'Intenso',romance:'Romantico',smart:'Intelligente',scary:'Paura',short:'Qualcosa di breve',surprise:'Sorprendimi',any:'Qualsiasi',movie:'Film',series:'Serie',anime:'Anime',novela:'Novela',kids:'Kids',podcast:'Podcast',free:'Gratis',latest:'Titoli recenti',discover:'Chiedi a MatchApp Ai',pricingTitle:'Guarda con meno limiti.',pricingSub:'Un’azione giornaliera è un Match o una domanda. Le ricariche restano separate.',freePlan:'Gratis',account:'Account',vip:'VIP',daily:'azioni IA incluse al giorno',monthly:'Mensile',annual:'Annuale',start:'Inizia',join:'Crea account gratis'},
 tr:{title:'Bu gece ne izlemelisin?',sub:'Bir ruh hali seç. Tek bir yapım ve nerede olduğunu al.',match:'🎯 Mükemmel Eşleşmemi Bul',ask:'✨ MatchApp Ai’ye Sor',mood:'Ruh hali',format:'Format',platform:'Platform',fine:'İnce ayar',find:'İzleyecek bir şey bul',together:'Biriyle mi izliyorsun? Match Together',send:'Gönder',quota:'Bugün kalan dahil işlemler',askph:'Ne izlemeli, nerede var veya bir yapım hakkında sor…',comfort:'Rahat',funny:'Komik',intense:'Yoğun',romance:'Romantik',smart:'Zeki',scary:'Korkutucu',short:'Kısa bir şey',surprise:'Şaşırt beni',any:'Fark etmez',movie:'Film',series:'Dizi',anime:'Anime',novela:'Novela',kids:'Çocuk',podcast:'Podcast',free:'Ücretsiz',latest:'Yeni başlıklar',discover:'MatchApp Ai’e sor',pricingTitle:'Daha az sınırla izle.',pricingSub:'Günlük bir işlem Match veya Ask’tir. Ek paketler ayrıdır.',freePlan:'Ücretsiz',account:'Hesap',vip:'VIP',daily:'günlük dahil AI işlemi',monthly:'Aylık',annual:'Yıllık',start:'Başla',join:'Ücretsiz hesap'},
 ru:{title:'Что посмотреть сегодня вечером?',sub:'Выберите настроение. Получите один вариант и где смотреть.',match:'🎯 Найти идеальный Match',ask:'✨ Спросить MatchApp Ai',mood:'Настроение',format:'Формат',platform:'Платформа',fine:'Уточнить',find:'Найти что посмотреть',together:'Смотрите вместе? Match Together',send:'Отправить',quota:'Осталось включённых действий сегодня',askph:'Спросите, что смотреть, где доступно или о любом названии…',comfort:'Уютное',funny:'Смешное',intense:'Напряжённое',romance:'Романтика',smart:'Умное',scary:'Страшное',short:'Что-то короткое',surprise:'Удиви меня',any:'Любой',movie:'Фильм',series:'Сериал',anime:'Аниме',novela:'Новелла',kids:'Детям',podcast:'Подкаст',free:'Бесплатно',latest:'Новые тайтлы',discover:'Спросить MatchApp Ai',pricingTitle:'Смотрите с меньшими ограничениями.',pricingSub:'Одно дневное действие — Match или Ask. Дополнения раздельны.',freePlan:'Бесплатно',account:'Аккаунт',vip:'VIP',daily:'действий ИИ в день',monthly:'Месяц',annual:'Год',start:'Начать',join:'Создать аккаунт'},
 ar:{title:'ماذا تشاهد الليلة؟',sub:'اختر مزاجاً. احصل على عنوان واحد ومكان مشاهدته.',match:'🎯 اعثر على تطابقي المثالي',ask:'✨ اسأل MatchApp Ai',mood:'المزاج',format:'النوع',platform:'المنصة',fine:'تخصيص',find:'اعثر على شيء للمشاهدة',together:'تشاهد مع شخص؟ Match Together',send:'إرسال',quota:'الإجراءات المتبقية اليوم',askph:'اسأل ماذا تشاهد أو أين يعرض أو عن أي عنوان…',comfort:'مريح',funny:'مضحك',intense:'مكثف',romance:'رومانسي',smart:'ذكي',scary:'مخيف',short:'شيء قصير',surprise:'فاجئني',any:'أي',movie:'فيلم',series:'مسلسل',anime:'أنمي',novela:'نوفيلّا',kids:'أطفال',podcast:'بودكاست',free:'مجاني',latest:'أحدث العناوين',discover:'اسأل MatchApp Ai',pricingTitle:'شاهد بقيود أقل.',pricingSub:'الإجراء اليومي هو Match أو Ask. الإضافات منفصلة.',freePlan:'مجاني',account:'حساب',vip:'VIP',daily:'إجراءات ذكاء اصطناعي يومياً',monthly:'شهري',annual:'سنوي',start:'ابدأ',join:'إنشاء حساب'},
 hi:{title:'आज रात क्या देखें?',sub:'मूड चुनें। एक शीर्षक और कहाँ देखें, पाएँ।',match:'🎯 मेरा परफ़ेक्ट मैच ढूँढें',ask:'✨ MatchApp Ai से पूछें',mood:'मूड',format:'फ़ॉर्मैट',platform:'प्लेटफ़ॉर्म',fine:'और चुनें',find:'देखने के लिए कुछ खोजें',together:'किसी के साथ देख रहे हैं? Match Together',send:'भेजें',quota:'आज की बची शामिल कार्रवाइयाँ',askph:'क्या देखें, कहाँ मिलता है या किसी शीर्षक के बारे में पूछें…',comfort:'आरामदायक',funny:'मज़ेदार',intense:'तीव्र',romance:'रोमांस',smart:'स्मार्ट',scary:'डरावना',short:'कुछ छोटा',surprise:'सरप्राइज़',any:'कोई भी',movie:'फ़िल्म',series:'सीरीज़',anime:'एनीमे',novela:'नोवेला',kids:'किड्स',podcast:'पॉडकास्ट',free:'मुफ़्त',latest:'नए शीर्षक',discover:'MatchApp Ai से पूछें',pricingTitle:'कम सीमाओं के साथ देखें।',pricingSub:'एक दैनिक कार्रवाई Match या Ask है। टॉप-अप अलग हैं।',freePlan:'मुफ़्त',account:'खाता',vip:'VIP',daily:'AI कार्रवाइयाँ प्रतिदिन',monthly:'मासिक',annual:'वार्षिक',start:'शुरू करें',join:'मुफ़्त खाता'},
 id:{title:'Mau nonton apa malam ini?',sub:'Pilih suasana. Dapatkan satu judul dan tempat menontonnya.',match:'🎯 Temukan Match Sempurna Saya',ask:'✨ Tanya MatchApp Ai',mood:'Suasana',format:'Format',platform:'Platform',fine:'Atur lagi',find:'Cari tontonan',together:'Nonton bersama? Match Together',send:'Kirim',quota:'Aksi termasuk yang tersisa hari ini',askph:'Tanya mau nonton apa, di mana tersedia, atau tentang judul apa pun…',comfort:'Nyaman',funny:'Lucu',intense:'Intens',romance:'Romantis',smart:'Cerdas',scary:'Seram',short:'Yang singkat',surprise:'Kejutkan saya',any:'Apa saja',movie:'Film',series:'Serial',anime:'Anime',novela:'Novela',kids:'Anak',podcast:'Podcast',free:'Gratis',latest:'Judul terbaru',discover:'Tanya MatchApp Ai',pricingTitle:'Nonton dengan batas lebih sedikit.',pricingSub:'Satu aksi harian adalah Match atau Ask. Top-up tetap terpisah.',freePlan:'Gratis',account:'Akun',vip:'VIP',daily:'aksi AI termasuk per hari',monthly:'Bulanan',annual:'Tahunan',start:'Mulai',join:'Buat akun gratis'},
 ja:{title:'今夜は何を見る？',sub:'気分を選ぶだけ。1作品と視聴先を提案します。',match:'🎯 ぴったりのMatchを見つける',ask:'✨ MatchApp Aiに聞く',mood:'気分',format:'形式',platform:'サービス',fine:'細かく指定',find:'見るものを決める',together:'誰かと見る？ Match Together',send:'送信',quota:'今日の残りアクション',askph:'何を見るか、どこで見られるか、作品について質問…',comfort:'ほっこり',funny:'笑える',intense:'刺激的',romance:'ロマンス',smart:'知的',scary:'怖い',short:'短め',surprise:'おまかせ',any:'指定なし',movie:'映画',series:'シリーズ',anime:'アニメ',novela:'ノベラ',kids:'キッズ',podcast:'ポッドキャスト',free:'無料',latest:'最新タイトル',discover:'MatchApp Aiに質問',pricingTitle:'制限を減らして楽しむ。',pricingSub:'1日の1アクションはMatchまたはAsk。追加分は別です。',freePlan:'無料',account:'アカウント',vip:'VIP',daily:'1日のAIアクション',monthly:'月額',annual:'年額',start:'始める',join:'無料アカウント'},
 ko:{title:'오늘 밤 뭐 볼까요?',sub:'기분을 고르면 한 작품과 시청처를 알려드려요.',match:'🎯 완벽한 Match 찾기',ask:'✨ MatchApp Ai에게 묻기',mood:'기분',format:'형식',platform:'플랫폼',fine:'세부 설정',find:'볼거리 찾기',together:'함께 보나요? Match Together',send:'보내기',quota:'오늘 남은 포함 작업',askph:'무엇을 볼지, 어디서 보는지, 작품에 대해 물어보세요…',comfort:'편안한',funny:'웃긴',intense:'강렬한',romance:'로맨스',smart:'똑똑한',scary:'무서운',short:'짧은 것',surprise:'추천해줘',any:'상관없음',movie:'영화',series:'시리즈',anime:'애니',novela:'노벨라',kids:'키즈',podcast:'팟캐스트',free:'무료',latest:'최신 타이틀',discover:'MatchApp Ai에 질문',pricingTitle:'더 적은 제한으로 감상하세요.',pricingSub:'하루 1회 작업은 Match 또는 Ask입니다. 추가 구매는 별도입니다.',freePlan:'무료',account:'계정',vip:'VIP',daily:'일일 포함 AI 작업',monthly:'월간',annual:'연간',start:'시작',join:'무료 계정'},
 zh:{title:'今晚看什么？',sub:'选一个心情。得到一个片名和观看平台。',match:'🎯 找到我的完美匹配',ask:'✨ 问 MatchApp Ai',mood:'心情',format:'类型',platform:'平台',fine:'细调',find:'找点好看的',together:'和别人一起看？Match Together',send:'发送',quota:'今天剩余包含次数',askph:'问看什么、在哪里看，或任何片名相关问题…',comfort:'治愈',funny:'搞笑',intense:'刺激',romance:'浪漫',smart:'烧脑',scary:'恐怖',short:'短一点',surprise:'给我惊喜',any:'不限',movie:'电影',series:'剧集',anime:'动漫',novela:'肥皂剧',kids:'儿童',podcast:'播客',free:'免费',latest:'最新内容',discover:'问 MatchApp Ai',pricingTitle:'少一点限制，多一点观看。',pricingSub:'每日一次操作是 Match 或 Ask。加购额度分别计算。',freePlan:'免费',account:'账户',vip:'VIP',daily:'每日包含 AI 操作',monthly:'月付',annual:'年付',start:'开始',join:'免费注册'}
};
const TAB_HINTS={
 en:{match:'Match by mood, format & platform',ask:'Describe what you want in your own words'},
 'pt-BR':{match:'Combine clima, formato e plataforma',ask:'Descreva com suas palavras o que quer assistir'},
 es:{match:'Combina ánimo, formato y plataforma',ask:'Describe con tus palabras qué quieres ver'},
 fr:{match:'Selon humeur, format et plateforme',ask:'Décrivez ce que vous voulez regarder'},
 de:{match:'Nach Stimmung, Format & Plattform',ask:'Beschreibe frei, was du sehen möchtest'},
 it:{match:'Abbina umore, formato e piattaforma',ask:'Descrivi con parole tue cosa vuoi vedere'},
 tr:{match:'Ruh hali, format ve platformla eşleştir',ask:'Ne izlemek istediğini kendi sözlerinle anlat'},
 ru:{match:'По настроению, формату и платформе',ask:'Опишите своими словами, что хотите посмотреть'},
 ar:{match:'طابق حسب المزاج والنوع والمنصة',ask:'صف بكلماتك ما الذي تريد مشاهدته'},
 hi:{match:'मूड, फ़ॉर्मैट और प्लेटफ़ॉर्म से मैच करें',ask:'अपने शब्दों में बताएं कि क्या देखना है'},
 id:{match:'Cocokkan suasana, format & platform',ask:'Jelaskan dengan kata-katamu apa yang ingin ditonton'},
 ja:{match:'気分・形式・サービスでマッチ',ask:'見たいものを自由な言葉で伝える'},
 ko:{match:'기분·형식·플랫폼으로 매치',ask:'보고 싶은 것을 자유롭게 설명하세요'},
 zh:{match:'按心情、类型和平台匹配',ask:'用自己的话描述你想看什么'}
};
function langKey(){
 const raw=String(window.MATCH_LANG||localStorage.getItem('match_lang')||document.documentElement.lang||'en').toLowerCase();
 if(raw.startsWith('pt'))return'pt-BR';if(raw.startsWith('es'))return'es';if(raw.startsWith('fr'))return'fr';if(raw.startsWith('de'))return'de';
 if(raw.startsWith('it'))return'it';if(raw.startsWith('tr'))return'tr';if(raw.startsWith('ru'))return'ru';if(raw.startsWith('ar'))return'ar';
 if(raw.startsWith('hi'))return'hi';if(raw.startsWith('id'))return'id';if(raw.startsWith('ja'))return'ja';if(raw.startsWith('ko'))return'ko';if(raw.startsWith('zh'))return'zh';return'en';
}
function c(){return COPY[langKey()]||COPY.en}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}
function after(ref,node){if(ref&&ref.parentNode)ref.parentNode.insertBefore(node,ref.nextSibling)}
function qs(s,r=document){return r.querySelector(s)}
function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
function safeClick(target){try{target?.click?.()}catch(_){}}
function countryName(){try{return String(localStorage.getItem('match_user_country')||'').trim()}catch(_){return''}}
function syncHeaderAuth(){
 // Account state is independent of an optional provider photo.
 const signed=window.isUserLoggedIn===true;
 document.body.classList.toggle('ma-guest',!signed);
 document.body.classList.toggle('ma-signed-in',signed);
 const logout=qs('#nav-logout-btn');
 if(logout){logout.hidden=!signed;logout.style.display=signed?'':'none';logout.setAttribute('aria-hidden',signed?'false':'true')}
 const signin=qs('#nav-reg-btn');
 if(signin){signin.hidden=signed;signin.style.display=signed?'none':'';signin.setAttribute('aria-hidden',signed?'true':'false')}
}
function ensureBrandMeta(){
 let fav=qs('link[rel="icon"]');if(!fav){fav=document.createElement('link');fav.rel='icon';document.head.appendChild(fav)}
 fav.href=ICON;fav.type='image/svg+xml';
 const tc=qs('meta[name="theme-color"]');if(tc)tc.content='#071326';
}
function openAskFromBrand(){
 if(!isHome){location.href='/?ask=1#ma-concierge';return}
 const ask=qs('#ma-tab-ask'),card=qs('#ma-ai-entry')||qs('#ma-concierge');
 if(ask)safeClick(ask);
 if(card)window.MatchAppActivatedScroll?.toStart(card) ?? card.scrollIntoView({behavior:'auto',block:'start'});
 setTimeout(()=>{
   const input=qs('#specific-search-input');
   if(input){input.classList.add('ma-ai-focus-pulse');setTimeout(()=>input.classList.remove('ma-ai-focus-pulse'),2200)}
   let cue=qs('.ma-ai-prompt-hint');
   if(!cue&&card){cue=el('div','ma-ai-prompt-hint','Type your request here to start a new chat with MatchApp Ai.');cue.setAttribute('role','status');card.appendChild(cue)}
   if(cue){cue.hidden=false;cue.classList.remove('is-showing');requestAnimationFrame(()=>cue.classList.add('is-showing'));setTimeout(()=>{cue.classList.remove('is-showing');setTimeout(()=>cue.hidden=true,240)},4200)}
   if(window.maPlayUISound)window.maPlayUISound('share');
 },180);
}
function brandHeader(){
 const h=qs('header.app-header');if(!h)return;
 // Home already ships its canonical header structure in HTML. Never opt it
 // into the shared runtime header class: that class activates older shared
 // header generations after first paint and causes the refresh-time morph.
 if(isHome){
   h.classList.remove('ma-global-header');
   h.classList.add('ma-home-header');
 }else{
   h.classList.add('ma-global-header');
 }
 let brand=qs('#home-brand-lockup',h)||qs('.header-brand-area',h)||qs('.matchapp-brand-link',h);
 if(brand&&brand.tagName==='A'){
   const host=el('div',brand.className);if(brand.id)host.id=brand.id;brand.replaceWith(host);brand=host;
 }
 if(brand){
   brand.classList.add('ma-brand-stage');
   if(!qs('.ma-brand-lockup',brand)) brand.innerHTML=
     '<div class="ma-brand-lockup" aria-label="MatchApp Ai">'+
       '<a class="ma-brand-home-link" href="/" aria-label="MatchApp Ai home">'+
         '<span class="ma-brand-orb-stage" aria-hidden="true">'+
           '<img class="ma-brand-orb" src="'+(isHome?HOME_ICON:ICON)+'" alt="" width="260" height="260">'+
         '</span>'+
         '<span class="ma-brand-copy" translate="no"><span class="ma-wordmark"><span class="ma-word-match">Match</span><span class="ma-word-app">App</span></span><span class="ma-word-ai" data-ma-brand-ai>Ai</span><span class="ma-brand-caption"><span class="ma-brand-tagline">Your new Entertainment Ai</span><span class="ma-brand-security" title="Connection encrypted over HTTPS and served through Cloudflare"><svg width="8" height="9" viewBox="0 0 12 14" aria-hidden="true" fill="none" stroke="currentColor"><path d="M6 1 11 3v4c0 3-5 6-5 6S1 10 1 7V3z"/><path d="m3.5 7 1.5 1.5 3.5-3.5"/></svg> Cloudflare · HTTPS</span></span></span>'+
       '</a>'+
     '</div>';
   const homeOrb=qs('.ma-brand-orb',brand);
   if(isHome&&homeOrb&&homeOrb.getAttribute('src')!==HOME_ICON)homeOrb.setAttribute('src',HOME_ICON);
   // Ask MatchApp remains available through its existing dedicated hero tab and composer.
   // The branding is one integrated wordmark; no detached Ai action is recreated.
 }
 const nav=qs('nav',h);if(!nav)return;
 nav.classList.add('ma-header-actions');
 // Kids Mode is a first-class destination, not a buried Settings action.
 if(!document.getElementById('matchapp-kids-entry')){
   const kids=el('a','ma-kids-mode-entry');kids.id='matchapp-kids-entry';kids.href='/kids/';
   kids.setAttribute('aria-label','Open Kids Mode');kids.setAttribute('title','Kids Mode');
   kids.innerHTML='<img src="/kids/kids-logo-sm.jpeg" alt="" width="23" height="23"><span>Kids Mode</span>';
   nav.appendChild(kids);
 }
 const logout=qs('#nav-logout-btn',nav);
 if(logout&&!logout.dataset.maIconized){
   logout.dataset.maIconized='1';logout.removeAttribute('data-i18n');
   logout.setAttribute('aria-label','Log out');logout.setAttribute('title','Log out');
   logout.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 8l4 4-4 4M18 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 }
 if(isHome&&!qs('.ma-how-button',nav)){
   const how=el('button','ma-how-button','✨ How it works');how.type='button';
   how.setAttribute('aria-label','Open MatchApp guide');
   how.addEventListener('click',()=>{location.href='/how-it-works.html'});
   nav.appendChild(how);
 }
 if(!qs('.ma-menu-wrap',nav)){
   const wrap=el('div','ma-menu-wrap');
   const btn=el('button','ma-menu-button');btn.type='button';btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Zm8.2 4.9v-2.2l-2.3-.8a7 7 0 0 0-.6-1.5l1-2.2-1.6-1.6-2.2 1a7 7 0 0 0-1.5-.6L12.2 3H10l-.8 2.3a7 7 0 0 0-1.5.6l-2.2-1-1.6 1.6 1 2.2a7 7 0 0 0-.6 1.5L2 11v2.2l2.3.8a7 7 0 0 0 .6 1.5l-1 2.2 1.6 1.6 2.2-1a7 7 0 0 0 1.5.6l.8 2.3h2.2l.8-2.3a7 7 0 0 0 1.5-.6l2.2 1 1.6-1.6-1-2.2a7 7 0 0 0 .6-1.5l2.3-.8Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg><span>Settings</span>';btn.setAttribute('aria-label','Settings and preferences');btn.setAttribute('title','Settings and preferences');btn.setAttribute('aria-expanded','false');
   const menu=el('div','ma-menu');menu.hidden=true;menu.setAttribute('role','menu');
   function link(label,href,icon){const a=el('a','',icon+' '+label);a.href=href;a.setAttribute('role','menuitem');return a}
   function action(label,icon,fn){const b=el('button','',icon+' '+label);b.type='button';b.setAttribute('role','menuitem');b.addEventListener('click',()=>{fn();close()});return b}
   menu.append(
     link('Country','/profile/profile.html#country','🌍'),
     action('Language','文',()=>{const control=qs('#lang-switcher-host select,#lang-switcher-host button,#lang-switcher-host [role="button"]');if(control)safeClick(control);else window.showToast?.(menuToast('language'))}),
     action('Sound','♪',()=>{const next=!(window.MatchSettings?.get?.('autoRead')!==false);window.MatchSettings?.set?.('autoRead',next);window.showToast?.(menuToast(next?'soundOn':'soundOff'))}),
     action('Theme','◐',()=>{const themes=['aurora','cinema','ocean','sunrise','arcade'],cur=window.MatchSettings?.get?.('theme')||'aurora',next=themes[(Math.max(0,themes.indexOf(cur))+1)%themes.length];window.MatchSettings?.set?.('theme',next);document.documentElement.dataset.theme=next;window.showToast?.(menuToast('theme')+': '+next)}),
     action('Lazy Mode','⚡',()=>{if(!document.body.classList.contains('ma-signed-in')){window.showToast?.(menuToast('lazy'));return}const lazy=qs('.lazy-toggle');if(lazy)safeClick(lazy);else window.setLazyMode?.(true)}),
     action('Daily check-in','✓',()=>{document.body.classList.add('ma-checkin-open');const box=qs('#daily-match-checkin');if(box){box.style.display='block';window.MatchAppActivatedScroll?.toStart(box) ?? box.scrollIntoView({behavior:'auto',block:'start'})}}),
     link('Jonas experience','/jonas/','✦'),
     link('Pricing','/pricing/pricing.html','♢'),
     action('Install app','↓',()=>{if(typeof window.installMatchApp==='function')window.installMatchApp();else location.href='/android/'}),
     link('Settings','/profile/profile.html#settings','⚙'),
     link("What's new",'/updates.html','•')
   );
   btn.addEventListener('click',()=>{menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',String(!menu.hidden))});
   function close(){menu.hidden=true;btn.setAttribute('aria-expanded','false')}
   document.addEventListener('click',e=>{if(!wrap.contains(e.target))close()});
   wrap.append(btn,menu);nav.appendChild(wrap);
 }
 syncHeaderAuth();
 h.classList.add('ma-header-ready');
 if(!h.dataset.maAuthObserved){
   h.dataset.maAuthObserved='1';
   document.addEventListener('matchapp:authchange',syncHeaderAuth);
   window.addEventListener('matchapp:installstate',syncHeaderAuth);
 }
}
// Reuse the authored Home header wording for the existing Pricing menu only.
const PRICING_HEADER_COPY={
 en:['How it works','Kids Mode','Settings','Country','Language','Sound','Theme','Lazy Mode','Daily check-in','Pricing','Install app','Settings',"What's new"],
 'pt-BR':['Como funciona','Modo Kids','Configurações','País','Idioma','Som','Tema','Modo relaxado','Check-in diário','Planos','Instalar app','Configurações','Novidades'],
 es:['Cómo funciona','Modo infantil','Ajustes','País','Idioma','Sonido','Tema','Modo relajado','Registro diario','Planes','Instalar app','Ajustes','Novedades'],
 fr:['Mode d’emploi','Mode enfants','Réglages','Pays','Langue','Son','Thème','Mode détente','Pointage quotidien','Tarifs','Installer l’app','Réglages','Nouveautés'],
 de:['So funktioniert’s','Kindermodus','Einstellungen','Land','Sprache','Ton','Design','Entspannungsmodus','Täglicher Check-in','Preise','App installieren','Einstellungen','Neuigkeiten'],
 it:['Come funziona','Modalità bambini','Impostazioni','Paese','Lingua','Audio','Tema','Modalità relax','Accesso giornaliero','Piani','Installa app','Impostazioni','Novità'],
 tr:['Nasıl çalışır','Çocuk modu','Ayarlar','Ülke','Dil','Ses','Tema','Rahat mod','Günlük giriş','Planlar','Uygulamayı yükle','Ayarlar','Yenilikler'],
 ru:['Как это работает','Детский режим','Настройки','Страна','Язык','Звук','Тема','Режим отдыха','Ежедневная отметка','Тарифы','Установить','Настройки','Новое'],
 ar:['كيف يعمل','وضع الأطفال','الإعدادات','البلد','اللغة','الصوت','السمة','وضع الراحة','تسجيل يومي','الخطط','تثبيت التطبيق','الإعدادات','الجديد'],
 hi:['कैसे काम करता है','बच्चों का मोड','सेटिंग्स','देश','भाषा','ध्वनि','थीम','आराम मोड','दैनिक चेक-इन','प्लान','ऐप इंस्टॉल करें','सेटिंग्स','नया क्या है'],
 id:['Cara kerja','Mode anak','Pengaturan','Negara','Bahasa','Suara','Tema','Mode santai','Check-in harian','Paket','Pasang aplikasi','Pengaturan','Yang baru'],
 ja:['使い方','キッズモード','設定','国','言語','音声','テーマ','リラックスモード','毎日のチェックイン','料金','アプリを入手','設定','新着情報'],
 ko:['사용 방법','키즈 모드','설정','국가','언어','소리','테마','휴식 모드','매일 체크인','요금제','앱 설치','설정','새 소식'],
 zh:['使用指南','儿童模式','设置','国家','语言','声音','主题','休闲模式','每日签到','套餐','安装应用','设置','最新消息']
};
const PRICING_MENU_TOASTS={
 "en":["Language options are available from Settings.","Sound on","Sound off","Sign in to use Lazy Mode."],
 "pt-BR":["As opções de idioma estão disponíveis nas Configurações.","Som ativado","Som desativado","Entre para usar o Modo relaxado."],
 "es":["Las opciones de idioma están disponibles en Ajustes.","Sonido activado","Sonido desactivado","Inicia sesión para usar el Modo relajado."],
 "fr":["Les options de langue sont disponibles dans les Réglages.","Son activé","Son coupé","Connectez-vous pour utiliser le Mode détente."],
 "de":["Die Sprachoptionen findest du in den Einstellungen.","Ton an","Ton aus","Melde dich an, um den Entspannungsmodus zu nutzen."],
 "it":["Le opzioni della lingua sono disponibili nelle Impostazioni.","Audio attivo","Audio disattivato","Accedi per usare la Modalità relax."],
 "tr":["Dil seçenekleri Ayarlar bölümünde bulunur.","Ses açık","Ses kapalı","Rahat modu kullanmak için giriş yapın."],
 "ru":["Настройки языка доступны в разделе «Настройки».","Звук включён","Звук выключен","Войдите, чтобы использовать режим отдыха."],
 "ar":["خيارات اللغة متاحة في الإعدادات.","الصوت مُفعّل","الصوت مُغلق","سجّل الدخول لاستخدام وضع الراحة."],
 "hi":["भाषा के विकल्प सेटिंग्स में उपलब्ध हैं।","ध्वनि चालू","ध्वनि बंद","आराम मोड का उपयोग करने के लिए साइन इन करें।"],
 "id":["Pilihan bahasa tersedia di Pengaturan.","Suara aktif","Suara nonaktif","Masuk untuk menggunakan Mode santai."],
 "ja":["言語のオプションは設定で選べます。","サウンドON","サウンドOFF","リラックスモードを使うにはログインしてください。"],
 "ko":["언어 옵션은 설정에서 선택할 수 있어요.","소리 켜짐","소리 꺼짐","휴식 모드를 사용하려면 로그인하세요."],
 "zh":["语言选项位于设置中。","声音已开启","声音已关闭","请登录以使用休闲模式。"]
};
function menuToast(kind){
 const original={language:'Language options are available from Settings.',soundOn:'Sound on',soundOff:'Sound off',theme:'Theme',lazy:'Sign in to use Lazy Mode.'};
 if(!isPricing)return original[kind];
 const locale=langKey(),copy=PRICING_MENU_TOASTS[locale]||PRICING_MENU_TOASTS.en;
 return kind==='theme'?(PRICING_HEADER_COPY[locale]||PRICING_HEADER_COPY.en)[6]:copy[{language:0,soundOn:1,soundOff:2,lazy:3}[kind]];
}
function fitPricingHeaderMenu(){
 if(!isPricing||!document?.documentElement)return;
 const menu=qs('header.app-header .ma-menu');if(!menu)return;
 menu.parentElement.style.setProperty('z-index',menu.hidden?'auto':'50');if(menu.hidden)return;
 const viewport=window.visualViewport,inset=16,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
 const right=left+(viewport?.width||innerWidth),bottom=top+(viewport?.height||innerHeight);
 menu.style.setProperty('z-index','50');menu.style.setProperty('translate','none');menu.style.setProperty('box-sizing','border-box');
 menu.style.setProperty('max-width',Math.max(44,right-left-inset*2)+'px');
 const box=menu.getBoundingClientRect(),y=Math.max(top+inset,Math.min(box.top,bottom-inset-44));
 const dx=Math.max(left+inset-box.left,Math.min(0,right-inset-box.right));
 menu.style.setProperty('translate',dx+'px '+(y-box.top)+'px');
 menu.style.setProperty('max-height',Math.max(44,bottom-inset-y)+'px');menu.style.setProperty('overflow-y','auto');
}
function paintPricingHeaderMenu(){
 if(!isPricing)return;
 const copy=PRICING_HEADER_COPY[langKey()]||PRICING_HEADER_COPY.en;
 const button=qs('header.app-header .ma-menu-button');
 if(button){
  const caption=qs('span',button);if(caption)caption.textContent=copy[2];
  button.setAttribute('aria-label',copy[2]);button.setAttribute('title',copy[2]);
  if(button.dataset.maPricingMenuFit!=='1'){
   button.dataset.maPricingMenuFit='1';button.addEventListener('click',fitPricingHeaderMenu);
   const menu=qs('.ma-menu',button.parentElement);if(menu)new MutationObserver(fitPricingHeaderMenu).observe(menu,{attributes:true,attributeFilter:['hidden']});
   window.addEventListener('resize',fitPricingHeaderMenu,{passive:true});
   window.visualViewport?.addEventListener('resize',fitPricingHeaderMenu,{passive:true});
   const header=button.closest('header');if(header&&typeof ResizeObserver==='function')new ResizeObserver(fitPricingHeaderMenu).observe(header);
  }
 }
 const labels=[...copy.slice(3,9),'Jonas',...copy.slice(9)];
 qsa('header.app-header .ma-menu > [role="menuitem"]').forEach((control,index)=>{
  const text=labels[index];if(!text)return;
  let caption=qs('[data-ma-menu-caption]',control);
  if(!caption){
   const original=Array.from(control.childNodes).find(node=>node.nodeType===3&&node.nodeValue.trim());
   if(!original)return;
   const icon=original.nodeValue.trim().split(' ')[0];original.nodeValue=icon+' ';
   caption=el('span','',text);caption.dataset.maMenuCaption='1';control.appendChild(caption);
  }
  caption.textContent=text;control.setAttribute('aria-label',text);
 });
 fitPricingHeaderMenu();
}
function criteria(){return typeof window.getMatchCriteria==='function'?window.getMatchCriteria():{cat:[],plat:[],genre:[],mood:[],vibe:[],rating:[],decade:[]}}
function setCriteria(patch){if(typeof window.setMatchCriteria==='function')window.setMatchCriteria(patch)}
function has(key,v){return (criteria()[key]||[]).includes(v)}
function selectText(id,value,fallback){const s=document.getElementById(id);const o=s?Array.from(s.options).find(x=>x.value===value):null;return o?.textContent?.trim()||fallback}
let quickKids=false;
function quickChip(label,pressed,onClick,extra=''){const b=el('button','ma-chip '+extra,label);b.type='button';b.setAttribute('aria-pressed',pressed?'true':'false');b.addEventListener('click',onClick);return b}
function buildQuick(host){
 if(!host||qs('.ma-quick',host))return;
 const t=c(),quick=el('div','ma-quick');
 const row=(label,small,cls='')=>{const w=el('div','ma-filter-row '+cls);const l=el('div','ma-filter-label');l.innerHTML='<span>'+label+'</span>'+(small?'<small>'+small+'</small>':'');const r=el('div','ma-chip-row');w.append(l,r);quick.append(w);return r};
 const moods=row(t.mood,'','ma-mood-block');moods.classList.add('ma-moods');
 const moodDefs=[
   [t.comfort,'mood','cozy comfort watch'],[t.funny,'mood','funny'],[t.intense,'mood','intense and thrilling'],[t.romance,'mood','romantic'],
   [t.smart,'mood','mind-bending'],[t.scary,'mood','scary'],[t.short,'vibe','one sitting short watch'],[t.surprise,'surprise','']
 ];
 moodDefs.forEach(([lab,key,val])=>moods.appendChild(quickChip(lab,key==='surprise'?(!(criteria().mood||[]).length&&!has('vibe','one sitting short watch')):has(key,val),()=>{
   if(key==='surprise')setCriteria({mood:[],vibe:(criteria().vibe||[]).filter(x=>x!=='one sitting short watch')});
   else if(key==='vibe')setCriteria({mood:[],vibe:[val]});
   else setCriteria({mood:[val],vibe:(criteria().vibe||[]).filter(x=>x!=='one sitting short watch')});
   renderQuick(quick);
 },key==='surprise'?'ma-any':'')));
 const formats=row(t.format,'');formats.classList.add('ma-scroll');
 const fdefs=[
   [t.any,'any',''],[t.movie,'cat','movie'],[t.series,'cat','series'],[t.anime,'cat','anime'],
   [t.novela,'cat','novela brasileira'],[t.kids,'kids','kids'],[t.podcast,'cat','podcast']
 ];
 fdefs.forEach(([lab,key,val])=>formats.appendChild(quickChip(lab,key==='any'?!(criteria().cat||[]).length:(key==='kids'?quickKids:has('cat',val)),()=>{
   if(key==='any'){setCriteria({cat:[]});if(quickKids){setCriteria({rating:[]});quickKids=false}}
   else if(key==='kids'){setCriteria({cat:[],rating:['kids']});quickKids=true}
   else{setCriteria({cat:[val]});if(quickKids){setCriteria({rating:[]});quickKids=false}}
   renderQuick(quick);
 },key==='any'?'ma-any':'')));
 const plats=row(t.platform,'');plats.classList.add('ma-scroll');
 const freeVals=['YouTube','Tubi','Pluto TV','Roku Channel'];
 const pdefs=[[t.any,'any',[]],['Netflix','one',['Netflix']],['Prime','one',['Prime Video']],['Max','one',['Max']],['Disney+','one',['Disney+']],['YouTube','one',['YouTube']],[t.free,'group',freeVals]];
 pdefs.forEach(([lab,type,vals])=>plats.appendChild(quickChip(lab,type==='any'?!(criteria().plat||[]).length:(type==='group'?vals.every(v=>has('plat',v)):has('plat',vals[0])),()=>{
   const cur=criteria().plat||[];
   if(type==='any')setCriteria({plat:[]});
   else if(type==='group'){const all=vals.every(v=>cur.includes(v));setCriteria({plat:all?cur.filter(v=>!vals.includes(v)):[...new Set(cur.concat(vals))]})}
   else{const v=vals[0];setCriteria({plat:cur.includes(v)?cur.filter(x=>x!==v):[...cur,v]})}
   renderQuick(quick);
 },type==='any'?'ma-any':'')));
 host.insertBefore(quick,host.firstChild);
}
function renderQuick(root=document){
 qsa('.ma-chip',root).forEach(()=>{});
 const quick=qs('.ma-quick',root)||qs('.ma-quick');if(!quick)return;
 const t=c();
 const maps=[
  ['.ma-moods .ma-chip',[
   has('mood','cozy comfort watch'),has('mood','funny'),has('mood','intense and thrilling'),has('mood','romantic'),
   has('mood','mind-bending'),has('mood','scary'),has('vibe','one sitting short watch'),(!(criteria().mood||[]).length&&!has('vibe','one sitting short watch'))
  ]]
 ];
 maps.forEach(([sel,states])=>qsa(sel,quick).forEach((b,i)=>b.setAttribute('aria-pressed',states[i]?'true':'false')));
 const format=qsa('.ma-filter-row:nth-child(2) .ma-chip',quick);const cat=criteria().cat||[];
 const fs=[!cat.length,cat.includes('movie'),cat.includes('series'),cat.includes('anime'),cat.includes('novela brasileira'),quickKids,cat.includes('podcast')];
 format.forEach((b,i)=>b.setAttribute('aria-pressed',fs[i]?'true':'false'));
 const plat=qsa('.ma-filter-row:nth-child(3) .ma-chip',quick),pv=criteria().plat||[],freeVals=['YouTube','Tubi','Pluto TV','Roku Channel'];
 const ps=[!pv.length,pv.includes('Netflix'),pv.includes('Prime Video'),pv.includes('Max'),pv.includes('Disney+'),pv.includes('YouTube'),freeVals.every(v=>pv.includes(v))];
 plat.forEach((b,i)=>b.setAttribute('aria-pressed',ps[i]?'true':'false'));
}
function syncQuota(target){
 const source=qs('#quota-badge');if(!source||!target)return;
 const paint=()=>{const s=source.textContent.trim();target.textContent=s||'';target.hidden=!s};
 paint();new MutationObserver(paint).observe(source,{childList:true,subtree:true,attributes:true});
}
function mountHome(){
 document.body.classList.add('ma-ia-home','ma-match-tab');
 try{delete document.documentElement.dataset.tiktokIntro}catch(_){}
 const container=qs('section.container');const hero=qs('.home-hero');const form=qs('#questionnaire-box');const search=qs('#search-box');
 if(!container||!hero||!form||!search)return;
 const t=c(),homeTitle=qs('.home-h1',hero),homeSub=qs('.home-h1-sub',hero);if(homeTitle)homeTitle.textContent=t.title;if(homeSub)homeSub.textContent=t.sub;
 // The working header guide is the sole Home onboarding button.
 const concierge=el('section','ma-concierge');concierge.id='ma-concierge';
 const tabs=el('div','ma-tabs');tabs.setAttribute('role','tablist');
 const hints=TAB_HINTS[langKey()]||TAB_HINTS.en;
 const bm=el('button','ma-tab ma-tab-match');bm.type='button';bm.id='ma-tab-match';bm.setAttribute('role','tab');bm.setAttribute('aria-selected','true');bm.setAttribute('data-ma-intent','match');bm.setAttribute('aria-label',t.match+'. '+hints.match);
 bm.append(el('span','ma-tab-title',t.match),el('span','ma-tab-hint',hints.match));
 const ba=el('button','ma-tab ma-tab-ask');ba.type='button';ba.id='ma-tab-ask';ba.setAttribute('role','tab');ba.setAttribute('aria-selected','false');ba.setAttribute('data-ma-intent','ask');ba.setAttribute('aria-label',t.ask+'. '+hints.ask);
 ba.append(el('span','ma-tab-title',t.ask),el('span','ma-tab-hint',hints.ask));
 const pm=el('div','ma-panel');pm.id='ma-panel-match';pm.setAttribute('role','tabpanel');const pa=el('div','ma-panel');pa.id='ma-panel-ask';pa.setAttribute('role','tabpanel');pa.hidden=true;
 tabs.append(bm,ba);concierge.append(tabs,pm,pa);hero.after(concierge);pm.appendChild(form);pa.appendChild(search);
 buildQuick(form);
 const fine=qs('.match-more-filters',form);if(fine&&!qs('.ma-fine-link',fine)){
   const a=el('a','ma-fine-link',window.t?.('filters.exclusions',langKey())||'Exclusions & “not like this” settings →');a.setAttribute('data-i18n','filters.exclusions');a.href='/profile/profile.html';fine.appendChild(a)
 }
 const submit=qs('button[data-i18n="q.submit"]',form);if(submit){submit.textContent=t.find;submit.classList.add('ma-primary')}
 if(!qs('.ma-together-link',pm)){const a=el('a','ma-together-link',t.together);a.href='/together.html';pm.appendChild(a)}
 const input=qs('#specific-search-input',search);if(input)input.placeholder=t.askph;
 const send=qs('button.gold-btn',search);if(send)send.textContent=t.send;
 const qline=el('div','ma-quota-line');qline.hidden=true;pa.appendChild(qline);syncQuota(qline);
 function tab(which){const ask=which==='ask';bm.setAttribute('aria-selected',String(!ask));ba.setAttribute('aria-selected',String(ask));pm.hidden=false;pa.hidden=false;document.body.classList.toggle('ma-match-tab',!ask);document.body.classList.toggle('ma-ask-tab',ask)}
 bm.addEventListener('click',()=>tab('match'));
 // A visible Ask click must reveal a visible composer, including when the
 // concierge fold was previously collapsed on a phone or tablet. Never focus
 // the input here: keyboard/microphone selection belongs to the user.
 ba.addEventListener('click',()=>{
   // A Home installation offer must not cover the user-requested Ask composer.
   // Closing is temporary and does not change their install preferences.
   qs('#ma-install-offer .ma-offer-close')?.click();
   const askSection=qs('#ma-ai-entry')||concierge;
   const fold=askSection.classList.contains('lazy-foldable')&&!askSection.classList.contains('lazy-open');
   const toggle=askSection.previousElementSibling;
   if(fold){
     if(toggle?.classList.contains('lazy-head'))toggle.click();
     else askSection.classList.add('lazy-open');
   }
   tab('ask');
   requestAnimationFrame(()=>{
     if(!pa.hidden&&pa.getClientRects().length){
       const target=qs('#search-box',pa)||pa;
       window.MatchAppActivatedScroll?.toStart(target,{behavior:'auto'}) ?? target.scrollIntoView({behavior:'auto',block:'start'});
     }
   });
 });
 if(new URLSearchParams(location.search).get('ask')==='1'){
   tab('ask');
   setTimeout(()=>openAskFromBrand(),220);
 }
 const loading=qs('#loading-box'),result=qs('#result-box'),trending=qs('#trending-rail'),week=qs('#premiere-disclosure'),swift=qs('#swifties-spotify'),events=qs('#global-events'),how=qs('#how-it-works'),aiExplainer=qs('#ai-concierge-section');
 if(trending){after(hero,trending);after(trending,concierge)}
 // Presentation-only journey: titles → primary action → dynamic News → feature banners.
 // Existing IDs, handlers, matching state and feature logic are preserved.
 let anchor=concierge;[qs('#ebook-matcher-root'),qs('#cooking-home'),loading,result,week,swift,events,how,aiExplainer].forEach(n=>{if(n){after(anchor,n);anchor=n}});
 // Independent, always-visible AI entry; retain the existing composer and listeners.
 const aiEntry=el('section','ma-ai-entry');aiEntry.id='ma-ai-entry';aiEntry.setAttribute('aria-label',t.ask);
 concierge.before(aiEntry);aiEntry.appendChild(pa);pa.hidden=false;
 tabs.hidden=true;tabs.setAttribute('aria-hidden','true');
 pm.removeAttribute('role');pa.removeAttribute('role');
 const aiHeading=qs('h2',search);if(aiHeading){aiHeading.removeAttribute('data-i18n');aiHeading.textContent=t.ask;}
 const ads=qsa('.container>.ad-banner-container',container);ads.forEach(ad=>ad.classList.add('ma-inline-ad'));
 // The Together ad is attached to the entire fold, not relocated with editorial ads.
 // lazy.js injects the fold heading immediately BEFORE .tg-entry at runtime.
 if(ads[2])after(events||swift||anchor,ads[2]);
 const tg=qs('.tg-entry');
 if(tg){
   // Keep the existing Together field immediately below Events in the Home journey.
   if(events)after(events,tg);
   tg.hidden=true;
   const togetherAd=qs('.ma-together-ad',container);
   if(togetherAd)after(tg,togetherAd);
   const togetherHead=qs('.lazy-head[data-fold-key="together"]',container);
   if(togetherHead)tg.before(togetherHead);
 }
 if(trending){
   const h=qs('h4',trending);if(h)h.textContent=t.latest;
   const seen=new Set();qsa('.marquee-item',trending).forEach(card=>{if(card.dataset.loopCopy==='1'||card.getAttribute('aria-hidden')==='true')return;const name=(qs('img',card)?.alt||'').trim().toLowerCase();if(name&&seen.has(name))card.remove();else if(name)seen.add(name)});
 }
 document.addEventListener('matchapp:criteriachange',()=>renderQuick(form));
 document.body.classList.add('ma-ia-ready');
}
function mountDiscover(){
 document.body.classList.add('ma-ia-discover');
 const t=c(),h=qs('.discover-title-copy h1');if(h)h.textContent=t.discover;
 const input=qs('#discover-new-input');if(input){input.placeholder=t.askph;input.removeAttribute('autofocus')}
 const send=qs('.composer-send');if(send)send.textContent=t.send;
 const row=qs('.newsearch-row');if(row&&!qs('.ma-discover-quota',row.parentElement)){
   const q=el('div','ma-discover-quota');q.hidden=true;row.insertAdjacentElement('afterend',q);
   const src=qs('#ai-usage-value');if(src){const paint=()=>{const v=src.textContent.trim();q.textContent=v&&!/checking/i.test(v)?v:'';q.hidden=!q.textContent};paint();new MutationObserver(paint).observe(src,{childList:true,subtree:true})}
 }
 // Keyboard opens only when users explicitly choose to type; microphone stays available.
}
function mountTogether(){
 document.body.classList.add('ma-ia-together');
 const start=qs('#tg-step-start'),how=qs('.tg-how'),hero=qs('.tg-hero');
 if(start&&how&&start.parentNode===how.parentNode)how.parentNode.insertBefore(start,how);
 if(hero){const p=qs('p',hero);if(p)p.style.maxWidth='620px'}
}
function extractPrice(card){
 const badge=(qs('.price-badge',card)?.textContent||'').replace(/\s+/g,' ').trim();if(badge)return badge;
 const text=(card?.textContent||'').replace(/\s+/g,' ');
 const m=text.match(/\$\s*\d+(?:\.\d{1,2})?\s*(?:\/\s*(?:mo|month|yr|year))?/i);
 return m?m[0].replace(/\s+/g,' '):'';
}
// Pricing owns only these authored labels; billing and checkout controls retain their existing owners.
const PRICING_COPY={
  "en": {
    "pageLabel": "MatchApp Ai Pricing",
    "noAccount": "No account",
    "dailyAction": "One Match or Ask uses one daily action",
    "countryGuide": "Country-aware viewing guidance",
    "firstMatch": "No sign-in before your first match",
    "freeProfile": "Free profile",
    "saveHistory": "Save titles and history",
    "privateTaste": "Private taste profile",
    "togetherFeatures": "Match Together and account features",
    "fewerLimits": "Fewer limits",
    "includedActions": "Included actions can be Matches or Asks",
    "vipAdFree": "Ad-free while VIP is active",
    "billingOptions": "Monthly or annual billing",
    "note": "A daily action is either a Match or an Ask. Extra Matches do not buy Asks, and Extra Ask credits do not buy Matches.",
    "adFree": "Ad-free",
    "adFreeDesc": "Remove ads without changing daily allowance.",
    "extraMatches": "Extra matches",
    "extraMatchesDesc": "One-time Match top-ups.",
    "extraAsk": "Extra Ask credits",
    "extraAskDesc": "One-time Ask AI top-ups.",
    "business": "Business",
    "businessDesc": "50 included AI actions daily.",
    "viewOptions": "View options"
  },
  "pt-BR": {
    "pageLabel": "Preços do MatchApp Ai",
    "noAccount": "Sem conta",
    "dailyAction": "Um Match ou uma pergunta à IA usa uma ação diária",
    "countryGuide": "Orientação sobre onde assistir no seu país",
    "firstMatch": "Sem login antes do seu primeiro Match",
    "freeProfile": "Perfil gratuito",
    "saveHistory": "Salve títulos e seu histórico",
    "privateTaste": "Perfil de preferências privado",
    "togetherFeatures": "Match Together e recursos da conta",
    "fewerLimits": "Menos limites",
    "includedActions": "As ações incluídas servem para Matches ou perguntas à IA",
    "vipAdFree": "Sem anúncios enquanto o VIP estiver ativo",
    "billingOptions": "Cobrança mensal ou anual",
    "note": "Uma ação diária é um Match ou uma pergunta à IA. Matches extras não compram perguntas à IA, e créditos extras de IA não compram Matches.",
    "adFree": "Sem anúncios",
    "adFreeDesc": "Remova anúncios sem alterar a cota diária.",
    "extraMatches": "Matches extras",
    "extraMatchesDesc": "Recargas avulsas de Matches.",
    "extraAsk": "Créditos extras de IA",
    "extraAskDesc": "Recargas avulsas para perguntas à IA.",
    "business": "Empresarial",
    "businessDesc": "50 ações de IA incluídas por dia.",
    "viewOptions": "Ver opções"
  },
  "es": {
    "pageLabel": "Precios de MatchApp Ai",
    "noAccount": "Sin cuenta",
    "dailyAction": "Un Match o una pregunta a la IA usa una acción diaria",
    "countryGuide": "Orientación sobre dónde ver según tu país",
    "firstMatch": "No necesitas iniciar sesión para tu primer Match",
    "freeProfile": "Perfil gratuito",
    "saveHistory": "Guarda títulos e historial",
    "privateTaste": "Perfil de preferencias privado",
    "togetherFeatures": "Match Together y funciones de la cuenta",
    "fewerLimits": "Menos límites",
    "includedActions": "Las acciones incluidas sirven para Matches o preguntas a la IA",
    "vipAdFree": "Sin anuncios mientras VIP esté activo",
    "billingOptions": "Facturación mensual o anual",
    "note": "Una acción diaria es un Match o una pregunta a la IA. Los Matches extra no compran preguntas a la IA, y los créditos extra de IA no compran Matches.",
    "adFree": "Sin anuncios",
    "adFreeDesc": "Elimina anuncios sin cambiar la cuota diaria.",
    "extraMatches": "Matches extra",
    "extraMatchesDesc": "Recargas puntuales de Matches.",
    "extraAsk": "Créditos extra de IA",
    "extraAskDesc": "Recargas puntuales para preguntas a la IA.",
    "business": "Empresas",
    "businessDesc": "50 acciones de IA incluidas al día.",
    "viewOptions": "Ver opciones"
  },
  "fr": {
    "pageLabel": "Tarifs de MatchApp Ai",
    "noAccount": "Sans compte",
    "dailyAction": "Un Match ou une question à l’IA utilise une action quotidienne",
    "countryGuide": "Des conseils pour regarder dans votre pays",
    "firstMatch": "Aucune connexion requise pour votre premier Match",
    "freeProfile": "Profil gratuit",
    "saveHistory": "Enregistrez des titres et votre historique",
    "privateTaste": "Profil de préférences privé",
    "togetherFeatures": "Match Together et fonctionnalités du compte",
    "fewerLimits": "Moins de limites",
    "includedActions": "Les actions incluses servent aux Matches ou aux questions à l’IA",
    "vipAdFree": "Sans publicité tant que VIP est actif",
    "billingOptions": "Facturation mensuelle ou annuelle",
    "note": "Une action quotidienne correspond à un Match ou à une question à l’IA. Les Matches supplémentaires n’achètent pas de questions à l’IA, et les crédits IA supplémentaires n’achètent pas de Matches.",
    "adFree": "Sans publicité",
    "adFreeDesc": "Supprimez les publicités sans modifier le quota quotidien.",
    "extraMatches": "Matches supplémentaires",
    "extraMatchesDesc": "Recharges ponctuelles de Matches.",
    "extraAsk": "Crédits IA supplémentaires",
    "extraAskDesc": "Recharges ponctuelles pour les questions à l’IA.",
    "business": "Entreprise",
    "businessDesc": "50 actions IA incluses par jour.",
    "viewOptions": "Voir les options"
  },
  "de": {
    "pageLabel": "MatchApp Ai Preise",
    "noAccount": "Ohne Konto",
    "dailyAction": "Ein Match oder eine KI-Frage verbraucht eine tägliche Aktion",
    "countryGuide": "Hinweise zu Anbietern in deinem Land",
    "firstMatch": "Für dein erstes Match ist keine Anmeldung nötig",
    "freeProfile": "Kostenloses Profil",
    "saveHistory": "Titel und Verlauf speichern",
    "privateTaste": "Privates Vorliebenprofil",
    "togetherFeatures": "Match Together und Kontofunktionen",
    "fewerLimits": "Weniger Grenzen",
    "includedActions": "Inklusive Aktionen gelten für Matches oder KI-Fragen",
    "vipAdFree": "Werbefrei, solange VIP aktiv ist",
    "billingOptions": "Monatliche oder jährliche Abrechnung",
    "note": "Eine tägliche Aktion ist ein Match oder eine KI-Frage. Zusätzliche Matches kaufen keine KI-Fragen, und zusätzliche KI-Guthaben kaufen keine Matches.",
    "adFree": "Werbefrei",
    "adFreeDesc": "Werbung entfernen, ohne das Tageskontingent zu ändern.",
    "extraMatches": "Zusätzliche Matches",
    "extraMatchesDesc": "Einmalige Aufladungen für Matches.",
    "extraAsk": "Zusätzliches KI-Guthaben",
    "extraAskDesc": "Einmalige Aufladungen für KI-Fragen.",
    "business": "Geschäftlich",
    "businessDesc": "50 inklusive KI-Aktionen pro Tag.",
    "viewOptions": "Optionen ansehen"
  },
  "it": {
    "pageLabel": "Prezzi di MatchApp Ai",
    "noAccount": "Senza account",
    "dailyAction": "Un Match o una domanda all’IA usa un’azione giornaliera",
    "countryGuide": "Indicazioni su dove guardare nel tuo paese",
    "firstMatch": "Nessun accesso richiesto per il tuo primo Match",
    "freeProfile": "Profilo gratuito",
    "saveHistory": "Salva titoli e cronologia",
    "privateTaste": "Profilo delle preferenze privato",
    "togetherFeatures": "Match Together e funzioni dell’account",
    "fewerLimits": "Meno limiti",
    "includedActions": "Le azioni incluse servono per Matches o domande all’IA",
    "vipAdFree": "Senza pubblicità finché VIP è attivo",
    "billingOptions": "Fatturazione mensile o annuale",
    "note": "Un’azione giornaliera è un Match o una domanda all’IA. I Matches extra non acquistano domande all’IA e i crediti IA extra non acquistano Matches.",
    "adFree": "Senza pubblicità",
    "adFreeDesc": "Rimuovi gli annunci senza modificare la quota giornaliera.",
    "extraMatches": "Matches extra",
    "extraMatchesDesc": "Ricariche una tantum per Matches.",
    "extraAsk": "Crediti IA extra",
    "extraAskDesc": "Ricariche una tantum per domande all’IA.",
    "business": "Aziendale",
    "businessDesc": "50 azioni IA incluse al giorno.",
    "viewOptions": "Vedi le opzioni"
  },
  "tr": {
    "pageLabel": "MatchApp Ai Fiyatları",
    "noAccount": "Hesap gerekmez",
    "dailyAction": "Bir Match veya yapay zekâ sorusu bir günlük işlem kullanır",
    "countryGuide": "Ülkenize göre izleme rehberliği",
    "firstMatch": "İlk Match için giriş yapmanız gerekmez",
    "freeProfile": "Ücretsiz profil",
    "saveHistory": "Yapımları ve geçmişi kaydedin",
    "privateTaste": "Özel tercih profili",
    "togetherFeatures": "Match Together ve hesap özellikleri",
    "fewerLimits": "Daha az sınır",
    "includedActions": "Dahil işlemler Match veya yapay zekâ soruları için kullanılabilir",
    "vipAdFree": "VIP etkinken reklamsız",
    "billingOptions": "Aylık veya yıllık faturalandırma",
    "note": "Bir günlük işlem, bir Match veya yapay zekâ sorusudur. Ek Match hakları yapay zekâ sorusu satın almaz; ek yapay zekâ kredileri de Match satın almaz.",
    "adFree": "Reklamsız",
    "adFreeDesc": "Günlük kotayı değiştirmeden reklamları kaldırın.",
    "extraMatches": "Ek Match hakları",
    "extraMatchesDesc": "Tek seferlik Match yüklemeleri.",
    "extraAsk": "Ek yapay zekâ kredileri",
    "extraAskDesc": "Yapay zekâ soruları için tek seferlik yüklemeler.",
    "business": "Kurumsal",
    "businessDesc": "Günde 50 yapay zekâ işlemi dahil.",
    "viewOptions": "Seçenekleri görüntüle"
  },
  "ru": {
    "pageLabel": "Тарифы MatchApp Ai",
    "noAccount": "Без аккаунта",
    "dailyAction": "Один Match или вопрос ИИ расходует одно действие в день",
    "countryGuide": "Подсказки о просмотре с учётом вашей страны",
    "firstMatch": "Для первого Match вход не нужен",
    "freeProfile": "Бесплатный профиль",
    "saveHistory": "Сохраняйте названия и историю",
    "privateTaste": "Приватный профиль предпочтений",
    "togetherFeatures": "Match Together и функции аккаунта",
    "fewerLimits": "Меньше ограничений",
    "includedActions": "Включённые действия подходят для Matches и вопросов ИИ",
    "vipAdFree": "Без рекламы, пока активен VIP",
    "billingOptions": "Ежемесячная или ежегодная оплата",
    "note": "Одно ежедневное действие — это Match или вопрос ИИ. Дополнительные Matches не оплачивают вопросы ИИ, а дополнительные кредиты ИИ не оплачивают Matches.",
    "adFree": "Без рекламы",
    "adFreeDesc": "Уберите рекламу без изменения дневного лимита.",
    "extraMatches": "Дополнительные Matches",
    "extraMatchesDesc": "Разовое пополнение Matches.",
    "extraAsk": "Дополнительные кредиты ИИ",
    "extraAskDesc": "Разовое пополнение для вопросов ИИ.",
    "business": "Для бизнеса",
    "businessDesc": "50 включённых действий ИИ в день.",
    "viewOptions": "Посмотреть варианты"
  },
  "ar": {
    "pageLabel": "أسعار MatchApp Ai",
    "noAccount": "دون حساب",
    "dailyAction": "يستهلك كل Match أو سؤال للذكاء الاصطناعي إجراءً يومياً واحداً",
    "countryGuide": "إرشادات للمشاهدة حسب بلدك",
    "firstMatch": "لا يلزم تسجيل الدخول لأول Match",
    "freeProfile": "ملف شخصي مجاني",
    "saveHistory": "احفظ العناوين والسجل",
    "privateTaste": "ملف تفضيلات خاص",
    "togetherFeatures": "Match Together وميزات الحساب",
    "fewerLimits": "قيود أقل",
    "includedActions": "يمكن استخدام الإجراءات المشمولة لطلبات Match أو أسئلة الذكاء الاصطناعي",
    "vipAdFree": "دون إعلانات طوال فترة تفعيل VIP",
    "billingOptions": "فوترة شهرية أو سنوية",
    "note": "الإجراء اليومي هو طلب Match أو سؤال للذكاء الاصطناعي. طلبات Match الإضافية لا تشتري أسئلة للذكاء الاصطناعي، وأرصدة الذكاء الاصطناعي الإضافية لا تشتري طلبات Match.",
    "adFree": "دون إعلانات",
    "adFreeDesc": "أزل الإعلانات دون تغيير الحد اليومي.",
    "extraMatches": "طلبات Match إضافية",
    "extraMatchesDesc": "شحنات منفردة لطلبات Match.",
    "extraAsk": "أرصدة ذكاء اصطناعي إضافية",
    "extraAskDesc": "شحنات منفردة لأسئلة الذكاء الاصطناعي.",
    "business": "للأعمال",
    "businessDesc": "50 إجراء ذكاء اصطناعي مشمولاً يومياً.",
    "viewOptions": "عرض الخيارات"
  },
  "hi": {
    "pageLabel": "MatchApp Ai की कीमतें",
    "noAccount": "खाते की ज़रूरत नहीं",
    "dailyAction": "एक Match या AI सवाल में एक दैनिक कार्रवाई लगती है",
    "countryGuide": "आपके देश के अनुसार देखने की जानकारी",
    "firstMatch": "पहले Match के लिए साइन इन ज़रूरी नहीं",
    "freeProfile": "मुफ़्त प्रोफ़ाइल",
    "saveHistory": "शीर्षक और इतिहास सेव करें",
    "privateTaste": "निजी पसंद प्रोफ़ाइल",
    "togetherFeatures": "Match Together और खाते की सुविधाएँ",
    "fewerLimits": "कम सीमाएँ",
    "includedActions": "शामिल कार्रवाइयों का उपयोग Matches या AI सवालों के लिए करें",
    "vipAdFree": "VIP सक्रिय रहने तक विज्ञापन नहीं",
    "billingOptions": "मासिक या वार्षिक बिलिंग",
    "note": "एक दैनिक कार्रवाई एक Match या AI सवाल है। अतिरिक्त Matches से AI सवाल नहीं खरीदे जाते और अतिरिक्त AI क्रेडिट से Matches नहीं खरीदे जाते।",
    "adFree": "विज्ञापन रहित",
    "adFreeDesc": "दैनिक सीमा बदले बिना विज्ञापन हटाएँ।",
    "extraMatches": "अतिरिक्त Matches",
    "extraMatchesDesc": "एकमुश्त Match टॉप-अप।",
    "extraAsk": "अतिरिक्त AI क्रेडिट",
    "extraAskDesc": "AI सवालों के लिए एकमुश्त टॉप-अप।",
    "business": "व्यावसायिक",
    "businessDesc": "हर दिन 50 AI कार्रवाइयाँ शामिल।",
    "viewOptions": "विकल्प देखें"
  },
  "id": {
    "pageLabel": "Harga MatchApp Ai",
    "noAccount": "Tanpa akun",
    "dailyAction": "Satu Match atau pertanyaan AI memakai satu aksi harian",
    "countryGuide": "Panduan menonton sesuai negara Anda",
    "firstMatch": "Tidak perlu masuk untuk Match pertama",
    "freeProfile": "Profil gratis",
    "saveHistory": "Simpan judul dan riwayat",
    "privateTaste": "Profil selera pribadi",
    "togetherFeatures": "Match Together dan fitur akun",
    "fewerLimits": "Lebih sedikit batasan",
    "includedActions": "Aksi yang termasuk dapat dipakai untuk Match atau pertanyaan AI",
    "vipAdFree": "Bebas iklan selama VIP aktif",
    "billingOptions": "Tagihan bulanan atau tahunan",
    "note": "Satu aksi harian adalah satu Match atau pertanyaan AI. Match tambahan tidak membeli pertanyaan AI, dan kredit AI tambahan tidak membeli Match.",
    "adFree": "Bebas iklan",
    "adFreeDesc": "Hapus iklan tanpa mengubah kuota harian.",
    "extraMatches": "Match tambahan",
    "extraMatchesDesc": "Isi ulang Match sekali bayar.",
    "extraAsk": "Kredit AI tambahan",
    "extraAskDesc": "Isi ulang sekali bayar untuk pertanyaan AI.",
    "business": "Bisnis",
    "businessDesc": "Termasuk 50 aksi AI setiap hari.",
    "viewOptions": "Lihat pilihan"
  },
  "ja": {
    "pageLabel": "MatchApp Ai の料金",
    "noAccount": "アカウント不要",
    "dailyAction": "Match 1回またはAIへの質問1回で、1日のアクションを1回分使います",
    "countryGuide": "お住まいの国に応じた視聴案内",
    "firstMatch": "最初のMatchはログイン不要",
    "freeProfile": "無料プロフィール",
    "saveHistory": "作品と履歴を保存",
    "privateTaste": "非公開の好みプロフィール",
    "togetherFeatures": "Match Together とアカウント機能",
    "fewerLimits": "制限を少なく",
    "includedActions": "含まれるアクションはMatchやAIへの質問に使えます",
    "vipAdFree": "VIPの有効期間中は広告なし",
    "billingOptions": "月払いまたは年払い",
    "note": "1日のアクション1回分は、Match 1回またはAIへの質問1回です。追加MatchではAIへの質問を購入できず、追加AIクレジットではMatchを購入できません。",
    "adFree": "広告なし",
    "adFreeDesc": "1日の利用枠を変えずに広告を非表示にします。",
    "extraMatches": "追加Match",
    "extraMatchesDesc": "Matchを買い切りで追加。",
    "extraAsk": "追加AIクレジット",
    "extraAskDesc": "AIへの質問を買い切りで追加。",
    "business": "ビジネス",
    "businessDesc": "1日50回のAIアクションを含みます。",
    "viewOptions": "選択肢を見る"
  },
  "ko": {
    "pageLabel": "MatchApp Ai 요금",
    "noAccount": "계정 없이 이용",
    "dailyAction": "Match 1회 또는 AI 질문 1회에 일일 작업 1회가 사용됩니다",
    "countryGuide": "거주 국가에 맞는 시청 안내",
    "firstMatch": "첫 Match는 로그인 없이 이용",
    "freeProfile": "무료 프로필",
    "saveHistory": "작품과 기록 저장",
    "privateTaste": "비공개 취향 프로필",
    "togetherFeatures": "Match Together 및 계정 기능",
    "fewerLimits": "더 적은 제한",
    "includedActions": "포함된 작업은 Match 또는 AI 질문에 사용할 수 있습니다",
    "vipAdFree": "VIP 활성 기간에는 광고 없음",
    "billingOptions": "월간 또는 연간 결제",
    "note": "일일 작업 1회는 Match 1회 또는 AI 질문 1회입니다. 추가 Match로 AI 질문을 구매할 수 없으며, 추가 AI 크레딧으로 Match를 구매할 수 없습니다.",
    "adFree": "광고 없음",
    "adFreeDesc": "일일 한도를 바꾸지 않고 광고를 제거합니다.",
    "extraMatches": "추가 Match",
    "extraMatchesDesc": "일회성 Match 충전.",
    "extraAsk": "추가 AI 크레딧",
    "extraAskDesc": "AI 질문을 위한 일회성 충전.",
    "business": "비즈니스",
    "businessDesc": "매일 AI 작업 50회 포함.",
    "viewOptions": "옵션 보기"
  },
  "zh": {
    "pageLabel": "MatchApp Ai 价格",
    "noAccount": "无需账户",
    "dailyAction": "每次 Match 或向 AI 提问都会使用一次每日操作额度",
    "countryGuide": "根据您所在国家提供观看指引",
    "firstMatch": "首次 Match 无需登录",
    "freeProfile": "免费个人资料",
    "saveHistory": "保存作品和历史记录",
    "privateTaste": "私密偏好档案",
    "togetherFeatures": "Match Together 和账户功能",
    "fewerLimits": "更少限制",
    "includedActions": "所含操作额度可用于 Match 或向 AI 提问",
    "vipAdFree": "VIP 有效期间免广告",
    "billingOptions": "按月或按年付费",
    "note": "一次每日操作额度可用于一次 Match 或一次 AI 提问。额外 Match 不能购买 AI 提问，额外 AI 积分也不能购买 Match。",
    "adFree": "免广告",
    "adFreeDesc": "去除广告，不改变每日额度。",
    "extraMatches": "额外 Match",
    "extraMatchesDesc": "一次性充值 Match。",
    "extraAsk": "额外 AI 积分",
    "extraAskDesc": "为 AI 提问进行一次性充值。",
    "business": "商业版",
    "businessDesc": "每天包含 50 次 AI 操作。",
    "viewOptions": "查看选项"
  }
};
function pricingText(key){
 const labels=PRICING_COPY[langKey()];
 return Object.prototype.hasOwnProperty.call(labels,key)?labels[key]:c()[key];
}
function repaintPricingText(node){
 const value=pricingText(node.dataset.maPricingText);
 if(typeof value==='string')node.textContent=(node.dataset.maPricingCount==null?'':node.dataset.maPricingCount+' ')+value;
}
function pricingNode(tag,cls,key,count){
 const node=el(tag,cls);node.dataset.maPricingText=key;
 if(count!=null)node.dataset.maPricingCount=String(count);
 repaintPricingText(node);return node;
}
function applyPricingLanguage(){
 if(!isPricing)return;
 const language=langKey(),direction=language==='ar'?'rtl':'ltr',wrap=qs('.ma-pricing-first');
 if(wrap){wrap.lang=language;wrap.dir=direction;qsa('[data-ma-pricing-text]',wrap).forEach(repaintPricingText);}
 // The deferred page shell creates this nonbrand label after the Pricing owner can mount.
 const label=qs('header.app-header.mh-topbox .mh-head > .mh-tagline');
 if(label){label.textContent=PRICING_COPY[language].pageLabel;label.lang=language;label.dir=direction;}
 const home=qs('header.app-header.mh-topbox #mh-home-btn'),homeLabel=home&&qs('.mh-home-label',home);
 const homeCopy=typeof window.t==='function'?window.t('nav.home'):'';
 if(homeLabel&&typeof homeCopy==='string'&&homeCopy!=='nav.home'){
  const text=homeCopy.replace(/^🏠\uFE0F?\s*/,'').trim();
  if(text){homeLabel.textContent=text;homeLabel.lang=language;homeLabel.dir=direction;home.setAttribute('aria-label',text);home.setAttribute('title',text);}
 }
}
function mountPricing(){
 document.body.classList.add('ma-ia-pricing');
 const monthly=qs('#btn-vip_monthly'),annual=qs('#btn-vip_annual'),adfree=qs('#btn-ad_free'),business=qs('#btn-business');
 if(!monthly||!annual)return;
 const monthlyCard=monthly.closest('article'),annualCard=annual.closest('article'),adCard=adfree?.closest('article'),businessCard=business?.closest('article');
 const grid=monthlyCard?.parentElement;if(!grid)return;grid.classList.add('ma-pricing-old-grid');
 const title=qs('[data-i18n="pricing.title"]'),sub=qs('[data-i18n="pricing.subtitle"]');title?.classList.add('ma-pricing-old-head');sub?.classList.add('ma-pricing-old-head');
 const wrap=el('section','ma-pricing-first'),copy=el('div','ma-pricing-copy');copy.append(pricingNode('h1','','pricingTitle'),pricingNode('p','','pricingSub'));
 const plans=el('div','ma-plan-grid');
 function plan(cls,kicker,name,amount,items){const a=el('article','ma-plan '+cls),list=el('ul');a.append(pricingNode('span','ma-plan-kicker',kicker),pricingNode('h2','',name),pricingNode('div','ma-plan-big','daily',amount));items.forEach(key=>list.appendChild(pricingNode('li','',key)));a.appendChild(list);return a}
 const free=plan('','noAccount','freePlan',3,['dailyAction','countryGuide','firstMatch']);
 const freeCta=pricingNode('a','ma-plan-cta ghost','start');freeCta.href='/#ma-concierge';free.appendChild(freeCta);
 const account=plan('is-account','freeProfile','account',5,['saveHistory','privateTaste','togetherFeatures']);
 const acct=pricingNode('button','ma-plan-cta ghost','join');acct.type='button';acct.addEventListener('click',()=>{if(typeof window.openAuthModal==='function')window.openAuthModal();else location.href='/'});account.appendChild(acct);
 const vip=plan('is-vip','fewerLimits','vip',10,['includedActions','vipAdFree','billingOptions']);
 const toggle=el('div','ma-billing-toggle');const mb=pricingNode('button','','monthly'),ab=pricingNode('button','','annual');mb.type=ab.type='button';mb.setAttribute('aria-pressed','false');ab.setAttribute('aria-pressed','true');toggle.append(mb,ab);
 const price=el('div','ma-plan-big',extractPrice(annualCard)||extractPrice(monthlyCard)||'');
 monthly.removeAttribute('style');annual.removeAttribute('style');monthly.classList.add('ma-vip-checkout');annual.classList.add('ma-vip-checkout');monthly.hidden=true;annual.hidden=false;
 function bill(mode){const isM=mode==='m';mb.setAttribute('aria-pressed',String(isM));ab.setAttribute('aria-pressed',String(!isM));monthly.hidden=!isM;annual.hidden=isM;price.textContent=extractPrice(isM?monthlyCard:annualCard)}
 mb.addEventListener('click',()=>bill('m'));ab.addEventListener('click',()=>bill('a'));vip.append(toggle,price,monthly,annual);
 plans.append(free,account,vip);wrap.append(copy,plans);
 const note=pricingNode('p','ma-pricing-note','note');wrap.appendChild(note);
 const secondary=el('div','ma-secondary-products');
 function secondaryCard(name,desc,node){const a=el('div','ma-secondary-product');a.append(pricingNode('strong','',name),pricingNode('small','',desc));if(node){node.removeAttribute('style');node.classList.remove('gold-btn');a.appendChild(node)}return a}
 if(adfree)secondary.appendChild(secondaryCard('adFree','adFreeDesc',adfree));
 const credits=qs('.credits-section');if(credits&&!credits.id)credits.id='credits';
 const ex=secondaryCard('extraMatches','extraMatchesDesc');const exa=pricingNode('a','','viewOptions');exa.href='#credits';ex.appendChild(exa);secondary.appendChild(ex);
 const ask=secondaryCard('extraAsk','extraAskDesc');const aska=pricingNode('a','','viewOptions');aska.href='#credits';ask.appendChild(aska);secondary.appendChild(ask);
 if(business)secondary.appendChild(secondaryCard('business','businessDesc',business));
 wrap.appendChild(secondary);
 const section=grid.closest('section.container')||grid.parentElement;section.insertBefore(wrap,title||grid);
 applyPricingLanguage();
}
function prepareResponsiveAds(){
 if(!isHome)return;
 const result=qs('#result-box');
 const resultAd=result?qs('.ad-banner-container',result):null;
 if(result&&resultAd){
   resultAd.classList.add('ma-inline-ad','ma-inline-ad-after-result');
   result.insertAdjacentElement('afterend',resultAd);
 }
 qsa('.container .ad-banner-container').forEach((ad,i)=>{
   ad.classList.add('ma-inline-ad','ma-inline-ad-'+(i+1));
   ad.setAttribute('data-ma-ad-position',String(i+1));
 });
 qsa('.sidebar-ad-left,.sidebar-ad-right').forEach((rail,i)=>{
   rail.classList.add('ma-desktop-ad-rail',i===0?'ma-desktop-ad-left':'ma-desktop-ad-right');
 });
}
function applyBrandLocale(){
 const name='MatchApp Ai';
 qsa('.ma-brand-lockup').forEach(brand=>{
  // Only the adult canonical lockups created by this runtime/page-shell.
  const ai=brand.querySelector('[data-ma-brand-ai]');if(!ai)return;
  ai.textContent='Ai';
  brand.setAttribute('aria-label',name);
  const home=brand.querySelector('.ma-brand-home-link');
  if(home)home.setAttribute('aria-label',name+' home');
  const tagline=brand.querySelector('.ma-brand-tagline');
  if(tagline){const lines={en:'Your new Entertainment Ai','pt-BR':'Sua nova IA de entretenimento',es:'Tu nueva Ai de entretenimiento',fr:'Votre nouvelle Ai du divertissement',de:'Deine neue Entertainment-Ai',it:'La tua nuova Ai di intrattenimento',tr:'Yeni eğlence Ai’niz',ru:'Ваш новый ИИ для развлечений',ar:'ذكاؤك الجديد للترفيه',hi:'आपका नया मनोरंजन Ai',id:'Ai hiburan baru Anda',ja:'あなたの新しいエンタメAi',ko:'새로운 엔터테인먼트 Ai',zh:'你的全新娱乐 Ai'};tagline.textContent=lines[langKey()]||lines.en;}
  const word=brand.querySelector('.ma-wordmark');if(word)word.setAttribute('translate','no');
 });
}
function applyLanguage(){
 applyBrandLocale();
 const t=c();
 if(isHome&&qs('.ma-concierge')){
   const quick=qs('.ma-quick');if(quick){quick.remove();buildQuick(qs('#questionnaire-box'));renderQuick();}
   const hero=qs('.home-hero');if(hero){const homeTitle=qs('.home-h1',hero),homeSub=qs('.home-h1-sub',hero);if(homeTitle)homeTitle.textContent=t.title;if(homeSub)homeSub.textContent=t.sub}
   const aiHeading=qs('#search-box h2');if(aiHeading)aiHeading.textContent=t.ask;
   qs('#ma-ai-entry')?.setAttribute('aria-label',t.ask);
   const tabs=qsa('.ma-tab');if(tabs[0])tabs[0].textContent=t.match;if(tabs[1])tabs[1].textContent=t.ask;
   const submit=qs('#questionnaire-box button[data-i18n="q.submit"]');if(submit)submit.textContent=t.find;
   const send=qs('#search-box .gold-btn');if(send)send.textContent=t.send;
   const input=qs('#specific-search-input');if(input)input.placeholder=t.askph;
   const together=qs('.ma-together-link');if(together)together.textContent=t.together;
 }
 if(isDiscover){const h=qs('.discover-title-copy h1');if(h)h.textContent=t.discover;const i=qs('#discover-new-input');if(i)i.placeholder=t.askph;const b=qs('.composer-send');if(b)b.textContent=t.send}
 if(isPricing){paintPricingHeaderMenu();applyPricingLanguage();}
}
function boot(){
 if(!(isHome||isDiscover||isTogether||isPricing))return;
 ensureBrandMeta();brandHeader();applyBrandLocale();paintPricingHeaderMenu();
 if(isHome){
   // Home re-homes several existing sections during boot. Disable browser
   // scroll anchoring for those synchronous moves so first paint can never
   // jump the viewport down to a section that changed position.
   const root=document.documentElement,previousAnchor=root.style.overflowAnchor;
   root.style.overflowAnchor='none';
   prepareResponsiveAds();mountHome();
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
     if(previousAnchor)root.style.overflowAnchor=previousAnchor;
     else root.style.removeProperty('overflow-anchor');
   }));
 }
 if(isDiscover)mountDiscover();if(isTogether)mountTogether();if(isPricing){mountPricing();document.addEventListener('DOMContentLoaded',applyPricingLanguage,{once:true});setTimeout(applyPricingLanguage,0);}
 document.addEventListener('matchapp:langchange',()=>setTimeout(applyLanguage,0));
 if(isHome){
   const revealCanonicalHome=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{
     document.documentElement.classList.remove('ma-ui-preparing');
     if(window.__MATCHAPP_UI_FAILSAFE__){clearTimeout(window.__MATCHAPP_UI_FAILSAFE__);window.__MATCHAPP_UI_FAILSAFE__=0}
   },80)));
   if(document.readyState==='complete')revealCanonicalHome();
   else document.addEventListener('DOMContentLoaded',revealCanonicalHome,{once:true});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

/* Adult UI sound palette. Prefer app.js's shared engine; keep a tiny fallback for shells that omit it. */
let maAudioCtx=null;
function maSoundEnabled(){try{return localStorage.getItem('match_soundEnabled')!=='false'}catch(_){return true}}
function maTone(freq,duration,type='sine',gain=.008,delay=0,endFreq=0){
  if(!maSoundEnabled())return;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  maAudioCtx=maAudioCtx||new AC();const ctx=maAudioCtx;
  if(ctx.state==='suspended')ctx.resume?.().catch?.(()=>{});
  const osc=ctx.createOscillator(),g=ctx.createGain(),start=ctx.currentTime+delay;
  osc.type=type;osc.frequency.setValueAtTime(freq,start);if(endFreq)osc.frequency.exponentialRampToValueAtTime(endFreq,start+duration);
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.001,Math.min(.02,gain)),start+.01);
  g.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(g);g.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.02);
}
function maUISound(kind){
  if(!maSoundEnabled())return;
  if(typeof window.playMatchAppSound==='function'){window.playMatchAppSound(kind);return}
  if(kind==='mic'){maTone(493.88,.07,'sine',.005);maTone(698.46,.09,'sine',.0035,.048);return}
  if(kind==='primary'){maTone(440,.075,'triangle',.008);maTone(659.25,.105,'sine',.006,.04);return}
  if(kind==='select'){maTone(560,.055,'sine',.007);maTone(720,.065,'triangle',.0045,.028);return}
  if(kind==='tab'){maTone(320,.06,'triangle',.006);maTone(480,.07,'sine',.0045,.035);return}
  if(kind==='open'){maTone(285,.07,'sine',.0055);maTone(425,.085,'sine',.004,.04);return}
  if(kind==='share'){maTone(523.25,.065,'triangle',.0065);maTone(783.99,.08,'sine',.005,.045);return}
  if(kind==='save'){maTone(493.88,.065,'sine',.006);maTone(659.25,.09,'sine',.0045,.045);return}
  if(kind==='like'){maTone(523.25,.07,'triangle',.0065);maTone(659.25,.09,'sine',.005,.045);return}
  if(kind==='back'){maTone(420,.065,'triangle',.0055,0,330);return}
  maTone(410,.045,'sine',.006);
}
window.maPlayUISound=maUISound;
document.addEventListener('click',e=>{
  const target=e.target.closest('button,a,[role="button"],summary');
  if(!target||target.matches('.sound-toggle-btn')||target.closest('.app-header'))return;
  let kind='tap';
  if(target.matches('.mic-btn,.jh-mic,#mic-btn-discover,#mic-button,[data-action="mic"]'))kind='mic';
  else if(target.matches('.share-cta,[id*="share"],[data-action="share"]'))kind='share';
  else if(target.matches('#btn-loved-it,[data-action="like"]'))kind='like';
  else if(target.matches('#btn-watch-later,#btn-seen-it,[data-action="save"]'))kind='save';
  else if(target.matches('#btn-not-for-me,.rematch-btn,[data-action="back"]'))kind='back';
  else if(target.matches('.ma-primary,.gold-btn,.ma-plan-cta,.composer-send,[data-i18n="q.submit"]'))kind='primary';
  else if(target.matches('.ma-chip,.crit-chip'))kind='select';
  else if(target.matches('.ma-tab,.ma-billing-toggle button'))kind='tab';
  else if(target.matches('summary,.crit-toggle,.ma-menu-button'))kind='open';
  maUISound(kind);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&target.animate){
    target.animate([{transform:'scale(1)'},{transform:'scale(.965)'},{transform:'scale(1.018)'},{transform:'scale(1)'}],{duration:180,easing:'cubic-bezier(.2,.9,.25,1.2)'});
  }
},{passive:true});

})();
