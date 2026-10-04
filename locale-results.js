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
    '+SBT': { cats: ['novela brasileira','telenovela','series','movie','documentary','reality show','kids','anime'] },
    Spotify: { cats: ['podcast','Spotify playlist','Spotify single','music album','audiobook','Gospel & Faith'] },
    'Apple Music': { cats: ['Spotify single','music album','Spotify playlist','Gospel & Faith'] },
    'Apple Podcasts': { cats: ['podcast','audiobook'] },
    'YouTube Music': { cats: ['Spotify playlist','Spotify single','music album'] },
    Audible: { cats: ['audiobook','podcast'] },
    YouTube: { cats: ['movie','series','documentary','short film','stand-up comedy special','kids','YouTube Shorts','podcast'] }
  };
  const cache = new Map();
  const lang = () => window.matchResultLanguage?.() || window.MATCH_LANG || document.documentElement.lang || 'en';
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
    if (!text) return text;
    const key = L + '::' + kind + '::' + text;
    if (cache.has(key)) return cache.get(key);
    const pending = (async () => {
      if (kind === 'title' && typeof window.localizedTitle === 'function') {
        try {
          const official = await window.localizedTitle(text);
          return official || text;
        } catch (_) {}
        return text; // Preserve official identities; never invent translated work names.
      }
      if (kind === 'synopsis' && typeof window.localizeMatchSynopsis === 'function') {
        try { return await window.localizeMatchSynopsis(text, 'en', L); } catch (_) {}
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
        if (!error && out && out.length < 400) {
          const clean = (typeof window.sanitizeDisplayText === 'function')
            ? window.sanitizeDisplayText(out, kind === 'title' ? ['title'] : ['synopsis', 'answer', 'text'])
            : out.replace(/^["']|["']$/g, '');
          if (!clean || /^\s*[{\[]/.test(clean) || /"[a-zA-Z_]+"\s*:/.test(clean)) return text;
          return clean;
        }
      } catch (_) {}
      return text;
    })();
    cache.set(key, pending);
    const result=await pending;
    if(result===text)cache.delete(key);
    return result;
  }
  window.localizeDisplayTitle = (title) => translateText(title, 'title');

  const records=new WeakMap();
  const descriptions='.discover-synopsis,.ebook-summary,.reading-ai-description,[data-result-description]';
  async function paintNode(el, kind) {
    if(!el)return;
    const L=lang(),current=el.textContent,previous=records.get(el);
    const reused=previous&&current!==previous.painted;
    const original=reused?current:previous?.text||el.getAttribute('data-src-text')||current;
    const source=reused?(el.dataset.sourceLang||'en'):previous?.source||el.dataset.sourceLang||'en';
    if(!original?.trim()||(previous&&!reused&&previous.target===L))return;
    const state={text:original,source,target:L,painted:current};records.set(el,state);
    if(kind==='synopsis'&&source!==L){state.painted=window.t?.('global.guide')||'';el.textContent=state.painted;}
    const next=kind==='synopsis'?await (window.localizeVerifiedSynopsis||window.localizeMatchSynopsis)?.(original,source,L,el.dataset.resultTitle?{title:el.dataset.resultTitle,year:el.dataset.resultYear,kind:el.dataset.resultKind}:null):await translateText(original,kind);
    if(el.isConnected&&lang()===L&&records.get(el)===state&&el.textContent===state.painted){
      state.painted=next===original&&source!==L&&kind==='synopsis'&&!window.matchSynopsisWasTranslated?.(original,L)?window.matchTranslationUnavailable?.()||'':next||original;
      el.textContent=state.painted;
      el.dataset.localeLastText=state.painted;el.dataset.localePainted=L;
    }
  }
  function paintPage() {
    const title=document.getElementById('res-title');
    if(title&&!window.currentSynopsisSource)paintNode(title,'title');
    const syn=document.getElementById('res-synopsis');
    if(syn&&!window.currentSynopsisSource)paintNode(syn,'synopsis');
    document.querySelectorAll(descriptions).forEach(p=>paintNode(p,'synopsis'));
    document.querySelectorAll('.discover-card h3,.marquee-title').forEach(p=>paintNode(p,'title'));
  }
  let paintQueued=false;
  function schedulePaint(){if(paintQueued)return;paintQueued=true;queueMicrotask(()=>{paintQueued=false;paintPage();});}

  function wrapAsk() {
    if (typeof window.askAIConversational !== 'function' || window.askAIConversational.__locale) return;
    const prev = window.askAIConversational;
    window.askAIConversational = async function (question, history) {
      const parsed = await prev(question, history);
      if (!parsed || lang() === 'en') return parsed;
      if (parsed._live === true) return parsed; // This response already uses the selected language.
      // Offline answer is explanatory source text. Keep it instead of guessing a replacement.
      if (Array.isArray(parsed.results)) {
        for (const item of parsed.results) {
          if (item.title) {
            if (!item.originalTitle) item.originalTitle = item.title;
            item.displayTitle = await translateText(item.title, 'title');
          }
          if (item.synopsis) item.synopsis = await translateText(item.synopsis, 'synopsis');
        }
      }
      return parsed;
    };
    window.askAIConversational.__locale = true;
  }

  function decorateCriteria() {
    const state = window.getMatchCriteria?.() || {};
    const map = { 'q-category': 'cat', 'q-platform': 'plat', 'q-genre': 'genre', 'q-mood': 'mood', 'q-vibe': 'vibe', 'q-decade': 'decade', 'q-rating': 'rating' };
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
    const observer=new MutationObserver(changes=>{if(changes.some(c=>{const el=c.target.nodeType===1?c.target:c.target.parentElement;return el?.matches?.(descriptions)||el?.closest?.('.discover-card,#ebook-matcher-root,.reading-ai-card')||Array.from(c.addedNodes).some(n=>n.nodeType===1&&(n.matches?.(descriptions)||n.querySelector?.(descriptions)));}))schedulePaint();});
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
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
  function retryLateAsk(attempt=0){
    wrapAsk();
    if(attempt<8 && !window.askAIConversational?.__locale){
      setTimeout(()=>retryLateAsk(attempt+1),Math.min(1200,120*(attempt+1)));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>{boot();retryLateAsk();},{once:true});
  else {boot();retryLateAsk();}
  document.addEventListener('matchapp:ai-ready',()=>retryLateAsk(0));
})();
