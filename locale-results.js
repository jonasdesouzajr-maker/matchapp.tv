/* Paint titles, synopses and Ask AI cards in the user's chosen language. */
(function () {
  'use strict';
  const NAMES = {
    en: 'English', 'pt-BR': 'Brazilian Portuguese', es: 'Spanish', fr: 'French',
    de: 'German', it: 'Italian', tr: 'Turkish', ru: 'Russian', ar: 'Arabic',
    hi: 'Hindi', id: 'Indonesian', ja: 'Japanese', ko: 'Korean', zh: 'Simplified Chinese'
  };
  const FALLBACK_PLATS = {
    Netflix: { cats: ['movie','series','limited series','documentary','stand-up comedy special','reality show','K-drama','anime','kids','short film','Bollywood','European cinema','telenovela','C-drama','J-drama','Turkish dizi','Gospel & Faith'] },
    'Prime Video': { cats: ['movie','series','limited series','documentary','stand-up comedy special','reality show','anime','kids','Bollywood','European cinema','Nollywood','Gospel & Faith'] },
    'Disney+': { cats: ['movie','series','limited series','documentary','kids','anime'] },
    Max: { cats: ['movie','series','limited series','documentary','stand-up comedy special','reality show','kids','anime'] },
    Spotify: { cats: ['podcast','Spotify playlist','Spotify single','music album','audiobook','Gospel & Faith'] },
    'Apple Music': { cats: ['Spotify single','music album','Spotify playlist','Gospel & Faith'] },
    'Apple Podcasts': { cats: ['podcast','audiobook'] },
    'YouTube Music': { cats: ['Spotify playlist','Spotify single','music album'] },
    Audible: { cats: ['audiobook','podcast'] },
    YouTube: { cats: ['movie','series','documentary','short film','stand-up comedy special','kids','YouTube Shorts','podcast'] }
  };
  const cache = new Map();
  const lang = () => window.MATCH_LANG || localStorage.getItem('match_lang') || document.documentElement.lang || 'en';
  const nameOf = () => NAMES[lang()] || 'English';

  window.criteriaCompatible = function (fieldKey, value, state) {
    if (!value || value === 'any') return true;
    if (window.matchPolicy?.incompatible(value, state) && fieldKey === 'mood') return false;
    const plats = window.PLATFORMS || FALLBACK_PLATS;
    const cats = (state?.cat || []).filter(v => v && v !== 'any');
    const platforms = (state?.plat || []).filter(v => v && v !== 'any');
    if (fieldKey === 'plat') {
      if (!cats.length) return true;
      const pf = plats[value];
      if (!pf) return true;
      return cats.some(c => (pf.cats || []).includes(c));
    }
    if (fieldKey === 'cat') {
      if (!platforms.length) return true;
      return platforms.some(p => ((plats[p] || {}).cats || []).includes(value));
    }
    return true;
  };

  async function translateText(text, kind) {
    const L = lang();
    if (!text || L === 'en') return text;
    const key = L + '::' + kind + '::' + text;
    if (cache.has(key)) return cache.get(key);
    const pending = (async () => {
      if (kind === 'title' && typeof window.localizedTitle === 'function') {
        try {
          const official = await window.localizedTitle(text);
          if (official && official !== text) return official;
        } catch (_) {}
      }
      if (kind === 'synopsis' && typeof window.localizeMatchSynopsis === 'function') {
        try { return await window.localizeMatchSynopsis(text, 'en'); } catch (_) {}
      }
      if (!window.supabaseClient) return text;
      try {
        const { data, error } = await window.supabaseClient.functions.invoke('gemini-proxy', {
          body: {
            prompt: (kind === 'title'
              ? 'Return only the official ' + nameOf() + ' title used in that market for this work. If there is no official localized title, transliterate naturally. No quotes, no commentary.\n\n'
              : 'Translate into ' + nameOf() + '. Keep facts. Return only the translation.\n\n') + text
          }
        });
        const out = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
        if (!error && out && out.length < 400) return out.replace(/^["']|["']$/g, '');
      } catch (_) {}
      return text;
    })();
    cache.set(key, pending);
    return pending;
  }
  window.localizeDisplayTitle = (title) => translateText(title, 'title');

  async function paintNode(el, kind) {
    if (!el || el.dataset.localePainted === lang()) return;
    const original = el.getAttribute('data-src-text') || el.textContent;
    if (!original || original.length < 2) return;
    el.setAttribute('data-src-text', original);
    const next = await translateText(original, kind);
    if (el.isConnected && next) {
      el.textContent = next;
      el.dataset.localePainted = lang();
    }
  }

  async function paintPage() {
    if (lang() === 'en') return;
    const title = document.getElementById('res-title');
    if (title) await paintNode(title, 'title');
    const syn = document.getElementById('res-synopsis');
    if (syn) await paintNode(syn, 'synopsis');
    document.querySelectorAll('.discover-card h3').forEach(h => paintNode(h, 'title'));
    document.querySelectorAll('.discover-card p').forEach(p => paintNode(p, 'synopsis'));
    document.querySelectorAll('.marquee-title').forEach(el => paintNode(el, 'title'));
  }

  function wrapAsk() {
    if (typeof window.askAIConversational !== 'function' || window.askAIConversational.__locale) return;
    const prev = window.askAIConversational;
    window.askAIConversational = async function (question, history) {
      const parsed = await prev(question, history);
      if (!parsed || lang() === 'en') return parsed;
      if (parsed.answer) parsed.answer = await translateText(parsed.answer, 'synopsis');
      if (Array.isArray(parsed.results)) {
        for (const item of parsed.results) {
          if (item.title) item.title = await translateText(item.title, 'title');
          if (item.synopsis) item.synopsis = await translateText(item.synopsis, 'synopsis');
        }
      }
      return parsed;
    };
    window.askAIConversational.__locale = true;
  }

  function decorateCriteria() {
    const state = window.getMatchCriteria?.() || {};
    const map = { 'q-category': 'cat', 'q-platform': 'plat', 'q-mood': 'mood', 'q-vibe': 'vibe', 'q-decade': 'decade', 'q-rating': 'rating' };
    document.querySelectorAll('.crit-collapsible').forEach(wrap => {
      const sel = wrap.querySelector('select');
      const key = map[sel && sel.id];
      if (!key) return;
      wrap.querySelectorAll('.crit-chip[data-value]').forEach(btn => {
        const value = btn.getAttribute('data-value');
        const on = btn.classList.contains('is-on') || btn.getAttribute('aria-pressed') === 'true';
        const ok = on || !window.criteriaCompatible || window.criteriaCompatible(key, value, state);
        btn.disabled = !ok;
        btn.classList.toggle('is-off', !ok);
        btn.setAttribute('aria-disabled', ok ? 'false' : 'true');
      });
    });
  }

  function boot() {
    wrapAsk();
    paintPage();
    decorateCriteria();
  }
  document.addEventListener('matchapp:langchange', () => {
    document.querySelectorAll('[data-locale-painted]').forEach(el => { delete el.dataset.localePainted; });
    paintPage();
  });
  document.addEventListener('matchapp:newmatch', paintPage);
  document.addEventListener('matchapp:criteriachange', decorateCriteria);
  document.addEventListener('matchapp:optionspruned', decorateCriteria);
  document.addEventListener('click', ev => {
    if (ev.target.closest?.('.crit-chip,.crit-toggle')) setTimeout(decorateCriteria, 30);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setInterval(wrapAsk, 1500);
})();
