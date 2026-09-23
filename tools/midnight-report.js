#!/usr/bin/env node
'use strict';

/**
 * Builds reports/midnight-latest.md for the permanent GitHub issue #1
 * rotation channel. Reads only repository data files. Does not touch
 * page runtime, observers, timers or CSS.
 */

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'reports', 'midnight-latest.md');

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch (_) { return ''; }
}

function json(rel, fallback) {
  try { return JSON.parse(read(rel)); }
  catch (_) { return fallback; }
}

function gitShow(sha, rel) {
  if (!sha) return '';
  try {
    return execFileSync('git', ['show', `${sha}:${rel}`], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch (_) { return ''; }
}

function gitShowJson(sha, rel, fallback) {
  const raw = gitShow(sha, rel);
  if (!raw) return fallback;
  try { return JSON.parse(raw); }
  catch (_) { return fallback; }
}

function uniq(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = String(item || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function extractMarqueeTitles(html) {
  const titles = [];
  const re = /data-title="([^"]+)"/g;
  let m;
  const start = html.indexOf('id="trending-rail"');
  const slice = start >= 0 ? html.slice(start, start + 20000) : html;
  while ((m = re.exec(slice))) titles.push(decode(m[1]));
  const ld = html.match(/"name":"Trending on MatchApp This Week"[\s\S]*?"itemListElement":\[([\s\S]*?)\]/);
  if (ld) {
    const names = [...ld[1].matchAll(/"name":"([^"]+)"/g)].map(x => decode(x[1]));
    for (const name of names) titles.push(name);
  }
  return uniq(titles);
}

function decode(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractPickTitle(src) {
  const m = src.match(/const PICK=\{[\s\S]*?title:'((?:\\'|[^'])*)'/);
  return m ? m[1].replace(/\\'/g, "'") : '';
}

function extractKeywords(html) {
  const m = html.match(/<meta name="keywords" content="([^"]+)"/i);
  if (!m) return [];
  return uniq(m[1].split(',').map(s => s.trim()).filter(Boolean));
}

function newsTitles(data) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return uniq(items.map(item => decode(item.title)).filter(Boolean));
}

function eventTitles(events, day) {
  const list = [];
  if (day && day.title) {
    list.push(`${day.emoji || ''} ${day.title} (${day.date || 'undated'})`.trim());
  }
  const rows = Array.isArray(events) ? events : [];
  for (const ev of rows) {
    if (ev && ev.title) list.push(ev.title);
  }
  return uniq(list);
}

function classify(now, before) {
  const beforeSet = new Set(before);
  const added = now.filter(x => !beforeSet.has(x));
  const retained = now.filter(x => beforeSet.has(x));
  return {added, retained, now};
}

function bullets(items, empty) {
  if (!items.length) return `- ${empty}`;
  return items.map(item => `- ${item}`).join('\n');
}

function sitemapStats(xml) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const last = xml.match(/<lastmod>([^<]+)<\/lastmod>/);
  return {
    count: urls.length,
    lastmod: last ? last[1] : 'unknown'
  };
}

function main() {
  const beforeSha = (process.env.BEFORE_SHA || read('/tmp/before.sha')).trim();
  const changed = process.env.CHANGED === '1';
  const deployed = process.env.DEPLOYED === '1';
  const indexed = process.env.INDEXNOW === '1';
  const runUrl = process.env.RUN_URL || '';
  const generated = new Date().toISOString();

  const htmlNow = read('index.html');
  const htmlBefore = gitShow(beforeSha, 'index.html') || htmlNow;
  const newsNow = json('news/data.json', {items: []});
  const newsBefore = gitShowJson(beforeSha, 'news/data.json', newsNow);
  const eventsNow = json('tools/global-events.json', []);
  const eventsBefore = gitShowJson(beforeSha, 'tools/global-events.json', eventsNow);
  const dayNow = json('data/international-day.json', {});
  const dayBefore = gitShowJson(beforeSha, 'data/international-day.json', dayNow);
  const pickNow = extractPickTitle(read('weekly-pick.js'));
  const pickBefore = extractPickTitle(gitShow(beforeSha, 'weekly-pick.js') || read('weekly-pick.js'));
  const keywordsNow = uniq([
    ...extractKeywords(htmlNow),
    ...(Array.isArray(dayNow.keywords) ? dayNow.keywords : [])
  ]).slice(0, 24);
  const sitemap = sitemapStats(read('sitemap.xml'));

  const titles = classify(extractMarqueeTitles(htmlNow), extractMarqueeTitles(htmlBefore));
  const news = classify(newsTitles(newsNow).slice(0, 12), newsTitles(newsBefore));
  const events = classify(eventTitles(eventsNow, dayNow), eventTitles(eventsBefore, dayBefore));

  const lines = [
    '# Midnight content rotation report',
    '',
    `Generated: ${generated}`,
    beforeSha ? `Baseline SHA: \`${beforeSha.slice(0, 12)}\`` : 'Baseline SHA: unavailable (first comparison uses current files).',
    runUrl ? `Workflow run: ${runUrl}` : '',
    '',
    '## Top Titles',
    '### Added',
    bullets(titles.added, 'No new Top Titles this run.'),
    '### Retained',
    bullets(titles.retained.slice(0, 16), 'No retained Top Titles listed.'),
    '',
    '## NEWS',
    `Feed generated at: ${newsNow.generated_at || 'unknown'}`,
    '### Added',
    bullets(news.added, 'No new NEWS items this run.'),
    '### Retained (current head of feed)',
    bullets(news.retained.slice(0, 10), 'No retained NEWS items listed.'),
    '',
    '## Events',
    '### Added',
    bullets(events.added, 'No new Events items this run.'),
    '### Retained',
    bullets(events.retained, 'No retained Events items listed.'),
    '',
    '## Weekly AI choice',
    pickNow
      ? `- Current: **${pickNow}**${pickBefore && pickBefore !== pickNow ? ` (was ${pickBefore})` : ' (retained)'}`
      : '- Weekly pick title could not be read from weekly-pick.js.',
    '',
    '## Primary SEO keywords',
    bullets(keywordsNow, 'No keywords extracted.'),
    '',
    '## Sitemap / indexing',
    `- sitemap.xml URL count: ${sitemap.count}`,
    `- sitemap lastmod sample: ${sitemap.lastmod}`,
    `- IndexNow submitted this run: ${indexed ? 'yes' : 'no'}`,
    '',
    '## Deployment',
    `- Content commit this run: ${changed ? 'yes' : 'no (already current)'}`,
    `- pages-deploy triggered: ${deployed ? 'yes' : 'no'}`,
    '',
    '## Errors',
    process.env.ROTATION_ERROR
      ? `- ${process.env.ROTATION_ERROR}`
      : '- None recorded by the report builder. Failing workflow steps are reported separately.',
    '',
    '_Posted automatically to issue #1. No page runtime files were modified by this report._'
  ].filter(line => line !== undefined);

  fs.mkdirSync(path.dirname(OUT), {recursive: true});
  fs.writeFileSync(OUT, lines.join('\n') + '\n');
  process.stdout.write(OUT + '\n');
}

main();
