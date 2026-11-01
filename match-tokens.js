/* MatchApp Ai — server-enabled adult Match tokens.
 * Existing guest storage and legacy paid balances remain authoritative for
 * their original paths. No ad callback, timer or local flag grants a reward.
 */
(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else api.boot(root);
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const VERSION='match-tokens-v1';
  const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
  const LEGACY_VERSION='legacy-rewards-v1';
  const legacyKeys=["balance","daily","extras","title","empty","available","refreshNote","reward","rewardNote","watch","credited","signInNote","first","entry"];
  const legacyRows={
    "en":{"balance":"{count} matches available","daily":"{remaining} of {limit} included actions left","extras":"{count} Extra Matches","title":"Optional Extra Matches","empty":"Your included allowance and Extra Matches are used up. Your result stays here.","available":"Your current allowance is unchanged.","refreshNote":"Your current allowance is unchanged. Earned Extra Matches stay in your existing balance.","reward":"Watch an optional ad for 3 Extra Matches","rewardNote":"Optional. Extra Matches are added only after the server verifies completion.","watch":"Watch now · +3 Extra Matches","credited":"3 Extra Matches added to your account.","signInNote":"Sign in to check eligibility for optional Extra Matches.","first":"Get a Match or e-book result before rewards are available.","entry":"Optional ad · +3 Extra Matches"},
    "pt-BR":{"balance":"{count} matches disponíveis","daily":"{remaining} de {limit} ações incluídas restantes","extras":"{count} Matches Extras","title":"Matches Extras opcionais","empty":"Sua cota incluída e seus Matches Extras acabaram. Seu resultado continua aqui.","available":"Sua cota atual permanece igual.","refreshNote":"Sua cota atual permanece igual. Matches Extras ganhos ficam no seu saldo existente.","reward":"Assistir a um anúncio opcional por 3 Matches Extras","rewardNote":"Opcional. Matches Extras são adicionados somente após o servidor verificar a conclusão.","watch":"Assistir agora · +3 Matches Extras","credited":"3 Matches Extras adicionados à sua conta.","signInNote":"Entre para verificar sua elegibilidade para Matches Extras opcionais.","first":"Obtenha um resultado de Match ou e-book antes de acessar recompensas.","entry":"Anúncio opcional · +3 Matches Extras"},
    "es":{"balance":"{count} matches disponibles","daily":"Quedan {remaining} de {limit} acciones incluidas","extras":"{count} Matches Extra","title":"Matches Extra opcionales","empty":"Tu cuota incluida y tus Matches Extra se han agotado. Tu resultado sigue aquí.","available":"Tu cuota actual no cambia.","refreshNote":"Tu cuota actual no cambia. Los Matches Extra ganados se conservan en tu saldo existente.","reward":"Ver un anuncio opcional por 3 Matches Extra","rewardNote":"Opcional. Los Matches Extra se añaden solo cuando el servidor verifica que se completó.","watch":"Ver ahora · +3 Matches Extra","credited":"Se añadieron 3 Matches Extra a tu cuenta.","signInNote":"Inicia sesión para comprobar si puedes obtener Matches Extra opcionales.","first":"Obtén un resultado de Match o e-book antes de acceder a las recompensas.","entry":"Anuncio opcional · +3 Matches Extra"},
    "fr":{"balance":"{count} matchs disponibles","daily":"{remaining} actions incluses restantes sur {limit}","extras":"{count} matchs supplémentaires","title":"Matchs supplémentaires facultatifs","empty":"Votre quota inclus et vos matchs supplémentaires sont épuisés. Votre résultat reste ici.","available":"Votre quota actuel ne change pas.","refreshNote":"Votre quota actuel ne change pas. Les matchs supplémentaires gagnés restent dans votre solde existant.","reward":"Regarder une publicité facultative pour 3 matchs supplémentaires","rewardNote":"Facultatif. Les matchs supplémentaires sont ajoutés après vérification de la lecture complète par le serveur.","watch":"Regarder · +3 matchs supplémentaires","credited":"3 matchs supplémentaires ajoutés à votre compte.","signInNote":"Connectez-vous pour vérifier votre accès aux matchs supplémentaires facultatifs.","first":"Obtenez un résultat Match ou e-book avant de pouvoir accéder aux récompenses.","entry":"Publicité facultative · +3 matchs supplémentaires"},
    "de":{"balance":"{count} Matches verfügbar","daily":"{remaining} von {limit} enthaltenen Aktionen übrig","extras":"{count} zusätzliche Matches","title":"Optionale zusätzliche Matches","empty":"Dein enthaltenes Kontingent und deine zusätzlichen Matches sind aufgebraucht. Dein Ergebnis bleibt hier.","available":"Dein aktuelles Kontingent bleibt unverändert.","refreshNote":"Dein aktuelles Kontingent bleibt unverändert. Verdiente zusätzliche Matches bleiben in deinem bestehenden Guthaben.","reward":"Optionalen Werbespot für 3 zusätzliche Matches ansehen","rewardNote":"Freiwillig. Zusätzliche Matches werden erst gutgeschrieben, wenn der Server den Abschluss bestätigt.","watch":"Jetzt ansehen · +3 zusätzliche Matches","credited":"Deinem Konto wurden 3 zusätzliche Matches gutgeschrieben.","signInNote":"Melde dich an, um deine Berechtigung für optionale zusätzliche Matches zu prüfen.","first":"Erhalte zuerst ein Match- oder E-Book-Ergebnis, bevor Belohnungen verfügbar sind.","entry":"Optionaler Werbespot · +3 zusätzliche Matches"},
    "it":{"balance":"{count} match disponibili","daily":"Restano {remaining} azioni incluse su {limit}","extras":"{count} match extra","title":"Match extra facoltativi","empty":"La quota inclusa e i match extra sono esauriti. Il tuo risultato resta qui.","available":"La tua quota attuale non cambia.","refreshNote":"La tua quota attuale non cambia. I match extra guadagnati restano nel saldo esistente.","reward":"Guarda un annuncio facoltativo per 3 match extra","rewardNote":"Facoltativo. I match extra vengono aggiunti solo dopo che il server ha verificato il completamento.","watch":"Guarda ora · +3 match extra","credited":"3 match extra aggiunti al tuo account.","signInNote":"Accedi per verificare l’idoneità ai match extra facoltativi.","first":"Ottieni un risultato Match o e-book prima di accedere ai premi.","entry":"Annuncio facoltativo · +3 match extra"},
    "tr":{"balance":"{count} eşleşme kullanılabilir","daily":"Dahil olan {limit} işlemden {remaining} kaldı","extras":"{count} ek eşleşme","title":"İsteğe bağlı ek eşleşmeler","empty":"Dahil olan hakkınız ve ek eşleşmeleriniz bitti. Sonucunuz burada kalır.","available":"Mevcut hakkınız değişmez.","refreshNote":"Mevcut hakkınız değişmez. Kazanılan ek eşleşmeler mevcut bakiyenizde kalır.","reward":"3 ek eşleşme için isteğe bağlı reklam izle","rewardNote":"İsteğe bağlıdır. Ek eşleşmeler yalnızca sunucu tamamlandığını doğruladıktan sonra eklenir.","watch":"Şimdi izle · +3 ek eşleşme","credited":"Hesabınıza 3 ek eşleşme eklendi.","signInNote":"İsteğe bağlı ek eşleşmelere uygunluğunuzu kontrol etmek için giriş yapın.","first":"Ödüllere erişmeden önce bir Match veya e-kitap sonucu alın.","entry":"İsteğe bağlı reklam · +3 ek eşleşme"},
    "ru":{"balance":"Доступно подборок: {count}","daily":"Осталось {remaining} из {limit} включённых действий","extras":"Дополнительных подборок: {count}","title":"Дополнительные подборки по желанию","empty":"Включённый лимит и дополнительные подборки закончились. Ваш результат остаётся здесь.","available":"Ваш текущий лимит не меняется.","refreshNote":"Ваш текущий лимит не меняется. Заработанные дополнительные подборки остаются на существующем балансе.","reward":"Посмотреть рекламу по желанию за 3 дополнительные подборки","rewardNote":"Необязательно. Дополнительные подборки начисляются только после подтверждения полного просмотра сервером.","watch":"Смотреть · +3 дополнительные подборки","credited":"На ваш аккаунт начислены 3 дополнительные подборки.","signInNote":"Войдите, чтобы проверить доступность дополнительных подборок по желанию.","first":"Получите результат Match или поиска электронной книги, прежде чем будут доступны награды.","entry":"Реклама по желанию · +3 дополнительные подборки"},
    "ar":{"balance":"ترشيحات متاحة: {count}","daily":"متبقي {remaining} من أصل {limit} من الاستخدامات المشمولة","extras":"ترشيحات إضافية: {count}","title":"ترشيحات إضافية اختيارية","empty":"نفدت حصتك المشمولة والترشيحات الإضافية. تظل نتيجتك هنا.","available":"حصتك الحالية لا تتغير.","refreshNote":"حصتك الحالية لا تتغير. تظل الترشيحات الإضافية المكتسبة في رصيدك الحالي.","reward":"شاهد إعلانًا اختياريًا مقابل 3 ترشيحات إضافية","rewardNote":"اختياري. تُضاف الترشيحات الإضافية فقط بعد أن يتحقق الخادم من اكتمال المشاهدة.","watch":"شاهد الآن · +3 ترشيحات إضافية","credited":"أُضيفت 3 ترشيحات إضافية إلى حسابك.","signInNote":"سجّل الدخول للتحقق من أهليتك للترشيحات الإضافية الاختيارية.","first":"احصل على نتيجة من Match أو بحث الكتب الإلكترونية قبل إتاحة المكافآت.","entry":"إعلان اختياري · +3 ترشيحات إضافية"},
    "hi":{"balance":"{count} मैच उपलब्ध","daily":"शामिल {limit} उपयोगों में से {remaining} बाकी","extras":"{count} अतिरिक्त मैच","title":"वैकल्पिक अतिरिक्त मैच","empty":"आपका शामिल कोटा और अतिरिक्त मैच समाप्त हो गए हैं। आपका परिणाम यहीं रहेगा।","available":"आपका मौजूदा कोटा नहीं बदलेगा।","refreshNote":"आपका मौजूदा कोटा नहीं बदलेगा। कमाए गए अतिरिक्त मैच आपके मौजूदा बैलेंस में रहेंगे।","reward":"3 अतिरिक्त मैच के लिए वैकल्पिक विज्ञापन देखें","rewardNote":"वैकल्पिक है। सर्वर से पूरा देखे जाने की पुष्टि होने पर ही अतिरिक्त मैच जोड़े जाते हैं।","watch":"अभी देखें · +3 अतिरिक्त मैच","credited":"आपके खाते में 3 अतिरिक्त मैच जोड़े गए।","signInNote":"वैकल्पिक अतिरिक्त मैच की पात्रता जाँचने के लिए साइन इन करें।","first":"रिवॉर्ड उपलब्ध होने से पहले Match या ई-बुक का परिणाम पाएँ।","entry":"वैकल्पिक विज्ञापन · +3 अतिरिक्त मैच"},
    "id":{"balance":"{count} match tersedia","daily":"Tersisa {remaining} dari {limit} penggunaan yang termasuk","extras":"{count} match tambahan","title":"Match tambahan opsional","empty":"Kuota yang termasuk dan match tambahan Anda telah habis. Hasil Anda tetap di sini.","available":"Kuota Anda saat ini tidak berubah.","refreshNote":"Kuota Anda saat ini tidak berubah. Match tambahan yang diperoleh tetap ada di saldo Anda.","reward":"Tonton iklan opsional untuk 3 match tambahan","rewardNote":"Opsional. Match tambahan hanya ditambahkan setelah server memverifikasi bahwa iklan selesai ditonton.","watch":"Tonton sekarang · +3 match tambahan","credited":"3 match tambahan ditambahkan ke akun Anda.","signInNote":"Masuk untuk memeriksa kelayakan match tambahan opsional.","first":"Dapatkan hasil Match atau e-book sebelum hadiah tersedia.","entry":"Iklan opsional · +3 match tambahan"},
    "ja":{"balance":"利用可能なマッチ：{count}回","daily":"含まれる{limit}回のうち残り{remaining}回","extras":"追加マッチ：{count}回","title":"任意の追加マッチ","empty":"基本の利用枠と追加マッチを使い切りました。結果はここに残ります。","available":"現在の利用枠は変わりません。","refreshNote":"現在の利用枠は変わりません。獲得した追加マッチは既存の残高に残ります。","reward":"任意の広告を見て追加マッチ3回を獲得","rewardNote":"任意です。サーバーが視聴完了を確認した後にのみ追加マッチが付与されます。","watch":"今すぐ見る · 追加マッチ+3回","credited":"アカウントに追加マッチ3回が付与されました。","signInNote":"ログインして任意の追加マッチの利用条件を確認してください。","first":"特典を利用するには、まずMatchまたは電子書籍の結果を取得してください。","entry":"任意の広告 · 追加マッチ+3回"},
    "ko":{"balance":"매치 {count}회 이용 가능","daily":"기본 제공 {limit}회 중 {remaining}회 남음","extras":"추가 매치 {count}회","title":"선택형 추가 매치","empty":"기본 제공 횟수와 추가 매치를 모두 사용했습니다. 결과는 여기에 그대로 남습니다.","available":"현재 기본 제공 횟수는 바뀌지 않습니다.","refreshNote":"현재 기본 제공 횟수는 바뀌지 않습니다. 획득한 추가 매치는 기존 잔액에 유지됩니다.","reward":"선택형 광고를 보고 추가 매치 3회 받기","rewardNote":"선택 사항입니다. 서버가 광고 시청 완료를 확인한 후에만 추가 매치가 지급됩니다.","watch":"지금 보기 · 추가 매치 +3회","credited":"계정에 추가 매치 3회가 지급되었습니다.","signInNote":"로그인하여 선택형 추가 매치 이용 자격을 확인하세요.","first":"보상을 이용하려면 먼저 Match 또는 전자책 결과를 받아야 합니다.","entry":"선택형 광고 · 추가 매치 +3회"},
    "zh":{"balance":"可用匹配次数：{count}","daily":"内含{limit}次操作，剩余{remaining}次","extras":"额外匹配次数：{count}","title":"自选额外匹配","empty":"内含额度和额外匹配次数已用完。当前结果会保留在这里。","available":"当前额度保持不变。","refreshNote":"当前额度保持不变。获得的额外匹配次数会保留在现有余额中。","reward":"观看自选广告，获取3次额外匹配","rewardNote":"完全自愿。只有服务器确认观看完成后，才会增加额外匹配次数。","watch":"立即观看 · +3次额外匹配","credited":"账户已增加3次额外匹配。","signInNote":"登录以查看是否符合自选额外匹配的条件。","first":"获得Match或电子书籍结果后，才可使用奖励功能。","entry":"自选广告 · +3次额外匹配"}
  };
  const keys=['balance','daily','extras','unlimited','options','title','empty','available','refreshNote','reward','rewardNote','preparing','ready','watch','verifying','credited','unavailable','signIn','signInNote','checkin','pro','keep','refresh','close','loading','failed','cancelAd','reset','guest','first','askLimit','copied','shareFailed'];
  const rows={
    en:['{count} Match tokens','{remaining} of {limit} daily tokens left','{count} earned or purchased tokens','Unlimited One Match · Pro','View token options','Choose how to keep matching','Your available Match tokens are used up. Your current result stays here.','You can keep matching with your available tokens.','Daily tokens refresh automatically. Earned and purchased balances are kept.','Watch an optional ad for 3 tokens','Optional. Tokens are added only after completion is verified.','Preparing your optional ad…','Your ad is ready. Choose Watch now to continue.','Watch now · +3 tokens','We are checking your reward. You can keep using this page.','3 tokens added to your account.','No optional ad is available here right now.','Sign in','Sign in to sync tokens and check reward eligibility.','Daily check-in','See Pro options','Keep my current result','Refresh balance','Close','Checking your balance…','Your balance could not be checked. Please try again.','Cancel ad preparation','Daily tokens refresh at {time}.','Guest balance is stored in this browser.','Find your first One Match recommendation to begin.','Your Ask AI allowance is used for today. Your existing Ask AI credits remain separate from Match tokens.','Link copied.','Sharing is unavailable right now.'],
    'pt-BR':['{count} tokens de Match','{remaining} de {limit} tokens diários restantes','{count} tokens ganhos ou comprados','One Match ilimitado · Pro','Ver opções de tokens','Escolha como continuar encontrando matches','Seus tokens de Match disponíveis acabaram. Seu resultado continua aqui.','Você pode continuar com os tokens disponíveis.','Os tokens diários são renovados automaticamente. Os saldos ganhos e comprados são mantidos.','Assistir a um anúncio opcional por 3 tokens','Opcional. Os tokens são adicionados somente após a conclusão ser verificada.','Preparando seu anúncio opcional…','Seu anúncio está pronto. Escolha Assistir agora para continuar.','Assistir agora · +3 tokens','Estamos verificando sua recompensa. Você pode continuar usando esta página.','3 tokens adicionados à sua conta.','Nenhum anúncio opcional está disponível aqui agora.','Entrar','Entre para sincronizar tokens e verificar sua elegibilidade para recompensas.','Check-in diário','Ver opções Pro','Manter meu resultado','Atualizar saldo','Fechar','Verificando seu saldo…','Não foi possível verificar seu saldo. Tente novamente.','Cancelar preparação do anúncio','Os tokens diários são renovados às {time}.','O saldo de visitante fica salvo neste navegador.','Encontre sua primeira recomendação One Match para começar.','Sua cota do Ask AI acabou por hoje. Seus créditos existentes do Ask AI são separados dos tokens de Match.','Link copiado.','O compartilhamento está indisponível no momento.'],
    es:['{count} tokens de Match','Quedan {remaining} de {limit} tokens diarios','{count} tokens ganados o comprados','One Match ilimitado · Pro','Ver opciones de tokens','Elige cómo seguir encontrando recomendaciones','Tus tokens de Match disponibles se han agotado. Tu resultado sigue aquí.','Puedes continuar con los tokens disponibles.','Los tokens diarios se renuevan automáticamente. Los saldos ganados y comprados se conservan.','Ver un anuncio opcional por 3 tokens','Opcional. Los tokens se añaden solo tras verificar que se completó.','Preparando tu anuncio opcional…','Tu anuncio está listo. Elige Ver ahora para continuar.','Ver ahora · +3 tokens','Estamos verificando tu recompensa. Puedes seguir usando esta página.','Se añadieron 3 tokens a tu cuenta.','No hay anuncios opcionales disponibles aquí ahora.','Iniciar sesión','Inicia sesión para sincronizar tokens y consultar si puedes recibir recompensas.','Registro diario','Ver opciones Pro','Conservar mi resultado','Actualizar saldo','Cerrar','Consultando tu saldo…','No se pudo consultar tu saldo. Vuelve a intentarlo.','Cancelar preparación del anuncio','Los tokens diarios se renuevan a las {time}.','El saldo de invitado se guarda en este navegador.','Encuentra tu primera recomendación One Match para empezar.','Tu cuota de Ask AI se ha agotado hoy. Los créditos existentes de Ask AI son independientes de los tokens de Match.','Enlace copiado.','No se puede compartir en este momento.'],
    fr:['{count} jetons Match','Il reste {remaining} jetons quotidiens sur {limit}','{count} jetons gagnés ou achetés','One Match illimité · Pro','Voir les options de jetons','Choisissez comment continuer vos découvertes','Vos jetons Match disponibles sont épuisés. Votre résultat reste ici.','Vous pouvez continuer avec vos jetons disponibles.','Les jetons quotidiens se renouvellent automatiquement. Les soldes gagnés et achetés sont conservés.','Regarder une publicité facultative pour 3 jetons','Facultatif. Les jetons sont ajoutés après vérification de la lecture complète.','Préparation de votre publicité facultative…','Votre publicité est prête. Choisissez Regarder pour continuer.','Regarder · +3 jetons','Nous vérifions votre récompense. Vous pouvez continuer à utiliser cette page.','3 jetons ajoutés à votre compte.','Aucune publicité facultative n’est disponible ici pour le moment.','Se connecter','Connectez-vous pour synchroniser vos jetons et vérifier votre admissibilité aux récompenses.','Pointage quotidien','Voir les offres Pro','Garder mon résultat','Actualiser le solde','Fermer','Vérification de votre solde…','Votre solde n’a pas pu être vérifié. Réessayez.','Annuler la préparation','Les jetons quotidiens se renouvellent à {time}.','Le solde invité est enregistré dans ce navigateur.','Trouvez votre première recommandation One Match pour commencer.','Votre quota Ask AI est épuisé pour aujourd’hui. Vos crédits Ask AI existants restent distincts des jetons Match.','Lien copié.','Le partage est indisponible pour le moment.'],
    de:['{count} Match-Tokens','{remaining} von {limit} täglichen Tokens übrig','{count} verdiente oder gekaufte Tokens','One Match unbegrenzt · Pro','Token-Optionen ansehen','Wähle, wie du weiterentdecken möchtest','Deine verfügbaren Match-Tokens sind aufgebraucht. Dein Ergebnis bleibt hier.','Du kannst mit deinen verfügbaren Tokens weitermachen.','Tägliche Tokens werden automatisch erneuert. Verdientes und gekauftes Guthaben bleibt erhalten.','Optionalen Werbespot für 3 Tokens ansehen','Freiwillig. Tokens werden erst nach bestätigtem Abschluss gutgeschrieben.','Dein optionaler Werbespot wird vorbereitet…','Dein Werbespot ist bereit. Wähle Jetzt ansehen, um fortzufahren.','Jetzt ansehen · +3 Tokens','Wir prüfen deine Belohnung. Du kannst diese Seite weiter nutzen.','Deinem Konto wurden 3 Tokens gutgeschrieben.','Hier ist gerade kein optionaler Werbespot verfügbar.','Anmelden','Melde dich an, um Tokens zu synchronisieren und deine Belohnungsberechtigung zu prüfen.','Täglicher Check-in','Pro-Angebote ansehen','Mein Ergebnis behalten','Guthaben aktualisieren','Schließen','Dein Guthaben wird geprüft…','Dein Guthaben konnte nicht geprüft werden. Bitte versuche es erneut.','Werbevorbereitung abbrechen','Die täglichen Tokens werden um {time} erneuert.','Das Gastguthaben wird in diesem Browser gespeichert.','Finde deine erste One Match Empfehlung, um zu beginnen.','Dein Ask AI Kontingent ist heute aufgebraucht. Bestehende Ask AI Credits bleiben von Match-Tokens getrennt.','Link kopiert.','Teilen ist gerade nicht verfügbar.'],
    it:['{count} token Match','Restano {remaining} token giornalieri su {limit}','{count} token guadagnati o acquistati','One Match illimitato · Pro','Vedi opzioni token','Scegli come continuare a trovare consigli','I token Match disponibili sono esauriti. Il tuo risultato resta qui.','Puoi continuare con i token disponibili.','I token giornalieri si rinnovano automaticamente. I saldi guadagnati e acquistati vengono conservati.','Guarda un annuncio facoltativo per 3 token','Facoltativo. I token vengono aggiunti solo dopo la verifica del completamento.','Preparazione dell’annuncio facoltativo…','L’annuncio è pronto. Scegli Guarda ora per continuare.','Guarda ora · +3 token','Stiamo verificando il premio. Puoi continuare a usare questa pagina.','3 token aggiunti al tuo account.','Nessun annuncio facoltativo disponibile qui al momento.','Accedi','Accedi per sincronizzare i token e verificare l’idoneità ai premi.','Check-in giornaliero','Vedi le opzioni Pro','Mantieni il mio risultato','Aggiorna saldo','Chiudi','Verifica del saldo…','Impossibile verificare il saldo. Riprova.','Annulla preparazione annuncio','I token giornalieri si rinnovano alle {time}.','Il saldo ospite è memorizzato in questo browser.','Trova il tuo primo consiglio One Match per iniziare.','La quota Ask AI di oggi è esaurita. I crediti Ask AI esistenti restano separati dai token Match.','Link copiato.','La condivisione non è disponibile al momento.'],
    tr:['{count} Match jetonu','{limit} günlük jetondan {remaining} kaldı','{count} kazanılan veya satın alınan jeton','Sınırsız One Match · Pro','Jeton seçeneklerini gör','Eşleşmeye nasıl devam edeceğinizi seçin','Kullanılabilir Match jetonlarınız bitti. Mevcut sonucunuz burada kalır.','Kullanılabilir jetonlarınızla devam edebilirsiniz.','Günlük jetonlar otomatik yenilenir. Kazanılan ve satın alınan bakiyeler korunur.','3 jeton için isteğe bağlı reklam izle','İsteğe bağlıdır. Jetonlar ancak tamamlanma doğrulandıktan sonra eklenir.','İsteğe bağlı reklamınız hazırlanıyor…','Reklamınız hazır. Devam etmek için Şimdi izle seçeneğini seçin.','Şimdi izle · +3 jeton','Ödülünüzü doğruluyoruz. Bu sayfayı kullanmaya devam edebilirsiniz.','Hesabınıza 3 jeton eklendi.','Şu anda burada isteğe bağlı reklam yok.','Giriş yap','Jetonları eşitlemek ve ödül uygunluğunu kontrol etmek için giriş yapın.','Günlük yoklama','Pro seçeneklerini gör','Mevcut sonucumu koru','Bakiyeyi yenile','Kapat','Bakiyeniz kontrol ediliyor…','Bakiyeniz kontrol edilemedi. Lütfen tekrar deneyin.','Reklam hazırlığını iptal et','Günlük jetonlar {time} saatinde yenilenir.','Misafir bakiyesi bu tarayıcıda saklanır.','Başlamak için ilk One Match önerinizi bulun.','Bugünkü Ask AI hakkınız bitti. Mevcut Ask AI kredileriniz Match jetonlarından ayrıdır.','Bağlantı kopyalandı.','Paylaşım şu anda kullanılamıyor.'],
    ru:['{count} токенов Match','Осталось {remaining} из {limit} дневных токенов','{count} заработанных или купленных токенов','One Match без ограничений · Pro','Посмотреть варианты токенов','Выберите, как продолжить поиск','Доступные токены Match закончились. Ваш результат остаётся здесь.','Вы можете продолжить с доступными токенами.','Дневные токены обновляются автоматически. Заработанные и купленные остатки сохраняются.','Посмотреть рекламу по желанию за 3 токена','Необязательно. Токены начисляются только после подтверждения полного просмотра.','Готовим необязательную рекламу…','Реклама готова. Нажмите «Смотреть», чтобы продолжить.','Смотреть · +3 токена','Проверяем награду. Вы можете продолжать пользоваться страницей.','На ваш аккаунт начислено 3 токена.','Сейчас здесь нет необязательной рекламы.','Войти','Войдите, чтобы синхронизировать токены и проверить доступность наград.','Ежедневная отметка','Посмотреть варианты Pro','Оставить мой результат','Обновить баланс','Закрыть','Проверяем баланс…','Не удалось проверить баланс. Попробуйте ещё раз.','Отменить подготовку рекламы','Дневные токены обновляются в {time}.','Гостевой баланс хранится в этом браузере.','Найдите первую рекомендацию One Match, чтобы начать.','Сегодняшний лимит Ask AI исчерпан. Имеющиеся кредиты Ask AI учитываются отдельно от токенов Match.','Ссылка скопирована.','Сейчас поделиться не удаётся.'],
    ar:['{count} رموز Match','بقي {remaining} من {limit} رمزًا يوميًا','{count} رموز مكتسبة أو مشتراة','One Match غير محدود · Pro','عرض خيارات الرموز','اختر كيفية مواصلة اكتشاف التوصيات','نفدت رموز Match المتاحة. نتيجتك الحالية تبقى هنا.','يمكنك المتابعة باستخدام رموزك المتاحة.','تتجدد الرموز اليومية تلقائيًا. تُحفظ الأرصدة المكتسبة والمشتراة.','شاهد إعلانًا اختياريًا مقابل 3 رموز','اختياري. تُضاف الرموز بعد التحقق من إكمال المشاهدة فقط.','جارٍ تجهيز إعلانك الاختياري…','إعلانك جاهز. اختر المشاهدة الآن للمتابعة.','المشاهدة الآن · +3 رموز','نتحقق من مكافأتك. يمكنك مواصلة استخدام هذه الصفحة.','أُضيفت 3 رموز إلى حسابك.','لا يتوفر إعلان اختياري هنا حاليًا.','تسجيل الدخول','سجّل الدخول لمزامنة الرموز والتحقق من أهليتك للمكافآت.','تسجيل الحضور اليومي','عرض خيارات Pro','الاحتفاظ بنتيجتي الحالية','تحديث الرصيد','إغلاق','جارٍ التحقق من رصيدك…','تعذّر التحقق من رصيدك. يرجى المحاولة مجددًا.','إلغاء تجهيز الإعلان','تتجدد الرموز اليومية الساعة {time}.','يُحفظ رصيد الضيف في هذا المتصفح.','اعثر على أول توصية One Match للبدء.','استهلكت حصة Ask AI اليوم. تبقى أرصدة Ask AI الحالية منفصلة عن رموز Match.','نُسخ الرابط.','المشاركة غير متاحة حاليًا.'],
    hi:['{count} Match टोकन','{limit} दैनिक टोकन में से {remaining} बचे हैं','{count} अर्जित या खरीदे गए टोकन','असीमित One Match · Pro','टोकन के विकल्प देखें','चुनें कि सिफ़ारिशें कैसे जारी रखें','आपके उपलब्ध Match टोकन इस्तेमाल हो गए हैं। वर्तमान नतीजा यहीं रहेगा।','आप उपलब्ध टोकन से जारी रख सकते हैं।','दैनिक टोकन अपने आप नवीनीकृत होते हैं। अर्जित और खरीदा हुआ बैलेंस सुरक्षित रहता है।','3 टोकन के लिए वैकल्पिक विज्ञापन देखें','वैकल्पिक है। विज्ञापन पूरा होने की पुष्टि के बाद ही टोकन जोड़े जाते हैं।','आपका वैकल्पिक विज्ञापन तैयार हो रहा है…','विज्ञापन तैयार है। जारी रखने के लिए अभी देखें चुनें।','अभी देखें · +3 टोकन','हम आपके पुरस्कार की जाँच कर रहे हैं। आप इस पेज का उपयोग जारी रख सकते हैं।','आपके खाते में 3 टोकन जोड़े गए।','यहाँ अभी कोई वैकल्पिक विज्ञापन उपलब्ध नहीं है।','साइन इन करें','टोकन सिंक करने और पुरस्कार की पात्रता जाँचने के लिए साइन इन करें।','दैनिक चेक-इन','Pro के विकल्प देखें','मेरा वर्तमान नतीजा रखें','बैलेंस फिर जाँचें','बंद करें','बैलेंस जाँचा जा रहा है…','बैलेंस नहीं जाँचा जा सका। कृपया फिर कोशिश करें।','विज्ञापन की तैयारी रद्द करें','दैनिक टोकन {time} पर नवीनीकृत होते हैं।','अतिथि बैलेंस इस ब्राउज़र में सहेजा जाता है।','शुरू करने के लिए अपनी पहली One Match सिफ़ारिश पाएँ।','आज का Ask AI कोटा इस्तेमाल हो गया है। मौजूदा Ask AI क्रेडिट Match टोकन से अलग रहते हैं।','लिंक कॉपी हुआ।','अभी साझा करना उपलब्ध नहीं है।'],
    id:['{count} token Match','Tersisa {remaining} dari {limit} token harian','{count} token hasil hadiah atau pembelian','One Match tanpa batas · Pro','Lihat pilihan token','Pilih cara melanjutkan rekomendasi','Token Match yang tersedia sudah habis. Hasil Anda tetap di sini.','Anda dapat melanjutkan dengan token yang tersedia.','Token harian diperbarui otomatis. Saldo hadiah dan pembelian tetap tersimpan.','Tonton iklan opsional untuk 3 token','Opsional. Token ditambahkan hanya setelah penyelesaian terverifikasi.','Menyiapkan iklan opsional Anda…','Iklan Anda siap. Pilih Tonton sekarang untuk melanjutkan.','Tonton sekarang · +3 token','Kami sedang memeriksa hadiah Anda. Anda dapat terus menggunakan halaman ini.','3 token ditambahkan ke akun Anda.','Tidak ada iklan opsional yang tersedia di sini saat ini.','Masuk','Masuk untuk menyinkronkan token dan memeriksa kelayakan hadiah.','Check-in harian','Lihat pilihan Pro','Simpan hasil saya saat ini','Perbarui saldo','Tutup','Memeriksa saldo Anda…','Saldo Anda tidak dapat diperiksa. Silakan coba lagi.','Batalkan persiapan iklan','Token harian diperbarui pukul {time}.','Saldo tamu disimpan di browser ini.','Temukan rekomendasi One Match pertama Anda untuk memulai.','Kuota Ask AI hari ini sudah habis. Kredit Ask AI yang ada tetap terpisah dari token Match.','Tautan disalin.','Berbagi tidak tersedia saat ini.'],
    ja:['Match トークン：{count}','本日のトークン：{limit} 中 {remaining} 残り','獲得・購入済みトークン：{count}','One Match 無制限 · Pro','トークンの選択肢を見る','おすすめを続ける方法を選択','利用できる Match トークンを使い切りました。現在の結果はここに残ります。','利用可能なトークンで続けられます。','毎日のトークンは自動更新されます。獲得・購入済みの残高は保持されます。','任意の広告を視聴して 3 トークン獲得','任意です。視聴完了の確認後にのみトークンが追加されます。','任意の広告を準備中…','広告の準備ができました。「今すぐ視聴」を選ぶと続行します。','今すぐ視聴 · +3 トークン','報酬を確認中です。このページは引き続き利用できます。','アカウントに 3 トークン追加されました。','現在、ここでは任意の広告を利用できません。','ログイン','ログインしてトークンを同期し、報酬の対象か確認します。','毎日のチェックイン','Pro のプランを見る','現在の結果を保持','残高を更新','閉じる','残高を確認中…','残高を確認できませんでした。もう一度お試しください。','広告の準備をキャンセル','毎日のトークンは {time} に更新されます。','ゲストの残高はこのブラウザーに保存されます。','最初の One Match のおすすめを見つけて始めましょう。','本日の Ask AI の利用枠を使い切りました。既存の Ask AI クレジットは Match トークンとは別です。','リンクをコピーしました。','現在、共有を利用できません。'],
    ko:['Match 토큰 {count}개','일일 토큰 {limit}개 중 {remaining}개 남음','적립 또는 구매한 토큰 {count}개','One Match 무제한 · Pro','토큰 옵션 보기','추천을 이어갈 방법을 선택하세요','사용 가능한 Match 토큰을 모두 사용했어요. 현재 결과는 여기에 남아 있어요.','남아 있는 토큰으로 계속할 수 있어요.','일일 토큰은 자동으로 갱신돼요. 적립하거나 구매한 잔액은 유지됩니다.','선택 광고 시청으로 토큰 3개 받기','선택 사항이에요. 시청 완료가 확인된 후에만 토큰이 지급됩니다.','선택 광고 준비 중…','광고가 준비됐어요. 지금 시청을 선택하면 계속할 수 있어요.','지금 시청 · 토큰 +3개','보상을 확인하고 있어요. 이 페이지를 계속 이용할 수 있어요.','계정에 토큰 3개가 추가됐어요.','현재 여기서는 선택 광고를 이용할 수 없어요.','로그인','토큰을 동기화하고 보상 자격을 확인하려면 로그인하세요.','일일 출석','Pro 옵션 보기','현재 결과 유지','잔액 새로고침','닫기','잔액 확인 중…','잔액을 확인할 수 없어요. 다시 시도하세요.','광고 준비 취소','일일 토큰은 {time}에 갱신돼요.','게스트 잔액은 이 브라우저에 저장됩니다.','첫 One Match 추천을 찾아 시작하세요.','오늘의 Ask AI 이용량을 모두 사용했어요. 기존 Ask AI 크레딧은 Match 토큰과 별도로 유지돼요.','링크가 복사됐어요.','현재 공유를 사용할 수 없어요.'],
    zh:['{count} 枚 Match 代币','每日 {limit} 枚代币，剩余 {remaining} 枚','{count} 枚赚取或购买的代币','无限 One Match · Pro','查看代币选项','选择如何继续获取推荐','可用的 Match 代币已用完。当前结果仍保留在这里。','你可以使用剩余代币继续。','每日代币自动刷新。赚取和购买的余额会保留。','自愿观看广告，获得 3 枚代币','完全自愿。只有完整观看得到验证后才会添加代币。','正在准备可选广告…','广告已准备好。选择“立即观看”即可继续。','立即观看 · +3 枚代币','正在核实奖励。你可以继续使用此页面。','已向你的账户添加 3 枚代币。','这里目前没有可选广告。','登录','登录以同步代币并检查奖励资格。','每日签到','查看 Pro 选项','保留当前结果','刷新余额','关闭','正在检查余额…','无法检查余额，请重试。','取消广告准备','每日代币于 {time} 刷新。','访客余额保存在此浏览器中。','先获取你的第一个 One Match 推荐。','今天的 Ask AI 额度已用完。现有 Ask AI 积分与 Match 代币分开保留。','链接已复制。','目前无法分享。']
  };
  const text=(lang,key,args={})=>String(rows[lang]?.[keys.indexOf(key)]||rows.en[keys.indexOf(key)]||'').replace(/\{(\w+)\}/g,(_,name)=>String(args[name]??''));
  function locale(w){let saved='';try{saved=w.localStorage.getItem('match_lang')||'';}catch(_){}for(const value of [w.MATCH_LANG,saved,w.document.documentElement.lang]){const normalized=String(value||'').toLowerCase();const found=languages.find(l=>l.toLowerCase()===normalized)||(normalized.startsWith('pt')?'pt-BR':languages.find(l=>l===normalized.split('-')[0]));if(found)return found;}return 'en';}
  function adult(w){return !/^\/kids(?:\/|$)/i.test(w.location.pathname)&&!w.document.documentElement.classList.contains('kids-mode')&&w.document.documentElement.dataset.matchappMode!=='kids';}
  function policy(data){return data?.ok===true&&data.enabled===true&&data.policy_version===VERSION;}
  const count=value=>Number.isSafeInteger(value)&&value>=0?value:null;
  function wallet(data){
    if(!policy(data)||data.authenticated!==true)return null;
    for(const key of ['daily_limit','daily_remaining','bonus_tokens','purchased_matches','remaining'])if(count(data[key])===null)return null;
    if(data.daily_remaining>data.daily_limit||data.remaining!==data.daily_remaining+data.bonus_tokens||
       typeof data.first_match_pending!=='boolean'||typeof data.unlimited!=='boolean'||typeof data.pro_active!=='boolean')return null;
    if(data.unlimited?(data.pro_active!==true||data.available_total!==null):count(data.available_total)!==data.remaining+data.purchased_matches)return null;
    if(typeof data.next_reset_at!=='string'||!Number.isFinite(Date.parse(data.next_reset_at)))return null;
    return {...data,rewarded_available:data.rewarded_available===true};
  }
  function legacyWallet(data){
    if(data?.ok!==true||data.policy_version!==LEGACY_VERSION||data.credit_target!=='extra_matches'||
       data.authenticated!==true||typeof data.enabled!=='boolean')return null;
    for(const key of ['daily_limit','daily_remaining','bonus_tokens','purchased_matches','remaining','available_total'])if(count(data[key])===null)return null;
    if(![3,5,10,50].includes(data.daily_limit)||data.daily_remaining>data.daily_limit||data.bonus_tokens!==0||data.remaining!==data.daily_remaining||
       data.available_total!==data.remaining+data.purchased_matches||data.unlimited!==false||
       typeof data.pro_active!=='boolean'||typeof data.ad_free!=='boolean'||typeof data.first_match_pending!=='boolean'||
       typeof data.rewarded_available!=='boolean'||typeof data.next_reset_at!=='string'||!Number.isFinite(Date.parse(data.next_reset_at)))return null;
    if(data.rewarded_available&&(!data.enabled||data.ad_free||data.pro_active||data.first_match_pending||data.available_total!==0))return null;
    return {...data};
  }
  function legacyText(lang,key,args={}){let value=legacyRows[lang]?.[key]||text(lang,key,args);for(const [name,replacement]of Object.entries(args))value=value.replaceAll('{'+name+'}',String(replacement));return value;}
  function uuid(w){if(w.crypto?.randomUUID)return w.crypto.randomUUID();if(!w.crypto?.getRandomValues)return '';const b=w.crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
  function trusted(w,event){return event?.isTrusted===true&&(!w.navigator.userActivation||w.navigator.userActivation.isActive===true);}
  function guestStatus(w){
    const read=key=>{try{return w.localStorage.getItem(key)||'';}catch(_){return '';}};
    const integer=key=>Math.max(0,parseInt(read(key)||'0',10)||0);
    const used=read('match_lastDate')===new Date().toLocaleDateString()?integer('match_dailyCount'):0;
    const daily=Math.max(0,3-used),purchased=integer('match_guestBonusMatches');
    let hasValue=read('match_token_first_value_v1')==='1';
    if(!hasValue)try{hasValue=Array.isArray(JSON.parse(read('match_recentTitles')||'[]'))&&JSON.parse(read('match_recentTitles')||'[]').length>0;}catch(_){}
    const reset=new Date();reset.setHours(24,0,0,0);
    return {authenticated:false,daily_limit:3,daily_remaining:daily,bonus_tokens:0,purchased_matches:purchased,remaining:daily,available_total:daily+purchased,unlimited:false,pro_active:false,first_match_pending:!hasValue,next_reset_at:reset.toISOString(),rewarded_available:false};
  }
  function boot(w){
    if(!w?.document||!adult(w)||w.MatchAppTokens)return null;
    const d=w.document;
    let enabled=false,knownPolicy=false,currentWallet=null,accountId='',epoch=0,readFlight=null,view=null,returnFocus=null;
    let legacyRewardsEnabled=false,legacyRewardWallet=null,noticeTarget='match_tokens',settledReward=null;
    let hasValue=false,awaitingFirstReveal=false,notice='loading',action='match',gateSurface=surface(),busy=false,claim=null,adPhase='',rewardTimer=null,reconcileFlight=null,preparationId=0,rewardsSuspended=false;
    const debits=new Map(),unconfirmed=new Map(),legacyLabels=new WeakMap(),legacyTabs=new WeakMap();
    function surface(){return /^\/ebooks(?:\/|$)/.test(w.location.pathname)?'ebook':'one_match';}
    function contextKey(chosen=surface(),runId=w.__matchappMatchRunId){return chosen+':'+String(runId??'current');}
    function createContext(chosen){return {surface:chosen==='ebook'?'ebook':'one_match',runId:uuid(w)};}
    function node(tag,className,content){const el=d.createElement(tag);if(className)el.className=className;if(content!==undefined)el.textContent=content;return el;}
    function legacySurface(){return w.top===w&&(/^\/(?:index\.html)?$/.test(w.location.pathname)||/^\/ebooks\/(?:index\.html)?$/.test(w.location.pathname))&&typeof w.MatchAppNativeRewards?.postMessage==='function';}
    function legacyMode(){return !enabled&&legacyRewardsEnabled&&legacySurface();}
    function rewardTarget(){return claim?.creditTarget||(notice==='credited'?noticeTarget:legacyMode()||(!enabled&&view?.legacy)?'extra_matches':'match_tokens');}
    function label(key,args){return rewardTarget()==='extra_matches'?legacyText(locale(w),key,args):text(locale(w),key,args);}
    function rewardBalance(){return claim?.wallet||(notice==='credited'&&settledReward?settledReward.wallet:rewardTarget()==='extra_matches'?legacyRewardWallet:currentWallet);}
    function freshRewardBalance(){return claim?.creditTarget==='extra_matches'||(!claim&&legacyMode())?legacyRewardWallet:currentWallet;}
    function hasRewardValue(){return rewardTarget()==='extra_matches'?legacyRewardWallet?.first_match_pending===false:hasValue;}
    function rewardPolicyEnabled(){return enabled||legacyMode();}
    function alert(key){try{w.showToast?.(label(key),key==='failed');}catch(_){}}
    async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=w.setTimeout(()=>reject(Error('token_timeout')),12000);})]);}finally{w.clearTimeout(timer);}}
    async function session(){if(!w.supabaseClient?.auth)return null;const r=await bounded(w.ensureCompactMatchSession?w.ensureCompactMatchSession():w.supabaseClient.auth.getSession());if(r.error)throw Error('session_unavailable');return r.data?.session||null;}
    async function rpc(name,args){if(!w.supabaseClient?.rpc)throw Error('token_unavailable');const r=await bounded(w.supabaseClient.rpc(name,args));if(r.error||r.data?.ok!==true)throw Error('token_unavailable');return r.data;}
    async function reward(actionName,values={}){if(!w.supabaseClient?.functions?.invoke)throw Error('reward_unavailable');const r=await bounded(w.supabaseClient.functions.invoke('reward-session',{body:{action:actionName,...values}}));if(r.error||r.data?.ok!==true)throw Error('reward_unavailable');return r.data;}
    function applyPolicy(data){
      if(data?.ok!==true||data.policy_version!==VERSION||typeof data.enabled!=='boolean')return false;
      knownPolicy=true;enabled=data.enabled;d.documentElement.toggleAttribute('data-match-tokens-enabled',enabled);
      if(enabled){legacyRewardsEnabled=false;legacyRewardWallet=null;}
      if(enabled)d.documentElement.dataset.matchTokenPolicy=VERSION;else delete d.documentElement.dataset.matchTokenPolicy;
      const oldBadge=d.getElementById('quota-badge');if(oldBadge)oldBadge.inert=enabled;
      for(const id of ['btn-vip_monthly','btn-vip_annual','btn-business']){
        const card=d.getElementById(id)?.closest('article');if(card)card.setAttribute('data-ma-retired-offer','');
      }
      d.dispatchEvent(new w.CustomEvent('matchapp:tokenpolicy',{detail:{enabled,version:VERSION}}));
      return true;
    }
    function retirePresentation(){
      try{
        for(const link of d.querySelectorAll('[data-i18n="nav.vip"]')){
          if(enabled){if(!legacyLabels.has(link))legacyLabels.set(link,link.textContent);link.textContent='Pro';}
          else if(legacyLabels.has(link)){const translated=w.t?.('nav.vip');link.textContent=translated&&translated!=='nav.vip'?translated:legacyLabels.get(link);legacyLabels.delete(link);}
        }
        const selectedTab=d.getElementById('purchase-tab-kids')?.getAttribute('aria-selected')==='true'
          ? 'purchase-tab-kids':'purchase-tab-credits';
        for(const id of ['purchase-tab-matches','purchase-tab-credits','purchase-tab-kids']){
          const tab=d.getElementById(id);if(!tab)continue;
          if(enabled){if(!legacyTabs.has(tab))legacyTabs.set(tab,{tabIndex:tab.tabIndex,selected:tab.getAttribute('aria-selected')});const selected=id===selectedTab;tab.tabIndex=selected?0:-1;tab.setAttribute('aria-selected',String(selected));}
          else if(legacyTabs.has(tab)){const old=legacyTabs.get(tab);tab.tabIndex=old.tabIndex;if(old.selected===null)tab.removeAttribute('aria-selected');else tab.setAttribute('aria-selected',old.selected);legacyTabs.delete(tab);}
        }
      }catch(_){}
    }
    function assign(data,fromDebit=false){
      if(!applyPolicy(data))return false;
      if(!enabled){currentWallet=null;paintBalances();return true;}
      if(data.authenticated===false){currentWallet=guestStatus(w);if(!fromDebit)hasValue=!currentWallet.first_match_pending;}
      else{const valid=wallet(data);if(!valid)return false;currentWallet=valid;if(!fromDebit&&!awaitingFirstReveal)hasValue=hasValue||!valid.first_match_pending;}
      paintBalances();draw();return true;
    }
    function assignLegacy(data){
      const value=legacyWallet(data);if(!value)return false;
      legacyRewardWallet=value;legacyRewardsEnabled=value.enabled&&!enabled;
      paintLegacyEntry();draw();return true;
    }
    function assignReward(data,target){
      if(target==='extra_matches')return assignLegacy(data)?legacyRewardWallet:null;
      if(target!=='match_tokens'||data?.ok!==true||data.policy_version!==VERSION||typeof data.enabled!=='boolean')return null;
      // A prepared token promise remains reconcilable after its public policy
      // is paused. Reading that promise must not turn the paid wallet on.
      const value=wallet({...data,enabled:true});if(!value||!assign(data))return null;
      return {...value,enabled:data.enabled};
    }
    async function refresh({quiet=true}={}){
      if(rewardsSuspended)return null;
      if(readFlight)return readFlight;
      let current=epoch;
      const flight=(async()=>{
        try{
          const auth=await session();if(current!==epoch)return null;
          const id=auth?.user?.id||'';
          if(accountId!==id){
            if(claim)post('cancel');stopRewardTimer();++preparationId;current=++epoch;
            accountId=id;currentWallet=null;legacyRewardWallet=null;legacyRewardsEnabled=false;settledReward=null;noticeTarget='match_tokens';
            claim=null;adPhase='';busy=false;notice='loading';hasValue=false;awaitingFirstReveal=false;debits.clear();unconfirmed.clear();
            if(view?.legacy)view.scrim.hidden=true;restoreLegacyParent();
          }
          const data=await rpc('match_token_status');if(current!==epoch)return null;
          if(!assign(data))throw Error('wallet_invalid');
          let rewardReadFailed=false;
          if(!enabled&&accountId&&legacySurface()){
            try{const rewardStatus=await rpc('legacy_reward_status');if(current!==epoch)return null;if(!assignLegacy(rewardStatus))throw Error('reward_status_invalid');}
            catch(_){if(current!==epoch)return null;rewardReadFailed=true;legacyRewardsEnabled=false;legacyRewardWallet=null;paintLegacyEntry();if(view?.legacy){notice='failed';draw();}}
          }else{legacyRewardsEnabled=false;legacyRewardWallet=null;paintLegacyEntry();}
          if(!rewardReadFailed&&(notice==='loading'||notice==='failed')){notice=defaultNotice();draw();}
          return currentWallet;
        }catch(_){if(current===epoch){currentWallet=null;legacyRewardWallet=null;legacyRewardsEnabled=false;notice='failed';paintBalances();draw();if(!quiet)alert('failed');}return null;}
      })();
      readFlight=flight;
      try{return await flight;}finally{if(readFlight===flight)readFlight=null;}
    }
    async function refreshAfterValue(){
      if(enabled||!legacySurface())return null;
      const current=epoch;
      if(readFlight)await readFlight;
      if(current!==epoch)return null;
      return refresh();
    }
    function balanceText(value=currentWallet,target='match_tokens'){const copy=(key,args)=>target==='extra_matches'?legacyText(locale(w),key,args):text(locale(w),key,args);if(!value)return copy('loading');return value.unlimited?copy('unlimited'):copy('balance',{count:new Intl.NumberFormat(locale(w)).format(value.available_total)});}
    function balanceButton(chosen=surface()){const el=node('button','ma-token-balance no-depth');el.type='button';el.setAttribute('data-match-token-balance','');el.addEventListener('click',event=>{if(trusted(w,event)){action='match';gateSurface=chosen;open(event);}});return el;}
    function paintBalances(){try{paintBalanceView();}catch(_){}}
    function paintBalanceView(){
      retirePresentation();
      const toolbar=d.querySelector('#result-box .match-result-toolbar');
      if(enabled&&toolbar&&!toolbar.querySelector('.ma-token-corner')){const host=node('div','ma-token-corner');host.append(balanceButton());toolbar.prepend(host);}
      if(toolbar)toolbar.classList.toggle('ma-token-active-toolbar',enabled);
      const corner=toolbar?.querySelector('.ma-token-corner');if(corner)corner.hidden=!enabled;
      for(const button of d.querySelectorAll('[data-match-token-balance]')){
        button.hidden=!enabled||!hasValue;button.textContent=balanceText();button.setAttribute('aria-label',balanceText()+'. '+text(locale(w),'options'));
      }
      paintLegacyEntry();
    }
    function paintLegacyEntry(){
      const eligible=legacyMode()&&accountId&&legacyRewardWallet?.rewarded_available===true&&
        legacyRewardWallet.available_total===0&&legacyRewardWallet.first_match_pending===false;
      const host=surface()==='ebook'?d.querySelector('#ebook-matcher-root .ebook-match-row'):
        d.querySelector('#out-of-matches-modal .oom-sheet');
      for(const entry of d.querySelectorAll('[data-legacy-reward-entry]')){
        entry.hidden=!eligible||entry.parentElement!==host;entry.style.display=entry.hidden?'none':'flex';
        const control=entry.querySelector('button');if(control){control.textContent=legacyText(locale(w),'entry');control.disabled=busy;}
      }
      if(!eligible||!host||host.querySelector('[data-legacy-reward-entry]'))return;
      const entry=node('div','ma-legacy-reward-entry');entry.setAttribute('data-legacy-reward-entry','');
      entry.style.cssText='display:flex;max-width:100%;margin-block:12px';
      const control=node('button','ma-token-balance no-depth',legacyText(locale(w),'entry'));control.type='button';control.style.font='inherit';
      control.addEventListener('click',event=>{if(!trusted(w,event)||!legacyMode()||!legacyRewardWallet?.rewarded_available)return;action='match';gateSurface=surface();open(event);});
      entry.append(control);host.append(entry);
    }
    function stopRewardTimer(){if(rewardTimer!==null){w.clearTimeout(rewardTimer);rewardTimer=null;}}
    function post(type,record=claim,extra={}){if(!record||typeof w.MatchAppNativeRewards?.postMessage!=='function')return false;try{w.MatchAppNativeRewards.postMessage(JSON.stringify({type,requestId:record.requestId,...extra}));return true;}catch(_){return false;}}
    async function cancelPreparation(){
      const previous=claim;stopRewardTimer();++preparationId;
      if(!previous)return;
      if(!previous.shown&&!previous.showRequested){
        if(claim===previous){claim=null;adPhase='';busy=false;notice='unavailable';draw();}
        post('cancel',previous);
        try{await reward('cancel',{claimNonce:previous.nonce});}catch(_){}
      }else{post('cancel',previous);busy=false;notice='verifying';void reconcile();}
    }
    function restoreLegacyParent(){if(view?.legacyParent){view.legacyParent.inert=view.legacyParentInert;view.legacyParent=null;}}
    function close(){if(!view)return;view.scrim.hidden=true;restoreLegacyParent();if(!claim&&adPhase==='preparing'){++preparationId;busy=false;adPhase='';}if(claim&&!claim.shown&&!claim.showRequested)void cancelPreparation();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
    function button(key,handler,quiet=false){const el=node('button','ma-token-button no-depth'+(quiet?' ma-token-button--quiet':''),label(key));el.type='button';el.dataset.tokenAction=key;el.addEventListener('click',event=>{if(trusted(w,event))handler(event);});return el;}
    function draw(){try{paintLegacyEntry();drawView();}catch(_){}}
    function defaultNotice(){return claim?adPhase==='ready'?'ready':'verifying':accountId?freshRewardBalance()?.rewarded_available&&typeof w.MatchAppNativeRewards?.postMessage==='function'?'rewardNote':'refreshNote':'signInNote';}
    function drawView(){
      if(!view)return;
      const visibleWallet=rewardBalance(),target=rewardTarget();
      const focused=d.activeElement,retainFocus=view.legacy&&!view.scrim.hidden&&view.dialog.contains(focused),focusKey=focused?.dataset?.tokenAction;
      view.dialog.toggleAttribute('data-legacy-rewards',view.legacy===true);view.scrim.toggleAttribute('data-legacy-rewards',view.legacy===true);
      view.dialog.lang=locale(w);view.dialog.dir=locale(w)==='ar'?'rtl':'ltr';view.title.textContent=label('title');view.close.setAttribute('aria-label',label('close'));
      const exhausted=visibleWallet&&!visibleWallet.unlimited&&visibleWallet.available_total===0;
      view.intro.textContent=label(action==='ask_ai'?'askLimit':exhausted?'empty':'available');view.ledger.replaceChildren();view.actions.replaceChildren();
      if(visibleWallet){
        view.ledger.append(node('strong','',balanceText(visibleWallet,target)));
        if(!visibleWallet.unlimited){
          const number=v=>new Intl.NumberFormat(locale(w)).format(v);
          view.ledger.append(node('p','',label('daily',{remaining:number(visibleWallet.daily_remaining),limit:number(visibleWallet.daily_limit)})));
          view.ledger.append(node('p','',label('extras',{count:number(visibleWallet.bonus_tokens+visibleWallet.purchased_matches)})));
        }
      }else view.ledger.append(node('p','',label('loading')));
      view.notice.textContent=label(notice);view.footnote.textContent=label(accountId?'refreshNote':'guest');
      if(target==='match_tokens'&&visibleWallet?.next_reset_at&&!visibleWallet.unlimited){const time=new Intl.DateTimeFormat(locale(w),{hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(visibleWallet.next_reset_at));view.footnote.textContent+=' '+label('reset',{time});}
      if(action==='match'&&exhausted&&accountId&&visibleWallet.rewarded_available&&typeof w.MatchAppNativeRewards?.postMessage==='function'&&hasRewardValue()&&rewardPolicyEnabled()){
        const rewardGroup=node('div','ma-token-reward-actions');
        const control=button(adPhase==='ready'?'watch':adPhase==='preparing'?'preparing':'reward',event=>adPhase==='ready'?showReward(event):prepareReward(event));
        control.classList.add('ma-token-reward');control.disabled=busy||Boolean(claim&&adPhase!=='ready');
        const cancelSlot=node('div','ma-token-reward-cancel');
        if(claim&&['preparing','ready'].includes(adPhase)&&!claim.shown&&!claim.showRequested)cancelSlot.append(button('cancelAd',()=>cancelPreparation(),true));
        rewardGroup.append(control,cancelSlot);view.actions.append(rewardGroup);
      }
      if(!accountId){const control=button('signIn',()=>{close();w.openAuthModal?.();},true);control.disabled=busy;view.actions.append(control);}
      if(enabled&&accountId&&typeof w.openDailyCheckin==='function'){const control=button('checkin',()=>{close();w.openDailyCheckin();},true);control.disabled=busy;view.actions.append(control);}
      if(enabled&&action==='match'&&typeof w.MatchAppPro?.open==='function'){const control=button('pro',event=>{close();w.MatchAppPro.open(event);},true);control.disabled=busy;view.actions.append(control);}
      const refreshControl=button('refresh',()=>{notice='loading';draw();void refresh({quiet:false}).then(()=>{if(claim)void reconcile();});},true);refreshControl.disabled=busy;view.actions.append(refreshControl);
      view.actions.append(button('keep',close,true));
      if(retainFocus&&!view.dialog.contains(d.activeElement)){
        const next=[...view.dialog.querySelectorAll('button:not(:disabled)')].find(el=>el.dataset.tokenAction===focusKey)||view.close;
        next.focus({preventScroll:true});
      }
    }
    function mount(){
      if(view)return;
      const scrim=node('div','ma-token-scrim');scrim.hidden=true;const dialog=node('section','ma-token-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','ma-token-title');dialog.tabIndex=-1;
      const heading=node('div','ma-token-heading'),title=node('h2');title.id='ma-token-title';const dismiss=button('close',close,true);dismiss.textContent='×';dismiss.classList.add('ma-token-button--close');heading.append(title,dismiss);
      const intro=node('p','ma-token-intro'),ledger=node('div','ma-token-ledger'),status=node('p','ma-token-notice');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
      const actions=node('div','ma-token-actions'),footnote=node('p','ma-token-footnote');dialog.append(heading,intro,ledger,status,actions,footnote);scrim.append(dialog);d.body.append(scrim);view={scrim,dialog,title,close:dismiss,intro,ledger,notice:status,actions,footnote};
      scrim.addEventListener('click',event=>{if(event.target===scrim)close();});
      dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();if(view.legacy)event.stopPropagation();close();return;}if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button:not(:disabled)')];if(event.shiftKey&&d.activeElement===controls[0]){event.preventDefault();controls.at(-1)?.focus();}else if(!event.shiftKey&&d.activeElement===controls.at(-1)){event.preventDefault();controls[0]?.focus();}});
    }
    function open(event){
      if(!rewardPolicyEnabled()||!hasRewardValue()||(event&&!trusted(w,event)))return false;
      mount();returnFocus=d.activeElement;view.scrim.hidden=false;
      view.legacy=!enabled;
      if(view.legacy&&!view.legacyParent){const parent=d.getElementById('out-of-matches-modal');if(parent){view.legacyParent=parent;view.legacyParentInert=parent.inert;parent.inert=true;}}
      noticeTarget=claim?.creditTarget||(legacyMode()?'extra_matches':'match_tokens');settledReward=null;
      notice=defaultNotice();
      draw();view.close.focus({preventScroll:true});return true;
    }
    function handleLimit(kind,status,requested='match'){
      if(!enabled){if(requested==='match'&&legacySurface()){gateSurface=surface();paintLegacyEntry();void refresh();}return false;}action=requested;
      if(!accountId){currentWallet=guestStatus(w);hasValue=hasValue||!currentWallet.first_match_pending;}
      if(!hasValue){alert('first');return true;}
      open();return true;
    }
    async function beforeLookup(requested='match',context={}){
      if(requested!=='match')return null;
      gateSurface=context?.surface==='ebook'?'ebook':surface();
      const value=await refresh();
      if(!enabled)return null;
      if(!value){alert('failed');return false;}
      if(!accountId){
        // A fresh guest who used Ask AI first still gets the promised first
        // Match. This does not mint or change any paid/earned balance.
        if(!hasValue)return true;
        return null; // Existing browser quota owns normal guest debits.
      }
      if(value.first_match_pending||value.unlimited||value.available_total>0)return true;
      handleLimit('registered',value,'match');return false;
    }
    async function consume(requested='match',context={}){
      if(requested!=='match')return null;
      if(!knownPolicy)await refresh();
      if(!enabled)return null;
      const current=epoch,chosen=context?.surface==='ebook'?'ebook':surface(),run=context?.runId??w.__matchappMatchRunId,key=contextKey(chosen,run);
      let auth;
      try{auth=await session();if(current!==epoch)return false;}catch(_){alert('failed');return false;}
      // Check the originating result again after the session read and before
      // any debit. A replaced search must never spend the newer search's token.
      if(chosen==='one_match'&&run!==w.__matchappMatchRunId)return false;
      if(!auth){currentWallet=guestStatus(w);return !hasValue&&currentWallet.available_total===0?true:null;}
      if(auth.user.id!==accountId){alert('failed');return false;}
      const existing=debits.get(key),id=existing?.id||uuid(w);if(!id){alert('failed');return false;}
      const pending=existing||{id,userId:accountId,surface:chosen,run,confirmed:false,consumed:false};debits.set(key,pending);
      if(!hasValue)awaitingFirstReveal=true;
      try{
        let response;
        // An ambiguous transport retry must reuse the same UUID. The server
        // applies one debit for this request, even if the first response was lost.
        try{response=await rpc('consume_match_token',{p_request_id:id,p_surface:chosen});}
        catch(_){response=await rpc('consume_match_token',{p_request_id:id,p_surface:chosen});}
        if(current!==epoch)return false;
        if(response.enabled===false&&response.policy_version===VERSION){assign(response);debits.delete(key);return null;}
        if(response.request_id!==id||typeof response.allowed!=='boolean'||!assign(response,true))throw Error('debit_invalid');
        pending.consumed=response.consumed===true;
        if(!response.allowed){debits.delete(key);if(currentWallet&&!currentWallet.first_match_pending&&!currentWallet.unlimited&&currentWallet.available_total===0)handleLimit('registered',currentWallet,'match');else alert('failed');return false;}
        return true;
      }catch(_){if(current===epoch){await noteUnconfirmed(chosen,run);alert('failed');}return false;}
    }
    async function noteUnconfirmed(chosen=surface(),run=w.__matchappMatchRunId){
      const key=contextKey(chosen,run),pending=debits.get(key);
      if(!pending||pending.confirmed||pending.userId!==accountId)return false;
      // Only the server can reconcile a debit. Retain its opaque request ID
      // in this document; never restore credit or mutate the paid balance.
      unconfirmed.set(pending.id,{requestId:pending.id,surface:pending.surface,run:pending.run});
      if(unconfirmed.size>20)unconfirmed.delete(unconfirmed.keys().next().value);
      debits.delete(key);
      void refresh();
      return true;
    }
    function confirmResult(chosen=surface(),host=null,run=w.__matchappMatchRunId){
      try{w.MatchAppNativeNewsSlot?.confirmValue?.(chosen,host,run);}catch(_){}
      if(!enabled){
        if(legacySurface()){
          void refresh();
          if(chosen==='one_match'&&typeof w.matchPolicy?.flush==='function'){
            const current=epoch;
            try{void bounded(Promise.resolve(w.matchPolicy.flush())).then(()=>{if(current===epoch)void refreshAfterValue();}).catch(()=>{});}catch(_){}
          }
        }
        return;
      }
      const firstValue=!hasValue;
      hasValue=true;awaitingFirstReveal=false;
      if(!accountId){try{w.localStorage.setItem('match_token_first_value_v1','1');}catch(_){}currentWallet=guestStatus(w);}
      const pending=debits.get(contextKey(chosen,run));if(pending){pending.confirmed=true;debits.delete(contextKey(chosen,run));}
      try{if(chosen==='ebook'&&host&&!host.querySelector('[data-match-token-balance]')){const wrap=node('div','ma-token-reading-status');wrap.append(balanceButton('ebook'));host.append(wrap);}}catch(_){}
      paintBalances();draw();
      // Presentation-only signal; native still owns consent, account and ad eligibility.
      if(firstValue)try{d.dispatchEvent(new w.CustomEvent('matchapp:firstvalue',{detail:{surface:chosen==='ebook'?'ebook':'one_match'}}));}catch(_){}
    }
    async function prepareReward(event){
      const currentBalance=freshRewardBalance();
      if(rewardsSuspended||!trusted(w,event)||busy||claim||!rewardPolicyEnabled()||!hasRewardValue()||!accountId||!currentBalance?.rewarded_available||currentBalance.unlimited||currentBalance.available_total!==0)return;
      if(typeof w.MatchAppNativeRewards?.postMessage!=='function')return;
      const current=epoch,preparation=++preparationId,preparingAccount=accountId;busy=true;notice='preparing';adPhase='preparing';draw();
      try{
        const auth=await session();if(current!==epoch||preparation!==preparationId)return;if(!auth||auth.user.id!==accountId)throw Error('account_changed');
        const requestId=uuid(w);if(!requestId)throw Error('request_unavailable');
        const result=await reward('create',{requestId,surface:gateSurface});
        if(current!==epoch||preparation!==preparationId){
          if(accountId===preparingAccount&&result.claimStatus!=='prepared'&&/^[a-f0-9]{64}$/.test(result.claimNonce||''))try{await reward('cancel',{claimNonce:result.claimNonce});}catch(_){}
          return;
        }
        const target=result.creditTarget===undefined&&enabled?'match_tokens':result.creditTarget;
        const status=result.claimStatus===undefined&&target==='match_tokens'?'created':result.claimStatus;
        if(!/^[a-f0-9]{64}$/.test(result.claimNonce||'')||result.rewardAmount!==3||!Number.isFinite(result.expiresAt)||
           !['created','prepared','credited','expired','cancelled'].includes(status)||(status==='created'&&result.expiresAt<Date.now()+90000))throw Error('claim_invalid');
        const promiseWallet=assignReward(result.wallet,target);if(!promiseWallet)throw Error('claim_invalid');
        claim={requestId,nonce:result.claimNonce,expiresAt:result.expiresAt,userId:accountId,creditTarget:target,wallet:promiseWallet,shown:false,showRequested:false,polls:0};noticeTarget=target;
        if(status!=='created'){
          // A recovered promise may already have been presented by an earlier
          // document. Reconcile it; never prepare or show it a second time.
          claim.showRequested=true;busy=false;adPhase='verifying';notice='verifying';draw();void reconcile();return;
        }
        if(!post('prepare',claim,{claimNonce:claim.nonce,accessToken:auth.access_token}))throw Error('bridge_unavailable');
        stopRewardTimer();rewardTimer=w.setTimeout(()=>{if(current===epoch&&adPhase==='preparing'){notice='unavailable';busy=false;void cancelPreparation();draw();}},22000);
      }catch(_){if(current===epoch){notice='unavailable';busy=false;adPhase='';if(claim&&!claim.shown&&!claim.showRequested)void cancelPreparation();draw();}}
    }
    function showReward(event){
      const currentBalance=freshRewardBalance();
      if(rewardsSuspended||!trusted(w,event)||busy||adPhase!=='ready'||!claim||claim.userId!==accountId||Date.now()>=claim.expiresAt||currentBalance?.available_total!==0||currentBalance?.unlimited)return;
      // Native independently checks current UMP consent and the physical
      // foreground gesture. Never await or auto-show after a ready callback.
      claim.showRequested=true;if(post('show')){busy=true;adPhase='showing';notice='verifying';draw();}else{claim.showRequested=false;notice='unavailable';draw();}
    }
    async function reconcile(){
      if(rewardsSuspended||reconcileFlight||!claim||claim.userId!==accountId)return reconcileFlight;
      const record=claim,current=epoch;
      const flight=(async()=>{
        try{
          const auth=await session();if(current!==epoch||!auth||auth.user.id!==record.userId)return;
          const result=await reward('status',{claimNonce:record.nonce});if(current!==epoch||claim!==record)return;
          const target=result.creditTarget===undefined&&record.creditTarget==='match_tokens'?'match_tokens':result.creditTarget;
          if(result.claimNonce!==record.nonce||target!==record.creditTarget||!['created','prepared','credited','expired','cancelled'].includes(result.status))throw Error('reward_status_invalid');
          const promiseWallet=assignReward(result.wallet,target);if(!promiseWallet)throw Error('reward_status_invalid');record.wallet=promiseWallet;
          if(result.credited===true&&result.status==='credited'){
            notice='credited';noticeTarget=target;settledReward={target,wallet:promiseWallet};adPhase='';claim=null;stopRewardTimer();
            if(target==='extra_matches'){
              // Refresh the original read-only badge after authoritative SSV
              // fulfillment; never add a balance or change a debit locally.
              try{void Promise.resolve(w.refreshQuotaStatus?.()).catch(()=>{});w.closeOutOfMatches?.();}catch(_){}
            }
          }
          else if(['expired','cancelled'].includes(result.status)){notice='unavailable';adPhase='';claim=null;stopRewardTimer();}
          else if(record.shown||record.showRequested||!['preparing','ready'].includes(adPhase)){
            notice='verifying';adPhase='verifying';
            if(record.polls<4){const delay=[1500,4500,10000,20000][record.polls++];stopRewardTimer();rewardTimer=w.setTimeout(()=>{void reconcile();},delay);}
          }
        }catch(_){if(current===epoch&&(record.shown||record.showRequested||!['preparing','ready'].includes(adPhase)))notice='verifying';}
        finally{if(current===epoch){busy=adPhase==='preparing'&&claim===record;draw();}}
      })();
      reconcileFlight=flight;
      try{return await flight;}finally{if(reconcileFlight===flight)reconcileFlight=null;}
    }
    function rewardEvent(event){
      const value=event.detail;if(rewardsSuspended||!claim||!value||value.requestId!==claim.requestId||claim.userId!==accountId)return;
      if(value.status==='ready'){if(claim.shown||claim.showRequested||adPhase!=='preparing')return;stopRewardTimer();claim.showRequested=false;adPhase='ready';busy=false;notice='ready';draw();return;}
      if(value.status==='loading'){if(claim.shown||claim.showRequested||adPhase!=='preparing')return;adPhase='preparing';notice='preparing';busy=true;draw();return;}
      if(value.status==='showing'){claim.shown=true;adPhase='showing';busy=true;draw();return;}
      if(['earned','dismissed'].includes(value.status)){if(value.status==='earned')claim.shown=true;stopRewardTimer();notice='verifying';adPhase='verifying';busy=false;draw();void reconcile();return;}
      if(['failed','unavailable','cancelled'].includes(value.status)){stopRewardTimer();busy=false;notice='unavailable';if(claim.shown||claim.showRequested)void reconcile();else void cancelPreparation();draw();}
    }
    function authChanged(){
      const previous=claim;if(previous)post('cancel',previous);stopRewardTimer();++epoch;accountId='';currentWallet=null;legacyRewardWallet=null;legacyRewardsEnabled=false;settledReward=null;noticeTarget='match_tokens';hasValue=false;awaitingFirstReveal=false;claim=null;adPhase='';busy=false;readFlight=null;reconcileFlight=null;debits.clear();unconfirmed.clear();notice='loading';if(view?.legacy)view.scrim.hidden=true;restoreLegacyParent();paintBalances();draw();
      // Existing Supabase auth callbacks own the session lock. Read after that
      // callback returns, rather than making RPCs inside its locked turn.
      w.setTimeout(()=>{void refresh();},0);
    }
    async function ordinaryShare({title,message,url}){
      try{const destination=new URL(typeof url==='string'&&url.trim()?url:'https://matchapp.tv/',w.location.href);if(destination.protocol!=='https:'||!['matchapp.tv','www.matchapp.tv'].includes(destination.hostname))throw Error('share_url_invalid');
        if(w.navigator.share)await w.navigator.share({title:String(title||'MatchApp Ai'),text:String(message||''),url:destination.href});
        else{await w.navigator.clipboard.writeText(String(message||title||'MatchApp Ai')+'\n'+destination.href);alert('copied');}
        return true;
      }catch(error){if(error?.name!=='AbortError')alert('shareFailed');return false;}
    }
    function initialize(){void refresh();paintBalances();}
    d.addEventListener('matchapp:newmatch',paintBalances);
    d.addEventListener('matchapp:authchange',authChanged);
    for(const event of ['matchapp:langchange','matchapp:languagechange'])d.addEventListener(event,()=>{paintBalances();draw();if(legacySurface())Promise.resolve().then(paintLegacyEntry);});
    for(const event of ['matchapp:matchbalancechange','matchapp:prostatus'])d.addEventListener(event,()=>{void refresh();});
    w.addEventListener('matchapp:rewarded',rewardEvent);
    const resume=()=>{rewardsSuspended=false;if(claim)void reconcile();if(enabled||legacySurface())void refresh();};
    w.addEventListener('pagehide',()=>{
      rewardsSuspended=true;++epoch;++preparationId;readFlight=null;reconcileFlight=null;stopRewardTimer();busy=false;
      if(view)view.scrim.hidden=true;restoreLegacyParent();
      if(claim){if(!claim.shown&&!claim.showRequested)void cancelPreparation();else{post('cancel');adPhase='verifying';notice='verifying';}}
    });
    d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='visible')resume();});w.addEventListener('pageshow',resume);
    w.addEventListener('storage',event=>{if(['match_dailyCount','match_lastDate','match_guestBonusMatches','match_lang'].includes(event.key)){if(!accountId&&enabled)currentWallet=guestStatus(w);paintBalances();draw();}});
    const api=Object.freeze({createContext,beforeLookup,consume,noteUnconfirmed,confirmResult,handleLimit,open,close,refresh,refreshAfterValue,ordinaryShare,
      updateStatus:()=>{if(enabled&&!accountId)currentWallet=guestStatus(w);paintBalances();return enabled;},
      renderCorner:()=>{paintBalances();return enabled;},
      isAdFree:()=>enabled&&currentWallet?.ad_free===true,isPro:()=>enabled&&currentWallet?.pro_active===true&&currentWallet?.unlimited===true,
      get enabled(){return enabled;},get retireLegacyPromotions(){return enabled;},get hasValue(){return hasValue;}});
    w.MatchAppTokens=api;if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();return api;
  }
  return Object.freeze({VERSION,LEGACY_VERSION,languages,keys,rows,legacyKeys,legacyRows,text,legacyText,locale,adult,policy,wallet,legacyWallet,uuid,trusted,guestStatus,boot});
});
