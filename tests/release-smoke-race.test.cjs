const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const flow=fs.readFileSync(path.join(__dirname,'..','.github/workflows/release-smoke.yml'),'utf8');
test('live smoke accepts a newer deployed descendant instead of false-failing on automation races',()=>{
 assert.match(flow,/newer descendant/);
 assert.match(flow,/git fetch --no-tags --depth=64 origin main/);
 assert.match(flow,/git merge-base --is-ancestor "\$EXPECTED_SHA" "\$remote"/);
 assert.match(flow,/testing current production instead/);
});
