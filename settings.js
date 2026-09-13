/* ============================================================
   MatchApp — Settings
   ============================================================ */
(function () {
    'use strict';

    const KEY = 'match_settings';
    const LEGACY_AUTOREAD_KEY = 'match_voice_autoread';
    const KIDS_MODE_KEY = 'match_kids_mode';

    const DEFAULTS = {
        fontScale: 1,
        voiceURI: '',
        voiceRate: 1,
        voicePitch: 1,
        autoRead: true,
        reduceMotion: false,
        lazyDefault: false,
        compactCards: false
    };

    let settings = { ...DEFAULTS };

    function syncLegacyAutoRead() {
        try { localStorage.setItem(LEGACY_AUTOREAD_KEY, settings.autoRead === false ? 'false' : 'true'); } catch (e) {}
    }

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) };
            const legacy = localStorage.getItem(LEGACY_AUTOREAD_KEY);
            if (legacy === 'false') settings.autoRead = false;
            else if (legacy === 'true') settings.autoRead = true;
            syncLegacyAutoRead();
        } catch (e) {
            settings = { ...DEFAULTS };
            syncLegacyAutoRead();
        }
        return settings;
    }

    function persistLocal() {
        try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {}
        syncLegacyAutoRead();
    }

    let syncTimer = null;
    function persistRemote() {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(async () => {
            const sb = window.supabaseClient;
            if (!sb) return;
            try {
                const { data: { user } } = await sb.auth.getUser();
                if (!user) return;
                await sb.auth.updateUser({ data: { match_settings: settings } });
            } catch (e) {}
        }, 900);
    }

    function applyFontScale() {
        document.documentElement.style.setProperty('--font-scale', settings.fontScale);
    }
    function applyMotion() {
        document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
    }
    function applyCompact() {
        document.documentElement.classList.toggle('compact-cards', !!settings.compactCards);
    }
    function applyAll() {
        applyFontScale(); applyMotion(); applyCompact();
    }

    function loadRedesign() {
        if (location.pathname.startsWith('/kids/')) return;
        if (document.querySelector('link[data-matchapp-redesign]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/redesign.css?v=1';
        link.dataset.matchappRedesign = 'true';
        document.head.appendChild(link);
    }

    function kidsLabel() {
        const code = String(window.MATCH_LANG || localStorage.getItem('match_lang') || document.documentElement.lang || 'en').toLowerCase();
        if (code.startsWith('pt')) return 'Modo Kids';
        if (code.startsWith('es')) return 'Modo Niños';
        if (code.startsWith('fr')) return 'Mode Kids';
        if (code.startsWith('de')) return 'Kids-Modus';
        if (code.startsWith('it')) return 'Modalità Kids';
        if (code.startsWith('tr')) return 'Çocuk Modu';
        if (code.startsWith('ru')) return 'Детский режим';
        if (code.startsWith('ar')) return 'وضع الأطفال';
        if (code.startsWith('hi')) return 'Kids Mode';
        if (code.startsWith('id')) return 'Mode Anak';
        if (code.startsWith('ja')) return 'キッズモード';
        if (code.startsWith('ko')) return '키즈 모드';
        if (code.startsWith('zh')) return '儿童模式';
        return 'Kids Mode';
    }

    function installKidsModeToggle() {
        if (location.pathname.startsWith('/kids/') || document.querySelector('.matchapp-kids-toggle')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'matchapp-kids-toggle';
        btn.setAttribute('aria-label', kidsLabel());
        btn.innerHTML = '<img src="/kids/kids-logo.svg" alt=""><span></span>';
        btn.querySelector('span').textContent = kidsLabel();
        btn.addEventListener('click', () => {
            try { localStorage.setItem(KIDS_MODE_KEY, 'true'); } catch (e) {}
            location.href = '/kids/';
        });
        document.body.appendChild(btn);
    }

    function maybeRedirectKidsMode() {
        let enabled = false;
        try { enabled = localStorage.getItem(KIDS_MODE_KEY) === 'true'; } catch (e) {}
        if (!enabled || location.pathname.startsWith('/kids/')) return false;
        const p = location.pathname.replace(/\/+$/, '') || '/';
        // Keep settings, account, legal and checkout routes reachable to adults.
        const kidBoundRoutes = new Set(['/', '/index.html', '/discover.html', '/together.html']);
        if (kidBoundRoutes.has(p)) {
            location.replace('/kids/');
            return true;
        }
        return false;
    }

    window.MatchSettings = {
        get(k) { return k ? settings[k] : { ...settings }; },
        set(k, v, opts) {
            if (!(k in DEFAULTS)) return;
            settings[k] = v;
            persistLocal();
            applyAll();
            if (!opts || opts.sync !== false) persistRemote();
            document.dispatchEvent(new CustomEvent('matchapp:settingschanged', { detail: { key: k, value: v } }));
        },
        reset() {
            settings = { ...DEFAULTS };
            persistLocal(); applyAll(); persistRemote();
            document.dispatchEvent(new CustomEvent('matchapp:settingschanged', { detail: { key: '*', value: null } }));
        },
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
                const legacy = localStorage.getItem(LEGACY_AUTOREAD_KEY);
                if (legacy === 'false') settings.autoRead = false;
                else if (legacy === 'true') settings.autoRead = true;
                persistLocal(); applyAll();
            } catch (e) {}
        },
        listVoices() {
            return new Promise(resolve => {
                if (!('speechSynthesis' in window)) return resolve([]);
                const got = speechSynthesis.getVoices();
                if (got.length) return resolve(got);
                let done = false;
                const finish = () => { if (done) return; done = true; resolve(speechSynthesis.getVoices()); };
                speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
                setTimeout(finish, 1200);
            });
        },
        resolveVoice(voices, lang) {
            if (!voices || !voices.length) return null;
            if (settings.voiceURI) {
                const chosen = voices.find(v => v.voiceURI === settings.voiceURI);
                if (chosen) return chosen;
            }
            const base = String(lang || 'en').toLowerCase().split('-')[0];
            return voices.find(v => v.lang.toLowerCase().startsWith(base))
                || voices.find(v => v.lang.toLowerCase().startsWith('en'))
                || voices[0];
        },
        DEFAULTS
    };

    load();
    if (maybeRedirectKidsMode()) return;
    loadRedesign();
    applyFontScale();

    const ready = () => { applyAll(); installKidsModeToggle(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
    else ready();
    document.addEventListener('matchapp:langchange', () => {
        const span = document.querySelector('.matchapp-kids-toggle span');
        if (span) span.textContent = kidsLabel();
    });
})();