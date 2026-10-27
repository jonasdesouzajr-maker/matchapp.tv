/* Authored translations for the two independent editorial guides. */
(function (w, d) {
  'use strict';
  var script = d.currentScript;
  var guide = script && script.getAttribute('data-seo-guide');
  if (!/^(choose-what-to-watch|streaming-device-discovery)$/.test(guide || '')) return;
  var copyVersion = guide === 'choose-what-to-watch' ? '20261027-1' : '20261018-1';
  var languages = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];
  var names = ['English', 'Português (Brasil)', 'Español', 'Français', 'Deutsch', 'Italiano', 'Türkçe', 'Русский', 'العربية', 'हिन्दी', 'Bahasa Indonesia', '日本語', '한국어', '中文'];
  var ui = {
    en: ['Language', 'Loading this guide in your language…', 'This translation could not be loaded. Please try again.', 'Try again'],
    'pt-BR': ['Idioma', 'Carregando este guia no seu idioma…', 'Não foi possível carregar esta tradução. Tente novamente.', 'Tentar novamente'],
    es: ['Idioma', 'Cargando esta guía en tu idioma…', 'No se pudo cargar esta traducción. Inténtalo de nuevo.', 'Volver a intentar'],
    fr: ['Langue', 'Chargement de ce guide dans votre langue…', 'Impossible de charger cette traduction. Veuillez réessayer.', 'Réessayer'],
    de: ['Sprache', 'Dieser Leitfaden wird in deiner Sprache geladen…', 'Diese Übersetzung konnte nicht geladen werden. Bitte versuche es erneut.', 'Erneut versuchen'],
    it: ['Lingua', 'Caricamento della guida nella tua lingua…', 'Impossibile caricare questa traduzione. Riprova.', 'Riprova'],
    tr: ['Dil', 'Bu rehber dilinizde yükleniyor…', 'Bu çeviri yüklenemedi. Lütfen tekrar deneyin.', 'Tekrar dene'],
    ru: ['Язык', 'Загружаем руководство на вашем языке…', 'Не удалось загрузить перевод. Повторите попытку.', 'Повторить'],
    ar: ['اللغة', 'جارٍ تحميل هذا الدليل بلغتك…', 'تعذّر تحميل هذه الترجمة. يُرجى المحاولة مجددًا.', 'إعادة المحاولة'],
    hi: ['भाषा', 'यह गाइड आपकी भाषा में लोड हो रही है…', 'यह अनुवाद लोड नहीं हो सका। कृपया फिर से कोशिश करें।', 'फिर से कोशिश करें'],
    id: ['Bahasa', 'Memuat panduan ini dalam bahasa Anda…', 'Terjemahan ini tidak dapat dimuat. Silakan coba lagi.', 'Coba lagi'],
    ja: ['言語', '選択した言語でガイドを読み込んでいます…', '翻訳を読み込めませんでした。もう一度お試しください。', '再試行'],
    ko: ['언어', '선택한 언어로 가이드를 불러오는 중…', '번역을 불러오지 못했습니다. 다시 시도해 주세요.', '다시 시도'],
    zh: ['语言', '正在以您选择的语言加载本指南…', '无法加载此翻译，请重试。', '重试']
  };
  var root = d.documentElement;
  var records = [];
  var schemas = [];
  var cache = Object.create(null);
  var ready = false;
  var sequence = 0;
  var controller = null;
  var timer = null;
  var select, label, status, message, retry;
  function normalize(value) {
    var code = String(value || '').trim().replace(/_/g, '-').toLowerCase();
    if (code === 'pt' || code.indexOf('pt-') === 0) return 'pt-BR';
    code = code.split('-')[0];
    return languages.indexOf(code) !== -1 ? code : 'en';
  }
  function preference() {
    var saved;
    try { saved = w.localStorage.getItem('match_lang'); } catch (_) {}
    return normalize(saved || w.MATCH_LANG || 'en');
  }
  var requested = preference();
  root.setAttribute('data-seo-guide', guide);
  root.setAttribute('data-seo-locale-state', requested === 'en' ? 'ready' : 'loading');
  root.lang = requested;
  root.dir = requested === 'ar' ? 'rtl' : 'ltr';
  function updateControls(state) {
    if (!ready) return;
    var copy = ui[requested];
    label.textContent = copy[0];
    select.setAttribute('aria-label', copy[0]);
    select.value = requested;
    status.hidden = state === 'ready';
    message.textContent = state === 'error' ? copy[2] : copy[1];
    message.setAttribute('data-ma-error',String(state==='error'));window.MatchAppErrors?.sync(message);
    retry.textContent = copy[3];
    retry.hidden = state !== 'error';
    var main = d.querySelector('main');
    if (main) main.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  }
  function state(value) {
    root.setAttribute('data-seo-locale-state', value);
    root.lang = requested;
    root.dir = requested === 'ar' ? 'rtl' : 'ltr';
    updateControls(value);
    d.querySelectorAll('main, footer, header > :not(.seo-guide-locale):not(.seo-guide-locale-status)').forEach(function (node) {
      if (value === 'ready') node.removeAttribute('inert');
      else node.setAttribute('inert', '');
    });
  }
  function validCopy(copy) {
    return !!copy && records.every(function (record) {
      return Object.prototype.hasOwnProperty.call(copy, record.key) &&
        typeof copy[record.key] === 'string' && copy[record.key].trim().length > 0;
    });
  }
  function updateSchemas(language) {
    var heading = d.querySelector('h1');
    var description = d.querySelector('meta[name="description"]');
    schemas.forEach(function (entry) {
      if (language === 'en') { entry.node.textContent = entry.original; return; }
      var value = JSON.parse(entry.original);
      var nodes = value['@graph'] || (Array.isArray(value) ? value : [value]);
      nodes.forEach(function (node) {
        var types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
        if (types.indexOf('Article') !== -1) {
          node.inLanguage = language;
          if (heading) node.headline = heading.textContent.trim();
          if (description) node.description = description.content;
        }
        if (types.indexOf('BreadcrumbList') !== -1 && Array.isArray(node.itemListElement) && heading) {
          var finalItem = node.itemListElement[node.itemListElement.length - 1];
          if (finalItem) finalItem.name = heading.textContent.trim();
        }
      });
      entry.node.textContent = JSON.stringify(value);
    });
  }
  function paint(language, copy) {
    if (!validCopy(copy)) throw new Error('Incomplete editorial translation');
    records.forEach(function (record) {
      if (record.attribute) record.node.setAttribute(record.attribute, copy[record.key]);
      else record.node.textContent = copy[record.key];
      if (record.node.closest('header, main, footer')) {
        record.node.lang = language;
        record.node.dir = language === 'ar' ? 'rtl' : 'ltr';
      }
    });
    d.querySelectorAll('header [lang], main [lang], footer [lang]').forEach(function (node) {
      if (!node.closest('.seo-guide-locale')) {
        node.lang = language;
        node.dir = language === 'ar' ? 'rtl' : 'ltr';
      }
    });
    updateSchemas(language);
    state('ready');
    d.dispatchEvent(new w.CustomEvent('matchapp:seo-guide-localized', { detail: { guide: guide, lang: language } }));
  }
  async function load(language) {
    requested = normalize(language);
    var current = ++sequence;
    if (controller) controller.abort();
    if (timer) w.clearTimeout(timer);
    controller = null;
    timer = null;
    if (!ready) { state(requested === 'en' ? 'ready' : 'loading'); return; }
    if (cache[requested]) { paint(requested, cache[requested]); return; }
    var target = requested;
    state('loading');
    d.title = 'MatchApp Ai';
    controller = new w.AbortController();
    var abort = controller;
    timer = w.setTimeout(function () { abort.abort(); }, 10000);
    try {
      var response = await w.fetch('/assets/i18n/seo/' + guide + '/' + target + '.json?v=' + copyVersion, {
        method: 'GET', mode: 'same-origin', credentials: 'omit', redirect: 'error', cache: 'no-cache', signal: abort.signal
      });
      if (!response.ok) throw new Error('Editorial translation unavailable');
      var body = await response.text();
      if (body.length > 500000) throw new Error('Editorial translation too large');
      var payload = JSON.parse(body);
      if (payload.guide !== guide || payload.language !== target || !validCopy(payload.copy)) {
        throw new Error('Unexpected editorial translation');
      }
      if (current !== sequence) return;
      cache[target] = payload.copy;
      paint(target, payload.copy);
    } catch (_) {
      if (current === sequence) state('error');
    } finally {
      if (current === sequence) {
        if (timer) w.clearTimeout(timer);
        timer = null;
        controller = null;
      }
    }
  }
  function changed(event) {
    var detail = event && event.detail;
    load(detail && detail.lang ? detail.lang : preference());
  }
  d.addEventListener('matchapp:langchange', changed);
  d.addEventListener('matchapp:languagechange', changed);
  w.addEventListener('storage', function (event) {
    if (event.key === 'match_lang') load(preference());
  });
  function setup() {
    var baseline = Object.create(null);
    d.querySelectorAll('[data-seo-copy]').forEach(function (node) {
      var key = node.getAttribute('data-seo-copy');
      records.push({ node: node, key: key });
      baseline[key] = node.textContent;
    });
    var allowed = ['content', 'aria-label', 'alt', 'title'];
    d.querySelectorAll('[data-seo-attr]').forEach(function (node) {
      node.getAttribute('data-seo-attr').split(';').forEach(function (part) {
        var colon = part.indexOf(':');
        var attribute = part.slice(0, colon).trim();
        var key = part.slice(colon + 1).trim();
        if (colon < 1 || !key || allowed.indexOf(attribute) === -1) return;
        records.push({ node: node, key: key, attribute: attribute });
        baseline[key] = node.getAttribute(attribute);
      });
    });
    d.querySelectorAll('script[type="application/ld+json"]').forEach(function (node) {
      try { JSON.parse(node.textContent); schemas.push({ node: node, original: node.textContent }); } catch (_) {}
    });
    if (!records.length || !validCopy(baseline)) return;
    cache.en = baseline;
    var controls = d.createElement('div');
    controls.className = 'seo-guide-locale';
    label = d.createElement('label');
    label.htmlFor = 'seo-guide-language';
    select = d.createElement('select');
    select.id = 'seo-guide-language';
    languages.forEach(function (language, index) {
      var option = d.createElement('option');
      option.value = language;
      option.lang = language;
      option.textContent = names[index];
      select.appendChild(option);
    });
    controls.append(label, select);
    var header = d.querySelector('header');
    (header || d.body).prepend(controls);
    status = d.createElement('div');
    status.className = 'seo-guide-locale-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    message = d.createElement('p');
    retry = d.createElement('button');
    retry.type = 'button';
    retry.addEventListener('click', function () { load(requested); });
    status.append(message, retry);
    controls.after(status);
    select.addEventListener('change', function () {
      var language = normalize(select.value);
      try { w.localStorage.setItem('match_lang', language); } catch (_) {}
      w.MATCH_LANG = language;
      d.dispatchEvent(new w.CustomEvent('matchapp:langchange', { detail: { lang: language } }));
    });
    ready = true;
    load(requested);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})(window, document);
