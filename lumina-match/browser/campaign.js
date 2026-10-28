/* Lumina's complete, bounded campaign. Source artwork and theme cadence come
 * from LuminaMatch_Friends_CardGame.zip; all 250 generated boards are playable. */
(function (root) {
  'use strict';
  var regular = ['moon','star','planet','heart','crystal','butterfly','lotus','orb','sun','nebula','gem','lantern'];
  var grove = ['mushroom','firefly','crystalflower','fern','fox','moonflower'];
  var ocean = ['jellyfish','shell','seahorse','coral','starfish','dolphin'];
  var all = regular.concat(grove,ocean);
  var integer = function (n,max) { return Number.isSafeInteger(n) && n >= 0 && n <= max; };
  function config(level) {
    if (!Number.isInteger(level) || level < 1 || level > 250) throw new RangeError('LUMINA_LEVEL');
    var theme = level % 20 === 0 ? 'grove' : level % 25 === 0 ? 'ocean' : 'starlight';
    var pool = theme === 'grove' ? grove : theme === 'ocean' ? ocean : level >= 90 ? all : regular;
    var pairs = Math.min(4 + Math.floor(level / 10),20,pool.length);
    var chapter = Math.ceil(level / 25);
    // Timed mode remains optional. Its targets grow with the actual board size.
    var seconds = theme === 'starlight' ? Math.max(45,pairs * 14 - (chapter - 1) * 4) : Math.max(45,96 - (chapter - 1) * 3);
    return Object.freeze({level:level,theme:theme,pairs:pairs,chapter:chapter,seconds:seconds,pool:Object.freeze(pool.slice())});
  }
  var levels = Object.freeze(Array.from({length:250},function (_,i) { return config(i+1); }));
  function empty() { return {unlocked:1,results:Array(250).fill(null),activeLevel:null}; }
  function normalize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        !integer(value.unlocked,250) || value.unlocked < 1 || !Array.isArray(value.results) || value.results.length !== 250) return null;
    var results = [];
    for (var i = 0; i < 250; i++) {
      var result = value.results[i];
      if (result === null) {
        if (i < value.unlocked - 1) return null;
        results.push(null);
      } else {
        if (i >= value.unlocked || (value.unlocked < 250 && i >= value.unlocked - 1) || !Array.isArray(result) || result.length !== 3 ||
            !integer(result[0],3) || result[0] < 1 || !integer(result[1],1000000) || !integer(result[2],86400)) return null;
        results.push(result.slice());
      }
    }
    var active = null;
    if (value.activeLevel !== null) {
      var input = value.activeLevel;
      if (!input || !integer(input.level,250) || input.level < 1 || input.level > value.unlocked ||
          !integer(input.moves,1000000) || !integer(input.elapsedSeconds,86400) ||
          !integer(input.hintsUsed,3) || typeof input.timed !== 'boolean' || !Array.isArray(input.cards)) return null;
      var level = levels[input.level-1];
      if (input.cards.length !== level.pairs * 2) return null;
      var counts = new Map(), cards = [];
      for (var card of input.cards) {
        if (!card || !level.pool.includes(card.art) || typeof card.matched !== 'boolean') return null;
        var seen = counts.get(card.art) || {count:0,matched:card.matched};
        if (seen.matched !== card.matched) return null;
        seen.count++; counts.set(card.art,seen); cards.push({art:card.art,matched:card.matched});
      }
      if (counts.size !== level.pairs || Array.from(counts.values()).some(function (item) { return item.count !== 2; }) ||
          cards.every(function (card) { return card.matched; })) return null;
      active = {level:input.level,cards:cards,moves:input.moves,elapsedSeconds:input.elapsedSeconds,timed:input.timed,hintsUsed:input.hintsUsed};
    }
    return {unlocked:value.unlocked,results:results,activeLevel:active};
  }
  function shuffle(items, random) {
    var result = items.slice(), next = random || Math.random;
    for (var i = result.length - 1; i > 0; i--) {
      var n = next();
      if (!Number.isFinite(n) || n < 0 || n >= 1) throw new RangeError('LUMINA_RANDOM');
      var j = Math.floor(n * (i + 1)), item = result[i]; result[i] = result[j]; result[j] = item;
    }
    return result;
  }
  function deck(level,random) {
    var stage = config(level), faces = shuffle(stage.pool,random).slice(0,stage.pairs);
    return shuffle(faces.concat(faces),random).map(function (art) { return {art:art,matched:false}; });
  }
  function finish(value,level,moves,seconds,hints) {
    var progress = normalize(value), stage = config(level);
    if (!progress || level > progress.unlocked || !integer(moves,1000000) || moves < stage.pairs ||
        !integer(seconds,86400) || !integer(hints,3)) throw new RangeError('LUMINA_RESULT');
    var stars = moves <= stage.pairs * 1.4 ? 3 : moves <= stage.pairs * 2 ? 2 : 1;
    if (hints) stars = Math.min(2,stars);
    var previous = progress.results[level-1], milestone = !previous && level % 10 === 0;
    progress.results[level-1] = previous ? [Math.max(previous[0],stars),Math.min(previous[1],moves),Math.min(previous[2],seconds)] : [stars,moves,seconds];
    progress.unlocked = Math.min(250,Math.max(progress.unlocked,level+1));
    progress.activeLevel = null;
    var points = stars * 10 + Math.max(0,30 - Math.floor(seconds/2)) + (milestone ? 50 : 0);
    return {campaign:progress,stars:stars,points:points,milestone:milestone,complete:progress.results.every(Boolean)};
  }
  function image(art) {
    if (!all.includes(art)) throw new RangeError('LUMINA_ART');
    return (grove.includes(art) ? 'event_' : ocean.includes(art) ? 'ocean_' : 'card_') + art + '.jpg';
  }
  function back(theme) { return theme === 'grove' ? 'event_card_back.jpg' : theme === 'ocean' ? 'ocean_card_back.jpg' : 'card_back.jpg'; }
  var api = Object.freeze({levels:levels,config:config,empty:empty,normalize:normalize,deck:deck,finish:finish,image:image,back:back,artwork:Object.freeze(all.slice())});
  root.LuminaCampaign = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
