/* Compact install/update control anchored to the brand without nesting a button inside a link. */
(function(){
'use strict';
const copy={
 en:{install:'Download app',update:'Update app',installed:'Installed',safe:'Secure web app \u00b7 HTTPS \u00b7 browser security checks apply'},
 'pt-BR':{install:'Baixar app',update:'Atualizar app',installed:'Instalado',safe:'App web seguro \u00b7 HTTPS \u00b7 verifica\u00e7\u00f5es de seguran\u00e7a do navegador'},
 es:{install:'Descargar app',update:'Actualizar app',installed:'Instalada',safe:'App web segura \u00b7 HTTPS \u00b7 controles de seguridad del navegador'},
 fr:{install:'T\u00e9l\u00e9charger',update:'Mettre \u00e0 jour',installed:'Install\u00e9e',safe:'Application web s\u00e9curis\u00e9e \u00b7 HTTPS \u00b7 contr\u00f4les du navigateur'},
 de:{install:'App laden',update:'App aktualisieren',installed:'Installiert',safe:'Sichere Web-App \u00b7 HTTPS \u00b7 Browser-Sicherheitspr\u00fcfungen'},
 it:{install:'Scarica app',update:'Aggiorna app',installed:'Installata',safe:'Web app sicura \u00b7 HTTPS \u00b7 controlli di sicurezza del browser'},
 tr:{install:'Uygulamay\u0131 indir',update:'Uygulamay\u0131 g\u00fcncelle',installed:'Y\u00fcklendi',safe:'G\u00fcvenli web uygulamas\u0131 \u00b7 HTTPS \u00b7 taray\u0131c\u0131 g\u00fcvenlik kontrolleri'},
 ru:{install:'\u0421\u043a\u0430\u0447\u0430\u0442\u044c',update:'\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c',installed:'\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e',safe:'\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0435 \u0432\u0435\u0431-\u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u00b7 HTTPS \u00b7 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430'},
 ar:{install:'\u062a\u0646\u0632\u064a\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642',update:'\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0637\u0628\u064a\u0642',installed:'\u0645\u062b\u0628\u062a',safe:'\u062a\u0637\u0628\u064a\u0642 \u0648\u064a\u0628 \u0622\u0645\u0646 \u00b7 HTTPS \u00b7 \u062a\u0637\u0628\u0642 \u0641\u062d\u0648\u0635\u0627\u062a \u0623\u0645\u0627\u0646 \u0627\u0644\u0645\u062a\u0635\u0641\u062d'},
 hi:{install:'\u0910\u092a \u0921\u093e\u0909\u0928\u0932\u094b\u0921 \u0915\u0930\u0947\u0902',update:'\u0910\u092a \u0905\u092a\u0921\u0947\u091f \u0915\u0930\u0947\u0902',installed:'\u0907\u0902\u0938\u094d\u091f\u0949\u0932 \u0939\u0948',safe:'\u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0935\u0947\u092c \u0910\u092a \u00b7 HTTPS \u00b7 \u092c\u094d\u0930\u093e\u0909\u091c\u093c\u0930 \u0938\u0941\u0930\u0915\u094d\u0937\u093e \u091c\u093e\u0901\u091a \u0932\u093e\u0917\u0942'},
 id:{install:'Unduh aplikasi',update:'Perbarui aplikasi',installed:'Terpasang',safe:'Aplikasi web aman \u00b7 HTTPS \u00b7 pemeriksaan keamanan browser'},
 ja:{install:'\u30a2\u30d7\u30ea\u3092\u5165\u624b',update:'\u30a2\u30d7\u30ea\u3092\u66f4\u65b0',installed:'\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u6e08\u307f',safe:'\u5b89\u5168\u306aWeb\u30a2\u30d7\u30ea \u00b7 HTTPS \u00b7 \u30d6\u30e9\u30a6\u30b6\u306e\u5b89\u5168\u78ba\u8a8d\u304c\u9069\u7528\u3055\u308c\u307e\u3059'},
 ko:{install:'\uc571 \ub2e4\uc6b4\ub85c\ub4dc',update:'\uc571 \uc5c5\ub370\uc774\ud2b8',installed:'\uc124\uce58\ub428',safe:'\uc548\uc804\ud55c \uc6f9 \uc571 \u00b7 HTTPS \u00b7 \ube0c\ub77c\uc6b0\uc800 \ubcf4\uc548 \uac80\uc0ac\uac00 \uc801\uc6a9\ub429\ub2c8\ub2e4'},
 zh:{install:'\u4e0b\u8f7d\u5e94\u7528',update:'\u66f4\u65b0\u5e94\u7528',installed:'\u5df2\u5b89\u88c5',safe:'\u5b89\u5168\u7684\u7f51\u9875\u5e94\u7528 \u00b7 HTTPS \u00b7 \u6d4f\u89c8\u5668\u5b89\u5168\u68c0\u67e5\u9002\u7528'}
};
const lang=()=>String(window.MATCH_LANG||document.documentElement.lang||'en');
const text=()=>copy[lang()]||copy[lang().split('-')[0]]||copy.en;
function originalButton(){return [...document.querySelectorAll('.install-btn')].find(b=>!b.classList.contains('brand-install-corner'))||null;}
function stateLabel(btn){const c=text();if(window.matchAppUpdatePending||btn?.classList.contains('has-app-update'))return c.update;if(window.matchAppInstallState?.isInstalled?.()||btn?.classList.contains('is-app-installed'))return c.installed;return c.install;}
function build(){
 const source=originalButton();
 document.querySelectorAll('.brand-install-corner,.install-safety-mini').forEach(n=>n.remove());
 if(!source)return;
 source.classList.remove('install-source-suppressed');
 source.removeAttribute('data-app-hint');
 const label=stateLabel(source);
 const span=source.querySelector('.install-label');
 if(span) span.textContent=label;
 else if(!source.closest('.kids-header')) source.textContent=label;
 source.setAttribute('aria-label',label);
 source.title=text().safe;
}
function boot(){
  build();
  document.addEventListener('matchapp:langchange',build);
  window.addEventListener('matchapp:installstate',build);
  window.addEventListener('appinstalled',build);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
