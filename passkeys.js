/* Device sign-in is verified by Supabase Auth. No biometric, PIN or private key
   is read, saved or simulated by MatchApp. Enrollment always requires sign-in. */
(function () {
  'use strict';
  const STRINGS = {
    en: {signIn:'Sign in with Face ID / fingerprint / PIN', title:'Device sign-in', add:'Add a passkey', help:'Use your device unlock to sign in again. Your device or password manager keeps the private key; Supabase stores only the public credential. MatchApp never receives your biometrics or PIN.', unsupported:'Passkeys are not supported here. Use Google or email to sign in.', disabled:'Device sign-in is not available yet. Use Google or email instead.', waiting:'Follow the secure prompt on your device…', cancelled:'Device sign-in was cancelled. Try again or use Google or email.', failure:'Could not complete device sign-in. Try again or use Google or email.', added:'Passkey added. Next time, choose device sign-in and unlock your device.', done:'Signed in securely.', required:'Sign in and confirm your email before adding a passkey.', remove:'Remove', removeQuestion:'Remove this passkey from MatchApp? You can still sign in with Google or email.', empty:'No passkeys added yet.', listFailure:'Could not load your passkeys. Please try again.', signInFirst:'Sign in first', credential:'Passkey', removed:'Passkey removed.'},
    'pt-BR': {signIn:'Entrar com Face ID / digital / PIN',title:'Entrar com seu dispositivo',add:'Adicionar uma chave de acesso',help:'Use o desbloqueio do dispositivo para entrar novamente. Seu dispositivo ou gerenciador guarda a chave privada; o Supabase guarda só a credencial pública. O MatchApp nunca recebe sua biometria ou PIN.',unsupported:'Chaves de acesso não são compatíveis aqui. Entre com Google ou e-mail.',disabled:'Acesso pelo dispositivo ainda indisponível. Use Google ou e-mail.',waiting:'Siga a solicitação segura no seu dispositivo…',cancelled:'Acesso cancelado. Tente novamente ou use Google ou e-mail.',failure:'Não foi possível entrar. Tente novamente ou use Google ou e-mail.',added:'Chave adicionada. Na próxima vez, escolha o acesso pelo dispositivo e desbloqueie-o.',done:'Você entrou com segurança.',required:'Entre e confirme seu e-mail antes de adicionar uma chave.',remove:'Remover',removeQuestion:'Remover esta chave de acesso do MatchApp? Você ainda pode entrar com Google ou e-mail.',empty:'Nenhuma chave adicionada.',listFailure:'Não foi possível carregar suas chaves. Tente novamente.',signInFirst:'Entre primeiro',credential:'Chave de acesso',removed:'Chave removida.'},
    es: {signIn:'Entrar con Face ID / huella / PIN',title:'Acceso con tu dispositivo',add:'Añadir una clave de acceso',help:'Usa el desbloqueo de tu dispositivo para volver a entrar. Tu dispositivo o gestor guarda la clave privada; Supabase guarda solo la credencial pública. MatchApp nunca recibe tu biometría ni PIN.',unsupported:'Las claves de acceso no son compatibles aquí. Usa Google o correo.',disabled:'El acceso con dispositivo aún no está disponible. Usa Google o correo.',waiting:'Sigue la solicitud segura en tu dispositivo…',cancelled:'Acceso cancelado. Intenta de nuevo o usa Google o correo.',failure:'No se pudo entrar. Intenta de nuevo o usa Google o correo.',added:'Clave añadida. La próxima vez, elige acceso con dispositivo y desbloquéalo.',done:'Has entrado de forma segura.',required:'Inicia sesión y confirma tu correo antes de añadir una clave.',remove:'Eliminar',removeQuestion:'¿Eliminar esta clave de MatchApp? Puedes seguir entrando con Google o correo.',empty:'Todavía no tienes claves.',listFailure:'No se pudieron cargar tus claves. Intenta de nuevo.',signInFirst:'Inicia sesión primero',credential:'Clave de acceso',removed:'Clave eliminada.'},
    fr:{signIn:'Se connecter avec Face ID / empreinte / code',title:'Connexion sur cet appareil',add:'Ajouter une clé d’accès'},
    de:{signIn:'Mit Face ID / Fingerabdruck / PIN anmelden',title:'Geräteanmeldung',add:'Passkey hinzufügen'},
    it:{signIn:'Accedi con Face ID / impronta / PIN',title:'Accesso dal dispositivo',add:'Aggiungi una passkey'},
    tr:{signIn:'Face ID / parmak izi / PIN ile giriş',title:'Cihazla giriş',add:'Geçiş anahtarı ekle'},
    ru:{signIn:'Войти с Face ID / отпечатком / PIN',title:'Вход с устройства',add:'Добавить ключ доступа'},
    ar:{signIn:'الدخول ببصمة الوجه / الإصبع / رمز الجهاز',title:'الدخول بالجهاز',add:'إضافة مفتاح مرور'},
    hi:{signIn:'Face ID / फ़िंगरप्रिंट / PIN से साइन इन',title:'डिवाइस से साइन इन',add:'पासकी जोड़ें'},
    id:{signIn:'Masuk dengan Face ID / sidik jari / PIN',title:'Masuk lewat perangkat',add:'Tambahkan passkey'},
    ja:{signIn:'Face ID / 指紋 / PINでログイン',title:'デバイスでログイン',add:'パスキーを追加'},
    ko:{signIn:'Face ID / 지문 / PIN으로 로그인',title:'기기 로그인',add:'패스키 추가'},
    zh:{signIn:'使用面容 / 指纹 / PIN 登录',title:'设备登录',add:'添加通行密钥'}
  };
  let busy = false;
  let signedIn = false;
  let listVersion = 0;
  const client = () => window.supabaseClient;
  const t = key => (STRINGS[window.MATCH_LANG || document.documentElement.lang] || {})[key] || STRINGS.en[key];
  const supported = () => !!(window.isSecureContext && window.PublicKeyCredential && navigator.credentials && typeof client()?.auth.signInWithPasskey === 'function');
  function message(key, error = false) {
    document.querySelectorAll('[data-passkey-status]').forEach(el => { el.textContent = t(key); el.classList.toggle('passkey-error', error); });
  }
  function errorKey(error) {
    if (error?.code === 'passkey_disabled') return 'disabled';
    if (/NotAllowedError|AbortError/.test(error?.name || '') || /cancel|not allowed|timed out/i.test(error?.message || '')) return 'cancelled';
    return 'failure';
  }
  function render() {
    document.querySelectorAll('[data-passkey-text]').forEach(el => { el.textContent = t(el.dataset.passkeyText); });
    document.querySelectorAll('[data-passkey-action]').forEach(el => { el.disabled = busy || !supported() || (el.dataset.passkeyAction === 'add' && !signedIn); });
    const login = document.querySelector('[data-passkey-sign-in-first]'); if (login) login.hidden = signedIn;
    if (!supported()) message('unsupported');
  }
  async function loadList() {
    const host = document.getElementById('passkey-list'); if (!host) return;
    const version = ++listVersion; host.replaceChildren();
    if (!signedIn || !supported()) return;
    try {
      const {data, error} = await client().auth.passkey.list();
      if (version !== listVersion) return;
      if (error) { message(error.code === 'passkey_disabled' ? 'disabled' : 'listFailure', true); return; }
      if (!Array.isArray(data) || !data.length) { host.textContent = t('empty'); return; }
      data.forEach(passkey => {
        const row = document.createElement('div'); row.className = 'passkey-row';
        const name = document.createElement('span'); name.textContent = passkey.friendly_name || t('credential');
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'passkey-remove'; remove.textContent = t('remove');
        remove.setAttribute('aria-label', t('remove') + ': ' + name.textContent); remove.disabled = busy;
        remove.addEventListener('click', async () => {
          if (busy || !window.confirm(t('removeQuestion'))) return;
          busy = true; render(); remove.disabled = true;
          try { const {error} = await client().auth.passkey.delete({passkeyId:passkey.id}); if (error) throw error; message('removed'); }
          catch (_) { message('failure',true); }
          finally { busy = false; render(); loadList(); }
        });
        row.append(name, remove); host.append(row);
      });
    } catch (_) { if (version === listVersion) message('listFailure',true); }
  }
  async function run(action) {
    if (busy || !supported()) return;
    busy = true; render(); message('waiting');
    try {
      if (action === 'add') {
        const {data, error} = await client().auth.getUser();
        if (error || !data.user || data.user.is_anonymous || (!data.user.email_confirmed_at && !data.user.phone_confirmed_at)) { message('required',true); return; }
        const result = await client().auth.registerPasskey(); if (result.error) throw result.error;
        if (!result.data?.id) throw new Error('Missing verified credential');
        message('added');
      } else {
        const {data, error} = await client().auth.signInWithPasskey();
        if (error) throw error;
        if (!data?.session || !data.user) throw new Error('Missing verified session');
        message('done');
        // The SDK persists the verified session and emits SIGNED_IN. Existing
        // MatchApp profile/quota hydration remains the authority for membership.
        window.closeAuthModal?.();
      }
    } catch (error) { message(errorKey(error),true); }
    finally { busy = false; render(); if (action === 'add') loadList(); }
  }
  function boot() {
    render();
    document.querySelectorAll('[data-passkey-action]').forEach(b => b.addEventListener('click', () => run(b.dataset.passkeyAction)));
    client()?.auth.getSession().then(({data}) => { signedIn = !!data?.session?.user; render(); loadList(); }).catch(() => {});
    // Do not await another Auth operation inside its callback (SDK lock).
    client()?.auth.onAuthStateChange((_event, session) => { signedIn = !!session?.user; setTimeout(() => { render(); loadList(); },0); });
    document.addEventListener('matchapp:langchange', () => { render(); loadList(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
