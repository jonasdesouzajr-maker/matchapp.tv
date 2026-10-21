'use strict';

const catalogue = require('../data/spotify-features-2026.json');
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

function validateSpotifyFeatures(data = catalogue) {
  if (data.platform !== 'Spotify' || !/^\d{4}-\d{2}-\d{2}$/.test(data.reviewedAt)) throw new Error('Invalid Spotify editorial metadata');
  if (!Array.isArray(data.features) || data.features.length < 5) throw new Error('Spotify feature coverage incomplete');
  const ids = new Set();
  for (const feature of data.features) {
    if (!feature.id || ids.has(feature.id) || !/^[a-z0-9-]+$/.test(feature.id)) throw new Error('Duplicate or invalid Spotify feature ID');
    ids.add(feature.id);
    if (!/^2026-\d\d-\d\d$/.test(feature.announcedOn) || feature.announcedOn > data.reviewedAt) throw new Error('Unverified Spotify feature date');
    if (!['music', 'podcasts', 'audiobooks', 'discovery'].includes(feature.category)) throw new Error('Invalid Spotify feature category');
    if (!['rolling_out', 'limited_beta', 'available_in_eligible_markets'].includes(feature.status)) throw new Error('Invalid Spotify availability');
    if (!Array.isArray(feature.marketCodes) || feature.marketCodes.some(code => !/^[A-Z]{2}$/.test(code))) throw new Error('Invalid market metadata');
    if (!Array.isArray(feature.keywords) || feature.keywords.length < 3) throw new Error('Missing editorial search phrases');
    if (![feature.title, feature.description, feature.eligibility, feature.matchappRelevance].every(value => typeof value === 'string' && value.length >= 12)) throw new Error('Incomplete Spotify feature text');
    const url = new URL(feature.sourceUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'newsroom.spotify.com') throw new Error('Spotify feature lacks official source');
  }
  return data.features;
}


const spotifyFeatureStyles = `
  .ma-spotify-2026 { min-width: 0; }
  .ma-spotify-2026 > p { color: #C9C2B4; line-height: 1.7; }
  .ma-spotify-features-list { list-style: none; margin: 22px 0 0; padding: 0; display: grid; gap: 14px; }
  .ma-spotify-feature-card { display: grid; grid-template-columns: 30px minmax(0,1fr); gap: 13px; padding: 18px; background: rgba(31,30,28,.82); border: 1px solid var(--edge); border-radius: 16px; min-width: 0; }
  .ma-spotify-feature-index { display: grid; place-items: center; align-self: start; width: 30px; height: 30px; border-radius: 9px; color: var(--gold-core); background: rgba(228,192,108,.13); font-size: 14px; font-weight: 800; }
  .ma-spotify-feature-card h3 { margin: 0 0 10px; font-size: clamp(17px,2.5vw,20px); color: #fff; line-height: 1.35; overflow-wrap: anywhere; }
  .ma-spotify-feature-description { margin: 0 0 11px; color: #C9C2B4; font-size: 14.5px; line-height: 1.6; overflow-wrap: anywhere; }
  .ma-spotify-feature-description strong { color: #E4D4B8; }
  .ma-spotify-feature-source { display: inline-flex; align-items: center; box-sizing: border-box; min-height: 44px; margin-top: 10px; padding: 9px 14px; border: 1px solid var(--edge); border-radius: 999px; color: var(--gold-core); font-size: 14px; font-weight: 700; text-decoration: none; overflow-wrap: anywhere; }
  .ma-spotify-feature-source:hover { border-color: var(--gold-core); }
  .ma-spotify-feature-source:focus-visible { outline: 2px solid var(--gold-core); outline-offset: 3px; }
  @media(max-width:560px) { .ma-spotify-feature-card { padding: 14px; gap: 10px; } }
`;

function renderSpotifyFeatureSection() {
  const features = validateSpotifyFeatures();
  return `<section class="seo-section ma-spotify-2026" aria-labelledby="ma-spotify-2026-heading">
    <h2 id="ma-spotify-2026-heading">Spotify features for music, podcasts and audiobooks in 2026</h2>
    <p>Spotify has introduced new ways to describe a listening mood, explore topics and move between books and audio. These are Spotify-owned features, not controls provided by MatchApp Ai. Some are only available in selected countries, plans or adult accounts.</p>
    <p>Here is what has been publicly announced, with eligibility notes and primary sources. If a feature is missing from your Spotify app, check its current rollout rather than assuming every listener has access.</p>
    <ol class="ma-spotify-features-list">
    ${features.map((feature, i) => `<li class="ma-spotify-feature-card" data-spotify-feature="${escapeHtml(feature.id)}">
      <span class="ma-spotify-feature-index">${i + 1}</span>
      <div class="seo-item-body">
        <h3>${escapeHtml(feature.title)}</h3>
        <p class="ma-spotify-feature-description">${escapeHtml(feature.description)}</p>
        <p class="ma-spotify-feature-description"><strong>Availability:</strong> ${escapeHtml(feature.eligibility)}</p>
        <p class="ma-spotify-feature-description"><strong>For MatchApp Ai:</strong> ${escapeHtml(feature.matchappRelevance)}</p>
        <p class="seo-meta"><span class="seo-chip">${escapeHtml(feature.category)}</span><span class="seo-chip seo-chip-quiet">Announced <time datetime="${escapeHtml(feature.announcedOn)}">${escapeHtml(feature.announcedOn)}</time></span></p>
        <a class="ma-spotify-feature-source" href="${escapeHtml(feature.sourceUrl)}" target="_blank" rel="noopener noreferrer">Read Spotify's official announcement</a>
      </div>
    </li>`).join('')}
    </ol>
    <p class="seo-count">Editorial review: <time datetime="${escapeHtml(catalogue.reviewedAt)}">${escapeHtml(catalogue.reviewedAt)}</time>. Independent informational guide; not affiliated with or endorsed by Spotify. Content, playback, features and availability remain within Spotify.</p>
  </section>`;
}

module.exports = {validateSpotifyFeatures, renderSpotifyFeatureSection, spotifyFeatureStyles};
