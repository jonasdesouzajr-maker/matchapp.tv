'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..'),source=fs.readFileSync(path.join(ROOT,'patches/reference-dialogs.js'),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function fixture(route='/'){
 const w=new JSDOM('<!doctype html><html class="ma-reference" lang="en"><body><button id="trigger">Original action</button><button id="other">Other action</button></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true}).window;
 const stats={shows:0,closes:0,native:[]};
 w.HTMLDialogElement.prototype.showModal=function(){assert.equal(this.open,false);stats.shows++;this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;stats.closes++;this.open=false;this.dispatchEvent(new w.Event('close'));};
 const nativeAlert=w.alert=message=>{stats.native.push(['alert',message]);};
 const nativeConfirm=w.confirm=message=>{stats.native.push(['confirm',message]);return true;};
 w.document.getElementById('trigger').focus();
 w.eval(source);
 return {w,stats,nativeAlert,nativeConfirm,api:w.MatchAppDialogs,
  dialog:()=>w.document.getElementById('ma-reference-dialog'),
  button:action=>w.document.querySelector('[data-dialog-action="'+action+'"]'),close:()=>w.close()};
}

test('confirmation is cancel-first, plain-text, exactly once and never replaces native globals',async()=>{
 const f=fixture();try{
  const initial=f.api,trigger=f.w.document.activeElement;let settlements=0;
  const pending=f.api.confirm('Delete <img src=x onerror=alert(1)>?\nThis is plain text.',{title:'Confirm <script> title'}).then(value=>{settlements++;return value;});
  const d=f.dialog();
  assert.equal(d.open,true);assert.equal(d.getAttribute('role'),'alertdialog');
  assert.equal(f.w.document.activeElement,f.button('cancel'));
  assert.equal(d.querySelector('img,script'),null);assert.ok(d.querySelector('p').textContent.includes('<img'));
  assert.equal(d.querySelector('h2').textContent,'Confirm <script> title');
  assert.equal(d.getAttribute('aria-describedby'),d.querySelector('p').id);
  f.button('confirm').click();f.button('confirm').click();d.dispatchEvent(new f.w.Event('cancel',{cancelable:true}));
  assert.equal(await pending,true);await tick();
  assert.equal(settlements,1);assert.equal(f.stats.closes,1);assert.equal(f.w.document.activeElement,trigger);
  f.w.eval(source);assert.equal(f.w.MatchAppDialogs,initial);assert.equal(f.w.document.querySelectorAll('#ma-reference-dialog').length,1);
  assert.equal(f.w.alert,f.nativeAlert);assert.equal(f.w.confirm,f.nativeConfirm);assert.deepEqual(f.stats.native,[]);
 }finally{f.close();}
});

test('cancel, Escape, native cancellation, backdrop and external close all resolve false',async()=>{
 for(const action of ['cancel','escape','native-cancel','backdrop','external-close']){
  const f=fixture();try{
   const pending=f.api.confirm('Keep the saved item?'),d=f.dialog();
   d.querySelector('.ma-reference-dialog__panel').dispatchEvent(new f.w.MouseEvent('click',{bubbles:true}));assert.equal(d.open,true,'panel clicks cannot dismiss');
   if(action==='cancel')f.button('cancel').click();
   if(action==='escape'){const event=new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});d.dispatchEvent(event);assert.equal(event.defaultPrevented,true);}
   if(action==='native-cancel'){const event=new f.w.Event('cancel',{cancelable:true});d.dispatchEvent(event);assert.equal(event.defaultPrevented,true);}
   if(action==='backdrop')d.dispatchEvent(new f.w.MouseEvent('click',{bubbles:true}));
   if(action==='external-close')d.close();
   assert.equal(await pending,false,action);await tick();assert.equal(f.w.document.activeElement.id,'trigger');
  }finally{f.close();}
 }
});

test('Tab stays within the dialog and alert exposes one acknowledged action',async()=>{
 const f=fixture();try{
  const pending=f.api.confirm('Confirm this action?'),d=f.dialog();
  const tab=(shiftKey=false)=>d.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Tab',shiftKey,bubbles:true,cancelable:true}));
  tab(true);assert.equal(f.w.document.activeElement,f.button('confirm'));
  tab();assert.equal(f.w.document.activeElement,f.button('cancel'));
  f.button('cancel').click();assert.equal(await pending,false);await tick();
  const alert=f.api.alert('The item was saved.');
  assert.equal(f.button('cancel').hidden,true);assert.equal(f.w.document.activeElement,f.button('confirm'));
  tab();assert.equal(f.w.document.activeElement,f.button('confirm'));
  f.button('confirm').click();assert.equal(await alert,true);
 }finally{f.close();}
});

test('queued requests never overlap or reuse one closing click, and disabled triggers restore after caller finally',async()=>{
 const f=fixture();try{
  const trigger=f.w.document.getElementById('trigger'),restored=[];
  trigger.addEventListener('focus',()=>restored.push({disabled:trigger.disabled,open:f.dialog().open}));
  const first=(async()=>{trigger.disabled=true;try{return await f.api.confirm('First action?',{trigger});}finally{trigger.disabled=false;}})();
  let secondResolved=false;
  const second=f.api.confirm('Second action?').then(value=>{secondResolved=true;return value;});
  assert.equal(f.stats.shows,1);f.button('confirm').click();f.button('confirm').click();
  assert.equal(await first,true);await Promise.resolve();
  assert.equal(trigger.disabled,false);
  assert.equal(f.dialog().open,false);assert.equal(secondResolved,false);
  await tick();assert.equal(f.stats.shows,2);assert.equal(f.dialog().querySelector('p').textContent,'Second action?');
  assert.deepEqual(restored,[{disabled:false,open:false}],'caller finally re-enables its trigger before restoration and before the next modal opens');
  assert.equal(f.w.document.activeElement,f.button('cancel'),'opening the next queued dialog owns focus');
  f.dialog().dispatchEvent(new f.w.Event('close'));
  await Promise.resolve();assert.equal(secondResolved,false,'a late native close event from the previous request cannot cancel its successor');assert.equal(f.dialog().open,true);
  f.button('confirm').dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,detail:2}));
  await Promise.resolve();assert.equal(secondResolved,false,'the second click of a double-click cannot approve the next request');assert.equal(f.dialog().open,true);
  f.button('cancel').click();assert.equal(await second,false);await tick();assert.equal(f.w.document.activeElement,trigger);
 }finally{f.close();}
});

test('every supported chosen locale has authored labels, and live Arabic direction follows the app language',async()=>{
 const expected={en:['Cancel','Confirm'], 'pt-BR':['Cancelar','Confirmar'],es:['Cancelar','Confirmar'],fr:['Annuler','Confirmer'],de:['Abbrechen','Bestätigen'],it:['Annulla','Conferma'],tr:['İptal','Onayla'],ru:['Отмена','Подтвердить'],ar:['إلغاء','تأكيد'],hi:['रद्द करें','पुष्टि करें'],id:['Batal','Konfirmasi'],ja:['キャンセル','確認'],ko:['취소','계속'],zh:['取消','确认']};
 const f=fixture();try{
  Object.defineProperty(f.w.navigator,'language',{value:'de-DE',configurable:true});
  for(const [locale,labels]of Object.entries(expected)){
   f.w.MATCH_LANG=locale;const pending=f.api.confirm('Localized caller text');
   assert.deepEqual([f.button('cancel').textContent,f.button('confirm').textContent],labels,locale);
   assert.equal(f.dialog().dir,locale==='ar'?'rtl':'ltr');f.button('cancel').click();assert.equal(await pending,false);await tick();
  }
  f.w.MATCH_LANG='en';f.w.localStorage.setItem('match_lang','ar');
  const pending=f.api.alert('نص الرسالة');assert.equal(f.dialog().lang,'ar');assert.equal(f.dialog().dir,'rtl');assert.equal(f.button('confirm').textContent,'حسنًا');
  f.w.MATCH_LANG='fr';f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:langchange',{detail:{lang:'fr'}}));
  assert.equal(f.dialog().lang,'fr');assert.equal(f.dialog().dir,'ltr');assert.equal(f.dialog().querySelector('h2').textContent,'Information');
  assert.equal(f.dialog().querySelector('p').textContent,'نص الرسالة','caller text is preserved as authored');
  f.button('confirm').click();assert.equal(await pending,true);
 }finally{f.close();}
});

test('custom labels and removed triggers stay safe; unsupported dialog engines preserve boolean promises',async()=>{
 const f=fixture();try{
  const trigger=f.w.document.getElementById('trigger'),pending=f.api.confirm('Remove this?',{trigger,title:'Custom title',confirmLabel:'Delete saved title',cancelLabel:'Keep it'});
  assert.equal(f.button('confirm').textContent,'Delete saved title');assert.equal(f.button('cancel').textContent,'Keep it');trigger.remove();
  f.button('cancel').click();assert.equal(await pending,false);await tick();
  delete f.w.HTMLDialogElement.prototype.showModal;
  assert.equal(await f.api.confirm('Old-engine confirmation?'),true);await tick();
  assert.equal(await f.api.alert('Old-engine notice.'),true);await tick();
  assert.deepEqual(f.stats.native,[['confirm','Old-engine confirmation?'],['alert','Old-engine notice.']]);
 }finally{f.close();}
});

test('dialog loading stays outside isolated Kids/auth/voice routes and styles preserve touch, motion and scope',()=>{
 for(const route of ['/kids/','/oauth/consent.html','/private-voice/','/callback.html']){
  const f=fixture(route);try{assert.equal(f.api,undefined);assert.equal(f.dialog(),null);}finally{f.close();}
 }
 const css=fs.readFileSync(path.join(ROOT,'patches/reference-dialogs.css'),'utf8');
 assert.match(css,/min-height:44px!important/);assert.match(css,/gap:8px/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/html\.ma-reference\.reduce-motion/);assert.match(css,/#ma-reference-dialog/);assert.match(css,/safe-area-inset-bottom/);
});
