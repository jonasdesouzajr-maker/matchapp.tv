/* Add Lumina and Reels Forge cards under Explore. Skip if already present. */
(function () {
  'use strict';
  if (!/\/explore(\.html)?\/?$/.test(location.pathname)) return;
  if (document.getElementById('ma-explore-games')) return;
  var main = document.getElementById('explore-main');
  if (!main) return;
  var wrap = document.createElement('div');
  wrap.id = 'ma-explore-games';
  wrap.className = 'explore-games';
  wrap.innerHTML = '<a class="explore-game-card" href="/lumina-match/"><img src="/assets/brand/matchapp-ai-mark.svg" alt="Lumina Match"><h3>Lumina Match <span class="badge">Play</span></h3><p>Memory card game. Play free in the browser or get the full app on Google Play.</p></a><a class="explore-game-card" href="https://play.google.com/store/apps/details?id=com.jonas.papercup" target="_blank" rel="noopener"><img src="/assets/brand/matchapp-ai-mark.svg" alt="Reels Forge"><h3>Reels Forge <span class="badge">Coming soon</span></h3><p>Create and share reels. Coming soon to the Play Store. Get notified with the MatchApp Ai app.</p></a>';
  var hero = main.querySelector('.ref-explore-hero');
  if (hero) hero.insertAdjacentElement('afterend', wrap);
  else main.prepend(wrap);
})();
