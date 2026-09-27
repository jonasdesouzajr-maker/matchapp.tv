'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../supabase/functions/gemini-proxy/index.ts'),'utf8');
test('public guest Function bearer is never sent to Supabase getUser',()=>{
 const section = source.slice(source.indexOf('async function bucketKeyFor('),source.indexOf('async function checkRateLimit('));
 assert.match(section,/const publicApiKey = req\.headers\.get\("apikey"\)/);
 assert.match(section,/jwt !== publicApiKey/);
 assert.match(section,/jwt\.split\("\."\)\.length === 3/);
 assert.match(section,/claims\?\.role === "authenticated"/);
 assert.ok(section.indexOf('if (likelyAuthenticated)') < section.indexOf('adminDb.auth.getUser(jwt)'),
   'Only possible user JWTs reach the server verifier');
 assert.match(section,/if \(data\?\.user\?\.id\) return \{ key: `u:\$\{data.user.id\}`, limit: RATE_LIMIT_AUTHED \}/);
 assert.match(section,/limit: RATE_LIMIT_ANON/);
});
