(function () {
  'use strict';
  const form = document.getElementById('founder-tester-form');
  if (!form) return;
  const section = document.getElementById('closed-testing');
  const {apps, copy} = JSON.parse(document.getElementById('founder-testing-config').textContent);
  const select = document.getElementById('tester-app');
  const email = document.getElementById('tester-gmail');
  const optin = document.getElementById('tester-optin');
  const play = document.getElementById('tester-play');
  const button = document.getElementById('tester-send');
  let language = 'en';
  const trustedOptIn = Object.freeze({
    lumina: 'https://play.google.com/apps/testing/com.jonas.luminamatch',
    reelforge: 'https://play.google.com/apps/testing/com.reelforge.cinemaclash'
  });

  function syncLanguage() {
    let saved = '';
    try { saved = localStorage.getItem('match_lang') || ''; } catch {}
    const code = String(window.MATCH_LANG || saved || document.documentElement.lang).toLowerCase().split('-')[0];
    if (!copy[code]) return;
    language = code;
    section.querySelectorAll('[data-tester-copy]').forEach(node => {
      node.textContent = copy[code][node.dataset.testerCopy];
    });
  }
  function chooseApp() {
    const appId = select.value;
    const app = apps[appId];
    const destination = Object.hasOwn(trustedOptIn, appId) ? trustedOptIn[appId] : '';
    const groupButton = document.getElementById('tester-group-link');
    // A tester-group URL is exposed only after a roster is independently verified.
    // Never convert embedded DOM/config text into a navigable URL.
    document.getElementById('tester-group').hidden = true;
    document.getElementById('tester-existing').hidden = false;
    groupButton.removeAttribute('href');
    play.hidden = !(app && destination);
    if (app && destination) optin.href = destination;
    else optin.removeAttribute('href');
  }
  document.querySelectorAll('a[data-test-app]').forEach(link => {
    link.addEventListener('click', () => {
      if (Object.hasOwn(apps, link.dataset.testApp)) {
        select.value = link.dataset.testApp;
        chooseApp();
      }
    });
  });
  select.addEventListener('change', chooseApp);
  form.addEventListener('submit', event => {
    const app = apps[select.value];
    if (!app || !form.reportValidity()) { event.preventDefault(); return; }
    const account = email.value.trim().toLowerCase();
    form.elements.su.value = 'Founder closed testing | ' + app.name;
    form.elements.body.value = [
      'FOUNDER-TEST-V1',
      'App: ' + select.value,
      'Gmail: ' + account,
      'Language: ' + language,
      'Consent: yes',
      '',
      copy[language].consent
    ].join('\n');
  });
  document.addEventListener('matchapp:langchange', syncLanguage);
  window.addEventListener('pageshow', () => { syncLanguage(); chooseApp(); });
  syncLanguage();
  chooseApp();
  button.disabled = false;
})();