/* Copy for the adult registration gateway. The shared language engine owns language selection and repainting. */
(function () {
    'use strict';
    const fields = ['title', 'heading', 'details', 'join', 'home', 'note'];
    const copy = {
        'en': [
            "Create your free MatchApp Ai account",
            "Take MatchApp Ai with you",
            "Create a free account to keep your preferences, saved titles, history, Match Together activity and alerts across devices. No credit card is required.",
            "Create my free account →",
            "← Back to Home",
            "You can keep matching and asking questions without signing up."
        ],
        'pt-BR': [
            "Crie sua conta gratuita no MatchApp Ai",
            "Leve o MatchApp Ai com você",
            "Crie uma conta gratuita para acessar suas preferências, títulos salvos, histórico, atividades do Match Together e alertas em outros dispositivos. Você não precisa de cartão de crédito.",
            "Criar minha conta gratuita →",
            "← Voltar ao início",
            "Você pode continuar buscando sugestões e fazendo perguntas sem criar uma conta."
        ],
        'es': [
            "Crea tu cuenta gratuita de MatchApp Ai",
            "Lleva MatchApp Ai contigo",
            "Crea una cuenta gratuita para acceder a tus preferencias, títulos guardados, historial, actividad de Match Together y alertas en todos tus dispositivos. No necesitas tarjeta de crédito.",
            "Crear mi cuenta gratuita →",
            "← Volver al inicio",
            "Puedes seguir buscando recomendaciones y haciendo preguntas sin registrarte."
        ],
        'fr': [
            "Créez votre compte MatchApp Ai gratuit",
            "Emportez MatchApp Ai partout",
            "Créez un compte gratuit pour retrouver vos préférences, vos titres enregistrés, votre historique, votre activité Match Together et vos alertes sur tous vos appareils. Aucune carte bancaire requise.",
            "Créer mon compte gratuit →",
            "← Retour à l’accueil",
            "Vous pouvez continuer à chercher des suggestions et à poser des questions sans créer de compte."
        ],
        'de': [
            "Kostenloses MatchApp Ai-Konto erstellen",
            "Nimm MatchApp Ai mit",
            "Mit einem kostenlosen Konto hast du auf allen Geräten Zugriff auf deine Vorlieben, gespeicherten Titel, deinen Verlauf, deine Aktivitäten in Match Together und deine Benachrichtigungen. Du brauchst keine Kreditkarte.",
            "Kostenloses Konto erstellen →",
            "← Zur Startseite",
            "Du kannst auch ohne Konto Empfehlungen suchen und Fragen stellen."
        ],
        'it': [
            "Crea il tuo account gratuito su MatchApp Ai",
            "Porta MatchApp Ai con te",
            "Crea un account gratuito per ritrovare preferenze, titoli salvati, cronologia, attività di Match Together e avvisi su tutti i tuoi dispositivi. Non serve una carta di credito.",
            "Crea il mio account gratuito →",
            "← Torna alla home",
            "Puoi continuare a cercare suggerimenti e fare domande senza registrarti."
        ],
        'tr': [
            "Ücretsiz MatchApp Ai hesabını oluştur",
            "MatchApp Ai hep yanında",
            "Ücretsiz bir hesapla tercihlerinize, kaydettiğiniz yapımlara, geçmişinize, Match Together etkinliklerinize ve bildirimlerinize tüm cihazlarınızdan erişebilirsiniz. Kredi kartı gerekmez.",
            "Ücretsiz hesap oluştur →",
            "← Ana sayfaya dön",
            "Hesap açmadan öneri aramaya ve soru sormaya devam edebilirsiniz."
        ],
        'ru': [
            "Создайте бесплатный аккаунт MatchApp Ai",
            "Возьмите MatchApp Ai с собой",
            "Бесплатный аккаунт даёт доступ к вашим предпочтениям, сохранённым материалам, истории, действиям в Match Together и уведомлениям на разных устройствах. Банковская карта не нужна.",
            "Создать бесплатный аккаунт →",
            "← На главную",
            "Вы можете искать рекомендации и задавать вопросы без регистрации."
        ],
        'ar': [
            "أنشئ حسابك المجاني في MatchApp Ai",
            "اصطحب MatchApp Ai معك",
            "أنشئ حسابًا مجانيًا للوصول إلى تفضيلاتك وعناوينك المحفوظة وسجلّك ونشاطك في Match Together وتنبيهاتك عبر أجهزتك. لا تحتاج إلى بطاقة ائتمان.",
            "أنشئ حسابي المجاني ←",
            "→ العودة إلى الرئيسية",
            "يمكنك مواصلة البحث عن اقتراحات وطرح الأسئلة من دون إنشاء حساب."
        ],
        'hi': [
            "MatchApp Ai पर अपना मुफ़्त खाता बनाएँ",
            "MatchApp Ai को अपने साथ रखें",
            "मुफ़्त खाते से सभी डिवाइस पर अपनी पसंद, सहेजे गए शीर्षक, इतिहास, Match Together की गतिविधि और सूचनाएँ देखें। क्रेडिट कार्ड की ज़रूरत नहीं है।",
            "मेरा मुफ़्त खाता बनाएँ →",
            "← होम पर लौटें",
            "बिना खाता बनाए भी आप सुझाव खोज सकते हैं और सवाल पूछ सकते हैं।"
        ],
        'id': [
            "Buat akun MatchApp Ai gratis",
            "Bawa MatchApp Ai ke mana saja",
            "Dengan akun gratis, Anda dapat mengakses preferensi, judul tersimpan, riwayat, aktivitas Match Together, dan pemberitahuan di berbagai perangkat. Kartu kredit tidak diperlukan.",
            "Buat akun gratis saya →",
            "← Kembali ke beranda",
            "Anda tetap bisa mencari rekomendasi dan bertanya tanpa mendaftar."
        ],
        'ja': [
            "MatchApp Ai の無料アカウントを作成",
            "MatchApp Ai をどの端末でも",
            "無料アカウントを作成すると、好みの設定、保存した作品、履歴、Match Together のアクティビティ、通知を複数の端末で確認できます。クレジットカードは不要です。",
            "無料アカウントを作成 →",
            "← ホームに戻る",
            "登録しなくても、おすすめを探したり質問したりできます。"
        ],
        'ko': [
            "MatchApp Ai 무료 계정 만들기",
            "어디서나 MatchApp Ai와 함께하세요",
            "무료 계정을 만들면 여러 기기에서 취향 설정, 저장한 작품, 이용 기록, Match Together 활동 및 알림을 확인할 수 있어요. 신용카드는 필요 없어요.",
            "무료 계정 만들기 →",
            "← 홈으로 돌아가기",
            "가입하지 않아도 추천 작품을 찾고 질문할 수 있어요."
        ],
        'zh': [
            "创建免费的 MatchApp Ai 账户",
            "随时随地使用 MatchApp Ai",
            "创建免费账户，即可在不同设备上查看偏好设置、收藏的作品、历史记录、Match Together 活动和提醒。无需信用卡。",
            "创建我的免费账户 →",
            "← 返回首页",
            "无需注册，也可以继续查找推荐内容和提问。"
        ], "zh-TW": ["建立免費的 MatchApp Ai 帳戶","隨時隨地使用 MatchApp Ai","建立免費帳戶，即可在不同裝置上檢視偏好設定、收藏的作品、歷史記錄、Match Together 活動和提醒。無需信用卡。","建立我的免費帳戶 →","← 返回首頁","無需註冊，也可以繼續查詢推薦內容和提問。"]
    };
    for (const [language, values] of Object.entries(copy)) {
        fields.forEach((field, index) => { I18N[language]['registrationGateway.' + field] = values[index]; });
    }
    function updateDescription() {
        document.querySelector('meta[name="description"]').content = t('registrationGateway.details');
    }
    document.addEventListener('matchapp:langchange', updateDescription);
    applyTranslations(window.MATCH_LANG);
})();
