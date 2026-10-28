/* Execute the actual signup function with local DOM and mocked auth responses.
 * No accounts, sessions, emails or external writes are created by these tests. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const functions = source.match(/window\.handleEmailSignup = async function\(\) \{[\s\S]*?\n\};/g) || [];
assert.equal(functions.length, 1, 'Execute the unique production email-signup function');
const confirmed = {data:{session:{user:{id:'fixture-registered-player'}}},error:null};
const plain = value => JSON.parse(JSON.stringify(value));

function fixture(t, options = {}) {
  const marker = options.marker === 'lumina' ? '<dialog id="lm-dialog" data-lumina-registration></dialog>' :
    options.marker === 'unmarked' ? '<dialog id="lm-dialog"></dialog>' :
    options.marker === 'other' ? '<div id="unrelated" data-lumina-registration></div>' : '';
  const dom = new JSDOM('<!doctype html><body><div id="main-auth-modal" style="display:flex">' +
    '<div id="form-signup"><input id="reg-email"><input id="reg-password"><button class="gold-btn">Create account</button></div>' +
    '<p id="auth-message"></p></div>' + marker, {url:'https://matchapp.tv/'});
  t.after(() => dom.window.close());
  const document = dom.window.document, calls = [], timers = [], sync = [];
  let closed = 0;
  document.getElementById('reg-email').value = '  player@example.test  ';
  document.getElementById('reg-password').value = ' keep password spaces ';
  const window = {
    location:{href:'https://matchapp.tv/'},
    MatchAppErrors:{sync(element) {sync.push(element.getAttribute('data-ma-error'));}},
    closeAuthModal() {closed++; document.getElementById('main-auth-modal').style.display = 'none';}
  };
  const supabaseClient = {auth:{async signUp(input) {
    calls.push(plain(input));
    if (options.throwError) throw Error('fixture connection failure');
    return options.result || confirmed;
  }}};
  vm.runInNewContext(functions[0], {
    window, document, supabaseClient,
    setTimeout(fn, delay) {timers.push({fn,delay}); return timers.length;}
  });
  return {window,document,calls,timers,sync,run:() => window.handleEmailSignup(),closed:() => closed,
    message:document.getElementById('auth-message'),button:document.querySelector('#form-signup .gold-btn')};
}

function assertSignupRequest(f) {
  assert.deepEqual(f.calls, [{
    email:'player@example.test', password:' keep password spaces ',
    options:{data:{matchapp_first_time_onboarding_v1:true},emailRedirectTo:'https://matchapp.tv/'}
  }]);
  assert.equal(f.window.__maEmailSignupPending, false);
  assert.equal(f.button.disabled, false);
}

test('ordinary signup retains its success text and 700 ms profile redirect without a Lumina registration marker', async t => {
  for (const marker of [undefined,'unmarked','other']) {
    const f = fixture(t, {marker}); await f.run();
    assertSignupRequest(f);
    assert.equal(f.message.innerText, 'Signed in. Opening your profile...');
    assert.equal(f.message.getAttribute('data-ma-error'), 'false');
    assert.equal(f.closed(), 0);
    assert.equal(f.document.getElementById('main-auth-modal').style.display, 'flex');
    assert.equal(f.window.location.href, 'https://matchapp.tv/');
    assert.equal(f.timers.length, 1);
    assert.equal(f.timers[0].delay, 700);
    f.timers[0].fn();
    assert.equal(f.window.location.href, '/profile/profile.html');
  }
});

test('marked Lumina signup with an immediate session closes auth without redirecting or claiming a game save', async t => {
  const f = fixture(t, {marker:'lumina'}); await f.run();
  assertSignupRequest(f);
  assert.equal(f.closed(), 1);
  assert.equal(f.document.getElementById('main-auth-modal').style.display, 'none');
  assert.equal(f.window.location.href, 'https://matchapp.tv/');
  assert.equal(f.timers.length, 0);
  assert.doesNotMatch(f.message.innerText, /Opening your profile|saved|progress retained/i);
  assert.equal(f.document.getElementById('lm-dialog').hasAttribute('data-lumina-registration'), true,
    'The existing game owns its lifecycle and marker');
});

test('signup without a session keeps email verification guidance and never performs a Lumina handoff', async t => {
  for (const marker of [undefined,'lumina']) {
    const f = fixture(t, {marker,result:{data:{user:{id:'fixture-unverified-player'},session:null},error:null}});
    await f.run(); assertSignupRequest(f);
    assert.equal(f.message.innerText, "Check your inbox and confirm your email using the newest link. Already expired? Use 'Resend confirmation email' on the Log In tab.");
    assert.equal(f.message.getAttribute('data-ma-error'), 'false');
    assert.equal(f.closed(), 0);
    assert.equal(f.document.getElementById('main-auth-modal').style.display, 'flex');
    assert.equal(f.timers.length, 0);
    assert.equal(f.window.location.href, 'https://matchapp.tv/');
  }
});

test('signup service errors and thrown failures keep existing error behavior without closing or redirecting', async t => {
  for (const marker of [undefined,'lumina']) {
    for (const failure of ['response','throw']) {
      const f = fixture(t, {marker,throwError:failure === 'throw',
        result:{data:null,error:{message:'Fixture signup rejected'}}});
      await f.run(); assertSignupRequest(f);
      assert.equal(f.message.innerText, failure === 'response' ? 'Fixture signup rejected' : 'Could not create the account. Please retry.');
      assert.equal(f.message.getAttribute('data-ma-error'), 'true');
      assert.equal(f.sync.at(-1), 'true');
      assert.equal(f.closed(), 0);
      assert.equal(f.document.getElementById('main-auth-modal').style.display, 'flex');
      assert.equal(f.timers.length, 0);
      assert.equal(f.window.location.href, 'https://matchapp.tv/');
    }
  }
});
