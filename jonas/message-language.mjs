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
    ko: ['안녕하세요', '안녕', '감사합니다'], zh: ['你好', '您好', '谢谢']
};
const toApp = code => code === 'pt' ? 'pt-BR' : code;
const greetings = new Map(Object.entries(shortPhrases).flatMap(([code, values]) =>
    values.map(value => [value, toApp(code)])));

export async function detectMessageLanguage(message, fallback) {
    const text = String(message || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}'’]+/gu, ' ').trim();
    const exact = greetings.get(text);
    if (exact) return exact;
    if (!text || (!text.includes(' ') && !/[\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text))) return fallback;
    try {
        const {detectAll} = await import('./vendor/tinyld-1.3.4.mjs');
        const [first, second] = detectAll(text.slice(0, 600), {only: supported});
        if (!first || first.accuracy < 0.045 || (second && first.accuracy - second.accuracy < 0.012)) return fallback;
        return toApp(first.lang);
    } catch (_) {
        return fallback;
    }
}

if (typeof window !== 'undefined') window.MatchAppMessageLanguage = Object.freeze({detect: detectMessageLanguage});
