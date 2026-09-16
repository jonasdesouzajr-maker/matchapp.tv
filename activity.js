/* ============================================================
   MatchApp — Activity log

   A rolling record of what the user did: matches, AI questions, saves,
   removals, shares, purchases, platform clicks.

   DELIBERATELY LOCAL-ONLY.
   This never leaves the device. Two reasons, and the privacy one matters
   more: a server-side behavioural log of what someone watches, searches and
   buys is genuinely sensitive data, and MatchApp has no need for it — the
   feature exists so the USER can see their own history, not so we can.
   Keeping it in localStorage also means no table, no migration, no RLS
   policy, and no breach surface.

   RETENTION is user-controlled: entries stay until the owner deletes them
   (or the localStorage ceiling is hit). We never auto-wipe history.
   ============================================================ */

(function () {
    'use strict';

    const KEY = 'match_activity';
    const RETENTION_DAYS = 0;    // 0 = keep forever until the user deletes an entry
    const MAX_ENTRIES = 800;     // a hard ceiling so a heavy user cannot fill the quota

    const TYPES = {
        match:    { icon: '🎬', label: 'Match' },
        ai:       { icon: '🤖', label: 'AI question' },
        save:     { icon: '⭐', label: 'Saved' },
        remove:   { icon: '🗑', label: 'Removed' },
        seen:     { icon: '👁', label: 'Marked seen' },
        share:    { icon: '📤', label: 'Shared' },
        purchase: { icon: '💳', label: 'Purchase' },
        platform: { icon: '▶',  label: 'Opened' },
        together: { icon: '🤝', label: 'Match Together' },
        settings: { icon: '⚙️', label: 'Settings' }
    };

    function read() {
        let list = [];
        try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
        if (!Array.isArray(list)) return [];

        // Keep every entry until the user deletes it. Only drop broken rows.
        return list.filter(e => e && e.ts);
    }

    function write(list) {
        try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES))); }
        catch (e) {
            // Quota is shared with saved lists and avatars, which matter more
            // than history. Halve the log and retry once rather than letting
            // an activity write break something the user actually needs.
            try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, Math.floor(MAX_ENTRIES / 2)))); } catch (e2) {}
        }
    }

    window.MatchActivity = {
        /* Newest first, so the panel needs no sorting and a prepend is O(1). */
        log(type, detail, meta) {
            if (!TYPES[type]) return;
            const list = read();
            list.unshift({
                ts: Date.now(),
                type: type,
                detail: String(detail || '').slice(0, 160),   // cap: a pasted AI question can be long
                meta: meta || null
            });
            write(list);
            document.dispatchEvent(new CustomEvent('matchapp:historychange'));
            // Repaint only if the panel happens to be open.
            if (document.getElementById('activity-list')) window.renderActivity();
        },

        all() { return read(); },

        removeAt(ts) {
            write(read().filter(e => e.ts !== ts));
            document.dispatchEvent(new CustomEvent('matchapp:historychange'));
        },

        clear() {
            try { localStorage.removeItem(KEY); } catch (e) {}
            document.dispatchEvent(new CustomEvent('matchapp:historychange'));
        },

        TYPES,
        RETENTION_DAYS
    };

    /* ---------- rendering ---------- */

    function timeAgo(ts) {
        const s = Math.floor((Date.now() - ts) / 1000);
        if (s < 60)    return 'just now';
        if (s < 3600)  return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        const d = Math.floor(s / 86400);
        return d === 1 ? 'yesterday' : d + 'd ago';
    }

    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    window.renderActivity = function () {
        const box = document.getElementById('activity-list');
        if (!box) return;
        const filterEl = document.getElementById('activity-filter');
        const filter = filterEl ? filterEl.value : '';

        let items = read();
        if (filter) {
            // "save" in the dropdown covers both directions of the same action,
            // which is how a user thinks about it.
            const group = filter === 'save' ? ['save', 'remove', 'seen'] : [filter];
            items = items.filter(e => group.includes(e.type));
        }

        const countEl = document.getElementById('activity-count');
        if (!items.length) {
            box.innerHTML = '<p class="activity-empty">Nothing here yet. Matches, Ask AI titles and saves stay here until you remove them.</p>';
            if (countEl) countEl.textContent = '';
            return;
        }

        box.innerHTML = items.map(e => {
            const t = TYPES[e.type] || { icon: '•', label: e.type };
            return `<div class="activity-row">
                <span class="activity-icon" aria-hidden="true">${t.icon}</span>
                <div class="activity-main">
                    <span class="activity-label">${esc(t.label)}</span>
                    <span class="activity-detail">${esc(e.detail)}</span>
                </div>
                <span class="activity-time">${timeAgo(e.ts)}</span>
                <button type="button" class="activity-del" onclick="deleteActivity(${e.ts})"
                        aria-label="Delete this entry" title="Delete this entry">&times;</button>
            </div>`;
        }).join('');

        if (countEl) {
            countEl.textContent = `${items.length} entr${items.length === 1 ? 'y' : 'ies'} · kept until you remove them.`;
        }
    };

    window.deleteActivity = function (ts) {
        window.MatchActivity.removeAt(ts);
        window.renderActivity();
    };

    window.clearActivity = function () {
        if (!confirm('Delete your entire activity history? This cannot be undone.')) return;
        window.MatchActivity.clear();
        window.renderActivity();
        if (window.showToast) showToast('Activity history cleared.');
    };

    /* ---------- automatic capture ----------
       Hooked to events the app already dispatches, rather than sprinkling
       log() calls through every feature — fewer places to forget, and no
       behaviour change in the features themselves. */
    document.addEventListener('matchapp:newmatch', () => {
        const t = window.globalMatchTitle;
        if (t) window.MatchActivity.log('match', t, { platform: window.globalPlatform || '' });
    });
    document.addEventListener('matchapp:settingschanged', (e) => {
        if (e.detail && e.detail.key && e.detail.key !== '*') {
            window.MatchActivity.log('settings', 'Changed ' + e.detail.key);
        }
    });
    document.addEventListener('matchapp:creditschanged', (e) => {
        if (e.detail) window.MatchActivity.log('purchase', 'Credits now ' + e.detail.credits);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.renderActivity());
    } else {
        window.renderActivity();
    }
})();
