const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace(/\r\n/g, '\n');
const match = app.match(/const CONTENT_CATALOG = (\[[\s\S]*?\n\]);/);
assert.ok(match, 'CONTENT_CATALOG could not be parsed');
const catalog = vm.runInNewContext(match[1]);
const identities = JSON.parse(fs.readFileSync(path.join(root, 'data/poster-identities.json'), 'utf8'));
const availability = JSON.parse(fs.readFileSync(path.join(root, 'data/availability.json'), 'utf8'));

const visualOnlySignal = /\b(movie|film|series|tv|k-drama|anime|telenovela|reality show|limited series)\b/i;

test('catalog entries have publishable title, platform and taxonomy fields', () => {
  assert.ok(catalog.length > 0);
  for (const entry of catalog) {
    assert.equal(typeof entry.title, 'string', 'catalog title must be a string');
    assert.ok(entry.title.trim(), 'catalog title must not be empty');
    assert.equal(typeof entry.platform, 'string', `${entry.title}: platform is required`);
    assert.ok(entry.platform.trim(), `${entry.title}: platform must not be empty`);
    assert.ok(Array.isArray(entry.cats) && entry.cats.length > 0, `${entry.title}: at least one media/category tag is required`);
    if (entry.year != null) {
      const year = Number(entry.year);
      assert.ok(Number.isInteger(year) && year >= 1888 && year <= 2035, `${entry.title}: implausible year ${entry.year}`);
    }
    // Spotify can legitimately carry news podcasts whose editorial category is
    // simply "News". What must never pass is a visual-only media taxonomy on
    // an audio platform — the exact class of mismatch this remediation targets.
    if (/^spotify$/i.test(entry.platform)) {
      const categories = (entry.cats || []).join(' ');
      assert.doesNotMatch(categories, visualOnlySignal, `${entry.title}: visual media type cannot publish on Spotify`);
    }
  }
});

test('verified poster identities have a title match, media kind and valid image URLs', () => {
  for (const item of identities) {
    assert.ok(typeof item.title === 'string' && item.title.trim(), 'poster identity title is required');
    assert.ok(Number.isInteger(Number(item.tmdbId)) && Number(item.tmdbId) > 0, `${item.title}: TMDB id is required`);
    assert.ok(item.kind === 'movie' || item.kind === 'tv', `${item.title}: kind must be movie or tv`);
    for (const key of ['poster', 'posterLarge', 'posterOriginal']) {
      assert.match(String(item[key] || ''), /^https:\/\/image\.tmdb\.org\/t\/p\//, `${item.title}: ${key} must be a TMDB image URL`);
    }
    assert.ok(typeof item.originalTitle === 'string' && item.originalTitle.trim(), `${item.title}: original title is required for identity verification`);
  }
});

test('availability records are region-qualified and provider data is structurally valid', () => {
  assert.ok(availability && availability.titles && typeof availability.titles === 'object');
  for (const [title, item] of Object.entries(availability.titles)) {
    assert.ok(title.trim(), 'availability title is required');
    assert.ok(item.kind === 'movie' || item.kind === 'tv', `${title}: availability kind must be movie or tv`);
    assert.ok(Number.isInteger(Number(item.tmdbId)) && Number(item.tmdbId) > 0, `${title}: availability TMDB id is required`);
    assert.ok(item.regions && typeof item.regions === 'object' && Object.keys(item.regions).length > 0, `${title}: at least one region is required`);
    for (const [region, offer] of Object.entries(item.regions)) {
      assert.match(region, /^[A-Z]{2}$/, `${title}: invalid region ${region}`);
      for (const key of ['stream','rent','buy','free','ads']) {
        if (offer[key] != null) assert.ok(Array.isArray(offer[key]), `${title}/${region}: ${key} providers must be an array when present`);
      }
      assert.match(String(offer.link || ''), /^https:\/\//, `${title}/${region}: availability link is required`);
      assert.ok(String(offer.link).includes(`locale=${region}`), `${title}/${region}: provider link must be region-qualified`);
    }
  }
});