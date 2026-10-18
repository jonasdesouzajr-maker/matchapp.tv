const test=require('node:test');
const assert=require('node:assert/strict');
const api=require('../pro-plan.js');

test('native billing failure copy names the existing refresh action without an app-version diagnosis in all fourteen locales',()=>{
  assert.equal(api.languages.length,14);
  const versionClaim=/\bversion\b|versão|versión|App-Version|sürüm|верси|إصدار|الإصدار|संस्करण|versi aplikasi|バージョン|버전|版本/iu;
  for(const language of api.languages){
    const message=api.text(language,'nativeUnavailable');
    assert.ok(message.includes('Google Play'),language);
    assert.ok(message.includes(api.text(language,'refresh')),language+' names the existing recovery action');
    assert.doesNotMatch(message,versionClaim,language+' does not diagnose build incompatibility from a transient failure');
    if(language!=='en')assert.notEqual(message,api.text('en','nativeUnavailable'),language+' is authored');
  }
});
