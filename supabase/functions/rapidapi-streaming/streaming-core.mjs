// Strictly optional, display-only metadata from Movie of the Night's Streaming Availability API.
// Identity is matched by the EXISTING TMDB identifier, never by a fuzzy title.
const HOSTS = Object.freeze({
  netflix: ['netflix.com'], prime: ['primevideo.com', 'amazon.com', 'amazon.com.br', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es'],
  disney: ['disneyplus.com'], hbo: ['max.com', 'hbomax.com'], max: ['max.com', 'hbomax.com'],
  hulu: ['hulu.com'], apple: ['tv.apple.com'], paramount: ['paramountplus.com'],
  peacock: ['peacocktv.com'], globoplay: ['globoplay.globo.com'],
  sbt: ['mais.sbt.com.br'], 'plus-sbt': ['mais.sbt.com.br'], plussbt: ['mais.sbt.com.br'],
  crunchyroll: ['crunchyroll.com'],
  mubi: ['mubi.com'], tubi: ['tubitv.com'], roku: ['therokuchannel.roku.com', 'roku.com'],
  youtube: ['youtube.com', 'youtu.be'], itvx: ['itv.com'], pluto: ['pluto.tv']
});
export function verifiedServiceUrl(serviceId, value) {
  const id = String(serviceId || '').toLowerCase();
  const hosts = HOSTS[id];
  if (!hosts || typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    const hostname = url.hostname.toLowerCase();
    if (!hosts.some(h => hostname === h || hostname.endsWith('.' + h))) return '';
    return url.toString();
  } catch { return ''; }
}
export function normalizeStreaming(data, requested) {
  const id = Number(requested?.tmdbId);
  const kind = requested?.kind;
  const country = String(requested?.country || '').toLowerCase();
  if (!Number.isSafeInteger(id) || id <= 0 || !['movie', 'tv'].includes(kind) ||
      !/^[a-z]{2}$/.test(country) || !data || typeof data !== 'object' ||
      data.tmdbId !== (kind + '/' + id) ||
      data.showType !== (kind === 'tv' ? 'series' : 'movie')) return null;
  const rows = data.streamingOptions?.[country];
  if (!Array.isArray(rows)) return null; // Missing country isn't evidence of no availability.
  const providers = [], seen = new Set();
  for (const row of rows.slice(0, 70)) {
    const serviceId = String(row?.service?.id || '').toLowerCase();
    const name = String(row?.service?.name || '').trim().slice(0, 70);
    const type = String(row?.type || '').toLowerCase();
    if (!/^[a-z0-9-]{1,40}$/.test(serviceId) || !name ||
        !['free', 'subscription', 'rent', 'buy', 'addon'].includes(type)) continue;
    const key = serviceId + ':' + type;
    if (seen.has(key)) continue;
    seen.add(key);
    const expiresOn = Number(row?.expiresOn);
    providers.push({
      name, type,
      link: verifiedServiceUrl(serviceId, row?.link),
      expiresSoon: row?.expiresSoon === true,
      expiresOn: Number.isSafeInteger(expiresOn) && expiresOn > 1_700_000_000 && expiresOn < 4_000_000_000 ? expiresOn : null
    });
    if (providers.length === 12) break;
  }
  return { source: 'Streaming Availability', country: country.toUpperCase(),
    verifiedTmdbId: id, kind, providers };
}
