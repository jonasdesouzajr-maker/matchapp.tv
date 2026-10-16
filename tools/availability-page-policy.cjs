'use strict';

// An empty regional snapshot is useful to a returning reader, but it does
// not answer a search for a viewing offer. Keep its URL; exclude it from
// search until the existing availability owner supplies a genuine offer.
function hasConfirmedOffer(info) {
  return Object.values(info?.regions || {}).some(region =>
    ['stream', 'rent', 'buy'].some(kind =>
      Array.isArray(region?.[kind]) && region[kind].some(name => typeof name === 'string' && name.trim())
    )
  );
}

module.exports = {hasConfirmedOffer};
