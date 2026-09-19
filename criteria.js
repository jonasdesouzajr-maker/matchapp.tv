/* ============================================================
   MATCHAPP — MULTI-SELECT CRITERIA

   WHAT CHANGED AND WHY

   Every field in the match form was a native <select>: exactly one answer per
   criterion. That is the wrong shape for the question being asked. "Netflix or
   Max", "funny or cozy", "a movie or a K-drama" are all ordinary ways to feel
   about an evening, and a single-choice control forces the user to throw away
   most of what they actually meant before the matcher ever sees it.

   Each field is now a set of toggleable chips. Tick as many as apply; the
   matcher treats the set as "any of these is acceptable" and intersects across
   fields. Ticking nothing means no constraint on that field, which is exactly
   what "Any / Surprise Me" used to mean.

   WHY THE <select> ELEMENTS ARE STILL HERE

   They are kept in the DOM, hidden, and kept in sync with the first ticked
   value. Roughly twenty places across app.js, together.js and discover.js read
   `document.getElementById('q-platform').value` and similar. Rewriting all of
   them to understand arrays would have been a large, risky change for no user
   benefit; keeping the select as a compatibility mirror means every one of
   those call sites keeps working unchanged while the matcher reads the full
   set through window.getMatchCriteria().

   The selects also remain the single source of truth for the OPTIONS
   themselves — labels, grouping and translation all still live in the HTML and
   are handled by i18n.js exactly as before. This file reads them and renders
   chips; it never hardcodes a label. That is why chips re-render on
   matchapp:langchange rather than carrying their own copy of the strings.
   ============================================================ */

(function () {
    'use strict';

    const FIELDS = [
        { id: 'q-category', key: 'cat',    collapseAfter: 8 },
        { id: 'q-platform', key: 'plat',   collapseAfter: 8 },
        { id: 'q-genre',    key: 'genre',  collapseAfter: 10 },
        { id: 'q-mood',     key: 'mood',   collapseAfter: 12 },
        { id: 'q-vibe',     key: 'vibe',   collapseAfter: 11 },
        { id: 'q-decade',   key: 'decade', collapseAfter: 6 },
        { id: 'q-rating',   key: 'rating', collapseAfter: 12 }
    ];

    const STORE_KEY = 'match_criteria_v1';

    /* Categories that only ever match when explicitly ticked. Mirrors the
       inverse of SURPRISE_ME_CATEGORIES in app.js. Used purely to mark the
       chip in the UI — the actual gating is enforced by the matcher, never by
       this file, so a mismatch here can only ever be cosmetic. */
    const OPT_IN_MARKED = new Set([
        'News', 'Sports', 'Classical Music', 'Gospel & Faith',
        'podcast', 'Spotify playlist', 'Spotify single', 'music album',
        'audiobook', 'YouTube channel', 'YouTube Shorts', 'documentary'
    ]);

    const state = Object.create(null);
    FIELDS.forEach(f => { state[f.key] = []; });

    function load() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            FIELDS.forEach(f => {
                if (Array.isArray(saved[f.key])) state[f.key] = saved[f.key].filter(v => typeof v === 'string');
            });
        } catch (e) { /* corrupt or unavailable storage is not a reason to break the form */ }
    }

    function save() {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
    }

    /* The public read. Returns plain arrays; an empty array means "no
       constraint on this field". app.js normalises whatever it is given, so
       this shape and the old single-string shape are both valid inputs. */
    window.getMatchCriteria = function () {
        const out = Object.create(null);
        FIELDS.forEach(f => { out[f.key] = state[f.key].slice(); });
        return out;
    };

    /* Programmatic set — used by the "match again with the same criteria"
       path and by anything that wants to preselect the form (a deep link, a
       saved preset, the Together flow). */
    window.setMatchCriteria = function (patch) {
        if (!patch) return;
        FIELDS.forEach(f => {
            if (!(f.key in patch)) return;
            const v = patch[f.key];
            state[f.key] = (Array.isArray(v) ? v : [v])
                .map(x => String(x || '').trim())
                .filter(x => x && x !== 'any');
        });
        const unique = Object.values(state).flat();
        if(unique.includes('funny'))state.mood=state.mood.filter(v=>v==='funny'||!window.matchPolicy?.incompatible(v,{mood:['funny']}));
        save();
        renderAll();
    };

    /* Keep the hidden native select pointing at the first ticked value so the
       existing `.value` readers see something sensible rather than a stale
       choice. With nothing ticked it returns to the 'any' sentinel. */
    function syncSelect(sel, key) {
        const first = state[key][0];
        const has = first && Array.prototype.some.call(sel.options, o => o.value === first);
        sel.value = has ? first : 'any';
        // Anything listening for a change on these selects (the platform hint
        // under the Platform field, for one) has to hear about it.
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // A removed option must not survive in saved state as an invisible filter.
    // Reconcile in field order: category changes can rebuild platform options.
    function reconcileField(sel, key) {
        const allowed = new Set(Array.from(sel.options, option => option.value));
        const next = [...new Set(state[key].filter(value => value !== 'any' && allowed.has(value)))];
        const changed = next.length !== state[key].length || next.some((value, i) => value !== state[key][i]);
        state[key] = next;
        return changed;
    }

    function toggle(key, value, sel) {
        const list = state[key];
        const at = list.indexOf(value);
        if (at >= 0) list.splice(at, 1); else if (!window.matchPolicy?.incompatible(value,state)) list.push(value);
        save();
        syncSelect(sel, key);
        renderAll();
        document.dispatchEvent(new CustomEvent('matchapp:criteriachange', { detail: window.getMatchCriteria() }));
    }

    function clearField(key, sel) {
        state[key] = [];
        save();
        syncSelect(sel, key);
        renderAll();
        document.dispatchEvent(new CustomEvent('matchapp:criteriachange', { detail: window.getMatchCriteria() }));
    }

    /* Reads the option list straight off the select, preserving optgroup
       structure so long lists stay navigable. */
    function optionModel(sel) {
        const groups = [];
        let loose = null;
        Array.prototype.forEach.call(sel.children, node => {
            if (node.tagName === 'OPTGROUP') {
                groups.push({
                    label: node.label,
                    options: Array.prototype.map.call(node.children, o => ({ value: o.value, label: o.textContent.trim() }))
                });
            } else if (node.tagName === 'OPTION') {
                if (node.value === 'any') return;  // the "any" sentinel is the Clear chip
                if (!loose) { loose = { label: '', options: [] }; groups.unshift(loose); }
                loose.options.push({ value: node.value, label: node.textContent.trim() });
            }
        });
        return groups;
    }

    function anyLabel(sel) {
        const opt = Array.prototype.find.call(sel.options, o => o.value === 'any');
        return opt ? opt.textContent.trim() : 'Any';
    }

    function renderField(sel, key) {
        const host = sel.parentElement.querySelector('.crit-chips');
        if (!host) return;

        const picked = state[key];
        const expanded = host.dataset.expanded === '1';
        const field = FIELDS.find(f => f.key === key);
        const groups = optionModel(sel);

        // Flatten for the collapse count, but keep group boundaries so an
        // expanded long list still reads as organised rather than as 30 loose
        // chips in a heap.
        let shown = 0;
        const limit = expanded ? Infinity : (field ? field.collapseAfter : 10);
        let total = 0;
        groups.forEach(g => { total += g.options.length; });

        const parts = [];

        // The Clear chip. Active precisely when nothing else is — so the
        // control always shows one lit state and the user can always get back
        // to "no opinion" in one tap.
        parts.push(
            '<button type="button" class="crit-chip crit-any' + (picked.length ? '' : ' is-on') + '" ' +
            'data-clear="1" aria-pressed="' + (picked.length ? 'false' : 'true') + '">' +
            escapeHtml(anyLabel(sel)) + '</button>'
        );

        groups.forEach(g => {
            const visible = [];
            g.options.forEach(o => {
                const on = picked.includes(o.value);
                // A ticked chip is ALWAYS rendered, even past the collapse
                // limit. Hiding something the user has selected behind a
                // "show more" is how a form silently lies about its own state.
                if (on || shown < limit) {
                    if (!on) shown++;
                    visible.push(o);
                }
            });
            if (!visible.length) return;
            if (g.label) parts.push('<span class="crit-group">' + escapeHtml(g.label) + '</span>');
            visible.forEach(o => {
                const on = picked.includes(o.value);
                const optIn = OPT_IN_MARKED.has(o.value);
                parts.push(
                    '<button type="button" class="crit-chip' + (on ? ' is-on' : '') + (optIn ? ' crit-optin' : '') + '" ' +
                    'data-value="' + escapeHtml(o.value) + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
                    (window.matchPolicy?.incompatible(o.value,state) && !on ? ' disabled aria-disabled="true" title="Conflicts with a mood you selected. Untick that mood first."' : (optIn ? ' title="Only ever matches when you tick it — never shows up in a Surprise Me draw."' : '')) +
                    '>' + escapeHtml(o.label) + '</button>'
                );
            });
        });

        if (total > (field ? field.collapseAfter : 10)) {
            parts.push(
                '<button type="button" class="crit-chip crit-more" data-toggle-more="1">' +
                (expanded ? tr('crit.less', 'Show less')
                          : tr('crit.more', 'Show all') + ' (' + total + ')') +
                '</button>'
            );
        }

        host.innerHTML = parts.join('');

        const count = sel.parentElement.querySelector('.crit-count');
        if (count) {
            count.textContent = picked.length ? picked.length : '';
            count.style.display = picked.length ? 'inline-flex' : 'none';
        }

        // Keep the collapsed row's summary honest — a field that is folded
        // shut still has to say what is ticked inside it, or the user has to
        // open all six to find out what they chose. Names come from the same
        // label lookup the chips use, so a translation change can't desync it.
        const summary = sel.parentElement.querySelector('.crit-toggle-summary');
        if (summary) {
            if (!picked.length) {
                summary.textContent = tr('crit.anyLabel', 'Any');
                summary.classList.add('is-empty');
            } else {
                const names = picked.map(v => {
                    const opt = Array.from(sel.options).find(o => o.value === v);
                    return opt ? opt.textContent.trim() : v;
                });
                const shown = names.slice(0, 2).join(', ');
                summary.textContent = names.length > 2 ? shown + ' +' + (names.length - 2) : shown;
                summary.classList.remove('is-empty');
            }
        }
    }

    // i18n.js returns an empty string for a key it has no entry for — not the
    // key itself — so a `t(key) !== key` guard silently resolves to "" and the
    // chip renders as a bare "+" with no label. Treat anything falsy or equal
    // to the key as a miss and fall back.
    function tr(key, fallback) {
        if (typeof window.t !== 'function') return fallback;
        const v = window.t(key);
        return (v && v !== key) ? v : fallback;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function mountField(f) {
        const sel = document.getElementById(f.id);
        if (!sel || sel.dataset.critMounted === '1') return;

        const wrap = sel.parentElement;
        if (!wrap) return;

        sel.dataset.critMounted = '1';
        sel.classList.add('crit-native');
        // Hidden rather than removed — see the header note on why the native
        // select has to stay readable by the rest of the app.
        sel.setAttribute('aria-hidden', 'true');
        sel.tabIndex = -1;

        // A counter badge next to the field label, so a collapsed field still
        // tells you how many things are ticked inside it.
        const label = wrap.querySelector('label');
        if (label && !label.querySelector('.crit-count')) {
            const badge = document.createElement('span');
            badge.className = 'crit-count';
            badge.style.display = 'none';
            label.appendChild(badge);
        }

        const host = document.createElement('div');
        host.className = 'crit-chips';
        host.setAttribute('role', 'group');
        if (label) host.setAttribute('aria-label', label.textContent.trim());
        sel.insertAdjacentElement('afterend', host);

        // COLLAPSE THE FIELD ITSELF.
        // Six fields with twenty-plus chips each is well over a hundred
        // buttons stacked down the page — the form reads as a wall, and the
        // Match button ends up far below the fold. Each field now collapses
        // to a single row showing what is ticked, and opens on tap to choose.
        // The chips are unchanged underneath, so selection behaviour, the
        // "+N more" expander and the counter badge all keep working.
        // A distinct icon per field. With six rows collapsed to one line each,
        // an icon lets the eye find the row it wants by shape instead of
        // reading six labels top to bottom every time.
        const FIELD_ICONS = {
            'q-category': '🎬', 'q-platform': '📺', 'q-genre': '🎭', 'q-mood': '💫',
            'q-vibe': '⚡', 'q-decade': '🕰️', 'q-rating': '🔞'
        };

        if (label && !wrap.querySelector('.crit-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'crit-toggle';
            toggleBtn.setAttribute('aria-expanded', 'false');

            const labelText = label.textContent.trim();
            label.style.display = 'none';

            const icon = FIELD_ICONS[sel.id] || '•';
            toggleBtn.innerHTML =
                '<span class="crit-toggle-icon" aria-hidden="true">' + icon + '</span>' +
                '<span class="crit-toggle-label">' + labelText + '</span>' +
                '<span class="crit-toggle-summary"></span>' +
                '<span class="crit-toggle-chevron" aria-hidden="true">⌄</span>';

            wrap.insertBefore(toggleBtn, label);
            wrap.classList.add('crit-collapsible');

            toggleBtn.addEventListener('click', () => {
                const open = wrap.classList.toggle('crit-open');
                toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }

        host.addEventListener('click', (ev) => {
            const btn = ev.target.closest('button');
            if (!btn) return;
            ev.preventDefault();
            if (btn.dataset.toggleMore) {
                host.dataset.expanded = host.dataset.expanded === '1' ? '0' : '1';
                renderField(sel, f.key);
                return;
            }
            if (btn.dataset.clear) { clearField(f.key, sel); return; }
            if (btn.dataset.value != null) toggle(f.key, btn.dataset.value, sel);
        });

        if (reconcileField(sel, f.key)) save();
        renderField(sel, f.key);
        syncSelect(sel, f.key);
    }

    function renderAll() {
        let changed = false;
        FIELDS.forEach(f => {
            const sel = document.getElementById(f.id);
            if (sel && sel.dataset.critMounted === '1') {
                changed = reconcileField(sel, f.key) || changed;
                renderField(sel, f.key); syncSelect(sel, f.key);
            }
        });
        if (changed) save();
    }

    function init() {
        load();
    const rematch = new URLSearchParams(location.search).get('rematch');
    if (rematch === 'new') FIELDS.forEach(f => { state[f.key]=[]; });
    if (rematch === 'same') {
        try { const previous=JSON.parse(localStorage.getItem('match_rematch_criteria') || '{}');FIELDS.forEach(f=>{if(Array.isArray(previous[f.key]))state[f.key]=previous[f.key];}); } catch (_) {}
    }
    if (rematch) { const form=document.getElementById('questionnaire-box');if(form){form.style.display='block';if(window.MatchAppScrollGate?.canAutoScroll?.())form.scrollIntoView({behavior:'smooth',block:'start'});} }
        FIELDS.forEach(mountField);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    // Labels live in the HTML and are translated in place by i18n.js, so the
    // only correct response to a language change is to re-read them.
    document.addEventListener('matchapp:langchange', renderAll);
    document.addEventListener('matchapp:optionspruned', renderAll);
})();
