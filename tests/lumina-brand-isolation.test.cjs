'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { cinemaAssets } = require('../tools/finalize-brand.js');
const root = path.resolve(__dirname, '..');
const gamePath = 'lumina-match/browser/index.html';
const game = fs.readFileSync(path.join(root, gamePath), 'utf8');

test('the cinema asset pass preserves the embedded Lumina document exactly', () => {
  assert.equal(cinemaAssets(game, gamePath), game);
  assert.equal(cinemaAssets(game, gamePath.replaceAll('/', '\\')), game);
  const publicPage = cinemaAssets(game, 'lumina-match/index.html');
  assert.notEqual(publicPage, game, 'the exclusion must not extend to other public pages');
  assert.match(publicPage, /reference-system\.js/);
  assert.equal(cinemaAssets(publicPage, 'lumina-match/index.html'), publicPage);
});

test('real brand publication skips only the game iframe through repeated passes', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumina-brand-isolation-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const publicPath = 'lumina-match/index.html';
  for (const rel of [gamePath, publicPath]) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), game);
  }
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'tools/finalize-brand.js'), 'utf8'), {
    require, module, __dirname: path.join(dir, 'tools'), URLSearchParams
  });
  const read = rel => fs.readFileSync(path.join(dir, rel), 'utf8');
  assert.equal(module.exports.finalizeBrand([gamePath]), 0);
  assert.equal(read(gamePath), game);
  assert.equal(module.exports.finalizeBrand(), 1);
  assert.equal(read(gamePath), game, 'the isolated game remains byte-for-byte unchanged');
  const publicPage = read(publicPath);
  assert.match(publicPage, /matchapp-brand-bar/);
  assert.match(publicPage, /jonas-adult-page\.js/);
  assert.match(publicPage, /reference-system\.js/);
  assert.equal(module.exports.finalizeBrand(), 0);
  assert.equal(read(gamePath), game);
  assert.equal(read(publicPath), publicPage);
});
