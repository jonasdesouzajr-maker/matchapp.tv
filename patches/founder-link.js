/* The footer links retain their translated names when the app language changes. */
(function () {
  'use strict';
  const labels = {
  "en": [
    "Meet the founder",
    "Help us improve"
  ],
  "pt": [
    "Conheça o fundador",
    "Ajude a melhorar"
  ],
  "es": [
    "Conoce al fundador",
    "Ayúdanos a mejorar"
  ],
  "fr": [
    "Rencontrer le fondateur",
    "Aidez-nous à progresser"
  ],
  "de": [
    "Den Gründer kennenlernen",
    "Hilf uns, besser zu werden"
  ],
  "it": [
    "Conosci il fondatore",
    "Aiutaci a migliorare"
  ],
  "tr": [
    "Kurucuyla tanışın",
    "Gelişmemize yardım edin"
  ],
  "ru": [
    "Знакомство с основателем",
    "Помогите нам стать лучше"
  ],
  "id": [
    "Kenali pendirinya",
    "Bantu kami berkembang"
  ],
  "ja": [
    "創設者について",
    "改善にご協力ください"
  ],
  "ko": [
    "창립자 소개",
    "개선에 참여하기"
  ],
  "zh": [
    "认识创始人",
    "帮助我们改进"
  ],
  "ar": [
    "تعرّف على المؤسس",
    "ساعدنا على التحسّن"
  ],
  "hi": [
    "संस्थापक से मिलें",
    "हमें बेहतर बनाने में मदद करें"
  ]
};
  function paint() {
    let saved = '';
    try { saved = localStorage.getItem('match_lang') || ''; } catch (_) {}
    const lang = String(window.MATCH_LANG || saved || document.documentElement.lang || 'en').toLowerCase().split(/[-_]/)[0];
    const pair = Object.hasOwn(labels, lang) ? labels[lang] : labels.en;
    document.querySelectorAll('[data-founder-link]').forEach(link => { link.textContent = pair[0]; });
    document.querySelectorAll('[data-improve-link]').forEach(link => { link.textContent = pair[1]; });
  }
  document.addEventListener('matchapp:langchange', paint);
  window.addEventListener('pageshow', paint);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint, {once: true});
  else paint();
})();