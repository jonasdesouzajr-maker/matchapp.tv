// Keep script selection independent of the viewer's content country.
export function adultLanguageTag(value) {
  if (typeof value !== 'string') return 'en';
  const tag = value.trim().slice(0, 40).replace(/_/g, '-');
  if (!/^zh(?:-|$)/i.test(tag)) return /^ko(?:-KR)?$/i.test(tag) ? 'ko' : tag || 'en';
  try {
    const locale = new Intl.Locale(tag);
    return locale.maximize().script === 'Hant' ? 'zh-TW' : 'zh';
  } catch {
    return 'zh';
  }
}
