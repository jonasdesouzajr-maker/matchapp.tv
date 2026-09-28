// OMDb's response is display-only; it never changes the selected Match.
export function parseRatings(data, requested = {}) {
  if (!data || data.Response !== 'True') return null;
  const imdbId = String(data.imdbID || '');
  if (!/^tt\d{7,10}$/.test(imdbId)) return null;
  if (requested.imdbId && requested.imdbId !== imdbId) return null;
  if (requested.kind && data.Type !== (requested.kind === 'tv' ? 'series' : 'movie')) return null;
  const clean = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (requested.title && clean(requested.title) !== clean(data.Title)) return null;
  if (requested.year && Number(String(data.Year || '').slice(0, 4)) !== Number(requested.year)) return null;
  const values = Object.fromEntries((Array.isArray(data.Ratings) ? data.Ratings : [])
    .filter(x => x && typeof x.Source === 'string' && typeof x.Value === 'string')
    .map(x => [x.Source, x.Value]));
  const rt = /^(100|[1-9]?\d)%$/.exec(values['Rotten Tomatoes'] || '');
  const mc = /^(100|[1-9]?\d)\/100$/.exec(values.Metacritic || '');
  const imdb = /^(10(?:\.0)?|[0-9](?:\.\d)?)\/10$/.exec(values['Internet Movie Database'] || data.imdbRating + '/10');
  const ratings = {
    rottenTomatoes: rt ? Number(rt[1]) : null,
    metacritic: mc ? Number(mc[1]) : null,
    imdb: imdb ? Number(imdb[1]) : null
  };
  return Object.values(ratings).some(v => v !== null) ? { imdbId, title: String(data.Title), year: Number(String(data.Year).slice(0, 4)) || null, ratings } : null;
}
