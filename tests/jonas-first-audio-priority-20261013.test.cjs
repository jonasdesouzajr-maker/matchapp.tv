/* Jonas first-audio routing regression: preserve gender policy, native priority and cloud fallback. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function source(name) {
  const code = fs.readFileSync(path.join(root, 'jonas', name), 'utf8');
  new vm.Script(code, { filename: name });
  return code;
}

test('floating Jonas greeting tries only a policy-approved immediate device voice', () => {
  const code = source('floating-voice-20261010-v5.js');
  assert.match(code, /immediateMaleVoice=.*voiceFor\(speechLocale\)/);
  assert.match(code, /if\(window\.MatchAppJonasSpeech&&!immediateMaleVoice\)/);
  assert.match(code, /var selected=immediateMaleVoice\|\|voiceFor\(lang\)/);
  assert.match(code, /function voiceFor\(lang\)[\s\S]*?MatchAppJonasVoicePolicy/);
  assert.match(code, /onEnd:function\(\)\{if\(token===session\)finish\(\)\}/);
});

test('standalone Jonas uses native Android TTS before paid cloud synthesis', () => {
  const code = source('jonas-20261010-v3.js');
  assert.match(code, /if\(window\.MatchAppJonasSpeech && \(forceCloud \|\| typeof window\.MatchAppNativeVoice\?\.speak !== 'function'\)\)/);
  assert.match(code, /if \(window\.MatchAppNativeVoice\?\.speak && !forceCloud\)/);
  assert.match(code, /if \(active\) \{ nativeStarted = true; startNativeFace\(\); \}/);
  assert.match(code, /const nativeUnavailable = \(\) =>/);
  assert.match(code, /window\.MatchAppJonasSpeech\.speak/);
});

test('full-answer TTS tries approved male on-device speech before cloud synthesis', () => {
  const code = source('secure-speech-20261010.js');
  assert.match(code, /localApproved=.*MatchAppJonasVoicePolicy\?\.select/);
  assert.match(code, /if\(localApproved\)\{/);
  assert.match(code, /approvedFallback\(text,chosen,opts,token,true\)/);
  assert.match(code, /if\(ok\)options\.onEnd\?\.\(true\)/);
  assert.match(code, /if\(!fallback&&token===epoch\)\{opts\.onError/);
  assert.match(code, /startGuard=setTimeout/);
});
