#!/usr/bin/env node
/* ============================================================
   MatchApp SEO collection-page generator

   Builds discovery pages from the catalog that already exists —
   /moods/<slug>/, /collections/<slug>/ and /platforms/<slug>/.

   WHY COLLECTIONS AND NOT ONE PAGE PER TITLE:

   The catalog is broad and continues to grow, but the average synopsis is 120
   characters — roughly a sentence and a half — and only one entry in the
   whole set has a watch URL. A page per title would therefore be a heading,
   one sentence, a platform name and some tags: the textbook definition of
   thin content, and 184 of them would be a content farm pointed at our own
   domain. Availability pages would be worse still, because with one real
   watch URL we would have to invent the rest.

   A collection page inverts that. Its value is the curation — twenty-five
   series chosen for one mood, ranked and cross-linked — which is genuinely
   useful even with a short blurb per title, and useful to a human who
   arrived without Google. That is the bar this generator enforces.

   MIN_TITLES is the whole quality gate: a facet with fewer than this many
   entries does not become a page at all. As the catalog grows, more facets
   cross the line and more pages appear, automatically and only when earned.

   Run: node tools/build-seo-pages.js
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIN_TITLES = 8;
const SITE = 'https://matchapp.tv';
const LANGS = ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];

/* ---------- load the catalog straight out of app.js ---------- */
function loadCatalog() {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const start = src.indexOf('const CONTENT_CATALOG');
    const end = src.indexOf('const VERTICAL_DRAMA_TITLES');
    if (start === -1 || end === -1) throw new Error('CONTENT_CATALOG not found in app.js');
    const sandbox = {};
    new Function('exports', src.slice(start, end) + ';exports.C = CONTENT_CATALOG;')(sandbox);
    return sandbox.C;
}

const slug = s => String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ---------- editorial copy per facet ----------
   Written by hand, not generated. Each page needs a genuine reason to exist
   and a human sentence explaining what the collection is for; a templated
   "Best {mood} content" string across 24 pages would be duplicate content
   wearing different nouns. */
const MOOD_COPY = {
    'intense and thrilling': ['Something With Your Heart Racing', 'Tension that does not let up. Thrillers, crime dramas and survival stories where the next scene genuinely matters.'],
    'inspiring':             ['Something That Lifts You', 'Stories about people who did the hard thing anyway — documentaries, dramas and real lives worth two hours of yours.'],
    'cozy comfort watch':    ['Something Comforting', 'The television equivalent of a warm room. Familiar, gentle, and perfectly happy to have you half-watching.'],
    'funny':                 ['Something Genuinely Funny', 'Comedies that actually land — sitcoms, stand-up and films that earn the laugh rather than signalling for it.'],
    'light and feel-good':   ['Something Light', 'Easy watching with no emotional homework. Good company after a long day.'],
    'dark and gritty':       ['Something Dark', 'Morally complicated, unglamorous and often uncomfortable. Stories that refuse to tidy themselves up.'],
    'epic and adventurous':  ['Something Epic', 'Big worlds, long journeys and stakes that justify the runtime. Best on the largest screen you own.'],
    'mind-bending':          ['Something That Messes With You', 'Puzzle-box plots, unreliable narrators and endings you will want to argue about.'],
    'heartbreaking':         ['Something That Will Wreck You', 'Stories that earn their sadness. Have something comforting queued up afterwards.'],
    'romantic':              ['Something Romantic', 'Love stories that are actually about people — from slow-burn K-dramas to films that still hold up.'],
    'nostalgic':             ['Something Nostalgic', 'Titles that take you back, whether you were there the first time or not.']
};

const CAT_COPY = {
    'series':          ['Series Worth Starting', 'Television with something to say — prestige drama, sharp comedy and the kind of show that takes over a weekend.'],
    'movie':           ['Films Worth Your Evening', 'One sitting, one story, done properly.'],
    'documentary':     ['Documentaries Worth Watching', 'Real stories told well — the ones you end up describing to someone the next day.'],
    'K-drama':         ['K-Dramas Worth Your Time', 'Korean series with the emotional precision the format is known for. A good place to start if you never have.'],
    'anime':           ['Anime Worth Watching', 'From long-running classics to recent standouts.'],
    'podcast':         ['Podcasts Worth Subscribing To', 'Conversation, reporting and storytelling for commutes, washing up and long drives.'],
    'Classical Music': ['Classical Worth Listening To', 'Recordings, performances and channels for focus, calm or genuine listening.'],
    'Gospel & Faith':  ['Gospel & Faith', 'Music, teaching and stories from across the faith tradition.'],
    'News':            ['News Worth Following', 'Reporting and analysis from established newsrooms.'],
    'Sports':          ['Sport Worth Watching', 'Highlights, analysis and full coverage.'],
    'YouTube channel': ['YouTube Channels Worth Subscribing To', 'Creators putting out consistently good work, across every subject worth an hour.'],
    'YouTube Shorts':  ['Short-Form Worth a Scroll', 'Quick watches for when you have three minutes, not three hours.']
};

const PLAT_COPY = {
    'YouTube': ['What to Watch on YouTube', 'Channels and creators worth more than an algorithm rabbit hole.'],
    'Netflix': ['What to Watch on Netflix', 'Cutting through a homepage that never quite knows what you want.'],
    'Spotify': ['What to Listen To on Spotify', 'Podcasts and music worth putting on properly.']
};

/* ---------- page template ---------- */
function buildPage({ kind, key, title, lede, items, related }) {
    const s = slug(key);
    const url = `${SITE}/${kind}/${s}/`;
    const suffix = ` Browse ${items.length} hand-picked titles on MatchApp.`;
    let metaLead = String(lede || '').replace(/\s+/g, ' ').trim();
    if (metaLead.length + suffix.length > 155) {
        const maxLead = Math.max(48, 155 - suffix.length - 1);
        metaLead = metaLead.slice(0, maxLead).replace(/\s+\S*$/, '').replace(/[,:;—-]+\s*$/, '').trim();
        if (metaLead && !/[.!?]$/.test(metaLead)) metaLead += '.';
    }
    const metaDesc = `${metaLead}${suffix}`.replace(/\s+/g, ' ').trim();

    const cards = items.map((e, i) => `
                <li class="seo-item">
                    <span class="seo-rank">${i + 1}</span>
                    <div class="seo-item-body">
                        <h3>${esc(e.title)}${e.year ? ` <span class="seo-year">(${e.year})</span>` : ''}</h3>
                        <p class="seo-syn">${esc(e.synopsis || '')}</p>
                        <p class="seo-meta">
                            <span class="seo-chip">${esc(e.platform)}</span>
                            ${(e.cats || []).slice(0, 2).map(c => `<span class="seo-chip seo-chip-quiet">${esc(c)}</span>`).join('')}
                        </p>
                    </div>
                </li>`).join('');

    // ItemList is accurate here: the page IS an ordered list of titles. No
    // ratings, no reviews, no availability claims — none of that data exists
    // and inventing it is exactly what the brief rules out.
    const itemListLd = {
        "@context": "https://schema.org", "@type": "ItemList",
        "name": title, "description": lede, "url": url,
        "numberOfItems": items.length,
        "itemListElement": items.map((e, i) => ({
            "@type": "ListItem", "position": i + 1, "name": e.title
        }))
    };
    const breadcrumbLd = {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "MatchApp", "item": `${SITE}/` },
            { "@type": "ListItem", "position": 2, "name": kind === 'moods' ? 'Moods' : kind === 'platforms' ? 'Platforms' : 'Collections', "item": `${SITE}/${kind}/` },
            { "@type": "ListItem", "position": 3, "name": title, "item": url }
        ]
    };

    const relatedLinks = related.map(r =>
        `<a href="/${r.kind}/${slug(r.key)}/">${esc(r.label)}</a>`).join('\n                ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} | MatchApp</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#101010">
<link rel="icon" href="/logo.jpeg?v=2" type="image/jpeg">
<link rel="manifest" href="/manifest.json">

<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)} | MatchApp">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:image" content="${SITE}/og-image.jpg?v=2">
<meta property="og:site_name" content="MatchApp">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)} | MatchApp">
<meta name="twitter:description" content="${esc(metaDesc)}">
<meta name="twitter:image" content="${SITE}/og-image.jpg?v=2">

<link rel="alternate" hreflang="x-default" href="${url}">
<link rel="alternate" hreflang="en" href="${url}">

<script type="application/ld+json">${JSON.stringify(itemListLd)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>

<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<!-- End Google Tag Manager -->

<link rel="stylesheet" href="/style.css?v=161">
<style>
    .seo-wrap { max-width: 940px; margin: 0 auto; padding: 20px 16px 80px; }
    .seo-crumbs { font-size: 12.5px; color: #8f8877; margin-bottom: 18px; }
    .seo-crumbs a { color: var(--gold-mid); text-decoration: none; }
    .seo-crumbs a:hover { text-decoration: underline; }
    .seo-hero { text-align: center; padding: 18px 0 30px; }
    .seo-hero h1 { font-size: clamp(28px, 5vw, 44px); margin: 0 0 14px; color: var(--gold-core); line-height: 1.15; }
    .seo-lede { color: #C9C2B4; font-size: clamp(15px, 2.2vw, 17.5px); line-height: 1.65; max-width: 640px; margin: 0 auto 26px; }
    .seo-cta { display: inline-flex; align-items: center; gap: 9px; background: linear-gradient(135deg, #E4C06C, #C0843C);
               color: #101010; padding: 15px 28px; border-radius: 14px; font-weight: 800; text-decoration: none;
               font-size: 15.5px; box-shadow: 0 6px 22px rgba(228,192,108,0.3); transition: transform .18s, box-shadow .18s; }
    .seo-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(228,192,108,0.45); }
    .seo-count { color: #8f8877; font-size: 13px; margin: 14px 0 0; }
    .seo-list { list-style: none; padding: 0; margin: 34px 0 0; display: grid; gap: 12px; }
    .seo-item { display: flex; gap: 14px; background: rgba(31,30,28,0.82); border: 1px solid var(--edge);
                border-radius: 14px; padding: 16px 18px; align-items: flex-start; }
    .seo-rank { flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px; background: rgba(228,192,108,0.13);
                color: var(--gold-core); font-weight: 800; font-size: 13.5px; display: flex; align-items: center; justify-content: center; }
    .seo-item-body { min-width: 0; }
    .seo-item h3 { margin: 0 0 6px; font-size: 17px; color: #fff; }
    .seo-year { color: #8f8877; font-weight: 500; font-size: 14px; }
    .seo-syn { margin: 0 0 9px; color: #C9C2B4; font-size: 14.5px; line-height: 1.55; }
    .seo-meta { margin: 0; display: flex; gap: 7px; flex-wrap: wrap; }
    .seo-chip { font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
                background: rgba(216,156,72,0.15); color: var(--gold-mid); }
    .seo-chip-quiet { background: rgba(255,255,255,0.06); color: #9a9384; }
    .seo-section { margin-top: 46px; }
    .seo-section h2 { font-size: 21px; color: var(--gold-core); margin: 0 0 16px; }
    .seo-related { display: flex; flex-wrap: wrap; gap: 10px; }
    .seo-related a { background: rgba(31,30,28,0.82); border: 1px solid var(--edge); color: #C9C2B4;
                     padding: 11px 17px; border-radius: 11px; text-decoration: none; font-size: 14px; font-weight: 600;
                     transition: border-color .18s, color .18s; }
    .seo-related a:hover { border-color: var(--edge-strong); color: #fff; }
    .seo-foot { margin-top: 52px; padding-top: 26px; border-top: 1px solid var(--edge-subtle); text-align: center; }
    .seo-foot a { color: var(--gold-mid); text-decoration: none; margin: 0 11px; font-size: 14px; }
    @media (prefers-reduced-motion: reduce) { .seo-cta { transition: none; } .seo-cta:hover { transform: none; } }
    @media (max-width: 560px) { .seo-item { padding: 14px; gap: 11px; } }
</style>
</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

<main class="seo-wrap">
    <nav class="seo-crumbs" aria-label="Breadcrumb">
        <a href="/">MatchApp</a> › <span>${esc(title)}</span>
    </nav>

    <header class="seo-hero">
        <h1>${esc(title)}</h1>
        <p class="seo-lede">${esc(lede)}</p>
        <a class="seo-cta" href="/discover.html">Ask the AI Concierge →</a>
        <p class="seo-count">${items.length} titles, hand-picked and kept current.</p>
    </header>

    <section aria-label="Recommended titles">
        <ol class="seo-list">${cards}
        </ol>
    </section>

    <section class="seo-section">
        <h2>Not quite it?</h2>
        <p class="seo-lede" style="margin-bottom:18px;">Tell MatchApp what you actually feel like and the AI concierge will work it out — in any of 14 languages, free, no account needed.</p>
        <div style="text-align:center;"><a class="seo-cta" href="/discover.html">Find my match →</a></div>
    </section>

    <section class="seo-section">
        <h2>Keep exploring</h2>
        <nav class="seo-related">
                ${relatedLinks}
        </nav>
    </section>

    <footer class="seo-foot">
        <a href="/">Home</a><a href="/discover.html">Ask AI</a><a href="/together.html">Match Together</a><a href="/pricing/pricing.html">Pricing</a>
    </footer>
</main>
</body>
</html>
`;
}

/* ---------- build ---------- */
function main() {
    const C = loadCatalog();
    const facets = [];

    const collect = (kind, copyMap, extract) => {
        const buckets = {};
        C.forEach(e => extract(e).forEach(k => { (buckets[k] = buckets[k] || []).push(e); }));
        Object.entries(buckets).forEach(([key, items]) => {
            if (items.length < MIN_TITLES) return;      // the quality gate
            if (!copyMap[key]) return;                   // no hand-written copy = no page
            facets.push({ kind, key, items, title: copyMap[key][0], lede: copyMap[key][1] });
        });
    };

    collect('moods',       MOOD_COPY, e => e.moods || []);
    collect('collections', CAT_COPY,  e => e.cats  || []);
    collect('platforms',   PLAT_COPY, e => [e.platform]);

    let written = 0;
    const urls = [];
    facets.forEach(f => {
        // Related links: other facets, nearest in size, so the graph is dense
        // but never self-referential.
        const related = facets
            .filter(o => !(o.kind === f.kind && o.key === f.key))
            .sort((a, b) => Math.abs(a.items.length - f.items.length) - Math.abs(b.items.length - f.items.length))
            .slice(0, 6)
            .map(o => ({ kind: o.kind, key: o.key, label: o.title }));

        // Longest synopses first: the most useful entries lead the page.
        const items = [...f.items].sort((a, b) => (b.synopsis || '').length - (a.synopsis || '').length);

        const dir = path.join(ROOT, f.kind, slug(f.key));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'),
            buildPage({ ...f, items, related }), 'utf8');
        urls.push(`${SITE}/${f.kind}/${slug(f.key)}/`);
        written++;
    });

    console.log(`${written} pages written (threshold: ${MIN_TITLES}+ titles)`);
    fs.writeFileSync(path.join(ROOT, 'tools', 'seo-urls.json'), JSON.stringify(urls, null, 2));
    console.log(`URL list -> tools/seo-urls.json`);
}

main();

// Preserve the shared brand on regenerated guides.
require('./finalize-brand.js').finalizeBrand();
