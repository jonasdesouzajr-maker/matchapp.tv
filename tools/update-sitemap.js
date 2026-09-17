#!/usr/bin/env node
/* ============================================================
   Rebuild sitemap.xml from the core pages plus whatever the generators
   actually produced.

   Reads generator-owned URL manifests rather than walking the filesystem, so
   stale directories cannot leak back into the sitemap.

   Run: node tools/update-sitemap.js
   ============================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://matchapp.tv';

const CORE = [
    { loc: `${SITE}/`,                         freq: 'daily',   pri: '1.0' },
    { loc: `${SITE}/discover.html`,            freq: 'daily',   pri: '0.9' },
    { loc: `${SITE}/kids/`,                    freq: 'weekly',  pri: '0.9' },
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

function validLastmod(value, fallback) {
    if (!value) return fallback;
    const d = new Date(value);
    if (Number.isNaN(d.valueOf())) return fallback;
    return d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function main() {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
    const seo   = readList('seo-urls.json').map(loc => ({ loc, freq: 'weekly', pri: '0.7' }));
    const watch = readList('watch-urls.json').map(loc => ({loc,freq:'weekly',pri:loc.endsWith('/where-to-watch/')?'0.8':'0.6'}));
    const kids  = readList('kids-urls.json').map(loc => ({loc,freq:'weekly',pri:'0.6'}));
    const events= readList('event-urls.json').map(loc => ({loc,freq:'weekly',pri:'0.7'}));
    const roku  = readList('roku-urls.json').map(loc => ({loc,freq:'weekly',pri:'0.7'}));

    const newsMeta = readObject('news-sitemap-meta.json');
    const news  = readList('news-urls.json').map(loc => ({
        loc,
        freq: loc.endsWith('/news/') ? 'hourly' : 'daily',
        pri: loc.endsWith('/news/') ? '0.8' : '0.6',
        lastmod: validLastmod(newsMeta[loc], now)
    }));

    const all = [...CORE, ...seo, ...watch, ...kids, ...events, ...roku, ...news];
    const seen = new Set();
    const unique = all.filter(u => (seen.has(u.loc) ? false : seen.add(u.loc)));

    const body = unique.map(u => `    <url>\n        <loc>${u.loc}</loc>\n        <lastmod>${u.lastmod || now}</lastmod>\n        <changefreq>${u.freq}</changefreq>\n        <priority>${u.pri}</priority>\n    </url>`).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
    console.log(`sitemap.xml: ${unique.length} URLs (${news.length} news)`);
}

main();
