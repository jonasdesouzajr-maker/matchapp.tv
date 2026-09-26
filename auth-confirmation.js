/* Complete Supabase email-confirmation returns without mistaking a failed or
   successful verification link for a new registration. Shared by responsive
   web pages and the Android WebView (which loads the same website). */
(function () {
    'use strict';

    // Capture the redirect BEFORE app.js creates the Supabase client: the SDK
    // can consume and remove an implicit-flow URL fragment while initializing.
    const original = new URL(window.location.href);
    const fragment = new URLSearchParams(original.hash.replace(/^#/, ''));
    const query = original.searchParams;
    const hasResponse = ['access_token', 'refresh_token', 'error', 'error_code', 'code']
        .some(key => fragment.has(key) || query.has(key)) || query.has('token_hash');
    const hasError = ['error', 'error_code'].some(key => fragment.has(key) || query.has(key));
    const fromRecovery = fragment.get('type') === 'recovery' || query.get('type') === 'recovery';
    const legacySignup = query.get('openAuth') === '1';
    const directSignIn = query.get('signIn') === '1';
    const verifiedReturn = query.get('authReturn') === 'verified';

    function message(value, isError) {
        const el = document.getElementById('auth-message');
        if (!el) return;
        el.textContent = value;
        el.style.display = 'block';
        el.style.color = isError ? '#ffb4b4' : '#9beeb8';
        el.style.background = isError ? 'rgba(255,82,82,.10)' : 'rgba(63,211,122,.10)';
    }

    function cleanReturnUrl() {
        const clean = new URL(window.location.href);
        ['openAuth', 'signIn', 'authReturn', 'code', 'token_hash', 'type',
         'error', 'error_code', 'error_description'].forEach(key => clean.searchParams.delete(key));
        if (hasResponse) clean.hash = ''; // Never leave session tokens in browser history.
        window.history.replaceState(null, '', clean.pathname + clean.search + clean.hash);
    }

    function installResend() {
        const form = document.getElementById('form-login');
        if (!form || document.getElementById('resend-confirmation-btn')) return;
        const button = document.createElement('button');
        button.id = 'resend-confirmation-btn';
        button.type = 'button';
        button.className = 'auth-link-btn';
        button.textContent = 'Resend confirmation email';
        button.addEventListener('click', resend);
        form.appendChild(button);
    }

    async function resend() {
        const emailInput = document.getElementById('login-email');
        const alternate = document.getElementById('reg-email');
        const email = (emailInput?.value || alternate?.value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            message('Enter your signup email address above, then resend confirmation.', true);
            emailInput?.focus();
            return;
        }
        const client = window.supabaseClient;
        if (!client?.auth?.resend) {
            message('Account service is temporarily unavailable. Please try again.', true);
            return;
        }
        const button = document.getElementById('resend-confirmation-btn');
        if (button?.disabled) return;
        if (button) button.disabled = true;
        try {
            const { error } = await client.auth.resend({
                type: 'signup',
                email,
                options: { emailRedirectTo: 'https://matchapp.tv/' }
            });
            if (error && (error.status === 429 || error.code === 'over_email_send_rate_limit')) {
                message('Too many confirmation requests. Please try again later.', true);
            } else if (error && error.status >= 500) {
                message('Confirmation email could not be sent right now. Please try again.', true);
            } else {
                // Do not disclose whether an email has a MatchApp account.
                message('If this address has an unconfirmed account, a new confirmation email is on its way. Use the newest link only.', false);
            }
        } catch (_) {
            message('Could not reach the account service. Please try again.', true);
        } finally {
            if (button) button.disabled = false;
        }
    }

    async function handleLanding(client) {
        if (fromRecovery) return false; // Password recovery belongs to /reset.html.
        if (!hasResponse && !legacySignup && !directSignIn && !verifiedReturn) return false;
        let session = null;
        // The SDK automatically consumes implicit tokens or exchanges PKCE
        // codes; getSession waits for its initialization to finish.
        if (!hasError && (hasResponse || legacySignup || verifiedReturn) && client?.auth?.getSession) {
            try {
                const result = await client.auth.getSession();
                session = result?.data?.session || null;
                if (!session && hasResponse && query.has('code') && client.auth.exchangeCodeForSession) {
                    const exchanged = await client.auth.exchangeCodeForSession(query.get('code'));
                    session = exchanged?.data?.session || null;
                }
            } catch (_) { /* Keep the sign-in and recovery options available. */ }
        }
        if (session?.user) {
            cleanReturnUrl();
            window.closeAuthModal?.();
            if ((hasResponse && !hasError) || verifiedReturn) window.showToast?.('Email confirmed. You are signed in!');
            return true;
        }
        if (hasResponse || verifiedReturn) {
            window.openAuthModal?.();
            window.switchAuthTab?.('login');
            const fallback = verifiedReturn
                ? 'Your email confirmation was received, but the browser could not restore the sign-in session. Sign in below to continue.'
                : hasError
                ? 'This verification link is invalid or expired. Enter your email and choose "Resend confirmation email" below. Use the newest email link only.'
                : 'We could not finish the email sign-in on this device. Sign in below, or request a fresh confirmation email if you have not verified your address.';
            message(fallback, true);
            cleanReturnUrl();
            return true;
        }
        // A normal /register.html CTA still opens signup; unlike a verified
        // redirect, it carries no access token, auth code or link error.
        window.openAuthModal?.();
        window.switchAuthTab?.(directSignIn ? 'login' : 'signup');
        cleanReturnUrl();
        return true;
    }

    window.MatchAppEmailAuth = Object.freeze({ handleLanding, resend });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installResend, { once: true });
    } else installResend();
})();
