'use strict';

// Authored starting points for existing screen-focused facets. This is a
// presentation split, never a matching filter or a second catalog owner.
const copy = require('./film-tv-shortlists.json');
const nonScreenFormats = new Set([
  'youtube channel', 'youtube shorts', 'podcast', 'spotify playlist',
  'apple music playlist', 'spotify single', 'music album', 'music artist',
  'audiobook'
]);
const screenFormats = new Set([
  'movie', 'series', 'limited series', 'k-drama', 'anime', 'vertical micro-drama',
  'novela brasileira', 'telenovela', 'documentary', 'stand-up comedy special',
  'reality show', 'european cinema', 'bollywood', 'j-drama', 'short film',
  'c-drama', 'turkish dizi', 'nollywood'
]);

function isScreenTitle(entry) {
  const categories = (entry.cats || []).map(value => String(value).trim().toLowerCase());
  // Channels also carry documentary/stand-up topic tags. Their explicit
  // format wins; a topic must not turn a creator or album into a film.
  return !categories.some(value => nonScreenFormats.has(value)) &&
    categories.some(value => screenFormats.has(value));
}

function planShortlist(page, items) {
  const selection = copy.pages[page];
  if (!selection) return null;
  if (selection.length < 3 || selection.length > 4) throw Error('Invalid shortlist size: ' + page);
  const used = new Set();
  const shortlist = selection.map(pick => {
    const matches = items.filter(item => item.title === pick.title);
    if (matches.length !== 1 || !isScreenTitle(matches[0])) {
      throw Error('Shortlist needs one screen title in its existing facet: ' + page + ' / ' + pick.title);
    }
    if (used.has(pick.title) || typeof copy.reasons[pick.reason] !== 'string' || !copy.reasons[pick.reason].trim()) {
      throw Error('Repeated title or missing selection reason: ' + page + ' / ' + pick.title);
    }
    used.add(pick.title);
    return { item: matches[0], reason: pick.reason };
  });
  const rest = items.filter(item => !used.has(item.title));
  const screen = rest.filter(isScreenTitle);
  const other = rest.filter(item => !isScreenTitle(item));
  return { shortlist, screen, other, ordered: [...shortlist.map(pick => pick.item), ...screen, ...other] };
}

function trustedPoster(entry) {
  const value = String(entry.poster || '');
  if (/^\/assets\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/.test(value) && !value.includes('..')) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    if (url.hostname === 'image.tmdb.org' && /^\/t\/p\/(?:w\d+|original)\/[a-zA-Z0-9_.-]+$/.test(url.pathname)) return value;
    if (url.hostname === 'http2.mlstatic.com' && /^\/D_[a-zA-Z0-9_.-]+\.(?:webp|jpe?g|png)$/.test(url.pathname)) return value;
  } catch (_) {}
  return '';
}

module.exports = { copy, isScreenTitle, planShortlist, trustedPoster };
