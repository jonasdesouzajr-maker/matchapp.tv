(() => {
  'use strict';

  const form = document.getElementById('watch-plan');
  const field = name => form.elements.namedItem(name);
  const result = document.getElementById('plan-result');
  const share = document.getElementById('share-plan');
  const manualLink = document.getElementById('share-url');
  const status = document.getElementById('share-status');
  const languageLink = document.getElementById('planner-language');
  const strings = JSON.parse(document.getElementById('planner-strings').textContent);
  const locale = document.documentElement.lang;
  const number = new Intl.NumberFormat(locale);
  const clock = new Intl.DateTimeFormat(locale, {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
  });
  const day = 24 * 60;

  function timeValue(text) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text)) return NaN;
    const [hour, minute] = text.split(':').map(Number);
    return hour * 60 + minute;
  }

  function clockInput(minutes) {
    return [Math.floor(minutes / 60), minutes % 60].map(n => String(n).padStart(2, '0')).join(':');
  }

  function integer(text, min, max) {
    if (!/^\d{1,4}$/.test(text)) return NaN;
    const value = Number(text);
    return value >= min && value <= max ? value : NaN;
  }

  function readPlan() {
    const start = timeValue(field('start').value);
    const end = timeValue(field('end').value);
    const buffer = integer(field('buffer').value, 0, 240);
    const runtime = integer(field('runtime').value, 1, 600);
    const mode = field('mode').value;
    if (![start, end, buffer, runtime].every(Number.isFinite) || !['film', 'episodes'].includes(mode)) {
      return { error: 'invalid' };
    }
    if (start === end) return { error: 'sameTime' };
    const windowMinutes = (end - start + day) % day;
    if (buffer > windowMinutes) return { error: 'bufferTooLong' };
    return { start, end, buffer, runtime, mode, minutes: windowMinutes - buffer };
  }

  function planHash(plan) {
    return 'p=' + [plan.start, plan.end, plan.buffer, plan.runtime, Number(plan.mode === 'episodes')].join('.');
  }

  function render() {
    manualLink.hidden = true;
    status.textContent = '';
    const plan = readPlan();
    share.disabled = Boolean(plan.error);
    languageLink.hash = plan.error ? '' : planHash(plan);
    if (plan.error) {
      result.textContent = strings[plan.error];
      return;
    }
    const { start, buffer, runtime, mode, minutes } = plan;
    const episodes = mode === 'episodes';
    const count = episodes ? Math.floor(minutes / runtime) : 1;
    const remaining = minutes - count * runtime;
    const end = start + buffer + count * runtime;
    const finish = clock.format(new Date(Date.UTC(2000, 0, 1, 0, end))) +
      (end >= day ? ' ' + strings.nextDay : '');
    const values = { minutes, runtime, buffer, count, remaining: Math.max(0, remaining), over: Math.max(0, runtime - minutes) };
    const template = episodes ? (count ? strings.episodes : strings.noneFit) :
      (remaining >= 0 ? strings.filmFits : strings.filmOver);
    result.textContent = template.replace(/\{(minutes|runtime|buffer|count|remaining|over|finish)\}/g,
      (_, key) => key === 'finish' ? finish : number.format(values[key]));
  }

  // Shared fragments contain only five bounded numbers, never personal or account data.
  function restore() {
    const match = /^#p=(\d{1,4})\.(\d{1,4})\.(\d{1,3})\.(\d{1,3})\.([01])$/.exec(location.hash);
    if (!match) return;
    const [start, end, buffer, runtime, mode] = match.slice(1).map(Number);
    if (start >= day || end >= day || start === end || buffer > 240 ||
        runtime < 1 || runtime > 600 || buffer > (end - start + day) % day) return;
    field('start').value = clockInput(start);
    field('end').value = clockInput(end);
    field('buffer').value = String(buffer);
    field('runtime').value = String(runtime);
    field('mode').value = mode ? 'episodes' : 'film';
  }

  share.addEventListener('click', async () => {
    const plan = readPlan();
    if (plan.error) return;
    const url = new URL(location.pathname, location.origin);
    url.hash = planHash(plan);
    status.textContent = '';
    manualLink.hidden = true;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url: url.href });
        status.textContent = strings.shared;
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url.href);
        status.textContent = strings.copied;
        return;
      } catch { /* Some WebViews require copying manually. */ }
    }
    manualLink.value = url.href;
    manualLink.hidden = false;
    manualLink.focus();
    manualLink.select();
    status.textContent = strings.copyManually;
  });

  form.addEventListener('input', render);
  form.addEventListener('submit', event => {
    event.preventDefault();
    render();
  });
  window.addEventListener('hashchange', () => { restore(); render(); });
  restore();
  render();
})();
