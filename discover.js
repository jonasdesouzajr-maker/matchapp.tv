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
                out.push({
                    title,
                    year: r.releaseDate ? String(r.releaseDate).substring(0, 4) : '',
                    type: media === 'tvShow' ? 'series' : (media === 'podcast' ? 'podcast' : (media === 'musicTrack' ? 'music' : 'movie')),
                    platform: 'any',
                    synopsis: r.longDescription || r.shortDescription || `${r.primaryGenreName || ''}${r.artistName ? ' — ' + r.artistName : ''}`.trim(),
                    _meta: {
                        artwork: (r.artworkUrl100 || '').replace('100x100bb', '600x900bb'),
                        preview: r.previewUrl || null,
                        storeUrl: r.trackViewUrl || r.collectionViewUrl || null
                    }
                });
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

function discoverCardHTML(item, idx) {
    const title = String(item.title || '');
    const safe = escapeDiscoverHtml(title);
    const meta = escapeDiscoverHtml([item.year, item.type].filter(Boolean).join(' · '));
    const watchLabel = (typeof t === 'function') ? t('res.streamnow') : '▶ Watch / Listen';
    const saveLabel = (typeof t === 'function') ? t('discover.save') : '⭐ Save';
    return `
    <article class="discover-card" style="animation-delay:${idx * 70}ms">
        <div class="discover-poster">
            <img id="dp-${idx}" src="" alt="${safe}" loading="lazy">
            <div class="discover-rank">#${idx + 1}</div>
        </div>
        <div class="discover-body">
            <h3>${safe}</h3>
            ${meta ? `<div class="discover-meta">${meta}</div>` : ''}
            <p>${escapeDiscoverHtml((typeof window.sanitizeDisplayText === 'function' ? window.sanitizeDisplayText(item.synopsis, ['synopsis']) : item.synopsis) || '')}</p>
            <div class="discover-actions">
                <a id="dl-${idx}" class="gold-btn discover-play" href="#" target="_blank" rel="noopener">${watchLabel}</a>
                <button class="discover-save" onclick="saveDiscoverItem(${idx})" id="ds-${idx}">${saveLabel}</button>
            </div>
        </div>
    </article>`;
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

async function hydrateDiscoverCard(item, idx) {
    const img = document.getElementById('dp-' + idx);
    const link = document.getElementById('dl-' + idx);
    if (!img) return;

    img.src = (typeof generateLocalPosterSVG === 'function') ? generateLocalPosterSVG(item.title) : '';

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
    const visualType = !/podcast|album|music|audiobook/i.test(item.type || '');
    if (!meta && !skipLiveLookup && !verified && visualType && typeof window.tmdbLookup === 'function') {
        const kind = /movie|film/i.test(item.type || '') ? 'movie' : /series|tv|drama|anime|novela|show|documentary/i.test(item.type || '') ? 'tv' : '';
        const tmdb = await window.tmdbLookup(item.title, { year: item.year || '', kind });
        if (tmdb && (tmdb.posterLarge || tmdb.poster)) meta = { artwork: tmdb.posterLarge || tmdb.poster, year: tmdb.year || item.year || '', overview: tmdb.overview || '', tmdbId: tmdb.tmdbId, kind: tmdb.kind, source: 'tmdb' };
    }
    if (!meta && !skipLiveLookup && !verified && typeof getRichMetadata === 'function') {
        // If this AI-chat title happens to also be one of our curated catalog
        // entries, use its real year/country to disambiguate the same way the
        // main match render does. The common case is no catalog hit at all
        // (most AI answers aren't in it), in which case this is a no-op and
        // behaviour is unchanged from before.
        let chatHints = {};
        try {
            if (typeof CONTENT_CATALOG !== 'undefined') {
                const e = CONTENT_CATALOG.find(x => x.title === item.title);
                if (e) chatHints = { year: e.year, country: e.country, countryCode: e.countryCode };
            }
        } catch (err) {}
        meta = await getRichMetadata(item.title, item.type || '', chatHints);
    }
    // The TVMaze secondary attempt is deliberately NOT used for AI-chat
    // results at all (unlike the main match render, which does use it for
    // catalog-sourced titles). A curated catalog entry's title is something
    // we wrote and know precisely; an AI-chat title is Gemini's free-form
    // best guess — stacking a second, looser lookup on top of that is where
    // the remaining risk lived, for a real-cover gain that isn't worth it
    // here.

    if (verified) {
        img.onerror = function () { this.onerror = null; if (typeof generateLocalPosterSVG === 'function') this.src = generateLocalPosterSVG(item.title); };
        img.src = verified;
    } else if (meta && meta.artwork) {
        img.onerror = function () {
            this.onerror = null;
            if (typeof generateLocalPosterSVG === 'function') this.src = generateLocalPosterSVG(item.title);
        };
        img.src = meta.artwork;
    }
    // If none of the above applied, the branded local SVG placeholder set at
    // the top of this function is what stays showing — always correct,
    // since it's generated directly from item.title with no external
    // dependency that could substitute the wrong title's art.
    item._resolved = meta;

    if (link) {
        const isAudio = /podcast|album|music/i.test(item.type || '');
        let url;
        if (typeof platformSearchUrl === 'function' && item.platform && item.platform !== 'any' &&
            typeof PLATFORMS !== 'undefined' && PLATFORMS[item.platform]) {
            url = platformSearchUrl(item.platform, item.title);
        } else if (isAudio) {
            url = `https://open.spotify.com/search/${encodeURIComponent(item.title)}`;
        } else {
            url = `https://www.justwatch.com/us/search?q=${encodeURIComponent(item.title)}`;
        }
        link.href = url;
        link.textContent = isAudio ? (typeof t === 'function' ? t('res.listennow') : '🎧 Listen') : (typeof t === 'function' ? t('discover.watchNow') : '▶ Watch Now');
        item._url = url;
    }
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

/* ---------- Boot ---------- */
/* ============================================================
   CONVERSATIONAL CHAT ENGINE
   Ask AI is now a real multi-turn conversation rather than a
   one-shot search. Each thread is saved to localStorage so a user
   can come back and keep going, and each *turn* consumes one from
   the daily allowance (3 free / 5 registered+complete profile /
   10 VIP) — the same accounting the match engine uses.
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
};

window.openThread = function (id) {
    const t = loadThreads().find(x => x.id === id);
    if (!t) return;
    currentThread = t;
    const log = document.getElementById('chat-log');
    if (log) log.innerHTML = '';
    DISCOVER_ITEMS = [];
    t.turns.forEach(turn => {
        if (turn.role === 'user') appendUserBubble(turn.text);
        else appendAssistantBubble(turn.text, turn.results || [], { instant: true });
    });
    renderThreadList();
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
    if(!Array.isArray(items))return;
    items=items.filter(item=>!window.matchPolicy?.known().has(window.matchPolicy.key(item.title || item.trackName || item.collectionName)));
    grid.replaceChildren();
    if (!items || !items.length) return;
    grid.innerHTML = items.map((it, i) => discoverCardHTML(it, baseIndex + i)).join('');
    grid.style.display = 'grid';
    await Promise.all(items.map((it, i) => hydrateDiscoverCard(it, baseIndex + i)));
}

/* ---------- The main ask flow ---------- */
async function askAndRender(question) {
    if (!question || !question.trim()) return;
    question = question.trim();

    const loadEl = document.getElementById('discover-loading');
    const emptyEl = document.getElementById('discover-empty');
    if (emptyEl) emptyEl.style.display = 'none';

    // Every turn costs one from the daily allowance, same as a match.
    if (typeof checkDailyLimit === 'function' && !(await checkDailyLimit())) {
        return;
    }

    if (!currentThread) {
        currentThread = { id: newThreadId(), title: question.slice(0, 60), turns: [], createdAt: Date.now(), updatedAt: Date.now() };
    }

    appendUserBubble(question);
    currentThread.turns.push({ role: 'user', text: question, ts: Date.now() });

    // Auto-scroll to the loading animation so the user sees work happening.
    if (loadEl) {
        loadEl.style.display = 'block';
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

    if (loadEl) loadEl.style.display = 'none';

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
    const newItems = payload.results || [];
    DISCOVER_ITEMS = DISCOVER_ITEMS.concat(newItems);
    if (bubble && newItems.length) await renderResultsInto(bubble.grid, newItems, baseIndex);

    currentThread.turns.push({ role: 'assistant', text: payload.answer, results: newItems, ts: Date.now() });
    currentThread.updatedAt = Date.now();
    persistCurrentThread();

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
async function runDiscovery() {
    renderThreadList();
    const q = getQueryParam('q').trim();
    const loadEl = document.getElementById('discover-loading');
    const emptyEl = document.getElementById('discover-empty');

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
