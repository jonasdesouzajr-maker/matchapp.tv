/* ============================================================
   © 2026 MatchApp.tv — All Rights Reserved.
   Proprietary source code. Not licensed for reproduction, scraping,
   or reuse in competing products. See /terms.html Section 4.
   ============================================================ */

console.log("Mastercode 103: Quota fallback hardening (logged-in RPC outage)");

const SUPABASE_URL = 'https://zkymvqrmbabngsqblyye.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreW12cXJtYmFibmdzcWJseXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDUyNDIsImV4cCI6MjEwMjM4MTI0Mn0._yEVFMfwVU6GBqQ8m3ljfOgA0HSLEDiKMOfYae6ZD8Q';

let supabaseClient = null;
try { if (window.supabase) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {auth:{experimental:{passkey:true}}}); } catch (e) {}
window.supabaseClient = supabaseClient;

let globalMatchTitle = ""; let globalMatchPoster = ""; let globalPlatform = ""; let isUserLoggedIn = false; window.isUserLoggedIn = false;
let isVIP = localStorage.getItem('match_isVIP') === 'true';

// Shared with the specific-search prompt and the synopsis-translation step —
// keeps every AI call in this file speaking the user's actual UI language
// instead of defaulting to English regardless of what was selected.
const LANG_NAMES_FOR_PROMPT = {
    'en': 'English', 'pt-BR': 'Brazilian Portuguese', 'es': 'Spanish', 'fr': 'French',
    'de': 'German', 'it': 'Italian', 'tr': 'Turkish', 'ru': 'Russian', 'ar': 'Arabic',
    'hi': 'Hindi', 'id': 'Indonesian', 'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese'
};

// ----------------------------------------------------
// PORTFOLIO LISTS (Watch Later / Seen It / Disliked)
// ----------------------------------------------------
// A damaged optional cache must not prevent the app from starting. Keep every
// valid legacy title and leave stored data untouched until account hydration.
function readPortfolioCache(name, fallback, validItem = item => typeof item === 'string' ? !!item.trim() : item && typeof item.title === 'string' && !!item.title.trim()) {
    try {
        const value = JSON.parse(localStorage.getItem(name));
        if (Array.isArray(fallback)) return Array.isArray(value) ? value.filter(validItem) : fallback;
        return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
    } catch (_) { return fallback; }
}
let seenList = readPortfolioCache('match_seenList', []);
let savedList = readPortfolioCache('match_savedList', []);
let dislikedList = readPortfolioCache('match_dislikedList', []);
let userRatings = readPortfolioCache('match_userRatings', {});
// Titles shown recently, so the same result never repeats back-to-back.
let recentTitles = readPortfolioCache('match_recentTitles', [], item => typeof item === 'string' && !!item.trim());

// ----------------------------------------------------
// INCLUDED DAILY AI ACTIONS (3 Guest, 5 Registered, 10 VIP, 50 Business)
// ----------------------------------------------------
// ----------------------------------------------------
// COMMERCIAL QUOTA
// The included daily allowance is shared between Matches and Ask AI:
// 3 guest / 5 registered / 10 VIP / 50 Business.
// Matches and Ask AI use separate paid top-ups only after that allowance:
// Extra Matches for Matches; Ask AI credits for Ask AI.
// Anonymous visitors have no server identity, so their 3 included actions
// remain client-side.
// ----------------------------------------------------
let lastQuotaStatus = null;

const ANON_DAILY_LIMIT = 3;
const GUEST_MATCH_BALANCE_KEY = 'match_guestBonusMatches';

function guestMatchBalance() {
    const value = Number.parseInt(localStorage.getItem(GUEST_MATCH_BALANCE_KEY) || '0', 10);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
}
function setGuestMatchBalance(value) {
    const safe = Math.max(0, Number.parseInt(value, 10) || 0);
    localStorage.setItem(GUEST_MATCH_BALANCE_KEY, String(safe));
    return safe;
}
window.MatchAppGuestMatches = Object.freeze({ balance: guestMatchBalance, set: setGuestMatchBalance });

function anonLimitCheck(action = 'match') {
    const todayStr = new Date().toLocaleDateString();
    const lastDate = localStorage.getItem('match_lastDate');
    let dailyCount = parseInt(localStorage.getItem('match_dailyCount') || '0');
    if (lastDate !== todayStr) { dailyCount = 0; localStorage.setItem('match_lastDate', todayStr); }
    const extras = guestMatchBalance();

    if (dailyCount >= ANON_DAILY_LIMIT) {
        // Extra Matches are Match-only, non-expiring currency. They never pay
        // for Ask AI, and they are consumed only after the included allowance.
        if (action === 'match' && extras > 0) {
            const remainingExtras = setGuestMatchBalance(extras - 1);
            lastQuotaStatus = {
                allowed: true, used: dailyCount, limit: ANON_DAILY_LIMIT, remaining: 0,
                purchased_matches: remainingExtras, paid_with_match_pack: true, anon: true
            };
            updateQuotaBadge(lastQuotaStatus);
            return true;
        }
        lastQuotaStatus = {
            allowed: false, used: dailyCount, limit: ANON_DAILY_LIMIT, remaining: 0,
            purchased_matches: extras, anon: true
        };
        updateQuotaBadge(lastQuotaStatus);
        showQuotaMessage('anon', lastQuotaStatus, action);
        return false;
    }

    const used = dailyCount + 1;
    localStorage.setItem('match_dailyCount', used.toString());
    lastQuotaStatus = {
        allowed: true, used, limit: ANON_DAILY_LIMIT, remaining: ANON_DAILY_LIMIT - used,
        purchased_matches: extras, anon: true
    };
    updateQuotaBadge(lastQuotaStatus);
    return true;
}

function showQuotaMessage(kind, status, action = 'match') {
    if (kind === 'anon') {
        if (window.showToast) showToast("🔒 That's your 3 included AI actions for today — register free to unlock 5 daily.");
        else alert("🔒 You've used your 3 included AI actions today!\n\nRegister for FREE to unlock 5 daily.");
        if (window.openAuthModal) window.openAuthModal();
    } else if (action === 'ask_ai') {
        if (window.showToast) showToast(`You've used all ${status?.limit ?? (isUserLoggedIn ? 5 : ANON_DAILY_LIMIT)} included AI actions today. Ask AI credits let you keep asking without changing your Match balance.`);
        return;
    } else {
        // Used to toast and then hard-redirect to /pricing after 2.6s. That
        // threw the user off the page they were using, gave them no way to
        // decline, and dropped them on a pricing page with no memory of why
        // they were sent there. Now it opens a panel in place that offers the
        // three real options — top up, subscribe, or come back tomorrow —
        // and closing it leaves them where they were.
        openOutOfMatches(kind, status);
    }
}

// The out-of-matches panel. Also the single best moment to offer credits:
// the person reading it is, by definition, someone who wants another match
// right now.
function openOutOfMatches(kind, status) {
    const modal = document.getElementById('out-of-matches-modal');
    if (!modal) {
        // No panel on this page — fall back to saying it rather than silently
        // doing nothing.
        if (window.showToast) showToast(`🔒 You've used all ${status?.limit ?? (isUserLoggedIn ? 5 : ANON_DAILY_LIMIT)} included AI actions today.`);
        return;
    }

    const limit = status?.limit ?? (isUserLoggedIn ? 5 : ANON_DAILY_LIMIT);
    const headline = document.getElementById('oom-headline');
    const sub = document.getElementById('oom-sub');
    const shareLine = document.getElementById('oom-share');
    const vipLine = document.getElementById('oom-vip');

    if (headline) {
        headline.textContent = kind === 'business'
            ? `💼 That's all ${limit} Business matches for today`
            : kind === 'vip'
                ? `💎 That's all ${limit} VIP matches for today`
                : `⚡ That's all ${limit} matches for today`;
    }
    if (sub) {
        sub.textContent = kind === 'vip' || kind === 'business'
            ? 'Your included allowance resets at midnight. Extra Matches let you keep matching without using Ask AI credits.'
            : 'Your included allowance resets at midnight — or keep going with Extra Matches.';
    }
    if (shareLine) {
        const left = status && status.share_rewards_left;
        shareLine.style.display = left > 0 ? 'block' : 'none';
        if (left > 0) shareLine.textContent = `🎁 Or share a match to earn ${left} more, free.`;
    }
    // A VIP is already subscribed; offering them VIP is the fastest way to
    // look like nobody is reading the account state.
    if (vipLine) vipLine.style.display = (kind === 'vip' || kind === 'business') ? 'none' : 'flex';

    if (typeof window.injectCreditsCTA === 'function') window.injectCreditsCTA();
    modal.style.display = 'flex';
}
window.closeOutOfMatches = function () {
    const m = document.getElementById('out-of-matches-modal');
    if (m) m.style.display = 'none';
};

async function checkDailyLimit(action = 'match') {
    if (!['match','ask_ai'].includes(action)) return false;
    if (!supabaseClient) return anonLimitCheck();
    try {
        // Wait for the SDK to restore the session before treating a new page as logged out.
        const sessionResult = await supabaseClient.auth.getSession();
        if (sessionResult.error) throw sessionResult.error;
        if (!sessionResult.data?.session) return anonLimitCheck(action);
        isUserLoggedIn = true; window.isUserLoggedIn = true;
        const { data, error } = await supabaseClient.rpc('consume_ai_action', {p_reason: action});
        if (error || !data) throw error || new Error('Quota unavailable');
        // consume_ai_action/consume_match may omit the separate Match-pack
        // balance on some successful included actions. Preserve the last known
        // server balance until the next read-only match_status refresh.
        if (typeof data.purchased_matches !== 'number' && typeof lastQuotaStatus?.purchased_matches === 'number') {
            data.purchased_matches = lastQuotaStatus.purchased_matches;
        }
        lastQuotaStatus = data; updateQuotaBadge(data);
        window.renderCreditBadge?.(data.credits);
        if (data.allowed) {
            if (data.paid_with_credit) window.showToast?.('Used 1 Ask AI credit.');
            return true;
        }
        if (data.reason === 'limit_reached') showQuotaMessage(data.limit >= 50 ? 'business' : data.limit >= 10 ? 'vip' : 'registered', data, action);
        else window.showToast?.(window.t?.('credits.retry') || 'Could not verify your allowance. Please try again.', true);
        return false;
    } catch (e) {
        // A cached balance is display information; never invent or reconcile a local paid spend.
        console.warn('Could not verify the AI allowance:', e.message || e);
        window.showToast?.(window.t?.('credits.retry') || 'Could not verify your allowance. Please try again.', true);
        return false;
    }
}
window.checkDailyLimit = checkDailyLimit;

// Live included-actions-left pill in the header.
function updateQuotaBadge(status) {
    const el = document.getElementById('quota-badge');
    if (!el || !status || typeof status.remaining !== 'number') return;
    const included = Math.max(0, Number(status.remaining) || 0);
    const extras = Math.max(0, Number(status.purchased_matches) || 0);
    const usableMatches = included + extras;
    el.style.display = 'inline-flex';
    el.innerHTML = `⚡ <strong>${usableMatches}</strong>&nbsp;${tSafe('quota.left', 'left today')}`;
    el.classList.toggle('quota-low', usableMatches <= 1);

    // The moment someone notices they are running low is the moment to offer
    // more — better than letting them hit zero, get blocked, and go hunting
    // for the pricing page. The source parameter lets pricing lead with
    // credits for someone mid-session rather than opening on annual plans.
    if (!el.dataset.linked) {
        el.dataset.linked = '1';
        el.setAttribute('role', el.tagName==='A'?'link':'button');
        el.setAttribute('tabindex', '0');
        el.style.cursor = 'pointer';
        const go = () => {
            if (window.track) window.track('quota_badge_click', { remaining: usableMatches });
            window.location.href = '/pricing/pricing.html?from=quota';
        };
        if(el.tagName==='A'){el.href='/pricing/pricing.html?from=quota';el.addEventListener('click',()=>{if(window.track)window.track('quota_badge_click',{remaining:el.dataset.remaining});});}
        else el.addEventListener('click', go);
        el.addEventListener('keydown', (e) => {
            if (el.tagName!=='A' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(); }
        });
    }
    el.dataset.remaining=String(usableMatches);
    el.title = extras > 0
        ? `${included} included + ${extras} Extra Match${extras === 1 ? '' : 'es'}`
        : 'Get more';
    el.setAttribute('aria-label', `${usableMatches} ${tSafe('quota.left', 'left today')}. ${el.title}`);
}
window.updateQuotaBadge = updateQuotaBadge;

// Pull status without consuming — used on load and after auth changes.
window.refreshQuotaStatus = async function() {
    if (!isUserLoggedIn || !supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient.rpc('match_status');
        if (error || !data || !data.authenticated) return null;
        lastQuotaStatus = data;
        updateQuotaBadge(data);

        // THE ACTUAL FIX: this RPC has always returned the real is_vip value
        // from the profiles row, but nothing ever wrote it back into the
        // client-side flag that controls VIP behavior (10 vs 5 daily matches
        // was already safe, since that's enforced server-side by this same
        // RPC — but the 3-second fast-pass loading animation reads the local
        // `isVIP` variable directly, so a manually-flipped is_vip in Supabase
        // had zero visible effect until the next full code deploy, which is
        // not how database changes are supposed to work). Now it takes effect
        // the moment this RPC is called — on login, and on every page load
        // for an already-logged-in user.
        if (typeof data.is_vip === 'boolean') {
            isVIP = data.is_vip;
            window.isVIP = data.is_vip;
            localStorage.setItem('match_isVIP', data.is_vip ? 'true' : 'false');
        }
        // Business tier (set by the stripe-webhook function after payment).
        if (typeof data.is_business === 'boolean') {
            window.isBusiness = data.is_business;
            localStorage.setItem('match_isBusiness', data.is_business ? 'true' : 'false');
        }
        // Whether the profile is complete, which decides 3 vs 5 included daily AI actions.
        if (typeof data.profile_complete === 'boolean') {
            window.profileComplete = data.profile_complete;
            localStorage.setItem('match_profileComplete', data.profile_complete ? 'true' : 'false');
        }

        return data;
    } catch (e) { return null; }
};

// ----------------------------------------------------
// AUDIO & FX ENGINE
// ----------------------------------------------------
// ----------------------------------------------------
// SOUND PREFERENCE — respected by every sound function below. Default on,
// one tap to mute, remembered across visits. Unsolicited audio is genuinely
// annoying in the wrong context (quiet room, headphones not in), so this
// has to be trivially easy to turn off, not buried in a settings page.
// ----------------------------------------------------
function soundEnabled() {
    try { return localStorage.getItem('match_soundEnabled') !== 'false'; } catch (e) { return true; }
}
window.toggleSound = function () {
    const next = !soundEnabled();
    try { localStorage.setItem('match_soundEnabled', String(next)); } catch (e) {}
    document.querySelectorAll('.sound-toggle-btn').forEach(b => { b.innerHTML = "<span class=\"sound-star\" aria-hidden=\"true\"><svg viewBox=\"0 0 32 32\" fill=\"none\"><path d=\"m16 2 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1Z\" fill=\"currentColor\" opacity=\".2\"/><path class=\"sound-note\" d=\"M14 20V9l10-2v11M14 12l10-2M14 20c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Zm10-2c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"/><path class=\"sound-slash\" d=\"m5 5 23 23\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg></span>"; b.setAttribute('aria-pressed', String(soundEnabled())); b.setAttribute('aria-label', window.t ? t(soundEnabled() ? 'sound.on' : 'sound.off') : 'Sound'); });
    if (next && window.playPremiumSound) window.playPremiumSound();
    if (window.showToast) {
        showToast(next ? (window.t ? t('sound.on') : '🔊 Sound on')
                       : (window.t ? t('sound.off') : '🔇 Sound off'));
    }
};
function initSoundToggle() {
    document.querySelectorAll('.sound-toggle-btn').forEach(b => { b.innerHTML = "<span class=\"sound-star\" aria-hidden=\"true\"><svg viewBox=\"0 0 32 32\" fill=\"none\"><path d=\"m16 2 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1Z\" fill=\"currentColor\" opacity=\".2\"/><path class=\"sound-note\" d=\"M14 20V9l10-2v11M14 12l10-2M14 20c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Zm10-2c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"/><path class=\"sound-slash\" d=\"m5 5 23 23\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\"/></svg></span>"; b.setAttribute('aria-pressed', String(soundEnabled())); b.setAttribute('aria-label', window.t ? t(soundEnabled() ? 'sound.on' : 'sound.off') : 'Sound'); });
}
document.addEventListener('DOMContentLoaded', initSoundToggle);
document.addEventListener('matchapp:langchange', initSoundToggle);

window.playPremiumSound = function() {
    if (!soundEnabled()) return;
    try { 
        const ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        const osc = ctx.createOscillator(); 
        const gain = ctx.createGain(); 
        osc.connect(gain); gain.connect(ctx.destination); 
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(600, ctx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1); 
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); 
        osc.onended=()=>ctx.close(); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
    } catch (e) { console.log("Audio FX skipped"); }
};

// A second, distinct chime for Match Together's reveal — deliberately not
// the same sound as a solo match. Two people converging on one answer is a
// different kind of moment (and had confetti already, but total silence),
// so it gets a two-note ascending tone instead of reusing the solo sweep.
window.playTogetherSound = function () {
    if (!soundEnabled()) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [[523.25, 0], [659.25, 0.12]].forEach(([freq, delay]) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            const t0 = ctx.currentTime + delay;
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0.28, t0);
            gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.28);
            osc.start(t0); osc.stop(t0 + 0.28);
        });
    } catch (e) { console.log("Audio FX skipped"); }
};

// ----------------------------------------------------
// "NEVER-FAIL" COVER DICTIONARY & GENERATOR
// ----------------------------------------------------
// NOTE: Only verified-live TMDB paths belong here. Several previous entries were
// invalid poster hashes that 404'd, which is why covers fell back to text placeholders.
const OFFLINE_COVERS = {
    // LOCAL FILES ONLY, deliberately.
    //
    // This used to hold six hardcoded TMDB image URLs. They were removed for
    // two reasons. First, a wrong cover was reported for one of them
    // (Jujutsu Kaisen) and this dictionary is checked FIRST, ahead of every
    // live lookup — so a bad entry here silently overrides an otherwise
    // correct result and no amount of fixing the lookup chain would help.
    // Second, they were unverifiable: TMDB image hashes cannot be checked
    // from here, and unverifiable hardcoded image URLs are exactly what
    // 404'd earlier in this project.
    //
    // Nothing is lost by removing them. All six titles (The Bear, Shogun,
    // House of the Dragon, Deadpool & Wolverine, Dune: Part Two, Jujutsu
    // Kaisen) now carry year and countryCode hints, and the lookup order was
    // fixed to search the right media type first — so they resolve through
    // the normal path, which self-corrects if artwork changes instead of
    // going stale.
    //
    // Only files that actually exist in this repo belong here, because those
    // are the only ones that can be verified.
    "American Horror Story: 13": "/ahs13-poster.jpg"
};

// Titles whose names collide with adult content in external catalogues.
// For these we skip external artwork lookup ENTIRELY and always render the
// locally generated poster — no network result can be wrong, because none is
// requested.
//
// "Beauty in Black" was REMOVED from this list on request, because the
// conditions that made it necessary have materially changed since it was
// added. At that time the lookup had no content filtering whatsoever. It now
// has three independent protections that did not exist then:
//   1. isExplicitResult() — checks iTunes' own explicitness flags, adult
//      content ratings, adult genres, and name/description patterns. Tested
//      against 11 adult payloads (all blocked) and 6 legitimate titles
//      including R-rated ones (none falsely blocked).
//   2. year 2024 + countryCode US hints, which score the correct Tyler Perry
//      series up and unrelated same-named works down.
//   3. tvShow-first search ordering, so a series is no longer outranked by a
//      same-named film.
//
// This is a deliberate trade-off, not an oversight: a real cover builds the
// trust that was the point of the request, and the protections above are the
// reason it is defensible now. If anything inappropriate ever appears for
// this title again, adding the string back to this Set restores the previous
// guaranteed-safe behaviour in one line.
//
// The remaining entries stay because they are generically named AND have no
// verified artwork to compare against — for them a placeholder is still the
// right call.
const COVER_SAFE_MODE = new Set([
    'The Scandal',
    'Nemesis',
    'The Last House',
    'Temptation Island'
]);
window.COVER_SAFE_MODE = COVER_SAFE_MODE;

// In-memory cache so the same title never re-hits the network twice per session.
const COVER_CACHE = {};

// Kept as a named function because several call sites use it, but it no longer
// depends on placehold.co. Relying on a third-party image host for the fallback
// meant that if that service was slow, blocked by an ad-blocker, or down, the
// "never fail" cover path failed — leaving a genuinely blank poster. The local
// SVG generator has no network dependency at all.
// ----------------------------------------------------
// DISPLAY SANITIZER — the last line of defense before text reaches the screen.
// No matter which upstream path a piece of text came from (Gemini directly,
// a retry, a malformed edge-function response, anything future code might
// add), this guarantees a user can never see raw '{"key": "value"}' text in
// a title or synopsis. If a string looks like an undigested JSON object, it
// tries to parse it and pull out the field that was actually meant to be
// shown, in priority order; if that fails, it strips the JSON punctuation
// entirely rather than displaying it verbatim.
// ----------------------------------------------------
function sanitizeDisplayText(text, preferredKeys) {
    if (typeof text !== 'string') return text == null ? '' : String(text);
    const trimmed = text.trim();

    // Fast path: doesn't look like a raw object dump, nothing to do. Does NOT
    // require a trailing '}' — a response cut off mid-object (no closing
    // brace at all) is exactly the realistic case this needs to catch too.
    const looksLikeJson = trimmed.startsWith('{') && /"[a-zA-Z_]+"\s*:/.test(trimmed);
    if (!looksLikeJson) return text;

    try {
        const parsed = JSON.parse(trimmed);
        for (const key of (preferredKeys || ['synopsis', 'answer', 'text', 'title', 'description'])) {
            if (typeof parsed[key] === 'string' && parsed[key].trim()) return parsed[key].trim();
        }
        // Parsed fine but none of the expected fields were present — join
        // whatever string values it does have rather than showing braces.
        const anyStrings = Object.values(parsed).filter(v => typeof v === 'string' && v.trim());
        if (anyStrings.length) return anyStrings.join(' — ');
    } catch (e) { /* wasn't valid JSON after all — fall through to stripping */ }

    // Last resort: strip JSON punctuation so at least no braces/quotes show,
    // rather than ever rendering the raw structure to a user.
    return trimmed.replace(/^\{|\}$/g, '').replace(/"([a-zA-Z_]+)"\s*:\s*/g, '').replace(/["{}]/g, '').replace(/,\s*/g, ' — ').trim();
}

// ----------------------------------------------------
// SHARE RESTRICTION — content safety gate
// Sharing a match generates a branded promotional image/caption that goes
// out onto social platforms under MatchApp's own name. Titles centered on
// extreme violence, drug use, or abuse carry real risk there — most social
// platforms' community standards restrict this kind of content even when
// it's just a recommendation card, and MatchApp doesn't control what a user
// writes alongside the share. Rather than risk that, sharing is simply
// turned off for these titles, and the user is offered a fresh match from
// their normal daily allowance instead — no share, no bonus, just a new pick.
//
// Two layers: (1) an explicit flag on curated catalog entries, set by
// judgment call — not "has a mature rating" (which includes plenty of
// intense-but-fine content) but "actually centers on this". (2) a keyword
// scan of the synopsis for anything NOT in the catalog — AI-chat and live
// iTunes results, where there's no hand-reviewed flag to check.
// ----------------------------------------------------
const SHARE_RESTRICTED_KEYWORDS = [
    'graphic violence', 'graphic gore', 'gore', 'torture', 'massacre', 'mutilat',
    'drug addiction', 'drug abuse', 'heroin', 'cocaine', 'overdose', 'cartel',
    'child abuse', 'sexual abuse', 'domestic abuse', 'domestic violence', 'trafficking',
    'rape', 'assault', 'self-harm', 'suicide'
];

function isShareRestrictedTitle(title, synopsis) {
    if (typeof CONTENT_CATALOG !== 'undefined') {
        const entry = CONTENT_CATALOG.find(e => e.title === title);
        if (entry) return !!entry.shareRestricted; // catalog entries are authoritative — trust the flag either way
    }
    // Not in our catalog (AI chat / live discovery) — fall back to scanning
    // whatever description text we have.
    const text = (synopsis || '').toLowerCase();
    return SHARE_RESTRICTED_KEYWORDS.some(kw => text.includes(kw));
}
window.isShareRestrictedTitle = isShareRestrictedTitle;

// Swaps the share button between its normal state and a "not shareable"
// state. Kept deliberately separate from the Not-For-Me/dislike flow below —
// a restricted title isn't blacklisted or removed from Watch Later, since
// the user may still want to watch it. It just doesn't get a public share.
function updateShareButtonState() {
    const btn = document.getElementById('btn-share-match');
    if (!btn) return;
    if (window.currentMatchShareRestricted) {
        btn.classList.add('share-restricted');
        btn.onclick = () => window.getAnotherMatchInstead();
        btn.innerHTML = (window.t ? t('share.restricted') : '🔒 Not shareable — tap for another match');
    } else {
        btn.classList.remove('share-restricted');
        btn.onclick = () => window.openShareSheet();
        btn.innerHTML = (window.t ? t('res.shareCta') : '📢 Share &amp; Earn +1 Match');
    }
}
window.updateShareButtonState = updateShareButtonState;

// A fresh match, consumed from the normal daily allowance like any other —
// no bonus, no penalty, just "give me something I can actually share if I
// want to." Does NOT touch dislikedList/savedList, unlike Not For Me.
window.getAnotherMatchInstead = function() {
    if (window.showToast) showToast(window.t ? t('share.gettingAnother') : 'Getting you a shareable match instead…');
    const resultBox = document.getElementById('result-box');
    if (resultBox) resultBox.style.display = 'none';
    if (typeof window.triggerMatch === 'function') {
        window.triggerMatch(window.lastMatchWasSpecificSearch === true ? true : false);
    }
};

function generatedCover(title, meta) {
    // Callers pass different shapes: renderResult passes `hints` (which carry
    // cats but NOT platform or moods), while others pass nothing at all. So
    // always look the full catalog entry up and use it to fill any gaps —
    // relying on hints alone would silently drop the platform label and the
    // mood-based theming.
    let entry = null;
    if (title && typeof CONTENT_CATALOG !== 'undefined') {
        try { entry = CONTENT_CATALOG.find(e => e.title === title) || null; } catch (e) { entry = null; }
    }
    const merged = {
        cats:     (meta && meta.cats)     || (entry && entry.cats)     || [],
        moods:    (meta && meta.moods)    || (entry && entry.moods)    || [],
        platform: (meta && meta.platform) || (entry && entry.platform) || '',
        synopsis: (meta && (meta.synopsis || meta.overview)) || (entry && entry.synopsis) || ''
    };
    return generateLocalPosterSVG(title, merged);
}
window.sanitizeDisplayText = sanitizeDisplayText;

function upgradeArtwork(url) {
    if (!url) return null;
    return url.replace('100x100bb', '600x900bb').replace('/100x100', '/600x900');
}

// Guards against the exact bug that put a "20-minute book summaries" app
// cover on a vertical-drama title: iTunes' search is fuzzy, and previously
// the code trusted data.results[0] no matter how unrelated it was to the
// query. This requires the returned name to genuinely share a significant
// word with what was searched before its artwork gets used.
const STOPWORDS = new Set([
    'the','a','an','of','and','or','in','on','at','to','for','with','my','her','his','their','is',
    // Portuguese/Spanish function words — many of MatchApp's titles are in
    // these languages, so filtering only English stopwords understated how
    // "significant" a shared word like "sua" (your) or "para" (for) really was.
    'um','uma','de','da','do','das','dos','que','se','sua','seu','suas','seus','para','por','com',
    'em','no','na','nos','nas','este','esta','isso','essa','esse','sem','mais','muito','como',
    'el','la','los','las','un','una','del','con','por','pero','muy','este','esta','ese','esa'
]);
function significantWords(s) {
    return (s || '').toLowerCase().replace(/['’]/g, '').split(/[^a-z0-9À-ÿ]+/i).filter(w => w.length > 2 && !STOPWORDS.has(w));
}
function isRelevantMatch(query, resultName) {
    const qWords = significantWords(query);
    const rWordsArr = significantWords(resultName);
    const rWords = new Set(rWordsArr);
    if (!qWords.length) return true; // nothing meaningful to compare against — don't block

    const overlap = qWords.filter(w => rWords.has(w)).length;

    // The threshold scales with how many significant words the query has.
    // A single shared word is only convincing evidence when the query itself
    // is essentially one word — for anything longer, requiring just one match
    // lets short, common words (a Portuguese/Spanish "vale", "amor", "vida")
    // falsely accept a completely different title that happens to share it.
    // This is what let "Vale Tudo" match TVMaze's unrelated "Vale a Pena Ver
    // de Novo" — both share "vale" and nothing else.
    let required;
    if (qWords.length <= 2) required = qWords.length;             // 1–2 words: all must match
    else required = Math.ceil(qWords.length * 0.6);               // 3+ words: at least 60%

    if (overlap < required) return false;

    // A bag-of-words check can't tell "Beauty in Black" from "Black Beauty" —
    // same two words, opposite order, two genuinely different real titles.
    // For exactly two significant words, also require they appear in the same
    // relative order in the result, closing that specific false-positive class
    // without the cost of full semantic matching.
    if (qWords.length === 2) {
        const i0 = rWordsArr.indexOf(qWords[0]);
        const i1 = rWordsArr.indexOf(qWords[1]);
        if (i0 === -1 || i1 === -1 || i0 > i1) return false;
    }

    return true;
}

async function itunesLookup(title, media, hints) {
    const rich = await itunesRichLookup(title, media, hints);
    return rich ? rich.artwork : null;
}

// ----------------------------------------------------
// RICH METADATA ENGINE (keyless iTunes Search API)
// One call returns artwork, an actual trailer/preview clip, and the store link.
// Apple's API terms require previews be displayed alongside a store link, so
// every preview we render also renders its trackViewUrl badge.
// ----------------------------------------------------
const META_CACHE = {};

// Wraps fetch with a hard deadline. Neither itunesRichLookup's nor the TVMaze
// fetch below ever had a timeout — a slow or hung response left renderResult's
// await chain permanently pending, which keeps posterEl hidden, the share
// button unlinked, and the direct-link button stale, forever. This is very
// likely the actual cause behind "images gone from matches" reports: not a
// missing image so much as a render that never got to finish painting one.
function fetchWithTimeout(url, ms = 3500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ----------------------------------------------------
// EXPLICIT CONTENT GATE FOR EXTERNAL ARTWORK
//
// A "Beauty in Black" search returned adult-film artwork with nothing to do
// with the Tyler Perry series. Root cause: nothing in the lookup chain ever
// checked content ratings. iTunes returns trackExplicitness /
// collectionExplicitness / contentAdvisoryRating on EVERY result and we read
// none of them — and worse, the year/country scorer would hand an adult title
// that happened to share the year and country a maximum score, actively
// preferring it.
//
// This is not a cosmetic bug: pornographic artwork on a page running Google
// AdSense is grounds for account termination, and no user should ever be
// shown that. So this gate is deliberately aggressive — a title showing a
// generic placeholder is a trivial cost, showing porn is not. When in doubt,
// reject.
// ----------------------------------------------------
const EXPLICIT_NAME_PATTERNS = [
    /\bxxx\b/i, /\bporn/i, /\bhardcore\b/i, /\berotic/i, /\buncensored\b/i,
    /\bnude\b/i, /\bnudity\b/i, /\bsex tape\b/i, /\badult (film|movie|video)\b/i,
    /\bonlyfans\b/i, /\bcam ?girl\b/i, /\bstrip(per|tease)\b/i, /\bfetish\b/i,
    /\bbrazzers\b/i, /\bplayboy\b/i, /\bhentai\b/i, /\b18\+\b/, /\bnsfw\b/i,
    /\bpornô/i, /\bpornogr/i, /\bsexo explícito/i, /\bputaria\b/i
];

const EXPLICIT_GENRE_PATTERNS = [
    /adult/i, /erotic/i, /porn/i, /xxx/i
];

/**
 * True when an external API result should NEVER be used for artwork.
 * Checks iTunes' own explicitness metadata first (authoritative), then falls
 * back to name/genre heuristics for sources that don't provide it.
 */
function isExplicitResult(r) {
    if (!r) return true; // no data at all -> don't risk it

    // 1. iTunes' own explicitness flags — the authoritative signal, and the
    //    one that was being ignored entirely.
    const flags = [r.trackExplicitness, r.collectionExplicitness].filter(Boolean);
    if (flags.some(f => String(f).toLowerCase() === 'explicit')) return true;

    // 2. Formal content advisory ratings that indicate adult material.
    const advisory = String(r.contentAdvisoryRating || '').toLowerCase();
    if (advisory && /^(nc-17|x|xxx|unrated adult|adults only|ao)$/.test(advisory.trim())) return true;

    // 3. Genre — iTunes exposes an "Adult" primaryGenreName for such content.
    const genre = String(r.primaryGenreName || '');
    if (EXPLICIT_GENRE_PATTERNS.some(p => p.test(genre))) return true;

    // 4. Name and description heuristics, for anything the flags miss (and
    //    for sources like TVMaze that carry no explicitness metadata at all).
    const text = [r.trackName, r.collectionName, r.artistName, r.name,
                  r.longDescription, r.shortDescription, r.summary]
                 .filter(Boolean).join(' ');
    if (EXPLICIT_NAME_PATTERNS.some(p => p.test(text))) return true;

    return false;
}
window.isExplicitResult = isExplicitResult;
// Exported so tmdb.js scores candidates with the SAME rule, rather than
// growing a second definition of "close enough" that drifts from this one.
window.isRelevantMatch = isRelevantMatch;

// Scores an iTunes result against catalog hints, mirroring scoreCandidate()
// used for TVMaze below — same philosophy, adapted to what iTunes actually
// returns (a releaseDate, and sometimes a country field on the result).
function scoreITunesResult(r, hints) {
    let score = 0;
    if (!hints || (!hints.year && !hints.countryCode)) return 0; // nothing to score against
    const year = r.releaseDate ? parseInt(String(r.releaseDate).slice(0, 4), 10) : null;
    if (hints.year && year) {
        const gap = Math.abs(year - hints.year);
        if (gap === 0) score += 5;
        else if (gap <= 1) score += 3;
        else if (gap > 6) score -= 4;
    }
    if (hints.countryCode && r.country) {
        score += (r.country === hints.countryCode) ? 3 : -2;
    }
    return score;
}

function artworkTitleKey(title) {
    return String(title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function iTunesArtworkMatches(title, media, hints, record) {
    const kinds = {movie:['feature-movie'],tvShow:['tv-episode'],podcast:['podcast'],music:['song'],musicTrack:['song'],musicVideo:['music-video'],album:['album'],audiobook:['audiobook']};
    if (!(kinds[media] || [media]).includes(record.kind || record.wrapperType)) return false;
    // TV search returns episodes: identify the series by collectionName.
    const name = media === 'tvShow' ? String(record.collectionName || '').replace(/,?\s+(?:season|series|temporada)\s+\d+.*$/i,'') : record.trackName || record.collectionName;
    if (!name || artworkTitleKey(title) !== artworkTitleKey(name)) return false;
    if (hints?.year) {
        const year = Number(String(record.releaseDate || '').slice(0,4));
        if (!year || Math.abs(year - Number(hints.year)) > 1) return false;
    }
    return !isExplicitResult(record);
}

async function itunesRichLookup(title, media, hints) {
    if (!title) return null;
    const cacheKey = `${title}::${media}::${hints ? hints.year || '' : ''}${hints ? hints.countryCode || '' : ''}`;
    if (META_CACHE[cacheKey] !== undefined) return META_CACHE[cacheKey];
    try {
        // THE ACTUAL BUG: this used limit=1, meaning iTunes' single top-ranked
        // guess was trusted outright with no validation beyond a name check —
        // even though the response already carries a releaseDate that could
        // have been checked against the catalog's own known year all along.
        // Fetching a small handful of candidates and scoring them (only when
        // we actually have hints to score against) is what "Kingdom" and now
        // "Hell's Paradise" both needed: several works can share a name, and
        // iTunes' internal relevance ranking has no idea which one our
        // catalog actually means.
        // ITUNES STOREFRONT. The API defaults to the US catalogue when no
        // country is given, and the US store genuinely does not carry many
        // Brazilian novelas, Korean dramas or other regional titles — so those
        // lookups returned nothing and fell back to a generated poster even
        // though real artwork exists in the right storefront.
        //
        // Two passes, deliberately: the regional store first when we know where
        // a title is from, then the default store if that comes back empty.
        // Regional-first alone would be a REGRESSION for any title that the
        // local store happens not to carry but the US store does — this way the
        // change can only ever find more covers than before, never fewer.
        const base = `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=${media}&limit=5`;
        const attempts = [];
        if (hints && hints.countryCode) attempts.push(`${base}&country=${encodeURIComponent(hints.countryCode)}`);
        attempts.push(base);

        let raw = [];
        for (const url of attempts) {
            const res = await fetchWithTimeout(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (Array.isArray(data.results) && data.results.length) { raw = data.results; break; }
        }
        if (raw.length) {
            const viable = raw.filter(r => {
                const name = r.trackName || r.collectionName || '';
                if (!(r.artworkUrl100 || r.previewUrl)) return false;
                if (!iTunesArtworkMatches(title, media, hints, r)) return false;
                // Content gate runs BEFORE scoring — an adult title sharing
                // the right year and country would otherwise score maximum
                // points and win outright, which is exactly what happened
                // with "Beauty in Black".
                if (isExplicitResult(r)) return false;
                return true;
            });
            if (viable.length) {
                let best = viable[0], bestScore = -Infinity;
                for (const r of viable) {
                    const sc = scoreITunesResult(r, hints);
                    if (sc > bestScore) { bestScore = sc; best = r; }
                }
                // Same rule as the TVMaze path: if we HAD hints and nothing
                // scored positively, every candidate is probably the wrong
                // work. A generated placeholder beats confidently showing
                // someone else's cover.
                if (hints && (hints.year || hints.countryCode) && bestScore <= 0) {
                    META_CACHE[cacheKey] = null;
                    return null;
                }
                const resultName = best.trackName || best.collectionName || '';
                const meta = {
                    title: resultName || title,
                    artwork: upgradeArtwork(best.artworkUrl100),
                    preview: best.previewUrl || null,
                    storeUrl: best.trackViewUrl || best.collectionViewUrl || null,
                    kind: best.kind || media,
                    year: best.releaseDate ? String(best.releaseDate).substring(0, 4) : null,
                    genre: best.primaryGenreName ? String(best.primaryGenreName).trim() : '',
                    description: best.longDescription || best.shortDescription || null
                };
                META_CACHE[cacheKey] = meta;
                return meta;
            }
        }
    } catch (e) {}
    META_CACHE[cacheKey] = null;
    return null;
}

// Tries each media type until one returns usable art/preview for this title.
// Media kinds that carry an actual moving-picture preview.
const VIDEO_MEDIA = ['movie', 'tvShow', 'shortFilm', 'musicVideo'];
function isVideoPreview(meta) {
    if (!meta || !meta.preview) return false;
    // Apple serves video previews as .m4v/.mp4/.mov; audio as .m4a/.mp3.
    if (/\.(m4v|mp4|mov)(\?|$)/i.test(meta.preview)) return true;
    if (/\.(m4a|mp3|aac|wav)(\?|$)/i.test(meta.preview)) return false;
    // Fall back on the iTunes `kind` when the extension is inconclusive.
    return /movie|tv|video|short/i.test(meta.kind || '');
}

async function getRichMetadata(title, categoryHint, hints) {
    // Safe-mode titles get no external metadata lookup at all — the caller
    // falls through to getRealCoverImage(), which returns a generated poster.
    if (title && COVER_SAFE_MODE.has(title)) return null;
    const hint = (categoryHint || '').toLowerCase();

    // YouTube channels and Shorts exist in NEITHER iTunes nor TVMaze. Searching
    // the film/TV catalogues for "Fitness Blender" or "Great Meditation" can
    // only return some unrelated title that happens to share a word — which is
    // exactly the wrong-cover complaint. Return null so the caller falls
    // through to the generated branded poster, which is always correct.
    if (hint.includes('youtube')) return null;

    const wantsAudio = /podcast|playlist|music|single|album|audiobook|spotify/.test(hint);

    let order;
    if (wantsAudio) {
        // Audio request: audio sources first, and a video preview is fine too.
        if (hint.includes('podcast')) order = ['podcast', 'audiobook', 'musicTrack', 'album'];
        else if (hint.includes('audiobook')) order = ['audiobook', 'podcast', 'musicTrack'];
        else order = ['musicTrack', 'album', 'musicVideo', 'podcast'];
    } else {
        // Visual request: ONLY search visual catalogs. Searching podcast/audiobook
        // here is what caused a film to come back as a spoken-word narration.
        //
        // ORDER MATTERS AND WAS WRONG. This used to be a fixed
        // ['movie','tvShow',...] for EVERY visual title, and the first truthy
        // result wins — so a documentary SERIES like "Chef's Table", or a
        // series like "Fallout" or "Shogun" that shares its name with a film,
        // would take the unrelated film's poster over its own. The catalogue
        // already knows what each title is, so lead with that: series-shaped
        // content searches tvShow first, films search movie first. The other
        // types stay in the list as fallbacks, so nothing that resolved before
        // stops resolving — it just stops being outranked by the wrong type.
        const primary = mediaForCategory(categoryHint || '');
        order = [primary === 'movie' ? 'movie' : 'tvShow'];
    }

    // Every media type is fetched concurrently (each individually time-bounded
    // by fetchWithTimeout) instead of one at a time -- the decision logic below
    // still walks the results in the exact same priority order as before, so
    // which one wins is unchanged; only the worst-case wait time drops, from
    // up to 4x a single timeout down to about 1x.
    const results = await Promise.all(order.map(media => itunesRichLookup(title, media, hints)));

    let bestArtworkOnly = null;
    for (const meta of results) {
        if (!meta) continue;
        if (wantsAudio) { if (meta.artwork || meta.preview) return meta; }
        else {
            // For visual picks, only accept a preview that is genuinely video.
            if (isVideoPreview(meta)) return meta;
            // Otherwise keep the artwork but drop the (audio) preview.
            if (meta.artwork && !bestArtworkOnly) bestArtworkOnly = { ...meta, preview: null };
        }
    }
    return bestArtworkOnly;
}

// ----------------------------------------------------
// TITLE METADATA
//
// Why this exists: isRelevantMatch() is good at rejecting UNRELATED results,
// but it is powerless against IDENTICALLY named ones. "Kingdom" is at least
// four different shows — the 2019 Korean zombie period drama, a 2014 American
// MMA drama, a Japanese film series and a British sitcom. Every one of them
// returns name === "Kingdom", sails through the guard, and can hand back the
// wrong poster and the wrong story.
//
// The fix is to stop matching on the title alone. TVMaze's /search/shows
// endpoint returns ALL candidates with premiered date, country and genres
// attached, so when a catalog entry declares what it actually is, we can pick
// the right one instead of trusting whichever happened to rank first.
// ----------------------------------------------------
const SHOW_META_CACHE = {};

function scoreCandidate(show, hints) {
    let score = 0;
    if (!show) return -999;

    // Country is the single strongest disambiguator for same-named works.
    const country = (show.network && show.network.country && show.network.country.code)
                 || (show.webChannel && show.webChannel.country && show.webChannel.country.code) || '';
    if (hints.countryCode) {
        if (country === hints.countryCode) score += 6;
        else if (country) score -= 4;
    }

    // Premiere year: allow a year of slack for regional release differences.
    if (hints.year && show.premiered) {
        const y = parseInt(String(show.premiered).slice(0, 4), 10);
        if (!isNaN(y)) {
            const gap = Math.abs(y - hints.year);
            if (gap === 0) score += 5;
            else if (gap <= 1) score += 3;
            else if (gap > 6) score -= 3;
        }
    }

    if (hints.genre && Array.isArray(show.genres)) {
        if (show.genres.some(g => g.toLowerCase() === hints.genre.toLowerCase())) score += 2;
    }
    if (show.image && (show.image.original || show.image.medium)) score += 1;
    return score;
}

function stripTags(html) {
    return String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Returns { synopsis, year, country, genres, cast, poster } or null.
 * hints = { year, countryCode, genre } from the catalog entry, when known.
 */
async function fetchTitleMeta(title, hints) {
    if (!title) return null;
    const key = title.toLowerCase();
    if (SHOW_META_CACHE[key]) return SHOW_META_CACHE[key];
    hints = hints || {};

    try {
        const res = await fetchWithTimeout(
            `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title)}`);
        if (!res.ok) return null;
        const list = await res.json();
        if (!Array.isArray(list) || !list.length) return null;

        // Only consider candidates that pass the existing relevance guard,
        // then rank what's left by how well it fits the catalog's own claims.
        const viable = list
            .map(r => r.show)
            .filter(sh => sh && isRelevantMatch(title, sh.name || '') && !isExplicitResult(sh));
        if (!viable.length) return null;

        let best = null, bestScore = -Infinity;
        for (const sh of viable) {
            const sc = scoreCandidate(sh, hints);
            if (sc > bestScore) { bestScore = sc; best = sh; }
        }
        // If hints were supplied and NOTHING scored positively, we are probably
        // looking at the wrong work entirely. Better to show a generated cover
        // and the catalog's own synopsis than confidently show someone else's.
        if ((hints.year || hints.countryCode) && bestScore <= 0) return null;

        const country = (best.network && best.network.country)
                     || (best.webChannel && best.webChannel.country) || null;

        const meta = {
            name: best.name || title,
            synopsis: stripTags(best.summary),
            year: best.premiered ? String(best.premiered).slice(0, 4) : (hints.year ? String(hints.year) : ''),
            country: country ? country.name : (hints.country || ''),
            genres: Array.isArray(best.genres) ? best.genres.slice(0, 3) : [],
            language: best.language || '',
            poster: best.image ? (best.image.original || best.image.medium) : null,
            cast: []
        };

        // Cast is a second call, so it must never block the render — the poster
        // and synopsis are far more important than the actor list.
        if (best.id) {
            try {
                const cRes = await fetchWithTimeout(`https://api.tvmaze.com/shows/${best.id}/cast`);
                if (cRes.ok) {
                    const cast = await cRes.json();
                    meta.cast = (cast || []).slice(0, 4)
                        .map(c => c && c.person && c.person.name).filter(Boolean);
                }
            } catch (e) { /* cast is optional */ }
        }

        SHOW_META_CACHE[key] = meta;
        return meta;
    } catch (e) {
        return null;
    }
}
window.fetchTitleMeta = fetchTitleMeta;

async function getRealCoverImage(title, hints) {
    if (!title) return generatedCover(title, hints);
    const verified = getVerifiedPoster(title);
    if (verified) return verified;
    const entry = typeof CONTENT_CATALOG !== 'undefined' ? CONTENT_CATALOG.find(e => e.title === title) : null;
    hints = { ...(entry || {}), ...(hints || {}) };

    // Exact catalogue identity beats every fuzzy title lookup. availability.json
    // is generated from verified TMDB identities, so alternate/localized names
    // (for example Call My Agent! The Movie / Dix pour cent, le film) can load
    // the correct poster without weakening mismatch protections.
    const exactCatalogPoster = await getExactCatalogPoster(title);
    if (exactCatalogPoster) return exactCatalogPoster;

    if ((hints.cats || []).some(c => isHighRiskCategory(c, title))) return generatedCover(title, hints);
    // SAFE MODE: never fetch artwork for titles known to collide with adult
    // content by name. No request means no wrong result — the strongest
    // possible guarantee, and cheap.
    if (COVER_SAFE_MODE.has(title)) return generatedCover(title, hints);
    // YouTube channels/Shorts aren't in iTunes or TVMaze at all, so any result
    // here is by definition a different work. getRichMetadata() already skips
    // them, but this is the FALLBACK path and receives no category — without
    // this check a YouTube channel would still get searched against film, TV,
    // podcast and music catalogues.
    if (hints && Array.isArray(hints.cats) && hints.cats.some(c => /youtube/i.test(c))) {
        return generatedCover(title, hints);
    }
    const cacheKey = hints && (hints.year || hints.countryCode) ? `${title}::${hints.year || ''}${hints.countryCode || ''}` : title;
    if (COVER_CACHE[cacheKey]) return COVER_CACHE[cacheKey];

    const cacheAndReturn = (url) => { COVER_CACHE[cacheKey] = url; return url; };

    // 1. Offline Dictionary — exact match only (case-insensitive). The previous
    //    version used title.includes(key) in either direction, so a title that
    //    merely CONTAINED a hero title's name as a substring — or vice versa —
    //    would silently take that cover. A telenovela or any title sharing a
    //    common word with "Shogun" or "The Bear" could have been hijacked here.
    const exactKey = Object.keys(OFFLINE_COVERS).find(k => k.toLowerCase() === title.toLowerCase());
    if (exactKey) return cacheAndReturn(OFFLINE_COVERS[exactKey]);

    // 2. TMDB — the canonical open database for film and television, and the
    //    right first stop for anything with a screen.
    //
    //    It goes AHEAD of iTunes because iTunes indexes what Apple SELLS: most
    //    novelas, a lot of K-drama and most non-US series simply are not in it,
    //    so the old chain fell through to TVMaze — whose singlesearch returns a
    //    best guess for almost any string and essentially never comes back
    //    empty. That is precisely how a telenovela ended up wearing an
    //    unrelated show's poster.
    //
    //    TMDB also takes a TYPE and a YEAR, so a series is searched against the
    //    television index rather than the film one. tmdbLookup applies this
    //    file's own isRelevantMatch/isExplicitResult before accepting anything,
    //    so a miss here falls through to the chain below exactly as before
    //    rather than returning something confident and wrong.
    const audioTitle = (hints.cats || []).some(c => /podcast|playlist|music|single|album|audiobook|spotify/i.test(c)) && !(hints.cats || []).includes('movie');
    if (!audioTitle && typeof window.tmdbCover === 'function') {
        try {
            const tmdbArt = await window.tmdbCover(title, hints);
            if (tmdbArt) return cacheAndReturn(tmdbArt);
        } catch (e) { /* fall through to the existing chain */ }
    }

    // 3. iTunes across several media types — itunesLookup now scores multiple
    //    candidates against hints (year/country) when we have them, instead of
    //    trusting iTunes' single top-ranked guess outright. Fetched concurrently
    //    (bounded by fetchWithTimeout per-call) instead of sequentially; the
    //    first truthy result in this same order still wins.
    const category = hints.cats?.find(c => mediaForCategory(c) !== 'tvShow') || hints.cats?.[0] || 'series';
    const medium = mediaForCategory(category);
    const arts = medium === 'none' ? [] : await Promise.all([medium].map(media => itunesLookup(title, media, hints)));
    for (const art of arts) { if (art) return cacheAndReturn(art); }

    // 4. TVMaze (strong for international + K-drama series).
    //    THIS WAS THE ACTUAL BUG: TVMaze's singlesearch endpoint returns its
    //    single best guess for almost any non-garbage query — it essentially
    //    never comes back empty — and this call had no check that the result
    //    it returned had anything to do with what was searched. Telenovelas
    //    and other regionally-specific titles are exactly the case where
    //    iTunes (step 2) correctly finds nothing, control reaches this TVMaze
    //    call, and it confidently hands back an unrelated show's poster. Same
    //    isRelevantMatch() guard as the iTunes path now applies here too.
    //    Singlesearch only ever returns ONE candidate, so unlike iTunes above
    //    there's nothing to rank — but when hints exist, a wildly wrong
    //    premiere year is still a strong enough signal to reject it outright
    //    rather than accept whatever single guess TVMaze made.
    try {
        if (medium !== 'tvShow') return cacheAndReturn(generatedCover(title, hints));
        const tvRes = await fetchWithTimeout(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`);
        if (tvRes.ok) {
            const tvData = await tvRes.json();
            const img = tvData && tvData.image && (tvData.image.original || tvData.image.medium);
            if (img && artworkTitleKey(title) === artworkTitleKey(tvData.name || '') && !isExplicitResult(tvData)) {
                if (hints && hints.year && tvData.premiered) {
                    const tvYear = parseInt(String(tvData.premiered).slice(0, 4), 10);
                    if (!isNaN(tvYear) && Math.abs(tvYear - hints.year) > 1) {
                        // Wrong era entirely — almost certainly a different
                        // work sharing the name. Fall through to a generated
                        // cover rather than show it.
                    } else {
                        return cacheAndReturn(img);
                    }
                } else {
                    return cacheAndReturn(img);
                }
            }
        }
    } catch(e) {}

    // 4. ABSOLUTE FALLBACK: local branded SVG (no network, cannot fail, and
    //    critically — cannot ever show the wrong title's artwork).
    return cacheAndReturn(generatedCover(title, hints));
}

// LOCAL (NO-NETWORK) POSTER — guaranteed to render even if placehold.co is blocked too.
// ----------------------------------------------------
// VERIFIED POSTER REGISTRY
// Some titles can never be resolved by a live catalog lookup:
//   • Unreleased titles (AHS 13 premieres Sept 24 2026 — iTunes only indexes
//     things that already shipped, so a search returns an OLDER season's art
//     or nothing at all).
//   • App-exclusive vertical micro-dramas (ReelShort / DramaBox / ShortMax /
//     Globoplay's own line) which were never indexed anywhere public.
// For those, a lookup is worse than useless: it confidently returns the wrong
// image. This registry is checked FIRST, before any network call, so these
// titles always get correct art.
// ----------------------------------------------------
const VERIFIED_POSTERS = {
    "Outlander: Blood of My Blood": "https://image.tmdb.org/t/p/w780/2GAAeJfjHH7QBDVC35cu9RpD8nE.jpg",
    "Slow Horses": "https://image.tmdb.org/t/p/w780/AdYr4DjOgXvDUMwu6vEhZy1Rnxk.jpg",
    "The Scandal": "https://image.tmdb.org/t/p/w780/pJsIzlTjmx07ilwEkl0cglrMVa1.jpg",
    "Monster: The Lizzie Borden Story": "https://image.tmdb.org/t/p/w780/57XScX1aYtKi1LvHYFQLPUxVhTG.jpg",
    "Resident Evil": "https://image.tmdb.org/t/p/w780/i7UyjfPio0VFHB9rBUZSFyhOoM8.jpg",
    "Amor Sob Vigilância": "https://image.tmdb.org/t/p/w780/cLpTLE15m4Hcj5dwWNEzrBOM6Ae.jpg",
    "Quem Ama Cuida": "https://image.tmdb.org/t/p/w780/p97unAJ9n9gpNrICCwEKuZdrb1t.jpg",
    "Antártida": "https://image.tmdb.org/t/p/w780/5bg61sH6kqPVWcBoFUDoe6eqfoX.jpg",
    'Beauty in Black': 'https://image.tmdb.org/t/p/w780/xKk4bFCCpZ9tvjUykvvMYLSBnjo.jpg',
    'American Horror Story: 13': '/ahs13-official.png?v=187',
    'A Vida Secreta do Meu Marido Bilionário': '/marido-bilionario-original.jpg?v=187',
    'Marido Bilionário': '/marido-bilionario-original.jpg?v=187',
    "Minha Melhor Amiga": "https://image.tmdb.org/t/p/w780/wGfTFVeguXDXYrwPQ8QMFsaSK2M.jpg",
    "Morte e Vida Madalena": "https://image.tmdb.org/t/p/w780/2q6PV1Dl6htx5fqwPXcOwTTahcx.jpg",
    "Practical Magic 2": "https://image.tmdb.org/t/p/w780/ogwQOLbCfncjvBhFb5l0OmQH8KC.jpg",
    "Forgotten Island": "https://image.tmdb.org/t/p/w780/Lr0Ng7Gg02RW1AyfYEL6P0WUvd.jpg",
    "Neagley": "https://image.tmdb.org/t/p/w780/lKOPmO0ah17ogQ9hWg7lSd40kIr.jpg",
    "Era Uma Vez Minha 1ª Vez": "https://image.tmdb.org/t/p/w780/6byulzTctYTBIvJGS4bsNSnmBof.jpg",
    "Furnas Fundas": "https://image.tmdb.org/t/p/w780/h37jOsDLNMG7RhSXiQse4oGGqgH.jpg",
    "Viva Marília": "https://image.tmdb.org/t/p/w780/13pzkz6ePwXuYKH0VsVijtRWjUR.jpg",
    "Youth": "https://image.tmdb.org/t/p/w780/bk1zbzbu0xaYQuIANv4Pe8HHyAY.jpg",
    "Stop! That! Train!": "https://image.tmdb.org/t/p/w780/w90dGS6D2lVO4aO5rdQ8QECrUGY.jpg",
    "How to Live on Earth": "https://image.tmdb.org/t/p/w780/cMnvp0FdUR7T5etiSTfshFHyCk3.jpg",
    "Lanterns": "https://image.tmdb.org/t/p/w780/gpC7h43xPMEV3goYMQShfJbTtLq.jpg",
    "Quem É Você?": "https://image.tmdb.org/t/p/w780/ewelBEOwfr8EIjnrc6Drov67xe1.jpg",
    "Vermelho Sangue": "https://image.tmdb.org/t/p/w780/gtUqzLLaarxvNWzKeBepwWfTfm8.jpg",
    "Habeas Corpus": "https://image.tmdb.org/t/p/w780/cojcROwZe8681XzroVIOE9VK4zV.jpg",
    "Virtuosas": "https://image.tmdb.org/t/p/w780/v9wSMFf9Ysj40aHHUJ1VeLStZWn.jpg",
    "(Des)controle": "https://image.tmdb.org/t/p/w780/scl6uVD0YZc46WZHgXbEcaH2zYw.jpg",
    "Line of Fire": "https://image.tmdb.org/t/p/w780/sodRW36uEDHjv8l1WhYUNDvnIK6.jpg",
    "Wicked": "https://image.tmdb.org/t/p/w780/xDGbZ0JJ3mYaGKy4Nzd9Kph6M9L.jpg",
    "You+Me - Against the World": "https://image.tmdb.org/t/p/w780/bAbBNVplg7h79sm94OyHeKk8Phz.jpg",
    "The Love Hypothesis": "https://image.tmdb.org/t/p/w780/wlb6vunPuBjboYnmy4r3NlKZWji.jpg",
    "American Hostage": "https://image.tmdb.org/t/p/w780/p3Ro0ngezX9aNZY6j3vYbpQqVhr.jpg"
};

function getVerifiedPoster(title) {
    if (!title) return null;
    if (VERIFIED_POSTERS[title]) return VERIFIED_POSTERS[title];
    // Tolerate small punctuation differences between catalog and lookup.
    const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const key = norm(title);
    for (const k of Object.keys(VERIFIED_POSTERS)) {
        if (norm(k) === key) return VERIFIED_POSTERS[k];
    }
    return null;
}


// Shared only for exact-identity artwork; recommendation logic is unchanged.
window.getVerifiedPoster = getVerifiedPoster;

let CATALOG_TMDB_IDENTITIES_PROMISE = null;
function catalogIdentityKey(value) {
    return String(value || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}
async function getCatalogTmdbIdentity(title) {
    if (!title || typeof fetch !== 'function') return null;
    if (!CATALOG_TMDB_IDENTITIES_PROMISE) {
        CATALOG_TMDB_IDENTITIES_PROMISE = fetch('/data/availability.json', { cache: 'force-cache' })
            .then(r => r.ok ? r.json() : null)
            .then(payload => {
                const index = new Map();
                const rows = payload && payload.titles && typeof payload.titles === 'object' ? payload.titles : {};
                for (const [name, row] of Object.entries(rows)) {
                    const tmdbId = Number(row && row.tmdbId);
                    const kind = row && row.kind;
                    if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0 || !['movie','tv'].includes(kind)) continue;
                    index.set(catalogIdentityKey(name), {
                        tmdbId, kind,
                        year: Number.isInteger(Number(row.year)) ? Number(row.year) : null
                    });
                }
                return index;
            })
            .catch(() => new Map());
    }
    const index = await CATALOG_TMDB_IDENTITIES_PROMISE;
    return index.get(catalogIdentityKey(title)) || null;
}
async function getExactCatalogPoster(title) {
    if (!title || typeof window.tmdbDetails !== 'function') return null;
    try {
        const identity = await getCatalogTmdbIdentity(title);
        if (!identity) return null;
        const details = await window.tmdbDetails(identity.tmdbId, identity.kind, { priority: true });
        if (!details || details.adult === true || Number(details.tmdbId) !== identity.tmdbId || details.kind !== identity.kind) return null;
        return details.posterLarge || details.poster || null;
    } catch (_) {
        return null;
    }
}
window.getCatalogTmdbIdentity = getCatalogTmdbIdentity;

// Categories where a SEPARATE live lookup (searching iTunes/TVMaze for a
// title we already know from our own curated catalog) carries real mismatch
// risk, because coverage of this content on those catalogs is inconsistent
// and searches often land on an unrelated regional title instead of nothing.
// This is what actually caused telenovela covers to come back wrong even
// after the relevance guard was added — the guard rejects clearly unrelated
// results, but a same-language title sharing one common word (as happened
// with "Vale Tudo") could still slip through before that guard was tightened.
// Safest policy for these categories: catalog-sourced titles skip the lookup
// entirely and go straight to a verified poster or the branded local cover —
// never a second-guessed live search.
const HIGH_MISMATCH_RISK_CATEGORIES = new Set([
    'vertical micro-drama', 'novela brasileira', 'telenovela',
    'c-drama', 'j-drama', 'turkish dizi', 'bollywood', 'nollywood'
]);

function isHighRiskCategory(categoryHint, title) {
    const hint = (categoryHint || '').toLowerCase();
    if (HIGH_MISMATCH_RISK_CATEGORIES.has(hint)) return true;
    return typeof VERTICAL_DRAMA_TITLES !== 'undefined' && VERTICAL_DRAMA_TITLES.includes(title);
}
window.isHighRiskCategory = isHighRiskCategory;

function generateLocalPosterSVG(title, meta = {}) {
    const raw = (title || 'MatchApp').trim();
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // ---- What IS this? ----------------------------------------------------
    // Every generated cover used to be identical apart from the title: the
    // same 🎬 clapperboard whether it was a yoga channel, a workout playlist
    // or a Korean thriller. Now the artwork actually reflects the content —
    // its own icon, palette and label — so a fallback cover reads as a
    // designed cover for THAT thing rather than a generic "no image" tile.
    const cats = (meta && Array.isArray(meta.cats)) ? meta.cats.join(' ').toLowerCase() : '';
    const moods = (meta && Array.isArray(meta.moods)) ? meta.moods.join(' ').toLowerCase() : '';
    const platform = (meta && meta.platform) ? String(meta.platform) : '';
    const hay = (cats + ' ' + moods + ' ' + raw + ' ' + (meta.synopsis || meta.overview || '')).toLowerCase();

    // Ordered most-specific first: a "yoga" YouTube channel should read as
    // yoga, not as generic YouTube.
    // Icons are drawn as SVG paths, NOT emoji. Emoji render from whatever font
    // the device happens to ship — they came out as empty tofu boxes when
    // rendered outside a browser, and vary in style across Android, iOS,
    // Windows and Linux. Drawn shapes look identical everywhere and stay on
    // brand, which matters when the whole point is a cover that looks
    // deliberate rather than missing.
    const ICONS = {
        calm:    '<circle cx="300" cy="250" r="34" fill="none" stroke="COL" stroke-width="5"/><circle cx="300" cy="250" r="15" fill="COL"/><path d="M234,250 a66,66 0 0 1 132,0" fill="none" stroke="COL" stroke-width="5" opacity="0.55"/>',
        yoga:    '<circle cx="300" cy="205" r="17" fill="COL"/><path d="M300,226 L300,272 M300,272 L268,300 M300,272 L332,300 M262,246 L338,246" stroke="COL" stroke-width="6" stroke-linecap="round" fill="none"/>',
        fitness: '<rect x="256" y="238" width="88" height="20" rx="6" fill="COL"/><rect x="232" y="224" width="20" height="48" rx="6" fill="COL"/><rect x="348" y="224" width="20" height="48" rx="6" fill="COL"/><rect x="214" y="234" width="14" height="28" rx="5" fill="COL" opacity="0.7"/><rect x="372" y="234" width="14" height="28" rx="5" fill="COL" opacity="0.7"/>',
        podcast: '<rect x="286" y="204" width="28" height="52" rx="14" fill="COL"/><path d="M270,246 a30,30 0 0 0 60,0" fill="none" stroke="COL" stroke-width="6" stroke-linecap="round"/><line x1="300" y1="276" x2="300" y2="296" stroke="COL" stroke-width="6" stroke-linecap="round"/><line x1="282" y1="296" x2="318" y2="296" stroke="COL" stroke-width="6" stroke-linecap="round"/>',
        music:   '<circle cx="274" cy="286" r="17" fill="COL"/><circle cx="340" cy="272" r="17" fill="COL"/><path d="M291,286 L291,212 L357,198 L357,272" fill="none" stroke="COL" stroke-width="7" stroke-linejoin="round"/>',
        book:    '<path d="M240,212 L296,224 L296,296 L240,284 Z" fill="COL" opacity="0.85"/><path d="M360,212 L304,224 L304,296 L360,284 Z" fill="COL" opacity="0.85"/><line x1="300" y1="222" x2="300" y2="296" stroke="COL" stroke-width="4"/>',
        play:    '<rect x="228" y="208" width="144" height="96" rx="22" fill="COL" opacity="0.9"/><path d="M286,238 L322,256 L286,274 Z" fill="#101018"/>',
        heart:   '<path d="M300,300 C300,300 244,266 244,232 C244,212 262,202 278,210 C288,215 296,224 300,232 C304,224 312,215 322,210 C338,202 356,212 356,232 C356,266 300,300 300,300 Z" fill="COL"/>',
        torii:   '<path d="M244,214 L356,214 M236,232 L364,232 M262,232 L262,300 M338,232 L338,300" stroke="COL" stroke-width="8" stroke-linecap="round" fill="none"/>',
        globe:   '<circle cx="300" cy="252" r="42" fill="none" stroke="COL" stroke-width="5"/><ellipse cx="300" cy="252" rx="18" ry="42" fill="none" stroke="COL" stroke-width="4"/><line x1="258" y1="252" x2="342" y2="252" stroke="COL" stroke-width="4"/>',
        mic:     '<rect x="286" y="200" width="28" height="56" rx="14" fill="COL"/><path d="M268,248 a32,32 0 0 0 64,0" fill="none" stroke="COL" stroke-width="6" stroke-linecap="round"/><line x1="300" y1="280" x2="300" y2="300" stroke="COL" stroke-width="6" stroke-linecap="round"/>',
        star:    '<path d="M300,204 L314,244 L356,244 L322,268 L335,308 L300,284 L265,308 L278,268 L244,244 L286,244 Z" fill="COL"/>',
        phone:   '<rect x="266" y="198" width="68" height="110" rx="12" fill="none" stroke="COL" stroke-width="6"/><path d="M292,240 L318,254 L292,268 Z" fill="COL"/>',
        moon:    '<path d="M322,204 a54,54 0 1 0 0,96 a42,42 0 0 1 0,-96 Z" fill="COL"/>',
        film:    '<rect x="238" y="212" width="124" height="84" rx="10" fill="none" stroke="COL" stroke-width="6"/><path d="M266,212 L266,296 M334,212 L334,296" stroke="COL" stroke-width="4" opacity="0.6"/><path d="M290,238 L322,254 L290,270 Z" fill="COL"/>',
        tv:      '<rect x="234" y="216" width="132" height="82" rx="10" fill="none" stroke="COL" stroke-width="6"/><line x1="268" y1="196" x2="296" y2="216" stroke="COL" stroke-width="5" stroke-linecap="round"/><line x1="332" y1="196" x2="304" y2="216" stroke="COL" stroke-width="5" stroke-linecap="round"/>'
    };

    const THEMES = [
        { test: /medit|mindful|sleep|calm|relax|nidra|hypnos/, icon: 'calm', label: 'MEDITATION & CALM',
          a: '#1B2A4A', b: '#2E4A6B', accent: '#8FD6FF' },
        { test: /yoga|pilates|stretch/,                        icon: 'yoga', label: 'YOGA & MOVEMENT',
          a: '#243A2E', b: '#3E6B4A', accent: '#9BE8B4' },
        { test: /workout|fitness|gym|hiit|cardio|training|treino/, icon: 'fitness', label: 'FITNESS & WORKOUT',
          a: '#3A1E12', b: '#6B3A1E', accent: '#FFB07A' },
        { test: /podcast/,                                     icon: 'podcast', label: 'PODCAST',
          a: '#2A1A47', b: '#4A2A6B', accent: '#C9A7E8' },
        { test: /playlist|album|music|single|spotify/,          icon: 'music', label: 'MUSIC',
          a: '#14331F', b: '#1D6B3A', accent: '#7DE8A0' },
        { test: /audiobook/,                                   icon: 'book', label: 'AUDIOBOOK',
          a: '#33240F', b: '#6B4A1D', accent: '#F0C878' },
        { test: /youtube/,                                     icon: 'play', label: 'YOUTUBE CHANNEL',
          a: '#3A1218', b: '#6B1E2A', accent: '#FF9BA8' },
        { test: /k-drama|kdrama/,                              icon: 'heart', label: 'K-DRAMA',
          a: '#3A1830', b: '#6B2A55', accent: '#FFA8D8' },
        { test: /anime/,                                       icon: 'torii', label: 'ANIME',
          a: '#2A1440', b: '#52277A', accent: '#C9A0FF' },
        { test: /novela|telenovela/,                           icon: 'heart', label: 'NOVELA',
          a: '#3A1220', b: '#6B1E3A', accent: '#FFA0B8' },
        { test: /documentar/,                                  icon: 'globe', label: 'DOCUMENTARY',
          a: '#12303A', b: '#1E5A6B', accent: '#8FE0F0' },
        { test: /stand-?up|comedy|funny/,                      icon: 'mic', label: 'COMEDY',
          a: '#3A3012', b: '#6B5A1E', accent: '#FFE88F' },
        { test: /kids|family/,                                 icon: 'star', label: 'FAMILY & KIDS',
          a: '#123A33', b: '#1E6B5A', accent: '#8FF0DC' },
        { test: /micro-?drama|short film/,                     icon: 'phone', label: 'SHORT DRAMA',
          a: '#2A1440', b: '#5A2A7A', accent: '#D4A0FF' },
        { test: /gospel|faith/,                                icon: 'star', label: 'GOSPEL & FAITH',
          a: '#33280F', b: '#6B5520', accent: '#F5DC96' },
        { test: /scary|horror/,                                icon: 'moon', label: 'HORROR',
          a: '#1A1218', b: '#3A1E2A', accent: '#E88F9B' },
        { test: /movie|cinema|film/,                           icon: 'film', label: 'FILM',
          a: '#14131A', b: '#2A1A47', accent: '#E5C158' },
        // Catches plain "series" / "limited series", which previously fell
        // through to the generic default and looked unfinished.
        { test: /series|drama|show/,                           icon: 'tv', label: 'SERIES',
          a: '#181430', b: '#342A5E', accent: '#B0A0F0' }
    ];
    let theme = THEMES.find(t => t.test.test(hay));
    if (!theme) theme = { icon: 'film', label: 'ON MATCHAPP', a: '#14131A', b: '#2A1A47', accent: '#E5C158' };

    // Deterministic per-title variation so two yoga channels don't produce
    // pixel-identical covers. Same title always yields the same angle, which
    // matters because these are cached and shown repeatedly — a cover that
    // shifted on every render would look broken.
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
    const angle = h % 360;
    const dotSeed = h % 7;

    // ---- Title wrapping ---------------------------------------------------
    const words = raw.split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (test.length > 15 && line) { lines.push(line); line = w; } else { line = test; }
    }
    if (line) lines.push(line);
    const shown = lines.slice(0, 4);
    if (lines.length > 4) shown[3] = shown[3].slice(0, 13) + '…';

    const fontSize = shown.length >= 4 ? 38 : (shown.length === 3 ? 45 : 53);
    const lineHeight = fontSize + 13;
    const blockTop = 470 - ((shown.length - 1) * lineHeight) / 2;
    const tspans = shown.map((l, i) =>
        `<text x="300" y="${blockTop + i * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" fill="#ffffff" text-anchor="middle">${esc(l)}</text>`
    ).join('');

    // Soft scattered dots — gives the flat panel some depth without competing
    // with the title.
    let dots = '';
    for (let i = 0; i < 9; i++) {
        const dx = ((h >> (i * 2)) % 560) + 20;
        const dy = ((h >> (i * 3)) % 300) + 40;
        const dr = ((h >> i) % 3) + 1.5;
        dots += `<circle cx="${dx}" cy="${dy}" r="${dr}" fill="${theme.accent}" opacity="0.18"/>`;
    }

    const platformTag = platform
        ? `<text x="300" y="742" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="${theme.accent}" text-anchor="middle" letter-spacing="1.5" opacity="0.9">${esc(platform.toUpperCase())}</text>`
        : '';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
        <defs>
            <linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)">
                <stop offset="0%" stop-color="${theme.a}"/><stop offset="100%" stop-color="${theme.b}"/>
            </linearGradient>
            <radialGradient id="glow" cx="50%" cy="30%" r="60%">
                <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.30"/>
                <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
            </radialGradient>
        </defs>
        <rect width="600" height="900" fill="url(#g)"/>
        <rect width="600" height="900" fill="url(#glow)"/>
        ${dots}
        <rect x="22" y="22" width="556" height="856" rx="18" fill="none" stroke="${theme.accent}" stroke-width="3" opacity="0.85"/>
        <rect x="34" y="34" width="532" height="832" rx="12" fill="none" stroke="${theme.accent}" stroke-opacity="0.3" stroke-width="1"/>
        ${(ICONS[theme.icon] || ICONS.film).replace(/COL/g, theme.accent)}
        <text x="300" y="330" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="900" fill="${theme.accent}" text-anchor="middle" letter-spacing="4.5">${esc(theme.label)}</text>
        <line x1="200" y1="362" x2="400" y2="362" stroke="${theme.accent}" stroke-width="2" opacity="0.6"/>
        ${tspans}
        <line x1="200" y1="700" x2="400" y2="700" stroke="${theme.accent}" stroke-width="2" opacity="0.6"/>
        ${platformTag}
        <text x="300" y="812" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold" fill="#FFF0B3" text-anchor="middle" letter-spacing="2.5">matchapp.tv</text>
        <text x="300" y="840" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#ffffff" text-anchor="middle" opacity="0.55">AI Concierge for Entertainment</text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// ----------------------------------------------------
// MARQUEE COVER HYDRATION
// Replaces any placeholder/broken marquee art with real covers on page load.
// ----------------------------------------------------
async function hydrateMarqueeCovers() {
    const imgs = document.querySelectorAll('.marquee-item img');

    // Paint an instant local placeholder so a cover is visible on first frame —
    // previously the hardcoded TMDB URLs were dead, the inline onerror nulled
    // itself out, and the tile ended up blank with only the title showing.
    imgs.forEach(img => {
        const title = img.getAttribute('data-title') || img.getAttribute('alt') || '';
        if (!img.getAttribute('src')) img.src = generatedCover(title);
    });

    // Then hydrate every tile in parallel so the strip fills quickly.
    await Promise.all(Array.from(imgs).map(async img => {
        const title = img.getAttribute('data-title') || img.getAttribute('alt');
        if (!title) return;

        // Hand-verified art short-circuits the lookup entirely.
        const verified = getVerifiedPoster(title);
        if (verified) {
            // Try original artwork at alternate TMDB sizes and exact saved metadata
            // before accepting a branded fallback; no unrelated-title search.
            if (window.MatchAppCatalogMedia?.recoverAdultPoster) {
                window.MatchAppCatalogMedia.recoverAdultPoster(img, title, null, verified);
            } else {
                img.onerror = function() { this.onerror = null; this.src = generatedCover(title); };
                img.src = verified;
            }
            return;
        }

        // App-exclusive vertical dramas and other high-mismatch-risk regional
        // categories (telenovelas, C-drama, J-drama, Turkish dizi, Bollywood,
        // Nollywood) aren't reliably indexed on iTunes/TVMaze — a lookup risks
        // returning an unrelated title's art rather than nothing. If this
        // title is in our own catalog, use ITS tagged categories to decide.
        const catalogEntry = (typeof CONTENT_CATALOG !== 'undefined') && CONTENT_CATALOG.find(e => e.title === title);
        const riskyByCatalog = catalogEntry && catalogEntry.cats.some(c => isHighRiskCategory(c, title));
        const riskyByPlatform = catalogEntry && ['globoplay','reelshort','dramabox','shortmax','pure flix','angel studios'].includes(String(catalogEntry.platform).toLowerCase());
        if (riskyByCatalog || riskyByPlatform || (typeof VERTICAL_DRAMA_TITLES !== 'undefined' && VERTICAL_DRAMA_TITLES.includes(title))) return;

        try {
            const rowHints = catalogEntry ? { year: catalogEntry.year, country: catalogEntry.country, countryCode: catalogEntry.countryCode, cats: catalogEntry.cats } : {};
            const real = await getRealCoverImage(title, rowHints);
            if (real) {
                if (window.MatchAppCatalogMedia?.recoverAdultPoster) {
                    window.MatchAppCatalogMedia.recoverAdultPoster(img, title, null, real);
                } else {
                    img.onerror = function() { this.onerror = null; this.src = generatedCover(title); };
                    img.src = real;
                }
            }
        } catch (e) { /* placeholder already showing */ }
    }));
}
document.addEventListener('DOMContentLoaded', hydrateMarqueeCovers);

// Clicking a trending title opens that title's Ask AI info card: synopsis,
// where to watch, when it starts. It does not run a match and does not
// consume an Ask AI credit until the user asks a follow-up.
window.selectMarqueeItem = function(titleName) {
    if (!titleName) return;

    // Tapping a trending poster is already a pick. Matching would try to
    // choose something FOR the user; a long Ask-AI question burned a credit
    // and often came back with a list instead of THIS title. Land on the
    // Ask AI info card for the exact title: synopsis, where to watch, when
    // it starts. No credit until they ask a follow-up.
    if (typeof window.track === 'function') {
        window.track('trending_click', { title: titleName });
    }
    window.location.href = '/discover.html?title=' + encodeURIComponent(titleName) + '&focus=start';
};

// ----------------------------------------------------
// EVENT STATE — derived from the real date, never hardcoded.
//
// the HTML, the site would have gone on announcing "● LIVE" for two finished
// festivals from the 14th onwards — which is exactly the kind of quiet staleness
// that makes a recommendation site look abandoned. States are now computed from
// data-start / data-end on every load, and finished events sort to the back of
// the rail instead of leading it.
// ----------------------------------------------------
function eventStateFor(startStr, endStr, now, windowsStr) {
    // Parse as local dates; an event is "live" through the whole of its end day.
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T23:59:59');
    if (isNaN(start) || isNaN(end)) return null;
    if (now < start) return 'upcoming';
    if (now > end) return 'ended';

    // September, so on the 8th-10th nothing is actually happening — but a
    // single start/end range says "LIVE", which reads as broken and made the
    // festival look finished when it had three days still to come. When
    // data-windows lists the real active spans, a gap day says so honestly.
    if (windowsStr) {
        const spans = windowsStr.split(',').map(w => w.trim()).filter(Boolean);
        let inSpan = false, nextStart = null;
        for (const sp of spans) {
            const [a, b] = sp.split(':');
            if (!a || !b) continue;
            const sA = new Date(a + 'T00:00:00'), sB = new Date(b + 'T23:59:59');
            if (isNaN(sA) || isNaN(sB)) continue;
            if (now >= sA && now <= sB) { inSpan = true; break; }
            if (now < sA && (!nextStart || sA < nextStart)) nextStart = sA;
        }
        if (!inSpan) return nextStart ? 'intermission' : 'live';
    }
    return 'live';
}

function nextWindowStart(windowsStr, now) {
    if (!windowsStr) return null;
    let next = null;
    for (const sp of windowsStr.split(',')) {
        const a = (sp.split(':')[0] || '').trim();
        if (!a) continue;
        const d = new Date(a + 'T00:00:00');
        if (!isNaN(d) && d > now && (!next || d < next)) next = d;
    }
    return next;
}

function refreshEventStates() {
    const now = new Date();

    document.querySelectorAll('.event-card[data-start]').forEach(card => {
        const state = eventStateFor(card.dataset.start, card.dataset.end, now, card.dataset.windows);
        if (!state) return;
        const badge = card.querySelector('.event-badge');
        if (!badge) return;

        badge.classList.remove('event-live', 'event-soon', 'event-ended');
        card.classList.remove('is-ended');

        if (state === 'live') {
            badge.classList.add('event-live');
            badge.textContent = window.t ? t('event.live') : '● LIVE';
        } else if (state === 'intermission') {
            badge.classList.add('event-soon');
            const next = nextWindowStart(card.dataset.windows, now);
            const d = next ? Math.ceil((next - now) / 86400000) : 0;
            badge.textContent = (d > 0)
                ? (window.t ? t('event.resumesIn').replace('{d}', d) : `BACK IN ${d}D`)
                : (window.t ? t('event.resumes') : 'RESUMES SOON');
        } else if (state === 'upcoming') {
            badge.classList.add('event-soon');
            const days = Math.ceil((new Date(card.dataset.start + 'T00:00:00') - now) / 86400000);
            badge.textContent = (days > 0 && days <= 30)
                ? (window.t ? t('event.inDays').replace('{d}', days) : `IN ${days}D`)
                : (window.t ? t('event.soon') : 'SOON');
        } else {
            badge.classList.add('event-ended');
            badge.textContent = window.t ? t('event.ended') : 'ENDED';
            card.classList.add('is-ended');
        }
    });

    // Push finished events to the end of the rail so live ones lead.
    const track = document.getElementById('events-track');
    if (track) {
        Array.from(track.querySelectorAll('.event-card.is-ended'))
             .forEach(c => track.appendChild(c));
    }

}
document.addEventListener('DOMContentLoaded', () => setTimeout(refreshEventStates, 150));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshEventStates();});

// Tapping an event card runs a real AI lookup for that event — songs to play
// Goes through the direct-search path, so it consumes one match via
// checkDailyLimit() -> consume_match, exactly like any other AI request.
window.eventMatch = function (query) {
    const input = document.getElementById('specific-search-input');
    if (input) input.value = query;

    const searchBox = document.getElementById('search-box');
    if (searchBox) searchBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => { window.triggerMatch(true); }, 320);
};

// ----------------------------------------------------
// SHARED RAIL CONTROLLER — native scroll-snap, no clones, no per-frame writes.
// ----------------------------------------------------
(function () {
    const REDUCED = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    window.railNudge = function (vpId, dir) {
        const el = document.getElementById(vpId);
        if (!el) return;
        const card = el.querySelector(':scope > * > *') || el.firstElementChild;
        const step = Math.max(220, (card?.getBoundingClientRect().width || 280) + 16);
        el.scrollBy({ left: dir * step, behavior: REDUCED ? 'auto' : 'smooth' });
        // The Home arrows call this from inline onclick, so the autoplay hold
        // has to start here rather than in a click listener.
        el.__railHold?.();
    };
    window.marqueeNudge = function (dir) { window.railNudge('marquee-viewport', dir); };

    function updateArrows(vp) {
        const root = vp.closest('.marquee-wrapper,.events-wrapper,.ma-news-carousel-shell,.premium-card') || vp.parentElement;
        if (!root) return;
        // Snap padding parks the first card a few px in, so the ends use a
        // small tolerance instead of exact 0 / max.
        const max = Math.max(0, vp.scrollWidth - vp.clientWidth - 32);
        root.querySelectorAll('[data-rail-dir="-1"],.marquee-prev,.marquee-arrow--left,.events-prev,.ma-news-prev').forEach(b => { b.disabled = vp.scrollLeft <= 32; });
        root.querySelectorAll('[data-rail-dir="1"],.marquee-next,.marquee-arrow--right,.events-next,.ma-news-next').forEach(b => { b.disabled = vp.scrollLeft >= max; });
    }

    function init(vp) {
        if (!vp || vp.dataset.railReady === '1') return;
        vp.dataset.railReady = '1';
        vp.tabIndex = vp.tabIndex >= 0 ? vp.tabIndex : 0;
        const root = vp.closest('.marquee-wrapper,.events-wrapper,.ma-news-carousel-shell,.premium-card') || vp.parentElement;
        // Autoplay runs only while visible, pauses while hovered, and holds
        // off for a while after any touch, drag, key or arrow press.
        let hovering = false, holdUntil = 0, visible = true;
        const autoDelay = vp.id === 'marquee-viewport' ? 1050 : 6500;
        const HOLD_AFTER_TOUCH = 8000;

        root?.querySelectorAll('[data-rail-dir],.marquee-prev,.marquee-next,.events-prev,.events-next,.ma-news-prev,.ma-news-next').forEach(btn => {
            if (btn.dataset.railBound === '1') return;
            btn.dataset.railBound = '1';
            const dir = Number(btn.dataset.railDir || (btn.matches('.marquee-prev,.events-prev,.ma-news-prev') ? -1 : 1));
            btn.addEventListener('click', e => {
                e.preventDefault();
                const id = vp.id;
                if (id) window.railNudge(id, dir);
                else {
                    const card = vp.querySelector(':scope > * > *') || vp.firstElementChild;
                    const step = Math.max(220, (card?.getBoundingClientRect().width || 280) + 16);
                    vp.scrollBy({left:dir*step,behavior:REDUCED?'auto':'smooth'});
                }
            });
        });

        vp.addEventListener('keydown', e => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const dir = e.key === 'ArrowLeft' ? -1 : 1;
            const card = vp.querySelector(':scope > * > *') || vp.firstElementChild;
            const step = Math.max(220, (card?.getBoundingClientRect().width || 280) + 16);
            vp.scrollBy({left:dir*step,behavior:REDUCED?'auto':'smooth'});
        });
        let arrowFrame = 0;
        vp.addEventListener('scroll', () => {
            if (arrowFrame) return;
            arrowFrame = requestAnimationFrame(() => { arrowFrame = 0; updateArrows(vp); });
        }, { passive:true });

        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(entries => {
                visible = !!entries[0]?.isIntersecting;
                if (visible) scheduleAuto(); else stopAuto();
            }, { threshold:.15 });
            io.observe(vp);
        }
        let autoTimer=0;
        const stopAuto=()=>{if(autoTimer){clearTimeout(autoTimer);autoTimer=0;}};
        const paused=()=>hovering || vp.contains(document.activeElement) || Date.now() < holdUntil;
        const scheduleAuto=(delay)=>{
            stopAuto();
            if(REDUCED || !visible || document.hidden || vp.scrollWidth <= vp.clientWidth) return;
            autoTimer=setTimeout(()=>{
                autoTimer=0;
                if(!visible || document.hidden) return;
                if(paused()) { scheduleAuto(Math.max(600, holdUntil - Date.now())); return; }
                const max = vp.scrollWidth - vp.clientWidth;
                if (vp.scrollLeft >= max - 4) vp.scrollTo({left:0,behavior:'smooth'});
                else {
                    const card = vp.querySelector(':scope > * > *') || vp.firstElementChild;
                    const step = Math.max(220, (card?.getBoundingClientRect().width || 280) + 16);
                    vp.scrollBy({left:step,behavior:'smooth'});
                }
                scheduleAuto();
            },delay || autoDelay);
        };
        // Mouse hover pauses until the pointer leaves; touches, drags, arrow
        // clicks and keys hold autoplay off for a while after the last one.
        const hold=()=>{ holdUntil = Date.now() + HOLD_AFTER_TOUCH; scheduleAuto(HOLD_AFTER_TOUCH); };
        vp.__railHold = hold;
        vp.addEventListener('mouseenter',()=>{ hovering = true; stopAuto(); },{passive:true});
        vp.addEventListener('mouseleave',()=>{ hovering = false; scheduleAuto(); },{passive:true});
        ['pointerdown','touchstart','wheel','keydown'].forEach(type => vp.addEventListener(type,hold,{passive:true}));
        root?.querySelectorAll('[data-rail-dir],.marquee-prev,.marquee-next,.events-prev,.events-next,.ma-news-prev,.ma-news-next').forEach(btn => btn.addEventListener('click',hold));
        vp.addEventListener('focusout',()=>scheduleAuto(),{passive:true});
        document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto();else scheduleAuto();});
        scheduleAuto();
        updateArrows(vp);
    }

    function boot() {
        ['marquee-viewport','events-viewport'].forEach(id => init(document.getElementById(id)));
        document.querySelectorAll('.ma-news-carousel-shell,[data-rail-viewport]').forEach(init);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();

let authReturnFocus = null;
window.openAuthModal = function() {
    const modal = document.getElementById('main-auth-modal');
    if (!modal) { location.href = '/?signIn=1'; return; }
    authReturnFocus = document.activeElement;
    modal.style.display = 'flex';
    modal.querySelector('button:not(:disabled), input')?.focus();
};

// Anyone redirected here from the retired register.html (old bookmarks,
// external links) lands straight in the sign-up flow rather than a blank
// homepage with no obvious next step.
document.addEventListener('DOMContentLoaded', () => {
    try {
        const authParams = new URLSearchParams(window.location.search);
        if (authParams.get('openAuth') === '1' || authParams.get('signIn') === '1') {
            window.openAuthModal();
            if (typeof window.switchAuthTab === 'function') window.switchAuthTab(authParams.get('signIn') === '1' ? 'login' : 'signup');
            history.replaceState(null, '', '/'); // keep the canonical home URL while preventing auth from reopening on refresh
        }
    } catch (e) {}
});
window.closeAuthModal = function() {
    const modal = document.getElementById('main-auth-modal');
    if (modal) modal.style.display = 'none';
    if (authReturnFocus?.isConnected) authReturnFocus.focus();
};
document.addEventListener('keydown', event => {
    const modal = document.getElementById('main-auth-modal');
    if (!modal || modal.style.display !== 'flex') return;
    if (event.key === 'Escape') { window.closeAuthModal(); return; }
    if (event.key !== 'Tab') return;
    const items = [...modal.querySelectorAll('button:not(:disabled),input,a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
    if (!items.length) return;
    if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
});
window.switchAuthTab = function(tab) {
    // 'forgot' is included so switching back to a tab always clears the reset
    // panel — otherwise it stays visible stacked under the login form.
    ['login', 'signup', 'forgot'].forEach(t => { document.getElementById(`tab-${t}`)?.classList.remove('active'); document.getElementById(`form-${t}`)?.classList.remove('active'); });
    document.getElementById(`tab-${tab}`)?.classList.add('active'); document.getElementById(`form-${tab}`)?.classList.add('active');
    const msg = document.getElementById('auth-message');
    if (msg) msg.style.display = 'none';
};

window.showForgotPassword = function() {
    window.switchAuthTab('forgot');
    // Carry over whatever they already typed so they don't retype it.
    const typed = document.getElementById('login-email')?.value.trim();
    const field = document.getElementById('forgot-email');
    if (field) { if (typed) field.value = typed; field.focus(); }
};

// ----------------------------------------------------
// PASSWORD RESET
// Supabase emails a one-time link that returns the user to /reset.html with a
// recovery token in the URL fragment, where they set a new password.
//
// The response is deliberately identical whether or not the address has an
// account. Saying "no account with that email" turns this form into a way for
// anyone to check which addresses are registered — a real privacy leak on a
// site holding payment records.
// ----------------------------------------------------
window.handlePasswordReset = async function() {
    const email = (document.getElementById('forgot-email')?.value || '').trim();
    const msgEl = document.getElementById('auth-message');
    const btn = document.getElementById('btn-forgot');

    const show = (text, ok) => {
        if (!msgEl) return;
        msgEl.style.display = 'block';
        msgEl.style.color = ok ? '#4ade80' : '#ff5252';
        msgEl.style.background = ok ? 'rgba(74,222,128,0.1)' : 'rgba(255,0,0,0.1)';
        msgEl.innerText = text;
    };

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        show(window.t ? t('auth.badEmail') : 'Please enter a valid email address.', false);
        return;
    }
    if (!supabaseClient) { show('Connection offline. Please try again shortly.', false); return; }

    const original = btn ? btn.innerText : '';
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.innerText = '…'; }

    try {
        await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset.html'
        });
    } catch (e) {
        // Swallowed on purpose — see the note above about not revealing
        // whether an address is registered.
    }

    show(window.t ? t('auth.resetSent') : "If that email has an account, a reset link is on its way. Check your inbox and spam folder.", true);
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.innerText = original; }
};

// ----------------------------------------------------
// AUTH LOGIC
// ----------------------------------------------------
window.handleEmailSignup = async function() {
    const email = document.getElementById('reg-email').value.trim(); 
    const password = document.getElementById('reg-password').value; 
    const msgEl = document.getElementById('auth-message');
    
    if (!supabaseClient) { msgEl.style.display = 'block'; msgEl.style.color = '#ff5252'; msgEl.style.background = 'rgba(255,0,0,0.1)'; msgEl.innerText = "Database connection offline."; return; }
    if(!email || !password) { msgEl.style.display = 'block'; msgEl.style.color = '#ff5252'; msgEl.style.background = 'rgba(255,0,0,0.1)'; msgEl.innerText = "Please provide an email and password."; return; }
    
    msgEl.style.display = 'block'; msgEl.style.color = '#fff'; msgEl.style.background = 'rgba(229,193,88,0.2)'; msgEl.innerText = "Creating account...";
    
    try {
        const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { matchapp_first_time_onboarding_v1: true } } });
        if(error) { 
            msgEl.style.color = '#ff5252'; msgEl.style.background = 'rgba(255,0,0,0.1)'; msgEl.innerText = error.message; 
        } else { 
            msgEl.style.color = '#25D366'; msgEl.style.background = 'rgba(37,211,102,0.1)'; msgEl.innerText = "Account created! Routing to Profile Hub..."; 
            setTimeout(() => { window.location.href = '/profile/profile.html'; }, 1500); 
        }
    } catch(err) {
        msgEl.style.color = '#ff5252'; msgEl.style.background = 'rgba(255,0,0,0.1)'; msgEl.innerText = "Critical registration error.";
    }
};

window.handleEmailLogin = async function() {
    const email = document.getElementById('login-email').value.trim(); 
    const password = document.getElementById('login-password').value; 
    const msgEl = document.getElementById('auth-message');
    
    if (!supabaseClient) { msgEl.style.display = 'block'; msgEl.style.color = '#ff5252'; msgEl.style.background = 'rgba(255,0,0,0.1)'; msgEl.innerText = "Database connection offline."; return; }
    if(!email || !password) { msgEl.style.display = 'block'; msgEl.style.color = '#ff5252'; msgEl.style.background = 'rgba(255,0,0,0.1)'; msgEl.innerText = "Please enter email and password."; return; }
    
    msgEl.style.display = 'block'; msgEl.style.color = '#fff'; msgEl.style.background = 'rgba(229,193,88,0.2)'; msgEl.innerText = "Authenticating...";
    
    try {
        const { error, data } = await supabaseClient.auth.signInWithPassword({ email, password });
        if(error) { 
            msgEl.style.color = '#ff5252'; msgEl.style.background = 'rgba(255,0,0,0.1)'; msgEl.innerText = error.message; 
        } else if (data.user) { 
            msgEl.style.color = '#25D366'; msgEl.style.background = 'rgba(37,211,102,0.1)'; msgEl.innerText = "Welcome back! Routing to Home..."; 
            setTimeout(() => { window.location.reload(); }, 1000); 
        }
    } catch(err) {
        msgEl.style.color = '#ff5252'; msgEl.style.background = 'rgba(255,0,0,0.1)'; msgEl.innerText = "Critical authentication error.";
    }
};

// 🔵 GOOGLE OAUTH — restored here because it was never carried over when the
// auth system was rebuilt directly into app.js; the old implementation still
// existed in auth.js, but that file isn't loaded by index.html at all anymore.
async function loginWithOAuthProvider(provider, label) {
    const msgEl = document.getElementById('auth-message');
    if (!supabaseClient) {
        if (msgEl) { msgEl.style.display = 'block'; msgEl.style.color = '#ff5252'; msgEl.style.background = 'rgba(255,0,0,0.1)'; msgEl.innerText = "Database connection offline."; }
        return;
    }
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + '/index.html' }
    });
    if (error && msgEl) {
        msgEl.style.display = 'block'; msgEl.style.color = '#ff5252'; msgEl.style.background = 'rgba(255,0,0,0.1)'; msgEl.innerText = label + " Login Error: " + error.message;
    }
}
window.loginWithGoogle = () => loginWithOAuthProvider('google','Google');

window.doLogout = async function() {
    ++profileHydrationEpoch;
    if(isUserLoggedIn)await Promise.race([syncListsToDatabase(),new Promise(resolve=>setTimeout(resolve,6000))]);
    if(supabaseClient)await supabaseClient.auth.signOut();
    // Keep confirmed installation, update state and per-account exclusions.
    // Clear the active account's UI data and let the Auth SDK clear its session.
    ['match_seenList','match_savedList','match_dislikedList','match_userRatings','match_titleNotes','match_user_name','match_user_email','match_user_avatar','match_custom_avatar','match_user_country','match_user_dob','match_user_sign','match_user_age','match_user_nickname','match_profile_locked','match_portfolio_owner','match_isVIP'].forEach(k=>localStorage.removeItem(k));
    for(const k of Object.keys(localStorage)){
        if(k.startsWith('match_')&&!/^(match_app_|match_kids_|match_exclusions_|match_history_|match_settings|match_lang|match_font)/.test(k))localStorage.removeItem(k);
    }
    window.location.href='/';
};

// "Find My Match — It's Free" needs to feel like it obviously did something,
// not just a scroll that might be a no-op if the form was already in view.
// A brief highlight pulse + auto-focusing the first field makes the outcome
// unambiguous no matter where the click happened from.
// ----------------------------------------------------
// UPGRADE RIBBON
// Dismissal is remembered for 7 days rather than forever: the notice stays
// useful across an active build period, but a returning user isn't nagged on
// every visit. Stored locally, so it costs no request.
// ----------------------------------------------------
const UPGRADE_RIBBON_KEY = 'match_upgradeRibbonDismissed';
const UPGRADE_RIBBON_DAYS = 7;
// Hard stop. The copy says "this week", which stops being true fast, and a
// banner nobody remembered to remove is worse than no banner. Move this date
// forward while the build-out continues; after it, the ribbon simply never
// renders again regardless of dismissal state.
const UPGRADE_RIBBON_UNTIL = '2026-10-31';

window.dismissUpgradeRibbon = function() {
    const el = document.getElementById('upgrade-ribbon');
    if (el) el.style.display = 'none';
    try { localStorage.setItem(UPGRADE_RIBBON_KEY, String(Date.now())); } catch (e) {}
};

function initUpgradeRibbon() {
    const el = document.getElementById('upgrade-ribbon');
    if (!el) return;

    if (new Date() > new Date(UPGRADE_RIBBON_UNTIL + 'T23:59:59')) {
        el.style.display = 'none';
        return;
    }

    try {
        const at = parseInt(localStorage.getItem(UPGRADE_RIBBON_KEY) || '0', 10);
        if (at && (Date.now() - at) < UPGRADE_RIBBON_DAYS * 86400000) {
            el.style.display = 'none';
        }
    } catch (e) { /* storage blocked — just show it */ }
}
document.addEventListener('DOMContentLoaded', initUpgradeRibbon);

// "Match Again" — two paths.
//
// Scroll note: this used window.scrollTo(), which silently did nothing here.
// body carries overflow-x:hidden, which in several browsers promotes body to
// the scrolling element instead of documentElement — so window.scrollTo has no
// target to move. scrollIntoView() resolves against whatever the real scrolling
// ancestor is, which is why every other scroll in this file works. Combined
// with the #questionnaire-box scroll-margin-top rule, it also clears the
// sticky header without manual maths.
// Tap-to-zoom on the compact mobile poster thumbnail. Native pinch-zoom is now
// enabled site-wide (the old user-scalable=no was a WCAG failure and has been
// removed), but this overlay still earns its place: pinch-zooming the whole
// page to inspect one poster means then having to pinch back out, and on the
// homepage it competes with the drag/swipe gestures the trending rail and
// Match Together use. One tap for a clean full-size view, one tap to dismiss,
// is simply better for this specific job.
window.openPosterZoom = function () {
    const src = document.getElementById('res-poster-img')?.src;
    if (!src) return;
    const overlay = document.getElementById('poster-zoom-overlay');
    const img = document.getElementById('poster-zoom-img');
    if (!overlay || !img) return;
    img.src = src;
    img.alt = document.getElementById('res-title')?.textContent || 'Cover';
    overlay.style.display = 'flex';
};
window.closePosterZoom = function () {
    const overlay = document.getElementById('poster-zoom-overlay');
    if (overlay) overlay.style.display = 'none';
};

// Top-of-page ask box. Sends the query straight to Ask AI rather than making
// the user land on discover.html and type a second time.
window.topAskSubmit = function (e) {
    if (e) e.preventDefault();
    const input = document.getElementById('top-ask-input');
    const q = input ? input.value.trim() : '';
    // Empty submit still goes through — discover.html shows its own prompt in
    // that case, which is friendlier than silently doing nothing when someone
    // taps the arrow expecting something to happen.
    window.location.href = q
        ? `/discover.html?q=${encodeURIComponent(q)}`
        : '/discover.html';
    return false;
};

function goToQuestionnaire() {
    const box = document.getElementById('questionnaire-box');
    if (!box) return false;

    // THE ACTUAL BUG: triggerMatch() sets this box to display:none once a
    // result is showing, so it can be replaced by the loading/result cards.
    // Every one of the four buttons that scroll here (Match Again's "New
    // Criteria", "Same Criteria", the header's jump button, and the "How It
    // Works" CTA) could be tapped AFTER a match already happened — and
    // scrollIntoView() on a display:none element has no layout box to scroll
    // to, so it silently does nothing. The toast still fired, which is why it
    // looked like the button was "telling" the user something without ever
    // taking them anywhere. Re-show the form before attempting to scroll.
    if (box.style.display === 'none') box.style.display = '';

    // Lazy Mode folds this section behind `display:none !important`, which
    // beats the inline style just cleared above. Every path back to the form
    // funnels through here, so unfolding at this one point is what makes the
    // form safe to fold at all — without it a user in Lazy Mode could tap
    // "New Criteria" and land on nothing.
    if (box.classList.contains('lazy-foldable') && !box.classList.contains('lazy-open')) {
        box.classList.add('lazy-open');
        const head = box.previousElementSibling;
        if (head && head.classList.contains('lazy-head')) {
            head.setAttribute('aria-expanded', 'true');
            head.classList.add('is-open');
        }
    }
    const resultBox = document.getElementById('result-box');
    if (resultBox && resultBox.style.display !== 'none') resultBox.style.display = 'none';

    // 'center' was wrong here: the questionnaire is taller than a phone
    // viewport, so centring it scrolled the "Curate Your Perfect Match"
    // heading off the top and dropped the user into the middle of the form.
    // 'start' + the scroll-margin-top rule lands the heading just below the
    // sticky header instead.
    try {
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
        box.scrollIntoView(true); // older browsers: no options object
    }

    setTimeout(() => {
        box.classList.add('cta-highlight');

        // Focusing a <select> on a touch device opens the native option
        // picker immediately, covering the form the user was just sent to.
        // Only auto-focus where there's a real keyboard.
        const isTouch = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
        if (!isTouch) {
            const firstField = document.getElementById('q-category');
            if (firstField) firstField.focus({ preventScroll: true });
        }

        setTimeout(() => box.classList.remove('cta-highlight'), 1600);
    }, 450); // let the smooth scroll settle before drawing attention to it

    return true;
}
// One shared implementation under both names — this used to be two
// near-duplicate functions that could drift out of sync, which is exactly
// how the header/How-It-Works buttons ended up with the same hidden-box bug
// as Match Again without anyone touching them directly.
window.scrollToQuestionnaire = goToQuestionnaire;

// Path A: change the criteria first.
window.matchAgainNewCriteria = function() {
    // A leftover direct title search would hijack the next run and bypass the
    // questionnaire entirely, which is the opposite of what this button promises.
    const specific = document.getElementById('specific-search-input');
    if (specific) specific.value = '';

    if (!goToQuestionnaire()) return;

    if (window.showToast) {
        showToast(window.t ? t('res.matchagaintoast') : '🔄 Set your new criteria, then tap Find My Match.');
    }
};

// Path B: keep the same criteria and go straight to a fresh match.
// This spends a match immediately — triggerMatch() runs checkDailyLimit(),
// which calls the server-side consume_match RPC before anything is generated.
window.matchAgainSameCriteria = function() {
    const specific = document.getElementById('specific-search-input');
    if (specific) specific.value = '';   // questionnaire drives this, not a typed title

    // Scroll to the form so the loading sequence is actually visible; without
    // this the user sits on the old result card watching nothing happen.
    goToQuestionnaire();
    setTimeout(() => { window.triggerMatch(false); }, 350);
};

// scrollToQuestionnaire is defined once, above, as an alias for
// goToQuestionnaire() — see that function for the full behaviour
// (re-showing the form if hidden, scroll timing, touch-aware focus).

// ----------------------------------------------------
// PROFILE HYDRATION AFTER LOGIN
// Pulls whatever Google gave us (name, avatar) into the profiles row and
// into localStorage so the profile page is pre-filled, then works out what
// is still missing. Google never provides country, date of birth or star
// sign, so those always need the user to fill them in — and until they do,
// the account stays on the 3-session tier rather than 5.
// ----------------------------------------------------
const REQUIRED_PROFILE_FIELDS = ['full_name', 'country', 'dob', 'star_sign', 'age']; // avatar_url deliberately optional

let profileHydrationEpoch = 0;
window.matchProfileState = {status:'loading',userId:null};
function setProfileLoadState(status,userId) {
    window.matchProfileState = {status,userId};
    window.checkAndRenderProfileState?.();
}
async function hydrateProfileFromAuth(user) {
    const hydrationEpoch = ++profileHydrationEpoch;
    if (!supabaseClient || !user) return;
    setProfileLoadState('loading',user.id);
    try {
        const previousOwner = localStorage.getItem('match_portfolio_owner');
        if (previousOwner !== user.id) {
            ['match_user_name','match_user_country','match_user_dob','match_user_sign','match_user_age','match_profile_locked','match_user_avatar','match_user_nickname'].forEach(k => localStorage.removeItem(k));
            seenList=[]; savedList=[]; dislikedList=[]; userRatings={}; titleNotes={}; recentTitles=[]; SESSION_SHOWN.clear();
            ['match_seenList','match_savedList','match_dislikedList','match_userRatings','match_titleNotes'].forEach(k => localStorage.removeItem(k));
        }
        localStorage.setItem('match_portfolio_owner',user.id);
        const meta = user.user_metadata || {};
        const googleName = meta.full_name || meta.name || '';
        const googleAvatar = meta.avatar_url || meta.picture || '';

        // RESTORE PORTFOLIO + NOTES FROM THE ACCOUNT.
        // syncListsToDatabase() has always WRITTEN these to user metadata, but
        // nothing ever read them back — so signing in on a second device gave
        // you an empty portfolio even though the data was sitting there. Notes
        // would have inherited exactly the same one-way problem, so this
        // restores all of it.
        //
        // Merge rather than replace: whatever is in localStorage right now may
        // be newer than the server copy (e.g. saved while offline, or before
        // signing in), and silently discarding it would lose real user data.
        try {
            const mergeList = (localArr, remoteArr) => {
                if (!Array.isArray(remoteArr)) return localArr;
                const seen = new Set(localArr.map(i => (i && i.title) || i));
                const merged = localArr.slice();
                for (const r of remoteArr) {
                    const key = (r && r.title) || r;
                    if (key && !seen.has(key)) { merged.push(r); seen.add(key); }
                }
                return merged;
            };

            // Legacy metadata copy. The portfolio is written to the profiles
            // table now; this is merged first as a recovery path for accounts
            // saved under the old scheme, and the table copy is merged over it
            // once the row is read below. Merge, never replace, so neither
            // source can wipe the other.
            if (Array.isArray(meta.seen_list))     { seenList     = mergeList(seenList, meta.seen_list); }
            if (Array.isArray(meta.saved_list))    { savedList    = mergeList(savedList, meta.saved_list); }
            if (Array.isArray(meta.disliked_list)) { dislikedList = mergeList(dislikedList, meta.disliked_list); }
            if (meta.user_ratings && typeof meta.user_ratings === 'object') {
                userRatings = Object.assign({}, meta.user_ratings, userRatings); // local wins on conflict
            }
            if (meta.title_notes && typeof meta.title_notes === 'object') {
                // Per title, keep whichever note was updated most recently.
                for (const [title, remote] of Object.entries(meta.title_notes)) {
                    const local = titleNotes[title];
                    if (!local) { titleNotes[title] = remote; continue; }
                    if (remote && remote.updated && local.updated && remote.updated > local.updated) {
                        titleNotes[title] = remote;
                    }
                }
            }

            localStorage.setItem('match_seenList', JSON.stringify(seenList));
            localStorage.setItem('match_savedList', JSON.stringify(savedList));
            localStorage.setItem('match_dislikedList', JSON.stringify(dislikedList));
            localStorage.setItem('match_userRatings', JSON.stringify(userRatings));
            localStorage.setItem('match_titleNotes', JSON.stringify(titleNotes));
        } catch (e) { console.warn('Portfolio restore skipped:', e); }

        // History synchronization must not block restoration of the identity lock.
        Promise.resolve(window.matchPolicy?.attach(user)).catch(e => console.warn('History sync delayed:',e.message));
        // Read the existing row first — never overwrite something the user
        // has already filled in themselves with Google's version.
        let profileReadTimer;
        const { data: existing, error: profileReadError } = await Promise.race([
            supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle(),
            new Promise((_,reject)=>{profileReadTimer=setTimeout(()=>reject(new Error('Profile connection timed out')),12000);})
        ]).finally(()=>clearTimeout(profileReadTimer));
        if (profileReadError) throw profileReadError;
        if (hydrationEpoch !== profileHydrationEpoch) return null;

        // The portfolio now lives in profiles.saved_list / seen_list /
        // disliked_list / user_ratings. `existing` is the row the select('*')
        // above already fetched, so this needs no extra round trip — and
        // merging here rather than in a second query keeps the hydration to a
        // single read.
        if (existing) {
            try {
                const merge = (localArr, remoteArr) => {
                    if (!Array.isArray(remoteArr)) return localArr;
                    const seen = new Set(localArr.map(i => (i && i.title) || i));
                    const out = localArr.slice();
                    for (const r of remoteArr) {
                        const k = (r && r.title) || r;
                        if (k && !seen.has(k)) { out.push(r); seen.add(k); }
                    }
                    return out;
                };
                if (Array.isArray(existing.seen_list))     seenList     = merge(seenList, existing.seen_list);
                if (Array.isArray(existing.saved_list))    savedList    = merge(savedList, existing.saved_list);
                if (Array.isArray(existing.disliked_list)) dislikedList = merge(dislikedList, existing.disliked_list);
                if (existing.user_ratings && typeof existing.user_ratings === 'object') {
                    userRatings = Object.assign({}, existing.user_ratings, userRatings);
                }
                localStorage.setItem('match_seenList', JSON.stringify(seenList));
                localStorage.setItem('match_savedList', JSON.stringify(savedList));
                localStorage.setItem('match_dislikedList', JSON.stringify(dislikedList));
                localStorage.setItem('match_userRatings', JSON.stringify(userRatings));
            } catch (e) { console.warn('[matchapp] Portfolio merge skipped:', e.message); }
        }

        const patch = {};
        if (googleName && !(existing && existing.full_name)) patch.full_name = googleName;
        if (googleAvatar && !(existing && existing.avatar_url)) patch.avatar_url = googleAvatar;

        if (Object.keys(patch).length) {
            // upsert, not update: update() matches zero rows and succeeds
            // silently when no profiles row exists yet — which is exactly what
            // happens if the handle_new_user trigger never ran (migration 001
            // not applied, or an account created before it). The avatar would
            // then be "saved" to nothing, with no error to notice.
            await supabaseClient.from('profiles').upsert(
                Object.assign({ id: user.id }, patch), { onConflict: 'id' });
        }

        const merged = Object.assign({}, existing || {}, patch);

        // Mirror into localStorage so the profile page and the AI prompts
        // (country/age personalization) can use it immediately.
        if (hydrationEpoch !== profileHydrationEpoch) return null;
        if (merged.full_name) localStorage.setItem('match_user_name', merged.full_name);
        if (merged.country)   localStorage.setItem('match_user_country', merged.country);
        if (merged.dob)       localStorage.setItem('match_user_dob', merged.dob);
        if (merged.star_sign) localStorage.setItem('match_user_sign', merged.star_sign);
        if (merged.age != null) localStorage.setItem('match_user_age', String(merged.age));
        if (merged.avatar_url) localStorage.setItem('match_user_avatar', merged.avatar_url);
        if (merged.nickname)  localStorage.setItem('match_user_nickname', merged.nickname);
        if (user.email) localStorage.setItem('match_user_email', user.email);

        // THE LOCK BUG: every other profile field was mirrored here except
        // profile_locked. Signing out clears localStorage, and signing back in
        // restored name, country, DOB and star sign but not the lock — so a
        // profile the user had deliberately sealed came back editable, and the
        // "locked forever" promise on the page was simply untrue after one
        // sign-out. The database row was right the whole time; nothing ever
        // read it back.
        //
        // Written as an explicit true/false rather than only-when-true: if the
        // row says false, localStorage must say false too, otherwise a stale
        // 'true' from a previous account on a shared device would lock a fresh
        // profile the user has every right to edit.
        localStorage.setItem('match_profile_locked', merged.profile_locked === true ? 'true' : 'false');
        setProfileLoadState('ready',user.id);
        document.dispatchEvent(new CustomEvent('matchapp:profilehydrated', {detail:{userId:user.id}}));

        const missing = REQUIRED_PROFILE_FIELDS.filter(f => {
            const v = merged[f];
            return v === null || v === undefined || String(v).trim() === '';
        });
        window.profileMissingFields = missing;

        // Paint the avatar now that the Google photo has actually landed.
        // Without this the photo sat in localStorage unread — the whole
        // reason the Google picture never appeared.
        if (typeof window.renderUserAvatar === 'function') window.renderUserAvatar();

        if (missing.length) promptProfileCompletion(missing);
        return missing;
    } catch (e) {
        console.warn('Profile hydration skipped:', e.message || e);
        if (hydrationEpoch === profileHydrationEpoch) setProfileLoadState('error',user.id);
        return null;
    }
}
window.hydrateProfileFromAuth = hydrateProfileFromAuth;

// Non-blocking nudge — explains exactly what unlocking the extra sessions needs.
function promptProfileCompletion(missing) {
    if (document.getElementById('profile-nudge')) return; // already shown this session
    if (window.location.pathname.includes('/profile/')) return; // they're already there

    const bar = document.createElement('div');
    bar.id = 'profile-nudge';
    bar.className = 'profile-nudge';
    const label = (window.t && tSafe('profile.nudge')) ||
        'Complete your profile to personalize your matches. Your free account includes 5 daily AI actions.';
    const cta = (window.t && tSafe('profile.nudgeCta')) || 'Complete profile';
    bar.innerHTML = `<span>👤 ${label}</span>
        <a href="/profile/profile.html" class="profile-nudge-btn">${cta}</a>
        <button class="profile-nudge-x" aria-label="Dismiss">✕</button>`;
    document.body.appendChild(bar);
    bar.querySelector('.profile-nudge-x').onclick = () => bar.remove();
}

let profileAuthEvent = 0;
if (supabaseClient?.auth && typeof supabaseClient.auth.onAuthStateChange === 'function') {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        const authEvent=++profileAuthEvent;
        if (session && session.user) {
            setProfileLoadState('loading',session.user.id);
            isUserLoggedIn = true;
            window.isUserLoggedIn = true;
            const regBtn = document.getElementById('nav-reg-btn');
            const outBtn = document.getElementById('nav-logout-btn');
            const profTab = document.getElementById('profile-link-tab');
            if (regBtn) regBtn.style.display = 'none';
            if (outBtn) outBtn.style.display = 'inline-block';
            if (profTab) profTab.style.display = 'inline-flex';
            // Pull Google's data into our own profile row, then refresh quota
            // (which now depends on whether that profile is complete).
            // Auth callbacks run under the SDK's session lock. Defer API calls
            // so native passkey sign-in and session refresh cannot deadlock.
            setTimeout(async () => {
                if(authEvent!==profileAuthEvent)return;
                await hydrateProfileFromAuth(session.user);
                if (window.refreshQuotaStatus) window.refreshQuotaStatus();
            }, 0);
        } else {
            ++profileHydrationEpoch;
            setProfileLoadState('signedout',null);
            isUserLoggedIn = false;
            window.isUserLoggedIn = false;
            window.matchPolicy?.attach(null);
            const regBtn = document.getElementById('nav-reg-btn');
            const outBtn = document.getElementById('nav-logout-btn');
            const profTab = document.getElementById('profile-link-tab');
            if (regBtn) regBtn.style.display = 'inline-flex';
            if (outBtn) outBtn.style.display = 'none';
            if (profTab) profTab.style.display = 'none';
        }
        // Auth resolves after first paint, so anything whose UI depends on
        // membership (Lazy Mode's locked state, the avatar, member-only
        // panels) has to be told rather than left to poll or guess.
        document.dispatchEvent(new CustomEvent('matchapp:authchange', {
            detail: { signedIn: window.isUserLoggedIn }
        }));
    });
}

if (!supabaseClient?.auth) setProfileLoadState('error',null);

// ----------------------------------------------------
// AI MATCH EXECUTION
// ----------------------------------------------------
async function fetchGeminiData(promptText) {
    if (!supabaseClient) throw new Error("Database not connected");
    const { data, error } = await supabaseClient.functions.invoke('gemini-proxy', { body: { prompt: promptText } });
    if (error || !data || !data.candidates) throw new Error("API Error");
    
    let rawText = data.candidates[0].content.parts[0].text;
    let startIndex = rawText.indexOf('{'); let endIndex = rawText.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) { return JSON.parse(rawText.substring(startIndex, endIndex + 1)); }
    throw new Error("Invalid format");
}

// ----------------------------------------------------
// CLIENT-SIDE MATCHMAKING CATALOG
// Used whenever the Gemini proxy is unavailable, so users NEVER see the
// same hardcoded title twice in a row. Real, well-known titles across
// every category/platform offered in the questionnaire.
// ----------------------------------------------------
const CONTENT_CATALOG = [
    { title: "The Bear", year: 2022, country: "United States", countryCode: "US", synopsis: "A young chef returns home to run his family's Chicago sandwich shop after a family tragedy.", platform: "Hulu", cats: ["series"], moods: ["intense and thrilling","dark and gritty"], vibes: ["fast-paced binge-worthy","prestige and critically acclaimed"], ratings: ["teen PG-13","mature adults only R rated","any"] },
    { title: "Shogun", year: 2024, country: "United States", countryCode: "US", synopsis: "A political thriller set in feudal Japan following a shipwrecked English sailor caught in a power struggle.", platform: "Hulu", cats: ["series","limited series"], moods: ["intense and thrilling","epic and adventurous"], vibes: ["prestige and critically acclaimed","slow burn"], ratings: ["teen PG-13","mature adults only R rated","any"] },
    { title: "Dune: Part Two", year: 2024, country: "United States", countryCode: "US", synopsis: "Paul Atreides unites with the Fremen to seek revenge against the conspirators who destroyed his family.", platform: "Max", cats: ["movie"], moods: ["epic and adventurous","intense and thrilling"], vibes: ["prestige and critically acclaimed","fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Deadpool & Wolverine", year: 2024, country: "United States", countryCode: "US", synopsis: "A fast, foul-mouthed superhero team-up across the Marvel multiverse.", platform: "Disney+", cats: ["movie"], moods: ["funny","intense and thrilling"], vibes: ["fast-paced binge-worthy","guilty pleasure"], ratings: ["mature adults only R rated","any"] },
    { title: "House of the Dragon", year: 2022, country: "United States", countryCode: "US", synopsis: "Two centuries before Game of Thrones, the Targaryen dynasty tears itself apart in civil war.", platform: "Max", cats: ["series"], moods: ["dark and gritty","epic and adventurous"], vibes: ["prestige and critically acclaimed","long running series"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "Queen of Tears", year: 2024, country: "South Korea", countryCode: "KR", cast: ["Kim Soo-hyun","Kim Ji-won"], synopsis: "A K-drama about a wealthy heiress and her husband navigating love, betrayal and a terminal illness twist.", platform: "Viki", cats: ["K-drama","series"], moods: ["romantic","heartbreaking"], vibes: ["slow burn","long running series"], ratings: ["teen PG-13","any"] },
    { title: "Crash Landing on You", year: 2019, country: "South Korea", countryCode: "KR", synopsis: "A South Korean heiress paraglides into North Korea and falls for the officer who hides her.", platform: "Netflix", cats: ["K-drama","series"], moods: ["romantic","light and feel-good"], vibes: ["slow burn","fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Jujutsu Kaisen", year: 2020, country: "Japan", countryCode: "JP", synopsis: "A boy swallows a cursed talisman and joins a secret school to battle supernatural threats.", platform: "Crunchyroll", cats: ["anime"], moods: ["intense and thrilling","dark and gritty"], vibes: ["fast-paced binge-worthy","long running series"], ratings: ["teen PG-13","any"] , shareRestricted: true },
    { title: "Frieren: Beyond Journey's End", year: 2023, country: "Japan", countryCode: "JP", synopsis: "An elven mage reflects on mortality and friendship long after her adventuring party has aged and passed.", platform: "Crunchyroll", cats: ["anime"], moods: ["cozy comfort watch","heartbreaking"], vibes: ["slow burn","award winning"], ratings: ["all ages family friendly","any"] },
    { title: "A Vida Secreta do Meu Marido Bilionário", country: "Brazil", countryCode: "BR", synopsis: "A Brazilian vertical novela about a woman who discovers her husband is secretly a billionaire tycoon.", platform: "ReelShort", cats: ["vertical micro-drama","novela brasileira"], moods: ["romantic","intense and thrilling"], vibes: ["guilty pleasure","one sitting short watch"], ratings: ["teen PG-13","any"] },
    { title: "CEO's Contract Bride", synopsis: "A gripping vertical micro-drama romance between a ruthless CEO and the woman forced into a marriage of convenience.", platform: "DramaBox", cats: ["vertical micro-drama"], moods: ["romantic","guilty pleasure"], vibes: ["one sitting short watch","fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Vale Tudo", synopsis: "A classic Brazilian telenovela about family rivalry, ambition and moral compromise in Rio de Janeiro.", platform: "Globoplay", cats: ["novela brasileira","telenovela"], moods: ["dark and gritty","intense and thrilling"], vibes: ["long running series","award winning"], ratings: ["mature adults only R rated","any"] },
    { title: "The Joe Rogan Experience", year: 2009, country: "United States", countryCode: "US", synopsis: "Long-form conversations spanning comedy, science, MMA and culture.", platform: "Spotify", cats: ["podcast"], moods: ["funny","inspiring"], vibes: ["easy background watch","long running series"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "SmartLess", year: 2020, country: "United States", countryCode: "US", synopsis: "Three friends surprise each other with a mystery guest for freewheeling, funny conversation.", platform: "Spotify", cats: ["podcast"], moods: ["funny","light and feel-good"], vibes: ["easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "Baby Reindeer", year: 2024, country: "United Kingdom", countryCode: "GB", synopsis: "A darkly comic true story about a struggling comedian stalked by a woman he shows a moment of kindness.", platform: "Netflix", cats: ["limited series","series"], moods: ["dark and gritty","heartbreaking"], vibes: ["award winning","prestige and critically acclaimed"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "Fallout", year: 2024, country: "United States", countryCode: "US", synopsis: "Generations after a nuclear apocalypse, surface dwellers and vault dwellers collide in a darkly funny wasteland.", platform: "Prime Video", cats: ["series"], moods: ["dark and gritty","intense and thrilling"], vibes: ["fast-paced binge-worthy","award winning"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "Bluey", year: 2018, country: "Australia", countryCode: "AU", synopsis: "An imaginative six-year-old Blue Heeler pup and her family turn everyday life into playful adventure.", platform: "Disney+", cats: ["kids","series"], moods: ["light and feel-good","cozy comfort watch"], vibes: ["easy background watch","award winning"], ratings: ["all ages family friendly","kids","any"] },
    { title: "Moana 2", year: 2024, country: "United States", countryCode: "US", synopsis: "Moana sets sail on a new ocean adventure alongside Maui to reconnect with scattered island peoples.", platform: "Disney+", cats: ["movie","kids"], moods: ["epic and adventurous","inspiring"], vibes: ["fast-paced binge-worthy"], ratings: ["all ages family friendly","kids","any"] },
    { title: "Nimona", year: 2023, country: "United States", countryCode: "US", synopsis: "A knight framed for a crime teams up with a shapeshifting teen to clear his name in a sci-fi/medieval kingdom.", platform: "Netflix", cats: ["movie","kids","anime"], moods: ["funny","inspiring"], vibes: ["fast-paced binge-worthy"], ratings: ["all ages family friendly","teen PG-13","any"] },
    { title: "Cosmos: Possible Worlds", year: 2020, country: "United States", countryCode: "US", synopsis: "A documentary journey through space, time and the origins of scientific discovery.", platform: "Netflix", cats: ["documentary"], moods: ["inspiring","mind-bending"], vibes: ["easy background watch","award winning"], ratings: ["all ages family friendly","any"] },
    { title: "Chef's Table", year: 2015, country: "United States", countryCode: "US", synopsis: "An intimate documentary series profiling the world's most creative chefs and their craft.", platform: "Netflix", cats: ["documentary"], moods: ["inspiring","cozy comfort watch"], vibes: ["easy background watch","hidden gem underrated"], ratings: ["all ages family friendly","any"] },
    { title: "John Mulaney: Baby J", year: 2023, country: "United States", countryCode: "US", synopsis: "A stand-up special turning the comedian's very public struggles into sharp, self-deprecating comedy.", platform: "Netflix", cats: ["stand-up comedy special"], moods: ["funny"], vibes: ["one sitting short watch","award winning"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "Love Is Blind", year: 2020, country: "United States", countryCode: "US", synopsis: "Singles date and get engaged sight unseen, meeting face-to-face only after saying yes.", platform: "Netflix", cats: ["reality show"], moods: ["romantic"], vibes: ["guilty pleasure","fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Alcarràs", year: 2022, country: "Spain", countryCode: "ES", synopsis: "A Catalan farming family faces their final harvest as their land is sold for solar panels.", platform: "MUBI", cats: ["European cinema","movie"], moods: ["heartbreaking","nostalgic"], vibes: ["slow burn","hidden gem underrated"], ratings: ["all ages family friendly","any"] },
    { title: "RRR", year: 2022, country: "India", countryCode: "IN", synopsis: "Two revolutionaries in colonial India form an epic, action-packed friendship in this Tollywood blockbuster.", platform: "Netflix", cats: ["Bollywood","movie"], moods: ["epic and adventurous","intense and thrilling"], vibes: ["fast-paced binge-worthy","award winning"], ratings: ["teen PG-13","any"] },
    { title: "Business Proposal", year: 2022, country: "South Korea", countryCode: "KR", synopsis: "A woman goes on a blind date pretending to be someone else — and it turns out to be her own CEO.", platform: "Viki", cats: ["K-drama","series"], moods: ["light and feel-good","romantic"], vibes: ["fast-paced binge-worthy","guilty pleasure"], ratings: ["teen PG-13","any"] },
    { title: "Rebel Moon", year: 2023, country: "United States", countryCode: "US", synopsis: "A peaceful colony on the edge of the galaxy sends a warrior to recruit fighters against a tyrannical regime.", platform: "Netflix", cats: ["movie"], moods: ["epic and adventurous","intense and thrilling"], vibes: ["fast-paced binge-worthy","guilty pleasure"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "Midnight Diner: Tokyo Stories", year: 2016, country: "Japan", countryCode: "JP", synopsis: "A quiet late-night Tokyo diner serves comfort food and even more comforting stories to its regulars.", platform: "Netflix", watchUrl: "https://www.netflix.com/title/80113037", cats: ["J-drama","series"], moods: ["cozy comfort watch","nostalgic"], vibes: ["easy background watch","hidden gem underrated"], ratings: ["all ages family friendly","any"] },
    { title: "Kingdom", year: 2019, country: "South Korea", countryCode: "KR", cast: ["Ju Ji-hoon","Bae Doona","Ryu Seung-ryong","Kim Sang-ho"], synopsis: "A Korean crown prince investigates a mysterious plague that turns the dead into the undead.", platform: "Netflix", cats: ["K-drama","series"], moods: ["scary","dark and gritty"], vibes: ["fast-paced binge-worthy","hidden gem underrated"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "Emilia Pérez", year: 2024, country: "France", countryCode: "FR", synopsis: "A Mexican cartel leader seeks a secret gender transition, told as a genre-defying musical thriller.", platform: "Netflix", cats: ["movie","European cinema"], moods: ["mind-bending","intense and thrilling"], vibes: ["prestige and critically acclaimed","award winning"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },

    // ---- Trending on Netflix right now (Sept 2026) ----
    { title: "The Whisper Man", year: 2026, country: "United States", countryCode: "US", synopsis: "A father and son move to a small town where children have been vanishing for years, and old whispers won't stay buried.", platform: "Netflix", cats: ["movie"], moods: ["scary","dark and gritty"], vibes: ["fast-paced binge-worthy","prestige and critically acclaimed"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "The Secret Woman", country: "Denmark", countryCode: "DK", synopsis: "A woman's carefully hidden double life unravels when her two worlds are forced to collide.", platform: "Netflix", cats: ["movie"], moods: ["intense and thrilling","dark and gritty"], vibes: ["fast-paced binge-worthy","guilty pleasure"], ratings: ["mature adults only R rated","any"] },
    { title: "Facing El Chapo", synopsis: "A documentary built from firsthand accounts of those who lived inside the world of the infamous cartel kingpin.", platform: "Netflix", cats: ["documentary"], moods: ["intense and thrilling","dark and gritty"], vibes: ["prestige and critically acclaimed","based on a true story"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "Alpha", synopsis: "A prehistoric coming-of-age survival story about a young hunter who befriends an injured wolf.", platform: "Netflix", cats: ["movie"], moods: ["epic and adventurous","heartbreaking"], vibes: ["award winning","based on a true story"], ratings: ["all ages family friendly","teen PG-13","any"] },
    { title: "Death of the Pastor's Wife", year: 2026, country: "United States", countryCode: "US", synopsis: "A true-crime drama unraveling the mysterious death that shook a small church community.", platform: "Netflix", cats: ["series","limited series"], moods: ["dark and gritty","mind-bending"], vibes: ["fast-paced binge-worthy","based on a true story"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "Beauty in Black", year: 2024, country: "United States", countryCode: "US", synopsis: "Tyler Perry's soapy thriller about two women whose lives collide around a glamorous cosmetics empire built on secrets.", platform: "Netflix", cats: ["series"], moods: ["dark and gritty","intense and thrilling"], vibes: ["fast-paced binge-worthy","guilty pleasure"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "Outer Banks", year: 2020, country: "United States", countryCode: "US", synopsis: "A group of teenage treasure hunters chase a generations-old mystery across the Carolina coast.", platform: "Netflix", cats: ["series"], moods: ["epic and adventurous","intense and thrilling"], vibes: ["fast-paced binge-worthy","long running series"], ratings: ["teen PG-13","any"] },
    { title: "Blood Sacrifice", synopsis: "A supernatural thriller following a family who discovers their new home demands a terrifying price.", platform: "Netflix", cats: ["series"], moods: ["scary","dark and gritty"], vibes: ["fast-paced binge-worthy","guilty pleasure"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "Love Is Blind: UK", year: 2024, country: "United Kingdom", countryCode: "GB", synopsis: "British singles date and get engaged sight unseen, meeting face-to-face only after saying yes.", platform: "Netflix", cats: ["reality show"], moods: ["romantic"], vibes: ["guilty pleasure","fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Mousetrap", synopsis: "An adaptation of the classic whodunit where seven strangers snowed into a country house realize a killer is among them.", platform: "Netflix", cats: ["series","limited series"], moods: ["mind-bending","intense and thrilling"], vibes: ["prestige and critically acclaimed","based on a true story"], ratings: ["teen PG-13","any"] },

    // ---- Gospel & Faith, spread across every relevant category ----
    { title: "The Chosen", year: 2017, country: "United States", countryCode: "US", synopsis: "A multi-season drama portraying the life of Jesus Christ through the eyes of those who knew him — one of the most-watched faith series ever made.", platform: "Prime Video", cats: ["Gospel & Faith"], moods: [], vibes: ["long running series","award winning","based on a true story"], ratings: ["all ages family friendly","any"] },
    { title: "Voices of Fire", synopsis: "Bishop Ezekiel Williams and producer Pharrell Williams build an unconventional gospel choir from the ground up in this uplifting docuseries.", platform: "Netflix", cats: ["Gospel & Faith"], moods: [], vibes: ["award winning","based on a true story"], ratings: ["all ages family friendly","any"] },
    { title: "I Can Only Imagine", year: 2018, country: "United States", countryCode: "US", synopsis: "The true story behind MercyMe's chart-topping gospel anthem, following songwriter Bart Millard's journey through a broken childhood to redemption.", platform: "Netflix", cats: ["Gospel & Faith"], moods: [], vibes: ["based on a true story","award winning"], ratings: ["all ages family friendly","teen PG-13","any"] },
    { title: "A Week Away", year: 2021, country: "United States", countryCode: "US", synopsis: "A teen in the foster system avoids juvenile hall by attending a lively Christian summer camp that changes his outlook on life.", platform: "Netflix", cats: ["Gospel & Faith"], moods: [], vibes: ["easy background watch","guilty pleasure"], ratings: ["all ages family friendly","any"] },
    { title: "Faith in the Flames: The Nichole Jolly Story", synopsis: "A nurse in a wildfire-threatened town must choose between evacuating and staying to protect her patients, in this true-story faith drama.", platform: "Netflix", cats: ["Gospel & Faith"], moods: [], vibes: ["based on a true story","award winning"], ratings: ["teen PG-13","any"] },
    { title: "The Case for Christ", year: 2017, country: "United States", countryCode: "US", synopsis: "An atheist journalist sets out to disprove his wife's newfound Christian faith and uncovers evidence that changes his own life.", platform: "Pure Flix", cats: ["Gospel & Faith"], moods: [], vibes: ["based on a true story","award winning"], ratings: ["all ages family friendly","any"] },
    { title: "Crosswalk Talk", synopsis: "A podcast featuring candid conversations with Christian actors, musicians and directors about keeping faith central in Hollywood.", platform: "Spotify", cats: ["Gospel & Faith"], moods: [], vibes: ["easy background watch","long running series"], ratings: ["all ages family friendly","any"] },
    { title: "Kirk Franklin: Gospel Essentials", synopsis: "A career-spanning playlist from one of gospel music's most influential voices, blending choir-driven praise with contemporary production.", platform: "Spotify", cats: ["Gospel & Faith"], moods: [], vibes: ["easy background watch","award winning"], ratings: ["all ages family friendly","any"] },
    { title: "Maverick City Music: Worship Sessions", synopsis: "Live, choir-backed worship recordings from the Grammy-winning collective redefining modern gospel and praise music.", platform: "Spotify", cats: ["Gospel & Faith"], moods: [], vibes: ["easy background watch","award winning"], ratings: ["all ages family friendly","any"] },
    { title: "The Gospel of Luke", synopsis: "A word-for-word cinematic telling of the Gospel of Luke, following the ministry of Jesus from birth to resurrection.", platform: "Angel Studios", cats: ["Gospel & Faith"], moods: [], vibes: ["prestige and critically acclaimed","based on a true story"], ratings: ["all ages family friendly","any"] },
    { title: "Sound of Freedom", year: 2023, country: "United States", countryCode: "US", synopsis: "A former federal agent risks everything to rescue children from traffickers, in this faith-driven true story that became a surprise box-office phenomenon.", platform: "Angel Studios", cats: ["Gospel & Faith"], moods: [], vibes: ["based on a true story","award winning"], ratings: ["teen PG-13","any"] , shareRestricted: true },
    { title: "CeCe Winans: Believe for It", synopsis: "The Grammy-winning gospel album blending traditional choir arrangements with modern worship production.", platform: "Apple Music", cats: ["Gospel & Faith"], moods: [], vibes: ["easy background watch","award winning"], ratings: ["all ages family friendly","any"] },

    // ---- Globoplay's own vertical micro-drama line (real, launched 2025-2026 —
    // confirmed via Variety and Brazilian press, not invented) ----
    { title: "Então É Amor?", synopsis: "A vertical micro-drama starring Carla Diaz: Rosa and Vicente fall in love as children, are separated, and reunite years later — but their romance must survive a dangerous power struggle within the Valmori family.", platform: "Globoplay", cats: ["vertical micro-drama","novela brasileira"], moods: ["romantic","intense and thrilling"], vibes: ["fast-paced binge-worthy","guilty pleasure"], ratings: ["teen PG-13","any"] },
    { title: "Quando o Coração Entra em Campo", synopsis: "A soccer-themed vertical micro-drama following Rocca, star forward for Rio's biggest club, whose career leaps forward when he makes Brazil's preliminary World Cup squad.", platform: "Globoplay", cats: ["vertical micro-drama"], moods: ["epic and adventurous","inspiring"], vibes: ["fast-paced binge-worthy","based on a true story"], ratings: ["all ages family friendly","teen PG-13","any"] },

    // ---- More real, verified ReelShort / DramaBox / ShortMax titles, spread
    // across platforms so a platform-specific filter has more than one option ----
    { title: "Divorced at the Wedding Day", synopsis: "A bride is humiliated and divorced at the altar, then returns transformed — richer, sharper, and done playing nice.", platform: "DramaBox", cats: ["vertical micro-drama"], moods: ["dark and gritty","intense and thrilling"], vibes: ["fast-paced binge-worthy","guilty pleasure"], ratings: ["teen PG-13","any"] },
    { title: "The Double Life of a Billionaire's Daughter", synopsis: "Raised in secret away from her family's empire, a young woman is pulled back into a world of corporate warfare and inheritance schemes.", platform: "ReelShort", cats: ["vertical micro-drama"], moods: ["intense and thrilling","dark and gritty"], vibes: ["fast-paced binge-worthy","guilty pleasure"], ratings: ["teen PG-13","any"] },
    { title: "American Horror Story: 13", year: 2026, country: "United States", countryCode: "US", synopsis: "American Horror Story returns for its thirteenth installment. The official FX premiere is September 24, 2026; check FX, Hulu or your regional Disney+ listing for availability.", platform: "Hulu", cats: ["series","limited series"], moods: ["scary","dark and gritty","intense and thrilling"], vibes: ["fast-paced binge-worthy","prestige and critically acclaimed","award winning"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },
    { title: "Second Chance Mafia Wife", synopsis: "A marriage of convenience to a mafia heir spirals into real danger — and real feelings — as old enemies resurface.", platform: "ShortMax", cats: ["vertical micro-drama"], moods: ["intense and thrilling","romantic"], vibes: ["fast-paced binge-worthy","guilty pleasure"], ratings: ["mature adults only R rated","any"] , shareRestricted: true },

    // ---------------- YOUTUBE CREATOR CATALOG ----------------
    // Platform is "YouTube", so the direct-link builder resolves each of these
    // through YouTube's own search URL. That is deliberate: hardcoded video IDs
    // and @handles rot (videos get deleted, handles get renamed), and this
    // codebase has already been burned once by fabricated TMDB poster hashes
    // that 404'd. A search URL for a well-known channel name always resolves.
    { title: "Kurzgesagt – In a Nutshell", synopsis: "Gorgeously animated explainers on space, biology and existential questions, made for the curious.", platform: "YouTube", cats: ["YouTube channel","documentary"], moods: ["mind-bending","inspiring"], vibes: ["easy background watch","award winning"], ratings: ["all ages family friendly","tween PG","any"] },
    { title: "Veritasium", synopsis: "Science and engineering questions taken apart properly, with experiments that overturn what you assumed.", platform: "YouTube", cats: ["YouTube channel","documentary"], moods: ["mind-bending","inspiring"], vibes: ["easy background watch","prestige and critically acclaimed"], ratings: ["all ages family friendly","tween PG","any"] },
    { title: "Mark Rober", synopsis: "An ex-NASA engineer builds absurdly elaborate contraptions, from glitter bombs to backyard science spectacles.", platform: "YouTube", cats: ["YouTube channel"], moods: ["funny","inspiring"], vibes: ["fast-paced binge-worthy","easy background watch"], ratings: ["all ages family friendly","kids","tween PG","any"] },
    { title: "SmarterEveryDay", synopsis: "Slow-motion cameras and genuine curiosity applied to everything from rockets to how a cat lands.", platform: "YouTube", cats: ["YouTube channel","documentary"], moods: ["mind-bending","inspiring"], vibes: ["easy background watch","hidden gem underrated"], ratings: ["all ages family friendly","tween PG","any"] },
    { title: "Vsauce", synopsis: "Deceptively simple questions that spiral into philosophy, mathematics and the limits of human perception.", platform: "YouTube", cats: ["YouTube channel"], moods: ["mind-bending"], vibes: ["slow burn","easy background watch"], ratings: ["tween PG","teen PG-13","any"] },
    { title: "3Blue1Brown", synopsis: "Mathematics made visual and intuitive, turning linear algebra and calculus into something you can actually see.", platform: "YouTube", cats: ["YouTube channel"], moods: ["mind-bending","inspiring"], vibes: ["slow burn","hidden gem underrated"], ratings: ["teen PG-13","tween PG","any"] },
    { title: "CGP Grey", synopsis: "Crisp, fast explainers on politics, borders, voting systems and the strange machinery of the modern world.", platform: "YouTube", cats: ["YouTube channel"], moods: ["mind-bending"], vibes: ["one sitting short watch","easy background watch"], ratings: ["tween PG","teen PG-13","any"] },
    { title: "TED-Ed", synopsis: "Short animated lessons on history, science and ethics, each built around one genuinely interesting idea.", platform: "YouTube", cats: ["YouTube channel","documentary","YouTube Shorts"], moods: ["inspiring","mind-bending"], vibes: ["one sitting short watch","easy background watch"], ratings: ["all ages family friendly","kids","tween PG","any"] },
    { title: "Manual do Mundo", synopsis: "O maior canal brasileiro de ciência e experimentos caseiros, com curiosidades e desafios para toda a família.", platform: "YouTube", cats: ["YouTube channel","documentary"], moods: ["inspiring","light and feel-good"], vibes: ["easy background watch","long running series"], ratings: ["all ages family friendly","kids","tween PG","any"] },

    { title: "Pitch Meeting", synopsis: "Ryan George plays both writer and producer, gleefully exposing the plot holes in every blockbuster ever made. Super easy, barely an inconvenience.", platform: "YouTube", cats: ["YouTube channel","stand-up comedy special","YouTube Shorts"], moods: ["funny"], vibes: ["one sitting short watch","fast-paced binge-worthy"], ratings: ["teen PG-13","tween PG","any"] },
    { title: "Porta dos Fundos", synopsis: "Esquetes de comédia brasileira afiadas e irreverentes, sobre religião, trabalho e a vida cotidiana no Brasil.", platform: "YouTube", cats: ["YouTube channel","stand-up comedy special"], moods: ["funny","dark and gritty"], vibes: ["one sitting short watch","guilty pleasure"], ratings: ["mature adults only R rated","teen PG-13","any"] },
    { title: "Whindersson Nunes", synopsis: "O humorista paraibano que virou fenômeno nacional, misturando stand-up, paródias musicais e vlogs.", platform: "YouTube", cats: ["YouTube channel","stand-up comedy special"], moods: ["funny","light and feel-good"], vibes: ["easy background watch","fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Key & Peele", synopsis: "Sketch comedy with impeccable timing, from substitute teachers to the angriest translator in politics.", platform: "YouTube", cats: ["YouTube channel","stand-up comedy special"], moods: ["funny"], vibes: ["one sitting short watch","award winning"], ratings: ["teen PG-13","mature adults only R rated","any"] },
    { title: "Bad Lip Reading", synopsis: "Politicians, films and sports redubbed with nonsense dialogue that syncs disturbingly well to their mouths.", platform: "YouTube", cats: ["YouTube channel","YouTube Shorts"], moods: ["funny"], vibes: ["one sitting short watch","guilty pleasure"], ratings: ["tween PG","teen PG-13","any"] },
    { title: "True Facts", synopsis: "Ze Frank narrates real animal biology with a deadpan absurdity that makes nature documentaries genuinely funny.", platform: "YouTube", cats: ["YouTube channel","documentary","YouTube Shorts"], moods: ["funny","mind-bending"], vibes: ["one sitting short watch","hidden gem underrated"], ratings: ["teen PG-13","tween PG","any"] },

    { title: "Marques Brownlee (MKBHD)", synopsis: "The most polished tech reviews on the platform, covering phones, EVs and the gear everyone argues about.", platform: "YouTube", cats: ["YouTube channel"], moods: ["inspiring"], vibes: ["easy background watch","prestige and critically acclaimed"], ratings: ["all ages family friendly","tween PG","any"] },
    { title: "Linus Tech Tips", synopsis: "Chaotic, hands-on PC building, hardware testing and the occasional very expensive mistake.", platform: "YouTube", cats: ["YouTube channel"], moods: ["funny","inspiring"], vibes: ["easy background watch","long running series"], ratings: ["tween PG","teen PG-13","any"] },
    { title: "Mrwhosetheboss", synopsis: "Slick gadget deep-dives and phone comparisons, with a good eye for what is actually worth your money.", platform: "YouTube", cats: ["YouTube channel","YouTube Shorts"], moods: ["inspiring"], vibes: ["easy background watch","fast-paced binge-worthy"], ratings: ["all ages family friendly","tween PG","any"] },

    { title: "Babish Culinary Universe", synopsis: "Recreating dishes from films and television, then teaching you to cook them properly for real.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch","light and feel-good"], vibes: ["easy background watch","long running series"], ratings: ["all ages family friendly","tween PG","any"] },
    { title: "Joshua Weissman", synopsis: "Ambitious from-scratch cooking and fast-food remakes, delivered at high speed and higher confidence.", platform: "YouTube", cats: ["YouTube channel","YouTube Shorts"], moods: ["light and feel-good","funny"], vibes: ["fast-paced binge-worthy","easy background watch"], ratings: ["teen PG-13","tween PG","any"] },
    { title: "Maangchi", synopsis: "Warm, authoritative Korean home cooking, from kimchi to tteokbokki, taught with infectious joy.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch","light and feel-good"], vibes: ["easy background watch","hidden gem underrated"], ratings: ["all ages family friendly","any"] },

    { title: "OverSimplified", synopsis: "Entire wars and revolutions compressed into fast, funny animated history that somehow still teaches you the facts.", platform: "YouTube", cats: ["YouTube channel","documentary"], moods: ["funny","epic and adventurous"], vibes: ["fast-paced binge-worthy","one sitting short watch"], ratings: ["tween PG","teen PG-13","any"] },
    { title: "Kings and Generals", synopsis: "Animated military history walking through ancient and medieval campaigns battle by battle.", platform: "YouTube", cats: ["YouTube channel","documentary"], moods: ["epic and adventurous","intense and thrilling"], vibes: ["slow burn","long running series"], ratings: ["teen PG-13","tween PG","any"] },
    { title: "Johnny Harris", synopsis: "Investigative video journalism on maps, borders and geopolitics, told with real reporting and strong visuals.", platform: "YouTube", cats: ["YouTube channel","documentary"], moods: ["mind-bending","intense and thrilling"], vibes: ["slow burn","based on a true story"], ratings: ["teen PG-13","any"] },
    { title: "Vox", synopsis: "Explanatory journalism unpacking one complicated thing at a time, from economics to why songs sound the same.", platform: "YouTube", cats: ["YouTube channel","documentary"], moods: ["mind-bending","inspiring"], vibes: ["one sitting short watch","easy background watch"], ratings: ["teen PG-13","tween PG","any"] },

    { title: "Cocomelon", synopsis: "Bright animated nursery rhymes and sing-alongs built for toddlers and preschoolers.", platform: "YouTube", cats: ["YouTube channel","kids"], moods: ["light and feel-good","cozy comfort watch"], vibes: ["easy background watch","long running series"], ratings: ["kids","all ages family friendly","any"] },
    { title: "Blippi", synopsis: "An endlessly enthusiastic guide exploring museums, machines and playgrounds for curious little kids.", platform: "YouTube", cats: ["YouTube channel","kids"], moods: ["light and feel-good"], vibes: ["easy background watch","long running series"], ratings: ["kids","all ages family friendly","any"] },
    { title: "Vlad and Niki", synopsis: "Two brothers turn everyday play into colourful, story-driven adventures for young children.", platform: "YouTube", cats: ["YouTube channel","kids","YouTube Shorts"], moods: ["light and feel-good","funny"], vibes: ["easy background watch","long running series"], ratings: ["kids","all ages family friendly","any"] },
    { title: "Like Nastya", synopsis: "Family-friendly play, songs and gentle life lessons following one of the platform's biggest kid creators.", platform: "YouTube", cats: ["YouTube channel","kids"], moods: ["light and feel-good"], vibes: ["easy background watch","long running series"], ratings: ["kids","all ages family friendly","any"] },

    { title: "Markiplier", synopsis: "Horror games, absurd challenges and a comedy sensibility that turned a gaming channel into a whole production house.", platform: "YouTube", cats: ["YouTube channel"], moods: ["funny","scary"], vibes: ["long running series","easy background watch"], ratings: ["teen PG-13","mature adults only R rated","any"] },
    { title: "Jacksepticeye", synopsis: "High-energy gaming and commentary from an Irish creator with one of the platform's most loyal communities.", platform: "YouTube", cats: ["YouTube channel"], moods: ["funny","light and feel-good"], vibes: ["easy background watch","long running series"], ratings: ["teen PG-13","any"] },

    { title: "NPR Tiny Desk Concerts", synopsis: "Stripped-back live sets performed behind an office desk, where great artists have nowhere to hide.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch","inspiring"], vibes: ["easy background watch","prestige and critically acclaimed"], ratings: ["all ages family friendly","teen PG-13","any"] },
    { title: "Lofi Girl", synopsis: "The endless lo-fi study stream: relaxed beats and a girl who has been doing homework since 2017.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch","nostalgic"], vibes: ["easy background watch","long running series"], ratings: ["all ages family friendly","any"] },
    { title: "T-Series", synopsis: "The Bollywood music powerhouse behind a huge share of Hindi film soundtracks and chart hits.", platform: "YouTube", cats: ["YouTube channel","Bollywood"], moods: ["romantic","epic and adventurous"], vibes: ["long running series","easy background watch"], ratings: ["all ages family friendly","teen PG-13","any"] },

    { title: "The Joy of Painting with Bob Ross", synopsis: "Happy little trees, a soothing voice and the most calming half hour on the internet.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch","nostalgic"], vibes: ["easy background watch","long running series"], ratings: ["all ages family friendly","kids","any"] },
    { title: "Yoga With Adriene", synopsis: "Approachable, no-pressure yoga sessions for every level, from a quick stretch to a full practice.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch","inspiring"], vibes: ["easy background watch","long running series"], ratings: ["all ages family friendly","any"] },

    { title: "Bailey Sarian: Dark History", synopsis: "True crime and buried history told conversationally, half storytelling and half makeup tutorial.", platform: "YouTube", cats: ["YouTube channel","documentary"], moods: ["dark and gritty","intense and thrilling"], vibes: ["easy background watch","based on a true story"], ratings: ["mature adults only R rated","teen PG-13","any"] },
    { title: "LEMMiNO", synopsis: "Meticulously researched mysteries and unsolved cases, narrated calmly over beautiful editing.", platform: "YouTube", cats: ["YouTube channel","documentary"], moods: ["mind-bending","scary"], vibes: ["slow burn","hidden gem underrated"], ratings: ["teen PG-13","any"] },

    { title: "Felipe Neto", synopsis: "Um dos maiores criadores do Brasil, com reações, comentários e vídeos sobre cultura pop e atualidades.", platform: "YouTube", cats: ["YouTube channel"], moods: ["funny","light and feel-good"], vibes: ["easy background watch","long running series"], ratings: ["teen PG-13","any"] },
    { title: "Você Sabia?", synopsis: "Curiosidades, listas e experimentos brasileiros que respondem perguntas que você nem sabia que tinha.", platform: "YouTube", cats: ["YouTube channel","YouTube Shorts"], moods: ["light and feel-good","mind-bending"], vibes: ["easy background watch","fast-paced binge-worthy"], ratings: ["all ages family friendly","tween PG","any"] },

    { title: "MrBeast", synopsis: "Enormous-budget challenges, giveaways and stunts from the most-subscribed creator on the platform.", platform: "YouTube", cats: ["YouTube channel","YouTube Shorts"], moods: ["intense and thrilling","funny"], vibes: ["fast-paced binge-worthy","guilty pleasure"], ratings: ["all ages family friendly","tween PG","teen PG-13","any"] },
    { title: "Nemesis", year: 2026, country: "United States", countryCode: "US", synopsis: "An LAPD detective's hunt for the mastermind behind a string of daring heists turns into an obsessive game of cat-and-mouse where only one of them can win.", platform: "Netflix", cats: ["series"], moods: ["intense and thrilling","dark and gritty"], vibes: ["fast-paced binge-worthy"], ratings: ["mature adults only R rated","any"] },
    { title: "The Gentlemen", year: 2024, country: "United Kingdom", countryCode: "GB", synopsis: "An aristocrat inherits his family's country estate only to discover it doubles as the cover for a vast cannabis empire, and has to out-scheme the criminals who came with it.", platform: "Netflix", cats: ["series"], moods: ["funny","intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["mature adults only R rated","any"] },
    { title: "Made in Korea", year: 2025, country: "South Korea", countryCode: "KR", synopsis: "A ruthless rise to power in 1970s Korea collides with the prosecutor who has spent years preparing to bring the new king of the underworld down.", platform: "Disney+", cats: ["K-drama","series"], moods: ["intense and thrilling","dark and gritty"], vibes: ["fast-paced binge-worthy"], ratings: ["mature adults only R rated","any"] },
    { title: "The Scandal", year: 2026, country: "South Korea", countryCode: "KR", synopsis: "In Joseon-era Korea, a brilliant noblewoman is drawn into a dangerous game of seduction with the kingdom's most notorious playboy, with a grieving young widow caught in the fallout.", platform: "Netflix", cats: ["K-drama","series"], moods: ["romantic","dark and gritty"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Teach You a Lesson", year: 2026, country: "South Korea", countryCode: "KR", synopsis: "When school discipline collapses, a government agency with the legal power to physically intervene sends its most unconventional inspector to take on the bullies running the halls.", platform: "Netflix", cats: ["K-drama","series"], moods: ["intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Hell's Paradise", year: 2023, country: "Japan", countryCode: "JP", synopsis: "An amnesiac ninja sentenced to death is offered a pardon if he can find a legendary elixir on a mysterious island \u2014 one guarded by monsters far worse than any executioner.", platform: "Crunchyroll", cats: ["anime","series"], moods: ["dark and gritty","intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["mature adults only R rated","any"] },
    { title: "The Last House", year: 2026, country: "United States", countryCode: "US", synopsis: "A family finds every door and window in their home sealed shut by an inexplicable force, and must find a way to survive as supplies run out and no rescue comes.", platform: "Netflix", cats: ["movie"], moods: ["intense and thrilling","mind-bending"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    // ---- FITNESS & WORKOUT (YouTube) ----
    { title: "Fitness Blender", country: "United States", countryCode: "US", synopsis: "Husband-and-wife team Daniel and Kelli publish hundreds of full-length, equipment-optional workouts with no subscription and no upsell.", platform: "YouTube", cats: ["YouTube channel"], moods: ["inspiring"], vibes: ["easy background watch"], ratings: ["all ages family friendly","tween PG","teen PG-13","any"] },
    { title: "Blogilates", country: "United States", countryCode: "US", synopsis: "Cassey Ho's Pilates-led channel, one of the longest-running fitness brands on the platform, mixing workouts with food and body-image honesty.", platform: "YouTube", cats: ["YouTube channel"], moods: ["light and feel-good","inspiring"], vibes: ["easy background watch"], ratings: ["all ages family friendly","tween PG","teen PG-13","any"] },
    { title: "Walk at Home by Leslie Sansone", country: "United States", countryCode: "US", synopsis: "The original indoor walking workout, running for over thirty years — low-impact routines you can do in a few square feet of floor.", platform: "YouTube", cats: ["YouTube channel"], moods: ["light and feel-good"], vibes: ["easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "HASfit", country: "United States", countryCode: "US", synopsis: "Coach Kozak and Claudia run free full-length workouts scaled for every level, with a modifier demonstrated in almost every video.", platform: "YouTube", cats: ["YouTube channel"], moods: ["inspiring"], vibes: ["easy background watch"], ratings: ["all ages family friendly","tween PG","teen PG-13","any"] },
    { title: "Sydney Cummings Houdyshell", country: "United States", countryCode: "US", synopsis: "A new full-length strength or conditioning workout published every single day, programmed in monthly blocks you can follow like a plan.", platform: "YouTube", cats: ["YouTube channel"], moods: ["intense and thrilling","inspiring"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Lucy Wyndham-Read", country: "United Kingdom", countryCode: "GB", synopsis: "Short, beginner-friendly routines built around walking, low-impact cardio and quick sessions that fit into a normal day.", platform: "YouTube", cats: ["YouTube channel"], moods: ["light and feel-good"], vibes: ["easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "The Fitness Marshall", country: "United States", countryCode: "US", synopsis: "Dance cardio to current pop tracks, played for joy rather than discipline — closer to a living-room party than a workout.", platform: "YouTube", cats: ["YouTube channel"], moods: ["funny","light and feel-good"], vibes: ["easy background watch","guilty pleasure"], ratings: ["tween PG","teen PG-13","any"] },
    { title: "growwithjo", country: "Malaysia", countryCode: "MY", synopsis: "Joanna Soh's walking and home workouts aimed squarely at beginners, with an emphasis on routines that need no equipment at all.", platform: "YouTube", cats: ["YouTube channel"], moods: ["light and feel-good","inspiring"], vibes: ["easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "MadFit", country: "Canada", countryCode: "CA", synopsis: "Apartment-friendly workouts choreographed to full songs, designed to be quiet enough not to annoy the neighbours below.", platform: "YouTube", cats: ["YouTube channel"], moods: ["light and feel-good"], vibes: ["fast-paced binge-worthy"], ratings: ["tween PG","teen PG-13","any"] },
    { title: "Pamela Reif", country: "Germany", countryCode: "DE", synopsis: "Silent, no-talking workout sets timed to music, from ten-minute abs to full-length HIIT, with a follow-along format and no chat.", platform: "YouTube", cats: ["YouTube channel"], moods: ["intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Chloe Ting", country: "Australia", countryCode: "AU", synopsis: "Free structured challenge programmes with a calendar to follow, which is what turned her short at-home routines into a global habit.", platform: "YouTube", cats: ["YouTube channel"], moods: ["intense and thrilling","inspiring"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "POPSUGAR Fitness", country: "United States", countryCode: "US", synopsis: "Studio-style classes across dance, HIIT, strength and cardio, taught by rotating professional instructors.", platform: "YouTube", cats: ["YouTube channel"], moods: ["light and feel-good"], vibes: ["easy background watch"], ratings: ["all ages family friendly","tween PG","any"] },

    // ---- YOGA & MEDITATION (YouTube) ----
    { title: "Yoga With Kassandra", country: "Canada", countryCode: "CA", synopsis: "Yin and slow-flow yoga with a focus on morning and bedtime routines, plus long-form yoga nidra for deep rest.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch"], vibes: ["slow burn"], ratings: ["all ages family friendly","any"] },
    { title: "Yoga with Tim", country: "United States", countryCode: "US", synopsis: "Detailed, alignment-led vinyasa for people who want to understand what a pose is actually doing rather than just follow along.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch","inspiring"], vibes: ["slow burn"], ratings: ["all ages family friendly","any"] },
    { title: "The Mindful Movement", country: "United States", countryCode: "US", synopsis: "Sara and Les Raymond combine guided imagery, breathwork and gentle movement — meditation for people whose legs go numb sitting still.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch","inspiring"], vibes: ["slow burn"], ratings: ["all ages family friendly","any"] },
    { title: "The Honest Guys", country: "United Kingdom", countryCode: "GB", synopsis: "Cinematic guided meditations and sleep visualisations — closer to bedtime stories for adults than to instruction.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch"], vibes: ["slow burn","easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "Michael Sealey", country: "Australia", countryCode: "AU", synopsis: "Long-form sleep hypnosis and guided relaxation, widely used for insomnia and anxiety, in a deliberately unhurried voice.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch"], vibes: ["slow burn"], ratings: ["teen PG-13","any"] },
    { title: "Jason Stephenson - Sleep Meditation Music", country: "Australia", countryCode: "AU", synopsis: "Guided sleep meditations and hours-long relaxation music, one of the most-listened sources of bedtime audio anywhere.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch"], vibes: ["slow burn","easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "Great Meditation", country: "United States", countryCode: "US", synopsis: "Short morning meditations and affirmations alongside longer sessions for sleep and spiritual growth, with minimal visuals.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch","inspiring"], vibes: ["slow burn"], ratings: ["all ages family friendly","any"] },
    { title: "Declutter The Mind", country: "Canada", countryCode: "CA", synopsis: "Secular, situation-specific guided meditation — sessions for a 3am panic attack or a hard conversation rather than vague moods.", platform: "YouTube", cats: ["YouTube channel"], moods: ["cozy comfort watch"], vibes: ["slow burn"], ratings: ["teen PG-13","any"] },

    // ---- MEDITATION & WELLNESS PODCASTS ----
    { title: "Get Sleepy", country: "United Kingdom", countryCode: "GB", synopsis: "Original bedtime stories read slowly over ambient sound, consistently at the top of the sleep podcast charts.", platform: "Spotify", cats: ["podcast"], moods: ["cozy comfort watch"], vibes: ["slow burn","easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "Tara Brach", country: "United States", countryCode: "US", synopsis: "Weekly talks and guided meditations from the psychologist and meditation teacher, blending Buddhist practice with clinical psychology.", platform: "Apple Podcasts", cats: ["podcast"], moods: ["inspiring","cozy comfort watch"], vibes: ["slow burn"], ratings: ["teen PG-13","any"] },
    { title: "Meditation Minis Podcast", country: "United States", countryCode: "US", synopsis: "Guided meditations under ten minutes for anxiety, stress and sleep, aimed at people who genuinely have no time.", platform: "Spotify", cats: ["podcast"], moods: ["cozy comfort watch"], vibes: ["slow burn"], ratings: ["all ages family friendly","any"] },
    { title: "Sleep Cove", country: "United Kingdom", countryCode: "GB", synopsis: "Guided sleep meditation and hypnosis from Christopher Fitton, built specifically to be fallen asleep to rather than finished.", platform: "Apple Podcasts", cats: ["podcast"], moods: ["cozy comfort watch"], vibes: ["slow burn"], ratings: ["teen PG-13","any"] },
    { title: "Tracks To Relax", country: "Canada", countryCode: "CA", synopsis: "Guided sleep meditations designed so you never hear the ending, with sessions for napping and daytime resets too.", platform: "Spotify", cats: ["podcast"], moods: ["cozy comfort watch"], vibes: ["slow burn"], ratings: ["all ages family friendly","any"] },
    { title: "The Mindful in Minutes Podcast", country: "United States", countryCode: "US", synopsis: "Kelly Smith teaches meditation in roughly ten-minute sittings, with themed series on grief, burnout and building a daily habit.", platform: "Apple Podcasts", cats: ["podcast"], moods: ["cozy comfort watch","inspiring"], vibes: ["slow burn"], ratings: ["all ages family friendly","any"] },

    // ---- MEDITATION & FOCUS MUSIC ----
    { title: "Deep Focus", country: "Global", synopsis: "Instrumental, lyric-free tracks built to hold concentration for long stretches of work or study.", platform: "Spotify", cats: ["Spotify playlist"], moods: ["cozy comfort watch"], vibes: ["easy background watch","slow burn"], ratings: ["all ages family friendly","any"] },
    { title: "Peaceful Meditation", country: "Global", synopsis: "Slow ambient soundscapes for meditation practice, breathwork and winding down without any spoken guidance.", platform: "Spotify", cats: ["Spotify playlist"], moods: ["cozy comfort watch"], vibes: ["slow burn","easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "Pure Yoga", country: "Global", synopsis: "Flowing instrumental music paced for a yoga session, calm enough to hold a long hold and warm enough to keep you moving.", platform: "Apple Music", cats: ["Spotify playlist"], moods: ["cozy comfort watch"], vibes: ["slow burn"], ratings: ["all ages family friendly","any"] },
    { title: "Sleep Sounds", country: "Global", synopsis: "Rain, white noise and low ambient drones running long enough to cover a whole night without a loop you can hear.", platform: "YouTube Music", cats: ["Spotify playlist"], moods: ["cozy comfort watch"], vibes: ["easy background watch","slow burn"], ratings: ["all ages family friendly","any"] },
    { title: "Workout Twerkout", country: "Global", synopsis: "High-tempo tracks sequenced to carry a full gym session without needing to touch your phone.", platform: "Spotify", cats: ["Spotify playlist"], moods: ["intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","mature adults only R rated","any"] },
    { title: "Beast Mode", country: "Global", synopsis: "Heavy hip-hop and rap built for lifting, one of the most-followed workout playlists anywhere.", platform: "Spotify", cats: ["Spotify playlist"], moods: ["intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["mature adults only R rated","any"] },
    // ---- TRENDING NOW: September 2026 ----
    { title: "Stranger Things: Tales From '85", year: 2026, country: "United States", countryCode: "US", synopsis: "An animated return to Hawkins in the winter of 1985, styled like a Saturday-morning cartoon, with the original party facing a new paranormal mystery.", platform: "Netflix", cats: ["series","anime"], moods: ["nostalgic","scary","epic and adventurous"], vibes: ["fast-paced binge-worthy"], ratings: ["tween PG","teen PG-13","any"] },
    { title: "Turning Point: Generation 9/11", year: 2026, country: "United States", countryCode: "US", synopsis: "A documentary on the generation who grew up in the shadow of September 11, and how that single day shaped the two decades after it.", platform: "Netflix", cats: ["documentary"], moods: ["heartbreaking","inspiring"], vibes: ["prestige and critically acclaimed","slow burn"], ratings: ["teen PG-13","any"] },
    { title: "Monster: The Lizzie Borden Story", year: 2026, country: "United States", countryCode: "US", synopsis: "Ryan Murphy's anthology turns to the 1892 axe murders and the daughter acquitted of them, in a case America has argued about ever since.", platform: "Netflix", cats: ["series","limited series"], moods: ["dark and gritty","intense and thrilling"], vibes: ["fast-paced binge-worthy","prestige and critically acclaimed"], ratings: ["mature adults only R rated","any"] },
    { title: "Physical: 100 Italy", year: 2026, country: "Italy", countryCode: "IT", synopsis: "The brutal Korean fitness competition format arrives in Italy, pitting a hundred athletes against each other to find the most complete physique.", platform: "Netflix", cats: ["reality show"], moods: ["intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Why Did I Get Married Again?", year: 2026, country: "United States", countryCode: "US", synopsis: "Tyler Perry's third film about the same group of couples, back together for another retreat and another round of secrets neither marriage survives easily.", platform: "Netflix", cats: ["movie"], moods: ["heartbreaking"], vibes: ["guilty pleasure"], ratings: ["teen PG-13","any"] },
    { title: "Earle Meets World", year: 2026, country: "United States", countryCode: "US", synopsis: "Reality series following Alix Earle, tracking the daily reality behind one of social media's most-followed lives.", platform: "Netflix", cats: ["reality show"], moods: ["light and feel-good"], vibes: ["guilty pleasure","easy background watch"], ratings: ["teen PG-13","any"] },
    { title: "The Great British Baking Show", year: 2026, country: "United Kingdom", countryCode: "GB", synopsis: "Amateur bakers compete in a tent in the English countryside — the gentlest competition format on television, and the reason comfort viewing has a name.", platform: "Netflix", cats: ["reality show"], moods: ["cozy comfort watch","light and feel-good"], vibes: ["easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "Untold: Raygun - Breaking Badly", year: 2026, country: "United States", countryCode: "US", synopsis: "The sports documentary series takes on the Olympic breakdancing routine that became a global meme overnight, and what it did to the academic behind it.", platform: "Netflix", cats: ["documentary"], moods: ["funny","heartbreaking"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },

    // ---- VERIFIED CURRENT CATALOG EXPANSION: September 18, 2026 ----
    // Platform presence below is sourced from the providers' own September
    // release announcements. Age ratings stay "any" unless a rating is
    // independently verified; MatchApp never guesses an age classification.
    { title: "Go Team!", year: 2026, country: "Spain", countryCode: "ES", synopsis: "A company retreat collapses into chaos when a cheese-company team is sent to a tiny village and discovers layoffs are coming.", platform: "Netflix", cats: ["movie"], moods: ["funny","light and feel-good"], vibes: ["fast-paced binge-worthy"], ratings: ["any"], source: "https://about.netflix.com/en/news/netflix-premieres-go-team-on-september-11", checked: "2026-09-18" },
    { title: "A Different World", year: 2026, country: "United States", countryCode: "US", synopsis: "A new generation arrives at Hillman College, with Deborah Wayne trying to build a life beyond the legacy of her famous alumni parents.", platform: "Netflix", cats: ["series"], moods: ["light and feel-good","inspiring","nostalgic"], vibes: ["easy background watch"], ratings: ["any"], source: "https://www.netflix.com/tudum/articles/new-on-netflix", checked: "2026-09-18" },
    { title: "Best of the Best", year: 2026, country: "United States", countryCode: "US", synopsis: "Two newcomers join a competitive college dance team and discover that making the cut is only the beginning of the comedy.", platform: "Netflix", cats: ["movie"], moods: ["funny","inspiring","light and feel-good"], vibes: ["fast-paced binge-worthy"], ratings: ["any"], source: "https://www.netflix.com/tudum/articles/new-on-netflix", checked: "2026-09-18" },
    { title: "Call My Agent! The Movie", year: 2026, country: "France", countryCode: "FR", synopsis: "The agents return in a feature-length continuation of the French show-business comedy, with careers and egos colliding on a larger stage.", platform: "Netflix", cats: ["movie"], moods: ["funny","light and feel-good"], vibes: ["easy background watch"], ratings: ["any"], source: "https://www.netflix.com/tudum/articles/new-on-netflix", checked: "2026-09-18" },
    { title: "Jo Koy: Blue in the Face", year: 2026, country: "United States", countryCode: "US", synopsis: "Jo Koy turns a dental disaster, getting fired from McDonald's and stories about his veteran stepfather into a fast, personal stand-up set.", platform: "Netflix", cats: ["stand-up comedy special"], moods: ["funny","light and feel-good"], vibes: ["fast-paced binge-worthy"], ratings: ["any"], source: "https://www.netflix.com/tudum/articles/what-to-watch-on-netflix-september-11-2026", checked: "2026-09-18" },
    { title: "Neagley", year: 2026, country: "United States", countryCode: "US", synopsis: "The Reacher universe expands around Frances Neagley, the sharp Chicago investigator who now leads her own high-risk case.", platform: "Prime Video", cats: ["series"], moods: ["intense and thrilling","dark and gritty"], vibes: ["fast-paced binge-worthy"], ratings: ["any"], source: "https://www.aboutamazon.com/news/entertainment/prime-video-september-films-shows-sports-2026", checked: "2026-09-18" },
    { title: "The Love Hypothesis", year: 2026, country: "United States", countryCode: "US", synopsis: "A romance adapted from the bestselling novel brings a carefully reasoned fake relationship into the much messier reality of attraction.", platform: "Prime Video", cats: ["movie"], moods: ["romantic","light and feel-good"], vibes: ["easy background watch"], ratings: ["any"], source: "https://www.aboutamazon.com/news/entertainment/prime-video-september-films-shows-sports-2026", checked: "2026-09-18" },
    { title: "Star Wars: The Mandalorian and Grogu", year: 2026, country: "United States", countryCode: "US", synopsis: "Din Djarin and Grogu take on a new mission after the fall of the Empire, with scattered Imperial warlords still threatening the galaxy.", platform: "Disney+", cats: ["movie"], moods: ["epic and adventurous","intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["any"], source: "https://press.disneyplus.com/news/star-wars-the-mandalorian", checked: "2026-09-18" },
    { title: "The Drop: A Snowfall Saga", year: 2026, country: "United States", countryCode: "US", synopsis: "Wanda Bell and Leon Simmons try to reinvent themselves in 1990s Los Angeles as the aftermath of the crack era gives way to the rise of West Coast rap.", platform: "Disney+", cats: ["series"], moods: ["dark and gritty","intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["any"], source: "https://press.disneyplus.com/news/next-on-disney-plus-september-2026", checked: "2026-09-18" },
    { title: "Toy Story 5", year: 2026, country: "United States", countryCode: "US", synopsis: "Woody, Buzz and the toys return for a new chapter about play, friendship and what happens when the world around their kid keeps changing.", platform: "Disney+", cats: ["movie"], moods: ["light and feel-good","nostalgic","inspiring"], vibes: ["easy background watch"], ratings: ["any"], source: "https://www.disneyplus.com/pt-br/explore/articles/new-to-disney-plus", checked: "2026-09-18" },

    // ================================================================
    // CLASSICAL MUSIC CHANNEL — video AND audio in one category.
    //
    // Deliberately mixed-medium: a classical listener does not separate
    // "watching the Berlin Phil" from "putting on the Cello Suites" the way
    // the rest of the catalogue separates film from podcast. Both live under
    // one category so a single tick surfaces either.
    //
    // Never reachable from Surprise Me — see SURPRISE_ME_CATEGORIES. Someone
    // asking "what should I watch tonight" is not asking for a Mahler cycle
    // unless they said so.
    // ================================================================
    { title: "Digital Concert Hall — Berliner Philharmoniker", year: 2026, country: "Germany", countryCode: "DE", synopsis: "The Berlin Philharmonic streams its own concerts in full, live from the Philharmonie and from an archive going back decades — the closest thing to a season ticket from your sofa.", platform: "Digital Concert Hall", cats: ["Classical Music"], moods: ["inspiring","epic and adventurous"], vibes: ["prestige and critically acclaimed"], ratings: ["all ages family friendly","any"] },
    { title: "Vienna Philharmonic New Year's Concert", year: 2026, country: "Austria", countryCode: "AT", synopsis: "Strauss waltzes and polkas from the Musikverein's Golden Hall every January 1st — broadcast to roughly ninety countries and unchanged in spirit since 1941.", platform: "YouTube", cats: ["Classical Music"], moods: ["light and feel-good","nostalgic"], vibes: ["prestige and critically acclaimed"], ratings: ["all ages family friendly","any"] },
    { title: "BBC Proms", year: 2026, country: "United Kingdom", countryCode: "GB", synopsis: "Eight weeks of concerts from the Royal Albert Hall, from full symphonies to late-night jazz crossovers, ending in the Last Night singalong.", platform: "YouTube", cats: ["Classical Music"], moods: ["inspiring","epic and adventurous"], vibes: ["prestige and critically acclaimed"], ratings: ["all ages family friendly","any"] },
    { title: "Yo-Yo Ma — Bach: The Six Unaccompanied Cello Suites", year: 2018, country: "United States", countryCode: "US", synopsis: "Ma's third recording of the suites he has played since he was four — the same notes, read by someone who has lived with them for sixty years.", platform: "Spotify", cats: ["Classical Music"], moods: ["cozy comfort watch","heartbreaking"], vibes: ["slow burn","prestige and critically acclaimed"], ratings: ["all ages family friendly","any"] },
    { title: "Max Richter — Sleep", year: 2015, country: "United Kingdom", countryCode: "GB", synopsis: "An eight-hour lullaby written to be slept through rather than listened to, composed with a neuroscientist's input on what the sleeping brain does with sound.", platform: "Spotify", cats: ["Classical Music"], moods: ["cozy comfort watch"], vibes: ["slow burn"], ratings: ["all ages family friendly","any"] },
    { title: "Ludovico Einaudi — Seven Days Walking", year: 2019, country: "Italy", countryCode: "IT", synopsis: "Seven albums of the same handful of themes, rewalked slightly differently each day — minimalist piano that works as a room as much as a record.", platform: "Spotify", cats: ["Classical Music"], moods: ["cozy comfort watch","nostalgic"], vibes: ["slow burn","easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "Hilary Hahn — Bach: Violin Sonatas & Partitas", year: 2018, country: "United States", countryCode: "US", synopsis: "Hahn returns to the solo Bach she first recorded at seventeen, this time completing the set — technically immaculate and unusually warm with it.", platform: "Apple Music", cats: ["Classical Music"], moods: ["inspiring"], vibes: ["prestige and critically acclaimed","slow burn"], ratings: ["all ages family friendly","any"] },
    { title: "Lang Lang — The Disney Book", year: 2022, country: "China", countryCode: "CN", synopsis: "Disney themes arranged for concert piano and orchestra — the gentlest possible on-ramp into classical playing for someone who thinks they don't like classical.", platform: "Spotify", cats: ["Classical Music"], moods: ["light and feel-good","nostalgic"], vibes: ["easy background watch"], ratings: ["kids","all ages family friendly","any"] },
    { title: "TÁR", year: 2022, country: "United States", countryCode: "US", synopsis: "A celebrated conductor at the top of the classical world watches her life come apart, in a film that takes rehearsal-room craft as seriously as it takes the fall.", platform: "Peacock", cats: ["Classical Music","movie"], moods: ["dark and gritty","mind-bending"], vibes: ["prestige and critically acclaimed","award winning","slow burn"], ratings: ["mature adults only R rated","any"] },
    { title: "Maestro", year: 2023, country: "United States", countryCode: "US", synopsis: "Leonard Bernstein's marriage to Felicia Montealegre across three decades, built around the music he conducted and the life he couldn't conduct as neatly.", platform: "Netflix", cats: ["Classical Music","movie"], moods: ["heartbreaking","inspiring"], vibes: ["prestige and critically acclaimed","award winning","based on a true story"], ratings: ["mature adults only R rated","any"] },
    { title: "Amadeus", year: 1984, country: "United States", countryCode: "US", synopsis: "Salieri tells a priest how he destroyed Mozart, in the film that convinced a generation that classical music was gossip, rivalry and blood rather than homework.", platform: "Max", cats: ["Classical Music","movie"], moods: ["intense and thrilling","epic and adventurous"], vibes: ["award winning","prestige and critically acclaimed"], ratings: ["teen PG-13","any"] },
    { title: "TwoSet Violin", year: 2026, country: "Australia", countryCode: "AU", synopsis: "Two conservatory-trained violinists make classical music funny without making it stupid — practice-room jokes, reaction videos and genuinely good playing.", platform: "YouTube", cats: ["Classical Music"], moods: ["funny","light and feel-good"], vibes: ["easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "Rousseau", year: 2026, country: "United Kingdom", countryCode: "GB", synopsis: "Piano performances filmed from above with the notes falling down the screen — a visualiser that makes the structure of a piece visible while you listen.", platform: "YouTube", cats: ["Classical Music"], moods: ["cozy comfort watch"], vibes: ["easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "Gustavo Dudamel & LA Phil — Beethoven Symphony No. 9", year: 2026, country: "United States", countryCode: "US", synopsis: "The Ninth under a conductor who came up through Venezuela's El Sistema — the Ode to Joy played by someone who was handed an instrument to keep him off the street.", platform: "YouTube", cats: ["Classical Music"], moods: ["inspiring","epic and adventurous"], vibes: ["prestige and critically acclaimed"], ratings: ["all ages family friendly","any"] },
    { title: "Yuja Wang — The American Project", year: 2023, country: "China", countryCode: "CN", synopsis: "A new concerto written for Wang alongside Gershwin's Rhapsody in Blue, played with the ferocious clarity that has made her the most-argued-about pianist alive.", platform: "Spotify", cats: ["Classical Music"], moods: ["intense and thrilling","inspiring"], vibes: ["prestige and critically acclaimed"], ratings: ["all ages family friendly","any"] },
    { title: "Joe Hisaishi — A Symphonic Celebration", year: 2023, country: "Japan", countryCode: "JP", synopsis: "The Studio Ghibli scores rearranged for full orchestra by the man who wrote them — Totoro and Spirited Away as concert repertoire rather than soundtrack.", platform: "Spotify", cats: ["Classical Music"], moods: ["nostalgic","inspiring","cozy comfort watch"], vibes: ["easy background watch"], ratings: ["kids","all ages family friendly","any"] },

    // ================================================================
    // WORLDWIDE NEWS — strictly opt-in.
    //
    // The rule the CEO set, and the right one: nobody opening an
    // entertainment matcher on a Friday night wants a war bulletin handed to
    // them unrequested. These appear if and only if News is ticked.
    // ================================================================
    { title: "BBC News at Ten", year: 2026, country: "United Kingdom", countryCode: "GB", synopsis: "The BBC's flagship evening bulletin — thirty minutes of the day's world and UK stories, reported straight.", platform: "YouTube", cats: ["News"], moods: [], vibes: [], ratings: ["teen PG-13","any"] },
    { title: "DW News", year: 2026, country: "Germany", countryCode: "DE", synopsis: "Germany's international broadcaster, in English, free and unpaywalled — strongest on Europe, the EU and stories the Anglophone networks undercover.", platform: "YouTube", cats: ["News"], moods: [], vibes: [], ratings: ["teen PG-13","any"] },
    { title: "Al Jazeera English — Newshour", year: 2026, country: "Qatar", countryCode: "QA", synopsis: "An hour built around the Middle East, Africa and South Asia rather than treating them as foreign-desk items at the end of the bulletin.", platform: "YouTube", cats: ["News"], moods: [], vibes: [], ratings: ["teen PG-13","any"] },
    { title: "France 24 English", year: 2026, country: "France", countryCode: "FR", synopsis: "Rolling international news from Paris, with Francophone Africa and EU politics covered far more closely than most English-language networks bother with.", platform: "YouTube", cats: ["News"], moods: [], vibes: [], ratings: ["teen PG-13","any"] },
    { title: "NHK World-Japan Newsline", year: 2026, country: "Japan", countryCode: "JP", synopsis: "Japan's public broadcaster in English — the reference source for Asia-Pacific news, disaster reporting and anything happening on the Japanese archipelago.", platform: "YouTube", cats: ["News"], moods: [], vibes: [], ratings: ["all ages family friendly","any"] },
    { title: "PBS NewsHour", year: 2026, country: "United States", countryCode: "US", synopsis: "An hour of US and world news with the interviews run long rather than cut for pace — the least shouty hour on American television.", platform: "YouTube", cats: ["News"], moods: [], vibes: ["slow burn"], ratings: ["teen PG-13","any"] },
    { title: "Jornal Nacional", year: 2026, country: "Brazil", countryCode: "BR", synopsis: "O telejornal mais assistido do Brasil — Brazil's main evening news, on air since 1969 and still the country's shared daily briefing.", platform: "Globoplay", cats: ["News"], moods: [], vibes: [], ratings: ["teen PG-13","any"] },
    { title: "Euronews", year: 2026, country: "France", countryCode: "FR", synopsis: "European news broadcast simultaneously in a dozen languages, with the same footage read in each — useful precisely because the framing shifts between them.", platform: "YouTube", cats: ["News"], moods: [], vibes: [], ratings: ["teen PG-13","any"] },
    { title: "CNA — Channel NewsAsia", year: 2026, country: "Singapore", countryCode: "SG", synopsis: "Singapore-based coverage of Southeast Asia and China, reported from inside the region rather than from a bureau flying in.", platform: "YouTube", cats: ["News"], moods: [], vibes: [], ratings: ["teen PG-13","any"] },
    { title: "The Daily", year: 2026, country: "United States", countryCode: "US", synopsis: "The New York Times takes one story a morning and spends twenty-five minutes on it, usually with the reporter who wrote it.", platform: "Spotify", cats: ["News"], moods: [], vibes: ["slow burn"], ratings: ["teen PG-13","any"] },
    { title: "Global News Podcast", year: 2026, country: "United Kingdom", countryCode: "GB", synopsis: "The BBC World Service's twice-daily world round-up in under half an hour — the fastest way to know what happened everywhere.", platform: "Apple Podcasts", cats: ["News"], moods: [], vibes: [], ratings: ["teen PG-13","any"] },
    { title: "TLDR News Global", year: 2026, country: "United Kingdom", countryCode: "GB", synopsis: "Explainer videos that assume you missed the last six months of a story and want the whole arc, not today's increment.", platform: "YouTube", cats: ["News"], moods: [], vibes: ["easy background watch"], ratings: ["teen PG-13","any"] },

    // ================================================================
    // SPORTS — also strictly opt-in, same reasoning as News.
    // ================================================================
    { title: "Formula 1: Drive to Survive", year: 2026, country: "United Kingdom", countryCode: "GB", synopsis: "The paddock politics behind an F1 season, edited like a soap and responsible for most of the sport's new audience since 2019.", platform: "Netflix", cats: ["Sports"], moods: ["intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "The Last Dance", year: 2020, country: "United States", countryCode: "US", synopsis: "Michael Jordan's final Bulls season, built from footage nobody was allowed to show for twenty years.", platform: "Netflix", cats: ["Sports"], moods: ["inspiring","intense and thrilling"], vibes: ["award winning","prestige and critically acclaimed"], ratings: ["mature adults only R rated","any"] },
    { title: "Welcome to Wrexham", year: 2026, country: "United States", countryCode: "US", synopsis: "Two Hollywood actors buy a fifth-tier Welsh football club and discover a town's entire self-image came with it.", platform: "Hulu", cats: ["Sports"], moods: ["funny","inspiring","heartbreaking"], vibes: ["based on a true story"], ratings: ["mature adults only R rated","any"] },
    { title: "Break Point", year: 2026, country: "United States", countryCode: "US", synopsis: "Tennis on tour at close range, following players through the Slams in the first season after the sport's old guard finally left.", platform: "Netflix", cats: ["Sports"], moods: ["intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Full Swing", year: 2026, country: "United States", countryCode: "US", synopsis: "Professional golf during the money war that split it in two — far more interesting than golf has any business being.", platform: "Netflix", cats: ["Sports"], moods: ["intense and thrilling"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "Quarterback", year: 2026, country: "United States", countryCode: "US", synopsis: "A season inside the helmet of NFL quarterbacks, mic'd through games and home life both.", platform: "Netflix", cats: ["Sports"], moods: ["intense and thrilling","inspiring"], vibes: ["fast-paced binge-worthy"], ratings: ["teen PG-13","any"] },
    { title: "ESPN 30 for 30", year: 2026, country: "United States", countryCode: "US", synopsis: "The documentary strand that made sports films respectable — each one a different director on a story sport would rather have forgotten.", platform: "YouTube", cats: ["Sports"], moods: ["heartbreaking","inspiring"], vibes: ["award winning","prestige and critically acclaimed"], ratings: ["teen PG-13","any"] },
    { title: "UEFA Champions League", year: 2026, country: "Switzerland", countryCode: "CH", synopsis: "Europe's club competition, midweek from September to the final — the matches the rest of the football calendar is arranged around.", platform: "Paramount+", cats: ["Sports"], moods: ["intense and thrilling","epic and adventurous"], vibes: [], ratings: ["all ages family friendly","any"] },
    { title: "Globo Esporte", year: 2026, country: "Brazil", countryCode: "BR", synopsis: "Brazil's daily sports programme — Brasileirão, the state championships and whichever transfer rumour the country is arguing about today.", platform: "Globoplay", cats: ["Sports"], moods: [], vibes: ["easy background watch"], ratings: ["all ages family friendly","any"] },
    { title: "Sunderland 'Til I Die", year: 2020, country: "United Kingdom", countryCode: "GB", synopsis: "A football club falls down the English leagues while the city that lives for it watches — the anti-Wrexham, and the better documentary.", platform: "Netflix", cats: ["Sports"], moods: ["heartbreaking"], vibes: ["based on a true story","slow burn"], ratings: ["mature adults only R rated","any"] },
    // ROKU — reviewed regional availability, isolated from the Kids allowlist.
    {"title":"WEIRD: The Al Yankovic Story","year":2022,"country":"United States","countryCode":"US","synopsis":"A deliberately exaggerated musical parody follows an accordion-playing songwriter into a wildly fictional version of pop stardom.","platform":"Roku Channel","cats":["movie"],"moods":["funny"],"vibes":["guilty pleasure"],"ratings":["mature adults only R rated","any"],"url":"https://therokuchannel.roku.com/watch/066097da82ed5762966888a59b151058","availabilityCountries":["United States","Canada","United Kingdom"],"source":"https://www.weirdal.com/news/weird-the-al-yankovic-story/","checked":"2026-09-14"},
    {"title":"Die Hart","year":2020,"country":"United States","countryCode":"US","synopsis":"Kevin Hart plays a fictional version of himself training to become an action star, with increasingly ridiculous and dangerous lessons.","platform":"Roku Channel","cats":["series"],"moods":["funny"],"vibes":["fast-paced binge-worthy"],"ratings":["mature adults only R rated","any"],"url":"https://www.roku.com/en-us/whats-on/the-roku-channel/roku-originals/die-hart","availabilityCountries":["United States","Canada","United Kingdom"],"source":"https://www.roku.com/en-us/whats-on/the-roku-channel/roku-originals/die-hart","checked":"2026-09-14"},
    {"title":"The Great American Baking Show","year":2023,"country":"United States","countryCode":"US","synopsis":"Amateur bakers take on signature, technical and showstopper challenges in the American baking competition hosted by Casey Wilson and Zach Cherry.","platform":"Roku Channel","cats":["series","reality show"],"moods":["light and feel-good","cozy comfort watch"],"vibes":["easy background watch"],"ratings":["teen PG-13","any"],"url":"https://www.roku.com/whats-on/tv-shows/the-great-american-baking-show?id=d2c1397576065492a30b905226d840f4","availabilityCountries":["United States","Canada","United Kingdom"],"source":"https://www.roku.com/whats-on/tv-shows/the-great-american-baking-show?id=d2c1397576065492a30b905226d840f4","checked":"2026-09-14"},
    {"title":"Honest Renovations","year":2023,"country":"United States","countryCode":"US","synopsis":"Jessica Alba and Lizzy Mathis help families adapt their homes with practical renovations and thoughtful design.","platform":"Roku Channel","cats":["series","reality show"],"moods":["inspiring","cozy comfort watch"],"vibes":["easy background watch"],"ratings":["mature adults only R rated","any"],"url":"https://www.roku.com/whats-on/tv-shows/honest-renovations?id=8b926ff837975aedbf18257557f6358c","availabilityCountries":["United States","Canada","United Kingdom"],"source":"https://www.roku.com/whats-on/tv-shows/honest-renovations?id=8b926ff837975aedbf18257557f6358c","checked":"2026-09-14"},
    {"title":"Side Hustlers","year":2024,"country":"United States","countryCode":"US","synopsis":"Women entrepreneurs work with investors and mentors to turn their side businesses into full-time ventures.","platform":"Roku Channel","cats":["series","reality show"],"moods":["inspiring"],"vibes":["easy background watch"],"ratings":["teen PG-13","any"],"url":"https://www.roku.com/whats-on/tv-shows/side-hustlers?id=d33f6bfbfdf01893c830c3236d69f6f2","availabilityCountries":["United States","Canada","United Kingdom"],"source":"https://www.roku.com/whats-on/tv-shows/side-hustlers?id=d33f6bfbfdf01893c830c3236d69f6f2","checked":"2026-09-14"},
    {"title":"Martha Cooks","year":2022,"country":"United States","countryCode":"US","synopsis":"Martha Stewart shares favorite recipes, kitchen techniques and step-by-step cooking lessons from her farm kitchen.","platform":"Roku Channel","cats":["series","reality show"],"moods":["cozy comfort watch","inspiring"],"vibes":["easy background watch"],"ratings":["all ages family friendly","any"],"url":"https://www.roku.com/whats-on/tv-shows/martha-cooks?id=a0919a655327a83bae894a7fc00aa345","availabilityCountries":["United States","Canada","United Kingdom"],"source":"https://www.roku.com/whats-on/tv-shows/martha-cooks?id=a0919a655327a83bae894a7fc00aa345","checked":"2026-09-14"},
    {"title":"This Old House","year":1979,"country":"United States","countryCode":"US","synopsis":"Expert contractors restore aging houses and explain the craft, planning and technology behind home renovation.","platform":"Roku Channel","cats":["series","reality show"],"moods":["inspiring","cozy comfort watch"],"vibes":["easy background watch"],"ratings":["all ages family friendly","any"],"url":"https://www.roku.com/en-gb/whats-on/tv-shows/this-old-house?id=1651475c82c35b2caffb32e7d52887c8","availabilityCountries":["United States","Canada","United Kingdom"],"source":"https://www.roku.com/en-gb/whats-on/tv-shows/this-old-house?id=1651475c82c35b2caffb32e7d52887c8","checked":"2026-09-14"},
    {"title":"Ask This Old House","year":2002,"country":"United States","countryCode":"US","synopsis":"Home-improvement experts visit households to solve practical repair, gardening and renovation problems.","platform":"Roku Channel","cats":["series","reality show"],"moods":["inspiring","cozy comfort watch"],"vibes":["easy background watch"],"ratings":["all ages family friendly","any"],"url":"https://www.thisoldhouse.com/this-old-house/ways-to-watch-on-the-roku-channel","availabilityCountries":["United States","Canada","United Kingdom"],"source":"https://www.thisoldhouse.com/this-old-house/ways-to-watch-on-the-roku-channel","checked":"2026-09-14"},
];

// Titles genuinely rooted in gospel/faith content, for quick lookup by other
// features (e.g. surfacing them preferentially in the SEO footer copy).
const GOSPEL_TITLES = ["The Chosen","Voices of Fire","I Can Only Imagine","A Week Away","Faith in the Flames: The Nichole Jolly Story","The Case for Christ","Crosswalk Talk","Kirk Franklin: Gospel Essentials","Maverick City Music: Worship Sessions","The Gospel of Luke","Sound of Freedom","CeCe Winans: Believe for It"];

// Titles genuinely rooted in vertical micro-drama content with no public poster
// source (they don't exist on iTunes at all — see getRichMetadata), so the
// render pipeline knows to skip live lookups and go straight to a branded
// local cover rather than risk an unrelated real photo from a fuzzy search.
const VERTICAL_DRAMA_TITLES = ["Então É Amor?","Quando o Coração Entra em Campo","Divorced at the Wedding Day","The Double Life of a Billionaire's Daughter","Second Chance Mafia Wife","A Vida Secreta do Meu Marido Bilionário","CEO's Contract Bride","The Alpha's Rejected Mate","Married to the Billionaire's Twin","My Secret Baby, His Empire"];

// ----------------------------------------------------
// PLATFORM INTELLIGENCE CATALOG
// Single source of truth powering: cascading dropdowns (only show platforms
// that actually carry the chosen format), country-aware filtering for
// registered users, audio-vs-video routing, and footer backlinks.
//   cats     : formats this platform actually carries
//   countries: ISO-ish country names it serves; ['*'] = worldwide
//   audio    : true = music/spoken audio service (drives Listen Later wording)
// ----------------------------------------------------
const PLATFORMS = {
    "Netflix":        { group: "Global Giants", audio: false, countries: ['*'], cats: ["movie","series","limited series","documentary","stand-up comedy special","reality show","K-drama","anime","kids","short film","Bollywood","European cinema","telenovela","C-drama","J-drama","Turkish dizi","Gospel & Faith"], url: "https://www.netflix.com", search: t => `https://www.netflix.com/search?q=${encodeURIComponent(t)}` },
    "Prime Video":    { group: "Global Giants", audio: false, countries: ['*'], cats: ["movie","series","limited series","documentary","stand-up comedy special","reality show","anime","kids","Bollywood","European cinema","Nollywood","Gospel & Faith"], url: "https://www.primevideo.com", search: t => `https://www.primevideo.com/search?phrase=${encodeURIComponent(t)}` },
    "Disney+":        { group: "Global Giants", audio: false, countries: ['*'], cats: ["movie","series","limited series","documentary","kids","anime"], url: "https://www.disneyplus.com", search: t => `https://www.disneyplus.com/search?q=${encodeURIComponent(t)}` },
    "Max":            { group: "Global Giants", audio: false, countries: ['*'], cats: ["movie","series","limited series","documentary","stand-up comedy special","reality show","kids","anime"], url: "https://www.max.com", search: t => `https://www.max.com/search?q=${encodeURIComponent(t)}` },
    "Apple TV+":      { group: "Global Giants", audio: false, countries: ['*'], cats: ["movie","series","limited series","documentary","kids","short film"], url: "https://tv.apple.com", search: t => `https://tv.apple.com/search?term=${encodeURIComponent(t)}` },
    "Paramount+":     { group: "Global Giants", audio: false, countries: ['*'], cats: ["movie","series","limited series","documentary","reality show","kids","telenovela"], url: "https://www.paramountplus.com", search: t => `https://www.paramountplus.com/search/?q=${encodeURIComponent(t)}` },
    "Hulu":           { group: "Global Giants", audio: false, countries: ['United States'], cats: ["movie","series","limited series","documentary","reality show","anime","stand-up comedy special"], url: "https://www.hulu.com", search: t => `https://www.hulu.com/search?q=${encodeURIComponent(t)}` },
    "Peacock":        { group: "Global Giants", audio: false, countries: ['United States'], cats: ["movie","series","limited series","documentary","reality show","kids"], url: "https://www.peacocktv.com", search: t => `https://www.peacocktv.com/search?q=${encodeURIComponent(t)}` },

    "ReelShort":      { group: "Vertical Micro-Drama Apps", audio: false, countries: ['*'], cats: ["vertical micro-drama","short film"], url: "https://www.reelshort.com", search: t => `https://www.reelshort.com/search?keyword=${encodeURIComponent(t)}` },
    "DramaBox":       { group: "Vertical Micro-Drama Apps", audio: false, countries: ['*'], cats: ["vertical micro-drama","short film"], url: "https://www.dramaboxapp.com", search: t => `https://www.dramaboxapp.com/search?q=${encodeURIComponent(t)}` },
    "ShortMax":       { group: "Vertical Micro-Drama Apps", audio: false, countries: ['*'], cats: ["vertical micro-drama","short film"], url: "https://www.shortmax.com", searchable: false, search: t => `https://www.shortmax.com` },
    "GoodShort":      { group: "Vertical Micro-Drama Apps", audio: false, countries: ['*'], cats: ["vertical micro-drama","short film"], url: "https://www.goodshort.com", searchable: false, search: t => `https://www.goodshort.com` },
    "FlexTV":         { group: "Vertical Micro-Drama Apps", audio: false, countries: ['*'], cats: ["vertical micro-drama","short film"], url: "https://www.flextv.cc", searchable: false, search: t => `https://www.flextv.cc` },

    "Globoplay":      { group: "Brazil", audio: false, countries: ['Brazil','Brasil','Portugal'], cats: ["novela brasileira","telenovela","series","movie","documentary","reality show","kids","vertical micro-drama"], url: "https://globoplay.globo.com", search: t => `https://globoplay.globo.com/busca/?q=${encodeURIComponent(t)}` },
    "Viki":           { group: "Regional & Local", audio: false, countries: ['*'], cats: ["K-drama","C-drama","J-drama","series","movie","Turkish dizi"], url: "https://www.viki.com", search: t => `https://www.viki.com/search?q=${encodeURIComponent(t)}` },
    "Crunchyroll":    { group: "Regional & Local", audio: false, countries: ['*'], cats: ["anime","movie","series"], url: "https://www.crunchyroll.com", search: t => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}` },
    "Hotstar":        { group: "Regional & Local", audio: false, countries: ['India'], cats: ["Bollywood","movie","series","documentary","reality show","kids"], url: "https://www.hotstar.com", search: t => `https://www.hotstar.com/in/search?q=${encodeURIComponent(t)}` },
    "iQIYI":          { group: "Regional & Local", audio: false, countries: ['*'], cats: ["C-drama","K-drama","anime","movie","series"], url: "https://www.iq.com", search: t => `https://www.iq.com/search?query=${encodeURIComponent(t)}` },
    "WeTV":           { group: "Regional & Local", audio: false, countries: ['*'], cats: ["C-drama","K-drama","Thai drama","movie","series"], url: "https://wetv.vip", search: t => `https://wetv.vip/search?q=${encodeURIComponent(t)}` },
    "Viu":            { group: "Regional & Local", audio: false, countries: ['*'], cats: ["K-drama","C-drama","Turkish dizi","movie","series"], url: "https://www.viu.com", search: t => `https://www.viu.com/ott/search?q=${encodeURIComponent(t)}` },
    "MUBI":           { group: "Regional & Local", audio: false, countries: ['*'], cats: ["movie","European cinema","short film","documentary"], url: "https://mubi.com", search: t => `https://mubi.com/search/${encodeURIComponent(t)}` },

    "Pure Flix":      { group: "Faith & Gospel", audio: false, countries: ['*'], cats: ["Gospel & Faith"], url: "https://pureflix.com", search: t => `https://pureflix.com/search?q=${encodeURIComponent(t)}` },
    "Angel Studios":  { group: "Faith & Gospel", audio: false, countries: ['*'], cats: ["Gospel & Faith"], url: "https://www.angel.com", search: t => `https://www.angel.com/search?q=${encodeURIComponent(t)}` },

    "Spotify":        { group: "Audio", audio: true, countries: ['*'], cats: ["podcast","Spotify playlist","Spotify single","music album","audiobook","Gospel & Faith"], url: "https://open.spotify.com", search: t => `https://open.spotify.com/search/${encodeURIComponent(t)}` },
    "Apple Music":    { group: "Audio", audio: true, countries: ['*'], cats: ["Spotify single","music album","Spotify playlist","Gospel & Faith"], url: "https://music.apple.com", search: t => `https://music.apple.com/search?term=${encodeURIComponent(t)}` },
    "Apple Podcasts": { group: "Audio", audio: true, countries: ['*'], cats: ["podcast","audiobook"], url: "https://podcasts.apple.com", search: t => `https://podcasts.apple.com/search?term=${encodeURIComponent(t)}` },
    "YouTube Music":  { group: "Audio", audio: true, countries: ['*'], cats: ["Spotify playlist","Spotify single","music album"], url: "https://music.youtube.com", search: t => `https://music.youtube.com/search?q=${encodeURIComponent(t)}` },
    "Audible":        { group: "Audio", audio: true, countries: ['*'], cats: ["audiobook","podcast"], url: "https://www.audible.com", search: t => `https://www.audible.com/search?keywords=${encodeURIComponent(t)}` },

    "YouTube":        { group: "Free / Ad-Supported", audio: false, countries: ['*'], cats: ["movie","series","documentary","short film","stand-up comedy special","kids","YouTube Shorts","podcast"], url: "https://www.youtube.com", search: t => `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}` },
    "Tubi":           { group: "Free / Ad-Supported", audio: false, countries: ['United States','Canada','Mexico','Brazil','Brasil'], cats: ["movie","series","documentary","anime","kids","Nollywood"], url: "https://tubitv.com", search: t => `https://tubitv.com/search/${encodeURIComponent(t)}` },
    "Pluto TV":       { group: "Free / Ad-Supported", audio: false, countries: ['*'], cats: ["movie","series","documentary","reality show","kids","telenovela"], url: "https://pluto.tv", search: t => `https://pluto.tv/en/search/details?q=${encodeURIComponent(t)}` },
    "Roku Channel":   { group: "Free / Ad-Supported", audio: false, countries: ['United States','Canada','United Kingdom'], cats: ["movie","series","documentary","reality show","kids"], url: "https://therokuchannel.roku.com", search: t => `https://therokuchannel.roku.com/search/${encodeURIComponent(t)}` }
};

const AUDIO_CATEGORIES = ["podcast","Spotify playlist","Spotify single","music album","audiobook"];
function isAudioCategory(cat) { return AUDIO_CATEGORIES.includes(cat); }

// Country the user locked into their profile; drives availability filtering.
function getUserCountry() {
    const c = (localStorage.getItem('match_user_country') || '').trim();
    return c || null;
}

function platformServesCountry(pf, country) {
    if (!country) return true;
    if (pf.countries.includes('*')) return true;
    const norm = country.toLowerCase();
    return pf.countries.some(c => c.toLowerCase() === norm);
}

// Platforms valid for a given format, filtered by the user's country when known.
// Platforms the catalogue can actually deliver a title on. Built once and
// cached: PLATFORMS lists every service MatchApp knows how to link to, which
// is deliberately broader than what the curated catalogue currently stocks,
// so offering the full list as *filter* options meant ten platforms that
// always returned nothing.
let _stockedPlatforms = null;
function stockedPlatforms() {
    if (_stockedPlatforms) return _stockedPlatforms;
    _stockedPlatforms = new Set();
    if (typeof CONTENT_CATALOG !== 'undefined') {
        CONTENT_CATALOG.forEach(e => { if (e && e.platform) _stockedPlatforms.add(String(e.platform)); });
    }
    return _stockedPlatforms;
}

function platformsFor(cat, country) {
    const stocked = stockedPlatforms();
    return Object.entries(PLATFORMS).filter(([name, pf]) => {
        // A platform with no catalogue titles can never satisfy a filter, so
        // it must not appear as one. It stays in PLATFORMS for link-building
        // (a result can still send you to Apple TV+), and reappears here
        // automatically the moment a title on it is added.
        if (stocked.size && !stocked.has(name)) return false;
        if (!platformServesCountry(pf, country)) return false;
        if (!cat || cat === 'any') return true;
        return pf.cats.includes(cat);
    });
}

function platformSearchUrl(platformName, title) {
    const pf = PLATFORMS[platformName];
    if (pf && typeof pf.search === 'function') return pf.search(title);
    return `https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}`;
}

// ----------------------------------------------------
// CASCADING QUESTIONNAIRE
// Choosing a format narrows every downstream field to only complementary
// options: platforms that actually carry that format, in the user's country.
// "Surprise Me" reopens everything.
// ----------------------------------------------------

// i18n loads AFTER this file, so `t` does not exist while app.js is parsing
// or during DOMContentLoaded. A bare t() call therefore throws
// ReferenceError and aborts whatever init chain it is part of — which is
// exactly how one missing guard took the entire page down. This resolves at
// CALL time rather than load time, so it picks up the real translator as
// soon as i18n.js has run, and degrades to the key's last segment before
// then rather than throwing.
function tSafe(key, fallback) {
    if (typeof window !== 'undefined' && typeof window.t === 'function') {
        const v = window.t(key);
        if (v) return v;
    }
    if (fallback !== undefined) return fallback;
    // "opt.anyplatform" -> "anyplatform" reads better than a raw key or a crash.
    return String(key).split('.').pop();
}
window.tSafe = tSafe;

window.onCategoryChange = function() {
    const catEl = document.getElementById('q-category');
    const platEl = document.getElementById('q-platform');
    if (!catEl || !platEl) return;

    const cat = catEl.value;
    const country = getUserCountry();
    const previous = platEl.value;
    const matches = platformsFor(cat === 'any' ? null : cat, country);

    platEl.innerHTML = '';
    const anyOpt = document.createElement('option');
    anyOpt.value = 'any';
    anyOpt.textContent = tSafe(cat === 'any' ? 'opt.anyplatform' : 'opt.anyplatformhas', 'Any platform');
    platEl.appendChild(anyOpt);

    const groups = {};
    matches.forEach(([name, pf]) => {
        if (!groups[pf.group]) groups[pf.group] = [];
        groups[pf.group].push(name);
    });
    Object.keys(groups).forEach(groupName => {
        const og = document.createElement('optgroup');
        og.label = groupName;
        groups[groupName].forEach(name => {
            const o = document.createElement('option');
            o.value = name; o.textContent = name;
            og.appendChild(o);
        });
        platEl.appendChild(og);
    });

    // Keep the previous pick when it's still valid for the new format.
    if (previous && previous !== 'any' && matches.some(([n]) => n === previous)) platEl.value = previous;
    else platEl.value = 'any';

    applyAudioModeLabels(isAudioCategory(cat));

    const hint = document.getElementById('platform-country-hint');
    if (hint) {
        if (country) {
            hint.textContent = '🌍 ' + tSafe('pf.country') + ': ' + country;
            hint.style.display = 'block';
        } else { hint.style.display = 'none'; }
    }
};

// Swaps Watch Later / Seen It wording for audio picks.
function applyAudioModeLabels(isAudio) {
    const saveBtn = document.getElementById('btn-watch-later');
    const seenBtn = document.getElementById('btn-seen-it');
    if (saveBtn) saveBtn.innerHTML = window.t ? t(isAudio ? 'res.listenlater' : 'res.watchlater') : (isAudio ? '🎧 Listen Later' : '⭐ Watch Later');
    if (seenBtn) seenBtn.innerHTML = window.t ? t(isAudio ? 'res.heardit' : 'res.seenit') : (isAudio ? '🎼 Have Heard It' : "👁️ I've Seen It");
}

document.addEventListener('DOMContentLoaded', () => {
    const catEl = document.getElementById('q-category');
    // Prune before the platform list is rebuilt, so onCategoryChange never
    // repopulates an option we just established has no titles behind it.
    try { pruneUnstockedOptions(); } catch (e) { /* never block init on this */ }
    if (catEl) { catEl.addEventListener('change', window.onCategoryChange); window.onCategoryChange(); }
});

// ----------------------------------------------------
// LIVE DISCOVERY ENGINE
// Rather than a fixed hardcoded list, this queries the keyless iTunes catalog
// with terms built from the user's own selections. That catalog spans the
// entire commercial back catalogue (silent era through current releases), so
// results are real titles with real covers and real preview clips — and the
// pool is effectively unlimited instead of ~30 baked-in entries.
// ----------------------------------------------------
const CATEGORY_TERMS = {
    'movie': 'movie', 'series': 'tv series', 'limited series': 'miniseries',
    'documentary': 'documentary', 'stand-up comedy special': 'stand up comedy',
    'reality show': 'reality tv', 'vertical micro-drama': 'short drama',
    'short film': 'short film', 'K-drama': 'korean drama', 'anime': 'anime',
    'novela brasileira': 'novela', 'telenovela': 'telenovela', 'C-drama': 'chinese drama',
    'J-drama': 'japanese drama', 'Turkish dizi': 'turkish drama', 'Bollywood': 'bollywood',
    'Nollywood': 'nigerian film', 'European cinema': 'european film',
    'podcast': 'podcast', 'Spotify playlist': 'playlist', 'Spotify single': 'single',
    'audiobook': 'audiobook', 'music album': 'album'
};

const MOOD_TERMS = {
    'intense and thrilling': 'thriller', 'light and feel-good': 'feel good',
    'romantic': 'romance', 'heartbreaking': 'drama', 'funny': 'comedy',
    'scary': 'horror', 'mind-bending': 'sci-fi mystery', 'inspiring': 'inspirational',
    'cozy comfort watch': 'comfort', 'dark and gritty': 'crime drama',
    'epic and adventurous': 'adventure epic', 'nostalgic': 'classic',
    'gospel and faith': 'christian gospel faith'
};

// Decade → iTunes-friendly era phrasing, so users can reach back to the silent era.
const DECADE_TERMS = {
    '1920s': 'classic 1920s silent', '1930s': 'classic 1930s', '1940s': 'classic 1940s',
    '1950s': 'classic 1950s', '1960s': 'classic 1960s', '1970s': 'classic 1970s',
    '1980s': '1980s', '1990s': '1990s', '2000s': '2000s', '2010s': '2010s', '2020s': 'new release'
};

function mediaForCategory(cat) {
    const c = (cat || '').toLowerCase();
    // YouTube channels and Shorts: iTunes and TVMaze index NEITHER, so a
    // lookup can only ever return something unrelated that happens to share
    // a word — pure mismatch risk with no possible upside. 'none' short-
    // circuits to the generated branded poster, which is always correct.
    if (c.includes('youtube')) return 'none';
    if (c.includes('podcast')) return 'podcast';
    if (c.includes('playlist') || c.includes('single') || c.includes('album') || c.includes('music')) return 'music';
    if (c.includes('audiobook')) return 'audiobook';
    if (c.includes('short film')) return 'shortFilm';
    if (c === 'movie' || c.includes('bollywood') || c.includes('nollywood') || c.includes('cinema')) return 'movie';
    // 'all' was the second half of the Surprise Me leak, and the half the
    // catalogue gating never covered: with no category ticked this asked
    // iTunes for EVERY media type, so an unfiltered "what should I watch
    // tonight" could come back with a podcast, an audiobook or an album
    // straight off Apple's index — gated correctly in the catalogue and then
    // handed over anyway by live discovery. Surprise Me means screen content.
    if (c === 'any') return 'movie';
    return 'tvShow';
}

// ----------------------------------------------------
// USER CATEGORY BLOCKLIST
//
// The faith-content gating fixed the catalog, but gospel titles kept arriving
// anyway because discoverFromITunes() — tier 2, which runs whenever the
// catalog can't honour the requested platform — was never gated at all. It
// queries iTunes by mood terms, and "inspiring" pulls back faith cinema.
//
// Rather than keep patching one source at a time, rejection is now something
// the USER owns: when a title isn't for them they can say the whole category
// isn't for them, and that decision is enforced at every point a title is
// chosen — catalog, live discovery, and anything added later.
// ----------------------------------------------------
const BLOCKED_KEY = 'match_blockedCategories';

function getBlockedCategories() {
    try {
        const raw = JSON.parse(localStorage.getItem(BLOCKED_KEY) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
}

function setBlockedCategories(list) {
    const clean = [...new Set((list || []).filter(Boolean))];
    try { localStorage.setItem(BLOCKED_KEY, JSON.stringify(clean)); } catch (e) {}
    // Best-effort sync so the choice follows the user across devices.
    try {
        if (isUserLoggedIn && supabaseClient && currentUser) {
            supabaseClient.from('profiles')
                .update({ blocked_categories: clean })
                .eq('id', currentUser.id)
                .then(() => {}, () => {});
        }
    } catch (e) {}
    return clean;
}
window.getBlockedCategories = getBlockedCategories;

window.blockCategory = function(cat) {
    if (!cat) return;
    const list = getBlockedCategories();
    if (!list.includes(cat)) list.push(cat);
    setBlockedCategories(list);
};

window.unblockCategory = function(cat) {
    setBlockedCategories(getBlockedCategories().filter(c => c !== cat));
};

/** True when this catalog entry falls into anything the user has blocked. */
function isBlockedEntry(entry) {
    if (!entry) return false;
    const blocked = getBlockedCategories();
    if (!blocked.length) return false;
    const tags = []
        .concat(entry.moods || [])
        .concat(entry.cats || [])
        .concat(entry.vibes || []);
    return tags.some(t => blocked.includes(t));
}
window.isBlockedEntry = isBlockedEntry;

/** Same test for a free-text title/description from a live lookup. */
// Shared keyword signals for recognising gospel/faith content in free text
// (live iTunes results, which carry no category tags of our own). Used both
// as the default exclusion below and by isBlockedText() for anything else a
// user has blocked via the Not For Me chooser.
const GOSPEL_TEXT_SIGNALS = ['gospel','faith','christian','gospel music','bible','biblical',
    'igreja','evangel','católic','catholic','jesus','christ','worship','pastor','church'];

function isBlockedText(text) {
    const blocked = getBlockedCategories();
    if (!blocked.length || !text) return false;
    const hay = String(text).toLowerCase();
    // Only the blocked categories that have meaningful keyword signals; a
    // category like "any" would match everything and is never blockable.
    const SIGNALS = {
        'Gospel & Faith': GOSPEL_TEXT_SIGNALS,
        'scary': ['horror','terror','slasher'],
        'romantic': ['romance','romantic'],
        'funny': ['comedy','comédia'],
        'dark and gritty': ['gritty','noir'],
        'heartbreaking': ['tearjerker','melodrama']
    };
    for (const b of blocked) {
        const words = SIGNALS[b];
        if (!words) continue;
        if (words.some(w => hay.includes(w))) return true;
    }
    return false;
}
window.isBlockedText = isBlockedText;

async function discoverFromITunes(cat, mood, vibe, decade, rating) {
    // iTunes takes ONE search term, so a multi-ticked field has to be reduced
    // to a single value here. The first ticked value wins rather than some
    // blend: a query built from "funny cozy nostalgic epic" matches nothing
    // well, and the catalogue tier above has already had the full set.
    const one = (v, dflt) => {
        const a = normCriteria(v);
        return a.length ? a[0] : (dflt || 'any');
    };
    // Preserve the whole rating set — it is the one field where a stricter
    // pick must not be silently dropped.
    const ratingSet = normCriteria(rating);
    cat = one(cat); mood = one(mood); vibe = one(vibe); decade = one(decade);
    rating = ratingSet.length ? ratingSet[0] : 'any';

    // Vertical micro-dramas live entirely inside proprietary apps (ReelShort,
    // DramaBox, ShortMax, Globoplay's own line) and were never indexed by
    // iTunes — searching here doesn't come back empty, it comes back with
    // something confidently unrelated (this was the root of the "book
    // summaries app cover on a drama title" bug). Don't even try.
    if ((cat || '').toLowerCase() === 'vertical micro-drama') return null;

    const parts = [];
    if (decade && decade !== 'any' && DECADE_TERMS[decade]) parts.push(DECADE_TERMS[decade]);
    if (mood && mood !== 'any' && MOOD_TERMS[mood]) parts.push(MOOD_TERMS[mood]);
    if (cat && cat !== 'any' && CATEGORY_TERMS[cat]) parts.push(CATEGORY_TERMS[cat]);
    if (rating === 'kids' || rating === 'all ages family friendly') parts.push('family');
    if (parts.length === 0) parts.push('popular');

    const term = parts.join(' ');
    const media = mediaForCategory(cat);
    // 'none' means this category has no iTunes equivalent (YouTube channels
    // and Shorts). Searching anyway would return unrelated films or shows, so
    // return null and let the caller fall back to the curated catalog, which
    // does have real YouTube entries.
    if (media === 'none') return null;
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=${media}&limit=40`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.results || data.results.length === 0) return null;

        const excluded = new Set([...(window.matchPolicy?.known()||[]),...Array.from(SESSION_SHOWN).map(t=>window.matchPolicy?.key(t)||t)]);
        const seenRecently = new Set(recentTitles);

        // Only keep entries that actually have artwork, so covers never come back blank.
        let pool = data.results.filter(r => r.artworkUrl100 && (r.trackName || r.collectionName));
        pool = pool.filter(r => !excluded.has(window.matchPolicy?.key(r.trackName || r.collectionName)));
        const ITUNES_GENRE = {
            funny: /comedy|stand.?up/i,
            scary: /horror/i,
            romantic: /romance/i,
            'heartbreaking': /drama/i,
            'intense and thrilling': /thriller|action|adventure/i,
            'dark and gritty': /drama|crime|thriller/i,
            'light and feel-good': /comedy|family|kids|animation/i,
            'cozy comfort watch': /family|comedy/i,
            'mind-bending': /sci-?fi|mystery|fantasy/i,
            inspiring: /documentary|biography|history|sport/i,
            'epic and adventurous': /adventure|action|fantasy/i,
            nostalgic: /classic|drama|comedy/i
        };
        const genreRx = ITUNES_GENRE[mood];
        if (genreRx) {
            const genreHit = pool.filter(r => genreRx.test(String(r.primaryGenreName || '')));
            if (!genreHit.length) return null;
            pool = genreHit;
        }
        if (mood === 'funny') {
            pool = pool.filter(r => {
                const g = String(r.primaryGenreName || '');
                if (/drama/i.test(g) && !/comedy/i.test(g)) return false;
                return /comedy|stand.?up/i.test(g);
            });
            if (!pool.length) return null;
        }

        // Default gospel exclusion — independent of whether the user has ever
        // blocked anything. isBlockedText() below only fires once a category
        // has been explicitly blocked, which left a gap: a first-time user
        // asking for an "inspiring" movie could still get a real Christian
        // film straight from iTunes' own index, before ever touching the
        // blocklist. Same default-off-unless-requested rule as the catalog:
        // held back unless the category itself was explicitly Gospel & Faith.
        if (cat !== 'Gospel & Faith') {
            pool = pool.filter(r => !GOSPEL_TEXT_SIGNALS.some(w =>
                [r.trackName, r.collectionName, r.primaryGenreName, r.longDescription, r.shortDescription]
                    .filter(Boolean).join(' ').toLowerCase().includes(w)));
        }

        // Enforce the user's blocked categories here too. This path is where
        // gospel titles were still getting through after the catalog was gated:
        // it queries iTunes by mood term, and "inspiring" returns faith cinema.
        pool = pool.filter(r => !isBlockedText(
            [r.trackName, r.collectionName, r.primaryGenreName, r.longDescription, r.shortDescription]
                .filter(Boolean).join(' ')));
        if (decade && decade !== 'any' && DECADE_TERMS[decade]) {
            const start=Number(String(decade).match(/\d{4}/)?.[0]);
            if(start){pool=pool.filter(r=>{const y=Number(String(r.releaseDate||'').slice(0,4));return y>=start&&y<start+10;});if(!pool.length)return null;}
        }
        // iTunes has no authoritative source-country field. If the user has
        // origin-country exclusions, do not risk returning a title we cannot
        // prove is allowed.
        const blockedCountries=Array.isArray(window.MatchSettings?.get?.('blockedOriginCountries'))?window.MatchSettings.get('blockedOriginCountries'):[];
        if(blockedCountries.length)return null;
        // Vibe and age-rating are MatchApp-specific semantics here; without a
        // verified source signal, fail closed rather than pretending the title
        // satisfied them.
        if(normCriteria(vibe).length||ratingSet.length)return null;
        const fresh = pool.filter(r => !seenRecently.has(r.trackName || r.collectionName));
        if (fresh.length) pool = fresh;
        if (!pool.length) return null;

        const r = pool[Math.floor(Math.random() * pool.length)];
        const name = r.trackName || r.collectionName;
        const year = r.releaseDate ? String(r.releaseDate).substring(0, 4) : '';

        // iTunes' Search API has no concept of third-party platform availability
        // (Netflix, Globoplay, etc. aren't part of Apple's own catalog data), so
        // there is no honest way to name a specific service here. Randomly
        // assigning one and calling it verified was the exact bug reported —
        // a title gets a "Find Where To Stream" treatment instead, which is
        // truthful about what this tier actually knows.
        return {
            title: name,
            synopsis: r.longDescription || r.shortDescription ||
                `${year ? year + ' — ' : ''}${r.primaryGenreName || 'A great pick'}${r.artistName ? ', from ' + r.artistName : ''}.`,
            platform: 'any',
            platformVerified: false,
            source: 'itunes-live',
            _meta: {
                artwork: upgradeArtwork(r.artworkUrl100),
                preview: r.previewUrl || null,
                storeUrl: r.trackViewUrl || r.collectionViewUrl || null,
                year: year
            }
        };
    } catch (e) { return null; }
}

// Verified live expansion for exact normal Matches. This is used only after
// the curated exact shelf and exact-history recycle are empty. Every candidate
// is a real TMDB identity and is checked again against ALL selected criteria.
const TMDB_GENRE_ID_BY_NAME={Action:28,Adventure:12,Animation:16,Comedy:35,Crime:80,Documentary:99,Drama:18,Family:10751,Fantasy:14,History:36,Horror:27,Music:10402,Mystery:9648,Romance:10749,'Science Fiction':878,Thriller:53,War:10752,Western:37};
const MOOD_SOURCE_GENRES={
    'funny':['Comedy'],
    'scary':['Horror'],
    'romantic':['Romance'],
    'intense and thrilling':['Thriller','Action','Crime'],
    'dark and gritty':['Crime','Thriller'],
    'light and feel-good':['Comedy','Family','Animation'],
    // Comfort must not collapse into "anything romantic". Pure Romance/Drama
    // was admitting emotionally heavy films (including illness/grief stories)
    // as "cozy" just because TMDB tagged them Romance. Rom-coms still qualify
    // through Comedy; family comfort qualifies through Family.
    'cozy comfort watch':['Comedy','Family'],
    'mind-bending':['Mystery','Science Fiction','Fantasy'],
    'inspiring':['Documentary','Drama','Family'],
    'epic and adventurous':['Adventure','Action','Fantasy'],
    'heartbreaking':['Drama','Romance']
};
const COUNTRY_CATEGORY_CODES={
    'K-drama':['KR'],'C-drama':['CN'],'J-drama':['JP'],'Turkish dizi':['TR'],
    'Bollywood':['IN'],'Nollywood':['NG'],'novela brasileira':['BR'],
    'telenovela':['MX','CO','AR','CL','BR'],'European cinema':['GB','FR','DE','ES','IT','PT','IE','BE','NL','SE','NO','DK','FI','PL','GR','CH']
};

// Live TMDB discovery can verify genres, but a genre alone is not always enough
// to prove a MatchApp mood. Keep this gate source-backed and conservative.
// In particular, "cozy comfort watch" must not accept a heavy Drama/Romance
// merely because Romance appears in its genre list.
const COZY_BLOCKED_GENRES=new Set(['Horror','Thriller','War']);
const COZY_HEAVY_TEXT=/\b(?:murder(?:ed|er)?|serial killer|kidnap(?:ped|ping)?|hostage|tortur(?:e|ed)|terminal(?:ly)?|cancer|dying|death|funeral|grief|organ donor|organ transplant|sick child|critically ill|life[- ]threatening|war zone|revenge killing)\b/i;
function moodFitsVerified(wanted,genres,overview){
    if(!wanted.length)return true;
    const gs=Array.isArray(genres)?genres:[];
    const text=String(overview||'');
    return wanted.some(m=>{
      const mapped=MOOD_SOURCE_GENRES[m]||[];
      if(!mapped.length||!mapped.some(g=>gs.includes(g)))return false;
      if(m==='cozy comfort watch'){
        if(gs.some(g=>COZY_BLOCKED_GENRES.has(g)))return false;
        if(COZY_HEAVY_TEXT.test(text))return false;
      }
      return true;
    });
}
function canonicalProviderName(value){
    const s=String(value||'').toLowerCase();
    if(s.includes('netflix'))return'netflix';
    if(s.includes('amazon prime')||s.includes('prime video')||s.includes('amazon video'))return'primevideo';
    if(s.includes('disney'))return'disney';
    if(s.includes('hbo max')||s==='max')return'max';
    if(s.includes('apple tv'))return'appletv';
    if(s.includes('paramount'))return'paramount';
    if(s.includes('hulu'))return'hulu';
    if(s.includes('peacock'))return'peacock';
    if(s.includes('globoplay'))return'globoplay';
    if(s.includes('crunchyroll'))return'crunchyroll';
    if(s.includes('viki'))return'viki';
    if(s.includes('mubi'))return'mubi';
    if(s.includes('tubi'))return'tubi';
    if(s.includes('pluto'))return'pluto';
    if(s.includes('roku'))return'roku';
    if(s.includes('youtube'))return'youtube';
    return s.replace(/[^a-z0-9]/g,'');
}
function sourceRatingFits(cert,wanted){
    const c=String(cert||'').toUpperCase().replace(/\s+/g,'');
    if(!wanted.length)return true;
    if(!c)return false;
    const groups={
      'all ages family friendly':['G','PG','TV-G','TV-Y','TV-Y7','U','L','0','6','10'],
      'kids':['G','TV-G','TV-Y','TV-Y7','U','L','0','6'],
      'tween PG':['PG','TV-PG','10','12','U'],
      'teen PG-13':['PG-13','TV-14','12','14'],
      'mature adults only R rated':['R','NC-17','TV-MA','16','18']
    };
    return wanted.some(w=>(groups[w]||[]).some(x=>c===x||c.startsWith(x+'/')));
}
function categoryFitsVerified(kind,genres,countries,wanted){
    if(!wanted.length)return true;
    const gs=new Set(genres),cs=new Set(countries);
    return wanted.some(cat=>{
      if(cat==='movie')return kind==='movie';
      if(cat==='series')return kind==='tv';
      if(cat==='documentary')return gs.has('Documentary');
      if(cat==='stand-up comedy special')return kind==='movie'&&gs.has('Comedy');
      if(cat==='reality show')return kind==='tv'&&gs.has('Reality');
      if(cat==='short film')return kind==='movie';
      if(cat==='anime')return gs.has('Animation')&&cs.has('JP');
      const required=COUNTRY_CATEGORY_CODES[cat];if(required)return required.some(x=>cs.has(x));
      return false;
    });
}
async function discoverVerifiedExactTMDB(requested){
    if(typeof window.tmdbDiscover!=='function'||typeof window.tmdbDetails!=='function')return null;
    const cat=normCriteria(requested.cat),mood=normCriteria(requested.mood),vibe=normCriteria(requested.vibe),
          rating=normCriteria(requested.rating),decade=normCriteria(requested.decade),platform=normCriteria(requested.plat),
          realGenres=normCriteria(requested.genre);
    // These categories/vibes do not have source fields strong enough for a
    // perfect automated verification; fail closed rather than fake precision.
    if(vibe.length)return null;
    const unsupported=cat.some(x=>['limited series','vertical micro-drama','YouTube channel','YouTube Shorts','podcast','Spotify playlist','Spotify single','music album','audiobook','Gospel & Faith','Classical Music','News','Sports'].includes(x));
    if(unsupported)return null;
    const mappableMood=mood.flatMap(m=>MOOD_SOURCE_GENRES[m]||[]);
    if(mood.length&&!mappableMood.length)return null;
    const sourceGenres=[...new Set([...mappableMood,...realGenres.filter(g=>TMDB_GENRE_ID_BY_NAME[g]),...(cat.includes('anime')?['Animation']:[])])];
    const genreIds=sourceGenres.map(g=>TMDB_GENRE_ID_BY_NAME[g]).filter(Boolean);
    let kind='';
    if(cat.length&&cat.every(x=>['movie','stand-up comedy special','short film','Bollywood','Nollywood','European cinema'].includes(x)))kind='movie';
    else if(cat.length&&cat.every(x=>['series','reality show','K-drama','C-drama','J-drama','Turkish dizi','novela brasileira','telenovela'].includes(x)))kind='tv';
    const start=decade.length===1?Number(String(decade[0]).match(/\d{4}/)?.[0]):0;
    const region=window.MatchAppCatalogMedia?.regionCode?.()||'BR';
    const provider=platform.length===1?platform[0]:'';
    const candidates=await window.tmdbDiscover({kind,genre_ids:genreIds,original_language:cat.includes('anime')?'ja':'',decade_start:start||0,pages:provider?3:2,provider,region},{priority:true});
    const prefs=currentPreferenceExclusions(),known=window.matchPolicy?.known?.()||new Set();

    // TMDB Discover is popularity-sorted. Starting at row 0 on every device
    // made the same first qualifying title become the de-facto "only" answer
    // for a filter combination (the reported Comfort + Movie + Netflix case).
    // Rotate within the highest-quality slice before verification. History
    // exclusions still win, and every candidate is fully verified below.
    const candidateWindow=candidates.slice(0,provider?60:40);
    const head=Math.min(candidateWindow.length,12);
    const rotationStart=head>1?Math.floor(Math.random()*head):0;
    const orderedCandidates=rotationStart
      ? candidateWindow.slice(rotationStart).concat(candidateWindow.slice(0,rotationStart))
      : candidateWindow;
    for(const base of orderedCandidates){
      const key=window.matchPolicy?.key?.(base.title)||'';
      if(!key||known.has(key)||SESSION_SHOWN.has(base.title))continue;
      const d=await window.tmdbDetails(base.tmdbId,base.kind,{priority:true});
      // A provider-filtered TMDB Discover result is already source proof that
      // this exact identity is on the selected service in this region. Detail
      // mode enriches it, but a transient detail failure must not turn a valid
      // desktop/iOS/WebView match into a false "no verified title" error.
      const discoverGenres=(Array.isArray(base.genreIds)?base.genreIds:[]).map(id=>Object.keys(TMDB_GENRE_ID_BY_NAME).find(name=>TMDB_GENRE_ID_BY_NAME[name]===Number(id))).filter(Boolean);
      const genres=Array.isArray(d?.genres)&&d.genres.length?d.genres:discoverGenres;
      const countries=Array.isArray(d?.originCountries)?d.originCountries:[];
      if(!d && (!provider || !genres.length))continue;
      if(countries.some(x=>prefs.countries.has(String(x).toUpperCase())))continue;
      if(genres.some(g=>prefs.genres.has(String(g).toLowerCase())))continue;
      if(realGenres.length&&!genres.some(g=>realGenres.includes(g)))continue;
      if(!moodFitsVerified(mood,genres,d?.overview||base.overview||''))continue;
      if(!categoryFitsVerified(base.kind,genres,countries,cat))continue;
      if(decade.length&&!decade.some(dec=>{const s=Number(String(dec).match(/\d{4}/)?.[0]);const y=Number(d?.year||base.year);return s&&y>=s&&y<s+10;}))continue;
      if(d && !sourceRatingFits(d.contentRating,rating))continue;
      if(!d && rating.length)continue;
      let verifiedPlatform='any';
      if(platform.length){
        if(provider){
          verifiedPlatform=platform[0];
        }else{
          const row=d?.availability?.[region]||{};
          const providers=[...(row.stream||[]),...(row.rent||[]),...(row.buy||[])];
          const wanted=new Set(platform.map(canonicalProviderName));
          const hit=providers.find(p=>wanted.has(canonicalProviderName(p)));
          if(!hit)continue;verifiedPlatform=hit;
        }
      }
      return {
        title:String(d?.title||base.title),year:Number(d?.year||base.year)||null,
        countryCode:countries[0]||'',country:countries[0]||'',
        synopsis:String(d?.overview||base.overview||'').trim(),
        platform:verifiedPlatform,platformVerified:platform.length>0,
        cats:cat.length?cat:[base.kind==='movie'?'movie':'series'],
        moods:mood,vibes:vibe,ratings:rating,source:'tmdb-exact-live',
        _tmdbId:base.tmdbId,_tmdbKind:base.kind,
        // Discovery already returned artwork for this exact numeric TMDB
        // identity. Carry it into renderResult so the result never throws
        // that verified poster away and replaces it with a branded placeholder.
        _meta:{
          artwork:(d?.posterLarge||d?.posterOriginal||d?.poster||base.posterLarge||base.posterOriginal||base.poster||null),
          tmdbId:base.tmdbId,kind:base.kind
        }
      };
    }
    return null;
}

// ----------------------------------------------------
// AI-PROPOSED, SOURCE-VERIFIED FRESH TITLE
//
// Runs only after the curated shelf, TMDB discovery and iTunes found nothing
// new. Gemini proposes real titles for the exact choices; each proposal must
// then be found on TMDB and pass every hard choice there — format, genre,
// mood genres, platform in the viewer's region, rating, decade, origin and
// the viewer's exclusions — before it can be shown. The AI never supplies a
// fact the source did not confirm: only vibe (and moods TMDB has no genre
// for) rely on its judgement. No Match is spent unless a title is found.
// ----------------------------------------------------
async function aiProposedVerifiedExact(requested){
    if(typeof fetchGeminiData!=='function'||typeof window.tmdbLookup!=='function'||typeof window.tmdbDetails!=='function')return null;
    const cat=normCriteria(requested.cat),mood=normCriteria(requested.mood),vibe=normCriteria(requested.vibe),
          rating=normCriteria(requested.rating),decade=normCriteria(requested.decade),platform=normCriteria(requested.plat),
          realGenres=normCriteria(requested.genre);
    // Same boundary as discoverVerifiedExactTMDB: TMDB can only verify film and TV.
    if(cat.some(x=>['limited series','vertical micro-drama','YouTube channel','YouTube Shorts','podcast','Spotify playlist','Spotify single','music album','audiobook','Gospel & Faith','Classical Music','News','Sports'].includes(x)))return null;
    const region=window.MatchAppCatalogMedia?.regionCode?.()||'BR';
    const prefs=currentPreferenceExclusions(),known=window.matchPolicy?.known?.()||new Set();
    const wants=[];
    if(cat.length)wants.push('format: '+cat.join(' or '));
    if(realGenres.length)wants.push('genre: '+realGenres.join(' or '));
    if(mood.length)wants.push('mood: '+mood.join(' or '));
    if(vibe.length)wants.push('vibe: '+vibe.join(' or '));
    if(rating.length)wants.push('age rating: '+rating.join(' or '));
    if(decade.length)wants.push('released in the '+decade.join(' or '));
    if(platform.length)wants.push('streaming in country '+region+' on '+platform.join(' or '));
    const avoid=[...SESSION_SHOWN].slice(-20);
    const prompt='List 16 real, already released movies or TV series that match ALL of these choices: '+(wants.join('; ')||'well reviewed and popular right now')+'. '+
        (avoid.length?'Do not include any of these titles: '+avoid.join('; ')+'. ':'')+
        'Use each title\'s original English release title and its first release year. '+
        'Output valid JSON ONLY: {"results":[{"title":"Exact Title","year":2020,"kind":"movie or tv"}]}';
    let proposals=[];
    try{const parsed=await fetchGeminiData(prompt);proposals=Array.isArray(parsed?.results)?parsed.results.slice(0,16):[];}catch(_){return null;}
    for(const p of proposals){
        const title=typeof p?.title==='string'?p.title.trim():'';if(!title)continue;
        const key=window.matchPolicy?.key?.(title)||'';
        if(!key||known.has(key)||SESSION_SHOWN.has(title))continue;
        const kindHint=p.kind==='tv'||p.kind==='movie'?p.kind:'';
        const base=await window.tmdbLookup(title,{year:Number(p.year)||'',kind:kindHint,cats:cat.length?cat:[kindHint==='tv'?'series':'movie'],lang:'en-US',priority:true});
        if(!base||!Number.isSafeInteger(base.tmdbId)||!['movie','tv'].includes(base.kind))continue;
        const d=await window.tmdbDetails(base.tmdbId,base.kind,{priority:true});if(!d)continue;
        const finalKey=window.matchPolicy?.key?.(d.title||base.title)||key;
        if(known.has(finalKey)||SESSION_SHOWN.has(String(d.title||base.title)))continue;
        const genres=Array.isArray(d.genres)?d.genres:[],countries=Array.isArray(d.originCountries)?d.originCountries:[];
        if(countries.some(x=>prefs.countries.has(String(x).toUpperCase())))continue;
        if(genres.some(g=>prefs.genres.has(String(g).toLowerCase())))continue;
        if(realGenres.length&&!genres.some(g=>realGenres.includes(g)))continue;
        const mappable=mood.filter(m=>(MOOD_SOURCE_GENRES[m]||[]).length);
        if(mappable.length&&!moodFitsVerified(mappable,genres,d.overview||base.overview||''))continue;
        if(!categoryFitsVerified(base.kind,genres,countries,cat))continue;
        if(decade.length&&!decade.some(dec=>{const s=Number(String(dec).match(/\d{4}/)?.[0]);const y=Number(d.year||base.year);return s&&y>=s&&y<s+10;}))continue;
        if(!sourceRatingFits(d.contentRating,rating))continue;
        let verifiedPlatform='any';
        if(platform.length){
            const row=d.availability?.[region]||{};
            const providers=[...(row.stream||[]),...(row.rent||[]),...(row.buy||[])];
            const wanted=new Set(platform.map(canonicalProviderName));
            const hit=providers.find(x=>wanted.has(canonicalProviderName(x)));
            if(!hit)continue;verifiedPlatform=hit;
        }
        return {
            title:String(d.title||base.title),year:Number(d.year||base.year)||null,
            countryCode:countries[0]||'',country:countries[0]||'',
            synopsis:String(d.overview||base.overview||'').trim(),
            platform:verifiedPlatform,platformVerified:platform.length>0,
            cats:cat.length?cat:[base.kind==='movie'?'movie':'series'],
            moods:mood,vibes:vibe,ratings:rating,source:'tmdb-exact-live',
            _tmdbId:base.tmdbId,_tmdbKind:base.kind,
            // This title has already been verified against this exact TMDB
            // numeric identity. Preserve its real artwork instead of throwing
            // that proof away and forcing renderResult to identify the work
            // all over again from title text.
            _meta:{
                artwork:(d.posterLarge||d.posterOriginal||d.poster||base.posterLarge||base.posterOriginal||base.poster||null),
                tmdbId:base.tmdbId,kind:base.kind
            }
        };
    }
    return null;
}

// SESSION-LEVEL REPEAT PREVENTION.
//
// recentTitles (capped at 6, persisted to localStorage) existed to prevent
// short-term repeats, but it had a critical flaw: when the filtered pool
// had only one matching title, freshPool would be empty, the code fell back
// to the full pool, and it could return the same title on every consecutive
// match — confirmed with a live simulation showing the exact user report of
// a title appearing 4 times in a row.
//
// This Set grows with every match shown in the current page session and is
// checked BEFORE the fallback. A title once shown this session is removed
// from every pool before selection. It only resets on page reload, which is
// the right granularity: within a single session a title must never repeat.
// Across sessions the persistent seenList and recentTitles still apply.
// SESSION_SHOWN was in-memory only, so it emptied on every page load — and
// since a match navigates and people reload constantly, "this session" in
// practice meant "until you blink". Backed by sessionStorage it now survives
// reloads and in-tab navigation while still clearing when the tab closes,
// which is the behaviour the name always implied.
const SESSION_SHOWN = new Set((() => {
    try { return JSON.parse(sessionStorage.getItem('match_sessionShown') || '[]'); }
    catch (e) { return []; }
})());

function persistSessionShown() {
    try {
        // Capped: an unbounded list would eventually exclude the whole
        // catalogue and leave the user with nothing to match.
        sessionStorage.setItem('match_sessionShown',
            JSON.stringify([...SESSION_SHOWN].slice(-120)));
    } catch (e) { /* private mode or quota — in-memory still works */ }
}

function rememberShownTitle(title) {
    if (!title) return;
    SESSION_SHOWN.add(title);
    persistSessionShown();
    recentTitles.unshift(title);
    // 6 was too short to be felt as variety. 30 still leaves the catalogue
    // plenty of room while making a repeat genuinely uncommon.
    recentTitles = [...new Set(recentTitles)].slice(0, 30);
    localStorage.setItem('match_recentTitles', JSON.stringify(recentTitles));

    // Also use the shared history policy. Local recentTitles protects this
    // browser; matchPolicy.remember persists signed-in history so the same
    // live-discovered title is excluded on desktop, phone, tablet and Android
    // WebView instead of becoming "fresh" again on every device.
    try { window.matchPolicy?.remember?.({title}, 'shown'); } catch (_) {}
}

// ----------------------------------------------------
// OPT-IN ONLY CATEGORIES
//
// "Surprise me" (category = any) should answer "what do I watch tonight?".
// It previously drew from the ENTIRE catalogue, so a meditation channel, a
// fitness workout, a sleep podcast or a documentary could come back to
// someone who just wanted a film — and with 61 YouTube channels now in the
// catalogue, that was increasingly likely rather than a rare edge case.
//
// Everything listed here is still fully matchable — it just has to be ASKED
// for by selecting that category, rather than arriving unrequested. Gospel &
// Faith already worked this way for the same reason; this generalises the
// rule instead of special-casing one category.
// ----------------------------------------------------
// This was a DENY list — every category that shouldn't show up unrequested had
// to be remembered and added to it. That is backwards, and it failed exactly
// the way deny lists always fail: News, Sports and Classical Music would each
// have leaked into Surprise Me the day they were added, because nobody would
// have thought to also edit a list living 600 lines away.
//
// Inverted to an ALLOW list. Surprise Me means "I want something to watch
// tonight and I'm not going to tell you what" — so it draws from the narrow
// set of things that answer that question and nothing else. Every category
// added to the catalogue from now on is opt-in by default and has to be named
// here on purpose to join the surprise pool. The safe direction is the default.
const SURPRISE_ME_CATEGORIES = new Set([
    'movie',
    'series',
    'limited series',
    'K-drama',
    'novela brasileira',
    'telenovela'
]);

// True when the entry can appear in an unfiltered "surprise me" draw. It needs
// only ONE surprise-eligible category: a film also tagged Classical Music is
// still a film, and holding it back would quietly shrink the pool of real
// movies over time as cross-tagging grows.
function isSurpriseEligible(entry) {
    if (!entry || !Array.isArray(entry.cats)) return false;
    return entry.cats.some(c => SURPRISE_ME_CATEGORIES.has(c));
}

// ----------------------------------------------------
// MULTI-SELECT CRITERIA
//
// Every criterion is now a SET of acceptable answers rather than one answer.
// "Netflix or Max", "funny or cozy", "movies or K-dramas" are all normal ways
// to feel about an evening, and forcing one choice per field was making the
// matcher ask a question nobody actually has a single answer to.
//
// normCriteria() is the single adapter for that change: it accepts the old
// single string, the sentinel 'any', an array, or null, and always returns an
// array. An EMPTY array means "no constraint" — the multi-select equivalent of
// the old 'any'. Every call site keeps working unchanged, which is why this
// could be done without touching the twenty-odd places that read a form value.
// ----------------------------------------------------
function normCriteria(v) {
    if (v == null) return [];
    const arr = Array.isArray(v) ? v : [v];
    const out = arr
        .map(x => (x == null ? '' : String(x).trim()))
        .filter(x => x && x !== 'any');
    return [...new Set(out)];
}

// Does this entry satisfy a criterion? An empty wanted-set always passes —
// that is what "no constraint" means. Otherwise ANY overlap is enough: the
// user said these are all acceptable, so one match is a match.
function matchesAny(entryValues, wanted) {
    if (!wanted.length) return true;
    if (!Array.isArray(entryValues)) return wanted.includes(entryValues);
    return entryValues.some(v => wanted.includes(v));
}

function currentPreferenceExclusions(){
    const S=window.MatchSettings;
    const countries=Array.isArray(S?.get?.('blockedOriginCountries'))?S.get('blockedOriginCountries'):[];
    const genres=Array.isArray(S?.get?.('blockedGenres'))?S.get('blockedGenres'):[];
    return {countries:new Set(countries.map(x=>String(x).toUpperCase())),genres:new Set(genres.map(x=>String(x).toLowerCase()))};
}
function entryPassesPreferenceExclusions(entry){
    const x=currentPreferenceExclusions();
    const code=String(entry?.countryCode||'').toUpperCase();
    if(code&&x.countries.has(code))return false;
    const keys=window.__matchappExcludedGenreKeys;
    if(keys instanceof Set){
        const normalise=window.MatchAppCatalogMedia?.normalise||(v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,''));
        if(keys.has(normalise(entry?.title)))return false;
    }
    return true;
}

function titlePassesRealGenre(entry) {
    if (!window.__matchappGenreFilterActive) return true;
    const keys = window.__matchappGenreKeys;
    if (!(keys instanceof Set)) return false;
    const normalise = window.MatchAppCatalogMedia?.normalise ||
        (v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,''));
    return keys.has(normalise(entry?.title));
}

function pickFromCatalog(cat, plat, mood, vibe, rating, decade) {
    try { if (typeof window !== 'undefined') window.lastMatchTasteBiased = false; } catch (_) {}
    const criteria = {cat, plat, mood, vibe, rating, decade: decade || window.getMatchCriteria?.().decade || []};
    const policy = window.matchPolicy;
    if (!policy) return null; // Fail closed if the shared policy did not load.
    const wantsFaith = normCriteria(cat).includes('Gospel & Faith') || normCriteria(plat).some(p => ['Pure Flix','Angel Studios'].includes(p));
    const eligible = e => policy.matches(e, criteria)
        && (typeof titlePassesRealGenre!=='function'||titlePassesRealGenre(e))
        && (typeof entryPassesPreferenceExclusions!=='function'||entryPassesPreferenceExclusions(e))
        && !isBlockedEntry(e) && !SESSION_SHOWN.has(e.title)
        && (wantsFaith || !e.cats.includes('Gospel & Faith'))
        && (normCriteria(cat).length || isSurpriseEligible(e));

    // recentTitles has been persisted to localStorage all along and never
    // consulted here, which is why the same title could come back straight
    // after a reload. It is a PREFERENCE rather than a hard exclusion: if
    // honouring it empties the pool, a repeat is better than telling someone
    // nothing matches.
    //
    // Read defensively: the matching tests evaluate this function in isolation
    // without app.js's module scope, so a bare reference to recentTitles
    // throws ReferenceError there. Falling back to localStorage keeps the
    // function self-sufficient and testable.
    let recentSource = [];
    try {
        recentSource = (typeof recentTitles !== 'undefined' && Array.isArray(recentTitles))
            ? recentTitles
            : JSON.parse(localStorage.getItem('match_recentTitles') || '[]');
    } catch (e) { recentSource = []; }
    const recent = new Set(recentSource);
    const fresh = CONTENT_CATALOG.filter(e => eligible(e) && !recent.has(e.title));
    let pool = fresh.length ? fresh : CONTENT_CATALOG.filter(eligible);
    if (!pool.length) return null;
    // Surprise Me with no taste-shaping choice (category, mood, vibe, genre):
    // let Taste DNA (taste.js) break the tie among titles that already pass
    // every hard filter. It only ever narrows this eligible pool, never widens it.
    try {
        const openTaste = !normCriteria(cat).length && !normCriteria(mood).length && !normCriteria(vibe).length
            && !(typeof window !== 'undefined' && window.__matchappGenreFilterActive);
        if (openTaste && typeof window !== 'undefined' && typeof window.tasteBiasPool === 'function') {
            const biased = window.tasteBiasPool(pool, 'any', 'any');
            if (Array.isArray(biased) && biased.length && biased.length < pool.length) {
                pool = biased;
                window.lastMatchTasteBiased = true;
            }
        }
    } catch (_) {}
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return {...pick,title:pick.title,synopsis:pick.synopsis,platform:pick.platform,platformVerified:true,watchUrl:pick.watchUrl||(pick.platform==='Roku Channel'?pick.url:null)||null,source:'catalog'};
}

// Exhaustion recovery: if every exact match has already appeared, recycle the
// least-recently shown exact match instead of dead-ending. Criteria, age/rating,
// blocked categories and faith opt-in remain mandatory. This is deliberately a
// second-tier picker: normal unseen matching and live discovery always win.
function pickRecycledCatalog(cat, plat, mood, vibe, rating, decade) {
    const criteria = {cat, plat, mood, vibe, rating, decade: decade || window.getMatchCriteria?.().decade || []};
    const policy = window.matchPolicy;
    if (!policy || typeof policy.matchesCriteria !== 'function') return null;
    const wantsFaith = normCriteria(cat).includes('Gospel & Faith') || normCriteria(plat).some(p => ['Pure Flix','Angel Studios'].includes(p));
    const eligible = e => policy.matchesCriteria(e, criteria)
        && (typeof titlePassesRealGenre!=='function'||titlePassesRealGenre(e))
        && (typeof entryPassesPreferenceExclusions!=='function'||entryPassesPreferenceExclusions(e))
        && !isBlockedEntry(e)
        && (wantsFaith || !e.cats.includes('Gospel & Faith'))
        && (normCriteria(cat).length || isSurpriseEligible(e));

    // Watch Later and Not For Me are deliberate user choices, not ordinary
    // match history. They stay hard exclusions even when we recycle older
    // shown/seen titles after exhausting unseen exact matches.
    const hardExcluded = new Set();
    const addHard = item => {
        const k = policy.key(item && item.title ? item.title : item);
        if (k) hardExcluded.add(k);
    };
    try {
        if (typeof savedList !== 'undefined' && Array.isArray(savedList)) savedList.forEach(addHard);
        if (typeof dislikedList !== 'undefined' && Array.isArray(dislikedList)) dislikedList.forEach(addHard);
    } catch (_) {}
    for (const storageKey of ['match_savedList','match_dislikedList']) {
        try {
            const rows = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
            (Array.isArray(rows) ? rows : []).forEach(addHard);
        } catch (_) {}
    }
    try {
        const hardActions = new Set(['save','saved','watchlater','dislike','declined','notforme']);
        for (const item of policy.history?.() || []) {
            const action = String(item && item.action || '').toLowerCase().replace(/[^a-z]/g,'');
            if (hardActions.has(action)) addHard(item);
        }
    } catch (_) {}

    let pool = CONTENT_CATALOG.filter(e => eligible(e) && !hardExcluded.has(policy.key(e.title)));
    if (!pool.length) return null;

    // Never immediately repeat the card on screen when another exact option exists.
    let currentTitle = '';
    try { currentTitle = (typeof globalMatchTitle !== 'undefined' && globalMatchTitle) || window.globalMatchTitle || ''; } catch (_) {}
    const currentKey = policy.key(currentTitle);
    const notCurrent = currentKey ? pool.filter(e => policy.key(e.title) !== currentKey) : pool;
    if (notCurrent.length) pool = notCurrent;

    // Prefer something not yet used in this tab. Only recycle a session title
    // once every exact alternative has also been used.
    const outsideSession = pool.filter(e => !SESSION_SHOWN.has(e.title));
    if (outsideSession.length) pool = outsideSession;

    let recentSource = [];
    try {
        recentSource = (typeof recentTitles !== 'undefined' && Array.isArray(recentTitles))
            ? recentTitles
            : JSON.parse(window.localStorage.getItem('match_recentTitles') || '[]');
    } catch (_) { recentSource = []; }
    const recentKeys = new Set(recentSource.map(t => policy.key(t)));
    const outsideRecent = pool.filter(e => !recentKeys.has(policy.key(e.title)));
    if (outsideRecent.length) pool = outsideRecent;

    // Oldest history first, maximising distance between two appearances.
    const shownAt = new Map();
    try {
        for (const item of policy.history?.() || []) {
            const k = policy.key(item && item.title);
            const at = Number(item && item.addedAt) || 0;
            if (k && (!shownAt.has(k) || shownAt.get(k) < at)) shownAt.set(k, at);
        }
    } catch (_) {}
    const recentOrder = new Map(recentSource.map((title,index) => [policy.key(title), index]));
    pool.sort((a,b) => {
        const ak=policy.key(a.title), bk=policy.key(b.title);
        const aa=shownAt.get(ak)||0, ba=shownAt.get(bk)||0;
        if (aa !== ba) return aa - ba;
        const ar=recentOrder.has(ak)?recentOrder.get(ak):Number.MAX_SAFE_INTEGER;
        const br=recentOrder.has(bk)?recentOrder.get(bk):Number.MAX_SAFE_INTEGER;
        if (ar !== br) return br - ar;
        return String(a.title).localeCompare(String(b.title));
    });

    const pick = pool[0];
    return {...pick,title:pick.title,synopsis:pick.synopsis,platform:pick.platform,platformVerified:true,watchUrl:pick.watchUrl||(pick.platform==='Roku Channel'?pick.url:null)||null,source:'catalog-recycle',_historyFallback:true};
}

// Guaranteed recovery for ordinary matching. Exact user choices win first.
// If an over-specific combination has no result, relax only secondary filters
// in a predictable order while keeping the selected category anchored as long
// as the catalogue has an eligible title in that category. Watch Later and
// Not For Me are always hard exclusions, including cloud-restored history.
function pickGuaranteedCatalog(cat, plat, mood, vibe, rating, decade) {
    const policy = window.matchPolicy;
    if (!policy || typeof policy.matchesCriteria !== 'function') return null;
    const requested = {
        cat: normCriteria(cat),
        plat: normCriteria(plat),
        mood: normCriteria(mood),
        vibe: normCriteria(vibe),
        rating: normCriteria(rating),
        decade: normCriteria(decade || window.getMatchCriteria?.().decade || [])
    };
    const hardExcluded = new Set();
    const addHard = item => {
        const title = item && item.title ? item.title : item;
        const k = policy.key(title);
        if (k) hardExcluded.add(k);
    };
    try { if (typeof savedList !== 'undefined' && Array.isArray(savedList)) savedList.forEach(addHard); } catch (_) {}
    try { if (typeof dislikedList !== 'undefined' && Array.isArray(dislikedList)) dislikedList.forEach(addHard); } catch (_) {}
    for (const storageKey of ['match_savedList','match_dislikedList']) {
        try {
            const rows = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
            (Array.isArray(rows) ? rows : []).forEach(addHard);
        } catch (_) {}
    }
    try {
        (policy.history?.() || []).forEach(item => {
            if (item && ['save','dislike'].includes(String(item.action || '').toLowerCase())) addHard(item);
        });
    } catch (_) {}

    const wantsFaith = requested.cat.includes('Gospel & Faith') || requested.plat.some(p => ['Pure Flix','Angel Studios'].includes(p));
    const currentTitle = (() => { try { return typeof globalMatchTitle !== 'undefined' ? globalMatchTitle : window.globalMatchTitle; } catch (_) { return ''; } })();
    const currentKey = policy.key(currentTitle || '');
    const historyRank = new Map();
    try {
        (policy.history?.() || []).forEach((item,index) => { const k=policy.key(item?.title); if(k&&!historyRank.has(k)) historyRank.set(k,index); });
    } catch (_) {}

    const allowed = entry => {
        if (!entry || !entry.title) return false;
        if (typeof titlePassesRealGenre==='function' && !titlePassesRealGenre(entry)) return false;
        if (typeof entryPassesPreferenceExclusions==='function' && !entryPassesPreferenceExclusions(entry)) return false;
        const k = policy.key(entry.title);
        if (!k || hardExcluded.has(k)) return false;
        try { if (typeof isBlockedEntry === 'function' && isBlockedEntry(entry)) return false; } catch (_) {}
        if (!wantsFaith && Array.isArray(entry.cats) && entry.cats.includes('Gospel & Faith')) return false;
        return true;
    };
    const shape = (pick, stage, recycled) => ({
        ...pick,
        title: pick.title,
        synopsis: pick.synopsis,
        platform: pick.platform,
        platformVerified: true,
        watchUrl: pick.watchUrl || (pick.platform === 'Roku Channel' ? pick.url : null) || null,
        source: recycled ? 'catalog-guaranteed-recycle' : 'catalog-guaranteed',
        _historyFallback: !!recycled,
        _relaxedFallback: stage !== 'exact',
        _relaxedStage: stage
    });
    const choose = (criteria, stage) => {
        let candidates = CONTENT_CATALOG.filter(entry => allowed(entry) && policy.matchesCriteria(entry, criteria));
        if (!candidates.length) return null;
        const fresh = candidates.filter(entry => {
            const k = policy.key(entry.title);
            const sessionShown = (typeof SESSION_SHOWN !== 'undefined' && SESSION_SHOWN && SESSION_SHOWN.has(entry.title));
            return !policy.known().has(k) && !sessionShown;
        });
        if (fresh.length) return shape(fresh[Math.floor(Math.random()*fresh.length)], stage, false);
        const notCurrent = candidates.filter(entry => policy.key(entry.title) !== currentKey);
        if (notCurrent.length) candidates = notCurrent;
        candidates.sort((a,b) => {
            const ar = historyRank.has(policy.key(a.title)) ? historyRank.get(policy.key(a.title)) : -1;
            const br = historyRank.has(policy.key(b.title)) ? historyRank.get(policy.key(b.title)) : -1;
            if (ar !== br) return br - ar;
            return String(a.title).localeCompare(String(b.title));
        });
        return shape(candidates[0], stage, true);
    };

    // Exact always wins. If the combination is over-specific, broaden only
    // secondary discovery preferences in a fixed order. Category, rating,
    // real-genre gating, taste exclusions, blocked titles/countries and safety
    // stay hard. The result card labels the relaxation so nothing is hidden.
    const stages = [
        ['exact', requested],
        ['broaden-vibe', {...requested, vibe:[]}],
        ['broaden-era', {...requested, vibe:[], decade:[]}],
        ['broaden-mood', {...requested, vibe:[], decade:[], mood:[]}],
        ['broaden-platform', {...requested, vibe:[], decade:[], mood:[], plat:[]}]
    ];
    for (const [stage, criteria] of stages) {
        const hit = choose(criteria, stage);
        if (hit) return hit;
    }
    return null;
}

// ----------------------------------------------------
// PRUNE UNSTOCKED CRITERIA OPTIONS
//
// The dropdowns offer 7 categories and 10 platforms that match zero catalogue
// titles — audiobook, C-drama, Turkish dizi, Nollywood, Apple TV+, Tubi, Viu,
// Pluto TV and others. Picking any of them guaranteed "no titles match your
// criteria", which reads as a broken product rather than an empty shelf.
//
// Rather than delete them from the markup, they are hidden at runtime based on
// what the catalogue actually contains. That way the moment a title in one of
// those categories is added, its option reappears on its own — no markup edit,
// no chance of the list and the data drifting apart again.
// ----------------------------------------------------
function pruneUnstockedOptions() {
    if (typeof CONTENT_CATALOG === 'undefined' || !CONTENT_CATALOG.length) return;

    const stocked = (prop) => {
        const set = new Set();
        CONTENT_CATALOG.forEach(e => {
            const v = e[prop];
            (Array.isArray(v) ? v : [v]).forEach(x => { if (x) set.add(String(x)); });
        });
        return set;
    };

    [['q-category', 'cats'], ['q-platform', 'platform'],
     ['q-mood', 'moods'], ['q-vibe', 'vibes'], ['q-rating', 'ratings']].forEach(([id, prop]) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const have = stocked(prop);
        let removed = 0;
        Array.from(sel.options).forEach(opt => {
            // 'any' and empty values are controls, not content.
            if (!opt.value || opt.value === 'any') return;
            if (!have.has(opt.value)) { opt.remove(); removed++; }
        });
        if (removed) console.info('[matchapp] ' + id + ': hid ' + removed + ' option(s) with no titles in stock');
    });

    // criteria.js mirrors these selects into its chip UI, so it has to rebuild
    // from the pruned list or the chips would still show the dead options.
    document.dispatchEvent(new CustomEvent('matchapp:optionspruned'));
}

window.triggerMatch = async function(isSpecificSearch = false) {
    await window.matchPolicy?.ready();
    const requested = window.getMatchCriteria?.() || {cat:[document.getElementById('q-category')?.value],plat:[document.getElementById('q-platform')?.value],genre:[document.getElementById('q-genre')?.value],mood:[document.getElementById('q-mood')?.value],vibe:[document.getElementById('q-vibe')?.value],rating:[document.getElementById('q-rating')?.value],decade:[document.getElementById('q-decade')?.value]};
    const wantedGenres = normCriteria(requested.genre);
    window.__matchappGenreFilterActive = wantedGenres.length > 0;
    window.__matchappGenreKeys = null;
    window.__matchappGenreRelaxed = false;
    const blockedGenres=Array.isArray(window.MatchSettings?.get?.('blockedGenres'))?window.MatchSettings.get('blockedGenres'):[];
    const blockedCountries=Array.isArray(window.MatchSettings?.get?.('blockedOriginCountries'))?window.MatchSettings.get('blockedOriginCountries'):[];
    window.__matchappExcludedGenreKeys=null;
    if(blockedGenres.length){
        try{const blocked=await window.MatchAppCatalogMedia?.titleKeysForGenres?.(blockedGenres);window.__matchappExcludedGenreKeys=blocked instanceof Set?blocked:new Set();}
        catch(_){window.__matchappExcludedGenreKeys=new Set();}
    }
    if (window.__matchappGenreFilterActive) {
        try {
            const keys = await window.MatchAppCatalogMedia?.titleKeysForGenres?.(wantedGenres);
            window.__matchappGenreKeys = keys instanceof Set ? keys : new Set();
        } catch (_) {
            window.__matchappGenreKeys = new Set();
        }
    }
    // Show the ceremony BEFORE any live-source work. The old order did all
    // TMDB/iTunes/AI verification while the chooser remained on screen,
    // making a healthy lookup look frozen on desktop and mobile.
    const loadBox = document.getElementById('loading-box');
    const qBox = document.getElementById('questionnaire-box');
    const sBox = document.getElementById('search-box');
    const resultBox = document.getElementById('result-box');
    if (resultBox) resultBox.style.display = 'none';
    if (qBox) qBox.style.display = 'none';
    if (sBox) sBox.style.display = 'none';
    if (loadBox) {
        loadBox.style.display = 'block';
        document.body.classList.add('match-searching');
        requestAnimationFrame(() => loadBox.scrollIntoView({behavior:'auto',block:'center'}));
    }
    // Yield one painted frame before any source work. Without this, mobile
    // WebView can show the loader markup at its static 0% state while JS
    // immediately enters the verification chain.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const startTime = Date.now();
    // Progress is visual feedback, not a timer. Never hold a verified result
    // just to finish an animation.
    const PROGRESS_WINDOW_MS = 5000;
    const pBar = document.getElementById('ai-progress-bar');
    const pctLabel = document.getElementById('meter-pct');
    const headline = document.getElementById('loading-headline');
    const substep = document.getElementById('loading-substep');
    const eqBars = document.querySelectorAll('#eq-bars span');
    if (pBar) pBar.style.width = '0%';

    // Start visible progress immediately. Source verification below can take a few seconds;
    // leaving the meter at 0% during that work made a healthy request look frozen.
    let stageIdx = -1;
    const STAGES = [
        { at: 0,  head: 'Scanning the global catalog…', sub: 'Reading your mood profile' },
        { at: 18, head: 'Cross-referencing platforms…', sub: 'Checking what streams in your region' },
        { at: 38, head: 'Filtering the noise…', sub: 'Removing what you have already seen' },
        { at: 58, head: 'Ranking the contenders…', sub: 'Weighing mood, era and vibe' },
        { at: 78, head: 'Pulling cover art & trailer…', sub: 'Fetching artwork in high resolution' },
        { at: 92, head: 'Finalising your match…', sub: 'Almost there' }
    ];
    const updateMatchProgress = () => {
        const pct = Math.min(8 + ((Date.now() - startTime) / PROGRESS_WINDOW_MS) * 87, 95);
        if (pBar) pBar.style.width = pct + '%';
        if (pctLabel) pctLabel.innerText = Math.round(pct) + '%';
        const intensity = 0.35 + (pct / 100) * 0.65;
        eqBars.forEach((b) => { b.style.animationDuration = (1.15 - intensity * 0.55).toFixed(2) + 's'; b.style.opacity = (0.55 + intensity * 0.45).toFixed(2); });
        let next = -1; for (let i=0;i<STAGES.length;i++) if(pct>=STAGES[i].at) next=i;
        if(next!==stageIdx&&next>=0){stageIdx=next;if(headline)headline.innerText=tSafe('match.loading',STAGES[next].head);if(substep){substep.innerText=STAGES[next].sub;substep.style.opacity='1';}}
    };
    updateMatchProgress();
    let timerInterval = setInterval(updateMatchProgress, 100);

    let preflight = isSpecificSearch ? null : pickFromCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);
    // Never recycle a previously shown title. If the curated exact pool is
    // exhausted, ask the verified source layer for a genuinely fresh title.
    // TMDB gets first chance because it can verify genres/ratings/origin and,
    // when requested, regional provider availability.
    if (!isSpecificSearch && !preflight) {
        try { preflight = await discoverVerifiedExactTMDB(requested); } catch (_) { preflight = null; }
    }
    // iTunes is a real-source fallback only when no third-party platform,
    // source genre or blocked-source filter needs verification.
    if (!isSpecificSearch && !preflight && !normCriteria(requested.plat).length && !wantedGenres.length && !blockedGenres.length && !blockedCountries.length) {
        try { preflight = await discoverFromITunes(requested.cat,requested.mood,requested.vibe,requested.decade,requested.rating); }
        catch (_) { preflight = null; }
    }
    // Last source: AI proposals, each verified on TMDB against every choice.
    if (!isSpecificSearch && !preflight && typeof aiProposedVerifiedExact === 'function') {
        try { preflight = await aiProposedVerifiedExact(requested); } catch (_) { preflight = null; }
    }
    // Never dead-end ordinary matching because every fresh exact candidate has
    // already been shown or a live source is temporarily unavailable. Recycle
    // an exact eligible catalogue title first; only then use the existing
    // guaranteed recovery ladder. User-saved / Not For Me titles remain hard
    // exclusions in both helpers.
    if (!isSpecificSearch && !preflight && typeof pickRecycledCatalog === 'function') {
        try { preflight = pickRecycledCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade); } catch (_) { preflight = null; }
    }
    if (!isSpecificSearch && !preflight && typeof pickGuaranteedCatalog === 'function') {
        try {
            preflight = pickGuaranteedCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);
            if (preflight?._relaxedStage) window.lastMatchRelaxation = preflight._relaxedStage;
        } catch (_) { preflight = null; }
    }
    const typed = document.getElementById('specific-search-input')?.value || '';
    if (!isSpecificSearch && !preflight) {
        ['questionnaire-box','search-box'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='block';});
        ['loading-box','result-box'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
        document.body.classList.remove('match-searching');
        clearInterval(timerInterval);
        window.showToast?.('Keeping your choices exact — no verified fresh title was available just now. Try Match again.');
        return;
    }
    const alreadySeenSpecific = isSpecificSearch && window.matchPolicy?.known().has(window.matchPolicy.key(typed));
    if (isSpecificSearch && !typed.trim()) {
        clearInterval(timerInterval);
        document.body.classList.remove('match-searching');
        if (loadBox) loadBox.style.display='none';
        if (sBox) { sBox.style.display='block'; sBox.scrollIntoView({behavior:'auto',block:'center'}); }
        return;
    }
    if (alreadySeenSpecific) {
        // A rematch may already have hidden the previous result. Restore the
        // form before returning so an exhausted selection never strands it.
        ['questionnaire-box','search-box'].forEach(id => { const el=document.getElementById(id); if(el)el.style.display='block'; });
        ['loading-box','result-box'].forEach(id => { const el=document.getElementById(id); if(el)el.style.display='none'; });
        window.showToast(tSafe('polish.noFresh'));
        const form = document.getElementById('questionnaire-box');
        if (form) { form.style.display='block'; form.scrollIntoView({behavior:'smooth',block:'center'}); }
        return;
    }
    if (!(await checkDailyLimit())) {
        clearInterval(timerInterval);
        document.body.classList.remove('match-searching');
        if (loadBox) loadBox.style.display='none';
        if (resultBox) resultBox.style.display='none';
        if (isSpecificSearch) {
            if (sBox) sBox.style.display='block';
        } else if (qBox) qBox.style.display='block';
        return;
    }
    window.lastMatchWasSpecificSearch = isSpecificSearch;
    
    let promptText = "";
    if (isSpecificSearch) {
        const input = document.getElementById('specific-search-input');
        if (!input || !input.value.trim()) { window.location.reload(); return; }
        const lang = LANG_NAMES_FOR_PROMPT[window.MATCH_LANG] || 'English';
        promptText = `Find real, accurate streaming information strictly for the existing title "${input.value.trim()}". ` +
            `Do not invent a title if you don't recognize it — return your best guess at the closest real match instead. ` +
            `Write the "synopsis" field in ${lang}. Output valid JSON ONLY: {"title": "Exact Title Found", "synopsis": "A 2 sentence summary in ${lang}.", "platform": "Primary platform to watch it on"}`;
    } else {
        // No prompt is built here anymore. The old version asked Gemini to
        // freely invent a title + platform from category/mood/vibe keywords
        // alone, with no grounding in what MatchApp actually knows and no
        // language instruction — that open-ended call was the direct cause
        // of titles, covers and platforms not matching each other or the
        // user's language. The real decision logic now lives further down,
        // built entirely from verified sources (curated catalog, then live
        // iTunes discovery), never from free-form AI invention.
    }

    // Narrated stages keep the wait feeling purposeful instead of idle.
    let matchResult = null;
    if (isSpecificSearch) {
        const typedTitle = (document.getElementById('specific-search-input')?.value || '').trim();

        // Check our own verified catalog FIRST. "Então É Amor?" is a real
        // entry we've hand-curated with the correct title, platform and
        // synopsis — but the code used to skip straight past that and ask
        // Gemini to guess instead, which is exactly how a user searching
        // for that title got back "Rosa e Vicente" on a platform called
        // "Micro-drama vertical" (not a real service — Gemini describing
        // the FORMAT because it didn't actually know a real platform).
        // Same principle already applied to the questionnaire flow: never
        // let free-form AI invent facts we already have verified ourselves.
        let catalogHit = CONTENT_CATALOG.find(e => e.title.toLowerCase() === typedTitle.toLowerCase());
        if (!catalogHit) catalogHit = CONTENT_CATALOG.find(e => isRelevantMatch(typedTitle, e.title));

        if (catalogHit) {
            matchResult = { ...catalogHit, title: catalogHit.title, synopsis: catalogHit.synopsis, platform: catalogHit.platform, platformVerified: true, watchUrl:catalogHit.watchUrl||(catalogHit.platform==='Roku Channel'?catalogHit.url:null) };
        } else {
            try {
                matchResult = await fetchGeminiData(promptText);
                if (!matchResult || typeof matchResult.title !== 'string' || !matchResult.title.trim()) {
                    throw new Error("Empty AI result");
                }
                // Defensive coercion: whatever Gemini returns must be plain,
                // safe strings before it ever reaches the DOM. If a field came
                // back as something other than a string (an object, an array,
                // anything malformed), stringifying it here is what would have
                // put raw JSON-looking text into the synopsis on screen —
                // catching it here means that can never happen silently.
                const aiPlatformHint = matchResult.platform ? String(matchResult.platform).trim() : '';
                matchResult = {
                    title: String(matchResult.title).trim(),
                    synopsis: matchResult.synopsis ? String(matchResult.synopsis).trim() : '',
                    platform: 'any',
                    platformHint: aiPlatformHint,
                    platformVerified: false
                };
            } catch (err) {
                matchResult = { title: typedTitle, synopsis: "Here's your title — verified viewing options will appear below when available.", platform: "any", platformVerified: false };
            }
        }
    } else {
        // Read the full ticked SET per field, not one value. getMatchCriteria
        // is installed by criteria.js; the single-value fallback keeps the
        // matcher working if that file fails to load for any reason, rather
        // than leaving the form inert.
        const picked = (typeof window.getMatchCriteria === 'function')
            ? window.getMatchCriteria()
            : {
                cat:    [document.getElementById('q-category')?.value].filter(v => v && v !== 'any'),
                plat:   [document.getElementById('q-platform')?.value].filter(v => v && v !== 'any'),
                genre:  [document.getElementById('q-genre')?.value].filter(v => v && v !== 'any'),
                mood:   [document.getElementById('q-mood')?.value].filter(v => v && v !== 'any'),
                vibe:   [document.getElementById('q-vibe')?.value].filter(v => v && v !== 'any'),
                rating: [document.getElementById('q-rating')?.value].filter(v => v && v !== 'any'),
                decade: [document.getElementById('q-decade')?.value].filter(v => v && v !== 'any')
              };

        let cat = picked.cat, plat = picked.plat, genre = picked.genre, mood = picked.mood,
            vibe = picked.vibe, rating = picked.rating, decade = picked.decade;

        // Tier 1: curated catalog. Every title/platform pairing here was
        // hand-verified, so when it can honor the exact platform requested,
        // it's the single most trustworthy source available and wins outright.
        const catalogPick = preflight;

        // Remember what the user actually asked for, so the result card can show
        // it back to them. Without this the pick arrives with no explanation and
        // reads as arbitrary — especially after the taste-DNA tie-break, which
        // legitimately narrows things in ways the user didn't explicitly request.
        window.lastMatchCriteria = { cat, plat, genre, mood, vibe, rating, decade };

        matchResult = catalogPick;
        window.lastMatchRelaxation = matchResult?._relaxedStage || 'exact';

        // Never claim the user's exact requested platform unless the winning
        // source actually verified it. This is the direct fix for a title
        // showing up tagged with a platform it isn't really on — the badge
        // now reads "any" (rendered as "Find Where To Stream") instead of a
        // confident, unverified lie.
        if (matchResult && !matchResult.platformVerified) matchResult.platform = 'any';

        // Translate only the chosen real description; never substitute an English failure result.
        if (matchResult) {
            matchResult.originalSynopsis=matchResult.synopsis;
            matchResult.synopsis=await window.localizeMatchSynopsis(matchResult.synopsis,'en');
            matchResult.synopsisLang=window.MATCH_LANG||'en';
        }
    }
    // An intentional exhaustion recovery is allowed to reuse an older exact
    // catalogue title. Only our internal recycle pickers can set this escape;
    // every ordinary result still obeys the permanent history boundary.
    const intentionalHistoryFallback = !!(matchResult
        && matchResult._historyFallback === true
        && (matchResult.source === 'catalog-recycle' || matchResult.source === 'catalog-guaranteed-recycle'));
    const resultWasKnown = !!(matchResult
        && !intentionalHistoryFallback
        && window.matchPolicy?.known().has(window.matchPolicy.key(matchResult.title)));
    if (!matchResult || resultWasKnown) {
        clearInterval(timerInterval);
        document.body.classList.remove('match-searching');
        if (loadBox) loadBox.style.display='none';
        if (typeof window.goToQuestionnaire === 'function') window.goToQuestionnaire();
        else if (qBox) qBox.style.display='block';
        window.showToast(tSafe('polish.inHistory'));
        return;
    }
    // Do not remember the title or fire matchapp:newmatch until the result
    // card is actually on screen. rememberShownTitle writes match_recentTitles,
    // which known() reads, and a premature newmatch lets other modules hide
    // the card — the user then only sees the premiere poster below.

    if (pBar) pBar.style.width = '100%';
    if (pctLabel) pctLabel.innerText = '100%';
    clearInterval(timerInterval);
    
    await renderResult(matchResult, isSpecificSearch);
};

// ----------------------------------------------------
// THE RENDER ENGINE (Bulletproof Image Swap & YouTube Box)
// ----------------------------------------------------
// ----------------------------------------------------
// REMAINING-MATCHES CORNER COUNTER
// Rendered on the result card after each reveal. Reads lastQuotaStatus, which
// is now populated for anonymous visitors as well as signed-in users, so this
// works for first-time traffic rather than only for accounts.
// ----------------------------------------------------
function renderQuotaCorner() {
    const el = document.getElementById('result-quota-corner');
    const numEl = document.getElementById('result-quota-num');
    const labelEl = document.getElementById('result-quota-label');
    if (!el || !numEl || !labelEl) return;

    const s = lastQuotaStatus;
    // If quota state is genuinely unknown (RPC failed, mid-signup), show
    // nothing rather than invent a number the server might contradict.
    if (!s || typeof s.remaining !== 'number') { el.style.display = 'none'; return; }

    const included = Math.max(0, Number(s.remaining) || 0);
    const extras = Math.max(0, Number(s.purchased_matches) || 0);
    const left = included + extras;
    el.classList.remove('qc-low', 'qc-out', 'qc-unlimited');

    numEl.textContent = left;
    labelEl.textContent = left === 1
        ? (window.t ? t('quota.oneleft') : 'match left')
        : (window.t ? t('quota.left') : 'left today');

    if (left === 0) el.classList.add('qc-out');
    else if (left === 1) el.classList.add('qc-low');

    el.title = tSafe('match.used','{used} of {limit} included AI actions used').replace('{used}',s.used||0).replace('{limit}',s.limit||'?')
        + (extras ? ` · ${extras} Extra Match${extras===1?'':'es'} saved` : '');
    el.style.display = 'flex';
}

// Echo back what the user chose. A pick with no stated reason reads as random;
// showing the filters it satisfied makes it legible. Filters left on "any" are
// omitted rather than shown as "Any" noise.
function renderMatchCriteria() {
    const wrap = document.getElementById('res-criteria');
    const chips = document.getElementById('res-criteria-chips');
    if (!wrap || !chips) return;

    const c = window.lastMatchCriteria;
    if (!c) { wrap.style.display = 'none'; return; }

    const fields={cat:'q-category',plat:'q-platform',genre:'q-genre',mood:'q-mood',vibe:'q-vibe',rating:'q-rating',decade:'q-decade'};
    const pretty = (v,k) => [...(document.getElementById(fields[k])?.options||[])].find(option=>option.value===v)?.textContent || String(v || '').replace(/\b\w/g, ch => ch.toUpperCase());
    // Criteria are sets now, so every ticked value gets its own chip rather
    // than only the first — otherwise the card would quietly claim the user
    // asked for less than they did.
    const parts = [];
    ['cat', 'genre', 'plat', 'mood', 'vibe', 'rating', 'decade'].forEach(k => {
        normCriteria(c[k]).forEach(v => parts.push(pretty(v,k)));
    });

    if (!parts.length) {
        chips.innerHTML = `<span>${window.t ? t('res.surpriseMe') : 'Surprise me — no filters set'}</span>`;
    } else {
        chips.innerHTML = parts.map(p => `<span>${sanitizeDisplayText(p)}</span>`).join('');
    }
    const relaxed = window.lastMatchRelaxation;
    if (relaxed && relaxed !== 'exact') {
        const labels = {'broaden-vibe':'Closest available · vibe broadened','broaden-era':'Closest available · vibe + era broadened','broaden-mood':'Closest available · vibe + era + mood broadened','broaden-platform':'Closest available · secondary filters broadened'};
        chips.insertAdjacentHTML('beforeend', `<span class="match-relaxed-criteria">${sanitizeDisplayText(labels[relaxed] || 'Closest available match')}</span>`);
    }
    wrap.style.display = 'block';
}

// Fills origin/year/genre and cast from live metadata, using the catalog's own
// year/country as disambiguation hints so same-named works can't be confused.
async function hydrateTitleFacts(selected, hints) {
    const bar = document.getElementById('res-factbar');
    const castEl = document.getElementById('res-cast');
    const synEl = document.getElementById('res-synopsis');
    if (bar) { bar.style.display = 'none'; bar.innerHTML = ''; }
    if (castEl) { castEl.style.display = 'none'; castEl.textContent = ''; }
    if (!selected || !selected.title) return;

    hints = hints || {};

    // Show what the catalog already knows immediately, so the card is never
    // empty while the network call is in flight.
    const facts = [];
    const addFact = value => {
        const text = String(value || '').trim();
        if (text && !facts.some(x => String(x).toLowerCase() === text.toLowerCase())) facts.push(text);
    };
    if (hints.year) addFact(String(hints.year));
    if (hints.country) addFact(hints.country);
    [...(Array.isArray(hints.cats) ? hints.cats : []), ...(Array.isArray(selected.cats) ? selected.cats : [])]
        .forEach(cat => addFact(String(cat).replace(/\b\w/g, ch => ch.toUpperCase())));
    if (bar && facts.length) {
        bar.innerHTML = facts.map(f => `<span>${sanitizeDisplayText(f)}</span>`).join('');
        bar.style.display = 'flex';
    }
    if (castEl && Array.isArray(hints.cast) && hints.cast.length) {
        castEl.innerHTML = `<strong>${window.t ? t('res.starring') : 'Starring'}:</strong> `
                         + sanitizeDisplayText(hints.cast.join(', '));
        castEl.style.display = 'block';
    }

    let meta = null;
    try { meta = await fetchTitleMeta(selected.title, hints); } catch (e) {}
    if (!meta) return;

    const merged = [];
    if (meta.year) merged.push(meta.year);
    if (meta.country) merged.push(meta.country);
    (meta.genres || []).forEach(g => merged.push(g));
    if (bar && merged.length) {
        bar.innerHTML = merged.map(f => `<span>${sanitizeDisplayText(f)}</span>`).join('');
        bar.style.display = 'flex';
    }

    const cast = (Array.isArray(hints.cast) && hints.cast.length) ? hints.cast : meta.cast;
    if (castEl && cast && cast.length) {
        castEl.innerHTML = `<strong>${window.t ? t('res.starring') : 'Starring'}:</strong> `
                         + sanitizeDisplayText(cast.join(', '));
        castEl.style.display = 'block';
    }

    // Prefer a fuller synopsis when the catalog's one-liner is thin, but never
    // replace a written synopsis with something shorter and vaguer.
    if ((window.MATCH_LANG||'en')==='en' && synEl && meta.synopsis && meta.synopsis.length > (synEl.textContent || '').length + 40) {
        synEl.textContent = meta.synopsis.slice(0, 420);
    }
}

// Renders the private-notes panel for the currently shown match. Called from
// renderResult() on every reveal.
function renderNotePanel(title) {
    const wrap = document.getElementById('res-note-wrap');
    const box = document.getElementById('res-note-input');
    const locked = document.getElementById('res-note-locked');
    const status = document.getElementById('res-note-status');
    const saveBtn = document.getElementById('res-note-save');
    if (!wrap) return;

    wrap.style.display = 'block';
    if (status) status.textContent = '';

    if (!isUserLoggedIn) {
        // Signed-out: show what the feature is rather than hiding it entirely.
        // A locked feature someone can see is a reason to register; an
        // invisible one is just a feature they never discover.
        if (box) box.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'none';
        if (locked) locked.style.display = 'flex';
        return;
    }

    if (locked) locked.style.display = 'none';
    if (box) {
        box.style.display = 'block';
        box.value = window.getTitleNote(title);
    }
    if (saveBtn) saveBtn.style.display = 'inline-flex';
}

window.saveCurrentNote = async function () {
    if (!isUserLoggedIn) return;
    const box = document.getElementById('res-note-input');
    const status = document.getElementById('res-note-status');
    if (!box || !globalMatchTitle) return;

    const ok = await saveTitleNote(globalMatchTitle, box.value);
    if (status) {
        status.textContent = box.value.trim() === ''
            ? (window.t ? t('note.cleared') : 'Note cleared.')
            : (window.t ? t('note.saved') : 'Saved to your history.');
        setTimeout(() => { if (status) status.textContent = ''; }, 2600);
    }
    if (ok && window.showToast && box.value.trim() !== '') {
        showToast(window.t ? t('note.savedToast') : '📝 Note saved — find it in your Profile history.');
    }
};

async function renderResult(selected, isSpecificSearch) {
    await window.matchPolicy?.ready();
    const loadBox = document.getElementById('loading-box');
    const resultBox = document.getElementById('result-box');
    const form = document.getElementById('questionnaire-box');
    const reveal = () => {
        document.body.classList.remove('match-searching');
        if (loadBox) loadBox.style.display = 'none';
    };
    if(!selected?.title){
        window.showToast(tSafe('polish.inHistory'));
        reveal();
        if (typeof window.goToQuestionnaire === 'function') window.goToQuestionnaire();
        else if (form) form.style.display='block';
        return;
    }
    // This title was already proven fresh in triggerMatch. known() also
    // contains match_recentTitles, so re-checking here after a remember
    // skipped the result card, confetti, and left the premiere poster in view.
    reveal();
    if (!resultBox) return;
    resultBox.style.display = 'block';
    resultBox.classList.add('is-revealed');
    // Scroll to the artwork itself once it is painted; the poster is the
    // beginning of the result experience on every screen size.
    requestAnimationFrame(() => {
        const posterStage = resultBox.querySelector('.poster-stage');
        (posterStage || resultBox).scrollIntoView({
            behavior: document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start'
        });
    });
    globalMatchTitle = selected.title;
    window.globalMatchTitle = selected.title;
    const titleEl = document.getElementById('res-title');
    if (titleEl) titleEl.innerText = sanitizeDisplayText(selected.title, ['title']);
    rememberShownTitle(selected.title);

    // Keep the exact identity beside the rendered title. Media enrichment runs
    // in a separate shared module and previously received only title text, so a
    // live-discovered title could lose the year/type/TMDB identity that had
    // already been source-verified by the matcher. That is how real posters
    // fell back to branded placeholders even though TMDB had the artwork.
    window.currentMatchIdentity = {
        title:selected.title,
        year:selected.year||'',
        country:selected.country||'',
        countryCode:selected.countryCode||'',
        cats:Array.isArray(selected.cats)?selected.cats:[],
        tmdbId:Number(selected._tmdbId||selected._meta?.tmdbId)||null,
        kind:selected._tmdbKind||selected._meta?.kind||'',
        artwork:selected._meta?.artwork||''
    };
    document.dispatchEvent(new CustomEvent('matchapp:newmatch',{detail:window.currentMatchIdentity}));

    // Computed ONCE and shared by both the poster lookup below and
    // hydrateTitleFacts(). Previously each ran its own separate,
    // independently-hinted (or unhinted) search — the poster came from
    // itunesRichLookup with NO year/country check at all, while the fact bar
    // came from a completely different TVMaze call that WAS disambiguated,
    // and its correctly-verified poster field was computed and then silently
    // thrown away. The poster and the "2023 · Japan" caption under it could
    // therefore each be right about a DIFFERENT show. One shared hints object
    // closes that gap at the source rather than patching either lookup alone.
    let matchHints = {
        year:selected.year||'',
        country:selected.country||'',
        countryCode:selected.countryCode||'',
        cats:Array.isArray(selected.cats)?selected.cats:[],
        kind:selected._tmdbKind||selected._meta?.kind||'',
        // Poster resolution is a user-visible result path. Let the TMDB proxy
        // use its bounded transient retry instead of turning one busy request
        // into a branded placeholder for a title that has real artwork.
        priority:true
    };
    try {
        if (typeof CONTENT_CATALOG !== 'undefined') {
            const e = CONTENT_CATALOG.find(x => x.title === selected.title);
            if (e) matchHints = {
                ...matchHints,
                year:matchHints.year||e.year||'',
                country:matchHints.country||e.country||'',
                countryCode:matchHints.countryCode||e.countryCode||'',
                cast:e.cast,
                cats:matchHints.cats.length?matchHints.cats:(e.cats||[]),
                kind:matchHints.kind||(window.tmdbKindForCats?.(e.cats||[])||'')
            };
        }
    } catch (err) {}

    renderQuotaCorner();
    renderMatchCriteria();
    hydrateTitleFacts(selected, matchHints);

    // TRIGGER PREMIUM FX
    window.playPremiumSound();
    if (!document.documentElement.classList.contains('reduce-motion') && !matchMedia('(prefers-reduced-motion: reduce)').matches && typeof confetti !== 'undefined') {
        const compactFx = matchMedia('(max-width: 820px)').matches || document.documentElement.classList.contains('matchapp-android');
        confetti({ particleCount: compactFx ? 20 : 38, spread: 64, origin: { y: 0.58 }, colors: ['#E5C158', '#FFF', '#8A2BE2', '#E50914'], disableForReducedMotion: true });
    }

    document.getElementById('res-title').innerText = sanitizeDisplayText(selected.title, ['title']);
    const captionLang=window.MATCH_LANG||'en';window.localizedTitle?.(selected.title,matchHints).then(name=>{if(window.currentSynopsisSource?.title===selected.title&&(window.MATCH_LANG||'en')===captionLang)document.getElementById('res-title').textContent=name;});
    window.currentSynopsisSource={text:selected.originalSynopsis||selected.synopsis,lang:selected.originalSynopsis?'en':selected.synopsisLang||'en',title:selected.title};
    const description=await window.localizeMatchSynopsis(selected.synopsis,selected.synopsisLang||'en');
    document.getElementById('res-synopsis').innerText=sanitizeDisplayText(description,['synopsis','answer','description']);
    document.getElementById('res-platform-badge').innerText =
        (selected.platform && selected.platform !== 'any') ? selected.platform : (window.t ? t('res.multiplatform') : 'Multiple Platforms');

    // "NEVER FAIL" COVER PULL + TRAILER METADATA (single lookup, cached)
    const posterEl = document.getElementById('res-poster-img');
    const categoryHint = matchHints.cats?.[0] || document.getElementById('q-category')?.value || '';

    // Vertical micro-dramas (ReelShort, DramaBox, ShortMax, Globoplay's line)
    // live entirely inside proprietary apps with no public catalog anywhere —
    // iTunes and TVMaze will correctly find nothing, but only after several
    // wasted network round-trips. Skip straight to the branded local cover,
    // which always shows the correct title text with zero network dependency.
    // Only skip the lookup when there's no already-trustworthy _meta. Live
    // discovery results carry artwork from the SAME iTunes record the title
    // itself came from, so by construction they can't mismatch — that's
    // categorically different from a catalog title needing a fresh, separate
    // search, which is where the real risk lives.
    const platformIsHighRisk = selected.platform && ['globoplay','reelshort','dramabox','shortmax','pure flix','angel studios'].includes(String(selected.platform).toLowerCase());
    const skipLiveLookup = !selected._meta && (isHighRiskCategory(categoryHint, selected.title) || platformIsHighRisk);

    // Hand-verified art wins over everything — no lookup can beat a known-correct
    // image, and for unreleased/app-exclusive titles a lookup actively returns
    // the wrong one.
    const verified = getVerifiedPoster(selected.title);

    // The discovery engine already carries artwork/preview/store data — reuse it
    // instead of making a second network round-trip for the same title.
    let meta = selected._meta || null;
    if (!meta && !skipLiveLookup && !verified) meta = await getRichMetadata(selected.title, categoryHint, matchHints);

    let realCover;
    if (verified) {
        realCover = verified;
    } else if (skipLiveLookup && !(meta && meta.artwork)) {
        realCover = generatedCover(selected.title, matchHints);
    } else {
        realCover = selected._meta?.artwork || await getRealCoverImage(selected.title, matchHints);
    }
    if (!realCover) realCover = generatedCover(selected.title, matchHints);

    // Track the current match globally so Watch Later / Seen It can record it.
    globalMatchTitle = selected.title;
    globalMatchPoster = realCover;
    globalPlatform = selected.platform;
    // THE ACTUAL SHARE BUG: `let globalMatchTitle` at top level never creates
    // `window.globalMatchTitle` — only `var` does that. share.js has always
    // read `window.globalMatchTitle` (correctly, since it's a separate file
    // and can't see this module's local variable via closure), so it was
    // permanently undefined no matter how many real matches were on screen —
    // "Get a match first" showed up even with a match clearly displayed.
    // Explicit mirroring, same pattern already used for isVIP/isUserLoggedIn.
    window.globalMatchTitle = globalMatchTitle;
    window.globalMatchPoster = globalMatchPoster;
    window.globalPlatform = globalPlatform;

    // A shown result is permanent history, not merely a short-session hint.
    // Guests keep it locally; signed-in users also sync it through portfolio_action,
    // so the same result is excluded across devices.
    window.matchPolicy?.remember({
        title: selected.title,
        posterUrl: realCover,
        streamUrl: selected.watchUrl || ''
    }, 'shown');

    // Must come AFTER globalMatchTitle is assigned — saveCurrentNote() reads
    // it to know which title the note belongs to.
    renderNotePanel(selected.title);

    // Content-safety gate: some titles simply shouldn't go out in a branded
    // social share under MatchApp's name. Swap the share button into a
    // "get another match instead" state rather than opening the share sheet.
    window.currentMatchShareRestricted = isShareRestrictedTitle(selected.title, selected.synopsis);
    updateShareButtonState();

    posterEl.style.display = 'block';
    posterEl.classList.remove('fade-in'); void posterEl.offsetWidth; posterEl.classList.add('fade-in');
    
    // A match card is not allowed to expose a missing/broken cover. The local
    // SVG is generated synchronously and assigned first, so the very first
    // paint already has artwork even while a remote poster is still loading.
    // Remote artwork is promoted only after the browser proves it decoded.
    // This closes the desktop race where a failed/slow provider URL left the
    // poster area visually blank before onerror completed.
    const localCover = generatedCover(selected.title, {
        ...matchHints,
        platform: selected.platform || matchHints.platform || '',
        synopsis: selected.synopsis || matchHints.synopsis || ''
    });
    posterEl.onerror = null;
    posterEl.src = localCover;
    // A generated result cover must still try the exact title's catalog image;
    // otherwise an unavailable first source becomes permanent for this match.
    if ((!realCover || /^data:image\/svg\+xml/.test(realCover)) &&
        window.MatchAppCatalogMedia?.recoverAdultPoster) {
        window.MatchAppCatalogMedia.recoverAdultPoster(posterEl, selected.title);
    }
    if (realCover && realCover !== localCover &&
        window.MatchAppCatalogMedia?.recoverAdultPoster &&
        /^https:\/\/(?:image\.tmdb\.org|is\d+-ssl\.mzstatic\.com)\//i.test(realCover)) {
        window.MatchAppCatalogMedia.recoverAdultPoster(posterEl, selected.title, null, realCover);
    } else if (realCover && realCover !== localCover) {
        const probe = new Image();
        probe.onload = function() {
            if (window.globalMatchTitle === selected.title) {
                posterEl.src = realCover;
                globalMatchPoster = realCover;
                window.globalMatchPoster = realCover;
            }
        };
        probe.onerror = function() {
            // If the provider fails, keep the already-painted local cover
            // visible while recovering only this exact title's saved original.
            window.MatchAppCatalogMedia?.recoverAdultPoster?.(posterEl, selected.title);
        };
        probe.src = realCover;
    }

    // DIRECT LINK SETUP — routed through the platform catalog so every service
    // gets a real deep link into that service.
    const directBtn = document.getElementById('res-direct-link');
    const catIsAudio = isAudioCategory(categoryHint);
    const pfEntry = PLATFORMS[selected.platform];
    const audioPick = catIsAudio || (pfEntry && pfEntry.audio);

    // A verified per-title deep link always wins over a platform search.
    // Netflix (and most apps) reliably honour /title/<id> universal links, but
    // frequently drop the ?q= parameter when a search URL hands off to the
    // native app — the app opens on an EMPTY search screen and the user
    // assumes the title doesn't exist. Direct links avoid that entirely.
    if (selected.watchUrl) {
        directBtn.href = selected.watchUrl;
    } else if (selected.platform && selected.platform !== 'any' && pfEntry) {
        directBtn.href = platformSearchUrl(selected.platform, selected.title);
    } else if (audioPick) {
        directBtn.href = `https://open.spotify.com/search/${encodeURIComponent(selected.title)}`;
    } else {
        directBtn.href = `https://www.justwatch.com/us/search?q=${encodeURIComponent(selected.title)}`;
    }

    if (audioPick) directBtn.innerText = window.t ? t('res.listennow') : '🎧 Listen Now';
    else if (selected.platform && selected.platform !== 'any' && pfEntry) directBtn.innerText = tSafe('res.findwhere', 'Find where to watch')+' · '+selected.platform;
    else directBtn.innerText = window.t ? t('res.findwhere') : '▶ Find Where To Stream';

    // SAFETY NET for every link that isn't a verified per-title deep link.
    // Two distinct failure modes are handled here:
    //   1. Search URL exists, but the native app drops the ?q= on handoff and
    //      opens a blank search screen (confirmed with Netflix).
    //   2. The platform exposes no URL-based search at all — ShortMax,
    //      GoodShort and FlexTV search entirely client-side, so any link can
    //      only ever land on their homepage.
    // We can't change how a third-party app parses a link, but we can make it
    // a paste instead of retyping the title from memory.
    const usesSearchUrl = !selected.watchUrl;
    const pfSearchable = !pfEntry || pfEntry.searchable !== false;
    directBtn.onclick = usesSearchUrl ? function() {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(selected.title);
                if (window.showToast) {
                    showToast(pfSearchable
                        ? `📋 "${selected.title}" copied — paste it if the app's search opens empty.`
                        : `📋 "${selected.title}" copied — ${selected.platform} has no direct search link, so paste it into the app's search box.`);
                }
            }
        } catch (e) { /* clipboard blocked; the link still opens normally */ }
    } : null;

    // Keep the save/seen buttons worded for the medium being shown.
    applyAudioModeLabels(audioPick);

    // ----------------------------------------------------
    // TRAILER — always a link to YouTube, never an embedded player.
    // An embedded clip used to play here, sourced from the SAME iTunes
    // record used for the cover art. When that record was mismatched (the
    // core bug just fixed above), the "trailer" played the WRONG title's
    // clip too — compounding the damage rather than just showing a bad
    // poster. A YouTube search link carries none of that risk: it always
    // opens, and lets the user's own eyes confirm it's the right title,
    // which a small embedded thumbnail never really achieved anyway.
    // ----------------------------------------------------
    const trailerContainer = document.getElementById('res-trailer-container');
    const ytLink = document.getElementById('yt-trailer-link');
    const ytLabel = ytLink ? ytLink.querySelector('span') : null;

    trailerContainer.style.display = 'block';

    const wantsAudio = isAudioCategory(categoryHint);
    const queryTerm = wantsAudio ? `${selected.title} official audio` : `${selected.title} official trailer`;
    ytLink.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(queryTerm)}`;
    if (ytLabel) {
        const key = wantsAudio ? 'res.listenyt' : 'res.watchtrailer';
        ytLabel.textContent = window.t ? t(key) : (wantsAudio ? 'Listen on YouTube' : 'Watch Trailer on YouTube');
    }

    updateActionButtonStates();
}

// ----------------------------------------------------
// LIVE STATUS STRIP
// Shows the visitor's REAL local date/time plus REAL activity numbers.
//
// Deliberately not fabricated. A made-up "1,847 people matching right now"
// counter is (a) misleading advertising under Brazil's CDC Art. 37 and the
// EU UCPD, (b) a deceptive-content risk against the AdSense policies this
// site depends on for revenue, and (c) trivially caught by any visitor who
// reloads twice. Everything below is either measured live from Supabase or
// a verifiable fact about the product.
// ----------------------------------------------------
function startLiveClock() {
    const el = document.getElementById('live-clock');
    if (!el) return;

    const render = () => {
        const now = new Date();
        // Uses the visitor's own locale + timezone automatically.
        const lang = (window.MATCH_LANG || navigator.language || 'en');
        let stamp;
        try {
            stamp = new Intl.DateTimeFormat(lang, {
                weekday: 'short', day: 'numeric', month: 'short',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).format(now);
        } catch (e) {
            stamp = now.toLocaleString();
        }
        el.textContent = stamp;
    };

    render();
    const onVisible=()=>{if(!document.hidden)render();};
    document.addEventListener('visibilitychange',onVisible);
    window.addEventListener('focus',render);
}

// Verifiable product facts — used when live numbers aren't available yet.
// Counted from the real data structures in this file, not hardcoded guesses.
function productFactsLine() {
    const titles = (typeof CONTENT_CATALOG !== 'undefined') ? CONTENT_CATALOG.length : 0;
    const platforms = (typeof PLATFORMS !== 'undefined') ? Object.keys(PLATFORMS).length : 0;
    const langs = (typeof I18N_LANGS !== 'undefined') ? Object.keys(I18N_LANGS).length : 14;

    const parts = [];
    if (platforms) parts.push(`<strong>${platforms}</strong> ${tSafe('polish.platforms')}`);
    if (titles) parts.push(`<strong>${titles}</strong> ${tSafe('polish.titles')}`);
    if (langs) parts.push(`<strong>${langs}</strong> ${tSafe('polish.languages')}`);
    return parts.join(' · ');
}

async function renderLiveActivity() {
    const el = document.getElementById('live-activity');
    if (!el) return;

    // Always render the honest baseline immediately — never blank.
    el.innerHTML = productFactsLine();

    // Don't attempt the RPC at all if Supabase isn't initialised.
    if (!supabaseClient) return;

    // activity_stats() only exists after migration 004 is deployed.
    // Calling a nonexistent RPC throws a network-level error in the browser
    // console even when caught (the SDK routes it through api.supabase.com).
    // Guard: only call it once we've seen it succeed at least once this session,
    // OR fall back to a health check that costs one tiny request first.
    // Simplest safe approach: try once, gate future calls on success.
    if (!renderLiveActivity._confirmed && !renderLiveActivity._attempted) {
        renderLiveActivity._attempted = true;
        try {
            const { data, error } = await supabaseClient.rpc('activity_stats');
            if (error) return; // migration not deployed — stay on baseline, no console noise
            renderLiveActivity._confirmed = true;
            _applyActivityStats(el, data);
        } catch (e) { /* migration not deployed yet; baseline stays */ }
        return;
    }

    if (!renderLiveActivity._confirmed) return; // previous attempt failed — don't retry

    try {
        const { data, error } = await supabaseClient.rpc('activity_stats');
        if (!error && data) _applyActivityStats(el, data);
    } catch (e) { /* network blip — keep whatever's showing */ }
}

function _applyActivityStats(el, data) {
    const total   = Number(data.matches_total || 0);
    const week    = Number(data.matches_7d    || 0);
    const members = Number(data.members_total || 0);
    const fmt = n => n.toLocaleString(window.MATCH_LANG || navigator.language || 'en');

    const bits = [];
    if (week   >= 25) bits.push(`<strong>${fmt(week)}</strong> matches made this week`);
    else if (total >= 50) bits.push(`<strong>${fmt(total)}</strong> matches made`);
    if (members >= 25) bits.push(`<strong>${fmt(members)}</strong> members`);

    if (bits.length) el.innerHTML = bits.join(' · ');
}

function initLiveStrip() {
    startLiveClock();
    renderLiveActivity();
    let last=Date.now();
    const refresh=()=>{
        if(document.hidden||Date.now()-last<90000)return;
        last=Date.now();
        renderLiveActivity();
    };
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    window.addEventListener('focus',refresh);
}
document.addEventListener('DOMContentLoaded', initLiveStrip);

// ----------------------------------------------------
// SPOTLIGHT POSTER HYDRATION
// The AHS card shipped with a hand-made text-only JPEG, which looks like a
// placeholder next to real poster art. American Horror Story is a genuine
// series, so it resolves through the same TVMaze/iTunes chain every other
// title in this app uses — no special-casing, no scraping, and the artwork
// stays hosted by the provider. The local JPEG paints instantly and stays
// put if the lookup finds nothing, so this can only ever improve the card.
// ----------------------------------------------------
async function hydrateSpotlightPoster() {
    const img = document.getElementById('spotlight-poster-img');
    if (!img) return;
    try {
        const real = '/ahs13-official.png?v=185';
        // Only swap for genuine artwork — never downgrade to the generated
        // text placeholder, which would look worse than what we already have.
        if (real && !real.includes('placehold.co') && !real.startsWith('data:')) {
            const probe = new Image();
            probe.onload = () => { img.src = real; };
            probe.onerror = () => { /* keep the local poster */ };
            probe.src = real;
        }
    } catch (e) { /* keep the local poster */ }
}
document.addEventListener('DOMContentLoaded', hydrateSpotlightPoster);

// ----------------------------------------------------

// ----------------------------------------------------
// WATCH LATER / SEEN IT ENGINE
// ----------------------------------------------------
const inList = (list, title) => list.some(i => (i.title || i) === title);

function updateActionButtonStates() {
    const saveBtn = document.getElementById('btn-watch-later');
    const seenBtn = document.getElementById('btn-seen-it');

    if (saveBtn) {
        const already = inList(savedList, globalMatchTitle);
        saveBtn.innerText = tSafe(already ? 'polish.savedLater' : 'res.watchlater', already ? 'Saved' : 'Watch Later');
        saveBtn.style.opacity = already ? '0.65' : '1';
    }
    if (seenBtn) {
        const already = inList(seenList, globalMatchTitle);
        seenBtn.innerText = tSafe(already ? 'polish.seen' : 'res.seenit', already ? 'Seen' : 'Seen it');
        seenBtn.style.opacity = already ? '0.65' : '1';
    }
}

// "Not For Me" now asks WHAT wasn't for them. Rejecting one title at a time
// never stops a genre you dislike from reappearing — you have to reject every
// title in it individually, which is exactly the frustration reported. This
// offers the underlying categories of the title in front of them, so one tap
// can retire a whole genre.
window.openNotForMeChooser = function() {
    if (!globalMatchTitle) return;

    let entry = null;
    try {
        if (typeof CONTENT_CATALOG !== 'undefined') {
            entry = CONTENT_CATALOG.find(e => e.title === globalMatchTitle) || null;
        }
    } catch (e) {}

    // Offer the title's own moods and formats. Falls back to the criteria the
    // user matched on when the title isn't in our catalog.
    let options = [];
    if (entry) {
        options = [].concat(entry.moods || [], entry.cats || []);
    } else if (window.lastMatchCriteria) {
        const c = window.lastMatchCriteria;
        options = [].concat(normCriteria(c.mood), normCriteria(c.cat));
    }
    options = [...new Set(options)].filter(o => o && o !== 'any').slice(0, 6);

    const blocked = getBlockedCategories();
    const modal = document.getElementById('notforme-modal');
    const list = document.getElementById('notforme-options');
    const titleEl = document.getElementById('notforme-title');
    if (!modal || !list) { window.recordAction('dislike'); return; }

    if (titleEl) titleEl.textContent = globalMatchTitle;

    const pretty = (v) => String(v).replace(/\b\w/g, ch => ch.toUpperCase());
    list.innerHTML = options.map(o => `
        <label class="nfm-option">
            <input type="checkbox" value="${sanitizeDisplayText(o)}" ${blocked.includes(o) ? 'checked disabled' : ''}>
            <span>${sanitizeDisplayText(pretty(o))}${blocked.includes(o) ? ' — already blocked' : ''}</span>
        </label>`).join('') || `<p style="color:#a99cc4;font-size:13px;margin:0;">No categories to block for this title — it'll just be hidden individually.</p>`;

    modal.style.display = 'flex';
};

window.closeNotForMeChooser = function() {
    const m = document.getElementById('notforme-modal');
    if (m) m.style.display = 'none';
};

// Just this one title.
window.notForMeJustThis = function() {
    window.closeNotForMeChooser();
    window.recordAction('dislike');
};

// This title AND every category the user ticked.
window.notForMeBlockCategories = function() {
    const list = document.getElementById('notforme-options');
    const picked = list
        ? Array.from(list.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)')).map(i => i.value)
        : [];

    picked.forEach(c => window.blockCategory(c));
    window.closeNotForMeChooser();

    if (picked.length && window.showToast) {
        showToast(`🚫 ${picked.length === 1 ? '"' + picked[0] + '"' : picked.length + ' categories'} won't be suggested again. Undo in your Profile.`);
    }
    window.recordAction('dislike');
};

window.recordAction = async function(type) {
    if (!globalMatchTitle) return;
    if (!isUserLoggedIn) {
        alert("💎 Join for FREE!\n\nTo save titles to your Portfolio, please create a free account.");
        window.openAuthModal();
        return;
    }

    // Store the resolved stream/listen link and audio flag so the profile can
    // deep-link straight to where the title actually plays.
    const catNow = document.getElementById('q-category')?.value || '';
    const itemObj = {
        title: globalMatchTitle,
        posterUrl: globalMatchPoster,
        platform: globalPlatform,
        streamUrl: (document.getElementById('res-direct-link') || {}).href || platformSearchUrl(globalPlatform, globalMatchTitle),
        isAudio: isAudioCategory(catNow) || (PLATFORMS[globalPlatform] && PLATFORMS[globalPlatform].audio) || false,
        addedAt: Date.now()
    };

    if (type === 'save') {
        if (!inList(savedList, globalMatchTitle)) {
            savedList.push(itemObj);
            showToast(`${itemObj.isAudio ? "🎧 Saved to Listen Later" : "⭐ Saved to Watch Later"}: "${globalMatchTitle}"`);
        } else {
            showToast(`"${globalMatchTitle}" is already saved.`);
        }
    } else if (type === 'seen') {
        if (!inList(seenList, globalMatchTitle)) {
            seenList.push(itemObj);
            showToast(`${itemObj.isAudio ? "🎼 Marked as heard" : "👁️ Marked as seen"}: "${globalMatchTitle}"`);
        } else {
            showToast(`"${globalMatchTitle}" is already marked.`);
        }
    } else if (type === 'like') {
        userRatings[globalMatchTitle] = 5;
        if (!inList(seenList, globalMatchTitle)) seenList.push(itemObj);
        window.playPremiumSound && window.playPremiumSound();
        if (!document.documentElement.classList.contains('reduce-motion') && !matchMedia('(prefers-reduced-motion: reduce)').matches && typeof confetti === 'function') confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 }, colors: ['#E5C158','#FFF0B3','#ffffff'] });
        showToast(`❤️ Loved it! We'll find you more like "${globalMatchTitle}".`);
    } else if (type === 'dislike') {
        userRatings[globalMatchTitle] = 1;
        if (!inList(dislikedList, globalMatchTitle)) dislikedList.push(itemObj);
        // Drop it from Watch Later too — they don't want to see it again anywhere.
        savedList = savedList.filter(i => (i.title || i) !== globalMatchTitle);
        window.matchPolicy?.remember({...itemObj,reason:(getBlockedCategories() || []).join(', ')},'dislike');
        await Promise.race([syncListsToDatabase(),new Promise(resolve=>setTimeout(resolve,6000))]);
        localStorage.setItem('match_rematch_criteria',JSON.stringify(window.getMatchCriteria?.() || window.lastMatchCriteria || {}));
        window.location.href='/profile/profile.html?tab=history&rematch=1';
        return;
    }

    window.matchPolicy?.remember(itemObj,type);
    syncListsToDatabase();
    updateActionButtonStates();
};

// ----------------------------------------------------
// PRIVATE TITLE NOTES (registered users only)
//
// Keyed by title, stored alongside the existing portfolio lists and synced
// to Supabase user metadata the same way they are — so a note follows the
// account across devices, not just the browser it was written in.
//
// Deliberately NOT a public comment system: these are personal notes only
// the author ever sees, surfaced in their own profile history. That avoids
// the entire moderation surface (spam, abuse, defamation, and the legal
// exposure of hosting third-party public speech) that a real public comment
// feature would require, while giving exactly what was asked for.
// ----------------------------------------------------
let titleNotes = {};
try { titleNotes = JSON.parse(localStorage.getItem('match_titleNotes') || '{}'); } catch (e) { titleNotes = {}; }

const NOTE_MAX_LEN = 1000;

window.getTitleNote = function (title) {
    if (!title) return '';
    return (titleNotes && typeof titleNotes[title] === 'object') ? (titleNotes[title].text || '') : '';
};

async function saveTitleNote(title, text) {
    if (!title) return false;
    const clean = String(text || '').slice(0, NOTE_MAX_LEN);

    if (clean.trim() === '') {
        delete titleNotes[title];           // empty note = remove it entirely
    } else {
        titleNotes[title] = {
            text: clean,
            updated: new Date().toISOString()
        };
    }

    try { localStorage.setItem('match_titleNotes', JSON.stringify(titleNotes)); } catch (e) {}

    if (isUserLoggedIn && supabaseClient) {
        try {
            await supabaseClient.auth.updateUser({ data: { title_notes: titleNotes } });
        } catch (e) { console.warn('Note sync deferred:', e); }
    }
    return true;
}

async function syncListsToDatabase() {
    localStorage.setItem('match_seenList', JSON.stringify(seenList));
    localStorage.setItem('match_savedList', JSON.stringify(savedList));
    localStorage.setItem('match_dislikedList', JSON.stringify(dislikedList));
    localStorage.setItem('match_userRatings', JSON.stringify(userRatings));

    if (isUserLoggedIn && supabaseClient) {
        // WRITE TO THE PROFILES TABLE, NOT USER METADATA.
        //
        // This previously went to auth.updateUser({data:...}), which stores
        // everything in auth.users.raw_user_meta_data. That field is capped,
        // and match_history grows without bound — so as a user built up a
        // portfolio the whole write eventually started failing. The failure
        // was caught and console.warn'd, so nothing surfaced: the user kept
        // saving titles, saw them locally, and lost the lot on the next
        // device. That is the data loss being reported.
        //
        // public.profiles already has saved_list, seen_list, disliked_list
        // and user_ratings as jsonb columns — they were created in migration
        // 001 and never written to. Using them removes the size ceiling and
        // puts the data where the rest of the profile already lives.
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return;

            // Save through the account-scoped RPC. It runs server-side as a
            // security definer and derives the profile id from auth.uid(), so
            // portfolio persistence is not dependent on browser/device table
            // grants and can never write another user's profile.
            const { error } = await supabaseClient.rpc('save_portfolio', {
                p_saved_list: savedList,
                p_seen_list: seenList,
                p_disliked_list: dislikedList,
                p_user_ratings: userRatings
            });

            if (error) {
                // Surfaced rather than swallowed. Silent failure here is
                // exactly how a portfolio disappears without anyone noticing.
                console.error('[matchapp] Portfolio sync FAILED:', error.message);
                window.showToast?.('Could not save your list to your account. It is still on this device.', true);
                return;
            }

            // Exclusion keys and history stay in metadata: they are bounded by
            // matchPolicy's own cap and are small, so they do not risk the
            // ceiling that the portfolio arrays did.
            await supabaseClient.auth.updateUser({
                data: {
                    match_exclusion_keys: [...(window.matchPolicy?.known() || [])].slice(0, 500),
                    match_history: (window.matchPolicy?.history() || []).slice(0, 200)
                }
            }).catch(e => console.warn('History sync deferred:', e.message));
        } catch (e) {
            console.error('[matchapp] Portfolio sync error:', e.message);
        }
    }
}

// ----------------------------------------------------
// PREMIUM TOAST (non-blocking replacement for alert popups)
// ----------------------------------------------------
window.showToast = function(message, isError) {
    let host = document.getElementById('toast-host');
    if (!host) {
        host = document.createElement('div');
        host.id = 'toast-host';
        document.body.appendChild(host);
    }
    const t = document.createElement('div');
    t.className = 'match-toast' + (isError ? ' toast-error' : '');
    t.textContent = message;
    host.appendChild(t);
    setTimeout(() => { t.classList.add('toast-out'); setTimeout(() => t.remove(), 500); }, 3600);
};

// ----------------------------------------------------
// "NOT FOR ME" RE-MATCH FLOW
// The disliked title is blacklisted permanently, then the user chooses to
// either re-roll on the same parameters or go back and change them.
// ----------------------------------------------------
window.openRematchPrompt = function(deadTitle) {
    const modal = document.getElementById('rematch-modal');
    const msg = document.getElementById('rematch-message');
    if (!modal) return;
    if (msg) msg.innerHTML = `Got it — <strong style="color:var(--gold)">${sanitizeDisplayText(deadTitle)}</strong> won't be suggested to you again.<br><br>Want another match with the same choices, or would you like to change them first?`;
    modal.style.display = 'flex';
};

window.closeRematchPrompt = function() {
    const modal = document.getElementById('rematch-modal');
    if (modal) modal.style.display = 'none';
};

// Re-roll immediately on the identical parameters.
window.rematchSameParams = function() {
    window.closeRematchPrompt();
    const resultBox = document.getElementById('result-box');
    if (resultBox) resultBox.style.display = 'none';
    // Re-roll on the identical questionnaire selections (not a direct search).
    if (typeof window.triggerMatch === 'function') window.triggerMatch(false);
};

// Send them back up to the questionnaire with a smooth scroll.
window.changeParamsAndRematch = function() {
    window.closeRematchPrompt();
    const resultBox = document.getElementById('result-box');
    if (resultBox) resultBox.style.display = 'none';
    const form = document.getElementById('questionnaire-box') || document.getElementById('q-category');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const catEl = document.getElementById('q-category');
        if (catEl) setTimeout(() => catEl.focus(), 600);
    }
};

// Re-render language-dependent dynamic UI when the user switches language.
document.addEventListener('matchapp:langchange', () => {
    const catEl = document.getElementById('q-category');
    if (catEl && typeof isAudioCategory === 'function') applyAudioModeLabels(isAudioCategory(catEl.value));
    if (typeof window.onCategoryChange === 'function') window.onCategoryChange();
});

// ----------------------------------------------------
// SMART SEARCH ROUTER
// A short entry ("Fallout") is a direct title lookup and runs the normal
// match flow. A natural-language question ("Is there a show about...?")
// goes to the AI discovery page, which returns a ranked list instead.
// ----------------------------------------------------
function looksLikeQuestion(text) {
    const t = text.trim();
    if (t.endsWith('?')) return true;
    const wordCount = t.split(/\s+/).length;
    // Question/qualifier openers, or simply a long descriptive phrase.
    if (/^(is|are|was|were|do|does|did|can|could|should|what|which|who|whom|whose|where|when|why|how|any|show me|find me|give me|recommend|suggest|looking for|i want|i need|something)\b/i.test(t)) return true;
    if (/\b(about|similar to|like .+ but|based on|set in|starring|directed by|with a|that (has|features|deals))\b/i.test(t) && wordCount >= 4) return true;
    return wordCount >= 6;
}

window.askAI = function(question) {
    window.location.href = '/discover.html?q=' + encodeURIComponent(question) + '&focus=start';
};

window.smartSearch = function() {
    const input = document.getElementById('specific-search-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) { if (window.showToast) showToast('Type a title or ask a question first.', true); return; }
    if (looksLikeQuestion(val)) window.askAI(val);
    else window.triggerMatch(true);
};

// ----------------------------------------------------
// CONVERSION FUNNEL TRACKING
// Without these, GA shows pageviews but nothing about what people
// actually DO — which step loses them, which format converts, whether
// share traffic returns. That is the data you optimise revenue on.
// ----------------------------------------------------
function track(event, params) {
    // The site moved from gtag.js to a GTM container. GTM does NOT define a
    // global gtag() function, so every `if (typeof gtag === 'function')` call
    // here silently evaluated false and no custom event was ever recorded —
    // pageviews kept working (GTM handles those) which is exactly why it
    // looked fine. Push to dataLayer instead, which is what GTM listens on.
    try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(Object.assign({ event: event }, params || {}));
    } catch (e) { /* analytics must never break a user action */ }

    // Kept for the case where gtag.js is ever loaded alongside GTM, so a
    // future change back doesn't silently lose events again.
    if (typeof gtag === 'function') gtag('event', event, params || {});

    // Mirror the user-meaningful events into their own local activity log.
    // Mapped rather than logged wholesale: analytics fires plenty of events
    // that mean nothing to a person reading their own history.
    if (window.MatchActivity) {
        const MAP = {
            share:            ['share',    p => p.item_id || 'a match'],
            ai_search:        ['ai',       p => p.search_term || ''],
            save_watch_later: ['save',     p => p.title || ''],
            title_removed:    ['remove',   p => p.title || ''],
            avatar_changed:   ['settings', () => 'Changed profile photo'],
            trending_click:   ['platform', p => p.title || ''],
            match_together_created: ['together', () => 'Started a session'],
            match_together_joined:  ['together', () => 'Joined a session']
        };
        const m = MAP[event];
        if (m) { try { window.MatchActivity.log(m[0], m[1](params || {})); } catch (e) {} }
    }
}
window.track = track;

document.addEventListener('matchapp:newmatch', () => {
    track('match_completed', {
        category:  document.getElementById('q-category')?.value || 'unknown',
        platform:  document.getElementById('q-platform')?.value || 'any',
        mood:      document.getElementById('q-mood')?.value || 'any',
        era:       document.getElementById('q-decade')?.value || 'any',
        logged_in: !!window.isUserLoggedIn,
        is_vip:    !!isVIP
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Which outbound platform actually earns the click — your affiliate signal.
    const streamBtn = document.getElementById('res-direct-link');
    if (streamBtn) streamBtn.addEventListener('click', () => {
        track('stream_click', { platform: window.globalPlatform || 'unknown', title: window.globalMatchTitle || '' });
    });

    const wl = document.getElementById('btn-watch-later');
    if (wl) wl.addEventListener('click', () => track('save_watch_later', { title: window.globalMatchTitle || '' }));

    const seen = document.getElementById('btn-seen-it');
    if (seen) seen.addEventListener('click', () => track('mark_seen', { title: window.globalMatchTitle || '' }));

    const share = document.getElementById('btn-share-match');
    if (share) share.addEventListener('click', () => track('share_sheet_opened', { title: window.globalMatchTitle || '' }));

    // Registration funnel — the single most valuable conversion on the site.
    const reg = document.getElementById('nav-reg-btn');
    if (reg) reg.addEventListener('click', () => track('signup_intent', { source: 'header' }));

    // Scroll depth tells you whether the SEO footer is ever actually reached.
    let depths = { 25: false, 50: false, 75: false, 100: false };
    window.addEventListener('scroll', () => {
        const pct = Math.round(((window.scrollY + window.innerHeight) / document.body.scrollHeight) * 100);
        Object.keys(depths).forEach(d => {
            if (!depths[d] && pct >= d) { depths[d] = true; track('scroll_depth', { percent: Number(d) }); }
        });
    }, { passive: true });
});
// ----------------------------------------------------
// SPOTLIGHT — upcoming premiere countdown + save
// Dates verified against FX/Variety/TVGuide announcements:
// American Horror Story: 13 premieres Thu Sept 24 2026, 9/8c ET,
// on FX and Hulu; internationally on Disney+.
// ----------------------------------------------------
const SPOTLIGHT = {
    title: 'American Horror Story: 13',
    // 9pm ET = 01:00 UTC the following day
    premiereUTC: Date.UTC(2026, 8, 25, 1, 0, 0), // month is 0-indexed: 8 = September
    platform: 'Hulu',
    synopsis: "American Horror Story returns for its thirteenth installment. The official FX premiere is September 24, 2026; check FX, Hulu or your regional Disney+ listing for availability.",
    streamUrl: 'https://www.hulu.com/series/american-horror-story-fbf9ee3c-a5f0-4d1c-9de5-fb1f0e63dcbc'
};

function renderSpotlightCountdown() {
    const el = document.getElementById('spotlight-countdown');
    if (!el) return;
    const diff = SPOTLIGHT.premiereUTC - Date.now();

    if (diff <= 0) {
        el.innerHTML = `<span class="countdown-live">${window.t ? t('spotlight.outNow') : '🔴 Out now — stream it tonight'}</span>`;
        return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const L = {
        d: window.t ? t('spotlight.days') : 'Days',
        h: window.t ? t('spotlight.hours') : 'Hrs',
        m: window.t ? t('spotlight.mins') : 'Min'
    };
    el.innerHTML =
        `<div class="countdown-unit"><span class="countdown-num">${d}</span><span class="countdown-label">${L.d}</span></div>` +
        `<div class="countdown-unit"><span class="countdown-num">${String(h).padStart(2,'0')}</span><span class="countdown-label">${L.h}</span></div>` +
        `<div class="countdown-unit"><span class="countdown-num">${String(m).padStart(2,'0')}</span><span class="countdown-label">${L.m}</span></div>`;
}

window.saveSpotlightTitle = function () {
    let list = [];
    try { list = JSON.parse(localStorage.getItem('match_savedList') || '[]'); } catch (e) {}
    const btn = document.getElementById('spotlight-save-btn');

    if (list.some(i => (i.title || i) === SPOTLIGHT.title)) {
        if (window.showToast) showToast(`"${SPOTLIGHT.title}" is already in your Watch Later.`);
        return;
    }
    list.unshift({
        title: SPOTLIGHT.title,
        posterUrl: document.getElementById('spotlight-poster-img')?.src || '',
        platform: SPOTLIGHT.platform,
        streamUrl: SPOTLIGHT.streamUrl,
        isAudio: false,
        addedAt: Date.now()
    });
    localStorage.setItem('match_savedList', JSON.stringify(list));
    if (btn) { btn.textContent = window.t ? t('spotlight.saved') : '✓ Saved to Watch Later'; btn.classList.add('saved'); }
    if (window.showToast) showToast(`⭐ Saved "${SPOTLIGHT.title}" — we'll be here when it drops.`);
    if (!document.documentElement.classList.contains('reduce-motion') && !matchMedia('(prefers-reduced-motion: reduce)').matches && typeof confetti === 'function') confetti({ particleCount: 70, spread: 60, origin: { y: 0.4 }, colors: ['#E5C158','#d32f2f','#ffffff'] });
    track('save_watch_later', { title: SPOTLIGHT.title, source: 'spotlight' });
};

document.addEventListener('DOMContentLoaded', () => {
    // The spotlight poster is a real committed image (/ahs13-poster.jpg) set
    // directly in the HTML, so it paints on the first frame with no network
    // lookup and no async race.
    //
    // It used to call getRichMetadata() here instead, which was the bug: AHS 13
    // is unreleased, so iTunes has no entry for it — the lookup either returned
    // nothing (leaving the img with its empty src="" and rendering blank) or,
    // worse, returned artwork for an OLDER season, putting the wrong cover on
    // the flagship banner. A dated upcoming title simply cannot be resolved
    // from a catalog of things that already shipped.
    const img = document.getElementById('spotlight-poster-img');
    if (img) {
        // Only a last-resort net: if the file itself ever 404s, fall back to the
        // generated cover rather than showing a broken-image icon.
        img.onerror = function () {
            this.onerror = null;
            this.src = generateLocalPosterSVG(SPOTLIGHT.title);
        };
    }

    if (document.getElementById('spotlight-countdown')) {
        renderSpotlightCountdown();
        document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderSpotlightCountdown();});
        window.addEventListener('focus',renderSpotlightCountdown);
    }

    // Reflect already-saved state on load.
    try {
        const list = JSON.parse(localStorage.getItem('match_savedList') || '[]');
        if (list.some(i => (i.title || i) === SPOTLIGHT.title)) {
            const btn = document.getElementById('spotlight-save-btn');
            if (btn) { btn.textContent = window.t ? t('spotlight.saved') : '✓ Saved to Watch Later'; btn.classList.add('saved'); }
        }
    } catch (e) {}
});

document.addEventListener('matchapp:langchange', renderSpotlightCountdown);

// ----------------------------------------------------
// POST-CHECKOUT SYNC
// Stripe redirects the buyer back to the site the instant payment
// succeeds, but the webhook that actually grants the tier is a separate
// server-to-server call that may land a second or two later. Without
// this, a user who just paid would briefly still see their old limits
// and reasonably think the purchase failed.
//
// So when we return from a checkout, poll match_status() a few times
// until the new tier appears, then confirm it visibly.
// ----------------------------------------------------
async function syncAfterCheckout(){
 const params=new URLSearchParams(location.search);
 if(!params.has('checkout')&&!params.has('success'))return;
 const session=params.get('session_id');
 if(session){location.replace('/purchase.html?session_id='+encodeURIComponent(session)+'&lang='+encodeURIComponent(window.MATCH_LANG||'en'));return;}
 // Older Payment Links may not return a session ID. Refresh actual account state without claiming success.
 params.delete('checkout');params.delete('success');
 history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);
 await window.refreshQuotaStatus?.();window.showToast?.(tSafe('billing.pending', 'Confirming your purchase…'));
}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(syncAfterCheckout,1200);});

document.addEventListener('matchapp:langchange',async()=>{
 updateActionButtonStates();const source=window.currentSynopsisSource;
 if(source&&document.getElementById('res-synopsis')){
  const title=source.title,language=window.MATCH_LANG||'en';document.getElementById('res-synopsis').textContent=tSafe('global.guide');
  window.localizedTitle?.(title).then(name=>{if(window.currentSynopsisSource?.title===title&&(window.MATCH_LANG||'en')===language)document.getElementById('res-title').textContent=name;});
  const text=await window.localizeMatchSynopsis(source.text,source.lang);
  if(window.currentSynopsisSource?.title===title&&(window.MATCH_LANG||'en')===language)document.getElementById('res-synopsis').textContent=text;
 }
});
document.addEventListener('click',event=>{if(event.target.closest('.app-header a,.app-header button:not(.sound-toggle-btn),.app-header select'))window.playPremiumSound?.();});
