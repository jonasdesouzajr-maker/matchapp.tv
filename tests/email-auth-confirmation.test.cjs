const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = '<div id="main-auth-modal"></div><div id="form-login">' +
    '<input type="email" id="login-email"><input type="password" id="login-password">' +
    '</div><input type="email" id="reg-email"><p id="auth-message"></p>';

function site(url) {
    const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
    const win = dom.window;
    win.tabs = [];
    win.openAuthModal = () => { win.authOpened = true; };
    win.closeAuthModal = () => { win.authClosed = true; };
    win.switchAuthTab = tab => win.tabs.push(tab);
    win.showToast = msg => { win.toast = msg; };
    win.eval(read('auth-confirmation.js'));
    win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
    return { dom, win, ui: win.MatchAppEmailAuth };
}

test('successful email callback keeps tokens until SDK completes session, then clears URL', async () => {
    const { dom, win, ui } = site('https://matchapp.tv/?openAuth=1#access_token=example&refresh_token=example&type=signup');
    const handled = await ui.handleLanding({
        auth: { getSession: async () => {
            assert.match(win.location.hash, /access_token=/);
            return { data: { session: { user: { id: 'verified' } } } };
        } }
    });
    assert.equal(handled, true);
    assert.notEqual(win.tabs[0], 'signup');
    assert.match(win.toast, /signed in/i);
    assert.equal(win.location.hash, '');
    assert.equal(win.location.search, '');
    dom.window.close();
});

test('invalid or expired confirmation never assumes account verification; shows resend login', async () => {
    const { dom, win, ui } = site('https://matchapp.tv/?openAuth=1#error=access_denied&error_code=otp_expired');
    let getSessionCalls = 0;
    await ui.handleLanding({ auth: { getSession: async () => { getSessionCalls++; return {}; } } });
    assert.equal(getSessionCalls, 0);
    assert.deepEqual(win.tabs, ['login']);
    assert.match(win.document.getElementById('auth-message').textContent, /invalid or expired/i);
    assert.ok(win.document.getElementById('resend-confirmation-btn'));
    assert.equal(win.location.hash, '');
    dom.window.close();
});

test('resend uses signup OTP flow and does not reveal whether account exists', async () => {
    const { dom, win, ui } = site('https://matchapp.tv/');
    const calls = [];
    win.supabaseClient = {
        auth: { resend: async options => { calls.push(options); return { error: null }; } }
    };
    win.document.getElementById('login-email').value = 'example@example.com';
    await ui.resend();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].type, 'signup');
    assert.equal(calls[0].options.emailRedirectTo, 'https://matchapp.tv/');
    assert.match(win.document.getElementById('auth-message').textContent, /if this address/i);
    dom.window.close();
});

test('legacy signup link still opens signup; confirmed session prevents duplicate modal', async () => {
    const bare = site('https://matchapp.tv/?openAuth=1');
    await bare.ui.handleLanding({ auth: { getSession: async () => ({ data: { session: null } }) } });
    assert.deepEqual(bare.win.tabs, ['signup']);
    assert.equal(bare.win.location.search, '');
    bare.dom.window.close();
    const signedIn = site('https://matchapp.tv/?openAuth=1');
    await signedIn.ui.handleLanding({ auth: { getSession: async () => ({
        data: { session: { user: { id: 'existing' } } }
    }) } });
    assert.deepEqual(signedIn.win.tabs, []);
    assert.equal(signedIn.win.authClosed, true);
    signedIn.dom.window.close();
});

test('homepage loads redirect capture before SDK client, and signup waits for confirmation', () => {
    const home = read('index.html');
    const scriptPos = home.indexOf('/auth-confirmation.js?v=');
    const appPos = home.indexOf('/app.js?v=');
    assert.ok(scriptPos > 0 && appPos > scriptPos);
    const app = read('app.js');
    assert.match(app, /emailRedirectTo: 'https:\/\/matchapp\.tv\/'/);
    assert.match(app, /window\.MatchAppEmailAuth\.handleLanding\(supabaseClient\)/);
    assert.match(app, /else if \(data\?\.session\?\.user\)/);
    assert.match(app, /error\.code === 'email_not_confirmed'/);
});
