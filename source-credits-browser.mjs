/* Browser-only source presentation. Callers retain all title/edition checks.
 * This module never searches, chooses a result, changes a player, or rewrites
 * an Apple product URL. See source-credits-sources.md for badge provenance.
 */
import { SOURCE_CREDIT_COPY } from './source-credits-copy.mjs?v=20261105-1';

const BADGES=Object.freeze({
  books:{url:'https://toolbox.marketingtools.apple.com/api/assets/featured-content/books/badges/badge-2/en-us.svg',width:140.9502,height:40},
  music:{url:'https://toolbox.marketingtools.apple.com/api/assets/featured-content/music/badges/badge-2/en-us.svg',width:140.62,height:41},
  itunes:{url:'/assets/apple-promotional/itunes-store-get-en-us.svg',width:139.86,height:41}
});
const RECORDS=new WeakMap(),BOUND=new WeakSet();

function browserSurface(doc){
  const w=doc?.defaultView;
  return !!w&&!w.MATCHAPP_ANDROID&&!w.MatchAppNativeStartup&&!w.MatchAppNativeAuth&&
    !w.MatchAppNativeExperience&&!w.MatchAppNativePageState&&
    !/MatchAppTVAndroid|MatchAppAiAndroid|MatchAppAiKidsAndroid/i.test(w.navigator?.userAgent||'')&&
    !doc.documentElement.classList.contains('matchapp-android')&&
    new URLSearchParams(w.location?.search||'').get('utm_source')!=='android_app'&&
    !/^\/kids(?:\/|$)/i.test(w.location?.pathname||'');
}
function language(doc){
  const w=doc.defaultView;
  let saved='';try{saved=w.localStorage.getItem('match_lang')||'';}catch(_){}
  for(const value of [saved,w.MATCH_LANG,doc.documentElement.lang]){
    const raw=String(value||'').replace(/_/g,'-').toLowerCase();
    const key=/^pt(?:-|$)/.test(raw)?'pt-BR':
      /^zh-(?:hant(?:-|$)|(?:tw|hk|mo)(?:-|$))/.test(raw)?'zh-TW':raw.split('-')[0];
    if(Object.hasOwn(SOURCE_CREDIT_COPY,key))return key;
  }
  return 'en';
}
function itemSource(value){
  // A source search, home page, non-Apple host or an artist page is not an
  // exact title destination. Existing verified URLs pass through unchanged.
  const exact=String(value||'');
  let u;try{u=new URL(exact);}catch(_){return null;}
  if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  const path=u.pathname;
  const numericItem=/\/(?:id)?[1-9]\d*\/?$/i.test(path);
  if(u.hostname==='books.apple.com'&&numericItem&&/\/(?:audiobook|book)\//i.test(path)){
    return {url:exact,service:'Apple Books',badge:BADGES.books};
  }
  if(u.hostname==='music.apple.com'&&numericItem&&/\/(?:album|song)\//i.test(path)){
    // Apple Music and iTunes purchase offers are distinct. In particular, do
    // not relabel an app=itunes purchase link as an Apple Music subscription.
    const purchase=(u.searchParams.get('app')||'').toLowerCase()==='itunes';
    return {url:exact,service:purchase?'iTunes Store':'Apple Music',badge:purchase?BADGES.itunes:BADGES.music};
  }
  if(u.hostname==='itunes.apple.com'&&numericItem&&/\/(?:album|song|audiobook|book|movie|tv-season|tv-episode|podcast|music-video)\//i.test(path)){
    // Current iTunes badge guidance covers music. Legacy Books, podcast and
    // movie/TV routes retain their exact text link without an unverified badge.
    const musicPurchase=/\/(?:album|song|music-video)\//i.test(path);
    return {url:exact,service:'iTunes Store',badge:musicPurchase?BADGES.itunes:null};
  }
  if(u.hostname==='podcasts.apple.com'&&numericItem&&/\/podcast\//i.test(path)){
    return {url:exact,service:'Apple Podcasts',badge:null};
  }
  if(u.hostname==='tv.apple.com'&&/\/(?:movie|show|episode)\/[^/]+\/umc\.[a-z0-9.]+\/?$/i.test(path)){
    return {url:exact,service:'Apple TV',badge:null};
  }
  return null;
}
function installStyle(doc){
  if(doc.getElementById('matchapp-source-credit-style'))return;
  const style=doc.createElement('style');style.id='matchapp-source-credit-style';
  style.textContent=`
    .matchapp-apple-preview-credit{box-sizing:border-box;max-width:100%;margin:8px 0 12px;overflow-wrap:anywhere;font:inherit}
    .matchapp-apple-preview-credit p{margin:0 0 4px;font-size:.85em;line-height:1.5}
    .matchapp-apple-preview-credit .matchapp-apple-preview-link{display:flex;flex-direction:column;align-items:flex-start;box-sizing:border-box;width:fit-content;max-width:100%;min-height:44px;padding:4px 0;color:var(--accent,#e6c36a);background:transparent;border:0;border-radius:4px;box-shadow:none;text-decoration:none;transform:none;animation:none}
    .matchapp-apple-preview-credit .matchapp-apple-preview-link:focus-visible{outline:2px solid currentColor;outline-offset:4px}
    .matchapp-apple-preview-credit .matchapp-apple-preview-link img{display:block;flex:none;height:40px;width:auto;max-width:100%;margin:10px;object-fit:contain;border:0;border-radius:0;box-shadow:none;filter:none;transform:none;animation:none;background:transparent}
    .matchapp-apple-preview-credit .matchapp-apple-preview-link img[hidden]{display:none}
    .matchapp-apple-preview-credit .matchapp-apple-preview-link span{text-decoration:underline;text-underline-offset:3px;line-height:1.5}
    [data-source-rights] .matchapp-source-rights-links{display:flex;flex-wrap:wrap;gap:8px 20px}
    [data-source-rights] .matchapp-source-rights-links a{display:inline-flex;align-items:center;min-height:44px}
    @media(forced-colors:active){.matchapp-apple-preview-credit .matchapp-apple-preview-link{color:LinkText}}
  `;
  doc.head.appendChild(style);
}
function bindLanguage(doc){
  if(BOUND.has(doc))return;
  BOUND.add(doc);
  const repaint=()=>{
    if(!browserSurface(doc))return;
    doc.querySelectorAll('.matchapp-apple-preview-credit').forEach(node=>{
      const row=RECORDS.get(node);if(row)paintPreview(node,row);
    });
    doc.querySelectorAll('[data-source-rights]').forEach(node=>{
      if(RECORDS.has(node))paintRights(node);
    });
  };
  doc.addEventListener('matchapp:langchange',repaint);
  doc.defaultView.addEventListener('storage',event=>{if(event.key==='match_lang')repaint();});
}
function paintPreview(node,row){
  const locale=language(node.ownerDocument),copy=SOURCE_CREDIT_COPY[locale];
  node.lang=locale;node.dir=locale==='ar'?'rtl':'ltr';
  row.label.textContent=copy.creditLabel+': ';
  const action=copy.openTitle.replace(/\{(title|service)\}/g,(_,key)=>key==='title'?row.title:row.source.service);
  row.text.textContent=action;row.link.setAttribute('aria-label',action);
  if(row.image)row.image.alt=action;
}
export function mountApplePreview(player,{url,title}={}){
  const doc=player?.ownerDocument;
  if(!browserSurface(doc)||!player.isConnected||!['AUDIO','VIDEO'].includes(player.tagName))return null;
  // This is an additional presentation check, never a replacement for the
  // caller's exact-title or verified-audiobook gates.
  if(!/^https:\/\/(?:audio-ssl|video-ssl)\.itunes\.apple\.com\//i.test(player.getAttribute('src')||''))return null;
  const source=itemSource(url);
  if(!source||!String(title||'').trim())return null;
  const previous=RECORDS.get(player);
  if(previous?.node?.isConnected)return previous.node;
  installStyle(doc);bindLanguage(doc);
  const node=doc.createElement('div');node.className='matchapp-apple-preview-credit';
  const credit=doc.createElement('p'),label=doc.createElement('span'),courtesy=doc.createElement('span');
  courtesy.lang='en';courtesy.translate=false;courtesy.textContent='provided courtesy of iTunes';
  credit.append(label,courtesy);
  const link=doc.createElement('a');link.className='matchapp-apple-preview-link';
  link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';
  let image=null;
  if(source.badge){
    image=doc.createElement('img');image.src=source.badge.url;
    image.width=source.badge.width;image.height=source.badge.height;
    image.decoding='async';image.referrerPolicy='no-referrer';
    image.addEventListener('error',()=>{image.hidden=true;image.style.setProperty('display','none','important');},{once:true});
    link.appendChild(image);
  }
  // The translated exact-title link remains visible even if a remote badge
  // fails. The player, source URL, controls and playback state are untouched.
  const text=doc.createElement('span');link.appendChild(text);node.append(credit,link);
  const row={node,label,link,image,text,source,title:String(title)};
  RECORDS.set(player,row);RECORDS.set(node,row);paintPreview(node,row);
  player.after(node);
  return node;
}
function paintRights(node){
  const doc=node.ownerDocument,locale=language(doc),copy=SOURCE_CREDIT_COPY[locale];
  node.lang=locale;node.dir=locale==='ar'?'rtl':'ltr';
  node.querySelector('[data-source-rights-heading]').textContent=copy.openLicenseHeading;
  node.querySelector('[data-source-rights-copy]').textContent=copy.openLicenseText;
  node.querySelector('[data-source-rights-tvmaze]').textContent=copy.tvmazeLink;
  node.querySelector('[data-source-rights-cc]').textContent=copy.ccLink;
  node.querySelector('[data-source-rights-apple-heading]').textContent=copy.appleLegalHeading;
  node.querySelector('[data-source-rights-apple-copy]').textContent=copy.appleLegalExplanation;
}
export function mountSourceRights(node){
  const doc=node?.ownerDocument;
  if(!browserSurface(doc)||!node.isConnected)return null;
  if(RECORDS.has(node)){paintRights(node);return node;}
  installStyle(doc);bindLanguage(doc);
  const add=(tag,attribute,parent=node)=>{const e=doc.createElement(tag);e.setAttribute(attribute,'');parent.appendChild(e);return e;};
  add('h2','data-source-rights-heading');add('p','data-source-rights-copy');
  const links=doc.createElement('p');links.className='matchapp-source-rights-links';node.appendChild(links);
  const tvmaze=add('a','data-source-rights-tvmaze',links);tvmaze.href='https://www.tvmaze.com/api#licensing';
  const cc=add('a','data-source-rights-cc',links);cc.href='https://creativecommons.org/licenses/by-sa/4.0/';
  add('h2','data-source-rights-apple-heading');add('p','data-source-rights-apple-copy');
  const legal=doc.createElement('p');legal.lang='en';legal.dir='ltr';legal.translate=false;
  legal.textContent='The Apple logo is a trademark of Apple Inc., registered in the U.S. and other countries. Apple Books is a service mark of Apple Inc. Apple and Apple Music are trademarks of Apple Inc., registered in the U.S. and other countries. iTunes Store is a service mark of Apple Inc., registered in the U.S. and other countries.';
  node.appendChild(legal);RECORDS.set(node,true);paintRights(node);node.hidden=false;
  return node;
}
