'use strict';
// Render the real production header. Optional candidate overlay changes only
// the existing language-fit stylesheet; no API responses or quotas are mocked.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'matchapp-language-control-'));
const candidate = process.env.MATCHAPP_QA_LANGUAGE_CANDIDATE === '1';
const selected = process.env.MATCHAPP_QA_LANGUAGE_SELECTED || 'es';
const widths = (process.env.MATCHAPP_QA_LANGUAGE_WIDTHS || '320,360,390,412,600,768,1024,1280,1440,1920').split(',').map(Number);
const report = { candidateStylesheet: candidate, backendMocks: false, cases: [], started: new Date().toISOString() };

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.MATCHAPP_QA_PROXY ? { proxy: { server: process.env.MATCHAPP_QA_PROXY } } : {}) });
  try {
    for (const width of widths) {
      const row = { width };
      report.cases.push(row);
      const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'en-US' });
      try {
        if (candidate) await context.route('**/patches/ask-language-label-fit-20261015.css?*', route => route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(root, 'patches/ask-language-label-fit-20261015.css')) }));
        const page = await context.newPage();
        await page.goto('https://matchapp.tv/discover.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
        const summary = page.locator('details.ma-reference-header-tools > summary').first();
        await summary.waitFor({ state: 'visible' });
        await page.waitForFunction(() => document.querySelector('.ma-reference-header-original').getAnimations().every(animation => animation.playState !== 'running'));
        await summary.click();
        const select = page.locator('#lang-switcher');
        await select.waitFor({ state: 'visible', timeout: 5000 });
        const bounds = await select.boundingBox();
        row.bounds = bounds;
        await page.screenshot({ path: path.join(out, width + '-open.png') });
        assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && bounds.height >= 42, 'language control fits the viewport and has a usable touch target');
        await select.selectOption('pt-BR');
        await page.waitForFunction(() => window.MATCH_LANG === 'pt-BR');
        await select.selectOption(selected);
        await page.waitForFunction(code => window.MATCH_LANG === code, selected);
        const localizedBounds = await select.boundingBox();
        assert(localizedBounds.x >= 0 && localizedBounds.x + localizedBounds.width <= width + 1, 'localized control remains inside the viewport');
        row.selected = await select.inputValue();
        await page.screenshot({ path: path.join(out, width + '.png') });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(code => window.MATCH_LANG === code, selected);
        await page.waitForFunction(() => document.querySelector('.ma-reference-header-original').getAnimations().every(animation => animation.playState !== 'running'));
        await summary.click();
        await select.waitFor({ state: 'visible' });
        assert.equal(await select.inputValue(), selected, 'user language persists after reload');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
        await summary.click();
        assert.equal(await select.isVisible(), false, 'closed tools panel still hides its controls');
        row.passed = true;
      } catch (error) {
        row.passed = false;
        row.error = error.message;
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    report.finished = new Date().toISOString();
    report.passed = report.cases.filter(row => row.passed).length;
    report.failed = report.cases.length - report.passed;
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ out, passed: report.passed, failed: report.failed }));
    if (report.failed) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
