'use strict';

// Deterministic local UI checks only. Third-party requests are blocked:
// this does not certify live provider destinations, authentication or playback.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const output = process.env.MATCHAPP_STREAMING_QA_OUT || path.join(os.tmpdir(), 'matchapp-streaming-browser-qa');
const languages = ['en','pt','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const sourceCopy = JSON.parse(fs.readFileSync(path.join(root, 'data/partnership-copy.json'), 'utf8'));
const directoryCopy = JSON.parse(fs.readFileSync(path.join(root, 'data/streaming-directory-copy.json'), 'utf8'));
const supportCopy = require('../patches/reference-support.js');
const searchCopy = JSON.parse(fs.readFileSync(path.join(root, 'data/search-page-copy.json'), 'utf8'));
const authoredCopy = Object.fromEntries(languages.map(language => [language, {...sourceCopy[language], ...supportCopy.sponsor[language], ...directoryCopy[language]}]));
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data/streaming-services.json'), 'utf8'));
const active = registry.services.filter(service => service.status === 'active');
const tracked = ['streaming/index.html','sponsor/index.html','patches/partnership-copy.js','patches/partnership-pages.js','patches/partnership-pages.css','ai-composer.js','data/streaming-services.json','data/streaming-directory-copy.json'];
const fingerprints = () => Object.fromEntries(tracked.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const report = {
  generated_at: new Date().toISOString(),
  scope: 'Local Chromium UI; third-party requests blocked; no live provider/playback/account verification.',
  active_services: active.length,
  fingerprints_before: fingerprints(),
  checks: [],
  screenshots: [],
  page_errors: [],
  local_failures: [],
  blocked_hosts: {},
  failures: []
};
try { report.git_commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(); } catch (_) { report.git_commit = null; }
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server = http.createServer((req, res) => {
  let file;
  try {
    file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const stat = fs.statSync(file);
    if (!stat.isFile()) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', (mime[path.extname(file)] || 'application/octet-stream') + ';charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
  } catch (_) {
    res.writeHead(404).end();
  }
});

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function snapshot(page, width, route, language) {
  const state = await page.evaluate(() => ({
    width: innerWidth,
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    heading: document.querySelector('h1')?.textContent,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
    twitterTitle: document.querySelector('meta[name="twitter:title"]')?.content,
    ads: document.querySelectorAll('script[src*="adsbygoogle"],ins.adsbygoogle').length,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    selectedLanguage: document.getElementById('mp-language')?.value,
    savedLanguage: localStorage.getItem('match_lang'),
    wrongLabels: [...document.querySelectorAll('[data-mp]')].filter(node => {
      const selected = document.getElementById('mp-language').value;
      return node.textContent !== window.MATCHAPP_PARTNERSHIP_COPY[selected][node.dataset.mp];
    }).map(node => ({key: node.dataset.mp, actual: node.textContent, expected: window.MATCHAPP_PARTNERSHIP_COPY[document.getElementById('mp-language').value][node.dataset.mp]})),
    formCompany: document.querySelector('[name="company"]')?.value,
    controls: [...document.querySelectorAll('#mp-service-query,#mp-market,#mp-offer')].map(node => {
      const box = node.getBoundingClientRect();
      return {id: node.id, width: box.width, height: box.height, left: box.left, right: box.right};
    })
  }));
  report.checks.push({kind: 'locale-layout', width, route, language, ...state});
  assert(state.overflow <= 1, route + ' ' + language + ' at ' + width + ': horizontal overflow ' + state.overflow);
  if (language === 'pt') assert(['pt', 'pt-BR'].includes(state.lang), 'Portuguese language code must remain pt or pt-BR');
  else assert.equal(state.lang, language);
  assert.equal(state.dir, language === 'ar' ? 'rtl' : 'ltr');
  assert.equal(state.selectedLanguage, language);
  assert.equal(state.heading, authoredCopy[language][route === 'streaming' ? 'dirTitle' : 'title']);
  assert.equal(state.ads, 0, route + ': unexpected ad injection');
  assert.equal(state.canonical, 'https://matchapp.tv/' + route + '/');
  assert.deepEqual(state.wrongLabels, [], route + ' ' + language + ': untranslated labels');
  assert.equal(state.ogTitle, state.title);
  assert.equal(state.twitterTitle, state.title);
  if (route === 'streaming') {
    assert.equal(state.title, directoryCopy[language].streamingSeoTitle);
    assert.equal(state.description, directoryCopy[language].streamingSeoDescription);
    for (const control of state.controls) {
      assert(control.height >= 44, control.id + ' touch target too short: ' + control.height);
      assert(control.width >= 90, control.id + ' unusably narrow: ' + control.width);
      assert(control.left >= -1 && control.right <= width + 1, control.id + ' clipped horizontally');
    }
  } else {
    assert.equal(state.title, searchCopy[language][1]);
    assert.equal(state.description, searchCopy[language][2]);
  }
  return state;
}

async function visibleIds(page) {
  return page.locator('.mp-service').evaluateAll(nodes => nodes.filter(node => !node.hidden).map(node => node.id.replace(/^service-/, '')).sort());
}

async function expectServices(page, ids) {
  assert.deepEqual(await visibleIds(page), [...ids].sort());
  assert.equal(Number(await page.locator('#mp-results-count').textContent()), ids.length);
}

async function clearFilters(page) {
  await page.selectOption('#mp-market', '');
  await page.selectOption('#mp-offer', '');
  await page.fill('#mp-service-query', '');
}

async function capture(page, file, selector) {
  const destination = path.join(output, file);
  if (selector) await page.locator(selector).screenshot({path: destination, animations: 'disabled'});
  else await page.screenshot({path: destination, fullPage: false, animations: 'disabled'});
  report.screenshots.push(destination);
}

async function runWidth(browser, base, width) {
  const context = await browser.newContext({
    viewport: {width, height: 900},
    reducedMotion: 'reduce',
    isMobile: width < 700,
    hasTouch: width < 1000
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    report.blocked_hosts[url.hostname] = (report.blocked_hosts[url.hostname] || 0) + 1;
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => report.page_errors.push({width, url: page.url(), message: error.message}));
  page.on('response', response => {
    if (response.url().startsWith(base) && response.status() >= 400) report.local_failures.push({width, url: response.url(), status: response.status()});
  });
  try {
    await page.goto(base + '/streaming/', {waitUntil: 'networkidle'});
    await page.waitForFunction(() => Boolean(window.MATCHAPP_PARTNERSHIP_COPY) && document.getElementById('mp-results-count'));
    for (const language of languages) {
      await page.selectOption('#mp-language', language);
      await settle(page);
      await snapshot(page, width, 'streaming', language);
    }

    await page.selectOption('#mp-language', width === 390 ? 'ar' : width === 820 ? 'ja' : width === 320 ? 'pt' : 'en');
    await page.selectOption('#mp-market', 'IN');
    await page.selectOption('#mp-offer', 'free_ads');
    await page.fill('#mp-service-query', 'Amazon miniTV');
    await expectServices(page, ['mx-player-by-prime-video']);
    assert.equal(await page.locator('#mp-directory-empty').isVisible(), false);
    for (const id of ['mp-service-query','mp-market','mp-offer']) {
      const locator = page.locator('#' + id);
      await locator.evaluate(node => node.scrollIntoView({block: 'center'}));
      const hit = await locator.evaluate(node => {
        const r = node.getBoundingClientRect();
        const element = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return element === node || node.contains(element);
      });
      assert(hit, id + ' is covered by another element at ' + width);
    }
    await page.locator('#mp-service-query').evaluate(node => node.scrollIntoView({block: 'center'}));
    await capture(page, 'streaming-' + width + '-filtered.png');

    await page.selectOption('#mp-market', 'BR');
    await expectServices(page, []);
    assert.equal(await page.locator('#mp-directory-empty').isVisible(), true);
    await page.selectOption('#mp-market', 'IN');
    await page.selectOption('#mp-offer', 'rent');
    await expectServices(page, []);
    await clearFilters(page);

    await page.fill('#mp-service-query', 'Ａｐｐｌｅ ＴＶ＋');
    assert((await visibleIds(page)).includes('apple-tv'));
    await page.fill('#mp-service-query', 'Apple TV');
    await page.selectOption('#mp-offer', 'rent');
    assert((await visibleIds(page)).includes('apple-tv-store'));
    assert(!(await visibleIds(page)).includes('apple-tv'));
    await clearFilters(page);

    await page.selectOption('#mp-market', 'ZA');
    await page.selectOption('#mp-offer', 'subscription');
    await page.fill('#mp-service-query', 'Showmax');
    await expectServices(page, []);
    assert.equal(await page.locator('#mp-legacy-services').isVisible(), true);
    assert.equal(await page.locator('#mp-legacy-services').getAttribute('open'), '');
    const showmax = page.locator('.mp-legacy-service').filter({has: page.locator('h3', {hasText: /^Showmax$/})});
    assert.equal(await showmax.count(), 1);
    const successor = registry.services.find(service => service.id === 'showmax').successor_id;
    await showmax.locator('[data-current-service]').click();
    assert.equal(new URL(page.url()).hash, '#service-' + successor);
    assert.equal(await page.inputValue('#mp-service-query'), '');
    assert.equal(await page.inputValue('#mp-market'), '');
    assert.equal(await page.inputValue('#mp-offer'), '');
    assert((await visibleIds(page)).includes(successor));
    await page.locator('#service-' + successor).scrollIntoViewIfNeeded();
    if (width === 390 || width === 1366) await capture(page, 'streaming-' + width + '-successor.png', '#service-' + successor);

    const unmapped = active.filter(service => service.representative_markets.length === 0);
    assert(unmapped.length > 0);
    await page.selectOption('#mp-market', 'BR');
    const brazilIds = await visibleIds(page);
    assert(unmapped.every(service => !brazilIds.includes(service.id)));
    await clearFilters(page);
    const allIds = await visibleIds(page);
    assert(unmapped.every(service => allIds.includes(service.id)));
    assert.equal(allIds.length, active.length);
    const invalidSources = await page.locator('.mp-service-evidence a').evaluateAll(nodes => nodes.filter(node => {
      const url = new URL(node.href);
      return url.protocol !== 'https:' || url.username || url.password || !node.rel.includes('noopener');
    }).map(node => node.href));
    assert.deepEqual(invalidSources, []);
    report.checks.push({kind: 'directory-actions', width, and_filters: true, unicode_alias: true, apple_access_separation: true, showmax_successor: successor, unmapped_market_exclusion: true, https_sources: true});

    await page.selectOption('#mp-language', 'pt');
    await page.goto(base + '/sponsor/', {waitUntil: 'networkidle'});
    await settle(page);
    await snapshot(page, width, 'sponsor', 'pt');
    await page.fill('[name="company"]', 'Local QA Studio');
    await page.fill('[name="market"]', 'Brasil');
    await page.fill('[name="goal"]', 'Local test only; no email submitted.');
    assert.equal(await page.locator('#mp-brief').evaluate(form => form.checkValidity()), true);
    for (const language of languages) {
      await page.selectOption('#mp-language', language);
      await settle(page);
      const state = await snapshot(page, width, 'sponsor', language);
      assert.equal(state.formCompany, 'Local QA Studio');
    }
    await page.selectOption('#mp-language', width === 390 ? 'ar' : 'pt');
    await page.locator('#mp-brief').evaluate(node => node.scrollIntoView({block: 'center'}));
    if (width === 390 || width === 1366) await capture(page, 'sponsor-' + width + '-form.png');

    await page.selectOption('#mp-language', 'ar');
    await page.goto(base + '/streaming/', {waitUntil: 'networkidle'});
    await settle(page);
    await snapshot(page, width, 'streaming', 'ar');
    assert.equal(await page.evaluate(() => localStorage.getItem('match_lang')), 'ar');
    report.checks.push({kind: 'cross-route-language', width, streaming_to_sponsor: 'pt', sponsor_to_streaming: 'ar', preserved: true});
    console.log('PASS width', width, ': 28 locale layouts, directory actions, sponsor form and route persistence');
  } finally {
    await context.close();
  }
}

(async () => {
  fs.mkdirSync(output, {recursive: true});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({headless: true});
    report.browser_version = browser.version();
    const widths = process.env.MATCHAPP_STREAMING_QA_WIDTHS ? process.env.MATCHAPP_STREAMING_QA_WIDTHS.split(',').map(Number) : [320,390,820,1366];
    for (const width of widths) {
      try {
        await runWidth(browser, base, width);
      } catch (error) {
        report.failures.push({width, message: error.message, stack: error.stack});
        console.error('FAIL width', width, error.message);
      }
    }
    if (report.page_errors.length) report.failures.push({kind: 'page-errors', count: report.page_errors.length});
    const relevantLocalFailures = report.local_failures.filter(item => /partnership|streaming-directory/.test(item.url));
    if (relevantLocalFailures.length) report.failures.push({kind: 'new-resource-errors', requests: relevantLocalFailures});
  } catch (error) {
    report.failures.push({kind: 'runner', message: error.message, stack: error.stack});
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    report.fingerprints_after = fingerprints();
    report.source_changed_during_run = JSON.stringify(report.fingerprints_before) !== JSON.stringify(report.fingerprints_after);
    if (report.source_changed_during_run) report.failures.push({kind: 'source-changed', message: 'Relevant source changed during QA; evidence is not for one exact revision.'});
    report.pass = report.failures.length === 0;
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({pass: report.pass, checks: report.checks.length, screenshots: report.screenshots.length, page_errors: report.page_errors.length, local_failures: report.local_failures.length, output}));
    if (!report.pass) process.exitCode = 1;
  }
})();

