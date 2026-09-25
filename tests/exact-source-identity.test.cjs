'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const cover=require('../ebooks/cover-identity.js');
const kids=require('../kids/age-rating-policy.js');

test('curated e-book covers require exact title and every known author name',()=>{
 const book={title:'Dom Casmurro',author:'Machado de Assis',year:1899};
 const results=[
  {title:'Dom Casmurro for Children',author_name:['Machado de Assis'],cover_i:910,first_publish_year:1899},
  {title:'Dom Casmurro',author_name:['Another de Assis'],cover_i:911,first_publish_year:1899},
  {title:'Dom Casmurro',author_name:['Machado de Assis'],cover_i:912,first_publish_year:2024},
  {title:'Dom Casmurro',author_name:['Assis, Machado de'],cover_i:913,first_publish_year:1899}
 ];
 assert.equal(cover.verifiedCoverId(book,results),913);
 assert.equal(cover.verifiedCoverId(book,results.slice(0,3)),null);
 assert.equal(cover.verifiedCoverId(book,[{...results[3],cover_i:-5}]),null);
 assert.equal(cover.verifiedCoverId(book,[{...results[3],author_name:[]}]),null);
 assert.equal(cover.verifiedCoverId(book,[{...results[3],cover_i:'not-a-number'}]),null);
});
test('authors and titles normalize punctuation, initials and diacritics but never fuzzy-score',()=>{
 const book={title:'Ética e Liberdade',author:'L. Frank Baum'};
 const matched={title:'Etica e liberdade',author_name:['Baum, L Frank'],cover_i:727};
 assert.equal(cover.verifiedCoverId(book,[matched]),727);
 assert.equal(cover.verifiedCoverId(book,[{...matched,author_name:['Martin Baum']}]),null);
 assert.equal(cover.verifiedCoverId(book,[{...matched,title:'Etica e liberdade para jovens'}]),null);
 assert.equal(cover.verifiedCoverId(book,[{...matched,author_name:['L Frank Baum'],first_publish_year:2021}]),727);
});
test('kids exact-title queries never show a fuzzy nearby or sequel result',()=>{
 const original={title:'The Little Prince',originalTitle:'Le Petit Prince'};
 assert(kids.exactRequestedTitle('le petit prince',original));
 assert(kids.exactRequestedTitle('THE LITTLE PRINCE!',original));
 assert(!kids.exactRequestedTitle('The Little Prince 2',original));
 assert(!kids.exactRequestedTitle('The Prince',original));
 assert(!kids.exactRequestedTitle('',original));
 assert(!kids.exactRequestedTitle('The Little Prince',null));
});
test('kids source identity and source ratings still fail closed after exact-search hardening',()=>{
 const candidate={tmdbId:1234,kind:'movie',originalTitle:'Le Petit Prince',year:'2015',adult:false};
 const details={tmdbId:1234,kind:'movie',title:'The Little Prince',
  originalTitle:'Le Petit Prince',adult:false,year:'2015',genres:['Animation','Family'],
  posterLarge:'https://image.tmdb.org/t/p/w780/AbCd123.jpg',overview:'A child learns courage and empathy during a remarkable adventure.',
  contentRating:'G'};
 assert(kids.verify(candidate,details,'3-5'));
 assert.equal(kids.verify(candidate,{...details,contentRating:null},'3-5'),null);
 assert.equal(kids.verify(candidate,{...details,contentRating:'R'},'9-12'),null);
 assert.equal(kids.verify(candidate,{...details,genres:['Animation','Horror']},'3-5'),null);
 assert.equal(kids.verify(candidate,{...details,originalTitle:'The Other Prince'},'3-5'),null);
 assert.equal(kids.verify(candidate,{...details,posterLarge:'https://attacker.example/fake.jpg'},'3-5'),null);
});
test('exact artwork verification loads before adult matcher and Kids title guard loads only in Kids Mode',()=>{
 const home=read('index.html'),kidsHtml=read('kids/index.html');
 const match=read('ebooks/ebook-matcher.js'),find=read('kids/source-rated-discovery.js');
 assert(home.indexOf('/ebooks/cover-identity.js')<home.indexOf('/ebooks/ebook-matcher.js'));
 assert.match(match,/verifiedCoverId\(book,d\?\.docs\)/);
 assert.match(match,/limit=8&fields=title,author_name,cover_i,first_publish_year/);
 assert.doesNotMatch(match,/returned\.includes\(first\)/);
 assert.match(find,/exactRequestedTitle\(query,hit\)/);
 assert(kidsHtml.indexOf('/kids/age-rating-policy.js')<kidsHtml.indexOf('/kids/source-rated-discovery.js'));
 assert(!kidsHtml.includes('/ebooks/cover-identity.js'));
 assert(!home.includes('/kids/source-rated-discovery.js'));
});
