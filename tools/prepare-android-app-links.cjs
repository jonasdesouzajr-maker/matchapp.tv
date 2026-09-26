#!/usr/bin/env node
'use strict';
// Run only with the SHA-256 fingerprint of the *Play app-signing* certificate,
// copied from Google Play Console > App integrity, never an upload certificate.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const PACKAGE='com.jonas.papercup';
function normalizeFingerprint(input){
 const value=String(input||'').trim().toUpperCase();
 if(!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value))
  throw new Error('PLAY_APP_SIGNING_SHA256 must contain exactly 32 colon-separated hex bytes from Play Console > App integrity.');
 return value;
}
function buildAssetLinks(fingerprint){
 return JSON.stringify([{relation:['delegate_permission/common.handle_all_urls'],target:{
  namespace:'android_app',package_name:PACKAGE,sha256_cert_fingerprints:[normalizeFingerprint(fingerprint)]
 }}],null,2)+'\n';
}
function writeVerifiedLinks(fingerprint){
 const content=buildAssetLinks(fingerprint);
 for(const relative of ['.well-known/assetlinks.json','android-studio/play/assetlinks.json'])
  fs.writeFileSync(path.join(root,relative),content,'utf8');
 return content;
}
if(require.main===module){
 if(!process.argv.includes('--write')||!process.argv.includes('--confirmed-play-signing')){
  console.error('Refusing to modify production association. After checking Play Console > App integrity, use:');
  console.error('PLAY_APP_SIGNING_SHA256="<fingerprint>" node tools/prepare-android-app-links.cjs --write --confirmed-play-signing');
  process.exitCode=2;
 }else{
  try{writeVerifiedLinks(process.env.PLAY_APP_SIGNING_SHA256);console.log('Generated Digital Asset Links for '+PACKAGE+'; publish the website file only after review.');}
  catch(e){console.error(e.message);process.exitCode=2;}
 }
}
module.exports={PACKAGE,normalizeFingerprint,buildAssetLinks,writeVerifiedLinks};
