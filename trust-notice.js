/* MatchApp improvement notice: paints the static top strip in the visitor's
   language (14 languages). Static markup ships in each page, so this only swaps
   text. No timers or loops; one attribute-filtered observer on <html lang>. */
(function () {
  'use strict';
  if (window.__maTrustNotice) return;
  window.__maTrustNotice = true;
  const COPY = {
    'en': 'MatchApp is improving its design and experience every day — you may still spot the occasional error.',
    'pt-BR': 'O MatchApp melhora o design e a experiência todos os dias — você ainda pode encontrar um erro ou outro.',
    'es': 'MatchApp mejora su diseño y su experiencia cada día; todavía podrías encontrar algún error.',
    'fr': 'MatchApp améliore son design et son expérience chaque jour — quelques erreurs peuvent encore apparaître.',
    'de': 'MatchApp verbessert Design und Nutzererlebnis jeden Tag – vereinzelt können noch Fehler auftreten.',
    'it': 'MatchApp migliora ogni giorno design ed esperienza: potresti ancora trovare qualche errore.',
    'tr': 'MatchApp tasarımını ve deneyimini her gün geliştiriyor; yine de ara sıra hatalarla karşılaşabilirsiniz.',
    'ru': 'MatchApp каждый день улучшает дизайн и удобство — иногда ещё могут встречаться ошибки.',
    'ar': 'يطوّر MatchApp تصميمه وتجربته كل يوم، وقد تصادف بعض الأخطاء أحياناً.',
    'hi': 'MatchApp हर दिन अपना डिज़ाइन और अनुभव बेहतर बना रहा है — कभी-कभी कोई गलती दिख सकती है।',
    'id': 'MatchApp menyempurnakan desain dan pengalamannya setiap hari — sesekali mungkin masih ada kesalahan.',
    'ja': 'MatchAppはデザインと使い心地を毎日改善しています。まれに不具合が見つかることがあります。',
    'ko': 'MatchApp은 매일 디자인과 사용 경험을 개선하고 있어요. 가끔 오류가 보일 수 있어요.',
    'zh': 'MatchApp 每天都在改进设计与使用体验，偶尔仍可能出现错误。'
  };
  const LABEL = {
    'en': 'Improvement notice', 'pt-BR': 'Aviso de melhorias', 'es': 'Aviso de mejoras', 'fr': 'Avis d’amélioration',
    'de': 'Hinweis zu Verbesserungen', 'it': 'Avviso sui miglioramenti', 'tr': 'İyileştirme bildirimi', 'ru': 'Уведомление об улучшениях',
    'ar': 'إشعار التحسينات', 'hi': 'सुधार सूचना', 'id': 'Pemberitahuan pembaruan', 'ja': '改善のお知らせ', 'ko': '개선 안내', 'zh': '改进提示'
  };
  const LANGS = Object.keys(COPY);
  function norm(value) {
    const low = String(value || '').trim().toLowerCase();
    if (!low) return '';
    if (low.startsWith('pt')) return 'pt-BR';
    if (low.startsWith('zh')) return 'zh';
    return LANGS.find(l => l.toLowerCase() === low) || LANGS.find(l => l.split('-')[0] === low.split(/[-_]/)[0]) || '';
  }
  function current(hint) {
    let l = norm(hint) || norm(document.documentElement.getAttribute('lang'));
    if (l) return l;
    try { l = norm(localStorage.getItem('match_lang')); } catch (_) {}
    return l || norm(navigator.language) || 'en';
  }
  let painted = '';
  function paint(hint) {
    const lang = current(hint);
    if (lang === painted) return;
    painted = lang;
    document.querySelectorAll('[data-ma-trust]').forEach(el => {
      const text = el.querySelector('.ma-trust-text');
      if (text) text.textContent = COPY[lang] || COPY.en;
      el.setAttribute('aria-label', LABEL[lang] || LABEL.en);
      el.setAttribute('lang', lang);
      el.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    });
  }
  function boot() {
    try { paint(); } catch (_) {}
    document.addEventListener('matchapp:langchange', e => {
      const d = e && e.detail;
      try { paint(typeof d === 'string' ? d : d && d.lang); } catch (_) {}
    });
    try { new MutationObserver(() => { try { paint(); } catch (_) {} }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
