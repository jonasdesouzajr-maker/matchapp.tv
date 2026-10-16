'use strict';
// UI-only fixtures in an isolated local browser: no account, auth, AI, payment,
// logout or matching requests are made. External requests are blocked.
const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const widths = [320, 360, 390, 412, 600, 768, 800, 820, 1024, 1100, 1366, 1920];
const languages = Object.keys(require('../data/founder-copy.json'));
const reportDir = process.env.QA_REPORT_DIR || path.join(os.tmpdir(), 'matchapp-header-auth');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
 let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
 if (!file.startsWith(root + path.sep) && file !== root) return res.writeHead(403).end();
 try {
  if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
 } catch { res.writeHead(404).end(); }
});

function inspectPresentationFixture(state) {
 const control = id => document.getElementById(id);
 const signedIn = state === 'signed-in';
 const show = (id, visible, display) => {
  const el = control(id);
  if (!el) throw new Error('Missing fixture control: ' + id);
  el.hidden = !visible;
  el.style.display = visible ? display : 'none';
 };
 show('nav-reg-btn', !signedIn, 'inline-flex');
 show('profile-link-tab', signedIn, 'inline-flex');
 show('nav-logout-btn', signedIn, 'inline-block');
 const header = control('mh-topbox');
 const nodes = [...header.querySelectorAll('nav a,nav button,nav select,nav [role=button]')].filter(el => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
 });
 const name = el => el.id || el.getAttribute('aria-label') || el.className;
 const overlaps = [];
 for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
  const a = nodes[i], b = nodes[j];
  if (a.contains(b) || b.contains(a)) continue;
  const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
  const width = Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
  const height = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
  if (width > 1 && height > 1) overlaps.push({ a: name(a), b: name(b), width, height });
 }
 const auth = ['nav-reg-btn', 'profile-link-tab', 'nav-logout-btn'].map(id => ({ id, display: getComputedStyle(control(id)).display }));
 const authCorrect = (auth[0].display !== 'none') === !signedIn && auth.slice(1).every(el => (el.display !== 'none') === signedIn);
 const escaped = [...header.querySelectorAll('nav.ma-header-actions > *')].filter(el => {
  const r = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect();
  return r.width && r.height && (r.left < p.left - 1 || r.right > p.right + 1 || r.top < p.top - 1 || r.bottom > p.bottom + 1);
 }).map(name);
 return { state, auth, authCorrect, overlaps, escaped, overflow: document.documentElement.scrollWidth - innerWidth };
}

(async () => {
 fs.mkdirSync(reportDir, { recursive: true });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const base = 'http://127.0.0.1:' + server.address().port;
 const browser = await chromium.launch({ headless: true, ...(process.env.QA_CHANNEL ? { channel: process.env.QA_CHANNEL } : {}) });
 const results = [];
 try {
  for (const mode of ['browser', 'android-layout']) {
   const context = await browser.newContext({ viewport: { width: 800, height: 1100 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
   await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
   const page = await context.newPage();
   await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
   await page.waitForFunction(() => typeof window.setLanguage === 'function' && document.querySelector('nav.ma-header-actions'));
   if (mode === 'android-layout') await page.evaluate(() => document.documentElement.classList.add('matchapp-ai-android'));
   for (const lang of languages) {
    await page.evaluate(value => window.setLanguage(value), lang === 'pt' ? 'pt-BR' : lang);
    await page.waitForTimeout(80);
    for (const width of widths) {
     await page.setViewportSize({ width, height: width < 600 ? 900 : 1100 });
     await page.waitForTimeout(40);
     for (const state of ['signed-out', 'signed-in']) {
      const result = await page.evaluate(inspectPresentationFixture, state);
      const passed = result.authCorrect && !result.overlaps.length && !result.escaped.length && !result.overflow;
      results.push({ mode, lang, width, ...result, passed });
      if (!passed) {
       fs.writeFileSync(path.join(reportDir, 'failure.json'), JSON.stringify(results.at(-1), null, 2));
       await page.screenshot({ path: path.join(reportDir, 'failure.png') });
       throw new Error('Header fixture failed: ' + JSON.stringify(results.at(-1)));
      }
     }
    }
    console.log('PASS', mode, lang, widths.length * 2, 'layout states');
   }
   await context.close();
  }
 } finally {
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), results }, null, 2));
  await browser.close();
  server.close();
 }
 console.log(JSON.stringify({ checks: results.length, passed: results.filter(r => r.passed).length, reportDir }));
})().catch(error => { console.error(error.stack); server.close(); process.exitCode = 1; });
