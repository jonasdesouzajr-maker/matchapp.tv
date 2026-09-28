// Optional React/Tailwind adapter for consumers outside MatchApp's vanilla-JS shell.
// The browser calls the Supabase function; OMDB_API_KEY stays server-side.
import { useEffect, useState } from 'react';

export function useOMDbRatings(client, { title = '', imdbId = '', kind = '', year = 0 } = {}) {
  const [state, setState] = useState({ ratings: null, loading: false, error: null });
  useEffect(() => {
    let cancelled = false;
    if (!client?.functions || (!title && !imdbId)) { setState({ ratings:null, loading:false, error:null }); return; }
    setState({ ratings:null, loading:true, error:null });
    client.functions.invoke('omdb-ratings', { body:{title, imdbId, kind, year} })
      .then(({data,error}) => { if (!cancelled) setState({ratings:error ? null : data?.ratings || null, loading:false, error:error ? 'unavailable' : null}); })
      .catch(() => { if (!cancelled) setState({ratings:null, loading:false, error:'unavailable'}); });
    return () => { cancelled = true; };
  }, [client, title, imdbId, kind, year]);
  return state;
}

export function RatingsBadge({ ratings }) {
  if (!ratings) return null;
  const scores = [
    ['Rotten Tomatoes', ratings.rottenTomatoes, '%'],
    ['Metacritic', ratings.metacritic, '/100'],
    ['IMDb', ratings.imdb, '/10']
  ].filter(([,value]) => typeof value === 'number' && Number.isFinite(value));
  if (!scores.length) return null;
  return <div className="flex max-w-full flex-wrap items-center gap-2 text-sm" aria-label="Critical ratings from OMDb">
    {scores.map(([label, value, unit]) => <span key={label} className="inline-flex items-baseline gap-2 rounded-xl border border-amber-300/30 bg-[#1c142e] px-3 py-2 text-violet-100 shadow-lg">
      <span className="text-xs font-semibold">{label}</span><strong className="tabular-nums text-white">{value}{unit}</strong>
    </span>)}
  </div>;
}
