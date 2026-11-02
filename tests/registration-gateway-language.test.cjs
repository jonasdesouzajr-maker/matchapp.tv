'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const read = path => fs.readFileSync(require.resolve('../' + path), 'utf8');

test('the registration gateway follows the saved language and keeps its account and return links', () => {
    const dom = new JSDOM(read('register.html'), {url:'https://matchapp.tv/register.html', runScripts:'dangerously'});
    try {
        const {window} = dom;
        const doc = window.document;
        window.localStorage.setItem('match_lang', 'pt-BR');
        for (const filename of ['i18n.js', 'registration-gateway-locale.js']) {
            assert.ok(doc.querySelector('script[src^="/' + filename + '"]'));
            const script = doc.createElement('script');
            script.textContent = read(filename);
            doc.head.appendChild(script);
        }
        assert.equal(doc.documentElement.lang, 'pt-BR');
        assert.equal(doc.querySelector('h1').textContent, 'Leve o MatchApp Ai com você');
        const headings = new Set();
        for (const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']) {
            window.setLanguage(lang);
            headings.add(doc.querySelector('h1').textContent);
            assert.equal(doc.documentElement.dir, lang === 'ar' ? 'rtl' : 'ltr');
            assert.ok(doc.title.includes('MatchApp Ai'));
            assert.equal(doc.querySelector('meta[name="description"]').content, doc.querySelector('.reg-gateway > p').textContent);
            assert.equal(doc.querySelector('.reg-join').getAttribute('href'), '/?openAuth=1');
            assert.equal(doc.querySelector('.reg-home').getAttribute('href'), '/#questionnaire-box');
        }
        assert.equal(headings.size, 14);
    } finally { dom.window.close(); }
});
