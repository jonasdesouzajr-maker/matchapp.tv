/* ============================================================
   MatchApp catalog media enhancement layer

   Additive by design: this file does not replace the matcher, portfolio,
   billing, TMDB identity checks or Kids allowlist. It reads the existing
   public.catalog_media_metadata cache and enhances already-rendered results.
   ============================================================ */
(function () {
  'use strict';

  const CACHE = new Map();
  const FALLBACK_GUARD = new WeakSet();
  const SAFE_TMBD_IMG = /^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\/[A-Za-z0-9_.-]+$/i;
  const SAFE_ITUNES_IMG = /^https:\/\/is\d+-ssl\.mzstatic\.com\//i;
  const SAFE_YT_EMBED = /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{6,}$/i;
  const SAFE_DIRECT_MEDIA = /^https:\/\//i;

  function normalizeTitle(value) {
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  }

  function safePoster(row) {
    const urls = [row?.poster_original_url, row?.poster_large_url, row?.poster_url];
    return urls.find(url => SAFE_TMBD_IMG.test(String(url || '')) || SAFE_ITUNES_IMG.test(String(url || ''))) || null;
  }

  function currentKidsAge() {
    return document.getElementById('kids-age')?.value || localStorage.getItem('match_kids_age_band') || 'all';
  }

  function kidsRowAllowed(row, ageBand) {
    if (!row || row.kids_approved !== true) return false;
    const bands = Array.isArray(row.kids_age_bands) ? row.kids_age_bands : [];
    if (!bands.length || bands.includes('all')) return true;
    return ageBand === 'all' || bands.includes(ageBand);
  }

  async function lookup(title, hints) {
    hints = hints || {};
    const normalized = normalizeTitle(title);
    if (!normalized || !window.supabaseClient) return null;
    const key = `${normalized}::${hints.year || ''}::${hints.kind || ''}::${hints.kids ? currentKidsAge() : ''}`;
    if (CACHE.has(key)) return CACHE.get(key);

    let query = window.supabaseClient
      .from('catalog_media_metadata')
      .select('source_key,title,normalized_title,year,media_kind,tmdb_id,is_catalog_title,is_trending,trending_rank,kids_approved,kids_age_bands,poster_url,poster_large_url,poster_original_url,backdrop_url,overview,genres,runtime_minutes,content_rating,vote_average,original_language,preview_kind,preview_provider,preview_url,preview_embed_url,availability,source,source_updated_at,updated_at')
      .eq('normalized_title', normalized)
      .order('is_catalog_title', { ascending: false })
      .order('is_trending', { ascending: false })
      .limit(8);

    const { data, error } = await query;
    if (error || !Array.isArray(data) || !data.length) {
      CACHE.set(key, null);
      return null;
    }

    const wantedYear = hints.year ? Number(hints.year) : null;
    const wantedKind = hints.kind || '';
    let rows = data.filter(r => {
      if (wantedKind && r.media_kind && r.media_kind !== wantedKind && !(wantedKind === 'series' && r.media_kind === 'tv')) return false;
      if (wantedYear && r.year && Math.abs(Number(r.year) - wantedYear) > 1) return false;
      if (hints.kids && !kidsRowAllowed(r, currentKidsAge())) return false;
      return true;
    });
    if (!rows.length) rows = data.filter(r => !hints.kids || kidsRowAllowed(r, currentKidsAge()));
    const row = rows[0] || null;
    CACHE.set(key, row);
    return row;
  }

  function escapeXml(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  }

  function generatedCover(title, hints) {
    const safeTitle = escapeXml(title || 'MatchApp');
    const sub = escapeXml([hints?.year, hints?.kind || hints?.category].filter(Boolean).join(' · '));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#130734"/><stop offset=".55" stop-color="#402562"/><stop offset="1" stop-color="#14131A"/></linearGradient></defs><rect width="600" height="900" rx="28" fill="url(#g)"/><circle cx="300" cy="290" r="118" fill="none" stroke="#E5C158" stroke-width="8" opacity=".88"/><path d="M270 220 390 290 270 360Z" fill="#E5C158"/><text x="300" y="520" text-anchor="middle" fill="#FFF3A3" font-family="Arial,sans-serif" font-size="38" font-weight="700">${safeTitle.slice(0,42)}</text><text x="300" y="575" text-anchor="middle" fill="#d9cee8" font-family="Arial,sans-serif" font-size="23">${sub}</text><text x="300" y="805" text-anchor="middle" fill="#E5C158" font-family="Arial,sans-serif" font-size="22" font-weight="700">matchapp.tv</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  async function repairImage(img, explicitTitle, hints) {
    if (!img || FALLBACK_GUARD.has(img)) return;
    FALLBACK_GUARD.add(img);
    try {
      const card = img.closest('[data-title]');
      const title = explicitTitle || card?.getAttribute('data-title') || img.getAttribute('data-matchapp-title') || img.alt || window.globalMatchTitle || '';
      const row = await lookup(title, hints || { kids: !!document.documentElement.classList.contains('kids-mode') });
      const poster = safePoster(row);
      if (poster && img.src !== poster) {
        img.src = poster;
        img.dataset.mediaFallback = 'supabase';
        return;
      }
      img.src = generatedCover(title, { year: row?.year || hints?.year, kind: row?.media_kind || hints?.kind });
      img.dataset.mediaFallback = 'generated';
    } catch (_) {
      img.src = generatedCover(explicitTitle || img.alt || window.globalMatchTitle || 'MatchApp', hints || {});
      img.dataset.mediaFallback = 'generated';
    } finally {
      FALLBACK_GUARD.delete(img);
    }
  }

  function isScopedContentImage(img) {
    if (!img || img.tagName !== 'IMG') return false;
    if (img.id === 'res-poster-img') return true;
    return !!img.closest('.kids-card,.discover-card,.result-card,.match-result,.trending-card,.marquee-item,[data-title]');
  }

  function previewMarkup(row, title, options) {
    if (!row || (!row.preview_url && !row.preview_embed_url)) return '';
    const label = options?.kids ? 'Preview' : (row.preview_kind === 'audio' ? 'Listen to preview' : 'Preview');
    const poster = safePoster(row);
    if (row.preview_kind === 'audio' && SAFE_DIRECT_MEDIA.test(String(row.preview_url || ''))) {
      return `<div class="matchapp-preview-card matchapp-preview-audio">${poster ? `<img src="${poster}" alt="${String(title).replace(/"/g,'&quot;')} cover" width="180" height="180">` : ''}<div class="matchapp-preview-body"><strong>${label}</strong><audio controls preload="none" src="${row.preview_url}"></audio>${row.preview_provider ? `<small>${row.preview_provider}</small>` : ''}</div></div>`;
    }
    if (SAFE_YT_EMBED.test(String(row.preview_embed_url || ''))) {
      return `<div class="matchapp-preview-card"><div class="matchapp-preview-ratio"><iframe src="${row.preview_embed_url}" title="${String(title).replace(/"/g,'&quot;')} preview" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>${row.preview_provider ? `<small>${row.preview_provider}</small>` : ''}</div>`;
    }
    if (row.preview_kind === 'video' && SAFE_DIRECT_MEDIA.test(String(row.preview_url || ''))) {
      return `<div class="matchapp-preview-card"><video controls preload="metadata" playsinline poster="${poster || ''}" src="${row.preview_url}"></video>${row.preview_provider ? `<small>${row.preview_provider}</small>` : ''}</div>`;
    }
    return '';
  }

  async function mountRegularPreview() {
    const host = document.getElementById('res-trailer-container');
    const title = window.globalMatchTitle || document.getElementById('res-title')?.textContent?.trim();
    if (!host || !title) return;
    const kindHint = window.tmdbKindForCats ? window.tmdbKindForCats([document.getElementById('q-category')?.value || '']) : '';
    const row = await lookup(title, { kind: kindHint });
    const html = previewMarkup(row, title, { kids: false });
    let slot = host.querySelector('.matchapp-embedded-preview');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'matchapp-embedded-preview';
      host.prepend(slot);
    }
    slot.innerHTML = html;
    slot.hidden = !html;
    host.dataset.embeddedPreview = html ? '1' : '0';
    if (html && typeof window.track === 'function') window.track('preview_available', { provider: row?.preview_provider || 'unknown', kind: row?.preview_kind || 'unknown' });
  }

  async function mountKidsDialogPreview() {
    const dialog = document.getElementById('kids-watch-dialog');
    const title = document.getElementById('kids-watch-name')?.textContent?.trim();
    if (!dialog?.open || !title) return;
    const row = await lookup(title, { kids: true });
    const html = previewMarkup(row, title, { kids: true });
    let slot = dialog.querySelector('.matchapp-kids-preview');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'matchapp-kids-preview';
      const anchor = document.getElementById('kids-match-detail') || document.getElementById('kids-watch-description');
      anchor?.insertAdjacentElement('afterend', slot);
    }
    slot.innerHTML = html;
    slot.hidden = !html;
  }

  function hydrateKidsCards(root) {
    (root || document).querySelectorAll?.('.kids-card img').forEach(img => {
      if (img.dataset.mediaFallbackBound) return;
      img.dataset.mediaFallbackBound = '1';
      const title = img.closest('.kids-card')?.dataset?.title || img.alt;
      lookup(title, { kids: true }).then(row => {
        const poster = safePoster(row);
        if (poster && (!img.src || img.dataset.mediaFallback === 'generated')) img.src = poster;
      }).catch(() => {});
    });
  }

  document.addEventListener('error', event => {
    const img = event.target;
    if (isScopedContentImage(img)) repairImage(img);
  }, true);

  document.addEventListener('matchapp:newmatch', () => {
    const img = document.getElementById('res-poster-img');
    if (img) {
      img.dataset.matchappTitle = window.globalMatchTitle || '';
      lookup(window.globalMatchTitle || '', {}).then(row => {
        const poster = safePoster(row);
        if (poster && (!img.src || img.dataset.mediaFallback === 'generated')) img.src = poster;
      }).catch(() => {});
    }
    setTimeout(mountRegularPreview, 120);
  });

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.target?.id === 'kids-watch-dialog' || mutation.target?.closest?.('#kids-watch-dialog')) mountKidsDialogPreview();
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        hydrateKidsCards(node);
        if (node.matches?.('#kids-watch-dialog,.kids-card') || node.querySelector?.('#kids-watch-dialog,.kids-card')) mountKidsDialogPreview();
      });
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
      hydrateKidsCards(document);
    }, { once: true });
  } else {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    hydrateKidsCards(document);
  }

  window.MatchAppCatalogMedia = { lookup, safePoster, generatedCover, repairImage, mountRegularPreview, mountKidsDialogPreview, normalizeTitle };
})();
