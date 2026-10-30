/* ============================================================
   © 2026 MatchApp.tv — All Rights Reserved.
   Proprietary source code. Not licensed for reproduction, scraping,
   or reuse in competing products. See /terms.html Section 4.
   ============================================================ */

/* ============================================================
   MatchApp — AI NATURAL-LANGUAGE DISCOVERY
   Powers discover.html. Takes a plain-language question such as
   "Is there a TV show about Medecins Sans Frontieres?" and returns
   a real conversational answer (spoken and written) plus a ranked
   list of matching titles.

   BUG FIX (podcast-only results): the previous fallback searched
   movie + tvShow + podcast media for every question, unconditionally.
   iTunes' podcast search is far looser than its movie/show search —
   almost any phrase returns dozens of podcasts, while offbeat movie
   questions often return zero — so after filtering, results were
   frequently 100% podcasts regardless of what was asked. This
   version detects whether the question is actually about audio
   content before ever touching the podcast/music catalogs.

   Falls back to the keyless iTunes catalog if the AI proxy is
   unavailable, so the page never comes back empty — but the
   fallback is now honestly labelled as offline mode rather than
   presented as if it were the full conversational AI.
   ============================================================ */

const DISCOVER_MAX = 12;

function getQueryParam(name) {
    try { return new URLSearchParams(window.location.search).get(name) || ''; }
    catch (e) { return ''; }
}

function keepConversationAtStart() {
    return getQueryParam('focus') === 'start';
}

/* ---------- Intent detection ---------- */
// Decides whether the question is actually about audio (podcasts, music,
// playlists, singles, audiobooks) so the fallback never pulls in podcasts
// for a question about a movie. (The AI Concierge path does its own,
// identical intent check server-side, in the Edge Function.)
function mediaIntentQuestion(q) {
  // Only discard explicit *exclusions* of media at the end of a clause.
  // A negative mention is not a positive format request.
  return String(q||'').replace(/\b(?:do\s+not|don't|dont|avoid)\s+(?:recommend|suggest|include|show|give|offer)\s+(?:(?:me|any)\s+)*(?:e-?books?|books?|audio\s?books?|music|films?|movies?|tv\s+shows?|series|magazines?|podcasts?)(?:\s+(?:or|and)\s+(?:e-?books?|books?|audio\s?books?|music|films?|movies?|tv\s+shows?|series|magazines?|podcasts?))*(?=\s*(?:[.!?]|$))/gi,' ');
}
function detectAudioIntent(q) {
    q=mediaIntentQuestion(q);
    return /\b(podcast|playlist|song|songs|music|album|albums|single|singles|audiobook|spotify|listen|radio show)\b/i.test(q);
}
function detectBookIntent(q) {
    q=mediaIntentQuestion(q);
    // Books and narrated book editions have an independent verified matcher.
    // Never treat one as a Spotify music track or TMDB film request.
    return /\b(e-?books?|books?|audio\s?books?|novels?|reading|kindle|librivox|livros?|audiolivros?|libros?|audiolibros?|magazines?|revistas?)\b/i.test(q) || /雑誌|オーディオブック/u.test(q);
}

/* ---------- AI conversational answer ---------- */

// Attempts to salvage JSON that was cut off mid-object (the classic symptom of
// a model hitting its token ceiling). Closes any unterminated string, then any
// still-open brackets, in the right order. Returns null if it's beyond saving.
function repairTruncatedJSON(raw) {
    let s = raw.slice(raw.indexOf('{'));
    // Drop trailing partial fragments so we don't close a half-written key or
    // an object that only has an opening brace. Order matters: strip the most
    // specific patterns first.
    s = s.replace(/,\s*\{\s*"[^"]*$/, '')   // ,{"tit      → partial key in a new object
         .replace(/,\s*"[^"]*$/, '')        // ,"tit       → partial key
         .replace(/,\s*\{\s*$/, '')         // ,{          → empty trailing object
         .replace(/,\s*$/, '');             // trailing comma

    let inStr = false, esc = false;
    const stack = [];
    for (const ch of s) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{' || ch === '[') stack.push(ch);
        else if (ch === '}' || ch === ']') stack.pop();
    }
    if (inStr) s += '"';
    while (stack.length) s += (stack.pop() === '{' ? '}' : ']');

    try { return JSON.parse(s); } catch (e) { return null; }
}

function parseAIResponse(data) {
    if (!data) throw new Error('AI unavailable');
    if (data.error) throw new Error(data.error);
    if (!data.candidates || !data.candidates[0]) throw new Error('AI unavailable');

    // Gemini may split valid JSON across multiple text parts. Assemble them before parsing.
    const raw = (Array.isArray(data.candidates[0]?.content?.parts)
        ? data.candidates[0].content.parts.map(p => typeof p?.text === 'string' ? p.text : '').join('')
        : '').trim();
    if (!raw) throw new Error('Empty AI answer');
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s === -1) throw new Error('Bad AI format');

    let parsed = null;
    if (e !== -1) {
        try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { parsed = null; }
    }
    // Last resort before giving up: try to repair a truncated payload rather
    // than dropping the user into offline mode over a missing closing brace.
    if (!parsed) {
        parsed = repairTruncatedJSON(raw);
        if (parsed) console.warn('[MatchApp Ai] Response was truncated; recovered it by repairing the JSON.');
    }
    if (!parsed) {
        console.error('[MatchApp Ai] Could not parse response. finishReason:', data._finishReason,
            '| model:', data._servedByModel, '\nFirst 400 chars:', String(raw).slice(0, 400));
        throw new Error('Bad AI format');
    }
    if (!parsed.answer) throw new Error('Empty AI answer');
    parsed.results = parsed.results || [];
    parsed._live = true;
    return parsed;
}

function discoverRecommendationRequest(question) {
    // A prohibition is not a request for suggestions. Remove only its clause
    // for intent classification, retaining any later positive mixed request.
    const q=(typeof mediaIntentQuestion==='function'?mediaIntentQuestion(question):String(question||''))
      .replace(/\b(?:do\s+not|don['’]?t|avoid|n[aã]o(?:\s+me)?)\s+(?:recommend\w*|suggest\w*|recomend\w*|sugir\w*|suger\w*|indiqu\w*)\b[\s\S]*?(?=[.!?;\n]|(?:,\s*(?:(?:but|and|mas|e)\s+)?|\s+(?:but|and|mas|e)\s+)(?:please\s+|por\s+favor\s+)?(?:me\s+)?(?:recommend\w*|suggest\w*|recomend\w*|sugir\w*|suger\w*|indiqu\w*|find\s+me|what\s+should\s+i\s+watch)\b|$)/giu,' ');
    if(window.MatchCooking?.isCooking?.(q))return false;
    const explicit=/\b(?:recommend\w*|suggest\w*|similar|another|next pick|what should i watch|find me|recomend\w*|sugir\w*|sugest\w*|indiqu\w*|sugier\w*|recomiend\w*|recommand\w*|sugg[eè]r\w*|empfehl\w*|consigli\w*|sugger\w*|tavsiye|[oö]ner\w*|rekomendas\w*|sarankan)\b|порекоменду|посоветуй|اقترح|رشح|أوصي|सुझाओ|सुझाव|おすすめ|推薦|추천|推荐/iu;
    if(explicit.test(q))return true;
    // A named-title/source question is intentional reference, even if it
    // contains "movie", "series" or "watch". Do not hide its answer as a repeat.
    if(/\b(?:who|when|where|director|release date|release year|tell me about|information about|how (?:can|do|to)|quem|quando|onde|diretor|fale sobre|c[oó]mo|d[oó]nde|cu[aá]ndo|qui|quand|o[uù]|wer|wann|wo|chi|quando|dove)\b|谁|哪[里裡]|いつ|どこ|누가|언제|어디|кто|когда|где/iu.test(q))return false;
    const intent=typeof mediaIntentQuestion==='function'?mediaIntentQuestion(q):q;
    return /\b(?:watch|stream|movies?|films?|series|shows?|podcasts?|playlists?|music|listen|books?|ebooks?|audiobooks?|magazines?|comedy|horror|romance|assistir|filmes?|séries?|películas?|livros?|libros?)\b/i.test(intent);
}

function discoverExcludedTitles(limit=160,charBudget=6000,options={}) {
    const readingTitles=options.reading?window.MatchAppReadingAI?.excludedTitles?.():null;
    const rows=options.reading?(Array.isArray(readingTitles)?readingTitles.slice():[]):[...(window.matchPolicy?.history?.()||[])];
    for(const name of options.reading?[]:['match_savedList','match_dislikedList','match_seenList','match_recentTitles']){
        try{const list=JSON.parse(localStorage.getItem(name)||'[]');if(Array.isArray(list))rows.push(...list);}catch(_){}
    }
    const seen=new Set(),titles=[];
    const add=value=>{
        if(typeof value!=='string')return;
        const title=value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,300);
        const key=title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
        if(!key||seen.has(key)||titles.length>=limit||title.length>charBudget)return;
        seen.add(key);titles.push(title);charBudget-=title.length;
    };
    rows.forEach(row=>{
        if(typeof row==='string'){add(row);return;}
        if(!row)return;
        [row.title,row.originalTitle,row.original_title,...(Array.isArray(row.titleAliases)?row.titleAliases:[])].forEach(add);
        [row._tmdb,row._catalogMedia,row._meta].filter(Boolean).forEach(meta=>[meta.title,meta.originalTitle,meta.original_title,meta.original_name].forEach(add));
    });
    return titles;
}

function discoverAnswerContainsExcludedTitle(answer,knownKeys) {
    const normalise=window.matchPolicy?.key||titleKey;
    const text=normalise(answer);
    return [...(knownKeys||[])].some(key=>typeof key==='string'&&!key.includes(':')&&key.length>1&&text.includes(key));
}

function discoverRecommendationSummary(results,language){
    const RECOMMENDATION_COPY=Object.freeze({
  en:{fresh:'New options to explore: {titles}. Open their details to check availability.',empty:'No new titles remain in this response after applying your saved and excluded choices. Try another request.'},
  'pt-BR':{fresh:'Novas opções para explorar: {titles}. Abra os detalhes para consultar a disponibilidade.',empty:'Não restaram títulos novos nesta resposta após aplicar suas escolhas salvas e excluídas. Tente outro pedido.'},
  es:{fresh:'Nuevas opciones para explorar: {titles}. Abre los detalles para consultar la disponibilidad.',empty:'No quedan títulos nuevos en esta respuesta tras aplicar tus opciones guardadas y excluidas. Prueba otra solicitud.'},
  fr:{fresh:'De nouvelles options à découvrir : {titles}. Ouvrez les détails pour vérifier leur disponibilité.',empty:'Il ne reste aucun nouveau titre dans cette réponse après prise en compte de vos choix enregistrés et exclus. Essayez une autre demande.'},
  de:{fresh:'Neue Vorschläge zum Entdecken: {titles}. Öffne die Details, um die Verfügbarkeit zu prüfen.',empty:'Nach Berücksichtigung deiner gespeicherten und ausgeschlossenen Titel enthält diese Antwort keine neuen Titel mehr. Versuche eine andere Anfrage.'},
  it:{fresh:'Nuove opzioni da esplorare: {titles}. Apri i dettagli per verificare la disponibilità.',empty:'Dopo aver applicato le tue scelte salvate ed escluse, in questa risposta non restano nuovi titoli. Prova un’altra richiesta.'},
  tr:{fresh:'Keşfedebileceğiniz yeni seçenekler: {titles}. Erişilebilirliği kontrol etmek için ayrıntıları açın.',empty:'Kaydettiğiniz ve hariç tuttuğunuz seçimler uygulandıktan sonra bu yanıtta yeni bir yapım kalmadı. Başka bir istek deneyin.'},
  ru:{fresh:'Новые варианты для знакомства: {titles}. Откройте подробности, чтобы проверить доступность.',empty:'После учёта сохранённых и исключённых вариантов в этом ответе не осталось новых произведений. Попробуйте другой запрос.'},
  ar:{fresh:'خيارات جديدة لاستكشافها: {titles}. افتح التفاصيل للتحقق من التوفر.',empty:'لم تتبقَّ عناوين جديدة في هذه الإجابة بعد مراعاة اختياراتك المحفوظة والمستبعدة. جرّب طلبًا آخر.'},
  hi:{fresh:'नई चीज़ें देखें: {titles}। उपलब्धता जाँचने के लिए विवरण खोलें।',empty:'आपके सहेजे और बाहर रखे गए विकल्प लागू करने के बाद इस उत्तर में कोई नया शीर्षक नहीं बचा। कोई दूसरा अनुरोध आज़माएँ।'},
  id:{fresh:'Pilihan baru untuk dijelajahi: {titles}. Buka detail untuk memeriksa ketersediaan.',empty:'Tidak ada judul baru dalam jawaban ini setelah menerapkan pilihan yang Anda simpan dan kecualikan. Coba permintaan lain.'},
  ja:{fresh:'新しい候補：{titles}。詳細を開いて利用可否を確認してください。',empty:'保存済み・除外済みの選択を反映した結果、この回答には新しい作品が残りませんでした。別のリクエストを試してください。'},
  ko:{fresh:'새로 살펴볼 후보: {titles}. 상세 정보를 열어 이용 가능 여부를 확인하세요.',empty:'저장하거나 제외한 선택을 반영한 결과, 이 답변에는 새로운 작품이 남아 있지 않습니다. 다른 요청을 시도해 보세요.'},
  zh:{fresh:'可以探索的新选择：{titles}。打开详情查看可用情况。',empty:'应用你已保存和排除的选择后，此回答中没有剩余的新作品。请尝试其他请求。'}
});
  const base=String(language||'en').toLowerCase().split(/[-_]/)[0];
  const copy=RECOMMENDATION_COPY[base==='pt'?'pt-BR':base]||RECOMMENDATION_COPY.en;
  const titles=(Array.isArray(results)?results:[]).map(row=>typeof row?.title==='string'?row.title.trim():'').filter(Boolean).slice(0,6);
  return titles.length?copy.fresh.replace('{titles}',titles.join(' · ')):copy.empty;
}

async function askAIConversational(question, history) {
    if (!window.supabaseClient) {
        const err = new Error('No backend');
        err.aiUnavailable = true;
        throw err;
    }

    // The prompt engineering lives in the gemini-proxy Edge Function, so the
    // client sends structured params rather than a pre-built prompt string.
    const country = window.MatchAppCatalogMedia?.regionCode?.() || localStorage.getItem('match_user_country') || '';
    const age = localStorage.getItem('match_user_age') || '';
    const lang = window.MATCH_LANG || 'en';
    // Nickname so the AI can address the user by name. Optional by design —
    // an empty string simply means the AI stays neutral rather than guessing.
    const nickname = (typeof window.getUserNickname === 'function') ? window.getUserNickname() : '';
    const displayQuestion=question+'\n\nResponse language: '+lang+'. Use this selected language for the answer and every result description, regardless of the question language.';
    const recommendationsOnly=discoverRecommendationRequest(question);
    const excludedTitles=recommendationsOnly?discoverExcludedTitles(160,6000,{reading:typeof detectBookIntent==='function'&&detectBookIntent(question)}):[];
    const body = { mode: 'discover', question:displayQuestion, lang, country, age, nickname, history: history || [], recommendationsOnly, excludedTitles };

    // The proxy can try four models, each with a 20-second upstream deadline.
    // An 8-second browser timeout discarded healthy answers and retried live
    // requests unnecessarily, contributing to rate limits and offline badges.
    // Leave room for the entire verified proxy chain; do not retry timed-out
    // in-flight work, which might still be consuming model capacity.
    const AI_TIMEOUT_MS = 90000;
    const withTimeout = async (promise) => {
        let timer;
        try {
            return await Promise.race([
                promise,
                new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error('AI request timed out')), AI_TIMEOUT_MS);
                })
            ]);
        } finally {
            if (timer !== undefined) clearTimeout(timer);
        }
    };

    // A confirmed provider quota from this page's matching flow is not
    // recoverable by calling the same exhausted keys again immediately.
    if(Date.now()<Number(window.__matchappAIDownUntil||0)){
        const err=new Error('AI providers are temporarily quota-limited');
        err.aiUnavailable=true;
        err.aiTerminal=true;
        throw err;
    }
    // Two attempts of the SAME contract, not a fallback to a different one.
    // A transient cold-start/network failure gets one bounded retry, while the
    // request/response schema remains identical on both attempts.
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const { data, error } = await withTimeout(
                window.supabaseClient.functions.invoke('gemini-proxy', { body }));
            if (!error && data && !data.error) return parseAIResponse(data);
            // A second call cannot fix invalid credentials, a bad client
            // request, or a quota/rate-limit response; it only makes those
            // failures worse and needlessly burns provider capacity.
            const status = Number(error?.context?.status || data?.status || 0);
            if(status===429)window.__matchappAIDownUntil=Date.now()+45000;
            if (status === 429 || (status >= 400 && status < 500 && status !== 408)) {
                const err = new Error(status === 429 ? 'AI is busy; please try again shortly.' : 'AI request rejected.');
                err.aiUnavailable = true;
                err.aiTerminal = true;
                throw err;
            }
            if (attempt === 1) {
                console.warn('[MatchApp Ai] Transient failure; retrying once:', (error && error.message) || (data && data.error) || 'unknown');
                continue;
            }
            const detail = (error && error.message) || (data && data.error) || 'unknown';
            console.error('[MatchApp Ai] Both attempts failed:', detail,
                '\n→ Run the diagnostic to see exactly why: open /ai-check.html on this site.');
            const err = new Error('AI unavailable: ' + detail);
            err.aiUnavailable = true;   // lets the caller word the message honestly
            throw err;
        } catch (e) {
            if (attempt === 2 || e.aiTerminal || String(e.message || '').includes('timed out')) {
                e.aiUnavailable = true;
                throw e;
            }
            console.warn('[MatchApp Ai] Transient first-attempt error; retrying once:', e.message || e);
        }
    }
    const err = new Error('AI unavailable');
    err.aiUnavailable = true;
    throw err;
}

// Outage and source-verification messages follow the explicitly selected app
// language, even when the user's question or the original title is English.
function discoverRecoveryText(key, values = {}) {
    const keys=['directed','source','unavailable','factsUnavailable','books','audio','author','sourceLink','readingLink','emptyHint'];
    const rows={
        en:[
            '{title} ({year}) was directed by {director}.',
            'Verified original source: {source}.',
            'Conversational AI is temporarily unavailable.',
            'Conversational AI is temporarily unavailable, and I could not independently verify those film facts. Please try again later.',
            'Use the official bookstore and publisher links below to check editions and availability. Store search results do not by themselves verify an edition or listening rights.',
            'Check the official Apple Books and Audible searches below, then use Match E-books Ai to verify an exact audiobook edition before purchase or listening. Store search results do not by themselves verify an edition or listening rights.',
            '{title} by {author}',
            'Verified original film and director source ↗',
            '📚🎧📰 Verify e-books, audiobooks and magazines',
            'Type a question, or tap the microphone to ask MatchApp Ai.'
        ],
        pt:[
            '{title} ({year}) foi dirigido por {director}.',
            'Fonte original verificada: {source}.',
            'O chat de IA está temporariamente indisponível.',
            'O chat de IA está temporariamente indisponível. Não consegui confirmar esses dados em uma fonte de cinema; tente novamente mais tarde.',
            'Use os links oficiais de livrarias e editoras abaixo para conferir edições e disponibilidade. Resultados de busca em lojas não comprovam, por si só, uma edição ou direitos de escuta.',
            'Confira as buscas oficiais da Apple Books e da Audible abaixo e use o Match E-books Ai para verificar a edição exata do audiolivro antes de comprar ou ouvir. Resultados de busca em lojas não comprovam, por si só, uma edição ou direitos de escuta.',
            '{title}, de {author}',
            'Fonte original verificada do filme e da direção ↗',
            '📚🎧📰 Verificar livros, audiolivros e revistas',
            'Digite uma pergunta ou toque no microfone para falar com o MatchApp Ai.'
        ],
        es:[
            '{title} ({year}) fue dirigida por {director}.',
            'Fuente original verificada: {source}.',
            'El chat de IA está temporalmente no disponible.',
            'El chat de IA está temporalmente no disponible. No pude verificar esos datos cinematográficos; vuelve a intentarlo más tarde.',
            'Usa los enlaces oficiales de librerías y editoriales de abajo para consultar ediciones y disponibilidad. Los resultados de búsqueda de una tienda no confirman por sí solos una edición ni los derechos de escucha.',
            'Consulta las búsquedas oficiales de Apple Books y Audible de abajo y usa Match E-books Ai para verificar la edición exacta del audiolibro antes de comprar o escuchar. Los resultados de búsqueda de una tienda no confirman por sí solos una edición ni los derechos de escucha.',
            '{title}, de {author}',
            'Fuente original verificada de la película y su dirección ↗',
            '📚🎧📰 Verificar libros, audiolibros y revistas',
            'Escribe una pregunta o toca el micrófono para preguntar a MatchApp Ai.'
        ],
        fr:[
            '{title} ({year}) a été réalisé par {director}.',
            'Source originale vérifiée : {source}.',
            'Le chat IA est temporairement indisponible.',
            'Le chat IA est temporairement indisponible. Je n’ai pas pu vérifier ces informations cinématographiques de façon indépendante. Réessayez plus tard.',
            'Utilisez les liens officiels des librairies et des éditeurs ci-dessous pour vérifier les éditions et leur disponibilité. Les résultats de recherche d’une boutique ne confirment à eux seuls ni une édition ni des droits d’écoute.',
            'Consultez les recherches officielles Apple Books et Audible ci-dessous, puis utilisez Match E-books Ai pour vérifier l’édition exacte du livre audio avant tout achat ou écoute. Les résultats de recherche d’une boutique ne confirment à eux seuls ni une édition ni des droits d’écoute.',
            '{title}, de {author}',
            'Source originale vérifiée du film et de sa réalisation ↗',
            '📚🎧📰 Vérifier les livres numériques, livres audio et magazines',
            'Saisissez une question ou touchez le microphone pour interroger MatchApp Ai.'
        ],
        de:[
            '{title} ({year}) wurde von {director} inszeniert.',
            'Verifizierte Originalquelle: {source}.',
            'Der KI-Chat ist vorübergehend nicht verfügbar.',
            'Der KI-Chat ist vorübergehend nicht verfügbar. Ich konnte diese Filminformationen nicht unabhängig bestätigen. Bitte versuche es später erneut.',
            'Prüfe Ausgaben und Verfügbarkeit über die offiziellen Buchhandels- und Verlagslinks unten. Suchergebnisse eines Shops bestätigen allein weder eine bestimmte Ausgabe noch Hörrechte.',
            'Prüfe die offiziellen Suchergebnisse von Apple Books und Audible unten und verifiziere mit Match E-books Ai vor dem Kauf oder Anhören die genaue Hörbuchausgabe. Suchergebnisse eines Shops bestätigen allein weder eine bestimmte Ausgabe noch Hörrechte.',
            '{title} von {author}',
            'Verifizierte Originalquelle für Film und Regie ↗',
            '📚🎧📰 E-Books, Hörbücher und Zeitschriften prüfen',
            'Gib eine Frage ein oder tippe auf das Mikrofon, um MatchApp Ai zu fragen.'
        ],
        it:[
            '{title} ({year}) è stato diretto da {director}.',
            'Fonte originale verificata: {source}.',
            'La chat IA è temporaneamente indisponibile.',
            'La chat IA è temporaneamente indisponibile. Non ho potuto verificare in modo indipendente queste informazioni sul film. Riprova più tardi.',
            'Usa i link ufficiali delle librerie e degli editori qui sotto per verificare edizioni e disponibilità. I risultati di ricerca di un negozio non confermano da soli un’edizione o i diritti di ascolto.',
            'Consulta le ricerche ufficiali Apple Books e Audible qui sotto, poi usa Match E-books Ai per verificare l’edizione esatta dell’audiolibro prima di acquistare o ascoltare. I risultati di ricerca di un negozio non confermano da soli un’edizione o i diritti di ascolto.',
            '{title} di {author}',
            'Fonte originale verificata del film e della regia ↗',
            '📚🎧📰 Verifica e-book, audiolibri e riviste',
            'Scrivi una domanda o tocca il microfono per chiedere a MatchApp Ai.'
        ],
        tr:[
            '{title} ({year}) filminin yönetmeni {director}.',
            'Doğrulanmış özgün kaynak: {source}.',
            'Yapay zekâ sohbeti geçici olarak kullanılamıyor.',
            'Yapay zekâ sohbeti geçici olarak kullanılamıyor. Bu film bilgilerini bağımsız olarak doğrulayamadım. Lütfen daha sonra tekrar dene.',
            'Baskıları ve bulunabilirliği kontrol etmek için aşağıdaki resmî kitapçı ve yayınevi bağlantılarını kullan. Mağaza arama sonuçları tek başına bir baskıyı veya dinleme haklarını doğrulamaz.',
            'Aşağıdaki resmî Apple Books ve Audible aramalarını kontrol et, ardından satın almadan veya dinlemeden önce tam sesli kitap baskısını Match E-books Ai ile doğrula. Mağaza arama sonuçları tek başına bir baskıyı veya dinleme haklarını doğrulamaz.',
            '{title} — {author}',
            'Film ve yönetmen için doğrulanmış özgün kaynak ↗',
            '📚🎧📰 E-kitapları, sesli kitapları ve dergileri doğrula',
            'MatchApp Ai’ye sormak için bir soru yaz veya mikrofona dokun.'
        ],
        ru:[
            'Режиссёр фильма «{title}» ({year}) — {director}.',
            'Проверенный первоисточник: {source}.',
            'Чат с ИИ временно недоступен.',
            'Чат с ИИ временно недоступен. Не удалось независимо подтвердить эти сведения о фильме. Попробуйте позже.',
            'Проверьте издания и их доступность по официальным ссылкам книжных магазинов и издателей ниже. Результаты поиска в магазине сами по себе не подтверждают издание или права на прослушивание.',
            'Проверьте официальные результаты поиска Apple Books и Audible ниже, затем используйте Match E-books Ai, чтобы подтвердить точное издание аудиокниги перед покупкой или прослушиванием. Результаты поиска в магазине сами по себе не подтверждают издание или права на прослушивание.',
            '«{title}» — {author}',
            'Проверенный первоисточник о фильме и режиссёре ↗',
            '📚🎧📰 Проверить электронные книги, аудиокниги и журналы',
            'Введите вопрос или нажмите на микрофон, чтобы спросить MatchApp Ai.'
        ],
        ar:[
            'أخرج {director} فيلم {title} ({year}).',
            'المصدر الأصلي المتحقق منه: {source}.',
            'دردشة الذكاء الاصطناعي غير متاحة مؤقتًا.',
            'دردشة الذكاء الاصطناعي غير متاحة مؤقتًا. لم أتمكن من التحقق بشكل مستقل من معلومات الفيلم هذه. يُرجى المحاولة لاحقًا.',
            'استخدم روابط المكتبات والناشرين الرسمية أدناه للتحقق من الطبعات وتوفرها. نتائج البحث في المتجر لا تثبت وحدها وجود طبعة محددة أو حقوق الاستماع.',
            'راجع نتائج البحث الرسمية في Apple Books وAudible أدناه، ثم استخدم Match E-books Ai للتحقق من طبعة الكتاب الصوتي الدقيقة قبل الشراء أو الاستماع. نتائج البحث في المتجر لا تثبت وحدها وجود طبعة محددة أو حقوق الاستماع.',
            '{title}، تأليف {author}',
            'مصدر أصلي متحقق منه للفيلم ومخرجه ↗',
            '📚🎧📰 التحقق من الكتب الإلكترونية والصوتية والمجلات',
            'اكتب سؤالًا أو اضغط على الميكروفون لسؤال MatchApp Ai.'
        ],
        hi:[
            '{title} ({year}) का निर्देशन {director} ने किया था।',
            'सत्यापित मूल स्रोत: {source}।',
            'एआई चैट अभी अस्थायी रूप से उपलब्ध नहीं है।',
            'एआई चैट अभी अस्थायी रूप से उपलब्ध नहीं है। फ़िल्म से जुड़ी इन जानकारियों की स्वतंत्र पुष्टि नहीं हो सकी। कृपया बाद में फिर कोशिश करें।',
            'संस्करण और उपलब्धता जाँचने के लिए नीचे दिए गए आधिकारिक किताबों की दुकानों और प्रकाशकों के लिंक खोलें। दुकान के खोज परिणाम अपने आप किसी संस्करण या सुनने के अधिकार की पुष्टि नहीं करते।',
            'नीचे Apple Books और Audible की आधिकारिक खोज देखें, फिर खरीदने या सुनने से पहले ऑडियोबुक के सटीक संस्करण की पुष्टि के लिए Match E-books Ai का उपयोग करें। दुकान के खोज परिणाम अपने आप किसी संस्करण या सुनने के अधिकार की पुष्टि नहीं करते।',
            '{title} — लेखक: {author}',
            'फ़िल्म और निर्देशक का सत्यापित मूल स्रोत ↗',
            '📚🎧📰 ई-बुक, ऑडियोबुक और पत्रिकाओं की पुष्टि करें',
            'MatchApp Ai से पूछने के लिए सवाल लिखें या माइक्रोफ़ोन पर टैप करें।'
        ],
        id:[
            '{title} ({year}) disutradarai oleh {director}.',
            'Sumber asli terverifikasi: {source}.',
            'Obrolan AI sementara tidak tersedia.',
            'Obrolan AI sementara tidak tersedia. Informasi film tersebut tidak dapat saya verifikasi secara independen. Coba lagi nanti.',
            'Gunakan tautan resmi toko buku dan penerbit di bawah untuk memeriksa edisi dan ketersediaan. Hasil pencarian toko saja tidak memverifikasi suatu edisi atau hak mendengarkan.',
            'Periksa pencarian resmi Apple Books dan Audible di bawah, lalu gunakan Match E-books Ai untuk memverifikasi edisi buku audio yang tepat sebelum membeli atau mendengarkan. Hasil pencarian toko saja tidak memverifikasi suatu edisi atau hak mendengarkan.',
            '{title} karya {author}',
            'Sumber asli terverifikasi untuk film dan sutradara ↗',
            '📚🎧📰 Verifikasi e-book, buku audio, dan majalah',
            'Ketik pertanyaan atau ketuk mikrofon untuk bertanya kepada MatchApp Ai.'
        ],
        ja:[
            '『{title}』（{year}年）の監督は{director}です。',
            '確認済みの一次情報源：{source}。',
            'AIチャットは一時的に利用できません。',
            'AIチャットは一時的に利用できません。これらの映画情報を独立した情報源で確認できませんでした。後でもう一度お試しください。',
            '版や提供状況は、下記の書店・出版社の公式リンクで確認してください。ストアの検索結果だけでは、特定の版や聴取の権利は確認できません。',
            '下記のApple BooksとAudibleの公式検索を確認し、購入・聴取前にMatch E-books Aiでオーディオブックの正確な版を確認してください。ストアの検索結果だけでは、特定の版や聴取の権利は確認できません。',
            '『{title}』 著者：{author}',
            '映画と監督の確認済み一次情報源 ↗',
            '📚🎧📰 電子書籍・オーディオブック・雑誌を確認',
            '質問を入力するか、マイクをタップしてMatchApp Aiに質問してください。'
        ],
        ko:[
            '{title}({year})의 감독은 {director}입니다.',
            '검증된 원본 출처: {source}.',
            'AI 채팅을 일시적으로 사용할 수 없습니다.',
            'AI 채팅을 일시적으로 사용할 수 없습니다. 해당 영화 정보를 독립적으로 확인하지 못했습니다. 나중에 다시 시도해 주세요.',
            '아래 공식 서점 및 출판사 링크에서 판본과 이용 가능 여부를 확인하세요. 스토어 검색 결과만으로는 특정 판본이나 청취 권한을 확인할 수 없습니다.',
            '아래 Apple Books와 Audible의 공식 검색을 확인한 뒤, 구매하거나 듣기 전에 Match E-books Ai로 정확한 오디오북 판본을 확인하세요. 스토어 검색 결과만으로는 특정 판본이나 청취 권한을 확인할 수 없습니다.',
            '{title} — 저자: {author}',
            '영화와 감독에 대한 검증된 원본 출처 ↗',
            '📚🎧📰 전자책, 오디오북, 잡지 확인',
            '질문을 입력하거나 마이크를 눌러 MatchApp Ai에 질문하세요.'
        ],
        zh:[
            '《{title}》（{year}年）的导演是{director}。',
            '已核实的原始来源：{source}。',
            'AI聊天暂时不可用。',
            'AI聊天暂时不可用，且无法独立核实这些电影信息。请稍后重试。',
            '请使用下方书店和出版社的官方链接核查版本及可用性。商店搜索结果本身并不能确认特定版本或收听权利。',
            '请查看下方Apple Books和Audible的官方搜索，再使用Match E-books Ai核实有声书的确切版本，然后再购买或收听。商店搜索结果本身并不能确认特定版本或收听权利。',
            '《{title}》— 作者：{author}',
            '已核实的电影及导演原始来源 ↗',
            '📚🎧📰 核查电子书、有声书和杂志',
            '请输入问题，或点击麦克风向MatchApp Ai提问。'
        ]
    };
    const language=String(window.MATCH_LANG||'en').toLowerCase().split(/[-_]/)[0];
    return String((rows[language]||rows.en)[keys.indexOf(key)]||'').replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));
}

/* ---------- Independent factual source for AI outages ---------- */
// A factual film question must NEVER fall through to an unrelated movie card.
// Use the existing exact-identity TMDB lookup and separately verified credits;
// no generated director, release date or guessed streaming link is accepted.
function isFactualMediaQuestion(question) {
    const q=mediaIntentQuestion(question);
    return /\b(?:who\s+directed|director\s+(?:of|for)|name\s+the\s+director|release\s+(?:date|year)|what\s+year\s+was\s+.+released|when\s+was\s+.+released)\b/i.test(q) &&
        !/\b(?:recommend|suggest|what\s+should\s+i\s+watch)\b/i.test(q);
}
function requestedMovieTitle(question) {
    const quoted=String(question).match(/[“"']([^“"']{2,85})[”"']/);
    if(quoted)return quoted[1].trim();
    // Give priority to titles already present in our reviewed shelf.
    if(typeof CONTENT_CATALOG!=='undefined' && Array.isArray(CONTENT_CATALOG)) {
        const q=' '+String(question).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')+' ';
        const found=CONTENT_CATALOG.filter(x=>x&&typeof x.title==='string'&&
            Array.isArray(x.cats)&&x.cats.some(c=>/movie|film|anime/i.test(c)) &&
            q.includes(' '+x.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')+' '))
            .sort((a,b)=>b.title.length-a.title.length)[0];
        if(found)return found.title;
    }
    // Common fact syntax: "director and release year of Spirited Away".
    const named=String(question).match(/\b(?:film|movie|series|of|for|about|called|named)\s+([A-Z][\p{L}\p{N}'-]+(?:\s+[A-Z][\p{L}\p{N}'-]+){1,5})/u);
    return named?named[1].trim():'';
}
// Original publisher credits are a deterministic backup for EXACT film
// identities when TMDB is unreachable. Extend ONLY with original-source
// confirmed works, never with guessed film facts or fuzzy title matches.
// Studio Ghibli primary source: https://www.ghibli.jp/works/chihiro/
// The studio explicitly credits director Hayao Miyazaki and release 2001.
const EDITORIAL_FILM_CREDITS=Object.freeze([
    Object.freeze({title:'Spirited Away',year:'2001',director:'Hayao Miyazaki',
      source:'https://www.ghibli.jp/works/chihiro/',publisher:'Studio Ghibli'})
]);
async function sourceVerifiedFilmFacts(question) {
    if(!isFactualMediaQuestion(question))return null;
    const requested=requestedMovieTitle(question);
    if(!requested)return null;
    const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const year=String(question).match(/\b(?:19|20)\d{2}\b/)?.[0]||'';
    const publisher=EDITORIAL_FILM_CREDITS.find(x=>norm(x.title)===norm(requested) && (!year||x.year===year));
    if(publisher) {
        const answer=[discoverRecoveryText('directed',publisher),discoverRecoveryText('source',{source:publisher.publisher}),discoverRecoveryText('unavailable')].join(' ');
        return {answer,results:[],_live:false,verifiedSource:publisher.source};
    }
    if(typeof window.tmdbLookup!=='function'||typeof window.tmdbRelated!=='function')return null;
    try {
        const movie=await window.tmdbLookup(requested,{kind:'movie',cats:['movie'],year,priority:true});
        if(!movie || movie.kind!=='movie' || movie.adult===true ||
            !Number.isSafeInteger(movie.tmdbId) || movie.tmdbId<=0)return null;
        if(![movie.title,movie.originalTitle].some(t=>norm(t)===norm(requested)))return null;
        if(year && String(movie.year)!==year)return null;
        const info=await window.tmdbRelated(movie.tmdbId,'movie');
        const director=String(info?.director?.name||'').trim();
        if(!director || !/^\d{4}$/.test(String(movie.year||'')))return null;
        const answer=[discoverRecoveryText('directed',{title:movie.title,year:movie.year,director}),discoverRecoveryText('source',{source:'The Movie Database (TMDB)'}),discoverRecoveryText('unavailable')].join(' ');
        return {answer,results:[],_live:false,verifiedSource:'https://www.themoviedb.org/movie/'+movie.tmdbId};
    }catch(_){return null;}
}

/* ---------- Keyless fallback (intent-aware — the actual bug fix) ---------- */
function stripQuestionWords(q) {
    return q.replace(/^(is|are|was|were|does|do|did|can|could|what|which|who|where|when|why|how|show me|find me|any|there)\b/gi, ' ')
            .replace(/\b(a|an|the|about|on|for|with|tv|show|shows|series|movie|movies|film|films|please|me)\b/gi, ' ')
            .replace(/[?!.,]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
}

async function fallbackSearch(question, aiWasDown, landingContext) {
    // Keyword search cannot establish an editorial mood, title similarity or
    // regional provider availability. The scoped catalogue recovery below may
    // still use the exact landing tags, through the existing safety policy.
    if (landingContext) return {answer: discoverRecoveryText('unavailable'), results: [], _live: false};
    if (detectBookIntent(question)) {
        // Use a bibliographically identified book, never an invented audio edition.
        // The real Bookworms source cards provide official Apple/Audible searches,
        // and the dedicated matcher independently checks an EXACT audio edition.
        const listed=window.MatchAppReadingAI?.selectBooks?.(question,{allowKnown:!discoverRecommendationRequest(question)})||[];
        const norm=x=>String(x||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
        const q=norm(question);
        const named=listed.find(x=>x?.title&&q.includes(norm(x.title))&&norm(x.title).length>4);
        const identity=named?discoverRecoveryText('author',named):'';
        const audiobook=window.MatchAppReadingAI?.intent?.(question)==='audiobook';
        const answer=(identity?identity+'. ':'')+discoverRecoveryText('unavailable')+' '+discoverRecoveryText(audiobook?'audio':'books');
        return {answer,results:[],_live:false};
    }
    if(isFactualMediaQuestion(question)) {
        const source=await sourceVerifiedFilmFacts(question);
        if(source)return source;
        const answer=discoverRecoveryText('factsUnavailable');
        return {answer,results:[],_live:false};
    }
    const audioIntent = detectAudioIntent(question);
    const podcastIntent = /\b(podcast|podcasts|radio show)\b/i.test(question);
    const musicIntent = audioIntent && !podcastIntent;
    const trendIntent = /\b(top|trend|trending|popular|hits?|charts?|new music)\b/i.test(question);
    const term = musicIntent && trendIntent ? 'top hits 2026' : (stripQuestionWords(question) || question);
    // Only the media types that actually match intent are searched — this is
    // the fix for the "only podcasts" bug. A question about a movie will
    // never touch the podcast catalog at all now.
    const mediaTypes = podcastIntent ? ['podcast'] : (musicIntent ? ['musicTrack'] : ['movie', 'tvShow']);

    const out = [];
    for (const media of mediaTypes) {
        try {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=${media}&limit=8`);
            if (!res.ok) continue;
            const data = await res.json();
            (data.results || []).forEach(r => {
                const title = r.trackName || r.collectionName;
                if (!title || out.some(o => o.title === title)) return;
                const genre = String(r.primaryGenreName || '');
                const row = {
                    title,
                    year: r.releaseDate ? String(r.releaseDate).substring(0, 4) : '',
                    type: media === 'tvShow' ? 'series' : (media === 'podcast' ? 'podcast' : (media === 'musicTrack' ? 'music' : 'movie')),
                    platform: 'any',
                    synopsis: r.longDescription || r.shortDescription || `${genre}${r.artistName ? ' — ' + r.artistName : ''}`.trim(),
                    _meta: {
                        artwork: (r.artworkUrl100 || '').replace('100x100bb', '600x900bb'),
                        preview: r.previewUrl || null,
                        storeUrl: r.trackViewUrl || r.collectionViewUrl || null
                    }
                };
                if (window.matchPolicy && !window.matchPolicy.fitsQuestion(row, question)) return;
                out.push(row);
            });
        } catch (e) { /* try next media type */ }
    }

    const offlineNote = (typeof t === 'function') ? t('discover.offlineNote') : "Our AI concierge is temporarily offline, so here's what our catalog found for you:";
    const noResults = (typeof t === 'function') ? t('discover.noResults') : `We couldn't find a confident match for "${question}". Try rephrasing with a title, topic or person.`;
    // When the AI itself was unreachable, saying "try rephrasing" blames the
    // user for a question that was probably fine, and sends them off rewording
    // it repeatedly to no effect. Say what actually happened instead.
    const aiDown = (typeof t === 'function') ? t('discover.aiDown')
        : "Our AI concierge couldn't be reached just now — this is on our side, not your question. Please try again in a moment.";

    const emptyMessage = aiWasDown ? aiDown : noResults;

    return {
        answer: out.length ? `${offlineNote} “${question}”` : emptyMessage,
        results: out.slice(0, DISCOVER_MAX),
        _live: false
    };
}

function catalogFallbackForQuestion(question, landingContext) {
    if (detectBookIntent(question)) return []; // Film catalogue is not the Books catalogue.
    if (typeof CONTENT_CATALOG === 'undefined' || !Array.isArray(CONTENT_CATALOG)) return [];
    const policy = window.matchPolicy;
    return CONTENT_CATALOG
        .filter(e => {
            if (!e || !e.title || isDiscoverDisliked(e, true)) return false;
            if (typeof window.tasteAllowsEntry === 'function' && !window.tasteAllowsEntry(e)) return false;
            if (landingContext && !window.MatchAppLandingIntent?.allowsFallback?.(landingContext, e)) return false;
            return !policy || policy.fitsQuestion(e, question);
        })
        .slice(0, DISCOVER_MAX)
        .map(e => ({
            title: e.title,
            year: e.year || '',
            type: (e.cats && e.cats[0]) || '',
            platform: e.platform || '',
            synopsis: e.synopsis || '',
            cats: e.cats,
            moods: e.moods,
            watchUrl: e.watchUrl || ''
        }));
}

/* ---------- Typewriter reveal ---------- */
// Makes the answer feel spoken/written by a person rather than dumped on
// screen — mirrors how the loading meter narration already behaves.
function typewriterReveal(el, text, speedMs) {
    return new Promise(resolve => {
        el.textContent = '';
        el.style.display = 'block';
        let i = 0;
        const step = () => {
            if (i <= text.length) {
                el.textContent = text.slice(0, i);
                i += Math.max(1, Math.round(text.length / 90)); // scales with length, feels natural either way
                setTimeout(step, speedMs);
            } else {
                el.textContent = text;
                resolve();
            }
        };
        step();
    });
}

/* ---------- Text-to-speech ("read aloud") ---------- */
// Fully client-side via the Web Speech API — no backend needed. Voice and
// speed come from the user's Profile > Voice & AI settings (localStorage),
// with a sensible default matched to the current UI language.
const TTS_LANG_MAP = {
    'en': 'en-US', 'pt-BR': 'pt-BR', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
    'it': 'it-IT', 'tr': 'tr-TR', 'ru': 'ru-RU', 'ar': 'ar-SA', 'hi': 'hi-IN',
    'id': 'id-ID', 'ja': 'ja-JP', 'ko': 'ko-KR', 'zh': 'zh-CN'
};

function ttsTargetLang(lang) {
    return TTS_LANG_MAP[lang] || lang || 'en-US';
}
function voiceMatchesLang(voice, lang) {
    if (!voice || !voice.lang) return false;
    const target = ttsTargetLang(lang).toLowerCase();
    const base = target.split('-')[0];
    const actual = voice.lang.toLowerCase();
    return actual === target || actual.startsWith(target + '-') || actual.split('-')[0] === base;
}
function pickVoiceForLang(voices, lang) {
    const saved = localStorage.getItem('match_voice_name');
    if (saved) {
        const exact = voices.find(v => v.name === saved && voiceMatchesLang(v, lang));
        if (exact) return exact;
    }
    const target = ttsTargetLang(lang).toLowerCase();
    const base = target.split('-')[0];
    return voices.find(v => v.lang && v.lang.toLowerCase() === target)
        || voices.find(v => v.lang && v.lang.toLowerCase().startsWith(target + '-'))
        || voices.find(v => v.lang && v.lang.toLowerCase().split('-')[0] === base)
        || null;
}

window.readAloud = function(text, btn) {
    // Only the approved Jonas provider voices may play here.
    // This also animates his face during manually requested read-aloud.
    if(window.MatchAppJonasStage?.speak) {
        if(btn?.classList.contains('speaking')) {
            window.MatchAppJonasStage.stop();
            btn.classList.remove('speaking');
            return;
        }
        document.querySelectorAll('.discover-speak.speaking').forEach(b=>b.classList.remove('speaking'));
        if(btn)btn.classList.add('speaking');
        const narration=window.MatchAppJonasNarration;
        const transcript=narration?.prepare?.(btn?.closest('.chat-answer-row')?.querySelector('.chat-answer-text'),text);
        window.MatchAppJonasStage.speak(text,{
            autoListen:false,
            onProgress:p=>narration?.advance?.(p,transcript),
            onComplete:()=>narration?.finish?.(transcript)
        }).finally(()=>{narration?.finish?.(transcript);btn?.classList.remove('speaking')});
        return;
    }
    const service=window.MatchAppJonasSpeech;
    if(!service?.speak)return;
    if(btn?.classList.contains('speaking')){service.stop();btn.classList.remove('speaking');return;}
    service.unlock?.();
    document.querySelectorAll('.discover-speak.speaking').forEach(b=>b.classList.remove('speaking'));
    service.speak(String(text||'').slice(0,650),window.MatchAppJonasLocale?.speech?.()||window.MATCH_LANG||'en',{
      onStart:()=>btn?.classList.add('speaking'),
      onEnd:()=>btn?.classList.remove('speaking'),
      onError:()=>btn?.classList.remove('speaking')
    }).catch(()=>btn?.classList.remove('speaking'));
};

/* ---------- Rendering ---------- */
function escapeDiscoverHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function discoverLabel(key, fallback) {
    return (typeof t === 'function' && t(key)) || fallback;
}

function justWatchLocale() {
    if (window.MatchAppCatalogMedia?.regionCode) return window.MatchAppCatalogMedia.regionCode().toLowerCase();
    let country = '';
    try { country = (localStorage.getItem('match_user_country') || '').trim(); } catch (_) {}
    return /^[A-Za-z]{2}$/.test(country) ? country.toLowerCase() : '';
}

function discoverWatchUrl(item) {
    const title = (item && (item.title || item.displayTitle)) || '';
    // The dedicated matcher performs exact bookstore/audio edition checks.
    // Model-invented retailer or audiobook links must never become "buy now".
    if (/\b(book|ebook|e-book|audiobook|novel|magazine)\b/i.test(String(item?.type || '')))
        return '/#ebook-matcher-root';
    const isAudio = /podcast|album|music|audiobook/i.test((item && item.type) || '');
    // Verification failures and unverified AI platform hints must NEVER send
    // users to a guessed streaming service, including stale catalogue links.
    // A country-specific title search is accurate without claiming availability.
    if (item?._availabilityVerified === false && !isAudio) {
        const region = justWatchLocale();
        return region ? `https://www.justwatch.com/${region}/search?q=${encodeURIComponent(title)}` : 'https://www.justwatch.com/';
    }
    if (item && item._viewing && item._viewing.href) return item._viewing.href;
    if (item && item.watchUrl) return item.watchUrl;
    if (typeof platformSearchUrl === 'function' && item && item.platform && item.platform !== 'any' &&
        typeof PLATFORMS !== 'undefined' && PLATFORMS[item.platform]) {
        const url = platformSearchUrl(item.platform, title);
        if (url && !/justwatch\.com\/us\//i.test(url)) return url;
    }
    try {
        if (typeof CONTENT_CATALOG !== 'undefined') {
            const e = CONTENT_CATALOG.find(x => x.title === item.title);
            if (e && e.platform && e.platform !== 'any' && typeof platformSearchUrl === 'function') {
                const url = platformSearchUrl(e.platform, e.title);
                if (url && !/justwatch\.com\/us\//i.test(url)) return url;
            }
        }
    } catch (err) {}
    if (/audiobook/i.test((item && item.type) || '')) return '/#ebook-matcher-root';
    if (isAudio) return `https://open.spotify.com/search/${encodeURIComponent(title)}`;
    const region = justWatchLocale();
    return region ? `https://www.justwatch.com/${region}/search?q=${encodeURIComponent(title)}` : 'https://www.justwatch.com/';
}

// Hard exclusions for titles MatchApp knows (blocked categories and blocked
// origin countries) apply to Ask AI suggestions exactly as they do to Matches.
var discoverCatalogIndex = null, discoverCatalogSize = -1;
function discoverCatalogEntry(title) {
    if (typeof CONTENT_CATALOG === 'undefined' || !Array.isArray(CONTENT_CATALOG)) return null;
    if (!discoverCatalogIndex || discoverCatalogSize !== CONTENT_CATALOG.length) {
        discoverCatalogIndex = new Map();
        CONTENT_CATALOG.forEach(e => { if (e && e.title) discoverCatalogIndex.set(String(e.title).toLowerCase(), e); });
        discoverCatalogSize = CONTENT_CATALOG.length;
    }
    return discoverCatalogIndex.get(String(title).toLowerCase()) || null;
}

function isDiscoverDisliked(value, fresh = false) {
    const item = typeof value === 'string' ? { title: value } : value;
    const title = item?.title;
    if (!title) return false;
    const policy = window.matchPolicy;
    if (policy?.excludes?.(item, { hardOnly: !fresh })) return true;
    try {
        const normalise = policy?.key || titleKey;
        for (const name of ['match_dislikedList', 'match_savedList']) {
            const list = JSON.parse(localStorage.getItem(name) || '[]');
            if (Array.isArray(list) && list.some(i => normalise(i?.title || i) === normalise(title))) return true;
        }
        if (fresh && !policy?.excludes && policy?.known?.().has(normalise(title))) return true;
    } catch (e) {}
    try {
        if ((window.MATCH_TASTE?.exclude || []).some(x => String(x).toLowerCase() === String(title).toLowerCase())) return true;
    } catch (e) {}
    try {
        const entry = discoverCatalogEntry(title);
        if (entry) {
            if (typeof window.isBlockedEntry === 'function' && window.isBlockedEntry(entry)) return true;
            if (typeof entryPassesPreferenceExclusions === 'function' && !entryPassesPreferenceExclusions(entry)) return true;
        }
    } catch (e) {}
    return false;
}

function enrichDiscoverItem(item, question) {
    if (!item || !item.title) return null;
    if (item._musicVideoId || /music|song|album|single/i.test(item.type || '')) return item;
    const policy = window.matchPolicy;
    const policyItem = item._catalogMedia && Array.isArray(item._catalogMedia.genres)
        ? {...item, type:[item.type || '', ...item._catalogMedia.genres].join(' ')} : item;
    if (policy && question && !policy.fitsQuestion(policyItem, question)) return null;
    try {
        if (typeof CONTENT_CATALOG !== 'undefined') {
            const k = policy ? policy.key(item.title) : String(item.title).toLowerCase();
            const e = CONTENT_CATALOG.find(x => x && (policy ? policy.key(x.title) === k : x.title === item.title));
            if (e) {
                item.title = e.title;
                if (!item.synopsis) item.synopsis = e.synopsis;
                if (!item.platform || item.platform === 'any') item.platform = e.platform;
                if (!item.year) item.year = e.year || '';
                if (!item.type) item.type = (e.cats && e.cats[0]) || item.type || '';
                item.cats = e.cats;
                item.moods = e.moods;
                if (e.watchUrl) item.watchUrl = item.watchUrl || e.watchUrl;
            }
        }
    } catch (err) {}
    return item;
}

async function enrichDiscoverMedia(item) {
    if (!item || !item.title) return item;
    // AI-provided platform labels are unverified hints. An unavailable source,
    // network failure, or audio request must never turn one into a claimed
    // country-specific streaming service or a wrong-title deep link.
    const unverified = () => {
        if (item.platform && item.platform !== 'any') item._aiPlatformHint = item.platform;
        item.platform = '';
        item._availabilityVerified = false;
        item._viewing = null;
        return item;
    };
    const isAudio = /podcast|music|album|audiobook|song/i.test(String(item.type || ''));
    const isBook = /\b(book|ebook|e-book|audiobook|novel)\b/i.test(String(item.type || ''));
    // Audiobooks use the separate verified book matching flow, not TMDB film
    // provider metadata. The card's generic audio destination is a search,
    // never a promise that a particular narrator/edition is available.
    if (isAudio || isBook) { delete item._catalogMedia; delete item._tmdb; }
    if (isAudio || isBook || !window.MatchAppCatalogMedia?.lookup) return unverified();
    // An exact, source-verified documentary carries its requested streaming
    // region. Do not replace that country with the site's generic locale or
    // perform a fuzzy second title lookup after the TMDB ID was pinned.
    const docRegion = String(item._verifiedDocRegion || '').toUpperCase();
    const pinnedDoc = item._catalogMedia;
    const docStreams = pinnedDoc?.availability?.[docRegion]?.stream;
    if (/^[A-Z]{2}$/.test(docRegion) && pinnedDoc?.media_kind === 'tv' &&
        Number.isSafeInteger(Number(pinnedDoc.tmdb_id)) &&
        Array.isArray(pinnedDoc.genres) &&
        pinnedDoc.genres.some(g => String(g).toLowerCase().trim() === 'documentary') &&
        Array.isArray(docStreams) && docStreams.length) {
        if (pinnedDoc.year) item.year = pinnedDoc.year;
        if (pinnedDoc.overview) { item.synopsis = pinnedDoc.overview; item.synopsisLang = 'en'; }
        item.realGenres = pinnedDoc.genres.slice(0, 8);
        item._viewing = window.MatchAppCatalogMedia.viewingTarget?.(pinnedDoc, item.title, docRegion) || null;
        item._availabilityVerified = item._viewing?.mode === 'stream' && !!item._viewing.href;
        item.platform = item._availabilityVerified ? item._viewing.provider : '';
        return item;
    }
    try {
        const sourceYear = String(item.year || '').match(/^\d{4}/)?.[0] || '';
        const rawType = String(item.type || '').toLowerCase();
        const kind = /movie|film/.test(rawType) ? 'movie' : (/series|tv|show|drama|anime|novela|documentary/.test(rawType) ? 'tv' : '');
        let meta = await window.MatchAppCatalogMedia.lookup(item.title, {
            year: sourceYear,
            kind: kind || ''
        });
        if (meta && window.MatchAppCatalogMedia.refreshExact) {
            meta = await window.MatchAppCatalogMedia.refreshExact(meta);
        }
        if (!meta && window.MatchAppCatalogMedia.lookupLive) {
            meta = await window.MatchAppCatalogMedia.lookupLive(item.title, {
                year: sourceYear,
                kind: kind || '',
                cats: item.cats || []
            });
        }
        if (!meta) return unverified();
        item._catalogMedia = meta;
        // Exact identity is not proof of regional provider availability.
        item._availabilityVerified = false;
        if (meta.year) item.year = meta.year;
        if (meta.overview) { item.synopsis = meta.overview; item.synopsisLang='en'; }
        if (Array.isArray(meta.genres) && meta.genres.length) item.realGenres = meta.genres.slice(0, 8);
        if (Array.isArray(meta.genres) && meta.genres.length) item.cats = [...new Set([...(item.cats || []), ...meta.genres])];
        if (!item.type || item.type === 'any') item.type = meta.media_kind === 'tv' ? 'series' : (meta.media_kind || item.type);
        item._viewing = window.MatchAppCatalogMedia.viewingTarget?.(meta, item.title) || null;
        const verifiedModes=new Set(['stream','rent','buy','cinema']);
        item._availabilityVerified=Boolean(item._viewing && verifiedModes.has(item._viewing.mode));
        // The model's platform is only a hint. Never present it as verified.
        item.platform=item._viewing?.provider&&item._availabilityVerified?item._viewing.provider:'';
    } catch (_) { return unverified(); }
    return item;
}

function itemFromTitle(name) {
    const wanted = titleKey(name);
    if (!wanted) return { title: String(name || '').trim(), year: '', type: '', platform: '', synopsis: '' };
    let entry = null;
    try {
        if (typeof CONTENT_CATALOG !== 'undefined' && Array.isArray(CONTENT_CATALOG)) {
            entry = CONTENT_CATALOG.find(e => e && titleKey(e.title) === wanted) || null;
        }
    } catch (err) { entry = null; }
    if (!entry) return { title: String(name || '').trim(), year: '', type: '', platform: '', synopsis: '' };
    return {
        title: entry.title,
        year: entry.year || '',
        type: (entry.cats && entry.cats[0]) || '',
        platform: entry.platform || '',
        synopsis: entry.synopsis || '',
        cats: entry.cats,
        moods: entry.moods,
        watchUrl: entry.watchUrl || '',
        _fromCatalog: true
    };
}

function discoverIsEpisodic(item) {
    const blob = [item && item.type].concat((item && item.cats) || []).join(' ').toLowerCase();
    if (/\b(movie|film|short film)\b/.test(blob) && !/\bseries\b/.test(blob)) return false;
    return true;
}

function discoverWhereLabel(item) {
    if (item?._viewing?.mode === 'cinema') return discoverLabel('discover.inCinemas', 'In cinemas');
    const p = item && item.platform && item.platform !== 'any' ? String(item.platform) : '';
    return p;
}

function discoverStartLabel(item) {
    const year = parseInt(item && item.year, 10);
    if (!year) return '';
    const nowY = new Date().getFullYear();
    if (item?._viewing?.mode === 'cinema') return discoverLabel('discover.inCinemas', 'In cinemas');
    if (year > nowY) return discoverLabel('discover.startsIn', 'Starts {year}').replace('{year}', String(year));
    if (year === nowY && item?._viewing?.mode === 'stream') return discoverLabel('discover.nowStreaming', 'Now streaming');
    if (year === nowY) return discoverLabel('discover.premiered', 'Premiered {year}').replace('{year}', String(year));
    if (discoverIsEpisodic(item)) return discoverLabel('discover.sinceYear', 'Since {year}').replace('{year}', String(year));
    return discoverLabel('discover.premiered', 'Premiered {year}').replace('{year}', String(year));
}

function discoverFactsHTML(item) {
    const where = discoverWhereLabel(item);
    const when = discoverStartLabel(item);
    if (!where && !when) return '';
    const rows = [];
    if (where) {
        rows.push(`<div class="discover-fact"><span class="discover-fact-k">${escapeDiscoverHtml(discoverLabel('discover.whereToWatch', 'Where to watch'))}</span> <span class="discover-where">${escapeDiscoverHtml(where)}</span></div>`);
    }
    if (when) {
        rows.push(`<div class="discover-fact"><span class="discover-fact-k">${escapeDiscoverHtml(discoverLabel('discover.whenItStarts', 'When it starts'))}</span> <span class="discover-when">${escapeDiscoverHtml(when)}</span></div>`);
    }
    return `<div class="discover-facts">${rows.join('')}</div>`;
}

function paintDiscoverFacts(item, idx) {
    const card = document.querySelector(`[data-discover-idx="${idx}"]`);
    if (!card) return;
    const html = discoverFactsHTML(item);
    let facts = card.querySelector('.discover-facts');
    if (!html) {
        if (facts) facts.remove();
        return;
    }
    if (facts) {
        facts.outerHTML = html;
        return;
    }
    const syn = card.querySelector('.discover-synopsis');
    const metaEl = card.querySelector('.discover-meta');
    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    const node = wrap.firstElementChild;
    if (!node) return;
    if (syn) syn.parentNode.insertBefore(node, syn);
    else if (metaEl) metaEl.after(node);
    else {
        const body = card.querySelector('.discover-body');
        if (body) body.appendChild(node);
    }
}

let lastDiscoverQuestion = '';

function catalogCousins(item, take) {
    take = take || 4;
    if (typeof CONTENT_CATALOG === 'undefined' || !Array.isArray(CONTENT_CATALOG) || !item || !item.title) return [];
    let self = null;
    try { self = CONTENT_CATALOG.find(e => e.title === item.title) || null; } catch (e) { self = null; }
    const cats = new Set([].concat(self?.cats || [], item.type ? [item.type] : []));
    const moods = new Set(self?.moods || []);
    const cast = new Set(self?.cast || []);
    const platform = self?.platform || item.platform;
    const FORMAT_CATS = new Set(['movie','series','limited series','short film','YouTube channel','YouTube Shorts','podcast']);
    return CONTENT_CATALOG
        .filter(e => e && e.title && e.title !== item.title && !isDiscoverDisliked(e, true))
        .filter(e => !window.matchPolicy || window.matchPolicy.sameFamily(self || item, e))
        .map(e => {
            let s = 0;
            (e.cast || []).forEach(c => { if (cast.has(c)) s += 40; });
            (e.cats || []).forEach(c => { if (cats.has(c)) s += FORMAT_CATS.has(c) ? 4 : 20; });
            (e.moods || []).forEach(m => { if (moods.has(m)) s += 16; });
            if (platform && e.platform === platform) s += 4;
            if (self?.year && e.year && Math.abs(Number(e.year) - Number(self.year)) <= 5) s += 3;
            return { e, s };
        })
        .filter(x => x.s >= 16)
        .sort((a, b) => b.s - a.s)
        .slice(0, take)
        .map(({ e }) => ({
            title: e.title,
            year: e.year || '',
            type: (e.cats && e.cats[0]) || item.type || '',
            platform: e.platform || '',
            synopsis: e.synopsis || '',
            synopsisLang: 'en',
            why: 'idea',
            _fromCatalog: true
        }));
}

/* Artwork is presentation-only; recommendation identity stays unchanged. */
function discoverPosterUrl(item) {
    let pinned='';
    try{pinned=typeof getVerifiedPoster==='function'?getVerifiedPoster(item.title)||'':'';}catch(_){}
    const cm=item._catalogMedia||{};
    const exactCatalog=Number(cm.tmdb_id)>0&&['movie','tv'].includes(cm.media_kind);
    const exactLive=Number(item._meta?.tmdbId||item._tmdb?.tmdbId)>0&&
        ['movie','tv'].includes(item._meta?.kind||item._tmdb?.kind);
    // A title-only registry entry can name a different remake or TV adaptation.
    // Artwork carried by this exact numeric source identity takes precedence.
    const sources=exactCatalog
        ?[cm.poster_large_url,cm.poster_url,cm.poster_original_url]
        :exactLive?[item._meta?.artwork,item._tmdb?.posterLarge,item._tmdb?.poster]
        :[pinned,item._meta?.artwork,cm.poster_large_url,cm.poster_url,cm.poster_original_url,item._resolved?.artwork];
    return sources
      .find(url=>/^https:\/\/(?:image\.tmdb\.org|is\d+-ssl\.mzstatic\.com)\//i.test(String(url||'')))||'';
}
function setDiscoverPoster(img,item,url,fallback) {
    if(!img||!url)return;
    const previous=img.__matchappDiscoverPoster;
    if(previous?.item===item&&previous.url===url&&!previous.exhausted)return;
    previous?.cancel?.();
    const variants=window.MatchAppCatalogMedia?.posterVariants?.(url)||[];
    const candidates=[...new Set(variants.length?variants:[url])];
    const state={item,url,loadedUrl:'',exhausted:false,cancel:null};
    img.__matchappDiscoverPoster=state;
    item._posterExhausted=false;
    let index=0,timer=null,probe=null;
    const started=Date.now();
    const active=()=>img.isConnected&&img.__matchappDiscoverPoster===state;
    const cleanup=()=>{
        if(timer!==null)clearTimeout(timer);
        timer=null;
        if(probe){probe.onload=null;probe.onerror=null;probe=null;}
    };
    state.cancel=cleanup;
    const rememberArtwork=artwork=>{item._resolved={...(item._resolved||{}),artwork};};
    const useFallback=()=>{
        cleanup();
        if(!active())return;
        state.exhausted=true;
        item._posterExhausted=true;
        img.onerror=null;
        if(fallback)img.src=fallback;
        rememberArtwork(fallback||'');
    };
    const next=()=>{
        cleanup();
        if(!active())return;
        if(index>=candidates.length||Date.now()-started>=12000){useFallback();return;}
        const candidate=candidates[index++];
        probe=new Image();
        const pending=probe;
        timer=setTimeout(()=>{
            if(probe===pending)next();
        },Math.min(3000,12000-(Date.now()-started)));
        pending.onload=()=>{
            if(!active()||probe!==pending){cleanup();return;}
            if(!pending.naturalWidth){next();return;}
            cleanup();
            state.loadedUrl=candidate;
            img.src=candidate;
            rememberArtwork(candidate);
        };
        pending.onerror=()=>{if(probe===pending)next();};
        pending.src=candidate;
    };
    const current=img.currentSrc||img.src||'';
    img.onerror=()=>{
        if(!active())return;
        state.loadedUrl='';
        if(fallback&&img.src!==fallback)img.src=fallback;
        next();
    };
    if(img.complete&&img.naturalWidth>0&&candidates.includes(current)){
        state.loadedUrl=current;
        index=candidates.indexOf(current)+1;
        rememberArtwork(current);
        return;
    }
    // Keep a usable title-labelled cover visible while a bounded probe decodes
    // the real original. Stalled mobile CDN requests must not leave blank art.
    if(fallback)img.src=fallback;
    rememberArtwork(fallback||'');
    next();
}
let discoverComposerNode=null;
function parkDiscoverComposer() {
    const row=discoverComposerNode||document.querySelector('.newsearch-row');
    const log=document.getElementById('chat-log');
    if(row&&log){discoverComposerNode=row;log.insertAdjacentElement('afterend',row);}
}
function placeDiscoverComposer(wrap,grid) {
    // Preserve one composer below the conversation, not inside each reply.
    parkDiscoverComposer();
}
function revealJonasTurn(node) {
    const log=document.getElementById('chat-log');
    if(!log || !node || !log.contains(node)) return;
    const answer=node.querySelector?.('.chat-answer-text');
    if(!answer && keepConversationAtStart()) return;
    const top=(answer||node).getBoundingClientRect().top-log.getBoundingClientRect().top+log.scrollTop-12;
    log.scrollTop=Math.max(0,top);
}

function shareDiscoverItem(idx) {
    // UI shortcut to the existing verified share/reward implementation.
    // Neither copying a link nor opening a share sheet grants credit.
    const card = document.querySelector('[data-discover-idx="' + idx + '"]');
    const bubble = card?.closest('.chat-assistant');
    const reward = bubble?.querySelector('.ma-guest-trial-button');
    if (reward && !reward.hidden && reward.dataset.offer === 'share') {
        reward.click();
        return;
    }
    const title = card?.querySelector('h3')?.textContent?.trim() || 'MatchApp Ai';
    const message = title + ' · MatchApp Ai';
    const url = 'https://matchapp.tv/discover.html';
    if (navigator.share) {
        navigator.share({title:message,text:'Discover entertainment with MatchApp Ai.',url}).catch(()=>{});
    } else if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(message + ' ' + url)
            .then(()=>window.showToast?.('Link copied. Share verification is required for rewards.'))
            .catch(()=>{});
    }
}

function discoverCardHTML(item, idx) {
    const rawTitle = String(item.displayTitle || item.title || '');
    const title = (typeof window.sanitizeDisplayText === 'function')
        ? window.sanitizeDisplayText(rawTitle, ['title'])
        : rawTitle;
    const safe = escapeDiscoverHtml(title);
    const meta = escapeDiscoverHtml([item.year, item.type, item.platform && item.platform !== 'any' ? item.platform : '']
        .filter(Boolean).join(' · '));
    const isAudio = /podcast|album|music|audiobook/i.test(item.type || '');
    const cinemaOnly = item?._viewing?.mode === 'cinema';
    const verifiedStream = item?._viewing?.mode === 'stream';
    const watchLabel = cinemaOnly
        ? discoverLabel('discover.cinemaShowtimes', '🎟️ Cinemas & showtimes')
        : (verifiedStream
            ? (isAudio ? discoverLabel('res.listennow', '🎧 Listen Now') : discoverLabel('discover.watchNow', '▶ Watch Now'))
            : discoverLabel('discover.whereToWatch', 'Where to Watch'));
    const saveLabel = discoverLabel('res.watchlater', '⭐ Watch Later');
    const nfmLabel = discoverLabel('res.notforme', '👎 Not For Me');
    const shareLabel = /^pt/i.test(window.MATCH_LANG||'') ? '↗ Compartilhar' : /^es/i.test(window.MATCH_LANG||'') ? '↗ Compartir' : '↗ Share';
    const whyText = item.why === 'director'
        ? discoverLabel('discover.sameDirector', 'Same director') + (item.directorName ? ' · ' + item.directorName : '')
        : (item.why === 'idea' ? discoverLabel('discover.sameIdea', 'Same idea') : '');
    const synopsis = escapeDiscoverHtml((typeof window.sanitizeDisplayText === 'function'
        ? window.sanitizeDisplayText(item.synopsis, ['synopsis'])
        : item.synopsis) || '');
    const lang = window.MATCH_LANG || 'en';
    const facts = discoverFactsHTML(item);
    const categories = Array.isArray(item.realGenres) && item.realGenres.length
        ? `<div class="discover-categories" aria-label="${escapeDiscoverHtml(discoverLabel('discover.categories','Genres'))}">${item.realGenres.slice(0,8).map(c => `<span class="discover-category">${escapeDiscoverHtml(c)}</span>`).join('')}</div>`
        : '';
    const ribbon = cinemaOnly ? `<span class="discover-cinema-ribbon">${escapeDiscoverHtml(discoverLabel('discover.inCinemas','In cinemas'))}</span>` : '';
    const metaLine = facts
        ? (item.type ? `<div class="discover-meta">${escapeDiscoverHtml(item.type)}</div>` : '')
        : (meta ? `<div class="discover-meta">${meta}</div>` : '');
    return `
    <article class="discover-card${item.why ? ' is-related' : ''}" data-discover-idx="${idx}">
        <div class="discover-poster">
            ${ribbon}
            <img id="dp-${idx}" src="${escapeDiscoverHtml(discoverPosterUrl(item)||discoverFallbackPoster(item))}" alt="${safe}" loading="${idx < 3 ? 'eager' : 'lazy'}" decoding="async" width="342" height="513">
            <div class="discover-rank">${item.why ? '＋' : '#' + (idx + 1)}</div>
        </div>
        <div class="discover-body">
            ${whyText ? `<div class="discover-why">${escapeDiscoverHtml(whyText)}</div>` : ''}
            <h3 data-src-text="${escapeDiscoverHtml(item.title || title)}" data-locale-painted="${lang}">${safe}</h3>
            ${metaLine}
            ${facts}
            ${categories}
            <div id="discover-availability-${idx}" class="matchapp-card-availability" hidden></div>
            <p class="discover-synopsis" data-result-title="${escapeDiscoverHtml(item.title || title)}" data-result-year="${escapeDiscoverHtml(item.year || '')}" data-result-kind="${escapeDiscoverHtml(item._catalogMedia?.media_kind || item._tmdb?.kind || (/movie|film/i.test(item.type || '') ? 'movie' : /series|tv|show|novela|drama|anime/i.test(item.type || '') ? 'tv' : ''))}" data-source-lang="${escapeDiscoverHtml(item.synopsisLang || lang)}">${synopsis}</p>
            <div id="discover-preview-${idx}" class="discover-card-preview" hidden></div>
            <div class="discover-actions">
                <a id="dl-${idx}" class="gold-btn discover-play${cinemaOnly ? ' is-cinema' : ''}" href="#" target="_blank" rel="noopener">${watchLabel}</a>
                <button type="button" class="discover-save" onclick="saveDiscoverItem(${idx})" id="ds-${idx}">${saveLabel}</button>
                <button type="button" class="discover-nfm" onclick="notForMeDiscoverItem(${idx})" id="dn-${idx}">${nfmLabel}</button>
                <button type="button" class="discover-share" onclick="shareDiscoverItem(${idx})" id="dshare-${idx}" aria-label="${shareLabel}">${shareLabel}</button>
            </div>
        </div>
    </article>`;
}

function paintDiscoverGenres(item, idx) {
    const card = document.querySelector(`[data-discover-idx="${idx}"]`);
    if (!card) return;
    const genres = Array.isArray(item?.realGenres) ? item.realGenres.filter(Boolean).slice(0, 8) : [];
    let host = card.querySelector('.discover-categories');
    if (!genres.length) { host?.remove(); return; }
    const html = `<div class="discover-categories" aria-label="${escapeDiscoverHtml(discoverLabel('discover.categories','Genres'))}">${genres.map(g => `<span class="discover-category">${escapeDiscoverHtml(g)}</span>`).join('')}</div>`;
    if (host) { host.outerHTML = html; return; }
    const synopsis = card.querySelector('.discover-synopsis');
    synopsis?.insertAdjacentHTML('beforebegin', html);
}

let DISCOVER_ITEMS = [];

// Platforms where iTunes/TVMaze coverage is unreliable enough that a live
// lookup is more likely to return something WRONG than nothing at all —
// this is what "A Gata Comeu" (Globoplay) exposed: the AI chat path had none
// of the protections app.js's main match render already had (verified
// poster registry, category/platform-based skip), so a Globoplay title
// could still trigger a live search that came back with an unrelated
// result. Checking the platform Gemini itself returned is a reliable,
// already-available signal — no guesswork needed.
const HIGH_RISK_PLATFORMS_DISCOVER = new Set(['globoplay', '+sbt', 'sbt+', 'reelshort', 'dramabox', 'shortmax', 'pure flix', 'angel studios']);

function discoverFallbackPoster(item) {
    if (!item || !item.title) return '';
    const meta = {
        cats: item.type ? [item.type] : [],
        moods: Array.isArray(item.moods) ? item.moods : [],
        platform: item.platform || '',
        synopsis: item.synopsis || item.overview || ''
    };
    if (typeof generatedCover === 'function') return generatedCover(item.title, meta);
    if (typeof generateLocalPosterSVG === 'function') return generateLocalPosterSVG(item.title, meta);
    return '';
}

async function hydrateDiscoverCard(item, idx) {
    window.MatchAppTitleIdentity?.paint(document.querySelector(`[data-discover-idx="${idx}"] h3`),{...item,kind:item._catalogMedia?.media_kind||item._tmdb?.kind||(/movie|film/i.test(item.type||'')?'movie':/series|tv|show|novela|drama|anime/i.test(item.type||'')?'tv':item.type)});
    // A former undeclared rawType crashed TV genre enrichment for some answers.
    const rawType=String(item?.type||'').toLowerCase();
    const img = document.getElementById('dp-' + idx);
    const link = document.getElementById('dl-' + idx);
    if (!img) return;
    img.__matchappDiscoverItem=item;
    const current=()=>img.isConnected&&document.getElementById('dp-'+idx)===img&&img.__matchappDiscoverItem===item;

    const fallbackArtwork = discoverFallbackPoster(item);
    const readyArtwork=discoverPosterUrl(item);
    if(readyArtwork)setDiscoverPoster(img,item,readyArtwork,fallbackArtwork);
    else img.src = fallbackArtwork;
    item._fallbackArtwork = fallbackArtwork;

    // Hand-verified art (parity with app.js's render path) always wins —
    // no lookup can beat a known-correct image.
    const exactId=Number(item._catalogMedia?.tmdb_id||item._meta?.tmdbId||item._tmdb?.tmdbId);
    const verified = !exactId && !/music|song|album|single/i.test(rawType) && (typeof getVerifiedPoster === 'function') ? getVerifiedPoster(item.title) : null;

    // AI-chat titles come from Gemini's free-form knowledge, not our curated
    // catalog, so they're inherently less trustworthy than a match-engine
    // result — meaning the bar for "risk a live lookup at all" should be
    // LOWER here, not the same. If the platform Gemini named is one where
    // external catalogs have unreliable coverage, or the category-check
    // flags it, skip every live lookup entirely rather than gambling on the
    // relevance guard catching a bad result.
    const platformIsHighRisk = item.platform && HIGH_RISK_PLATFORMS_DISCOVER.has(String(item.platform).toLowerCase());
    const categoryIsHighRisk = (typeof isHighRiskCategory === 'function') && isHighRiskCategory(item.type, item.title);
    const skipLiveLookup = platformIsHighRisk || categoryIsHighRisk;

    let meta = item._meta || null;
    if (!meta && item._catalogMedia) {
        const cm = item._catalogMedia;
        meta = {
            artwork: cm.poster_original_url || cm.poster_large_url || cm.poster_url || '',
            year: cm.year || item.year || '',
            overview: cm.overview || '',
            tmdbId: cm.tmdb_id || null,
            kind: cm.media_kind || '',
            source: 'catalog-media',
            title: cm.title || item.title,
            genres: Array.isArray(cm.genres) ? cm.genres.slice(0, 8) : []
        };
    }
    const visualType = !/podcast|album|music|audiobook/i.test(item.type || '');
    // Missing artwork is not a completed lookup. Reuse the exact source ID
    // when available, including for translated titles.
    if ((!meta || !meta.artwork) && !skipLiveLookup && !verified && visualType &&
        window.MatchAppCatalogMedia?.resolvePoster) {
        try {
            const kind=/movie|film/i.test(item.type||'')?'movie':/series|tv|drama|anime|novela|show|documentary/i.test(item.type||'')?'tv':'';
            const identity=item._catalogMedia||{};
            const resolved=await window.MatchAppCatalogMedia.resolvePoster(item.title,{
                year:item.year||'',kind:identity.media_kind||meta?.kind||kind,
                tmdbId:identity.tmdb_id||meta?.tmdbId||null,cats:item.cats||[]
            });
            if(!current())return;
            if(resolved?.url){
                const cm=resolved.meta||{};
                meta={...(meta||{}),artwork:resolved.url,year:cm.year||item.year,
                  tmdbId:cm.tmdb_id||meta?.tmdbId,kind:cm.media_kind||meta?.kind||kind,
                  source:'tmdb',title:cm.title||item.title,overview:cm.overview||meta?.overview||'',
                  genres:cm.genres||meta?.genres||[]};
            }
        }catch(_){}
    }
    if ((!meta || !meta.artwork) && !skipLiveLookup && !verified && visualType && typeof window.tmdbLookup === 'function') {
        const kind = /movie|film/i.test(item.type || '') ? 'movie' : /series|tv|drama|anime|novela|show|documentary/i.test(item.type || '') ? 'tv' : '';
        const tmdb = await window.tmdbLookup(item.title, { year: item.year || '', kind });
        if(!current())return;
        if (tmdb && (tmdb.posterLarge || tmdb.poster)) {
            meta = { artwork: tmdb.posterLarge || tmdb.poster, year: tmdb.year || item.year || '', overview: tmdb.overview || '', tmdbId: tmdb.tmdbId, kind: tmdb.kind, source: 'tmdb', title: tmdb.title, genres: Array.isArray(tmdb.genres) ? tmdb.genres.slice(0,8) : [] };
            item._tmdb = tmdb;
        }
    }
    // Show artwork before optional synopsis/preview services finish.
    const earlyArtwork=verified||meta?.artwork||readyArtwork;
    if(earlyArtwork)setDiscoverPoster(img,item,earlyArtwork,fallbackArtwork);
    let richMeta = null;
    if (!item._catalogMedia && !skipLiveLookup && !/music|song|album|single/i.test(rawType) && typeof getRichMetadata === 'function') {
        // Apple metadata is exact-identity guarded in app.js. Keep it separate
        // from TMDB artwork so it can supply a genuine preview and source genre
        // even when TMDB already supplied the poster.
        let chatHints = {};
        try {
            if (typeof CONTENT_CATALOG !== 'undefined') {
                const e = CONTENT_CATALOG.find(x => x.title === item.title);
                if (e) chatHints = { year: e.year, country: e.country, countryCode: e.countryCode };
            }
        } catch (err) {}
        richMeta = await getRichMetadata(item.title, item.type || '', chatHints);
        if(!current())return;
        if (!meta && !verified && richMeta) meta = richMeta;
    }
    // The TVMaze secondary attempt is deliberately NOT used for AI-chat
    // results at all (unlike the main match render, which does use it for
    // catalog-sourced titles). A curated catalog entry's title is something
    // we wrote and know precisely; an AI-chat title is Gemini's free-form
    // best guess — stacking a second, looser lookup on top of that is where
    // the remaining risk lived, for a real-cover gain that isn't worth it
    // here.

    if (Array.isArray(item._catalogMedia?.genres) && item._catalogMedia.genres.length) {
        item.realGenres = item._catalogMedia.genres.slice(0, 8);
    } else if (Array.isArray(meta?.genres) && meta.genres.length) {
        item.realGenres = meta.genres.slice(0, 8);
    } else if (richMeta?.genre) {
        item.realGenres = [String(richMeta.genre)];
    } else if (!item.realGenres?.length && typeof fetchTitleMeta === 'function' &&
               /series|tv|show|drama|anime|novela|documentary/i.test(rawType) &&
               !/movie|film/i.test(rawType) && !skipLiveLookup) {
        try {
            const tvMeta = await fetchTitleMeta(item.title, { year: item.year || '' });
            if(!current())return;
            if (Array.isArray(tvMeta?.genres) && tvMeta.genres.length) item.realGenres = tvMeta.genres.slice(0, 8);
        } catch (_) {}
    }
    if(!current())return;
    paintDiscoverGenres(item, idx);

    const resolvedArtwork = img.__matchappDiscoverPoster?.loadedUrl || fallbackArtwork;
    // If no external artwork survives the verified lookup chain, keep the
    // synopsis-aware MatchApp poster and persist that same artwork into
    // history / Watch Later instead of saving a blank poster URL.
    item._resolved = Object.assign({}, meta || {}, {
        artwork: resolvedArtwork,
        source: verified ? 'verified' : ((meta && meta.source) || 'matchapp-generated')
    });

    if (meta && meta.overview) {
        const lang = window.MATCH_LANG || 'en';
        const short = !item.synopsis || String(item.synopsis).length < 24;
        const preferLocalized = lang !== 'en' && meta.source === 'tmdb';
        if (short || preferLocalized) {
            item.synopsis = meta.overview;
            item.synopsisLang='en';
            const syn = document.querySelector(`[data-discover-idx="${idx}"] .discover-synopsis`);
            if (syn) syn.dataset.sourceLang='en';
            if (syn) syn.textContent = (typeof window.sanitizeDisplayText === 'function')
                ? window.sanitizeDisplayText(meta.overview, ['synopsis'])
                : meta.overview;
        }
    }
    if (meta && meta.title && meta.source === 'tmdb') {
        item.displayTitle = meta.title;
        const h3 = document.querySelector(`[data-discover-idx="${idx}"] h3`);
        if (h3) h3.textContent = meta.title;
    }

    if (link) {
        const isAudio = /podcast|album|music|audiobook/i.test(item.type || '');
        const cinemaOnly = item?._viewing?.mode === 'cinema';
        const verifiedStream = item?._viewing?.mode === 'stream';
        const panelAvailable=!!item._catalogMedia&&!!window.MatchAppCatalogMedia?.renderAvailability&&
            !!document.getElementById('discover-availability-'+idx);
        const direct=verifiedStream||isAudio||!panelAvailable;
        const url = discoverWatchUrl(item);
        link.href = direct ? url : '#discover-availability-' + idx;
        link.textContent = cinemaOnly
            ? discoverLabel('discover.cinemaShowtimes', '🎟️ Cinemas & showtimes')
            : (verifiedStream
                ? (isAudio ? discoverLabel('res.listennow', '🎧 Listen Now') : discoverLabel('discover.watchNow', '▶ Watch Now'))
                : discoverLabel('discover.whereToWatch', 'Where to Watch'));
        link.classList.toggle('is-cinema', cinemaOnly);
        link.onclick=null;
        if (!direct) {
            link.removeAttribute('target');
            link.removeAttribute('rel');
            link.onclick = e => {
                e.preventDefault();
                const host=document.getElementById('discover-availability-' + idx);
                if(host) revealJonasTurn(host);
                host?.classList.add('is-highlighted');
                setTimeout(()=>host?.classList.remove('is-highlighted'),1400);
            };
        } else {
            link.target='_blank';
            link.rel='noopener noreferrer';
        }
        item._url = url || '';
    }
    const availabilityHost = document.getElementById('discover-availability-' + idx);
    if (item._catalogMedia && window.MatchAppCatalogMedia?.renderAvailability) {
        window.MatchAppCatalogMedia.renderAvailability(availabilityHost, item._catalogMedia, { title: item.title, region: item._verifiedDocRegion || '' });
    }
    const previewHost = document.getElementById('discover-preview-' + idx);
    if (item._catalogMedia && window.MatchAppCatalogMedia?.renderPreview) {
        window.MatchAppCatalogMedia.renderPreview(previewHost, item._catalogMedia, { title: item.title });
    } else if (previewHost) {
        previewHost.replaceChildren();
        previewHost.hidden = true;
        const previewUrl = String(richMeta?.preview || '');
        const storeUrl = String(richMeta?.storeUrl || '');
        const realVideo = richMeta && typeof isVideoPreview === 'function' && isVideoPreview(richMeta) &&
            /^https:\/\/(?:video-ssl|audio-ssl)\.itunes\.apple\.com\//i.test(previewUrl);
        if (realVideo) {
            const label = document.createElement('div');
            label.className = 'matchapp-media-preview-label';
            label.textContent = discoverLabel('discover.preview', 'Preview');
            const video = document.createElement('video');
            video.controls = true; video.preload = 'metadata'; video.playsInline = true; video.src = previewUrl;
            video.setAttribute('aria-label', item.title + ' preview');
            previewHost.append(label, video);
            if (/^https:\/\//.test(storeUrl)) {
                const source = document.createElement('a'); source.href = storeUrl; source.target = '_blank'; source.rel = 'noopener noreferrer';
                source.className = 'matchapp-title-page-btn'; source.textContent = discoverLabel('discover.titlePage','Open title page');
                previewHost.appendChild(source);
            }
            previewHost.hidden = false;
        } else {
            let titlePage = '';
            if (Number.isSafeInteger(Number(meta?.tmdbId)) && ['movie','tv'].includes(meta?.kind)) {
                titlePage = 'https://www.themoviedb.org/' + meta.kind + '/' + meta.tmdbId;
            } else if (/^https:\/\//.test(storeUrl)) titlePage = storeUrl;
            if (titlePage) {
                const label = document.createElement('div'); label.className = 'matchapp-media-preview-label'; label.textContent = discoverLabel('discover.preview','Preview');
                const source = document.createElement('a'); source.href = titlePage; source.target = '_blank'; source.rel = 'noopener noreferrer';
                source.className = 'matchapp-title-page-btn'; source.textContent = discoverLabel('discover.titlePage','Open title page');
                previewHost.append(label, source); previewHost.hidden = false;
            }
        }
    }
    if (meta && meta.year && !item.year) item.year = meta.year;
    paintDiscoverFacts(item, idx);
}

function saveDiscoverPreference(item, action) {
    const entry={...item,posterUrl:item._resolved?.artwork||discoverFallbackPoster(item),
        streamUrl:item._url||discoverWatchUrl(item),
        isAudio:/podcast|album|music/i.test(item.type||''),addedAt:Date.now(),reason:'Ask AI'};
    if(window.matchPolicy?.savePreference)return window.matchPolicy.savePreference(entry,action);
    // A stale cached policy still keeps the choice locally until the shared
    // policy refreshes; storage failures never produce a false success toast.
    try {
        const name=action==='dislike'?'match_dislikedList':'match_savedList';
        const raw=JSON.parse(localStorage.getItem(name)||'[]');
        const list=Array.isArray(raw)?raw.filter(row=>row&&(typeof row==='string'||row.title)):[];
        const key=window.matchPolicy?.key||titleKey;
        const next=list.filter(row=>key(row.title||row)!==key(item.title));
        next.unshift(entry);
        localStorage.setItem(name,JSON.stringify(next));
        if(action==='dislike'){
            const saved=JSON.parse(localStorage.getItem('match_savedList')||'[]');
            localStorage.setItem('match_savedList',JSON.stringify(Array.isArray(saved)?saved.filter(row=>key(row?.title||row)!==key(item.title)):[]));
        }
        window.matchPolicy?.remember?.(entry,action);
        return true;
    } catch (_) { return false; }
}

window.saveDiscoverItem = function (idx) {
    const item = DISCOVER_ITEMS[idx];
    if (!item) return;
    if(!saveDiscoverPreference(item,'save')){
        window.showToast?.(discoverLabel('ai.detailsRetry','Title details could not load. Please try again shortly.'));
        return;
    }
    const btn = document.getElementById('ds-' + idx);
    if (btn) { btn.textContent = '✓ '+discoverLabel('polish.savedLater','Saved'); btn.classList.add('saved'); btn.setAttribute('aria-pressed','true'); btn.disabled=true; }
    if (window.showToast) showToast(`⭐ "${item.title}" ${typeof t === 'function' ? t('discover.savedToast') : 'saved to Watch Later'}`);
};

window.notForMeDiscoverItem = function (idx) {
    const item = DISCOVER_ITEMS[idx];
    if (!item || !item.title) return;
    if(!saveDiscoverPreference(item,'dislike')){
        window.showToast?.(discoverLabel('ai.detailsRetry','Title details could not load. Please try again shortly.'));
        return;
    }
    const keys=window.matchPolicy?.identityKeys?.(item)||new Set([titleKey(item.title)]);
    DISCOVER_ITEMS.forEach((candidate,index)=>{
        const candidateKeys=window.matchPolicy?.identityKeys?.(candidate)||new Set([titleKey(candidate.title)]);
        if(![...candidateKeys].some(key=>keys.has(key)))return;
        const card = document.querySelector(`[data-discover-idx="${index}"]`);
        if (card) { card.classList.add('is-hidden'); card.hidden=true; }
        const img=document.getElementById('dp-'+index);
        if(img){img.__matchappDiscoverPoster?.cancel?.();img.__matchappDiscoverItem=null;}
    });
    if (window.showToast) showToast(discoverLabel('discover.hiddenToast', 'Hidden. You can restore it from History.'));
};

function titleKey(title) {
    return String(title || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

async function localizeRelatedItem(item) {
    const lang = window.MATCH_LANG || 'en';
    if (lang === 'en') return item;
    // TMDB overviews were already requested in MATCH_LANG. Do not spend Ask AI
    // credits translating related titles — official localized names only.
    try {
        if (item.title && typeof window.localizedTitle === 'function') {
            const named = await window.localizedTitle(item.title, { year: item.year, kind: item.kind || '' });
            if (named) item.displayTitle = named;
        }
    } catch (e) {}
    return item;
}

function relatedFromTmdb(pack, source) {
    if (!pack || !Array.isArray(pack.related)) return [];
    return pack.related.map(r => ({
        title: r.originalTitle || r.title,
        displayTitle: r.title,
        year: r.year || '',
        type: r.kind === 'movie' ? 'movie' : 'series',
        platform: source.platform || '',
        synopsis: r.overview || '',
        synopsisLang: window.MATCH_LANG || 'en',
        why: r.why === 'director' ? 'director' : 'idea',
        directorName: r.directorName || (pack.director && pack.director.name) || '',
        _meta: r.poster ? { artwork: r.poster, year: r.year, overview: r.overview, tmdbId: r.tmdbId, kind: r.kind, source: 'tmdb', title: r.title } : null,
        _tmdb: r
    }));
}

async function attachRelated(grid, seedItems, baseIndex) {
    if (!grid || !seedItems || !seedItems.length) return;
    const identityKeys=item=>window.matchPolicy?.identityKeys?.(item)||new Set([titleKey(item.title)]);
    const seen = new Set(DISCOVER_ITEMS.flatMap(item => [...identityKeys(item)]));
    const collected = [];

    const tmdbSeeds = seedItems.filter(i => i && i._tmdb && Number.isSafeInteger(i._tmdb.tmdbId)).slice(0, 2);
    if (tmdbSeeds.length && typeof window.tmdbRelated === 'function') {
        const packs = await Promise.all(tmdbSeeds.map(i => window.tmdbRelated(i._tmdb.tmdbId, i._tmdb.kind || 'movie').catch(() => null)));
        packs.forEach((pack, i) => {
            relatedFromTmdb(pack, tmdbSeeds[i]).forEach(row => collected.push(row));
        });
    }

    seedItems.slice(0, 3).forEach(item => {
        catalogCousins(item, 3).forEach(row => collected.push(row));
    });

    let unique = [];
    for (const row of collected) {
        const keys = identityKeys(row);
        if (!row.title || [...keys].some(key=>seen.has(key)) || isDiscoverDisliked(row, true)) continue;
        if (window.matchPolicy) {
            if (lastDiscoverQuestion && !window.matchPolicy.fitsQuestion(row, lastDiscoverQuestion)) continue;
            if (seedItems.some(s => s && !window.matchPolicy.sameFamily(s, row))) continue;
        }
        keys.forEach(key=>seen.add(key));
        unique.push(row);
        if (unique.length >= 6) break;
    }
    if (!unique.length) return;

    for (const row of unique) await localizeRelatedItem(row);
    if(grid.isConnected===false)return;
    unique=await prepareDiscoverRecommendations(unique,lastDiscoverQuestion,()=>grid.isConnected!==false);
    if(!unique.length||grid.isConnected===false)return;

    const heading = document.createElement('h3');
    heading.className = 'discover-related-head';
    heading.textContent = discoverLabel('discover.moreLike', 'More in the same vein');
    grid.appendChild(heading);

    const start = DISCOVER_ITEMS.length;
    unique.forEach((row, i) => {
        DISCOVER_ITEMS.push(row);
        const wrap = document.createElement('div');
        wrap.innerHTML = discoverCardHTML(row, start + i).trim();
        const card = wrap.firstElementChild;
        if (card) grid.appendChild(card);
        window.matchPolicy?.remember?.({...row,posterUrl:discoverPosterUrl(row)||discoverFallbackPoster(row),
            streamUrl:discoverWatchUrl(row),reason:'Ask AI related'},'ai');
    });
    await Promise.all(unique.map((row, i) => hydrateDiscoverCard(row, start + i)));
}

function relabelDiscoverCards() {
    document.querySelectorAll('.discover-related-head').forEach(el => {
        el.textContent = discoverLabel('discover.moreLike', 'More in the same vein');
    });
    document.querySelectorAll('.discover-card').forEach(card => {
        const idx = Number(card.getAttribute('data-discover-idx'));
        const item = DISCOVER_ITEMS[idx];
        if (!item) return;
        const isAudio = /podcast|album|music|audiobook/i.test(item.type || '');
        const play = card.querySelector('.discover-play');
        if (play) play.textContent = isAudio ? discoverLabel('res.listennow', '🎧 Listen Now') : discoverLabel('discover.watchNow', '▶ Watch Now');
        const save = card.querySelector('.discover-save');
        if (save && !save.classList.contains('saved')) save.textContent = discoverLabel('res.watchlater', '⭐ Watch Later');
        const nfm = card.querySelector('.discover-nfm');
        if (nfm) nfm.textContent = discoverLabel('res.notforme', '👎 Not For Me');
        const why = card.querySelector('.discover-why');
        if (why && item.why === 'director') why.textContent = discoverLabel('discover.sameDirector', 'Same director') + (item.directorName ? ' · ' + item.directorName : '');
        else if (why && item.why === 'idea') why.textContent = discoverLabel('discover.sameIdea', 'Same idea');
        paintDiscoverFacts(item, idx);
    });
}
document.addEventListener('matchapp:langchange', relabelDiscoverCards);

/* ---------- Boot ---------- */
/* ============================================================
   MATCHAPP AI WORKSPACE UI
   Sidebar state, live quota meters and staged thinking progress.
   These are presentation helpers around the existing quota/chat engine;
   they never invent allowance values or bypass checkDailyLimit().
   ============================================================ */
let aiWorkflowTimer = null;

window.toggleAiSidebar = function(force) {
    const body = document.body;
    if (!body) return;
    const mobile = window.matchMedia('(max-width: 980px)').matches;
    if (mobile) {
        const open = typeof force === 'boolean' ? force : !body.classList.contains('ai-sidebar-open');
        body.classList.toggle('ai-sidebar-open', open);
        return;
    }
    const collapsed = typeof force === 'boolean' ? !force : !body.classList.contains('ai-sidebar-collapsed');
    body.classList.toggle('ai-sidebar-collapsed', collapsed);
    try { localStorage.setItem('match_ai_sidebar_collapsed', collapsed ? '1' : '0'); } catch (_) {}
};

function localAiQuotaStatus() {
    const today = new Date().toLocaleDateString();
    const storedDay = localStorage.getItem('match_lastDate');
    const used = storedDay === today ? Math.max(0, parseInt(localStorage.getItem('match_dailyCount') || '0', 10) || 0) : 0;
    const limit = 3;
    return { authenticated:false, anon:true, used, limit, remaining:Math.max(0, limit - used), credits:Math.max(0, Number.parseInt(localStorage.getItem('match_guestBonusAiPrompts_v1')||'0',10)||0) };
}

function renderAiQuotaStatus(status) {
    status = status || localAiQuotaStatus();
    const value = document.getElementById('ai-usage-value');
    const fill = document.getElementById('ai-usage-fill');
    const credits = document.getElementById('ai-credit-line');
    const newChat = document.getElementById('ai-new-chat');
    const limit = Math.max(0, Number(status.limit) || 0);
    const remaining = Math.max(0, Number(status.remaining) || 0);
    const used = Math.max(0, Number.isFinite(Number(status.used)) ? Number(status.used) : Math.max(0, limit - remaining));
    const paidCredits = Math.max(0, Number(status.credits) || 0);
    const pct = limit > 0 ? Math.max(0, Math.min(100, (used / limit) * 100)) : 0;

    if (value) value.textContent = limit ? (remaining + ' of ' + limit + ' daily left') : 'Ready';
    if (fill) fill.style.width = pct + '%';
    if (credits) {
        credits.textContent = status.anon
            ? (remaining > 0 ? 'Guest allowance · 2 social-share bonuses total available to try.' : paidCredits > 0 ? paidCredits + ' free share AI prompt' + (paidCredits===1?'':'s') + ' available.' : (window.MatchAppGuestShare?.remainingShares?.() > 0 ? 'Share your last AI reply above to unlock +1 prompt.' : 'Guest preview complete · register free for +10 Matches and +10 AI prompts.'))
            : (paidCredits + ' Ask AI credit' + (paidCredits === 1 ? '' : 's') + ' available after your included allowance.');
    }
    if (newChat) {
        const locked = remaining <= 0 && paidCredits <= 0;
        newChat.disabled = locked;
        newChat.title = locked ? 'No AI allowance or Ask AI credits remaining' : 'Start a new conversation';
    }
    lastAiCostState = { remaining, limit, paidCredits };
    paintAiSendCost();
}

// Cost line under the Ask AI send button: what one question uses and what is
// left, in the visitor's language. Display only — quota stays server-side.
const AI_COST_COPY = {
 "en": {
  "left": "Each question uses 1 AI action · {remaining} of {limit} left today",
  "credits": "Your daily AI actions are used up — each question now uses 1 Ask AI credit ({credits} left)",
  "none": "No AI actions left today — get Ask AI credits or come back tomorrow"
 },
 "pt-BR": {
  "left": "Cada pergunta usa 1 ação de IA · restam {remaining} de {limit} hoje",
  "credits": "Suas ações diárias de IA acabaram — cada pergunta agora usa 1 crédito do Ask AI (restam {credits})",
  "none": "Sem ações de IA hoje — compre créditos do Ask AI ou volte amanhã"
 },
 "es": {
  "left": "Cada pregunta usa 1 acción de IA · te quedan {remaining} de {limit} hoy",
  "credits": "Tus acciones diarias de IA se agotaron: cada pregunta usa ahora 1 crédito de Ask AI (quedan {credits})",
  "none": "No te quedan acciones de IA hoy: consigue créditos de Ask AI o vuelve mañana"
 },
 "fr": {
  "left": "Chaque question utilise 1 action IA · il en reste {remaining} sur {limit} aujourd’hui",
  "credits": "Vos actions IA du jour sont épuisées — chaque question utilise désormais 1 crédit Ask AI ({credits} restants)",
  "none": "Plus d’actions IA aujourd’hui — obtenez des crédits Ask AI ou revenez demain"
 },
 "de": {
  "left": "Jede Frage nutzt 1 KI-Aktion · heute noch {remaining} von {limit}",
  "credits": "Deine täglichen KI-Aktionen sind aufgebraucht – jede Frage nutzt jetzt 1 Ask-AI-Guthaben ({credits} übrig)",
  "none": "Heute keine KI-Aktionen mehr – hol dir Ask-AI-Guthaben oder komm morgen wieder"
 },
 "it": {
  "left": "Ogni domanda usa 1 azione IA · te ne restano {remaining} su {limit} oggi",
  "credits": "Le azioni IA di oggi sono finite: ogni domanda usa ora 1 credito Ask AI (ne restano {credits})",
  "none": "Nessuna azione IA rimasta oggi: prendi crediti Ask AI o torna domani"
 },
 "tr": {
  "left": "Her soru 1 yapay zekâ işlemi kullanır · bugün {limit} işlemden {remaining} kaldı",
  "credits": "Günlük yapay zekâ işlemleriniz bitti — her soru artık 1 Ask AI kredisi kullanır ({credits} kaldı)",
  "none": "Bugün yapay zekâ işlemi kalmadı — Ask AI kredisi alın ya da yarın tekrar gelin"
 },
 "ru": {
  "left": "Каждый вопрос расходует 1 действие ИИ · сегодня осталось {remaining} из {limit}",
  "credits": "Дневные действия ИИ закончились — теперь каждый вопрос расходует 1 кредит Ask AI (осталось {credits})",
  "none": "Сегодня действий ИИ не осталось — купите кредиты Ask AI или возвращайтесь завтра"
 },
 "ar": {
  "left": "كل سؤال يستخدم إجراء ذكاء اصطناعي واحداً · تبقّى لك اليوم {remaining} من {limit}",
  "credits": "انتهت إجراءات الذكاء الاصطناعي اليومية — كل سؤال يستخدم الآن رصيداً واحداً من Ask AI (المتبقي {credits})",
  "none": "لا توجد إجراءات ذكاء اصطناعي متبقية اليوم — احصل على رصيد Ask AI أو عد غداً"
 },
 "hi": {
  "left": "हर सवाल 1 AI एक्शन लेता है · आज {limit} में से {remaining} बचे हैं",
  "credits": "आज के AI एक्शन खत्म हो गए — अब हर सवाल 1 Ask AI क्रेडिट लेगा ({credits} बचे)",
  "none": "आज कोई AI एक्शन नहीं बचा — Ask AI क्रेडिट लें या कल फिर आएँ"
 },
 "id": {
  "left": "Setiap pertanyaan memakai 1 aksi AI · sisa {remaining} dari {limit} hari ini",
  "credits": "Aksi AI harianmu sudah habis — setiap pertanyaan kini memakai 1 kredit Ask AI (sisa {credits})",
  "none": "Aksi AI hari ini sudah habis — dapatkan kredit Ask AI atau kembali besok"
 },
 "ja": {
  "left": "質問1回につきAIアクションを1回使います · 本日の残り {remaining}/{limit}",
  "credits": "本日のAIアクションを使い切りました。質問1回につきAsk AIクレジットを1つ使います（残り{credits}）",
  "none": "本日のAIアクションは残っていません。Ask AIクレジットを入手するか、明日またお試しください"
 },
 "ko": {
  "left": "질문 1회에 AI 액션 1회가 사용돼요 · 오늘 {limit}회 중 {remaining}회 남음",
  "credits": "오늘의 AI 액션을 모두 사용했어요. 이제 질문마다 Ask AI 크레딧 1개가 사용돼요 ({credits}개 남음)",
  "none": "오늘 남은 AI 액션이 없어요. Ask AI 크레딧을 구매하거나 내일 다시 오세요"
 },
 "zh": {
  "left": "每个问题消耗 1 次 AI 操作 · 今天还剩 {remaining}/{limit} 次",
  "credits": "今日 AI 操作已用完——现在每个问题消耗 1 个 Ask AI 点数（剩余 {credits} 个）",
  "none": "今天没有剩余的 AI 操作——请购买 Ask AI 点数或明天再来"
 }
};
var lastAiCostState = null;
function aiCostLang() {
    const low = String(window.MATCH_LANG || document.documentElement.getAttribute('lang') || 'en').toLowerCase();
    if (low.startsWith('pt')) return 'pt-BR';
    if (low.startsWith('zh')) return 'zh';
    const keys = Object.keys(AI_COST_COPY);
    return keys.find(k => k.toLowerCase() === low) || keys.find(k => k.split('-')[0] === low.split('-')[0]) || 'en';
}
function paintAiSendCost() {
    try {
        const st = lastAiCostState;
        const send = document.querySelector('.newsearch-row .composer-send');
        if (!st || !send) return;
        if (!document.getElementById('ai-send-cost-style')) {
            const style = document.createElement('style');
            style.id = 'ai-send-cost-style';
            style.textContent = '.ai-send-cost{flex:1 0 100%;margin:4px 2px 0;font:500 12.5px/1.4 Inter,"Segoe UI",system-ui,sans-serif;color:#cbbfdc}.ai-send-cost[hidden]{display:none!important}';
            document.head.appendChild(style);
        }
        let el = document.getElementById('ai-send-cost');
        if (!el) {
            el = document.createElement('p');
            el.id = 'ai-send-cost';
            el.className = 'ai-send-cost';
        }
        // Presentation-only: a quota status is not a fourth control inside
        // the mic/send grid. Keep the same quota calculation and live text,
        // but place the existing node directly below the whole composer.
        const composer = send.closest('.composer');
        if (composer && (el.parentElement !== composer.parentElement || el.previousElementSibling !== composer)) {
            composer.insertAdjacentElement('afterend', el);
        }
        const copy = AI_COST_COPY[aiCostLang()] || AI_COST_COPY.en;
        const fill = (text, vars) => Object.keys(vars).reduce((acc, k) => acc.split('{' + k + '}').join(String(vars[k])), text);
        if (!st.limit && !st.remaining && !st.paidCredits) { el.hidden = true; return; }
        el.textContent = st.remaining > 0
            ? fill(copy.left, { remaining: st.remaining, limit: st.limit || st.remaining })
            : (st.paidCredits > 0 ? fill(copy.credits, { credits: st.paidCredits }) : copy.none);
        el.hidden = false;
    } catch (_) {}
}
document.addEventListener('matchapp:langchange', () => setTimeout(paintAiSendCost, 0));

async function refreshAiWorkspaceStatus() {
    let status = null;
    try {
        if (typeof window.refreshQuotaStatus === 'function') status = await window.refreshQuotaStatus();
    } catch (_) {}
    renderAiQuotaStatus(status || localAiQuotaStatus());
    return status;
}
window.refreshAiWorkspaceStatus = refreshAiWorkspaceStatus;

function setAiWorkflow(progress, label, activeStep) {
    const fill = document.getElementById('ai-workflow-fill');
    const text = document.getElementById('ai-thinking-label');
    if (fill) fill.style.width = Math.max(4, Math.min(100, progress)) + '%';
    if (text && label) text.textContent = label;
    ['understand','match','answer'].forEach(step => {
        const el = document.getElementById('ai-step-' + step);
        if (el) el.classList.toggle('active', step === activeStep);
    });
}

function startAiWorkflow() {
    if (aiWorkflowTimer) clearInterval(aiWorkflowTimer);
    let p = 7;
    setAiWorkflow(p, window.t?.('ai.understand') || 'Understanding your request…', 'understand');
    aiWorkflowTimer = setInterval(() => {
        p = Math.min(91, p + (p < 40 ? 7 : p < 72 ? 4 : 2));
        if (p < 40) setAiWorkflow(p, window.t?.('ai.understand') || 'Understanding your request…', 'understand');
        else if (p < 74) setAiWorkflow(p, window.t?.('ai.match') || 'Matching titles and sources…', 'match');
        else setAiWorkflow(p, window.t?.('ai.answer') || 'Composing your answer…', 'answer');
    }, 520);
}

function finishAiWorkflow() {
    if (aiWorkflowTimer) clearInterval(aiWorkflowTimer);
    aiWorkflowTimer = null;
    setAiWorkflow(100, window.t?.('ai.ready') || 'Answer ready', 'answer');
}
window.startAiWorkflow = startAiWorkflow;
window.finishAiWorkflow = finishAiWorkflow;

function initAiWorkspace() {
    try {
        if (window.matchMedia('(min-width: 981px)').matches && localStorage.getItem('match_ai_sidebar_collapsed') === '1') {
            document.body.classList.add('ai-sidebar-collapsed');
        }
    } catch (_) {}
    refreshAiWorkspaceStatus();
    setTimeout(refreshAiWorkspaceStatus, 900);
    setTimeout(refreshAiWorkspaceStatus, 2400);
}
document.addEventListener('DOMContentLoaded', initAiWorkspace);

/* ============================================================
   CONVERSATIONAL CHAT ENGINE
   Ask AI is now a real multi-turn conversation rather than a
   one-shot search. Each thread is saved to localStorage so a user
   can come back and keep going, and each *turn* consumes one from
   the included daily allowance (3 guest / 5 registered /
   10 VIP / 50 Business) — the same accounting the match engine uses.
   ============================================================ */

const CHAT_STORE_KEY = 'match_chatThreads';
const CHAT_MAX_THREADS = 20;

let currentThread = null;   // { id, title, turns: [{role, text, results, ts}], createdAt, updatedAt }
let discoverThreadVersion = 0;

function loadThreads() {
    try { return JSON.parse(localStorage.getItem(CHAT_STORE_KEY) || '[]'); }
    catch (e) { return []; }
}
function saveThreads(threads) {
    try {
        localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(threads.slice(0, CHAT_MAX_THREADS)));
    } catch (e) { /* quota exceeded — non-fatal, chat still works this session */ }
}
function persistCurrentThread() {
    if (!currentThread || !currentThread.turns.length) return;
    const threads = loadThreads().filter(t => t.id !== currentThread.id);
    threads.unshift(currentThread);
    saveThreads(threads);
    renderThreadList();
}
function newThreadId() { return 't' + Date.now() + Math.random().toString(36).slice(2, 7); }

window.startNewChat = function () {
    const btn = document.getElementById('ai-new-chat');
    if (btn && btn.disabled) {
        window.location.href = '/pricing/pricing.html?from=ask-ai#credits';
        return;
    }
    discoverThreadVersion++;
    currentThread = null;
    const log = document.getElementById('chat-log');
    if (log) { parkDiscoverComposer(); log.innerHTML = ''; }
    const empty = document.getElementById('discover-empty');
    if (empty) empty.style.display = 'none';
    const input = document.getElementById('discover-new-input');
    if (input) { input.value = ''; window.autoGrowComposer?.(); }
    const ambient = window.top !== window && new URLSearchParams(location.search).get('ambient') === '1';
    history.replaceState(null, '', ambient ? '/discover.html?ambient=1' : '/discover.html');
    document.title = window.t?.('page.askTitle') || 'Talk to Jonas | MatchApp Ai';
    renderThreadList();
    refreshAiWorkspaceStatus();
    if (window.matchMedia('(max-width: 980px)').matches) window.toggleAiSidebar(false);
};

window.openThread = function (id) {
    const t = loadThreads().find(x => x.id === id);
    if (!t) return;
    discoverThreadVersion++;
    currentThread = t;
    const log = document.getElementById('chat-log');
    if (log) { parkDiscoverComposer(); log.innerHTML = ''; }
    DISCOVER_ITEMS = [];
    t.turns.forEach(turn => {
        if (turn.role === 'user') {
            lastDiscoverQuestion = turn.text || lastDiscoverQuestion;
            appendUserBubble(turn.text);
        }
        else {
            const bubble = appendAssistantBubble(turn.text, turn.results || [], { instant: true });
            if (turn.musicVideoId && bubble) {
                bubble.wrap.dataset.musicVideoId = turn.musicVideoId;
                window.MatchAppMusicReleases?.paintCard(turn.musicVideoId, bubble.grid);
            }
            const visible = (turn.results || []).filter(item => item && item.title && !isDiscoverDisliked(item));
            if (bubble && visible.length) {
                const baseIndex = DISCOVER_ITEMS.length;
                DISCOVER_ITEMS = DISCOVER_ITEMS.concat(visible);
                renderResultsInto(bubble.grid, visible, baseIndex);
            }
        }
    });
    renderThreadList();
    if (window.matchMedia('(max-width: 980px)').matches) window.toggleAiSidebar(false);
    const log2 = document.getElementById('chat-log');
    // Opening a saved conversation is destination navigation. Begin with its
    // first turn; live replies keep their separate follow-along behavior.
    if (log2) { log2.scrollTop=0; window.MatchAppActivatedScroll?.toStart(log2,{behavior:'auto'}); }
};

window.deleteThread = function (id, ev) {
    if (ev) ev.stopPropagation();
    saveThreads(loadThreads().filter(t => t.id !== id));
    if (currentThread && currentThread.id === id) window.startNewChat();
    else renderThreadList();
};

function renderThreadList() {
    const host = document.getElementById('chat-history-list');
    if (!host) return;
    const threads = loadThreads();
    if (!threads.length) {
        host.innerHTML = `<p class="chat-history-empty">${typeof t === 'function' ? t('chat.noHistory') : 'No saved conversations yet.'}</p>`;
        return;
    }
    host.innerHTML = threads.map(th => `
        <div class="chat-thread-item ${currentThread && currentThread.id === th.id ? 'active' : ''}" onclick="openThread('${th.id}')">
            <span class="chat-thread-title">${(th.title || 'Conversation').replace(/</g, '&lt;').slice(0, 60)}</span>
            <button class="chat-thread-del" onclick="deleteThread('${th.id}', event)" aria-label="Delete conversation">✕</button>
        </div>`).join('');
}

/* ---------- Bubble rendering ---------- */
function appendUserBubble(text) {
    const log = document.getElementById('chat-log');
    if (!log) return;
    const div = document.createElement('div');
    div.className = 'chat-bubble chat-user';
    div.textContent = text;
    log.appendChild(div);
    return div;
}

function appendAssistantBubble(text, results, opts) {
    const log = document.getElementById('chat-log');
    if (!log) return null;
    const wrap = document.createElement('div');
    wrap.className = 'chat-bubble chat-assistant';
    wrap.dataset.guestShareEligible = opts?.instant ? '0' : '1';

    const row = document.createElement('div');
    row.className = 'chat-answer-row';

    const avatar = document.createElement('img');
    avatar.className = 'chat-avatar';
    avatar.src = '/assets/brand/matchapp-ai-orbit-fullbleed.svg?v=1';
    avatar.alt = '';
    avatar.width = 34;
    avatar.height = 34;
    row.appendChild(avatar);

    const p = document.createElement('p');
    p.className = 'chat-answer-text';
    row.appendChild(p);

    const speak = document.createElement('button');
    speak.className = 'discover-speak';
    const playbackLabel = typeof t === 'function' ? t('discover.readAloud') : 'Read answer aloud';
    speak.title = playbackLabel || 'Read answer aloud';
    speak.setAttribute('aria-label', playbackLabel || 'Read answer aloud');
    speak.innerHTML = "<svg viewBox=\"0 0 48 48\" width=\"30\" height=\"30\" aria-hidden=\"true\" focusable=\"false\">\r\n                            <path d=\"M8,20 Q4,24 8,28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" opacity=\"0.55\"/>\r\n                            <path d=\"M3,17 Q-3,24 3,31\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" opacity=\"0.3\"/>\r\n                            <path d=\"M40,20 Q44,24 40,28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" opacity=\"0.55\"/>\r\n                            <path d=\"M45,17 Q51,24 45,31\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" opacity=\"0.3\"/>\r\n                            <rect x=\"18\" y=\"6\" width=\"12\" height=\"21\" rx=\"6\" fill=\"currentColor\"/>\r\n                            <path d=\"M13,21 a11,11 0 0 0 22,0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\"/>\r\n                            <line x1=\"24\" y1=\"32\" x2=\"24\" y2=\"38\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\"/>\r\n                            <line x1=\"17\" y1=\"38\" x2=\"31\" y2=\"38\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\"/>\r\n                        </svg>";
    speak.onclick = () => window.readAloud(text, speak);
    row.appendChild(speak);

    wrap.appendChild(row);

    const grid = document.createElement('div');
    grid.className = 'chat-results-grid';
    wrap.appendChild(grid);
    placeDiscoverComposer(wrap,grid);

    log.appendChild(wrap);
    // One visible guest prompt at the TOP of newly generated AI answers.
    // History re-renders and uncharged instant refusals do not grant rewards.
    if (!opts?.instant) window.MatchAppGuestShare?.decorateAiBubble?.(wrap);

    if (opts && opts.instant) p.textContent = text;
    return { wrap, textEl: p, grid, speakBtn: speak };
}

async function renderResultsInto(grid, items, baseIndex, options = {}) {
    await window.matchPolicy?.ready();
    if (!Array.isArray(items)||grid.isConnected===false) return [];
    if(items.length && items.every(item=>item._musicVideoId)) {
        grid.replaceChildren();
        for(const item of items)await window.MatchAppMusicReleases?.paintCard(item._musicVideoId,grid,true);
        return items;
    }
    // Preserve action identity when source enrichment rejects another card.
    const cardIndexes = new Map(items.map((item, i) => [item, baseIndex + i]));
    // History and explicit lookups can paint known original art immediately.
    // Automatic recommendations must reserve the resolved identity first.
    const known = options.fresh===true ? [] : items.filter(item => item?._catalogMedia && (options.allowKnown===true||!isDiscoverDisliked(item)) && enrichDiscoverItem(item, lastDiscoverQuestion));
    if (known.length) {
        grid.innerHTML = known.map(it => discoverCardHTML({...it, platform:'', _availabilityVerified:false, _viewing:null}, cardIndexes.get(it))).join('');
        grid.style.display = 'grid';
    }
    if(options.prepared===true)items=items.filter(item=>item&&item.title&&!isDiscoverDisliked(item));
    else if(options.fresh===true)items=await prepareDiscoverRecommendations(items,lastDiscoverQuestion,()=>grid.isConnected!==false);
    else items = (await Promise.all(items.filter(item => item && item.title)
        .map(item => enrichDiscoverMedia(item))))
        .map(item => enrichDiscoverItem(item, lastDiscoverQuestion))
        .filter(item => item && item.title && (options.allowKnown===true||!isDiscoverDisliked(item)));
    if(grid.isConnected===false)return [];
    const seen=new Set();
    items=items.filter(item=>{
        const keys=window.matchPolicy?.identityKeys?.(item)||new Set([titleKey(item.title)]);
        if([...keys].some(key=>seen.has(key)))return false;
        keys.forEach(key=>seen.add(key));return true;
    });
    grid.replaceChildren();
    if (!items || !items.length) return [];
    grid.innerHTML = items.map((it, i) => discoverCardHTML(it, cardIndexes.get(it))).join('');
    grid.style.display = 'grid';
    if(options.fresh===true)items.forEach(item=>{
        const identity={...item,posterUrl:discoverPosterUrl(item)||discoverFallbackPoster(item),
            streamUrl:discoverWatchUrl(item),reason:'Ask AI'};
        window.MatchActivity?.log?.('ai',item.title,{source:'ask-ai',posterUrl:identity.posterUrl});
        window.matchPolicy?.remember?.(identity,'ai');
    });
    await Promise.all(items.map((it, i) => hydrateDiscoverCard(it, cardIndexes.get(it))));
    items.forEach((it, i) => {
        if (it.synopsis) return;
        const syn = document.querySelector(`[data-discover-idx="${cardIndexes.get(it)}"] .discover-synopsis`);
        if (syn && !syn.textContent.trim()) syn.textContent = it.synopsis || '';
    });
    await attachRelated(grid, items, baseIndex);
    return items;
}

async function releaseDiscoverClaims(items) {
    await Promise.allSettled((items||[]).map(item=>window.matchPolicy?.releaseClaim?.(item)));
}

async function prepareDiscoverRecommendations(items,question,active=()=>true) {
    await window.matchPolicy?.ready?.();
    if(!active())return [];
    const sourceRows=await Promise.all((items||[]).filter(item=>item&&item.title&&!isDiscoverDisliked(item,true))
        .map(item=>Promise.resolve().then(()=>enrichDiscoverMedia(item)).catch(()=>null)));
    if(!active())return [];
    const seen=new Set(),eligible=sourceRows.map(item=>enrichDiscoverItem(item,question)).filter(item=>{
        if(!item||!item.title||isDiscoverDisliked(item,true))return false;
        const keys=window.matchPolicy?.identityKeys?.(item)||new Set([titleKey(item.title)]);
        if([...keys].some(key=>seen.has(key)))return false;
        keys.forEach(key=>seen.add(key));return true;
    });
    const accepted=[];
    for(const item of eligible){
        if(!active()){await releaseDiscoverClaims(accepted);return [];}
        const won=window.matchPolicy?.claim?await window.matchPolicy.claim(item):!isDiscoverDisliked(item,true);
        if(won)accepted.push(item);
        if(!active()){await releaseDiscoverClaims(accepted);return [];}
    }
    return accepted;
}

/* ---------- The main ask flow ---------- */
async function runAskAndRender(question, opts) {
    if (!question || !question.trim()) return;
    const voiceOrigin = !!opts?.voiceOrigin;
    const responseLanguage = window.MATCH_LANG || 'en';
    const requestVersion = discoverThreadVersion;
    question = question.trim();
    // Short greetings are conversation, not an entertainment title query.
    // Respond immediately, do not consume credits or query provider catalogues.
    const helloOnly=/^(?:hi|hello|hey|hey there|hi there|hola|olá|ola|oi|bom dia|boa tarde|boa noite|bonjour|salut|hallo|guten tag|ciao|buongiorno|merhaba|привет|здравствуйте|مرحبا|أهلا|नमस्ते|halo|hai|こんにちは|こんばんは|おはよう|안녕하세요|안녕|你好|您好)[\s!?.،。！]*$/iu;
    if(helloOnly.test(question)){
        const reply=window.MatchAppJonasLocale?.t?.('greeting')||"Hi, I'm Jonas. What would you like to discover?";
        if(!currentThread)currentThread={id:newThreadId(),title:question.slice(0,60),turns:[],createdAt:Date.now(),updatedAt:Date.now()};
        appendUserBubble(question);
        appendAssistantBubble(reply,[],{instant:true});
        currentThread.turns.push({role:'user',text:question,ts:Date.now()},{role:'assistant',text:reply,results:[],ts:Date.now()});
        currentThread.updatedAt=Date.now();persistCurrentThread();
        const empty=document.getElementById('discover-empty');if(empty)empty.style.display='none';
        if(voiceOrigin) {
            if(window.MatchAppJonasStage?.speak) window.MatchAppJonasStage.speak(reply,{autoListen:true});
            else window.MatchAppJonasSpeech?.speak?.(reply,window.MatchAppJonasLocale?.speech?.()||window.MATCH_LANG||'en',{});
        }
        return;
    }
    // Global MatchApp editorial policy: never use AI or provider lookups to
    // locate XXX/pornographic content, and never charge for that refusal.
    if (window.MatchAppContentSafety?.isPornographicRequest?.(question)) {
        appendUserBubble(question);
        const lang = String(window.MATCH_LANG || 'en');
        const answer = /^pt/.test(lang)
          ? 'O MatchApp não recomenda conteúdo pornográfico. Posso ajudar com revistas, livros, filmes e audiolivros convencionais.'
          : /^es/.test(lang)
          ? 'MatchApp no recomienda contenido pornográfico. Puedo ayudarte con revistas, libros, películas y audiolibros convencionales.'
          : 'MatchApp does not recommend pornographic or XXX content. I can help find mainstream magazines, books, films and audiobooks instead.';
        appendAssistantBubble(answer, [], { instant: true });
        return;
    }

    const loadEl = document.getElementById('discover-loading');
    const emptyEl = document.getElementById('discover-empty');
    if (emptyEl) emptyEl.style.display = 'none';

    // Verify allowance without spending it before contacting paid providers.
    // A failed or unusable AI response must never consume a guest or paid credit.
    if (typeof window.matchAllowanceBeforeLookup === 'function' && !(await window.matchAllowanceBeforeLookup('ask_ai'))) {
        const draft=document.getElementById('discover-new-input');
        if(requestVersion===discoverThreadVersion && responseLanguage===(window.MATCH_LANG||'en') && draft && !draft.value){
            draft.value=question;
            window.autoGrowComposer?.();
        }
        refreshAiWorkspaceStatus();
        return;
    }
    if(requestVersion!==discoverThreadVersion||responseLanguage!==(window.MATCH_LANG||'en'))return;
    refreshAiWorkspaceStatus();

    if (!currentThread) {
        currentThread = { id: newThreadId(), title: question.slice(0, 60), turns: [], createdAt: Date.now(), updatedAt: Date.now() };
    }
    const requestThread=currentThread;
    const currentRequest=()=>requestVersion===discoverThreadVersion&&currentThread===requestThread;
    let preparedRecommendations=null;
    let responseRevealed=false;
    const abandon=async()=>{
        if(!responseRevealed)await releaseDiscoverClaims(preparedRecommendations);
        finishAiWorkflow();
        if(loadEl)loadEl.style.display='none';
    };

    const userBubble=appendUserBubble(question);
    currentThread.turns.push({ role: 'user', text: question, ts: Date.now() });
    revealJonasTurn(userBubble);

    if (loadEl) {
        // One loading element, inside the conversation rather than below it.
        document.getElementById('chat-log')?.appendChild(loadEl);
        loadEl.style.display = 'block';
        startAiWorkflow();
    }

    // Pass prior turns so follow-ups keep context.
    const history = currentThread.turns
        .slice(0, -1)
        .map(t => ({ role: t.role, text: t.text }));

    const bookIntent = detectBookIntent(question);
    const cookingIntent = !!window.MatchCooking?.isCooking(question);
    const wantsTitleRecommendations = discoverRecommendationRequest(question);
    if(bookIntent&&wantsTitleRecommendations&&window.MatchAppReadingAI?.prepare){
        const prepared=await window.MatchAppReadingAI.prepare();
        if(!currentRequest()){await abandon();return;}
        if(prepared===false){
            await abandon();
            const message=window.t?.('ai.detailsRetry')||'Title details could not load. Please try again shortly.';
            appendAssistantBubble(message,[],{instant:true});
            requestThread.turns.push({role:'assistant',text:message,results:[],ts:Date.now()});
            requestThread.updatedAt=Date.now();persistCurrentThread();
            return;
        }
    }
    let payload, musicPayload, source = 'ai', cookingUnavailable = false;
    try {
        // Documentary television-series requests require a real TV genre and
        // country-specific provider listing. Never bill or display prose-only
        // AI guesses as if they were verified programme recommendations.
        if (window.MatchAppVerifiedDocumentaries?.matches?.(question)) {
            payload = await window.MatchAppVerifiedDocumentaries.resolve(question, {
                lang: window.MATCH_LANG || 'en',
                country: window.MatchAppCatalogMedia?.regionCode?.() || localStorage.getItem('match_user_country') || ''
            });
            source = 'verified-documentary-series';
        } else {
            musicPayload = await window.MatchAppMusicReleases?.query(question, history);
            if (musicPayload) payload = musicPayload;
            else payload = await askAIConversational(question, history);
        }
    }
    catch (e) { cookingUnavailable = cookingIntent; payload = cookingIntent ? {answer: window.MatchAppBooksLocale?.t?.('ui.cookingUnavailable') || (/^pt/i.test(window.MATCH_LANG||'') ? 'A IA está indisponível agora. Explore abaixo as receitas e os vídeos originais dos criadores.' : 'AI is unavailable right now. Explore the original cooking sources and videos below.'), results:[], _live:false} : await fallbackSearch(question, !!e.aiUnavailable, opts?.landingContext); source = 'fallback'; }
    if(!currentRequest()){await abandon();return;}

    // Final bounded recovery: if AI parsing, the Edge Function, or the keyless
    // provider returns nothing, reuse the reviewed local catalogue under the
    // exact same policy. This adds no polling/observers and cannot loosen the
    // user's genre/taste exclusions.
    // A perfectly good conversational AI reply may have zero title cards.
    // Never overwrite its answer with an unrelated film-catalogue fallback.
    if (!bookIntent && !cookingIntent && wantsTitleRecommendations && !musicPayload &&
        !payload?._docVerified &&
        (!payload?._live || !String(payload.answer || '').trim()) &&
        (!Array.isArray(payload?.results) || payload.results.length === 0)) {
        const local = catalogFallbackForQuestion(question, opts?.landingContext);
        if (local.length) {
            payload = payload || {};
            payload.results = local;
            payload._live = false;
            source = source === 'ai' ? 'catalog-recovery' : source + '+catalog';
            const offlineNote = (typeof t === 'function') ? t('discover.offlineNote') : "Our AI concierge is temporarily offline, so here's what our catalog found for you:";
            payload.answer = `${offlineNote} “${question}”`;
        }
    }
    // Defense in depth: a prompt restriction alone cannot guarantee the
    // model won't return an explicit item; filter it before any UI/history use.
    if (payload) {
        payload.results = window.MatchAppContentSafety?.safeEntries?.(payload.results || []) || (payload.results || []);
        if (window.MatchAppContentSafety?.isExplicit?.(payload.answer)) {
            payload.answer = 'I can help with mainstream entertainment, books and magazines, but not pornographic content.';
            payload.results = [];
        }
    }
    // Only audiovisual cards may enter film match history. Books and recipes
    // have separate, verified discovery destinations and are not film matches.
    if (payload && (bookIntent || cookingIntent)) payload.results = [];
    lastDiscoverQuestion = question;

    // Same unconditional safety net as the match engine: no matter which
    // upstream path produced this, raw JSON-looking text can never reach
    // the chat bubble.
    if (typeof window.sanitizeDisplayText === 'function' && payload && payload.answer) {
        payload.answer = window.sanitizeDisplayText(payload.answer, ['answer', 'synopsis', 'text']);
    }

    // A completed old-language response must not be shown, spoken or charged
    // after the person changes the app language while the request is pending.
    if (responseLanguage !== (window.MATCH_LANG || 'en')) {
        await abandon();
        appendAssistantBubble(window.t('ai.languageChanged'), [], {instant:true});
        const field=document.getElementById('discover-new-input');
        if(field&&!field.value)field.value=question;
        return;
    }

    // Resolve and reserve automatic title recommendations before charging,
    // displaying their prose or starting speech. Deliberate source lookups,
    // editorial videos and the separate reading/cooking flows remain usable.
    if(wantsTitleRecommendations&&!bookIntent&&!cookingIntent&&!musicPayload){
        await window.matchPolicy?.ready?.();
        if(!currentRequest()){await abandon();return;}
        const priorKeys=new Set(window.matchPolicy?.known?.()||[]);
        discoverExcludedTitles(Infinity,Infinity).forEach(title=>priorKeys.add((window.matchPolicy?.key||titleKey)(title)));
        let candidates=(payload.results||[]).filter(item=>item&&item.title);
        if(payload?._live===true){
            const identified=await Promise.resolve().then(()=>window.MatchAppJonasTitlePresentation?.fromAnswers
                ?window.MatchAppJonasTitlePresentation.fromAnswers(payload.answer,3)
                :Promise.resolve(window.MatchAppJonasTitlePresentation?.fromAnswer?.(payload.answer)).then(item=>[item])).catch(()=>[]);
            if(!currentRequest()){await abandon();return;}
            const seen=new Set();
            candidates=[...(identified||[]),...candidates].filter(item=>{
                if(!item?.title)return false;
                const key=titleKey(item.title);if(seen.has(key))return false;seen.add(key);return true;
            });
        }
        preparedRecommendations=await prepareDiscoverRecommendations(candidates,question,currentRequest);
        if(!currentRequest()){await abandon();return;}
        const blockedProse=discoverAnswerContainsExcludedTitle(payload.answer,priorKeys);
        if(preparedRecommendations.length!==candidates.length||blockedProse){
            payload.answer=discoverRecommendationSummary(preparedRecommendations,responseLanguage);
            payload._preferenceFiltered=true;
        }
        payload.results=preparedRecommendations;
        // A response with no fresh title should not consume a recommendation
        // credit just because another device won its identity reservation.
        payload._noNewRecommendations=preparedRecommendations.length===0;
    }
    if(!currentRequest()){await abandon();return;}
    if(responseLanguage!==(window.MATCH_LANG||'en')){await abandon();return;}

    // Only a verified, successful live answer earns a debit. Offline source
    // fallbacks and transport/JSON failures remain free.
    if (payload?._live === true && !payload._noNewRecommendations && String(payload.answer || '').trim() &&
        typeof checkDailyLimit === 'function' && !(await checkDailyLimit('ask_ai'))) {
        await abandon();
        if(!currentRequest())return;
        await refreshAiWorkspaceStatus();
        appendAssistantBubble((typeof window.t === 'function' ? window.t('credits.retry') : '') ||
            'Your allowance changed while the answer was generated. No result was charged; try again.', [], { instant:true });
        return;
    }
    if(!currentRequest()||responseLanguage!==(window.MATCH_LANG||'en')){await abandon();return;}
    // The successful debit above remains authoritative. Repainting the badge
    // must not add another quota network roundtrip before showing/speaking it.
    void refreshAiWorkspaceStatus();

    // Routed through the shared track() helper so this reaches GTM's
    // dataLayer — a direct gtag() call is a no-op under a GTM container.
    if (typeof window.track === 'function') {
        window.track('ai_search', { search_term: question, source: source, results: (payload.results || []).length });
    }

    try {
        window.MatchActivity?.log?.('ai', question);
    } catch (_) {}

    if (loadEl) {
        finishAiWorkflow();
        setTimeout(() => { loadEl.style.display = 'none'; }, 220);
    }

    const offlineBadge = document.getElementById('discover-offline-badge');
    if (offlineBadge) offlineBadge.style.display = payload._live || musicPayload || payload?._docVerified ? 'none' : 'inline-flex';

    const bubble = appendAssistantBubble(payload.answer, bookIntent ? [] : (payload.results || []), { instant: false });
    responseRevealed=!!bubble;
    if(responseRevealed)preparedRecommendations?.forEach(item=>window.matchPolicy?.remember?.({...item,reason:'Ask AI'},'ai'));
    if(payload?._live !== true && !musicPayload && !payload?._docVerified && bubble?.wrap){
        const notice=document.createElement('strong');
        notice.setAttribute('role','status');
        notice.textContent=window.matchRecoveryHeading?.() || 'TEMPORARY INTERRUPTION — PLEASE TRY AGAIN SHORTLY.';
        bubble.wrap.prepend(notice);
    }
    if(cookingIntent && bubble?.wrap){
      const sources=document.createElement('section');sources.className='cooking-chat-sources';sources.setAttribute('aria-label','Original cooking sources');
      const route=document.createElement('a');route.className='gold-btn';route.href='/cooking/?q='+encodeURIComponent(question);route.textContent=/^pt/i.test(window.MATCH_LANG||'')?'Explorar receitas e vídeos originais':/^es/i.test(window.MATCH_LANG||'')?'Explorar recetas y vídeos originales':/^fr/i.test(window.MATCH_LANG||'')?'Explorer les recettes et vidéos originales':/^de/i.test(window.MATCH_LANG||'')?'Originalrezepte und Videos ansehen':'Explore original recipes & videos';sources.append(route);
      if(window.MatchAppBooksLocale?.bind){
        window.MatchAppBooksLocale.bind(sources,'ui.cookingSources',null,'aria-label');
        const label=document.createElement('span');label.textContent=route.textContent;route.replaceChildren(label);
        window.MatchAppBooksLocale.bind(label,'ui.cookingBrowse');
      }
      window.MatchCooking.channels.forEach(c=>{const p=document.createElement('p'),a=document.createElement('a'),specialty=document.createElement('span');a.href=c.url;specialty.textContent=c.specialty;a.append(document.createTextNode(c.name+' · '),specialty);p.append(a);sources.append(p);if(window.MatchAppBooksLocale?.get?.('ui.cookingSpecialty.'+c.id)!==undefined)window.MatchAppBooksLocale.bind(specialty,'ui.cookingSpecialty.'+c.id);});bubble.wrap.append(sources);
    }
    // Only attach the exact numbered TMDB record returned from verified
    // lookup+credits. Plain AI prose and fuzzy title suggestions get no link.
    if(bubble?.wrap && (/^https:\/\/www\.themoviedb\.org\/movie\/\d+$/.test(payload?.verifiedSource||'') || payload?.verifiedSource==='https://www.ghibli.jp/works/chihiro/')) {
        const sourceLink=document.createElement('a');
        sourceLink.className='gold-btn discover-verified-source';
        sourceLink.href=payload.verifiedSource;
        sourceLink.target='_blank';
        sourceLink.rel='noopener noreferrer';
        sourceLink.textContent=discoverRecoveryText('sourceLink');
        bubble.wrap.appendChild(sourceLink);
    }
    if (bubble?.wrap && bookIntent) {
        const route = document.createElement('a');
        const readingFormat = window.MatchAppReadingAI?.intent?.(question) || 'ebook';
        route.href = '/?reading=' + encodeURIComponent(readingFormat) + '#ebook-matcher-root';
        route.className = 'gold-btn discover-book-matcher-link';
        route.textContent = discoverRecoveryText('readingLink');
        route.setAttribute('aria-label', route.textContent);
        if(window.MatchAppBooksLocale?.bind){
            const label=document.createElement('span');label.textContent=route.textContent;route.replaceChildren(label);
            window.MatchAppBooksLocale.bind(label,'ui.verifyReading');
            window.MatchAppBooksLocale.bind(route,'ui.verifyReading',null,'aria-label');
        }
        bubble.wrap.appendChild(route);
        if(wantsTitleRecommendations&&window.MatchAppReadingAI?.renderFresh){
            await window.MatchAppReadingAI.renderFresh(question,bubble.wrap,{current:()=>currentRequest()&&responseLanguage===(window.MATCH_LANG||'en')});
            if(!currentRequest()||responseLanguage!==(window.MATCH_LANG||'en')){await abandon();return;}
            // Reading claims may be won by another device after the prompt was
            // sent. Narrate only the source cards this response actually owns.
            const accepted=[...bubble.wrap.querySelectorAll('.reading-ai-card h4')].map(heading=>({title:heading.textContent.trim()}));
            payload.answer=discoverRecommendationSummary(accepted,responseLanguage);
            bubble.textEl.textContent=payload.answer;
            bubble.speakBtn.onclick=()=>window.readAloud(payload.answer,bubble.speakBtn);
        }else window.MatchAppReadingAI?.render?.(question,bubble.wrap,{allowKnown:true});
    }

    // Reveal the beginning of the response inside the chat pane once.
    if (bubble?.wrap) revealJonasTurn(bubble.wrap);

    if (bubble) {
        // Start voice as soon as the answer arrives, not after ~1.3 seconds of
        // decorative typewriter delay. Follow the actual playback progress in
        // the transcript; the voice stage alone owns post-speech mic rearming.
        if (voiceOrigin && String(payload.answer || '').trim()) {
            const narration=window.MatchAppJonasNarration;
            if (window.MatchAppJonasStage?.speak) {
                const ambient = window.top !== window &&
                    new URLSearchParams(location.search).get('ambient') === '1';
                const fullReply = String(payload.answer || '').trim();
                // The card and entire answer appear immediately. For floating
                // voice turns, speak a short natural excerpt instead of waiting
                // for cloud synthesis of a 650-character monologue.
                let audibleReply = fullReply;
                if (ambient && fullReply.length > 280) {
                    const first = fullReply.slice(0,280).replace(/\s+/g,' ');
                    const endings = [first.lastIndexOf('. '),first.lastIndexOf('! '),first.lastIndexOf('? ')];
                    const last = Math.max(...endings);
                    audibleReply = last >= 110 ? first.slice(0,last+1) : first;
                }
                const transcript=narration?.prepare?.(bubble.textEl,fullReply,ambient?audibleReply.length:650);
                window.MatchAppJonasStage.speak(audibleReply,{
                    autoListen:true,
                    onProgress:p=>narration?.advance?.(p,transcript),
                    onComplete:()=>narration?.finish?.(transcript)
                }).catch(()=>narration?.finish?.(transcript));
            } else {
                bubble.textEl.textContent=payload.answer;
                window.readAloud(payload.answer, bubble.speakBtn);
            }
        } else {
            // The compact Jonas overlay behaves like a live conversation:
            // show the finished reply at once, without a per-character delay.
            const ambient = window.top !== window &&
                new URLSearchParams(location.search).get('ambient') === '1';
            if (ambient) bubble.textEl.textContent = payload.answer;
            else await typewriterReveal(bubble.textEl,payload.answer,8);
            revealJonasTurn(bubble.wrap);
        }
    }

    if(!currentRequest()){await abandon();return;}
    if(cookingUnavailable && bubble?.textEl)window.MatchAppBooksLocale?.bind?.(bubble.textEl,'ui.cookingUnavailable');
    const baseIndex = DISCOVER_ITEMS.length;
    let newItems = preparedRecommendations!==null?preparedRecommendations:(bookIntent ? [] : (payload.results || []))
        .filter(item => item && item.title && (!wantsTitleRecommendations||!isDiscoverDisliked(item, true)));
    if (preparedRecommendations===null && !bookIntent && wantsTitleRecommendations && !newItems.length && !musicPayload &&
        !payload?._live && window.matchPolicy && !payload?._docVerified && typeof CONTENT_CATALOG !== 'undefined') {
        newItems = CONTENT_CATALOG
            .filter(e => e && e.title && !isDiscoverDisliked(e, true) && window.matchPolicy.fitsQuestion(e, question))
            .filter(e => !opts?.landingContext ||
                ((typeof window.tasteAllowsEntry !== 'function' || window.tasteAllowsEntry(e)) &&
                 window.MatchAppLandingIntent?.allowsFallback?.(opts.landingContext, e)))
            .slice(0, 6)
            .map(e => enrichDiscoverItem({
                title: e.title, year: e.year || '', type: (e.cats && e.cats[0]) || '',
                platform: e.platform || '', synopsis: e.synopsis || '', cats: e.cats, moods: e.moods,
                watchUrl: e.watchUrl || ''
            }, question))
            .filter(Boolean);
    }
    DISCOVER_ITEMS = DISCOVER_ITEMS.concat(newItems);
    if (bubble && newItems.length) {
        try {
            newItems=await renderResultsInto(bubble.grid, newItems, baseIndex, {fresh:wantsTitleRecommendations,prepared:preparedRecommendations!==null,allowKnown:!wantsTitleRecommendations})||[];
        } catch (cardError) {
            // A metadata/poster rendering failure is not an AI-answer failure.
            // Keep the response and credit state; a later turn remains usable.
            console.warn('[MatchApp Ai] Title card presentation interrupted:', cardError);
            const note = document.createElement('p');
            note.setAttribute('role', 'status');
            note.className = 'discover-card-recovery';
            note.textContent = window.t?.('ai.detailsRetry') || 'Title details could not load. Please try again shortly.';
            bubble.grid.replaceChildren(note);
        }
    }

    if(!currentRequest()){await abandon();return;}
    requestThread.turns.push({ role: 'assistant', text: payload.answer, results: newItems, ts: Date.now() });
    requestThread.updatedAt = Date.now();
    persistCurrentThread();
    refreshAiWorkspaceStatus();

    // Do not jump to the composer after typing. It remains visible below
    // the conversation and the person keeps their reading position.
}

// The button, keyboard and voice can submit the same question together.
 // Keep one allowance debit and one answer in flight on this page at a time.
let askInFlight = null;
function askAndRender(question, opts) {
    question=String(question||'').trim();
    if(!question)return Promise.resolve();
    if (askInFlight) {
        // Duplicate button/keyboard/voice delivery shares the original debit.
        // A different follow-up must wait, not disappear while its text is
        // cleared by the composer or the previous reply finishes its cards.
        if(askInFlight.question===question)return askInFlight;
        const queuedVersion=discoverThreadVersion,queuedLanguage=window.MATCH_LANG||'en';
        const voiceOrigin=opts?.voiceOrigin===true||
            (!!window.MatchAppVoiceOrigin?.consume&&window.MatchAppVoiceOrigin.consume(question));
        return askInFlight.then(()=>{
            if(queuedVersion!==discoverThreadVersion||queuedLanguage!==(window.MATCH_LANG||'en'))return null;
            return askAndRender(question,{...opts,voiceOrigin,queuedSubmission:true});
        });
    }
    const landingContext = window.MatchAppLandingIntent?.capture?.(question) || null;
    // Only the original submission owns its composer text. Queue continuations
    // must not clear a newer draft, even when it repeats the queued question.
    if(!opts?.queuedSubmission){
        const input=document.getElementById('discover-new-input');
        if(input&&input.value.trim()===question){input.value='';window.autoGrowComposer?.();}
    }
    const requestVersion=discoverThreadVersion,requestLanguage=window.MATCH_LANG||'en';
    const replyCount = document.querySelectorAll('#chat-log .chat-assistant').length;
    const markedVoice = opts?.voiceOrigin === true ||
        (!!window.MatchAppVoiceOrigin?.consume && window.MatchAppVoiceOrigin.consume(question));
    const running = Promise.resolve().then(() => {
        if(requestVersion!==discoverThreadVersion||requestLanguage!==(window.MATCH_LANG||'en'))return null;
        return runAskAndRender(question, { voiceOrigin: markedVoice, landingContext });
    }).catch(error => {
        if(requestVersion!==discoverThreadVersion||requestLanguage!==(window.MATCH_LANG||'en')){finishAiWorkflow();return null;}
        // Rendering and voice failures must not be misreported as a failed AI
        // request after the answer has already appeared in the conversation.
        console.warn('[MatchApp Ai] Request interrupted:',error?.message||error);
        finishAiWorkflow();
        const loading=document.getElementById('discover-loading');
        if(loading)loading.style.display='none';
        const replies=document.querySelectorAll('#chat-log .chat-assistant');
        if(replies.length>replyCount){
            const text=replies[replies.length-1]?.querySelector('.chat-answer-text')?.textContent?.trim();
            if(text&&currentThread?.turns?.at(-1)?.role==='user'){
                currentThread.turns.push({role:'assistant',text,results:[],ts:Date.now()});
                currentThread.updatedAt=Date.now();
                persistCurrentThread();
            }
            return null;
        }
        const input=document.getElementById('discover-new-input');
        if(input && !input.value)input.value=question;
        window.autoGrowComposer?.();
        window.showToast?.('Ask AI could not complete this request. Your question is ready to retry.',true,{recovery:true});
        return null;
    });
    running.question=question;
    askInFlight = running;
    running.finally(() => {
        if (askInFlight === running) askInFlight = null;
    }).catch(() => {}); // The caller's promise retains the original error.
    return running;
}

/* ---------- Auto-growing composer ----------
   The ask field is a textarea now, so it has to be resized manually: reset to
   auto first (otherwise it can only ever grow, never shrink back), then match
   the content height up to the CSS max, after which it scrolls. Exposed on
   window so voice dictation can trigger a resize as words stream in. */
window.autoGrowComposer = function () {
    const el = document.getElementById('discover-new-input');
    if (!el) return;
    el.style.height = 'auto';
    const max = 190;
    const next = Math.min(el.scrollHeight, max);
    el.style.height = next + 'px';
    const wrap = el.closest('.composer');
    if (wrap) wrap.classList.toggle('is-tall', el.scrollHeight > max);
};

function initComposer() {
    const el = document.getElementById('discover-new-input');
    if (!el) return;

    el.addEventListener('input', window.autoGrowComposer);

    el.addEventListener('keydown', (e) => {
        // Enter sends, Shift+Enter makes a new line. IME composition must be
        // left alone or Enter would submit mid-word in Japanese, Korean and
        // Chinese input, where Enter is how you accept a candidate.
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            window.newDiscoverSearch();
        }
    });

    window.autoGrowComposer();
}
document.addEventListener('DOMContentLoaded', initComposer);

window.newDiscoverSearch = function () {
    const el = document.getElementById('discover-new-input');
    const hint = document.getElementById('discover-compose-help');
    const question = el?.value?.trim() || '';
    if (!question) {
        // A tap on the real chat's Send button must never appear broken.
        // Prompt visibly, but do not focus the input or open the keyboard.
        if (hint) {
            if (!hint.dataset.initialCopy) hint.dataset.initialCopy = hint.textContent || '';
            hint.dataset.error = '1';
            hint.textContent = discoverRecoveryText('emptyHint');
        }
        return false;
    }
    if (hint) {
        delete hint.dataset.error;
        if (hint.dataset.initialCopy) hint.textContent = hint.dataset.initialCopy;
    }
    // Closing the Android soft keyboard before results resize the page avoids
    // the viewport pulling the follow-up composer down into the footer.
    if (el && document.activeElement === el &&
        (window.MATCHAPP_ANDROID || /MatchAppAiAndroid\//i.test(navigator.userAgent || ''))) {
        el.blur();
    }
    askAndRender(question);
    // This Send owns the submitted text; later queue execution does not.
    el.value = '';
    window.autoGrowComposer();
    return true;
};

/* ---------- Boot ---------- */
async function showMusicVideoInfoCard(id) {
    const release = await window.MatchAppMusicReleases?.get(id);
    if (!release) return false;
    for (const name of ['discover-empty', 'discover-loading']) {
        const el = document.getElementById(name); if (el) el.style.display = 'none';
    }
    const title = release.artist + ' — ' + release.title;
    if (!currentThread) currentThread = { id: newThreadId(), title: title.slice(0, 60), turns: [], createdAt: Date.now(), updatedAt: Date.now() };
    const text = window.MatchAppMusicReleases.intro(release);
    const bubble = appendAssistantBubble(text, [], { instant: true });
    if (bubble) {
        bubble.wrap.dataset.musicVideoId = id;
        await window.MatchAppMusicReleases.paintCard(id, bubble.grid);
    }
    currentThread.turns.push({ role: 'assistant', text, results: [], musicVideoId: id, ts: Date.now() });
    currentThread.updatedAt = Date.now(); persistCurrentThread();
    document.title = title + ' — MatchApp Ai Concierge';
    if (bubble?.wrap) revealJonasTurn(bubble.wrap);
    return true;
}

async function showTitleInfoCard(titleName) {
    titleName = String(titleName || '').trim();
    if (!titleName) return;
    await window.matchPolicy?.ready();

    const emptyEl = document.getElementById('discover-empty');
    const loadEl = document.getElementById('discover-loading');
    if (emptyEl) emptyEl.style.display = 'none';
    if (loadEl) loadEl.style.display = 'none';

    let item = enrichDiscoverItem(itemFromTitle(titleName), '') || itemFromTitle(titleName);
    item = await enrichDiscoverMedia(item);
    lastDiscoverQuestion = '';
    DISCOVER_ITEMS = [];

    if (!currentThread) {
        currentThread = { id: newThreadId(), title: item.title.slice(0, 60), turns: [], createdAt: Date.now(), updatedAt: Date.now() };
    }

    const intro = discoverLabel(
        'discover.titleCardIntro',
        "Here's {title} — spoiler-free synopsis, where to watch it, and when it started. Ask a follow-up if you want more."
    ).replace(/\{title\}/g, item.title);

    const bubble = appendAssistantBubble(intro, [item], { instant: true });
    DISCOVER_ITEMS = [item];
    if (bubble && bubble.grid) {
        const grid = bubble.grid;
        grid.innerHTML = discoverCardHTML(item, 0);
        grid.style.display = 'grid';
        await hydrateDiscoverCard(item, 0);
        await attachRelated(grid, [item], 0);
    }

    currentThread.turns.push({ role: 'assistant', text: intro, results: [item], ts: Date.now() });
    currentThread.updatedAt = Date.now();
    persistCurrentThread();

    if (typeof window.track === 'function') {
        window.track('title_info_card', { title: item.title, source: 'trending' });
    }
    const log = document.getElementById('chat-log');
    if (log) setTimeout(() => revealJonasTurn(log.lastElementChild),20);
}


async function showEventInfoCard(eventPath) {
    let path = '';
    try {
        const u = new URL(String(eventPath || ''), location.origin);
        if (u.origin === location.origin && u.pathname.startsWith('/events/')) path = u.pathname;
    } catch (_) {}
    if (!path) return false;

    const emptyEl = document.getElementById('discover-empty');
    const loadEl = document.getElementById('discover-loading');
    if (emptyEl) emptyEl.style.display = 'none';
    if (loadEl) loadEl.style.display = 'none';

    try {
        const response = await fetch(path, { credentials: 'same-origin' });
        if (!response.ok) return false;
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const hero = doc.querySelector('.event-detail-hero');
        const title = (doc.querySelector('h1')?.textContent || 'Event').trim();
        const image = hero?.querySelector('img')?.getAttribute('src') || '';
        const paras = [...(hero?.querySelectorAll('p') || [])].map(p => p.textContent.trim()).filter(Boolean);
        const meta = paras[0] || '';
        const copy = paras.find(p => p.length > 80) || paras[1] || '';
        const links = [...doc.querySelectorAll('.global-event-links a[href]')]
            .map(a => ({ label: a.textContent.trim(), href: a.getAttribute('href') || '' }))
            .filter(x => /^https:\/\//.test(x.href));
        let preview = doc.querySelector('iframe[src*="youtube-nocookie.com/embed/"]')?.getAttribute('src') || '';
        if (!preview) {
            for (const link of links) {
                try {
                    const u = new URL(link.href);
                    const id = /(?:^|\.)youtube\.com$/.test(u.hostname) ? u.searchParams.get('v') : (u.hostname === 'youtu.be' ? u.pathname.slice(1) : '');
                    if (/^[A-Za-z0-9_-]{6,32}$/.test(id || '')) { preview = 'https://www.youtube-nocookie.com/embed/' + id; break; }
                } catch (_) {}
            }
        }

        if (!currentThread) {
            currentThread = { id: newThreadId(), title: title.slice(0, 60), turns: [], createdAt: Date.now(), updatedAt: Date.now() };
        }

        const intro = [title, meta, copy].filter(Boolean).join(' — ');
        const bubble = appendAssistantBubble(intro, [], { instant: true });
        if (bubble?.grid) {
            const grid = bubble.grid;
            grid.style.display = 'grid';
            grid.innerHTML = `
                <article class="discover-event-card">
                    ${image ? `<img src="${escapeDiscoverHtml(image)}" alt="${escapeDiscoverHtml(title)}" loading="eager">` : ''}
                    <div>
                        <p style="color:#E5C158;font-weight:900;margin:0 0 8px">EVENT</p>
                        <h2>${escapeDiscoverHtml(title)}</h2>
                        ${meta ? `<p class="discover-event-meta">${escapeDiscoverHtml(meta)}</p>` : ''}
                        ${copy ? `<p class="discover-event-copy">${escapeDiscoverHtml(copy)}</p>` : ''}
                        ${preview ? `<iframe class="discover-event-preview" src="${escapeDiscoverHtml(preview)}" title="${escapeDiscoverHtml(title)} preview" loading="lazy" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>` : ''}
                        <div class="discover-event-actions"></div>
                    </div>
                </article>`;
            const actions = grid.querySelector('.discover-event-actions');
            if (actions) {
                const page = document.createElement('a');
                page.href = path;
                page.textContent = 'Open event page';
                actions.appendChild(page);
                links.slice(0, 8).forEach(link => {
                    const a = document.createElement('a');
                    a.href = link.href;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.textContent = link.label || 'Official link';
                    actions.appendChild(a);
                });
                const save = document.createElement('button');
                save.type = 'button';
                save.textContent = 'Save event';
                save.addEventListener('click', () => {
                    try {
                        const key = 'match_savedEvents';
                        const rows = JSON.parse(localStorage.getItem(key) || '[]');
                        const list = Array.isArray(rows) ? rows : [];
                        if (!list.some(x => x && x.path === path)) list.unshift({ title, path, image, savedAt: Date.now() });
                        localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
                        window.showToast?.('Event saved.');
                    } catch (_) {}
                });
                actions.appendChild(save);
            }
        }

        currentThread.turns.push({ role: 'assistant', text: intro, results: [], event: { title, path, meta, copy, links }, ts: Date.now() });
        currentThread.updatedAt = Date.now();
        persistCurrentThread();
        refreshAiWorkspaceStatus();
        window.__MATCHAPP_EVENT_RENDERED = true;
        document.title = `${title} — MatchApp Ai Concierge`;
        const input = document.getElementById('discover-new-input');
        if (input) input.placeholder = `Ask a follow-up about ${title}…`;
        const log = document.getElementById('chat-log');
        if (log) setTimeout(() => revealJonasTurn(log.lastElementChild),20);
        return true;
    } catch (_) {
        return false;
    }
}

async function runDiscovery() {
    renderThreadList();
    const musicVideoId = getQueryParam('video').trim();
    const title = getQueryParam('title').trim();
    const eventPath = getQueryParam('event').trim();
    const q = getQueryParam('q').trim();
    const forceNew = getQueryParam('new') === '1';
    const loadEl = document.getElementById('discover-loading');
    const emptyEl = document.getElementById('discover-empty');

    // The homepage Ai wordmark is an explicit "new chat" action.
    // A fresh page normally starts with currentThread=null anyway, but this
    // makes that contract deliberate and future-proof if navigation becomes
    // client-side later. No credit is consumed until the user actually asks.
    if (forceNew) {
        currentThread = null;
        DISCOVER_ITEMS = [];
        const log = document.getElementById('chat-log');
        if (log) { parkDiscoverComposer(); log.innerHTML = ''; }
        history.replaceState(null, '', '/discover.html');
    }

    if (musicVideoId && await showMusicVideoInfoCard(musicVideoId)) return;

    if (eventPath) {
        if (loadEl) loadEl.style.display = 'none';
        const shown = await showEventInfoCard(eventPath);
        if (shown) return;
        try { location.href = new URL(eventPath, location.origin).pathname; } catch (_) {}
        return;
    }

    if (title) {
        document.title = `${title} — MatchApp Ai Concierge`;
        if (loadEl) loadEl.style.display = 'none';
        await showTitleInfoCard(title);
        return;
    }

    if (!q) {
        if (loadEl) loadEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
        window.MatchAppLandingIntent?.apply();
        return;
    }
    document.title = `${q} — MatchApp Ai Concierge`;
    if (loadEl) loadEl.style.display = 'none';
    await askAndRender(q, {voiceOrigin: getQueryParam('from') === 'jonas'});
    const log=document.getElementById('chat-log');
    if(log){log.hidden=false;log.style.display='flex';revealJonasTurn(log.lastElementChild);}
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(runDiscovery, 40); });
