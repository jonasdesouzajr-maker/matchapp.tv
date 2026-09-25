'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function affiliate(ua){
 const context={window:{navigator:{userAgent:ua||'Mozilla/5.0'}},URL};
 vm.runInNewContext(read('ebooks/affiliate-links.js'),context,{filename:'affiliate-links.js'});
 return context.window.MatchAppEbookAffiliate;
}
const book={title:'Dom Casmurro',author:'Machado de Assis'};
test('Brazilian web purchase link carries only the Amazon BR tracking tag',()=>{
 const aff=affiliate(),link=new URL(aff.amazonSearchUrl(book,'BR'));
 assert.equal(link.hostname,'www.amazon.com.br');
 assert.equal(link.searchParams.get('tag'),'matchapp06-20');
 assert.equal(link.searchParams.get('i'),'digital-text');
 assert.match(link.searchParams.get('k'),/Dom Casmurro/);
 assert.equal(aff.isAffiliateLink(link.href),true);
});
test('affiliate tracking is never leaked to other Amazon marketplaces',()=>{
 const aff=affiliate();
 for(const m of ['US','GB','CA','AU','JP','PT','UNKNOWN']){
  const link=new URL(aff.amazonSearchUrl(book,m));
  assert.notEqual(link.hostname,'www.amazon.com.br',m+' must never reuse BR store');
  assert.equal(link.searchParams.has('tag'),false,m+' needs its own enrollment');
  assert.equal(aff.isAffiliateLink(link.href),false);
 }
});
test('native Android remains untagged until its separate affiliate app approval',()=>{
 const aff=affiliate('Mozilla/5.0 MatchAppAiAndroid/1.1.28');
 const link=new URL(aff.amazonSearchUrl(book,'BR'));
 assert.equal(link.hostname,'www.amazon.com.br');
 assert.equal(link.searchParams.has('tag'),false);
});
test('affiliate recognition is strict and disclosures are available in PT and English',()=>{
 const aff=affiliate(),good=aff.amazonSearchUrl(book,'BR');
 assert.equal(aff.isAffiliateLink(good.replace('www.amazon.com.br','amazon.com')),false);
 assert.equal(aff.isAffiliateLink(good.replace('tag=matchapp06-20','tag=someone-20')),false);
 assert.match(aff.disclosure('pt-BR'),/Programa de Associados da Amazon/);
 assert.equal(aff.paidLabel('pt-BR'),'publicidade');
 assert.match(aff.disclosure('en-US'),/qualifying purchases/);
});
test('adult-only storefront surfaces load the centralized affiliate script before the matcher and disclose commercial links',()=>{
 const home=read('index.html'),hub=read('ebooks/index.html'),match=read('ebooks/ebook-matcher.js'),kids=read('kids/index.html');
 assert(home.indexOf('/ebooks/affiliate-links.js')>0);
 assert(home.indexOf('/ebooks/affiliate-links.js')<home.indexOf('/ebooks/ebook-matcher.js'));
 assert(hub.includes('/ebooks/affiliate-links.js'));
 assert(match.includes('MatchAppEbookAffiliate'));
 assert(match.includes("(tagged?'sponsored ':'')"));
 assert.match(hub,/Como participante do Programa de Associados da Amazon/);
 assert.doesNotMatch(kids,/affiliate-links\.js/);
});
test('Google Play links remain ordinary until an approved Partnerize affiliate link exists',()=>{
 const match=read('ebooks/ebook-matcher.js'),hub=read('ebooks/index.html');
 assert(match.includes('https://play.google.com/store/search?q='));
 assert(!match.includes('GGKEY:'));
 assert(!hub.includes('GGKEY:'));
});
