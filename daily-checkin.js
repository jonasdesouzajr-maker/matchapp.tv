/* MatchApp TV Ai — Daily Check-in (2026-09-21 rebuild).

   A single horizontal seven-day track, in the shape of a loyalty check-in
   strip: one cell per day, a progress rail behind them, the MatchApp round
   mark on the day being claimed, a tick on every day already banked, and the
   day-7 cell called out as the big reward.

   Rewards (server-side, public.daily_match_checkin):
     * every check-in  -> +1 Extra Match
     * day 7           -> +5 Extra Matches on top of that day's +1
   Registered accounts only. Guests get the same strip, locked, with a single
   "create a free account" action — the offer has to be visible to be worth
   signing up for.

   Runtime contract (AGENTS.md stability invariant):
     * one mount, one network read, no observers, no intervals, no polling;
     * re-entrant calls are no-ops;
     * every failure path still renders a usable strip.

   Placement: immediately under the top box on every surface, at the same
   width as the top box and a little shorter — see daily-checkin.css.  */
(() => {
  'use strict';

  const DAYS = 7;
  const MARK = '/assets/brand/matchapp-home-orb-transparent.webp?v=20260920-homebrand4';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  let root = null;
  let busy = false;

  /* ------------------------------ copy ------------------------------ */

  const COPY = {
    en: {
      title: 'Daily Check-in',
      guest: 'Create a free account to collect a Match every day.',
      streak: n => n ? `Day ${n} of 7 · keep the streak alive` : 'Check in today and collect +1 Match',
      almost: 'One more day · +5 Extra Matches waiting',
      done: 'Checked in today. Come back tomorrow.',
      day: n => `Day ${n}`,
      claim: 'Check in · +1 Match',
      claim7: 'Claim day 7 · +6 Matches',
      join: 'Register to unlock',
      locked: 'Registered accounts only',
      bonus: '+5',
      reward7: 'Day 7 reward: +5 Extra Matches',
      saving: 'Checking in…',
      retry: 'Try check-in again',
      failed: 'Check-in could not be saved. Please try again.',
      congrats: 'Congratulations!',
      gotDay: 'Check-in complete',
      gotWeek: '🎉 +5 Extra Matches!',
      msgDay: 'You collected +1 Extra Match. Come back tomorrow to grow your streak.',
      msgWeek: 'Seven days in a row! +1 for today plus your +5 bonus — six Extra Matches banked.',
      balance: n => `${n} Extra Match${n === 1 ? '' : 'es'} available.`,
      close: 'Continue'
    },
    'pt-BR': {
      title: 'Check-in Diário',
      guest: 'Crie uma conta grátis para ganhar um Match por dia.',
      streak: n => n ? `Dia ${n} de 7 · mantenha a sequência` : 'Faça o check-in hoje e ganhe +1 Match',
      almost: 'Falta um dia · +5 Matches extras esperando',
      done: 'Check-in feito hoje. Volte amanhã.',
      day: n => `Dia ${n}`,
      claim: 'Fazer check-in · +1 Match',
      claim7: 'Resgatar dia 7 · +6 Matches',
      join: 'Cadastre-se para liberar',
      locked: 'Apenas para contas registradas',
      bonus: '+5',
      reward7: 'Prêmio do dia 7: +5 Matches extras',
      saving: 'Registrando…',
      retry: 'Tentar novamente',
      failed: 'Não foi possível salvar o check-in. Tente de novo.',
      congrats: 'Parabéns!',
      gotDay: 'Check-in concluído',
      gotWeek: '🎉 +5 Matches extras!',
      msgDay: 'Você ganhou +1 Match extra. Volte amanhã para aumentar a sequência.',
      msgWeek: 'Sete dias seguidos! +1 de hoje mais o bônus de +5 — seis Matches extras.',
      balance: n => `${n} Match${n === 1 ? '' : 'es'} extra disponível${n === 1 ? '' : 's'}.`,
      close: 'Continuar'
    },
    es: {
      title: 'Check-in Diario',
      guest: 'Crea una cuenta gratis para conseguir un Match cada día.',
      streak: n => n ? `Día ${n} de 7 · mantén la racha` : 'Haz check-in hoy y gana +1 Match',
      almost: 'Un día más · +5 Matches extra esperando',
      done: 'Check-in hecho hoy. Vuelve mañana.',
      day: n => `Día ${n}`,
      claim: 'Hacer check-in · +1 Match',
      claim7: 'Reclamar día 7 · +6 Matches',
      join: 'Regístrate para desbloquear',
      locked: 'Solo para cuentas registradas',
      bonus: '+5',
      reward7: 'Premio del día 7: +5 Matches extra',
      saving: 'Guardando…',
      retry: 'Intentar de nuevo',
      failed: 'No se pudo guardar el check-in. Inténtalo otra vez.',
      congrats: '¡Enhorabuena!',
      gotDay: 'Check-in completado',
      gotWeek: '🎉 ¡+5 Matches extra!',
      msgDay: 'Has ganado +1 Match extra. Vuelve mañana para ampliar tu racha.',
      msgWeek: '¡Siete días seguidos! +1 de hoy más tu bono de +5 — seis Matches extra.',
      balance: n => `${n} Match${n === 1 ? '' : 'es'} extra disponible${n === 1 ? '' : 's'}.`,
      close: 'Continuar'
    }
  };

  function copy() {
    let raw = 'en';
    try {
      raw = String(window.MATCH_LANG || localStorage.getItem('match_lang') ||
                   document.documentElement.lang || 'en').toLowerCase();
    } catch (_) { /* storage can be blocked; English is the fallback */ }
    if (raw.startsWith('pt')) return COPY['pt-BR'];
    if (raw.startsWith('es')) return COPY.es;
    return COPY.en;
  }

  /* ------------------------------ render ------------------------------ */

  function track(streak, checkedToday, authed) {
    const t = copy();
    let html = '';
    for (let n = 1; n <= DAYS; n++) {
      const banked = authed && n <= streak;
      const isToday = authed && !checkedToday && n === streak + 1;
      const isSeven = n === DAYS;
      const cls = ['dc-day'];
      if (banked) cls.push('is-done');
      if (isToday) cls.push('is-today');
      if (isSeven) cls.push('is-bonus');

      let face;
      if (banked) {
        face = '<span class="dc-tick" aria-hidden="true">✓</span>';
      } else if (isToday) {
        face = '<img class="dc-mark" src="' + MARK + '" alt="" width="64" height="64" loading="lazy" decoding="async">';
      } else if (isSeven) {
        face = '<span class="dc-bonus" aria-hidden="true">' + t.bonus + '</span>';
      } else {
        face = '<span class="dc-pip" aria-hidden="true"></span>';
      }

      html += '<li class="' + cls.join(' ') + '">' +
                '<span class="dc-face">' + face + '</span>' +
                '<span class="dc-label">' + esc(t.day(n)) + '</span>' +
              '</li>';
    }
    return html;
  }

  function render(state) {
    if (!root) return;
    const t = copy();
    const authed = state?.authenticated === true;
    const streak = Math.max(0, Math.min(DAYS, Number(state?.streak || 0)));
    const today = !!state?.checked_today;

    const pct = Math.round((streak / DAYS) * 100);
    // The last step before the bonus is the one worth calling out.
    const onBonusEve = authed && !today && streak === DAYS - 1;
    const line = authed
      ? (today ? t.done : (onBonusEve ? t.almost : t.streak(streak)))
      : t.guest;

    let action;
    if (!authed) {
      action = '<button type="button" class="dc-action dc-action-join">' + esc(t.join) + '</button>';
    } else if (today) {
      action = '';
    } else {
      action = '<button type="button" class="dc-action' + (onBonusEve ? ' is-bonus-claim' : '') + '">' +
               esc(onBonusEve ? t.claim7 : t.claim) + '</button>';
    }

    root.className = 'daily-checkin dc' +
      (authed ? '' : ' is-locked') +
      (today ? ' is-complete-today' : '');
    root.innerHTML =
      '<div class="dc-inner">' +
        '<div class="dc-head">' +
          '<h2 class="dc-title">' + esc(t.title) + '</h2>' +
          '<p class="dc-sub">' + esc(line) + '</p>' +
        '</div>' +
        '<div class="dc-track" role="group" aria-label="' + esc(t.reward7) + '">' +
          '<div class="dc-rail" aria-hidden="true"><span class="dc-rail-fill" style="width:' + pct + '%"></span></div>' +
          '<ol class="dc-days">' + track(streak, today, authed) + '</ol>' +
        '</div>' +
        (action ? '<div class="dc-cta">' + action + '</div>' : '') +
        (authed ? '' : '<p class="dc-lock">' + esc(t.locked) + '</p>') +
      '</div>';

    const join = root.querySelector('.dc-action-join');
    if (join) join.addEventListener('click', openRegistration);
    const claim = root.querySelector('.dc-action:not(.dc-action-join)');
    if (claim) claim.addEventListener('click', checkin);
  }

  function openRegistration() {
    if (typeof window.openAuthModal === 'function') window.openAuthModal();
    else location.href = '/register.html';
  }

  /* ---------------------------- celebration ---------------------------- */

  function celebrate(result) {
    const t = copy();
    const week = !!result?.rewarded;
    const streak = Math.max(1, Math.min(DAYS, Number(result?.streak || 1)));
    const awarded = Math.max(0, Number(result?.awarded || 0));
    const balance = Number(result?.matches);
    const hasBalance = Number.isFinite(balance);
    const sparks = Array.from({ length: 14 }, (_, i) =>
      '<i style="--a:' + (i * (360 / 14)) + 'deg;--d:' + (46 + (i % 4) * 10) + 'px;--dy:-' + (46 + (i % 4) * 10) + 'px;--delay:' + ((i % 5) * 18) + 'ms"></i>'
    ).join('');
    const overlay = document.createElement('div');
    overlay.className = 'daily-reward';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="daily-reward-card">' +
        '<div class="daily-reward-sparks" aria-hidden="true">' + sparks + '</div>' +
        '<div class="daily-reward-kicker">' + esc(t.congrats) + ' ✨</div>' +
        '<div class="daily-reward-medal"><img src="' + MARK + '" alt="" width="96" height="96" decoding="async">' +
          '<span class="daily-reward-streak">' + streak + '/7</span></div>' +
        '<h3 class="daily-reward-title">' + (week ? esc(t.gotWeek) : esc(t.gotDay)) + '</h3>' +
        '<p class="daily-reward-message">' +
          (week ? esc(t.msgWeek) : esc(t.msgDay)) +
          (hasBalance ? ' <strong>' + esc(t.balance(balance)) + '</strong>' : '') +
        '</p>' +
        '<button type="button">' + esc(t.close) + '</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.dataset.awarded = String(awarded);
    const close = () => overlay.remove();
    overlay.querySelector('button').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    try { overlay.querySelector('button').focus({ preventScroll: true }); } catch (_) { /* focus is best-effort */ }
  }

  /* ------------------------------ network ------------------------------ */

  async function status() {
    try {
      const sb = window.supabaseClient;
      if (!sb) return render({ authenticated: false });
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return render({ authenticated: false });
      const { data, error } = await sb.rpc('daily_match_checkin_status');
      if (error) throw error;
      render(data);
    } catch (_) {
      // The strip is an offer, not a dependency: an unreachable backend shows
      // the locked state rather than an error or an empty hole in the page.
      render({ authenticated: false });
    }
  }

  async function checkin() {
    if (busy || !root) return;
    const button = root.querySelector('.dc-action');
    if (!button) return;
    busy = true;
    const t = copy();

    // Give immediate tactile/visual feedback on every surface, including
    // Android WebView, before the network round-trip begins.
    try {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ||
                      document.documentElement.classList.contains('reduce-motion') ||
                      document.body.classList.contains('reduce-motion');
      if (!reduced && button.animate) {
        button.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(.96)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }],
          { duration: 260, easing: 'cubic-bezier(.2,.9,.25,1.2)' }
        );
      }
    } catch (_) { /* animation is enhancement-only */ }

    button.disabled = true;
    button.textContent = t.saving;
    try {
      const sb = window.supabaseClient;
      if (!sb) throw new Error('supabase_unavailable');
      const { data, error } = await sb.rpc('daily_match_checkin');
      if (error) throw error;
      if (!data || data.ok !== true) throw new Error(String(data?.reason || 'checkin_failed'));

      const awarded = Math.max(0, Number(data.awarded || 0));
      const balance = Number(data.matches);
      render({ authenticated: true, streak: data.streak, checked_today: true });

      // The reward balance is separate from the included daily-action quota.
      // Publish the new server balance immediately so every surface can repaint
      // without waiting for a navigation or a second request.
      if (Number.isFinite(balance)) {
        window.matchExtraMatches = balance;
        try {
          document.dispatchEvent(new CustomEvent('matchapp:matchbalancechange', {
            detail: { matches: balance, awarded }
          }));
        } catch (_) { /* old WebViews still get the modal balance text */ }
      }

      if (awarded > 0) {
        root?.classList.add('is-claim-success');
        celebrate(data);
      }

      if (typeof window.refreshQuotaStatus === 'function') {
        await window.refreshQuotaStatus();
      }
    } catch (_) {
      const retry = root?.querySelector('.dc-action');
      if (retry) {
        retry.disabled = false;
        retry.textContent = t.retry;
      }
      if (typeof window.showToast === 'function') window.showToast(t.failed, true);
    } finally {
      busy = false;
    }
  }

  /* ------------------------------- mount ------------------------------- */

  function mount() {
    if (document.body?.classList.contains('page-kids')) return;
    if (document.getElementById('daily-match-checkin')) return;

    // Directly under the top box, above everything else in the column.
    const header = document.querySelector('header.app-header');
    const ask = document.querySelector('.top-ask-wrap');
    const host = document.querySelector('main.page-wrapper .container');
    if (!header && !ask && !host) return;

    root = document.createElement('section');
    root.id = 'daily-match-checkin';
    root.className = 'daily-checkin dc';
    root.setAttribute('aria-label', 'Daily Check-in');

    if (ask?.parentNode) {
      ask.parentNode.insertBefore(root, ask);
    } else if (header?.parentNode) {
      header.parentNode.insertBefore(root, header.nextSibling);
    } else {
      const anchor = host.querySelector('.tg-entry');
      if (anchor) host.insertBefore(root, anchor);
      else host.prepend(root);
    }

    render({ authenticated: false });
    status();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
  document.addEventListener('matchapp:authchange', status);
})();
