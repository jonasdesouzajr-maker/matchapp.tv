'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const topic=require('../topic-focus.js');
const row=(title,cats,platform='YouTube')=>({title,cats,platform});

test('Surprise Me shows only movies, series, telenovelas and vetted entertainment YouTube',()=>{
  for(const c of ['movie','series','limited series','K-drama','novela brasileira','telenovela'])
    assert.equal(topic.allow(row('Example '+c,[c],'Netflix'),[]),true,c);
  assert.equal(topic.allow(row('Pitch Meeting',['YouTube channel'],'YouTube'),[]),true);
  assert.equal(topic.allow(row('MrBeast',['YouTube channel','YouTube Shorts'],'YouTube'),[]),true);
  assert.equal(topic.allow(row('Unknown channel',['YouTube channel'],'YouTube'),[]),false);
  for(const [title,cats,platform] of [
    ['Babish Culinary Universe',['YouTube channel','Cooking & Recipes'],'YouTube'],
    ['Yoga With Adriene',['YouTube channel','Fitness & Wellness'],'YouTube'],
    ['NPR Tiny Desk Concerts',['YouTube channel','Music & Concerts'],'YouTube'],
    ['News station',['News'],'YouTube'],['Sports radio',['Sports'],'YouTube'],
    ['A playlist',['Spotify playlist'],'Spotify'],['A podcast',['podcast'],'Spotify'],
    ['An audiobook',['audiobook'],'Audible'],['A music album',['music album'],'Spotify']
  ])assert.equal(topic.allow(row(title,cats,platform),[]),false,title);
});
test('explicit specialty selection never leaks into entertainment video, other specialists or generic YouTube',()=>{
  const cooking=row('Maangchi',['YouTube channel','Cooking & Recipes']);
  const playlist=row('Daily Hits',['Spotify playlist'],'Spotify');
  const comedy=row('Pitch Meeting',['YouTube channel']);
  assert.equal(topic.allow(cooking,['Cooking & Recipes']),true);
  assert.equal(topic.allow(comedy,['Cooking & Recipes']),false);
  assert.equal(topic.allow(playlist,['Cooking & Recipes']),false);
  assert.equal(topic.allow(cooking,['YouTube channel']),false);
  assert.equal(topic.allow(comedy,['YouTube channel']),true);
  assert.equal(topic.allow(playlist,['Spotify playlist']),true);
  assert.equal(topic.allow(playlist,['music album']),false);
  assert.equal(topic.allow(row('Song',['Spotify single'],'Spotify'),['Spotify playlist']),false);
  assert.equal(topic.allow(row('Film',['movie'],'Netflix'),['Spotify playlist']),false);
  assert.equal(topic.allow(row('ATK',['Cooking & Recipes','YouTube channel']),['movie']),false);
  assert.equal(topic.allow(row('Yoga With Adriene',['YouTube channel','Fitness & Wellness']),['Fitness & Wellness']),true);
});
test('cross-topic chip mixtures discard conflicts but preserve normal movie/TV multi-select',()=>{
  assert.deepEqual(topic.normalizeSelection(['movie','series','telenovela']),['movie','series','telenovela']);
  assert.deepEqual(topic.normalizeSelection(['movie','Cooking & Recipes'],'Cooking & Recipes'),['Cooking & Recipes']);
  assert.deepEqual(topic.normalizeSelection(['Cooking & Recipes','Spotify playlist'],'Spotify playlist'),['Spotify playlist']);
  assert.deepEqual(topic.normalizeSelection(['Spotify playlist','music album'],'music album'),['Spotify playlist','music album']);
  assert.deepEqual(topic.normalizeSelection(['Spotify playlist','movie'],'movie'),['movie']);
});
test('desktop, tablet and mobile share the same quick topic form and hidden category select',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const script=fs.readFileSync('criteria.js','utf8');
  const css=fs.readFileSync('topic-focus.css','utf8');
  assert.match(html,/topic-focus\.js/);
  assert.match(html,/topic-focus\.css/);
  assert.match(html,/option value="Cooking &amp; Recipes"/);
  assert.match(html,/option value="Fitness &amp; Wellness"/);
  assert.match(html,/matchapp-topic-description/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(script,/resetIncompatibleFilters/);
  assert.match(script,/mountTopicQuick/);
  const dom=new JSDOM('<article id="questionnaire-box"><h2>Find what to watch</h2><div class="q-grid--primary"><div><label>Category</label><select id="q-category"><option value="any">Surprise Me</option><optgroup label="Film"><option value="movie">Movies</option><option value="series">Series</option><option value="telenovela">Novelas</option></optgroup><optgroup label="Specialists"><option value="YouTube channel">YouTube</option><option value="Cooking & Recipes">Cooking</option><option value="Spotify playlist">Playlists</option></optgroup></select></div><div><label>Platform</label><select id="q-platform"><option value="any">Any platform</option><option value="Spotify">Spotify</option><option value="YouTube">YouTube</option></select></div></div></article>',{
    url:'https://matchapp.tv/',runScripts:'outside-only'});
  const w=dom.window;
  w.MatchAppTopicFocus=topic;
  w.matchPolicy={incompatible:()=>false};
  w.eval(script);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  let controls=w.document.querySelectorAll('#matchapp-topic-shortcuts button[data-topic]');
  assert.equal(controls.length,5);
  const click=id=>w.document.querySelector('#matchapp-topic-shortcuts button[data-topic="'+id+'"]').click();
  click('cooking');
  assert.equal(w.getMatchCriteria().cat[0],'Cooking & Recipes');
  w.setMatchCriteria({plat:['YouTube']});
  click('spotify');
  assert.equal(w.getMatchCriteria().cat[0],'Spotify playlist');
  assert.equal(w.getMatchCriteria().plat.length,0);
  click('surprise');
  assert.equal(w.getMatchCriteria().cat.length,0);
  click('youtube');
  assert.equal(w.getMatchCriteria().cat[0],'YouTube channel');
  dom.window.close();
});
test('all live adult matching entry points load the shared topic guard before app.js',()=>{
  for(const page of ['index.html','discover.html','together.html']){
    const html=fs.readFileSync(page,'utf8');
    assert(html.includes('/topic-focus.js?v=20260928-1'),page+' missing opt-in guard');
    assert(html.indexOf('/topic-focus.js?v=')<html.indexOf('/app.js?v='),page+' guard must load first');
  }
});
test('all adult curated pickers and post-source preflight enforce the opt-in guard',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/entryAllowedForSelection\(e,requested\.cat\)/);
  assert.match(app,/entryAllowedForSelection\(e,cat\)/);
  assert.match(app,/entryAllowedForSelection\(entry,requested\.cat\)/);
  assert.match(app,/entryAllowedForSelection\(preflight,requested\.cat\)/);
  assert.match(app,/!specialistTopic && typeof aiProposedVerifiedExact/);
  assert.match(app,/!specialistTopic\)\s*\{\s*try \{ preflight = await withMatchSourceDeadline\(\(\)=>discoverVerifiedExactTMDB/);
  for(const channel of ['Babish Culinary Universe','Maangchi','Joshua Weissman',"America's Test Kitchen"])
    assert(app.includes(channel),'missing cooking channel '+channel);
  assert.match(htmlForTests(),/Match Together/);
});
function htmlForTests(){return fs.readFileSync('index.html','utf8')}
