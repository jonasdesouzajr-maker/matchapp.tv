/* MatchApp TV Ai — shared premium page shell (2026-09-21).

   Gives every non-Home, non-Kids route the same top box the Home landing
   uses, plus a labelled HOME control back to the landing. Presentation only:
   it moves and labels chrome that already exists and never touches matching,
   Ask AI, quota, auth or payment code.

   Runtime contract (AGENTS.md stability invariant):
   - one bounded pass, no observers, no intervals, no re-entry;
   - every step is idempotent, so a second call changes nothing;
   - every step is individually guarded, so a missing element on one route can
     never stop the rest of the shell from mounting.  */
(function () {
  'use strict';

  var HOME_ORB = '/assets/brand/matchapp-home-orb-transparent.webp?v=20260920-homebrand4';

  function path() {
    return (location.pathname || '/').replace(/\/+$/, '') || '/';
  }

  /* Home keeps its own settled landing shell; Kids Mode keeps its own branding
     and must never inherit normal-mode chrome. */
  function skip() {
    var p = path();
    if (p === '/' || p === '/index.html') return true;
    if (p.indexOf('/kids') === 0) return true;
    var b = document.body;
    return !!(b && (b.classList.contains('page-home') ||
                    b.classList.contains('page-kids') ||
                    b.classList.contains('kids-body')));
  }

  function brandName() {
    var lang = String(window.MATCH_LANG || '').toLowerCase();
    try { lang = lang || String(localStorage.getItem('match_lang') || '').toLowerCase(); } catch (_) {}
    lang = lang || String(document.documentElement.lang || '').toLowerCase();
    return lang.indexOf('pt') === 0 ? 'MatchApp iA' : 'MatchApp Ai';
  }
  function updateBrandLocale(root) {
    var name = brandName();
    var brand = root && root.querySelector('.ma-brand-lockup');
    if (!brand) return;
    brand.setAttribute('aria-label', name);
    var home = brand.querySelector('.ma-brand-home-link');
    if (home) home.setAttribute('aria-label', name + ' home');
    var ai = brand.querySelector('[data-ma-brand-ai]');
    if (ai && ai.textContent !== (name.endsWith('iA') ? 'iA' : 'Ai')) {
      ai.textContent = name.endsWith('iA') ? 'iA' : 'Ai';
    }
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* Short orientation label under the wordmark: the page's own name, taken
     from the document rather than a hard-coded list, so a new page is covered
     without another edit here. */
  function pageLabel() {
    /* The document title is preferred over the page H1: an H1 often carries a
       <br>, whose two lines concatenate into one run-on word in textContent. */
    var h1 = document.querySelector('h1');
    var raw = document.title || (h1 && h1.textContent) || '';
    raw = String(raw).split('|')[0].split('—')[0].split(' - ')[0];
    raw = raw.replace(/\s+/g, ' ').trim();
    if (raw.length > 34) raw = raw.slice(0, 33).trim() + '…';
    return raw;
  }

  function buildBrand() {
    var host = el('div', 'header-brand-area ma-brand-stage');
    host.id = 'shell-brand-lockup';
    var lockup = el('div', 'ma-brand-lockup');
    lockup.setAttribute('aria-label', brandName());

    var link = el('a', 'ma-brand-home-link');
    link.href = '/';
    link.setAttribute('aria-label', brandName() + ' home');

    var stage = el('span', 'ma-brand-orb-stage');
    stage.setAttribute('aria-hidden', 'true');
    var orb = document.createElement('img');
    orb.className = 'ma-brand-orb';
    orb.src = HOME_ORB;
    orb.alt = '';
    orb.width = 512;
    orb.height = 512;
    orb.decoding = 'async';
    stage.appendChild(orb);

    var copy = el('span', 'ma-brand-copy');
    var word = el('span', 'ma-wordmark');
    word.appendChild(el('span', 'ma-word-match', 'Match'));
    word.appendChild(el('span', 'ma-word-app', 'App'));
    copy.appendChild(word);
    copy.appendChild(el('span', 'ma-word-ai', brandName().endsWith('iA') ? 'iA' : 'Ai'));
    copy.querySelector('.ma-word-ai').setAttribute('data-ma-brand-ai', '');

    link.appendChild(stage);
    link.appendChild(copy);
    lockup.appendChild(link);
    host.appendChild(lockup);
    return host;
  }

  function homeButton() {
    var a = el('a', 'mh-home-btn');
    a.href = '/';
    a.id = 'mh-home-btn';
    a.setAttribute('aria-label', 'Back to the MatchApp home page');
    a.setAttribute('title', 'Home');
    a.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 11.2 12 4l9 7.2"/>' +
      '<path d="M5.5 9.8V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.8"/>' +
      '<path d="M9.8 20v-5.2h4.4V20"/></svg>';
    a.appendChild(el('span', 'mh-home-label', 'Home'));
    return a;
  }

  /* Prefer the route's own header so its controls survive: the shared
     `app-header`, then any top-level <header>, and only then a new one. A page
     whose header the shell had to create gets a marker class, because those
     routes centre their card with a flex body that a new first child would
     otherwise lay out side by side. */
  function ensureHeader() {
    var header = document.querySelector('header.app-header');
    if (header) return header;

    var existing = document.querySelector('body > header');
    if (existing) {
      existing.classList.add('app-header');
      return existing;
    }

    header = el('header', 'app-header');
    header.appendChild(el('nav', ''));
    var body = document.body;
    body.classList.add('page-shell-owns-header');
    if (body.firstChild) body.insertBefore(header, body.firstChild);
    else body.appendChild(header);
    return header;
  }

  function mount() {
    var body = document.body;
    if (!body || skip()) return;
    if (body.dataset.pageShell === '1') return;

    var header = ensureHeader();
    if (!header) return;
    body.dataset.pageShell = '1';
    body.classList.add('page-shell');
    header.classList.add('mh-topbox');

    /* --- head: brand lockup + page label, as one column --- */
    var head = header.querySelector('.mh-head');
    if (!head) {
      head = el('div', 'mh-head');
      var brand = header.querySelector('#home-brand-lockup') ||
                  header.querySelector('.ma-brand-stage') ||
                  header.querySelector('.header-brand-area') ||
                  header.querySelector('.matchapp-brand-link');
      if (brand) brand.parentNode.insertBefore(head, brand);
      else header.insertBefore(head, header.firstChild);
      head.appendChild(brand || buildBrand());
    }
    // Some adult routes still ship an older SVG that literally says "TV Ai".
    // Upgrade only their top-box brand node to the same actual text lockup;
    // preserve the route's existing navigation, login, profile and shortcuts.
    var legacyBrand = head.querySelector('.header-brand-area, .ma-brand-stage, .matchapp-brand-link');
    if (legacyBrand && !legacyBrand.querySelector('[data-ma-brand-ai]')) {
      legacyBrand.replaceWith(buildBrand());
    }
    updateBrandLocale(head);
    if (!head.querySelector('.mh-tagline')) {
      var label = pageLabel();
      if (label) head.appendChild(el('p', 'mh-tagline', label));
    }

    /* One mark everywhere: the round Home orb, so the top box reads the same
       on every route instead of swapping to the flat app icon off Home. */
    var orb = head.querySelector('.ma-brand-orb');
    if (orb && orb.getAttribute('src') !== HOME_ORB) orb.setAttribute('src', HOME_ORB);

    /* --- deck: one row of controls, HOME first --- */
    var nav = header.querySelector('nav');
    if (!nav) {
      nav = el('nav', '');
      header.appendChild(nav);
    }
    nav.classList.add('mh-deck');
    if (!nav.getAttribute('aria-label')) nav.setAttribute('aria-label', 'Account and app controls');
    if (!nav.querySelector('.mh-home-btn')) nav.insertBefore(homeButton(), nav.firstChild);

    /* Wrap loose text nodes and unlabelled controls so no label can render
       outside the control that owns it. */
    Array.prototype.forEach.call(nav.children, function (node) {
      if (node.nodeType === 1) node.style.boxSizing = 'border-box';
    });
  }

  document.addEventListener('matchapp:langchange', function () {
    var head = document.querySelector('body.page-shell .mh-topbox .mh-head');
    if (head) updateBrandLocale(head);
  });
  window.addEventListener('pageshow', function () {
    var head = document.querySelector('body.page-shell .mh-topbox .mh-head');
    if (head) updateBrandLocale(head);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
