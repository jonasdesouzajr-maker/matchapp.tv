/* Never-empty Match inside the user's criteria. Device language. Never a mismatched genre. */
(function () {
  'use strict';
  const SUPPORTED = ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
  function bootLang() {
    let current = window.MATCH_LANG || localStorage.getItem('match_lang') || '';
    if (current) { window.MATCH_LANG = current; document.documentElement.lang = current; return; }
    const nav = String((navigator.languages && navigator.languages[0]) || navigator.language || 'en');
    const low = nav.toLowerCase();
    let mapped = low.startsWith('pt') ? 'pt-BR' : (SUPPORTED.find(s => s === low.split('-')[0] || s.startsWith(low.split('-')[0])) || 'en');
    window.MATCH_LANG = mapped;
    try { localStorage.setItem('match_lang', mapped); } catch (_) {}
    document.documentElement.lang = mapped;
    document.dispatchEvent(new CustomEvent('matchapp:langchange', { detail: mapped }));
  }
  function shownSet() {
    const set = new Set();
    try { if (window.SESSION_SHOWN instanceof Set) window.SESSION_SHOWN.forEach(t => set.add(String(t))); } catch (_) {}
    try { JSON.parse(localStorage.getItem('match_seenList') || '[]').forEach(x => set.add(String(x.title || x))); } catch (_) {}
    try { JSON.parse(localStorage.getItem('match_recentTitles') || '[]').forEach(t => set.add(String(t))); } catch (_) {}
    (window.MATCH_TASTE?.exclude || []).forEach(t => set.add(String(t)));
    return set;
  }
  function catalog() { return (typeof CONTENT_CATALOG !== 'undefined' && Array.isArray(CONTENT_CATALOG)) ? CONTENT_CATALOG : []; }
  window.tasteAllowsEntry = function (entry) {
    const t = window.MATCH_TASTE; if (!t || !entry) return true;
    const title = String(entry.title || '');
    if ((t.exclude || []).some(x => title.toLowerCase() === String(x).toLowerCase())) return false;
    const em = entry.moods || [], ec = entry.cats || [];
    if ((t.avoidMoods || []).length && em.some(m => t.avoidMoods.includes(m))) return false;
    if ((t.avoidCats || []).length && ec.some(c => t.avoidCats.includes(c))) return false;
    return true;
  };
  function currentCriteria() {
    try { if (typeof window.getMatchCriteria === 'function') return window.getMatchCriteria(); } catch (_) {}
    return window.lastMatchCriteria || {};
  }
  function pickFreshFitting(criteria) {
    const shown = shownSet();
    const policy = window.matchPolicy;
    const extra = [];
    shown.forEach(t => extra.push(policy ? policy.key(t) : String(t).toLowerCase()));
    const pool = catalog().filter(e => {
      if (!e || !e.title || shown.has(e.title)) return false;
      if (typeof window.tasteAllowsEntry === 'function' && !window.tasteAllowsEntry(e)) return false;
      if (policy) return policy.matches(e, criteria || {}, extra);
      return true;
    });
    if (!pool.length) return null;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return { ...pick, platformVerified: true, source: pick.source || 'catalog' };
  }
  function paintResult(pick) {
    if (!pick) return false;
    const box = document.getElementById('result-box'), title = document.getElementById('res-title'), syn = document.getElementById('res-synopsis');
    const q = document.getElementById('questionnaire-box'), load = document.getElementById('loading-box');
    if (title) { title.textContent = pick.title; title.removeAttribute('data-src-text'); title.dataset.localePainted = ''; }
    if (syn) { syn.textContent = pick.synopsis || ''; syn.removeAttribute('data-src-text'); syn.dataset.localePainted = ''; }
    const badge = document.getElementById('res-platform-badge'); if (badge) badge.textContent = pick.platform || 'Match';
    if (load) load.style.display = 'none'; if (q) q.style.display = 'none'; if (box) box.style.display = 'block';
    try { window.SESSION_SHOWN?.add?.(pick.title); } catch (_) {}
    document.dispatchEvent(new CustomEvent('matchapp:newmatch', { detail: pick }));
    document.dispatchEvent(new Event('matchapp:langchange'));
    return true;
  }
  function wrapPick() {
    const orig = window.pickFromCatalog; if (!orig || orig.__guaranteed) return;
    window.pickFromCatalog = function (cat, plat, mood, vibe, rating, decade) {
      const criteria = { cat, plat, mood, vibe, rating, decade };
      const hit = orig.apply(this, arguments);
      if (hit && hit.title && (!window.matchPolicy || window.matchPolicy.matches(hit, criteria, []))) return hit;
      return pickFreshFitting(criteria);
    };
    window.pickFromCatalog.__guaranteed = true;
  }
  function wrapTrigger() {
    const orig = window.triggerMatch; if (!orig || orig.__guaranteed) return;
    window.triggerMatch = async function (isSpecific) {
      await orig.apply(this, arguments);
      const box = document.getElementById('result-box');
      const visible = box && box.style.display !== 'none' && (box.offsetHeight > 0 || box.classList.contains('is-revealed'));
      if (visible || isSpecific || document.body.classList.contains('match-searching')) return;
      const pick = pickFreshFitting(currentCriteria());
      if (pick) paintResult(pick);
    };
    window.triggerMatch.__guaranteed = true;
  }
  function wrapAsk() {
    if (typeof window.askAIConversational !== 'function' || window.askAIConversational.__guarantee) return;
    const prev = window.askAIConversational;
    window.askAIConversational = async function (question, history) {
      const lang = window.MATCH_LANG || 'en';
      const steered = lang === 'en' ? String(question || '') : String(question || '') + '\n\nRespond in ' + lang + '. Use localized official titles.';
      let parsed = null;
      try { parsed = await prev(steered, history); } catch (_) { parsed = null; }
      if (!parsed) parsed = { answer: '', results: [] };
      const policy = window.matchPolicy;
      const raw = Array.isArray(parsed.results) ? parsed.results : [];
      let results = raw.filter(item => item && item.title && (!policy || policy.fitsQuestion(item, question)));
      if (!results.length && policy) {
        results = catalog()
          .filter(e => e && e.title && policy.fitsQuestion(e, question) && window.tasteAllowsEntry(e))
          .slice(0, 6)
          .map(e => ({
            title: e.title,
            year: e.year || '',
            type: (e.cats && e.cats[0]) || '',
            platform: e.platform || '',
            synopsis: e.synopsis || '',
            cats: e.cats,
            moods: e.moods,
            watchUrl: e.watchUrl || ''
          }));
      }
      parsed.results = results;
      if (!parsed.answer) {
        parsed.answer = lang.startsWith('pt')
          ? (results.length ? 'Aqui estão títulos que combinam com o que você pediu.' : 'Não achei um título nesse gênero. Tente outro humor ou formato.')
          : (results.length ? 'Here are titles that match what you asked for.' : 'No title in that genre turned up. Try another mood or format.');
      }
      return parsed;
    };
    window.askAIConversational.__guarantee = true;
  }
  function boot() { bootLang(); wrapPick(); wrapTrigger(); wrapAsk(); setInterval(() => { wrapPick(); wrapTrigger(); wrapAsk(); }, 2500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
