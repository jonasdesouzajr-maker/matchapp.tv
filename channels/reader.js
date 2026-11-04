/* The selected translation has its own crawlable URL. Only a deliberate
   language choice updates the app preference; following a shared URL does not. */
document.querySelector('.channel-language-list')?.addEventListener('click', event => {
  const link = event.target.closest('a[hreflang]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  try { localStorage.setItem('match_lang',link.hreflang); } catch {}
});
