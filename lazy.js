/* ============================================================
   MATCHAPP — LAZY MODE

   The homepage asks a returning visitor to scroll past a trending rail, an
   events rail, two spotlights, a how-it-works panel and a concierge pitch
   before reaching the only thing they came back for: the form. Lazy Mode
   folds all of that away and leaves the match form, so a repeat visit is
   pick-tick-go.

   DESIGN NOTES

   Sections are NOT wrapped in <details>. Wrapping would have been less code,
   but #result-box and #loading-box are shown and hidden by app.js at match
   time, and a block that JS reveals while sitting inside a collapsed <details>
   is revealed into a container that is still closed — the user taps Match and
   nothing appears. Instead a header button is inserted as a SIBLING before
   each foldable section and toggles a class on it. The DOM tree is untouched,
   every getElementById in app.js keeps resolving, and the panels app.js
   controls are excluded from folding entirely.

   ADS ARE LEFT ALONE ON PURPOSE. Folding the ad units would be the single
   biggest visual quieting available, and it is also a revenue decision that
   belongs to the business, not to a layout mode. FOLD_ADS below flips it in
   one line if that call is made.

   MEMBERS ONLY, BUT VISIBLY SO. Signed-out visitors see the toggle in a
   locked state rather than not seeing it at all — a perk you can see is a
   reason to register; a perk you cannot see is not a perk.
   ============================================================ */

(function () {
    'use strict';

    const FOLD_ADS = false;          // see note above
    const STORE_KEY = 'match_lazy_mode';

    /* Each entry: the section to fold, and the label for its header button.
       Labels fall back to the section's own heading when one exists, so a
       copy change in the HTML does not silently desync from this list. */
    const FOLDABLE = [
        { sel: '#daily-match-checkin',  label: '✨ Daily Match Check-in — streak & bonus matches', icon: '✨' },
        { sel: '.top-ask-wrap',         label: '🤖 Ask MatchApp Ai — chat about what to watch', icon: '🤖' },
        { sel: '#trending-rail',        label: '🔥 Latest titles trending right now', icon: '🔥' },
        { sel: '#swifties-spotify',     label: '🎵 Spotify spotlight — music & video picks', icon: '🎵' },
        { sel: '#questionnaire-box',    label: '🎯 Find my match — mood, genre, platform & more', icon: '🎯' },
        { sel: '#search-box',           label: '🔎 Search a specific title', icon: '🔎' },
        { sel: '#premiere-disclosure',  label: '🎬 Premiere spotlight — featured release', icon: '🎬' },
        { sel: '#latest-news',          label: '📰 Latest entertainment news', icon: '📰' },
        { sel: '#global-events',        label: '🎪 Events happening now', icon: '🎪' },
        { sel: '#how-it-works',         label: '❓ How MatchApp works', icon: '❓' },
        { sel: '#ai-concierge-section', label: '🤖 About the AI concierge', icon: '🤖' },
        { sel: '#matchapp-tiktok-showcase', label: '♪ MatchApp on TikTok — watch & share', icon: '♪' }
    ];
    /* Panels app.js shows and hides itself as part of the match flow. Folding
       these would fight that — the loading meter and the result card are
       transient states, not sections a user browses. */
    const NEVER_FOLD = ['#loading-box', '#result-box'];

    let mounted = false;

    function isOn() {
        try { return localStorage.getItem(STORE_KEY) === '1'; } catch (e) { return false; }
    }
    function setOn(v) {
        try { localStorage.setItem(STORE_KEY, v ? '1' : '0'); } catch (e) {}
    }
    function loggedIn() { return window.isUserLoggedIn === true; }

    function tr(key, fallback) {
        if (typeof window.t !== 'function') return fallback;
        const v = window.t(key);
        return (v && v !== key) ? v : fallback;
    }

    /* ---------- the toggle ---------- */

    function buildToggle() {
        const container = document.querySelector('.container');
        const deck = document.querySelector('#mh-topbox .mh-deck');
        if ((!container && !deck) || document.getElementById('lazy-toggle-bar')) return;

        const bar = document.createElement('div');
        bar.id = 'lazy-toggle-bar';
        bar.className = 'lazy-bar';
        bar.innerHTML =
            '<button type="button" id="lazy-toggle" class="lazy-toggle" role="switch" aria-checked="false">' +
                '<span class="lazy-switch" aria-hidden="true"><span class="lazy-knob"></span></span>' +
                '<span class="lazy-toggle-text">' +
                    '<strong class="lazy-title">' + tr('lazy.title', 'Lazy Mode') + '</strong>' +
                    '<small class="lazy-sub"></small>' +
                '</span>' +
                '<span class="lazy-lock" aria-hidden="true">🔒</span>' +
            '</button>';

        if (deck) {
            const accountAnchor = deck.querySelector('#profile-link-tab,#nav-reg-btn,#nav-logout-btn');
            if (accountAnchor) deck.insertBefore(bar, accountAnchor);
            else deck.appendChild(bar);
            bar.classList.add('lazy-bar--header');
        } else {
            container.insertBefore(bar, container.firstChild);
        }
        document.getElementById('lazy-toggle').addEventListener('click', onToggleClick);
    }

    function onToggleClick() {
        if (!loggedIn()) {
            // The pitch, at the exact moment the value is obvious: they just
            // reached for the thing and found it locked.
            if (window.showToast) {
                showToast(tr('lazy.memberOnly', '🔒 Lazy Mode is a free member perk — join in 10 seconds and the page folds itself.'));
            }
            if (typeof window.openAuthModal === 'function') window.openAuthModal();
            return;
        }
        apply(!document.body.classList.contains('lazy-mode'), true);
    }

    function refreshToggleUI() {
        const btn = document.getElementById('lazy-toggle');
        if (!btn) return;
        const on = document.body.classList.contains('lazy-mode');
        const member = loggedIn();

        btn.classList.toggle('is-on', on);
        btn.classList.toggle('is-locked', !member);
        btn.setAttribute('aria-checked', on ? 'true' : 'false');

        const sub = btn.querySelector('.lazy-sub');
        if (sub) {
            sub.textContent = !member
                ? tr('lazy.subLocked', 'Members only — free to join')
                : (on ? tr('lazy.subOn',  'Page folded. Tap any bar to open a section.')
                      : tr('lazy.subOff', 'Fold the page down to just the match form.'));
        }
    }

    /* ---------- folding ---------- */

    function headerFor(cfg, section) {
        // Prefer the section's own heading so the fold bar and the open
        // section never disagree about what the section is called.
        let label = cfg.label;
        const h = section.querySelector('h2, h3');
        if (h) {
            const text = h.textContent.trim().replace(/\s+/g, ' ');
            if (text && text.length <= 60) label = text;
        }
        return label;
    }

    function mountFolds() {
        FOLDABLE.forEach(cfg => {
            document.querySelectorAll(cfg.sel).forEach(section => {
                if (!section || NEVER_FOLD.some(s => section.matches(s))) return;
                if (section.dataset.lazyFoldMounted === '1') return;
                section.dataset.lazyFoldMounted = '1';
                section.classList.add('lazy-foldable');

                const head = document.createElement('button');
                head.type = 'button';
                head.className = 'lazy-head';
                head.setAttribute('aria-expanded', 'false');
                head.innerHTML =
                    '<span class="lazy-head-label">' + headerFor(cfg, section) + '</span>' +
                    '<span class="lazy-head-chevron" aria-hidden="true">⌄</span>';

                head.addEventListener('click', () => {
                    const open = section.classList.toggle('lazy-open');
                    head.setAttribute('aria-expanded', open ? 'true' : 'false');
                    head.classList.toggle('is-open', open);
                    if (open) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });

                section.parentNode.insertBefore(head, section);
            });
        });

        if (FOLD_ADS) {
            document.querySelectorAll('.container .ad-banner-container').forEach(el => el.classList.add('lazy-foldable', 'lazy-ad'));
        }
        mounted = true;
    }

    function apply(on, announce) {
        // Never leave a signed-out visitor in a member mode — the flag can
        // survive a logout in localStorage, and honouring it then would hand
        // out the perk the toggle just refused to give.
        if (on && !loggedIn()) on = false;

        document.body.classList.toggle('lazy-mode', on);
        setOn(on);

        if (on) {
            mountFolds();
            document.querySelectorAll('.container details.spotlight-details[open]').forEach(d => d.removeAttribute('open'));
        }
        // Folding state resets on exit so the page is never left half-folded.
        if (!on) {
            document.querySelectorAll('.lazy-foldable.lazy-open').forEach(s => s.classList.remove('lazy-open'));
            document.querySelectorAll('.lazy-head.is-open').forEach(h => { h.classList.remove('is-open'); h.setAttribute('aria-expanded', 'false'); });
        }

        refreshToggleUI();

        if (announce && window.showToast) {
            showToast(on ? tr('lazy.on',  '😌 Lazy Mode on — just the essentials.')
                         : tr('lazy.off', '✨ Full page restored.'));
        }
        if (typeof window.dataLayer !== 'undefined' && Array.isArray(window.dataLayer)) {
            window.dataLayer.push({ event: 'lazy_mode_toggle', lazy_mode: on ? 'on' : 'off' });
        }
    }

    window.setLazyMode = (v) => apply(!!v, false);

    function init() {
        buildToggle();
        apply(isOn(), false);
        refreshToggleUI();
        const foldObserver = new MutationObserver(() => {
            if (document.body.classList.contains('lazy-mode')) mountFolds();
        });
        foldObserver.observe(document.body,{childList:true,subtree:true});
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    // Auth can resolve after first paint, so the locked state and any stored
    // preference both have to be re-evaluated when it does.
    document.addEventListener('matchapp:authchange', () => { apply(isOn(), false); });
    document.addEventListener('matchapp:langchange', () => {
        const btn = document.getElementById('lazy-toggle');
        if (btn) {
            const title = btn.querySelector('.lazy-title');
            if (title) title.textContent = tr('lazy.title', 'Lazy Mode');
        }
        refreshToggleUI();
    });
})();
