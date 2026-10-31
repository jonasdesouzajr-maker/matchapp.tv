'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const site = 'https://matchapp.tv';
const publicFiles = new Map();
for (const [, url] of fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const location = new URL(url);
  if (location.origin !== site) continue;
  const route = location.pathname.slice(1);
  publicFiles.set(route.endsWith('/') || !route ? route + 'index.html' : route, url);
}

const start = '<!-- MatchApp discovery previews -->';
const end = '<!-- end MatchApp discovery previews -->';
const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Keep editorial overrides. Recompute only tags this helper owns when a title or image changes.
function completePublicHead(html, relativePath, document) {
  const canonical = publicFiles.get(relativePath);
  if (!canonical || relativePath.startsWith('kids/')) return html;
  const head = document.head;
  if (head.querySelector('link[rel="canonical"]')?.getAttribute('href') !== canonical ||
      /\bnoindex\b/i.test(head.querySelector('meta[name="robots"]')?.content || '')) return html;
  const title = document.title.trim();
  const description = head.querySelector('meta[name="description"]')?.content.trim();
  if (!title || !description) return html;
  const tags = [];
  const existing = (attribute, name) => head.querySelector(`meta[${attribute}="${name}"]:not([data-ma-preview])`)?.content;
  function add(attribute, name, fallback) {
    const value = existing(attribute, name);
    if (value) return value;
    tags.push(`<meta ${attribute}="${name}" content="${escape(fallback)}" data-ma-preview>`);
    return fallback;
  }
  const ogTitle = add('property', 'og:title', title);
  const ogDescription = add('property', 'og:description', description);
  add('property', 'og:type', 'website');
  add('property', 'og:url', canonical);
  const image = add('property', 'og:image', existing('name', 'twitter:image') || site + '/og-image.jpg?v=20260928-brand-preview1');
  add('name', 'twitter:card', 'summary_large_image');
  add('name', 'twitter:title', ogTitle);
  add('name', 'twitter:description', ogDescription);
  add('name', 'twitter:image', image);
  if (!head.querySelector('script[type="application/ld+json"]:not([data-ma-preview])')) {
    const page = {'@context':'https://schema.org','@type':'WebPage',url:canonical,name:title,description,
      inLanguage:document.documentElement.lang || 'en',isPartOf:{'@type':'WebSite',name:'MatchApp Ai',url:site+'/'}};
    tags.push('<script type="application/ld+json" data-ma-preview>'+JSON.stringify(page).replace(/</g,'\\u003c')+'</script>');
  }
  const block = tags.length ? [start,...tags,end].join('\n') + '\n' : '';
  const from = html.indexOf(start), to = html.indexOf(end, from);
  if (from >= 0 && to > from) {
    const after = to + end.length;
    return html.slice(0,from) + block + html.slice(after).replace(/^\r?\n/,'');
  }
  return block ? html.replace(/<\/head>/i, () => block + '</head>') : html;
}

function publicHeadForHtml(html,file) {
  if (!publicFiles.has(file) || file.startsWith('kids/')) return html;
  const dom = new JSDOM(html.slice(0,html.indexOf('</head>')+7));
  try {return completePublicHead(html,file,dom.window.document);}
  finally {dom.window.close();}
}

function refreshPublicFiles(scopes) {
  let changed = 0;
  for (const file of publicFiles.keys()) {
    if (scopes && !scopes.some(scope=>file===scope || scope.endsWith('/') && file.startsWith(scope))) continue;
    const full = path.join(root,file);
    if (!fs.existsSync(full)) continue; // A source may retire a page before its sitemap is rebuilt.
    const original = fs.readFileSync(full,'utf8');
    const html = publicHeadForHtml(original,file);
    if (html !== original) {fs.writeFileSync(full,html); changed++;}
  }
  return changed;
}
module.exports = {completePublicHead, publicHeadForHtml, refreshPublicFiles};
if (require.main === module) console.log('Updated discovery metadata on '+refreshPublicFiles()+' public pages.');
