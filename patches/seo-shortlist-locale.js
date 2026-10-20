/* Authored translations for the film/TV shortlist and its explicit choices only. */
(function (w, d) {
  'use strict';
  var languages = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];
  var messages = {
    en: ['Loading this selection in your language…', 'This translation could not be loaded. Please try again.', 'Try again'],
    'pt-BR': ['Carregando esta seleção no seu idioma…', 'Não foi possível carregar esta tradução. Tente novamente.', 'Tentar novamente'],
    es: ['Cargando esta selección en tu idioma…', 'No se pudo cargar esta traducción. Inténtalo de nuevo.', 'Volver a intentar'],
    fr: ['Chargement de cette sélection dans votre langue…', 'Impossible de charger cette traduction. Veuillez réessayer.', 'Réessayer'],
    de: ['Diese Auswahl wird in deiner Sprache geladen…', 'Diese Übersetzung konnte nicht geladen werden. Bitte versuche es erneut.', 'Erneut versuchen'],
    it: ['Caricamento della selezione nella tua lingua…', 'Impossibile caricare questa traduzione. Riprova.', 'Riprova'],
    tr: ['Bu seçki dilinizde yükleniyor…', 'Bu çeviri yüklenemedi. Lütfen tekrar deneyin.', 'Tekrar dene'],
    ru: ['Загружаем подборку на вашем языке…', 'Не удалось загрузить перевод. Повторите попытку.', 'Повторить'],
    ar: ['جارٍ تحميل هذه الاختيارات بلغتك…', 'تعذّر تحميل هذه الترجمة. يُرجى المحاولة مجددًا.', 'إعادة المحاولة'],
    hi: ['यह चयन आपकी भाषा में लोड हो रहा है…', 'यह अनुवाद लोड नहीं हो सका। कृपया फिर से कोशिश करें।', 'फिर से कोशिश करें'],
    id: ['Memuat pilihan ini dalam bahasa Anda…', 'Terjemahan ini tidak dapat dimuat. Silakan coba lagi.', 'Coba lagi'],
    ja: ['選択した言語でおすすめを読み込んでいます…', '翻訳を読み込めませんでした。もう一度お試しください。', '再試行'],
    ko: ['선택한 언어로 추천 목록을 불러오는 중…', '번역을 불러오지 못했습니다. 다시 시도해 주세요.', '다시 시도'],
    zh: ['正在以您选择的语言加载此精选列表…', '无法加载此翻译，请重试。', '重试']
  };
  var records = [];
  var controls = [];
  var cache = Object.create(null);
  var requested = '';
  var phase = '';
  var sequence = 0;
  var controller = null;
  var timer = null;
  var status, message, retry;
  function normalize(value) {
    var code = String(value || '').trim().replace(/_/g, '-').toLowerCase();
    if (code === 'pt' || code.indexOf('pt-') === 0) return 'pt-BR';
    code = code.split('-')[0];
    return languages.indexOf(code) !== -1 ? code : 'en';
  }
  function preference(eventLanguage) {
    var saved;
    try { saved = w.localStorage.getItem('match_lang'); } catch (_) {}
    return normalize(saved || eventLanguage || w.MATCH_LANG || 'en');
  }
  function setState(value) {
    phase = value;
    d.documentElement.setAttribute('data-shortlist-locale-state', value);
    status.hidden = value === 'ready';
    status.lang = requested;
    status.dir = requested === 'ar' ? 'rtl' : 'ltr';
    message.textContent = messages[requested][value === 'error' ? 1 : 0];
    retry.textContent = messages[requested][2];
    retry.hidden = value !== 'error';
    records.forEach(function (record) {
      if (value === 'ready') record.node.style.visibility = record.visibility;
      else record.node.style.visibility = 'hidden';
    });
    controls.forEach(function (entry) {
      if (value !== 'ready') entry.node.setAttribute('inert', '');
      else if (!entry.inert) entry.node.removeAttribute('inert');
    });
  }
  function validCopy(copy) {
    return !!copy && records.every(function (record) {
      return Object.prototype.hasOwnProperty.call(copy, record.key) &&
        typeof copy[record.key] === 'string' && copy[record.key].trim().length > 0;
    });
  }
  function paint(language, copy) {
    if (!validCopy(copy)) throw new Error('Incomplete shortlist translation');
    records.forEach(function (record) {
      record.node.textContent = copy[record.key];
      record.node.lang = language;
      record.node.dir = language === 'ar' ? 'rtl' : 'ltr';
    });
    setState('ready');
    d.dispatchEvent(new w.CustomEvent('matchapp:shortlist-localized', {detail: {lang: language}}));
  }
  async function load(language, force) {
    var next = normalize(language);
    if (!force && next === requested && (phase === 'ready' || phase === 'loading')) return;
    requested = next;
    var current = ++sequence;
    if (controller) controller.abort();
    if (timer) w.clearTimeout(timer);
    controller = null;
    timer = null;
    if (cache[next]) { paint(next, cache[next]); return; }
    setState('loading');
    controller = new w.AbortController();
    var abort = controller;
    timer = w.setTimeout(function () { abort.abort(); }, 8000);
    try {
      var response = await w.fetch('/assets/i18n/shortlists/' + next + '.json?v=20261020-1', {
        method: 'GET', mode: 'same-origin', credentials: 'omit', redirect: 'error', signal: abort.signal
      });
      if (!response.ok) throw new Error('Shortlist translation unavailable');
      var text = await response.text();
      if (text.length > 200000) throw new Error('Shortlist translation too large');
      var payload = JSON.parse(text);
      if (payload.language !== next || !validCopy(payload.copy)) throw new Error('Unexpected shortlist translation');
      if (current !== sequence) return;
      cache[next] = payload.copy;
      paint(next, payload.copy);
    } catch (_) {
      if (current === sequence) setState('error');
    } finally {
      if (current === sequence) {
        if (timer) w.clearTimeout(timer);
        timer = null;
        controller = null;
      }
    }
  }
  function setup() {
    var baseline = Object.create(null);
    d.querySelectorAll('[data-shortlist-copy]').forEach(function (node) {
      var key = node.getAttribute('data-shortlist-copy');
      if (!key || node.querySelector('[data-shortlist-copy]')) return;
      records.push({node: node, key: key, visibility: node.style.visibility});
      baseline[key] = node.textContent;
      var control = node.closest('a,button,summary');
      if (control && !controls.some(function (entry) { return entry.node === control; })) {
        controls.push({node: control, inert: control.hasAttribute('inert')});
      }
    });
    if (!records.length || !validCopy(baseline)) return;
    cache.en = baseline;
    status = d.createElement('div');
    status.className = 'seo-shortlist-locale-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    message = d.createElement('p');
    retry = d.createElement('button');
    retry.type = 'button';
    retry.className = 'seo-cta';
    retry.addEventListener('click', function () { load(requested, true); });
    status.append(message, retry);
    var host = d.querySelector('[data-shortlist-status-host]') || d.querySelector('.seo-shortlist');
    if (host) host.prepend(status);
    else records[0].node.parentNode.insertBefore(status, records[0].node);
    function changed(event) { load(preference(event && event.detail && event.detail.lang)); }
    d.addEventListener('matchapp:langchange', changed);
    w.addEventListener('matchapp:languagechange', changed);
    w.addEventListener('storage', function (event) {
      if (event.key === 'match_lang' || event.key === null) load(preference());
    });
    load(preference());
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', setup, {once: true});
  else setup();
})(window, document);
