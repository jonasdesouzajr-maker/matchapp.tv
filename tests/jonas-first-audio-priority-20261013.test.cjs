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


async function simulatedSpeech(mode) {
  const code = source('secure-speech-20261010.js');
  const events = { fetched: 0, started: 0, ended: [], errors: 0 };
  const male = { name: 'approved male voice', lang: 'en-US' };
  function Utterance(text) { this.text = text; }
  const window = {
    MATCH_LANG: 'en',
    SpeechSynthesisUtterance: Utterance,
    speechSynthesis: {
      cancel() {},
      getVoices() { return mode === 'no-local-voice' ? [] : [male]; },
      speak(utter) {
        if (mode === 'local-succeeds') { utter.onstart?.(); utter.onend?.(); }
        else utter.onerror?.({ error: 'unavailable' });
      }
    },
    MatchAppJonasVoicePolicy: { select: voices => voices[0] || null }
  };
  const context = {
    window, document: { addEventListener() {} }, SpeechSynthesisUtterance: Utterance,
    fetch: async () => { events.fetched++; throw Error('simulated cloud outage'); },
    setTimeout: () => 1, clearTimeout() {}, AbortController
  };
  new vm.Script(code).runInNewContext(context);
  const result = await window.MatchAppJonasSpeech.speak('Hello, I am Jonas.', 'en', {
    onStart: () => events.started++,
    onEnd: value => events.ended.push(value),
    onError: () => events.errors++
  });
  return { result, ...events };
}

test('local voice speaks immediately and does not invoke cloud TTS', async () => {
  const state = await simulatedSpeech('local-succeeds');
  assert.equal(state.result, true);
  assert.equal(state.fetched, 0);
  assert.equal(state.started, 1);
  assert.deepEqual(state.ended, [true]);
});

test('local and cloud failures end once without duplicate microphone handoff', async () => {
  for (const mode of ['local-fails', 'no-local-voice']) {
    const state = await simulatedSpeech(mode);
    assert.equal(state.result, false, mode);
    assert.equal(state.fetched, 1, mode);
    assert.deepEqual(state.ended, [false], mode);
    assert.equal(state.errors, 1, mode);
  }
});
