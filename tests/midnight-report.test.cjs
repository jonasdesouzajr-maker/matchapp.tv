'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const {test} = require('node:test');

const ROOT = path.join(__dirname, '..');

test('midnight report builder writes the issue #1 sections from repo data only', (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'midnight-report-'));
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));
  // The builder resolves paths from its script location. Copy its inputs so
  // validation never overwrites the tracked report or a publication candidate.
  for (const rel of [
    'tools/midnight-report.js', 'index.html', 'news/data.json',
    'tools/global-events.json', 'data/international-day.json',
    'data/weekly-pick.json', 'weekly-pick.js', 'sitemap.xml'
  ]) {
    const dest = path.join(fixture, rel);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    fs.copyFileSync(path.join(ROOT, rel), dest);
  }
  execFileSync(process.execPath, [path.join(fixture, 'tools', 'midnight-report.js')], {
    cwd: fixture,
    env: {...process.env, CHANGED: '0', DEPLOYED: '0', INDEXNOW: '0'},
    stdio: 'pipe'
  });
  const md = fs.readFileSync(path.join(fixture, 'reports', 'midnight-latest.md'), 'utf8');
  for (const heading of [
    '# Midnight content rotation report',
    '## Top Titles',
    '## NEWS',
    '## Events',
    '## Weekly AI choice',
    '## Primary SEO keywords',
    '## Sitemap / indexing',
    '## Deployment',
    '## Errors'
  ]) {
    assert.match(md, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(md, /MutationObserver|requestAnimationFrame loop/);
});
