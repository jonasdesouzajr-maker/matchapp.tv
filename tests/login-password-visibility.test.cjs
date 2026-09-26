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
    runScripts: 'outside-only'
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

test('eye button is scoped to login and reserves password input space', () => {
  assert.match(login, /class="auth-password-field"/);
  assert.match(home, /\.auth-password-field #login-password \{[^}]*padding-right: 62px/);
  assert.match(home, /\.auth-password-toggle \{[^}]*width: 44px; height: 44px/);
  const signup = home.slice(home.indexOf('<div id="form-signup"'), home.indexOf('<p id="auth-message"'));
  assert.match(signup, /id="reg-password"/);
  assert.doesNotMatch(signup, /auth-password-toggle/);
});
