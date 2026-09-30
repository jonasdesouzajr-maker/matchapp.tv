'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const smoke=fs.readFileSync(path.join(__dirname,'../tools/live-production-smoke.cjs'),'utf8');
test('only a precisely identified cross-origin Spotify transport error becomes a warning',()=>{
 const start=smoke.indexOf('function isSpotifyIframeTransportDisconnect(error){');
 const end=smoke.indexOf('\nfunction capturePageError(',start);
 assert.ok(start>0&&end>start,'Isolated external iframe classifier exists');
 const fn=vm.runInNewContext(smoke.slice(start,end)+'; isSpotifyIframeTransportDisconnect',{});
 assert.equal(fn({stack:'TransportError: Cannot authenticate disconnected transport.\n    at _authenticate (https://embed-cdn.spotifycdn.com/_next/static/pages/player.js:1:1)'}),true);
 assert.equal(fn({stack:'TransportError: Cannot authenticate disconnected transport.\n    at _authenticate (https://matchapp.tv/app.js:1:1)'}),false,'a first-party exception must still fail QA');
 assert.equal(fn({stack:'TypeError: App failed\n    at _authenticate (https://embed-cdn.spotifycdn.com/_next/static/pages/player.js:1:1)'}),false,'a different external exception is not suppressed');
 assert.equal(fn({message:'TransportError: Cannot authenticate disconnected transport.'}),false,'missing proven external stack stays fatal');
});
test('cross-origin iframe warning is reported, while the browser error audit remains strict',()=>{
 assert.match(smoke,/report\.warnings\.push\(warning\)/);
 assert.match(smoke,/errors\.push\(\{device,page:'home',error:stack\.slice\(0,500\)\}\)/);
 assert.match(smoke,/page\.on\('pageerror',error=>capturePageError\(device\.name,error\)\)/);
 assert.match(smoke,/record\('browser fatal JS exceptions',!errors\.length/);
});
test('Google telemetry warning requires exact int64 error and exclusively proven rum.js stack frames',()=>{
 const start=smoke.indexOf('function isGoogleAdTelemetryInt64(error){');
 const end=smoke.indexOf('\nfunction capturePageError(',start);
 const fn=vm.runInNewContext(smoke.slice(start,end)+'; isGoogleAdTelemetryInt64',{});
 const external='Error: int64\n    at sb (https://pagead2.googlesyndication.com/pagead/js/r20260929/r20190131/rum.js:35:440)\n    at zc (https://pagead2.googlesyndication.com/pagead/js/r20260929/r20190131/rum.js:40:62)';
 assert.equal(fn({stack:external}),true);
 assert.equal(fn({stack:external+'\n    at app (https://matchapp.tv/app.js:1:1)'}),false);
 assert.equal(fn({stack:external.replace('Error: int64','Error: ads failed')}),false);
 assert.equal(fn({stack:external.replace(/rum\.js/g,'adsbygoogle.js')}),false);
 assert.equal(fn({stack:external.replace(/pagead2\.googlesyndication\.com/g,'pagead2.googlesyndication.com.evil.example')}),false);
 assert.equal(fn({message:'Error: int64'}),false);
});
