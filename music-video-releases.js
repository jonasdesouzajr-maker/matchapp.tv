/* Adult editorial video additions. Exact official identities stay separate from
   the locked Home film/TV identities and their ingestion/AI/matching mechanisms. */
(function () {
    'use strict';
    const COPY = {
        en:['Official music video','Released on YouTube','Album / soundtrack','Director','Featuring','Watch on YouTube','Official source','Verified'],
        pt:['Videoclipe oficial','Lançamento no YouTube','Álbum / trilha sonora','Direção','Participações','Assistir no YouTube','Fonte oficial','Verificado'],
        es:['Videoclip oficial','Estreno en YouTube','Álbum / banda sonora','Dirección','Participaciones','Ver en YouTube','Fuente oficial','Verificado'],
        fr:['Clip officiel','Sortie sur YouTube','Album / bande originale','Réalisation','Avec','Voir sur YouTube','Source officielle','Vérifié'],
        de:['Offizielles Musikvideo','Auf YouTube veröffentlicht','Album / Soundtrack','Regie','Mit','Auf YouTube ansehen','Offizielle Quelle','Geprüft'],
        it:['Video musicale ufficiale','Uscita su YouTube','Album / colonna sonora','Regia','Con','Guarda su YouTube','Fonte ufficiale','Verificato'],
        tr:['Resmî müzik videosu','YouTube yayın tarihi','Albüm / film müziği','Yönetmen','Katılanlar','YouTube’da izle','Resmî kaynak','Doğrulandı'],
        ru:['Официальный клип','Премьера на YouTube','Альбом / саундтрек','Режиссёр','Участники','Смотреть на YouTube','Официальный источник','Проверено'],
        ar:['الفيديو الموسيقي الرسمي','تاريخ الإصدار على YouTube','الألبوم / الموسيقى التصويرية','الإخراج','بمشاركة','شاهد على YouTube','المصدر الرسمي','تم التحقق'],
        hi:['आधिकारिक संगीत वीडियो','YouTube पर रिलीज़','एल्बम / फ़िल्म संगीत','निर्देशक','कलाकार','YouTube पर देखें','आधिकारिक स्रोत','सत्यापित'],
        id:['Video musik resmi','Dirilis di YouTube','Album / musik film','Sutradara','Dibintangi','Tonton di YouTube','Sumber resmi','Terverifikasi'],
        ja:['公式ミュージックビデオ','YouTube公開日','アルバム／サウンドトラック','監督','出演','YouTubeで見る','公式情報','確認日'],
        ko:['공식 뮤직비디오','YouTube 공개일','앨범 / 사운드트랙','감독','출연','YouTube에서 보기','공식 출처','확인일'],
        zh:['官方音乐视频','YouTube发布日期','专辑／原声带','导演','出演','在YouTube观看','官方来源','核实日期']
    };
    const VIEW_LABEL = {
        en:'views',pt:'visualizações',es:'visualizaciones',fr:'vues',de:'Aufrufe',it:'visualizzazioni',tr:'görüntüleme',
        ru:'просмотров',ar:'مشاهدة',hi:'व्यूज़',id:'tayangan',ja:'再生',ko:'조회수',zh:'次观看'
    };
    const lang = () => String(window.MATCH_LANG || document.documentElement.lang || 'en').split('-')[0].toLowerCase();
    const copy = () => COPY[lang()] || COPY.en;
    const releaseMonth = value => new Intl.DateTimeFormat(window.MATCH_LANG || document.documentElement.lang || 'en', {month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value));
    const date = value => new Intl.DateTimeFormat(window.MATCH_LANG || document.documentElement.lang || 'en', {dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
    const fullViews = value => { const n=Number(value);return Number.isFinite(n)&&n>=0?new Intl.NumberFormat(window.MATCH_LANG || document.documentElement.lang || 'en').format(n):''; };
    const posterViews = value => { const n=Number(value),label=VIEW_LABEL[lang()]||VIEW_LABEL.en;if(!Number.isFinite(n)||n<0)return '— '+label;const formatted=new Intl.NumberFormat(window.MATCH_LANG || document.documentElement.lang || 'en',{notation:n>=10000?'compact':'standard',maximumFractionDigits:1}).format(n);return formatted+' '+label; };
    const shortVideoUrl = r => 'youtu.be/'+r.id;
    let inventory, featuredIds, mounting=false;
    async function all() {
        try {
        if (!inventory) inventory = fetch('/data/music-video-releases.json?day='+new Date().toISOString().slice(0,10), {cache:'no-store',signal:AbortSignal.timeout(6500)}).then(r => {
            if (!r.ok) throw Error('Music inventory unavailable'); return r.json();
        }).then(data => { featuredIds=data.featuredIds; return data.items.filter(r => /^[\w-]{11}$/.test(r.id) && r.url === 'https://www.youtube.com/watch?v='+r.id && r.thumbnail === 'https://i.ytimg.com/vi/'+r.id+'/hqdefault.jpg' && r.poster === '/assets/music-videos/'+r.id+'.jpg' && Date.parse(r.publishedAt) <= Date.now()); });
        return await inventory;
        } catch (_) { inventory = null; return []; }
    }
    const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const artistNames = value => [value,...String(value||'').split(/\s+(?:&|feat\.?|ft\.?)\s+/i)];
    function isVideoQuestion(question, history=[]) {
        const q=normalize(question), context=normalize(history.map(t=>t.text||'').join(' '));
        return /\b(music videos?|videoclipes?|videoclips?|clips? musicais|videos? musicais)\b/.test(q) ||
            (/\b(videos?|clipes?|clips?)\b/.test(q) && /\b(latest|recent|newest|new|ultimos?|recentes?|novos?|mais novos?|nuevos?|recientes?)\b/.test(q)) ||
            (/\b(latest|newest|most recent|mais recentes|ultimos)\b/.test(q) && /\b(music videos?|videoclipes?)\b/.test(context));
    }
    async function query(question, history=[]) {
        if(!isVideoQuestion(question,history))return null;
        if(!/\b(latest|recent|recently|newest|new|ultimos?|recentes?|novos?|mais novos?|nuevos?|recientes?)\b/.test(normalize(question)))return null;
        const rows=await all(), q=normalize(question);
        const artists=[...new Set(rows.flatMap(r=>artistNames(r.artist)))];
        const namesIn=text=>{
            const found=artists.filter(a=>(' '+normalize(text)+' ').includes(' '+normalize(a)+' '));
            return found.filter(a=>!found.some(b=>b!==a&&(' '+normalize(b)+' ').includes(' '+normalize(a)+' ')));
        };
        let matches=namesIn(q);
        if(!matches.length && /\b(her|his|their|them|dela|dele|eles|ela|he|she)\b/.test(q)) {
            for(const turn of [...history].reverse()) {
                matches=namesIn(turn.text);
                if(matches.length)break;
            }
        }
        if(!matches.length && !/\b(music videos?|videoclipes?|videoclips?|videos? musicais)\b/.test(q))return null;
        // Explicit recent requests never use model memory or title-only iTunes.
        // A daily verified snapshot is labelled honestly; it is not a live chart.
        const fresh=rows.filter(r=>{const age=Date.now()-Date.parse(r.verifiedAt+'T00:00:00Z');return age>=0 && age<=2*86400000;});
        const selected=matches.length===1 ? fresh.filter(r=>artistNames(r.artist).includes(matches[0])).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,6) : [];
        const pt=lang()==='pt', es=lang()==='es';
        const answer=selected.length ?
            (pt?'Videoclipes oficiais verificados de ':es?'Videoclips oficiales verificados de ':'Verified official music videos by ')+matches[0]+
            (pt?', do mais recente ao mais antigo. Catálogo verificado em ':es?', del más reciente al más antiguo. Catálogo verificado el ':', newest first. Catalog checked on ')+date(selected[0].verifiedAt+'T12:00:00Z')+
            (pt?'. Consulte o canal oficial para lançamentos após essa verificação.':es?'. Consulta el canal oficial para estrenos posteriores.':'. Check the official channel for releases after that check.') :
            (pt?'Não consegui confirmar os videoclipes recentes desse artista. Diga o nome completo do artista ou consulte seu canal oficial; não vou apresentar vídeos antigos como recentes.':es?'No pude confirmar los videoclips recientes de ese artista. Indica su nombre completo o consulta su canal oficial.':'I could not confirm recent official videos for that artist. Please give the full artist name or check their official channel; older suggestions will not be presented as latest releases.');
        return {answer,results:selected.map(r=>({title:r.artist+' — '+r.title,type:'music video',_musicVideoId:r.id})),_live:false,_verifiedMusic:selected.length>0};
    }
    const get = async id => (await all()).find(r => r.id === id);
    const intro = r => `${copy()[0]}: ${r.artist} — ${r.title}. ${copy()[1]}: ${date(r.publishedAt)}. ${posterViews(r.viewCount)}. ${r.url}`;
    function link(href, label) {
        const a=document.createElement('a');a.className='gold-btn';a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;return a;
    }
    async function paintCard(id, grid, append=false) {
        const r=await get(id);if(!r || !grid?.isConnected)return;
        if(!append)grid.replaceChildren();grid.style.display='grid';
        const card=document.createElement('article');card.className='discover-card discover-music-card';card.dataset.musicVideoId=id;
        const poster=document.createElement('div');poster.className='discover-poster';
        const img=document.createElement('img');img.dataset.maMedia='1';img.src=r.poster;img.alt=r.artist+' — '+r.title;img.width=480;img.height=360;img.decoding='async';poster.append(img);
        const body=document.createElement('div');body.className='discover-body';
        const heading=document.createElement('h2');heading.textContent=img.alt;body.append(heading);
        const facts=[[copy()[0],r.channel],[copy()[1],date(r.publishedAt)],[VIEW_LABEL[lang()]||VIEW_LABEL.en,fullViews(r.viewCount)],[copy()[2],r.album],[copy()[3],r.director],[copy()[4],r.cast.join(', ')],[copy()[7],date(r.verifiedAt+'T12:00:00Z')]];
        facts.filter(([,value])=>value).forEach(([label,value])=>{const p=document.createElement('p');p.className='discover-music-info';p.textContent=label+': '+value;body.append(p);});
        if(r.durationSeconds){const time=document.createElement('p');time.className='discover-meta';time.textContent=Math.floor(r.durationSeconds/60)+':'+String(r.durationSeconds%60).padStart(2,'0');body.append(time);}
        const actions=document.createElement('div');actions.className='discover-actions';actions.append(link(r.url,copy()[5]),link(r.creditsSource,copy()[6]));body.append(actions);
        const preview=document.createElement('iframe');preview.src='https://www.youtube-nocookie.com/embed/'+r.id;preview.title=r.artist+' — '+r.title;preview.loading='lazy';preview.allow='encrypted-media; picture-in-picture; fullscreen';preview.allowFullscreen=true;preview.className='discover-official-music-preview';body.append(preview);
        const channel=link(r.channelUrl, r.channel+' · YouTube');body.append(channel);
        card.append(poster,body);grid.append(card);
        window.MatchAppTitleIdentity?.paint(heading,{title:r.title,originalTitle:r.title,displayTitle:r.title,kind:'music video'});
    }
    function tile(r, duplicate) {
        const card=document.createElement('div');card.className='marquee-item';card.dataset.musicVideo=r.id;
        card.setAttribute('role','button');card.tabIndex=duplicate?-1:0;
        if(duplicate)card.setAttribute('aria-hidden','true');
        card.setAttribute('aria-label',intro(r));
        const img=document.createElement('img');img.dataset.maMedia='1';img.src=r.poster;img.alt=r.artist+' — '+r.title;img.width=480;img.height=360;img.loading='lazy';img.decoding='async';
        const cover=document.createElement('div');cover.className='music-video-cover';
        const header=document.createElement('div');header.className='music-cover-header';
        const platform=document.createElement('span');platform.className='music-cover-platform';platform.textContent='YouTube';platform.setAttribute('aria-hidden','true');
        const artist=document.createElement('span');artist.className='music-cover-artist';artist.textContent=r.artist;
        header.append(platform,artist);
        const frame=document.createElement('div');frame.className='music-cover-frame';frame.append(img);
        const caption=document.createElement('div');caption.className='music-video-caption';
        const title=document.createElement('span');title.className='music-cover-title';title.textContent=r.title;
        const meta=document.createElement('div');meta.className='music-cover-meta';
        const release=document.createElement('span');release.className='music-cover-release';release.textContent='📅 '+date(r.publishedAt);
        const views=document.createElement('span');views.className='music-cover-views';views.textContent='▶ '+posterViews(r.viewCount);
        meta.append(release,views);
        const url=document.createElement('span');url.className='music-cover-link';url.textContent=shortVideoUrl(r);url.title=r.url;
        caption.append(title,meta,url);cover.append(header,frame,caption);card.append(cover);
        // Sample only a tiny, same-origin copy for the surrounding UI palette.
        // The displayed original image is never edited, stretched or cropped.
        const tint=()=>{
            try{
                const canvas=document.createElement('canvas');canvas.width=canvas.height=8;
                const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return;
                ctx.drawImage(img,0,0,8,8);const pixels=ctx.getImageData(0,0,8,8).data;
                let red=0,green=0,blue=0,count=0;
                for(let i=0;i<pixels.length;i+=4){const brightness=(pixels[i]+pixels[i+1]+pixels[i+2])/3;if(brightness<30||brightness>225)continue;red+=pixels[i];green+=pixels[i+1];blue+=pixels[i+2];count++;}
                if(count)cover.style.setProperty('--music-cover-rgb',[red,green,blue].map(n=>Math.round(n/count)).join(','));
            }catch(_){/* The filled brand palette remains available if sampling fails. */}
        };
        img.addEventListener('load',tint,{once:true});if(img.complete&&img.naturalWidth)tint();
        card.addEventListener('click',()=>{window.track?.('music_video_click',{title:img.alt,videoId:r.id});window.location.href='/discover.html?video='+encodeURIComponent(r.id)+'&focus=start';});
        card.addEventListener('keydown',event=>{
            if(event.key!=='Enter'&&event.key!==' ')return;
            event.preventDefault();event.stopPropagation();card.click();
        });
        return card;
    }
    async function mount() {
        const track=document.getElementById('marquee-track');
        if(!track || track.querySelector('[data-music-video]') || mounting)return;
        mounting=true;
        try{
            const records=await all();
            if(!track.isConnected || track.querySelector('[data-music-video]'))return;
            const selected=Array.isArray(featuredIds)?records.filter(r=>featuredIds.includes(r.id)):records;
            // A Top Titles music-video card is only eligible once its required
            // poster metadata is complete. Never fall back to an image-only tile.
            const rows=selected.filter(r=>Date.parse(r.publishedAt)&&Number.isFinite(Number(r.viewCount))&&r.viewCount>=0&&/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(r.url));
            if(!rows.length)return;
            // Spread releases among however many editorial film/TV identities the
            // Home rail owns. Detect the mirrored halves instead of assuming ten.
            const originals=Array.from(track.children).filter(node=>node.querySelector?.('img[data-title]'));
            const uniqueCount=originals.length/2;
            if(!Number.isInteger(uniqueCount)||uniqueCount<1)return;
            rows.forEach((r,index)=>{
                const after=Math.floor(index*uniqueCount/rows.length);
                track.insertBefore(tile(r,false),originals[after+1]||originals[uniqueCount]||null);
                track.insertBefore(tile(r,true),originals[uniqueCount+after+1]||null);
            });
            const viewport=track.closest('.marquee-viewport');if(viewport)viewport.scrollLeft=0;
            window.dispatchEvent(new Event('resize'));
        }finally{mounting=false;}
    }
    async function localize() {
        const rows=await all();
        document.querySelectorAll('[data-music-video]').forEach(card=>{const r=rows.find(x=>x.id===card.dataset.musicVideo);if(r){card.setAttribute('aria-label',intro(r));const release=card.querySelector('.music-cover-release');if(release)release.textContent='📅 '+date(r.publishedAt);const views=card.querySelector('.music-cover-views');if(views)views.textContent='▶ '+posterViews(r.viewCount);const url=card.querySelector('.music-cover-link');if(url){url.textContent=shortVideoUrl(r);url.title=r.url;}}});
        document.querySelectorAll('.chat-bubble[data-music-video-id]').forEach(bubble=>{
            const r=rows.find(x=>x.id===bubble.dataset.musicVideoId);if(!r)return;
            const p=bubble.querySelector('.chat-answer-text');if(p)p.textContent=intro(r);
            const speak=bubble.querySelector('.discover-speak');if(speak)speak.onclick=()=>window.readAloud(intro(r),speak);
            paintCard(r.id,bubble.querySelector('.chat-results-grid'));
        });
        document.querySelectorAll('.discover-music-card').forEach(card=>{const holder=document.createElement('div');card.replaceWith(holder);paintCard(card.dataset.musicVideoId,holder).then(()=>holder.replaceWith(...holder.childNodes));});
    }
    window.MatchAppMusicReleases={get,intro,paintCard,query,isVideoQuestion};
    document.addEventListener('matchapp:langchange',localize);
    // The weekly rail can repaint after this script has mounted. Re-mount the
    // verified music cards after that refresh so the rich metadata never vanishes.
    document.addEventListener('matchapp:trendingpainted',mount);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
