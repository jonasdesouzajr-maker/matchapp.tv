'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowDir = path.resolve(__dirname, '../.github/workflows');
const load = name => fs.readFileSync(path.join(workflowDir, name), 'utf8');
const publishers = [
  'archive-international-day.yml',
  'brand-normalize.yml',
  'kids-seo-refresh.yml',
  'music-video-refresh.yml',
  'seo-hardening.yml',
  'sitemap-refresh.yml',
  'unified-refresh.yml'
];

test('all content publishers serialize without replacing pending runs', () => {
  for (const name of publishers) {
    assert.match(
      load(name),
      /^concurrency:\r?\n  group: matchapp-content-publish\r?\n  cancel-in-progress: false\r?\n  queue: max\r?$/m,
      name + ' must preserve all pending content releases'
    );
  }
  assert.match(load('pages-deploy.yml'), /^  queue: max\r?$/m);
});

test('one daily editorial schedule, owned by unified refresh', () => {
  const files = fs.readdirSync(workflowDir).filter(name => /\.ya?ml$/.test(name));
  const scheduled = files.filter(name => /^  schedule:\s*$/m.test(load(name)));
  assert.deepEqual(scheduled, ['unified-refresh.yml']);
  const unified = load('unified-refresh.yml');
  assert.match(unified, /^    - cron: '30 4 \* \* \*'\r?$/m);
  assert.match(unified, /01:30 America\/Sao_Paulo/);
});
