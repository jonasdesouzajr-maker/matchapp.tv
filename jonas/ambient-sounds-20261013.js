/* Unique procedural sounds for key actions — adult pages only.
   Uses Web Audio API so no external files are needed. */
(function(){
 'use strict';
 if (window.__maSounds) return;
 window.__maSounds = true;
 var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var ctx = null;
 function audio(){
  if (!ctx) {
   try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_){ return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
 }
 function tone(freq, dur, type, gain){
  var c = audio(); if (!c || reduced) return;
  var o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  g.gain.value = gain || .04;
  o.connect(g); g.connect(c.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(.001, c.currentTime + dur);
  o.stop(c.currentTime + dur);
 }
 var sounds = {
  tap: function(){ tone(620, .08, 'sine', .035); },
  gold: function(){ tone(880, .12, 'triangle', .04); setTimeout(function(){ tone(1100, .1, 'sine', .03); }, 60); },
  explore: function(){ tone(520, .1, 'sine', .04); setTimeout(function(){ tone(780, .14, 'triangle', .035); }, 80); },
  poster: function(){ tone(440, .09, 'sine', .03); },
  jonas: function(){ tone(392, .1, 'sine', .045); setTimeout(function(){ tone(523, .12, 'triangle', .04); }, 70); },
  open: function(){ tone(660, .15, 'sine', .04); }
 };
 document.addEventListener('click', function(e){
  var t = e.target && e.target.closest && e.target.closest(
    '.gold-btn, .mh-explore-more, #ma-jonas-home-bubble, .ex-card, #trending-rail .marquee-item, .premium-card a'
  );
  if (!t) return;
  if (t.id === 'ma-jonas-home-bubble') sounds.jonas();
  else if (t.classList.contains('mh-explore-more')) sounds.explore();
  else if (t.classList.contains('gold-btn')) sounds.gold();
  else if (t.closest('#trending-rail')) sounds.poster();
  else if (t.classList.contains('ex-card')) sounds.open();
  else sounds.tap();
 }, { passive: true });
 // Light vibration still runs from the other script; this only adds sound.
})();
