'use strict';
// UI-only regression: never click support, send feedback, or invoke matching/AI.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const copy = require('../data/founder-copy.json');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:18797';
const reportDir = process.env.QA_REPORT_DIR || path.join(os.tmpdir(), 'matchapp-founder-fit');
const widths = [320, 390, 700, 800, 820, 1024, 1366, 1440];
(async () => {
  fs.mkdirSync(reportDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.QA_CHANNEL ? { channel: process.env.QA_CHANNEL } : {}) });
  const results = [];
  try {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      if (new URL(base).hostname === '127.0.0.1') await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
      const page = await context.newPage();
      const response = await page.goto(base + '/founder/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response.ok()) throw new Error('Founder HTTP ' + response.status());
      await page.waitForFunction(() => typeof window.setLanguage === 'function' && document.querySelector('#ma-donate-shortcut span'));
      await page.evaluate(() => document.fonts.ready);
      for (const lang of Object.keys(copy)) {
        await page.evaluate(value => window.setLanguage(value), lang === 'pt' ? 'pt-BR' : lang);
        await page.waitForFunction(expected => document.querySelector('h1').textContent === expected, copy[lang].heading);
        await page.waitForTimeout(150);
        const state = await page.evaluate(() => {
          const button = document.querySelector('#ma-donate-shortcut'), label = button.querySelector('span');
          const bounds = button.getBoundingClientRect(), range = document.createRange();
          range.selectNodeContents(label);
          const rects = [...range.getClientRects()].filter(r => r.width && r.height);
          const lineCount = new Set(rects.map(r => Math.round(r.top))).size;
          const contained = rects.every(r => r.left >= bounds.left - 1 && r.right <= bounds.right + 1 && r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1);
          const companion = document.querySelector('#ma-ambient-jonas')?.getBoundingClientRect();
          const collisions = companion ? [...document.querySelectorAll('header.app-header nav a, header.app-header nav button')].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.left < companion.right && r.right > companion.left && r.top < companion.bottom && r.bottom > companion.top; }).map(el => el.textContent.trim()) : [];
          return { label: label.textContent, lineCount, contained, overflow: document.documentElement.scrollWidth - innerWidth, collisions, whiteSpace: getComputedStyle(label).whiteSpace, width: bounds.width, height: bounds.height };
        });
        results.push({ viewportWidth: width, lang, ...state, passed: state.lineCount === 1 && state.contained && state.overflow === 0 && state.collisions.length === 0 });
        if ([320, 800, 1440].includes(width) && ['en', 'fr', 'ar'].includes(lang)) await page.screenshot({ path: path.join(reportDir, `${width}-${lang}.png`) });
      }
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify({ base, verifiedAt: new Date().toISOString(), results }, null, 2));
  const failures = results.filter(result => !result.passed);
  console.log(JSON.stringify({ checks: results.length, passed: results.length - failures.length, failures, reportDir }, null, 2));
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
