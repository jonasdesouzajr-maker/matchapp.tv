'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('international compliance inventory runs and reports real pending evidence without claiming certification',()=>{
 const raw=cp.execFileSync(process.execPath,[path.join(root,'tools/audit-international-compliance.js')],{cwd:root,encoding:'utf8'});
 const report=JSON.parse(raw);
 assert.equal(report.scope,'static repository evidence; not legal certification');
 assert(Array.isArray(report.findings));
 assert.equal(report.findings.some(f=>f.id==='KIDS_ENTRY_TRACKER'),false,'Do not introduce Kids entry GTM/AdSense');
 assert.equal(report.findings.some(f=>f.id==='AFFILIATE_SCOPE'),false,'Amazon app/market safety guard must remain');
 assert.equal(report.findings.some(f=>f.id==='NON_AFFILIATE_GOOGLE_KEY'),false);
 const doc=fs.readFileSync(path.join(root,'docs/INTERNATIONAL_COMPLIANCE_STATUS.md'),'utf8');
 assert.match(doc,/NOT LEGALLY CERTIFIED/);
 assert.match(doc,/consent|cookies/i);
 assert.match(doc,/Kids Mode/);
});
