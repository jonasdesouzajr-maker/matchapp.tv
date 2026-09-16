/* First-party pageview beacon. Writes one row per load to site_hits. */
(function () {
  'use strict';
  const URL = 'https://zkymvqrmbabngsqblyye.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreW12cXJtYmFibmdzcWJseXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDUyNDIsImV4cCI6MjEwMjM4MTI0Mn0._yEVFMfwVU6GBqQ8m3ljfOgA0HSLEDiKMOfYae6ZD8Q';
  function vid() {
    try {
      let id = localStorage.getItem('match_vid');
      if (!id) {
        id = (crypto.randomUUID && crypto.randomUUID()) || ('v' + Date.now() + Math.random().toString(16).slice(2));
        localStorage.setItem('match_vid', id);
      }
      return id;
    } catch (_) { return 'anon'; }
  }
  const path = (location.pathname || '/').slice(0, 180);
  const stamp = path + '|' + new Date().toISOString().slice(0, 16);
  try {
    if (sessionStorage.getItem('match_hit') === stamp) return;
    sessionStorage.setItem('match_hit', stamp);
  } catch (_) {}
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  fetch(URL + '/rest/v1/site_hits', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ day: day, path: path, vid: vid() }),
    keepalive: true
  }).catch(function () {});
})();
