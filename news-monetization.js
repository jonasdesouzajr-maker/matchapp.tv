/* MatchApp Ai news: additive, source-aware discovery. No ad requests or credit changes. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.MatchAppNewsMonetization = api;
    const start = () => api.init(root);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const COPY = {
    en: { explore: 'Explore {provider}', watch: 'Watch on {provider}', browse: 'Explore streaming options', context: 'Provider catalogue. Check this title’s availability and access terms.', checked: 'Title availability checked for {country}', offers: 'Local streaming options', country: 'Choose a country', freeAds: 'Free with ads', freeSelection: 'Selected free titles', terms: 'Provider details', reviewed: 'Details checked {date}', caveat: 'Catalogues vary by country. The provider sets access terms.', directory: 'More official streaming services' },
    pt: { explore: 'Explorar {provider}', watch: 'Assistir no {provider}', browse: 'Explorar opções de streaming', context: 'Catálogo da plataforma. Confira a disponibilidade e as condições deste título.', checked: 'Disponibilidade do título conferida em {country}', offers: 'Opções de streaming locais', country: 'Escolha um país', freeAds: 'Grátis com anúncios', freeSelection: 'Seleção de títulos grátis', terms: 'Detalhes na plataforma', reviewed: 'Informações conferidas em {date}', caveat: 'Os catálogos variam por país. A plataforma define as condições de acesso.', directory: 'Mais serviços oficiais de streaming' },
    es: { explore: 'Explorar {provider}', watch: 'Ver en {provider}', browse: 'Explorar opciones de streaming', context: 'Catálogo de la plataforma. Consulta la disponibilidad y las condiciones del título.', checked: 'Disponibilidad del título comprobada para {country}', offers: 'Opciones de streaming locales', country: 'Elige un país', freeAds: 'Gratis con anuncios', freeSelection: 'Selección de títulos gratis', terms: 'Detalles de la plataforma', reviewed: 'Datos comprobados el {date}', caveat: 'Los catálogos varían por país. La plataforma establece las condiciones de acceso.', directory: 'Más servicios oficiales de streaming' },
    fr: { explore: 'Explorer {provider}', watch: 'Regarder sur {provider}', browse: 'Explorer les services de streaming', context: 'Catalogue du service. Vérifiez la disponibilité du titre et les conditions d’accès.', checked: 'Disponibilité du titre vérifiée pour {country}', offers: 'Options de streaming locales', country: 'Choisissez un pays', freeAds: 'Gratuit avec publicité', freeSelection: 'Sélection de titres gratuits', terms: 'Détails du service', reviewed: 'Informations vérifiées le {date}', caveat: 'Les catalogues varient selon le pays. Le service fixe les conditions d’accès.', directory: 'Autres services de streaming officiels' },
    de: { explore: '{provider} entdecken', watch: 'Auf {provider} ansehen', browse: 'Streaming-Angebote entdecken', context: 'Katalog des Anbieters. Prüfe die Verfügbarkeit und Zugangsbedingungen dieses Titels.', checked: 'Titelverfügbarkeit für {country} geprüft', offers: 'Lokale Streaming-Optionen', country: 'Land auswählen', freeAds: 'Kostenlos mit Werbung', freeSelection: 'Ausgewählte kostenlose Titel', terms: 'Details beim Anbieter', reviewed: 'Angaben geprüft am {date}', caveat: 'Kataloge unterscheiden sich je nach Land. Der Anbieter legt die Zugangsbedingungen fest.', directory: 'Weitere offizielle Streaming-Dienste' },
    it: { explore: 'Esplora {provider}', watch: 'Guarda su {provider}', browse: 'Esplora le opzioni di streaming', context: 'Catalogo del servizio. Verifica la disponibilità e le condizioni di accesso del titolo.', checked: 'Disponibilità del titolo verificata per {country}', offers: 'Opzioni di streaming locali', country: 'Scegli un paese', freeAds: 'Gratis con pubblicità', freeSelection: 'Selezione di titoli gratuiti', terms: 'Dettagli del servizio', reviewed: 'Informazioni verificate il {date}', caveat: 'I cataloghi variano per paese. Il servizio stabilisce le condizioni di accesso.', directory: 'Altri servizi di streaming ufficiali' },
    tr: { explore: '{provider} kataloğunu keşfet', watch: '{provider} üzerinden izle', browse: 'Yayın seçeneklerini keşfet', context: 'Platform kataloğu. Bu yapımın kullanılabilirliğini ve erişim koşullarını kontrol edin.', checked: 'Yapımın {country} için kullanılabilirliği kontrol edildi', offers: 'Yerel yayın seçenekleri', country: 'Bir ülke seçin', freeAds: 'Reklamlarla ücretsiz', freeSelection: 'Seçili ücretsiz yapımlar', terms: 'Platform ayrıntıları', reviewed: 'Bilgiler {date} tarihinde kontrol edildi', caveat: 'Kataloglar ülkeye göre değişir. Erişim koşullarını platform belirler.', directory: 'Diğer resmî yayın platformları' },
    ru: { explore: 'Открыть каталог {provider}', watch: 'Смотреть на {provider}', browse: 'Найти стриминговые сервисы', context: 'Каталог сервиса. Уточните доступность произведения и условия доступа.', checked: 'Доступность произведения проверена для страны: {country}', offers: 'Местные стриминговые сервисы', country: 'Выберите страну', freeAds: 'Бесплатно с рекламой', freeSelection: 'Подборка бесплатных произведений', terms: 'Условия сервиса', reviewed: 'Данные проверены {date}', caveat: 'Каталоги различаются по странам. Условия доступа определяет сервис.', directory: 'Другие официальные стриминговые сервисы' },
    ar: { explore: 'استكشف {provider}', watch: 'شاهد على {provider}', browse: 'استكشف خيارات البث', context: 'كتالوج المنصة. تحقّق من توفر هذا العمل وشروط الوصول إليه.', checked: 'تم التحقق من توفر العمل في {country}', offers: 'خيارات البث المحلية', country: 'اختر بلدًا', freeAds: 'مجاني مع إعلانات', freeSelection: 'أعمال مجانية مختارة', terms: 'تفاصيل المنصة', reviewed: 'تمت مراجعة المعلومات في {date}', caveat: 'تختلف الكتالوجات حسب البلد. تحدد المنصة شروط الوصول.', directory: 'المزيد من خدمات البث الرسمية' },
    hi: { explore: '{provider} पर विकल्प देखें', watch: '{provider} पर देखें', browse: 'स्ट्रीमिंग विकल्प खोजें', context: 'प्लैटफ़ॉर्म का कैटलॉग। इस शीर्षक की उपलब्धता और पहुँच की शर्तें जाँचें।', checked: '{country} के लिए शीर्षक की उपलब्धता जाँची गई', offers: 'स्थानीय स्ट्रीमिंग विकल्प', country: 'देश चुनें', freeAds: 'विज्ञापनों के साथ मुफ़्त', freeSelection: 'चुनिंदा मुफ़्त शीर्षक', terms: 'प्लैटफ़ॉर्म की जानकारी', reviewed: 'जानकारी {date} को जाँची गई', caveat: 'कैटलॉग देश के अनुसार बदलते हैं। पहुँच की शर्तें प्लैटफ़ॉर्म तय करता है।', directory: 'अन्य आधिकारिक स्ट्रीमिंग सेवाएँ' },
    id: { explore: 'Jelajahi {provider}', watch: 'Tonton di {provider}', browse: 'Jelajahi pilihan streaming', context: 'Katalog platform. Periksa ketersediaan judul ini dan ketentuan aksesnya.', checked: 'Ketersediaan judul diperiksa untuk {country}', offers: 'Pilihan streaming lokal', country: 'Pilih negara', freeAds: 'Gratis dengan iklan', freeSelection: 'Pilihan judul gratis', terms: 'Detail platform', reviewed: 'Informasi diperiksa pada {date}', caveat: 'Katalog berbeda menurut negara. Platform menentukan ketentuan akses.', directory: 'Layanan streaming resmi lainnya' },
    ja: { explore: '{provider}をチェック', watch: '{provider}で視聴', browse: '配信サービスを探す', context: '配信サービスのカタログです。この作品の配信状況と利用条件をご確認ください。', checked: '{country}での作品の配信状況を確認済み', offers: '地域の配信サービス', country: '国を選択', freeAds: '広告付きで無料', freeSelection: '一部の作品が無料', terms: 'サービスの詳細', reviewed: '情報確認日：{date}', caveat: 'カタログは国によって異なります。利用条件は配信サービスが定めます。', directory: 'その他の公式配信サービス' },
    ko: { explore: '{provider} 둘러보기', watch: '{provider}에서 시청', browse: '스트리밍 서비스 둘러보기', context: '플랫폼 카탈로그입니다. 이 작품의 제공 여부와 이용 조건을 확인하세요.', checked: '{country}의 작품 제공 여부 확인됨', offers: '현지 스트리밍 서비스', country: '국가 선택', freeAds: '광고 포함 무료', freeSelection: '일부 작품 무료', terms: '플랫폼 상세 정보', reviewed: '정보 확인일: {date}', caveat: '카탈로그는 국가별로 다릅니다. 이용 조건은 플랫폼에서 정합니다.', directory: '다른 공식 스트리밍 서비스' },
    zh: { explore: '浏览{provider}', watch: '在{provider}观看', browse: '探索流媒体服务', context: '平台作品目录。请核实该作品的播放地区和访问条件。', checked: '已核实该作品在{country}的播放情况', offers: '本地流媒体选项', country: '选择国家或地区', freeAds: '含广告免费观看', freeSelection: '部分作品免费', terms: '平台详情', reviewed: '信息核查日期：{date}', caveat: '作品目录因国家或地区而异。访问条件由平台规定。', directory: '更多官方流媒体服务' }
  };
  const MARKET_NAMES = { brazil: 'BR', brasil: 'BR', 'united states': 'US', usa: 'US', 'united kingdom': 'GB', uk: 'GB', argentina: 'AR', mexico: 'MX', canada: 'CA', australia: 'AU', france: 'FR', germany: 'DE', italy: 'IT', spain: 'ES', portugal: 'PT', japan: 'JP', korea: 'KR', 'south korea': 'KR', india: 'IN', indonesia: 'ID', turkey: 'TR', russia: 'RU', china: 'CN' };
  const PROVIDERS = [
    { id: 'netflix', name: 'Netflix', aliases: ['Netflix', 'ネットフリックス', '넷플릭스', 'نتفليكس', 'नेटफ्लिक्स', '网飞'], host: 'www.netflix.com', url: 'https://www.netflix.com/', unavailable: ['CN', 'RU', 'KP', 'SY'], exact: /^\/title\/\d+\/?$/ },
    { id: 'prime', name: 'Prime Video', aliases: ['Prime Video', 'Amazon Prime Video', 'プライムビデオ', '프라임 비디오', 'برايم فيديو', 'प्राइम वीडियो'], host: 'www.primevideo.com', url: 'https://www.primevideo.com/', unavailable: ['CN', 'RU', 'KP', 'SY', 'IR'], exact: /^\/(?:detail|region\/[a-z]+\/detail)\/[A-Za-z0-9/-]+\/?$/ },
    { id: 'disney', name: 'Disney+', aliases: ['Disney+', 'Disney Plus', 'ディズニープラス', '디즈니 플러스', 'ديزني بلس'], host: 'www.disneyplus.com', url: 'https://www.disneyplus.com/', markets: ['BR', 'US', 'GB', 'MX', 'AR', 'CA', 'AU', 'FR', 'DE', 'IT', 'ES', 'PT', 'JP', 'KR'], exact: /^\/(?:[a-z]{2}-[a-z]{2}\/)?(?:browse\/entity|movies|series|video)\/[A-Za-z0-9/-]+\/?$/ },
    { id: 'apple', name: 'Apple TV', aliases: ['Apple TV', 'Apple TV+', 'アップルTV', '애플 TV', 'آبل تي في'], host: 'tv.apple.com', url: 'https://tv.apple.com/', markets: ['BR', 'US', 'GB', 'MX', 'AR', 'CA', 'AU', 'FR', 'DE', 'IT', 'ES', 'PT', 'JP', 'KR', 'IN', 'ID'], exact: /^\/[a-z]{2}\/(?:movie|show|episode)\/[A-Za-z0-9%._~/-]+\/?$/ },
    { id: 'max', name: 'HBO Max', aliases: ['HBO Max'], host: 'www.hbomax.com', url: 'https://www.hbomax.com/', markets: ['BR', 'US', 'MX', 'AR', 'ES', 'PT', 'FR'], exact: /^\/(?:[a-z]{2}\/[a-z]{2}\/)?(?:movies|shows)\/[A-Za-z0-9/-]+\/?$/ },
    { id: 'hulu', name: 'Hulu', aliases: ['Hulu', 'フールー'], host: 'www.hulu.com', url: 'https://www.hulu.com/', markets: ['US'], exact: /^\/(?:movie|series|watch)\/[A-Za-z0-9/-]+\/?$/ },
    { id: 'crunchyroll', name: 'Crunchyroll', aliases: ['Crunchyroll', 'クランチロール'], host: 'www.crunchyroll.com', url: 'https://www.crunchyroll.com/', exact: /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:series|watch)\/[A-Za-z0-9/-]+\/?$/ },
    { id: 'pluto', name: 'Pluto TV', aliases: ['Pluto TV', 'プルートTV'], host: 'pluto.tv', url: 'https://pluto.tv/', destinations: { US: 'https://pluto.tv/us/', BR: 'https://pluto.tv/br/' }, markets: ['US', 'BR'], exact: /^\/[a-z]{2}\/on-demand\/(?:movies|series)\/[A-Za-z0-9/-]+\/?$/ },
    { id: 'mercado', name: 'Mercado Play', aliases: ['Mercado Play'], host: 'play.mercadolivre.com.br', url: 'https://play.mercadolivre.com.br/', destinations: { BR: 'https://play.mercadolivre.com.br/', MX: 'https://play.mercadolibre.com.mx/', AR: 'https://play.mercadolibre.com.ar/' }, markets: ['BR', 'MX', 'AR'], exact: /^\/(?:assistir|ver)\/[A-Za-z0-9%._~/-]+\/?$/ }
  ];
  const TRIAL_KEYS = ['freeTrial', 'trialEligibility', 'trialRenewal', 'trialCancel', 'trialTerms', 'trialCaveat', 'trialExplore'];
  const TRIAL_COPY = {
    en: ['7-day free trial', 'Eligible new subscribers in {country} only.', 'Then {price} per month. Renews automatically until cancelled.', 'Cancel at least 24 hours before the trial ends to avoid a charge.', 'Trial terms', 'Apple confirms eligibility and current pricing. Streaming requires a separate subscription.', 'View {provider} trial'],
    pt: ['Teste grátis por 7 dias', 'Somente novos assinantes elegíveis em {country}.', 'Depois, {price} por mês. Renovação automática até o cancelamento.', 'Cancele pelo menos 24 horas antes do fim do teste para evitar a cobrança.', 'Condições do teste', 'A Apple confirma a elegibilidade e o preço atual. O streaming exige uma assinatura separada.', 'Ver teste do {provider}'],
    es: ['Prueba gratis de 7 días', 'Solo para nuevos suscriptores que cumplan los requisitos en {country}.', 'Después, {price} al mes. Renovación automática hasta que se cancele.', 'Cancela al menos 24 horas antes de que termine la prueba para evitar el cobro.', 'Condiciones de la prueba', 'Apple confirma los requisitos y el precio vigente. El streaming requiere una suscripción aparte.', 'Ver prueba de {provider}'],
    fr: ['Essai gratuit de 7 jours', 'Réservé aux nouveaux abonnés éligibles : {country}.', 'Puis {price} par mois. Renouvellement automatique jusqu’à résiliation.', 'Résiliez au moins 24 heures avant la fin de l’essai pour éviter la facturation.', 'Conditions de l’essai', 'Apple confirme l’éligibilité et le tarif en vigueur. Le streaming nécessite un abonnement distinct.', 'Voir l’essai {provider}'],
    de: ['7 Tage kostenlos testen', 'Nur für berechtigte Neukunden in {country}.', 'Danach {price} pro Monat. Automatische Verlängerung bis zur Kündigung.', 'Mindestens 24 Stunden vor Ende des Tests kündigen, um eine Abbuchung zu vermeiden.', 'Testbedingungen', 'Apple bestätigt die Berechtigung und den aktuellen Preis. Streaming erfordert ein separates Abo.', '{provider}-Test ansehen'],
    it: ['Prova gratuita di 7 giorni', 'Solo per nuovi abbonati idonei in {country}.', 'Poi {price} al mese. Rinnovo automatico fino alla disdetta.', 'Annulla almeno 24 ore prima della fine della prova per evitare l’addebito.', 'Condizioni della prova', 'Apple conferma l’idoneità e il prezzo attuale. Lo streaming richiede un abbonamento separato.', 'Vedi la prova di {provider}'],
    tr: ['7 günlük ücretsiz deneme', 'Yalnızca {country} bölgesindeki uygun yeni aboneler için.', 'Ardından ayda {price}. İptal edilene kadar otomatik yenilenir.', 'Ücret alınmaması için deneme bitmeden en az 24 saat önce iptal edin.', 'Deneme koşulları', 'Uygunluğu ve güncel fiyatı Apple doğrular. Yayın için ayrı abonelik gerekir.', '{provider} denemesini incele'],
    ru: ['7 дней бесплатно', 'Только для новых подписчиков, отвечающих условиям в стране: {country}.', 'Затем {price} в месяц. Автоматическое продление до отмены.', 'Отмените минимум за 24 часа до конца пробного периода, чтобы избежать списания.', 'Условия пробного периода', 'Apple подтверждает право на пробный период и текущую цену. Для просмотра нужна отдельная подписка.', 'Пробный период {provider}'],
    ar: ['تجربة مجانية لمدة 7 أيام', 'للمشتركين الجدد المؤهلين في {country} فقط.', 'ثم {price} شهريًا. يتجدد الاشتراك تلقائيًا حتى الإلغاء.', 'ألغِ قبل نهاية التجربة بـ24 ساعة على الأقل لتجنب الخصم.', 'شروط التجربة', 'تؤكد Apple الأهلية والسعر الحالي. يتطلب البث اشتراكًا منفصلًا.', 'اطّلع على تجربة {provider}'],
    hi: ['7 दिन का मुफ़्त ट्रायल', 'केवल {country} में पात्र नए सब्सक्राइबर के लिए।', 'इसके बाद हर महीने {price}। रद्द करने तक अपने-आप नवीनीकरण होगा।', 'शुल्क से बचने के लिए ट्रायल खत्म होने से कम से कम 24 घंटे पहले रद्द करें।', 'ट्रायल की शर्तें', 'पात्रता और मौजूदा कीमत की पुष्टि Apple करता है। स्ट्रीमिंग के लिए अलग सदस्यता चाहिए।', '{provider} का ट्रायल देखें'],
    id: ['Uji coba gratis 7 hari', 'Hanya untuk pelanggan baru yang memenuhi syarat di {country}.', 'Lalu {price} per bulan. Diperpanjang otomatis hingga dibatalkan.', 'Batalkan minimal 24 jam sebelum uji coba berakhir agar tidak dikenai biaya.', 'Ketentuan uji coba', 'Apple memastikan kelayakan dan harga terbaru. Streaming memerlukan langganan terpisah.', 'Lihat uji coba {provider}'],
    ja: ['7日間無料体験', '{country}の条件を満たす新規登録者のみ対象です。', 'その後は月額{price}。解約するまで自動更新されます。', '課金を避けるには、無料体験終了の24時間以上前に解約してください。', '無料体験の条件', '対象条件と現在の料金はAppleが確認します。視聴には別途サブスクリプションが必要です。', '{provider}の無料体験を見る'],
    ko: ['7일 무료 체험', '{country}에서 조건을 충족하는 신규 구독자만 해당됩니다.', '이후 월 {price}. 취소할 때까지 자동 갱신됩니다.', '청구를 피하려면 체험 종료 최소 24시간 전에 취소하세요.', '체험 이용 조건', '대상 여부와 현재 요금은 Apple이 확인합니다. 시청에는 별도 구독이 필요합니다.', '{provider} 체험 살펴보기'],
    zh: ['7天免费试用', '仅限{country}符合条件的新订阅者。', '此后每月{price}，自动续订，直至取消。', '如需避免扣费，请至少在试用结束前24小时取消。', '试用条款', 'Apple确认资格和当前价格。观看需要另行订阅。', '查看{provider}试用']
  };
  // Reviewed official national pages, without affiliate tags or sponsorship claims.
  // Keep offer destinations separate from the stricter exact-title URL allowlist.
  const APPROVED_TRIALS = Object.freeze({
    BR: Object.freeze({ url: 'https://www.apple.com/br/apple-tv/', termsUrl: 'https://www.apple.com/legal/internet-services/itunes/br/terms.html', amount: 3490, currency: 'BRL' }),
    MX: Object.freeze({ url: 'https://www.apple.com/mx/apple-tv/', termsUrl: 'https://www.apple.com/legal/internet-services/itunes/mx/terms.html', amount: 19900, currency: 'MXN' }),
    GB: Object.freeze({ url: 'https://www.apple.com/uk/apple-tv/', termsUrl: 'https://www.apple.com/legal/internet-services/itunes/uk/terms.html', amount: 999, currency: 'GBP' })
  });
  // reviewBy is OUR editorial freshness cutoff, never a provider's offer end date.
  const OFFERS = [
    { id: 'pluto-us-free', provider: 'pluto', country: 'US', type: 'free_with_ads', url: 'https://pluto.tv/us/', sourceUrl: 'https://pluto.tv/us/', checked: '2026-10-17', reviewBy: '2026-11-16' },
    ...Object.entries(APPROVED_TRIALS).map(([country, approved]) => ({ id: 'apple-' + country.toLowerCase() + '-trial', provider: 'apple', country, type: 'free_trial', trialDays: 7, eligibility: 'new_subscriber', url: approved.url, sourceUrl: approved.url, termsUrl: approved.termsUrl, renewal: Object.freeze({ amount: approved.amount, currency: approved.currency, fractionDigits: 2, interval: 'month', autoRenew: true }), cancelHours: 24, checked: '2026-10-17', reviewBy: '2026-10-24' }))
  ].map(Object.freeze);
  const SENSITIVE = /\b(?:obituar\w*|death|dead|dies|died|mourn\w*|funeral|killed|killings|suicid\w*|murder\w*|abuse|assault|rape|war|terror\w*|hostage\w*|massacre|shooting|allegation\w*|arrest\w*|lawsuit\w*|layoff\w*|bankrupt\w*|morte|morreu|morre|morto\w*|obitu[aá]rio|luto|assassin\w*|abus\w*|estupro|guerra|muere|muri[oó]|fallec\w*|muert\w*|d[eé]c[eè]s|mort|meurt|todes\w*|gestorben|stirbt|morto|muore|[oö]l[uü]m|vefat|meninggal|tewas)\b|وفاة|توفي|انتحار|اغتصاب|قتل|حرب|смерт|умер|погиб|самоубий|насили|войн|मृत्यु|निधन|आत्महत्या|हत्या|युद्ध|死亡|去世|訃報|自殺|死去|战争|戰爭|戦争|사망|별세|자살|전쟁/i;
  const SCREEN_TOPIC = /\b(?:film\w*|movie\w*|series|s[eé]rie\w*|show\w*|season\w*|episod\w*|trailer\w*|premiere\w*|premi[eè]re\w*|documentar\w*|drama\w*|sequel\w*|reboot\w*|cinema|temporada\w*|estreia\w*|pel[ií]cula\w*|estreno\w*|staffel\w*|folge\w*|stagione\w*|dizi\w*|sezon\w*|b[oö]l[uü]m\w*)\b|فيلم|مسلسل|حلق|фильм|сериал|сезон|Фильм|फ़िल्म|फिल्म|सीरीज़|सीरीज|सीज़न|映画|ドラマ|シーズン|予告|电影|電影|剧集|劇集|영화|드라마|시즌/i;
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ESC[c]);
  const baseLanguage = value => String(value || '').toLowerCase().split('-')[0];
  const language = value => Object.prototype.hasOwnProperty.call(COPY, baseLanguage(value)) ? baseLanguage(value) : 'en';
  const countryCode = value => { const v = String(value || '').trim(); return /^[a-z]{2}$/i.test(v) ? v.toUpperCase() : MARKET_NAMES[v.toLowerCase()] || ''; };
  const text = (lang, key, values = {}) => (COPY[language(lang)][key] || TRIAL_COPY[language(lang)][TRIAL_KEYS.indexOf(key)] || '').replace(/\{(\w+)\}/g, (_, k) => String(values[k] || ''));
  function safeUrl(value) {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port ? u : null; } catch (_) { return null; }
  }
  function mentions(title, alias) {
    if (/[^\u0000-\u024f]/.test(alias)) return title.toLowerCase().includes(alias.toLowerCase());
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?:^|[^a-z0-9])' + escaped + '(?=$|[^a-z0-9])', 'i').test(title);
  }
  function providerFor(title) { return PROVIDERS.find(p => p.aliases.some(alias => mentions(String(title || ''), alias))) || null; }
  function eligibleArticle(item) {
    if (!item || item.category !== 'entertainment' || !safeUrl(item.url || item.sourceUrl)) return false;
    const title = String(item.title || '').slice(0, 800);
    const context = title + ' ' + String(item.event_type || '') + ' ' + String(item.description || '').slice(0, 4000);
    return !SENSITIVE.test(context) && SCREEN_TOPIC.test(title) && Boolean(providerFor(title));
  }
  function providerDestination(provider, country) {
    const cc = countryCode(country);
    if (!provider || (provider.markets && (!cc || !provider.markets.includes(cc))) || (provider.unavailable || []).includes(cc)) return null;
    return (provider.destinations && provider.destinations[cc]) || provider.url;
  }
  function officialUrl(value, provider, country) {
    const u = safeUrl(value), expected = safeUrl(providerDestination(provider, country));
    if (!u || !expected || u.hostname !== expected.hostname || [...u.searchParams.keys()].some(key => /^(?:tag|affid|affiliate|affiliate_id|partner|partner_id|url|redirect|redirect_uri)$/i.test(key))) return null;
    return u;
  }
  function exactAvailability(item, provider, country, now = Date.now()) {
    const a = item.availability, cc = countryCode(country);
    if (!a || a.verified !== true || !item.title_id || a.title_id !== item.title_id || a.provider !== provider.id || !cc || a.country !== cc) return null;
    const stamp = Date.parse(a.checkedAt), u = officialUrl(a.url, provider, cc), source = officialUrl(a.sourceUrl, provider, cc);
    if (!Number.isFinite(stamp) || stamp > now || now - stamp > 86400000 || !u || !source || !provider.exact.test(u.pathname) || source.pathname !== u.pathname) return null;
    return u.href;
  }
  function regionName(country, lang) {
    const cc = countryCode(country);
    try { return new Intl.DisplayNames([language(lang)], { type: 'region' }).of(cc) || cc; } catch (_) { return cc; }
  }
  function contextFor(item, country, lang, now = Date.now()) {
    if (!eligibleArticle(item)) return null;
    const provider = providerFor(item.title), exact = exactAvailability(item, provider, country, now), url = exact || providerDestination(provider, country);
    return { provider: provider.id, href: url || '/streaming/', exact: Boolean(exact), label: text(lang, exact ? 'watch' : url ? 'explore' : 'browse', { provider: provider.name }), note: text(lang, exact ? 'checked' : 'context', { country: regionName(country, lang) }), external: Boolean(url) };
  }
  function contextMarkup(item, country, lang, now) {
    const context = contextFor(item, country, lang, now);
    if (!context) return '';
    return '<a class="ma-news-commerce-cta" data-news-provider="' + context.provider + '" href="' + escape(context.href) + '"' + (context.external ? ' target="_blank" rel="noopener noreferrer external"' : '') + '><span>' + escape(context.label) + '</span><span aria-hidden="true">↗</span></a><p class="ma-news-commerce-note"' + (context.exact ? ' data-availability-checked="true"' : '') + '>' + escape(context.note) + '</p>';
  }
  function validOffers(records, country, now = Date.now()) {
    const cc = countryCode(country), seen = new Set();
    return (Array.isArray(records) ? records : []).filter(o => {
      if (!o || !o.id || seen.has(o.id) || !countryCode(o.country) || (cc && o.country !== cc) || !['free_with_ads', 'free_selection', 'free_trial'].includes(o.type)) return false;
      const provider = PROVIDERS.find(p => p.id === o.provider), checked = Date.parse(o.checked), reviewBy = Date.parse(o.reviewBy);
      if (!provider || !Number.isFinite(checked) || !Number.isFinite(reviewBy) || checked > now || reviewBy <= now || reviewBy <= checked || reviewBy - checked > 31 * 86400000) return false;
      if (o.type === 'free_trial') {
        const approved = APPROVED_TRIALS[o.country], renewal = o.renewal;
        if (!approved || o.id !== 'apple-' + o.country.toLowerCase() + '-trial' || o.provider !== 'apple' || o.url !== approved.url || o.sourceUrl !== approved.url || o.termsUrl !== approved.termsUrl || o.trialDays !== 7 || o.eligibility !== 'new_subscriber' || o.cancelHours !== 24 || reviewBy - checked > 7 * 86400000) return false;
        if (!renewal || renewal.amount !== approved.amount || renewal.currency !== approved.currency || renewal.fractionDigits !== 2 || renewal.interval !== 'month' || renewal.autoRenew !== true) return false;
      } else if (!officialUrl(o.url, provider, o.country) || !officialUrl(o.sourceUrl, provider, o.country)) return false;
      seen.add(o.id); return true;
    }).slice(0, 8);
  }
  function offerCardsMarkup(records, country, lang, now) {
    if (!countryCode(country)) return '';
    return validOffers(records, country, now).map(o => {
      const provider = PROVIDERS.find(p => p.id === o.provider);
      let date = o.checked;
      try { date = new Intl.DateTimeFormat(language(lang), { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(o.checked)); } catch (_) {}
      const trial = o.type === 'free_trial';
      let trialDetails = '';
      if (trial) {
        const price = new Intl.NumberFormat(language(lang), { style: 'currency', currency: o.renewal.currency, currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(o.renewal.amount / 100);
        trialDetails = '<p>' + escape(text(lang, 'trialEligibility', { country: regionName(o.country, lang) })) + '</p><p class="ma-news-trial-renewal">' + escape(text(lang, 'trialRenewal', { price })) + '</p><p>' + escape(text(lang, 'trialCancel')) + '</p><p>' + escape(text(lang, 'trialCaveat')) + '</p>';
      }
      return '<article class="ma-news-offer-card' + (trial ? ' ma-news-offer-card--trial' : '') + '" role="listitem"><span class="ma-news-offer-type">' + escape(text(lang, trial ? 'freeTrial' : o.type === 'free_with_ads' ? 'freeAds' : 'freeSelection')) + '</span><h3>' + escape(provider.name) + '</h3>' + (trial ? trialDetails : '<p>' + escape(regionName(o.country, lang)) + '</p>') + '<a class="ma-news-commerce-cta" data-news-provider="' + provider.id + '" href="' + escape(o.url) + '" target="_blank" rel="noopener noreferrer external">' + escape(text(lang, trial ? 'trialExplore' : 'explore', { provider: provider.name })) + '<span aria-hidden="true">↗</span></a><p class="ma-news-offer-source"><a href="' + escape(trial ? o.termsUrl : o.sourceUrl) + '" target="_blank" rel="noopener noreferrer external">' + escape(text(lang, trial ? 'trialTerms' : 'terms')) + '</a><span>' + escape(text(lang, 'reviewed', { date })) + '</span></p></article>';
    }).join('');
  }
  function offersMarkup(records, country, lang, now = Date.now()) {
    const offers = validOffers(records, '', now);
    if (!offers.length) return '';
    const markets = [...new Set(offers.map(o => o.country))], cc = markets.includes(countryCode(country)) ? countryCode(country) : '';
    return '<details class="ma-news-offers"><summary><span>' + escape(text(lang, 'offers')) + '</span><span aria-hidden="true">+</span></summary><div class="ma-news-offers-body"><label class="ma-news-offers-country"><span>' + escape(text(lang, 'country')) + '</span><select data-news-offer-country><option value="">' + escape(text(lang, 'country')) + '</option>' + markets.map(m => '<option value="' + m + '"' + (m === cc ? ' selected' : '') + '>' + escape(regionName(m, lang)) + '</option>').join('') + '</select></label><div class="ma-news-offers-track" role="list" aria-label="' + escape(text(lang, 'offers')) + '" data-news-offers-track>' + offerCardsMarkup(offers, cc, lang, now) + '</div><p class="ma-news-offers-caveat">' + escape(text(lang, 'caveat')) + '</p><a class="ma-news-offers-directory" href="/streaming/">' + escape(text(lang, 'directory')) + '</a></div></details>';
  }
  function chosenLanguage(win) {
    let saved = '';
    try { saved = win.localStorage.getItem('match_lang') || ''; } catch (_) {}
    return [win.MATCH_LANG, saved, win.document.documentElement.lang].map(baseLanguage).find(l => COPY[l]) || 'en';
  }
  function chosenCountry(win) {
    try {
      const saved = win.localStorage.getItem('match_user_country');
      return countryCode(win.localStorage.getItem('match_user_region')) || countryCode(saved) || countryCode(win.MatchAppGeography?.resolveCountry?.(saved)?.[1]) || countryCode(win.document.documentElement.dataset.newsCountry);
    } catch (_) { return countryCode(win.document.documentElement.dataset.newsCountry); }
  }
  function articleFromElement(card) {
    const data = card.dataset, item = { title: data.newsTitle || '', category: data.newsCategory || '', event_type: data.newsEvent || '', description: data.newsDescription || '', url: data.newsSourceUrl || '', title_id: data.newsTitleId || '' };
    const availability = card.querySelector('script[type="application/json"][data-news-availability]');
    if (availability) { try { item.availability = JSON.parse(availability.textContent); } catch (_) {} }
    return item;
  }
  function hydrate(win) {
    const doc = win.document;
    if (/^\/kids(?:\/|$)/.test(win.location.pathname) || doc.documentElement.dataset.matchappMode === 'kids') return;
    const lang = chosenLanguage(win), country = chosenCountry(win);
    doc.querySelectorAll('[data-news-commerce-card]').forEach(card => {
      const slot = card.querySelector('[data-news-commerce-slot]');
      if (!slot) return;
      const markup = contextMarkup(articleFromElement(card), country, lang);
      if (slot.innerHTML !== markup) slot.innerHTML = markup;
      slot.lang = lang; slot.dir = lang === 'ar' ? 'rtl' : 'ltr';
    });
    doc.querySelectorAll('[data-news-local-offers]').forEach(host => {
      const previous = host.querySelector('details'), open = Boolean(previous?.open);
      const selected = Object.prototype.hasOwnProperty.call(host.dataset, 'newsOfferSelection') ? host.dataset.newsOfferSelection : country;
      const markup = offersMarkup(OFFERS, selected, lang);
      if (!markup) { host.replaceChildren(); host.hidden = true; return; }
      host.hidden = false; host.lang = lang; host.dir = lang === 'ar' ? 'rtl' : 'ltr';
      if (host.dataset.newsOffersLanguage !== lang || host.dataset.newsOffersCountry !== selected || !previous) {
        host.innerHTML = markup;
        const details = host.querySelector('details'); details.open = open;
        host.dataset.newsOffersLanguage = lang; host.dataset.newsOffersCountry = selected;
        host.querySelector('[data-news-offer-country]').addEventListener('change', event => {
          host.dataset.newsOfferSelection = event.target.value; host.dataset.newsOffersCountry = event.target.value;
          host.querySelector('[data-news-offers-track]').innerHTML = offerCardsMarkup(OFFERS, event.target.value, chosenLanguage(win));
        });
      }
    });
  }
  function init(win) {
    if (win.__matchappNewsCommerceStarted) return;
    // The existing Home news feed creates its cards after a network response.
    // Register the ready listener even when no eligible card has arrived yet.
    if (/^\/kids(?:\/|$)/.test(win.location.pathname) || win.document.documentElement.dataset.matchappMode === 'kids') return;
    if (!win.document.querySelector('[data-news-commerce-card],[data-news-local-offers]') && !['/', '/index.html'].includes(win.location.pathname)) return;
    win.__matchappNewsCommerceStarted = true;
    hydrate(win);
    win.document.addEventListener('matchapp:langchange', () => hydrate(win));
    win.document.addEventListener('matchapp:news-static-ready', () => hydrate(win));
    win.addEventListener('storage', event => { if (['match_lang', 'match_user_country', 'match_user_region'].includes(event.key)) hydrate(win); });
  }
  return Object.freeze({ languages: Object.freeze(Object.keys(COPY)), offers: Object.freeze(OFFERS), eligibleArticle, contextFor, contextMarkup, validOffers, offersMarkup, hydrate, init });
});
