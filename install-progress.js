/* ============================================================
   MatchApp — install & update progress

   Gives installing and updating the feedback an app store gives: a progress
   bar under the logo, then a settled "Installed" state.

   HONESTY NOTE — this matters more than it looks.
   No browser exposes real PWA install progress. beforeinstallprompt fires,
   the user accepts, and appinstalled fires when the OS is done; there is
   nothing in between to measure. So the bar is paced against the events we
   genuinely have rather than inventing a percentage:

     • it advances while the install is actually in flight,
     • it eases toward 90% and WAITS there — it never claims completion on a
       timer,
     • only the real appinstalled event drives it to 100%.

   A bar that raced to 100% before the OS finished would be a lie the user
   could catch, because the icon would not be on their home screen yet.
   ============================================================ */

(function () {
    'use strict';

    const BAR_ID = 'install-progress';
    let barEl = null, fillEl = null, labelEl = null, easeTimer = null, current = 0;

    function host() {
        // Sits under the header logo, which is where an app store puts it and
        // where the user is already looking after pressing Install.
        return document.querySelector('.header-brand-area')
            || document.querySelector('.app-header')
            || document.body;
    }

    function ensureBar() {
        if (barEl && document.body.contains(barEl)) return barEl;
        barEl = document.createElement('div');
        barEl.id = BAR_ID;
        barEl.className = 'install-progress';
        barEl.setAttribute('role', 'progressbar');
        barEl.setAttribute('aria-valuemin', '0');
        barEl.setAttribute('aria-valuemax', '100');
        barEl.innerHTML = '<div class="install-progress-track"><div class="install-progress-fill"></div></div>'
                        + '<span class="install-progress-label"></span>';
        const h = host();
        h.insertAdjacentElement(h === document.body ? 'afterbegin' : 'afterend', barEl);
        fillEl = barEl.querySelector('.install-progress-fill');
        labelEl = barEl.querySelector('.install-progress-label');
        return barEl;
    }

    function setProgress(pct, label) {
        ensureBar();
        current = Math.max(0, Math.min(100, pct));
        fillEl.style.width = current + '%';
        barEl.setAttribute('aria-valuenow', String(Math.round(current)));
        if (label) { labelEl.textContent = label; barEl.setAttribute('aria-label', label); }
        barEl.classList.add('is-active');
    }

    function hideBar(delay) {
        clearInterval(easeTimer);
        setTimeout(() => { if (barEl) barEl.classList.remove('is-active'); }, delay || 1600);
    }

    /* Eases toward a ceiling and stops there. Deliberately never reaches 100
       on its own — only a real completion event does that. */
    function easeTo(ceiling, stepMs) {
        clearInterval(easeTimer);
        easeTimer = setInterval(() => {
            if (current >= ceiling) { clearInterval(easeTimer); return; }
            // Decelerating: fast early, slow near the ceiling, so a long
            // install does not sit at a visibly frozen bar.
            const remaining = ceiling - current;
            setProgress(current + Math.max(0.4, remaining * 0.06));
        }, stepMs || 120);
    }

    const tr = (k, fallback) => {
        try { if (typeof window.t === 'function') { const v = window.t(k); if (v) return v; } } catch (e) {}
        return fallback;
    };

    /* ---------- install ---------- */

    window.matchAppInstallProgress = {
        start() {
            setProgress(8, tr('install.installing', 'Installing MatchApp…'));
            easeTo(90);
        },
        complete() {
            clearInterval(easeTimer);
            setProgress(100, tr('install.done', 'Installed'));
            hideBar(2200);
            markInstalled();
        },
        cancel() {
            clearInterval(easeTimer);
            if (barEl) barEl.classList.remove('is-active');
        },
        updating() {
            setProgress(10, tr('install.updating', 'Updating…'));
            easeTo(88);
        }
    };

    /* ---------- installed button state ---------- */

    function markInstalled() {
        document.querySelectorAll('.install-btn').forEach(btn => {
            btn.classList.add('is-installed');
            btn.classList.remove('has-update');
            const label = btn.querySelector('.install-label');
            if (label) label.textContent = tr('install.installed', 'App installed');
            btn.setAttribute('aria-label', tr('install.installed', 'App installed'));
            btn.disabled = true;
            const dot = btn.querySelector('.update-dot');
            if (dot) dot.remove();
        });
    }

    function reflectState() {
        const st = window.matchAppInstallState;
        if (!st) return;
        // An update being available takes priority: app-updates.js owns that
        // state and turns the same button into an Update control, so this must
        // not overwrite it.
        const updating = document.querySelector('.install-btn.has-update');
        if (updating) return;
        if (st.isInstalled()) markInstalled();
    }

    window.addEventListener('appinstalled', () => window.matchAppInstallProgress.complete());
    window.addEventListener('matchapp:installstate', reflectState);
    document.addEventListener('matchapp:updateapplying', () => window.matchAppInstallProgress.updating());

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', reflectState);
    } else {
        reflectState();
    }
})();
