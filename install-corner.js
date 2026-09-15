/* Compact install/update control anchored to the brand without nesting a button inside a link. */
(function(){
'use strict';
const copy={
 en:{install:'Download app',update:'Update app',installed:'Installed',safe:'Secure web app · HTTPS · browser security checks apply'},
 'pt-BR':{install:'Baixar app',update:'Atualizar app',installed:'Instalado',safe:'App web seguro · HTTPS · verificações de segurança do navegador'},
 es:{install:'Descargar app',update:'Actualizar app',installed:'Instalada',safe:'App web segura · HTTPS · controles de seguridad del navegador'},
 fr:{install:'Télécharger',update:'Mettre à jour',installed:'Installée',safe:'Application web sécurisée · HTTPS · contrôles du navigateur'},
 de:{install:'App laden',update:'App aktualisieren',installed:'Installiert',safe:'Sichere Web-App · HTTPS · Browser-Sicherheitsprüfungen'},
 it:{install:'Scarica app',update:'Aggiorna app',installed:'Installata',safe:'Web app sicura · HTTPS · controlli di sicurezza del browser'},
 tr:{install:'Uygulamayı indir',update:'Uygulamayı güncelle',installed:'Yüklendi',safe:'Güvenli web uygulaması · HTTPS · tarayıcı güvenlik kontrolleri'},
 ru:{install:'Скачать',update:'Обновить',installed:'Установлено',safe:'Безопасное веб-приложение · HTTPS · проверки безопасности браузера'},
 ar:{install:'تنزيل التطبيق',update:'تحديث التطبيق',installed:'مثبت',safe:'تطبيق ويب آمن · HTTPS · تطبق فحوصات أمان المتصفح'},
 hi:{install:'ऐप डाउनलोड करें',update:'ऐप अपडेट करें',installed:'इंस्टॉल है',safe:'सुरक्षित वेब ऐप · HTTPS · ब्राउज़र सुरक्षा जाँच लागू'},
 id:{install:'Unduh aplikasi',update:'Perbarui aplikasi',installed:'Terpasang',safe:'Aplikasi web aman · HTTPS · pemeriksaan keamanan browser'},
 ja:{install:'アプリを入手',update:'アプリを更新',installed:'インストール済み',safe:'安全なWebアプリ · HTTPS · ブラウザの安全確認が適用されます'},
 ko:{install:'앱 다운로드',update:'앱 업데이트',installed:'설치됨',safe:'안전한 웹 앱 · HTTPS · 브라우저 보안 검사가 적용됩니다'},
 zh:{install:'下载应用',update:'更新应用',installed:'已安装',safe:'安全的网页应用 · HTTPS · 浏览器安全检查适用'}
};
const lang=()=>String(window.MATCH_LANG||document.documentElement.lang||'en');
const text=()=>copy[lang()]||copy[lang().split('-')[0]]||copy.en;
function originalButton(){return [...document.querySelectorAll('.install-btn')].find(b=>!b.classList.contains('brand-install-corner'))||null;}
function stateLabel(btn){const c=text();if(window.matchAppUpdatePending||btn?.classList.contains('has-app-update'))return c.update;if(window.matchAppInstallState?.isInstalled?.()||btn?.classList.contains('is-app-installed'))return c.installed;return c.install;}
function build(){
 const brand=document.querySelector('.app-header .header-brand-area')||document.querySelector('.matchapp-brand-bar .matchapp-brand-link');
 const source=originalButton();if(!brand||!source)return;
 let cluster=brand.closest('.brand-app-cluster');
 if(!cluster){cluster=document.createElement('div');cluster.className='brand-app-cluster';brand.parentNode.insertBefore(cluster,brand);cluster.appendChild(brand);}
 let btn=cluster.querySelector('.brand-install-corner');
 if(!btn){btn=source.cloneNode(true);btn.removeAttribute('id');btn.classList.add('brand-install-corner');btn.removeAttribute('style');btn.removeAttribute('onclick');btn.type='button';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.installMatchApp?.();});cluster.appendChild(btn);source.classList.add('install-source-suppressed');}
 btn.style.display=source.style.display==='none'&&!window.matchAppUpdatePending&&!window.matchAppInstallState?.isInstalled?.()?'none':'inline-flex';
 btn.classList.toggle('has-app-update',!!window.matchAppUpdatePending||source.classList.contains('has-app-update'));
 btn.classList.toggle('is-app-installed',!btn.classList.contains('has-app-update')&&(window.matchAppInstallState?.isInstalled?.()||source.classList.contains('is-app-installed')));
 const label=stateLabel(btn);btn.textContent=label;btn.setAttribute('aria-label',label);btn.title=text().safe;btn.dataset.safety=text().safe;
 let trust=cluster.querySelector('.install-safety-mini');if(!trust){trust=document.createElement('span');trust.className='install-safety-mini';cluster.appendChild(trust);}trust.textContent=text().safe;
}
function boot(){build();new MutationObserver(()=>requestAnimationFrame(build)).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});document.addEventListener('matchapp:langchange',build);window.addEventListener('matchapp:installstate',build);window.addEventListener('appinstalled',build);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
