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

function buildPage(title, info, entry, related) {
    const s = slug(title);
    const url = `${SITE}/where-to-watch/${s}/`;
    const yr = info.year ? ` (${info.year})` : '';

    const regions = Object.entries(info.regions);
    const allStream = [...new Set(regions.flatMap(([, r]) => r.stream || []))];

    // The description states only what the data supports.
    const metaDesc = allStream.length
        ? `Where to watch ${title}${yr}: streaming on ${allStream.slice(0, 3).join(', ')}. Availability by region, updated from TMDB.`
        : `Where to watch ${title}${yr}: rental and purchase options by region, updated from TMDB.`;

    const regionBlocks = regions.map(([code, r]) => {
        const rows = [];
        if (r.stream) rows.push(`<div class="w2w-row"><span class="w2w-kind w2w-stream">Included with subscription</span><div class="w2w-provs">${r.stream.map(p => `<span class="w2w-prov">${esc(p)}</span>`).join('')}</div></div>`);
        if (r.rent)   rows.push(`<div class="w2w-row"><span class="w2w-kind">Rent</span><div class="w2w-provs">${r.rent.map(p => `<span class="w2w-prov w2w-prov-quiet">${esc(p)}</span>`).join('')}</div></div>`);
        if (r.buy)    rows.push(`<div class="w2w-row"><span class="w2w-kind">Buy</span><div class="w2w-provs">${r.buy.map(p => `<span class="w2w-prov w2w-prov-quiet">${esc(p)}</span>`).join('')}</div></div>`);
        return `
            <article class="w2w-region">
                <h3>${esc(REGION_NAMES[code] || code)}</h3>
                ${rows.join('\n                ')}
                ${r.link ? `<a class="w2w-link" href="${esc(r.link)}" target="_blank" rel="noopener nofollow">See full options for ${esc(REGION_NAMES[code] || code)} →</a>` : ''}
            </article>`;
    }).join('');

    // Schema describes only what is on the page. No ratings, no reviews, no
    // price — none of that is in the data and inventing it would be exactly
    // the kind of structured-data abuse that earns a manual action.
    const ld = {
        "@context": "https://schema.org",
        "@type": info.kind === 'movie' ? 'Movie' : 'TVSeries',
        "name": title,
        "url": url,
        ...(info.year ? { "datePublished": String(info.year) } : {}),
        ...(entry && entry.synopsis ? { "description": entry.synopsis } : {})
    };
    const crumbs = {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "MatchApp", "item": `${SITE}/` },
            { "@type": "ListItem", "position": 2, "name": "Where to Watch", "item": `${SITE}/where-to-watch/` },
            { "@type": "ListItem", "position": 3, "name": title, "item": url }
        ]
    };

    const relatedLinks = related.map(r =>
        `<a href="/where-to-watch/${slug(r)}/">${esc(r)}</a>`).join('\n                ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Where to Watch ${esc(title)}${esc(yr)} | MatchApp</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#101010">
<link rel="icon" href="/logo.jpeg?v=2" type="image/jpeg">
<link rel="manifest" href="/manifest.json">

<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="Where to Watch ${esc(title)} | MatchApp">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:image" content="${SITE}/og-image.jpg?v=2">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Where to Watch ${esc(title)} | MatchApp">
<meta name="twitter:description" content="${esc(metaDesc)}">
<meta name="twitter:image" content="${SITE}/og-image.jpg?v=2">

<link rel="alternate" hreflang="x-default" href="${url}">
${LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${url}?lang=${l}">`).join('\n')}

<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(crumbs)}</script>

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
    .w2w-region h3 { margin: 0 0 14px; font-size: 16px; color: #fff; }
    .w2w-row { display: flex; gap: 13px; align-items: flex-start; margin-bottom: 11px; flex-wrap: wrap; }
    .w2w-kind { flex-shrink: 0; font-size: 11.5px; font-weight: 800; text-transform: uppercase;
                letter-spacing: 0.5px; color: #8f8877; padding-top: 5px; min-width: 92px; }
    .w2w-stream { color: var(--gold-core); }
    .w2w-provs { display: flex; gap: 7px; flex-wrap: wrap; }
    .w2w-prov { background: rgba(228,192,108,0.14); color: var(--gold-core); font-size: 13px;
                font-weight: 700; padding: 6px 13px; border-radius: 999px; }
    .w2w-prov-quiet { background: rgba(255,255,255,0.06); color: #b3ad9e; font-weight: 600; }
    .w2w-link { display: inline-block; margin-top: 6px; color: var(--gold-mid); font-size: 13px; text-decoration: none; }
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
</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

<main class="w2w-wrap">
    <nav class="w2w-crumbs" aria-label="Breadcrumb">
        <a href="/">MatchApp</a> › <a href="/where-to-watch/">Where to Watch</a> › <span>${esc(title)}</span>
    </nav>

    <header class="w2w-hero">
        <h1>Where to Watch ${esc(title)}${esc(yr)}</h1>
        ${entry && entry.synopsis ? `<p class="w2w-syn">${esc(entry.synopsis)}</p>` : ''}
    </header>

    <section aria-label="Availability by region">
        ${regionBlocks}
    </section>

    <div class="w2w-note">
        Availability is sourced from TMDB and JustWatch and can change without notice.
        Options shown are those reported for each region listed — a service missing here
        may still carry the title in a country we do not yet cover.
    </div>

    <section class="w2w-section" style="text-align:center;">
        <h2>Want something like this?</h2>
        <p class="w2w-syn">Tell MatchApp what you are in the mood for and the AI concierge will find it — free, no account needed.</p>
        <a class="w2w-cta" href="/discover.html">Ask the AI Concierge →</a>
    </section>

    ${related.length ? `<section class="w2w-section">
        <h2>Also available to stream</h2>
        <nav class="w2w-related">
                ${relatedLinks}
        </nav>
    </section>` : ''}

    <footer class="w2w-foot">
        <a href="/">Home</a><a href="/discover.html">Ask AI</a><a href="/together.html">Match Together</a>
    </footer>
</main>
</body>
</html>
`;
}

function buildIndex(titles) {
    const links = titles.map(t =>
        `<a href="/where-to-watch/${slug(t)}/">${esc(t)}</a>`).join('\n                ');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Where to Watch — Streaming Availability | MatchApp</title>
<meta name="description" content="Find where to stream, rent or buy ${titles.length} titles across Brazil, the US, the UK and Portugal. Availability data from TMDB, updated regularly.">
<link rel="canonical" href="${SITE}/where-to-watch/">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#101010">
<link rel="icon" href="/logo.jpeg?v=2" type="image/jpeg">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}/where-to-watch/">
<meta property="og:title" content="Where to Watch | MatchApp">
<meta property="og:image" content="${SITE}/og-image.jpg?v=2">
<link rel="stylesheet" href="/style.css?v=162">
<style>
    .w2w-wrap { max-width: 880px; margin: 0 auto; padding: 30px 16px 80px; }
    .w2w-wrap h1 { font-size: clamp(27px,5vw,40px); color: var(--gold-core); text-align: center; margin: 0 0 14px; }
    .w2w-lede { color: #C9C2B4; font-size: 16px; line-height: 1.65; max-width: 620px; margin: 0 auto 32px; text-align: center; }
    .w2w-related { display: flex; flex-wrap: wrap; gap: 9px; justify-content: center; }
    .w2w-related a { background: rgba(31,30,28,0.82); border: 1px solid var(--edge); color: #C9C2B4;
                     padding: 11px 17px; border-radius: 11px; text-decoration: none; font-size: 13.5px; font-weight: 600; }
    .w2w-related a:hover { border-color: var(--edge-strong); color: #fff; }
</style>
</head>
<body>
<main class="w2w-wrap">
    <h1>Where to Watch</h1>
    <p class="w2w-lede">Streaming, rental and purchase options for ${titles.length} titles across Brazil, the US, the UK and Portugal — sourced from TMDB and JustWatch rather than guessed at.</p>
    <nav class="w2w-related">
                ${links}
    </nav>
</main>
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

    const { titles } = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
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
        fs.writeFileSync(path.join(dir, 'index.html'), buildPage(title, info, entry, related), 'utf8');
        urls.push(`${SITE}/where-to-watch/${slug(title)}/`);
    });

    fs.writeFileSync(path.join(ROOT, 'where-to-watch', 'index.html'), buildIndex(names), 'utf8');
    urls.unshift(`${SITE}/where-to-watch/`);

    fs.writeFileSync(path.join(ROOT, 'tools', 'watch-urls.json'), JSON.stringify(urls, null, 2));
    console.log(`${names.length} availability pages + 1 index written`);
    console.log('-> tools/watch-urls.json');
}

main();

// Preserve the shared brand on regenerated guides.
require('./finalize-brand.js').finalizeBrand();
