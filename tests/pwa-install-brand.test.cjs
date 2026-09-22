const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('PWA keeps one localized app identity and uses the uploaded MatchApp icon',()=>{
  const en=JSON.parse(read('manifest.json'));
  const pt=JSON.parse(read('manifest-pt-br.json'));
  assert.equal(en.name,'MatchApp Ai');
  assert.equal(en.short_name,'MatchApp Ai');
  assert.equal(pt.name,'MatchApp iA');
  assert.equal(pt.short_name,'MatchApp iA');
  assert.equal(en.id,'https://matchapp.tv/');
  assert.equal(pt.id,en.id);
  assert.equal(en.scope,'/');
  assert.equal(pt.scope,'/');
  assert.equal(en.display,'standalone');
  assert.equal(pt.display,'standalone');
  for(const m of [en,pt]){
    assert.ok(m.icons.some(i=>i.sizes==='192x192'&&/matchapp-ai-install-192\.png/.test(i.src)&&i.purpose==='any'));
    assert.ok(m.icons.some(i=>i.sizes==='512x512'&&/matchapp-ai-install-512\.webp/.test(i.src)&&i.purpose==='any'));
    assert.equal(m.icons.some(i=>i.purpose==='maskable'),false,'tightly cropped artwork must not be declared maskable');
  }
  assert.ok(fs.statSync(path.join(root,'assets/brand/matchapp-ai-install-192.png')).size>10000);
  assert.ok(fs.statSync(path.join(root,'assets/brand/matchapp-ai-install-512.webp')).size>20000);
});

test('browser install is real, consent-based, secure and localized',()=>{
  const js=read('install.js');
  const state=read('app-install-state.js');
  const sw=read('sw.js');
  assert.match(js,/beforeinstallprompt/);
  assert.match(js,/deferredInstallPrompt\.prompt\(\)/);
  assert.match(js,/appinstalled/);
  assert.match(js,/secureInstallContext\(\)/);
  assert.match(js,/window\.isSecureContext === true/);
  assert.match(js,/manifest-pt-br\.json/);
  assert.match(js,/MatchApp iA/);
  assert.match(js,/MatchApp Ai/);
  assert.match(js,/Add to Home Screen/);
  assert.match(js,/MatchAppTVAndroid/);
  assert.match(js,/navigator\.serviceWorker\.register\('\/sw\.js', \{ scope: '\/', updateViaCache: 'none' \}\)/);
  assert.match(state,/manifest-pt-br\.json/);
  assert.match(sw,/self\.addEventListener\('fetch', \(\) => \{\}\)/);
  assert.match(sw,/matchapp-ai-install-192\.png/);
});

test('Home advertises the fresh localized install surface',()=>{
  const home=read('index.html');
  assert.match(home,/rel="manifest" href="\/manifest\.json\?v=20260922-install1"/);
  assert.match(home,/apple-touch-icon" href="\/assets\/brand\/matchapp-ai-install-192\.png\?v=20260922-install1"/);
  assert.match(home,/apple-mobile-web-app-title" content="MatchApp Ai"/);
  assert.match(home,/application-name" content="MatchApp Ai"/);
  assert.match(home,/\/install\.js\?v=20260922-install1/);
  assert.match(home,/\/app-install-state\.js\?v=20260922-install1/);
});
