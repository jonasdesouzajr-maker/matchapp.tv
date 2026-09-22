const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('Kids grown-up exit uses a deliberate 3-second hold only as the verification trigger',()=>{
 const g=read('kids/kids-guardian.js');
 assert.match(g,/elapsed \/ 3000/);
 assert.match(g,/authorizeGuardian\(\)\.then/);
 assert.match(g,/kids-gate-hand/);
 assert.match(g,/--hold-progress/);
 assert.doesNotMatch(g,/left <= 0[^\n]*finishGate\(true\)/);
});

test('Kids parent gate has persistent PIN and browser platform-verification fallback paths',()=>{
 const g=read('kids/kids-guardian.js');
 assert.match(g,/match_kids_parent_pin_v1/);
 assert.match(g,/savePin/);
 assert.match(g,/verifyPin/);
 assert.match(g,/platformAuthenticatorAvailable/);
 assert.match(g,/navigator\.credentials\.create/);
 assert.match(g,/navigator\.credentials\.get/);
 assert.match(g,/ensureGuardianSetup/);
 assert.match(g,/isDesktopGate\(\)/);
});

test('Kids Android shell keeps the grown-up exit visible but protects the handoff natively',()=>{
 const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
 assert.match(kids,/MATCHAPP_ANDROID_KIDS_ONLY/);
 assert.match(kids,/NativeGuardianBridge/);
 assert.match(kids,/BiometricPrompt/);
 assert.match(kids,/target\.id === 'kids-exit'/);
 assert.doesNotMatch(kids,/\.install-btn,\.kids-install,#kids-exit,\.kids-pill-exit/);
 assert.match(kids,/android_kids_exit/);
});

test('Kids page cache-busts the parental guardian release',()=>{
 const html=read('kids/index.html');
 assert.match(html,/\/kids\/kids-guardian\.js\?v=20260922-guardian2/);
});
