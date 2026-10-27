/* Lumina Match in-browser adaptation. Genuine version 2.3 card imagery; no Android or billing calls. */
export const MAX_LEVEL = 350;
const ASSETS = [
  'axolotl.webp','bunny.jpg','panda.webp','kitten.webp','koala.webp','puppy.webp',
  'unicorn.webp','owl.jpg','lamb.webp','hamster.webp','giraffe.webp','lion.webp',
  'chick.webp','teddy.webp','raccoon.webp','sloth.webp','dragon.webp','phoenix.webp',
  'pegasus.webp','monkey.webp','elephant.webp','piglet.webp','mouse.webp','tiger.webp',
  'robot.webp','cactus.webp','rocket.webp','gem.jpg','moon.jpg','star.jpg',
  'candle.webp','cupcake.webp','donut.webp','guitar.webp','balloon.webp','icecream.webp',
  'heart.jpg','rainbow.jpg','cloud.jpg','comet.jpg','teapot.webp','potion.webp',
  'crystal.jpg','nebula.jpg','sun.jpg','planet.jpg','lantern.jpg','treasure.webp',
  'butterfly.jpg','hourglass.webp','wand.webp','kite.webp','orb.jpg','snowflake.jpg'
];
const TEXT = {
  en:['Play','Levels','Beat your time','How to play','Match the glowing cards before time runs out.','Keep your eyes on the cards and find each pair.','Back to MatchApp Ai','Level','Pairs','Moves','Time','Pause','Resume','Menu','You did it!','Next level','Try again','Time is up!','Your best','Unlocked','Back','Sound','On','Off','Choose a level','Completed','Keep playing','Personal best!','No completed levels yet.','Find all pairs to unlock the next level.'],
  'pt-BR':['Jogar','Fases','Vença seu tempo','Como jogar','Encontre os pares brilhantes antes do tempo acabar.','Observe as cartas e encontre cada par.','Voltar ao MatchApp Ai','Fase','Pares','Jogadas','Tempo','Pausar','Continuar','Menu','Você conseguiu!','Próxima fase','Tentar de novo','O tempo acabou!','Seu recorde','Desbloqueadas','Voltar','Som','Ligado','Desligado','Escolha uma fase','Concluído','Continuar jogando','Novo recorde!','Ainda não há fases concluídas.','Encontre todos os pares para desbloquear a próxima fase.'],
  es:['Jugar','Niveles','Supera tu tiempo','Cómo jugar','Encuentra las parejas antes de que se acabe el tiempo.','Observa las cartas y encuentra cada pareja.','Volver a MatchApp Ai','Nivel','Parejas','Movimientos','Tiempo','Pausar','Seguir','Menú','¡Lo lograste!','Siguiente nivel','Reintentar','¡Se acabó el tiempo!','Tu récord','Desbloqueados','Volver','Sonido','Activado','Desactivado','Elige un nivel','Completado','Seguir jugando','¡Nuevo récord!','Aún no hay niveles completados.','Encuentra todas las parejas para desbloquear el siguiente nivel.'],
  fr:['Jouer','Niveaux','Bats ton temps','Comment jouer','Associe les cartes avant la fin du temps.','Observe les cartes et retrouve chaque paire.','Retour à MatchApp Ai','Niveau','Paires','Coups','Temps','Pause','Reprendre','Menu','Bravo !','Niveau suivant','Réessayer','Temps écoulé !','Ton record','Débloqués','Retour','Son','Oui','Non','Choisis un niveau','Terminé','Continuer','Nouveau record !','Aucun niveau terminé.','Trouve toutes les paires pour débloquer le niveau suivant.'],
  de:['Spielen','Level','Schlag deine Zeit','Spielanleitung','Finde alle Paare, bevor die Zeit abläuft.','Merke dir die Karten und finde jedes Paar.','Zurück zu MatchApp Ai','Level','Paare','Züge','Zeit','Pause','Weiter','Menü','Geschafft!','Nächstes Level','Erneut versuchen','Zeit abgelaufen!','Bestzeit','Freigeschaltet','Zurück','Ton','An','Aus','Level auswählen','Abgeschlossen','Weiterspielen','Neue Bestzeit!','Noch keine Level abgeschlossen.','Finde alle Paare, um das nächste Level freizuschalten.'],
  it:['Gioca','Livelli','Batti il tuo tempo','Come giocare','Trova le coppie prima che scada il tempo.','Osserva le carte e trova ogni coppia.','Torna a MatchApp Ai','Livello','Coppie','Mosse','Tempo','Pausa','Riprendi','Menu','Ce l’hai fatta!','Livello successivo','Riprova','Tempo scaduto!','Record','Sbloccati','Indietro','Audio','On','Off','Scegli un livello','Completato','Continua','Nuovo record!','Nessun livello completato.','Trova tutte le coppie per sbloccare il prossimo livello.'],
  tr:['Oyna','Seviyeler','Süreni geç','Nasıl oynanır','Süre bitmeden eşleşen kartları bul.','Kartları aklında tut ve her çifti eşleştir.','MatchApp Ai’ye dön','Seviye','Çiftler','Hamle','Süre','Duraklat','Devam et','Menü','Başardın!','Sonraki seviye','Yeniden dene','Süre bitti!','En iyi süre','Açılan','Geri','Ses','Açık','Kapalı','Seviye seç','Tamamlandı','Oynamaya devam et','Yeni rekor!','Henüz biten seviye yok.','Sonraki seviyeyi açmak için tüm çiftleri bul.'],
  ru:['Играть','Уровни','Побей рекорд','Как играть','Найди пары до окончания времени.','Запоминай карточки и находи пары.','Вернуться в MatchApp Ai','Уровень','Пары','Ходы','Время','Пауза','Продолжить','Меню','Победа!','Следующий уровень','Повторить','Время вышло!','Рекорд','Открыто','Назад','Звук','Вкл.','Выкл.','Выбери уровень','Пройдено','Продолжить игру','Новый рекорд!','Пока нет пройденных уровней.','Найди все пары, чтобы открыть следующий уровень.'],
  ar:['العب','المستويات','تجاوز وقتك','طريقة اللعب','اعثر على الأزواج قبل انتهاء الوقت.','تذكر البطاقات وطابق كل زوج.','العودة إلى MatchApp Ai','المستوى','الأزواج','المحاولات','الوقت','إيقاف مؤقت','متابعة','القائمة','أحسنت!','المستوى التالي','حاول مجددًا','انتهى الوقت!','أفضل وقت','المفتوحة','رجوع','الصوت','تشغيل','إيقاف','اختر المستوى','مكتمل','واصل اللعب','رقم قياسي جديد!','لا توجد مستويات مكتملة بعد.','طابق كل الأزواج لفتح المستوى التالي.'],
  hi:['खेलें','लेवल','अपना समय हराएँ','कैसे खेलें','समय खत्म होने से पहले जोड़े खोजें।','कार्ड याद रखें और सभी जोड़े मिलाएँ।','MatchApp Ai पर लौटें','लेवल','जोड़े','चालें','समय','रोकें','जारी रखें','मेन्यू','बहुत अच्छे!','अगला लेवल','फिर खेलें','समय खत्म!','आपका रिकॉर्ड','अनलॉक','वापस','आवाज़','चालू','बंद','लेवल चुनें','पूरा','खेलते रहें','नया रिकॉर्ड!','अभी कोई लेवल पूरा नहीं हुआ।','अगला लेवल खोलने के लिए सभी जोड़े मिलाएँ।'],
  id:['Main','Level','Kalahkan waktumu','Cara bermain','Temukan semua pasangan sebelum waktu habis.','Ingat kartu dan cocokkan setiap pasangan.','Kembali ke MatchApp Ai','Level','Pasangan','Langkah','Waktu','Jeda','Lanjut','Menu','Berhasil!','Level berikut','Coba lagi','Waktu habis!','Rekor','Terbuka','Kembali','Suara','Nyala','Mati','Pilih level','Selesai','Terus main','Rekor baru!','Belum ada level selesai.','Cari semua pasangan untuk membuka level berikutnya.'],
  ja:['プレイ','レベル','ベストタイムに挑戦','遊び方','時間内にペアをすべて見つけよう。','カードを覚えて同じ絵をそろえよう。','MatchApp Ai に戻る','レベル','ペア','手数','残り時間','一時停止','再開','メニュー','クリア！','次のレベル','もう一度','時間切れ！','ベスト','解放済み','戻る','音声','オン','オフ','レベルを選ぶ','クリア済み','続ける','新記録！','クリアしたレベルはまだありません。','すべてのペアをそろえると次が解放されます。'],
  ko:['플레이','레벨','기록 깨기','게임 방법','시간 안에 같은 카드를 찾으세요.','카드를 기억하고 모든 쌍을 맞추세요.','MatchApp Ai로 돌아가기','레벨','쌍','이동','시간','일시정지','계속','메뉴','성공!','다음 레벨','다시 시도','시간 초과!','최고 기록','잠금 해제','뒤로','소리','켜기','끄기','레벨 선택','완료','계속 플레이','신기록!','완료한 레벨이 아직 없습니다.','모든 쌍을 맞추면 다음 레벨이 열립니다.'],
  zh:['开始游戏','关卡','挑战最佳时间','玩法','在时间结束前找出所有配对。','记住卡片并找出相同的一对。','返回 MatchApp Ai','关卡','配对','步数','时间','暂停','继续','菜单','成功！','下一关','重试','时间到！','最佳成绩','已解锁','返回','声音','开启','关闭','选择关卡','已完成','继续玩','新纪录！','尚无已完成的关卡。','找到所有配对即可解锁下一关。']
};
const SAVE_KEY = 'lumina_match_browser_progress_v1';
export function levelSpec(level) {
  const n = Math.max(1,Math.min(MAX_LEVEL,Math.floor(Number(level)||1)));
  const pairs = n <= 4 ? 4 : n <= 15 ? 6 : n <= 50 ? 8 : n <= 120 ? 10 : 12;
  const seconds = pairs === 4 ? 55 : pairs === 6 ? 75 : pairs === 8 ? 95 : pairs === 10 ? 115 : 135;
  return {level:n,pairs:pairs,seconds:seconds,columns:pairs===4?3:4};
}
export function shuffledCards(pool,count,random=Math.random) {
  if (new Set(pool).size<count) throw new Error('Insufficient distinct card assets');
  const shuffled=[...new Set(pool)];
  for (let i=shuffled.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  const selected=shuffled.slice(0,count);
  const cards=selected.concat(selected).map((art,i)=>({id:i,art:art,shown:false,matched:false}));
  for (let i=cards.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  return cards.map((c,i)=>({...c,id:i}));
}
function readSave(){
  try {
    const p=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
    return {unlocked:Math.min(MAX_LEVEL,Math.max(1,Number(p.unlocked)||1)),best: typeof p.best==='object'&&p.best&&!Array.isArray(p.best)?p.best:{},sound:p.sound!==false};
  }catch{return {unlocked:1,best:{},sound:true};}
}
function saveProgress(state){
  try {localStorage.setItem(SAVE_KEY,JSON.stringify({unlocked:state.unlocked,best:state.best,sound:state.sound}));}catch{}
}
function assetUrl(name){return '/lumina-match/assets/card_'+name;}
function safeText(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function button(action,label,cls='lm-action'){return '<button type="button" class="'+cls+'" data-action="'+action+'">'+safeText(label)+'</button>';}
function playTone(kind,enabled) {
  if(!enabled)return;
  try {
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    if(!playTone.context)playTone.context=new C();
    const ctx=playTone.context;
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    const osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
    osc.type='sine';osc.frequency.setValueAtTime(kind==='win'?660:kind==='match'?520:360,now);
    osc.frequency.exponentialRampToValueAtTime(kind==='win'?880:kind==='match'?720:440,now+.14);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.04,now+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.18);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+.19);
  }catch{}
}
export function mountGame(stage,options) {
  if(!stage)throw new Error('Missing Lumina stage');
  let disposed=false,screen='menu',level=1,mode='normal',cards=[],revealed=[],matched=0,moves=0,secondsLeft=0,
    totalSeconds=0,paused=false,wrongTimer=null,ticker=null,lastTick=0,locked=false,viewPage=0,finishedSeconds=0,newRecord=false;
  const progress=readSave();
  const lang=()=>{const current=options.language();return TEXT[current]||TEXT.en;};
  const t=n=>lang()[n];
  const timeLabel=()=>Math.ceil(secondsLeft)+'s';
  const bestLabel=()=>{const best=progress.best[level];return best?String(best)+'s':'—';};
  function stopTimers(){clearInterval(ticker);clearTimeout(wrongTimer);ticker=null;wrongTimer=null;}
  function setMenu(){stopTimers();screen='menu';paused=false;render();}
  function startLevel(which,kind='normal'){
    stopTimers();const spec=levelSpec(which);
    level=spec.level;mode=kind;cards=shuffledCards(ASSETS,spec.pairs);matched=0;moves=0;revealed=[];
    totalSeconds=spec.seconds;secondsLeft=spec.seconds;screen='board';paused=false;locked=false;
    lastTick=performance.now();
    ticker=setInterval(()=>{
      if(disposed||screen!=='board'||paused){lastTick=performance.now();return;}
      const now=performance.now();secondsLeft=Math.max(0,secondsLeft-(now-lastTick)/1000);lastTick=now;
      if(secondsLeft<=0){stopTimers();screen='lost';playTone('match',false);render();return;}
      const bar=stage.querySelector('.lm-meter-fill'),clock=stage.querySelector('[data-clock]');
      if(bar)bar.style.width=Math.max(0,100*secondsLeft/totalSeconds)+'%';
      if(clock)clock.textContent=timeLabel();
    },100);
    render();
  }
  function finish(){
    stopTimers();screen='won';finishedSeconds=Math.max(1,Math.ceil(totalSeconds-secondsLeft));
    const prev=Number(progress.best[level]);
    newRecord=!prev||finishedSeconds<prev;
    if(newRecord)progress.best[level]=finishedSeconds;
    progress.unlocked=Math.min(MAX_LEVEL,Math.max(progress.unlocked,level+1));
    saveProgress(progress);
    playTone('win',progress.sound);
    window.dispatchEvent(new CustomEvent('lumina:level-completed',{detail:{level:level,seconds:finishedSeconds,mode:mode}}));
    render();
  }
  function selectCard(id){
    if(screen!=='board'||locked||paused||revealed.length>=2)return;
    const card=cards[id];if(!card||card.shown||card.matched)return;
    card.shown=true;revealed.push(id);playTone('flip',progress.sound);
    if(revealed.length===2){
      moves++;const a=cards[revealed[0]],b=cards[revealed[1]];
      locked=true;
      if(a.art===b.art){
        a.matched=b.matched=true;matched++;revealed=[];locked=false;playTone('match',progress.sound);
        if(matched===cards.length/2){finish();return;}
      }else{
        wrongTimer=setTimeout(()=>{
          if(disposed)return;
          a.shown=false;b.shown=false;revealed=[];locked=false;wrongTimer=null;render();
        },850);
      }
    }
    render();
    const focus=stage.querySelector('[data-card="'+id+'"]');if(focus&&!focus.disabled)focus.focus({preventScroll:true});
  }
  function header(){
    return '<div class="lm-main-head"><div class="lm-brand"><span class="lm-sigil" aria-hidden="true">✦</span><div><div class="lm-brand-title">Lumina <b>Match</b></div><span class="lm-subtitle">'+safeText(t(4))+'</span></div></div>'+
      '<button type="button" class="lm-sound" data-action="sound" aria-pressed="'+(!progress.sound)+'">'+safeText(t(21))+' '+safeText(progress.sound?t(22):t(23))+'</button></div>';
  }
  function menu(){
    const complete=Object.keys(progress.best).length;
    return header()+'<div class="lm-menu-art" aria-hidden="true"><img alt="" src="/lumina-match/assets/card_back.jpg"><img alt="" src="/lumina-match/assets/card_panda.webp"><img alt="" src="/lumina-match/assets/card_unicorn.webp"></div>'+
      '<div class="lm-menu-actions">'+button('continue',t(0),'lm-action lm-primary')+button('levels',t(1))+button('time',t(2))+button('help',t(3))+'</div>'+
      '<p class="lm-footnote">'+safeText(t(19))+': '+progress.unlocked+' / '+MAX_LEVEL+' · '+safeText(t(25))+': '+complete+'</p>';
  }
  function board(){
    const spec=levelSpec(level);
    const cardHtml=cards.map((c,i)=>'<button type="button" class="lm-card'+(c.shown||c.matched?' is-revealed':'')+(c.matched?' is-matched':'')+
      '" data-card="'+i+'" aria-label="'+safeText((c.shown||c.matched?c.art.replace(/\..*$/,' ')+' ':t(3)+' ')+(i+1))+
      '" '+(c.matched?'disabled':'')+'><span class="lm-card-inner"><span class="lm-card-back"><img loading="eager" src="/lumina-match/assets/card_back.jpg" alt=""></span><span class="lm-card-front"><img loading="eager" src="'+assetUrl(c.art)+'" alt=""></span></span></button>').join('');
    return '<div class="lm-hud"><button type="button" class="lm-quiet" data-action="menu">'+safeText(t(13))+'</button><span class="lm-level-label">'+safeText(t(7))+' '+level+'</span><button type="button" class="lm-quiet" data-action="pause">'+safeText(paused?t(12):t(11))+'</button></div>'+
      '<div class="lm-stats"><div><b>'+matched+'/'+spec.pairs+'</b><span>'+safeText(t(8))+'</span></div><div><b>'+moves+'</b><span>'+safeText(t(9))+'</span></div><div><b data-clock>'+timeLabel()+'</b><span>'+safeText(t(10))+'</span></div></div>'+
      '<div class="lm-meter" role="progressbar" aria-label="'+safeText(t(10))+'" aria-valuemin="0" aria-valuemax="'+totalSeconds+'" aria-valuenow="'+Math.ceil(secondsLeft)+'"><span class="lm-meter-fill" style="width:'+Math.max(0,100*secondsLeft/totalSeconds)+'%"></span></div>'+
      '<div class="lm-board" style="--lm-cols:'+spec.columns+'">'+cardHtml+'</div>'+
      (paused?'<div class="lm-blocking"><div><span class="lm-block-star">✦</span><h2>'+safeText(t(11))+'</h2>'+button('pause',t(12),'lm-action lm-primary')+'</div></div>':'');
  }
  function result(win){
    return header()+'<div class="lm-result"><div class="lm-result-symbol" aria-hidden="true">'+(win?'✦':'☾')+'</div><h2>'+safeText(t(win?14:18))+'</h2>'+
      '<p>'+safeText(t(7))+' '+level+' · '+safeText(t(9))+' '+moves+' · '+safeText(t(10))+' '+(win?finishedSeconds+'s':totalSeconds+'s')+'</p>'+
      (win?'<p class="lm-record">'+safeText(newRecord?t(26):t(18))+'</p>':'')+
      '<div class="lm-menu-actions">'+button(win?'next':'retry',win?t(15):t(16),'lm-action lm-primary')+
      button('menu',t(13))+'</div></div>';
  }
  function levels(){
    const from=viewPage*20+1,to=Math.min(MAX_LEVEL,from+19);
    const rows=Array.from({length:to-from+1},(_,i)=>{
      const num=from+i,available=num<=progress.unlocked;
      return '<button type="button" class="lm-level-tile'+(progress.best[num]?' complete':'')+'" data-level="'+num+'" '+(available?'':'disabled')+' aria-label="'+safeText(t(7))+' '+num+'">'+num+(progress.best[num]?'<span aria-hidden="true">✦</span>':'')+'</button>';
    }).join('');
    return header()+'<div class="lm-sub-head">'+button('menu',t(20),'lm-quiet')+'<h2>'+safeText(t(24))+'</h2><span>'+progress.unlocked+' / '+MAX_LEVEL+'</span></div>'+
      '<div class="lm-level-grid">'+rows+'</div><div class="lm-level-pages">'+button('prev','‹','lm-action')+'<span>'+from+'–'+to+'</span>'+button('nextpage','›','lm-action')+'</div>'+
      '<p class="lm-footnote">'+safeText(t(29))+'</p>';
  }
  function help(){
    return header()+'<div class="lm-help"><h2>'+safeText(t(3))+'</h2><img src="/lumina-match/assets/card_back.jpg" alt="" width="78" height="110"><p>'+safeText(t(4))+'</p><p>'+safeText(t(5))+'</p><p>'+safeText(t(29))+'</p>'+
      button('menu',t(20),'lm-action lm-primary')+'</div>';
  }
  function time(){
    const done=Object.keys(progress.best).map(Number).filter(x=>Number.isInteger(x)&&x>=1&&x<=MAX_LEVEL).sort((a,b)=>a-b);
    return header()+'<div class="lm-sub-head">'+button('menu',t(20),'lm-quiet')+'<h2>'+safeText(t(2))+'</h2></div>'+
      (done.length?'<div class="lm-time-list">'+done.slice(-20).reverse().map(n=>'<button type="button" data-time-level="'+n+'" class="lm-time-entry"><span>'+safeText(t(7))+' '+n+'</span><strong>'+safeText(t(18))+' '+Number(progress.best[n])+'s</strong></button>').join('')+'</div>':
      '<p class="lm-footnote">'+safeText(t(28))+'</p>')+'</div>';
  }
  function render(){
    if(disposed)return;
    stage.innerHTML='<div class="lm-game" dir="'+(options.language()==='ar'?'rtl':'ltr')+'">'+
      (screen==='menu'?menu():screen==='board'?board():screen==='won'?result(true):screen==='lost'?result(false):
      screen==='levels'?levels():screen==='help'?help():time())+'</div>';
  }
  function handler(e){
    const c=e.target.closest('[data-card]');if(c){selectCard(Number(c.dataset.card));return;}
    const lv=e.target.closest('[data-level]');if(lv){startLevel(Number(lv.dataset.level));return;}
    const tl=e.target.closest('[data-time-level]');if(tl){startLevel(Number(tl.dataset.timeLevel),'time');return;}
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(!action)return;
    switch(action){
      case 'continue': startLevel(progress.unlocked);break;
      case 'levels': viewPage=Math.floor((progress.unlocked-1)/20);screen='levels';render();break;
      case 'help':screen='help';render();break;
      case 'time':screen='time';render();break;
      case 'menu':setMenu();break;
      case 'pause':paused=!paused;lastTick=performance.now();render();break;
      case 'next':if(level>=MAX_LEVEL)setMenu();else startLevel(level+1);break;
      case 'retry':startLevel(level,mode);break;
      case 'prev':viewPage=Math.max(0,viewPage-1);render();break;
      case 'nextpage':viewPage=Math.min(17,viewPage+1);render();break;
      case 'sound':progress.sound=!progress.sound;saveProgress(progress);render();break;
    }
  }
  function visibility(){if(document.hidden && screen==='board' && !paused){paused=true;render();}}
  function onLanguageChange(){render();}
  stage.addEventListener('click',handler);
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('matchapp:languagechange',onLanguageChange);
  window.addEventListener('languagechange',onLanguageChange);
  render();
  return function dispose(){
    disposed=true;stopTimers();stage.removeEventListener('click',handler);
    document.removeEventListener('visibilitychange',visibility);
    window.removeEventListener('matchapp:languagechange',onLanguageChange);
    window.removeEventListener('languagechange',onLanguageChange);
    stage.replaceChildren();
  };
}