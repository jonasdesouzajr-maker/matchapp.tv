#!/usr/bin/env node
/* ============================================================
   /where-to-watch/<slug>/ page generator

   Reads data/availability.json and nothing else. A title with no entry in
   that file gets no page — there is no fallback, no "check your local
   listings", no inferred availability. That is deliberate: a wrong answer to
   "where can I watch this" is worse than no page, because the user acts on it.

   These pages carry high commercial intent ("where to watch X" is a
   transactional query) and are the natural home for affiliate links later.
   The provider list is already structured per region and per access type, so
   adding a referral URL later is a field on an existing object rather than a
   redesign.

   Run: node tools/build-watch-pages.js   (after fetch-availability.js)
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://matchapp.tv';
const LANGS = ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const {hasConfirmedOffer} = require('./availability-page-policy.cjs');
const {buildPilot} = require('./build-growth-watch-pilot.cjs');
const {enrichWatchHead} = require('./watch-search-metadata.cjs');
const {regionEvidence,buildAvailabilityGraph,safeJson,httpsUrl,observationTime} = require('./availability-evidence.cjs');

const REGION_NAMES = { BR: 'Brazil', US: 'United States', GB: 'United Kingdom', PT: 'Portugal' };

const slug = s => String(s).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function loadCatalog() {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const start = src.indexOf('const CONTENT_CATALOG');
    const end = src.indexOf('const VERTICAL_DRAMA_TITLES');
    const sandbox = {};
    new Function('exports', src.slice(start, end) + ';exports.C = CONTENT_CATALOG;')(sandbox);
    return sandbox.C;
}

// Artwork is rendered from a dated exact-ID snapshot, never a fuzzy title search.
// Keeping it in the document lets the browser request first-view art immediately.
function loadWatchPosters() {
    const file = path.join(ROOT, 'data', 'watch-poster-identities.json');
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        return Array.isArray(data.entries) ? data.entries : [];
    } catch (_) { return []; }
}

function watchPoster(info, records = loadWatchPosters()) {
    const id = Number(info?.tmdbId), year = Number(info?.year);
    if (!Number.isSafeInteger(id) || id <= 0 || !['movie', 'tv'].includes(info?.kind)) return null;
    const record = records.find(row => Number(row.tmdbId) === id && row.kind === info.kind &&
        (!year || Number(row.year) === year) && row.adult !== true);
    const source = String(record?.poster || record?.posterLarge || record?.posterOriginal || '');
    const match = /^https:\/\/image\.tmdb\.org\/t\/p\/(?:w[0-9]+|original)\/([A-Za-z0-9_.-]+)$/.exec(source);
    if (!match) return null;
    return { ...record, path: match[1] };
}

function watchPosterMarkup(title, info, records) {
    const art = watchPoster(info, records);
    if (!art) return '';
    const base = 'https://image.tmdb.org/t/p/';
    const renditions = [185, 342, 500, 780].map(width => `${base}w${width}/${art.path} ${width}w`).join(', ');
    return `<figure class="w2w-title-art" data-watch-artwork>
            <span class="w2w-title-art-fallback" aria-hidden="true">${esc(title)}</span>
            <img data-watch-poster="1" data-poster-title="${esc(title)}" data-poster-preferred-url="${base}w342/${art.path}" data-tmdb-id="${Number(info.tmdbId)}" data-tmdb-kind="${esc(info.kind)}" data-tmdb-year="${Number(art.year) || Number(info.year) || ''}" src="${base}w342/${art.path}" srcset="${renditions}" sizes="(max-width:599px) 96px, (max-width:899px) 128px, 156px" alt="${esc(title)}" width="300" height="450" loading="eager" fetchpriority="high" decoding="async">
        </figure>`;
}

const WATCH_POSTER_MEDIA = '<script defer src="/catalog-media.js?v=20260927-posterrecovery2&amp;posters=20261020-1&amp;fastart=20261020-1&amp;repair=20261023-1&amp;delivery=20261023-2&amp;guestcountry=20261027-1"></script>';

const WATCH_POSTER_STYLE = `<style data-watch-poster-layout>
.w2w-hero:has(> .w2w-title-art){display:grid;grid-template-columns:156px minmax(0,1fr);column-gap:12px;row-gap:8px;align-items:center;text-align:start}
.w2w-hero > .w2w-title-art{grid-column:1;grid-row:1 / span 2;align-self:start;position:relative;isolation:isolate;width:156px;aspect-ratio:2 / 3;margin:0;overflow:hidden;border-radius:10px;background:linear-gradient(145deg,#271631,#110c18);box-shadow:0 8px 24px #0004}
.w2w-title-art > img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:1}
.w2w-title-art-fallback{position:absolute;inset:0;display:grid;place-items:center;padding:12px;text-align:center;color:#e9c986;font:600 .85rem/1.4 system-ui,sans-serif;overflow-wrap:anywhere}
.w2w-hero:has(> .w2w-title-art) > h1{grid-column:2;grid-row:1;margin:0}
.w2w-hero:has(> .w2w-title-art) > p:first-of-type{grid-column:2;grid-row:2;margin:0}
.w2w-hero:has(> .w2w-title-art) > :is(nav,p:not(:first-of-type)){grid-column:1 / -1}
.w2w-hero:has(> .w2w-title-art) > .w2w-countries{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0}
.w2w-hero:has(> .w2w-title-art) > .w2w-countries > a{justify-content:center;min-width:0;padding-inline:8px;text-align:center;overflow-wrap:anywhere}
@media(max-width:899px){.w2w-hero:has(> .w2w-title-art){grid-template-columns:128px minmax(0,1fr);gap:8px}.w2w-hero > .w2w-title-art{width:128px}}
@media(max-width:599px){.w2w-hero:has(> .w2w-title-art){grid-template-columns:96px minmax(0,1fr)}.w2w-hero > .w2w-title-art{width:96px}.w2w-hero:has(> .w2w-title-art) > .w2w-countries{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>`;

// Apply artwork to an existing owned page without regenerating its copy,
// metadata, ads or shared design hooks.
function injectWatchPoster(html, title, info, records) {
    const poster = watchPosterMarkup(title, info, records);
    if (!poster || !/<header\b[^>]*class="w2w-hero"/.test(html)) return html;
    let output = html;
    if (/<figure\b[^>]*data-watch-artwork/.test(output)) {
        output = output.replace(/<figure\b[^>]*data-watch-artwork[\s\S]*?<\/figure>/, poster);
    } else {
        output = output.replace(/(<header\b[^>]*class="w2w-hero"[^>]*>)/, '$1\n        ' + poster);
    }
    if (/<style data-watch-poster-layout>/.test(output)) {
        output = output.replace(/<style data-watch-poster-layout>[\s\S]*?<\/style>/, WATCH_POSTER_STYLE);
    } else {
        output = output.replace('</head>', WATCH_POSTER_STYLE + '\n</head>');
    }
    if (!/<script\b[^>]*src=["']\/catalog-media\.js(?:[?"'])/.test(output)) {
        output = output.replace('</head>', WATCH_POSTER_MEDIA + '\n</head>');
    }
    return output;
}

function titleSearchContext(title, info) {
    if (title === 'A Different World' && Number(info?.tmdbId) === 305357 && info?.kind === 'tv') {
        return {
            title: 'A Different World 2026 Streaming & Sequel | MatchApp Ai',
            description: 'A Different World (2026) is Netflix’s sequel series, released Sept. 24, 2026. See where it streams by country and the confirmed Season 2 renewal.',
            body: `<section class="w2w-section" aria-labelledby="a-different-world-sequel-answer">
        <h2 id="a-different-world-sequel-answer">Is A Different World (2026) the Netflix sequel?</h2>
        <p><strong>Yes.</strong> This guide covers Netflix’s 2026 sequel series set at Hillman College, not the original 1987–1993 sitcom. Netflix released Season 1 on September 24, 2026.</p>
        <p>Netflix announced on October 2, 2026 that the sequel has been renewed for Season 2. No Season 2 release date has been announced yet, so pages claiming a specific date should be treated cautiously until Netflix publishes one.</p>
        <p><a href="https://media.netflix.com/en/only-on-netflix/81747525" target="_blank" rel="noopener noreferrer">Official Netflix title page</a> · <a href="https://www.netflix.com/tudum/articles/a-different-world-season-2-plot-release-date-photos-news" target="_blank" rel="noopener noreferrer">Official Season 2 renewal</a></p>
    </section>`
        };
    }
    return null;
}

function buildPage(title, info, entry, related, generated) {
    const s = slug(title);
    const url = `${SITE}/where-to-watch/${s}/`;
    const yr = info.year ? ` (${info.year})` : '';
    const poster = watchPosterMarkup(title, info);

    const regionalRecords={...info.regionObservations,...info.regions};
    const regions=[...new Set([...Object.keys(REGION_NAMES),...Object.keys(regionalRecords)])]
        .filter(code=>regionalRecords[code]).map(code=>[code,regionalRecords[code]]);
    const allStream = [...new Set(regions.flatMap(([, r]) => r.stream || []))];

    // The description states only what the data supports. A small exact-ID
    // editorial context may sharpen an already verified title without changing provider evidence.
    const searchContext = titleSearchContext(title, info);
    const metaDesc = searchContext?.description || (allStream.length
        ? `Where to watch ${title}${yr}: compare reported regional streaming options, source links and the date of the last availability check.`
        : `Where to watch ${title}${yr}: reported provider listings by region, with source links and a dated TMDB snapshot.`);
    const metaTitle = searchContext?.title || `Where to Watch ${title}${yr} | MatchApp Ai`;

    const evidence = regions.map(([code]) => regionEvidence(info,code,generated));
    const regionBlocks = regions.map(([code, r]) => {
        const observed = evidence.find(e => e.code === code);
        const rows = [];
        if (r.stream?.length) rows.push(`<div class="w2w-row"><span class="w2w-kind w2w-stream">Included with subscription</span><div class="w2w-provs">${r.stream.map(p => `<span class="w2w-prov">${esc(p)}</span>`).join('')}</div></div>`);
        if (r.rent?.length)   rows.push(`<div class="w2w-row"><span class="w2w-kind">Rent</span><div class="w2w-provs">${r.rent.map(p => `<span class="w2w-prov w2w-prov-quiet">${esc(p)}</span>`).join('')}</div></div>`);
        if (r.buy?.length)    rows.push(`<div class="w2w-row"><span class="w2w-kind">Buy</span><div class="w2w-provs">${r.buy.map(p => `<span class="w2w-prov w2w-prov-quiet">${esc(p)}</span>`).join('')}</div></div>`);
        for(const [field,label] of [['free','Free access'],['ads','Free with ads']]) {
            if(r[field]?.length) rows.push(`<div class="w2w-row"><span class="w2w-kind">${label}</span><div class="w2w-provs">${r[field].map(p=>`<span class="w2w-prov">${esc(p)}</span>`).join('')}</div></div>`);
        }
        if (!['stream','rent','buy'].some(key=>r[key]?.length)) rows.push(`<p>No subscription, rental or purchase provider is confirmed in this snapshot for ${esc(REGION_NAMES[code] || code)}. This is not proof that the title is unavailable everywhere; check the linked source.</p>`);
        return `
            <article class="w2w-region" id="availability-${code.toLowerCase()}" data-availability-state="${observed.state}">
                <h3>Where to watch in ${esc(REGION_NAMES[code] || code)}</h3>
                <p class="w2w-source-status">${esc(observed.answer)}</p>
                ${rows.join('\n                ')}
                ${httpsUrl(r.link) ? `<a class="w2w-link" href="${esc(httpsUrl(r.link))}" target="_blank" rel="noopener nofollow">See full options for ${esc(REGION_NAMES[code] || code)} →</a>` : ''}
            </article>`;
    }).join('');

    // Direct WatchActions are emitted only for independently verified provider-title URLs.
    // Existing TMDB regional source pages remain citations, never fictional playback links.
    const ld = buildAvailabilityGraph({title,info,entry,url,generated});
    const crumbs = {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "MatchApp Ai", "item": `${SITE}/` },
            { "@type": "ListItem", "position": 2, "name": "Where to Watch", "item": `${SITE}/where-to-watch/` },
            { "@type": "ListItem", "position": 3, "name": title, "item": url }
        ]
    };

    const checked = evidence.map(e=>e.checkedAt).filter(Boolean).sort().at(-1) || '';
    const compiled = observationTime(generated);
    const comparisons = regions.map(([code,r])=>{
        const options = [['subscription',r.stream],['rental',r.rent],['purchase',r.buy],['free access',r.free],['free with ads',r.ads]].filter(([,names])=>names?.length);
        return `<li><strong>${esc(REGION_NAMES[code]||code)}:</strong> ${options.length ? options.map(([kind,names])=>`${kind} via ${names.map(esc).join(', ')}`).join('; ') : 'no confirmed provider listing in this snapshot'}.</li>`;
    }).join('');
    const context = entry ? [entry.cats?.length ? `Catalog categories: ${entry.cats.map(esc).join(', ')}.` : '', entry.moods?.length ? `Discovery moods: ${entry.moods.map(esc).join(', ')}.` : ''].filter(Boolean).join(' ') : '';
    const sourceUrl = Number.isSafeInteger(info.tmdbId) && ['movie','tv'].includes(info.kind) ? `https://www.themoviedb.org/${info.kind}/${info.tmdbId}` : '';
    const guidance = `<section class="w2w-section" aria-label="Source context and comparison">
        <h2>Choosing the right ${info.kind==='movie'?'film':'series'} and viewing option</h2>
        <p>${esc(title)}${esc(yr)} is the ${info.kind==='movie'?'movie':'TV title'} identified by this page. ${context} These are MatchApp discovery tags, not an age classification or a review score. Compare the synopsis above with the mood and format you want before choosing a provider.</p>
        ${compiled ? `<p><strong>Dataset compiled:</strong> <time datetime="${compiled}">${esc(compiled.replace('T',' ').replace('Z',' UTC'))}</time>. Compilation does not recheck older observations; individual source-check times are shown separately.</p>` : ''}
        <p><strong>Provider data checked:</strong> ${checked ? `<time datetime="${checked}">${esc(checked.replace('T',' ').replace('.000Z',' UTC').replace('Z',' UTC'))}</time>` : 'check the linked source for its reporting date'}. This is a stored source snapshot, not a real-time guarantee. The same title can have different providers or no reported listing in neighboring countries.</p>
        <ul>${comparisons}</ul>
        <p>Subscription, rental and purchase are separate offers. A service listed for a rental does not mean its subscribers can watch for free. A marketplace channel may require an additional subscription. Before paying, open the listing for your country and check the exact title, year, season or edition, price, language and subtitle options. Those details are not supplied by this provider snapshot.</p>
        ${sourceUrl ? `<p><a href="${sourceUrl}" target="_blank" rel="noopener">Exact title record on TMDB</a>. Regional source links above show the underlying viewing listings supplied through TMDB and JustWatch; MatchApp does not sell or host the film.</p>` : ''}
    </section>`;

    const relatedLinks = related.map(r =>
        `<a href="/where-to-watch/${slug(r)}/">${esc(r)}</a>`).join('\n                ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(metaTitle)}</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${hasConfirmedOffer(info) ? 'index, follow, max-image-preview:large' : 'noindex,follow'}">
<meta name="theme-color" content="#101010">
<link rel="icon" href="/assets/brand/matchapp-ai-favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/assets/brand/matchapp-ai-favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/matchapp-ai-favicon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/assets/brand/matchapp-ai-favicon-48.png">
<link rel="manifest" href="/manifest.json">

<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(metaTitle)}">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:image" content="${SITE}/og-image.jpg?v=2">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(metaTitle)}">
<meta name="twitter:description" content="${esc(metaDesc)}">
<meta name="twitter:image" content="${SITE}/og-image.jpg?v=2">

<link rel="alternate" hreflang="x-default" href="${url}">
<link rel="alternate" hreflang="en" href="${url}">

<script type="application/ld+json">${safeJson(ld)}</script>
<script type="application/ld+json">${safeJson(crumbs)}</script>

<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>

<link rel="stylesheet" href="/style.css?v=162">
<style>
    .w2w-wrap { max-width: 880px; margin: 0 auto; padding: 20px 16px 80px; }
    .w2w-crumbs { font-size: 12.5px; color: #8f8877; margin-bottom: 18px; }
    .w2w-crumbs a { color: var(--gold-mid); text-decoration: none; }
    .w2w-hero { text-align: center; padding: 14px 0 26px; }
    .w2w-hero h1 { font-size: clamp(25px, 4.6vw, 38px); margin: 0 0 12px; color: var(--gold-core); line-height: 1.2; }
    .w2w-syn { color: #C9C2B4; font-size: 15.5px; line-height: 1.65; max-width: 600px; margin: 0 auto 22px; }
    .w2w-region { background: rgba(31,30,28,0.82); border: 1px solid var(--edge); border-radius: 14px;
                  padding: 18px 20px; margin-bottom: 13px; text-align: left; }
    .w2w-region h3 { margin: 0 0 14px; font-size: 18px; color: #fff; }
    .w2w-region { scroll-margin-top: 24px; min-width: 0; overflow-wrap: anywhere; }
    .w2w-source-status { color: #ddd5e7; line-height: 1.65; margin: 0 0 18px; }
    .w2w-countries { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin: 18px 0; }
    .w2w-countries a { display: inline-flex; align-items: center; min-height: 44px; padding: 10px 16px; border: 1px solid var(--edge); border-radius: 14px; color: var(--gold-core); text-decoration: none; }
    .w2w-countries a:focus-visible,.w2w-link:focus-visible { outline: 2px solid var(--gold-core); outline-offset: 4px; }
    .w2w-region[data-availability-state="unknown"],.w2w-region[data-availability-state="stale"] { border-style: dashed; }
    .w2w-row { display: flex; gap: 13px; align-items: flex-start; margin-bottom: 11px; flex-wrap: wrap; }
    .w2w-kind { flex-shrink: 0; font-size: 11.5px; font-weight: 800; text-transform: uppercase;
                letter-spacing: 0.5px; color: #8f8877; padding-top: 5px; min-width: 92px; }
    .w2w-stream { color: var(--gold-core); }
    .w2w-provs { display: flex; gap: 7px; flex-wrap: wrap; }
    .w2w-prov { background: rgba(228,192,108,0.14); color: var(--gold-core); font-size: 13px;
                font-weight: 700; padding: 6px 13px; border-radius: 999px; }
    .w2w-prov-quiet { background: rgba(255,255,255,0.06); color: #b3ad9e; font-weight: 600; }
    .w2w-link { display: inline-flex; align-items: center; min-height: 44px; margin-top: 6px; color: var(--gold-mid); font-size: 13px; text-decoration: none; }
    .w2w-link:hover { text-decoration: underline; }
    .w2w-cta { display: inline-flex; align-items: center; gap: 9px; background: linear-gradient(135deg, #E4C06C, #C0843C);
               color: #101010; padding: 15px 28px; border-radius: 14px; font-weight: 800; text-decoration: none; font-size: 15.5px; }
    .w2w-section { margin-top: 42px; }
    .w2w-section h2 { font-size: 20px; color: var(--gold-core); margin: 0 0 14px; }
    .w2w-related { display: flex; flex-wrap: wrap; gap: 9px; }
    .w2w-related a { background: rgba(31,30,28,0.82); border: 1px solid var(--edge); color: #C9C2B4;
                     padding: 10px 16px; border-radius: 11px; text-decoration: none; font-size: 13.5px; font-weight: 600; }
    .w2w-related a:hover { border-color: var(--edge-strong); color: #fff; }
    .w2w-note { margin-top: 30px; padding: 14px 16px; background: rgba(255,255,255,0.03);
                border-radius: 11px; color: #8f8877; font-size: 12.5px; line-height: 1.6; text-align: left; }
    .w2w-foot { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--edge-subtle); text-align: center; }
    .w2w-foot a { color: var(--gold-mid); text-decoration: none; margin: 0 11px; font-size: 14px; }
    @media (max-width: 560px) { .w2w-kind { min-width: 0; width: 100%; padding-top: 0; } }
</style>
${poster ? WATCH_POSTER_STYLE + '\n' + WATCH_POSTER_MEDIA : ''}
</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

<main class="w2w-wrap">
    <nav class="w2w-crumbs" aria-label="Breadcrumb">
        <a href="/">MatchApp</a> › <a href="/where-to-watch/">Where to Watch</a> › <span>${esc(title)}</span>
    </nav>

    <header class="w2w-hero">
        ${poster}
        <h1>Where to Watch ${esc(title)}${esc(yr)}</h1>
        <p class="w2w-syn">Choose your viewing country for the dated source answer. Subscription, rental and purchase options are shown separately.</p>
        <nav class="w2w-countries" aria-label="Choose viewing country">${regions.map(([code])=>`<a href="#availability-${code.toLowerCase()}">${esc(REGION_NAMES[code]||code)}</a>`).join('')}</nav>
        ${entry && entry.synopsis ? `<p class="w2w-syn">${esc(entry.synopsis)}</p>` : ''}
    </header>

    ${searchContext?.body || ''}

    <section aria-label="Availability by region">
        ${regionBlocks}
    </section>

    <div data-growth-app-slot data-growth-source="title_after_aha" data-title-name="${esc(title)}"></div>

    ${guidance}

    <div class="w2w-note">
        Availability is sourced from TMDB and JustWatch and can change without notice.
        Options shown are those reported for each region listed — a service missing here
        may still carry the title in a country we do not yet cover.
        <a href="/where-to-watch/availability-methodology/">How we verify and date availability</a>.
    </div>

    <section class="w2w-section" style="text-align:center;">
        <h2>Want something like this?</h2>
        <p class="w2w-syn">Tell MatchApp Ai what you are in the mood for and explore a recommendation. Current guest and account allowances apply.</p>
        <a class="w2w-cta" href="/discover.html">Ask the AI Concierge →</a>
    </section>

    ${related.length ? `<section class="w2w-section">
        <h2>Explore related title guides</h2>
        <nav class="w2w-related">
                ${relatedLinks}
        </nav>
    </section>` : ''}

    <footer class="w2w-foot">
        <a href="/">Home</a><a href="/discover.html">Ask AI</a><a href="/together.html">Match Together</a>
    </footer>
</main>
<link rel="stylesheet" href="/growth-together.css?v=20261016-1">
<script src="/growth-core.js?v=20261017-1"></script>
<script src="/growth-copy.js?v=20261016-1"></script>
<script src="/growth-install.js?v=20261017-1&errors=20261027-2"></script>
</body>
</html>
`;
}

function buildIndex(titles, publishedUrls = []) {
    const schema={'@context':'https://schema.org','@type':'CollectionPage',
        name:'Where to Watch Movies and TV Series by Country | MatchApp Ai',
        url:SITE+'/where-to-watch/',
        description:'Regional movie and TV streaming, rental and purchase discovery with original verification guidance.',
        mainEntity:{'@type':'ItemList',numberOfItems:titles.length,
            itemListElement:titles.map((name,i)=>({'@type':'ListItem',position:i+1,name,
                url:SITE+'/where-to-watch/'+slug(name)+'/'
            }))}};
    const schemaJson=safeJson(schema);
    const links = titles.map(t =>
        `<a href="/where-to-watch/${slug(t)}/">${esc(t)}</a>`).join('\n                ');
    const regionalHubs = [
        ['/pt/br/watch/', 'Brasil (português)', 'pt-BR'],
        ['/en/br/watch/', 'Brazil (English)', 'en-BR'],
        ['/en/us/watch/', 'United States', 'en-US'],
        ['/en/gb/watch/', 'United Kingdom', 'en-GB'],
        ['/en/pt/watch/', 'Portugal (English)', 'en-PT']
    ].filter(([route]) => publishedUrls.includes(SITE + route));
    const countryNavigation = regionalHubs.length ? `<section aria-labelledby="watch-by-country"><h2 id="watch-by-country">Browse streaming guides by country</h2><nav class="w2w-related" aria-labelledby="watch-by-country">${regionalHubs.map(([route, label, language]) =>
        `<a href="${route}" hreflang="${language}">${label}</a>`).join(' ')}</nav></section>` : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<!-- End Google Tag Manager -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Where to Watch Movies & TV Shows by Country | MatchApp Ai</title>
<meta name="description" content="Find where to stream, rent or buy ${titles.length} titles across Brazil, the US, the UK and Portugal. Availability data from TMDB, updated regularly.">
<link rel="canonical" href="${SITE}/where-to-watch/">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#101010">
<link rel="icon" href="/assets/brand/matchapp-ai-favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/assets/brand/matchapp-ai-favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/matchapp-ai-favicon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/assets/brand/matchapp-ai-favicon-48.png">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}/where-to-watch/">
<meta property="og:title" content="Where to Watch Movies & TV Shows by Country | MatchApp Ai">
<meta property="og:image" content="${SITE}/og-image.jpg?v=2">
<link rel="search" type="application/opensearchdescription+xml" title="MatchApp Ai Where to Watch" href="/opensearch.xml">
<link rel="alternate" type="application/rss+xml" title="MatchApp Ai discoveries — English" href="/feeds/discoveries-en.xml">
<link rel="alternate" type="application/rss+xml" title="MatchApp Ai descobertas — Português do Brasil" href="/feeds/discoveries-pt-br.xml">
<script type="application/ld+json">${schemaJson}</script>
<link rel="stylesheet" href="/style.css?v=162">
<style>
    .w2w-wrap { max-width: 880px; margin: 0 auto; padding: 30px 16px 80px; }
    .w2w-wrap h1 { font-size: clamp(27px,5vw,40px); color: var(--gold-core); text-align: center; margin: 0 0 14px; }
    .w2w-lede { color: #C9C2B4; font-size: 16px; line-height: 1.65; max-width: 620px; margin: 0 auto 32px; text-align: center; }
    .w2w-related { display: flex; flex-wrap: wrap; gap: 9px; justify-content: center; }
    .w2w-related a { background: rgba(31,30,28,0.82); border: 1px solid var(--edge); color: #C9C2B4;
                     padding: 11px 17px; border-radius: 11px; text-decoration: none; font-size: 13.5px; font-weight: 600; }
    .w2w-related a:hover { border-color: var(--edge-strong); color: #fff; }
    .w2w-search { max-width: 620px; margin: 24px auto; }
    .w2w-search label { display: block; margin-bottom: 8px; color: #C9C2B4; font-weight: 700; }
    .w2w-search input { width: 100%; min-height: 48px; border: 1px solid var(--edge); border-radius: 14px; background: rgba(31,30,28,.82); color: #fff; padding: 11px 15px; font: inherit; }
    .w2w-search input:focus-visible { outline: 2px solid var(--gold-core); outline-offset: 3px; }
    .w2w-search-status { min-height: 1.5em; margin: 8px 0 0; color: #9f988b; font-size: 13px; }
    .w2w-feed-links { margin-top: 28px; text-align: center; color: #9f988b; }
</style>
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
<main class="w2w-wrap">
    <h1>Where to Watch</h1>
    <p class="w2w-lede">Streaming, rental and purchase options for ${titles.length} titles across Brazil, the US, the UK and Portugal — sourced from TMDB and JustWatch rather than guessed at.</p>
    <section><h2>How to use this regional guide</h2><p>Choose a title below, then read the entry for your country. The same service can carry a film in Brazil and omit it in the United States. Each title page separates subscription viewing from rentals and purchases, includes its source snapshot date and links to the underlying regional listing. A blank provider entry means this source did not confirm an offer; it does not mean no legal offer exists.</p><p>Match the exact title and release year before paying. Remakes, series, films and bonus editions can share a name. On the destination service, check season availability, audio and subtitles, price and any additional channel subscription. A source link is a way to verify the offer, not a promise that MatchApp can play the title.</p><p>For help choosing what suits your evening, read our <a href="/guides/what-to-watch-september-2026/">dated movie and series discovery guide</a>. For corrections and the distinction between AI suggestions and source records, read <a href="/about.html">our source and correction approach</a>.</p></section>
    ${countryNavigation}
    <form class="w2w-search" role="search" method="get" action="/where-to-watch/">
        <label for="watch-title-search">Search the 81-title streaming guide</label>
        <input id="watch-title-search" type="search" name="q" autocomplete="off" enterkeyhint="search" placeholder="Try 3 Idiots, A Different World, Bluey…">
        <p class="w2w-search-status" id="watch-title-search-status" role="status" aria-live="polite"></p>
    </form>
    <nav class="w2w-related" aria-label="Title availability guides">
                ${links}
    </nav>
    <p class="w2w-feed-links">Follow curated MatchApp discoveries: <a href="/feeds/discoveries-en.xml">English RSS</a> · <a href="/feeds/discoveries-pt-br.xml" hreflang="pt-BR">Português RSS</a></p>
</main>
<script>
(function(){
 var form=document.querySelector('.w2w-search'),input=document.getElementById('watch-title-search'),status=document.getElementById('watch-title-search-status');
 var links=Array.from(document.querySelectorAll('nav[aria-label="Title availability guides"] > a'));
 if(!form||!input||!status||!links.length)return;
 var normalize=function(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();};
 var apply=function(){
  var query=normalize(input.value),shown=0;
  links.forEach(function(link){var visible=!query||normalize(link.textContent).includes(query);link.hidden=!visible;if(visible)shown++;});
  status.textContent=query?(shown+' title'+(shown===1?'':'s')+' found'):'';
 };
 var requested=new URLSearchParams(location.search).get('q')||'';
 if(requested)input.value=requested;
 input.addEventListener('input',apply);
 form.addEventListener('submit',function(event){event.preventDefault();var url=new URL(location.href);var q=input.value.trim();if(q)url.searchParams.set('q',q);else url.searchParams.delete('q');history.replaceState(null,'',url.pathname+url.search);apply();});
 apply();
})();
</script>
</body>
</html>
`;
}

function main() {
    const dataPath = path.join(ROOT, 'data', 'availability.json');
    if (!fs.existsSync(dataPath)) {
        console.log('data/availability.json not found — run tools/fetch-availability.js first.');
        console.log('No pages generated. This is correct: without real data there is nothing truthful to publish.');
        return;
    }

    const { titles, generated } = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const catalog = loadCatalog();
    const names = Object.keys(titles);

    if (!names.length) {
        console.log('availability.json contains no titles — nothing to generate.');
        return;
    }

    const urls = [];
    names.forEach(title => {
        const info = titles[title];
        const entry = catalog.find(e => e.title === title);
        // Related = other titles that share a streaming provider, which makes
        // the link genuinely relevant rather than decorative.
        const mine = new Set(Object.values(info.regions).flatMap(r => r.stream || []));
        const related = names
            .filter(n => n !== title)
            .filter(n => Object.values(titles[n].regions).flatMap(r => r.stream || []).some(p => mine.has(p)))
            .slice(0, 8);

        const dir = path.join(ROOT, 'where-to-watch', slug(title));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), enrichWatchHead(buildPage(title, info, entry, related, generated),title,info), 'utf8');
        if (hasConfirmedOffer(info)) urls.push(`${SITE}/where-to-watch/${slug(title)}/`);
    });

    urls.unshift(`${SITE}/where-to-watch/`);
    const pilot=buildPilot({root:ROOT,origin:SITE,catalog,data:{titles,generated}});
    fs.writeFileSync(path.join(ROOT, 'where-to-watch', 'index.html'), buildIndex(names, pilot.urls), 'utf8');
    urls.push(...pilot.urls);
    console.log(`${pilot.pages} evidence-backed country/language pages + ${pilot.hubs} regional hubs written`);

    fs.writeFileSync(path.join(ROOT, 'tools', 'watch-urls.json'), JSON.stringify(urls, null, 2));
    console.log(`${names.length} availability pages + 1 index written`);
    console.log('-> tools/watch-urls.json');
}

if(require.main===module){
  main();
  // Preserve existing approved branding and metadata after regeneration.
  require('./finalize-brand.js').finalizeBrand(['where-to-watch/','en/br/watch/','en/us/watch/','en/gb/watch/','en/pt/watch/','pt/br/watch/']);
  require('./discovery-metadata.js').applyFiles('where-to-watch/');
  require('./public-discovery-head.cjs').refreshPublicFiles(['where-to-watch/','en/br/watch/','en/us/watch/','en/gb/watch/','en/pt/watch/','pt/br/watch/']);
}
module.exports={buildPage,buildIndex,watchPoster,watchPosterMarkup,WATCH_POSTER_STYLE,injectWatchPoster};
