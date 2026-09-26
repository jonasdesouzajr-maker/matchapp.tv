const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=part=>fs.readFileSync(path.join(root,part),'utf8');
const POSTER='/assets/brand/matchapp-share-poster.png';

test('the committed share poster is the exact owner-selected 941x1672 PNG',()=>{
 const bytes=fs.readFileSync(path.join(root,POSTER));
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(bytes.readUInt32BE(16),941);
 assert.equal(bytes.readUInt32BE(20),1672);
 assert.equal(bytes.length,2395539);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
  '2061c598556c5e4be2dd49c5ee65941a31a1bce150de9fc5708597a9dc6ac630');
});

test('normal share card uses the branded poster unchanged, never match artwork',async()=>{
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{
  url:'https://matchapp.tv/',runScripts:'outside-only',virtualConsole:new VirtualConsole()
 });
 const win=dom.window,images=[],draws=[];
 win.Image=class{
  constructor(){this.naturalWidth=941;this.naturalHeight=1672;}
  set src(src){images.push(src);Promise.resolve().then(()=>this.onload?.());}
 };
 win.HTMLCanvasElement.prototype.getContext=function(){
  return {drawImage:(...args)=>draws.push(args)};
 };
 win.eval(read('share.js'));
 const card=await win.buildShareCard('A private title','https://elsewhere.invalid/private-film.jpg','Netflix','private synopsis');
 assert.equal(card.width,941);
 assert.equal(card.height,1672);
 assert.deepEqual(images,[POSTER+'?v=20260926-selected1']);
 assert.equal(draws.length,1);
 assert.equal(draws[0][1],0);
 assert.equal(draws[0][2],0);
 dom.window.close();
});

test('verified guest poster can be saved or shared without bypassing public-post proof',()=>{
 const proof=read('verified-public-guest-share.js');
 assert.match(proof,/const POSTER='\\/assets\\/brand\\/matchapp-share-poster\\.png/);
 assert.match(proof,/ma-public-proof-poster/);
 assert.match(proof,/data-proof-save/);
 assert.match(proof,/data-proof-share/);
 assert.match(proof,/navigator\\.canShare/);
 assert.match(proof,/verified/i);
 assert.match(proof,/not the image attachment/i,'never pretend attached image is independently verified');
 assert.match(proof,/finalizeVerified/);
 assert.doesNotMatch(read('kids/index.html'),/ma-public-proof-poster/);
});

test('adult landing pages expose actual selected image in social metadata and versioned scripts',()=>{
 for(const page of ['index.html','discover.html']){
  const html=read(page);
  assert.match(html,/property="og:image" content="https:\\/\\/matchapp\\.tv\\/assets\\/brand\\/matchapp-share-poster\\.png\\?v=20260926-selected1"/);
  assert.match(html,/property="og:image:width" content="941"/);
  assert.match(html,/property="og:image:height" content="1672"/);
  assert.match(html,/name="twitter:image" content="https:\\/\\/matchapp\\.tv\\/assets\\/brand\\/matchapp-share-poster\\.png\\?v=20260926-selected1"/);
  assert.match(html,/verified-public-guest-share\\.js\\?v=20260926-selectedposter1/);
  assert.match(html,/guest-share-rewards\\.css\\?v=20260926-selectedposter1/);
 }
 const share=read('share.js');
 const caption=share.slice(share.indexOf('function shareText()'),share.indexOf('// Native share sheet'));
 assert.match(caption,/MatchApp Ai/);
 assert.match(caption,/#MatchAppAi/);
 assert.doesNotMatch(caption,/globalMatchTitle/,'do not publish a personal result instead of branded artwork');
 assert.match(read('guest-share-rewards.js'),/PRIVATE/);
});
