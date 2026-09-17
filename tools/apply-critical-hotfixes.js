'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function write(rel, value) {
  fs.writeFileSync(path.join(ROOT, rel), value, 'utf8');
}
function replaceRequired(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Critical hotfix anchor missing: ${label}`);
  return text.replace(from, to);
}

// Pricing: the working entitlement policy is 3 guest / 5 registered / 10 VIP / 50 Business.
// Change only stale pricing-page claims; do not touch checkout, products or entitlement code here.
{
  const file = 'pricing/pricing.html';
  let html = read(file);
  html = replaceRequired(html,
    '<title>MatchApp TV Ai VIP | Unlimited AI Streaming Concierge &amp; Ad-Free Pass</title>',
    '<title>MatchApp TV Ai VIP | 10 AI Matches Daily &amp; Ad-Free Pass</title>',
    'pricing title');
  html = replaceRequired(html,
    'Unlock unlimited AI matches, Extra Matches, Ask AI credits or a lifetime Ad-Free pass.',
    'Unlock 10 AI matches per day with VIP, plus Extra Matches, Ask AI credits or a lifetime Ad-Free pass.',
    'pricing OG description');
  html = replaceRequired(html,
    'MatchApp VIP, Extra Matches and Ask AI credits. Unlimited concierge picks, ad-free pass, and 2026 entertainment recommendations.',
    'MatchApp VIP, Extra Matches and Ask AI credits. VIP includes 10 AI matches per day, an ad-free experience, and priority routing.',
    'pricing meta description');
  html = replaceRequired(html,
    '"description":"Unlimited AI matches, no ads, priority routing and prioritised regional content."',
    '"description":"10 AI matches per day, no ads, priority routing and prioritised regional content."',
    'pricing Product JSON-LD');
  html = replaceRequired(html,
    'data-i18n="pricing.title">Unlock Unlimited AI Concierge</h1>',
    'data-i18n="pricing.title">Match More With VIP</h1>',
    'pricing heading');
  html = replaceRequired(html,
    'data-i18n="pricing.subtitle">Choose your plan below to remove ads and unlock infinite matches.</p>',
    'data-i18n="pricing.subtitle">Choose VIP for 10 AI matches each day, or buy Extra Matches and Ask AI credits separately.</p>',
    'pricing subtitle');
  html = replaceRequired(html,
    'data-i18n-html="pricing.vipm.f1">✔️ <strong data-i18n="pr.unlimited">Unlimited</strong> AI Matches Daily</li>',
    'data-i18n-html="pricing.vipm.f1">✔️ <strong>10</strong> AI Matches Daily</li>',
    'VIP monthly allowance');
  write(file, html);
}

// Kids Mode: remove only the general-site GTM container.
// Also enrich static search metadata while keeping this child-directed surface free from general-site tracking.
// No Kids allowlist, matching, account, artwork, entitlement or navigation logic changes.
{
  const file = 'kids/index.html';
  let html = read(file);
  html = replaceRequired(html,
    '<title>MatchApp TV Ai Kids — Safe Movies, Shows &amp; Family Entertainment</title>',
    '<title>Kids Movie &amp; Show Matcher by Age, Mood &amp; Decade | MatchApp TV</title>',
    'Kids SEO title');
  html = replaceRequired(html,
    'Make a Kids match from 64 handpicked cartoons, family movies and learning shows from the 1950s to today. Age filters, favorite hearts, complete covers and title-specific viewing guides.',
    'Match safe kids movies, cartoons, family shows and music by age, mood, format and decade. Explore reviewed titles, classic cartoons and regional where-to-watch guides.',
    'Kids meta description');
  html = replaceRequired(html,
    'kids movies streaming, safe cartoons for kids, family movies tonight, classic cartoons 80s 90s, age appropriate kids shows, Kids Mode MatchApp, family entertainment finder, Bluey family watch, Woody Woodpecker kids',
    'kids movie matcher, kids show matcher, safe cartoons for kids, age appropriate kids shows, family movies for kids, preschool shows ages 3-5, kids shows ages 6-8, family entertainment ages 9-12, educational kids shows, classic cartoons 1950s 1960s 1970s 1980s 1990s 2000s, where to watch kids movies, MatchApp Kids Mode',
    'Kids meta keywords');
  html = replaceRequired(html,
    'MatchApp TV Ai Kids — Safe Entertainment Discovery',
    'MatchApp Kids — Safe Movie & Show Matcher by Age and Mood',
    'Kids OG title');
  html = replaceRequired(html,
    'A colorful, age-banded kids mode for finding family movies, animation, educational shows and music with a safety-first AI concierge.',
    'A colorful, age-banded matcher for safe kids movies, cartoons, family shows and music, with reviewed title guides and classic-cartoon discovery.',
    'Kids OG description');
  html = replaceRequired(html,
    'A safety-first entertainment discovery experience for children and families, with age-banded recommendations and a kids-safe AI concierge.',
    'A safety-first kids entertainment matcher for reviewed movies, cartoons, shows and music, with age bands, moods, decades and family viewing guides.',
    'Kids JSON-LD description');
  html = replaceRequired(html,
    '"dateModified":"2026-09-16"',
    '"dateModified":"2026-09-17"',
    'Kids JSON-LD modified date');

  const headBlock = /\n?<!-- Google Tag Manager -->\s*<script>[\s\S]*?<\/script>\s*<!-- End Google Tag Manager -->\s*/;
  const noscriptBlock = /\n?<!-- Google Tag Manager \(noscript\) -->\s*<noscript><iframe[\s\S]*?<\/iframe><\/noscript>\s*<!-- End Google Tag Manager \(noscript\) -->\s*/;
  if (headBlock.test(html)) html = html.replace(headBlock, '\n');
  if (noscriptBlock.test(html)) html = html.replace(noscriptBlock, '\n');
  if (/GTM-M7J3NNBN|googletagmanager\.com/.test(html)) {
    throw new Error('Kids Mode still contains Google Tag Manager after the targeted removal.');
  }
  write(file, html);
}

console.log('Applied critical deploy hotfixes: VIP copy aligned; Kids SEO enriched and GTM removed.');
