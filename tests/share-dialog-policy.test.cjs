const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('share.js', 'utf8');
const page = new JSDOM(fs.readFileSync('index.html', 'utf8'));
const markup = page.window.document.getElementById('share-modal').outerHTML;
page.window.close();
const languages = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];
const legacySelectors = '.share-how, #share-reward-status, #share-claim-note, #share-confirm-external, #share-reward-screen';

function setup(active = true) {
    const dom = new JSDOM(markup, { runScripts: 'outside-only', url: 'https://matchapp.tv/' });
    const w = dom.window;
    const calls = { quota: 0, rewards: 0, native: [], copied: [], guest: 0, next: 0 };
    w.MatchAppTokens = { retireLegacyPromotions: active };
    w.isUserLoggedIn = true;
    w.globalMatchTitle = 'The Grand Budapest Hotel';
    w.localStorage.setItem('match_guestBonusMatches', '10');
    w.localStorage.setItem('match_guestBonusAiPrompts_v1', '7');
    w.localStorage.setItem('match_shareLog', '[123]');
    w.refreshQuotaStatus = async () => { calls.quota++; return { share_rewards_left: 2, purchased_matches: 11 }; };
    w.supabaseClient = { rpc: async () => { calls.rewards++; throw new Error('unexpected reward RPC'); } };
    w.MatchAppGuestShare = { open: () => calls.guest++, remainingShares: () => 3 };
    w.getAnotherMatchInstead = () => calls.next++;
    w.navigator.share = async payload => calls.native.push(payload);
    Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async text => calls.copied.push(text) } });
    w.eval(source);
    w.buildShareCard = async () => w.document.createElement('canvas');
    return { dom, w, calls, sheet: w.document.querySelector('.share-sheet') };
}
function event(w, type) { w.document.dispatchEvent(new w.CustomEvent(type)); }
function assertRetiredHidden(sheet) {
    for (const el of sheet.querySelectorAll(legacySelectors)) {
        assert.equal(el.hidden, true, el.id || el.className);
        assert.equal(el.style.display, 'none', el.id || el.className);
    }
}

test('active-policy sharing dialog uses all 14 selected languages with original action nodes', async () => {
    const { w, sheet } = setup();
    const buttons = [...sheet.querySelectorAll('button')];
    const handlers = buttons.map(button => button.getAttribute('onclick'));
    const titleLabels = new Set(), subtitles = new Set();
    const nativeButton = sheet.querySelector('.share-native');
    const originalHandler = () => {};
    nativeButton.onclick = originalHandler;
    try {
        for (const lang of languages) {
            w.MATCH_LANG = lang;
            event(w, 'matchapp:langchange');
            await w.openShareSheet();
            assert.equal(sheet.lang, lang);
            assert.equal(sheet.dir, lang === 'ar' ? 'rtl' : 'ltr');
            assertRetiredHidden(sheet);
            const subtitle = sheet.querySelector('.share-sub').textContent;
            assert.ok(subtitle.trim(), lang);
            assert.doesNotMatch(subtitle, /bonus|reward|unlock|verification|\d|\+/i, lang);
            assert.ok(sheet.querySelector('.share-close').getAttribute('aria-label'));
            assert.ok(sheet.querySelector('#share-save-name').placeholder);
            titleLabels.add(sheet.querySelector('.share-title').textContent);
            subtitles.add(subtitle);
            assert.equal(nativeButton.onclick, originalHandler);
            assert.deepEqual([...sheet.querySelectorAll('button')], buttons);
            assert.deepEqual(buttons.map(button => button.getAttribute('onclick')), handlers);
        }
        assert.equal(titleLabels.size, 14);
        assert.equal(subtitles.size, 14);
        w.MATCH_LANG = 'pt-BR';
        event(w, 'matchapp:langchange');
        assert.equal(sheet.querySelector('.share-title').textContent, '📢 Compartilhar MatchApp Ai');
        assert.equal(sheet.querySelector('.share-native').textContent, '📲 Compartilhar agora');
        assert.equal(sheet.querySelector('.tg-send-btn').textContent, 'Enviar →');
    } finally { w.close(); }
});

test('canonical selected locale wins over stale global English and late quota rendering stays neutral', async () => {
    const { w, sheet } = setup();
    let releaseQuota, markQuotaStarted;
    const quotaStarted = new Promise(resolve => { markQuotaStarted = resolve; });
    w.MATCH_LANG = 'en';
    w.matchResultLanguage = () => 'pt-BR';
    w.refreshQuotaStatus = () => new Promise(resolve => { releaseQuota = resolve; markQuotaStarted(); });
    try {
        const opening = w.openShareSheet();
        assert.equal(sheet.querySelector('.share-title').textContent, '📢 Compartilhar MatchApp Ai');
        assertRetiredHidden(sheet);
        await quotaStarted;
        assert.equal(typeof releaseQuota, 'function');
        w.matchResultLanguage = () => 'ar';
        event(w, 'matchapp:langchange');
        releaseQuota({ share_rewards_left: 3 });
        await opening;
        assert.equal(sheet.lang, 'ar');
        assert.equal(sheet.dir, 'rtl');
        assertRetiredHidden(sheet);
        w.matchResultLanguage = undefined;
        w.MATCH_LANG = '';
        w.localStorage.setItem('match_lang', 'pt_PT');
        w.document.documentElement.lang = 'en';
        event(w, 'matchapp:langchange');
        assert.equal(sheet.lang, 'pt-BR');
    } finally { w.close(); }
});

test('policy changes restore the original legacy dialog without replacing actions', async () => {
    const { w, sheet } = setup(false);
    const originalTitle = sheet.querySelector('.share-title').textContent;
    const originalSub = sheet.querySelector('.share-sub').textContent;
    const button = sheet.querySelector('.share-native');
    const originalLabel = button.textContent;
    try {
        await w.openShareSheet();
        assert.match(sheet.querySelector('#share-reward-status').textContent, /3 different results/);
        assert.equal(sheet.querySelector('.share-how').hidden, false);
        w.MatchAppTokens.retireLegacyPromotions = true;
        w.MATCH_LANG = 'pt-BR';
        event(w, 'matchapp:tokenpolicy');
        assertRetiredHidden(sheet);
        w.MatchAppTokens.retireLegacyPromotions = false;
        event(w, 'matchapp:tokenpolicy');
        assert.equal(sheet.querySelector('.share-title').textContent, originalTitle);
        assert.equal(sheet.querySelector('.share-sub').textContent, originalSub);
        assert.equal(button.textContent, originalLabel);
        assert.equal(sheet.querySelector('.share-native'), button);
        assert.equal(sheet.querySelector('.share-how').hidden, false);
        assert.equal(sheet.querySelector('#share-reward-status').style.display, '');
        assert.equal(sheet.hasAttribute('lang'), false);
        assert.equal(sheet.hasAttribute('dir'), false);
    } finally { w.close(); }
});

test('active-policy native sharing and copied payload preserve title, link, hashtags and balances', async () => {
    const { w, calls } = setup();
    try {
        await w.openShareSheet();
        await w.shareNative();
        await w.copyShareText(true);
        assert.equal(calls.native.length, 1);
        const payload = calls.native[0];
        assert.equal(payload.title, 'MatchApp Ai | Find Your Perfect Match');
        assert.equal(payload.url, 'https://matchapp.tv/');
        assert.equal(payload.text, 'MatchApp Ai matched me with “The Grand Budapest Hotel”! Find your own movie or series by mood and platform. Try it free: https://matchapp.tv/\n\n#MatchAppAi #MatchAppTV #FindWhatToWatch #StreamingGuide #MovieNight');
        assert.equal(calls.copied[0], payload.text);
        assert.equal(calls.quota, 1);
        assert.equal(calls.rewards, 0);
        assert.equal(w.localStorage.getItem('match_guestBonusMatches'), '10');
        assert.equal(w.localStorage.getItem('match_guestBonusAiPrompts_v1'), '7');
        assert.equal(w.localStorage.getItem('match_shareLog'), '[123]');
    } finally { w.close(); }
});

test('restricted-title and policy-off guest sharing retain their original paths', async () => {
    const { w, calls } = setup();
    try {
        w.currentMatchShareRestricted = true;
        await w.openShareSheet();
        assert.equal(calls.next, 1);
        assert.equal(calls.quota, 0);
        w.currentMatchShareRestricted = false;
        w.isUserLoggedIn = false;
        w.MatchAppTokens.retireLegacyPromotions = false;
        await w.openShareSheet();
        assert.equal(calls.guest, 1);
        assert.equal(calls.quota, 0);
        assert.equal(calls.rewards, 0);
    } finally { w.close(); }
});

test('late legacy reward-panel rendering cannot display retired incentives', () => {
    const { w, sheet } = setup();
    try {
        w.showRewardScreen(2);
        assertRetiredHidden(sheet);
        for (const el of sheet.querySelectorAll('.share-native, .share-grid, .share-utils, .share-sub, #share-preview')) {
            assert.equal(el.style.display, '');
        }
    } finally { w.close(); }
});

