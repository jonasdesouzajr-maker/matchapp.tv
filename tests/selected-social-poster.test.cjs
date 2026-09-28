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
 assert.ok(proof.includes("const POSTER='/assets/brand/matchapp-share-poster.png"));
 for(const token of ['ma-public-proof-poster','data-proof-save','data-proof-share','navigator.canShare','finalizeVerified']){
  assert.ok(proof.includes(token),'missing proof UI '+token);
 }
 assert.ok(proof.includes('not the image attachment'),'never claim attached image is independently verified');
 assert.ok(!read('kids/index.html').includes('ma-public-proof-poster'),'Kids Mode remains untouched');
});

test('adult landing pages show brand wordmark previews while share cards retain the selected poster',()=>{
 const url='https://matchapp.tv/og-image.jpg?v=20260928-brand-preview1';
 const preview=fs.readFileSync(path.join(root,'og-image.jpg'));
 assert.equal(preview.subarray(0,2).toString('hex'),'ffd8');
 assert.ok(preview.length<300000,'link preview should be small enough for messaging crawlers');
 const schemaLogo=fs.readFileSync(path.join(root,'assets/brand/matchapp-official-icon-512.webp'));
 assert.equal(schemaLogo.subarray(0,4).toString(),'RIFF');
 assert.equal(schemaLogo.subarray(8,12).toString(),'WEBP');
 for(const page of ['index.html','discover.html']){
  const html=read(page);
  for(const fragment of [
   'property="og:image" content="'+url+'"',
   'property="og:image:width" content="1200"',
   'property="og:image:height" content="630"',
   'name="twitter:image" content="'+url+'"',
   page==='index.html'?'verified-public-guest-share.js?v=20260928-three-shares1':'verified-public-guest-share.js?v=20260926-selectedposter1',
   'guest-share-rewards.css?v=20260926-selectedposter1'
  ])assert.ok(html.includes(fragment),page+' missing '+fragment);
 }
 const share=read('share.js');
 const caption=share.slice(share.indexOf('function shareText()'),share.indexOf('// Native share sheet'));
 assert.ok(caption.includes('MatchApp Ai'));
 assert.ok(share.includes('#MatchAppAi #MatchAppTV'));
 assert.ok(caption.includes('globalMatchTitle'),'share caption includes the chosen result without changing poster artwork');
 assert.ok(read('guest-share-rewards.js').includes('Keep AI chat contents PRIVATE'));
});
