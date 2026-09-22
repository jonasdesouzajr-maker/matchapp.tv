/* ============================================================
   MATCHAPP AVATARS & IDENTITY

   THE BUG THIS FIXES: the Google sign-in photo was never broken at the
   data layer. handle_new_user() copies avatar_url out of Google's metadata
   into the profiles row, and hydrateProfileFromAuth() mirrors it into
   localStorage as 'match_user_avatar'. But NOTHING ever read that key to
   render it — the only code that displayed the nav avatar read
   'match_custom_avatar', which is set exclusively when the user manually
   uploads a file. So the photo was fetched, stored, and then ignored.

   Resolution order, most-specific first:
     1. match_custom_avatar  — a file the user uploaded themselves
     2. match_preset_avatar  — one of the presets below they picked
     3. match_user_avatar    — the photo from Google sign-in
     4. null                 — render the empty circle, which invites a choice

   Presets are drawn SVG rather than emoji or hosted images: they render
   identically on every device, need no network request, cost nothing to
   serve, and can be colour-matched to the brand.
   ============================================================ */

const AVATAR_PRESETS = {
    clapper:  { label: 'Clapperboard', bg: '#2A1A47', fg: '#E5C158',
        art: '<rect x="14" y="30" width="52" height="34" rx="4" fill="currentColor"/><path d="M14 30 L20 18 L30 18 L24 30 Z M30 30 L36 18 L46 18 L40 30 Z M46 30 L52 18 L62 18 L56 30 Z" fill="currentColor"/>' },
    popcorn:  { label: 'Popcorn', bg: '#3A1218', fg: '#FF9BA8',
        art: '<path d="M26 34 L30 66 L50 66 L54 34 Z" fill="currentColor"/><circle cx="30" cy="28" r="8" fill="currentColor"/><circle cx="42" cy="24" r="9" fill="currentColor"/><circle cx="52" cy="30" r="7" fill="currentColor"/>' },
    ticket:   { label: 'Cinema Ticket', bg: '#14331F', fg: '#7DE8A0',
        art: '<path d="M16 30 h48 v10 a6 6 0 0 0 0 12 v10 H16 V52 a6 6 0 0 0 0-12 Z" fill="currentColor"/><line x1="40" y1="32" x2="40" y2="60" stroke="#14331F" stroke-width="3" stroke-dasharray="4 4"/>' },
    vinyl:    { label: 'Vinyl Record', bg: '#33240F', fg: '#F0C878',
        art: '<circle cx="40" cy="42" r="24" fill="currentColor"/><circle cx="40" cy="42" r="10" fill="#33240F"/><circle cx="40" cy="42" r="3.5" fill="currentColor"/>' },
    headset:  { label: 'Headphones', bg: '#1B2A4A', fg: '#8FD6FF',
        art: '<path d="M18 46 a22 22 0 0 1 44 0" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><rect x="13" y="44" width="12" height="20" rx="5" fill="currentColor"/><rect x="55" y="44" width="12" height="20" rx="5" fill="currentColor"/>' },
    tv:       { label: 'Retro TV', bg: '#181430', fg: '#B0A0F0',
        art: '<rect x="16" y="30" width="48" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="5"/><line x1="28" y1="18" x2="36" y2="30" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><line x1="52" y1="18" x2="44" y2="30" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>' },
    star:     { label: 'Star', bg: '#3A3012', fg: '#FFE88F',
        art: '<path d="M40 18 L47 36 L66 36 L51 47 L57 65 L40 54 L23 65 L29 47 L14 36 L33 36 Z" fill="currentColor"/>' },
    mask:     { label: 'Drama Mask', bg: '#3A1830', fg: '#FFA8D8',
        art: '<path d="M20 26 h40 v20 a20 20 0 0 1 -40 0 Z" fill="currentColor"/><circle cx="32" cy="38" r="3.5" fill="#3A1830"/><circle cx="48" cy="38" r="3.5" fill="#3A1830"/><path d="M31 52 a10 8 0 0 0 18 0" fill="none" stroke="#3A1830" stroke-width="3" stroke-linecap="round"/>' },
    rocket:   { label: 'Sci-Fi Rocket', bg: '#12303A', fg: '#8FE0F0',
        art: '<path d="M40 16 c10 10 14 24 14 34 H26 c0-10 4-24 14-34 Z" fill="currentColor"/><circle cx="40" cy="36" r="5" fill="#12303A"/><path d="M26 50 L18 62 L30 58 Z M54 50 L62 62 L50 58 Z" fill="currentColor"/>' },
    ghost:    { label: 'Horror Ghost', bg: '#1A1218', fg: '#E88F9B',
        art: '<path d="M22 62 V38 a18 18 0 0 1 36 0 v24 l-6-6 -6 6 -6-6 -6 6 -6-6 Z" fill="currentColor"/><circle cx="33" cy="38" r="3.5" fill="#1A1218"/><circle cx="47" cy="38" r="3.5" fill="#1A1218"/>' },
    mic:      { label: 'Microphone', bg: '#2A1A47', fg: '#C9A7E8',
        art: '<rect x="33" y="16" width="14" height="26" rx="7" fill="currentColor"/><path d="M25 38 a15 15 0 0 0 30 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><line x1="40" y1="54" x2="40" y2="64" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>' },
    heart:    { label: 'Romance Heart', bg: '#3A1220', fg: '#FFA0B8',
        art: '<path d="M40 64 C40 64 16 48 16 34 C16 25 24 20 31 24 C35 26 38 30 40 34 C42 30 45 26 49 24 C56 20 64 25 64 34 C64 48 40 64 40 64 Z" fill="currentColor"/>' }
};

function avatarSVG(key, size) {
    const p = AVATAR_PRESETS[key];
    if (!p) return null;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="${size || 80}" height="${size || 80}">
        <rect width="80" height="80" rx="40" fill="${p.bg}"/>
        <g color="${p.fg}">${p.art}</g>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
window.avatarSVG = avatarSVG;
window.AVATAR_PRESETS = AVATAR_PRESETS;

/** The image the user should currently see, or null for the empty circle. */
function resolveUserAvatar() {
    try {
        // MatchApp Avatar Studio is canonical. It replaces photo uploads and
        // is mirrored to profiles.avatar_url for cross-device use.
        const studio = localStorage.getItem('match_avatar_svg');
        if (studio) return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(studio);
        const cloud = localStorage.getItem('match_user_avatar');
        if (cloud) return cloud;
        // Legacy values are read-only fallbacks for accounts not migrated yet.
        const preset = localStorage.getItem('match_preset_avatar');
        if (preset && AVATAR_PRESETS[preset]) return avatarSVG(preset, 96);
    } catch (e) {}
    return null;
}
window.resolveUserAvatar = resolveUserAvatar;

/**
 * Paints every avatar slot on the page. Safe to call repeatedly — it's called
 * on load, after sign-in, and after any avatar change, and simply re-reads
 * whatever is current.
 */
function renderUserAvatar() {
    const src = resolveUserAvatar();
    const loggedIn = !!(window.isUserLoggedIn);

    document.querySelectorAll('[data-avatar-slot]').forEach(slot => {
        const img = slot.querySelector('img');
        const empty = slot.querySelector('.avatar-empty');
        if (src) {
            if (img) {
                img.src = src;
                img.style.display = 'block';
                // A Google-hosted photo can 404 or be blocked; fall back to the
                // empty circle rather than showing a broken image icon.
                img.onerror = function () {
                    this.onerror = null;
                    this.style.display = 'none';
                    if (empty) empty.style.display = 'flex';
                };
            }
            if (empty) empty.style.display = 'none';
        } else {
            if (img) img.style.display = 'none';
            if (empty) empty.style.display = 'flex';
        }
        // Online dot: shown only while actually signed in.
        const dot = slot.querySelector('.avatar-online-dot');
        if (dot) dot.style.display = loggedIn ? 'block' : 'none';
    });
}
window.renderUserAvatar = renderUserAvatar;

/** Nickname the AI should address the user by. Falls back to their real name. */
function getUserNickname() {
    try {
        const nick = (localStorage.getItem('match_user_nickname') || '').trim();
        if (nick) return nick;
        const name = (localStorage.getItem('match_user_name') || '').trim();
        // First name only — "Hey Jonas" reads better than the full legal name.
        if (name) return name.split(/\s+/)[0];
    } catch (e) {}
    return '';
}
window.getUserNickname = getUserNickname;

document.addEventListener('DOMContentLoaded', () => {
    renderUserAvatar();
    // Re-render shortly after load too: sign-in hydration is async, so the
    // Google photo often lands a moment after DOMContentLoaded fires.
    setTimeout(renderUserAvatar, 1200);
    setTimeout(renderUserAvatar, 3000);
});

// The timers above are a guess at when auth will land; this is the actual
// signal. Kept alongside them rather than replacing them, because the photo
// itself is written to localStorage by profile hydration, which can finish
// after the auth event — belt and braces on the one element that told the
// user whether they are signed in at all.
document.addEventListener('matchapp:avatarchange', renderUserAvatar);

document.addEventListener('matchapp:authchange', () => {
    renderUserAvatar();
    setTimeout(renderUserAvatar, 900);
});
