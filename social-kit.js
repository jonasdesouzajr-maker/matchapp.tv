/* Official social destinations + share hashtags. */
(function () {
  'use strict';
  const HANDLE = '@matchapp.tv';
  const TIKTOK_HANDLE = '@matchapp_ai';
  const TAGS = '#MatchApp #MatchAppTV #WhatToWatch #OQueAssistir';
  window.MATCHAPP_SOCIAL = { handle: HANDLE, tiktokHandle: TIKTOK_HANDLE, tags: TAGS };
  function paint() {
    const row = document.querySelector('.social-row');
    if (!row || row.dataset.socialKit === '1') return;
    row.dataset.socialKit = '1';
    [
      ['tiktok','TikTok','https://www.tiktok.com/@matchapp_ai',TIKTOK_HANDLE],
      ['facebook','Facebook','https://www.facebook.com/matchapp.tv',HANDLE]
    ].forEach(([cls,label,href,displayHandle]) => {
      if (row.querySelector('[href="'+href+'"]')) return;
      const a = document.createElement('a');
      a.className = 'social-btn social-'+cls; a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label','MatchApp on '+label);
      a.innerHTML = '<span>'+label+' '+displayHandle+'</span>';
      row.appendChild(a);
    });
    if (!row.querySelector('.social-hash')) {
      const p = document.createElement('p'); p.className = 'social-hash';
      p.style.cssText = 'flex-basis:100%;margin:8px 0 0;opacity:.8;font-size:13px';
      p.textContent = HANDLE+' · '+TAGS; row.appendChild(p);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint); else paint();
})();
