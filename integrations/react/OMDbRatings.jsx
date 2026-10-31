// Keep the existing adapter usable by callers while publishing only title links.
function validId(value) {
  return typeof value === 'string' && /^tt\d{7,10}$/.test(value);
}

export function useOMDbRatings(_client, { imdbId } = {}) {
  return { ratings: null, loading: false, error: null, imdbId: validId(imdbId) ? imdbId : null };
}

export function RatingsBadge({ imdbId }) {
  if (!validId(imdbId)) return null;
  return <a className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-violet-100"
    href={'https://www.imdb.com/title/' + imdbId + '/'} target="_blank" rel="noopener noreferrer">IMDb ↗</a>;
}
