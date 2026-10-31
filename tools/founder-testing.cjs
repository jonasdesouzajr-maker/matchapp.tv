'use strict';

const copy = require('../data/founder-testing.json');
const apps = {
  lumina: { name: 'Lumina Match', package: 'com.jonas.luminamatch' },
  reelforge: { name: 'ReelForge: Cinema Clash', package: 'com.reelforge.cinemaclash' }
};
// Publish a group only after verifying membership is self-service and limited
// to this game's selected closed track. Third-party tester pools do not qualify.
const verifiedRosters = require('../data/founder-testing-rosters.json');
function groupUrl(appId) {
  const roster = verifiedRosters[appId];
  if (!roster) return null;
  if (roster.package !== apps[appId].package || !roster.track ||
      !/^\d{4}-\d{2}-\d{2}$/.test(roster.verifiedOn) ||
      !/^https:\/\/groups\.google\.com\/g\/[a-z0-9][a-z0-9-]*\/?$/.test(roster.groupUrl)) {
    throw new Error('Invalid Google Play roster for ' + appId);
  }
  return roster.groupUrl;
}
const escape = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function render() {
  const msg = (key) => '<span data-tester-copy="' + key + '">' + escape(copy.en[key]) + '</span>';
  const choices = Object.entries(apps).map(([id, app]) =>
    '<option value="' + id + '">' + escape(app.name) + '</option>').join('');
  return `<section id="closed-testing" class="mf-card mf-testing" aria-labelledby="tester-title">
    <h2 id="tester-title" data-ma-text-pill="title">${msg('title')}</h2>
    <p data-ma-text-pill="copy">${msg('intro')}</p>
    <form id="founder-tester-form" action="https://mail.google.com/mail/" method="get" target="_blank" rel="noopener noreferrer">
      <label for="tester-app">${msg('app')}</label>
      <select id="tester-app" required><option value="" data-tester-copy="choose">${escape(copy.en.choose)}</option>${choices}</select>
      <label for="tester-gmail">${msg('account')}</label>
      <input type="email" id="tester-gmail" name="authuser" autocomplete="email" inputmode="email" required maxlength="254" pattern="[A-Za-z0-9.]+(\\+[A-Za-z0-9.]+)?@[Gg][Mm][Aa][Ii][Ll]\\.[Cc][Oo][Mm]" placeholder="you@gmail.com" dir="ltr">
      <label class="mf-check"><input id="tester-consent" type="checkbox" required> ${msg('consent')}</label>
      <input type="hidden" name="view" value="cm"><input type="hidden" name="fs" value="1"><input type="hidden" name="to" value="support@matchapp.tv">
      <input type="hidden" name="su" value=""><input type="hidden" name="body" value="">
      <p class="mf-note" data-ma-text-pill="copy">${msg('instructions')}</p>
      <button class="mf-pill" type="submit" id="tester-send" disabled>${msg('send')}</button>
    </form>
    <noscript><a class="mf-pill" href="mailto:support@matchapp.tv">support@matchapp.tv</a></noscript>
    <div id="tester-play" hidden><div id="tester-group" hidden><p data-ma-text-pill="copy">${msg('groupNote')}</p><a class="mf-pill" id="tester-group-link" rel="noopener noreferrer" target="_blank">${msg('group')}</a></div><p id="tester-existing" data-ma-text-pill="copy">${msg('playNote')}</p><a class="mf-pill" id="tester-optin" rel="noopener noreferrer" target="_blank">${msg('optin')}</a></div>
    <a class="mf-pill" href="/privacy.html">${msg('privacy')}</a>
    <script type="application/json" id="founder-testing-config">${JSON.stringify({apps, groups: Object.fromEntries(Object.keys(apps).map(id => [id, groupUrl(id)])), copy}).replace(/</g,'\\u003c')}</script>
    <script defer src="/patches/founder-testing.js?v=20261031-2"></script>
  </section>`;
}
module.exports = {render, apps};