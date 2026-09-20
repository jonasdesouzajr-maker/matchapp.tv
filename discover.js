/* ============================================================
   © 2026 MatchApp.tv — All Rights Reserved.
   Proprietary source code. Not licensed for reproduction, scraping,
   or reuse in competing products. See /terms.html Section 4.
   ============================================================ */

/* ============================================================
   MatchApp — AI NATURAL-LANGUAGE DISCOVERY
   Powers discover.html. Takes a plain-language question such as
   "Is there a TV show about Medecins Sans Frontieres?" and returns
   a real conversational answer (spoken and written) plus a ranked
   list of matching titles.

   BUG FIX (podcast-only results): the previous fallback searched
   movie + tvShow + podcast media for every question, unconditionally.
   iTunes' podcast search is far looser than its movie/show search —
   almost any phrase returns dozens of podcasts, while offbeat movie
   questions often return zero — so after filtering, results were
   frequently 100% podcasts regardless of what was asked. This
   version detects whether the question is actually about audio
   content before ever touching the podcast/music catalogs.

   Falls back to the keyless iTunes catalog if the AI proxy is
   unavailable, so the page never comes back empty — but the
   fallback is now honestly labelled as offline mode rather than
   presented as if it were the full conversational AI.
   ============================================================ */

const DISCOVER_MAX = 12;

function getQueryParam(name) {
    try { return new URLSearchParams(window.location.search).get(name) || ''; }
    catch (e) { return ''; }
}

function keepConversationAtStart() {
    return getQueryParam('focus') === 'start';
}

/* ---------- Intent detection ---------- */
// Decides whether the question is actually about audio (podcasts, music,
// playlists, singles, audiobooks) so the fallback never pulls in podcasts
// for a question about a movie. (The AI Concierge path does its own,
// identical intent check server-side, in the Edge Function.)
function detectAudioIntent(q) {
    return /\b(podcast|playlist|song|songs|music|album|albums|single|singles|audiobook|spotify|listen|radio show)\b/i.test(q);
}

/* ---------- AI conversational answer ---------- */

// Attempts to salvage JSON that was cut off mid-object (the classic symptom of
// a model hitting its token ceiling). Closes any unterminated string, then any
// still-open brackets, in the right order. Returns null if it's beyond saving.
function repairTruncatedJSON(raw) {
    let s = raw.slice(raw.indexOf('{'));
    // Drop trailing partial fragments so we don't close a half-written key or
    // an object that only has an opening brace. Order matters: strip the most
    // specific patterns first.
    s = s.replace(/,\s*\{\s*"[^"]*$/, '')   // ,{"tit      → partial key in a new object
         .replace(/,\s*"[^"]*$/, '')        // ,"tit       → partial key
         .replace(/,\s*\{\s*$/, '')         // ,{          → empty trailing object
         .replace(/,\s*$/, '');             // trailing comma

    let inStr = false, esc = false;
    const stack = [];
    for (const ch of s) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{' || ch === '[') stack.push(ch);
        else if (ch === '}' || ch === ']') stack.pop();
    }
    if (inStr) s += '"';
    while (stack.length) s += (stack.pop() === '{' ? '}' : ']');

    try { return JSON.parse(s); } catch (e) { return null; }
}

function parseAIResponse(data) {
    if (!data) throw new Error('AI unavailable');
    if (data.error) throw new Error(data.error);
    if (!data.candidates || !data.candidates[0]) throw new Error('AI unavailable');

    const raw = data.candidates[0].content.parts[0].text;
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s === -1) throw new Error('Bad AI format');

    let parsed = null;
    if (e !== -1) {
        try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { parsed = null; }
    }
    // Last resort before giving up: try to repair a truncated payload rather
    // than dropping the user into offline mode over a missing closing brace.
    if (!parsed) {
        parsed = repairTruncatedJSON(raw);
        if (parsed) console.warn('[MatchApp AI] Response was truncated; recovered it by repairing the JSON.');
    }
    if (!parsed) {
        console.error('[MatchApp AI] Could not parse response. finishReason:', data._finishReason,
            '| model:', data._servedByModel, '\nFirst 400 chars:', String(raw).slice(0, 400));
        throw new Error('Bad AI format');
    }
    if (!parsed.answer) throw new Error('Empty AI answer');
    parsed.results = parsed.results || [];
    parsed._live = true;
    return parsed;
}

async function askAIConversational(question, history) {
    if (!window.supabaseClient) {
        const err = new Error('No backend');
        err.aiUnavailable = true;
        throw err;
    }

    // The prompt engineering lives in the gemini-proxy Edge Function, so the
    // client sends structured params rather than a pre-built prompt string.
    const country = localStorage.getItem('match_user_country') || '';
    const age = localStorage.getItem('match_user_age') || '';
    const lang = window.MATCH_LANG || 'en';
    // Nickname so the AI can address the user by name. Optional by design —
    // an empty string simply means the AI stays neutral rather than guessing.
    const nickname = (typeof window.getUserNickname === 'function') ? window.getUserNickname() : '';
    const body = { mode: 'discover', question, lang, country, age, nickname, history: history || [] };

    // HARD TIMEOUT PER ATTEMPT. supabase-js's functions.invoke has no timeout
    // of its own, so if the Edge Function hangs — cold start, an upstream
    // Gemini stall, a bad deploy — this waited forever. With two attempts that
    // meant the page could sit on the loading meter indefinitely, which is
    // exactly the "no output, then it took too long" report. 18s is generous
    // enough for a genuine cold start but bounded, so the worst case is ~36s
    // and then an honest message rather than an open-ended wait.
    const AI_TIMEOUT_MS = 30000;
    const withTimeout = (promise) => Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI request timed out')), AI_TIMEOUT_MS))
    ]);

    // Two attempts of the SAME contract, not a fallback to a different one.
    // This used to retry with a bare {prompt} request on failure — but that
    // exact wire shape is ALSO what the specific-title-search flow sends
    // (app.js's fetchGeminiData), for a genuinely different purpose, expecting
    // a different response schema. The Edge Function can't tell the two
    // callers apart from an identical bare {prompt}, so a transient failure
    // on attempt 1 could get the WRONG schema forced onto attempt 2 —
    // Gemini structurally constrained into {title,synopsis,platform} while
    // being asked a conversational question, producing exactly the kind of
    // mismatched, wrong-shaped result that's confusing to look at. Retrying
    // the identical, correct contract removes that collision entirely.
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const { data, error } = await withTimeout(
                window.supabaseClient.functions.invoke('gemini-proxy', { body }));
            if (!error && data && !data.error) return parseAIResponse(data);
            if (attempt === 1) {
                console.warn('[MatchApp AI] Attempt 1 failed, retrying once:', (error && error.message) || (data && data.error) || 'unknown');
                continue;
            }
            const detail = (error && error.message) || (data && data.error) || 'unknown';
            console.error('[MatchApp AI] Both attempts failed:', detail,
                '\n→ Run the diagnostic to see exactly why: open /ai-check.html on this site.');
            const err = new Error('AI unavailable: ' + detail);
            err.aiUnavailable = true;   // lets the caller word the message honestly
            throw err;
        } catch (e) {
            if (attempt === 2) {
                e.aiUnavailable = true;
                throw e;
            }
            console.warn('[MatchApp AI] Attempt 1 threw, retrying once:', e.message || e);
        }
    }
    const err = new Error('AI unavailable');
    err.aiUnavailable = true;
    throw err;
}

/* ---------- Keyless fallback (intent-aware — the actual bug fix) ---------- */
function stripQuestionWords(q) {
    return q.replace(/^(is|are|was|were|does|do|did|can|could|what|which|who|where|when|why|how|show me|find me|any|there)\b/gi, ' ')
            .replace(/\b(a|an|the|about|on|for|with|tv|show|shows|series|movie|movies|film|films|please|me)\b/gi, ' ')
            .replace(/[?!.,]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
}

async function fallbackSearch(question, aiWasDown) {
    const term = stripQuestionWords(question) || question;
    const audioIntent = detectAudioIntent(question);
    // Only the media types that actually match intent are searched — this is
    // the fix for the "only podcasts" bug. A question about a movie will
    // never touch the podcast catalog at all now.
    const mediaTypes = audioIntent ? ['podcast', 'musicTrack'] : ['movie', 'tvShow'];

    const out = [];
    for (const media of mediaTypes) {
        try {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=${media}&limit=8`);
            if (!res.ok) continue;
            const data = await res.json();
            (data.results || []).forEach(r => {
                const title = r.trackName || r.collectionName;
                if (!title || out.some(o => o.title === title)) return;
                const genre = String(r.primaryGenreName || '');
                const row = {
                    title,
                    year: r.releaseDate ? String(r.releaseDate).substring(0, 4) : '',
                    type: media === 'tvShow' ? 'series' : (media === 'podcast' ? 'podcast' : (media === 'musicTrack' ? 'music' : 'movie')),
                    platform: 'any',
                    synopsis: r.longDescription || r.shortDescription || `${genre}${r.artistName ? ' — ' + r.artistName : ''}`.trim(),
                    _meta: {
                        artwork: (r.artworkUrl100 || '').replace('100x100bb', '600x900bb'),
                        preview: r.previewUrl || null,
                        storeUrl: r.trackViewUrl || r.collectionViewUrl || null
                    }
                };
                if (window.matchPolicy && !window.matchPolicy.fitsQuestion(row, question)) return;
                out.push(row);
            });
        } catch (e) { /* try next media type */ }
    }

    const offlineNote = (typeof t === 'function') ? t('discover.offlineNote') : "Our AI concierge is temporarily offline, so here's what our catalog found for you:";
    const noResults = (typeof t === 'function') ? t('discover.noResults') : `We couldn't find a confident match for "${question}". Try rephrasing with a title, topic or person.`;
    // When the AI itself was unreachable, saying "try rephrasing" blames the
    // user for a question that was probably fine, and sends them off rewording
    // it repeatedly to no effect. Say what actually happened instead.
    const aiDown = (typeof t === 'function') ? t('discover.aiDown')
        : "Our AI concierge couldn't be reached just now — this is on our side, not your question. Please try again in a moment.";

    const emptyMessage = aiWasDown ? aiDown : noResults;

    return {
        answer: out.length ? `${offlineNote} “${question}”` : emptyMessage,
        results: out.slice(0, DISCOVER_MAX),
        _live: false
    };
}

/* ---------- Typewriter reveal ---------- */
// Makes the answer feel spoken/written by a person rather than dumped on
// screen — mirrors how the loading meter narration already behaves.
function typewriterReveal(el, text, speedMs) {
    return new Promise(resolve => {
        el.textContent = '';
        el.style.display = 'block';
        let i = 0;
        const step = () => {
            if (i <= text.length) {
                el.textContent = text.slice(0, i);
                i += Math.max(1, Math.round(text.length / 90)); // scales with length, feels natural either way
                setTimeout(step, speedMs);
            } else {
                el.textContent = text;
                resolve();
            }
        };
        step();
    });
}

/* ---------- Text-to-speech ("read aloud") ---------- */
// Fully client-side via the Web Speech API — no backend needed. Voice and
// speed come from the user's Profile > Voice & AI settings (localStorage),
// with a sensible default matched to the current UI language.
function pickVoiceForLang(voices, lang) {
    const saved = localStorage.getItem('match_voice_name');
    if (saved) {
        const exact = voices.find(v => v.name === saved);
        if (exact) return exact;
    }
    const bcp = { 'pt-BR': 'pt-BR', 'zh': 'zh-CN' }[lang] || lang;
    return voices.find(v => v.lang && v.lang.toLowerCase().startsWith(bcp.toLowerCase()))
        || voices.find(v => v.lang && v.lang.toLowerCase().startsWith((bcp.split('-')[0] || 'en')))
        || voices.find(v => v.default)
        || voices[0] || null;
}

window.readAloud = function(text, btn) {
    if (!('speechSynthesis' in window)) {
        if (window.showToast) showToast((typeof t === 'function' ? t('discover.noTts') : 'Voice playback is not supported in this browser.'), true);
        return;
    }
    // Toggle off if this button is already speaking.
    if (btn && btn.classList.contains('speaking')) {
        speechSynthesis.cancel();
        btn.classList.remove('speaking');
        return;
    }
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();

    // Honour the user's choices from Profile > Settings. resolveVoice falls
    // back to language matching when they have not picked one, or when the
    // voice they picked is no longer installed on this device — an OS voice
    // can be removed, and a stale voiceURI would otherwise silently mute
    // playback rather than degrade to a sensible default.
    const S = window.MatchSettings;
    const voice = S ? S.resolveVoice(voices, window.MATCH_LANG || 'en')
                    : pickVoiceForLang(voices, window.MATCH_LANG || 'en');
    if (voice) { utter.voice = voice; utter.lang = voice.lang; }
    else { utter.lang = window.MATCH_LANG || 'en'; }
    utter.rate  = S ? S.get('voiceRate')  : parseFloat(localStorage.getItem('match_voice_rate') || '1');
    utter.pitch = S ? S.get('voicePitch') : 1;

    document.querySelectorAll('.discover-speak.speaking').forEach(b => b.classList.remove('speaking'));
    if (btn) btn.classList.add('speaking');
    utter.onend = () => { if (btn) btn.classList.remove('speaking'); };
    utter.onerror = () => { if (btn) btn.classList.remove('speaking'); };
    speechSynthesis.speak(utter);
};

/* ---------- Rendering ---------- */
function escapeDiscoverHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function discoverLabel(key, fallback) {
    return (typeof t === 'function' && t(key)) || fallback;
}

function justWatchLocale() {
    const country = (typeof localStorage !== 'undefined' && (localStorage.getItem('match_user_country') || '').trim()) || '';
    const named = {
        Brazil: 'br', Brasil: 'br', 'United States': 'us', USA: 'us', 'United Kingdom': 'gb', UK: 'gb',
        Mexico: 'mx', Spain: 'es', France: 'fr', Germany: 'de', Italy: 'it', Turkey: 'tr', Russia: 'ru',
        India: 'in', Indonesia: 'id', Japan: 'jp', 'South Korea': 'kr', China: 'cn', Portugal: 'pt',
        Argentina: 'ar', Canada: 'ca', Australia: 'au'
    };
    if (named[country]) return named[country];
    if (/^[A-Za-z]{2}$/.test(country)) return country.toLowerCase();
    const lang = window.MATCH_LANG || 'en';
    return ({ 'pt-BR': 'br', es: 'mx', fr: 'fr', de: 'de', it: 'it', tr: 'tr', ru: 'ru', ar: 'eg', hi: 'in', id: 'id', ja: 'jp', ko: 'kr', zh: 'cn' })[lang] || 'us';
}

function discoverWatchUrl(item) {
    if (item && item._viewing && item._viewing.href) return item._viewing.href;
    if (item && item.watchUrl) return item.watchUrl;
    const title = (item && (item.title || item.displayTitle)) || '';
    const isAudio = /podcast|album|music|audiobook/i.test((item && item.type) || '');
    if (typeof platformSearchUrl === 'function' && item && item.platform && item.platform !== 'any' &&
        typeof PLATFORMS !== 'undefined' && PLATFORMS[item.platform]) {
        const url = platformSearchUrl(item.platform, title);
        if (url && !/justwatch\.com\/us\//i.test(url)) return url;
    }
    try {
        if (typeof CONTENT_CATALOG !== 'undefined') {
            const e = CONTENT_CATALOG.find(x => x.title === item.title);
            if (e && e.platform && e.platform !== 'any' && typeof platformSearchUrl === 'function') {
                const url = platformSearchUrl(e.platform, e.title);
                if (url && !/justwatch\.com\/us\//i.test(url)) return url;
            }
        }
    } catch (err) {}
    if (isAudio) return `https://open.spotify.com/search/${encodeURIComponent(title)}`;
    return `https://www.justwatch.com/${justWatchLocale()}/search?q=${encodeURIComponent(title)}`;
}

function isDiscoverDisliked(title) {
    if (!title) return false;
    try {
        const list = JSON.parse(localStorage.getItem('match_dislikedList') || '[]');
        if (list.some(i => (i.title || i) === title)) return true;
    } catch (e) {}
    try {
        if ((window.MATCH_TASTE?.exclude || []).some(x => String(x).toLowerCase() === String(title).toLowerCase())) return true;
    } catch (e) {}
    return false;
}

function enrichDiscoverItem(item, question) {
    if (!item || !item.title) return null;
    const policy = window.matchPolicy;
    if (policy && question && !policy.fitsQuestion(item, question)) return null;
    try {
        if (typeof CONTENT_CATALOG !== 'undefined') {
            const k = policy ? policy.key(item.title) : String(item.title).toLowerCase();
            const e = CONTENT_CATALOG.find(x => x && (policy ? policy.key(x.title) === k : x.title === item.title));
            if (e) {
                item.title = e.title;
                if (!item.synopsis) item.synopsis = e.synopsis;
                if (!item.platform || item.platform === 'any') item.platform = e.platform;
                if (!item.year) item.year = e.year || '';
                if (!item.type) item.type = (e.cats && e.cats[0]) || item.type || '';
                item.cats = e.cats;
                item.moods = e.moods;
                if (e.watchUrl) item.watchUrl = item.watchUrl || e.watchUrl;
            }
        }
    } catch (err) {}
    return item;
}

async function enrichDiscoverMedia(item) {
    if (!item || !item.title || !window.MatchAppCatalogMedia?.lookup) return item;
    try {
        const rawType = String(item.type || '').toLowerCase();
        const kind = /movie|film/.test(rawType) ? 'movie' : (/series|tv|show|drama|anime|novela|documentary/.test(rawType) ? 'tv' : '');
        let meta = await window.MatchAppCatalogMedia.lookup(item.title, {
            year: item.year || '',
            kind: kind || ''
        });
        if (meta && window.MatchAppCatalogMedia.refreshExact) {
            meta = await window.MatchAppCatalogMedia.refreshExact(meta);
        }
        if (!meta && window.MatchAppCatalogMedia.lookupLive) {
            meta = await window.MatchAppCatalogMedia.lookupLive(item.title, {
                year: item.year || '',
                kind: kind || '',
                cats: item.cats || []
            });
        }
        if (!meta) {
            if (item.platform && item.platform !== 'any') item._aiPlatformHint = item.platform;
            item.platform = '';
            item._availabilityVerified = false;
            return item;
        }
        item._catalogMedia = meta;
        item._availabilityVerified = true;
        if (meta.year) item.year = meta.year;
        if (meta.overview) item.synopsis = meta.overview;
        if (Array.isArray(meta.genres) && meta.genres.length) item.realGenres = meta.genres.slice(0, 8);
        if (!item.type || item.type === 'any') item.type = meta.media_kind === 'tv' ? 'series' : (meta.media_kind || item.type);
        item._viewing = window.MatchAppCatalogMedia.viewingTarget?.(meta, item.title) || null;
        if (item._viewing?.provider) item.platform = item._viewing.provider;
        else if (item._viewing?.mode === 'cinema') item.platform = '';
    } catch (_) {}
    return item;
}

function itemFromTitle(name) {
    const wanted = titleKey(name);
    if (!wanted) return { title: String(name || '').trim(), year: '', type: '', platform: '', synopsis: '' };
    let entry = null;
    try {
        if (typeof CONTENT_CATALOG !== 'undefined' && Array.isArray(CONTENT_CATALOG)) {
            entry = CONTENT_CATALOG.find(e => e && titleKey(e.title) === wanted) || null;
        }
    } catch (err) { entry = null; }
    if (!entry) return { title: String(name || '').trim(), year: '', type: '', platform: '', synopsis: '' };
    return {
        title: entry.title,
        year: entry.year || '',
        type: (entry.cats && entry.cats[0]) || '',
        platform: entry.platform || '',
        synopsis: entry.synopsis || '',
        cats: entry.cats,
        moods: entry.moods,
        watchUrl: entry.watchUrl || '',
        _fromCatalog: true
    };
}

function discoverIsEpisodic(item) {
    const blob = [item && item.type].concat((item && item.cats) || []).join(' ').toLowerCase();
    if (/\b(movie|film|short film)\b/.test(blob) && !/\bseries\b/.test(blob)) return false;
    return true;
}

function discoverWhereLabel(item) {
    if (item?._viewing?.mode === 'cinema') return discoverLabel('discover.inCinemas', 'In cinemas');
    const p = item && item.platform && item.platform !== 'any' ? String(item.platform) : '';
    return p;
}

function discoverStartLabel(item) {
    const year = parseInt(item && item.year, 10);
    if (!year) return '';
    const nowY = new Date().getFullYear();
    if (item?._viewing?.mode === 'cinema') return discoverLabel('discover.inCinemas', 'In cinemas');
    if (year > nowY) return discoverLabel('discover.startsIn', 'Starts {year}').replace('{year}', String(year));
    if (year === nowY) return discoverLabel('discover.nowStreaming', 'Now streaming');
    if (discoverIsEpisodic(item)) return discoverLabel('discover.sinceYear', 'Since {year}').replace('{year}', String(year));
    return discoverLabel('discover.premiered', 'Premiered {year}').replace('{year}', String(year));
}

function discoverFactsHTML(item) {
    const where = discoverWhereLabel(item);
    const when = discoverStartLabel(item);
    if (!where && !when) return '';
    const rows = [];
    if (where) {
        rows.push(`<div class="discover-fact"><span class="discover-fact-k">${escapeDiscoverHtml(discoverLabel('discover.whereToWatch', 'Where to watch'))}</span> <span class="discover-where">${escapeDiscoverHtml(where)}</span></div>`);
    }
    if (when) {
        rows.push(`<div class="discover-fact"><span class="discover-fact-k">${escapeDiscoverHtml(discoverLabel('discover.whenItStarts', 'When it starts'))}</span> <span class="discover-when">${escapeDiscoverHtml(when)}</span></div>`);
    }
    return `<div class="discover-facts">${rows.join('')}</div>`;
}

function paintDiscoverFacts(item, idx) {
    const card = document.querySelector(`[data-discover-idx="${idx}"]`);
    if (!card) return;
    const html = discoverFactsHTML(item);
    let facts = card.querySelector('.discover-facts');
    if (!html) {
        if (facts) facts.remove();
        return;
    }
    if (facts) {
        facts.outerHTML = html;
        return;
    }
    const syn = card.querySelector('.discover-synopsis');
    const metaEl = card.querySelector('.discover-meta');
    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    const node = wrap.firstElementChild;
    if (!node) return;
    if (syn) syn.parentNode.insertBefore(node, syn);
    else if (metaEl) metaEl.after(node);
    else {
        const body = card.querySelector('.discover-body');
        if (body) body.appendChild(node);
    }
}

let lastDiscoverQuestion = '';

function catalogCousins(item, take) {
    take = take || 4;
    if (typeof CONTENT_CATALOG === 'undefined' || !Array.isArray(CONTENT_CATALOG) || !item || !item.title) return [];
    let self = null;
    try { self = CONTENT_CATALOG.find(e => e.title === item.title) || null; } catch (e) { self = null; }
    const cats = new Set([].concat(self?.cats || [], item.type ? [item.type] : []));
    const moods = new Set(self?.moods || []);
    const cast = new Set(self?.cast || []);
    const platform = self?.platform || item.platform;
    const FORMAT_CATS = new Set(['movie','series','limited series','short film','YouTube channel','YouTube Shorts','podcast']);
    return CONTENT_CATALOG
        .filter(e => e && e.title && e.title !== item.title && !isDiscoverDisliked(e.title))
        .filter(e => !window.matchPolicy || window.matchPolicy.sameFamily(self || item, e))
        .map(e => {
            let s = 0;
            (e.cast || []).forEach(c => { if (cast.has(c)) s += 40; });
            (e.cats || []).forEach(c => { if (cats.has(c)) s += FORMAT_CATS.has(c) ? 4 : 20; });
            (e.moods || []).forEach(m => { if (moods.has(m)) s += 16; });
            if (platform && e.platform === platform) s += 4;
            if (self?.year && e.year && Math.abs(Number(e.year) - Number(self.year)) <= 5) s += 3;
            return { e, s };
        })
        .filter(x => x.s >= 16)
        .sort((a, b) => b.s - a.s)
        .slice(0, take)
        .map(({ e }) => ({
            title: e.title,
            year: e.year || '',
            type: (e.cats && e.cats[0]) || item.type || '',
            platform: e.platform || '',
            synopsis: e.synopsis || '',
            synopsisLang: 'en',
            why: 'idea',
            _fromCatalog: true
        }));
}

function discoverCardHTML(item, idx) {
    const rawTitle = String(item.displayTitle || item.title || '');
    const title = (typeof window.sanitizeDisplayText === 'function')
        ? window.sanitizeDisplayText(rawTitle, ['title'])
        : rawTitle;
    const safe = escapeDiscoverHtml(title);
    const meta = escapeDiscoverHtml([item.year, item.type, item.platform && item.platform !== 'any' ? item.platform : '']
        .filter(Boolean).join(' · '));
    const isAudio = /podcast|album|music|audiobook/i.test(item.type || '');
    const cinemaOnly = item?._viewing?.mode === 'cinema';
    const verifiedStream = item?._viewing?.mode === 'stream';
    const watchLabel = cinemaOnly
        ? discoverLabel('discover.cinemaShowtimes', '🎟️ Cinemas & showtimes')
        : (verifiedStream
            ? (isAudio ? discoverLabel('res.listennow', '🎧 Listen Now') : discoverLabel('discover.watchNow', '▶ Watch Now'))
            : discoverLabel('discover.whereToWatch', 'Where to Watch'));
    const saveLabel = discoverLabel('res.watchlater', '⭐ Watch Later');
    const nfmLabel = discoverLabel('res.notforme', '👎 Not For Me');
    const whyText = item.why === 'director'
        ? discoverLabel('discover.sameDirector', 'Same director') + (item.directorName ? ' · ' + item.directorName : '')
        : (item.why === 'idea' ? discoverLabel('discover.sameIdea', 'Same idea') : '');
    const synopsis = escapeDiscoverHtml((typeof window.sanitizeDisplayText === 'function'
        ? window.sanitizeDisplayText(item.synopsis, ['synopsis'])
        : item.synopsis) || '');
    const lang = window.MATCH_LANG || 'en';
    const facts = discoverFactsHTML(item);
    const categories = Array.isArray(item.realGenres) && item.realGenres.length
        ? `<div class="discover-categories" aria-label="${escapeDiscoverHtml(discoverLabel('discover.categories','Genres'))}">${item.realGenres.slice(0,8).map(c => `<span class="discover-category">${escapeDiscoverHtml(c)}</span>`).join('')}</div>`
        : '';
    const ribbon = cinemaOnly ? `<span class="discover-cinema-ribbon">${escapeDiscoverHtml(discoverLabel('discover.inCinemas','In cinemas'))}</span>` : '';
    const metaLine = facts
        ? (item.type ? `<div class="discover-meta">${escapeDiscoverHtml(item.type)}</div>` : '')
        : (meta ? `<div class="discover-meta">${meta}</div>` : '');
    return `
    <article class="discover-card${item.why ? ' is-related' : ''}" data-discover-idx="${idx}">
        <div class="discover-poster">
            ${ribbon}
            <img id="dp-${idx}" src="" alt="${safe}" loading="lazy">
            <div class="discover-rank">${item.why ? '＋' : '#' + (idx + 1)}</div>
        </div>
        <div class="discover-body">
            ${whyText ? `<div class="discover-why">${escapeDiscoverHtml(whyText)}</div>` : ''}
            <h3 data-src-text="${escapeDiscoverHtml(item.title || title)}" data-locale-painted="${lang}">${safe}</h3>
            ${metaLine}
            ${facts}
            ${categories}
            <div id="discover-availability-${idx}" class="matchapp-card-availability" hidden></div>
            <p class="discover-synopsis" data-locale-painted="${lang}">${synopsis}</p>
            <div id="discover-preview-${idx}" class="discover-card-preview" hidden></div>
            <div class="discover-actions">
                <a id="dl-${idx}" class="gold-btn discover-play${cinemaOnly ? ' is-cinema' : ''}" href="#" target="_blank" rel="noopener">${watchLabel}</a>
                <button type="button" class="discover-save" onclick="saveDiscoverItem(${idx})" id="ds-${idx}">${saveLabel}</button>
                <button type="button" class="discover-nfm" onclick="notForMeDiscoverItem(${idx})" id="dn-${idx}">${nfmLabel}</button>
            </div>
        </div>
    </article>`;
}

function paintDiscoverGenres(item, idx) {
    const card = document.querySelector(`[data-discover-idx="${idx}"]`);
    if (!card) return;
    const genres = Array.isArray(item?.realGenres) ? item.realGenres.filter(Boolean).slice(0, 8) : [];
    let host = card.querySelector('.discover-categories');
    if (!genres.length) { host?.remove(); return; }
    const html = `<div class="discover-categories" aria-label="${escapeDiscoverHtml(discoverLabel('discover.categories','Genres'))}">${genres.map(g => `<span class="discover-category">${escapeDiscoverHtml(g)}</span>`).join('')}</div>`;
    if (host) { host.outerHTML = html; return; }
    const synopsis = card.querySelector('.discover-synopsis');
    synopsis?.insertAdjacentHTML('beforebegin', html);
}

let DISCOVER_ITEMS = [];

// Platforms where iTunes/TVMaze coverage is unreliable enough that a live
// lookup is more likely to return something WRONG than nothing at all —
// this is what "A Gata Comeu" (Globoplay) exposed: the AI chat path had none
// of the protections app.js's main match render already had (verified
// poster registry, category/platform-based skip), so a Globoplay title
// could still trigger a live search that came back with an unrelated
// result. Checking the platform Gemini itself returned is a reliable,
// already-available signal — no guesswork needed.
const HIGH_RISK_PLATFORMS_DISCOVER = new Set(['globoplay', 'reelshort', 'dramabox', 'shortmax', 'pure flix', 'angel studios']);

function discoverFallbackPoster(item) {
    if (!item || !item.title) return '';
    const meta = {
        cats: item.type ? [item.type] : [],
        moods: Array.isArray(item.moods) ? item.moods : [],
        platform: item.platform || '',
        synopsis: item.synopsis || item.overview || ''
    };
    if (typeof generatedCover === 'function') return generatedCover(item.title, meta);
    if (typeof generateLocalPosterSVG === 'function') return generateLocalPosterSVG(item.title, meta);
    return '';
}

async function hydrateDiscoverCard(item, idx) {
    const img = document.getElementById('dp-' + idx);
    const link = document.getElementById('dl-' + idx);
    if (!img) return;

    const fallbackArtwork = discoverFallbackPoster(item);
    img.src = fallbackArtwork;
    item._fallbackArtwork = fallbackArtwork;

    // Hand-verified art (parity with app.js's render path) always wins —
    // no lookup can beat a known-correct image.
    const verified = (typeof getVerifiedPoster === 'function') ? getVerifiedPoster(item.title) : null;

    // AI-chat titles come from Gemini's free-form knowledge, not our curated
    // catalog, so they're inherently less trustworthy than a match-engine
    // result — meaning the bar for "risk a live lookup at all" should be
    // LOWER here, not the same. If the platform Gemini named is one where
    // external catalogs have unreliable coverage, or the category-check
    // flags it, skip every live lookup entirely rather than gambling on the
    // relevance guard catching a bad result.
    const platformIsHighRisk = item.platform && HIGH_RISK_PLATFORMS_DISCOVER.has(String(item.platform).toLowerCase());
    const categoryIsHighRisk = (typeof isHighRiskCategory === 'function') && isHighRiskCategory(item.type, item.title);
    const skipLiveLookup = platformIsHighRisk || categoryIsHighRisk;

    let meta = item._meta || null;
    if (!meta && item._catalogMedia) {
        const cm = item._catalogMedia;
        meta = {
            artwork: cm.poster_large_url || cm.poster_url || '',
            year: cm.year || item.year || '',
            overview: cm.overview || '',
            tmdbId: cm.tmdb_id || null,
            kind: cm.media_kind || '',
            source: 'catalog-media',
            title: cm.title || item.title,
            genres: Array.isArray(cm.genres) ? cm.genres.slice(0, 8) : []
        };
    }
    const visualType = !/podcast|album|music|audiobook/i.test(item.type || '');
    if (!meta && !skipLiveLookup && !verified && visualType && typeof window.tmdbLookup === 'function') {
        const kind = /movie|film/i.test(item.type || '') ? 'movie' : /series|tv|drama|anime|novela|show|documentary/i.test(item.type || '') ? 'tv' : '';
        const tmdb = await window.tmdbLookup(item.title, { year: item.year || '', kind });
        if (tmdb && (tmdb.posterLarge || tmdb.poster)) {
            meta = { artwork: tmdb.posterLarge || tmdb.poster, year: tmdb.year || item.year || '', overview: tmdb.overview || '', tmdbId: tmdb.tmdbId, kind: tmdb.kind, source: 'tmdb', title: tmdb.title, genres: Array.isArray(tmdb.genres) ? tmdb.genres.slice(0,8) : [] };
            item._tmdb = tmdb;
        }
    }
    let richMeta = null;
    if (!item._catalogMedia && !skipLiveLookup && typeof getRichMetadata === 'function') {
        // Apple metadata is exact-identity guarded in app.js. Keep it separate
        // from TMDB artwork so it can supply a genuine preview and source genre
        // even when TMDB already supplied the poster.
        let chatHints = {};
        try {
            if (typeof CONTENT_CATALOG !== 'undefined') {
                const e = CONTENT_CATALOG.find(x => x.title === item.title);
                if (e) chatHints = { year: e.year, country: e.country, countryCode: e.countryCode };
            }
        } catch (err) {}
        richMeta = await getRichMetadata(item.title, item.type || '', chatHints);
        if (!meta && !verified && richMeta) meta = richMeta;
    }
    // The TVMaze secondary attempt is deliberately NOT used for AI-chat
    // results at all (unlike the main match render, which does use it for
    // catalog-sourced titles). A curated catalog entry's title is something
    // we wrote and know precisely; an AI-chat title is Gemini's free-form
    // best guess — stacking a second, looser lookup on top of that is where
    // the remaining risk lived, for a real-cover gain that isn't worth it
    // here.

    if (Array.isArray(item._catalogMedia?.genres) && item._catalogMedia.genres.length) {
        item.realGenres = item._catalogMedia.genres.slice(0, 8);
    } else if (Array.isArray(meta?.genres) && meta.genres.length) {
        item.realGenres = meta.genres.slice(0, 8);
    } else if (richMeta?.genre) {
        item.realGenres = [String(richMeta.genre)];
    } else if (!item.realGenres?.length && typeof fetchTitleMeta === 'function' &&
               /series|tv|show|drama|anime|novela|documentary/i.test(rawType) &&
               !/movie|film/i.test(rawType) && !skipLiveLookup) {
        try {
            const tvMeta = await fetchTitleMeta(item.title, { year: item.year || '' });
            if (Array.isArray(tvMeta?.genres) && tvMeta.genres.length) item.realGenres = tvMeta.genres.slice(0, 8);
        } catch (_) {}
    }
    paintDiscoverGenres(item, idx);

    let resolvedArtwork = fallbackArtwork;
    if (verified) {
        img.onerror = function () { this.onerror = null; this.src = fallbackArtwork; };
        img.src = verified;
        resolvedArtwork = verified;
    } else if (meta && meta.artwork) {
        img.onerror = function () {
            this.onerror = null;
            this.src = fallbackArtwork;
        };
        img.src = meta.artwork;
        resolvedArtwork = meta.artwork;
    }
    // If no external artwork survives the verified lookup chain, keep the
    // synopsis-aware MatchApp poster and persist that same artwork into
    // history / Watch Later instead of saving a blank poster URL.
    item._resolved = Object.assign({}, meta || {}, {
        artwork: resolvedArtwork,
        source: verified ? 'verified' : ((meta && meta.source) || 'matchapp-generated')
    });

    if (meta && meta.overview) {
        const lang = window.MATCH_LANG || 'en';
        const short = !item.synopsis || String(item.synopsis).length < 24;
        const preferLocalized = lang !== 'en' && meta.source === 'tmdb';
        if (short || preferLocalized) {
            item.synopsis = meta.overview;
            const syn = document.querySelector(`[data-discover-idx="${idx}"] .discover-synopsis`);
            if (syn) syn.textContent = (typeof window.sanitizeDisplayText === 'function')
                ? window.sanitizeDisplayText(meta.overview, ['synopsis'])
                : meta.overview;
        }
    }
    if (meta && meta.title && meta.source === 'tmdb') {
        item.displayTitle = meta.title;
        const h3 = document.querySelector(`[data-discover-idx="${idx}"] h3`);
        if (h3) h3.textContent = meta.title;
    }

    if (link) {
        const isAudio = /podcast|album|music|audiobook/i.test(item.type || '');
        const cinemaOnly = item?._viewing?.mode === 'cinema';
        const verifiedStream = item?._viewing?.mode === 'stream';
        const url = verifiedStream ? discoverWatchUrl(item) : '';
        link.href = url || '#discover-availability-' + idx;
        link.textContent = cinemaOnly
            ? discoverLabel('discover.cinemaShowtimes', '🎟️ Cinemas & showtimes')
            : (verifiedStream
                ? (isAudio ? discoverLabel('res.listennow', '🎧 Listen Now') : discoverLabel('discover.watchNow', '▶ Watch Now'))
                : discoverLabel('discover.whereToWatch', 'Where to Watch'));
        link.classList.toggle('is-cinema', cinemaOnly);
        if (!verifiedStream) {
            link.removeAttribute('target');
            link.removeAttribute('rel');
            link.addEventListener('click', e => {
                e.preventDefault();
                const host=document.getElementById('discover-availability-' + idx);
                host?.scrollIntoView({behavior:'smooth',block:'center'});
                host?.classList.add('is-highlighted');
                setTimeout(()=>host?.classList.remove('is-highlighted'),1400);
            });
        }
        item._url = url || '';
    }
    const availabilityHost = document.getElementById('discover-availability-' + idx);
    if (item._catalogMedia && window.MatchAppCatalogMedia?.renderAvailability) {
        window.MatchAppCatalogMedia.renderAvailability(availabilityHost, item._catalogMedia, { title: item.title });
    }
    const previewHost = document.getElementById('discover-preview-' + idx);
    if (item._catalogMedia && window.MatchAppCatalogMedia?.renderPreview) {
        window.MatchAppCatalogMedia.renderPreview(previewHost, item._catalogMedia, { title: item.title });
    } else if (previewHost) {
        previewHost.replaceChildren();
        previewHost.hidden = true;
        const previewUrl = String(richMeta?.preview || '');
        const storeUrl = String(richMeta?.storeUrl || '');
        const realVideo = richMeta && typeof isVideoPreview === 'function' && isVideoPreview(richMeta) &&
            /^https:\/\/(?:video-ssl|audio-ssl)\.itunes\.apple\.com\//i.test(previewUrl);
        if (realVideo) {
            const label = document.createElement('div');
            label.className = 'matchapp-media-preview-label';
            label.textContent = discoverLabel('discover.preview', 'Preview');
            const video = document.createElement('video');
            video.controls = true; video.preload = 'metadata'; video.playsInline = true; video.src = previewUrl;
            video.setAttribute('aria-label', item.title + ' preview');
            previewHost.append(label, video);
            if (/^https:\/\//.test(storeUrl)) {
                const source = document.createElement('a'); source.href = storeUrl; source.target = '_blank'; source.rel = 'noopener noreferrer';
                source.className = 'matchapp-title-page-btn'; source.textContent = discoverLabel('discover.titlePage','Open title page');
                previewHost.appendChild(source);
            }
            previewHost.hidden = false;
        } else {
            let titlePage = '';
            if (Number.isSafeInteger(Number(meta?.tmdbId)) && ['movie','tv'].includes(meta?.kind)) {
                titlePage = 'https://www.themoviedb.org/' + meta.kind + '/' + meta.tmdbId;
            } else if (/^https:\/\//.test(storeUrl)) titlePage = storeUrl;
            if (titlePage) {
                const label = document.createElement('div'); label.className = 'matchapp-media-preview-label'; label.textContent = discoverLabel('discover.preview','Preview');
                const source = document.createElement('a'); source.href = titlePage; source.target = '_blank'; source.rel = 'noopener noreferrer';
                source.className = 'matchapp-title-page-btn'; source.textContent = discoverLabel('discover.titlePage','Open title page');
                previewHost.append(label, source); previewHost.hidden = false;
            }
        }
    }
    if (meta && meta.year && !item.year) item.year = meta.year;
    paintDiscoverFacts(item, idx);
}

window.saveDiscoverItem = function (idx) {
    const item = DISCOVER_ITEMS[idx];
    if (!item) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem('match_savedList') || '[]'); } catch (e) {}
    if (list.some(i => (i.title || i) === item.title)) {
        if (window.showToast) showToast(`"${item.title}" ${typeof t === 'function' ? t('discover.alreadySaved') : 'is already saved.'}`);
        return;
    }
    list.unshift({
        title: item.title,
        posterUrl: (item._resolved && item._resolved.artwork) || '',
        platform: item.platform && item.platform !== 'any' ? item.platform : '',
        streamUrl: item._url || '',
        isAudio: /podcast|album|music/i.test(item.type || ''),
        addedAt: Date.now()
    });
    localStorage.setItem('match_savedList', JSON.stringify(list));
    const btn = document.getElementById('ds-' + idx);
    if (btn) { btn.textContent = '✓'; btn.classList.add('saved'); }
    if (window.showToast) showToast(`⭐ "${item.title}" ${typeof t === 'function' ? t('discover.savedToast') : 'saved to Watch Later'}`);
};

window.notForMeDiscoverItem = function (idx) {
    const item = DISCOVER_ITEMS[idx];
    if (!item || !item.title) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem('match_dislikedList') || '[]'); } catch (e) {}
    if (!list.some(i => (i.title || i) === item.title)) {
        list.unshift({
            title: item.title,
            posterUrl: (item._resolved && item._resolved.artwork) || '',
            platform: item.platform && item.platform !== 'any' ? item.platform : '',
            streamUrl: item._url || '',
            addedAt: Date.now()
        });
        localStorage.setItem('match_dislikedList', JSON.stringify(list));
    }
    try {
        window.matchPolicy?.remember?.({
            title: item.title,
            posterUrl: (item._resolved && item._resolved.artwork) || '',
            streamUrl: item._url || '',
            reason: 'Ask AI'
        }, 'dislike');
    } catch (e) {}
    const card = document.querySelector(`[data-discover-idx="${idx}"]`);
    if (card) card.classList.add('is-hidden');
    if (window.showToast) showToast(discoverLabel('discover.hiddenToast', 'Hidden. You can restore it from History.'));
};

function titleKey(title) {
    return String(title || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

async function localizeRelatedItem(item) {
    const lang = window.MATCH_LANG || 'en';
    if (lang === 'en') return item;
    // TMDB overviews were already requested in MATCH_LANG. Do not spend Ask AI
    // credits translating related titles — official localized names only.
    try {
        if (item.title && typeof window.localizedTitle === 'function') {
            const named = await window.localizedTitle(item.title, { year: item.year, kind: item.kind || '' });
            if (named) item.displayTitle = named;
        }
    } catch (e) {}
    return item;
}

function relatedFromTmdb(pack, source) {
    if (!pack || !Array.isArray(pack.related)) return [];
    return pack.related.map(r => ({
        title: r.originalTitle || r.title,
        displayTitle: r.title,
        year: r.year || '',
        type: r.kind === 'movie' ? 'movie' : 'series',
        platform: source.platform || '',
        synopsis: r.overview || '',
        synopsisLang: window.MATCH_LANG || 'en',
        why: r.why === 'director' ? 'director' : 'idea',
        directorName: r.directorName || (pack.director && pack.director.name) || '',
        _meta: r.poster ? { artwork: r.poster, year: r.year, overview: r.overview, tmdbId: r.tmdbId, kind: r.kind, source: 'tmdb', title: r.title } : null,
        _tmdb: r
    }));
}

async function attachRelated(grid, seedItems, baseIndex) {
    if (!grid || !seedItems || !seedItems.length) return;
    const seen = new Set(DISCOVER_ITEMS.map(i => titleKey(i.title)));
    const collected = [];

    const tmdbSeeds = seedItems.filter(i => i && i._tmdb && Number.isSafeInteger(i._tmdb.tmdbId)).slice(0, 2);
    if (tmdbSeeds.length && typeof window.tmdbRelated === 'function') {
        const packs = await Promise.all(tmdbSeeds.map(i => window.tmdbRelated(i._tmdb.tmdbId, i._tmdb.kind || 'movie').catch(() => null)));
        packs.forEach((pack, i) => {
            relatedFromTmdb(pack, tmdbSeeds[i]).forEach(row => collected.push(row));
        });
    }

    seedItems.slice(0, 3).forEach(item => {
        catalogCousins(item, 3).forEach(row => collected.push(row));
    });

    const unique = [];
    for (const row of collected) {
        const k = titleKey(row.title);
        if (!k || seen.has(k) || isDiscoverDisliked(row.title)) continue;
        if (window.matchPolicy) {
            if (lastDiscoverQuestion && !window.matchPolicy.fitsQuestion(row, lastDiscoverQuestion)) continue;
            if (seedItems.some(s => s && !window.matchPolicy.sameFamily(s, row))) continue;
        }
        seen.add(k);
        unique.push(row);
        if (unique.length >= 6) break;
    }
    if (!unique.length) return;

    for (const row of unique) await localizeRelatedItem(row);

    const heading = document.createElement('h3');
    heading.className = 'discover-related-head';
    heading.textContent = discoverLabel('discover.moreLike', 'More in the same vein');
    grid.appendChild(heading);

    const start = DISCOVER_ITEMS.length;
    unique.forEach((row, i) => {
        DISCOVER_ITEMS.push(row);
        const wrap = document.createElement('div');
        wrap.innerHTML = discoverCardHTML(row, start + i).trim();
        const card = wrap.firstElementChild;
        if (card) grid.appendChild(card);
    });
    await Promise.all(unique.map((row, i) => hydrateDiscoverCard(row, start + i)));
}

function relabelDiscoverCards() {
    document.querySelectorAll('.discover-related-head').forEach(el => {
        el.textContent = discoverLabel('discover.moreLike', 'More in the same vein');
    });
    document.querySelectorAll('.discover-card').forEach(card => {
        const idx = Number(card.getAttribute('data-discover-idx'));
        const item = DISCOVER_ITEMS[idx];
        if (!item) return;
        const isAudio = /podcast|album|music|audiobook/i.test(item.type || '');
        const play = card.querySelector('.discover-play');
        if (play) play.textContent = isAudio ? discoverLabel('res.listennow', '🎧 Listen Now') : discoverLabel('discover.watchNow', '▶ Watch Now');
        const save = card.querySelector('.discover-save');
        if (save && !save.classList.contains('saved')) save.textContent = discoverLabel('res.watchlater', '⭐ Watch Later');
        const nfm = card.querySelector('.discover-nfm');
        if (nfm) nfm.textContent = discoverLabel('res.notforme', '👎 Not For Me');
        const why = card.querySelector('.discover-why');
        if (why && item.why === 'director') why.textContent = discoverLabel('discover.sameDirector', 'Same director') + (item.directorName ? ' · ' + item.directorName : '');
        else if (why && item.why === 'idea') why.textContent = discoverLabel('discover.sameIdea', 'Same idea');
        paintDiscoverFacts(item, idx);
    });
}
document.addEventListener('matchapp:langchange', relabelDiscoverCards);

/* ---------- Boot ---------- */
/* ============================================================
   MATCHAPP AI WORKSPACE UI
   Sidebar state, live quota meters and staged thinking progress.
   These are presentation helpers around the existing quota/chat engine;
   they never invent allowance values or bypass checkDailyLimit().
   ============================================================ */
let aiWorkflowTimer = null;

window.toggleAiSidebar = function(force) {
    const body = document.body;
    if (!body) return;
    const mobile = window.matchMedia('(max-width: 980px)').matches;
    if (mobile) {
        const open = typeof force === 'boolean' ? force : !body.classList.contains('ai-sidebar-open');
        body.classList.toggle('ai-sidebar-open', open);
        return;
    }
    const collapsed = typeof force === 'boolean' ? !force : !body.classList.contains('ai-sidebar-collapsed');
    body.classList.toggle('ai-sidebar-collapsed', collapsed);
    try { localStorage.setItem('match_ai_sidebar_collapsed', collapsed ? '1' : '0'); } catch (_) {}
};

function localAiQuotaStatus() {
    const today = new Date().toLocaleDateString();
    const storedDay = localStorage.getItem('match_lastDate');
    const used = storedDay === today ? Math.max(0, parseInt(localStorage.getItem('match_dailyCount') || '0', 10) || 0) : 0;
    const limit = 3;
    return { authenticated:false, anon:true, used, limit, remaining:Math.max(0, limit - used), credits:0 };
}

function renderAiQuotaStatus(status) {
    status = status || localAiQuotaStatus();
    const value = document.getElementById('ai-usage-value');
    const fill = document.getElementById('ai-usage-fill');
    const credits = document.getElementById('ai-credit-line');
    const newChat = document.getElementById('ai-new-chat');
    const limit = Math.max(0, Number(status.limit) || 0);
    const remaining = Math.max(0, Number(status.remaining) || 0);
    const used = Math.max(0, Number.isFinite(Number(status.used)) ? Number(status.used) : Math.max(0, limit - remaining));
    const paidCredits = Math.max(0, Number(status.credits) || 0);
    const pct = limit > 0 ? Math.max(0, Math.min(100, (used / limit) * 100)) : 0;

    if (value) value.textContent = limit ? (remaining + ' of ' + limit + ' daily left') : 'Ready';
    if (fill) fill.style.width = pct + '%';
    if (credits) {
        credits.textContent = status.anon
            ? (remaining > 0 ? 'Guest allowance · sign in for account-based AI credits.' : 'Guest allowance used · sign in or register to continue.')
            : (paidCredits + ' Ask AI credit' + (paidCredits === 1 ? '' : 's') + ' available after your included allowance.');
    }
    if (newChat) {
        const locked = remaining <= 0 && paidCredits <= 0;
        newChat.disabled = locked;
        newChat.title = locked ? 'No AI allowance or Ask AI credits remaining' : 'Start a new conversation';
    }
}

async function refreshAiWorkspaceStatus() {
    let status = null;
    try {
        if (typeof window.refreshQuotaStatus === 'function') status = await window.refreshQuotaStatus();
    } catch (_) {}
    renderAiQuotaStatus(status || localAiQuotaStatus());
    return status;
}
window.refreshAiWorkspaceStatus = refreshAiWorkspaceStatus;

function setAiWorkflow(progress, label, activeStep) {
    const fill = document.getElementById('ai-workflow-fill');
    const text = document.getElementById('ai-thinking-label');
    if (fill) fill.style.width = Math.max(4, Math.min(100, progress)) + '%';
    if (text && label) text.textContent = label;
    ['understand','match','answer'].forEach(step => {
        const el = document.getElementById('ai-step-' + step);
        if (el) el.classList.toggle('active', step === activeStep);
    });
}

function startAiWorkflow() {
    if (aiWorkflowTimer) clearInterval(aiWorkflowTimer);
    let p = 7;
    setAiWorkflow(p, 'Understanding your request…', 'understand');
    aiWorkflowTimer = setInterval(() => {
        p = Math.min(91, p + (p < 40 ? 7 : p < 72 ? 4 : 2));
        if (p < 40) setAiWorkflow(p, 'Understanding your request…', 'understand');
        else if (p < 74) setAiWorkflow(p, 'Matching titles and sources…', 'match');
        else setAiWorkflow(p, 'Composing your answer…', 'answer');
    }, 520);
}

function finishAiWorkflow() {
    if (aiWorkflowTimer) clearInterval(aiWorkflowTimer);
    aiWorkflowTimer = null;
    setAiWorkflow(100, 'Answer ready', 'answer');
}
window.startAiWorkflow = startAiWorkflow;
window.finishAiWorkflow = finishAiWorkflow;

function initAiWorkspace() {
    try {
        if (window.matchMedia('(min-width: 981px)').matches && localStorage.getItem('match_ai_sidebar_collapsed') === '1') {
            document.body.classList.add('ai-sidebar-collapsed');
        }
    } catch (_) {}
    refreshAiWorkspaceStatus();
    setTimeout(refreshAiWorkspaceStatus, 900);
    setTimeout(refreshAiWorkspaceStatus, 2400);
}
document.addEventListener('DOMContentLoaded', initAiWorkspace);

/* ============================================================
   CONVERSATIONAL CHAT ENGINE
   Ask AI is now a real multi-turn conversation rather than a
   one-shot search. Each thread is saved to localStorage so a user
   can come back and keep going, and each *turn* consumes one from
   the included daily allowance (3 guest / 5 registered /
   10 VIP / 50 Business) — the same accounting the match engine uses.
   ============================================================ */

const CHAT_STORE_KEY = 'match_chatThreads';
const CHAT_MAX_THREADS = 20;

let currentThread = null;   // { id, title, turns: [{role, text, results, ts}], createdAt, updatedAt }

function loadThreads() {
    try { return JSON.parse(localStorage.getItem(CHAT_STORE_KEY) || '[]'); }
    catch (e) { return []; }
}
function saveThreads(threads) {
    try {
        localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(threads.slice(0, CHAT_MAX_THREADS)));
    } catch (e) { /* quota exceeded — non-fatal, chat still works this session */ }
}
function persistCurrentThread() {
    if (!currentThread || !currentThread.turns.length) return;
    const threads = loadThreads().filter(t => t.id !== currentThread.id);
    threads.unshift(currentThread);
    saveThreads(threads);
    renderThreadList();
}
function newThreadId() { return 't' + Date.now() + Math.random().toString(36).slice(2, 7); }

window.startNewChat = function () {
    const btn = document.getElementById('ai-new-chat');
    if (btn && btn.disabled) {
        window.location.href = '/pricing/pricing.html?from=ask-ai#credits';
        return;
    }
    currentThread = null;
    const log = document.getElementById('chat-log');
    if (log) log.innerHTML = '';
    const empty = document.getElementById('discover-empty');
    if (empty) empty.style.display = 'none';
    const input = document.getElementById('discover-new-input');
    if (input) { input.value = ''; input.focus(); }
    history.replaceState(null, '', '/discover.html');
    document.title = 'Talk to Our AI Concierge — MatchApp';
    renderThreadList();
    refreshAiWorkspaceStatus();
    if (window.matchMedia('(max-width: 980px)').matches) window.toggleAiSidebar(false);
};

window.openThread = function (id) {
    const t = loadThreads().find(x => x.id === id);
    if (!t) return;
    currentThread = t;
    const log = document.getElementById('chat-log');
    if (log) log.innerHTML = '';
    DISCOVER_ITEMS = [];
    t.turns.forEach(turn => {
        if (turn.role === 'user') {
            lastDiscoverQuestion = turn.text || lastDiscoverQuestion;
            appendUserBubble(turn.text);
        }
        else {
            const bubble = appendAssistantBubble(turn.text, turn.results || [], { instant: true });
            const visible = (turn.results || []).filter(item => item && item.title && !isDiscoverDisliked(item.title));
            if (bubble && visible.length) {
                const baseIndex = DISCOVER_ITEMS.length;
                DISCOVER_ITEMS = DISCOVER_ITEMS.concat(visible);
                renderResultsInto(bubble.grid, visible, baseIndex);
            }
        }
    });
    renderThreadList();
    if (window.matchMedia('(max-width: 980px)').matches) window.toggleAiSidebar(false);
    const log2 = document.getElementById('chat-log');
    if (log2) log2.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.deleteThread = function (id, ev) {
    if (ev) ev.stopPropagation();
    saveThreads(loadThreads().filter(t => t.id !== id));
    if (currentThread && currentThread.id === id) window.startNewChat();
    else renderThreadList();
};

function renderThreadList() {
    const host = document.getElementById('chat-history-list');
    if (!host) return;
    const threads = loadThreads();
    if (!threads.length) {
        host.innerHTML = `<p class="chat-history-empty">${typeof t === 'function' ? t('chat.noHistory') : 'No saved conversations yet.'}</p>`;
        return;
    }
    host.innerHTML = threads.map(th => `
        <div class="chat-thread-item ${currentThread && currentThread.id === th.id ? 'active' : ''}" onclick="openThread('${th.id}')">
            <span class="chat-thread-title">${(th.title || 'Conversation').replace(/</g, '&lt;').slice(0, 60)}</span>
            <button class="chat-thread-del" onclick="deleteThread('${th.id}', event)" aria-label="Delete conversation">✕</button>
        </div>`).join('');
}

/* ---------- Bubble rendering ---------- */
function appendUserBubble(text) {
    const log = document.getElementById('chat-log');
    if (!log) return;
    const div = document.createElement('div');
    div.className = 'chat-bubble chat-user';
    div.textContent = text;
    log.appendChild(div);
    return div;
}

function appendAssistantBubble(text, results, opts) {
    const log = document.getElementById('chat-log');
    if (!log) return null;
    const wrap = document.createElement('div');
    wrap.className = 'chat-bubble chat-assistant';

    const row = document.createElement('div');
    row.className = 'chat-answer-row';

    const avatar = document.createElement('img');
    avatar.className = 'chat-avatar';
    avatar.src = '/assets/brand/matchapp-ai-orbit-fullbleed.svg?v=1';
    avatar.alt = '';
    avatar.width = 34;
    avatar.height = 34;
    row.appendChild(avatar);

    const p = document.createElement('p');
    p.className = 'chat-answer-text';
    row.appendChild(p);

    const speak = document.createElement('button');
    speak.className = 'discover-speak';
    speak.title = 'Read aloud';
    speak.setAttribute('aria-label', 'Read answer aloud');
    speak.textContent = '🔊';
    speak.onclick = () => window.readAloud(text, speak);
    row.appendChild(speak);

    wrap.appendChild(row);

    const grid = document.createElement('div');
    grid.className = 'chat-results-grid';
    wrap.appendChild(grid);

    log.appendChild(wrap);

    if (opts && opts.instant) p.textContent = text;
    return { wrap, textEl: p, grid, speakBtn: speak };
}

async function renderResultsInto(grid, items, baseIndex) {
    await window.matchPolicy?.ready();
    if (!Array.isArray(items)) return;
    items = (await Promise.all(items
        .map(item => enrichDiscoverItem(item, lastDiscoverQuestion))
        .filter(Boolean)
        .map(item => enrichDiscoverMedia(item))))
        .filter(item => item && item.title && !isDiscoverDisliked(item.title));
    grid.replaceChildren();
    if (!items || !items.length) return;
    grid.innerHTML = items.map((it, i) => discoverCardHTML(it, baseIndex + i)).join('');
    grid.style.display = 'grid';
    await Promise.all(items.map((it, i) => hydrateDiscoverCard(it, baseIndex + i)));
    items.forEach((it, i) => {
        if (it.synopsis) return;
        const syn = document.querySelector(`[data-discover-idx="${baseIndex + i}"] .discover-synopsis`);
        if (syn && !syn.textContent.trim()) syn.textContent = it.synopsis || '';
    });
    await attachRelated(grid, items, baseIndex);
}

/* ---------- The main ask flow ---------- */
async function askAndRender(question) {
    if (!question || !question.trim()) return;
    question = question.trim();

    const loadEl = document.getElementById('discover-loading');
    const emptyEl = document.getElementById('discover-empty');
    if (emptyEl) emptyEl.style.display = 'none';

    // Every turn costs one from the daily allowance, same as a match.
    if (typeof checkDailyLimit === 'function' && !(await checkDailyLimit('ask_ai'))) {
        refreshAiWorkspaceStatus();
        return;
    }
    refreshAiWorkspaceStatus();

    if (!currentThread) {
        currentThread = { id: newThreadId(), title: question.slice(0, 60), turns: [], createdAt: Date.now(), updatedAt: Date.now() };
    }

    appendUserBubble(question);
    currentThread.turns.push({ role: 'user', text: question, ts: Date.now() });

    // Auto-scroll to the loading animation so the user sees work happening.
    if (loadEl) {
        loadEl.style.display = 'block';
        startAiWorkflow();
        if (!keepConversationAtStart()) setTimeout(() => loadEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    }

    const input = document.getElementById('discover-new-input');
    if (input) input.value = '';

    // Pass prior turns so follow-ups keep context.
    const history = currentThread.turns
        .slice(0, -1)
        .map(t => ({ role: t.role, text: t.text }));

    let payload, source = 'ai';
    try { payload = await askAIConversational(question, history); }
    catch (e) { payload = await fallbackSearch(question, !!e.aiUnavailable); source = 'fallback'; }
    lastDiscoverQuestion = question;

    // Same unconditional safety net as the match engine: no matter which
    // upstream path produced this, raw JSON-looking text can never reach
    // the chat bubble.
    if (typeof window.sanitizeDisplayText === 'function' && payload && payload.answer) {
        payload.answer = window.sanitizeDisplayText(payload.answer, ['answer', 'synopsis', 'text']);
    }

    // Routed through the shared track() helper so this reaches GTM's
    // dataLayer — a direct gtag() call is a no-op under a GTM container.
    if (typeof window.track === 'function') {
        window.track('ai_search', { search_term: question, source: source, results: (payload.results || []).length });
    }

    try {
        window.MatchActivity?.log?.('ai', question);
        (payload.results || []).forEach(item => {
            if (!item || !item.title) return;
            const title = (typeof window.sanitizeDisplayText === 'function')
                ? window.sanitizeDisplayText(String(item.title), ['title'])
                : String(item.title);
            if (!title || /^\s*[{\[]/.test(title)) return;
            window.MatchActivity?.log?.('ai', title, {
                source: 'ask-ai',
                posterUrl: item.posterUrl || item.artwork || ''
            });
            window.matchPolicy?.remember?.({
                title: title,
                posterUrl: item.posterUrl || item.artwork || '',
                streamUrl: item.watchUrl || item.url || '',
                reason: 'Ask AI'
            }, 'ai');
        });
    } catch (_) {}

    if (loadEl) {
        finishAiWorkflow();
        setTimeout(() => { loadEl.style.display = 'none'; }, 220);
    }

    const offlineBadge = document.getElementById('discover-offline-badge');
    if (offlineBadge) offlineBadge.style.display = payload._live ? 'none' : 'inline-flex';

    const bubble = appendAssistantBubble(payload.answer, payload.results || [], { instant: false });

    // Auto-scroll to the response before the typewriter starts.
    if (bubble && bubble.wrap && !keepConversationAtStart()) {
        setTimeout(() => bubble.wrap.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    }

    if (bubble) {
        await typewriterReveal(bubble.textEl, payload.answer, 14);
        const autoReadEnabled = window.MatchSettings ? window.MatchSettings.get('autoRead') !== false : localStorage.getItem('match_voice_autoread') !== 'false';
        if (autoReadEnabled) {
            window.readAloud(payload.answer, bubble.speakBtn);
            if (!localStorage.getItem('match_voice_autoread_hint_seen')) {
                localStorage.setItem('match_voice_autoread_hint_seen','true');
                if (window.showToast) showToast('🔊 Read-aloud is on. Change it anytime in Profile → Voice & AI Settings.');
            }
        }
    }

    const baseIndex = DISCOVER_ITEMS.length;
    let newItems = (payload.results || [])
        .map(item => enrichDiscoverItem(item, question))
        .filter(item => item && item.title && !isDiscoverDisliked(item.title));
    if (!newItems.length && window.matchPolicy && typeof CONTENT_CATALOG !== 'undefined') {
        newItems = CONTENT_CATALOG
            .filter(e => e && e.title && !isDiscoverDisliked(e.title) && window.matchPolicy.fitsQuestion(e, question))
            .slice(0, 6)
            .map(e => enrichDiscoverItem({
                title: e.title, year: e.year || '', type: (e.cats && e.cats[0]) || '',
                platform: e.platform || '', synopsis: e.synopsis || '', cats: e.cats, moods: e.moods,
                watchUrl: e.watchUrl || ''
            }, question))
            .filter(Boolean);
    }
    DISCOVER_ITEMS = DISCOVER_ITEMS.concat(newItems);
    if (bubble && newItems.length) await renderResultsInto(bubble.grid, newItems, baseIndex);

    currentThread.turns.push({ role: 'assistant', text: payload.answer, results: newItems, ts: Date.now() });
    currentThread.updatedAt = Date.now();
    persistCurrentThread();
    refreshAiWorkspaceStatus();

    // Keep the follow-up box in view so continuing the conversation is obvious.
    const row = document.querySelector('.newsearch-row');
    if (!keepConversationAtStart()) {
        if (row) setTimeout(() => row.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
    } else {
        const log = document.getElementById('chat-log');
        if (log) setTimeout(() => log.scrollIntoView({ behavior: 'auto', block: 'start' }), 20);
    }
}

/* ---------- Auto-growing composer ----------
   The ask field is a textarea now, so it has to be resized manually: reset to
   auto first (otherwise it can only ever grow, never shrink back), then match
   the content height up to the CSS max, after which it scrolls. Exposed on
   window so voice dictation can trigger a resize as words stream in. */
window.autoGrowComposer = function () {
    const el = document.getElementById('discover-new-input');
    if (!el) return;
    el.style.height = 'auto';
    const max = 190;
    const next = Math.min(el.scrollHeight, max);
    el.style.height = next + 'px';
    const wrap = el.closest('.composer');
    if (wrap) wrap.classList.toggle('is-tall', el.scrollHeight > max);
};

function initComposer() {
    const el = document.getElementById('discover-new-input');
    if (!el) return;

    el.addEventListener('input', window.autoGrowComposer);

    el.addEventListener('keydown', (e) => {
        // Enter sends, Shift+Enter makes a new line. IME composition must be
        // left alone or Enter would submit mid-word in Japanese, Korean and
        // Chinese input, where Enter is how you accept a candidate.
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            window.newDiscoverSearch();
        }
    });

    window.autoGrowComposer();
}
document.addEventListener('DOMContentLoaded', initComposer);

window.newDiscoverSearch = function () {
    const el = document.getElementById('discover-new-input');
    if (el && el.value.trim()) {
        askAndRender(el.value.trim());
        // Collapse back to one line once the question is sent.
        el.value = '';
        window.autoGrowComposer();
    }
};

/* ---------- Boot ---------- */
async function showTitleInfoCard(titleName) {
    titleName = String(titleName || '').trim();
    if (!titleName) return;
    await window.matchPolicy?.ready();

    const emptyEl = document.getElementById('discover-empty');
    const loadEl = document.getElementById('discover-loading');
    if (emptyEl) emptyEl.style.display = 'none';
    if (loadEl) loadEl.style.display = 'none';

    let item = enrichDiscoverItem(itemFromTitle(titleName), '') || itemFromTitle(titleName);
    item = await enrichDiscoverMedia(item);
    lastDiscoverQuestion = '';
    DISCOVER_ITEMS = [];

    if (!currentThread) {
        currentThread = { id: newThreadId(), title: item.title.slice(0, 60), turns: [], createdAt: Date.now(), updatedAt: Date.now() };
    }

    const intro = discoverLabel(
        'discover.titleCardIntro',
        "Here's {title} — spoiler-free synopsis, where to watch it, and when it started. Ask a follow-up if you want more."
    ).replace(/\{title\}/g, item.title);

    const bubble = appendAssistantBubble(intro, [item], { instant: true });
    DISCOVER_ITEMS = [item];
    if (bubble && bubble.grid) {
        const grid = bubble.grid;
        grid.innerHTML = discoverCardHTML(item, 0);
        grid.style.display = 'grid';
        await hydrateDiscoverCard(item, 0);
        await attachRelated(grid, [item], 0);
    }

    currentThread.turns.push({ role: 'assistant', text: intro, results: [item], ts: Date.now() });
    currentThread.updatedAt = Date.now();
    persistCurrentThread();

    if (typeof window.track === 'function') {
        window.track('title_info_card', { title: item.title, source: 'trending' });
    }
    const log = document.getElementById('chat-log');
    if (log) setTimeout(() => log.scrollIntoView({ behavior: 'auto', block: 'start' }), 20);
}


async function showEventInfoCard(eventPath) {
    let path = '';
    try {
        const u = new URL(String(eventPath || ''), location.origin);
        if (u.origin === location.origin && u.pathname.startsWith('/events/')) path = u.pathname;
    } catch (_) {}
    if (!path) return false;

    const emptyEl = document.getElementById('discover-empty');
    const loadEl = document.getElementById('discover-loading');
    if (emptyEl) emptyEl.style.display = 'none';
    if (loadEl) loadEl.style.display = 'none';

    try {
        const response = await fetch(path, { credentials: 'same-origin' });
        if (!response.ok) return false;
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const hero = doc.querySelector('.event-detail-hero');
        const title = (doc.querySelector('h1')?.textContent || 'Event').trim();
        const image = hero?.querySelector('img')?.getAttribute('src') || '';
        const paras = [...(hero?.querySelectorAll('p') || [])].map(p => p.textContent.trim()).filter(Boolean);
        const meta = paras[0] || '';
        const copy = paras.find(p => p.length > 80) || paras[1] || '';
        const links = [...doc.querySelectorAll('.global-event-links a[href]')]
            .map(a => ({ label: a.textContent.trim(), href: a.getAttribute('href') || '' }))
            .filter(x => /^https:\/\//.test(x.href));
        let preview = doc.querySelector('iframe[src*="youtube-nocookie.com/embed/"]')?.getAttribute('src') || '';
        if (!preview) {
            for (const link of links) {
                try {
                    const u = new URL(link.href);
                    const id = /(?:^|\.)youtube\.com$/.test(u.hostname) ? u.searchParams.get('v') : (u.hostname === 'youtu.be' ? u.pathname.slice(1) : '');
                    if (/^[A-Za-z0-9_-]{6,32}$/.test(id || '')) { preview = 'https://www.youtube-nocookie.com/embed/' + id; break; }
                } catch (_) {}
            }
        }

        if (!currentThread) {
            currentThread = { id: newThreadId(), title: title.slice(0, 60), turns: [], createdAt: Date.now(), updatedAt: Date.now() };
        }

        const intro = [title, meta, copy].filter(Boolean).join(' — ');
        const bubble = appendAssistantBubble(intro, [], { instant: true });
        if (bubble?.grid) {
            const grid = bubble.grid;
            grid.style.display = 'grid';
            grid.innerHTML = `
                <article class="discover-event-card">
                    ${image ? `<img src="${escapeDiscoverHtml(image)}" alt="${escapeDiscoverHtml(title)}" loading="eager">` : ''}
                    <div>
                        <p style="color:#E5C158;font-weight:900;margin:0 0 8px">EVENT</p>
                        <h2>${escapeDiscoverHtml(title)}</h2>
                        ${meta ? `<p class="discover-event-meta">${escapeDiscoverHtml(meta)}</p>` : ''}
                        ${copy ? `<p class="discover-event-copy">${escapeDiscoverHtml(copy)}</p>` : ''}
                        ${preview ? `<iframe class="discover-event-preview" src="${escapeDiscoverHtml(preview)}" title="${escapeDiscoverHtml(title)} preview" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>` : ''}
                        <div class="discover-event-actions"></div>
                    </div>
                </article>`;
            const actions = grid.querySelector('.discover-event-actions');
            if (actions) {
                const page = document.createElement('a');
                page.href = path;
                page.textContent = 'Open event page';
                actions.appendChild(page);
                links.slice(0, 8).forEach(link => {
                    const a = document.createElement('a');
                    a.href = link.href;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.textContent = link.label || 'Official link';
                    actions.appendChild(a);
                });
                const save = document.createElement('button');
                save.type = 'button';
                save.textContent = 'Save event';
                save.addEventListener('click', () => {
                    try {
                        const key = 'match_savedEvents';
                        const rows = JSON.parse(localStorage.getItem(key) || '[]');
                        const list = Array.isArray(rows) ? rows : [];
                        if (!list.some(x => x && x.path === path)) list.unshift({ title, path, image, savedAt: Date.now() });
                        localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
                        window.showToast?.('Event saved.');
                    } catch (_) {}
                });
                actions.appendChild(save);
            }
        }

        currentThread.turns.push({ role: 'assistant', text: intro, results: [], event: { title, path, meta, copy, links }, ts: Date.now() });
        currentThread.updatedAt = Date.now();
        persistCurrentThread();
        refreshAiWorkspaceStatus();
        window.__MATCHAPP_EVENT_RENDERED = true;
        document.title = `${title} — MatchApp AI Concierge`;
        const input = document.getElementById('discover-new-input');
        if (input) input.placeholder = `Ask a follow-up about ${title}…`;
        const log = document.getElementById('chat-log');
        if (log) setTimeout(() => log.scrollIntoView({ behavior: 'auto', block: 'start' }), 20);
        return true;
    } catch (_) {
        return false;
    }
}

async function runDiscovery() {
    renderThreadList();
    const title = getQueryParam('title').trim();
    const eventPath = getQueryParam('event').trim();
    const q = getQueryParam('q').trim();
    const forceNew = getQueryParam('new') === '1';
    const loadEl = document.getElementById('discover-loading');
    const emptyEl = document.getElementById('discover-empty');

    // The homepage Ai/iA wordmark is an explicit "new chat" action.
    // A fresh page normally starts with currentThread=null anyway, but this
    // makes that contract deliberate and future-proof if navigation becomes
    // client-side later. No credit is consumed until the user actually asks.
    if (forceNew) {
        currentThread = null;
        DISCOVER_ITEMS = [];
        const log = document.getElementById('chat-log');
        if (log) log.innerHTML = '';
        history.replaceState(null, '', '/discover.html?focus=start');
    }

    if (eventPath) {
        if (loadEl) loadEl.style.display = 'none';
        const shown = await showEventInfoCard(eventPath);
        if (shown) return;
        try { location.href = new URL(eventPath, location.origin).pathname; } catch (_) {}
        return;
    }

    if (title) {
        document.title = `${title} — MatchApp AI Concierge`;
        if (loadEl) loadEl.style.display = 'none';
        await showTitleInfoCard(title);
        return;
    }

    if (!q) {
        if (loadEl) loadEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    document.title = `${q} — MatchApp AI Concierge`;
    if (loadEl) loadEl.style.display = 'none';
    await askAndRender(q);
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(runDiscovery, 350); });
