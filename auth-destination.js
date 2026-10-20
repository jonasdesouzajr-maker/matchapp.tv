/* Shared sign-in destination for web, PWA and the Android WebView.
   Onboarding metadata controls navigation only; the saved Postgres identity
   lock remains authoritative and is never inferred from this device's cache. */
(function () {
    'use strict';
    const PROFILE = '/profile/profile.html';
    const FIRST_REGISTRATION = 'matchapp_first_time_onboarding_v1';
    // Accounts created from this change onward always finish their initial
    // identity setup, even if their first OAuth callback lost its connection.
    // Older accounts without a signup marker keep their existing Home entry.
    const INITIAL_SETUP_SINCE = Date.parse('2026-10-20T00:00:00Z');
    const isHome = () => location.pathname === '/' || location.pathname === '/index.html';
    const isSetup = () => location.pathname === PROFILE &&
        new URLSearchParams(location.search).get('setup') === '1';

    async function sameAccount(client, user) {
        const current = await client.auth.getSession();
        if (current.error || current.data?.session?.user?.id !== user.id)
            throw current.error || new Error('Sign-in account changed');
    }

    async function resolve(client, user, savedProfile) {
        if (!client?.auth || !user?.id) throw new Error('Sign in first');
        let profile = savedProfile;
        if (profile === undefined) {
            let timer;
            const { data, error } = await Promise.race([
                client.from('profiles').select('profile_locked,registration_completed_at')
                    .eq('id', user.id).maybeSingle(),
                new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error('Profile connection timed out')), 12000);
                })
            ]).finally(() => clearTimeout(timer));
            if (error) throw error;
            profile = data;
        }
        // This check always comes before the signup marker: completing the
        // identity once releases onboarding on every device and provider.
        if (profile?.profile_locked === true || profile?.registration_completed_at)
            return { path: '/', needsProfile: false };

        const pending = user.user_metadata?.[FIRST_REGISTRATION] === true ||
            Date.parse(user.created_at || '') >= INITIAL_SETUP_SINCE;
        return { path: pending ? PROFILE : '/', needsProfile: pending };
    }

    async function finish(client, user) {
        let destination;
        try {
            destination = await resolve(client, user);
        } catch (error) {
            // Authentication already succeeded. A profile outage must neither
            // claim the credentials failed nor force a returning user to setup.
            console.warn('Sign-in profile destination deferred:', error?.message || error);
            destination = { path: '/', needsProfile: false };
        }
        await sameAccount(client, user);
        if (destination.needsProfile) {
            if (!isSetup()) location.replace(PROFILE + '?setup=1');
        } else if (!isHome()) {
            location.replace('/');
        } else {
            window.closeAuthModal?.();
        }
        return destination;
    }

    async function enforceInitialSetup(client, user, savedProfile) {
        const destination = await resolve(client, user, savedProfile);
        if (destination.needsProfile && !isSetup()) {
            await sameAccount(client, user);
            location.replace(PROFILE + '?setup=1');
        }
        return destination;
    }

    window.MatchAppAuthDestination = Object.freeze({ resolve, finish, enforceInitialSetup });
})();
