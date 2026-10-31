/* The required TMDB legal notice remains verbatim alongside these local credits. */
(function () {
    'use strict';
    const credit = document.getElementById('availability-credit');
    if (!credit) return;

    const english = credit.textContent;
    const labels = {
        pt: 'Este produto usa a API do TMDB. O TMDB não endossa nem certifica o produto. O JustWatch fornece os dados regionais de streaming exibidos por meio do TMDB.',
        es: 'Este producto utiliza la API de TMDB. TMDB no lo avala ni lo certifica. JustWatch proporciona los datos de disponibilidad regional a través de TMDB.',
        fr: 'Ce produit utilise l’API de TMDB. TMDB ne le soutient ni ne le certifie. JustWatch fournit les données de disponibilité en streaming par région via TMDB.',
        de: 'Dieses Produkt nutzt die TMDB-API. TMDB empfiehlt oder zertifiziert es nicht. JustWatch liefert über TMDB die regionalen Streamingangebote.',
        it: 'Questo prodotto utilizza l’API di TMDB. TMDB non lo approva né lo certifica. JustWatch fornisce tramite TMDB i dati sulla disponibilità in streaming per paese.',
        tr: 'Bu ürün TMDB API’sini kullanır. TMDB ürünü onaylamaz veya belgelendirmez. Bölgelere göre yayın seçeneklerini TMDB aracılığıyla JustWatch sağlar.',
        ru: 'Этот продукт использует API TMDB. TMDB не одобряет и не сертифицирует его. JustWatch предоставляет через TMDB данные о доступности на стриминговых сервисах по регионам.',
        ar: 'يستخدم هذا المنتج واجهة برمجة تطبيقات TMDB. لم تمنحه TMDB تأييدها أو اعتمادها. توفّر JustWatch عبر TMDB بيانات خدمات البث المتاحة في كل منطقة.',
        hi: 'यह उत्पाद TMDB की API का उपयोग करता है। TMDB ने इसका समर्थन या प्रमाणीकरण नहीं किया है। अलग-अलग क्षेत्रों में उपलब्ध स्ट्रीमिंग सेवाओं की जानकारी JustWatch से TMDB के ज़रिए मिलती है।',
        id: 'Produk ini menggunakan API TMDB. TMDB tidak mendukung atau mengesahkan produk ini. JustWatch menyediakan informasi layanan streaming per wilayah melalui TMDB.',
        ja: 'この製品はTMDBのAPIを使用しています。TMDBによる推奨や認定は受けていません。地域ごとの配信情報はJustWatchが提供し、TMDBを通じて掲載しています。',
        ko: '이 제품은 TMDB API를 사용합니다. TMDB는 이 제품을 보증하거나 인증하지 않습니다. 지역별 스트리밍 정보는 JustWatch가 제공하며 TMDB를 통해 표시됩니다.',
        zh: '本产品使用 TMDB API，未获得 TMDB 的认可或认证。各地区的流媒体播放信息由 JustWatch 提供，并通过 TMDB 展示。'
    };

    function update() {
        let saved;
        try { saved = localStorage.getItem('match_lang'); } catch (_) {}
        const requested = window.MATCH_LANG || saved || new URLSearchParams(location.search).get('lang') || navigator.language || document.documentElement.lang;
        const lang = String(requested).toLowerCase().split(/[-_]/)[0];
        const localized = Object.hasOwn(labels, lang);
        credit.lang = localized ? (lang === 'pt' ? 'pt-BR' : lang) : 'en';
        credit.dir = lang === 'ar' ? 'rtl' : 'ltr';
        credit.textContent = localized ? labels[lang] : english;
    }

    update();
    document.addEventListener('matchapp:langchange', update);
    window.addEventListener('storage', function (event) {
        if (event.key === 'match_lang') update();
    });
})();
