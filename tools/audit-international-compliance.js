/* Read-only static compliance risk inventory. Advisory: browser + counsel review required. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const results=[];
function flag(level,id,subject,details){results.push({level,id,subject,details})}
const pages=['index.html','ebooks/index.html','privacy.html','cookies.html','pricing/pricing.html','terms.html'];
for(const p of pages){
 const s=read(p),i=s.indexOf('googletagmanager.com/gtm.js'),d=s.indexOf("gtag('consent', 'default'");
 if(i>=0&&(d<0||d>i))flag('action-required','PRECONSENT_GTM',p,'GTM bootstrap precedes observed consent defaults; verify tag-level gating with real browser and CMP');
}
const home=read('index.html'),legal=read('legal-kit.js');
if(!home.includes('legal-kit.js'))flag('action-required','UNLOADED_BANNER','index.html','Existing legal-kit cookie UI is not loaded by homepage');
if(legal.includes('match_cookie_choice')&&!/gtag\s*\(\s*['"]consent['"]|__tcfapi|window\.googlefc/.test(legal))flag('action-required','CHOICE_NOT_WIRED','legal-kit.js','Cookie choice is stored locally without observed tracker/CMP enforcement in this file');
const kids=read('kids/index.html');
if(/pagead2\.googlesyndication\.com\/pagead\/js|googletagmanager\.com\/gtm\.js/.test(kids))flag('blocker','KIDS_ENTRY_TRACKER','kids/index.html','Inspect child-directed page tracking before deployment');
const affiliate=read('ebooks/affiliate-links.js'),matcher=read('ebooks/ebook-matcher.js');
if(!affiliate.includes('unapprovedAppContext')||!affiliate.includes("m==='BR'"))flag('blocker','AFFILIATE_SCOPE','ebooks/affiliate-links.js','Approved-market and unapproved-installed-app exclusion must remain enforced');
if(/GGKEY:[A-Z0-9]+/.test(matcher))flag('blocker','NON_AFFILIATE_GOOGLE_KEY','ebooks/ebook-matcher.js','Book ID must never masquerade as an affiliate token');
if(!read('privacy.html').includes('affiliate link')||!read('privacidade.html').includes('links de afiliados'))flag('blocker','PRIVACY_AFFILIATE','privacy pages','Disclose affiliate and outbound referral treatment in both languages');
const output={generated_at:new Date().toISOString(),scope:'static repository evidence; not legal certification',summary:{action_required:results.filter(r=>r.level==='action-required').length,blockers:results.filter(r=>r.level==='blocker').length},findings:results};
process.stdout.write(JSON.stringify(output,null,2)+'\n');
if(process.argv.includes('--strict')&&results.length)process.exitCode=1;
