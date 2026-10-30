/* Original articulated Lumina companions. No raster cards or external assets. */
(function () {
  'use strict';
  var app = document.getElementById('app');
  var eyes = '<g fill="#302442"><ellipse cx="42" cy="45" rx="3" ry="4"/><ellipse cx="60" cy="45" rx="3" ry="4"/></g><g fill="#fff"><circle cx="43" cy="44" r="1"/><circle cx="61" cy="44" r="1"/></g>';
  var animals = {
    giraffe: '<g class="lm-tail" fill="#c58a43"><path d="M69 68Q94 69 87 53L81 56Q84 67 68 63Z"/><ellipse cx="86" cy="53" rx="4" ry="7"/></g><g class="lm-legs" fill="#f3be62"><rect x="30" y="68" width="12" height="24" rx="6"/><rect x="57" y="68" width="12" height="24" rx="6"/></g><ellipse cx="49" cy="65" rx="29" ry="20" fill="#f3be62"/><g fill="#b77740"><circle cx="30" cy="62" r="5"/><circle cx="67" cy="66" r="5"/><circle cx="46" cy="76" r="4"/></g><g class="lm-head"><path d="M40 31L38 13M60 31L63 13" stroke="#f6c76c" stroke-width="5"/><g fill="#b77740"><circle cx="38" cy="12" r="4"/><circle cx="63" cy="12" r="4"/></g><g class="lm-ears" fill="#f3be62"><ellipse cx="28" cy="32" rx="11" ry="6" transform="rotate(22 28 32)"/><ellipse cx="73" cy="32" rx="11" ry="6" transform="rotate(-22 73 32)"/></g><ellipse cx="50" cy="43" rx="23" ry="24" fill="#ffda86"/><circle cx="50" cy="26" r="4" fill="#b77740"/>'+eyes+'<ellipse cx="51" cy="58" rx="18" ry="11" fill="#ffe8b8"/><path d="M44 59Q51 66 58 59" fill="none" stroke="#705036" stroke-width="2" stroke-linecap="round"/></g>',
    fox: '<g class="lm-tail"><path d="M64 66Q94 42 90 28Q110 75 67 84Z" fill="#f6ad65"/><path d="M90 28Q99 48 96 58L86 51Z" fill="#fff1d9"/></g><g class="lm-legs" fill="#734159"><rect x="31" y="73" width="11" height="18" rx="5"/><rect x="58" y="73" width="11" height="18" rx="5"/></g><ellipse cx="50" cy="66" rx="25" ry="21" fill="#ec8d50"/><ellipse cx="48" cy="69" rx="14" ry="16" fill="#ffe8c5"/><g class="lm-head"><path d="M27 41L24 14L44 29L63 28L80 14L77 44Z" fill="#ec8d50"/><path d="M29 24L31 38L39 31M72 24L70 38L65 31" fill="#a75d65"/><path d="M25 40Q51 18 78 40Q74 64 51 69Q29 63 25 40" fill="#f6ad65"/><path d="M27 46Q40 43 51 58Q62 43 76 46Q70 64 51 69Q32 63 27 46" fill="#fff1d9"/>'+eyes+'<ellipse cx="51" cy="58" rx="4" ry="3" fill="#302442"/></g>',
    butterfly: '<g class="lm-wing-left"><path d="M49 49C12 1 3 39 22 51C2 78 30 89 49 59Z" fill="#aa8af4" stroke="#e1c5ff" stroke-width="1.5"/><path d="M44 47C20 24 14 39 28 47M42 60Q21 77 25 61" fill="none" stroke="#6ee5dd" stroke-width="5" stroke-linecap="round"/></g><g class="lm-wing-right"><path d="M51 49C88 1 97 39 78 51C98 78 70 89 51 59Z" fill="#d090eb" stroke="#f4d0ff" stroke-width="1.5"/><path d="M56 47C80 24 86 39 72 47M58 60Q79 77 75 61" fill="none" stroke="#f6d987" stroke-width="5" stroke-linecap="round"/></g><path d="M46 37Q37 23 36 28M54 37Q63 23 64 28" fill="none" stroke="#f5d99b" stroke-width="2" stroke-linecap="round"/><ellipse cx="50" cy="53" rx="6" ry="22" fill="#51416b"/><circle cx="50" cy="38" r="8" fill="#ffe6ad"/><circle cx="47" cy="38" r="1.5" fill="#302442"/><circle cx="53" cy="38" r="1.5" fill="#302442"/>',
    dolphin: '<g class="lm-tail"><path d="M29 66Q9 51 7 61L16 74L5 81Q23 91 33 72Z" fill="#57bfcf"/></g><path d="M42 39Q43 19 55 25L59 40Z" fill="#73d6e1"/><path d="M23 66C31 35 52 27 69 36Q79 40 79 50L93 54Q97 60 79 62C64 80 41 82 23 66" fill="#83e0e8"/><path d="M26 68Q48 70 76 59Q63 80 42 77Z" fill="#d2f6f0"/><g class="lm-fin"><path d="M52 59Q54 84 67 82L65 59Z" fill="#57bfcf"/></g><circle cx="71" cy="47" r="3.5" fill="#263758"/><circle cx="72" cy="46" r="1.2" fill="white"/><path d="M77 58Q81 60 86 58" fill="none" stroke="#407a98" stroke-width="1.5"/>',
    jellyfish: '<g class="lm-tentacles" fill="none" stroke-linecap="round"><path d="M32 59Q22 72 33 84T28 96M47 61Q58 73 47 89M62 61Q52 76 66 91M75 58Q88 73 76 85" stroke="#caa7ef" stroke-width="4"/><path d="M39 62Q30 77 43 94M69 61Q78 77 65 94" stroke="#78dcd8" stroke-width="2"/></g><g class="lm-bell"><path d="M21 57C17 12 83 12 79 57Q71 68 64 60Q55 70 48 61Q38 70 32 60Q25 65 21 57" fill="#b795f1" stroke="#ead5ff" stroke-width="1.5"/><path d="M29 45Q31 25 48 25" fill="none" stroke="#e7d2ff" stroke-width="4" stroke-linecap="round"/>'+eyes+'<path d="M47 53Q51 57 55 53" fill="none" stroke="#493161" stroke-width="1.5"/></g>'
  };
  function markup(name) {
    var effect = name === 'dolphin' || name === 'jellyfish' ? 'lm-bubbles' : 'lm-glints';
    return '<svg class="lm-companion lm-'+name+'" data-companion="'+name+'" viewBox="0 0 100 110" aria-hidden="true" focusable="false">'+
      '<ellipse class="lm-shadow" cx="50" cy="100" rx="28" ry="3" fill="#050615" opacity=".24"/>'+
      '<g class="lm-effects '+effect+'" fill="none" stroke="'+(effect==='lm-bubbles'?'#7ee8eb':'#f5d89c')+'" stroke-width="1.2"><circle cx="12" cy="34" r="2"/><circle cx="87" cy="18" r="2.5"/><path d="M14 72h7m-3.5-3.5v7M78 92h6m-3-3v6"/></g><g class="lm-animal">'+animals[name]+'</g></svg>';
  }
  function mount() {
    if (app.dataset.screen !== 'home' || app.querySelector('.lm-companions')) return;
    var section = app.querySelector(':scope > .screen');
    if (!section) return;
    var row = document.createElement('div'); row.className='lm-companions'; row.setAttribute('aria-hidden','true');
    row.innerHTML=['fox','butterfly','giraffe','dolphin','jellyfish'].map(markup).join('');
    section.insertBefore(row,section.firstChild);
  }
  var observer=new MutationObserver(mount);
  observer.observe(app,{childList:true,attributes:true,attributeFilter:['data-screen']});
  function visibility(){document.documentElement.classList.toggle('lm-companions-paused',document.hidden);}
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('pagehide',function(){observer.disconnect();document.removeEventListener('visibilitychange',visibility);});
  window.addEventListener('pageshow',function(event){if(event.persisted){observer.observe(app,{childList:true,attributes:true,attributeFilter:['data-screen']});document.addEventListener('visibilitychange',visibility);mount();visibility();}});
  mount(); visibility();
})();
