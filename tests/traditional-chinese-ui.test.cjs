const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function boot(language,saved) {
  const store = new Map(saved ? [['match_lang', saved]] : []);
  const storage = {
    getItem: key => store.get(key),
    setItem: (key,value) => store.set(key,value)
  };
  const document = {
    readyState:'loading',addEventListener(){},dispatchEvent(){},querySelector(){return null;},
    getElementById(){return null;},querySelectorAll(){return [];},documentElement:{setAttribute(){}}
  };
  const context = vm.createContext({
    window:{location:{search:''},addEventListener(){}},location:{hostname:'test',pathname:'/settings.html'},
    localStorage:storage, document,navigator:{languages:[language]},URLSearchParams,
    CustomEvent:class {}
  });
  const read = file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  vm.runInContext(read('i18n.js'),context);
  return {context,store,run:s=>vm.runInContext(s,context),load:file=>vm.runInContext(read(file),context)};
}
test('Chinese script preference survives reload and stays distinct from Korean and Simplified Chinese',()=>{
  for (const [tag,expected] of [
    ['zh-TW','zh-TW'],['zh_Hant_HK','zh-TW'],['zh-Hant-CN','zh-TW'],['zh-HK','zh-TW'],
    ['zh-MO','zh-TW'],['zh-Hans-TW','zh'],['zh-CN','zh'],['ko-KR','ko']
  ]) {
    const {context,store}=boot(tag);
    assert.equal(context.window.MATCH_LANG,expected,tag);
    assert.equal(store.get('match_lang'),expected);
  }
  const session=boot('ko-KR','zh-TW');
  assert.equal(session.context.window.MATCH_LANG,'zh-TW');
  assert.equal(session.run("I18N_LANGS['zh-TW'].name"),'繁體中文');
  assert.equal(session.run("I18N_LANGS.zh.name"),'简体中文');
  assert.equal(session.run("I18N_LANGS.ko.name"),'한국어');
  assert.equal(session.run("JSON.stringify(Object.keys(I18N['zh-TW']).sort())"),session.run("JSON.stringify(Object.keys(I18N.zh).sort())"));
  assert.equal(session.run("t('search.heading','zh-TW')"),'直接搜尋任意作品');
  session.context.window.setLanguage('zh-Hans');
  assert.equal(session.store.get('match_lang'),'zh');
  session.context.window.setLanguage('zh-Hant');
  assert.equal(session.store.get('match_lang'),'zh-TW');
  session.load('match-localization.js');
  assert.equal(session.context.window.matchResultLanguage(),'zh-TW');
  assert.equal(session.run("window.MatchAppHanLocale.toTraditional('流媒体服务、软件与设置')"),'串流服務、軟體與設定');
});
