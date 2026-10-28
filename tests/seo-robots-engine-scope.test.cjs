'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');

// Evaluate groups, rather than looking for Disallow text anywhere in the file.
// RFC 9309 sections 2.2.1–2.2.2: consecutive User-agent lines share rules;
// a matching named group takes precedence over the wildcard fallback.
// https://www.rfc-editor.org/rfc/rfc9309.html
function groups(source) {
  const result = [];
  let current;
  for (const line of source.split(/\r?\n/)) {
    const match = line.split('#')[0].trim().match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const name = match[1].trim().toLowerCase(), value = match[2].trim();
    if (name === 'user-agent') {
      if (!current || current.rules.length) {
        current = {agents: [], rules: []};
        result.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && (name === 'allow' || name === 'disallow')) {
      current.rules.push({allow: name === 'allow', pattern: value});
    }
  }
  return result;
}

function allowed(source, crawler, location) {
  const product = crawler.toLowerCase();
  const candidates = groups(source).map(group => ({
    group,
    specificity: Math.max(-1, ...group.agents.map(agent =>
      agent === '*' ? 0 : product.startsWith(agent) ? agent.length : -1))
  }));
  const specificity = Math.max(-1, ...candidates.map(item => item.specificity));
  if (specificity < 0) return true;
  const url = new URL(location, 'https://matchapp.tv');
  const target = url.pathname + url.search;
  let winner;
  for (const {group} of candidates.filter(item => item.specificity === specificity)) {
    for (const rule of group.rules) {
      if (!rule.pattern) continue;
      const end = rule.pattern.endsWith('$');
      const pattern = end ? rule.pattern.slice(0, -1) : rule.pattern;
      const expression = pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
      if (!new RegExp('^' + expression + (end ? '$' : '')).test(target)) continue;
      const length = Buffer.byteLength(pattern.replaceAll('*', ''));
      if (!winner || length > winner.length || (length === winner.length && rule.allow)) {
        winner = {...rule, length};
      }
    }
  }
  return winner ? winner.allow : true;
}

const crawlers = [
  'Googlebot', 'Googlebot-News', 'Bingbot', 'YandexBot',
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot',
  'ClaudeBot', 'Claude-Web', 'Google-Extended', 'Applebot',
  'Applebot-Extended', 'UnlistedSearchCrawler'
];
const excluded = [
  '/oauth/', '/callback.html', '/purchase.html', '/reset.html',
  '/ai-check.html', '/billing-check.html', '/$/', '/%24',
  '/404.html', '/android-studio/', '/private-voice/'
];

test('the robots evaluator detects the former named-crawler wildcard-inheritance gap', () => {
  const separate = 'User-agent: *\nAllow: /\nDisallow: /oauth/\n\nUser-agent: Bingbot\nAllow: /\n';
  assert.equal(allowed(separate, 'Googlebot', '/oauth/consent.html'), false);
  assert.equal(allowed(separate, 'Bingbot', '/oauth/consent.html'), true);
  const shared = 'User-agent: *\nUser-agent: Bingbot\nUser-agent: YandexBot\nAllow: /\nDisallow: /oauth/\n';
  for (const crawler of ['Googlebot', 'bingBOT', 'YandexBot']) {
    assert.equal(allowed(shared, crawler, '/oauth/consent.html'), false);
    assert.equal(allowed(shared, crawler, '/guides/'), true);
  }
});

test('Google, Bing, Yandex and named AI crawlers all exclude the existing nonpublic routes', () => {
  for (const crawler of crawlers) {
    for (const route of excluded) {
      assert.equal(allowed(robots, crawler, route), false, crawler + ' must exclude ' + route);
      assert.equal(allowed(robots, crawler, route + '?lang=pt'), false, crawler + ' must exclude route queries');
    }
    for (const route of ['/oauth/consent.html', '/android-studio/app/build.gradle', '/private-voice/sample.wav']) {
      assert.equal(allowed(robots, crawler, route), false, crawler + ' must exclude nested ' + route);
    }
  }
});

test('every sitemap page, public resource and intentionally crawlable noindex page stays allowed', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const publicUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replaceAll('&amp;', '&'));
  assert.ok(publicUrls.length > 0);
  publicUrls.push('/robots.txt', '/sitemaps.xml', '/sitemap.xml', '/ads.txt', '/llms.txt',
    '/register.html', '/profile/', '/profile/profile.html', '/news/articles/',
    '/lumina-match/browser/', '/lumina-match/browser/campaign.js',
    '/lumina-match/browser/style.css', '/assets/brand/matchapp-ai-favicon.svg');
  for (const crawler of crawlers) {
    for (const url of publicUrls) assert.equal(allowed(robots, crawler, url), true, crawler + ' must allow ' + url);
  }
});

test('crawler scope preserves exactly the existing exclusions and canonical sitemap declaration', () => {
  const disallowed = [...new Set(groups(robots).flatMap(group => group.rules.filter(rule => !rule.allow).map(rule => rule.pattern)))];
  assert.deepEqual(disallowed.sort(), excluded.slice().sort());
  assert.deepEqual([...robots.matchAll(/^Sitemap:\s*(\S+)/gmi)].map(match => match[1]), ['https://matchapp.tv/sitemaps.xml']);
});
