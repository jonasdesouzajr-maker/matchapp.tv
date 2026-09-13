/* ============================================================
   MatchApp — Settings

   One module owning every user preference, because they were scattered:
   voice rate lived in localStorage with no UI to set it, language sat in its
   own switcher, Lazy Mode had a toggle in the header, and nothing was saved
   to the account — so a user who set things up on their phone started from
   scratch on their laptop.

   Storage is deliberately two-tier:
     • localStorage always, so preferences apply on the very first paint and
       work for signed-out visitors.
     • Supabase profile when signed in, so they follow the person across
       devices. Writes are debounced; a slider fires dozens of input events
       and each one must not be a network round-trip.

   Font scale is the reason this file loads before paint. Applying it after
   render causes every text element to visibly jump — so the scale is read
   synchronously from localStorage and set on <html> before the body renders.
   ============================================================ */

(function () {
    'use strict';

    const KEY = 'match_settings';

    /* Defaults are the current behaviour, so an existing user notices no
       change until they deliberately move something. */
    const DEFAULTS = {
        fontScale: 1,          // 0.85 – 1.4
        voiceURI: '',          // '' = pick automatically by language
        voiceRate: 1,          // 0.6 – 1.6
        voicePitch: 1,         // 0.6 – 1.5
        autoRead: false,       // read AI answers aloud automatically
        reduceMotion: false,   // user-level override of the OS setting
        lazyDefault: false,    // start every visit in Lazy Mode
        compactCards: false    // denser result cards
    };

    let settings = { ...DEFAULTS };

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) };
        } catch (e) { settings = { ...DEFAULTS }; }
        return settings;
    }

    function persistLocal() {
        try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {}
    }

    /* Debounced so dragging a slider writes once when the user stops, not
       forty times on the way. */
    let syncTimer = null;
    function persistRemote() {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(async () => {
            const sb = window.supabaseClient;
            if (!sb) return;
            try {
                const { data: { user } } = await sb.auth.getUser();
                if (!user) return;
                // Written into user metadata rather than a new table: it is a
                // small blob owned entirely by one user, and adding a table
                // would mean a migration and new RLS policy for no benefit.
                await sb.auth.updateUser({ data: { match_settings: settings } });
            } catch (e) { /* never block the UI on a preference sync */ }
        }, 900);
    }

    /* ---------- appliers ---------- */

    function applyFontScale() {
        // Every size in the type scale is multiplied by this, so one value
        // moves headings, body and labels together and keeps their ratios.
        document.documentElement.style.setProperty('--font-scale', settings.fontScale);
    }

    function applyMotion() {
        document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
    }

    function applyCompact() {
        document.documentElement.classList.toggle('compact-cards', !!settings.compactCards);
    }

    function applyAll() {
        applyFontScale();
        applyMotion();
        applyCompact();
    }

    /* ---------- public API ---------- */

    window.MatchSettings = {
        get(k) { return k ? settings[k] : { ...settings }; },

        set(k, v, opts) {
            if (!(k in DEFAULTS)) return;
            settings[k] = v;
            persistLocal();
            applyAll();
            // Slider drags pass {sync:false} on every input event and true
            // once on change, so the network sees one write per adjustment.
            if (!opts || opts.sync !== false) persistRemote();
            document.dispatchEvent(new CustomEvent('matchapp:settingschanged', { detail: { key: k, value: v } }));
        },

        reset() {
            settings = { ...DEFAULTS };
            persistLocal(); applyAll(); persistRemote();
            document.dispatchEvent(new CustomEvent('matchapp:settingschanged', { detail: { key: '*', value: null } }));
        },

        /* Pull the account copy once after sign-in. Remote wins only for keys
           the local copy has never had, so a preference just changed on this
           device is not overwritten by a stale value from another one. */
        async hydrateFromAccount() {
            const sb = window.supabaseClient;
            if (!sb) return;
            try {
                const { data: { user } } = await sb.auth.getUser();
                const remote = user && user.user_metadata && user.user_metadata.match_settings;
                if (!remote) return;
                let local = {};
                try { local = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
                settings = { ...DEFAULTS, ...remote, ...local };
                persistLocal(); applyAll();
            } catch (e) {}
        },

        /* Voices load asynchronously in most browsers — getVoices() is empty
           on first call and populates on the voiceschanged event. Callers get
           a promise so they never render an empty dropdown. */
        listVoices() {
            return new Promise(resolve => {
                if (!('speechSynthesis' in window)) return resolve([]);
                const got = speechSynthesis.getVoices();
                if (got.length) return resolve(got);
                let done = false;
                const finish = () => { if (done) return; done = true; resolve(speechSynthesis.getVoices()); };
                speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
                setTimeout(finish, 1200);   // some browsers never fire the event
            });
        },

        /* Resolve the voice to speak with: the user's explicit pick if it is
           still installed, otherwise the best match for the UI language. */
        resolveVoice(voices, lang) {
            if (!voices || !voices.length) return null;
            if (settings.voiceURI) {
                const chosen = voices.find(v => v.voiceURI === settings.voiceURI);
                if (chosen) return chosen;   // a pick can vanish if the OS voice is uninstalled
            }
            const base = String(lang || 'en').toLowerCase().split('-')[0];
            return voices.find(v => v.lang.toLowerCase().startsWith(base))
                || voices.find(v => v.lang.toLowerCase().startsWith('en'))
                || voices[0];
        },

        DEFAULTS
    };

    load();

    // Font scale must land before first paint or every text node visibly
    // jumps. The rest is cheap and can wait for the DOM.
    applyFontScale();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyAll);
    } else {
        applyAll();
    }
})();
