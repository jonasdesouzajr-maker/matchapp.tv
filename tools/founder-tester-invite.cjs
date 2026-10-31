'use strict';

const translations = require('../data/founder-tester-invites.json');
const catalog = require('../data/founder-copy.json');
const {apps} = require('./founder-testing.cjs');
const artwork = {
  lumina: {icon: '/reelforge/email/lumina_icon.jpg', shot: '/lumina-match/lumina-gameplay-1200x630.jpg', synopsis: 'luminaIntro'},
  reelforge: {icon: '/reelforge/email/reelforge_icon.jpg', shot: '/reelforge/email/reelforge_shot1.jpg', synopsis: 'reelIntro'}
};
const escape = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function invite(appId, language) {
  if (!Object.hasOwn(apps, appId) || !Object.hasOwn(translations, language)) throw new Error('Unknown app or language');
  const app = apps[appId], assets = artwork[appId];
  const [heading, welcome, join, download, instructions, thanks] = translations[language];
  const subject = heading + ' · ' + app.name;
  const optin = 'https://play.google.com/apps/testing/' + app.package;
  const install = 'https://play.google.com/store/apps/details?id=' + app.package;
  const site = 'https://matchapp.tv';
  const synopsis = catalog[language][assets.synopsis];
  const pill = (url, title) => `<a href="${url}" style="display:inline-block;border-radius:28px;background:#443763;color:#fff;font-weight:700;padding:12px 18px;margin:4px 5px 4px 0;text-decoration:none">${escape(title)}</a>`;
  const text = [subject, welcome, synopsis, join + ' — ' + optin, download + ' — ' + install, instructions, thanks, 'Jonas Junior · MatchApp Ai', 'support@matchapp.tv'].join('\n\n');
  const html = `<!doctype html><html lang="${language === 'pt' ? 'pt-BR' : language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:20px;background:#161221;color:#f7f3ec;font:16px/1.6 Arial,sans-serif"><div style="max-width:560px;margin:auto">
<a href="${optin}"><img width="72" height="72" alt="${escape(app.name)} · ${escape(join)}" src="${site + assets.icon}" style="border:0;border-radius:16px"></a><h1 style="font-size:24px;color:#f6d985">${escape(subject)}</h1>
<p>${escape(welcome)}</p><a href="${site + assets.shot}"><img width="520" src="${site + assets.shot}" alt="${escape(app.name)} · ${escape(catalog[language].showShot)}" style="width:100%;max-width:520px;height:auto;border:0;border-radius:15px"></a>
<p>${escape(synopsis)}</p><p>${pill(optin, join)} ${pill(install, download)}</p><p>${escape(instructions)}</p><p>${escape(thanks)}<br>Jonas Junior · MatchApp Ai</p>
<a href="mailto:support@matchapp.tv" style="color:#f6d985">support@matchapp.tv</a></div></body></html>`;
  return {subject, text, html};
}
module.exports = {invite};