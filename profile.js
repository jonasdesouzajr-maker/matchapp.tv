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
    const tabs = ['history', 'watchlater', 'seenit', 'audio', 'notforme'];
    if (!tabs.includes(tab)) tab = 'history';
    tabs.forEach(t => {
        const panel = document.getElementById('panel-' + t);
        const btn = document.getElementById('tab-' + t);
        if (panel) panel.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
};

function calculateAgeFromDOB(value) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;
    const [day,month,year]=value.split('/').map(Number), birth=new Date(year,month-1,day), now=new Date();
    if (birth.getFullYear()!==year || birth.getMonth()!==month-1 || birth.getDate()!==day || birth>now) return null;
    let age=now.getFullYear()-year;
    if (now.getMonth()<month-1 || (now.getMonth()===month-1 && now.getDate()<day)) age--;
    return age>=0 && age<=120 ? age : null;
}

function renderProfileAgeLabel(node, age) {
    if (!node) return;
    const render = () => { node.innerText = window.MatchProfileDetailsI18n?.text('ageSummary', {age}) || `AI Profile: ${age} Years Old`; };
    if (window.MatchProfileDetailsI18n) window.MatchProfileDetailsI18n.bind(node, render);
    else render();
}

document.addEventListener('DOMContentLoaded', () => {
    const dobInput = document.getElementById('profile-dob');
    const ageDisplay = document.getElementById('profile-age-display');
    
    const savedAge = localStorage.getItem('match_user_age');
    if (savedAge && ageDisplay) {
        ageDisplay.style.display = 'inline-block';
        renderProfileAgeLabel(ageDisplay, savedAge);
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
                    renderProfileAgeLabel(ageDisplay, calculatedAge);
                }
            }
        });
    }

    document.getElementById('identity-load-retry')?.addEventListener('click', () => { void window.retryLockedProfile(); });
    checkAndRenderProfileState();
    renderProfileGrids();
});

function checkAndRenderProfileState(event) {
    const state=window.matchProfileState || {status:'loading'};
    const pending=state.status!=='ready';
    // A language repaint must not hydrate over edits or unlock a pending save.
    const languageRefresh=event?.type==='matchapp:langchange' && !pending && localStorage.getItem('match_profile_locked')!=='true';
    const notice=document.getElementById('identity-load-status');
    const retry=document.getElementById('identity-load-retry');
    const messages=localStorage.getItem('match_lang')==='pt-BR'
        ? {loading:'Carregando sua identidade salva…',error:'Não foi possível verificar sua identidade. Seus dados continuam protegidos. Tente novamente.',signedout:'Entre na sua conta para recuperar sua identidade salva.',retry:'Tentar novamente',signin:'Entrar'}
        : {loading:'Loading your saved identity…',error:'Could not verify your saved identity. Your details remain protected. Please retry.',signedout:'Sign in to restore your saved identity.',retry:'Try again',signin:'Sign in'};
    if(window.MatchProfileDetailsI18n){
        const keys={loading:'identityLoading',error:'identityUnavailable',signedout:'identitySignIn',retry:'identityRetry',signin:'identityEnter'};
        for(const [stateKey,copyKey] of Object.entries(keys))messages[stateKey]=window.MatchProfileDetailsI18n.text(copyKey);
    }
    if(notice){notice.hidden=!pending;notice.textContent=messages[state.status]||messages.loading;}
    if(retry){retry.hidden=!['error','signedout'].includes(state.status);retry.textContent=messages[state.status==='signedout'?'signin':'retry'];}
    if(!languageRefresh)document.querySelectorAll('#editable-fields-section input,#editable-fields-section select').forEach(el=>el.disabled=pending);
    if(pending){
        const form=document.getElementById('editable-fields-section'),card=document.getElementById('locked-info-card'),save=document.getElementById('save-profile-btn');
        if(form)form.style.display='none';if(card)card.style.display='none';if(save){save.disabled=true;save.hidden=true;}
        return;
    }
    const save=document.getElementById('save-profile-btn');if(save)save.hidden=false;
    const isLocked = localStorage.getItem('match_profile_locked') === 'true';
    const savedName = localStorage.getItem('match_user_name') || "";
    const savedCountry = localStorage.getItem('match_user_country') || "";
    const savedDob = localStorage.getItem('match_user_dob') || "";
    const savedSign = localStorage.getItem('match_user_sign') || "";

    const editableSection = document.getElementById('editable-fields-section');
    const lockedCard = document.getElementById('locked-info-card');
    const saveBtn = document.getElementById('save-profile-btn');
    const instructionsText = document.getElementById('profile-instructions-text');

    if (isLocked) {
        if (editableSection) editableSection.style.display = 'none';
        if (lockedCard) {
            lockedCard.style.display = 'block';
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
            setVal('lock-val-name', savedName || "User");
            setVal('lock-val-country', savedCountry || "N/A");
            setVal('lock-val-region', localStorage.getItem('match_user_region') || 'N/A');
            setVal('lock-val-dob', savedDob || "N/A");
            setVal('lock-val-sign', formatSign(savedSign));
            setVal('lock-val-age', localStorage.getItem('match_user_age') ? (window.MatchProfileDetailsI18n?.text('ageValue', {age:localStorage.getItem('match_user_age')}) || `${localStorage.getItem('match_user_age')} years old`) : "N/A");
            setVal('lock-val-sign-trait', STAR_SIGN_TRAITS[savedSign] || "Shapes your recommended themes");
            populateEmail();
        }
        if (instructionsText) instructionsText.innerHTML = window.MatchProfileDetailsI18n?.text('identityLockedHelp') || "Your core identity is locked and permanently guiding your AI Matches.";
        
        if (saveBtn) {
            saveBtn.innerText = window.t?.('identity.locked') || 'Identity saved and locked';
            saveBtn.disabled=true;
            saveBtn.setAttribute('data-i18n','identity.locked');
            saveBtn.style.background = "#555";
            saveBtn.style.borderColor = "#555";
            saveBtn.style.boxShadow = "none";
            saveBtn.onclick = async () => {
                const message = window.MatchProfileDetailsI18n?.text('identityLockedAlert') || "Core identity fields are permanently locked to maintain consistent AI matching.";
                if (typeof window.MatchAppDialogs?.alert === 'function') await window.MatchAppDialogs.alert(message);
                else window.alert(message);
            };
        }
    } else {
        if (editableSection) editableSection.style.display='';
        if (lockedCard) lockedCard.style.display='none';
        if (saveBtn) { if(!languageRefresh){saveBtn.disabled=false;saveBtn.onclick=window.saveProfileData;} saveBtn.setAttribute('data-i18n','profile.saveIdentity'); saveBtn.innerText=window.t?.('profile.saveIdentity') || 'Save & Lock Identity'; }
        if (!languageRefresh && savedName) document.getElementById('profile-name').value = savedName;
        if (!languageRefresh && savedCountry) document.getElementById('profile-country').value = savedCountry;
        if (!languageRefresh && savedDob) document.getElementById('profile-dob').value = savedDob;
        if (!languageRefresh && savedSign) document.getElementById('profile-starsign').value = savedSign;
    }
}

window.checkAndRenderProfileState = checkAndRenderProfileState;
window.retryLockedProfile = async function() {
    if(window.matchProfileState?.status==='signedout'){window.openAuthModal?.();return;}
    const attempt={status:'loading',userId:window.matchProfileState?.userId||null};
    let pendingState=attempt;
    try {
        window.matchProfileState=attempt;checkAndRenderProfileState();
        const result=window.ensureCompactMatchSession
            ?await window.ensureCompactMatchSession():await window.supabaseClient.auth.getSession();
        // A newer auth event or retry owns the UI and account attachment.
        if(window.matchProfileState!==attempt)return;
        if(result.error)throw result.error;
        if(result.data?.session?.user){
            const restoring=window.hydrateProfileFromAuth(result.data.session.user);
            pendingState=window.matchProfileState;
            await restoring;
        } else window.matchProfileState={status:'signedout',userId:null};
    } catch(_){
        if(window.matchProfileState!==pendingState)return;
        window.matchProfileState={status:'error',userId:attempt.userId};
    }
    checkAndRenderProfileState();
};
document.addEventListener('matchapp:langchange',checkAndRenderProfileState);
document.addEventListener('matchapp:historychange',()=>window.renderProfileGrids?.());
document.addEventListener('matchapp:profilehydrated',()=>window.renderProfileGrids?.());



window.saveProfileData = async function() {
    if (localStorage.getItem('match_profile_locked') === 'true') return;
    const btn = document.getElementById('save-profile-btn');
    const value = id => document.getElementById(id).value.trim();
    const name=value('profile-name'), country=value('profile-country'), dob=value('profile-dob'), sign=value('profile-starsign');
    if (!name || !country || !dob || !sign || calculateAgeFromDOB(dob) === null) { window.showToast?.(window.t?.('identity.complete') || 'Complete every identity field with a valid birthdate.',true); return; }
    if (btn) btn.disabled=true;
    try {
        const sb=window.supabaseClient;
        if (!sb) throw new Error('Connection unavailable');
        const {data: auth,error:authError}=await sb.auth.getUser();
        if (authError || !auth?.user) { window.showToast?.(window.t?.('identity.signIn') || 'Sign in to save and lock your identity across devices.',true); window.openAuthModal?.(); return; }
        const {data,error}=await sb.rpc('save_locked_identity',{p_name:name,p_country:country,p_dob:dob,p_sign:sign});
        if (error || !data?.profile_locked) throw error || new Error('Identity was not saved');
        const current = await sb.auth.getSession();
        if (current.data?.session?.user?.id !== auth.user.id) throw new Error('Account changed during save');
        const fields={full_name:'match_user_name',country:'match_user_country',dob:'match_user_dob',star_sign:'match_user_sign',age:'match_user_age'};
        Object.entries(fields).forEach(([field,key])=>localStorage.setItem(key,String(data[field] ?? '')));
        localStorage.setItem('match_profile_locked','true');
        localStorage.setItem('match_portfolio_owner',auth.user.id);
        // Only paint a permanent lock after the server transaction has committed.
        await window.hydrateProfileFromAuth?.(auth.user);
        checkAndRenderProfileState();
        window.showToast?.(window.t?.('identity.saved') || 'Identity saved and locked to your account.');
    } catch (e) {
        console.warn('Identity save failed:',e.message || e);
        window.showToast?.(window.t?.('identity.failed') || 'Your identity was not saved. Please retry; your fields remain editable.',true);
    } finally { if(btn)btn.disabled=localStorage.getItem('match_profile_locked')==='true'; }
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
        "+SBT": () => "https://mais.sbt.com.br/search",
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

// Display-only normalization; saved records and their action owners stay intact.
/* MATCHAPP_PORTFOLIO_POSTERS_BEGIN */
(function () {
    'use strict';
    if (window.MatchAppPortfolioPosters) return;
    const imageKeys = ['posterUrl','poster','artwork','cover','poster_large_url','poster_url','poster_original_url','posterLarge','posterOriginal','thumbnailUrl','thumbnail','artworkUrl600','artworkUrl100'];
    function sources(item) {
        const found = [], pending = item && typeof item === 'object' ? [item] : [];
        while (pending.length && found.length < 24) {
            const row = pending.shift();
            if (!row || typeof row !== 'object' || found.includes(row)) continue;
            found.push(row);
            ['metadata','_meta','_tmdb','meta','verifiedMetadata','verified','media'].forEach(key => {
                if (row[key] && typeof row[key] === 'object' && !Array.isArray(row[key])) pending.push(row[key]);
            });
        }
        return found;
    }
    function safeImage(value) {
        if (typeof value !== 'string' || !value.trim() || /^(?:invalid-image|fallback|data:|javascript:)/i.test(value.trim())) return '';
        try {
            const url = new URL(value.trim(), location.origin);
            return ['http:','https:'].includes(url.protocol) ? url.href : '';
        } catch (_) { return ''; }
    }
    function kind(value) {
        const name = String(value || '').toLowerCase();
        return /^(?:tv|series|show|television)$/.test(name) ? 'tv' : /^(?:movie|film)$/.test(name) ? 'movie' : '';
    }
    function id(value) {
        if (!/^[1-9]\d{0,9}$/.test(String(value || ''))) return 0;
        const number = Number(value);
        return Number.isSafeInteger(number) && number > 0 ? number : 0;
    }
    function fallback(title) {
        const xml = String(title).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect width="300" height="450" fill="#130b1b"/><rect x="12" y="12" width="276" height="426" rx="14" fill="#201329" stroke="#705938"/><text x="150" y="222" text-anchor="middle" fill="#e4ba67" font-family="sans-serif" font-size="16">' + xml + '</text></svg>');
    }
    function record(item) {
        const rows = sources(item), first = rows[0] || {};
        const title = typeof item === 'string' ? item : String(first.title || first.name || 'Untitled');
        const values = rows.flatMap(row => [row.kind,row.type,row.format,row.mediaType,row.media_type]).map(value => String(value || '').toLowerCase());
        let sourceKind = rows.some(row => row.isAudio === true) || values.some(value => /audio|album|song|track|single|podcast|playlist|music/.test(value)) ? 'audio' :
            rows.some(row => row.isBook === true) || values.some(value => /book|magazine|ebook|reading/.test(value)) ? 'book' : 'visual';
        let posterUrl = '';
        for (const row of rows) {
            for (const key of imageKeys) { posterUrl = safeImage(row[key]); if (posterUrl) break; }
            if (!posterUrl && typeof row.poster_path === 'string' && /^\/[A-Za-z0-9_.-]+$/.test(row.poster_path)) posterUrl = 'https://image.tmdb.org/t/p/w500' + row.poster_path;
            if (posterUrl) break;
        }
        if (sourceKind === 'visual' && /(?:covers\.openlibrary\.org|\/Publication[^/]*\/)/i.test(posterUrl)) sourceKind = 'book';
        const yearValue = rows.map(row => row.year || row.releaseYear || row.release_date || row.first_air_date).find(Boolean);
        const parsedYear = Number(String(yearValue || '').slice(0,4)), year = Number.isSafeInteger(parsedYear) && parsedYear >= 1880 && parsedYear <= 2200 ? parsedYear : 0;
        const identities = new Map();
        if (sourceKind === 'visual') rows.forEach(row => {
            const mediaKind = kind(row.tmdbKind || row.kind || row.media_kind || row.media_type || row.type), mediaId = id(row.tmdbId || row.tmdb_id || (mediaKind ? row.id : 0));
            if (mediaId && mediaKind) identities.set(mediaKind + ':' + mediaId, {tmdbId:mediaId,kind:mediaKind});
            if (Array.isArray(row.identityKeys)) row.identityKeys.forEach(key => {
                const match = /^tmdb:(movie|tv):([1-9]\d{0,9})$/.exec(String(key));
                if (match && id(match[2])) identities.set(match[1] + ':' + match[2], {tmdbId:id(match[2]),kind:match[1]});
            });
        });
        const identity = identities.size === 1 ? [...identities.values()][0] : {tmdbId:0,kind:''};
        const originalTitle = String(rows.map(row => row.originalTitle || row.original_title).find(Boolean) || '');
        return {title,posterUrl,fallbackUrl:fallback(title),sourceKind,tmdbId:identity.tmdbId,kind:identity.kind,year,originalTitle};
    }
    function bindImage(img) {
        if (img.__matchappPortfolioFallbackBound) return;
        img.__matchappPortfolioFallbackBound = true;
        img.addEventListener('error', function () {
            // The shared exact-identity owner handles visual retries when ready.
            if (img.dataset.portfolioPoster === '1' && img.__matchappAdultPoster) return;
            const cover = img.dataset.posterFallback;
            if (cover && img.getAttribute('src') !== cover) { img.removeAttribute('srcset'); img.src = cover; }
            img.hidden = false; img.style.display = 'block'; img.style.visibility = 'visible'; img.style.opacity = '1';
        });
    }
    function apply(img, item, options) {
        const art = record(item), eager = !!options?.eager;
        img.alt = art.title; img.hidden = false;
        img.setAttribute('loading', eager ? 'eager' : 'lazy');
        img.setAttribute('decoding','async'); img.setAttribute('fetchpriority', eager ? 'high' : 'auto');
        img.dataset.posterTitle = art.title; img.dataset.posterSourceKind = art.sourceKind;
        img.dataset.posterPreferredUrl = art.posterUrl; img.dataset.posterFallback = art.fallbackUrl;
        if (art.originalTitle) img.dataset.originalTitle = art.originalTitle; else delete img.dataset.originalTitle;
        ['portfolioPoster','tmdbId','tmdbKind','tmdbYear'].forEach(key => { delete img.dataset[key]; });
        if (art.sourceKind === 'visual') {
            img.dataset.portfolioPoster = '1';
            if (art.tmdbId && art.kind) { img.dataset.tmdbId = String(art.tmdbId); img.dataset.tmdbKind = art.kind; }
            if (art.year) img.dataset.tmdbYear = String(art.year);
        }
        img.style.display = 'block'; bindImage(img); img.src = art.posterUrl || art.fallbackUrl;
        return art;
    }
    function bind(root) {
        if (!root) return;
        if (root.matches?.('img[data-poster-title]')) bindImage(root);
        root.querySelectorAll?.('img[data-poster-title]').forEach(bindImage);
        window.MatchAppCatalogMedia?.hardenWithin?.(root);
    }
    window.MatchAppPortfolioPosters = Object.freeze({record,apply,bind});
    document.addEventListener('matchapp:catalog-media-ready', () => bind(document));
})();
/* MATCHAPP_PORTFOLIO_POSTERS_END */

// Cards are clickable: tapping one opens where the title actually plays.
function buildPosterCard(item, accent, index = 0) {
    const title = typeof item === 'string' ? item : (item.title || 'Untitled');
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
    const image = document.createElement('img');
    window.MatchAppPortfolioPosters.apply(image, item, {eager:index < 4});
    image.style.cssText = 'width:100%; height:100%; object-fit:contain; background:#0b0303; display:block;';
    const imgTag = image.outerHTML;
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
    const history=window.matchPolicy?.history()||[];
    const mergeHistory=(key,actions)=>{
        let local=[];try{local=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(local))local=[];}catch(_){}
        const combined=new Map(local.filter(i=>i&&i.title).map(i=>[i.title,i]));
        history.filter(i=>actions.includes(i.action)).forEach(i=>combined.set(i.title,i));
        return [...combined.values()];
    };
    const savedListData = mergeHistory('match_savedList',['save']);
    const seenListData = mergeHistory('match_seenList',['seen','loved']);

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
            : data.map((item,index) => buildPosterCard(item, accent,index)).join('');
        window.MatchAppPortfolioPosters.bind(el);
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


window.testVoiceSample = function() {
    if (!('speechSynthesis' in window)) return;
    const select = document.getElementById('voice-select');
    const rate = parseFloat(localStorage.getItem('match_voice_rate') || '1');
    const sampleByLang = {
        'en': "Hi! I'm your MatchApp Ai concierge. This is how I'll sound.",
        'pt-BR': "Oi! Eu sou o seu concierge de IA do MatchApp. É assim que eu vou soar.",
        'es': "¡Hola! Soy tu conserje de IA de MatchApp. Así es como sonaré.",
        'fr': "Bonjour ! Je suis votre concierge IA MatchApp. Voici à quoi je ressemblerai.",
        'de': "Hallo! Ich bin Ihr MatchApp-KI-Concierge. So werde ich klingen.",
        'it': "Ciao! Sono il tuo concierge IA di MatchApp. Ecco come suonerò.",
        'tr': "Merhaba! Ben MatchApp yapay zekâ danışmanınızım. Böyle duyulacağım.",
        'ru': "Привет! Я ваш ИИ-консьерж MatchApp. Вот как я буду звучать.",
        'ar': "مرحبًا! أنا مساعدك الذكي في MatchApp. هكذا سيكون صوتي.",
        'hi': "नमस्ते! मैं आपका MatchApp Ai कंसीयज हूँ। मैं ऐसे सुनाई दूँगा।",
        'id': "Hai! Saya concierge AI MatchApp Anda. Begini suara saya nanti.",
        'ja': "こんにちは！MatchAppのAIコンシェルジュです。こんな声でお話しします。",
        'ko': "안녕하세요! 저는 MatchApp Ai 컨시어지입니다. 이런 목소리로 안내해 드릴게요.",
        'zh': "你好！我是你的 MatchApp Ai 管家，我的声音听起来是这样的。"
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
    if (rateSlider) {
        const savedRate = localStorage.getItem('match_voice_rate');
        if (savedRate) { rateSlider.value = savedRate; onVoiceRateChange(); }
    }

    populateVoiceList();
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = populateVoiceList;
});

// Re-sort the voice list toward the newly chosen language.
document.addEventListener('matchapp:langchange', populateVoiceList);
/* Optional nickname remains independent of the account photo. */

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
    const nick = document.getElementById('pf-nickname');
    if (nick) nick.value = localStorage.getItem('match_user_nickname') || '';
    window.renderUserAvatar?.();
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

        /* ---- hard Match exclusions ---- */
        const COUNTRY_OPTIONS = [
            ['AR','Argentina'],['AU','Australia'],['BE','Belgium'],['BR','Brazil'],['CA','Canada'],['CL','Chile'],
            ['CN','China'],['CO','Colombia'],['DK','Denmark'],['EG','Egypt'],['FI','Finland'],['FR','France'],
            ['DE','Germany'],['GR','Greece'],['HK','Hong Kong'],['IN','India'],['ID','Indonesia'],['IE','Ireland'],
            ['IL','Israel'],['IT','Italy'],['JP','Japan'],['KR','South Korea'],['MX','Mexico'],['NL','Netherlands'],
            ['NZ','New Zealand'],['NG','Nigeria'],['NO','Norway'],['PH','Philippines'],['PL','Poland'],['PT','Portugal'],
            ['RU','Russia'],['ZA','South Africa'],['ES','Spain'],['SE','Sweden'],['CH','Switzerland'],['TW','Taiwan'],
            ['TH','Thailand'],['TR','Turkey'],['UA','Ukraine'],['GB','United Kingdom'],['US','United States'],['VN','Vietnam']
        ];
        const GENRE_OPTIONS = ['Action','Action & Adventure','Adventure','Animation','Buddhism','Christian','Comedy','Crime','Documentary','Drama','Family','Fantasy','Fitness','Fitness & Workout','Hip-Hop/Rap','History','Horror','Jazz','Kids','Mental Health','Metal','Music','Mystery','New Age','Pop','Reality','Rock','Romance','Sci-Fi & Fantasy','Science Fiction','Soap','Thriller','War & Politics'];
        const paintExclusions = (hostId,summaryId,options,key) => {
            const host=$(hostId),summary=$(summaryId);if(!host)return;
            const selected=new Set(Array.isArray(S.get(key))?S.get(key):[]);
            host.replaceChildren();
            options.forEach(opt=>{
                const value=Array.isArray(opt)?opt[0]:opt,label=Array.isArray(opt)?opt[1]:opt;
                const b=document.createElement('button');b.type='button';b.className='matchapp-exclusion-chip';b.textContent=label;
                b.setAttribute('aria-pressed',selected.has(value)?'true':'false');
                b.addEventListener('click',()=>{
                    const next=new Set(Array.isArray(S.get(key))?S.get(key):[]);
                    if(next.has(value))next.delete(value);else next.add(value);
                    S.set(key,[...next]);
                    paintExclusions(hostId,summaryId,options,key);
                });
                host.appendChild(b);
            });
            if(summary){
                const chosen=options.filter(opt=>selected.has(Array.isArray(opt)?opt[0]:opt)).map(opt=>Array.isArray(opt)?opt[1]:opt);
                summary.innerHTML=chosen.length?chosen.map(v=>'<span class="matchapp-exclusion-tag">'+String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))+'</span>').join(''):'<span class="matchapp-exclusion-empty">Nothing excluded.</span>';
            }
        };
        paintExclusions('excluded-country-chips','excluded-country-summary',COUNTRY_OPTIONS,'blockedOriginCountries');
        paintExclusions('excluded-genre-chips','excluded-genre-summary',GENRE_OPTIONS,'blockedGenres');

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
         ['set-motion','reduceMotion']].forEach(([id, key]) => {
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
                $('voice-note').textContent = t('polish.noVoices');
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
                t('polish.voiceSample'));
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
        if (window.showToast) window.MatchThemes?.cancel(); showToast(t('polish.settingsReset'));
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

    // Removing a queue entry never makes an already handled title eligible again.
    let archived={title};
    try{archived=[...JSON.parse(localStorage.getItem('match_savedList')||'[]'),...JSON.parse(localStorage.getItem('match_seenList')||'[]')].find(i=>(i.title||i)===title)||archived;}catch(_){}
    window.matchPolicy?.remember(typeof archived==='string'?{title:archived}:archived,'removed');

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
            if(typeof seenList !== 'undefined')seenList=fresh('match_seenList');
            if(typeof savedList !== 'undefined')savedList=fresh('match_savedList');
        }
    } catch (e) {}

    if (window.showToast) {
        showToast(`Removed "${title}" from this list. It stays excluded from future matches in your history.`);
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
                saved_list: JSON.parse(localStorage.getItem('match_savedList') || '[]'),
                seen_list:  JSON.parse(localStorage.getItem('match_seenList')  || '[]'),
                match_exclusion_keys:[...(window.matchPolicy?.known()||[])],
                match_history:window.matchPolicy?.history()||[]
            }});
        } catch (e) {}
    }, 800);
}

/* Explicit save. Settings already persist as they change, but a panel with
   no save button leaves people unsure whether anything took — so this makes
   the sync visible and confirms it, rather than adding a state where unsaved
   changes could be lost. */
window.saveSettings = function () {
    if (!window.MatchSettings) return;
    const btn = document.querySelector('.settings-save');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
    // Re-setting a value forces the debounced account sync to fire now.
    window.MatchThemes?.save();
    window.MatchSettings.set('fontScale', window.MatchSettings.get('fontScale'));
    setTimeout(() => {
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        if (window.showToast) showToast(t('polish.settingsSaved'));
    }, 700);
};
