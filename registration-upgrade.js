/* MatchApp durable registration. Core identity is write-once in Postgres.
   Country and region selections are local, validated and available offline. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const toast = (message, isError) => window.showToast?.(message, Boolean(isError));
  const geo = () => window.MatchAppGeography;
  const value = id => ($(id)?.value || '').trim();
  let saving = false;
  let regionTouched = false;

  function validateBirthdate(raw) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return false;
    const [d, m, y] = raw.split('/').map(Number);
    const birth = new Date(Date.UTC(y, m - 1, d));
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const min = new Date(today);
    min.setUTCFullYear(min.getUTCFullYear() - 120);
    return birth.getUTCFullYear() === y && birth.getUTCMonth() === m - 1 &&
      birth.getUTCDate() === d && birth.getTime() <= today && birth >= min;
  }

  function errorMessage(error) {
    const raw = String(error?.message || '');
    if (/birthdate|date\/time field value out of range|invalid input syntax for type date/i.test(raw))
      return 'Enter a valid date of birth as DD/MM/YYYY.';
    if (/identity field|full name|country|star sign/i.test(raw))
      return 'Check your name, country, birth date and star sign.';
    if (/sign in first|jwt|session|not authenticated/i.test(raw))
      return 'Your session expired. Sign in again before saving.';
    if (/terms|privacy/i.test(raw))
      return 'Accept the Terms and Privacy Policy before saving.';
    if (/timeout|network|fetch|unavailable/i.test(raw))
      return 'Connection interrupted. Check your saved profile before retrying.';
    return 'Registration could not be saved. Your entries remain editable; please retry.';
  }

  function form() {
    if (location.pathname !== '/profile/profile.html') return;
    const section = $('editable-fields-section');
    const country = $('profile-country');
    if (!section || !country || $('registration-account-fields')) return;

    // Region sits next to country rather than being a second free-text identity.
    const regionField = document.createElement('div');
    regionField.className = 'input-group';
    regionField.id = 'registration-region-group';
    regionField.innerHTML = '<label for="registration-region">State / region</label><select id="registration-region" required autocomplete="address-level1"><option value="">Select your state or region</option></select>';
    country.closest('.input-group')?.after(regionField);

    const box = document.createElement('div');
    box.id = 'registration-account-fields';
    box.className = 'registration-account-fields';
    box.innerHTML = `
      <div class="registration-divider"><strong>Account preferences &amp; privacy</strong>
        <small>Identity fields above lock permanently after registration. These preferences can be changed later.</small></div>
      <label for="registration-language">Preferred language
        <select id="registration-language"><option value="en">English</option><option value="pt-BR">Português (Brasil)</option>
        <option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option>
        <option value="it">Italiano</option><option value="tr">Türkçe</option><option value="ru">Русский</option>
        <option value="ar">العربية</option><option value="hi">हिन्दी</option><option value="id">Bahasa Indonesia</option>
        <option value="ja">日本語</option><option value="ko">한국어</option><option value="zh">中文</option></select></label>
      <label class="registration-check"><input type="checkbox" id="registration-terms" required>
        <span>I agree to the <a href="/terms.html" target="_blank" rel="noopener">Terms</a>. Required.</span></label>
      <label class="registration-check"><input type="checkbox" id="registration-privacy" required>
        <span>I have read the <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>. Required.</span></label>
      <label class="registration-check"><input type="checkbox" id="registration-marketing">
        <span>Send me optional MatchApp product/news updates. I can change this later.</span></label>
      <p class="registration-lock-note">🔒 Name, country, birth date and star sign become permanently locked to this account only after a confirmed save.</p>
    `;
    section.appendChild(box);

    const lang = $('registration-language');
    const desired = localStorage.getItem('match_lang') || document.documentElement.lang || 'en';
    if (Array.from(lang.options).some(o => o.value === desired)) lang.value = desired;

    geo()?.initCountries();
    geo()?.bindRegionSelect($('registration-region'), localStorage.getItem('match_user_region') || '');
    country.addEventListener('change', () => { regionTouched = true; });
    $('registration-region').addEventListener('change', () => { regionTouched = true; });

    const previous = window.saveProfileData;
    window.saveProfileData = async function () {
      if (saving) return;
      if (localStorage.getItem('match_profile_locked') === 'true') return previous?.();

      const name = value('profile-name');
      const selectedCountry = value('profile-country');
      const region = value('registration-region');
      const dob = value('profile-dob');
      const sign = value('profile-starsign');

      if (!name || name.length > 200) { toast('Enter your full name (up to 200 characters).', true); $('profile-name')?.focus(); return; }
      if (!geo()?.isCountry(selectedCountry)) { toast('Select your country from the list.', true); country.focus(); return; }
      if (!geo()?.isRegion(selectedCountry, region)) { toast('Select a state or region for your chosen country.', true); $('registration-region')?.focus(); return; }
      if (!validateBirthdate(dob)) { toast('Enter a valid birth date in DD/MM/YYYY format.', true); $('profile-dob')?.focus(); return; }
      if (!['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].includes(sign)) {
        toast('Select your star sign.', true); $('profile-starsign')?.focus(); return;
      }
      if (!$('registration-terms').checked || !$('registration-privacy').checked) {
        toast('Accept the Terms and Privacy Policy to complete registration.', true); return;
      }

      const sb = window.supabaseClient;
      if (!sb) { toast('Account connection unavailable. Your entries are safe.', true); return; }
      const button = $('save-profile-btn');
      saving = true;
      if (button) button.disabled = true;
      try {
        const { data: auth, error: authError } = await sb.auth.getUser();
        const user = auth?.user;
        if (authError || !user) { toast('Sign in before saving your registration.', true); window.openAuthModal?.(); return; }
        const parameters = {
          p_name: name, p_country: selectedCountry, p_dob: dob, p_sign: sign,
          p_language: value('registration-language'), p_region: region,
          p_marketing: $('registration-marketing').checked,
          p_accept_terms: true, p_accept_privacy: true
        };
        const { data: response, error } = await sb.rpc('complete_registration', parameters);
        // A response can be lost after Postgres committed: reconcile, do not repeat
        // a write blindly or tell someone a saved identity is still editable.
        let saved = response;
        if (error || !response?.profile_locked || !response?.registration_completed) {
          const { data: existing } = await sb.from('profiles')
            .select('full_name,country,dob,star_sign,age,profile_locked,preferred_region,registration_completed_at')
            .eq('id', user.id).maybeSingle();
          if (existing?.profile_locked && existing?.registration_completed_at &&
              existing.full_name === name && existing.country === selectedCountry &&
              existing.dob === dob && existing.star_sign === sign &&
              existing.preferred_region === region) {
            saved = existing;
          } else throw error || new Error('Save not confirmed');
        }

        if (saved.full_name !== name || saved.country !== selectedCountry ||
            saved.dob !== dob || saved.star_sign !== sign) {
          throw new Error('An earlier identity is already locked to this account. Reload to see it.');
        }
        const current = await sb.auth.getSession();
        if (current?.data?.session?.user?.id !== user.id)
          throw new Error('Your session changed. Sign in and reload your profile.');

        // Local cache is just a convenience; never let storage quota or a
        // hydration/network failure falsely say an already-committed save failed.
        try {
          const fields = { full_name:'match_user_name', country:'match_user_country',
            dob:'match_user_dob', star_sign:'match_user_sign', age:'match_user_age' };
          for (const [field, key] of Object.entries(fields)) localStorage.setItem(key,String(saved[field] ?? ''));
          localStorage.setItem('match_user_region',region);
          localStorage.setItem('match_portfolio_owner',user.id);
          localStorage.setItem('match_profile_locked','true');
        } catch (storageError) { console.warn('Registration saved but local cache unavailable',storageError?.name); }

        try {
          const conversionKey = 'match_registration_conversion_' + user.id;
          if (localStorage.getItem(conversionKey) !== '1') {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event:'registration_completed', registration_method:'verified_profile' });
            localStorage.setItem(conversionKey,'1');
          }
        } catch (_) { /* Analytics cannot block a confirmed registration. */ }

        try { await window.hydrateProfileFromAuth?.(user); } catch (_) { /* Server save already confirmed. */ }
        window.checkAndRenderProfileState?.();
        toast('Registration saved. Your profile is locked and available on your account.');
        document.dispatchEvent(new CustomEvent('matchapp:historychange'));
      } catch (error) {
        console.warn('Registration save failed',error?.code||error?.message||'unknown');
        toast(errorMessage(error),true);
      } finally {
        saving = false;
        if (button) button.disabled = localStorage.getItem('match_profile_locked') === 'true';
      }
    };
  }

  async function hydratePreferences() {
    const sb = window.supabaseClient;
    if (!sb) return;
    try {
      const { data: auth } = await sb.auth.getUser();
      if (!auth?.user) return;
      const { data, error } = await sb.from('profiles')
        .select('country,preferred_language,preferred_region,marketing_consent,registration_completed_at')
        .eq('id',auth.user.id).maybeSingle();
      if (error || !data) return;
      if ($('registration-language') && data.preferred_language &&
          Array.from($('registration-language').options).some(o=>o.value===data.preferred_language))
        $('registration-language').value=data.preferred_language;
      if (!regionTouched && data.country && geo()?.isCountry(data.country)) {
        geo()?.initCountries();
        $('profile-country').value = geo().resolveCountry(data.country)[0];
      }
      if (data.preferred_region) {
        try { localStorage.setItem('match_user_region',data.preferred_region); } catch (_) {}
        if (!regionTouched) geo()?.bindRegionSelect($('registration-region'),data.preferred_region);
        window.checkAndRenderProfileState?.();
      } else if (!regionTouched) {
        geo()?.bindRegionSelect($('registration-region'),'');
      }
      if ($('registration-marketing')) $('registration-marketing').checked=!!data.marketing_consent;
    } catch (_) { /* Preferences will load on next visit if offline. */ }
  }

  function init() { form(); hydratePreferences(); }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
