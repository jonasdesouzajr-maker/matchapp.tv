'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');
const languages = ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const instantPlaybackClaims = /Watch It Instantly|Assista na hora|Míralo al instante|Regardez immédiatement|Sofort ansehen|Guardalo subito|Hemen izleyin|Смотрите сразу|شاهده فورًا|तुरंत देखें|Tonton seketika|すぐに視聴|바로 시청|立即观看/i;
const providerQualifications = {
  en:['subscription','country'], 'pt-BR':['assinatura','país'], es:['suscripción','país'],
  fr:['abonnements','pays'], de:['Abonnements','Land'], it:['abbonamenti','paese'],
  tr:['abonelik','ülkenize'], ru:['подписки','страны'], ar:['الاشتراك','بلدك'],
  hi:['सदस्यता','देश'], id:['langganan','negara'], ja:['契約条件','国'], ko:['구독','국가'], zh:['订阅','国家']
};

test('initial and translated Home copy explain discovery and provider requirements consistently', () => {
  const dom = new JSDOM(html, {url:'https://matchapp.tv/', runScripts:'outside-only'});
  const w = dom.window, d = w.document;
  try {
    const title = d.querySelector('[data-i18n="how.s3.title"]');
    const footer = d.querySelector('.seo-footer-lede');
    const heading = d.querySelector('.seo-footer-h');
    const initial = [title.textContent, footer.textContent, heading.textContent];
    const links = [...d.querySelectorAll('.streaming-links a')].map(a => a.href);
    assert.doesNotMatch(html, /Watch It Instantly|Find Where To Watch Anything|free AI streaming concierge|upload the official poster/i);
    assert.doesNotMatch(fs.readFileSync('tools/discovery-metadata.js','utf8'), /AI streaming concierge/i, 'metadata regeneration must retain discovery wording');
    assert.match(footer.textContent, /recommends movies and series.*links to official viewing services/);
    assert.match(footer.textContent, /Availability, prices and subscription requirements.*service and your country/);
    w.eval(fs.readFileSync('i18n.js','utf8'));
    w.eval(fs.readFileSync('page-locale.js','utf8'));
    const titles = new Set(), notes = new Set();
    for (const lang of languages) {
      w.setLanguage(lang);
      assert.equal(d.documentElement.lang, lang);
      assert.equal(d.querySelector('.seo-footer-lede'), footer);
      assert.equal(d.querySelector('[data-i18n="how.s3.title"]'), title);
      titles.add(title.textContent); notes.add(footer.textContent);
      assert.ok(title.textContent.trim()); assert.ok(footer.textContent.trim());
      assert.doesNotMatch(title.textContent, instantPlaybackClaims, lang);
      for (const qualification of providerQualifications[lang]) assert.ok(footer.textContent.includes(qualification), lang+': '+qualification);
    }
    assert.equal(titles.size,14); assert.equal(notes.size,14);
    w.setLanguage('en');
    assert.deepEqual([title.textContent,footer.textContent,heading.textContent],initial);
    assert.deepEqual([...d.querySelectorAll('.streaming-links a')].map(a => a.href),links);
  } finally { w.close(); }
});

test('Spotify embeds and share actions remain available with qualified guidance', () => {
  const dom = new JSDOM(html);
  try {
    const d=dom.window.document;
    const embeds=[...d.querySelectorAll('iframe[data-src]')].map(el=>el.getAttribute('data-src')).filter(url=>url.startsWith('https://open.spotify.com/embed/'));
    assert.ok(embeds.some(url=>url.includes('/artist/06HL4z0CvFAxyc27GXpf02')));
    assert.ok(embeds.some(url=>url.includes('/playlist/37i9dQZF1DXe7fP0uj1s1D')));
    assert.match(d.body.textContent,/Playback depends on Spotify’s availability and account requirements/);
    assert.match(d.querySelector('.share-how').textContent,/share the MatchApp Ai link and caption.*images you have permission to share/s);
    assert.ok(d.querySelector('.share-native[onclick]'));
    assert.match(html,/i18n\.js\?[^"\n]*discovery=20261024-1/);
  } finally { dom.window.close(); }
});
