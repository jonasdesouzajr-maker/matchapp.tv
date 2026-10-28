'use strict';
// Authored game information, independent of the private game runtime and catalogs.
const fs = require('node:fs');
const path = require('node:path');
const { canonicalFavicons, cinemaAssets } = require('./finalize-brand.js');
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://matchapp.tv';
const LANGUAGES = Object.freeze(['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh']);
const ART = Object.freeze(['card_back.jpg', 'event_card_back.jpg', 'ocean_card_back.jpg']);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const route = language => '/lumina-match/' + (language === 'en' ? '' : language.toLowerCase() + '/');

function validate(source) {
  if (!source || !/^\d{4}-\d{2}-\d{2}$/.test(source.updated || '')) throw Error('Missing factual game-guide date');
  if (Object.keys(source.locales || {}).sort().join() !== [...LANGUAGES].sort().join()) throw Error('All 14 authored game-guide locales are required');
  const required = ['nativeName', 'ogLocale', 'title', 'description', 'eyebrow', 'h1', 'playLabel', 'playNote', 'languageLabel', 'homeLabel', 'aboutLabel', 'privacyLabel', 'termsLabel', 'contactLabel', 'updatedLabel', 'imageAlt', 'imageCaption', 'faqTitle', 'relatedTitle'];
  for (const language of LANGUAGES) {
    const copy = source.locales[language];
    for (const key of required) if (typeof copy[key] !== 'string' || !copy[key].trim()) throw Error(language + ': missing ' + key);
    if (!copy.title.includes('Lumina Match') || !copy.title.includes('MatchApp Ai')) throw Error(language + ': product identity missing');
    if (!Array.isArray(copy.intro) || copy.intro.length !== 2 || copy.intro.some(p => typeof p !== 'string' || !p.trim())) throw Error(language + ': incomplete introduction');
    if (!Array.isArray(copy.keywords) || copy.keywords.length < 6 || copy.keywords.length > 9 || new Set(copy.keywords).size !== copy.keywords.length) throw Error(language + ': invalid focused keywords');
    if (!Array.isArray(copy.sections) || copy.sections.map(s => s.id).join() !== 'how-to-play,campaign,modes-and-friends,save-and-close,music-and-sound') throw Error(language + ': incomplete sections');
    for (const section of copy.sections) {
      if (!section.title || !Array.isArray(section.paragraphs) || !section.paragraphs.length || section.paragraphs.some(p => typeof p !== 'string' || !p.trim())) throw Error(language + ': incomplete section ' + section.id);
    }
    if (copy.sections[0].steps?.length !== 3 || copy.sections[0].steps.some(s => typeof s !== 'string' || !s.trim())) throw Error(language + ': incomplete instructions');
    if (copy.faqs?.length !== 6 || copy.faqs.some(f => !f.question || !f.answer)) throw Error(language + ': incomplete questions');
    if (['how', 'together', 'discover'].some(key => !copy.relatedLinks?.[key])) throw Error(language + ': incomplete related navigation');
  }
}

function structuredData(language, copy, source) {
  const url = SITE + route(language), gameId = SITE + '/lumina-match/#game';
  const images = ART.map(file => ({'@type':'ImageObject', url:SITE + '/lumina-match/browser/' + file, width:784, height:1168}));
  return {'@context':'https://schema.org', '@graph':[
    {'@type':'WebPage', '@id':url + '#page', url, name:copy.title, description:copy.description,
      inLanguage:language, datePublished:'2026-10-28', dateModified:source.updated,
      isPartOf:{'@type':'WebSite', '@id':SITE + '/#website', name:'MatchApp Ai', url:SITE + '/'},
      mainEntity:{'@id':gameId}, primaryImageOfPage:images[0], breadcrumb:{'@id':url + '#breadcrumb'}},
    {'@type':'VideoGame', '@id':gameId, name:'Lumina Match', url:SITE + '/lumina-match/',
      description:copy.description, applicationCategory:'GameApplication', applicationSubCategory:'Memory card matching game',
      gamePlatform:'Web browser', operatingSystem:'A supported desktop, phone or tablet web browser',
      inLanguage:LANGUAGES, genre:['Memory', 'Puzzle'], keywords:copy.keywords,
      isAccessibleForFree:true, offers:{'@type':'Offer', price:'0', priceCurrency:'USD'},
      numberOfPlayers:{'@type':'QuantitativeValue', minValue:1, maxValue:2},
      playMode:['https://schema.org/SinglePlayer', 'https://schema.org/MultiPlayer'],
      image:images, publisher:{'@type':'Organization', name:'MatchApp Ai', url:SITE + '/'},
      featureList:copy.sections.map(s => s.paragraphs.join(' ')), softwareHelp:{'@id':url + '#page'}},
    {'@type':'BreadcrumbList', '@id':url + '#breadcrumb', itemListElement:[
      {'@type':'ListItem', position:1, name:'MatchApp Ai', item:SITE + '/'},
      {'@type':'ListItem', position:2, name:'Lumina Match', item:url}
    ]}
  ]};
}

// Reuse the existing public-guide consent defaults and analytics identity exactly.
function existingAnalytics(root) {
  const html = fs.readFileSync(path.join(root, 'guides/choose-what-to-watch/index.html'), 'utf8');
  const start = html.indexOf('<!-- Preserve site-standard regional consent defaults before loading analytics. -->');
  const end = html.indexOf('</script>', html.indexOf("})(window,document,'script','dataLayer','GTM-M7J3NNBN');", start));
  if (start < 0 || end < start) throw Error('Existing guide analytics/consent contract not found');
  return html.slice(start, end + '</script>'.length);
}

function render(language, source, analytics) {
  const copy = source.locales[language], url = SITE + route(language);
  const paragraph = p => '<p>' + escape(p) + '</p>';
  const alternate = LANGUAGES.map(code => '<link rel="alternate" hreflang="' + code + '" href="' + SITE + route(code) + '">').join('\n');
  const languageLinks = LANGUAGES.map(code => '<a id="language-' + code + '" href="' + route(code) + '#language-' + code + '" lang="' + code + '" hreflang="' + code + '" data-lumina-language="' + code + '"' + (code === language ? ' aria-current="page"' : '') + '>' + escape(source.locales[code].nativeName) + '</a>').join('\n');
  const date = new Intl.DateTimeFormat(language, {dateStyle:'long', timeZone:'UTC'}).format(new Date(source.updated + 'T12:00:00Z'));
  const sections = copy.sections.map(s => '<section class="lumina-guide-panel" aria-labelledby="' + s.id + '"><h2 id="' + s.id + '">' + escape(s.title) + '</h2>' + s.paragraphs.map(paragraph).join('') + (s.steps ? '<ol>' + s.steps.map(step => '<li>' + escape(step) + '</li>').join('') + '</ol>' : '') + '</section>').join('\n');
  const faq = copy.faqs.map(f => '<details><summary>' + escape(f.question) + '</summary>' + paragraph(f.answer) + '</details>').join('\n');
  const privacy = language === 'pt-BR' ? '/privacidade.html' : '/privacy.html';
  const terms = language === 'pt-BR' ? '/termos.html' : '/terms.html';
  const art = ART.map(file => '<img src="/lumina-match/browser/' + file + '" alt="" width="784" height="1168" decoding="async">').join('');
  let html = `<!DOCTYPE html>
<html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}" data-lumina-guide-locale="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escape(copy.title)}</title>
<meta name="description" content="${escape(copy.description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${url}">
${alternate}
<link rel="alternate" hreflang="x-default" href="${SITE}/lumina-match/">
<meta name="theme-color" content="#110b17">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MatchApp Ai">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${escape(copy.ogLocale)}">
${LANGUAGES.filter(code => code !== language).map(code => '<meta property="og:locale:alternate" content="' + escape(source.locales[code].ogLocale) + '">').join('\n')}
<meta property="og:title" content="${escape(copy.title)}">
<meta property="og:description" content="${escape(copy.description)}">
<meta property="og:image" content="${SITE}/lumina-match/browser/card_back.jpg">
<meta property="og:image:width" content="784">
<meta property="og:image:height" content="1168">
<meta property="og:image:alt" content="Lumina Match">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(copy.title)}">
<meta name="twitter:description" content="${escape(copy.description)}">
<meta name="twitter:image" content="${SITE}/lumina-match/browser/card_back.jpg">
<meta name="twitter:image:alt" content="Lumina Match">
<script type="application/ld+json">${json(structuredData(language, copy, source))}</script>
<link rel="stylesheet" href="/brand.css?v=20261018-nativeheader1&amp;frame=20261020-borderless1&amp;fastart=20261020-1">
<link rel="stylesheet" href="/lumina-match/guide.css?v=20261028-1">
<script src="/lumina-match/guide.js?v=20261028-1"></script>
${analytics}
<script defer src="/patches/jonas-adult-page.js?v=header20261018-1&amp;resize=20261022-1&amp;corner=20261020-1&amp;stellar=20261020-1&amp;headerface=20261020-1&amp;ui=20261024-1&amp;repair=20261023-1&amp;masthead=20261025-1&amp;refined=20261025-4"></script>
<script defer src="/patches/immersive-feedback-20261014.js?v=immersive1&amp;dock=20261020-1&amp;cinemasound=20261020-1"></script>
</head>
<body class="lumina-guide-page">
<header class="lumina-guide-shell hub-header">
<a href="/" class="matchapp-brand-link" aria-label="MatchApp Ai"><img class="matchapp-wordmark ma-playai-mark" src="/assets/brand/matchapp-ai-mark.svg?v=20261022-vector1" alt="" width="48" height="48" decoding="async"><span translate="no">MatchApp Ai</span></a>
<a href="/">${escape(copy.homeLabel)}</a>
</header>
<main id="lumina-guide-content" class="lumina-guide-shell">
<nav class="lumina-guide-languages" aria-label="${escape(copy.languageLabel)}"><p>${escape(copy.languageLabel)}</p>${languageLinks}</nav>
<section class="lumina-guide-hero" aria-labelledby="lumina-guide-heading">
<div><p class="lumina-guide-eyebrow">${escape(copy.eyebrow)}</p><h1 id="lumina-guide-heading"><span translate="no">Lumina Match</span><br>${escape(copy.h1)}</h1>${copy.intro.map(paragraph).join('')}
<a class="lumina-guide-play" href="/" data-lumina-play>${escape(copy.playLabel)}</a><p class="lumina-guide-note">${escape(copy.playNote)}</p></div>
<figure><div class="lumina-guide-art" role="img" aria-label="${escape(copy.imageAlt)}">${art}</div><figcaption>${escape(copy.imageCaption)}</figcaption></figure>
</section>
<p class="lumina-guide-date">${escape(copy.updatedLabel)} <time datetime="${source.updated}">${escape(date)}</time> · <span translate="no">MatchApp Ai</span></p>
${sections}
<section class="lumina-guide-panel lumina-guide-faq" aria-labelledby="lumina-guide-faq"><h2 id="lumina-guide-faq">${escape(copy.faqTitle)}</h2>${faq}</section>
<section class="lumina-guide-panel" aria-labelledby="lumina-guide-related"><h2 id="lumina-guide-related">${escape(copy.relatedTitle)}</h2><nav class="lumina-guide-related"><a href="/how-it-works.html">${escape(copy.relatedLinks.how)}</a><a href="/together.html">${escape(copy.relatedLinks.together)}</a><a href="/discover.html">${escape(copy.relatedLinks.discover)}</a></nav><a class="lumina-guide-play" href="/" data-lumina-play>${escape(copy.playLabel)}</a></section>
</main>
<footer class="lumina-guide-shell"><nav><a href="/">${escape(copy.homeLabel)}</a><a href="/about.html">${escape(copy.aboutLabel)}</a><a href="${privacy}">${escape(copy.privacyLabel)}</a><a href="${terms}">${escape(copy.termsLabel)}</a><a href="/contact.html">${escape(copy.contactLabel)}</a></nav><p>© 2026 <span translate="no">MatchApp Ai</span></p></footer>
</body></html>
`;
  return cinemaAssets(canonicalFavicons(html), route(language).slice(1) + 'index.html');
}

function build(root = ROOT) {
  const source = JSON.parse(fs.readFileSync(path.join(root, 'tools/lumina-seo-copy.json'), 'utf8'));
  validate(source);
  const analytics = existingAnalytics(root), changed = [];
  const write = (relative, text) => {
    const file = path.join(root, relative);
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return;
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file, text); changed.push(relative);
  };
  for (const language of LANGUAGES) write(route(language).slice(1) + 'index.html', render(language, source, analytics));
  write('tools/lumina-urls.json', JSON.stringify(LANGUAGES.map(language => SITE + route(language)), null, 2) + '\n');
  return changed;
}
module.exports = { LANGUAGES, ART, route, validate, structuredData, render, build };
if (require.main === module) console.log('Lumina public guides: ' + build().length + ' changed files.');
