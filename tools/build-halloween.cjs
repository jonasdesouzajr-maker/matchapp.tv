'use strict';

// Static, translated editorial pages. Country-specific viewing offers are
// requested by the separate guide runtime; this builder promises no territory.
const fs = require('node:fs');
const path = require('node:path');
const {cinemaAssets, canonicalFavicons, versionBrandStylesheet} = require('./finalize-brand.js');

const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://matchapp.tv';
const LOCALES = Object.freeze(['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh', 'zh-TW']);
const SOCIAL_IMAGE = ORIGIN + '/assets/halloween/midnight-cinema-social.jpg';
const VERSION = '20261104-1';
const OG_LOCALES = Object.freeze({en:'en_US', 'pt-BR':'pt_BR', es:'es_ES', fr:'fr_FR', de:'de_DE', it:'it_IT', tr:'tr_TR', ru:'ru_RU', ar:'ar_SA', hi:'hi_IN', id:'id_ID', ja:'ja_JP', ko:'ko_KR', zh:'zh_CN', 'zh-TW':'zh_TW'});

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, c => ({'<':'\\u003c', '>':'\\u003e', '&':'\\u0026', '\u2028':'\\u2028', '\u2029':'\\u2029'}[c]));

function route(lang) {
  if (!LOCALES.includes(lang)) throw new Error('Unsupported Halloween locale: ' + lang);
  return '/halloween/' + (lang === 'en' ? '' : lang.toLowerCase() + '/');
}

function loadCountries() {
  const source = fs.readFileSync(path.join(ROOT, 'viewer-country.js'), 'utf8');
  const match = source.match(/const VIEWING_COUNTRIES\s*=\s*Object\.freeze\((\[[\s\S]*?\])\);/);
  if (!match) throw new Error('Shared viewing-country list is missing');
  const countries = JSON.parse(match[1]);
  if (countries.length < 249 || new Set(countries.map(([,code]) => code)).size !== countries.length) {
    throw new Error('Shared viewing-country list is incomplete or contains duplicates');
  }
  return countries;
}

function regionName(code, lang) {
  // The selected language names the country; it never selects the country.
  return new Intl.DisplayNames([lang], {type:'region'}).of(code);
}

function countriesFor(lang) {
  const collator = new Intl.Collator(lang);
  return loadCountries().map(([,code]) => ({code, name:regionName(code,lang)}))
    .sort((a,b) => collator.compare(a.name,b.name));
}

function loadInputs() {
  const copies = Object.fromEntries(LOCALES.map(lang => [lang, JSON.parse(fs.readFileSync(path.join(ROOT, 'halloween', 'copy', lang + '.json'), 'utf8'))]));
  const films = JSON.parse(fs.readFileSync(path.join(ROOT, 'halloween', 'movies.json'), 'utf8')).films;
  const baseline = copies.en;
  if (!Array.isArray(films) || films.length !== 20 || new Set(films.map(f => f.tmdbId)).size !== 20 || new Set(films.map(f => f.key)).size !== 20) {
    throw new Error('Halloween guide requires exactly 20 unique, verified film identities');
  }
  for (const film of films) {
    if (!/^[a-z0-9-]+$/.test(film.key) || !Number.isSafeInteger(film.tmdbId) || !['cozy','eerie','intense'].includes(film.tone)) throw new Error('Invalid film identity or editorial tone');
    if (!/^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\/[A-Za-z0-9]+\.(?:jpg|png)$/.test(film.poster) || !film.originalTitle || !film.availability?.source_page_url) throw new Error('A film is missing its verified original artwork or title source');
    if (!Number.isFinite(Date.parse(film.checkedAt))) throw new Error('A film is missing its source-check date');
  }
  for (const [lang, copy] of Object.entries(copies)) {
    for (const [key, value] of Object.entries(baseline)) {
      if (typeof value === 'string' && (typeof copy[key] !== 'string' || !copy[key].trim())) throw new Error(lang + ': missing translated copy ' + key);
    }
    if (!Array.isArray(copy.tips) || copy.tips.length !== 3 || copy.tips.some(t => !t.title || !t.text)) throw new Error(lang + ': missing movie-night ideas');
    if (!Array.isArray(copy.faqs) || copy.faqs.length !== 4 || copy.faqs.some(q => !q.question || !q.answer)) throw new Error(lang + ': missing planning answers');
    for (const film of films) if (!copy.why?.[film.key]?.trim()) throw new Error(lang + ': missing original editorial recommendation ' + film.key);
  }
  return {copies, films};
}

function sourceDate(value, lang) {
  return new Intl.DateTimeFormat(lang, {dateStyle:'medium', timeZone:'UTC'}).format(new Date(value));
}

function filmCard(film, index, copy, lang) {
  const numeric = new Intl.NumberFormat(lang, {maximumFractionDigits:2});
  const originalTitle = film.originalTitle;
  const source = film.availability.source_page_url;
  const cast = (film.cast || []).slice(0,5).map(person => '<bdi>' + escape(person.name) + '</bdi>').join(', ');
  const origins = (film.originCountries || []).map(code => escape(regionName(code,lang))).join(', ');
  const rating = Number.isFinite(film.voteAverage) && Number.isFinite(film.voteCount) && film.voteCount > 0
    ? '<p class="hw-rating">' + escape(copy.rating) + ': ' + escape(numeric.format(film.voteAverage)) + '/10 · ' + escape(numeric.format(film.voteCount)) + ' ' + escape(copy.votes) + '</p>' : '';
  const preview = film.previewKind === 'video' && film.previewProvider === 'youtube' && /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(film.previewUrl || '')
    ? '<a class="hw-source" href="' + escape(film.previewUrl) + '" target="_blank" rel="noopener noreferrer external">' + escape(copy.trailer) + '</a>' : '';
  const runtime = Number.isFinite(film.runtimeMinutes) && film.runtimeMinutes > 0
    ? '<span>' + escape(numeric.format(film.runtimeMinutes)) + ' ' + escape(copy.minutes) + '</span>' : '';
  return `<article class="hw-film" id="film-${escape(film.key)}" data-film-id="${film.tmdbId}" data-year="${escape(film.year)}" data-original-title="${escape(originalTitle)}" data-tone="${film.tone}" aria-labelledby="film-title-${escape(film.key)}">
  <img class="hw-poster" src="${escape(film.poster)}" srcset="${escape(film.poster)} 500w, ${escape(film.posterLarge || film.poster)} 780w" sizes="(max-width: 480px) calc(100vw - 28px), (max-width: 760px) 46vw, (max-width: 1050px) 30vw, 280px" alt="${escape(originalTitle)} (${escape(film.year)})" width="500" height="750" loading="lazy" decoding="async">
  <div class="hw-film-copy"><p class="hw-number" aria-hidden="true">${escape(numeric.format(index+1))}</p><h3 id="film-title-${escape(film.key)}"><bdi lang="${escape(film.originalLanguage || 'en')}">${escape(originalTitle)}</bdi></h3>
  <p class="hw-facts"><span>${escape(film.year)}</span>${runtime}<span class="hw-tone" data-tone="${film.tone}">${escape(copy[film.tone])}</span></p>
  <p class="hw-why">${escape(copy.why[film.key])}</p>
  <details class="hw-details"><summary>${escape(copy.facts)}</summary><p>${escape(copy.originalTitle)}: <bdi lang="${escape(film.originalLanguage || 'en')}">${escape(originalTitle)}</bdi></p>${cast ? '<p>' + escape(copy.cast) + ': ' + cast + '</p>' : ''}${origins ? '<p>' + escape(copy.countryOfOrigin) + ': ' + origins + '</p>' : ''}${rating}<p class="hw-source-date">${escape(copy.checked)}: <time datetime="${escape(film.checkedAt)}">${escape(sourceDate(film.checkedAt,lang))}</time></p></details>
  <div class="hw-availability" aria-live="polite"><p>${escape(copy.chooseFirst)}</p></div>
  <button class="hw-button" type="button" data-hw-check="${film.tmdbId}">${escape(copy.watch)}</button><nav class="hw-film-sources" aria-label="${escape(copy.facts)} · ${escape(originalTitle)}"><a class="hw-source" href="${escape(source)}" target="_blank" rel="noopener noreferrer external">${escape(copy.source)}</a>${preview}</nav></div>
</article>`;
}

function schemaFor(lang, copy, films) {
  const url = ORIGIN + route(lang);
  const checkedAt = new Date(Math.max(...films.map(film => Date.parse(film.checkedAt)))).toISOString();
  return {
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'CollectionPage', '@id':url+'#page', url, name:copy.seoTitle, description:copy.description, inLanguage:lang,
        isPartOf:{'@type':'WebSite', name:'MatchApp Ai', url:ORIGIN+'/'}, mainEntity:{'@id':url+'#movies'}, primaryImageOfPage:{'@type':'ImageObject', url:SOCIAL_IMAGE, width:1200, height:800}},
      {'@type':'Article', '@id':url+'#article', mainEntityOfPage:{'@id':url+'#page'}, headline:copy.seoTitle, description:copy.description, inLanguage:lang,
        image:[SOCIAL_IMAGE], dateModified:checkedAt, author:{'@type':'Organization', name:'MatchApp Ai', url:ORIGIN+'/about.html'}, publisher:{'@type':'Organization', name:'MatchApp Ai', url:ORIGIN+'/'}, about:{'@id':url+'#movies'}},
      {'@type':'ItemList', '@id':url+'#movies', name:copy.guideHeading, numberOfItems:films.length, itemListOrder:'https://schema.org/ItemListOrderAscending', itemListElement:films.map((film,index) => ({
        '@type':'ListItem', position:index+1, item:{'@type':'Movie', '@id':url+'#film-'+film.key, url:url+'#film-'+film.key, name:film.originalTitle,
          description:copy.why[film.key], image:film.posterLarge || film.poster, sameAs:[film.availability.source_page_url, ...(film.imdbId ? ['https://www.imdb.com/title/'+film.imdbId+'/'] : [])],
          identifier:{'@type':'PropertyValue', propertyID:'TMDB', value:film.tmdbId}, ...(film.runtimeMinutes > 0 ? {duration:'PT'+film.runtimeMinutes+'M'} : {}),
          actor:(film.cast || []).slice(0,5).map(person => ({'@type':'Person', name:person.name}))}
      }))},
      {'@type':'BreadcrumbList', itemListElement:[{'@type':'ListItem', position:1, name:'MatchApp Ai', item:ORIGIN+'/'}, {'@type':'ListItem', position:2, name:copy.heading, item:url}]}
    ]
  };
}

function render(lang, inputs = loadInputs()) {
  const {copies, films} = inputs;
  const copy = copies[lang];
  const url = ORIGIN + route(lang);
  const title = copy.seoTitle + ' | MatchApp Ai';
  const languages = LOCALES.map(other => '<a class="channel-button" lang="'+other+'" hreflang="'+other+'" href="'+route(other)+'"'+(other===lang?' aria-current="page"':'')+'>'+escape(copies[other].name)+'</a>').join('');
  const options = countriesFor(lang).map(country => '<option value="'+country.code+'">'+escape(country.name)+'</option>').join('');
  const button = (href,label) => '<a class="hw-button" href="'+escape(href)+'">'+escape(label)+'</a>';
  const planner = lang === 'pt-BR' ? '/pt-br/noite-de-filme/' : '/watch-night/';
  const html = `<!doctype html>
<html lang="${lang}" dir="${lang==='ar'?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title><meta name="description" content="${escape(copy.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}">
${LOCALES.map(other => '<link rel="alternate" hreflang="'+other+'" href="'+ORIGIN+route(other)+'">').join('\n')}
<link rel="alternate" hreflang="x-default" href="${ORIGIN+route('en')}">
<meta property="og:type" content="article"><meta property="og:site_name" content="MatchApp Ai"><meta property="og:locale" content="${OG_LOCALES[lang]}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(copy.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SOCIAL_IMAGE}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="800"><meta property="og:image:alt" content="${escape(copy.posterAlt)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(copy.description)}"><meta name="twitter:image" content="${SOCIAL_IMAGE}"><meta name="twitter:image:alt" content="${escape(copy.posterAlt)}">
<link rel="icon" href="/assets/brand/matchapp-ai-favicon.svg"><link rel="stylesheet" href="/brand.css"><link rel="stylesheet" href="/channels/channel.css?v=2"><link rel="stylesheet" href="/halloween/guide.css?v=${VERSION}">
<script type="application/ld+json">${json(schemaFor(lang,copy,films))}</script><script id="hw-copy" type="application/json">${json(copy)}</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<script defer src="/viewer-country.js?v=guestcountry20261027"></script><script defer src="/halloween/config.js?v=${VERSION}"></script><script defer src="/halloween/guide.js?v=${VERSION}"></script>
</head><body class="halloween-page channel-page"><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<main class="hw-layout"><header class="hw-header"><a class="matchapp-brand-link" href="/" aria-label="MatchApp Ai"><img class="matchapp-wordmark ma-playai-mark" width="48" height="48" alt="" src="/assets/brand/matchapp-ai-mark.svg">MatchApp Ai</a><details><summary>${escape(copy.language)} · ${escape(copy.name)}</summary><nav class="channel-language-list" aria-label="${escape(copy.language)}">${languages}</nav></details></header>
<section class="hw-hero" aria-labelledby="hw-heading"><img class="hw-hero-image" src="/assets/halloween/midnight-cinema-1440.webp" srcset="/assets/halloween/midnight-cinema-720.webp 720w, /assets/halloween/midnight-cinema-1440.webp 1440w" sizes="(max-width: 720px) 100vw, 1440px" alt="${escape(copy.posterAlt)}" width="1440" height="960" fetchpriority="high" decoding="async"><div class="hw-hero-copy"><p class="hw-eyebrow">${escape(copy.eyebrow)}</p><h1 id="hw-heading">${escape(copy.heading)}</h1><p class="hw-tagline">${escape(copy.tagline)}</p><p>${escape(copy.intro)}</p><nav>${button('#watch-options',copy.promoCta)}${button('#movie-night',copy.tipsHeading)}<button type="button" class="hw-button" id="hw-share">${escape(copy.share)}</button></nav><p id="hw-share-status" role="status" aria-live="polite"></p></div></section>
<section class="hw-controls" id="watch-options" aria-labelledby="hw-guide-heading"><h2 class="hw-list-title" id="hw-guide-heading">${escape(copy.guideHeading)}</h2><label for="hw-country">${escape(copy.country)}</label><select id="hw-country" aria-describedby="hw-country-note"><option value="">${escape(copy.chooseCountry)}</option>${options}</select><p id="hw-country-note">${escape(copy.countryNote)}</p><div class="hw-filters" role="group" aria-label="${escape(copy.filterLabel)}">${['all','cozy','eerie','intense'].map(tone => '<button class="hw-filter" type="button" data-hw-tone="'+tone+'" aria-pressed="'+(tone==='all')+'">'+escape(copy[tone])+'</button>').join('')}</div><p class="hw-editorial">${escape(copy.editorial)}</p><p id="hw-count" role="status" aria-live="polite">${escape(copy.visibleCount.replace('{count}',new Intl.NumberFormat(lang).format(films.length)))}</p></section>
<section class="hw-grid" aria-labelledby="hw-guide-heading">${films.map((film,index) => filmCard(film,index,copy,lang)).join('\n')}</section>
<p class="hw-attribution">${escape(copy.attribution)} <a href="https://www.justwatch.com/" target="_blank" rel="noopener noreferrer external">JustWatch</a> · <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer external">TMDB</a></p>
<section class="hw-section hw-tips" id="movie-night" aria-labelledby="hw-tips-heading"><h2 id="hw-tips-heading">${escape(copy.tipsHeading)}</h2><p>${escape(copy.tipsIntro)}</p><div class="hw-tip-grid">${copy.tips.map(tip => '<article class="hw-tip"><h3>'+escape(tip.title)+'</h3><p>'+escape(tip.text)+'</p></article>').join('')}</div></section>
<section class="hw-section hw-faq" aria-labelledby="hw-faq-heading"><h2 id="hw-faq-heading">${escape(copy.faqHeading)}</h2>${copy.faqs.map(faq => '<details><summary>'+escape(faq.question)+'</summary><p>'+escape(faq.answer)+'</p></details>').join('')}</section>
<section class="hw-section" aria-labelledby="hw-related-heading"><h2 id="hw-related-heading">${escape(copy.exploreHeading)}</h2><nav class="hw-related" aria-label="${escape(copy.exploreHeading)}">${button(planner,copy.planner)}${button('/together.html',copy.together)}${button('/streaming/',copy.moreGuides)}${button('/',copy.home)}</nav></section>
</main></body></html>\n`;
  return cinemaAssets(versionBrandStylesheet(canonicalFavicons(html)), route(lang).slice(1)+'index.html');
}

function build() {
  // Validate every locale before producing any page, so missing translations
  // cannot silently publish an English fallback or a partial language set.
  const inputs = loadInputs();
  const pages = LOCALES.map(lang => ({lang, html:render(lang,inputs)}));
  for (const page of pages) {
    const directory = path.join(ROOT,route(page.lang));
    fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(path.join(directory,'index.html'),page.html);
  }
  fs.writeFileSync(path.join(ROOT,'tools','halloween-urls.json'),JSON.stringify(LOCALES.map(lang => ORIGIN+route(lang)),null,2)+'\n');
  console.log('Halloween guide: '+pages.length+' fully translated pages, '+inputs.films.length+' verified film identities.');
}

if (require.main === module) build();
module.exports = {LOCALES, ORIGIN, SOCIAL_IMAGE, route, loadInputs, loadCountries, countriesFor, schemaFor, render, build};
