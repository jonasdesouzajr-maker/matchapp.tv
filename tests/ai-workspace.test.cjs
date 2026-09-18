const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('home exposes one branded MatchApp AI launch action instead of the old inline Ask box',()=>{
  const html=read('index.html');
  const css=read('style.css');
  assert.match(html,/class="top-ai-launch" href="\/discover\.html\?focus=start"/);
  assert.match(html,/assets\/brand\/matchapp-ai-orbit-fullbleed\.svg/);
  assert.match(html,/Talk to our Ai/);
  assert.doesNotMatch(html,/id="top-ask-input"/);
  assert.doesNotMatch(html,/<form class="top-ask"/);
  assert.match(css,/\.top-ai-launch\s*\{/);
  assert.match(css,/@keyframes aiLaunchOrbit/);
});

test('AI Concierge has a foldable left conversation rail with clickable history, New chat and live usage meter',()=>{
  const html=read('discover.html');
  const js=read('discover.js');
  assert.match(html,/id="ai-sidebar"/);
  assert.match(html,/id="ai-sidebar-toggle"/);
  assert.match(html,/id="ai-new-chat"/);
  assert.equal((html.match(/id="chat-history-list"/g)||[]).length,1);
  assert.match(html,/id="ai-usage-fill"/);
  assert.match(html,/id="ai-workflow-fill"/);
  assert.match(js,/window\.toggleAiSidebar/);
  assert.match(js,/window\.openThread/);
  assert.match(js,/function renderThreadList/);
  assert.match(js,/checkDailyLimit\('ask_ai'\)/);
  assert.match(js,/refreshAiWorkspaceStatus/);
  assert.match(js,/startAiWorkflow/);
  assert.match(js,/finishAiWorkflow/);
});

test('missing AI artwork becomes a synopsis-aware MatchApp poster and is persisted instead of blank',()=>{
  const js=read('discover.js');
  const app=read('app.js');
  assert.match(js,/function discoverFallbackPoster\(item\)/);
  assert.match(js,/cats: item\.type \? \[item\.type\] : \[\]/);
  assert.match(js,/platform: item\.platform \|\| ''/);
  assert.match(js,/synopsis: item\.synopsis \|\| item\.overview \|\| ''/);
  assert.match(js,/img\.src = fallbackArtwork/);
  assert.match(js,/source: verified \? 'verified' : \(\(meta && meta\.source\) \|\| 'matchapp-generated'\)/);
  assert.match(app,/title: "The Joe Rogan Experience"/);
  assert.match(app,/Long-form conversations spanning comedy, science, MMA and culture/);
  assert.match(app,/test: \/podcast\//);
  assert.match(app,/return cacheAndReturn\(generatedCover\(title, hints\)\)/);
});

test('Android project documents live web synchronization for both standard and Kids apps',()=>{
  const readme=read('android-studio/README.md');
  const main=read('android-studio/app/src/main/java/tv/matchapp/app/MainActivity.kt');
  const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
  assert.match(readme,/Web → Android synchronization policy/);
  assert.match(readme,/MatchApp Ai \(`:app`\).*loads the main/s);
  assert.match(readme,/MatchApp Ai KIDS \(`:kidsapp`\).*loads `https:\/\/matchapp\.tv\/kids\/`/s);
  assert.match(main,/https:\/\/matchapp\.tv\/\?utm_source=android_app/);
  assert.match(kids,/https:\/\/matchapp\.tv\/kids\/\?utm_source=android_kids_app/);
});
