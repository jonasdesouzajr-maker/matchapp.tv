'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const shell = fs.readFileSync(require.resolve('../patches/jonas-adult-page.js'), 'utf8');

test('browser gutters are enabled only on top-level web pages', () => {
    const dom = new JSDOM('<html><head></head><body><iframe></iframe></body></html>', {
        url: 'https://matchapp.tv/news/', runScripts: 'outside-only'
    });
    try {
        const {window} = dom;
        const run = (target, ua, bridge) => {
            Object.defineProperty(target.navigator, 'userAgent', {configurable: true, value: ua});
            target.MatchAppFx = bridge;
            target.document.documentElement.classList.remove('ma-browser-gutters');
            target.eval(shell);
            return target.document.documentElement.classList.contains('ma-browser-gutters');
        };
        assert.equal(run(window, 'Mozilla/5.0 Android Chrome/156 Mobile Safari/537.36'), true);
        assert.equal(run(window, 'Mozilla/5.0 Macintosh Safari/605.1.15'), true);
        assert.equal(run(window, 'Chrome/156 MatchAppTVAndroid/1.1.65 MatchAppAiAndroid/1.1.65'), false);
        assert.equal(run(window, 'Chrome/156 MatchAppAiKidsAndroid/1.1.26'), false);
        assert.equal(run(window, 'Android; wv) Chrome/156'), false);
        assert.equal(run(window, 'Chrome/156', {}), false);
        assert.equal(run(window.frames[0], 'Chrome/156'), false);
    } finally { dom.window.close(); }
});
