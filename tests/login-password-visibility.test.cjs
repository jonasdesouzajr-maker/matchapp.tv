const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const home = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = home.match(/<script id="login-password-visibility">([\s\S]*?)<\/script>/)?.[1];
const login = home.slice(home.indexOf('<div id="form-login"'), home.indexOf('<!-- PASSWORD RESET.'));
assert.ok(login.includes('id="login-password"') && script, 'actual login markup and toggle handler exist');

function page(lang = 'en') {
  const dom = new JSDOM('<!doctype html><html lang="' + lang + '"><body>' + login + '</body></html>', {
    runScripts: 'outside-only',url:'https://matchapp.tv/'
  });
  dom.window.eval(script);
  return {
    dom,
    input: dom.window.document.getElementById('login-password'),
    button: dom.window.document.querySelector('.auth-password-toggle')
  };
}

test('login has accessible show/hide eye button without affecting typed password', () => {
  const { dom, input, button } = page();
  input.value = 'A-stored-password-123!';
  assert.equal(input.type, 'password');
  assert.equal(input.autocomplete, 'current-password');
  assert.equal(button.type, 'button');
  assert.equal(button.getAttribute('aria-controls'), 'login-password');
  assert.equal(button.getAttribute('aria-label'), 'Show password');
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.ok(button.getAttribute('onclick').includes('toggleLoginPasswordVisibility'));

  dom.window.toggleLoginPasswordVisibility(button);
  assert.equal(input.type, 'text');
  assert.equal(input.value, 'A-stored-password-123!');
  assert.equal(button.getAttribute('aria-label'), 'Hide password');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(button.querySelector('[data-auth-eye-open]').hidden, true);
  assert.equal(button.querySelector('[data-auth-eye-closed]').hidden, false);

  dom.window.toggleLoginPasswordVisibility(button);
  assert.equal(input.type, 'password');
  assert.equal(input.value, 'A-stored-password-123!');
  assert.equal(button.getAttribute('aria-label'), 'Show password');
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(button.querySelector('[data-auth-eye-open]').hidden, false);
  assert.equal(button.querySelector('[data-auth-eye-closed]').hidden, true);
  dom.window.close();
});

test('Portuguese assistive label follows page language on each click', () => {
  const { dom, input, button } = page('pt-BR');
  dom.window.toggleLoginPasswordVisibility(button);
  assert.equal(input.type, 'text');
  assert.equal(button.getAttribute('aria-label'), 'Ocultar senha');
  dom.window.toggleLoginPasswordVisibility(button);
  assert.equal(button.getAttribute('aria-label'), 'Mostrar senha');
  dom.window.close();
});

test('all 14 chosen languages repaint the current show/hide label without toggling or submitting again', () => {
  const labels={en:['Show password','Hide password'],'pt-BR':['Mostrar senha','Ocultar senha'],es:['Mostrar contraseña','Ocultar contraseña'],fr:['Afficher le mot de passe','Masquer le mot de passe'],de:['Passwort anzeigen','Passwort ausblenden'],it:['Mostra password','Nascondi password'],tr:['Parolayı göster','Parolayı gizle'],ru:['Показать пароль','Скрыть пароль'],ar:['إظهار كلمة المرور','إخفاء كلمة المرور'],hi:['पासवर्ड दिखाएँ','पासवर्ड छिपाएँ'],id:['Tampilkan kata sandi','Sembunyikan kata sandi'],ja:['パスワードを表示','パスワードを隠す'],ko:['비밀번호 표시','비밀번호 숨기기'],zh:['显示密码','隐藏密码']};
  const {dom,input,button}=page();
  const w=dom.window;let submissions=0;w.handleEmailLogin=()=>submissions++;
  input.value='Retain-current-password';
  w.toggleLoginPasswordVisibility(button);
  for(const [language,copy] of Object.entries(labels)){
    // A stale document or device language must not override the saved choice.
    w.document.documentElement.lang='en';w.MATCH_LANG='en';w.localStorage.setItem('match_lang',language);
    w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
    assert.equal(input.type,'text');assert.equal(input.value,'Retain-current-password');
    assert.equal(button.getAttribute('aria-label'),copy[1]);assert.equal(button.title,copy[1]);assert.equal(button.getAttribute('aria-pressed'),'true');
    w.toggleLoginPasswordVisibility(button);
    assert.equal(input.type,'password');assert.equal(button.getAttribute('aria-label'),copy[0]);assert.equal(button.title,copy[0]);
    w.document.dispatchEvent(new w.CustomEvent('matchapp:languagechange'));
    assert.equal(input.type,'password');assert.equal(button.getAttribute('aria-label'),copy[0]);
    w.toggleLoginPasswordVisibility(button);
  }
  w.localStorage.setItem('match_lang','ar');w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:'ar'}));
  assert.equal(input.type,'text');assert.equal(button.getAttribute('aria-label'),labels.ar[1]);
  assert.equal(input.value,'Retain-current-password');assert.equal(submissions,0);dom.window.close();
});

test('registration display labels localize all 14 languages and a delayed full-name field without replacing controls', async () => {
  const markup=home.slice(home.indexOf('<div role="dialog" aria-modal="true" aria-label="Sign in to MatchApp"'),home.indexOf('<script src="https://cdn.jsdelivr.net/npm/@supabase'));
  const dom=new JSDOM('<!doctype html><html lang="en"><body>'+markup+'</body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
  const w=dom.window,doc=w.document;w.eval(script);
  await new Promise(resolve=>setImmediate(resolve));
  const form=doc.getElementById('form-signup'),email=doc.getElementById('reg-email'),password=doc.getElementById('reg-password'),create=form.querySelector('.gold-btn'),close=doc.querySelector('.auth-close');
  const handler=create.getAttribute('onclick');email.value='person@example.com';password.value='Keep-this-password';
  let clicks=0;create.addEventListener('click',()=>clicks++);
  const copy={en:['Email Address','Create Password','Full Name','Create Free Account','Close sign-in'],'pt-BR':['Endereço de e-mail','Crie uma senha','Nome completo','Criar conta gratuita','Fechar acesso'],es:['Correo electrónico','Crea una contraseña','Nombre completo','Crear cuenta gratuita','Cerrar inicio de sesión'],fr:['Adresse e-mail','Créez un mot de passe','Nom complet','Créer un compte gratuit','Fermer la connexion'],de:['E-Mail-Adresse','Passwort erstellen','Vollständiger Name','Kostenloses Konto erstellen','Anmeldung schließen'],it:['Indirizzo e-mail','Crea una password','Nome completo','Crea un account gratuito','Chiudi accesso'],tr:['E-posta adresi','Parola oluşturun','Ad ve soyad','Ücretsiz hesap oluştur','Giriş penceresini kapat'],ru:['Адрес электронной почты','Создайте пароль','Полное имя','Создать бесплатный аккаунт','Закрыть вход'],ar:['البريد الإلكتروني','أنشئ كلمة مرور','الاسم الكامل','إنشاء حساب مجاني','إغلاق تسجيل الدخول'],hi:['ईमेल पता','पासवर्ड बनाएँ','पूरा नाम','निःशुल्क खाता बनाएँ','साइन इन बंद करें'],id:['Alamat email','Buat kata sandi','Nama lengkap','Buat akun gratis','Tutup masuk'],ja:['メールアドレス','パスワードを作成','氏名','無料アカウントを作成','ログインを閉じる'],ko:['이메일 주소','비밀번호 만들기','이름','무료 계정 만들기','로그인 닫기'],zh:['电子邮箱','创建密码','姓名','创建免费账户','关闭登录']};
  w.localStorage.setItem('match_lang','de');doc.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
  const name=doc.createElement('input');name.id='reg-full-name';name.type='text';name.value='Existing Name';name.placeholder='Full Name';form.prepend(name);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(name.placeholder,copy.de[2]);
  for(const [language,labels] of Object.entries(copy)){
    w.localStorage.setItem('match_lang',language);doc.dispatchEvent(new w.CustomEvent('matchapp:languagechange'));
    assert.equal(doc.getElementById('reg-email'),email);assert.equal(doc.getElementById('reg-password'),password);assert.equal(form.querySelector('.gold-btn'),create);
    assert.equal(email.placeholder,labels[0]);assert.equal(password.placeholder,labels[1]);assert.equal(name.placeholder,labels[2]);
    assert.equal(email.getAttribute('aria-label'),labels[0]);assert.equal(password.getAttribute('aria-label'),labels[1]);assert.equal(name.getAttribute('aria-label'),labels[2]);
    assert.equal(create.textContent,labels[3]);assert.equal(close.getAttribute('aria-label'),labels[4]);assert.equal(close.title,labels[4]);
    assert.equal(email.value,'person@example.com');assert.equal(password.value,'Keep-this-password');assert.equal(name.value,'Existing Name');assert.equal(password.type,'password');assert.equal(create.getAttribute('onclick'),handler);
  }
  const mutations=[];
  const observer=new w.MutationObserver(records=>mutations.push(...records));observer.observe(form,{childList:true,subtree:true});
  for(let i=0;i<8;i++)doc.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
  await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(mutations.length,0,'identical display copy must not rewrite button text or feed child-list observers');observer.disconnect();
  assert.equal(clicks,0);dom.window.close();
});

test('eye button is scoped to login and reserves password input space', () => {
  assert.match(login, /class="auth-password-field"/);
  assert.match(home, /\.auth-password-field #login-password \{[^}]*padding-right: 62px/);
  assert.match(home, /\.auth-password-toggle \{[^}]*width: 44px; height: 44px/);
  const signup = home.slice(home.indexOf('<div id="form-signup"'), home.indexOf('<p id="auth-message"'));
  assert.match(signup, /id="reg-password"/);
  assert.doesNotMatch(signup, /auth-password-toggle/);
});
