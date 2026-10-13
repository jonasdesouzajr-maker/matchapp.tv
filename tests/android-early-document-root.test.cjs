'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
test('Android early-navigation injection tolerates a document whose root has not been created',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt'),'utf8');
 const script=source.match(/private const val APP_MODE_JS = """([\s\S]*?)"""/)?.[1];
 assert.ok(script,'native injection source exists');
 const window={};
 const context={window,document:{documentElement:null},localStorage:{setItem(){}}};
 assert.doesNotThrow(()=>vm.runInNewContext(script,context));
 assert.equal(window.MATCHAPP_ANDROID,true);
 assert.equal(window.MATCHAPP_IS_AD_FREE,true);
 assert.equal(window.MATCHAPP_ANDROID_KIDS_BLOCKED,true);
});
