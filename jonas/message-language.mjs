/* Language identification for a single adult Jonas message. The model is loaded on demand. */
const supported = ['en', 'pt', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];
const shortPhrases = {
    en: ['hi', 'hey', 'hello', 'hi there', 'hey there', 'thank you', 'thanks', 'yes', 'good morning', 'good evening'],
    pt: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'obrigado', 'obrigada', 'sim'],
    es: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'gracias'],
    fr: ['bonjour', 'salut', 'merci', 'bonsoir', 'oui'],
    de: ['hallo', 'guten tag', 'guten morgen', 'danke'],
    it: ['ciao', 'buongiorno', 'buonasera', 'grazie'],
    tr: ['merhaba', 'selam', 'teşekkürler', 'evet'],
    ru: ['привет', 'здравствуйте', 'спасибо'],
    ar: ['مرحبا', 'مرحبًا', 'أهلا', 'شكرا'],
    hi: ['नमस्ते', 'धन्यवाद'], id: ['halo', 'terima kasih', 'selamat pagi'],
    ja: ['こんにちは', 'こんばんは', 'おはよう', 'ありがとう'],
    ko: ['안녕하세요', '안녕', '감사합니다'], zh: ['你好', '您好', '谢谢', '謝謝']
};
const toApp = code => code === 'pt' ? 'pt-BR' : code;
const greetings = new Map(Object.entries(shortPhrases).flatMap(([code, values]) =>
    values.map(value => [value, toApp(code)])));

// Han characters shared by both scripts (such as 你好) cannot identify a variant.
// These pairs distinguish common forms in conversational and entertainment queries.
const simplified = /[这说谢请问听语乐书剧电气么吗欢还进选场觉观让从为与个给网爱悬惊动导过点适线时长门风类节兴荐帮许关录国现预单简东环声华湾号讯页体对显视识该闻连图传镜]/gu;
const traditional = /[這說謝請問聽語樂書劇電氣麼嗎歡還進選場覺觀讓從為與個給網愛懸驚動導過點適線時長門風類節興薦幫許關錄國現預單簡東環聲華灣號訊頁體對顯視識該聞連圖傳鏡]/gu;
function chineseFallback(tag) {
    try {
        const locale = new Intl.Locale(String(tag).replace(/_/g, '-'));
        if (locale.language === 'zh') return locale.maximize().script === 'Hant' ? 'zh-TW' : 'zh';
    } catch (_) {}
    return null;
}
function chineseVariant(text, previous) {
    const tw = text.match(traditional)?.length || 0;
    const cn = text.match(simplified)?.length || 0;
    if (tw === cn) return previous;
    return tw > cn ? 'zh-TW' : 'zh';
}
export async function detectMessageLanguage(message, fallback) {
    const text = String(message || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}'’]+/gu, ' ').trim();

    const exact = greetings.get(text);
    if (exact === 'zh') return chineseVariant(text, chineseFallback(fallback) || 'zh');
    if (exact) return exact;
    const hasKana = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text);
    const hasHangul = /\p{Script=Hangul}/u.test(text);
    // Let the model handle mixed-language questions, e.g. an English question with a Korean title.
    const otherLetters = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Devanagari}]/u.test(text);
    if (!otherLetters && hasHangul && !hasKana) return 'ko';
    if (!otherLetters && hasKana && !hasHangul) return 'ja';
    const hasHan = /\p{Script=Han}/u.test(text);
    const previousChinese = hasHan ? chineseFallback(fallback) : null;
    const scriptHint = hasHan && !hasKana && !hasHangul ? chineseVariant(text, previousChinese) : null;
    if (previousChinese && !otherLetters && !hasKana && !hasHangul) return scriptHint;
    if (!text || (!text.includes(' ') && !/[\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text))) return fallback;
    try {
        const {detectAll} = await import('./vendor/tinyld-1.3.4.mjs');
        const [first, second] = detectAll(text.slice(0, 600), {only: supported});
        if (!first || first.accuracy < 0.045 || (second && first.accuracy - second.accuracy < 0.012)) return scriptHint || fallback;
        if (first.lang === 'zh') return scriptHint || 'zh';
        return toApp(first.lang);
    } catch (_) {
        return scriptHint || fallback;
    }
}

if (typeof window !== 'undefined') window.MatchAppMessageLanguage = Object.freeze({detect: detectMessageLanguage});
