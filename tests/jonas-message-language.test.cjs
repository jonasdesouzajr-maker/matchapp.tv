'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
test('Jonas messages detect all supported languages without reading the device or changing the UI', async () => {
    const {detectMessageLanguage} = await import('../jonas/message-language.mjs');
    const utterances = {
        en:'Who directed this film and when was it released?',
        'pt-BR':'Você pode me recomendar um filme para assistir hoje à noite?',
        es:'¿Qué película me recomiendas para ver esta noche?',
        fr:'Quel film me conseilles-tu de regarder ce soir ?',
        de:'Welchen Film kannst du mir für heute Abend empfehlen?',
        it:'Quale film mi consigli di guardare questa sera?',
        tr:'Bu akşam izlemek için bana hangi filmi önerirsin?',
        ru:'Какой фильм ты посоветуешь посмотреть сегодня вечером?',
        ar:'ما هو الفيلم الذي تنصحني بمشاهدته هذا المساء؟',
        hi:'आज शाम देखने के लिए आप कौन सी फिल्म सुझाएंगे?',
        id:'Film apa yang kamu rekomendasikan untuk saya tonton malam ini?',
        ja:'今夜見るのにおすすめの映画を教えてください。',
        ko:'오늘 저녁에 볼 만한 영화를 추천해 주세요.',
        zh:'你能推荐一部适合今天晚上观看的电影吗？'
    };
    for (const [lang, text] of Object.entries(utterances)) {
        assert.equal(await detectMessageLanguage(text, lang==='en'?'pt-BR':'en'),lang,text);
    }
    assert.equal(await detectMessageLanguage('Hey!', 'pt-BR'), 'en');
    assert.equal(await detectMessageLanguage('Bom dia!', 'en'), 'pt-BR');
    assert.equal(await detectMessageLanguage('Dune', 'pt-BR'), 'pt-BR');
    assert.equal(await detectMessageLanguage('2001', 'en'), 'en');
});
