/* Adult editorial video additions. Exact official identities stay separate from
   the locked ten TMDB titles and their ingestion/AI/matching mechanisms. */
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
    const lang = () => String(window.MATCH_LANG || document.documentElement.lang || 'en').split('-')[0].toLowerCase();
    const copy = () => COPY[lang()] || COPY.en;
    const date = value => new Intl.DateTimeFormat(window.MATCH_LANG || document.documentElement.lang || 'en', {dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
    let inventory, featuredIds;
    async function all() {
        if (!inventory) inventory = fetch('/data/music-video-releases.json?day='+new Date().toISOString().slice(0,10), {cache:'no-store'}).then(r => {
            if (!r.ok) throw Error('Music inventory unavailable'); return r.json();
        }).then(data => { featuredIds=data.featuredIds; return data.items.filter(r => /^[\w-]{11}$/.test(r.id) && r.url === 'https://www.youtube.com/watch?v='+r.id && r.thumbnail === 'https://i.ytimg.com/vi/'+r.id+'/hqdefault.jpg' && r.poster === '/assets/music-videos/'+r.id+'.jpg' && Date.parse(r.publishedAt) <= Date.now()); });
        try { return await inventory; } catch (_) { inventory = null; return []; }
    }
    const get = async id => (await all()).find(r => r.id === id);
    const intro = r => `${copy()[0]}: ${r.artist} — ${r.title}. ${copy()[1]}: ${date(r.publishedAt)}.`;
    function link(href, label) {
        const a=document.createElement('a');a.className='gold-btn';a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;return a;
    }
    async function paintCard(id, grid) {
        const r=await get(id);if(!r || !grid?.isConnected)return;
        grid.replaceChildren();grid.style.display='grid';
        const card=document.createElement('article');card.className='discover-card discover-music-card';card.dataset.musicVideoId=id;
        const poster=document.createElement('div');poster.className='discover-poster';
        const img=document.createElement('img');img.dataset.maMedia='1';img.src=r.poster;img.alt=r.artist+' — '+r.title;img.width=480;img.height=360;img.decoding='async';poster.append(img);
        const body=document.createElement('div');body.className='discover-body';
        const heading=document.createElement('h2');heading.textContent=img.alt;body.append(heading);
        const facts=[[copy()[0],r.channel],[copy()[1],date(r.publishedAt)],[copy()[2],r.album],[copy()[3],r.director],[copy()[4],r.cast.join(', ')],[copy()[7],date(r.verifiedAt+'T12:00:00Z')]];
        facts.filter(([,value])=>value).forEach(([label,value])=>{const p=document.createElement('p');p.className='discover-music-info';p.textContent=label+': '+value;body.append(p);});
        if(r.durationSeconds){const time=document.createElement('p');time.className='discover-meta';time.textContent=Math.floor(r.durationSeconds/60)+':'+String(r.durationSeconds%60).padStart(2,'0');body.append(time);}
        const actions=document.createElement('div');actions.className='discover-actions';actions.append(link(r.url,copy()[5]),link(r.creditsSource,copy()[6]));body.append(actions);
        card.append(poster,body);grid.append(card);
    }
    function tile(r, duplicate) {
        const card=document.createElement('div');card.className='marquee-item';card.dataset.musicVideo=r.id;
        card.setAttribute('role','button');card.tabIndex=duplicate?-1:0;
        if(duplicate)card.setAttribute('aria-hidden','true');
        card.setAttribute('aria-label',intro(r));
        const img=document.createElement('img');img.dataset.maMedia='1';img.src=r.poster;img.alt=r.artist+' — '+r.title;img.width=480;img.height=360;img.loading='lazy';img.decoding='async';
        const caption=document.createElement('span');caption.className='music-video-caption';caption.textContent=img.alt;
        card.append(img,caption);
        card.addEventListener('click',()=>{window.track?.('music_video_click',{title:img.alt,videoId:r.id});window.location.href='/discover.html?video='+encodeURIComponent(r.id)+'&focus=start';});
        card.addEventListener('keydown',event=>{
            if(event.key!=='Enter'&&event.key!==' ')return;
            event.preventDefault();event.stopPropagation();card.click();
        });
        return card;
    }
    async function mount() {
        const track=document.getElementById('marquee-track');if(!track || track.querySelector('[data-music-video]'))return;
        const records=await all(), rows=Array.isArray(featuredIds)?records.filter(r=>featuredIds.includes(r.id)):records;if(!rows.length)return;
        // Keep all ten original film/TV identities, plus their original loop.
        const first=track.children[1],second=track.children[11];
        rows.forEach(r=>track.insertBefore(tile(r,false),first||null));
        if(second)rows.forEach(r=>track.insertBefore(tile(r,true),second));
        const viewport=track.closest('.marquee-viewport');if(viewport)viewport.scrollLeft=0;
        window.dispatchEvent(new Event('resize'));
    }
    async function localize() {
        const rows=await all();
        document.querySelectorAll('[data-music-video]').forEach(card=>{const r=rows.find(x=>x.id===card.dataset.musicVideo);if(r)card.setAttribute('aria-label',intro(r));});
        document.querySelectorAll('.chat-bubble[data-music-video-id]').forEach(bubble=>{
            const r=rows.find(x=>x.id===bubble.dataset.musicVideoId);if(!r)return;
            const p=bubble.querySelector('.chat-answer-text');if(p)p.textContent=intro(r);
            const speak=bubble.querySelector('.discover-speak');if(speak)speak.onclick=()=>window.readAloud(intro(r),speak);
            paintCard(r.id,bubble.querySelector('.chat-results-grid'));
        });
        document.querySelectorAll('.discover-music-card').forEach(card=>paintCard(card.dataset.musicVideoId,card.parentElement));
    }
    window.MatchAppMusicReleases={get,intro,paintCard};
    document.addEventListener('matchapp:langchange',localize);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
