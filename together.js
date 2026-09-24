/* ============================================================
   MATCH TOGETHER — two people, one agreed pick.

   Flow:
     1. Host picks their filters, creates a session, shares the link.
     2. Guest opens the link, picks their own filters, submits.
     3. Once 2+ people are in, the overlap is resolved and ONE title is
        published to the session. Both devices poll and reveal the same pick.

   Depends on app.js for CONTENT_CATALOG, PLATFORMS, getRealCoverImage and
   platformSearchUrl, so this file is loaded after it.
   ============================================================ */

const TOGETHER_POLL_MS = 2500;
const TOGETHER_MAX_POLL_MS = 5 * 60 * 1000; // stop polling after 5 idle minutes

let tgState = {
    code: null,
    role: null,        // 'host' | 'guest'
    myName: null,
    pollTimer: null,
    pollStarted: 0,
    resolved: false
};

/* ---------- helpers ---------- */

function tgEl(id) { return document.getElementById(id); }

function tgShow(stepId) {
    ['tg-step-start', 'tg-step-prefs', 'tg-step-waiting', 'tg-step-result', 'tg-step-error']
        .forEach(id => { const el = tgEl(id); if (el) el.style.display = (id === stepId) ? 'block' : 'none'; });
}

function tgReadPrefs() {
    return {
        cat:    (tgEl('tg-category') || {}).value || 'any',
        plat:   (tgEl('tg-platform') || {}).value || 'any',
        mood:   (tgEl('tg-mood')     || {}).value || 'any',
        vibe:   (tgEl('tg-vibe')     || {}).value || 'any',
        rating: (tgEl('tg-rating')   || {}).value || 'any'
    };
}

function tgSupabase() {
    return window.supabaseClient || null;
}

/* ---------- preference overlap ----------
   The interesting part. Rules, in order of how much they matter:

   * RATING takes the MOST RESTRICTIVE value across everyone, never a
     compromise. If one person is watching with a child, the group result must
     respect that — loosening it because someone else picked "mature" would be
     the single worst failure this feature could have.
   * Everything else: if everyone agrees, honour it. If they disagree, widen to
     'any' rather than arbitrarily siding with one person. A pick nobody
     objects to beats a pick that's perfect for one and wrong for the other.
*/
const RATING_RANK = {
    'kids': 0,
    'all ages family friendly': 1,
    'tween PG': 2,
    'teen PG-13': 3,
    'mature adults only R rated': 4,
    'any': 5
};

function tgResolvePrefs(participants) {
    const prefs = participants.map(p => p.prefs || {});
    const agree = (key) => {
        const vals = prefs.map(p => p[key] || 'any').filter(v => v && v !== 'any');
        if (vals.length === 0) return 'any';
        const first = vals[0];
        return vals.every(v => v === first) ? first : 'any';
    };

    // Strictest rating wins, including when only one person expressed one.
    let rating = 'any';
    let bestRank = Infinity;
    for (const p of prefs) {
        const r = p.rating || 'any';
        const rank = RATING_RANK[r] !== undefined ? RATING_RANK[r] : 5;
        if (rank < bestRank) { bestRank = rank; rating = r; }
    }

    return {
        cat:    agree('cat'),
        plat:   agree('plat'),
        mood:   agree('mood'),
        vibe:   agree('vibe'),
        rating: rating,
        // Surfaced in the UI so people can see WHY they got what they got.
        agreedOn: ['cat', 'plat', 'mood', 'vibe'].filter(k => agree(k) !== 'any')
    };
}

/* ---------- session actions ---------- */

window.tgCreateSession = async function () {
    const name = (tgEl('tg-name') || {}).value || '';
    const sb = tgSupabase();
    if (!sb) return tgError('Connection unavailable. Please refresh and try again.');

    tgSetBusy('tg-create-btn', true);
    try {
        const {data:{user}} = await sb.auth.getUser();
        if (!user) { tgError(t('polish.hostSignIn')); window.openAuthModal?.(); return; }
        const { data, error } = await sb.rpc('create_match_session', {
            p_name: name.trim() || 'Host',
            p_prefs: tgReadPrefs()
        });
        if (error) throw error;
        if (!data || !data.ok) throw new Error((data && data.error) || 'create_failed');

        tgState.code = data.code;
        tgState.role = 'host';
        tgState.myName = name.trim() || 'Host';

        tgRenderShare(data.code);
        tgShow('tg-step-waiting');
        tgStartPolling();
    } catch (e) {
        tgError(tgFriendlyError(e));
    } finally {
        tgSetBusy('tg-create-btn', false);
    }
};

window.tgJoinSession = async function () {
    const name = (tgEl('tg-name') || {}).value || '';
    const sb = tgSupabase();
    if (!sb) return tgError('Connection unavailable. Please refresh and try again.');

    tgSetBusy('tg-join-btn', true);
    try {
        const { data, error } = await sb.rpc('join_match_session', {
            p_code: tgState.code,
            p_name: name.trim() || 'Guest',
            p_prefs: tgReadPrefs()
        });
        if (error) throw error;
        if (!data || !data.ok) throw new Error((data && data.error) || 'join_failed');

        tgState.role = 'guest';
        tgState.myName = name.trim() || 'Guest';
        tgShow('tg-step-waiting');
        tgStartPolling();
        // A guest arriving is usually the moment the session becomes resolvable.
        tgTryResolve(data.participants);
    } catch (e) {
        tgError(tgFriendlyError(e));
    } finally {
        tgSetBusy('tg-join-btn', false);
    }
};

/* ---------- polling ---------- */

function tgStartPolling() {
    tgStopPolling();
    tgState.pollStarted = Date.now();
    tgState.pollTimer = setInterval(tgPoll, TOGETHER_POLL_MS);
    tgPoll();
}

function tgStopPolling() {
    if (tgState.pollTimer) { clearInterval(tgState.pollTimer); tgState.pollTimer = null; }
}

async function tgPoll() {
    if (!tgState.code || tgState.resolved) return;

    // Don't poll a dead session forever — it burns battery and API calls.
    if (Date.now() - tgState.pollStarted > TOGETHER_MAX_POLL_MS) {
        tgStopPolling();
        const note = tgEl('tg-waiting-note');
        if (note) note.textContent = 'Still waiting. Tap refresh below when your friend has joined.';
        const rb = tgEl('tg-refresh-btn');
        if (rb) rb.style.display = 'inline-flex';
        return;
    }

    const sb = tgSupabase();
    if (!sb) return;
    try {
        const { data, error } = await sb.rpc('get_match_session', { p_code: tgState.code });
        if (error || !data || !data.ok) return;

        tgRenderParticipants(data.participants || []);

        if (data.status === 'matched' && data.result) {
            tgState.resolved = true;
            tgStopPolling();
            tgRenderResult(data.result, data.participants || []);
            return;
        }
        tgTryResolve(data.participants || []);
    } catch (e) { /* transient — next tick retries */ }
}

window.tgManualRefresh = function () {
    tgState.pollStarted = Date.now();
    const rb = tgEl('tg-refresh-btn');
    if (rb) rb.style.display = 'none';
    tgStartPolling();
};

/* ---------- resolution ---------- */

async function tgTryResolve(participants) {
    if (tgState.role !== 'host') return;
    if (tgState.resolved) return;
    if (!participants || participants.length < 2) return;

    const merged = tgResolvePrefs(participants);
    await window.matchPolicy?.ready();
    const candidates = typeof CONTENT_CATALOG!=='undefined' ? CONTENT_CATALOG.filter(e=>participants.every(p=>window.matchPolicy?.matches(e,p.prefs||{})) && !isBlockedEntry(e) && !SESSION_SHOWN.has(e.title)) : [];
    const pick=candidates[Math.floor(Math.random()*candidates.length)];
    if(!pick){const note=tgEl('tg-waiting-note');if(note)note.textContent='No fresh title fits everyone’s exact choices. Start a new match with different criteria, or use private Friends for account-wide exclusions for both users.';return;}
    const payload = {
        title: pick.title,
        synopsis: pick.synopsis,
        platform: pick.platform,
        platformVerified: true,
        watchUrl: pick.watchUrl || null,
        merged: merged
    };

    const sb = tgSupabase();
    if (!sb) return;
    try {
        // First write wins server-side, so if both devices resolve at once they
        // still converge on one title instead of showing different picks.
        const { data, error } = await sb.rpc('set_match_session_result', {
            p_code: tgState.code, p_result: payload
        });
        if (error || !data || !data.ok) return;
        tgState.resolved = true;
        tgStopPolling();
        tgRenderResult(data.result, participants);
    } catch (e) { /* next poll retries */ }
}

/* ---------- rendering ---------- */

function tgRenderShare(code) {
    const link = `${location.origin}/together.html?s=${encodeURIComponent(code)}`;
    const linkEl = tgEl('tg-share-link');
    if (linkEl) linkEl.value = link;
    const codeEl = tgEl('tg-share-code');
    if (codeEl) codeEl.textContent = code;

    // Every channel now carries the FULL invite — subject, message, link —
    // rather than a bare URL with a six-word caption. Composed in one place
    // (buildInvite, contacts.js) so no channel can drift out of sync.
    const invite = tgInvite(link);

    const wa = tgEl('tg-share-whatsapp');
    if (wa) wa.href = `https://wa.me/?text=${encodeURIComponent(invite.text)}`;
    const tel = tgEl('tg-share-telegram');
    if (tel) tel.href = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(invite.message)}`;

    tgMountChannels();
    tgRenderContacts();
}

/* The host's own name, so the invite reads "Ana here!" rather than arriving
   from nobody. Already collected on the previous step. */
function tgHostName() {
    const el = document.getElementById('tg-name');
    return (el && el.value.trim()) || (window.MATCH_DISPLAY_NAME || '');
}

function tgInvite(link) {
    link = link || (tgEl('tg-share-link') || {}).value || location.href;
    return (typeof window.buildInvite === 'function')
        ? window.buildInvite(link, { fromName: tgHostName(), kind: 'together' })
        : { subject: "Let's watch something together", message: "Let's find something to watch together 🍿",
            link, body: link, text: "Let's find something to watch together 🍿 " + link };
}

/* ---------- send directly / saved contacts ---------- */

let tgChannel = 'email';

function tgMountChannels() {
    const host = tgEl('tg-channel-picker');
    if (!host || !window.MATCH_CHANNELS) return;
    host.innerHTML = Object.entries(window.MATCH_CHANNELS).map(([k, c]) =>
        `<button type="button" class="tg-channel${k === tgChannel ? ' is-on' : ''}" data-ch="${k}" ` +
        `role="radio" aria-checked="${k === tgChannel}" title="${c.label}" aria-label="${c.label}">${c.icon}</button>`
    ).join('');

    host.onclick = (ev) => {
        const btn = ev.target.closest('[data-ch]');
        if (!btn) return;
        tgChannel = btn.dataset.ch;
        const ch = window.MATCH_CHANNELS[tgChannel];
        const input = tgEl('tg-send-value');
        if (input && ch) {
            input.type = ch.inputType;
            input.placeholder = ch.placeholder;
        }
        tgMountChannels();
    };
}

function tgRenderContacts() {
    const host = tgEl('tg-contacts');
    if (!host || typeof window.getWatchContacts !== 'function') return;
    const list = window.getWatchContacts();
    if (!list.length) { host.innerHTML = ''; return; }

    host.innerHTML = list.slice(0, 8).map(c => {
        const ch = (window.MATCH_CHANNELS || {})[c.channel] || { icon: '📤' };
        const safe = String(c.name).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
        return `<span class="tg-contact" role="button" tabindex="0" data-send="${c.id}">` +
               `${ch.icon} ${safe}` +
               `<button type="button" class="tg-contact-x" data-remove="${c.id}" aria-label="Remove ${safe}">×</button></span>`;
    }).join('');

    host.onclick = (ev) => {
        const rm = ev.target.closest('[data-remove]');
        if (rm) { ev.stopPropagation(); window.removeWatchContact(rm.dataset.remove); return; }
        const send = ev.target.closest('[data-send]');
        if (send) tgSendToSaved(send.dataset.send);
    };
}

function tgSendToSaved(id) {
    const c = (window.getWatchContacts() || []).find(x => x.id === id);
    if (!c) return;
    window.touchWatchContact(id);
    window.sendInvite(c.channel, c.value, tgInvite());
    if (window.showToast) showToast(`📤 Invite ready for ${c.name} — the message is already written.`);
}

window.tgSendInvite = function () {
    const input = tgEl('tg-send-value');
    const value = input ? input.value.trim() : '';
    if (!value) {
        if (window.showToast) showToast('Enter who to send it to first.', true);
        if (input) input.focus();
        return;
    }
    if (tgChannel === 'email' && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value)) {
        if (window.showToast) showToast("That doesn't look like an email address — check it and try again.", true);
        input.focus();
        return;
    }

    window.sendInvite(tgChannel, value, tgInvite());

    const save = tgEl('tg-save-contact');
    if (save && save.checked && typeof window.saveWatchContact === 'function') {
        const nameEl = tgEl('tg-save-name');
        window.saveWatchContact({ name: nameEl ? nameEl.value : '', channel: tgChannel, value });
        if (nameEl) nameEl.value = '';
        tgRenderContacts();
        if (window.showToast) showToast('✅ Saved — next time they are one tap away.');
    }
    if (input) input.value = '';
};

document.addEventListener('matchapp:contactschange', tgRenderContacts);

window.tgCopyLink = async function () {
    const el = tgEl('tg-share-link');
    if (!el) return;
    try {
        await navigator.clipboard.writeText(el.value);
        if (window.showToast) showToast('📋 Link copied — send it to whoever you\'re watching with.');
    } catch (e) {
        el.select();
        if (window.showToast) showToast('Select and copy the link above.', true);
    }
};

window.tgShareNative = async function () {
    const el = tgEl('tg-share-link');
    if (!el) return;
    // Same complete invite the other channels send, not a caption.
    const text = tgInvite(el.value).message;
    try {
        if (navigator.share) {
            await navigator.share({ title: 'Match Together', text, url: el.value });
        } else {
            window.tgCopyLink();
        }
    } catch (e) { /* dismissed */ }
};

function tgRenderParticipants(list) {
    const el = tgEl('tg-participants');
    if (!el) return;
    el.innerHTML = list.map(p => `
        <div class="tg-person">
            <span class="tg-person-dot"></span>
            <span class="tg-person-name">${tgEscape(p.name || 'Guest')}</span>
            ${p.is_host ? '<span class="tg-person-tag">host</span>' : ''}
        </div>
    `).join('');

    const count = tgEl('tg-participant-count');
    if (count) count.textContent = list.length;
}

function tgRenderResult(result, participants) {
    if(window.matchPolicy?.known().has(window.matchPolicy.key(result.title))){tgError('This shared title is already in your history. Use private Friends for a shared match that excludes both users’ previous titles.');return;}
    tgShow('tg-step-result');

    const names = (participants || []).map(p => p.name || 'Guest');
    const who = tgEl('tg-result-who');
    if (who) {
        who.textContent = names.length === 2
            ? `${names[0]} + ${names[1]}`
            : `${names.length} people`;
    }

    const t = tgEl('tg-result-title');
    if (t) t.textContent = result.title || '';
    const s = tgEl('tg-result-synopsis');
    if (s) s.textContent = result.synopsis || '';

    const badge = tgEl('tg-result-platform');
    if (badge) {
        badge.textContent = result.platform || '';
        badge.style.display = result.platform ? 'inline-block' : 'none';
    }

    // Show what everyone actually agreed on — makes the pick feel reasoned
    // rather than random, which is the whole point of doing this together.
    const agreed = tgEl('tg-result-agreed');
    if (agreed) {
        const m = result.merged || {};
        const bits = [];
        if (m.cat && m.cat !== 'any') bits.push(m.cat);
        if (m.mood && m.mood !== 'any') bits.push(m.mood);
        if (m.vibe && m.vibe !== 'any') bits.push(m.vibe);
        if (m.plat && m.plat !== 'any') bits.push(`on ${m.plat}`);
        if (m.rating && m.rating !== 'any') bits.push(m.rating);
        agreed.innerHTML = bits.length
            ? `You both agreed on: <strong>${tgEscape(bits.join(' · '))}</strong>`
            : `Your picks were quite different, so this one works for everyone.`;
    }

    // Poster — same never-fail chain as the solo flow, and now the same
    // disambiguation hints too. This used to call getRealCoverImage with no
    // hints at all, which is the exact "Hell's Paradise" class of bug in a
    // second rendering path: a catalog title with a real, known year/country
    // was being looked up as if neither existed.
    const img = tgEl('tg-result-poster');
    if (img && result.title) {
        img.src = generateLocalPosterSVG(result.title,result);
        img.onerror=()=>{img.onerror=null;img.src=generateLocalPosterSVG(result.title,result);};
        let posterHints = {};
        try {
            if (typeof CONTENT_CATALOG !== 'undefined') {
                const e = CONTENT_CATALOG.find(x => x.title === result.title);
                if (e) posterHints = { year: e.year, country: e.country, countryCode: e.countryCode, cats: e.cats };
            }
        } catch (err) {}
        const promote = url => {
            if (!url) return;
            const probe = new Image();
            probe.onload = () => { if (img.isConnected) img.src = url; };
            probe.onerror = () => {};
            probe.src = url;
        };
        if (window.MatchAppCatalogMedia?.resolvePoster) {
            const cat = result?.merged?.cat && result.merged.cat !== 'any' ? [result.merged.cat] : [];
            const kind = window.tmdbKindForCats?.(cat) || '';
            window.MatchAppCatalogMedia.resolvePoster(result.title,{
                year:result.year||'',cats:cat,kind,priority:true
            }).then(r => promote(r?.url)).catch(() => {
                if (typeof getRealCoverImage === 'function') {
                    getRealCoverImage(result.title, posterHints).then(promote).catch(() => {});
                }
            });
        } else if (typeof getRealCoverImage === 'function') {
            getRealCoverImage(result.title, posterHints).then(promote).catch(() => {});
        }
    }

    const shareHost=document.createElement('div');shareHost.id='tg-social-card';
    document.getElementById('tg-social-card')?.remove();
    tgEl('tg-step-result')?.append(shareHost);
    window.matchShareCard?.mount(shareHost,result.title);
    // Watch link — verified deep link if we have one, else platform search.
    const link = tgEl('tg-result-link');
    if (link) {
        if (result.watchUrl) {
            link.href = result.watchUrl;
        } else if (result.platform && typeof platformSearchUrl === 'function') {
            link.href = platformSearchUrl(result.platform, result.title);
        } else {
            link.href = `https://www.justwatch.com/us/search?q=${encodeURIComponent(result.title)}`;
        }
        link.textContent = result.platform ? `▶ Watch on ${result.platform}` : '▶ Find Where To Stream';
    }

    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 95, origin: { y: 0.6 },
                   colors: ['#E5C158', '#FFF3A3', '#A376B6', '#ffffff'] });
    }
    if (typeof window.playTogetherSound === 'function') window.playTogetherSound();
}

function tgEscape(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function tgSetBusy(btnId, busy) {
    const b = tgEl(btnId);
    if (!b) return;
    b.disabled = busy;
    b.style.opacity = busy ? '0.6' : '1';
    if (busy) { b.dataset.label = b.textContent; b.textContent = 'Working…'; }
    else if (b.dataset.label) { b.textContent = b.dataset.label; }
}

function tgFriendlyError(e) {
    const msg = (e && (e.message || e.error || e)) + '';
    if (msg.includes('not_found'))   return "That session code doesn't exist. Check the link and try again.";
    if (msg.includes('expired'))     return 'That session has expired. Sessions last 24 hours — start a new one.';
    if (msg.includes('session_full'))return 'That session is full (6 people max).';
    if (msg.includes('invalid_prefs'))return 'Something went wrong reading your choices. Please try again.';
    // The RPCs live in migration 005; say so plainly rather than showing a raw error.
    if (msg.includes('function') || msg.includes('does not exist') || msg.includes('schema cache')) {
        return 'Match Together is still being set up on the server. Please try again shortly.';
    }
    return 'Something went wrong. Please try again.';
}

function tgError(message) {
    tgShow('tg-step-error');
    const el = tgEl('tg-error-text');
    if (el) el.textContent = message;
}

/* ---------- boot ---------- */

function tgInit() {
    const params = new URLSearchParams(location.search);
    const code = (params.get('s') || '').trim().toUpperCase();

    if (code) {
        // Arrived from a shared link → guest path.
        tgState.code = code;
        tgState.role = 'guest';
        const heading = tgEl('tg-prefs-heading');
        if (heading) heading.textContent = 'Your turn — what are you in the mood for?';
        const sub = tgEl('tg-prefs-sub');
        if (sub) sub.textContent = 'Pick your side of it. We\'ll find something you both actually want.';
        const createBtn = tgEl('tg-create-btn');
        if (createBtn) createBtn.style.display = 'none';
        const joinBtn = tgEl('tg-join-btn');
        if (joinBtn) joinBtn.style.display = 'flex';
        tgShow('tg-step-prefs');
    } else {
        tgShow('tg-step-start');
    }
}

window.tgBeginHost = function () {
    tgShow('tg-step-prefs');
};

document.addEventListener('DOMContentLoaded', () => { setTimeout(tgInit, 60); });
