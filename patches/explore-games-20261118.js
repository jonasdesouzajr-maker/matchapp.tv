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
  wrap.innerHTML = '<a class="explore-game-card" href="/lumina-match/"><img src="/assets/brand/matchapp-ai-mark.svg?v=20261022-vector1" width="72" height="72" alt="Lumina Match icon"><h3>Lumina Match <span class="badge">Play</span></h3><p>A memory game by Jonas Junior, the engineer and developer of MatchApp Ai. Play it in the browser. Same creator as MatchApp Ai.</p></a><article class="explore-game-card"><img src="/assets/brand/matchapp-ai-mark.svg?v=20261022-vector1" width="72" height="72" alt="Reels Forge icon"><h3>Reels Forge <span class="badge">Coming soon</span></h3><p>Reels Forge is by Jonas Junior, the engineer and developer of MatchApp Ai. It is coming soon to the Play Store and is not available to download yet.</p></article>';
  var hero = main.querySelector('.ref-explore-hero');
  if (hero) hero.insertAdjacentElement('afterend', wrap);
  else main.prepend(wrap);
})();
