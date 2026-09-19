/* Sitewide legal chrome, cookie consent, AdSense-safe cleanup, account deletion UI. */
(function () {
  'use strict';
  if (location.pathname.indexOf('/kids/') === 0) return;

  const LINKS = [
    ['/', 'Home'],
    ['/about.html', 'About'],
    ['/privacy.html', 'Privacy'],
    ['/cookies.html', 'Cookies'],
    ['/terms.html', 'Terms'],
    ['/copyright.html', 'Copyright'],
    ['mailto:support@matchapp.tv', 'Contact']
  ];

  function isBot() {
    return /Googlebot|Mediapartners-Google|AdsBot-Google|Bingbot|Slurp/i.test(navigator.userAgent || '');
  }

  function ensureFooter() {
    if (document.querySelector('.ma-legal-bar')) return;
    const bar = document.createElement('nav');
    bar.className = 'ma-legal-bar';
    bar.setAttribute('aria-label', 'Legal');
    bar.innerHTML = LINKS.map(function (pair) {
      return '<a href="' + pair[0] + '">' + pair[1] + '</a>';
    }).join('<span aria-hidden="true"> · </span>') +
      '<span class="ma-legal-copy"> © 2026 MatchApp TV Ai</span>';
    const style = document.createElement('style');
    style.textContent = '.ma-legal-bar{position:relative;z-index:3;display:flex;flex-wrap:wrap;justify-content:center;gap:7px 9px;padding:16px 14px 24px;font-size:12px;color:#a99db6;text-align:center}.ma-legal-bar a{color:#d9bf79;text-decoration:none;font-weight:650}.ma-legal-bar a:hover{text-decoration:underline}.ma-cookie{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:5000;width:min(520px,calc(100% - 20px));margin:0;background:rgba(24,12,39,.94);color:#e9e1f1;border:1px solid rgba(243,207,105,.18);border-radius:14px;padding:10px 12px;box-shadow:0 16px 46px rgba(0,0,0,.42),0 0 24px rgba(143,83,214,.08);backdrop-filter:blur(16px);font-size:12px;line-height:1.4}.ma-cookie p{margin:0}.ma-cookie a{color:#e8cb78}.ma-cookie button{margin:8px 6px 0 0;border:0;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:800;cursor:pointer}.ma-cookie .ok{background:linear-gradient(135deg,#f3d570,#dcae3d);color:#251609}.ma-cookie .no{background:rgba(255,255,255,.04);color:#e9e1f1;border:1px solid rgba(239,232,255,.13)}.ma-delete-box{margin-top:22px;padding:16px;border:1px solid rgba(255,120,120,.25);border-radius:14px}@media(max-width:600px){.ma-cookie{bottom:max(7px,env(safe-area-inset-bottom));width:calc(100% - 14px);padding:9px 10px;font-size:11px}.ma-cookie button{padding:6px 10px}}';
    document.head.appendChild(style);
    document.body.appendChild(bar);
  }

  function cookieBanner() {
    if (isBot()) return;
    try { if (localStorage.getItem('match_cookie_choice')) return; } catch (_) { return; }
    const box = document.createElement('div');
    box.className = 'ma-cookie';
    box.setAttribute('role', 'dialog');
    box.innerHTML = '<p>We use essential cookies to run MatchApp. Analytics and Google AdSense may use cookies to measure visits and fund the free service. <a href="/cookies.html">Details</a>.</p><button type="button" class="ok">Accept</button><button type="button" class="no">Essential only</button>';
    box.querySelector('.ok').onclick = function () { try { localStorage.setItem('match_cookie_choice', 'all'); } catch (_) {} box.remove(); };
    box.querySelector('.no').onclick = function () { try { localStorage.setItem('match_cookie_choice', 'essential'); } catch (_) {} box.remove(); };
    document.body.appendChild(box);
  }

  function stripConstruction() {
    const ribbon = document.getElementById('upgrade-ribbon');
    if (ribbon) ribbon.remove();
  }

  function deletionPanel() {
    const host = document.getElementById('locked-info-card') || document.getElementById('editable-fields-section');
    if (!host || document.querySelector('.ma-delete-box')) return;
    const box = document.createElement('div');
    box.className = 'ma-delete-box';
    box.innerHTML = '<h3>Delete this account</h3><p>This removes your identity, history and purchases from MatchApp. The same email can register again 72 hours later.</p><button type="button" class="secondary-btn" id="ma-delete-btn">Request deletion</button><p id="ma-delete-msg" style="font-size:13px;color:#cbb;"></p>';
    host.parentNode.appendChild(box);
    box.querySelector('#ma-delete-btn').addEventListener('click', async function () {
      const msg = box.querySelector('#ma-delete-msg');
      if (!confirm('Delete your MatchApp account? You can recreate it with the same email after 72 hours.')) return;
      const sb = window.supabaseClient;
      if (!sb) { msg.textContent = 'Sign in first.'; return; }
      try {
        const { data, error } = await sb.rpc('request_account_deletion');
        if (error) throw error;
        msg.textContent = (data && data.message) || 'Deletion scheduled. The same email can return after 72 hours.';
        try { await sb.auth.signOut(); } catch (_) {}
      } catch (err) {
        msg.textContent = 'Could not complete deletion automatically. Email support@matchapp.tv and we will close the account.';
      }
    });
  }

  function boot() {
    stripConstruction();
    ensureFooter();
    cookieBanner();
    deletionPanel();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
