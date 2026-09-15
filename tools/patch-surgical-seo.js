const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const GTM_ID = 'GTM-M7J3NNBN';
const ADSENSE_ID = 'ca-pub-9541435081010948';
const GTM_HEAD = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<!-- End Google Tag Manager -->`;
const GTM_NOSCRIPT = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
const DEFAULT_ICON = '<link rel="icon" href="/logo-192.jpeg" type="image/jpeg">';

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, text) => fs.writeFileSync(path.join(root, rel), text);
function replaceRequired(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Missing expected source for ${label}`);
  return text.replace(from, to);
}
function count(text, needle) { return text.split(needle).length - 1; }

// Homepage: copy/meta/schema only, plus the missing favicon.
let home = read('index.html');
home = replaceRequired(home,
  '<meta property="og:description" content="Speak or type your mood to our voice-enabled AI Concierge. It finds your perfect movie, series, K-drama, anime, novela, micro-drama or podcast in seconds — and links you straight to it.">',
  '<meta property="og:description" content="Speak or type your mood to our voice-enabled AI Concierge. It finds your perfect movie, series, K-drama, anime, novela, micro-drama or YouTube video in seconds — and links you straight to it.">',
  'homepage OG description');
home = replaceRequired(home,
  '<meta property="og:image:alt" content="MatchApp — Premium AI Streaming Concierge">',
  '<meta property="og:image:alt" content="MatchApp TV Ai — Premium AI Streaming Concierge">',
  'homepage og:image:alt');
home = replaceRequired(home,
  '<meta name="twitter:image:alt" content="MatchApp — Premium AI Streaming Concierge">',
  '<meta name="twitter:image:alt" content="MatchApp TV Ai — Premium AI Streaming Concierge">',
  'homepage twitter image alt');
home = replaceRequired(home,
  '"name":"MatchApp — Your AI Concierge for Entertainment","dateModified":"2026-09-14"',
  '"name":"MatchApp TV Ai","dateModified":"2026-09-15"',
  'homepage WebPage schema name/date');
home = replaceRequired(home,
  'or select Surprise Me to let the AI decide everything.',
  'or select Surprise Me to get a video pick from movies, TV series, K-dramas, novelas and YouTube video.',
  'HowTo Surprise Me copy');
home = replaceRequired(home,
  'The AI returns one perfect title with real cover art, a playable trailer and a synopsis, drawn from movies, series, K-dramas, anime, novelas, micro-dramas, podcasts and Spotify.',
  'The AI returns one title with real cover art, a playable trailer and a synopsis. Surprise Me stays in the video catalog; podcast, audio, news and sports are considered only when you explicitly select them.',
  'HowTo result copy');
write('index.html', home);

// Legal pages: title only; no legal body copy changes.
let privacy = read('privacy.html');
privacy = replaceRequired(privacy, '<title>Match App | Privacy Policy</title>', '<title>MatchApp TV Ai | Privacy Policy</title>', 'privacy title');
write('privacy.html', privacy);
let terms = read('terms.html');
terms = replaceRequired(terms, '<title>Match App | Terms of Service</title>', '<title>MatchApp TV Ai | Terms of Service</title>', 'terms title');
write('terms.html', terms);

// Registration remains a noindex redirect stub; only correct its destination/canonical/link.
let register = read('register.html');
register = replaceRequired(register, 'content="0; url=/index.html?openAuth=1"', 'content="0; url=/?openAuth=1"', 'register meta refresh');
register = replaceRequired(register, '<link rel="canonical" href="https://matchapp.tv/index.html">', '<link rel="canonical" href="https://matchapp.tv/">', 'register canonical');
register = replaceRequired(register, "window.location.replace('/index.html?openAuth=1');", "window.location.replace('/?openAuth=1');", 'register JS redirect');
register = replaceRequired(register, '<a href="/index.html?openAuth=1">MatchApp</a>', '<a href="/?openAuth=1">MatchApp</a>', 'register fallback link');
write('register.html', register);

function addGtmPair(rel) {
  let text = read(rel);
  const hasScript = text.includes('www.googletagmanager.com/gtm.js') && text.includes(GTM_ID);
  const hasNoScript = text.includes(`www.googletagmanager.com/ns.html?id=${GTM_ID}`);
  if (!hasScript) {
    if (!/<head>/i.test(text)) throw new Error(`No <head> in ${rel}`);
    text = text.replace(/<head>/i, `<head>\n${GTM_HEAD}`);
  }
  if (!hasNoScript) {
    if (!/<body>/i.test(text)) throw new Error(`No <body> in ${rel}`);
    text = text.replace(/<body>/i, `<body>\n${GTM_NOSCRIPT}`);
  }
  write(rel, text);
}

addGtmPair('kids/index.html');
const titleRoot = path.join(root, 'kids', 'titles');
const titlePages = fs.readdirSync(titleRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => `kids/titles/${entry.name}/index.html`)
  .filter(rel => fs.existsSync(path.join(root, rel)));
for (const rel of titlePages) addGtmPair(rel);

// Keep regenerated Kids title pages from losing the required GTM pair.
let builder = read('tools/build-kids-pages.js');
if (!builder.includes('const GTM_HEAD=')) {
  const marker = 'function page(title,description,url,body,data){return `<!doctype html><html lang="en"><head><meta charset=';
  if (!builder.includes(marker)) throw new Error('Kids page generator template marker changed');
  const prefix = `const GTM_HEAD=${JSON.stringify(GTM_HEAD)};\nconst GTM_NOSCRIPT=${JSON.stringify(GTM_NOSCRIPT)};\nfunction page(title,description,url,body,data){return \`<!doctype html><html lang="en"><head>\${GTM_HEAD}<meta charset=`;
  builder = builder.replace(marker, prefix);
  const bodyMarker = '</script></head><body><header>';
  if (!builder.includes(bodyMarker)) throw new Error('Kids generator body marker changed');
  builder = builder.replace(bodyMarker, '</script></head><body>${GTM_NOSCRIPT}<header>');
  write('tools/build-kids-pages.js', builder);
}

// Favicon: add one standard existing asset only to HTML documents that truly lack an icon.
function htmlFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}
const allHtml = htmlFiles(root);
for (const full of allHtml) {
  let text = fs.readFileSync(full, 'utf8');
  if (!/<head\b/i.test(text) || /<link\b[^>]*rel=["'][^"']*\bicon\b/i.test(text)) continue;
  const viewport = /<meta\b[^>]*name=["']viewport["'][^>]*>/i;
  if (viewport.test(text)) text = text.replace(viewport, m => `${m}\n${DEFAULT_ICON}`);
  else text = text.replace(/<head\b[^>]*>/i, m => `${m}\n${DEFAULT_ICON}`);
  fs.writeFileSync(full, text);
}

// Safety checks requested for this pass.
home = read('index.html');
if (!home.includes('<title>What to Watch Tonight | MatchApp TV Ai</title>')) throw new Error('Homepage title changed unexpectedly');
if (count(home, '<link rel="canonical" href="https://matchapp.tv/">') !== 1) throw new Error('Homepage canonical is not exactly matchapp.tv/');
if (count(home, '<meta property="og:url" content="https://matchapp.tv/">') !== 1) throw new Error('Homepage og:url is not exactly matchapp.tv/');
if (count(home, GTM_ID) !== 2) throw new Error('Homepage GTM must be one script + one noscript');
if (!read('register.html').includes('<meta name="robots" content="noindex, follow">')) throw new Error('register noindex/follow changed');
if (read('404.html').match(/rel=["']canonical["']/i)) throw new Error('404 canonical was unexpectedly introduced');
if (!read('profile/profile.html').match(/name=["']robots["'][^>]*noindex\s*,\s*nofollow/i)) throw new Error('Profile indexing directive changed');

for (const rel of ['kids/index.html', ...titlePages]) {
  const text = read(rel);
  if (count(text, GTM_ID) !== 2) throw new Error(`${rel}: GTM must be exactly one head script + one body noscript`);
  if (!text.match(/<head>\s*<!-- Google Tag Manager -->/i)) throw new Error(`${rel}: GTM script is not at the start of head`);
  if (!text.match(/<body>\s*<!-- Google Tag Manager \(noscript\) -->/i)) throw new Error(`${rel}: GTM noscript is not immediately after body`);
}
for (const full of allHtml) {
  const text = fs.readFileSync(full, 'utf8');
  if (/<link\b[^>]*rel=["']canonical["'][^>]*matchapp\.cc/i.test(text) || /property=["']og:url["'][^>]*matchapp\.cc/i.test(text)) {
    throw new Error(`matchapp.cc reintroduced as primary/canonical in ${path.relative(root, full)}`);
  }
  if (/<head\b/i.test(text) && !/<link\b[^>]*rel=["'][^"']*\bicon\b/i.test(text)) throw new Error(`Missing favicon after patch: ${path.relative(root, full)}`);
}

const allTextFiles = [];
(function walk(dir){
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && /\.(?:html|js|json|yml|yaml|md|txt|xml)$/i.test(entry.name)) allTextFiles.push(full);
  }
})(root);
const gtmIds = new Set(), adsenseIds = new Set();
for (const full of allTextFiles) {
  const text = fs.readFileSync(full, 'utf8');
  for (const id of text.match(/GTM-[A-Z0-9]+/g) || []) gtmIds.add(id);
  for (const id of text.match(/ca-pub-\d+/g) || []) adsenseIds.add(id);
}
if ([...gtmIds].some(id => id !== GTM_ID)) throw new Error(`Unexpected GTM ID(s): ${[...gtmIds].join(', ')}`);
if ([...adsenseIds].some(id => id !== ADSENSE_ID)) throw new Error(`Unexpected AdSense publisher(s): ${[...adsenseIds].join(', ')}`);

console.log(`Patched verified metadata, redirects, favicons, Kids GTM hub + ${titlePages.length} title pages.`);
console.log(`GTM ID: ${GTM_ID}; AdSense publisher: ${ADSENSE_ID}.`);
