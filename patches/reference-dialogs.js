/* Queued adult-app notices. Callers retain their actions and await a boolean. */
(function () {
  'use strict';
  if (window.MatchAppDialogs || /^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(location.pathname) || /\/(callback|confirm)\.html$/.test(location.pathname)) return;

  var copy = {
    en: ['Notice', 'Confirm action', 'OK', 'Cancel', 'Confirm'],
    pt: ['Aviso', 'Confirmar ação', 'OK', 'Cancelar', 'Confirmar'],
    es: ['Aviso', 'Confirmar acción', 'Aceptar', 'Cancelar', 'Confirmar'],
    fr: ['Information', 'Confirmer l’action', 'OK', 'Annuler', 'Confirmer'],
    de: ['Hinweis', 'Aktion bestätigen', 'OK', 'Abbrechen', 'Bestätigen'],
    it: ['Avviso', 'Conferma azione', 'OK', 'Annulla', 'Conferma'],
    tr: ['Bildirim', 'İşlemi onayla', 'Tamam', 'İptal', 'Onayla'],
    ru: ['Уведомление', 'Подтвердите действие', 'ОК', 'Отмена', 'Подтвердить'],
    ar: ['تنبيه', 'تأكيد الإجراء', 'حسنًا', 'إلغاء', 'تأكيد'],
    hi: ['सूचना', 'कार्रवाई की पुष्टि करें', 'ठीक है', 'रद्द करें', 'पुष्टि करें'],
    id: ['Pemberitahuan', 'Konfirmasi tindakan', 'OK', 'Batal', 'Konfirmasi'],
    ja: ['お知らせ', '操作の確認', 'OK', 'キャンセル', '確認'],
    ko: ['알림', '작업 확인', '확인', '취소', '계속'],
    zh: ['提示', '确认操作', '确定', '取消', '确认']
  };
  var queue = [], active = null, transitioning = false;
  var dialog, title, message, cancel, confirm;

  function language(value) {
    if (!value) {
      var saved = '';
      try { saved = localStorage.getItem('match_lang') || ''; } catch (_) {}
      value = saved || window.MATCH_LANG || document.documentElement.lang || 'en';
    }
    var key = String(value).toLowerCase().replace(/_/g, '-').split('-')[0];
    return copy[key] ? key : 'en';
  }
  function focus(node) {
    if (!node || !node.isConnected || typeof node.focus !== 'function' || node.disabled) return;
    try { node.focus({preventScroll:true}); } catch (_) { try { node.focus(); } catch (_) {} }
  }
  function paint(value) {
    if (!active || !dialog) return;
    var lang = language(value), words = copy[lang], options = active.options;
    dialog.lang = lang === 'pt' ? 'pt-BR' : lang;
    dialog.dir = lang === 'ar' ? 'rtl' : 'ltr';
    title.textContent = options.title || words[active.type === 'confirm' ? 1 : 0];
    message.textContent = active.message;
    cancel.textContent = options.cancelLabel || words[3];
    confirm.textContent = options.confirmLabel || words[active.type === 'confirm' ? 4 : 2];
  }
  function settle(value) {
    if (!active || active.settled) return;
    var item = active;
    item.settled = true;
    active = null;
    transitioning = true;
    if (dialog) {
      cancel.disabled = confirm.disabled = true;
      if (dialog.open) {
        try { dialog.close(); } catch (_) { dialog.removeAttribute('open'); }
      }
    }
    item.resolve(value === true);
    // Keep a burst of clicks on the closing control away from the next request.
    // Awaiting callers finish their promise chains and re-enable the trigger first.
    window.setTimeout(function () {
      if (!active) focus(item.trigger);
      transitioning = false;
      pump();
    }, 0);
  }
  function build() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.id = 'ma-reference-dialog';
    dialog.className = 'ma-reference-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'ma-reference-dialog-title');
    dialog.setAttribute('aria-describedby', 'ma-reference-dialog-message');
    var panel = document.createElement('section');
    panel.className = 'ma-reference-dialog__panel';
    title = document.createElement('h2');
    title.id = 'ma-reference-dialog-title';
    title.className = 'ma-reference-dialog__title';
    message = document.createElement('p');
    message.id = 'ma-reference-dialog-message';
    message.className = 'ma-reference-dialog__message';
    var actions = document.createElement('div');
    actions.className = 'ma-reference-dialog__actions';
    cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'ma-reference-dialog__button ma-reference-dialog__cancel';
    cancel.dataset.dialogAction = 'cancel';
    confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'ma-reference-dialog__button ma-reference-dialog__confirm';
    confirm.dataset.dialogAction = 'confirm';
    actions.append(cancel, confirm);
    panel.append(title, message, actions);
    dialog.appendChild(panel);
    document.body.appendChild(dialog);
    cancel.addEventListener('click', function (event) { if (event.detail <= 1) settle(false); });
    confirm.addEventListener('click', function (event) { if (event.detail <= 1) settle(true); });
    dialog.addEventListener('cancel', function (event) { event.preventDefault(); settle(false); });
    // A queued native close event may arrive after the next request is open.
    dialog.addEventListener('close', function () { if (!dialog.open) settle(false); });
    dialog.addEventListener('click', function (event) { if (event.target === dialog && event.detail <= 1) settle(false); });
    dialog.addEventListener('keydown', function (event) {
      if (!active) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); settle(false); return; }
      if (event.key !== 'Tab') return;
      var first = active.type === 'confirm' ? cancel : confirm, last = confirm;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); focus(last); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); focus(first); }
    });
  }
  function pump() {
    if (active || transitioning || !queue.length) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', pump, {once:true}); return; }
    build();
    active = queue.shift();
    cancel.hidden = active.type !== 'confirm';
    cancel.disabled = confirm.disabled = false;
    cancel.autofocus = active.type === 'confirm';
    confirm.autofocus = active.type !== 'confirm';
    paint();
    // Old engines without modal dialogs retain their native boolean behavior.
    // This is a capability fallback; window.alert/confirm are never replaced.
    if (typeof dialog.showModal !== 'function') {
      try {
        if (active.type === 'confirm') settle(window.confirm(active.message) === true);
        else { window.alert(active.message); settle(true); }
      } catch (_) { settle(false); }
      return;
    }
    try { dialog.showModal(); }
    catch (_) { settle(false); return; }
    focus(active.type === 'confirm' ? cancel : confirm);
  }
  function request(type, text, options) {
    options = options || {};
    var trigger = options.trigger || document.activeElement;
    if (dialog && dialog.contains(trigger)) trigger = active ? active.trigger : null;
    return new Promise(function (resolve) {
      queue.push({type:type,message:String(text == null ? '' : text),options:{
        title:options.title == null ? '' : String(options.title),
        confirmLabel:options.confirmLabel == null ? '' : String(options.confirmLabel),
        cancelLabel:options.cancelLabel == null ? '' : String(options.cancelLabel)
      },trigger:trigger,resolve:resolve,settled:false});
      pump();
    });
  }
  window.MatchAppDialogs = {
    alert:function (text, options) { return request('alert', text, options); },
    confirm:function (text, options) { return request('confirm', text, options); }
  };
  document.addEventListener('matchapp:langchange', function (event) { paint(event.detail && event.detail.lang); });
  window.addEventListener('storage', function (event) { if (event.key === 'match_lang') paint(event.newValue); });
  document.dispatchEvent(new CustomEvent('matchapp:dialogs-ready'));
})();
