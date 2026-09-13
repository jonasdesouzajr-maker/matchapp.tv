from pathlib import Path


def rep(path, old, new, expected=1):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    n = s.count(old)
    if n != expected:
        raise SystemExit(f'{path}: expected {expected} occurrence(s), found {n}')
    p.write_text(s.replace(old, new, expected), encoding='utf-8')
    print('patched', path)

# Settings: make modern settings authoritative after legacy migration.
rep('settings.js', """            const raw = localStorage.getItem(KEY);\n            if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) };\n            const legacy = localStorage.getItem(LEGACY_AUTOREAD_KEY);\n            if (legacy === 'false') settings.autoRead = false;\n            else if (legacy === 'true') settings.autoRead = true;\n            syncLegacyAutoRead();""", """            const raw = localStorage.getItem(KEY);\n            if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) };\n            if (!raw) {\n                const legacy = localStorage.getItem(LEGACY_AUTOREAD_KEY);\n                if (legacy === 'false') settings.autoRead = false;\n                else if (legacy === 'true') settings.autoRead = true;\n            }\n            syncLegacyAutoRead();""")

rep('settings.js', """                settings = { ...DEFAULTS, ...remote, ...local };\n                const legacy = localStorage.getItem(LEGACY_AUTOREAD_KEY);\n                if (legacy === 'false') settings.autoRead = false;\n                else if (legacy === 'true') settings.autoRead = true;\n                persistLocal(); applyAll();""", """                settings = { ...DEFAULTS, ...remote, ...local };\n                persistLocal(); applyAll();""")

rep('settings.js', "const kidBoundRoutes = new Set(['/', '/index.html', '/discover.html', '/together.html']);", "const kidBoundRoutes = new Set(['/', '/index.html', '/discover.html', '/together.html', '/events-archive.html']);")

rep('settings.js', """    document.addEventListener('matchapp:langchange', () => {\n        const span = document.querySelector('.matchapp-kids-toggle span');\n        if (span) span.textContent = kidsLabel();\n    });""", """    document.addEventListener('matchapp:langchange', () => {\n        const btn = document.querySelector('.matchapp-kids-toggle');\n        const span = btn && btn.querySelector('span');\n        const label = kidsLabel();\n        if (span) span.textContent = label;\n        if (btn) btn.setAttribute('aria-label', label);\n    });""")

# Ask AI: browser timeout must exceed the Edge Function per-model timeout.
rep('discover.js', 'const AI_TIMEOUT_MS = 18000;', 'const AI_TIMEOUT_MS = 30000;')

# High-risk platforms should skip ALL live artwork lookups, including TMDB.
rep('discover.js', "if (!meta && !verified && visualType && typeof window.tmdbLookup === 'function') {", "if (!meta && !skipLiveLookup && !verified && visualType && typeof window.tmdbLookup === 'function') {")

# Escape all AI-originated card text before HTML interpolation.
rep('discover.js', """function discoverCardHTML(item, idx) {\n    const title = item.title;\n    const safe = title.replace(/\"/g, '&quot;');\n    const meta = [item.year, item.type].filter(Boolean).join(' · ');""", """function escapeDiscoverHtml(value) {\n    return String(value == null ? '' : value)\n        .replace(/&/g, '&amp;')\n        .replace(/</g, '&lt;')\n        .replace(/>/g, '&gt;')\n        .replace(/\"/g, '&quot;')\n        .replace(/'/g, '&#39;');\n}\n\nfunction discoverCardHTML(item, idx) {\n    const title = String(item.title || '');\n    const safe = escapeDiscoverHtml(title);\n    const meta = escapeDiscoverHtml([item.year, item.type].filter(Boolean).join(' · '));""")

rep('discover.js', """<p>${((typeof window.sanitizeDisplayText === 'function' ? window.sanitizeDisplayText(item.synopsis, ['synopsis']) : item.synopsis) || '').replace(/</g, '&lt;')}</p>""", """<p>${escapeDiscoverHtml((typeof window.sanitizeDisplayText === 'function' ? window.sanitizeDisplayText(item.synopsis, ['synopsis']) : item.synopsis) || '')}</p>""")

# Kids category chips: all 14 supported languages.
rep('kids/kids.js', """    const labels = {\n      en:{all:'All',animals:'Animals',funny:'Funny',learning:'Learning',adventure:'Adventure',family:'Family',music:'Music',bedtime:'Bedtime'},\n      'pt-BR':{all:'Todos',animals:'Animais',funny:'Engraçado',learning:'Aprender',adventure:'Aventura',family:'Família',music:'Música',bedtime:'Hora de dormir'},\n      es:{all:'Todo',animals:'Animales',funny:'Divertido',learning:'Aprender',adventure:'Aventura',family:'Familia',music:'Música',bedtime:'Dormir'}\n    };""", """    const labels = {\n      en:{all:'All',animals:'Animals',funny:'Funny',learning:'Learning',adventure:'Adventure',family:'Family',music:'Music',bedtime:'Bedtime'},\n      'pt-BR':{all:'Todos',animals:'Animais',funny:'Engraçado',learning:'Aprender',adventure:'Aventura',family:'Família',music:'Música',bedtime:'Hora de dormir'},\n      es:{all:'Todo',animals:'Animales',funny:'Divertido',learning:'Aprender',adventure:'Aventura',family:'Familia',music:'Música',bedtime:'Dormir'},\n      fr:{all:'Tout',animals:'Animaux',funny:'Drôle',learning:'Apprendre',adventure:'Aventure',family:'Famille',music:'Musique',bedtime:'Coucher'},\n      de:{all:'Alle',animals:'Tiere',funny:'Lustig',learning:'Lernen',adventure:'Abenteuer',family:'Familie',music:'Musik',bedtime:'Schlafenszeit'},\n      it:{all:'Tutto',animals:'Animali',funny:'Divertente',learning:'Imparare',adventure:'Avventura',family:'Famiglia',music:'Musica',bedtime:'Nanna'},\n      tr:{all:'Tümü',animals:'Hayvanlar',funny:'Komik',learning:'Öğrenme',adventure:'Macera',family:'Aile',music:'Müzik',bedtime:'Uyku zamanı'},\n      ru:{all:'Все',animals:'Животные',funny:'Смешное',learning:'Обучение',adventure:'Приключения',family:'Семья',music:'Музыка',bedtime:'Перед сном'},\n      ar:{all:'الكل',animals:'حيوانات',funny:'مضحك',learning:'تعلّم',adventure:'مغامرة',family:'عائلة',music:'موسيقى',bedtime:'وقت النوم'},\n      hi:{all:'सभी',animals:'जानवर',funny:'मज़ेदार',learning:'सीखना',adventure:'रोमांच',family:'परिवार',music:'संगीत',bedtime:'सोने का समय'},\n      id:{all:'Semua',animals:'Hewan',funny:'Lucu',learning:'Belajar',adventure:'Petualangan',family:'Keluarga',music:'Musik',bedtime:'Waktu tidur'},\n      ja:{all:'すべて',animals:'どうぶつ',funny:'おもしろい',learning:'まなぶ',adventure:'ぼうけん',family:'かぞく',music:'おんがく',bedtime:'おやすみ'},\n      ko:{all:'전체',animals:'동물',funny:'재미',learning:'학습',adventure:'모험',family:'가족',music:'음악',bedtime:'잠자리'},\n      zh:{all:'全部',animals:'动物',funny:'搞笑',learning:'学习',adventure:'冒险',family:'家庭',music:'音乐',bedtime:'睡前'}\n    };""")

# Duplicate poster IDs occurred when the same title existed in browse + chat.
rep('kids/kids.js', "function cardHTML(item, compact) {\n    const id = 'kid-' + normalizeTitle(item.title).replace(/\\s+/g,'-');", "function cardHTML(item, compact, slot) {\n    const id = 'kid-' + (slot || 'card') + '-' + normalizeTitle(item.title).replace(/\\s+/g,'-');")
rep('kids/kids.js', "async function hydratePoster(item) {\n    if (!item.tmdb || typeof window.tmdbLookup !== 'function') return;\n    const id = 'kid-' + normalizeTitle(item.title).replace(/\\s+/g,'-');", "async function hydratePoster(item, slot) {\n    if (!item.tmdb || typeof window.tmdbLookup !== 'function') return;\n    const id = 'kid-' + (slot || 'card') + '-' + normalizeTitle(item.title).replace(/\\s+/g,'-');")
rep('kids/kids.js', "host.innerHTML = items.map(x => cardHTML(x, false)).join('');\n    items.slice(0, 24).forEach(hydratePoster);", "host.innerHTML = items.map((x,i) => cardHTML(x, false, 'grid-' + i)).join('');\n    items.slice(0, 24).forEach((x,i) => hydratePoster(x, 'grid-' + i));")
rep('kids/kids.js', "results.innerHTML = picks.map(x => cardHTML(x, true)).join('');\n    picks.forEach(hydratePoster);", "results.innerHTML = picks.map((x,i) => cardHTML(x, true, 'chat-' + i)).join('');\n    picks.forEach((x,i) => hydratePoster(x, 'chat-' + i));")

print('all patches applied')
