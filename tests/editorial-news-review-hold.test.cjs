'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 15));

async function visit(t, restoreLive = false) {
  // Exercise the production switch, without loading unrelated Home behavior.
  const htmlTag = read('index.html').match(/<html\b[^>]*>/i)[0];
  const w = new JSDOM(htmlTag + '<head></head><body><main></main></body></html>', {
    url:'https://matchapp.tv/', runScripts:'outside-only', pretendToBeVisual:true
  }).window;
  t.after(() => w.close());
  if (restoreLive) delete w.document.documentElement.dataset.editorialNews;
  else w.document.documentElement.dataset.editorialNews = 'snapshot';
  const urls = [], intervals = [];
  w.setInterval = (fn, delay) => { intervals.push({fn, delay}); return intervals.length; };
  w.matchMedia = () => ({matches:true});
  const item = {
    id:'snapshot', title:'Archived headline', source:'BBC', source_domain:'bbc.com',
    url:'https://www.bbc.com/news/articles/snapshot', language:'en', country:'US',
    category:'entertainment', published_at:'2026-10-17T12:00:00Z'
  };
  w.fetch = async input => {
    const url = String(input);
    urls.push(url);
    if (url === '/cdn-cgi/trace') return {ok:true,text:async()=>'loc=US\n'};
    if (url === '/news/data.json') return {ok:true,json:async()=>({
      feed_version:'saved', generated_at:'2026-10-18T12:00:00Z', items:[item]
    })};
    if (url.includes('/functions/v1/regional-news-rss')) return {ok:true,json:async()=>({
      ok:true, feed_version:'live', country:'US', language:'en', items:[]
    })};
    throw new Error('Unexpected request '+url);
  };
  w.eval(read('live-news-loader.js'));
  w.eval(read('latest-news.js'));
  await tick();
  return {w, urls, intervals};
}

test('review mode keeps the dated publisher snapshot and stops live startup, event and interval updates', async t => {
  const {w, urls, intervals} = await visit(t);
  const d = w.document;
  const section = d.getElementById('latest-news');
  section.querySelector('summary').click();
  assert.equal(section.open, true);
  for (const type of ['visibilitychange','matchapp:langchange','matchapp:news-static-ready']) d.dispatchEvent(new w.Event(type));
  await tick();
  assert.equal(urls.filter(url => url.includes('regional-news-rss')).length, 0);
  assert.equal(intervals.length, 0);
  assert.ok(urls.includes('/news/data.json'));
  const card = section.querySelector('[data-news-id="snapshot"]');
  assert.ok(card.querySelector('a[href="https://www.bbc.com/news/articles/snapshot"]'));
  assert.match(card.textContent, /Oct 17/);
  assert.match(section.querySelector('.ma-news-meta').textContent, /Oct 18/);
});

test('removing only the release marker restores both enrichment paths and the live poll', async t => {
  const {w, urls, intervals} = await visit(t, true);
  const requested = () => urls.filter(url => url.includes('regional-news-rss')).length;
  assert.ok(requested() >= 2);
  const poll = intervals.find(({delay}) => delay === 30000);
  assert.ok(poll);
  const initial = requested();
  poll.fn();
  await tick();
  assert.ok(requested() > initial);
  assert.ok(w.document.querySelector('[data-news-id="snapshot"]'));
});
