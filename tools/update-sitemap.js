#!/usr/bin/env node
/* ============================================================
   Rebuild sitemap.xml from the core pages plus whatever the generators
   actually produced.

   Reads generator-owned URL manifests for catalog sections. The curated news hub
   is indexable; RSS-derived source wrappers stay out of the canonical sitemap until
   they contain substantial original MatchApp editorial content.

   Run: node tools/update-sitemap.js
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://matchapp.tv';

const CORE = [
    { loc: `${SITE}/`,                         freq: 'daily',   pri: '1.0' },
    { loc: `${SITE}/discover.html`,            freq: 'daily',   pri: '0.9' },
    { loc: `${SITE}/kids/`,                    freq: 'weekly',  pri: '0.9', lastmod: '2026-09-17T00:00:00+00:00' },
    { loc: `${SITE}/featured/a-gata-comeu/`,   freq: 'weekly',  pri: '0.8', lastmod: '2026-09-17T00:00:00+00:00' },
    { loc: `${SITE}/featured/american-horror-story-13/`, freq: 'weekly', pri: '0.8', lastmod: '2026-09-17T00:00:00+00:00' },
    { loc: `${SITE}/updates.html`,              freq: 'monthly', pri: '0.7' },
    { loc: `${SITE}/together.html`,             freq: 'weekly',  pri: '0.8' },
    { loc: `${SITE}/pricing/pricing.html`,      freq: 'weekly',  pri: '0.8' },
    { loc: `${SITE}/events-archive.html`,       freq: 'weekly',  pri: '0.6' },
    { loc: `${SITE}/about.html`,                freq: 'monthly', pri: '0.5' },
    { loc: `${SITE}/privacy.html`,              freq: 'monthly', pri: '0.3' },
    { loc: `${SITE}/terms.html`,                freq: 'monthly', pri: '0.3' },
    { loc: `${SITE}/cookies.html`,              freq: 'monthly', pri: '0.3' },
    { loc: `${SITE}/copyright.html`,            freq: 'monthly', pri: '0.3' },
    { loc: `${SITE}/termos.html`,               freq: 'monthly', pri: '0.3' },
    { loc: `${SITE}/privacidade.html`,          freq: 'monthly', pri: '0.3' },
];

function readList(file) {
    const p = path.join(ROOT, 'tools', file);
    if (!fs.existsSync(p)) return [];
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return []; }
}

function readObject(file) {
    const value = readList(file);
    return value && !Array.isArray(value) && typeof value === 'object' ? value : {};
}

function newsUrlsFromDisk() {
    // Only the curated news hub is indexable. Individual RSS-derived wrapper
    // pages are intentionally noindex until they contain substantial original
    // MatchApp editorial content.
    return [`${SITE}/news/`];
}

function validLastmod(value, fallback) {
    if (!value) return fallback;
    const d = new Date(value);
    if (Number.isNaN(d.valueOf())) return fallback;
    return d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function fileForUrl(loc) {
    try {
        const u = new URL(loc);
        let p = decodeURIComponent(u.pathname);
        if (p === '/') return 'index.html';
        p = p.replace(/^\//, '');
        return p.endsWith('/') ? p + 'index.html' : p;
    } catch (_) {
        return null;
    }
}

function gitLastmodForUrl(loc, fallback) {
    const rel = fileForUrl(loc);
    if (!rel) return fallback;
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return fallback;
    try {
        const dirty = execFileSync('git', ['status', '--porcelain', '--', rel], {cwd:ROOT, encoding:'utf8'}).trim();
        if (dirty) return fallback;
        const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', rel], {cwd:ROOT, encoding:'utf8'}).trim();
        return validLastmod(iso, fallback);
    } catch (_) {
        return fallback;
    }
}

function main() {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
    const seo   = readList('seo-urls.json').map(loc => ({ loc, freq: 'weekly', pri: '0.7' }));
    const watch = readList('watch-urls.json').map(loc => ({loc,freq:'weekly',pri:loc.endsWith('/where-to-watch/')?'0.8':'0.6'}));

    const kidsMeta = readObject('kids-sitemap-meta.json');
    const kids  = readList('kids-urls.json').map(loc => ({
        loc,
        freq:'weekly',
        pri:loc.endsWith('/nostalgia/')?'0.7':'0.6',
        lastmod:validLastmod(kidsMeta[loc], '2026-09-17T00:00:00+00:00')
    }));

    const events= readList('event-urls.json').map(loc => ({loc,freq:'weekly',pri:'0.7'}));
    const roku  = readList('roku-urls.json').map(loc => ({loc,freq:'weekly',pri:'0.7'}));

    const newsMeta = readObject('news-sitemap-meta.json');
    const news  = newsUrlsFromDisk().map(loc => ({
        loc,
        freq: loc.endsWith('/news/') ? 'hourly' : 'daily',
        pri: loc.endsWith('/news/') ? '0.8' : '0.6',
        lastmod: newsMeta[loc] ? validLastmod(newsMeta[loc], now) : undefined
    }));

    const all = [...CORE, ...seo, ...watch, ...kids, ...events, ...roku, ...news];
    const seen = new Set();
    const unique = all.filter(u => (seen.has(u.loc) ? false : seen.add(u.loc)));

    const body = unique.map(u => {
        const lastmod = u.lastmod || gitLastmodForUrl(u.loc, now);
        return `    <url>\n        <loc>${u.loc}</loc>\n        <lastmod>${lastmod}</lastmod>\n        <changefreq>${u.freq}</changefreq>\n        <priority>${u.pri}</priority>\n    </url>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');

    // Keep the sitemap index freshness signal aligned with the generated
    // canonical sitemap without touching the independently maintained legal map.
    const sitemapIndexPath = path.join(ROOT, 'sitemaps.xml');
    if (fs.existsSync(sitemapIndexPath)) {
        const indexXml = fs.readFileSync(sitemapIndexPath, 'utf8').replace(
            /(<loc>https:\/\/matchapp\.tv\/sitemap\.xml<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/,
            `$1${now}$2`
        );
        fs.writeFileSync(sitemapIndexPath, indexXml, 'utf8');
    }

    console.log(`sitemap.xml: ${unique.length} URLs (${kids.length} kids, ${news.length} news)`);
}

main();
