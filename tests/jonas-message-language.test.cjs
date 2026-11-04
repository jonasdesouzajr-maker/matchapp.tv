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
        zh:'你能推荐一部适合今天晚上观看的电影吗？',
        'zh-TW':'可以推薦一部適合今天晚上看的電影嗎？'
    };
    for (const [lang, text] of Object.entries(utterances)) {
        assert.equal(await detectMessageLanguage(text, lang==='en'?'pt-BR':'en'),lang,text);
    }
    for (const tag of ['zh-TW','zh-Hant','zh_Hant_HK','zh-HK','zh-MO']) {
        assert.equal(await detectMessageLanguage('你好', tag), 'zh-TW', tag);
        assert.equal(await detectMessageLanguage('明天', tag), 'zh-TW', tag);
        assert.equal(await detectMessageLanguage('谢谢', tag), 'zh', tag);
    }
    assert.equal(await detectMessageLanguage('謝謝！', 'zh-CN'), 'zh-TW');
    assert.equal(await detectMessageLanguage('你好', 'zh-Hans-TW'), 'zh');
    assert.equal(await detectMessageLanguage('요즘 볼 만한 한국 드라마 추천해 줘', 'zh-TW'), 'ko');
    assert.equal(await detectMessageLanguage('映画を探しています', 'zh-TW'), 'ja');
    assert.equal(await detectMessageLanguage('Hey!', 'pt-BR'), 'en');
    assert.equal(await detectMessageLanguage('Bom dia!', 'en'), 'pt-BR');
    assert.equal(await detectMessageLanguage('Dune', 'pt-BR'), 'pt-BR');
    assert.equal(await detectMessageLanguage('2001', 'en'), 'en');
});

test('the tablet microphone stops on a second tap and ignores a late transcript', () => {
    const {JSDOM} = require('jsdom');
    const fs = require('node:fs');
    const dom = new JSDOM('<textarea id="discover-new-input"></textarea><button id="mic-btn-discover"></button>', {url:'https://matchapp.tv/discover.html', runScripts:'outside-only'});
    try {
        const w=dom.window, calls=[];
        w.MatchAppNativeVoice={start:()=>calls.push('start'),stop:()=>calls.push('stop')};
        w.eval(fs.readFileSync(require.resolve('../voice-input.js'),'utf8'));
        w.initVoiceInput('discover-new-input','mic-btn-discover',()=>calls.push('submit'));
        const mic=w.document.getElementById('mic-btn-discover');
        mic.click();mic.click();w.matchAppNativeVoiceResult('Late words');
        mic.click();w.MatchAppVoiceControls.stop();w.matchAppNativeVoiceResult('Late words');
        assert.deepEqual(calls,['start','stop','start','stop']);
        assert.equal(w.document.getElementById('discover-new-input').value,'');
    } finally {dom.window.close();}
});
