/* MatchApp TV Ai daily check-in. A non-blocking, sign-in reminder; no page card.
   Keep the server as the only reward authority: +1 per day, +5 bonus on day 7.
   One mount, one status read per auth event; no polling, observers or intervals. */
(() => {
  'use strict';

  const DAYS = 7;
  const MARK = '/assets/brand/matchapp-home-orb-transparent.webp?v=20260920-homebrand4';
  const CSS = '/daily-checkin-bubble.css?v=20260927-bubble1';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
  let root = null, busy = false, statusEpoch = 0, confirmedStatus = null;
  let cssReady = !document.head, latestState = {authenticated:false};
  let lastAuthId = null, hasReadAuth = false, manuallyOpened = false;

  const COPY = {
    en: {
      title:'Your daily Match is ready', eyebrow:'A little gift for today',
      streak:n=>n ? `Your streak: ${n} of 7 days` : 'Start your 7-day reward streak',
      almost:'Your next check-in unlocks 6 Matches!',
      done:'Checked in today. Come back tomorrow.', claim:'Claim +1 Match', claim7:'Claim +6 Matches',
      bonus:'+5 on day 7', closeLabel:'Dismiss daily check-in reminder',
      saving:'Checking in…', retry:'Try check-in again',
      failed:'Check-in could not be saved. Please try again.',
      congrats:'MATCH COLLECTED', gotDay:'+1 Extra Match', gotWeek:'+6 Extra Matches',
      msgDay:'Your Match has been added. See you tomorrow! ✨',
      msgWeek:'7-day streak complete! Your bonus is yours. See you tomorrow! ✨',
      balance:n=>`${n} Extra Match${n===1?'':'es'} available.`, seeTomorrow:'See you tomorrow ✨'
    },
    'pt-BR': {
      title:'Seu Match diário chegou', eyebrow:'Um presente para hoje',
      streak:n=>n ? `Sua sequência: ${n} de 7 dias` : 'Comece sua sequência de 7 dias',
      almost:'Seu próximo check-in libera 6 Matches!',
      done:'Check-in feito hoje. Volte amanhã.', claim:'Resgatar +1 Match', claim7:'Resgatar +6 Matches',
      bonus:'+5 no dia 7', closeLabel:'Fechar lembrete de check-in',
      saving:'Registrando…', retry:'Tentar novamente',
      failed:'Não foi possível salvar o check-in. Tente novamente.',
      congrats:'MATCH RESGATADO', gotDay:'+1 Match extra', gotWeek:'+6 Matches extras',
      msgDay:'Seu Match foi adicionado. Até amanhã! ✨',
      msgWeek:'7 dias seguidos! Seu bônus chegou. Até amanhã! ✨',
      balance:n=>`${n} Match${n===1?'':'es'} extra disponível${n===1?'':'s'}.`, seeTomorrow:'Até amanhã ✨'
    },
    es: {
      title:'Tu Match diario está listo', eyebrow:'Un regalo para hoy',
      streak:n=>n ? `Tu racha: ${n} de 7 días` : 'Comienza tu racha de 7 días',
      almost:'¡Tu próximo check-in desbloquea 6 Matches!',
      done:'Check-in completado. Vuelve mañana.', claim:'Recibir +1 Match', claim7:'Recibir +6 Matches',
      bonus:'+5 el día 7', closeLabel:'Cerrar recordatorio de check-in',
      saving:'Registrando…', retry:'Intentar de nuevo',
      failed:'No se pudo guardar el check-in. Inténtalo de nuevo.',
      congrats:'MATCH CONSEGUIDO', gotDay:'+1 Match extra', gotWeek:'+6 Matches extra',
      msgDay:'Tu Match se ha añadido. ¡Hasta mañana! ✨',
      msgWeek:'¡7 días seguidos! Ya tienes el bono. ¡Hasta mañana! ✨',
      balance:n=>`${n} Match${n===1?'':'es'} extra disponible${n===1?'':'s'}.`, seeTomorrow:'Hasta mañana ✨'
    }
  };
  function copy() {
    let raw = 'en';
    try { raw = String(window.MATCH_LANG || localStorage.getItem('match_lang') ||
          document.documentElement.lang || 'en').toLowerCase(); } catch (_) {}
    return raw.startsWith('pt') ? COPY['pt-BR'] : raw.startsWith('es') ? COPY.es : COPY.en;
  }
  // The server uses current_date (UTC in production). Never substitute local
  // calendar arithmetic for its authoritative checked_today response.
  const dayKey = (user, kind) => `matchapp:checkin:${kind}:${user}:${new Date().toISOString().slice(0,10)}`;
  function saved(key) { try { return sessionStorage.getItem(key) === '1'; } catch (_) { return false; } }
  function save(key) { try { sessionStorage.setItem(key, '1'); } catch (_) {} }
  function clear(key) { try { sessionStorage.removeItem(key); } catch (_) {} }

  function render(state) {
    latestState = state || {authenticated:false};
    if (!root) return;
    const t = copy(), authed = state?.authenticated === true;
    const user = state?.userId || confirmedStatus?.userId || lastAuthId;
    const today = !!state?.checked_today;
    const streak = Math.max(0, Math.min(DAYS, Number(state?.streak || 0)));
    const banked = !today && streak === DAYS ? 0 : streak;
    const onBonusEve = banked === DAYS - 1;
    const dismissed = user && !manuallyOpened &&
      (saved(dayKey(user,'dismissed')) || saved(dayKey(user,'seen')) && !state?.keepVisible);
    const visible = cssReady && authed && !today && !dismissed && !document.body?.classList.contains('page-kids');
    root.className = 'daily-checkin dc checkin-bubble' + (visible ? '' : ' is-hidden');
    root.setAttribute('aria-hidden', visible ? 'false' : 'true');
    if (root.style) {
      if (visible) root.style.removeProperty('display');
      else root.style.setProperty('display', 'none', 'important');
    }
    if (!visible) {
      root.innerHTML = today ? '<span class="mcb-complete">' + esc(t.done) + '</span>' : '';
      return;
    }
    if (user) save(dayKey(user,'seen'));
    // The entire presentation floats above the page and never consumes home layout space.
    const dots = Array.from({length:DAYS},(_,i) =>
      '<span class="mcb-dot' + (i < banked ? ' banked' : '') + '" aria-hidden="true"></span>'
    ).join('');
    root.innerHTML = '<div class="mcb-inner">' +
      '<button type="button" class="mcb-close" aria-label="' + esc(t.closeLabel) + '">×</button>' +
      '<div class="mcb-mark"><img src="' + MARK + '" width="37" height="37" alt=""></div>' +
      '<div class="mcb-content"><p class="mcb-eyebrow">' + esc(t.eyebrow) + '</p>' +
      '<h2 class="mcb-title">' + esc(t.title) + '</h2>' +
      '<p class="mcb-detail">' + esc(onBonusEve ? t.almost : t.streak(banked)) + '</p></div>' +
      '<div class="mcb-foot"><div class="mcb-streak" aria-label="' + esc(t.streak(banked)) + '">' +
      dots + '<span class="mcb-bonus">' + esc(t.bonus) + '</span></div>' +
      '<button type="button" class="dc-action' + (onBonusEve ? ' is-bonus-claim' : '') + '">' +
      esc(onBonusEve ? t.claim7 : t.claim) + '</button></div></div>';
    root.querySelector('.mcb-close')?.addEventListener('click', () => {
      if (user) save(dayKey(user,'dismissed'));
      manuallyOpened = false;
      render({...latestState,keepVisible:false});
    });
    root.querySelector('.dc-action')?.addEventListener('click', checkin);
  }

  function celebrate(result) {
    const t = copy(), awarded = Math.max(0,Number(result?.awarded || 0));
    const week = !!result?.rewarded, streak = Math.max(1,Math.min(DAYS,Number(result?.streak || 1)));
    const balance = Number(result?.matches), hasBalance = Number.isFinite(balance);
    const previous = document.querySelector?.('.daily-reward.daily-reward-toast');
    previous?.remove();
    const sparks = Array.from({length:14},(_,i)=>
      '<i style="--a:'+(i*360/14)+'deg;--dy:-'+(34+(i%4)*9)+'px;--delay:'+((i%5)*18)+'ms"></i>'
    ).join('');
    const overlay = document.createElement('div');
    overlay.className = 'daily-reward daily-reward-toast';
    overlay.setAttribute('role','status');
    overlay.setAttribute('aria-live','polite');
    overlay.innerHTML = '<div class="daily-reward-card">' +
      '<div class="daily-reward-sparks" aria-hidden="true">'+sparks+'</div>' +
      '<div class="daily-reward-medal"><img src="'+MARK+'" alt="" width="48" height="48">' +
      '<span class="daily-reward-streak">'+streak+'/7</span></div>' +
      '<div class="daily-reward-kicker">'+esc(t.congrats)+'</div>' +
      '<h3>'+esc(week?t.gotWeek:t.gotDay)+'</h3>' +
      '<p>'+esc(week?t.msgWeek:t.msgDay)+
      (hasBalance?' <strong>'+esc(t.balance(balance))+'</strong>':'')+'</p>' +
      '<button type="button">'+esc(t.seeTomorrow)+'</button></div>';
    overlay.dataset.awarded = String(awarded);
    document.body.appendChild(overlay);
    let leaving = false;
    const close = () => {
      if (leaving) return;
      leaving = true;
      overlay.classList?.add('is-leaving');
      setTimeout(()=>overlay.remove(),400);
    };
    overlay.querySelector('button')?.addEventListener('click',close);
    setTimeout(close,4800);
  }

  async function status() {
    const epoch = ++statusEpoch;
    let signedInUser = null;
    try {
      const sb = window.supabaseClient;
      if (!sb?.auth) { if (epoch === statusEpoch) render({authenticated:false}); return; }
      const {data:auth,error:authError} = await sb.auth.getSession();
      if (epoch !== statusEpoch) return;
      if (authError) throw authError;
      signedInUser = auth?.session?.user || null;
      if (!signedInUser) {
        if (window.isUserLoggedIn !== true) {
          lastAuthId = null; hasReadAuth = true; confirmedStatus = null;
          manuallyOpened = false; render({authenticated:false});
        } else if (confirmedStatus?.userId) {
          render({...confirmedStatus,authenticated:true});
        }
        return;
      }
      if (hasReadAuth && lastAuthId !== signedInUser.id) {
        clear(dayKey(signedInUser.id,'seen'));
        clear(dayKey(signedInUser.id,'dismissed'));
      }
      hasReadAuth = true;
      lastAuthId = signedInUser.id;
      if (confirmedStatus?.userId !== signedInUser.id) confirmedStatus = null;
      if (!busy && confirmedStatus) render({...confirmedStatus,authenticated:true});
      let response = await sb.rpc('daily_match_checkin_status');
      if (epoch !== statusEpoch) return;
      if (!response.error && response.data?.authenticated === false) {
        const refreshed = await sb.auth.refreshSession();
        if (epoch !== statusEpoch) return;
        if (refreshed.error || refreshed.data?.session?.user?.id !== signedInUser.id)
          throw refreshed.error || new Error('Check-in session needs refresh');
        response = await sb.rpc('daily_match_checkin_status');
      }
      if (response.error || response.data?.authenticated !== true)
        throw response.error || new Error('Check-in status unavailable');
      if (epoch !== statusEpoch) return;
      confirmedStatus = {...response.data,userId:signedInUser.id};
      render({...confirmedStatus,authenticated:true});
    } catch (error) {
      if (epoch !== statusEpoch) return;
      if (signedInUser || window.isUserLoggedIn === true) {
        console.warn('[check-in] Signed-in status temporarily unavailable:',error?.message||error);
        // A failed status read cannot sign the member out; the claim RPC is idempotent.
        render({authenticated:true,userId:signedInUser?.id||confirmedStatus?.userId||lastAuthId,
                streak:confirmedStatus?.streak||0,checked_today:confirmedStatus?.checked_today||false});
      } else render({authenticated:false});
    }
  }

  async function checkin() {
    if (busy || !root) return;
    const button = root.querySelector('.dc-action');
    if (!button) return;
    busy = true;
    const t = copy();
    // Instant, transform-only tactile feedback, except for reduced-motion users.
    try {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ||
        document.documentElement.classList.contains('reduce-motion') ||
        document.body.classList.contains('reduce-motion');
      if (!reduced && button.animate) button.animate(
        [{transform:'scale(1)'},{transform:'scale(.96)'},{transform:'scale(1.025)'},{transform:'scale(1)'}],
        {duration:260,easing:'cubic-bezier(.2,.9,.25,1.2)'});
    } catch (_) {}
    button.disabled = true;
    button.textContent = t.saving;
    try {
      const sb = window.supabaseClient;
      if (!sb) throw new Error('supabase_unavailable');
      let {data,error} = await sb.rpc('daily_match_checkin');
      if ((data?.reason === 'not_authenticated' || error?.status === 401) && sb.auth?.refreshSession) {
        const refreshed = await sb.auth.refreshSession();
        if (refreshed.error || !refreshed.data?.session?.user)
          throw refreshed.error || new Error('session_refresh_failed');
        ({data,error} = await sb.rpc('daily_match_checkin'));
      }
      if (error) throw error;
      if (!data || data.ok !== true) throw new Error(String(data?.reason || 'checkin_failed'));
      const awarded = Math.max(0,Number(data.awarded || 0));
      const balance = Number(data.matches);
      ++statusEpoch; // An older pending status cannot overwrite this committed award.
      const userId = confirmedStatus?.userId || window.matchProfileState?.userId || lastAuthId;
      confirmedStatus = {userId,authenticated:true,streak:data.streak,checked_today:true};
      manuallyOpened = false;
      render(confirmedStatus);
      if (Number.isFinite(balance)) {
        window.matchExtraMatches = balance;
        try { document.dispatchEvent(new CustomEvent('matchapp:matchbalancechange',
          {detail:{matches:balance,awarded}})); } catch (_) {}
      }
      if (awarded > 0) {
        root?.classList.add('is-claim-success');
        celebrate(data);
      } else if (typeof window.showToast === 'function') {
        window.showToast(t.done);
      }
      if (typeof window.refreshQuotaStatus === 'function') {
        try { await window.refreshQuotaStatus(); } catch (error) {
          console.warn('[check-in] Quota refresh failed after reward:',error?.message||error);
        }
      }
    } catch (error) {
      const retry = root?.querySelector('.dc-action');
      if (retry) { retry.disabled = false; retry.textContent = t.retry; }
      if (typeof window.showToast === 'function') window.showToast(t.failed,true);
      else console.warn('[check-in] Claim failed:',error?.message||error);
    } finally { busy = false; }
  }

  // Account/overflow menus can open a dismissed reminder explicitly.
  window.openDailyCheckin = () => {
    if (!confirmedStatus || confirmedStatus.checked_today) return false;
    manuallyOpened = true;
    render({...confirmedStatus,authenticated:true,keepVisible:true});
    return true;
  };
  function mount() {
    if (document.body?.classList.contains('page-kids')) return;
    if (document.getElementById('daily-match-checkin')) return;
    const header = document.querySelector('header.app-header');
    const ask = document.querySelector('.top-ask-wrap');
    const host = document.querySelector('main.page-wrapper .container');
    if (!header && !ask && !host) return;
    root = document.createElement('section');
    root.id = 'daily-match-checkin';
    root.className = 'daily-checkin dc checkin-bubble is-hidden';
    root.setAttribute('aria-label','Daily Check-in');
    root.setAttribute('aria-hidden','true');
    if (root.style) root.style.setProperty('display','none','important');
    // Preserve existing mount/selector contracts, but CSS fixes this bubble
    // to the viewport so it never reserves space in the home-page column.
    if (ask?.parentNode) ask.parentNode.insertBefore(root,ask);
    else if (header?.parentNode) header.parentNode.insertBefore(root,header.nextSibling);
    else {const anchor = host.querySelector('.tg-entry');if(anchor) host.insertBefore(root,anchor);else host.prepend(root);}
    if (document.head) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = CSS;
      link.onload = () => {cssReady = true;render(latestState);};
      link.onerror = () => {cssReady = false;console.warn('[check-in] Bubble stylesheet could not load.');};
      document.head.appendChild(link);
    }
    render({authenticated:false});
    status();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  document.addEventListener('matchapp:authchange',status);
})();