/* ============================================================
   © 2026 MatchApp.tv — All Rights Reserved.
   Proprietary source code. Not licensed for reproduction, scraping,
   or reuse in competing products. See /terms.html Section 4.
   ============================================================ */

/* ============================================================
   MatchApp — SOCIAL SHARE & REWARD ENGINE
   Renders a branded share card on <canvas> from the user's match,
   opens the native share sheet (or per-network intents), and grants
   a bonus match — capped at 3 rewards per rolling 6 hours.
   ============================================================ */

const SHARE_WINDOW_MS = 6 * 60 * 60 * 1000;  // 6 hours
const SHARE_MAX_REWARDS = 3;
const SHARE_TAGS = '#MatchAppAi #MatchAppTV #FindWhatToWatch #StreamingGuide #MovieNight';
const SHARE_POSTER = '/assets/brand/matchapp-share-poster.png?v=20260926-selected1';
const SHARE_URL = 'https://matchapp.tv/';

/* ---------- Reward accounting ---------- */
function getShareLog() {
    try {
        const raw = JSON.parse(localStorage.getItem('match_shareLog') || '[]');
        const cutoff = Date.now() - SHARE_WINDOW_MS;
        return raw.filter(ts => ts > cutoff);
    } catch (e) { return []; }
}
function shareRewardsLeft() { return !window.isUserLoggedIn && window.MatchAppGuestShare?.remainingShares ? window.MatchAppGuestShare.remainingShares() : Math.max(0, SHARE_MAX_REWARDS - getShareLog().length); }
window.shareRewardsLeft = shareRewardsLeft;

function nextRewardResetText() {
    const log = getShareLog();
    if (log.length < SHARE_MAX_REWARDS) return '';
    const oldest = Math.min(...log);
    const mins = Math.max(1, Math.ceil((oldest + SHARE_WINDOW_MS - Date.now()) / 60000));
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Server-enforced when signed in (claim_share_reward RPC), local otherwise.
// A reward is real Match currency: it accumulates and stays until a Match uses it.
async function grantShareReward() {
    if (window.isUserLoggedIn && window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient.rpc('claim_share_reward');
            if (error) throw error;
            if (data && data.granted) {
                if (window.refreshQuotaStatus) await window.refreshQuotaStatus();
                return {
                    ok: true,
                    left: data.remaining_rewards,
                    matches: Number(data.purchased_matches ?? data.matches) || 0
                };
            }
            return { ok: false, left: 0, resetIn: (data && data.reset_in_seconds) || 0 };
        } catch (e) {
            // Never mint a client-side paid/reward balance for a signed-in
            // account when the authoritative server grant failed.
            console.warn('Share reward RPC unavailable:', e.message || e);
            return { ok: false, left: shareRewardsLeft(), serverUnavailable: true };
        }
    }
    // Guests are rewarded ONLY after independent official public-post proof
    // through guest-social-proof. A native handoff is not publication proof.
    return {ok:false,left:shareRewardsLeft(),verificationRequired:true};

}

window.grantShareReward = grantShareReward;

/* ---------- Share card renderer ---------- */
function loadImage(src) {
    return new Promise(resolve => {
        if (!src) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

function wrapText(ctx, text, maxWidth) {
    const words = String(text).split(' ');
    const lines = []; let line = '';
    for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
        else line = test;
    }
    if (line) lines.push(line);
    return lines;
}

// MatchApp's selected official poster is the ONLY exported image for
// adult match sharing. Draw it at its natural resolution without cropping.
window.buildShareCard = async function() {
    const poster = await loadImage(SHARE_POSTER);
    if (!poster) throw new Error('official_share_poster_unavailable');
    const canvas = document.createElement('canvas');
    canvas.width = poster.naturalWidth || poster.width;
    canvas.height = poster.naturalHeight || poster.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('share_canvas_unavailable');
    context.drawImage(poster, 0, 0);
    return canvas;
};

function canvasToBlob(canvas) {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
}

/* ---------- Share flow ---------- */
window.openShareSheet = async function() {
    const title = window.globalMatchTitle;
    if (!title) { if (window.showToast) showToast('Get a match first, then share it!', true); return; }

    // Content-safety gate, checked here too (not just at the button) so this
    // can never be bypassed by calling the function directly.
    if (window.currentMatchShareRestricted) {
        if (window.getAnotherMatchInstead) window.getAnotherMatchInstead();
        return;
    }

    // Adult guest sharing uses a fresh server-issued code and an actual
    // public-post check. Member rewards keep their original server RPC.
    if (!window.isUserLoggedIn) {
        if (window.MatchAppGuestShare?.open) {
            window.MatchAppGuestShare.open({
                kind:'match',title,
                token:'watch:'+String(window.__matchappMatchRunId||title),
                message:shareText(),
                url:'https://matchapp.tv/',
                onNext:()=>window.MatchAppGuestShare.matchReward()
            });
        } else window.showToast?.('Verified public-post sharing is currently unavailable.',true);
        return;
    }

    const modal = document.getElementById('share-modal');
    const preview = document.getElementById('share-preview');
    const statusEl = document.getElementById('share-reward-status');

    // Restore the normal share state — a previous share may have swapped the
    // sheet over to the reward screen, which would otherwise persist and leave
    // the platform buttons hidden the next time this opens.
    const sheet = document.querySelector('#share-modal .share-sheet');
    const rewardScreen = document.getElementById('share-reward-screen');
    if (rewardScreen) rewardScreen.style.display = 'none';
    if (sheet) {
        sheet.querySelectorAll('.share-native, .share-grid, .share-utils, .share-how, .share-sub').forEach(el => { el.style.display = ''; });
    }
    if (preview) preview.style.display = '';
    if (statusEl) statusEl.style.display = '';

    if (modal) modal.style.display = 'flex';
    if (preview) preview.innerHTML = '<div class="share-spinner"></div>';

    // A failed image load must not silently reuse a previous match's card.
    window._shareCanvas = null;
    let canvas;
    try {
        canvas = await window.buildShareCard();
    } catch (_) {
        if (preview) preview.textContent = 'Official MatchApp Ai poster temporarily unavailable. Please try again.';
        window.showToast?.('Could not load the official share poster. Please retry.', true);
        return;
    }
    window._shareCanvas = canvas;
    if (preview) {
        preview.innerHTML = '';
        canvas.style.width = 'min(100%, 300px)';
        canvas.style.maxHeight = 'min(57dvh, 500px)';
        canvas.style.objectFit = 'contain';
        canvas.style.height = 'auto';
        canvas.style.borderRadius = '14px';
        canvas.style.border = '1px solid rgba(229,193,88,0.5)';
        preview.appendChild(canvas);
    }

    let left = shareRewardsLeft();
    if (window.refreshQuotaStatus) {
        const st = await window.refreshQuotaStatus();
        if (st && typeof st.share_rewards_left === 'number') left = st.share_rewards_left;
    }
    if (statusEl) {
        const guestTrial=!window.isUserLoggedIn && !!window.MatchAppGuestShare;
        statusEl.innerHTML = left > 0
            ? guestTrial
                ? `🎁 Share this and unlock <strong>+1 Match</strong> — ${left} of your 2 guest share rewards left.`
                : `🎁 Share this and earn <strong>+1 bonus match</strong> — <strong>${left}</strong> of ${SHARE_MAX_REWARDS} bonus matches left this 6-hour window.`
            : guestTrial
                ? `You've used both guest share bonuses. Register free for more Matches and AI prompts!`
                : `⏳ You've claimed all ${SHARE_MAX_REWARDS} bonus matches for now. Next one unlocks in <strong>${nextRewardResetText()}</strong>. You can still share!`;
    }
};

window.closeShareSheet = function() {
    const modal = document.getElementById('share-modal');
    if (modal) modal.style.display = 'none';
};

function shareText() {
    return `Find YOUR Perfect Match with MatchApp Ai ✨ Discover movies, series and more by mood, format and platform. Start free: ${SHARE_URL}\n\n${SHARE_TAGS}`;
}

// Native share sheet (mobile) — attaches the generated image when supported.
window.shareNative = async function() {
    if (!window.isUserLoggedIn) return window.openShareSheet();
    const canvas = window._shareCanvas;
    const text = shareText();
    try {
        if (canvas && navigator.canShare) {
            const blob = await canvasToBlob(canvas);
            const file = new File([blob], 'matchapp-ai-share-poster.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], text, title: 'MatchApp Ai | Find Your Perfect Match' });
                return afterShare('native');
            }
        }
        if (navigator.share) {
            await navigator.share({ title: 'MatchApp Ai | Find Your Perfect Match', text, url: SHARE_URL });
            return afterShare('native');
        }
        // No native share support. Previously this silently downloaded the card to
        // the user's device — writing a file nobody asked for. Copy the caption
        // instead and point at the explicit Save Image button if they want the asset.
        await window.copyShareText(true);
        if (window.showToast) showToast('📋 Caption copied — pick a platform below, or tap Save Image for the card.');
    } catch (e) { /* user dismissed the sheet */ }
};

// Only ever runs from the explicit "Save Image" button — never automatically.
window.downloadShareCard = function() {
    const canvas = window._shareCanvas;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'matchapp-ai-share-poster.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    if (window.showToast) showToast('⬇️ Card saved to your device.');
};

window.copyShareText = async function(silent) {
    try {
        await navigator.clipboard.writeText(shareText());
        if (!silent && window.showToast) showToast('📋 Caption + link copied. A copied caption is not counted as a completed share.');
    } catch (e) { if (window.showToast) showToast('Could not copy — select the text manually.', true); }
};

let pendingExternalShare = null;
function externalShareStatus(network) {
    const statusEl = document.getElementById('share-reward-status');
    const name = network === 'x' ? 'X' : network.charAt(0).toUpperCase() + network.slice(1);
    if (statusEl) statusEl.innerHTML = `↗ Finish sharing on <strong>${name}</strong>, then return here and confirm it to unlock the bonus. MatchApp cannot read your activity inside another social network.`;
    let btn = document.getElementById('share-confirm-external');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'share-confirm-external';
        btn.type = 'button';
        btn.className = 'gold-btn';
        btn.style.cssText = 'width:100%;margin:10px 0 0;';
        btn.addEventListener('click', async () => {
            if (!pendingExternalShare) return;
            const age = Date.now() - pendingExternalShare.startedAt;
            if (age < 1200) {
                if (window.showToast) showToast('Finish the share first, then come back to claim the bonus.');
                return;
            }
            const network = pendingExternalShare.network;
            pendingExternalShare = null;
            btn.hidden = true;
            await afterShare(network + '-confirmed');
        });
        const reward = document.getElementById('share-reward-status');
        reward?.insertAdjacentElement('afterend', btn);
    }
    btn.hidden = false;
    btn.textContent = '✓ I shared it — unlock +1 Match';
}
function markExternalShareStarted(network) {
    pendingExternalShare = {network, startedAt: Date.now()};
    externalShareStatus(network);
}

// Per-network web intents can hand the visitor to the social network, but the
// browser cannot inspect that other origin to prove a post was actually sent.
// Native Web Share is the only path where completion can be observed directly.
// Web intents therefore require an explicit confirmation after the visitor
// returns instead of silently awarding a Match for opening a tab or copying text.
window.shareTo = function(network) {
    if (!window.isUserLoggedIn) return window.openShareSheet();
    const text = encodeURIComponent(shareText());
    const url = encodeURIComponent(SHARE_URL);
    const map = {
        whatsapp: `https://api.whatsapp.com/send?text=${text}%20${url}`,
        x:        `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`,
        telegram: `https://t.me/share/url?url=${url}&text=${text}`,
        reddit:   `https://www.reddit.com/submit?url=${url}&title=${encodeURIComponent('MatchApp AI matched me with ' + (window.globalMatchTitle || ''))}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        pinterest:`https://pinterest.com/pin/create/button/?url=${url}&description=${text}`
    };
    if (network === 'instagram' || network === 'tiktok') {
        window.copyShareText(true);
        const dest = network === 'instagram' ? 'https://www.instagram.com/' : 'https://www.tiktok.com/';
        window.open(dest, '_blank', 'noopener');
        markExternalShareStarted(network);
        if (window.showToast) showToast(`📋 Caption copied. Tap Save Image for the official poster, publish it on ${network === 'instagram' ? 'Instagram' : 'TikTok'}, then return to confirm.`);
        return;
    }
    if (map[network]) {
        window.open(map[network], '_blank', 'noopener,width=640,height=620');
        markExternalShareStarted(network);
    }
};

/* ============================================================
   SEND TO A PERSON

   Everything above broadcasts to a feed. This sends the match to one named
   person with the message already written, and remembers them on the channel
   they were reached on — see contacts.js, which owns both the invite copy and
   the address book so the Together flow and this sheet can never drift apart.
   ============================================================ */

let _shareChannel = 'email';

function shareInvite() {
    // Deep-link to the title itself rather than the homepage. discover.html
    // already answers ?q=, so the recipient lands on the thing being
    // recommended instead of on a form asking them what they feel like —
    // which is not what someone who was just sent a recommendation wants.
    const link = window.globalMatchTitle
        ? SHARE_URL + 'discover.html?q=' + encodeURIComponent(window.globalMatchTitle)
        : SHARE_URL;
    if (typeof window.buildInvite !== 'function') {
        return { subject: 'A pick from MatchApp', message: shareText(), link,
                 body: shareText() + '\n\n' + link, text: shareText() + '\n' + link };
    }
    return window.buildInvite(link, {
        kind: 'result',
        title: window.globalMatchTitle || '',
        platform: window.globalPlatform || '',
        fromName: (typeof window.getUserNickname === 'function' ? window.getUserNickname() : '')
    });
}

function shareMountChannels() {
    const host = document.getElementById('share-channel-picker');
    if (!host || !window.MATCH_CHANNELS) return;
    host.innerHTML = Object.entries(window.MATCH_CHANNELS).map(([k, c]) =>
        `<button type="button" class="tg-channel${k === _shareChannel ? ' is-on' : ''}" data-ch="${k}" ` +
        `role="radio" aria-checked="${k === _shareChannel}" title="${c.label}" aria-label="${c.label}">${c.icon}</button>`
    ).join('');
    host.onclick = (ev) => {
        const btn = ev.target.closest('[data-ch]');
        if (!btn) return;
        _shareChannel = btn.dataset.ch;
        const ch = window.MATCH_CHANNELS[_shareChannel];
        const input = document.getElementById('share-send-value');
        if (input && ch) { input.type = ch.inputType; input.placeholder = ch.placeholder; }
        shareMountChannels();
    };
}

function shareRenderContacts() {
    const host = document.getElementById('share-contacts');
    if (!host || typeof window.getWatchContacts !== 'function') return;
    const list = window.getWatchContacts();
    if (!list.length) { host.innerHTML = ''; return; }
    const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    host.innerHTML = list.slice(0, 8).map(c => {
        const ch = (window.MATCH_CHANNELS || {})[c.channel] || { icon: '📤' };
        return `<span class="tg-contact" role="button" tabindex="0" data-send="${c.id}">${ch.icon} ${esc(c.name)}` +
               `<button type="button" class="tg-contact-x" data-remove="${c.id}" aria-label="Remove ${esc(c.name)}">×</button></span>`;
    }).join('');
    host.onclick = (ev) => {
        const rm = ev.target.closest('[data-remove]');
        if (rm) { ev.stopPropagation(); window.removeWatchContact(rm.dataset.remove); return; }
        const send = ev.target.closest('[data-send]');
        if (!send) return;
        const c = window.getWatchContacts().find(x => x.id === send.dataset.send);
        if (!c) return;
        window.touchWatchContact(c.id);
        window.sendInvite(c.channel, c.value, shareInvite());
        afterShare(c.channel);
    };
}

window.shareSendInvite = function () {
    const input = document.getElementById('share-send-value');
    const value = input ? input.value.trim() : '';
    if (!value) {
        if (window.showToast) showToast('Enter who to send it to first.', true);
        if (input) input.focus();
        return;
    }
    if (_shareChannel === 'email' && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value)) {
        if (window.showToast) showToast("That doesn't look like an email address — check it and try again.", true);
        input.focus();
        return;
    }
    window.sendInvite(_shareChannel, value, shareInvite());

    const save = document.getElementById('share-save-contact');
    if (save && save.checked && typeof window.saveWatchContact === 'function') {
        const nameEl = document.getElementById('share-save-name');
        window.saveWatchContact({ name: nameEl ? nameEl.value : '', channel: _shareChannel, value });
        if (nameEl) nameEl.value = '';
        shareRenderContacts();
    }
    if (input) input.value = '';
    afterShare(_shareChannel);
};

document.addEventListener('matchapp:contactschange', shareRenderContacts);
document.addEventListener('DOMContentLoaded', () => { shareMountChannels(); shareRenderContacts(); });

let _rewardedThisCard = false;

// Post-share success state: swaps the sheet's body for a clear confirmation and
// a single obvious next action, instead of asking the user to close the modal
// and go hunting for the match button themselves.
function showRewardScreen(left) {
    const sheet = document.querySelector('#share-modal .share-sheet');
    if (!sheet) return;

    ['share-preview', 'share-reward-status', 'share-claim-note'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    sheet.querySelectorAll('.share-native, .share-grid, .share-utils, .share-how, .share-sub').forEach(el => { el.style.display = 'none'; });

    let panel = document.getElementById('share-reward-screen');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'share-reward-screen';
        panel.className = 'share-reward-screen';
        sheet.appendChild(panel);
    }
    const leftLine = (typeof left === 'number')
        ? `<p class="srs-sub">${left} of ${SHARE_MAX_REWARDS} bonus matches left in this 6-hour window.</p>`
        : '';
    panel.innerHTML = `
        <div class="srs-icon">🎁</div>
        <h3 class="srs-title">Bonus Match Unlocked!</h3>
        <p class="srs-body">Thanks for sharing. Your extra match is ready — a fresh pick with different characteristics.</p>
        ${leftLine}
        <button onclick="matchAgainFromShare()" class="gold-btn srs-cta">⚡ Match Again</button>
        <button onclick="closeShareSheet()" class="srs-secondary">Maybe later</button>
    `;
    panel.style.display = 'block';
}

// Closes the sheet and immediately runs the bonus match the user just earned.
window.matchAgainFromShare = function() {
    window.closeShareSheet();
    if (typeof window.getAnotherMatchInstead === 'function') {
        window.getAnotherMatchInstead();
    } else if (typeof window.triggerMatch === 'function') {
        window.triggerMatch(window.lastMatchWasSpecificSearch === true);
    }
};

async function afterShare(network) {
    if (typeof window.track === 'function') window.track('share', { method: network, content_type: 'match', item_id: window.globalMatchTitle || '' });
    if (_rewardedThisCard) return;

    const result = await grantShareReward();
    const statusEl = document.getElementById('share-reward-status');
    if (result.ok) {
        _rewardedThisCard = true;
        if (!window.isUserLoggedIn && window.MatchAppGuestShare?.matchReward) {
            // After a completed guest share, dismiss the result and start the
            // earned +1 Match with the SAME filters (never fabricate a result).
            if (statusEl) statusEl.textContent = '🎁 +1 Match unlocked — finding your next pick…';
            await window.MatchAppGuestShare.matchReward();
            return;
        }
        if (statusEl) statusEl.innerHTML = `🎉 <strong>Bonus match unlocked!</strong> ${result.left} of ${SHARE_MAX_REWARDS} left this window.`;
        if (window.showToast) showToast('🎁 Thanks for sharing! +1 Match saved until you use it.');
        if (typeof confetti === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const compact = matchMedia('(max-width: 820px)').matches || document.documentElement.classList.contains('matchapp-android');
            confetti({ particleCount: compact ? 16 : 30, spread: 72, origin: { y: 0.62 }, colors: ['#E5C158', '#FFF3A3', '#A376B6', '#ffffff'], disableForReducedMotion: true });
        }
        showRewardScreen(result.left);
    } else if (statusEl) {
        if (result.serverUnavailable) {
            statusEl.textContent = 'Could not verify the reward right now. Your account balance was not changed — please try sharing again.';
            return;
        }
        const mins = result.resetIn ? Math.ceil(result.resetIn / 60) : null;
        const when = mins ? (mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins}m`) : nextRewardResetText();
        statusEl.innerHTML = `⏳ All ${SHARE_MAX_REWARDS} bonus matches claimed. Next unlocks in <strong>${when}</strong>. Thanks for sharing!`;
    }
}

// A fresh match makes the next share rewardable again.
document.addEventListener('matchapp:newmatch', () => {
    _rewardedThisCard = false;
    pendingExternalShare = null;
    const confirm = document.getElementById('share-confirm-external');
    if (confirm) confirm.hidden = true;
});