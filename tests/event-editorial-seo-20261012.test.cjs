'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const events=JSON.parse(fs.readFileSync(path.join(root,'tools/global-events.json'),'utf8'));
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const decode=(text)=>text.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
test('all event guides use concise, unique and honest metadata',()=>{
  assert.equal(events.length,20);
  const descriptions=new Set();
  for(const event of events){
    const html=read('events/'+event.slug+'/index.html');
    const title=decode(html.match(/<title>([^<]+)<\/title>/)?.[1]||'');
    const description=decode(html.match(/<meta name="description" content="([^"]+)"/)?.[1]||'');
    assert.ok(title.startsWith(event.title.slice(0,10))||event.searchTitle&&title.includes(event.searchTitle.slice(0,10)),event.slug+' wrong title');
    assert.ok(title.length<=60,event.slug+' title too long: '+title.length);
    assert.ok(description.length>65 && description.length<=155,event.slug+' description: '+description.length);
    assert.ok(!descriptions.has(description),event.slug+' duplicate description');
    descriptions.add(description);
    assert.ok(html.includes('<link rel="canonical" href="https://matchapp.tv/events/'+event.slug+'/">'));
    const data=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1]||'{}');
    const schema=data['@graph']?.find(item=>item['@type']==='Event');
    assert.equal(schema?.name,event.title);
    assert.equal(schema?.url,event.official);
    assert.equal(schema?.organizer?.name,event.organizer);
    assert.equal(schema?.organizer?.logo,undefined,'Do not claim our logo represents an external event organizer');
  }
});
test('five source-specific guides explain practical attendance or viewing limits',()=>{
  const slugs=['asian-games-2026','worlds-2026','pax-aus-2026','brasil-game-show-2026','mexico-day-of-dead-2026'];
  for(const slug of slugs){
    const event=events.find(item=>item.slug===slug);
    assert.equal(event?.visitorNotes?.length,3,slug);
    const html=read('events/'+slug+'/index.html');
    assert.match(html,/Before visiting or looking for coverage/);
    for(const note of event.visitorNotes){
      assert.ok(note.length>100,slug+' original explanatory note too short');
      assert.ok(html.includes(note.replace(/&/g,'&amp;').replace(/'/g,'&#39;'))||html.includes(note.slice(0,50)),slug+' note missing');
    }
    assert.ok(html.includes(event.official.replace(/&/g,'&amp;')),slug+' official link missing');
  }
});
test('archive search metadata is short and regenerated guides remain locked to the canonical host',()=>{
 const html=read('events-archive.html');
 const title=decode(html.match(/<title>([^<]+)<\/title>/)?.[1]||'');
 const desc=decode(html.match(/<meta name="description" content="([^"]+)"/)?.[1]||'');
 assert.ok(title.length<=60,title);
 assert.ok(desc.length<=155,desc);
 assert.match(html,/<h1\b[^>]*>Events<\/h1>/);
 assert.match(html,/"name":"Recent and upcoming global entertainment events"/);
 assert.match(html,/https:\/\/matchapp.tv\/events-archive.html/);
 assert.match(read('tools/build-global-events.js'),/eventSearchTitle\(e\)/);
 assert.match(read('tools/build-global-events.js'),/eventSearchDescription\(e\)/);
});
