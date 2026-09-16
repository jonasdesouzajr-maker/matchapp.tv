/* Never-empty Match, never-repeat while a fresh title exists, device language. */
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
  function pickFresh(relaxTaste) {
    const shown = shownSet(), all = catalog();
    const ok = e => e && e.title && !shown.has(e.title) && (relaxTaste || window.tasteAllowsEntry(e));
    const preferred = all.filter(e => {
      if (!ok(e)) return false;
      const t = window.MATCH_TASTE; if (!t || !t.done) return true;
      const em = e.moods || [], ev = e.vibes || [], ec = e.cats || [];
      return (!t.moods?.length || em.some(m => t.moods.includes(m))) || (!t.vibes?.length || ev.some(v => t.vibes.includes(v))) || (!t.cats?.length || !ec.length || ec.some(c => t.cats.includes(c)));
    });
    const pool = preferred.length ? preferred : all.filter(ok);
    if (!pool.length) return null;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return { ...pick, platformVerified: true, source: pick.source || 'catalog' };
  }
  async function emergencyPick() {
    let hit = pickFresh(false) || pickFresh(true);
    if (hit) return hit;
    try { if (typeof window.discoverFromITunes === 'function') { hit = await window.discoverFromITunes([], [], [], [], []); if (hit && hit.title && !shownSet().has(hit.title)) return hit; } } catch (_) {}
    const all = catalog().filter(e => e && e.title);
    return all.length ? { ...all[Math.floor(Math.random() * all.length)], platformVerified: true, source: 'catalog-last' } : null;
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
    window.pickFromCatalog = function () {
      const hit = orig.apply(this, arguments);
      if (hit && hit.title && !shownSet().has(hit.title)) return hit;
      return pickFresh(false) || pickFresh(true) || hit || null;
    };
    window.pickFromCatalog.__guaranteed = true;
  }
  function wrapTrigger() {
    const orig = window.triggerMatch; if (!orig || orig.__guaranteed) return;
    window.triggerMatch = async function (isSpecific) {
      await orig.apply(this, arguments);
      const box = document.getElementById('result-box');
      const visible = box && box.style.display !== 'none' && box.offsetHeight > 0;
      if (visible || isSpecific) return;
      const pick = await emergencyPick(); if (pick) paintResult(pick);
    };
    window.triggerMatch.__guaranteed = true;
  }
  function wrapToast() {
    const orig = window.showToast; if (!orig || orig.__guaranteed) return;
    window.showToast = function (msg, isErr) {
      const text = String(msg || '');
      if (/no title|noFresh|inHistory|nenhum título|nada combina|já (visto|visto)|no match/i.test(text)) {
        emergencyPick().then(pick => { if (pick) paintResult(pick); });
        return;
      }
      return orig.apply(this, arguments);
    };
    window.showToast.__guaranteed = true;
  }
  function wrapAsk() {
    if (typeof window.askAIConversational !== 'function' || window.askAIConversational.__guarantee) return;
    const prev = window.askAIConversational;
    window.askAIConversational = async function (question, history) {
      const lang = window.MATCH_LANG || 'en';
      const steered = lang === 'en' ? String(question || '') : String(question || '') + '\n\nRespond in ' + lang + '. Use localized official titles.';
      let parsed = null;
      try { parsed = await prev(steered, history); } catch (_) { parsed = null; }
      if (!parsed || (!parsed.answer && !parsed.results?.length)) {
        parsed = { answer: lang.startsWith('pt') ? 'Aqui vai um ponto de partida. Peça um gênero, um humor ou uma plataforma e eu afino.' : 'Here is a starting point. Name a mood, format or platform and I will tighten it.', results: [] };
        const pick = pickFresh(true); if (pick) parsed.results = [{ title: pick.title, synopsis: pick.synopsis, platform: pick.platform }];
      }
      return parsed;
    };
    window.askAIConversational.__guarantee = true;
  }
  function boot() { bootLang(); wrapPick(); wrapTrigger(); wrapToast(); wrapAsk(); setInterval(() => { wrapPick(); wrapTrigger(); wrapToast(); wrapAsk(); }, 2500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
