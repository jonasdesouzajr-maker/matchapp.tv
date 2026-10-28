const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'lumina-match/browser/campaign-i18n.js'), 'utf8');
const locales = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];
// Explicit product contract, separate from the implementation's dictionary.
const campaignKeys = [
  'campaign', 'playCampaign', 'continueCampaign', 'levels', 'level', 'levelOf', 'unlockedLevels',
  'chapter', 'previousChapter', 'nextChapter', 'levelLocked', 'levelStars', 'stars', 'starsOf',
  'themeStarlight', 'themeGrove', 'themeOcean', 'relaxed', 'timed', 'modeHelp', 'campaignHelp',
  'scoringHelp', 'eventHelp', 'audioHelp', 'classic', 'classicContinue', 'classicNew',
  'campaignCleared', 'campaignComplete', 'campaignCompleteBody', 'nextLevel', 'replayLevel',
  'earnedPoints', 'milestoneBonus', 'bestResult', 'levelSummary', 'timeLeft', 'elapsed', 'seconds',
  'pause', 'paused', 'resume', 'retryLevel', 'timeUp', 'timeUpBody', 'tryRelaxed', 'hint', 'hintsLeft',
  'hintHelp', 'noHints', 'settings', 'soundEffects', 'music', 'volume', 'audioReady', 'audioUnavailable',
  'on', 'off', 'closeSettings', 'campaignSaveHelp', 'campaignProgress', 'campaignChoose', 'newCampaign',
  'saveGame', 'registerToSaveTitle', 'registerToSaveBody', 'createAccount', 'keepPlaying',
  'closeWithoutSaving', 'dismissRegisterPrompt', 'saveGuest', 'storageNotice', 'helpSave', 'saveHelp',
  'resumeSavedLevel', 'abandonAttempt', 'confirmRestart', 'cancel', 'confirm', 'unlockNext',
  'finalBadge', 'milestone', 'regularTheme',
  'lotus', 'nebula', 'gem', 'lantern', 'mushroom', 'firefly', 'crystalflower', 'fern', 'fox',
  'moonflower', 'jellyfish', 'shell', 'seahorse', 'coral', 'starfish', 'dolphin'
];
const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

function fixture(base) {
  const window = base || {};
  const context = vm.createContext({window});
  return {window, context, load() {vm.runInContext(source, context); return window.LuminaMessages;}};
}

test('all 14 selected languages have complete authored campaign, account-save, audio and artwork vocabulary', () => {
  const dictionaries = fixture().load();
  assert.equal(campaignKeys.length, 99);
  assert.deepEqual(Object.keys(dictionaries).sort(), [...locales].sort());
  for (const language of locales) {
    const dictionary = dictionaries[language];
    assert.deepEqual(Object.keys(dictionary).sort(), [...campaignKeys].sort(), language);
    for (const key of campaignKeys) {
      assert.equal(typeof dictionary[key], 'string', language + ':' + key);
      assert.ok(dictionary[key].trim(), language + ':' + key);
      assert.doesNotMatch(dictionary[key], /\b(?:undefined|null)\b|\[object Object\]|<[^>]+>/, language + ':' + key);
    }
    if (language !== 'en') {
      for (const key of ['campaignHelp', 'modeHelp', 'scoringHelp', 'eventHelp', 'campaignSaveHelp', 'audioUnavailable',
        'saveGame', 'registerToSaveTitle', 'registerToSaveBody', 'createAccount', 'keepPlaying',
        'closeWithoutSaving', 'dismissRegisterPrompt', 'saveGuest', 'storageNotice', 'helpSave', 'saveHelp']) {
        assert.notEqual(dictionary[key], dictionaries.en[key], language + ':' + key + ' must be authored');
      }
      assert.notEqual(dictionary, dictionaries.en, language + ' must own its dictionary');
    }
  }
});

test('translated labels preserve all placeholders and the actual 250-level, 750-star and milestone rules', () => {
  const dictionaries = fixture().load();
  for (const [language, dictionary] of Object.entries(dictionaries)) {
    for (const key of campaignKeys) {
      assert.deepEqual(placeholders(dictionary[key]), placeholders(dictionaries.en[key]), language + ':' + key);
      const withoutPlaceholders = dictionary[key].replace(/\{\w+\}/g, '');
      assert.doesNotMatch(withoutPlaceholders, /[{}]/, language + ':' + key + ' has malformed placeholder');
    }
    for (const key of ['campaign', 'levelOf', 'unlockedLevels', 'campaignHelp', 'campaignComplete', 'campaignProgress']) {
      assert.match(dictionary[key], /250/, language + ':' + key);
    }
    assert.match(dictionary.starsOf, /750/, language + ':starsOf');
    assert.match(dictionary.scoringHelp, /50/, language + ':scoringHelp');
    assert.match(dictionary.milestoneBonus, /50/, language + ':milestoneBonus');
    assert.match(dictionary.eventHelp, /20/, language + ':Grove cadence');
    assert.match(dictionary.eventHelp, /25/, language + ':Ocean cadence');
  }
  assert.deepEqual(placeholders(dictionaries.en.bestResult), ['moves', 'seconds', 'stars']);
  assert.deepEqual(placeholders(dictionaries.en.levelSummary), ['moves', 'pairs', 'seconds']);
  assert.deepEqual(placeholders(dictionaries.en.campaignProgress), ['completed']);
});

test('campaign messages add to existing game, account-save and online dictionaries without losing their copy', () => {
  const f = fixture();
  for (const name of ['i18n.js', 'progress-i18n.js', 'online-i18n.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'lumina-match/browser', name), 'utf8'), f.context);
  }
  const previous = JSON.parse(JSON.stringify(f.window.LuminaMessages));
  const references = Object.fromEntries(locales.map(language => [language, f.window.LuminaMessages[language]]));
  const dictionaries = f.load();
  for (const language of locales) {
    assert.equal(dictionaries[language], references[language], language + ' preserves the existing dictionary');
    for (const [key, value] of Object.entries(previous[language])) {
      if (!campaignKeys.includes(key)) assert.equal(dictionaries[language][key], value, language + ':' + key);
    }
    for (const key of ['saveGuest', 'storageNotice', 'helpSave', 'saveHelp']) {
      assert.notEqual(dictionaries[language][key], previous[language][key], language + ':' + key + ' replaces legacy browser-save promises');
    }
  }
  // Re-evaluation must be safe when a document restores its scripts.
  const once = JSON.stringify(dictionaries);
  f.load();
  assert.equal(JSON.stringify(f.window.LuminaMessages), once);
});

test('Save and registration copy states account-only saving without claiming registration or persistence has occurred', () => {
  const dictionaries = fixture().load();
  const expected = {
    saveGame: 'Save',
    registerToSaveTitle: 'Create an account to save',
    registerToSaveBody: 'Create a free MatchApp account to save your levels, stars and unfinished game.',
    createAccount: 'Create account',
    keepPlaying: 'Keep playing',
    closeWithoutSaving: 'Close without saving',
    dismissRegisterPrompt: 'Close account prompt'
  };
  for (const [key, value] of Object.entries(expected)) assert.equal(dictionaries.en[key], value, key);
  assert.match(dictionaries.en.saveGuest, /this session only/);
  assert.match(dictionaries.en.helpSave, /Only registered players/);
  assert.match(dictionaries.en.helpSave, /ends when the game closes/);
  assert.match(dictionaries.en.storageNotice, /not saved for guests/);
  assert.doesNotMatch(dictionaries.en.campaignCompleteBody, /saved|registered|account created/i);
  assert.doesNotMatch(dictionaries.en.confirmRestart, /saved/i);
  for (const [language, dictionary] of Object.entries(dictionaries)) {
    assert.match(dictionary.registerToSaveBody, /MatchApp/, language + ':registration names the existing account');
    for (const key of ['saveGuest', 'storageNotice', 'campaignSaveHelp', 'helpSave', 'saveHelp']) {
      assert.doesNotMatch(dictionary[key], /browser|navegador|navigateur|tarayıcı|браузер|المتصفح|ब्राउज़र|ブラウザ|브라우저|浏览器/i,
        language + ':' + key + ' must not promise guest browser persistence');
    }
  }
});

test('non-Latin selected languages have native-script campaign actions and card descriptions', () => {
  const dictionaries = fixture().load();
  const scripts = {ru:/[\u0400-\u04ff]/, ar:/[\u0600-\u06ff]/, hi:/[\u0900-\u097f]/,
    ja:/[\u3040-\u30ff\u4e00-\u9fff]/, ko:/[\uac00-\ud7af]/, zh:/[\u4e00-\u9fff]/};
  for (const [language, script] of Object.entries(scripts)) {
    for (const key of ['playCampaign', 'continueCampaign', 'settings', 'timeUpBody', 'campaignCompleteBody',
      'soundEffects', 'music', 'lotus', 'crystalflower', 'jellyfish', 'dolphin', 'saveGame',
      'registerToSaveTitle', 'registerToSaveBody', 'createAccount', 'keepPlaying', 'closeWithoutSaving',
      'dismissRegisterPrompt', 'saveGuest', 'helpSave', 'saveHelp']) {
      assert.match(dictionaries[language][key], script, language + ':' + key);
    }
  }
});
