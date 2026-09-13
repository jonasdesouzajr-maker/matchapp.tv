#!/usr/bin/env node
/* ============================================================
   Rebuild sitemap.xml from the core pages plus whatever the generators
   actually produced.

   Reads tools/seo-urls.json and tools/watch-urls.json rather than walking the
   filesystem, so a page only appears in the sitemap if a generator claimed it
   — a stale directory left behind by a removed facet cannot leak back in.

   Run: node tools/update-sitemap.js
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://matchapp.tv';

// The hand-maintained core. Priority reflects real importance, not wishful
// thinking: the homepage and the AI concierge are the product, legal pages
// exist because they must.
const CORE = [
    { loc: `${SITE}/`,                         freq: 'daily',   pri: '1.0' },
    { loc: `${SITE}/discover.html`,            freq: 'daily',   pri: '0.9' },
    { loc: `${SITE}/kids/`,                    freq: 'weekly',  pri: '0.9' },
    { loc: `${SITE}/together.html`,            freq: 'weekly',  pri: '0.8' },
    { loc: `${SITE}/pricing/pricing.html`,     freq: 'weekly',  pri: '0.8' },
    { loc: `${SITE}/events-archive.html`,      freq: 'weekly',  pri: '0.6' },
    { loc: `${SITE}/privacy.html`,             freq: 'monthly', pri: '0.3' },
    { loc: `${SITE}/terms.html`,               freq: 'monthly', pri: '0.3' },
];

function readList(file) {
    const p = path.join(ROOT, 'tools', file);
    if (!fs.existsSync(p)) return [];
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return []; }
}

function main() {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

    const seo   = readList('seo-urls.json').map(loc   => ({ loc, freq: 'weekly', pri: '0.7' }));
    const watch = readList('watch-urls.json').map(loc => ({
        loc,
        freq: 'weekly',
        // The /where-to-watch/ index is a hub; individual titles sit below it.
        pri: loc.endsWith('/where-to-watch/') ? '0.8' : '0.6'
    }));

    const all = [...CORE, ...seo, ...watch];

    // Guard against a generator ever emitting a duplicate.
    const seen = new Set();
    const unique = all.filter(u => (seen.has(u.loc) ? false : seen.add(u.loc)));

    const body = unique.map(u =>
        `    <url>\n        <loc>${u.loc}</loc>\n        <lastmod>${now}</lastmod>\n` +
        `        <changefreq>${u.freq}</changefreq>\n        <priority>${u.pri}</priority>\n    </url>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
    console.log(`sitemap.xml: ${unique.length} URLs (${CORE.length} core, ${seo.length} collections, ${watch.length} availability)`);
}

main();
