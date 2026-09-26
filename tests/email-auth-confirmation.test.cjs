const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = '<div id="main-auth-modal"></div><div id="form-login">' +
    '<input type="email" id="login-email"><input type="password" id="login-password">' +
    '</div><input type="email" id="reg-email"><p id="auth-message"></p>';

function site(url) {
    const dom = new JSDOM(html, { url, runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
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
    assert.equal(win.authOpened, undefined); // no sign-in modal after verification
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
    // A delayed final-audit.js script replaces the signup handler several
    // seconds after load. Both handlers must use the same verified return.
    const audit = read('final-audit.js');
    assert.match(audit, /emailRedirectTo:'https:\/\/matchapp\.tv\/'/);
    assert.doesNotMatch(audit, /emailRedirectTo:'https:\/\/matchapp\.tv\/\?openAuth=1'/);
    assert.match(read('title-captions.js'), /final-audit\.js\?v=20260926-emailsingle1/);
    assert.match(home, /title-captions\.js\?v=20260921-ui2&amp;auth=20260926-emailsingle1/);
});


test('real redirect operation opens signed-in Profile Hub after session is obtained', async () => {
    const original = 'https://matchapp.tv/#access_token=verified&refresh_token=verified&type=signup';
    const navigation = [];
    let cleanCalled = false;
    const fakeWindow = {
        location: { href: original, search: '', hash: '#access_token=verified&refresh_token=verified&type=signup',
            replace: destination => navigation.push(destination) },
        history: { replaceState: () => { cleanCalled = true; } },
        closeAuthModal: () => { throw new Error('Must not reopen/close auth modal on verification'); }
    };
    const fakeDocument = {
        readyState: 'loading', addEventListener: () => {}, getElementById: () => null
    };
    vm.runInNewContext(read('auth-confirmation.js'), {
        window: fakeWindow, document: fakeDocument, URL, URLSearchParams
    });
    const handled = await fakeWindow.MatchAppEmailAuth.handleLanding({
        auth: { getSession: async () => ({ data: { session: { user: { id: 'new-member' } } } }) }
    });
    assert.equal(handled, true);
    assert.equal(cleanCalled, true);
    assert.deepEqual(navigation, ['/profile/profile.html?welcome=verified']);
});

test('verified member opens functional create-profile card, with star sign and server-confirmed sign-in', async () => {
    const page = read('profile/profile.html');
    assert.match(page, /id="profile-starsign"/);
    assert.match(page, /onclick="saveProfileData\(\)"/);
    const code = page.match(/<script id="verified-email-profile-entry">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(code, 'verified-landing handler must be present on actual Profile Hub');
    const dom = new JSDOM('<button data-profile-target="account-details"></button><article id="account-details" hidden><h3>My details</h3></article>', {
        url: 'https://matchapp.tv/profile/profile.html?welcome=verified', runScripts:'outside-only'
    });
    const w = dom.window, card = w.document.getElementById('account-details');
    w.supabaseClient = { auth: { getUser: async () => ({
        data: { user: { id:'confirmed-member', email_confirmed_at:'2026-09-26T15:00:00Z' } }
    }) } };
    w.document.querySelector('button').addEventListener('click', () => { card.hidden = false; });
    w.eval(code);
    w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(card.hidden, false);
    assert.match(card.textContent, /Email confirmed! You are signed in/);
    assert.equal(w.location.search, '');
    dom.window.close();
});

test('a forged welcome URL cannot open account form without a verified user', async () => {
    const code = read('profile/profile.html').match(/<script id="verified-email-profile-entry">([\s\S]*?)<\/script>/)?.[1];
    const dom = new JSDOM('<button data-profile-target="account-details"></button><article id="account-details" hidden><h3>My details</h3></article>', {
        url:'https://matchapp.tv/profile/profile.html?welcome=verified', runScripts:'outside-only'
    });
    const w = dom.window;
    w.supabaseClient = { auth: { getUser: async () => ({ data:{user:null},error:null }) } };
    w.eval(code); w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(w.document.getElementById('account-details').hidden,true);
    assert.equal(w.document.getElementById('verified-email-welcome'),null);
    dom.window.close();
});

test('confirmation email resend uses cooldown to avoid invalidating fresh links',async()=>{
    const {dom,win,ui}=site('https://matchapp.tv/');
    let sends=0;
    win.supabaseClient={auth:{resend:async()=>{sends++;return {error:null};}}};
    win.document.getElementById('login-email').value='member@example.test';
    await ui.resend();
    await ui.resend();
    assert.equal(sends,1,'The newest emailed link must not be replaced by immediate double-clicks');
    assert.match(win.document.getElementById('auth-message').textContent,/retry in/i);
    dom.window.close();
});

test('rejected confirmation resend must never falsely promise an email',async()=>{
    const {dom,win,ui}=site('https://matchapp.tv/');
    let sends=0;
    win.supabaseClient={auth:{resend:async()=>{sends++;return {error:{status:400,code:'invalid_request'}};}}};
    win.document.getElementById('login-email').value='member@example.test';
    await ui.resend();
    assert.equal(sends,1);
    assert.match(win.document.getElementById('auth-message').textContent,/could not be requested/i);
    assert.doesNotMatch(win.document.getElementById('auth-message').textContent,/on its way/i);
    dom.window.close();
});
