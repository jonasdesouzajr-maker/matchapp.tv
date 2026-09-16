/* ============================================================
   MATCHAPP — TMDB COVERS & METADATA

   WHY THIS EXISTS

   Covers came from iTunes and TVMaze. Both are free and neither was built for
   this: iTunes indexes what Apple SELLS, so anything Apple never carried —
   most novelas, a lot of K-drama, most non-US series — simply is not there,
   and TVMaze's singlesearch returns its best guess for almost any string and
   essentially never comes back empty. That combination is exactly how a
   telenovela ended up wearing an unrelated show's poster.

   TMDB is the canonical open database for film and television. It has the
   novelas, the dramas and the anime, it exposes a real year and a real type to
   disambiguate against, and its artwork is the artwork everyone else uses.

   WHERE THE KEY IS

   Not here. The v4 token is a credential and anything in browser JavaScript is
   public, so it lives in Supabase Edge Function secrets and this file talks to
   tmdb-proxy. That also gets us edge caching, so the same cover is not fetched
   again for every visitor who draws the same title.

   WHAT THIS DELIBERATELY DOES NOT DO

   Streaming availability. TMDB has a providers endpoint and it is regional,
   frequently stale and licence-dependent. MatchApp only ever shows a platform
   as verified when a canonical source confirms it, and a maybe-stale third
   party is not that. Artwork, titles, years, overviews — nothing about where
   to watch.
   ============================================================ */

(function () {
    'use strict';

    const CACHE = Object.create(null);
    // Share a browser-side budget between covers and localized captions.
    // The server's independent rate limit remains authoritative.
    const requests = [], pendingRequests = new Map();
    let activeRequests = 0, requestCount = 0, windowStarted = Date.now(), requestTimer;
    function pumpRequests() {
        if (Date.now() - windowStarted >= 60000) { windowStarted = Date.now(); requestCount = 0; }
        if (requestCount >= 48 && requests.length && !requestTimer) requestTimer = setTimeout(() => { requestTimer = null; pumpRequests(); }, Math.max(1,60000-(Date.now()-windowStarted)));
        while (activeRequests < 4 && requests.length && requestCount < 48) {
            const {body,resolve,key} = requests.shift(); activeRequests++; requestCount++;
            Promise.resolve().then(() => window.supabaseClient.functions.invoke('tmdb-proxy',{body}))
                .catch(() => ({data:null,error:true})).then(resolve).finally(() => {activeRequests--;pendingRequests.delete(key);pumpRequests();});
        }
    }
    window.requestTMDB = body => {
        const key=JSON.stringify(body);if(pendingRequests.has(key))return pendingRequests.get(key);
        const p=new Promise(resolve=>{requests.push({body,resolve,key});});pendingRequests.set(key,p);pumpRequests();return p;
    };

    // Maps MatchApp's catalogue categories onto TMDB's two indexes. Passing the
    // right one is the single biggest accuracy win available: searching a
    // series against the film index is how a show ends up with a film's poster.
    function kindForCats(cats) {
        if (!Array.isArray(cats) || !cats.length) return '';
        const joined = cats.join(' ').toLowerCase();
        // Animated films may also carry the broad anime category.
        if (cats.some(c => /^(movie|short film)$/i.test(c))) return 'movie';
        // Anything episodic.
        if (/series|drama|novela|telenovela|dizi|anime|reality|documentary series/.test(joined)) return 'tv';
        if (/movie|film|cinema|bollywood|nollywood/.test(joined)) return 'movie';
        return '';
    }
    window.tmdbKindForCats = kindForCats;

    // TMDB has no useful notion of a podcast, a playlist or a YouTube channel,
    // so asking it about one can only return something unrelated that happens
    // to share a word. Skip outright rather than search and then reject.
    function isSearchable(cats) {
        if (!Array.isArray(cats) || !cats.length) return true;
        const joined = cats.join(' ').toLowerCase();
        return !/youtube|podcast|playlist|album|single|audiobook|music/.test(joined);
    }
    window.tmdbIsSearchable = isSearchable;

    /**
     * Searches TMDB and returns the best-scoring record, or null.
     * Applies MatchApp's OWN relevance and explicit-content guards on top of
     * TMDB's — the existing checks in app.js stay authoritative, because they
     * are the ones that were hardened against the real failures we have seen.
     */
    window.tmdbLookup = async function (title, hints) {
        if (!title || !window.supabaseClient) return null;
        hints = hints || {};
        if (!isSearchable(hints.cats)) return null;

        const kind = hints.kind || kindForCats(hints.cats);
        // Kids verifies English catalogue names independently of the UI language.
        const locales = {en:'en-US', 'pt-BR':'pt-BR', es:'es-ES', fr:'fr-FR', de:'de-DE', it:'it-IT', tr:'tr-TR', ru:'ru-RU', ar:'ar-SA', hi:'hi-IN', id:'id-ID', ja:'ja-JP', ko:'ko-KR', zh:'zh-CN'};
        const lang = hints.lang === 'en-US' ? 'en-US' : (locales[window.MATCH_LANG] || 'en-US');
        const cacheKey = `${title}::${hints.year || ''}::${kind}::${lang}`;
        if (cacheKey in CACHE) return CACHE[cacheKey];

        let best = null;
        try {
            const { data, error } = await window.requestTMDB({
                    query: title,
                    year: hints.year || '',
                    kind: kind || '',
                    lang: 'en-US'
            });
            if (error || !data || !Array.isArray(data.results)) { CACHE[cacheKey] = null; return null; }

            let scored = data.results
                .map(r => ({ r, score: scoreCandidate(title, hints, r) }))
                .filter(x => x.score > 0)
                .sort((a, b) => b.score - a.score);

            best = scored.length ? scored[0].r : null;
            // Establish identity first, then request the same TMDB record in the
            // selected locale. A translated name must never identify a different work.
            if (best && lang !== 'en-US' && Number.isSafeInteger(best.tmdbId) && ['tv','movie'].includes(best.kind)) {
                const original = best;
                const translated = await window.requestTMDB({tmdb_id: best.tmdbId, kind: best.kind, lang});
                const r = translated.data?.results?.[0];
                if (!translated.error && r && r.tmdbId === original.tmdbId && r.kind === original.kind &&
                    r.originalTitle === original.originalTitle && r.year === original.year && r.adult !== true) {
                    best = {...original, ...r, poster:r.poster || original.poster};
                }
            }
        } catch (e) {
            best = null;
        }

        CACHE[cacheKey] = best;
        return best;
    };

    /**
     * Scores a candidate. Returns 0 to reject outright.
     *
     * Artwork requires an exact normalized title, the requested media type
     * and the known release year. Fuzzy discovery relevance is not proof that
     * another catalogue result depicts the same work.
     */
    function scoreCandidate(query, hints, r) {
        if (!r || !r.poster || !Number.isSafeInteger(r.tmdbId) || r.tmdbId <= 0 || !['movie','tv'].includes(r.kind)) return 0;
        if (r.adult === true) return 0;
        const expectedKind = hints.kind || kindForCats(hints.cats);
        if (expectedKind && r.kind !== expectedKind) return 0;
        const artwork = [r.poster, r.posterLarge, r.posterOriginal].filter(Boolean);
        if (artwork.some(url => typeof url !== 'string' || !/^https:\/\/image\.tmdb\.org\/t\/p\/(?:w[0-9]+|original)\/[A-Za-z0-9_.-]+$/.test(url))) return 0;

        const names = [r.title, r.originalTitle].filter(Boolean);
        const identity = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
        const relevant = names.some(n => identity(n) === identity(query));
        if (!relevant) return 0;

        // TMDB's adult flag describes the work. Synopsis keywords cannot do
        // that: the verified Beauty in Black synopsis mentions a stripper,
        // which previously rejected this legitimate Netflix drama and sent
        // its cover through unrelated music searches. Kids applies its own
        // reviewed title/age allowlist after this identity check.

        let score = 10;

        // An exact title match is far stronger evidence than a fuzzy one.
        if (names.some(n => n.toLowerCase() === String(query).toLowerCase())) score += 40;

        // A known catalogue year must agree, allowing one year for regional
        // release differences. Popularity cannot rescue a different edition.
        if (hints.year) {
            if (!/^\d{4}$/.test(String(r.year || ''))) return 0;
            const diff = Math.abs(parseInt(r.year, 10) - parseInt(hints.year, 10));
            if (diff === 0) score += 30;
            else if (diff <= 1) score += 12;
            else return 0;
        }

        // Popularity as a tie-break only — never enough on its own to
        // outweigh an exact title or a matching year.
        score += Math.min(10, (r.popularity || 0) / 50);

        return score;
    }

    /** Cover URL only — the common case, and what getRealCoverImage wants. */
    window.tmdbCover = async function (title, hints) {
        const r = await window.tmdbLookup(title, hints);
        return r ? (r.posterLarge || r.poster) : null;
    };

    function safeRelatedPoster(url) {
        return typeof url === 'string' && /^https:\/\/image\.tmdb\.org\/t\/p\/(?:w[0-9]+|original)\/[A-Za-z0-9_.-]+$/.test(url);
    }

    /**
     * Same-director and similar titles for an already-verified TMDB identity.
     * Never used to identify a work — only to suggest more once identity is known.
     */
    window.tmdbRelated = async function (tmdbId, kind) {
        const empty = { director: null, related: [] };
        if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0 || !['movie', 'tv'].includes(kind) || !window.supabaseClient) return empty;
        const locales = {en:'en-US', 'pt-BR':'pt-BR', es:'es-ES', fr:'fr-FR', de:'de-DE', it:'it-IT', tr:'tr-TR', ru:'ru-RU', ar:'ar-SA', hi:'hi-IN', id:'id-ID', ja:'ja-JP', ko:'ko-KR', zh:'zh-CN'};
        const lang = locales[window.MATCH_LANG] || 'en-US';
        const cacheKey = `related::${tmdbId}::${kind}::${lang}`;
        if (cacheKey in CACHE) return CACHE[cacheKey];
        let out = empty;
        try {
            const { data, error } = await window.requestTMDB({ tmdb_id: tmdbId, kind, lang, related: true });
            if (error || !data) { CACHE[cacheKey] = empty; return empty; }
            const director = data.director && Number.isSafeInteger(data.director.id) && data.director.id > 0
                ? { id: data.director.id, name: String(data.director.name || '') }
                : null;
            const related = (Array.isArray(data.related) ? data.related : [])
                .filter(r => r && Number.isSafeInteger(r.tmdbId) && r.tmdbId > 0 && r.tmdbId !== tmdbId)
                .filter(r => ['movie', 'tv'].includes(r.kind) && r.adult !== true && r.title)
                .filter(r => safeRelatedPoster(r.poster || r.posterLarge))
                .slice(0, 8)
                .map(r => ({
                    tmdbId: r.tmdbId,
                    kind: r.kind,
                    title: String(r.title),
                    originalTitle: String(r.originalTitle || r.title),
                    year: r.year || '',
                    overview: typeof r.overview === 'string' ? r.overview : '',
                    poster: r.posterLarge || r.poster,
                    why: r.why === 'director' ? 'director' : 'idea',
                    directorName: director && r.why === 'director' ? director.name : ''
                }));
            out = { director, related };
        } catch (e) {
            out = empty;
        }
        CACHE[cacheKey] = out;
        return out;
    };
})();
