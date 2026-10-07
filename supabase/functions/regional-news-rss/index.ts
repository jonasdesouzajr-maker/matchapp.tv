import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_LANGS=new Set(['en','pt','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']);
const EDITION:any={en:['en-US','en'],pt:['pt-BR','pt-419'],es:['es-419','es-419'],fr:['fr','fr'],de:['de','de'],it:['it','it'],tr:['tr','tr'],ru:['ru','ru'],ar:['ar','ar'],hi:['hi','hi'],id:['id','id'],ja:['ja','ja'],ko:['ko','ko'],zh:['zh-CN','zh-Hans']};
const LABELS:any={
  en:{local:'Local news',global:'Global news',seoLocal:'news today',seoGlobal:'global news today',open:'Open the news source for the full report.'},
  pt:{local:'Notícias locais',global:'Notícias globais',seoLocal:'notícias hoje',seoGlobal:'notícias do mundo hoje',open:'Abra a fonte da notícia para ler a reportagem completa.'},
  es:{local:'Noticias locales',global:'Noticias globales',seoLocal:'noticias hoy',seoGlobal:'noticias del mundo hoy',open:'Abre la fuente de la noticia para leer el informe completo.'},
  fr:{local:'Actualités locales',global:'Actualités mondiales',seoLocal:"actualités aujourd'hui",seoGlobal:"actualités mondiales aujourd'hui",open:"Ouvrez la source d'actualité pour lire le reportage complet."},
  de:{local:'Lokale Nachrichten',global:'Weltnachrichten',seoLocal:'Nachrichten heute',seoGlobal:'Weltnachrichten heute',open:'Öffne die Nachrichtenquelle für den vollständigen Bericht.'},
  it:{local:'Notizie locali',global:'Notizie globali',seoLocal:'notizie oggi',seoGlobal:'notizie dal mondo oggi',open:'Apri la fonte della notizia per il servizio completo.'},
  tr:{local:'Yerel haberler',global:'Dünya haberleri',seoLocal:'bugünün haberleri',seoGlobal:'dünya haberleri bugün',open:'Haberin tamamı için haber kaynağını açın.'},
  ru:{local:'Местные новости',global:'Мировые новости',seoLocal:'новости сегодня',seoGlobal:'мировые новости сегодня',open:'Откройте источник, чтобы прочитать полный материал.'},
  ar:{local:'أخبار محلية',global:'أخبار عالمية',seoLocal:'أخبار اليوم',seoGlobal:'أخبار العالم اليوم',open:'افتح مصدر الخبر لقراءة التقرير الكامل.'},
  hi:{local:'स्थानीय समाचार',global:'वैश्विक समाचार',seoLocal:'आज की खबरें',seoGlobal:'आज की दुनिया की खबरें',open:'पूरी रिपोर्ट पढ़ने के लिए समाचार स्रोत खोलें।'},
  id:{local:'Berita lokal',global:'Berita global',seoLocal:'berita hari ini',seoGlobal:'berita dunia hari ini',open:'Buka sumber berita untuk membaca laporan lengkap.'},
  ja:{local:'国内ニュース',global:'世界ニュース',seoLocal:'今日のニュース',seoGlobal:'今日の世界ニュース',open:'ニュース元を開いて全文をご確認ください。'},
  ko:{local:'지역 뉴스',global:'세계 뉴스',seoLocal:'오늘 뉴스',seoGlobal:'오늘의 세계 뉴스',open:'전체 기사를 보려면 뉴스 출처를 여세요.'},
  zh:{local:'本地新闻',global:'全球新闻',seoLocal:'今日新闻',seoGlobal:'今日全球新闻',open:'打开新闻来源，阅读完整报道。'}
};
const clean=(v:any)=>String(v??'').replace(/\s+/g,' ').trim();
const decode=(v:any)=>clean(String(v??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
const tag=(block:string,name:string)=>{const m=block.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));return m?decode(m[1]):''};
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);
const countryName=(cc:string,l:string)=>{try{return clean(new Intl.DisplayNames([l==='pt'?'pt-BR':l,'en'],{type:'region'}).of(cc))||cc}catch{return cc}};
const cors=(o:string|null)=>({'access-control-allow-origin':!o||o==='https://matchapp.tv'||o==='https://www.matchapp.tv'||o.startsWith('http://localhost:')?(o||'https://matchapp.tv'):'https://matchapp.tv','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'content-type','vary':'Origin'});
const CACHE=new Map<string,{freshUntil:number,staleUntil:number,items:any[]}>();
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchXml(url:string){
  let last='unavailable';
  for(let attempt=0;attempt<2;attempt++){
    try{
      const r=await fetch(url,{headers:{accept:'application/rss+xml,application/xml,text/xml','user-agent':'MatchAppAiNews/1.1 (+https://matchapp.tv/)'},signal:AbortSignal.timeout(7000)});
      if(r.ok)return await r.text();
      last='HTTP '+r.status;
      if(r.status<500&&r.status!==429)break;
    }catch(e){last=String((e as Error)?.message||e).slice(0,80)}
    await sleep(250*(attempt+1));
  }
  throw new Error(last);
}

async function pull(scope:'local'|'global',cc:string,l:string){
  const cacheKey=scope+':'+cc+':'+l,now=Date.now(),cached=CACHE.get(cacheKey);
  if(cached&&cached.freshUntil>now)return cached.items;
  const e=EDITION[l]||EDITION.en;
  const primary=new URL('https://news.google.com/rss/headlines/section/topic/'+(scope==='local'?'NATION':'WORLD'));
  primary.searchParams.set('hl',e[0]);primary.searchParams.set('gl',cc);primary.searchParams.set('ceid',cc+':'+e[1]);
  const labels=LABELS[l]||LABELS.en;
  const fallback=new URL('https://news.google.com/rss/search');
  const query=scope==='local'?(countryName(cc,l)+' when:1d'):(labels.seoGlobal+' when:1d');
  fallback.searchParams.set('q',query);fallback.searchParams.set('hl',e[0]);fallback.searchParams.set('gl',cc);fallback.searchParams.set('ceid',cc+':'+e[1]);
  let xml='';
  const errors:string[]=[];
  for(const candidate of [primary.href,fallback.href]){
    try{xml=await fetchXml(candidate);if(xml)break}catch(e){errors.push(String((e as Error)?.message||e).slice(0,80))}
  }
  if(!xml){
    if(cached&&cached.staleUntil>now)return cached.items;
    throw new Error(errors.join(' / ')||'regional news unavailable');
  }
  const blocks=xml.match(/<item\b[\s\S]*?<\/item>/gi)||[];
  const out:any[]=[],seen=new Set<string>();
  for(const b of blocks){
    let title=tag(b,'title');const url=tag(b,'link'),published=tag(b,'pubDate');
    const sm=b.match(/<source\b[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
    const sourceHome=sm?decode(sm[1]):'',source=sm?decode(sm[2]):'News source';
    if(!title||!url.startsWith('https://news.google.com/'))continue;
    if(source&&title.endsWith(' - '+source))title=title.slice(0,-(' - '+source).length).trim();
    const key=title.toLowerCase();if(seen.has(key))continue;seen.add(key);
    const id='regional-'+await sha(scope+'|'+url),global=scope==='global',labels=LABELS[l]||LABELS.en;
    out.push({id,source,source_home:sourceHome,url,title,description:labels.open,image:null,published_at:new Date(published||Date.now()).toISOString(),country:global?'GLOBAL':cc,language:l,category:'general',event_type:global?labels.global:labels.local,breaking:false,provider:'Regional RSS',scope,seo:{primary_keyword:global?labels.seoGlobal:(countryName(cc,l)+' '+labels.seoLocal),locale:global?l:(l+'-'+cc),intent:global?'global top news':'local top news',keywords:[title,global?labels.seoGlobal:(countryName(cc,l)+' '+labels.seoLocal)]}});
    if(out.length>=(global?5:6))break;
  }
  if(!out.length){
    if(cached&&cached.staleUntil>now)return cached.items;
    throw new Error('regional feed returned no usable items');
  }
  CACHE.set(cacheKey,{freshUntil:now+10*60_000,staleUntil:now+6*60*60_000,items:out});
  return out;
}
Deno.serve(async req=>{
  const o=req.headers.get('origin');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(o)});
  if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers:cors(o)});
  const u=new URL(req.url),cc=clean(u.searchParams.get('country')||'US').toUpperCase();
  const raw=clean(u.searchParams.get('language')||'en').toLowerCase().split('-')[0],l=ALLOWED_LANGS.has(raw)?raw:'en';
  if(!/^[A-Z]{2}$/.test(cc))return Response.json({ok:false,error:'invalid country'},{status:400,headers:cors(o)});
  const warnings:string[]=[];let local:any[]=[],global:any[]=[];
  try{local=await pull('local',cc,l)}catch(e){warnings.push('local:'+String((e as Error)?.message||e).slice(0,80))}
  try{global=await pull('global',cc,l)}catch(e){warnings.push('global:'+String((e as Error)?.message||e).slice(0,80))}
  const items=[...local,...global];
  const feedVersion='regional-'+await sha(cc+'|'+l+'|'+items.map(item=>item.id).join('|'));
  return Response.json({ok:true,country:cc,language:l,generated_at:new Date().toISOString(),feed_version:feedVersion,local_count:local.length,global_count:global.length,items,source_policy:'country edition plus global edition in selected language',...(warnings.length?{warnings}:{})},{headers:{...cors(o),'content-type':'application/json; charset=utf-8','cache-control':'public,max-age=60,s-maxage=600'}});
});