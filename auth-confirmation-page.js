/* Human-confirmed signup: GET/opening a link never spends its one-time token.
   Only an explicit user click calls verifyOtp. No service-role credentials. */
(function () {
    'use strict';
    const locationURL = new URL(window.location.href);
    const params = locationURL.searchParams;
    const fragment = new URLSearchParams(locationURL.hash.slice(1));
    const token = params.get('token_hash') || fragment.get('token_hash') || '';
    const type = params.get('type') || fragment.get('type') || '';
    let busy = false;

    function status(message, state) {
        const element = document.getElementById('confirmation-status');
        if (element) {
            element.textContent = message;
            element.dataset.state = state || '';
        }
    }

    function scrubLink() {
        const clean = new URL(window.location.href);
        clean.searchParams.delete('token_hash');
        clean.searchParams.delete('type');
        clean.hash = '';
        window.history.replaceState(null, '', clean.pathname + clean.search);
    }

    async function verify() {
        if (busy) return;
        if (type !== 'email' || token.length < 24 || token.length > 512) {
            status('This confirmation link is missing or invalid. Sign in to request a fresh email.', 'error');
            return;
        }
        const button = document.getElementById('confirm-email');
        if (!window.supabase?.createClient) {
            status('The account service could not load. Refresh this page and try again.', 'error');
            return;
        }
        busy = true;
        if (button) button.disabled = true;
        status('Confirming your email securely…');
        try {
            // Uses the same project and default persistent browser session
            // storage as app.js; an OTP is never verified during page loading.
            const client = window.supabase.createClient(
                'https://zkymvqrmbabngsqblyye.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreW12cXJtYmFibmdzcWJseXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDUyNDIsImV4cCI6MjEwMjM4MTI0Mn0._yEVFMfwVU6GBqQ8m3ljfOgA0HSLEDiKMOfYae6ZD8Q',
                { auth: { detectSessionInUrl: false } }
            );
            const { data, error } = await client.auth.verifyOtp({ token_hash: token, type: 'email' });
            if (error) {
                scrubLink();
                status('This link is invalid, expired, or already used. Sign in to request a fresh confirmation email.', 'error');
                return;
            }
            const confirmed = Boolean(data?.user || data?.session?.user);
            if (!confirmed) {
                scrubLink();
                status('Confirmation could not be completed. Sign in or request a new email.', 'error');
                return;
            }
            const session = (await client.auth.getSession())?.data?.session;
            scrubLink();
            if (session?.user) {
                status('Email confirmed. Opening MatchApp…', 'success');
                window.location.replace('/profile/profile.html?welcome=verified');
            } else {
                status('Your email is confirmed. Sign in to continue.', 'success');
            }
        } catch (_) {
            // A network failure may be retryable: preserve the one-time link.
            status('Connection interrupted. Please try confirming again.', 'error');
        } finally {
            busy = false;
            if (button) button.disabled = false;
        }
    }

    function init() {
        const button = document.getElementById('confirm-email');
        if (!button) return;
        button.addEventListener('click', verify);
        if (type !== 'email' || token.length < 24 || token.length > 512) {
            button.disabled = true;
            status('This confirmation link is incomplete. Sign in to request a new one.', 'error');
        }
        // Intentionally NO automatic verify on load (email scanner defense).
    }

    window.MatchAppManualConfirmation = Object.freeze({ verify });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else init();
})();
