'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {test} = require('node:test');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'tools', 'midnight-report.js');
const OUT = path.join(ROOT, 'reports', 'midnight-latest.md');

test('midnight report builder writes the issue #1 sections from repo data only', () => {
  execFileSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    env: {...process.env, CHANGED: '0', DEPLOYED: '0', INDEXNOW: '0'},
    stdio: 'pipe'
  });
  const md = fs.readFileSync(OUT, 'utf8');
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
