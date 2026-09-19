/* MatchApp IA 2026 — presentation-only information architecture.
   Reuses existing MatchApp functions and DOM ids; no quota/auth/payment/matching rule changes. */
(function(){
'use strict';
const BRAND='/assets/brand/brandkit/logo-horizontal.svg?v=20260919-brand1';
const ICON='/assets/brand/brandkit/matchapp-orb-live.svg?v=20260919-orb1';
const path=(location.pathname||'/').replace(/\/+$/,'')||'/';
const isHome=path==='/'||path==='/index.html';
const isDiscover=path==='/discover.html';
const isTogether=path==='/together.html';
const isPricing=path==='/pricing'||path==='/pricing/pricing.html';

const COPY={
 en:{title:'What should you watch tonight?',sub:'Pick a mood. Get one title and where it plays.',match:'🍿 Pick My Night',ask:'✨ Chat with Ai',mood:'Mood',format:'Format',platform:'Platform',fine:'Fine-tune',find:'Find something to watch',together:'Watching with someone? Match Together',send:'Send',quota:'Included actions left today',askph:'Ask what to watch, where it plays, or anything about a title…',comfort:'Comfort',funny:'Funny',intense:'Intense',romance:'Romance',smart:'Smart',scary:'Scary',short:'Something short',surprise:'Surprise me',any:'Any',movie:'Movie',series:'Series',anime:'Anime',novela:'Novela',kids:'Kids',podcast:'Podcast',free:'Free',latest:'Latest titles',discover:'Ask MatchApp',pricingTitle:'Watch with fewer limits.',pricingSub:'One daily action is either a Match or an Ask. Top-ups stay separate.',freePlan:'Free',account:'Account',vip:'VIP',daily:'included AI actions daily',monthly:'Monthly',annual:'Annual',start:'Start matching',join:'Create free account'},
 'pt-BR':{title:'O que você deve assistir hoje?',sub:'Escolha um clima. Receba um título e onde assistir.',match:'🍿 Escolha Minha Noite',ask:'✨ Fale com a Ai',mood:'Clima',format:'Formato',platform:'Plataforma',fine:'Ajustar',find:'Encontrar algo para assistir',together:'Vai assistir com alguém? Match Together',send:'Enviar',quota:'Ações incluídas restantes hoje',askph:'Pergunte o que assistir, onde passa ou qualquer coisa sobre um título…',comfort:'Conforto',funny:'Engraçado',intense:'Intenso',romance:'Romance',smart:'Inteligente',scary:'Assustador',short:'Algo curto',surprise:'Surpreenda-me',any:'Qualquer',movie:'Filme',series:'Série',anime:'Anime',novela:'Novela',kids:'Kids',podcast:'Podcast',free:'Grátis',latest:'Títulos recentes',discover:'Pergunte ao MatchApp',pricingTitle:'Assista com menos limites.',pricingSub:'Uma ação diária é um Match ou uma pergunta. Recargas continuam separadas.',freePlan:'Grátis',account:'Conta',vip:'VIP',daily:'ações de IA incluídas por dia',monthly:'Mensal',annual:'Anual',start:'Começar',join:'Criar conta grátis'},
 es:{title:'¿Qué deberías ver esta noche?',sub:'Elige un ánimo. Recibe un título y dónde verlo.',match:'🍿 Elige Mi Noche',ask:'✨ Chatea con la Ai',mood:'Ánimo',format:'Formato',platform:'Plataforma',fine:'Afinar',find:'Encontrar algo para ver',together:'¿Ves con alguien? Match Together',send:'Enviar',quota:'Acciones incluidas restantes hoy',askph:'Pregunta qué ver, dónde está o cualquier cosa sobre un título…',comfort:'Confort',funny:'Divertido',intense:'Intenso',romance:'Romance',smart:'Inteligente',scary:'Terror',short:'Algo corto',surprise:'Sorpréndeme',any:'Cualquiera',movie:'Película',series:'Serie',anime:'Anime',novela:'Telenovela',kids:'Niños',podcast:'Podcast',free:'Gratis',latest:'Títulos recientes',discover:'Pregunta a MatchApp',pricingTitle:'Mira con menos límites.',pricingSub:'Una acción diaria es un Match o una pregunta. Las recargas son separadas.',freePlan:'Gratis',account:'Cuenta',vip:'VIP',daily:'acciones de IA incluidas al día',monthly:'Mensual',annual:'Anual',start:'Empezar',join:'Crear cuenta gratis'},
 fr:{title:'Que regarder ce soir ?',sub:'Choisissez une humeur. Obtenez un titre et où le voir.',match:'🍿 Choisis Ma Soirée',ask:'✨ Parler à l’Ai',mood:'Humeur',format:'Format',platform:'Plateforme',fine:'Affiner',find:'Trouver quelque chose à regarder',together:'Vous regardez à deux ? Match Together',send:'Envoyer',quota:"Actions incluses restantes aujourd'hui",askph:'Demandez quoi regarder, où le voir ou tout sur un titre…',comfort:'Réconfort',funny:'Drôle',intense:'Intense',romance:'Romance',smart:'Malin',scary:'Effrayant',short:'Quelque chose de court',surprise:'Surprenez-moi',any:'Tous',movie:'Film',series:'Série',anime:'Anime',novela:'Novela',kids:'Kids',podcast:'Podcast',free:'Gratuit',latest:'Titres récents',discover:'Demander à MatchApp',pricingTitle:'Regardez avec moins de limites.',pricingSub:'Une action quotidienne est un Match ou une question. Les recharges restent séparées.',freePlan:'Gratuit',account:'Compte',vip:'VIP',daily:'actions IA incluses par jour',monthly:'Mensuel',annual:'Annuel',start:'Commencer',join:'Créer un compte'},
 de:{title:'Was solltest du heute Abend schauen?',sub:'Stimmung wählen. Einen Titel plus Anbieter bekommen.',match:'🍿 Mein Abend-Pick',ask:'✨ Mit Ai chatten',mood:'Stimmung',format:'Format',platform:'Plattform',fine:'Feinabstimmen',find:'Etwas zum Anschauen finden',together:'Mit jemandem schauen? Match Together',send:'Senden',quota:'Inklusive Aktionen heute übrig',askph:'Frag, was du schauen sollst, wo es läuft oder nach einem Titel…',comfort:'Gemütlich',funny:'Lustig',intense:'Intensiv',romance:'Romantik',smart:'Clever',scary:'Gruselig',short:'Etwas Kurzes',surprise:'Überrasch mich',any:'Alle',movie:'Film',series:'Serie',anime:'Anime',novela:'Novela',kids:'Kids',podcast:'Podcast',free:'Kostenlos',latest:'Neue Titel',discover:'MatchApp fragen',pricingTitle:'Schauen mit weniger Limits.',pricingSub:'Eine tägliche Aktion ist Match oder Ask. Aufladungen bleiben getrennt.',freePlan:'Kostenlos',account:'Konto',vip:'VIP',daily:'inklusive KI-Aktionen täglich',monthly:'Monatlich',annual:'Jährlich',start:'Starten',join:'Kostenloses Konto'},
 it:{title:'Cosa dovresti guardare stasera?',sub:'Scegli un umore. Ottieni un titolo e dove guardarlo.',match:'🍿 Scegli la Mia Serata',ask:'✨ Chatta con Ai',mood:'Umore',format:'Formato',platform:'Piattaforma',fine:'Affina',find:'Trova qualcosa da guardare',together:'Guardate insieme? Match Together',send:'Invia',quota:'Azioni incluse rimaste oggi',askph:'Chiedi cosa guardare, dove si trova o qualsiasi cosa su un titolo…',comfort:'Comfort',funny:'Divertente',intense:'Intenso',romance:'Romantico',smart:'Intelligente',scary:'Paura',short:'Qualcosa di breve',surprise:'Sorprendimi',any:'Qualsiasi',movie:'Film',series:'Serie',anime:'Anime',novela:'Novela',kids:'Kids',podcast:'Podcast',free:'Gratis',latest:'Titoli recenti',discover:'Chiedi a MatchApp',pricingTitle:'Guarda con meno limiti.',pricingSub:'Un’azione giornaliera è un Match o una domanda. Le ricariche restano separate.',freePlan:'Gratis',account:'Account',vip:'VIP',daily:'azioni IA incluse al giorno',monthly:'Mensile',annual:'Annuale',start:'Inizia',join:'Crea account gratis'},
 tr:{title:'Bu gece ne izlemelisin?',sub:'Bir ruh hali seç. Tek bir yapım ve nerede olduğunu al.',match:'🍿 Gecemi Seç',ask:'✨ Ai ile Sohbet',mood:'Ruh hali',format:'Format',platform:'Platform',fine:'İnce ayar',find:'İzleyecek bir şey bul',together:'Biriyle mi izliyorsun? Match Together',send:'Gönder',quota:'Bugün kalan dahil işlemler',askph:'Ne izlemeli, nerede var veya bir yapım hakkında sor…',comfort:'Rahat',funny:'Komik',intense:'Yoğun',romance:'Romantik',smart:'Zeki',scary:'Korkutucu',short:'Kısa bir şey',surprise:'Şaşırt beni',any:'Fark etmez',movie:'Film',series:'Dizi',anime:'Anime',novela:'Novela',kids:'Çocuk',podcast:'Podcast',free:'Ücretsiz',latest:'Yeni başlıklar',discover:'MatchApp’e sor',pricingTitle:'Daha az sınırla izle.',pricingSub:'Günlük bir işlem Match veya Ask’tir. Ek paketler ayrıdır.',freePlan:'Ücretsiz',account:'Hesap',vip:'VIP',daily:'günlük dahil AI işlemi',monthly:'Aylık',annual:'Yıllık',start:'Başla',join:'Ücretsiz hesap'},
 ru:{title:'Что посмотреть сегодня вечером?',sub:'Выберите настроение. Получите один вариант и где смотреть.',match:'Подобрать',ask:'Спросить',mood:'Настроение',format:'Формат',platform:'Платформа',fine:'Уточнить',find:'Найти что посмотреть',together:'Смотрите вместе? Match Together',send:'Отправить',quota:'Осталось включённых действий сегодня',askph:'Спросите, что смотреть, где доступно или о любом названии…',comfort:'Уютное',funny:'Смешное',intense:'Напряжённое',romance:'Романтика',smart:'Умное',scary:'Страшное',short:'Что-то короткое',surprise:'Удиви меня',any:'Любой',movie:'Фильм',series:'Сериал',anime:'Аниме',novela:'Новелла',kids:'Детям',podcast:'Подкаст',free:'Бесплатно',latest:'Новые тайтлы',discover:'Спросить MatchApp',pricingTitle:'Смотрите с меньшими ограничениями.',pricingSub:'Одно дневное действие — Match или Ask. Дополнения раздельны.',freePlan:'Бесплатно',account:'Аккаунт',vip:'VIP',daily:'действий ИИ в день',monthly:'Месяц',annual:'Год',start:'Начать',join:'Создать аккаунт'},
 ar:{title:'ماذا تشاهد الليلة؟',sub:'اختر مزاجاً. احصل على عنوان واحد ومكان مشاهدته.',match:'اختر لي',ask:'اسأل',mood:'المزاج',format:'النوع',platform:'المنصة',fine:'تخصيص',find:'اعثر على شيء للمشاهدة',together:'تشاهد مع شخص؟ Match Together',send:'إرسال',quota:'الإجراءات المتبقية اليوم',askph:'اسأل ماذا تشاهد أو أين يعرض أو عن أي عنوان…',comfort:'مريح',funny:'مضحك',intense:'مكثف',romance:'رومانسي',smart:'ذكي',scary:'مخيف',short:'شيء قصير',surprise:'فاجئني',any:'أي',movie:'فيلم',series:'مسلسل',anime:'أنمي',novela:'نوفيلّا',kids:'أطفال',podcast:'بودكاست',free:'مجاني',latest:'أحدث العناوين',discover:'اسأل MatchApp',pricingTitle:'شاهد بقيود أقل.',pricingSub:'الإجراء اليومي هو Match أو Ask. الإضافات منفصلة.',freePlan:'مجاني',account:'حساب',vip:'VIP',daily:'إجراءات ذكاء اصطناعي يومياً',monthly:'شهري',annual:'سنوي',start:'ابدأ',join:'إنشاء حساب'},
 hi:{title:'आज रात क्या देखें?',sub:'मूड चुनें। एक शीर्षक और कहाँ देखें, पाएँ।',match:'मेरे लिए चुनें',ask:'पूछें',mood:'मूड',format:'फ़ॉर्मैट',platform:'प्लेटफ़ॉर्म',fine:'और चुनें',find:'देखने के लिए कुछ खोजें',together:'किसी के साथ देख रहे हैं? Match Together',send:'भेजें',quota:'आज की बची शामिल कार्रवाइयाँ',askph:'क्या देखें, कहाँ मिलता है या किसी शीर्षक के बारे में पूछें…',comfort:'आरामदायक',funny:'मज़ेदार',intense:'तीव्र',romance:'रोमांस',smart:'स्मार्ट',scary:'डरावना',short:'कुछ छोटा',surprise:'सरप्राइज़',any:'कोई भी',movie:'फ़िल्म',series:'सीरीज़',anime:'एनीमे',novela:'नोवेला',kids:'किड्स',podcast:'पॉडकास्ट',free:'मुफ़्त',latest:'नए शीर्षक',discover:'MatchApp से पूछें',pricingTitle:'कम सीमाओं के साथ देखें।',pricingSub:'एक दैनिक कार्रवाई Match या Ask है। टॉप-अप अलग हैं।',freePlan:'मुफ़्त',account:'खाता',vip:'VIP',daily:'AI कार्रवाइयाँ प्रतिदिन',monthly:'मासिक',annual:'वार्षिक',start:'शुरू करें',join:'मुफ़्त खाता'},
 id:{title:'Mau nonton apa malam ini?',sub:'Pilih suasana. Dapatkan satu judul dan tempat menontonnya.',match:'Pilihkan',ask:'Tanya',mood:'Suasana',format:'Format',platform:'Platform',fine:'Atur lagi',find:'Cari tontonan',together:'Nonton bersama? Match Together',send:'Kirim',quota:'Aksi termasuk yang tersisa hari ini',askph:'Tanya mau nonton apa, di mana tersedia, atau tentang judul apa pun…',comfort:'Nyaman',funny:'Lucu',intense:'Intens',romance:'Romantis',smart:'Cerdas',scary:'Seram',short:'Yang singkat',surprise:'Kejutkan saya',any:'Apa saja',movie:'Film',series:'Serial',anime:'Anime',novela:'Novela',kids:'Anak',podcast:'Podcast',free:'Gratis',latest:'Judul terbaru',discover:'Tanya MatchApp',pricingTitle:'Nonton dengan batas lebih sedikit.',pricingSub:'Satu aksi harian adalah Match atau Ask. Top-up tetap terpisah.',freePlan:'Gratis',account:'Akun',vip:'VIP',daily:'aksi AI termasuk per hari',monthly:'Bulanan',annual:'Tahunan',start:'Mulai',join:'Buat akun gratis'},
 ja:{title:'今夜は何を見る？',sub:'気分を選ぶだけ。1作品と視聴先を提案します。',match:'選んで',ask:'質問',mood:'気分',format:'形式',platform:'サービス',fine:'細かく指定',find:'見るものを決める',together:'誰かと見る？ Match Together',send:'送信',quota:'今日の残りアクション',askph:'何を見るか、どこで見られるか、作品について質問…',comfort:'ほっこり',funny:'笑える',intense:'刺激的',romance:'ロマンス',smart:'知的',scary:'怖い',short:'短め',surprise:'おまかせ',any:'指定なし',movie:'映画',series:'シリーズ',anime:'アニメ',novela:'ノベラ',kids:'キッズ',podcast:'ポッドキャスト',free:'無料',latest:'最新タイトル',discover:'MatchAppに質問',pricingTitle:'制限を減らして楽しむ。',pricingSub:'1日の1アクションはMatchまたはAsk。追加分は別です。',freePlan:'無料',account:'アカウント',vip:'VIP',daily:'1日のAIアクション',monthly:'月額',annual:'年額',start:'始める',join:'無料アカウント'},
 ko:{title:'오늘 밤 뭐 볼까요?',sub:'기분을 고르면 한 작품과 시청처를 알려드려요.',match:'골라줘',ask:'질문',mood:'기분',format:'형식',platform:'플랫폼',fine:'세부 설정',find:'볼거리 찾기',together:'함께 보나요? Match Together',send:'보내기',quota:'오늘 남은 포함 작업',askph:'무엇을 볼지, 어디서 보는지, 작품에 대해 물어보세요…',comfort:'편안한',funny:'웃긴',intense:'강렬한',romance:'로맨스',smart:'똑똑한',scary:'무서운',short:'짧은 것',surprise:'추천해줘',any:'상관없음',movie:'영화',series:'시리즈',anime:'애니',novela:'노벨라',kids:'키즈',podcast:'팟캐스트',free:'무료',latest:'최신 타이틀',discover:'MatchApp에 질문',pricingTitle:'더 적은 제한으로 감상하세요.',pricingSub:'하루 1회 작업은 Match 또는 Ask입니다. 추가 구매는 별도입니다.',freePlan:'무료',account:'계정',vip:'VIP',daily:'일일 포함 AI 작업',monthly:'월간',annual:'연간',start:'시작',join:'무료 계정'},
 zh:{title:'今晚看什么？',sub:'选一个心情。得到一个片名和观看平台。',match:'帮我选',ask:'提问',mood:'心情',format:'类型',platform:'平台',fine:'细调',find:'找点好看的',together:'和别人一起看？Match Together',send:'发送',quota:'今天剩余包含次数',askph:'问看什么、在哪里看，或任何片名相关问题…',comfort:'治愈',funny:'搞笑',intense:'刺激',romance:'浪漫',smart:'烧脑',scary:'恐怖',short:'短一点',surprise:'给我惊喜',any:'不限',movie:'电影',series:'剧集',anime:'动漫',novela:'肥皂剧',kids:'儿童',podcast:'播客',free:'免费',latest:'最新内容',discover:'问 MatchApp',pricingTitle:'少一点限制，多一点观看。',pricingSub:'每日一次操作是 Match 或 Ask。加购额度分别计算。',freePlan:'免费',account:'账户',vip:'VIP',daily:'每日包含 AI 操作',monthly:'月付',annual:'年付',start:'开始',join:'免费注册'}
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
 const profile=qs('#profile-link-tab');
 const signed=!!(profile&&getComputedStyle(profile).display!=='none');
 document.body.classList.toggle('ma-guest',!signed);
 document.body.classList.toggle('ma-signed-in',signed);
}
function ensureBrandMeta(){
 let fav=qs('link[rel="icon"]');if(!fav){fav=document.createElement('link');fav.rel='icon';document.head.appendChild(fav)}
 fav.href=ICON;fav.type='image/svg+xml';
 const tc=qs('meta[name="theme-color"]');if(tc)tc.content='#071326';
}
function openAskFromBrand(){
 if(!isHome){location.href='/?ask=1#ma-concierge';return}
 const ask=qs('#ma-tab-ask'),card=qs('#ma-concierge');
 if(ask)safeClick(ask);
 if(card)card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
 setTimeout(()=>{
   const input=qs('#specific-search-input');
   if(input){input.focus({preventScroll:true});input.classList.add('ma-ai-focus-pulse');setTimeout(()=>input.classList.remove('ma-ai-focus-pulse'),2200)}
   let cue=qs('.ma-ai-prompt-hint');
   if(!cue&&card){cue=el('div','ma-ai-prompt-hint','Type your request here to start a new chat with MatchApp Ai.');cue.setAttribute('role','status');card.appendChild(cue)}
   if(cue){cue.hidden=false;cue.classList.remove('is-showing');requestAnimationFrame(()=>cue.classList.add('is-showing'));setTimeout(()=>{cue.classList.remove('is-showing');setTimeout(()=>cue.hidden=true,240)},4200)}
   if(window.maPlayUISound)window.maPlayUISound('share');
 },180);
}
function brandHeader(){
 const h=qs('header.app-header');if(!h)return;
 h.classList.add('ma-global-header');
 let brand=qs('#home-brand-lockup',h)||qs('.header-brand-area',h)||qs('.matchapp-brand-link',h);
 if(brand&&brand.tagName==='A'){
   const host=el('div',brand.className);if(brand.id)host.id=brand.id;brand.replaceWith(host);brand=host;
 }
 if(brand){
   brand.classList.add('ma-brand-stage');
   brand.innerHTML=
     '<div class="ma-brand-lockup" aria-label="MatchApp TV Ai">'+
       '<a class="ma-brand-home-link" href="/" aria-label="MatchApp TV home">'+
         '<span class="ma-brand-orb-stage" aria-hidden="true">'+
           '<img class="ma-brand-orb" src="'+ICON+'" alt="" width="260" height="260">'+
           '<span class="ma-orbit ma-orbit-a"></span><span class="ma-orbit ma-orbit-b"></span>'+
           '<span class="ma-orb-star ma-orb-star-a">✦</span><span class="ma-orb-star ma-orb-star-b">✧</span><span class="ma-orb-star ma-orb-star-c">✦</span>'+
         '</span>'+
         '<span class="ma-brand-copy"><span class="ma-wordmark"><span class="ma-word-match">Match</span><span class="ma-word-app">App</span></span><span class="ma-tv">TV</span></span>'+
       '</a>'+
       '<button type="button" class="ma-ai-brand-button" aria-label="Start a new chat with MatchApp Ai" title="Ask MatchApp Ai">'+
         '<span class="ma-ai-letters">Ai</span><span class="ma-ai-star ma-ai-star-one" aria-hidden="true">✦</span><span class="ma-ai-star ma-ai-star-two" aria-hidden="true">✧</span><span class="ma-ai-star ma-ai-star-three" aria-hidden="true">✦</span>'+
       '</button>'+
     '</div>';
   const ai=qs('.ma-ai-brand-button',brand);if(ai)ai.addEventListener('click',openAskFromBrand);
 }
 const nav=qs('nav',h);if(!nav)return;
 nav.classList.add('ma-header-actions');
 if(!qs('.ma-country-link',nav)){
   const a=el('a','ma-country-link');a.href='/profile/profile.html';a.title='Viewing country';
   const name=countryName();a.innerHTML='<span aria-hidden="true">🌍</span><span>'+(name||'Country')+'</span>';
   const lang=qs('#lang-switcher-host',nav);nav.insertBefore(a,lang||nav.firstChild);
 }
 if(!qs('.ma-menu-wrap',nav)){
   const wrap=el('div','ma-menu-wrap');
   const btn=el('button','ma-menu-button');btn.type='button';btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Zm8.2 4.9v-2.2l-2.3-.8a7 7 0 0 0-.6-1.5l1-2.2-1.6-1.6-2.2 1a7 7 0 0 0-1.5-.6L12.2 3H10l-.8 2.3a7 7 0 0 0-1.5.6l-2.2-1-1.6 1.6 1 2.2a7 7 0 0 0-.6 1.5L2 11v2.2l2.3.8a7 7 0 0 0 .6 1.5l-1 2.2 1.6 1.6 2.2-1a7 7 0 0 0 1.5.6l.8 2.3h2.2l.8-2.3a7 7 0 0 0 1.5-.6l2.2 1 1.6-1.6-1-2.2a7 7 0 0 0 .6-1.5l2.3-.8Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg><span>Settings</span>';btn.setAttribute('aria-label','Settings and preferences');btn.setAttribute('title','Settings and preferences');btn.setAttribute('aria-expanded','false');
   const menu=el('div','ma-menu');menu.hidden=true;menu.setAttribute('role','menu');
   function link(label,href,icon){const a=el('a','',icon+' '+label);a.href=href;a.setAttribute('role','menuitem');return a}
   function action(label,icon,fn){const b=el('button','',icon+' '+label);b.type='button';b.setAttribute('role','menuitem');b.addEventListener('click',()=>{fn();close()});return b}
   menu.append(
     action('Download app','↓',()=>{const b=qs('.install-btn');if(b&&getComputedStyle(b).display!=='none')safeClick(b);else location.href='/android/'}),
     action('Theme','◐',()=>{const b=qs('[data-theme-toggle],.theme-toggle,.theme-btn');if(b)safeClick(b);else location.href='/profile/profile.html'}),
     action('Lazy Mode','⚡',()=>{const b=qs('.lazy-toggle');if(b)safeClick(b)}),
     link('Kids Mode','/kids/','★'),
     action('Daily check-in','✓',()=>{document.body.classList.add('ma-checkin-open');const box=qs('#daily-match-checkin');if(box){box.style.display='block';box.scrollIntoView({behavior:'smooth',block:'center'})}}),
     link('Pricing','/pricing/pricing.html','♢'),
     link('Profile','/profile/profile.html','◉')
   );
   btn.addEventListener('click',()=>{menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',String(!menu.hidden))});
   function close(){menu.hidden=true;btn.setAttribute('aria-expanded','false')}
   document.addEventListener('click',e=>{if(!wrap.contains(e.target))close()});
   wrap.append(btn,menu);nav.appendChild(wrap);
 }
 syncHeaderAuth();
 if(!h.dataset.maAuthObserved){
   h.dataset.maAuthObserved='1';
   new MutationObserver(()=>syncHeaderAuth()).observe(h,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
 }
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
 const intro=qs('#matchapp-tiktok-intro');if(intro)intro.hidden=true;
 const container=qs('section.container');const hero=qs('.home-hero');const form=qs('#questionnaire-box');const search=qs('#search-box');
 if(!container||!hero||!form||!search)return;
 const t=c();qs('.home-h1',hero).textContent=t.title;qs('.home-h1-sub',hero).textContent=t.sub;
 const concierge=el('section','ma-concierge');concierge.id='ma-concierge';
 const tabs=el('div','ma-tabs');tabs.setAttribute('role','tablist');
 const bm=el('button','ma-tab',t.match);bm.type='button';bm.id='ma-tab-match';bm.setAttribute('role','tab');bm.setAttribute('aria-selected','true');
 const ba=el('button','ma-tab',t.ask);ba.type='button';ba.id='ma-tab-ask';ba.setAttribute('role','tab');ba.setAttribute('aria-selected','false');
 const pm=el('div','ma-panel');pm.id='ma-panel-match';pm.setAttribute('role','tabpanel');const pa=el('div','ma-panel');pa.id='ma-panel-ask';pa.setAttribute('role','tabpanel');pa.hidden=true;
 tabs.append(bm,ba);concierge.append(tabs,pm,pa);hero.after(concierge);pm.appendChild(form);pa.appendChild(search);
 buildQuick(form);
 const fine=qs('.match-more-filters',form);if(fine&&!qs('.ma-fine-link',fine)){
   const a=el('a','ma-fine-link','Exclusions & “not like this” settings →');a.href='/profile/profile.html';fine.appendChild(a)
 }
 const submit=qs('button[data-i18n="q.submit"]',form);if(submit){submit.textContent=t.find;submit.classList.add('ma-primary')}
 if(!qs('.ma-together-link',pm)){const a=el('a','ma-together-link',t.together);a.href='/together.html';pm.appendChild(a)}
 const input=qs('#specific-search-input',search);if(input)input.placeholder=t.askph;
 const send=qs('button.gold-btn',search);if(send)send.textContent=t.send;
 const qline=el('div','ma-quota-line');qline.hidden=true;pa.appendChild(qline);syncQuota(qline);
 function tab(which){const ask=which==='ask';bm.setAttribute('aria-selected',String(!ask));ba.setAttribute('aria-selected',String(ask));pm.hidden=ask;pa.hidden=!ask;document.body.classList.toggle('ma-match-tab',!ask);document.body.classList.toggle('ma-ask-tab',ask);if(ask)setTimeout(()=>input?.focus(),80)}
 bm.addEventListener('click',()=>tab('match'));ba.addEventListener('click',()=>tab('ask'));
 if(new URLSearchParams(location.search).get('ask')==='1'){
   tab('ask');
   setTimeout(()=>openAskFromBrand(),220);
 }
 const loading=qs('#loading-box'),result=qs('#result-box'),trending=qs('#trending-rail'),week=qs('#premiere-disclosure'),events=qs('#global-events');
 if(trending){after(hero,trending);after(trending,concierge)}
 let anchor=concierge;[loading,result,week,events].forEach(n=>{if(n){after(anchor,n);anchor=n}});
 const ad=qsa('.container>.ad-banner-container',container)[0];if(ad&&anchor)after(anchor,ad);
 const tg=qs('.tg-entry');if(tg)tg.hidden=true;
 if(trending){
   const h=qs('h4',trending);if(h)h.textContent=t.latest;
   const seen=new Set();qsa('.marquee-item',trending).forEach(card=>{const name=(qs('img',card)?.alt||'').trim().toLowerCase();if(name&&seen.has(name))card.remove();else if(name)seen.add(name)});
 }
 document.addEventListener('matchapp:criteriachange',()=>renderQuick(form));
 document.body.classList.add('ma-ia-ready');
}
function mountDiscover(){
 document.body.classList.add('ma-ia-discover');
 const t=c(),h=qs('.discover-title-copy h1');if(h)h.textContent=t.discover;
 const input=qs('#discover-new-input');if(input){input.placeholder=t.askph;input.setAttribute('autofocus','')}
 const send=qs('.composer-send');if(send)send.textContent=t.send;
 const row=qs('.newsearch-row');if(row&&!qs('.ma-discover-quota',row.parentElement)){
   const q=el('div','ma-discover-quota');q.hidden=true;row.insertAdjacentElement('afterend',q);
   const src=qs('#ai-usage-value');if(src){const paint=()=>{const v=src.textContent.trim();q.textContent=v&&!/checking/i.test(v)?v:'';q.hidden=!q.textContent};paint();new MutationObserver(paint).observe(src,{childList:true,subtree:true})}
 }
 const log=qs('#chat-log');if(log&&!log.children.length)setTimeout(()=>input?.focus(),180);
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
function mountPricing(){
 document.body.classList.add('ma-ia-pricing');const t=c();
 const monthly=qs('#btn-vip_monthly'),annual=qs('#btn-vip_annual'),adfree=qs('#btn-ad_free'),business=qs('#btn-business');
 if(!monthly||!annual)return;
 const monthlyCard=monthly.closest('article'),annualCard=annual.closest('article'),adCard=adfree?.closest('article'),businessCard=business?.closest('article');
 const grid=monthlyCard?.parentElement;if(!grid)return;grid.classList.add('ma-pricing-old-grid');
 const title=qs('[data-i18n="pricing.title"]'),sub=qs('[data-i18n="pricing.subtitle"]');title?.classList.add('ma-pricing-old-head');sub?.classList.add('ma-pricing-old-head');
 const wrap=el('section','ma-pricing-first'),copy=el('div','ma-pricing-copy');copy.innerHTML='<h1>'+t.pricingTitle+'</h1><p>'+t.pricingSub+'</p>';
 const plans=el('div','ma-plan-grid');
 function plan(cls,kicker,name,big,items){const a=el('article','ma-plan '+cls);a.innerHTML='<span class="ma-plan-kicker">'+kicker+'</span><h2>'+name+'</h2><div class="ma-plan-big">'+big+'</div><ul>'+items.map(x=>'<li>'+x+'</li>').join('')+'</ul>';return a}
 const free=plan('','No account',t.freePlan,'3 '+t.daily,['One Match or Ask uses one daily action','Country-aware viewing guidance','No sign-in before your first match']);
 const freeCta=el('a','ma-plan-cta ghost',t.start);freeCta.href='/#ma-concierge';free.appendChild(freeCta);
 const account=plan('is-account','Free profile',t.account,'5 '+t.daily,['Save titles and history','Private taste profile','Match Together and account features']);
 const acct=el('button','ma-plan-cta ghost',t.join);acct.type='button';acct.addEventListener('click',()=>{if(typeof window.openAuthModal==='function')window.openAuthModal();else location.href='/'});account.appendChild(acct);
 const vip=plan('is-vip','Fewer limits',t.vip,'10 '+t.daily,['Included actions can be Matches or Asks','Ad-free while VIP is active','Monthly or annual billing']);
 const toggle=el('div','ma-billing-toggle');const mb=el('button','',t.monthly),ab=el('button','',t.annual);mb.type=ab.type='button';mb.setAttribute('aria-pressed','false');ab.setAttribute('aria-pressed','true');toggle.append(mb,ab);
 const price=el('div','ma-plan-big',extractPrice(annualCard)||extractPrice(monthlyCard)||'');
 monthly.removeAttribute('style');annual.removeAttribute('style');monthly.classList.add('ma-vip-checkout');annual.classList.add('ma-vip-checkout');monthly.hidden=true;annual.hidden=false;
 function bill(mode){const isM=mode==='m';mb.setAttribute('aria-pressed',String(isM));ab.setAttribute('aria-pressed',String(!isM));monthly.hidden=!isM;annual.hidden=isM;price.textContent=extractPrice(isM?monthlyCard:annualCard)}
 mb.addEventListener('click',()=>bill('m'));ab.addEventListener('click',()=>bill('a'));vip.append(toggle,price,monthly,annual);
 plans.append(free,account,vip);wrap.append(copy,plans);
 const note=el('p','ma-pricing-note','A daily action is either a Match or an Ask. Extra Matches do not buy Asks, and Extra Ask credits do not buy Matches.');wrap.appendChild(note);
 const secondary=el('div','ma-secondary-products');
 function secondaryCard(name,desc,node){const a=el('div','ma-secondary-product');a.innerHTML='<strong>'+name+'</strong><small>'+desc+'</small>';if(node){node.removeAttribute('style');node.classList.remove('gold-btn');a.appendChild(node)}return a}
 if(adfree)secondary.appendChild(secondaryCard('Ad-free','Remove ads without changing daily allowance.',adfree));
 const credits=qs('.credits-section');if(credits&&!credits.id)credits.id='credits';
 const ex=secondaryCard('Extra matches','One-time Match top-ups.');const exa=el('a','', 'View options');exa.href='#credits';ex.appendChild(exa);secondary.appendChild(ex);
 const ask=secondaryCard('Extra Ask credits','One-time Ask AI top-ups.');const aska=el('a','', 'View options');aska.href='#credits';ask.appendChild(aska);secondary.appendChild(ask);
 if(business)secondary.appendChild(secondaryCard('Business','50 included AI actions daily.',business));
 wrap.appendChild(secondary);
 const section=grid.closest('section.container')||grid.parentElement;section.insertBefore(wrap,title||grid);
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
function applyLanguage(){
 const t=c();
 if(isHome&&qs('.ma-concierge')){
   const hero=qs('.home-hero');if(hero){qs('.home-h1',hero).textContent=t.title;qs('.home-h1-sub',hero).textContent=t.sub}
   const tabs=qsa('.ma-tab');if(tabs[0])tabs[0].textContent=t.match;if(tabs[1])tabs[1].textContent=t.ask;
   const submit=qs('#questionnaire-box button[data-i18n="q.submit"]');if(submit)submit.textContent=t.find;
   const send=qs('#search-box .gold-btn');if(send)send.textContent=t.send;
   const input=qs('#specific-search-input');if(input)input.placeholder=t.askph;
   const together=qs('.ma-together-link');if(together)together.textContent=t.together;
 }
 if(isDiscover){const h=qs('.discover-title-copy h1');if(h)h.textContent=t.discover;const i=qs('#discover-new-input');if(i)i.placeholder=t.askph;const b=qs('.composer-send');if(b)b.textContent=t.send}
}
function boot(){
 if(!(isHome||isDiscover||isTogether||isPricing))return;
 ensureBrandMeta();brandHeader();
 if(isHome){prepareResponsiveAds();mountHome()}if(isDiscover)mountDiscover();if(isTogether)mountTogether();if(isPricing)mountPricing();
 document.addEventListener('matchapp:langchange',()=>setTimeout(applyLanguage,0));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

/* Fun UI sound palette: synthesized on demand, no audio assets or network dependency. */
let maAudioCtx=null;
function maSoundEnabled(){try{return localStorage.getItem('match_soundEnabled')!=='false'}catch(_){return true}}
function maTone(freq,duration,type='sine',gain=.025,delay=0){
  if(!maSoundEnabled())return;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  maAudioCtx=maAudioCtx||new AC();const ctx=maAudioCtx;
  const osc=ctx.createOscillator(),g=ctx.createGain(),start=ctx.currentTime+delay;
  osc.type=type;osc.frequency.setValueAtTime(freq,start);
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),start+.012);
  g.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(g);g.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.02);
}
function maUISound(kind){
  if(!maSoundEnabled())return;
  if(kind==='primary'){maTone(392,.11,'triangle',.028);maTone(659,.14,'sine',.022,.055);maTone(880,.16,'sine',.016,.11);return}
  if(kind==='select'){maTone(620,.07,'sine',.018);maTone(830,.08,'triangle',.012,.035);return}
  if(kind==='tab'){maTone(330,.07,'triangle',.016);maTone(494,.08,'triangle',.014,.045);return}
  if(kind==='open'){maTone(270,.08,'sine',.015);maTone(405,.10,'sine',.012,.045);return}
  if(kind==='share'){maTone(523,.08,'triangle',.017);maTone(784,.08,'triangle',.016,.05);maTone(1046,.12,'sine',.013,.10);return}
  maTone(420,.055,'sine',.012);
}
window.maPlayUISound=maUISound;
document.addEventListener('click',e=>{
  const target=e.target.closest('button,a,[role="button"],summary');if(!target||target.matches('.sound-toggle-btn'))return;
  let kind='tap';
  if(target.matches('.ma-primary,.gold-btn,.ma-plan-cta,.composer-send,[data-i18n="q.submit"]'))kind='primary';
  else if(target.matches('.ma-chip,.crit-chip'))kind='select';
  else if(target.matches('.ma-tab,.ma-billing-toggle button'))kind='tab';
  else if(target.matches('summary,.crit-toggle,.ma-menu-button'))kind='open';
  else if(target.matches('.share-cta,[id*="share"],[data-action="share"]'))kind='share';
  maUISound(kind);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&target.animate){
    target.animate([{transform:'scale(1)'},{transform:'scale(.965)'},{transform:'scale(1.018)'},{transform:'scale(1)'}],{duration:180,easing:'cubic-bezier(.2,.9,.25,1.2)'});
  }
},{passive:true});

})();