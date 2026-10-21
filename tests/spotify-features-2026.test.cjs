'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const data = require('../data/spotify-features-2026.json');
const {validateSpotifyFeatures, renderSpotifyFeatureSection} = require('../tools/spotify-feature-page.cjs');

test('Spotify editorial feature catalog has unique sourced facts and safe eligibility', () => {
  const features = validateSpotifyFeatures(data);
  assert.equal(features.length, 11);
  assert.equal(new Set(features.map(f => f.id)).size, features.length);
  for (const feature of features) {
    assert.ok(feature.eligibility.length > 30);
    assert.ok(feature.sourceUrl.startsWith('https://newsroom.spotify.com/'));
    assert.ok(feature.keywords.some(phrase => /Spotify|podcast|audio|music|lista|livro/i.test(phrase)));
  }
  const restricted = features.find(f => f.id === 'taste-profile-beta');
  assert.ok(restricted.eligibility.includes('18'));
  assert.deepEqual(restricted.marketCodes, ['US', 'NZ']);
  assert.ok(features.find(f => f.id === 'dj-brazilian-portuguese').marketCodes.includes('BR'));
  assert.ok(features.find(f => f.id === 'songdna-music-connections').sourceUrl.includes('songdna'));
  assert.ok(features.find(f => f.id === 'audiobooks-global-expansion').eligibility.includes('planned'));
});

test('Spotify features render as readable, attributed independent editorial content', () => {
  const markup = renderSpotifyFeatureSection();
  for (const feature of data.features) {
    assert.ok(markup.includes('data-spotify-feature="' + feature.id + '"'));
    assert.ok(markup.includes(feature.sourceUrl));
    assert.ok(markup.includes(feature.eligibility.replace(/&/g, '&amp;').replace(/'/g, '&#39;')));
  }
  assert.match(markup, /not affiliated with or endorsed by Spotify/);
  assert.doesNotMatch(markup, /class="seo-item"|class="seo-editorial"|class="seo-title-link"/);
  assert.match(markup, /class="ma-spotify-feature-card"/);
  assert.doesNotMatch(markup, /listen now for free|Spotify Premium for free/i);
});

test('Generated Spotify SEO page carries the feature facts and metadata', () => {
  const html = fs.readFileSync(path.join(root, 'platforms/spotify/index.html'), 'utf8');
  for (const feature of data.features) assert.ok(html.includes('data-spotify-feature="' + feature.id + '"'), feature.id);
  assert.match(html, /Spotify Music, Podcasts &amp; Audiobooks in 2026 \| MatchApp Ai/);
  assert.match(html, /Spotify Page Match/);
  assert.match(html, /audiolivros Spotify Brasil/);
  assert.match(html, /Spotify DJ português brasileiro/);
  assert.match(html, /Spotify SongDNA/);
  assert.match(html, /<link rel="canonical" href="https:\/\/matchapp.tv\/platforms\/spotify\/"/);
  assert.match(html, /Spotify-owned features, not controls provided by MatchApp Ai/);
});

test('Spotify features stay in their own adult platform page, not Kids mode', () => {
  const html = fs.readFileSync(path.join(root, 'platforms/youtube/index.html'), 'utf8');
  assert.ok(!html.includes('data-spotify-feature='));
  const kids = fs.readFileSync(path.join(root, 'kids/index.html'), 'utf8');
  assert.ok(!kids.includes('data-spotify-feature='));
});
