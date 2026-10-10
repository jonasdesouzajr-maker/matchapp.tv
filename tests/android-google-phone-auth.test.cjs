'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const web=read('app.js');
const native=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
const html=read('index.html');
const styles=read('auth-premium.css');
const phone=read('phone-auth.js');

function googleHarness(nativeBridge=true) {
  const start=web.indexOf('async function loginWithOAuthProvider(provider, label) {');
  const end=web.indexOf('window.loginWithGoogle =', start);
  assert.ok(start>0&&end>start,'isolated Google handler exists');
  const opened=[],calls=[],messages=[];
  const window={location:{origin:'https://matchapp.tv'}};
  if(nativeBridge)window.MatchAppNativeAuth={openOAuth:url=>opened.push(url)};
  const document={getElementById:()=>({style:{},set innerText(v){messages.push(v)}})};
  const supabaseClient={auth:{signInWithOAuth:async p=>{
    calls.push(p);
    return {data:{url:'https://zkymvqrmbabngsqblyye.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fmatchapp.tv%2Findex.html'},error:null};
  }}};
  const fn=new Function('window','document','supabaseClient',web.slice(start,end)+'; return loginWithOAuthProvider;')(window,document,supabaseClient);
  return {fn,opened,calls,messages};
}
test('Android Google selection launches verified Supabase OAuth in system browser with PKCE',async()=>{
  const {fn,opened,calls,messages}=googleHarness();
  await fn('google','Google');
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.redirectTo,'https://matchapp.tv/index.html');
  assert.equal(calls[0].options.skipBrowserRedirect,true);
  assert.equal(calls[0].options.queryParams.prompt,'select_account');
  assert.equal(opened.length,1);
  assert.match(opened[0],/^https:\/\/zkymvqrmbabngsqblyye\.supabase\.co\/auth\/v1\/authorize\?/);
  assert.equal(messages.length,0);
  assert.match(web,/flowType:\(window\.MatchAppNativeAuth/);
});
test('Browser Google sign-in stays in normal browser, does not require native bridge',async()=>{
  const {fn,opened,calls}=googleHarness(false);
  await fn('google','Google');
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.skipBrowserRedirect,undefined);
  assert.equal(opened.length,0);
});
test('Native Google callback validates issuer, provider, matchapp redirect and HTTPS',()=>{
  assert.match(native,/web\.addJavascriptInterface\(NativeAuthBridge\(\), "MatchAppNativeAuth"\)/);
  assert.match(native,/target\.host != "zkymvqrmbabngsqblyye\.supabase\.co"/);
  assert.match(native,/target\.getQueryParameter\("provider"\) != "google"/);
  assert.match(native,/redirect\.path != "\/index\.html"/);
  assert.match(native,/Intent\.CATEGORY_BROWSABLE/);
  assert.match(native,/override fun onNewIntent\(intent: Intent\)/);
  const manifest=read('android-studio/app/src/main/AndroidManifest.xml');
  assert.match(manifest,/android:autoVerify="true"/);
  assert.match(manifest,/android:host="matchapp\.tv"/);
});
test('Sign-in, sign-up and SMS share premium styling and verified OTP',()=>{
  assert.match(html,/\/auth-premium\.css\?v=20261010-android-auth49/);
  assert.match(html,/auth-brand-word">MatchApp <b>Ai<\/b>/);
  assert.match(styles,/#main-auth-modal \.google-signin-btn/);
  assert.match(styles,/#main-auth-modal \.phone-auth-entry/);
  assert.match(styles,/#main-auth-modal \.auth-tab/);
  assert.match(phone,/verifyOtp\(\{phone:activePhone,token,type:'sms'\}\)/);
  assert.match(phone,/confirmed\.data\.user\.phone_confirmed_at/);
  assert.match(phone,/friendlySmsError\(error,'send'\)/);
  assert.match(phone,/friendlySmsError\(error,'verify'\)/);
  assert.doesNotMatch(read('kids/index.html'),/auth-premium\.css/);
});
test('Release is Android adult v49 with unchanged native AdMob and UMP gates',()=>{
  const gradle=read('android-studio/app/build.gradle.kts');
  assert.match(gradle,/versionCode = 49/);
  assert.match(gradle,/versionName = "1\.1\.49"/);
  assert.match(gradle,/ca-app-pub-9541435081010948\/4843348278/);
  const admob=read('android-studio/app/src/main/java/com/jonas/papercup/AdMobController.kt');
  assert.match(admob,/canRequestAds\(\)/);
  assert.match(admob,/fun setAdFree\(adFree: Boolean\)/);
});