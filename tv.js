/* ============================================================
   MATCHAPP — SMART TV MODE

   A TV browser is not a small desktop. Three things are different and all
   three break the normal site:

     1. THERE IS NO POINTER. A remote sends arrow keys and Enter. Every
        hover affordance is dead, and anything not reachable by arrow key is
        unreachable, full stop. Tizen, webOS and most Android TV browsers
        ship no spatial navigation of their own, so the page has to provide
        it. That is the bulk of this file.

     2. THE VIEWING DISTANCE IS ~3 METRES, not 50cm. 14px body text that is
        comfortable on a laptop is illegible across a living room. Type,
        targets and focus indication all scale up.

     3. THE PANEL OVERSCANS. Many sets still crop 3-5% of every edge, so
        anything flush to the viewport edge can be physically off-screen.
        Content sits inside a safe area.

   DETECTION IS DELIBERATELY OVERRIDABLE. TV user-agent strings are a mess
   and always will be — new models ship strings nobody has seen. ?tv=1 forces
   it on, ?tv=0 forces it off, and either choice is remembered, so a set we
   failed to detect is one URL away from working and a desktop we wrongly
   detected is one URL away from normal.
   ============================================================ */

(function () {
    'use strict';

    const STORE_KEY = 'match_tv_mode';

    /* Covers the platforms that actually ship browsers people use: Samsung
       Tizen, LG webOS/NetCast, Android TV and Google TV, Amazon Fire TV
       (AFT* device codes), Chromecast, Roku, Vidaa/Hisense, Philips NetTV,
       Panasonic Viera, Sony BRAVIA, the HbbTV stack, and the consoles. */
    const TV_UA = /\b(smart-?tv|smarttv|tizen|web0s|webos|netcast|hbbtv|appletv|tvos|crkey|googletv|android\s*tv|bravia|aft[a-z]{1,3}\b|playstation|xbox|roku|vidaa|hisense|viera|nettv|opera\s*tv|pov_tv|inettvbrowser|dtv|philipstv|sonydtv)\b/i;

    function detect() {
        try {
            const q = new URLSearchParams(location.search);
            if (q.has('tv')) {
                const forced = q.get('tv') !== '0';
                localStorage.setItem(STORE_KEY, forced ? '1' : '0');
                return forced;
            }
            const stored = localStorage.getItem(STORE_KEY);
            if (stored === '1') return true;
            if (stored === '0') return false;
        } catch (e) { /* storage unavailable — fall through to sniffing */ }

        const ua = navigator.userAgent || '';
        if (TV_UA.test(ua)) return true;

        // Fallback for sets whose UA gives nothing away: a very large screen
        // with no touch and no fine pointer is, in practice, a television.
        // All three conditions are required — a desktop has a fine pointer, a
        // tablet has touch, and a large monitor with neither is vanishingly
        // rare compared to the TVs this catches.
        try {
            const noFine   = window.matchMedia('(pointer: none), (pointer: coarse)').matches;
            const noHover  = window.matchMedia('(hover: none)').matches;
            const bigPanel = Math.min(screen.width, screen.height) >= 720 && Math.max(screen.width, screen.height) >= 1280;
            const noTouch  = !('ontouchstart' in window) && (navigator.maxTouchPoints || 0) === 0;
            return bigPanel && noTouch && (noFine || noHover);
        } catch (e) { return false; }
    }

    if (!detect()) { window.MATCHAPP_TV = false; return; }
    window.MATCHAPP_TV = true;

    /* ---------------- spatial navigation ---------------- */

    const FOCUSABLE = [
        'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type=hidden])',
        'select:not([disabled])', 'textarea:not([disabled])', 'summary',
        '[tabindex]:not([tabindex="-1"])', '[role="button"]:not([disabled])'
    ].join(',');

    function visible(el) {
        if (!el || el.disabled) return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return false;
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
        // The native <select>s that criteria.js hides are clipped to 1px and
        // must never take remote focus — the chips replaced them.
        if (el.classList.contains('crit-native')) return false;
        return true;
    }

    /* Scope focus to an open modal when there is one. Without this the remote
       walks straight out of a dialog and into the page behind it, which on a
       TV looks exactly like the app freezing — the focus ring simply vanishes
       behind an overlay. */
    function scope() {
        const modals = ['#share-modal', '#main-auth-modal', '#rematch-modal', '#notforme-modal', '#poster-zoom'];
        for (const sel of modals) {
            const m = document.querySelector(sel);
            if (m && getComputedStyle(m).display !== 'none' && m.offsetParent !== null) return m;
        }
        return document;
    }

    function candidates() {
        return Array.prototype.filter.call(scope().querySelectorAll(FOCUSABLE), visible);
    }

    function centre(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

    /* Picks the nearest element in the requested direction. Distance along the
       travel axis dominates; misalignment across it is penalised but not
       disqualifying, so a slightly offset button below is still reachable with
       Down rather than requiring a diagonal nobody's remote has. */
    function nextInDirection(from, dir) {
        const list = candidates();
        if (!list.length) return null;
        if (!from) return list[0];

        const fr = from.getBoundingClientRect();
        const fc = centre(fr);
        let best = null, bestScore = Infinity;

        for (const el of list) {
            if (el === from) continue;
            const r = el.getBoundingClientRect();
            const c = centre(r);
            const dx = c.x - fc.x, dy = c.y - fc.y;

            let along, across;
            if (dir === 'left')       { if (r.right  > fr.left  - 1) continue; along = -dx; across = Math.abs(dy); }
            else if (dir === 'right') { if (r.left   < fr.right + 1) continue; along =  dx; across = Math.abs(dy); }
            else if (dir === 'up')    { if (r.bottom > fr.top   - 1) continue; along = -dy; across = Math.abs(dx); }
            else                      { if (r.top    < fr.bottom+ 1) continue; along =  dy; across = Math.abs(dx); }

            // Overlap on the cross axis means the element is genuinely "in
            // line" — strongly preferred over something further sideways.
            const overlap = (dir === 'left' || dir === 'right')
                ? Math.max(0, Math.min(fr.bottom, r.bottom) - Math.max(fr.top, r.top))
                : Math.max(0, Math.min(fr.right, r.right) - Math.max(fr.left, r.left));

            const score = along + across * (overlap > 0 ? 0.25 : 2.5);
            if (score < bestScore) { bestScore = score; best = el; }
        }
        return best;
    }

    function focus(el) {
        if (!el) return;
        el.focus({ preventScroll: true });
        if(window.MatchAppScrollGate?.canAutoScroll?.())el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    const DIRS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
                   Left: 'left', Right: 'right', Up: 'up', Down: 'down' };

    document.addEventListener('keydown', (ev) => {
        const active = document.activeElement;

        // Inside a text field the arrows belong to the caret, not to
        // navigation — except up/down, which have nowhere to go on one line.
        const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');

        if (DIRS[ev.key]) {
            const dir = DIRS[ev.key];
            if (typing && (dir === 'left' || dir === 'right')) return;
            const next = nextInDirection(visible(active) ? active : null, dir);
            if (next) { ev.preventDefault(); focus(next); }
            return;
        }

        if (ev.key === 'Enter' || ev.key === 'OK') {
            if (active && active !== document.body && !typing) { ev.preventDefault(); active.click(); }
            return;
        }

        // Every remote's Back button, across every platform that reports one.
        if (ev.key === 'Backspace' || ev.key === 'Escape' || ev.key === 'GoBack' ||
            ev.key === 'BrowserBack' || ev.keyCode === 10009 /* Tizen RETURN */ || ev.keyCode === 461 /* webOS BACK */) {
            if (typing) return;
            const m = scope();
            if (m !== document) {
                ev.preventDefault();
                const closer = m.querySelector('[onclick*="close"], .share-close, .modal-close, [aria-label*="lose"]');
                if (closer) closer.click(); else m.style.display = 'none';
                return;
            }
            if (history.length > 1) { ev.preventDefault(); history.back(); }
        }
    });

    /* ---------------- mode setup ---------------- */

    function mount() {
        document.body.classList.add('tv-mode');

        // The ambient canvas runs a continuous physics simulation. TV SoCs are
        // roughly a decade behind the phone in your pocket, and it is the one
        // thing on the page that will make a set stutter. Stopped, not hidden.
        const canvas = document.getElementById('ambient-bg');
        if (canvas) canvas.remove();

        // A banner that says what happened and how to leave — a TV user who
        // did not ask for this needs an exit that does not involve typing a
        // URL with an on-screen keyboard.
        if (!document.getElementById('tv-banner')) {
            const bar = document.createElement('div');
            bar.id = 'tv-banner';
            bar.className = 'tv-banner';
            bar.innerHTML =
                '<span class="tv-banner-icon" aria-hidden="true">📺</span>' +
                '<span class="tv-banner-text">TV Mode — use the arrows on your remote, press OK to select</span>' +
                '<button type="button" class="tv-banner-exit" id="tv-exit">Exit TV Mode</button>';
            document.body.insertBefore(bar, document.body.firstChild);
            document.getElementById('tv-exit').addEventListener('click', () => {
                try { localStorage.setItem(STORE_KEY, '0'); } catch (e) {}
                location.search = location.search
                    ? location.search.replace(/([?&])tv=[^&]*/, '$1tv=0') + (/[?&]tv=/.test(location.search) ? '' : '&tv=0')
                    : '?tv=0';
            });
        }

        // Land the remote somewhere useful rather than on the document body,
        // where the first arrow press would appear to do nothing.
        setTimeout(() => {
            const first = document.querySelector('#q-category')?.parentElement?.querySelector('.crit-chip')
                       || document.querySelector('.container .crit-chip')
                       || candidates()[0];
            focus(first);
        }, 700);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();
