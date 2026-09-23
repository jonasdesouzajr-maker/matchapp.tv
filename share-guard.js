/* Share fallback when #share-modal is missing. Loads after share.js. */
(function () {
  'use strict';
  var orig = window.openShareSheet;
  window.openShareSheet = async function () {
    var title = window.globalMatchTitle;
    if (!title) {
      if (window.showToast) window.showToast('Get a match first, then share it!', true);
      return;
    }
    if (window.currentMatchShareRestricted) {
      if (window.getAnotherMatchInstead) window.getAnotherMatchInstead();
      return;
    }
    if (!document.getElementById('share-modal')) {
      var text = (typeof shareText === 'function')
        ? shareText()
        : ('MatchApp\'s AI just matched me with "' + title + '"');
      try {
        if (navigator.share) {
          await navigator.share({ title: 'My MatchApp pick', text: text, url: 'https://matchapp.tv/' });
          if (typeof afterShare === 'function') await afterShare('native');
        } else {
          await navigator.clipboard.writeText(text + '\nhttps://matchapp.tv/');
          if (window.showToast) window.showToast('Caption copied \u2014 paste it in any app to share this match.');
        }
      } catch (_) {}
      return;
    }
    if (typeof orig === 'function') return orig.apply(this, arguments);
  };
})();
