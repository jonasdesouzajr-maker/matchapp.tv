/* Fit all visible cards without scrolling or changing card identities/game rules.
   Uses actual board dimensions after layout, including landscape and zoom. */
(function () {
  'use strict';
  var app = document.getElementById('app');
  var resizeObserver = null, currentArea = null, scheduled = false;
  function fit() {
    scheduled = false;
    if (app.dataset.screen !== 'game') return;
    var area = app.querySelector('.board-area'), grid = area?.querySelector('.grid');
    if (!grid) return;
    var count = grid.querySelectorAll(':scope > .card').length;
    var width = area.clientWidth, height = area.clientHeight;
    // JSDOM and hidden iframe layouts have zero geometry; leave CSS fallback.
    if (!count || width < 75 || height < 75) return;
    var best = null, maxCols = Math.min(count,16);
    for (var columns = 2; columns <= maxCols; columns++) {
      var rows = Math.ceil(count / columns);
      var gap = count >= 32 ? 3 : count >= 20 ? 4 : 6;
      var w = (width - (columns - 1) * gap - 4) / columns;
      var h = (height - (rows - 1) * gap - 4) * 0.75 / rows;
      var size = Math.min(w,h,110);
      if (size < 9) continue;
      // Prefer larger cards. Equal sizes favor fewer columns and tidier rows.
      var candidate = {columns:columns,rows:rows,gap:gap,size:size};
      if (!best || size > best.size + 0.25 || (Math.abs(size - best.size) <= 0.25 && rows < best.rows)) best = candidate;
    }
    if (!best) return;
    grid.style.setProperty('--fit-columns',String(best.columns));
    grid.style.setProperty('--fit-gap',best.gap + 'px');
    grid.style.setProperty('--fit-card-width',Math.floor(best.size * 10) / 10 + 'px');
    grid.dataset.fitRows = String(best.rows);
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || function(fn) { return setTimeout(fn,0); })(fit);
  }
  function watchBoard() {
    var area = app.dataset.screen === 'game' ? app.querySelector('.board-area') : null;
    if (area !== currentArea) {
      if (resizeObserver) resizeObserver.disconnect();
      currentArea = area;
      if (area && typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(schedule);
        resizeObserver.observe(area);
      }
    }
    schedule();
  }
  new MutationObserver(watchBoard).observe(app,{childList:true,subtree:false,attributes:true,attributeFilter:['data-screen']});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  window.addEventListener('pagehide',function() {if(resizeObserver)resizeObserver.disconnect();});
  watchBoard();
})();