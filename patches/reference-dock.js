/* Original MatchApp jewel navigation. The shared shell keeps every destination,
 * label, anchor and activation handler; this module owns decoration only. */
(function () {
 'use strict';
 if (window.MatchAppReferenceDock || !document.documentElement.classList.contains('ma-reference') || /^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(location.pathname) || /\/(callback|confirm)\.html$/.test(location.pathname)) return;
 var routes = {home:'home',explore:'explore',matches:'matches',list:'mylist',profile:'profile'};
 var drawings = {
  home:'<path class="ma-dock-facet" d="M6.5 14.3 16 6l9.5 8.3V27h-6.2v-7h-6.6v7H6.5z"/><path d="m3.5 15 12.5-11L28.5 15M6.5 13v14h6.2v-7h6.6v7h6.2V13"/><path class="ma-dock-spark" d="m25.5 3 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/><path class="ma-dock-cut" d="m12.4 12.8 3.6-3 3.6 3"/>',
  explore:'<ellipse class="ma-dock-orbit" cx="16" cy="16" rx="14" ry="7" transform="rotate(-36 16 16)"/><path class="ma-dock-facet" d="m16 6 3.1 6.9L26 16l-6.9 3.1L16 26l-3.1-6.9L6 16l6.9-3.1z"/><path d="m16 6 3.1 6.9L26 16l-6.9 3.1L16 26l-3.1-6.9L6 16l6.9-3.1z"/><circle class="ma-dock-core" cx="16" cy="16" r="2"/><circle class="ma-dock-core" cx="27.2" cy="8.6" r="1.6"/>',
  matches:'<path class="ma-dock-facet" d="m16 2.5 4 9.5 9.5 4-9.5 4-4 9.5-4-9.5-9.5-4 9.5-4z"/><path d="m16 2.5 4 9.5 9.5 4-9.5 4-4 9.5-4-9.5-9.5-4 9.5-4z"/><path class="ma-dock-play" d="m13 11 8.1 5-8.1 5z"/><path class="ma-dock-cut" d="m5.5 5.5 2.2 2.2M24.3 24.3l2.2 2.2"/><circle class="ma-dock-core" cx="26.5" cy="5.5" r="1.2"/>',
  list:'<path class="ma-dock-cut" d="M10 4h16v18M6 8h16v20l-8-4.5L6 28z"/><path class="ma-dock-facet" d="M6 8h16v20l-8-4.5L6 28z"/><path d="M6 8h16v20l-8-4.5L6 28z"/><path d="M10 13h8M10 17h5"/><path class="ma-dock-spark" d="m27 11 .7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  profile:'<path class="ma-dock-orbit" d="M7.2 11.1C6.6 5.2 13 1.3 18.4 3.9M24.8 20.9c.6 5.9-5.8 9.8-11.2 7.2"/><path class="ma-dock-facet" d="M5.5 27c.6-6.1 4-9.1 10.5-9.1s9.9 3 10.5 9.1z"/><path d="M6.2 26.6c.7-5.2 4-8 9.8-8s9.1 2.8 9.8 8"/><path d="M21 10.1c0 3.2-2.1 5.9-5 5.9s-5-2.7-5-5.9a5 5 0 0 1 10 0Z"/><circle class="ma-dock-core" cx="23.7" cy="5.3" r="1.7"/><circle class="ma-dock-core" cx="8.3" cy="27.4" r="1.3"/>'
 };
 var nav = null, mountObserver = null, navObserver = null, resizeObserver = null, frame = 0, textMeasure = null;
 var timers = new Map();
 var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
 function reduced() { return document.documentElement.classList.contains('reduce-motion') || !!(motion && motion.matches); }
 function clearActivation() {
  timers.forEach(function (id, anchor) { clearTimeout(id); anchor.classList.remove('ma-dock-activated'); });
  timers.clear();
 }
 function fitLabels() {
  var anchors = Array.from(nav.querySelectorAll('a[data-ma-dock-destination]'));
  if (anchors.length !== 5 || !nav.clientWidth) return;
  if (!textMeasure) textMeasure = document.createElement('canvas').getContext('2d');
  if (!textMeasure) return;
  var number = function (value) { return parseFloat(value) || 0; };
  var style = getComputedStyle(nav);
  var available = nav.clientWidth - number(style.paddingLeft) - number(style.paddingRight) - 4 * number(style.columnGap);
  var needed = anchors.reduce(function (total, anchor) {
   var label = anchor.querySelector('[data-cinema-copy]');
   if (!label) return total + 48;
   var copy = getComputedStyle(label), control = getComputedStyle(anchor);
   textMeasure.font = copy.font;
   var spacing = number(copy.letterSpacing);
   // Keep each translated word (including joined Arabic/CJK copy) intact.
   // Measure independently of the current row layout, so resizing can safely
   // return from the balanced second row without oscillating on ResizeObserver.
   var longest = Math.max.apply(null, label.textContent.trim().split(/\s+/).map(function (word) {
    return textMeasure.measureText(word).width + Math.max(0, Array.from(word).length - 1) * spacing;
   }));
   return total + Math.max(48, Math.ceil(longest + number(copy.paddingLeft) + number(copy.paddingRight) + number(control.paddingLeft) + number(control.paddingRight)));
  }, 0);
  var wrap = needed > available ? 'true' : 'false';
  if (nav.dataset.maDockWrap !== wrap) nav.dataset.maDockWrap = wrap;
 }
 function measure() {
  frame = 0;
  if (!nav || !nav.isConnected || !document.body) return;
  fitLabels();
  var box = nav.getBoundingClientRect();
  if (!box.height) return;
  // Extra clearance is only added when long selected-language labels or the
  // user's larger text make the fixed bar taller than the original reserve.
  var reserve = Math.ceil(box.height + Math.max(0, innerHeight - box.bottom) + 8);
  document.body.style.setProperty('--ma-reference-dock-clearance', reserve + 'px');
 }
 function scheduleMeasure() { if (!frame) frame = requestAnimationFrame(measure); }
 function symbol(route) {
  var wrapper = document.createElement('span');
  wrapper.className = 'ma-dock-symbol';
  wrapper.setAttribute('aria-hidden','true');
  wrapper.setAttribute('data-ma-pill-exclude','');
  wrapper.innerHTML = '<svg class="ma-dock-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">' + drawings[route] + '</svg><i class="ma-dock-particle ma-dock-particle-a"></i><i class="ma-dock-particle ma-dock-particle-b"></i><i class="ma-dock-particle ma-dock-particle-c"></i>';
  return wrapper;
 }
 function refresh() {
  var found = document.querySelector('nav.ma-cinema-dock');
  if (!found) return;
  nav = found;
  nav.classList.add('ma-reference-dock');
  nav.querySelectorAll('a[data-cinema-route]').forEach(function (anchor) {
   var route = anchor.dataset.cinemaRoute;
   if (!routes[route]) return;
   if (anchor.dataset.maDockDestination !== routes[route]) anchor.dataset.maDockDestination = routes[route];
   if (anchor.querySelector(':scope > .ma-dock-symbol')) return;
   var original = anchor.querySelector(':scope > svg');
   var art = symbol(route);
   if (original) original.replaceWith(art); else anchor.insertBefore(art,anchor.firstChild);
  });
  nav.dataset.maDockPaused = document.hidden ? 'true' : 'false';
  if (mountObserver) { mountObserver.disconnect(); mountObserver = null; }
  if (!navObserver && typeof MutationObserver !== 'undefined') {
   navObserver = new MutationObserver(function () { refresh(); });
   navObserver.observe(nav,{childList:true,subtree:true});
  }
  if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
   // This write changes only end-of-page clearance, never the observed dock
   // size. Commit it in the resize delivery so larger labels cannot cover the
   // last control for an additional animation frame.
   resizeObserver = new ResizeObserver(measure); resizeObserver.observe(nav);
  }
  scheduleMeasure();
 }
 function activate(event) {
  if (!nav || document.hidden || reduced() || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  var anchor = event.target.closest && event.target.closest('a[data-ma-dock-destination]');
  if (!anchor || !nav.contains(anchor) || anchor.getAttribute('aria-disabled') === 'true') return;
  if (timers.has(anchor)) { clearTimeout(timers.get(anchor)); anchor.classList.remove('ma-dock-activated'); void anchor.offsetWidth; }
  anchor.classList.add('ma-dock-activated');
  timers.set(anchor,setTimeout(function () { anchor.classList.remove('ma-dock-activated'); timers.delete(anchor); },560));
  // The sole immersive-feedback owner hears the original native click. No
  // synthetic activation, navigation interception, haptic or audio is added.
 }
 function visibility() {
  if (nav) nav.dataset.maDockPaused = document.hidden ? 'true' : 'false';
  if (document.hidden || reduced()) clearActivation();
 }
 function start() {
  refresh();
  if (!nav && typeof MutationObserver !== 'undefined') {
   mountObserver = new MutationObserver(refresh); mountObserver.observe(document.body,{childList:true,subtree:true});
  }
 }
 window.MatchAppReferenceDock = {
  version:'jewel20261020-1',refresh:refresh,
  inspect:function () {
   return {docks:document.querySelectorAll('nav.ma-cinema-dock').length,reducedMotion:reduced(),decorations:nav ? nav.querySelectorAll('.ma-dock-symbol').length : 0,destinations:nav ? Array.from(nav.querySelectorAll('a[data-ma-dock-destination]')).map(function (anchor) { return {key:anchor.dataset.maDockDestination,href:anchor.getAttribute('href'),label:anchor.querySelector('[data-cinema-copy]')?.textContent,active:anchor.classList.contains('is-active'),current:anchor.getAttribute('aria-current')}; }) : []};
  }
 };
 document.addEventListener('click',activate,{passive:true});
 document.addEventListener('visibilitychange',visibility);
 document.addEventListener('matchapp:settingschanged',scheduleMeasure);
 if (document.fonts) {
  document.fonts.ready.then(scheduleMeasure);
  if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone',scheduleMeasure);
 }
 window.addEventListener('pagehide',clearActivation);
 window.addEventListener('pageshow',function () { visibility(); scheduleMeasure(); });
 window.addEventListener('resize',scheduleMeasure,{passive:true});
 if (motion && motion.addEventListener) motion.addEventListener('change',visibility);
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
