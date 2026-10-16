'use strict';

const copy = require('./discovery-editorial.json');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function validateEditorial(keys) {
  const used = new Set();
  for (const key of keys) {
    const article = copy[key];
    if (!article?.heading || article.paragraphs?.length !== 3) {
      throw new Error('Missing original selection guidance: ' + key);
    }
    for (const paragraph of article.paragraphs) {
      if (typeof paragraph !== 'string' || !paragraph.trim() || used.has(paragraph.trim())) {
        throw new Error('Empty or repeated selection guidance: ' + key);
      }
      used.add(paragraph.trim());
    }
  }
}

function renderEditorial(key) {
  const article = copy[key];
  if (!article) throw new Error('Missing original selection guidance: ' + key);
  return `<section class="seo-section seo-editorial" aria-labelledby="selection-guide"><h2 id="selection-guide">${esc(article.heading)}</h2>${article.paragraphs.map(p => `<p>${esc(p)}</p>`).join('\n')}<p class="seo-count">Selection guidance from MatchApp Ai. <a href="/about.html">Sources and corrections</a>.</p></section>`;
}

module.exports = {validateEditorial, renderEditorial};
