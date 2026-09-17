const fs=require('fs');
const path='tests/premium-home-recovery.test.cjs';
let source=fs.readFileSync(path,'utf8');
const before='assert.match(html,/\\/app\\.js\\?v=200/);';
const after='assert.match(html,/\\/app\\.js\\?v=201/);';
if(!source.includes(before)) throw new Error('Expected app.js v200 regression assertion not found');
source=source.replace(before,after);
fs.writeFileSync(path,source);
