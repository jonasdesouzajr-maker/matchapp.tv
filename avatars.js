/* Account photos come only from the current verified Auth provider identities.
 * Legacy custom uploads, studio SVGs, presets and profile-row photos are ignored.
 * This is display-only: it never edits Auth, Storage, profiles or account data. */
(function () {
    'use strict';
    if (window.MatchAppAccountPhoto || /^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(location.pathname)) return;
    let owner = '', photo = null, revision = 0, pending = null;
    const failed = new Set(), bindings = new WeakMap(), visibility = new WeakMap();

    function safePhoto(value) {
        if (typeof value !== 'string' || !value.trim()) return null;
        try {
            const url = new URL(value.trim());
            return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url.href : null;
        } catch (_) { return null; }
    }
    function fromUser(user) {
        if (!user || typeof user.id !== 'string' || !user.id || user.is_anonymous || !Array.isArray(user.identities)) return null;
        const preferred = String(user.app_metadata?.provider || '').toLowerCase();
        const identities = user.identities.filter(identity => {
            const provider = String(identity?.provider || '').toLowerCase();
            return provider && provider !== 'email' && provider !== 'phone' &&
                (identity.user_id == null || identity.user_id === user.id) && identity.identity_data && typeof identity.identity_data === 'object';
        }).slice().sort((a, b) => {
            const ap = String(a.provider).toLowerCase(), bp = String(b.provider).toLowerCase();
            return Number(bp === preferred) - Number(ap === preferred) || ap.localeCompare(bp) ||
                String(a.id || a.provider_id || '').localeCompare(String(b.id || b.provider_id || ''));
        });
        for (const identity of identities) {
            const url = safePhoto(identity.identity_data.avatar_url) || safePhoto(identity.identity_data.picture);
            if (url) return url;
        }
        return null;
    }
    function current() { return owner && photo && !failed.has(owner + '\n' + photo) ? photo : null; }
    function wrapper(slot) { return slot.closest('.nav-avatar-link,#profile-link-tab,.profile-avatar-stage') || slot; }
    function show(element, visible) {
        if (!visibility.has(element)) visibility.set(element, {display:element.style.getPropertyValue('display'),priority:element.style.getPropertyPriority('display')});
        element.hidden = !visible;
        if (!visible) element.style.setProperty('display', 'none', 'important');
        else {
            const previous = visibility.get(element);
            if (previous.display && previous.display !== 'none') element.style.setProperty('display', previous.display, previous.priority);
            else element.style.removeProperty('display');
        }
    }
    function render() {
        const url = current(), identity = owner, version = revision;
        document.querySelectorAll('[data-avatar-slot]').forEach(slot => {
            if (slot.closest('#ma-jonas-home,#ma-ambient-jonas,#ma-ambient-panel,.ja-root,[data-matchapp-mode="kids"]')) return;
            const host = wrapper(slot);
            slot.querySelectorAll('.avatar-empty,.avatar-online-dot').forEach(element => show(element, false));
            let img = slot.querySelector('img');
            if (!url) {
                show(host, false);show(slot, false);
                if (img) { img.onload = img.onerror = null;img.removeAttribute('src');show(img, false);bindings.delete(img); }
                return;
            }
            if (!img) { img = document.createElement('img');img.alt = '';slot.prepend(img); }
            const prior = bindings.get(img);
            if (prior && prior.owner === identity && prior.url === url && prior.revision === version) {
                show(host, prior.loaded);show(slot, prior.loaded);show(img, prior.loaded);return;
            }
            show(host, false);show(slot, false);show(img, false);
            const state = {owner:identity,url:url,revision:version,loaded:false};
            bindings.set(img, state);
            const fresh = () => bindings.get(img) === state && owner === identity && revision === version && current() === url;
            img.referrerPolicy = 'no-referrer';
            img.onload = function () {
                if (!fresh()) return;
                state.loaded = true;show(host, true);show(slot, true);show(img, true);
            };
            img.onerror = function () {
                if (!fresh()) return;
                failed.add(identity + '\n' + url);render();
            };
            img.src = url;
            if (img.complete && img.naturalWidth > 0) img.onload();
        });
    }
    function setUser(user) {
        revision++;
        owner = user && typeof user.id === 'string' && !user.is_anonymous ? user.id : '';
        photo = owner ? fromUser(user) : null;
        render();
        return current();
    }
    function clear() { return setUser(null); }
    function refresh() {
        if (pending && pending.revision === revision) return pending.promise;
        const auth = window.supabaseClient?.auth;
        if (typeof auth?.getUser !== 'function') { render();return Promise.resolve(null); }
        const token = ++revision;
        const job = {revision:token,promise:null};
        job.promise = Promise.resolve().then(() => auth.getUser()).then(result => {
            if (revision !== token) return current();
            return setUser(result?.error ? null : result?.data?.user || null);
        }).catch(() => { if (revision === token) clear();return current(); }).finally(() => { if (pending === job) pending = null; });
        pending = job;
        return job.promise;
    }
    window.MatchAppAccountPhoto = Object.freeze({fromUser,setUser,clear,refresh});
    window.resolveUserAvatar = current;
    window.renderUserAvatar = render;
    window.getUserNickname = function () {
        try {
            const nickname = (localStorage.getItem('match_user_nickname') || '').trim();
            if (nickname) return nickname;
            return (localStorage.getItem('match_user_name') || '').trim().split(/\s+/)[0] || '';
        } catch (_) { return ''; }
    };
    function boot() {
        render();refresh();
        new MutationObserver(records => {
            if (records.some(record => Array.from(record.addedNodes).some(node => node.nodeType === 1 &&
                (node.matches('[data-avatar-slot]') || node.querySelector('[data-avatar-slot]'))))) render();
        }).observe(document.body, {childList:true,subtree:true});
    }
    document.addEventListener('matchapp:authchange', event => {
        clear();
        if (event.detail?.signedIn) refresh();
    });
    document.addEventListener('matchapp:profilehydrated', render);
    document.addEventListener('matchapp:avatarchange', render);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});else boot();
})();
