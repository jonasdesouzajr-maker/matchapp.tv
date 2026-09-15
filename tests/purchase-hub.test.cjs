const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','pricing.js'),'utf8');

test('purchase hub keeps Matches and Ask AI credits visibly and functionally separate',()=>{
  assert.match(source,/Extra Matches do not expire and never consume Ask AI credits/);
  assert.match(source,/1 credit = 1 Ask AI prompt\. Credits are for Ask AI only and never buy Matches/);
  assert.match(source,/data-match-pack=/);
  assert.match(source,/data-credit-pack=/);
  assert.match(source,/window\.buyMatches/);
  assert.match(source,/window\.buyCredits/);
});

test('legacy shared-credit purchase UI is removed from interaction',()=>{
  assert.match(source,/legacyPurchaseUi/);
  assert.match(source,/aria-hidden/);
  assert.match(source,/tabindex/);
  assert.match(source,/credits-section\[data-legacy-purchase-ui\]\{display:none!important\}/);
});

test('purchase tab navigation preserves language and other query parameters',()=>{
  assert.match(source,/const url=new URL\(location\.href\)/);
  assert.match(source,/url\.searchParams\.set\('focus',b\.dataset\.target\)/);
  assert.doesNotMatch(source,/history\.replaceState\(null,'',`\?focus=/);
});

test('purchase controls expose keyboard and checkout progress accessibility',()=>{
  assert.match(source,/aria-controls=/);
  assert.match(source,/role="tabpanel"/);
  assert.match(source,/ArrowLeft/);
  assert.match(source,/ArrowRight/);
  assert.match(source,/aria-busy/);
  assert.match(source,/prefers-reduced-motion:reduce/);
});
