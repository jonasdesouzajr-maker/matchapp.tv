/* ============================================================
   MATCHAPP INSTALL — "add to home screen" that actually works.

   Three real paths exist, and no single API covers all of them:

   1. Chrome/Edge/Brave on Android or Desktop — supports beforeinstallprompt.
      We capture that event, hold onto it, and fire it on a real user tap.
      This is the only path with a genuine one-tap native install dialog.

   2. iOS (any browser — Safari, Chrome, Edge all now share this since
      iOS 17) — there is NO beforeinstallprompt on iOS and no JS API that
      can trigger the install. Apple deliberately doesn't expose one (there
      is an open, years-old feature request on Apple's own developer forums
      asking for exactly this, still unresolved). The only real mechanism is
      the user manually tapping Share -> Add to Home Screen. So instead of
      pretending to have a button that "installs," we show the exact steps.

   3. Desktop Safari (macOS, not iOS) — similarly no JS trigger; the real
      path is the File menu -> Add to Dock. Shown the same way as iOS: real
      instructions, not a fake button.

   For every other browser (Firefox desktop, older browsers with no
   installability support at all), the button simply never appears. Showing
   a button that does nothing when tapped is worse than showing nothing.
   ============================================================ */

let deferredInstallPrompt = null;

const MATCHAPP_INSTALL_VERSION = '20260923-kidsinstall1';
const MATCHAPP_KIDS_INSTALL = location.pathname === '/kids' || location.pathname.startsWith('/kids/');
const MATCHAPP_KIDS_MANIFEST = '/kids/manifest.json';
const MATCHAPP_KIDS_NAME = 'MatchApp Ai KIDS';
function matchAppInstallLocale() {
    const primary = String((navigator.languages && navigator.languages[0]) || navigator.language || 'en')
        .replace(/_/g, '-').toLowerCase();
    return /^pt-br(?:$|-)/.test(primary) ? 'pt-BR' : 'en';
}
function matchAppInstallName() {
    return matchAppInstallLocale() === 'pt-BR' ? 'MatchApp iA' : 'MatchApp Ai';
}
function secureInstallContext() {
    const host = String(location.hostname || '').toLowerCase();
    const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    return local || (window.isSecureContext === true && location.protocol === 'https:' && /(^|\.)matchapp\.tv$/.test(host));
}
function configureInstallBrand() {
    const locale = matchAppInstallLocale();
    const name = matchAppInstallName();
    window.MATCHAPP_INSTALL_LOCALE = locale;
    window.MATCHAPP_INSTALL_NAME = name;
    let manifest = document.querySelector('link[rel="manifest"]');
    if (!manifest) { manifest = document.createElement('link'); manifest.rel = 'manifest'; document.head.appendChild(manifest); }
    manifest.href = (MATCHAPP_KIDS_INSTALL ? MATCHAPP_KIDS_MANIFEST : (locale === 'pt-BR' ? '/manifest-pt-br.json' : '/manifest.json')) + '?v=' + MATCHAPP_INSTALL_VERSION;
    const setMeta = (metaName) => {
        let meta = document.querySelector('meta[name="' + metaName + '"]');
        if (!meta) { meta = document.createElement('meta'); meta.name = metaName; document.head.appendChild(meta); }
        meta.content = name;
    };
    setMeta('application-name');
    setMeta('apple-mobile-web-app-title');
    let touch = document.querySelector('link[rel="apple-touch-icon"]');
    if (!touch) { touch = document.createElement('link'); touch.rel = 'apple-touch-icon'; document.head.appendChild(touch); }
    touch.href = (MATCHAPP_KIDS_INSTALL ? '/kids/kids-logo.jpeg' : '/assets/brand/matchapp-ai-install-192.png') + '?v=' + MATCHAPP_INSTALL_VERSION;
}
configureInstallBrand();

function platformInfo() {
    const ua = navigator.userAgent || '';

    // THE TABLET BUG: since iPadOS 13, Apple deliberately reports "Macintosh"
    // in the user-agent instead of "iPad", so /iPad/ matches nothing on any
    // modern iPad and every one of them fell through to the isMac branch.
    // The reliable tell is that a real Mac has no touch: navigator.maxTouchPoints
    // is 0 on desktop Safari and 5 on an iPad claiming to be one.
    const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    const isIOS = (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) || iPadOS;
    const isMac = /Macintosh/.test(ua) && !isIOS;

    // Android tablets were not detected at all: the old check had no Android
    // branch, so a Galaxy Tab got neither the native prompt path nor the
    // manual instructions. Chrome on Android fires beforeinstallprompt on
    // tablets exactly as it does on phones, so they only needed recognising.
    const isAndroid = /Android/.test(ua);
    const isNativeShell = /MatchAppTVAndroid/i.test(ua);
    const isTablet = iPadOS
        || (/Android/.test(ua) && !/Mobile/.test(ua))   // Android tablets omit "Mobile"
        || /Tablet|PlayBook|Silk/.test(ua);

    // True Safari engine, excluding Chrome/Firefox/Edge on iOS which all
    // report "Safari" in their UA string too since they're WebKit wrappers.
    const isSafari = /^((?!chrome|crios|fxios|edgios|android).)*safari/i.test(ua);
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true; // iOS's own standalone flag
    return { isIOS, isMac, isSafari, isStandalone, isTablet, isAndroid, iPadOS, isNativeShell };
}

function installButtons() {
    return Array.from(document.querySelectorAll('.install-btn'));
}

function showInstallButtons() {
    installButtons().forEach(b => { b.style.display = 'inline-flex'; });
}
function hideInstallButtons() {
    installButtons().forEach(b => { b.style.display = 'none'; });
}

// Chrome/Edge/Brave signal real installability by firing this. We stop the
// browser's own mini-infobar (preventDefault) so our button is the single,
// consistent entry point instead of two competing prompts.
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallButtons();
    // Fires after page load on Chrome/Edge, so the hint is triggered here
    // rather than in initInstall — at init time the button is still hidden
    // and hinting at a hidden button would point at nothing.
    setTimeout(maybeShowInstallHint, 900);
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (window.dismissInstallBubble) window.dismissInstallBubble();
    hideInstallButtons();
    if (window.showToast) {
        const name = window.MATCHAPP_INSTALL_NAME || 'MatchApp Ai';
        const done = window.MATCHAPP_INSTALL_LOCALE === 'pt-BR'
            ? '🎉 ' + name + ' instalado — abra pelo ícone na tela inicial ou na lista de aplicativos.'
            : '🎉 ' + name + ' installed — open it from your home screen or app launcher.';
        showToast(done);
    }
});

function buildInstallModal() {
    if (document.getElementById('install-modal')) return document.getElementById('install-modal');

    const { isIOS, isMac } = platformInfo();
    const T = (k, fallback) => (window.t ? t(k) : fallback);

    const body = isIOS
        ? `<p style="color:#ddd;font-size:15px;line-height:1.8;margin:0 0 6px 0;">
             ${T('install.iosStep1', '1. Tap the <strong>Share</strong> icon')} 📤
           </p>
           <p style="color:#ddd;font-size:15px;line-height:1.8;margin:0;">
             ${T('install.iosStep2', '2. Scroll down and tap <strong>"Add to Home Screen"</strong>')}
           </p>`
        : isMac
        ? `<p style="color:#ddd;font-size:15px;line-height:1.8;margin:0;">
             ${T('install.macStep', 'In Safari\u2019s <strong>File</strong> menu, choose <strong>"Add to Dock"</strong>.')}
           </p>`
        : `<p style="color:#ddd;font-size:15px;line-height:1.8;margin:0;">
             ${T('install.genericStep', 'Look for <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong> in your browser\u2019s menu.')}
           </p>`;

    const wrap = document.createElement('dialog');
    wrap.id = 'install-modal';
    wrap.className = 'match-install-dialog';
    wrap.setAttribute('aria-labelledby','match-install-heading');
    wrap.innerHTML = `
        <div class="modal-content" style="background:linear-gradient(150deg,rgba(40,20,60,0.98),rgba(20,19,26,0.99));border:2px solid var(--gold);border-radius:20px;padding:28px;max-width:400px;">
            <button type="button" class="match-install-close" onclick="closeInstallModal()" aria-label="Close">&times;</button>
            <div style="font-size:44px;margin-bottom:10px;">📲</div>
            <h3 id="match-install-heading" style="color:var(--gold-glow);font-size:20px;font-weight:900;margin:0 0 16px 0;text-transform:uppercase;">
                ${T('install.modalTitle', 'Install MatchApp')}
            </h3>
            <div style="text-align:left;background:rgba(0,0,0,0.35);border-radius:14px;padding:16px 18px;margin-bottom:18px;">
                ${body}
            </div>
            <p style="color:#a99cc4;font-size:12.5px;margin:0;">
                ${T('install.modalNote', 'It opens like a real app \u2014 no browser bar, one tap from your home screen.')}
            </p>
        </div>`;
    document.body.appendChild(wrap);
    return wrap;
}

window.closeInstallModal = function () {
    const m = document.getElementById('install-modal');
    if (m) { if(typeof m.close==='function')m.close();else m.removeAttribute('open'); }
};

window.installMatchApp = async function () {
    if (!secureInstallContext()) {
        if (window.showToast) showToast('For your protection, MatchApp can only be installed from the secure matchapp.tv site.');
        return;
    }
    if (window.matchAppInstallState?.isInstalled()) {
        const code=window.MATCH_LANG||document.documentElement.lang||'en';
        const text=code.startsWith('pt')?'O MatchApp já foi instalado. Abra pelo ícone na tela inicial ou na lista de aplicativos. Seu dispositivo controla a posição do ícone.':code.startsWith('es')?'MatchApp ya está instalado. Ábrelo desde la pantalla de inicio o la lista de aplicaciones. Tu dispositivo controla la posición del icono.':'MatchApp is installed. Open its icon from your home screen or app launcher. Your device controls where the icon is placed.';
        let help=document.getElementById('match-installed-help');if(!help){help=document.createElement('dialog');help.id='match-installed-help';help.className='match-install-dialog';const p=document.createElement('p');help.append(p);const form=document.createElement('form');form.method='dialog';const close=document.createElement('button');close.type='submit';close.textContent='OK';form.append(close);help.append(form);document.body.append(help);}
        help.querySelector('p').textContent=text;if(!help.open){if(typeof help.showModal==='function')help.showModal();else help.setAttribute('open','');}return;
    }
    // Acting on the hint is the strongest possible signal it was seen — clear
    // it immediately so it never sits on top of the native prompt or the iOS
    // instructions modal.
    if (window.dismissInstallBubble) window.dismissInstallBubble();

    // Path 1: a real native prompt is available (Chrome/Edge/Android/Desktop).
    if (deferredInstallPrompt) {
        try {
            await deferredInstallPrompt.prompt();
            // Bar starts only once the OS prompt is actually showing, and only
            // the real appinstalled event finishes it — see install-progress.js
            // for why it stops short of 100 rather than guessing.
            window.matchAppInstallProgress?.start();
            const choice = await deferredInstallPrompt.userChoice;
            if (choice && choice.outcome === 'dismissed') window.matchAppInstallProgress?.cancel();
        } catch (e) { window.matchAppInstallProgress?.cancel(); }
        deferredInstallPrompt = null;
        return;
    }
    // Chrome/Edge/Brave can sometimes expose installability a moment after
    // the tap (for example immediately after a fresh service-worker claim).
    // Give the real native prompt one short chance to arrive before deciding
    // this browser truly has no programmatic install path.
    if (!platformInfo().isIOS && !platformInfo().isMac) {
        for (let i = 0; i < 8 && !deferredInstallPrompt; i++) {
            await new Promise(resolve => setTimeout(resolve, 125));
        }
        if (deferredInstallPrompt) {
            try {
                await deferredInstallPrompt.prompt();
                window.matchAppInstallProgress?.start();
                const choice = await deferredInstallPrompt.userChoice;
                if (choice && choice.outcome === 'dismissed') window.matchAppInstallProgress?.cancel();
            } catch (e) { window.matchAppInstallProgress?.cancel(); }
            deferredInstallPrompt = null;
            return;
        }
    }

    // Only Safari-family platforms need manual installation instructions.
    // Android/Chromium must use the browser's native PWA installer.
    const { isIOS, isMac } = platformInfo();
    if (isIOS || isMac) {
        const modal = buildInstallModal();
        if (!modal.open) { if(typeof modal.showModal==='function')modal.showModal();else modal.setAttribute('open',''); }
        return;
    }

    if (window.showToast) {
        showToast('Preparing the secure app installer… please tap Install again in a moment.');
    }
};

// ----------------------------------------------------
// FIRST-VISIT INSTALL HINT
//
// The install button lives in a crowded header next to the sound toggle and
// language switcher, so most visitors never register what it is. A small
// bubble points at it for 20 seconds on a first visit, then removes itself.
//
// Rules, so this never becomes an annoyance:
//   • once per visitor, ever (remembered in localStorage)
//   • never if they dismissed it
//   • never if the app is already installed
//   • never if the button itself isn't visible — a hint pointing at nothing
//     is worse than no hint
//   • auto-clears after 20s whether or not it's interacted with
// ----------------------------------------------------
const INSTALL_HINT_KEY = 'match_installHintSeen';
let installHintTimer = null;

window.dismissInstallBubble = function () {
    const bubble = document.getElementById('install-bubble');
    if (installHintTimer) { clearTimeout(installHintTimer); installHintTimer = null; }
    document.querySelectorAll('.install-btn').forEach(b => b.classList.remove('is-hinting'));
    if (!bubble || bubble.hidden) return;

    bubble.classList.add('is-leaving');
    setTimeout(() => { bubble.hidden = true; bubble.classList.remove('is-leaving'); }, 300);
    try { localStorage.setItem(INSTALL_HINT_KEY, '1'); } catch (e) {}
};

function maybeShowInstallHint() {
    if (platformInfo().isStandalone || window.matchAppUpdatePending) return;
    try { if (localStorage.getItem(INSTALL_HINT_KEY)) return; } catch (e) {}

    const bubble = document.getElementById('install-bubble');
    const btn = document.querySelector('.install-btn');
    if (!bubble || !btn) return;

    // Only hint at a button the visitor can actually see and press.
    if (btn.offsetParent === null) return;

    bubble.hidden = false;
    btn.classList.add('is-hinting');
    // Measured on the next frame: the bubble was hidden until the line above,
    // and getBoundingClientRect in the same frame can still report zero width,
    // which would put the arrow at the clamp minimum instead of on the button.
    requestAnimationFrame(positionInstallBubble);

    installHintTimer = setTimeout(() => { window.dismissInstallBubble(); }, 20000);
}

// On narrow screens the bubble is position:fixed (see the CSS note — the
// button sits against a clipped viewport edge, so anchoring to it cuts the
// bubble in half). Fixed positioning needs a real top value, and the header
// height changes when its contents wrap, so it is measured rather than
// guessed. Re-measured on resize and orientation change so rotating the
// phone doesn't leave it stranded.
function positionInstallBubble() {
    const bubble = document.getElementById('install-bubble');
    const btn = document.querySelector('.install-btn');
    if (!bubble || !btn || bubble.hidden) return;

    if (window.matchMedia('(max-width: 560px)').matches) {
        const r = btn.getBoundingClientRect();
        bubble.style.top = Math.round(r.bottom + 10) + 'px';
    } else {
        bubble.style.top = ''; // desktop uses the CSS-anchored position
    }

    // Point the arrow at the button's actual centre.
    //
    // This has to be measured, not assumed. The install button is the FIRST
    // child of a justify-content:flex-end nav, which makes it the LEFTMOST
    // item of the right-aligned cluster — so a hardcoded right-hand offset
    // pointed at the avatar instead. Its real position also shifts with the
    // language switcher's width, whether the quota badge is visible, and
    // whether the header has wrapped to two rows.
    const btnRect = btn.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const btnCentre = btnRect.left + btnRect.width / 2;

    // Clamp so the arrow can never sit on or past the bubble's rounded
    // corners, where it would look detached from the bubble itself.
    const MIN = 18, MAX = bubbleRect.width - 18;
    const x = Math.max(MIN, Math.min(btnCentre - bubbleRect.left, MAX));
    bubble.style.setProperty('--arrow-x', Math.round(x) + 'px');
}

window.addEventListener('resize', positionInstallBubble);
window.addEventListener('orientationchange', () => setTimeout(positionInstallBubble, 120));

function initInstall() {
    const { isIOS, isMac, isStandalone, isNativeShell } = platformInfo();

    // Browser installation is offered only from the secure web origin, never inside the native Android shell.
    if (!secureInstallContext() || isNativeShell) { hideInstallButtons(); return; }

    // Already running as an installed app — nothing to install.
    if (isStandalone || window.matchAppInstallState?.isInstalled()) { hideInstallButtons(); return; }

    // iOS and desktop Safari have no install event to wait for, but the
    // manual path always exists, so the button is meaningful immediately.
    if (isIOS || isMac) { showInstallButtons(); setTimeout(maybeShowInstallHint, 1200); return; }

    // Everyone else: stay hidden until beforeinstallprompt actually fires.
    // If it never does (Firefox, an already-dismissed prompt this session,
    // etc.), the button correctly never appears rather than sitting there
    // doing nothing when tapped.
}

if ('serviceWorker' in navigator && secureInstallContext()) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch((err) => {
            console.warn('[MatchApp install] service worker registration failed', err);
        });
    }, { once: true });
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initInstall, 100));
