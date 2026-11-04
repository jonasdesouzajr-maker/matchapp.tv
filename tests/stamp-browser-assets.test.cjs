'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {stampHtml} = require('../tools/stamp-browser-assets.cjs');

test('published page cache keys preserve existing parameters and skip external URLs', () => {
    const hashes = new Map([['/brand.css','abc123'], ['/jonas/example.js','def456']]);
    const html = '<link href="/brand.css?v=old&amp;theme=1"><script src="example.js#example"></script><script src="https://other.example/brand.css"></script>';
    const stamped = stampHtml(html,'jonas/index.html',hashes);
    assert.equal(stamped, html.replace('theme=1','theme=1&amp;ma_rev=abc123').replace('example.js#','example.js?ma_rev=def456#'));
    assert.equal(stampHtml(stamped,'jonas/index.html',hashes),stamped);
    hashes.set('/brand.css','abc456');
    assert.match(stampHtml(stamped,'jonas/index.html',hashes),/theme=1&amp;ma_rev=abc456"/);
});