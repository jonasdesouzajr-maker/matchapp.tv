/* ============================================================
   © 2026 MatchApp.tv — All Rights Reserved.
   Proprietary source code. Not licensed for reproduction, scraping,
   or reuse in competing products. See /terms.html Section 4.
   ============================================================ */

console.log("Profile Engine 100.0: Identity Showcase, Email Sync & Dual Portfolios Active");

// ----------------------------------------------------
// STAR SIGN PERSONALITY → MATCHING HINTS
// ----------------------------------------------------
const STAR_SIGN_TRAITS = {
    "Aries": "Bold, fast-paced action and competitive stories",
    "Taurus": "Comfort watches, food, romance and beautiful worlds",
    "Gemini": "Witty dialogue, twists and clever ensemble stories",
    "Cancer": "Emotional family sagas and heartfelt dramas",
    "Leo": "Big, glamorous, star-driven blockbusters",
    "Virgo": "Smart procedurals, mysteries and detailed docs",
    "Libra": "Romance, beauty and balanced feel-good stories",
    "Scorpio": "Dark thrillers, secrets and psychological intensity",
    "Sagittarius": "Adventure, travel and world cinema",
    "Capricorn": "Ambition, power struggles and prestige drama",
    "Aquarius": "Sci-fi, dystopia and unconventional storytelling",
    "Pisces": "Dreamy, artistic and emotionally sweeping films"
};

const SIGN_SYMBOLS = {
    "Aries":"♈","Taurus":"♉","Gemini":"♊","Cancer":"♋","Leo":"♌","Virgo":"♍",
    "Libra":"♎","Scorpio":"♏","Sagittarius":"♐","Capricorn":"♑","Aquarius":"♒","Pisces":"♓"
};

function formatSign(sign) {
    if (!sign) return "N/A";
    return `${SIGN_SYMBOLS[sign] || ''} ${sign}`.trim();
}

// Pull the account email straight from Supabase Auth.
async function populateEmail() {
    const el = document.getElementById('lock-val-email');
    if (!el) return;
    const cached = localStorage.getItem('match_user_email');
    if (cached) el.innerText = cached;

    if (window.supabaseClient) {
        try {
            const { data } = await window.supabaseClient.auth.getUser();
            if (data && data.user && data.user.email) {
                el.innerText = data.user.email;
                localStorage.setItem('match_user_email', data.user.email);
            } else if (!cached) {
                el.innerText = "Not signed in";
            }
        } catch (e) {
            if (!cached) el.innerText = "Unavailable";
        }
    } else if (!cached) {
        el.innerText = "Not signed in";
    }
}

// ----------------------------------------------------
// PORTFOLIO TAB SWITCHING
// ----------------------------------------------------
window.switchPortfolioTab = function(tab) {
    const tabs = ['watchlater', 'seenit', 'audio'];
    tabs.forEach(t => {
        const panel = document.getElementById('panel-' + t);
        const btn = document.getElementById('tab-' + t);
        if (panel) panel.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
};

function calculateAgeFromDOB(dobString) {
    let parts = dobString.split('/');
    if(parts.length !== 3) return null;
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1; 
    let year = parseInt(parts[2], 10);
    
    let dob = new Date(year, month, day);
    if(isNaN(dob.getTime())) return null;

    let diffMs = Date.now() - dob.getTime();
    let ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
}

document.addEventListener('DOMContentLoaded', () => {
    const dobInput = document.getElementById('profile-dob');
    const ageDisplay = document.getElementById('profile-age-display');
    const picPreview = document.getElementById('profile-pic-preview');

    const savedAvatar = localStorage.getItem('match_custom_avatar');
    if (savedAvatar && picPreview) {
        picPreview.src = savedAvatar;
    }
    
    const savedAge = localStorage.getItem('match_user_age');
    if (savedAge && ageDisplay) {
        ageDisplay.style.display = 'inline-block';
        ageDisplay.innerText = `AI Profile: ${savedAge} Years Old`;
    }

    if(dobInput) {
        dobInput.addEventListener('input', function(e) {
            if (e.inputType === 'deleteContentBackward') return;
            let v = this.value.replace(/\D/g, ''); 
            if (v.length >= 3 && v.length <= 4) { this.value = v.slice(0,2) + '/' + v.slice(2); } 
            else if (v.length >= 5) { this.value = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4,8); }
            
            if (this.value.length === 10) {
                let calculatedAge = calculateAgeFromDOB(this.value);
                if (calculatedAge && ageDisplay) {
                    ageDisplay.style.display = 'inline-block';
                    ageDisplay.innerText = `AI Profile: ${calculatedAge} Years Old`;
                }
            }
        });
    }

    checkAndRenderProfileState();
    renderProfileGrids();
});

function checkAndRenderProfileState() {
    const isLocked = localStorage.getItem('match_profile_locked') === 'true';
    const savedName = localStorage.getItem('match_user_name') || "";
    const savedCountry = localStorage.getItem('match_user_country') || "";
    const savedDob = localStorage.getItem('match_user_dob') || "";
    const savedSign = localStorage.getItem('match_user_sign') || "";

    const editableSection = document.getElementById('editable-fields-section');
    const lockedCard = document.getElementById('locked-info-card');
    const saveBtn = document.getElementById('save-profile-btn');
    const instructionsText = document.getElementById('profile-instructions-text');
    const changeBadge = document.getElementById('avatar-change-badge');

    if (isLocked) {
        if (editableSection) editableSection.style.display = 'none';
        if (lockedCard) {
            lockedCard.style.display = 'block';
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
            setVal('lock-val-name', savedName || "User");
            setVal('lock-val-country', savedCountry || "N/A");
            setVal('lock-val-dob', savedDob || "N/A");
            setVal('lock-val-sign', formatSign(savedSign));
            setVal('lock-val-age', localStorage.getItem('match_user_age') ? `${localStorage.getItem('match_user_age')} years old` : "N/A");
            setVal('lock-val-sign-trait', STAR_SIGN_TRAITS[savedSign] || "Shapes your recommended themes");
            populateEmail();
        }
        if (instructionsText) instructionsText.innerHTML = "Your core identity is locked and permanently guiding your AI Matches.";
        if (changeBadge) changeBadge.innerText = "Avatar Locked";
        
        if (saveBtn) {
            saveBtn.innerText = "🔒 Identity Locked for AI Matching";
            saveBtn.style.background = "#555";
            saveBtn.style.borderColor = "#555";
            saveBtn.style.boxShadow = "none";
            saveBtn.onclick = () => alert("Core identity fields are permanently locked to maintain consistent AI matching.");
        }
    } else {
        if (savedName) document.getElementById('profile-name').value = savedName;
        if (savedCountry) document.getElementById('profile-country').value = savedCountry;
        if (savedDob) document.getElementById('profile-dob').value = savedDob;
        if (savedSign) document.getElementById('profile-starsign').value = savedSign;
    }
}

window.handleAvatar = function(event) {
    if (localStorage.getItem('match_profile_locked') === 'true') {
        alert("Avatar is locked alongside your profile identity.");
        return;
    }
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('profile-pic-preview').src = base64;
        localStorage.setItem('match_custom_avatar', base64);
        
        const navImg = document.getElementById('nav-avatar-img');
        if (navImg) { navImg.src = base64; navImg.style.display = 'inline-block'; }

        if (window.supabaseClient) {
            window.supabaseClient.auth.getUser().then(({ data }) => {
                if (data && data.user) {
                    window.supabaseClient.from('profiles').upsert({ id: data.user.id, avatar_url: base64 });
                }
            });
        }
    };
    reader.readAsDataURL(file);
};

window.saveProfileData = function() {
    const isLocked = localStorage.getItem('match_profile_locked') === 'true';
    if(isLocked) return;

    const name = document.getElementById('profile-name').value.trim();
    const country = document.getElementById('profile-country').value.trim();
    const dob = document.getElementById('profile-dob').value.trim();
    const sign = document.getElementById('profile-starsign').value;

    if(!name || !country || !dob || !sign) { 
        alert("Please complete all fields (Full Name, Country, DOB, and Zodiac Sign)."); 
        return; 
    }
    
    let age = calculateAgeFromDOB(dob);
    if (!age) { alert("Please enter a valid Birthdate (DD/MM/YYYY)."); return; }

    const confirmLock = confirm(`⚠️ LOCK IDENTITY CONFIRMATION:\n\nName: ${name}\nCountry: ${country}\nAge: ${age} years old\nSign: ${sign}\n\nThis data will be permanently saved for your AI Concierge. Lock identity now?`);
    if(!confirmLock) return;

    localStorage.setItem('match_user_name', name);
    localStorage.setItem('match_user_country', country);
    localStorage.setItem('match_user_dob', dob);
    localStorage.setItem('match_user_sign', sign);
    localStorage.setItem('match_user_age', age);
    localStorage.setItem('match_profile_locked', 'true');

    if (window.supabaseClient) {
        window.supabaseClient.auth.getUser().then(({ data }) => {
            if (data && data.user) {
                window.supabaseClient.from('profiles').upsert({
                    id: data.user.id,
                    full_name: name,
                    country: country,
                    dob: dob,
                    star_sign: sign,
                    age: age,
                    profile_locked: true
                });
            }
        });
    }

    alert("✅ Core Identity Locked! The AI will now generate hyper-personalized matches for you.");
    window.location.reload();
};

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
}

function platformFallbackUrl(platform, title) {
    const map = {
        "Netflix": t => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
        "Prime Video": t => `https://www.primevideo.com/search?phrase=${encodeURIComponent(t)}`,
        "Disney+": t => `https://www.disneyplus.com/search?q=${encodeURIComponent(t)}`,
        "Max": t => `https://www.max.com/search?q=${encodeURIComponent(t)}`,
        "Apple TV+": t => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,
        "Globoplay": t => `https://globoplay.globo.com/busca/?q=${encodeURIComponent(t)}`,
        "Crunchyroll": t => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,
        "Viki": t => `https://www.viki.com/search?q=${encodeURIComponent(t)}`,
        "Spotify": t => `https://open.spotify.com/search/${encodeURIComponent(t)}`,
        "Apple Music": t => `https://music.apple.com/search?term=${encodeURIComponent(t)}`,
        "Apple Podcasts": t => `https://podcasts.apple.com/search?term=${encodeURIComponent(t)}`,
        "YouTube Music": t => `https://music.youtube.com/search?q=${encodeURIComponent(t)}`,
        "Audible": t => `https://www.audible.com/search?keywords=${encodeURIComponent(t)}`
    };
    if (map[platform]) return map[platform](title);
    return `https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}`;
}

// Cards are clickable: tapping one opens where the title actually plays.
function buildPosterCard(item, accent) {
    const title = typeof item === 'string' ? item : (item.title || 'Untitled');
    let poster = typeof item === 'string' ? '' : (item.posterUrl || '');
    const platform = typeof item === 'string' ? '' : (item.platform || '');
    const isAudio = typeof item === 'object' && item.isAudio;
    const link = (typeof item === 'object' && item.streamUrl) ? item.streamUrl : platformFallbackUrl(platform, title);

    const safeTitle = escapeHtml(title);

    // The user's own private note for this title, written on the match screen.
    // A note you can't find again is pointless, so it surfaces right on the
    // history card rather than being buried behind another click.
    let noteText = '';
    try {
        const notes = JSON.parse(localStorage.getItem('match_titleNotes') || '{}');
        if (notes && notes[title] && notes[title].text) noteText = notes[title].text;
    } catch (e) {}
    const noteBadge = noteText
        ? `<div class="poster-note-badge" title="${escapeHtml(noteText)}">📝</div>`
        : '';
    const hasPoster = poster && poster.trim() !== '' && poster !== 'invalid-image' && poster !== 'fallback';
    const imgTag = hasPoster
        ? `<img src="${escapeHtml(poster)}" alt="${safeTitle}" style="width:100%; height:100%; object-fit:contain; background:#0b0303; display:block;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
        : '';
    const fallbackDisplay = hasPoster ? 'none' : 'flex';
    const cta = isAudio ? '🎧 Listen Now' : '▶ Stream Now';

    // Which list this card belongs to, so the delete button knows what to
    // remove it from. Audio items can live in either underlying list, so the
    // remover checks both rather than guessing from the tab.
    const listKind = isAudio ? 'audio' : (accent === 'var(--gold)' ? 'saved' : 'seen');

    return `
      <div class="poster-cell">
        <button type="button" class="poster-del" data-title="${safeTitle}" data-list="${listKind}"
                onclick="removeFromList(this)" aria-label="Remove ${safeTitle}"
                title="Remove from this list">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
        <a class="poster-card" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" title="Open ${safeTitle}"
           style="position:relative; display:block; width:100%; height:230px; border-radius:12px; overflow:hidden; border:1px solid ${accent}; box-shadow:0 5px 20px rgba(0,0,0,0.9); text-decoration:none; transition:transform 0.3s ease, box-shadow 0.3s ease;"
           onmouseover="this.style.transform='translateY(-6px) scale(1.03)'; this.style.boxShadow='0 14px 34px rgba(0,0,0,0.95)'; this.querySelector('.card-cta').style.opacity='1';"
           onmouseout="this.style.transform='none'; this.style.boxShadow='0 5px 20px rgba(0,0,0,0.9)'; this.querySelector('.card-cta').style.opacity='0';">
            ${imgTag}
            <div class="css-poster-fallback" style="display:${fallbackDisplay}; background:linear-gradient(135deg,#130734,#6B3FA0); width:100%; height:100%; align-items:center; justify-content:center; text-align:center; padding:10px; box-sizing:border-box; color:var(--gold); font-weight:900; font-size:16px; text-transform:uppercase; text-shadow:0 2px 8px rgba(0,0,0,0.9); box-shadow: inset 0 0 30px rgba(0,0,0,0.9);">
                ${safeTitle}
            </div>
            ${noteBadge}
            ${platform ? `<div style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.85); color:${accent}; font-size:9px; font-weight:900; padding:4px 8px; border-radius:6px; text-transform:uppercase; border:1px solid ${accent};">${escapeHtml(platform)}</div>` : ''}
            <div class="card-cta" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.62); color:var(--gold-glow); font-weight:900; font-size:14px; text-transform:uppercase; opacity:0; transition:opacity 0.3s ease;">${cta}</div>
            <div class="poster-title" style="position:absolute; bottom:0; width:100%; background:linear-gradient(transparent, rgba(0,0,0,0.95)); color:#fff; font-size:12px; padding:10px 4px 4px 4px; text-align:center; font-weight:bold; border-top:1px solid ${accent};">${safeTitle}</div>
        </a>
        ${noteText ? `<p class="poster-note">${escapeHtml(noteText)}</p>` : ''}
      </div>
    `;
}

window.renderBlockedCategories = function () {
    const card = document.getElementById('blocked-card');
    const list = document.getElementById('blocked-list');
    if (!card || !list) return;

    const blocked = (typeof window.getBlockedCategories === 'function')
        ? window.getBlockedCategories() : [];
    if (!blocked.length) { card.style.display = 'none'; return; }

    const pretty = (v) => String(v).replace(/\b\w/g, c => c.toUpperCase());
    list.innerHTML = '';
    blocked.forEach(b => {
        // Built as a real element rather than an HTML string: category names
        // come from catalog data and could contain quotes, which would break
        // an inline onclick attribute.
        const btn = document.createElement('button');
        btn.className = 'blocked-chip';
        btn.textContent = pretty(b);
        btn.addEventListener('click', () => window.unblockCategoryUI(b));
        list.appendChild(btn);
    });
    card.style.display = 'block';
};

window.unblockCategoryUI = function (cat) {
    if (typeof window.unblockCategory === 'function') window.unblockCategory(cat);
    window.renderBlockedCategories();
    if (window.showToast) showToast('\u2705 "' + cat + '" can appear in your matches again.');
};

window.renderTasteDNA = function () {
    const card = document.getElementById('taste-dna-card');
    if (!card) return;

    const emptyEl = document.getElementById('taste-empty');
    const bodyEl  = document.getElementById('taste-body');
    const confEl  = document.getElementById('taste-confidence');
    if (typeof window.computeTasteDNA !== 'function') { card.style.display = 'none'; return; }

    const dna = window.computeTasteDNA();

    if (!dna || !dna.ready) {
        if (emptyEl) emptyEl.style.display = 'block';
        if (bodyEl) bodyEl.style.display = 'none';
        if (confEl) confEl.textContent = 'Not enough data yet';
        const sub = document.getElementById('taste-empty-sub');
        if (sub && dna && dna.known > 0) {
            const left = Math.max(0, (dna.needed || 4) - dna.known);
            sub.textContent = `You're ${left} title${left === 1 ? '' : 's'} away. Save what interests you, mark what you've seen, and tap Loved It or Not For Me — we won't guess at your taste before we actually know it.`;
        }
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (bodyEl) bodyEl.style.display = 'block';
    if (confEl) confEl.textContent = dna.confidence + ' signal';

    const head = document.getElementById('taste-headline');
    if (head) head.textContent = dna.headline;

    const pretty = (s) => String(s || '').replace(/\b\w/g, c => c.toUpperCase());

    const bars = document.getElementById('taste-moods');
    if (bars) {
        bars.innerHTML = (dna.moods || []).map(m => `
            <div class="taste-bar-row">
                <span class="taste-bar-name">${pretty(m.key)}</span>
                <span class="taste-bar-track"><span class="taste-bar-fill" style="width:${m.pct}%"></span></span>
                <span class="taste-bar-pct">${m.pct}%</span>
            </div>`).join('');
    }

    const chips = (id, arr) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = (arr || []).map(x => `<span>${pretty(x.key || x)}</span>`).join('');
    };
    chips('taste-cats', dna.cats);
    chips('taste-platforms', dna.platforms);

    const avoidWrap = document.getElementById('taste-avoids-wrap');
    if (avoidWrap) {
        if (dna.avoids && dna.avoids.length) {
            avoidWrap.style.display = 'block';
            chips('taste-avoids', dna.avoids);
        } else {
            avoidWrap.style.display = 'none';
        }
    }

    const note = document.getElementById('taste-footnote');
    if (note) {
        note.textContent = `Read from ${dna.known} title${dna.known === 1 ? '' : 's'} you've reacted to. `
            + `When you leave a filter on "Any", we lean on this — but anything you pick explicitly always wins.`;
    }
};

window.renderProfileGrids = function() {
    const savedListData = JSON.parse(localStorage.getItem('match_savedList') || '[]');
    const seenListData = JSON.parse(localStorage.getItem('match_seenList') || '[]');

    const isAudioItem = i => typeof i === 'object' && i.isAudio === true;

    // Audio picks (music, playlists, singles, podcasts, audiobooks) live in their
    // own tab so they don't get mixed into the watch queues.
    const audioItems  = [...savedListData, ...seenListData].filter(isAudioItem);
    const watchLater  = savedListData.filter(i => !isAudioItem(i));
    const seenVisual  = seenListData.filter(i => !isAudioItem(i));

    const fill = (id, data, accent, emptyMsg) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = data.length === 0
            ? `<p style="color:#aaa; font-size:15px; font-style:italic;">${emptyMsg}</p>`
            : data.map(item => buildPosterCard(item, accent)).join('');
    };

    fill('portfolio-grid', watchLater, 'var(--gold)', 'Your Watch Later portfolio is empty. Go match!');
    fill('seen-grid', seenVisual, 'rgba(255,255,255,0.55)', "You haven't marked anything as seen yet.");
    fill('audio-grid', audioItems, '#1DB954', 'No saved music, playlists, singles or podcasts yet.');

    const setCount = (id, n) => { const e = document.getElementById(id); if (e) e.innerText = n; };
    setCount('count-watchlater', watchLater.length);
    setCount('count-seenit', seenVisual.length);
    setCount('count-audio', audioItems.length);

    // Taste DNA reads the same lists, so refresh it on the same cycle.
    if (typeof window.renderTasteDNA === 'function') window.renderTasteDNA();
    if (typeof window.renderBlockedCategories === 'function') window.renderBlockedCategories();
};

// ----------------------------------------------------
// VOICE & AI SETTINGS
// Populates the browser's available Web Speech API voices, prioritizing
// ones matching the current UI language, and persists the user's choice
// (voice name, speaking rate, auto-read toggle) to localStorage so
// discover.js can read them when it speaks an AI answer aloud.
// ----------------------------------------------------
function populateVoiceList() {
    const select = document.getElementById('voice-select');
    const note = document.getElementById('voice-support-note');
    if (!select) return;

    if (!('speechSynthesis' in window)) {
        if (note) note.style.display = 'block';
        select.disabled = true;
        return;
    }

    const voices = speechSynthesis.getVoices();
    if (!voices.length) return; // Chrome loads voices async — onvoiceschanged will retry.

    const currentLang = window.MATCH_LANG || 'en';
    const savedVoice = localStorage.getItem('match_voice_name');

    // Sort so voices matching the current UI language float to the top.
    const sorted = [...voices].sort((a, b) => {
        const aMatch = a.lang && a.lang.toLowerCase().startsWith(currentLang.split('-')[0]);
        const bMatch = b.lang && b.lang.toLowerCase().startsWith(currentLang.split('-')[0]);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return a.name.localeCompare(b.name);
    });

    select.innerHTML = sorted.map(v =>
        `<option value="${v.name.replace(/"/g, '&quot;')}">${v.name} (${v.lang})</option>`
    ).join('');

    if (savedVoice && sorted.some(v => v.name === savedVoice)) select.value = savedVoice;
    else if (sorted.length) { select.value = sorted[0].name; localStorage.setItem('match_voice_name', sorted[0].name); }
}

window.onVoiceSettingChange = function() {
    const select = document.getElementById('voice-select');
    if (select && select.value) localStorage.setItem('match_voice_name', select.value);
};

window.onVoiceRateChange = function() {
    const slider = document.getElementById('voice-rate');
    const label = document.getElementById('voice-rate-value');
    if (!slider) return;
    const rate = parseFloat(slider.value).toFixed(1);
    if (label) label.textContent = rate + '×';
    localStorage.setItem('match_voice_rate', rate);
};

window.onVoiceAutoreadChange = function() {
    const box = document.getElementById('voice-autoread');
    if (box) localStorage.setItem('match_voice_autoread', box.checked ? 'true' : 'false');
};

window.testVoiceSample = function() {
    if (!('speechSynthesis' in window)) return;
    const select = document.getElementById('voice-select');
    const rate = parseFloat(localStorage.getItem('match_voice_rate') || '1');
    const sampleByLang = {
        'en': "Hi! I'm your MatchApp AI concierge. This is how I'll sound.",
        'pt-BR': "Oi! Eu sou o seu concierge de IA do MatchApp. É assim que eu vou soar.",
        'es': "¡Hola! Soy tu conserje de IA de MatchApp. Así es como sonaré.",
        'fr': "Bonjour ! Je suis votre concierge IA MatchApp. Voici à quoi je ressemblerai.",
        'de': "Hallo! Ich bin Ihr MatchApp-KI-Concierge. So werde ich klingen.",
        'it': "Ciao! Sono il tuo concierge IA di MatchApp. Ecco come suonerò.",
        'tr': "Merhaba! Ben MatchApp yapay zekâ danışmanınızım. Böyle duyulacağım.",
        'ru': "Привет! Я ваш ИИ-консьерж MatchApp. Вот как я буду звучать.",
        'ar': "مرحبًا! أنا مساعدك الذكي في MatchApp. هكذا سيكون صوتي.",
        'hi': "नमस्ते! मैं आपका MatchApp AI कंसीयज हूँ। मैं ऐसे सुनाई दूँगा।",
        'id': "Hai! Saya concierge AI MatchApp Anda. Begini suara saya nanti.",
        'ja': "こんにちは！MatchAppのAIコンシェルジュです。こんな声でお話しします。",
        'ko': "안녕하세요! 저는 MatchApp AI 컨시어지입니다. 이런 목소리로 안내해 드릴게요.",
        'zh': "你好！我是你的 MatchApp AI 管家，我的声音听起来是这样的。"
    };
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(sampleByLang[window.MATCH_LANG] || sampleByLang.en);
    const voices = speechSynthesis.getVoices();
    const chosen = select && select.value ? voices.find(v => v.name === select.value) : null;
    if (chosen) { utter.voice = chosen; utter.lang = chosen.lang; }
    utter.rate = rate;
    speechSynthesis.speak(utter);
};

document.addEventListener('DOMContentLoaded', () => {
    const rateSlider = document.getElementById('voice-rate');
    const autoreadBox = document.getElementById('voice-autoread');
    if (rateSlider) {
        const savedRate = localStorage.getItem('match_voice_rate');
        if (savedRate) { rateSlider.value = savedRate; onVoiceRateChange(); }
    }
    if (autoreadBox) autoreadBox.checked = localStorage.getItem('match_voice_autoread') === 'true';

    populateVoiceList();
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = populateVoiceList;
});

// Re-sort the voice list toward the newly chosen language.
document.addEventListener('matchapp:langchange', populateVoiceList);
/* ============================================================
   AVATAR PICKER + NICKNAME
   Presets and resolution logic live in avatars.js; this is the profile-page
   UI that drives them.
   ============================================================ */

function renderAvatarPicker() {
    const grid = document.getElementById('avatar-preset-grid');
    if (!grid || !window.AVATAR_PRESETS) return;
    const current = localStorage.getItem('match_preset_avatar') || '';
    grid.innerHTML = Object.entries(window.AVATAR_PRESETS).map(([key, p]) => `
        <button type="button" class="avatar-opt" data-key="${key}"
                aria-pressed="${key === current ? 'true' : 'false'}"
                title="${escapeHtml(p.label)}" aria-label="${escapeHtml(p.label)}"
                onclick="choosePresetAvatar('${key}')">
            <img src="${window.avatarSVG(key, 64)}" alt="">
        </button>`).join('');
}

window.choosePresetAvatar = function (key) {
    if (!window.AVATAR_PRESETS || !window.AVATAR_PRESETS[key]) return;
    try {
        localStorage.setItem('match_preset_avatar', key);
        // A preset is an explicit choice, so it should win over a previously
        // uploaded file until the user clears it — otherwise picking one would
        // appear to do nothing.
        localStorage.removeItem('match_custom_avatar');
    } catch (e) {}

    const src = window.avatarSVG(key, 260);
    const preview = document.getElementById('profile-pic-preview');
    if (preview) preview.src = src;
    if (typeof window.renderUserAvatar === 'function') window.renderUserAvatar();
    renderAvatarPicker();

    // Best-effort sync so the choice follows the account, not just this device.
    if (window.supabaseClient) {
        window.supabaseClient.auth.getUser().then(({ data }) => {
            if (data && data.user) {
                window.supabaseClient.from('profiles')
                    .upsert({ id: data.user.id, avatar_url: src }, { onConflict: 'id' });
            }
        }).catch(() => {});
    }
};

window.clearPresetAvatar = function () {
    try { localStorage.removeItem('match_preset_avatar'); } catch (e) {}
    const src = (typeof window.resolveUserAvatar === 'function') ? window.resolveUserAvatar() : null;
    const preview = document.getElementById('profile-pic-preview');
    if (preview && src) preview.src = src;
    if (typeof window.renderUserAvatar === 'function') window.renderUserAvatar();
    renderAvatarPicker();
};

let nicknameTimer = null;
window.saveNickname = function (value) {
    const clean = String(value || '').trim().slice(0, 30);
    try { localStorage.setItem('match_user_nickname', clean); } catch (e) {}

    const status = document.getElementById('pf-nickname-status');
    // Debounced so it doesn't write to the database on every keystroke.
    clearTimeout(nicknameTimer);
    nicknameTimer = setTimeout(() => {
        if (window.supabaseClient) {
            window.supabaseClient.auth.getUser().then(({ data }) => {
                if (data && data.user) {
                    window.supabaseClient.from('profiles')
                        .upsert({ id: data.user.id, nickname: clean }, { onConflict: 'id' })
                        .then(() => {}, () => {}); // column may not exist yet; local copy still works
                }
            }).catch(() => {});
        }
        if (status) {
            status.textContent = clean
                ? (window.t ? t('pf.nicknameSaved') : `Our AI will call you ${clean}.`).replace('{n}', clean)
                : '';
            setTimeout(() => { if (status) status.textContent = ''; }, 2600);
        }
    }, 600);
};

document.addEventListener('DOMContentLoaded', () => {
    renderAvatarPicker();
    const nick = document.getElementById('pf-nickname');
    if (nick) nick.value = localStorage.getItem('match_user_nickname') || '';
    // Show whatever avatar currently resolves, including the Google photo.
    const preview = document.getElementById('profile-pic-preview');
    const src = (typeof window.resolveUserAvatar === 'function') ? window.resolveUserAvatar() : null;
    if (preview && src) preview.src = src;
});

/* ============================================================
   SETTINGS PANEL
   Wires the controls in Profile > Settings to MatchSettings.

   Sliders fire two kinds of event on purpose: `input` updates the page live
   so the user sees the change as they drag, but passes sync:false so it does
   not hit the network forty times; `change` fires once when they let go and
   is what actually syncs to the account.
   ============================================================ */
(function () {
    'use strict';

    function initSettingsPanel() {
        if (!window.MatchSettings) return;
        const S = window.MatchSettings;
        const $ = id => document.getElementById(id);
        if (!$('set-fontscale')) return;   // not on this page

        const cur = S.get();

        /* ---- text size ---- */
        const fs = $('set-fontscale'), fsOut = $('set-fontscale-val');
        fs.value = cur.fontScale;
        fsOut.textContent = Math.round(cur.fontScale * 100) + '%';
        fs.addEventListener('input', () => {
            const v = parseFloat(fs.value);
            fsOut.textContent = Math.round(v * 100) + '%';
            S.set('fontScale', v, { sync: false });   // live preview, no network
        });
        fs.addEventListener('change', () => S.set('fontScale', parseFloat(fs.value)));

        /* ---- speaking speed ---- */
        const rate = $('set-rate'), rateOut = $('set-rate-val');
        rate.value = cur.voiceRate;
        rateOut.textContent = parseFloat(cur.voiceRate).toFixed(1) + '×';
        rate.addEventListener('input', () => {
            rateOut.textContent = parseFloat(rate.value).toFixed(1) + '×';
            S.set('voiceRate', parseFloat(rate.value), { sync: false });
        });
        rate.addEventListener('change', () => S.set('voiceRate', parseFloat(rate.value)));

        /* ---- pitch ---- */
        const pitch = $('set-pitch'), pitchOut = $('set-pitch-val');
        pitch.value = cur.voicePitch;
        pitchOut.textContent = parseFloat(cur.voicePitch).toFixed(1);
        pitch.addEventListener('input', () => {
            pitchOut.textContent = parseFloat(pitch.value).toFixed(1);
            S.set('voicePitch', parseFloat(pitch.value), { sync: false });
        });
        pitch.addEventListener('change', () => S.set('voicePitch', parseFloat(pitch.value)));

        /* ---- toggles ---- */
        [['set-compact','compactCards'], ['set-lazy','lazyDefault'],
         ['set-autoread','autoRead'],    ['set-motion','reduceMotion']].forEach(([id, key]) => {
            const el = $(id);
            if (!el) return;
            el.checked = !!cur[key];
            el.addEventListener('change', () => S.set(key, el.checked));
        });

        /* ---- voice list ----
           Populated asynchronously: getVoices() is empty on first call in most
           browsers and fills in on the voiceschanged event. Grouping by
           language matters because a device can expose 40+ voices and an
           ungrouped list is unusable. */
        S.listVoices().then(voices => {
            const sel = $('set-voice');
            if (!sel) return;
            if (!voices.length) {
                $('voice-note').textContent = 'No voices are available in this browser.';
                sel.disabled = true;
                return;
            }
            const byLang = {};
            voices.forEach(v => { (byLang[v.lang] = byLang[v.lang] || []).push(v); });

            // Surface the user's own language first — that is the group they
            // almost certainly want, and scrolling past 30 others to find it
            // is the difference between a usable control and an abandoned one.
            const mine = (window.MATCH_LANG || 'en').toLowerCase().split('-')[0];
            const langs = Object.keys(byLang).sort((a, b) => {
                const am = a.toLowerCase().startsWith(mine), bm = b.toLowerCase().startsWith(mine);
                if (am !== bm) return am ? -1 : 1;
                return a.localeCompare(b);
            });

            langs.forEach(lang => {
                const group = document.createElement('optgroup');
                group.label = lang;
                byLang[lang].forEach(v => {
                    const o = document.createElement('option');
                    o.value = v.voiceURI;
                    o.textContent = v.name.replace(/^(Microsoft|Google)\s+/, '');
                    group.appendChild(o);
                });
                sel.appendChild(group);
            });
            sel.value = cur.voiceURI || '';
            sel.addEventListener('change', () => S.set('voiceURI', sel.value));
        });
    }

    window.testVoice = function () {
        if (!('speechSynthesis' in window)) {
            if (window.showToast) showToast('Voice playback is not supported in this browser.', true);
            return;
        }
        const S = window.MatchSettings;
        speechSynthesis.cancel();
        S.listVoices().then(voices => {
            const u = new SpeechSynthesisUtterance(
                "Hi, I'm your MatchApp concierge. Tell me what you're in the mood for.");
            const v = S.resolveVoice(voices, window.MATCH_LANG || 'en');
            if (v) { u.voice = v; u.lang = v.lang; }
            u.rate = S.get('voiceRate');
            u.pitch = S.get('voicePitch');
            speechSynthesis.speak(u);
        });
    };

    window.resetSettings = function () {
        if (!window.MatchSettings) return;
        window.MatchSettings.reset();
        initSettingsPanel();   // repaint the controls from the restored values
        if (window.showToast) showToast('Settings reset to defaults.');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSettingsPanel);
    } else {
        initSettingsPanel();
    }
})();

/* ============================================================
   REMOVE A TITLE FROM A SAVED LIST

   Deliberately does more than splice an array: a title sitting in Watch
   Later or Seen It is also excluded from future matches, so removing it from
   the visible list without clearing that exclusion would leave the user with
   a title they can neither see nor ever be matched with again — invisible
   and permanently suppressed. Both are cleared together.
   ============================================================ */
window.removeFromList = function (btn) {
    const title = btn.getAttribute('data-title');
    const kind  = btn.getAttribute('data-list');
    if (!title) return;

    const strip = (key) => {
        let arr = [];
        try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return false; }
        const before = arr.length;
        arr = arr.filter(i => (typeof i === 'string' ? i : (i && i.title)) !== title);
        if (arr.length === before) return false;
        localStorage.setItem(key, JSON.stringify(arr));
        return true;
    };

    // Audio can sit in either list, so clear both for that case.
    let removed = false;
    if (kind === 'saved' || kind === 'audio') removed = strip('match_savedList') || removed;
    if (kind === 'seen'  || kind === 'audio') removed = strip('match_seenList')  || removed;

    // The title is eligible to be matched again now, so drop the private note
    // too — a note about something no longer on any list is orphaned data the
    // user has no way to reach or delete.
    try {
        const notes = JSON.parse(localStorage.getItem('match_titleNotes') || '{}');
        if (notes[title]) { delete notes[title]; localStorage.setItem('match_titleNotes', JSON.stringify(notes)); }
    } catch (e) {}

    // Animate out, then repaint. The cell is removed visually first so the
    // grid does not visibly jump before the fade finishes.
    const cell = btn.closest('.poster-cell');
    if (cell) {
        cell.classList.add('is-removing');
        setTimeout(() => { if (window.renderProfileGrids) window.renderProfileGrids(); }, 220);
    } else if (window.renderProfileGrids) {
        window.renderProfileGrids();
    }

    // app.js reads seenList/savedList into module variables once at load, and
    // the match engine builds its exclusion set from those — not from
    // localStorage directly. Navigating to the homepage reloads app.js so it
    // would pick this up anyway, but refreshing them here means the title is
    // matchable immediately, without depending on a reload happening.
    try {
        if (Array.isArray(window.seenList) || typeof seenList !== 'undefined') {
            const fresh = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } };
            if (typeof window.seenList !== 'undefined')  window.seenList  = fresh('match_seenList');
            if (typeof window.savedList !== 'undefined') window.savedList = fresh('match_savedList');
        }
    } catch (e) {}

    if (window.showToast) {
        showToast(`Removed "${title}" — it can be matched again.`);
    }
    if (window.track) window.track('title_removed', { title: title, list: kind });

    // Mirror to the account so the removal follows the user to other devices.
    syncListsToAccount();
};

/* Debounced: deleting several titles in a row should be one write, not one
   per tap. Silent on failure — a sync problem must never block the UI. */
let listSyncTimer = null;
function syncListsToAccount() {
    clearTimeout(listSyncTimer);
    listSyncTimer = setTimeout(async () => {
        const sb = window.supabaseClient;
        if (!sb) return;
        try {
            const { data: { user } } = await sb.auth.getUser();
            if (!user) return;
            await sb.auth.updateUser({ data: {
                match_savedList: JSON.parse(localStorage.getItem('match_savedList') || '[]'),
                match_seenList:  JSON.parse(localStorage.getItem('match_seenList')  || '[]')
            }});
        } catch (e) {}
    }, 800);
}
