/* MatchApp Ai Pro. Prices and entitlements are read from the billing service.
 * This module never grants access, stores receipts, or replaces legacy billing.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else api.boot(root);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const languages = ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
  const keys = ['summary','loading','signIn','signInNote','monthly','terms','providers','subscribe','options','unavailable','retry','close','active','inactive','expires','manage','cancel','restore','verifying','pending','verificationPending','cancelled','restoreNone','nativeUnavailable','checkout','choose','recurring','limited','once','market','country','refresh','accountChanged'];
  const rows = {
    en:['Unlimited One Match recommendations with MatchApp Ai.','Checking your plan…','Sign in','Sign in to see your plan and keep purchases with your account.','{price} / month','Renews monthly until canceled. Manage or cancel any time.','Streaming subscriptions and paid titles are purchased separately from their providers.','Continue with {price} / month','See Pro options','Pro is not available for purchase here yet.','Try again','Close','Pro is active','No active Pro subscription','Access until {date}','Manage subscription','Cancel subscription','Restore Google Play purchase','Checking your purchase…','Payment is pending. Your plan updates after payment and verification.','Verification is pending. Check your plan again shortly.','Purchase canceled. Your current result is still here.','No eligible Google Play subscription was found for this account.','Google Play purchases are currently unavailable. Select “Refresh plan” to try again.','Continue to secure checkout','Choose your offer','{price} every {period}','{price} every {period} for {count} payments','{price} for {period}','Price for {country}','Billing country','Refresh plan','Your account changed. Please check your plan again.'],
    'pt-BR':['Recomendações ilimitadas no One Match com o MatchApp Ai.','Verificando seu plano…','Entrar','Entre para ver seu plano e vincular as compras à sua conta.','{price} / mês','Renovação mensal até o cancelamento. Gerencie ou cancele quando quiser.','Assinaturas de streaming e títulos pagos são adquiridos separadamente nos provedores.','Continuar por {price} / mês','Ver opções Pro','A compra do Pro ainda não está disponível aqui.','Tentar novamente','Fechar','Pro está ativo','Nenhuma assinatura Pro ativa','Acesso até {date}','Gerenciar assinatura','Cancelar assinatura','Restaurar compra do Google Play','Verificando sua compra…','O pagamento está pendente. Seu plano será atualizado após o pagamento e a verificação.','A verificação está pendente. Consulte seu plano novamente em instantes.','Compra cancelada. Seu resultado continua aqui.','Nenhuma assinatura elegível do Google Play foi encontrada para esta conta.','As compras pelo Google Play estão indisponíveis no momento. Selecione “Atualizar plano” para tentar novamente.','Ir para o pagamento seguro','Escolha sua oferta','{price} a cada {period}','{price} a cada {period}, por {count} pagamentos','{price} por {period}','Preço para {country}','País de cobrança','Atualizar plano','Sua conta mudou. Consulte seu plano novamente.'],
    es:['Recomendaciones ilimitadas de One Match con MatchApp Ai.','Consultando tu plan…','Iniciar sesión','Inicia sesión para ver tu plan y vincular las compras a tu cuenta.','{price} / mes','Se renueva cada mes hasta que lo canceles. Gestiona o cancela cuando quieras.','Las suscripciones de streaming y los títulos de pago se compran por separado a sus proveedores.','Continuar por {price} / mes','Ver opciones Pro','La compra de Pro aún no está disponible aquí.','Volver a intentar','Cerrar','Pro está activo','No hay una suscripción Pro activa','Acceso hasta {date}','Gestionar suscripción','Cancelar suscripción','Restaurar compra de Google Play','Verificando tu compra…','El pago está pendiente. Tu plan se actualizará tras el pago y la verificación.','La verificación está pendiente. Vuelve a consultar tu plan en unos instantes.','Compra cancelada. Tu resultado sigue aquí.','No se encontró una suscripción de Google Play válida para esta cuenta.','Las compras de Google Play no están disponibles en este momento. Selecciona «Actualizar plan» para volver a intentarlo.','Continuar al pago seguro','Elige tu oferta','{price} cada {period}','{price} cada {period} durante {count} pagos','{price} por {period}','Precio para {country}','País de facturación','Actualizar plan','Tu cuenta ha cambiado. Vuelve a consultar tu plan.'],
    fr:['Recommandations One Match illimitées avec MatchApp Ai.','Vérification de votre abonnement…','Se connecter','Connectez-vous pour voir votre abonnement et associer les achats à votre compte.','{price} / mois','Renouvellement mensuel jusqu’à résiliation. Gérez ou résiliez à tout moment.','Les abonnements de streaming et les titres payants s’achètent séparément auprès des fournisseurs.','Continuer à {price} / mois','Voir les offres Pro','L’achat de Pro n’est pas encore disponible ici.','Réessayer','Fermer','Pro est actif','Aucun abonnement Pro actif','Accès jusqu’au {date}','Gérer l’abonnement','Résilier l’abonnement','Restaurer un achat Google Play','Vérification de votre achat…','Paiement en attente. Votre abonnement sera mis à jour après paiement et vérification.','Vérification en attente. Consultez à nouveau votre abonnement dans quelques instants.','Achat annulé. Votre résultat reste disponible ici.','Aucun abonnement Google Play admissible n’a été trouvé pour ce compte.','Les achats Google Play sont indisponibles pour le moment. Sélectionnez « Actualiser l’abonnement » pour réessayer.','Continuer vers le paiement sécurisé','Choisissez votre offre','{price} tous les {period}','{price} tous les {period}, pendant {count} paiements','{price} pour {period}','Tarif pour {country}','Pays de facturation','Actualiser l’abonnement','Votre compte a changé. Vérifiez à nouveau votre abonnement.'],
    de:['Unbegrenzte One Match Empfehlungen mit MatchApp Ai.','Dein Abo wird geprüft…','Anmelden','Melde dich an, um dein Abo zu sehen und Käufe deinem Konto zuzuordnen.','{price} / Monat','Verlängert sich monatlich bis zur Kündigung. Jederzeit verwalten oder kündigen.','Streamingabos und kostenpflichtige Titel kaufst du separat bei den jeweiligen Anbietern.','Für {price} / Monat fortfahren','Pro-Angebote ansehen','Pro kann hier noch nicht gekauft werden.','Erneut versuchen','Schließen','Pro ist aktiv','Kein aktives Pro-Abo','Zugriff bis {date}','Abo verwalten','Abo kündigen','Google Play Kauf wiederherstellen','Dein Kauf wird geprüft…','Die Zahlung steht aus. Dein Abo wird nach Zahlung und Prüfung aktualisiert.','Die Prüfung steht aus. Prüfe dein Abo in Kürze erneut.','Kauf abgebrochen. Dein Ergebnis bleibt hier.','Für dieses Konto wurde kein berechtigtes Google Play Abo gefunden.','Google Play Käufe sind derzeit nicht verfügbar. Wähle „Abo aktualisieren“, um es erneut zu versuchen.','Weiter zur sicheren Zahlung','Wähle dein Angebot','{price} alle {period}','{price} alle {period} für {count} Zahlungen','{price} für {period}','Preis für {country}','Rechnungsland','Abo aktualisieren','Dein Konto hat sich geändert. Prüfe dein Abo erneut.'],
    it:['Consigli One Match illimitati con MatchApp Ai.','Verifica del piano…','Accedi','Accedi per vedere il piano e associare gli acquisti al tuo account.','{price} / mese','Si rinnova ogni mese fino alla disdetta. Gestisci o disdici quando vuoi.','Gli abbonamenti streaming e i titoli a pagamento si acquistano separatamente dai fornitori.','Continua a {price} / mese','Vedi le opzioni Pro','L’acquisto di Pro non è ancora disponibile qui.','Riprova','Chiudi','Pro è attivo','Nessun abbonamento Pro attivo','Accesso fino al {date}','Gestisci abbonamento','Disdici abbonamento','Ripristina acquisto Google Play','Verifica dell’acquisto…','Pagamento in sospeso. Il piano si aggiornerà dopo il pagamento e la verifica.','Verifica in sospeso. Controlla di nuovo il piano tra poco.','Acquisto annullato. Il tuo risultato è ancora qui.','Non è stato trovato un abbonamento Google Play idoneo per questo account.','Gli acquisti Google Play non sono al momento disponibili. Seleziona «Aggiorna piano» per riprovare.','Continua al pagamento sicuro','Scegli l’offerta','{price} ogni {period}','{price} ogni {period} per {count} pagamenti','{price} per {period}','Prezzo per {country}','Paese di fatturazione','Aggiorna piano','Il tuo account è cambiato. Controlla di nuovo il piano.'],
    tr:['MatchApp Ai ile sınırsız One Match önerileri.','Planınız kontrol ediliyor…','Giriş yap','Planınızı görmek ve satın alımları hesabınıza bağlamak için giriş yapın.','{price} / ay','İptal edilene kadar her ay yenilenir. İstediğiniz zaman yönetin veya iptal edin.','Yayın abonelikleri ve ücretli içerikler ilgili sağlayıcılardan ayrıca satın alınır.','Aylık {price} ile devam et','Pro seçeneklerini gör','Pro henüz burada satın alınamıyor.','Tekrar dene','Kapat','Pro etkin','Etkin Pro aboneliği yok','Erişim bitişi: {date}','Aboneliği yönet','Aboneliği iptal et','Google Play satın alımını geri yükle','Satın alımınız doğrulanıyor…','Ödeme bekleniyor. Planınız ödeme ve doğrulamadan sonra güncellenir.','Doğrulama bekleniyor. Planınızı kısa süre sonra tekrar kontrol edin.','Satın alım iptal edildi. Mevcut sonucunuz burada duruyor.','Bu hesap için uygun bir Google Play aboneliği bulunamadı.','Google Play satın alımları şu anda kullanılamıyor. Tekrar denemek için “Planı yenile” seçeneğini kullanın.','Güvenli ödemeye devam et','Teklifinizi seçin','Her {period} için {price}','{count} ödeme boyunca her {period} için {price}','{period} için {price}','{country} için fiyat','Fatura ülkesi','Planı yenile','Hesabınız değişti. Lütfen planınızı tekrar kontrol edin.'],
    ru:['Неограниченные рекомендации One Match от MatchApp Ai.','Проверяем подписку…','Войти','Войдите, чтобы посмотреть подписку и привязать покупки к аккаунту.','{price} / месяц','Продлевается ежемесячно до отмены. Управлять и отменять можно в любое время.','Подписки на стриминг и платные произведения приобретаются отдельно у поставщиков.','Продолжить за {price} / месяц','Посмотреть варианты Pro','Покупка Pro здесь пока недоступна.','Повторить','Закрыть','Pro активен','Нет активной подписки Pro','Доступ до {date}','Управлять подпиской','Отменить подписку','Восстановить покупку Google Play','Проверяем покупку…','Ожидается оплата. Подписка обновится после оплаты и проверки.','Проверка ещё не завершена. Проверьте подписку немного позже.','Покупка отменена. Ваш результат остался здесь.','Для этого аккаунта не найдена подходящая подписка Google Play.','Покупки в Google Play сейчас недоступны. Выберите «Обновить подписку», чтобы повторить попытку.','Перейти к безопасной оплате','Выберите предложение','{price} каждые {period}','{price} каждые {period}, всего {count} платежей','{price} за {period}','Цена для страны: {country}','Страна выставления счёта','Обновить подписку','Аккаунт изменился. Проверьте подписку ещё раз.'],
    ar:['توصيات One Match غير محدودة مع MatchApp Ai.','جارٍ التحقق من اشتراكك…','تسجيل الدخول','سجّل الدخول لعرض اشتراكك وربط المشتريات بحسابك.','{price} / شهر','يتجدد شهريًا حتى الإلغاء. يمكنك إدارته أو إلغاؤه في أي وقت.','تُشترى اشتراكات البث والمحتويات المدفوعة بشكل منفصل من مزوّديها.','المتابعة مقابل {price} / شهر','عرض خيارات Pro','شراء Pro غير متاح هنا بعد.','المحاولة مجددًا','إغلاق','Pro نشط','لا يوجد اشتراك Pro نشط','الوصول حتى {date}','إدارة الاشتراك','إلغاء الاشتراك','استعادة عملية شراء Google Play','جارٍ التحقق من مشترياتك…','الدفع معلّق. يُحدّث اشتراكك بعد الدفع والتحقق.','التحقق معلّق. راجع اشتراكك مجددًا بعد قليل.','أُلغيت عملية الشراء. نتيجتك الحالية ما زالت هنا.','لم يُعثر على اشتراك Google Play مؤهل لهذا الحساب.','مشتريات Google Play غير متاحة حاليًا. اختر «تحديث الاشتراك» للمحاولة مجددًا.','المتابعة إلى الدفع الآمن','اختر عرضك','{price} كل {period}','{price} كل {period} لمدة {count} دفعات','{price} لمدة {period}','السعر في {country}','بلد الفوترة','تحديث الاشتراك','تغيّر حسابك. يرجى التحقق من اشتراكك مجددًا.'],
    hi:['MatchApp Ai के साथ असीमित One Match सिफ़ारिशें।','आपका प्लान जाँचा जा रहा है…','साइन इन करें','अपना प्लान देखने और खरीदारी को खाते से जोड़ने के लिए साइन इन करें।','{price} / माह','रद्द करने तक हर महीने नवीनीकरण होता है। कभी भी प्रबंधित या रद्द करें।','स्ट्रीमिंग सदस्यताएँ और सशुल्क सामग्री संबंधित प्रदाताओं से अलग खरीदी जाती हैं।','{price} / माह पर जारी रखें','Pro के विकल्प देखें','यहाँ Pro की खरीदारी अभी उपलब्ध नहीं है।','फिर कोशिश करें','बंद करें','Pro सक्रिय है','कोई सक्रिय Pro सदस्यता नहीं','{date} तक पहुँच','सदस्यता प्रबंधित करें','सदस्यता रद्द करें','Google Play खरीदारी बहाल करें','आपकी खरीदारी सत्यापित की जा रही है…','भुगतान लंबित है। भुगतान और सत्यापन के बाद आपका प्लान अपडेट होगा।','सत्यापन लंबित है। थोड़ी देर बाद अपना प्लान फिर जाँचें।','खरीदारी रद्द हुई। आपका वर्तमान नतीजा यहीं है।','इस खाते के लिए कोई योग्य Google Play सदस्यता नहीं मिली।','Google Play खरीदारी अभी उपलब्ध नहीं है। फिर कोशिश करने के लिए “प्लान फिर जाँचें” चुनें।','सुरक्षित भुगतान पर आगे बढ़ें','अपना ऑफ़र चुनें','हर {period} पर {price}','{count} भुगतानों के लिए हर {period} पर {price}','{period} के लिए {price}','{country} के लिए कीमत','बिलिंग देश','प्लान फिर जाँचें','आपका खाता बदल गया है। कृपया अपना प्लान फिर जाँचें।'],
    id:['Rekomendasi One Match tanpa batas dengan MatchApp Ai.','Memeriksa paket Anda…','Masuk','Masuk untuk melihat paket dan menautkan pembelian ke akun Anda.','{price} / bulan','Diperpanjang setiap bulan hingga dibatalkan. Kelola atau batalkan kapan saja.','Langganan streaming dan judul berbayar dibeli secara terpisah dari penyedianya.','Lanjutkan dengan {price} / bulan','Lihat pilihan Pro','Pembelian Pro belum tersedia di sini.','Coba lagi','Tutup','Pro aktif','Tidak ada langganan Pro aktif','Akses hingga {date}','Kelola langganan','Batalkan langganan','Pulihkan pembelian Google Play','Memverifikasi pembelian Anda…','Pembayaran tertunda. Paket diperbarui setelah pembayaran dan verifikasi.','Verifikasi tertunda. Periksa kembali paket Anda sebentar lagi.','Pembelian dibatalkan. Hasil Anda tetap ada di sini.','Tidak ditemukan langganan Google Play yang memenuhi syarat untuk akun ini.','Pembelian Google Play saat ini tidak tersedia. Pilih “Perbarui paket” untuk mencoba lagi.','Lanjutkan ke pembayaran aman','Pilih penawaran Anda','{price} setiap {period}','{price} setiap {period} selama {count} pembayaran','{price} untuk {period}','Harga untuk {country}','Negara penagihan','Perbarui paket','Akun Anda berubah. Periksa kembali paket Anda.'],
    ja:['MatchApp Ai で One Match のおすすめが無制限に。','プランを確認中…','ログイン','ログインしてプランを確認し、購入をアカウントに紐付けます。','月額 {price}','解約するまで毎月自動更新されます。いつでも管理・解約できます。','配信サービスの契約や有料作品は、各提供元で別途購入します。','月額 {price} で続行','Pro のプランを見る','現在、ここでは Pro を購入できません。','再試行','閉じる','Pro は有効です','有効な Pro の定期購入はありません','利用期限：{date}','定期購入を管理','定期購入を解約','Google Play の購入を復元','購入を確認中…','お支払いは保留中です。支払いと確認の完了後にプランが更新されます。','確認待ちです。しばらくしてからプランを再確認してください。','購入をキャンセルしました。現在の結果はここに残っています。','このアカウントに対象の Google Play 定期購入は見つかりませんでした。','現在、Google Play での購入を利用できません。「プランを更新」を選んで、もう一度お試しください。','安全なお支払いに進む','オファーを選択','{period}ごとに{price}','{period}ごとに{price}、{count}回のお支払い','{period}で{price}','{country}の価格','請求先の国','プランを更新','アカウントが変更されました。プランを再確認してください。'],
    ko:['MatchApp Ai에서 One Match 추천을 무제한으로 이용하세요.','요금제 확인 중…','로그인','요금제를 확인하고 구매를 계정에 연결하려면 로그인하세요.','월 {price}','취소할 때까지 매월 갱신됩니다. 언제든 관리하거나 취소할 수 있어요.','스트리밍 구독과 유료 작품은 각 제공업체에서 별도로 구매해야 합니다.','월 {price}로 계속','Pro 옵션 보기','아직 여기서는 Pro를 구매할 수 없어요.','다시 시도','닫기','Pro가 활성화되어 있어요','활성 Pro 구독이 없어요','이용 기한: {date}','구독 관리','구독 취소','Google Play 구매 복원','구매 확인 중…','결제가 보류 중이에요. 결제와 확인이 완료되면 요금제가 업데이트됩니다.','확인이 진행 중이에요. 잠시 후 요금제를 다시 확인하세요.','구매가 취소되었어요. 현재 결과는 여기에 그대로 있어요.','이 계정에서 복원 가능한 Google Play 구독을 찾지 못했어요.','현재 Google Play 구매를 이용할 수 없어요. 다시 시도하려면 “요금제 새로고침”을 선택하세요.','안전한 결제로 이동','혜택 선택','{period}마다 {price}','{count}회 결제 동안 {period}마다 {price}','{period} 동안 {price}','{country}의 가격','청구 국가','요금제 새로고침','계정이 변경되었어요. 요금제를 다시 확인하세요.'],
    zh:['通过 MatchApp Ai 无限获取 One Match 推荐。','正在检查套餐…','登录','登录以查看套餐，并将购买关联到你的账户。','每月 {price}','每月自动续订，直至取消。可随时管理或取消。','流媒体订阅和付费作品需向各提供商单独购买。','以每月 {price} 继续','查看 Pro 选项','这里暂时无法购买 Pro。','重试','关闭','Pro 已生效','没有有效的 Pro 订阅','可使用至 {date}','管理订阅','取消订阅','恢复 Google Play 购买','正在验证购买…','付款待处理。付款和验证完成后，套餐将更新。','验证待处理。请稍后再次查看套餐。','购买已取消。当前推荐结果仍保留在这里。','未找到适用于此账户的 Google Play 订阅。','目前无法通过 Google Play 购买。请选择“刷新套餐”重试。','前往安全结账','选择优惠','每 {period} 支付 {price}','每 {period} 支付 {price}，共 {count} 次','{period} 共 {price}','{country}的价格','账单国家','刷新套餐','你的账户已更改。请重新查看套餐。']
  };
  const retentionKeys=['retentionTitle','retentionTerms','retain','continueCancel','back','retained','retentionUsed'];
  const retentionRows={
    en:['Keep Pro at 50% off?','50% off for 3 months, then the regular subscription price. You can still cancel any time.','Keep Pro at 50% off for 3 months','Continue to cancellation','Back to my plan','Your 50% discount for 3 months is confirmed.','This retention offer has already been used. Subscription management is still available.'],
    'pt-BR':['Manter o Pro com 50% de desconto?','50% de desconto por 3 meses; depois, o preço normal da assinatura. Você continua podendo cancelar a qualquer momento.','Manter o Pro com 50% de desconto por 3 meses','Continuar para o cancelamento','Voltar ao meu plano','Seu desconto de 50% por 3 meses foi confirmado.','Esta oferta de permanência já foi usada. O gerenciamento da assinatura continua disponível.'],
    es:['¿Conservar Pro con un 50% de descuento?','50% de descuento durante 3 meses; después, el precio habitual de la suscripción. Puedes cancelar cuando quieras.','Conservar Pro con un 50% de descuento durante 3 meses','Continuar con la cancelación','Volver a mi plan','Se ha confirmado tu descuento del 50% durante 3 meses.','Esta oferta de permanencia ya se ha utilizado. Puedes seguir gestionando tu suscripción.'],
    fr:['Garder Pro avec 50 % de réduction ?','50 % de réduction pendant 3 mois, puis le tarif habituel de l’abonnement. Vous pouvez toujours résilier à tout moment.','Garder Pro à −50 % pendant 3 mois','Continuer vers la résiliation','Revenir à mon abonnement','Votre réduction de 50 % pendant 3 mois est confirmée.','Cette offre de fidélisation a déjà été utilisée. Vous pouvez toujours gérer votre abonnement.'],
    de:['Pro mit 50 % Rabatt behalten?','3 Monate lang 50 % Rabatt, danach der reguläre Abopreis. Du kannst weiterhin jederzeit kündigen.','Pro 3 Monate lang mit 50 % Rabatt behalten','Mit der Kündigung fortfahren','Zurück zu meinem Abo','Dein Rabatt von 50 % für 3 Monate ist bestätigt.','Dieses Treueangebot wurde bereits genutzt. Du kannst dein Abo weiterhin verwalten.'],
    it:['Tenere Pro con il 50% di sconto?','50% di sconto per 3 mesi, poi il prezzo normale dell’abbonamento. Puoi sempre disdire quando vuoi.','Tieni Pro con il 50% di sconto per 3 mesi','Continua con la disdetta','Torna al mio piano','Il tuo sconto del 50% per 3 mesi è confermato.','Questa offerta di permanenza è già stata utilizzata. Puoi ancora gestire il tuo abbonamento.'],
    tr:['Pro’yu %50 indirimle tutmak ister misiniz?','3 ay boyunca %50 indirim, ardından normal abonelik fiyatı. İstediğiniz zaman iptal edebilirsiniz.','Pro’yu 3 ay %50 indirimle tut','İptale devam et','Planıma dön','3 aylık %50 indiriminiz doğrulandı.','Bu devam teklifi daha önce kullanıldı. Abonelik yönetimi hâlâ kullanılabilir.'],
    ru:['Оставить Pro со скидкой 50 %?','Скидка 50 % на 3 месяца, затем обычная цена подписки. Отменить по-прежнему можно в любое время.','Оставить Pro со скидкой 50 % на 3 месяца','Продолжить отмену','Вернуться к моей подписке','Ваша скидка 50 % на 3 месяца подтверждена.','Это предложение уже использовано. Управление подпиской по-прежнему доступно.'],
    ar:['هل تريد الاحتفاظ بـ Pro بخصم 50٪؟','خصم 50٪ لمدة 3 أشهر، ثم سعر الاشتراك المعتاد. يمكنك الإلغاء في أي وقت.','الاحتفاظ بـ Pro بخصم 50٪ لمدة 3 أشهر','المتابعة إلى الإلغاء','العودة إلى اشتراكي','تم تأكيد خصمك بنسبة 50٪ لمدة 3 أشهر.','سبق استخدام عرض الاستبقاء هذا. لا تزال إدارة الاشتراك متاحة.'],
    hi:['Pro को 50% छूट पर जारी रखें?','3 महीने तक 50% छूट, फिर सदस्यता की सामान्य कीमत। आप कभी भी रद्द कर सकते हैं।','Pro को 3 महीने 50% छूट पर जारी रखें','रद्द करने के लिए आगे बढ़ें','मेरे प्लान पर वापस जाएँ','3 महीने की आपकी 50% छूट की पुष्टि हो गई है।','यह सदस्यता जारी रखने का ऑफ़र पहले इस्तेमाल हो चुका है। सदस्यता प्रबंधन अभी भी उपलब्ध है।'],
    id:['Pertahankan Pro dengan diskon 50%?','Diskon 50% selama 3 bulan, lalu harga langganan normal. Anda tetap dapat membatalkan kapan saja.','Pertahankan Pro dengan diskon 50% selama 3 bulan','Lanjutkan pembatalan','Kembali ke paket saya','Diskon 50% Anda selama 3 bulan telah dikonfirmasi.','Penawaran retensi ini sudah digunakan. Pengelolaan langganan tetap tersedia.'],
    ja:['Pro を50%オフで続けますか？','3か月間50%オフ。その後は通常の定期購入料金になります。いつでも解約できます。','Pro を3か月間50%オフで続ける','解約手続きに進む','プランに戻る','3か月間の50%割引が確認されました。','この継続特典はすでに利用済みです。定期購入は引き続き管理できます。'],
    ko:['Pro를 50% 할인된 가격으로 유지할까요?','3개월 동안 50% 할인 후 정상 구독 요금이 적용됩니다. 언제든 취소할 수 있어요.','Pro를 3개월 동안 50% 할인으로 유지','취소 절차 계속','내 요금제로 돌아가기','3개월간 50% 할인이 확인되었어요.','이 유지 혜택은 이미 사용되었어요. 구독 관리는 계속 이용할 수 있어요.'],
    zh:['以五折保留 Pro？','享受3个月五折优惠，之后恢复正常订阅价格。仍可随时取消。','以五折保留 Pro 3个月','继续取消订阅','返回我的套餐','你的3个月五折优惠已确认。','此续订优惠已使用。仍可管理订阅。']
  };
  const requestFailures={en:'Could not complete this request. Please try again.','pt-BR':'Não foi possível concluir esta solicitação. Tente novamente.',es:'No se pudo completar esta solicitud. Vuelve a intentarlo.',fr:'Cette demande n’a pas pu aboutir. Réessayez.',de:'Diese Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut.',it:'Impossibile completare la richiesta. Riprova.',tr:'Bu istek tamamlanamadı. Lütfen tekrar deneyin.',ru:'Не удалось выполнить запрос. Попробуйте ещё раз.',ar:'تعذّر إكمال هذا الطلب. يرجى المحاولة مجددًا.',hi:'यह अनुरोध पूरा नहीं हो सका। कृपया फिर कोशिश करें।',id:'Permintaan ini tidak dapat diselesaikan. Silakan coba lagi.',ja:'この操作を完了できませんでした。もう一度お試しください。',ko:'요청을 완료하지 못했어요. 다시 시도해 주세요.',zh:'未能完成此请求，请重试。'};
  keys.push(...retentionKeys,'requestFailed');
  const cancelled={en:'Purchase canceled.','pt-BR':'Compra cancelada.',es:'Compra cancelada.',fr:'Achat annulé.',de:'Kauf abgebrochen.',it:'Acquisto annullato.',tr:'Satın alım iptal edildi.',ru:'Покупка отменена.',ar:'أُلغيت عملية الشراء.',hi:'खरीदारी रद्द हुई।',id:'Pembelian dibatalkan.',ja:'購入をキャンセルしました。',ko:'구매가 취소되었어요.',zh:'购买已取消。'};
  for(const lang of languages){rows[lang].push(...retentionRows[lang],requestFailures[lang]);rows[lang][keys.indexOf('cancelled')]=cancelled[lang];}
  const pricingKeys=['pricingTitle','pricingDescription','pricingHeading','freeTitle','freeDaily','freeReset','rewardOption','checkinOption','pricingExisting','legacyPlan','legacyWebNote','manageExisting'];
  const pricingRows={
    en:['MatchApp Ai Pricing | Free Matches & Pro','Compare 3 free daily Match Tokens with Pro for unlimited One Match recommendations. Optional Android rewards and daily check-in help you keep matching.','Free daily Matches and Pro','Free','3 free Match Tokens each day','Daily tokens reset automatically. Use them for One Match recommendations.','When available in the Android app, choose an optional rewarded video for 3 additional Match Tokens.','Sign in to use daily check-in and collect the reward shown in your account.','Existing paid benefits and earned or purchased balances stay with your account.','You already have a recurring MatchApp Ai plan. Manage it before starting Pro. Your existing benefits are unchanged.','Your existing subscription was purchased on the web. Manage it at matchapp.tv in your browser.','Manage my current plan'],
    'pt-BR':['Preços do MatchApp Ai | Matches grátis e Pro','Compare 3 Match Tokens grátis por dia com o Pro para recomendações ilimitadas no One Match. Recompensas opcionais no Android e check-in diário ajudam você a continuar.','Matches grátis todos os dias e Pro','Grátis','3 Match Tokens grátis por dia','Os tokens diários são renovados automaticamente. Use-os para recomendações no One Match.','Quando disponível no app Android, escolha um vídeo com recompensa opcional para receber mais 3 Match Tokens.','Entre para fazer o check-in diário e receber a recompensa exibida na sua conta.','Seus benefícios pagos e saldos ganhos ou comprados continuam na sua conta.','Você já tem um plano recorrente do MatchApp Ai. Gerencie-o antes de contratar o Pro. Seus benefícios atuais continuam iguais.','Sua assinatura atual foi comprada na web. Gerencie-a em matchapp.tv pelo navegador.','Gerenciar meu plano atual'],
    es:['Precios de MatchApp Ai | Matches gratis y Pro','Compara 3 Match Tokens gratis al día con Pro para recomendaciones ilimitadas de One Match. Sigue con recompensas opcionales en Android y registro diario.','Matches gratis cada día y Pro','Gratis','3 Match Tokens gratis al día','Los tokens diarios se renuevan automáticamente. Úsalos para recomendaciones de One Match.','Cuando esté disponible en la app de Android, elige un vídeo con recompensa opcional para recibir 3 Match Tokens adicionales.','Inicia sesión para hacer el registro diario y recibir la recompensa indicada en tu cuenta.','Tus beneficios de pago y saldos ganados o comprados siguen en tu cuenta.','Ya tienes un plan recurrente de MatchApp Ai. Gestiónalo antes de contratar Pro. Tus beneficios actuales no cambian.','Tu suscripción actual se compró en la web. Gestiónala en matchapp.tv desde el navegador.','Gestionar mi plan actual'],
    fr:['Tarifs MatchApp Ai | Matches gratuits et Pro','Comparez 3 Match Tokens gratuits par jour avec Pro et ses recommandations One Match illimitées. Récompenses Android facultatives et pointage quotidien disponibles.','Matches gratuits chaque jour et Pro','Gratuit','3 Match Tokens gratuits par jour','Les tokens quotidiens se renouvellent automatiquement. Utilisez-les pour les recommandations One Match.','Lorsque l’application Android le propose, choisissez une vidéo récompensée facultative pour obtenir 3 Match Tokens supplémentaires.','Connectez-vous pour effectuer le pointage quotidien et recevoir la récompense affichée dans votre compte.','Vos avantages payants et vos soldes gagnés ou achetés restent associés à votre compte.','Vous avez déjà un abonnement MatchApp Ai récurrent. Gérez-le avant de souscrire à Pro. Vos avantages actuels sont conservés.','Votre abonnement actuel a été acheté sur le web. Gérez-le sur matchapp.tv dans votre navigateur.','Gérer mon abonnement actuel'],
    de:['MatchApp Ai Preise | Kostenlose Matches und Pro','Vergleiche 3 kostenlose Match Tokens täglich mit unbegrenzten One Match Empfehlungen bei Pro. Dazu kommen optionale Android-Prämien und der tägliche Check-in.','Täglich kostenlose Matches und Pro','Kostenlos','3 kostenlose Match Tokens pro Tag','Die täglichen Tokens werden automatisch erneuert. Nutze sie für One Match Empfehlungen.','Wenn in der Android-App verfügbar, kannst du freiwillig ein Prämienvideo für 3 weitere Match Tokens ansehen.','Melde dich an, um den täglichen Check-in zu nutzen und die in deinem Konto angezeigte Prämie abzuholen.','Bestehende bezahlte Vorteile sowie verdiente oder gekaufte Guthaben bleiben deinem Konto erhalten.','Du hast bereits ein laufendes MatchApp Ai Abo. Verwalte es, bevor du Pro abschließt. Deine bisherigen Vorteile bleiben erhalten.','Dein bestehendes Abo wurde im Web gekauft. Verwalte es unter matchapp.tv in deinem Browser.','Mein bestehendes Abo verwalten'],
    it:['Prezzi MatchApp Ai | Matches gratis e Pro','Confronta 3 Match Tokens gratis al giorno con i consigli One Match illimitati di Pro. Premi Android facoltativi e accesso giornaliero ti aiutano a continuare.','Matches gratuiti ogni giorno e Pro','Gratis','3 Match Tokens gratis al giorno','I token giornalieri si rinnovano automaticamente. Usali per i consigli One Match.','Quando disponibile nell’app Android, scegli un video premio facoltativo per ottenere altri 3 Match Tokens.','Accedi per effettuare il check-in giornaliero e ricevere il premio indicato nel tuo account.','I vantaggi a pagamento e i saldi guadagnati o acquistati restano nel tuo account.','Hai già un piano ricorrente di MatchApp Ai. Gestiscilo prima di attivare Pro. I tuoi vantaggi attuali restano invariati.','Il tuo abbonamento attuale è stato acquistato sul web. Gestiscilo su matchapp.tv dal browser.','Gestisci il mio piano attuale'],
    tr:['MatchApp Ai Fiyatları | Ücretsiz Matches ve Pro','Günlük 3 ücretsiz Match Token ile Pro’nun sınırsız One Match önerilerini karşılaştırın. İsteğe bağlı Android ödülleri ve günlük girişle devam edin.','Her gün ücretsiz Matches ve Pro','Ücretsiz','Her gün 3 ücretsiz Match Token','Günlük tokenler otomatik yenilenir. One Match önerileri için kullanın.','Android uygulamasında sunulduğunda, 3 ek Match Token için isteğe bağlı ödüllü video izlemeyi seçin.','Günlük girişi kullanmak ve hesabınızda gösterilen ödülü almak için oturum açın.','Mevcut ücretli avantajlarınız ile kazandığınız veya satın aldığınız bakiyeler hesabınızda kalır.','Zaten yenilenen bir MatchApp Ai planınız var. Pro’yu başlatmadan önce mevcut planınızı yönetin. Avantajlarınız değişmez.','Mevcut aboneliğiniz web üzerinden satın alındı. Tarayıcınızda matchapp.tv adresinden yönetin.','Mevcut planımı yönet'],
    ru:['Цены MatchApp Ai | Бесплатные Matches и Pro','Сравните 3 бесплатных Match Token в день с безлимитными рекомендациями One Match в Pro. Есть добровольные награды Android и ежедневная отметка.','Бесплатные Matches каждый день и Pro','Бесплатно','3 бесплатных Match Token в день','Ежедневные токены обновляются автоматически. Используйте их для рекомендаций One Match.','Если доступно в приложении Android, по желанию посмотрите видео с наградой и получите ещё 3 Match Token.','Войдите, чтобы выполнить ежедневную отметку и получить награду, указанную в аккаунте.','Ваши оплаченные преимущества и заработанные или купленные остатки сохраняются в аккаунте.','У вас уже есть возобновляемая подписка MatchApp Ai. Управляйте ею перед оформлением Pro. Текущие преимущества сохраняются.','Текущая подписка куплена на сайте. Управляйте ею на matchapp.tv в браузере.','Управлять текущей подпиской'],
    ar:['أسعار MatchApp Ai | Matches مجانية وPro','قارن 3 رموز Match Token مجانية يوميًا بتوصيات One Match غير المحدودة مع Pro. تتوفر مكافآت Android اختيارية وتسجيل حضور يومي.','Matches مجانية يوميًا وPro','مجاني','3 رموز Match Token مجانية كل يوم','تتجدد الرموز اليومية تلقائيًا. استخدمها للحصول على توصيات One Match.','عند توفره في تطبيق Android، اختر مشاهدة فيديو اختياري بمكافأة للحصول على 3 رموز Match Token إضافية.','سجّل الدخول لتسجيل حضورك اليومي والحصول على المكافأة الموضحة في حسابك.','تبقى مزاياك المدفوعة وأرصدتك المكتسبة أو المشتراة محفوظة في حسابك.','لديك بالفعل اشتراك متجدد في MatchApp Ai. أدِره قبل الاشتراك في Pro. مزاياك الحالية لا تتغير.','تم شراء اشتراكك الحالي عبر الويب. أدِره على matchapp.tv من متصفحك.','إدارة اشتراكي الحالي'],
    hi:['MatchApp Ai कीमतें | मुफ़्त Matches और Pro','हर दिन 3 मुफ़्त Match Tokens की तुलना Pro की असीमित One Match सिफ़ारिशों से करें। वैकल्पिक Android पुरस्कार और दैनिक चेक-इन भी उपलब्ध हैं।','रोज़ मुफ़्त Matches और Pro','मुफ़्त','हर दिन 3 मुफ़्त Match Tokens','दैनिक टोकन अपने आप रीसेट होते हैं। इन्हें One Match सिफ़ारिशों के लिए इस्तेमाल करें।','Android ऐप में उपलब्ध होने पर, 3 अतिरिक्त Match Tokens के लिए वैकल्पिक पुरस्कार वाला वीडियो देखने का विकल्प चुनें।','दैनिक चेक-इन करने और खाते में दिखाया गया पुरस्कार पाने के लिए साइन इन करें।','आपके मौजूदा सशुल्क लाभ और कमाए या खरीदे गए शेष आपके खाते में बने रहते हैं।','आपके पास पहले से MatchApp Ai का आवर्ती प्लान है। Pro शुरू करने से पहले उसे प्रबंधित करें। आपके मौजूदा लाभ नहीं बदलेंगे।','आपकी मौजूदा सदस्यता वेब पर खरीदी गई थी। इसे ब्राउज़र में matchapp.tv पर प्रबंधित करें।','मेरा मौजूदा प्लान प्रबंधित करें'],
    id:['Harga MatchApp Ai | Matches Gratis dan Pro','Bandingkan 3 Match Token gratis per hari dengan rekomendasi One Match tanpa batas di Pro. Ada hadiah Android opsional dan check-in harian.','Matches gratis setiap hari dan Pro','Gratis','3 Match Token gratis setiap hari','Token harian diperbarui otomatis. Gunakan untuk rekomendasi One Match.','Jika tersedia di aplikasi Android, pilih video berhadiah opsional untuk mendapatkan 3 Match Token tambahan.','Masuk untuk melakukan check-in harian dan mengambil hadiah yang ditampilkan di akun Anda.','Manfaat berbayar serta saldo yang diperoleh atau dibeli tetap tersimpan di akun Anda.','Anda sudah memiliki paket MatchApp Ai berulang. Kelola paket itu sebelum memulai Pro. Manfaat Anda saat ini tetap berlaku.','Langganan Anda saat ini dibeli melalui web. Kelola di matchapp.tv melalui browser Anda.','Kelola paket saya saat ini'],
    ja:['MatchApp Ai 料金 | 無料 Matches と Pro','毎日3個の無料 Match Token と、One Match のおすすめが無制限になる Pro を比較。任意のAndroid報酬と毎日のチェックインも利用できます。','毎日の無料 Matches と Pro','無料','毎日3個の無料 Match Token','毎日のトークンは自動でリセットされます。One Match のおすすめに使えます。','Androidアプリで利用可能な場合、任意のリワード動画を選んで3個の追加 Match Token を獲得できます。','ログインして毎日のチェックインを行い、アカウントに表示される報酬を受け取れます。','既存の有料特典と、獲得・購入した残高はアカウントに残ります。','MatchApp Ai の継続プランをすでにご利用中です。Pro を開始する前に現在のプランを管理してください。既存の特典は変わりません。','現在の定期購入はウェブで購入されたものです。ブラウザーで matchapp.tv を開いて管理してください。','現在のプランを管理'],
    ko:['MatchApp Ai 요금 | 무료 Matches와 Pro','매일 무료 Match Token 3개와 Pro의 무제한 One Match 추천을 비교하세요. 선택형 Android 보상과 일일 체크인도 이용할 수 있어요.','매일 무료 Matches와 Pro','무료','매일 무료 Match Token 3개','일일 토큰은 자동으로 초기화돼요. One Match 추천에 사용하세요.','Android 앱에서 제공되는 경우, 선택형 보상 동영상을 보고 Match Token 3개를 추가로 받을 수 있어요.','로그인하여 일일 체크인을 하고 계정에 표시된 보상을 받으세요.','기존 유료 혜택과 획득하거나 구매한 잔액은 계정에 유지돼요.','이미 정기 결제되는 MatchApp Ai 요금제가 있어요. Pro를 시작하기 전에 현재 요금제를 관리하세요. 기존 혜택은 그대로 유지돼요.','현재 구독은 웹에서 구매했어요. 브라우저에서 matchapp.tv를 열어 관리하세요.','현재 요금제 관리'],
    zh:['MatchApp Ai 价格 | 免费 Matches 与 Pro','比较每天3枚免费 Match Token 与 Pro 的无限 One Match 推荐。还可使用 Android 可选奖励和每日签到。','每日免费 Matches 与 Pro','免费','每天3枚免费 Match Token','每日代币会自动重置，可用于获取 One Match 推荐。','在 Android 应用提供此功能时，可自行选择观看奖励视频，获得额外3枚 Match Token。','登录后进行每日签到，并领取账户中显示的奖励。','现有付费权益以及赚取或购买的余额仍保留在你的账户中。','你已有自动续订的 MatchApp Ai 套餐。请先管理现有套餐，再开通 Pro。现有权益保持不变。','你的现有订阅是在网页上购买的。请在浏览器中打开 matchapp.tv 进行管理。','管理我的现有套餐']
  };
  keys.push(...pricingKeys);for(const lang of languages)rows[lang].push(...pricingRows[lang]);
  const nativeRetentionKeys=['nativeRetentionTitle','nativeRetentionTerms','nativeRetentionDate','nativeRetentionConfirm','nativeRetentionUnavailable'];
  const nativeRetentionRows={
    en:['Review your Google Play options','If you accept, Google Play changes your current subscription at the date shown. It then renews at the displayed prices until canceled.','Offer starts on {date}, your next billing date.','Review this offer in Google Play','No eligible offer is available right now. You can continue to cancellation.'],
    'pt-BR':['Veja suas opções no Google Play','Se você aceitar, o Google Play alterará sua assinatura atual na data indicada. Depois, ela será renovada pelos preços exibidos até o cancelamento.','A oferta começa em {date}, sua próxima data de cobrança.','Revisar esta oferta no Google Play','Não há uma oferta elegível disponível agora. Você pode continuar para o cancelamento.'],
    es:['Revisa tus opciones de Google Play','Si aceptas, Google Play cambiará tu suscripción actual en la fecha indicada. Después se renovará a los precios mostrados hasta que la canceles.','La oferta empieza el {date}, tu próxima fecha de cobro.','Revisar esta oferta en Google Play','Ahora no hay ninguna oferta válida para tu cuenta. Puedes continuar con la cancelación.'],
    fr:['Consultez vos options Google Play','Si vous acceptez, Google Play modifie votre abonnement actuel à la date indiquée. Il se renouvelle ensuite aux tarifs affichés jusqu’à résiliation.','L’offre commence le {date}, à votre prochaine date de facturation.','Examiner cette offre dans Google Play','Aucune offre éligible n’est disponible pour le moment. Vous pouvez poursuivre la résiliation.'],
    de:['Prüfe deine Google Play Optionen','Wenn du zustimmst, ändert Google Play dein bestehendes Abo zum angezeigten Datum. Danach verlängert es sich zu den angezeigten Preisen, bis du kündigst.','Das Angebot beginnt am {date}, deinem nächsten Abrechnungstag.','Dieses Angebot bei Google Play prüfen','Derzeit ist kein passendes Angebot verfügbar. Du kannst mit der Kündigung fortfahren.'],
    it:['Esamina le tue opzioni Google Play','Se accetti, Google Play modifica il tuo abbonamento attuale alla data indicata. In seguito si rinnova ai prezzi mostrati fino alla disdetta.','L’offerta inizia il {date}, alla prossima data di addebito.','Esamina questa offerta su Google Play','Al momento non è disponibile un’offerta idonea. Puoi proseguire con la disdetta.'],
    tr:['Google Play seçeneklerinizi inceleyin','Kabul ederseniz Google Play mevcut aboneliğinizi gösterilen tarihte değiştirir. Ardından, iptal edene kadar gösterilen fiyatlarla yenilenir.','Teklif bir sonraki faturalandırma tarihiniz olan {date} tarihinde başlar.','Bu teklifi Google Play’de incele','Şu anda hesabınıza uygun bir teklif yok. İptal işlemine devam edebilirsiniz.'],
    ru:['Проверьте варианты в Google Play','Если вы согласитесь, Google Play изменит вашу текущую подписку в указанную дату. Затем она будет продлеваться по указанным ценам до отмены.','Предложение начнёт действовать {date}, в день следующего списания.','Посмотреть предложение в Google Play','Сейчас для вашего аккаунта нет подходящего предложения. Вы можете перейти к отмене подписки.'],
    ar:['راجع خياراتك في Google Play','إذا وافقت، فسيُغيّر Google Play اشتراكك الحالي في التاريخ الموضح. ثم يتجدد بالأسعار المعروضة حتى تلغيه.','يبدأ العرض في {date}، وهو موعد الفوترة التالي.','مراجعة هذا العرض في Google Play','لا يتوفر عرض مؤهل لحسابك الآن. يمكنك المتابعة إلى الإلغاء.'],
    hi:['अपने Google Play विकल्प देखें','स्वीकार करने पर Google Play दिखाई गई तारीख को आपकी मौजूदा सदस्यता बदलेगा। इसके बाद रद्द करने तक सदस्यता दिखाई गई कीमतों पर नवीनीकृत होगी।','ऑफ़र {date} को, आपकी अगली बिलिंग तारीख पर शुरू होगा।','इस ऑफ़र को Google Play में देखें','अभी आपके खाते के लिए कोई पात्र ऑफ़र उपलब्ध नहीं है। आप रद्द करने के लिए आगे बढ़ सकते हैं।'],
    id:['Tinjau pilihan Google Play Anda','Jika Anda menerima, Google Play akan mengubah langganan saat ini pada tanggal yang ditampilkan. Setelah itu, langganan diperpanjang dengan harga yang ditampilkan hingga dibatalkan.','Penawaran dimulai pada {date}, tanggal penagihan berikutnya.','Tinjau penawaran ini di Google Play','Saat ini tidak ada penawaran yang memenuhi syarat. Anda dapat melanjutkan pembatalan.'],
    ja:['Google Play の選択肢を確認','同意すると、Google Play が表示された日付に現在の定期購入を変更します。その後は、解約するまで表示料金で自動更新されます。','特典は次回請求日の {date} に開始します。','Google Play でこの特典を確認','現在、利用条件を満たす特典はありません。解約の手続きに進めます。'],
    ko:['Google Play 옵션 확인','동의하면 Google Play가 표시된 날짜에 현재 구독을 변경해요. 이후 취소할 때까지 표시된 가격으로 자동 갱신돼요.','혜택은 다음 결제일인 {date}에 시작돼요.','Google Play에서 이 혜택 확인','현재 이용 조건에 맞는 혜택이 없어요. 취소 절차를 계속할 수 있어요.'],
    zh:['查看你的 Google Play 选项','如果接受，Google Play 将在所示日期更改你当前的订阅。此后会按显示的价格自动续订，直到你取消。','优惠将在下次扣款日 {date} 开始。','在 Google Play 中查看此优惠','目前没有适用于你账户的优惠。你可以继续取消订阅。']
  };
  keys.push(...nativeRetentionKeys);for(const lang of languages)rows[lang].push(...nativeRetentionRows[lang]);
  const text = (lang,key,values={}) => String(rows[lang]?.[keys.indexOf(key)] || rows.en[keys.indexOf(key)] || '').replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));
  function locale(w) {
    let saved='';try { saved=w.localStorage.getItem('match_lang')||''; } catch (_) {}
    for (const value of [w.MATCH_LANG,saved,w.document.documentElement.lang]) {
      const normalized=String(value||'').toLowerCase();
      const found=languages.find(l=>l.toLowerCase()===normalized)||(normalized.startsWith('pt')?'pt-BR':languages.find(l=>l===normalized.split('-')[0]));
      if (found) return found;
    }
    return 'en';
  }
  function native(w) { return !!(w.MatchAppNativeBilling || w.MatchAppNative || w.MatchAppNativeAuth || w.Android || /MatchAppAiAndroid\/|;\s*wv\)/i.test(w.navigator.userAgent||'') || w.document.documentElement.classList.contains('matchapp-android')); }
  function adult(w) { return !/^\/kids(?:\/|$)/i.test(w.location.pathname) && !w.document.documentElement.classList.contains('kids-mode') && w.document.documentElement.dataset.matchappMode!=='kids'; }
  function country(w) {
    try {
      for(const key of ['match_user_region','match_user_country']){
        const value=w.localStorage.getItem(key)||'';
        if (/^[a-z]{2}$/i.test(value)) return value.toUpperCase();
        const resolved=w.MatchAppGeography?.resolveCountry?.(value)?.[1];
        if(/^[A-Z]{2}$/.test(resolved||''))return resolved;
      }
      return '';
    } catch (_) { return ''; }
  }
  function catalogOffer(data) {
    const o=data?.offer;
    if (data?.ok!==true || data.enabled!==true || !o || !/^price_[A-Za-z0-9]+$/.test(o.priceId||'') ||
        !/^[A-Za-z]{3}$/.test(o.currency||'') || !Number.isSafeInteger(o.amount) || o.amount<=0 || o.amount>1e12 ||
        !Number.isInteger(o.fractionDigits) || o.fractionDigits<0 || o.fractionDigits>3 ||
        o.interval!=='month' || o.intervalCount!==1 || !/^[A-Z]{2}$/.test(o.country||'')) return null;
    try { new Intl.NumberFormat('en',{style:'currency',currency:o.currency.toUpperCase()}).format(0); } catch (_) { return null; }
    return {...o,currency:o.currency.toUpperCase()};
  }
  function price(offer,lang) { return new Intl.NumberFormat(lang,{style:'currency',currency:offer.currency}).format(offer.amount/10**offer.fractionDigits); }
  function entitlement(data,now=Date.now()) { return data?.ok===true && data.entitled===true && ['stripe','play'].includes(data.provider) && Number.isFinite(data.expiresAt) && data.expiresAt>now; }
  function legacySubscription(data) { return data?.ok===true && data.hasLegacySubscription===true && data.canManage===true && data.provider==='stripe'; }
  function pricingCatalog(data,lang,enabled=false) {
    const url='https://matchapp.tv/pricing/pricing.html',catalog={'@context':'https://schema.org','@type':'OfferCatalog',name:'MatchApp Ai plans',url,itemListElement:[]};
    const offer=enabled===true?catalogOffer(data):null;
    if(!offer)return catalog;
    const amount=(offer.amount/10**offer.fractionDigits).toFixed(offer.fractionDigits);
    catalog.itemListElement.push({'@type':'Offer',name:'MatchApp Ai Pro',description:text(lang,'summary'),url,
      price:amount,priceCurrency:offer.currency,eligibleRegion:{'@type':'Country',name:offer.country},
      priceSpecification:{'@type':'UnitPriceSpecification',price:amount,priceCurrency:offer.currency,billingDuration:'P1M',billingIncrement:1,unitCode:'MON'},
      itemOffered:{'@type':'Service','@id':url+'#pro-one-match',name:'MatchApp Ai Pro',description:text(lang,'summary')}});
    return catalog;
  }
  function billingUrl(value,action) {
    try {
      const url=new URL(value);
      if (typeof value!=='string' || value.length>8192 || url.protocol!=='https:' || url.username || url.password || url.port) return '';
      if (action==='checkout') return url.hostname==='checkout.stripe.com' && /^\/c\/pay\//.test(url.pathname) ? url.href : '';
      if (url.hostname==='billing.stripe.com' && /^\/p\//.test(url.pathname)) return url.href;
      if (url.hostname==='play.google.com' && url.pathname==='/store/account/subscriptions' && !url.hash &&
          [...url.searchParams.keys()].every(key=>['package','sku','hl'].includes(key)) &&
          (!url.searchParams.has('package') || url.searchParams.get('package')==='com.jonas.papercup')) return url.href;
    } catch (_) {}
    return '';
  }
  function playOffers(value) {
    if (!Array.isArray(value) || value.length>20) return [];
    return value.filter(o=>o && /^[A-Za-z0-9_-]{1,160}$/.test(o.offerKey||'') && typeof o.basePlanId==='string' && o.basePlanId.length<=100 &&
      Array.isArray(o.pricingPhases) && o.pricingPhases.length>0 && o.pricingPhases.length<=8 &&
      o.pricingPhases.every(p=>typeof p.formattedPrice==='string' && p.formattedPrice.trim() && p.formattedPrice.length<=80 &&
        typeof p.priceAmountMicros==='number' && Number.isSafeInteger(p.priceAmountMicros) && p.priceAmountMicros>=0 && /^[A-Z]{3}$/.test(p.currencyCode||'') &&
        /^P[1-9]\d{0,2}[DWMY]$/.test(p.billingPeriod||'') && [1,2,3].includes(p.recurrenceMode) &&
        Number.isInteger(p.billingCycleCount) && p.billingCycleCount>=0 && p.billingCycleCount<=1000 && (p.recurrenceMode!==2 || p.billingCycleCount>0)) &&
      o.pricingPhases.at(-1).recurrenceMode===1 && o.pricingPhases.at(-1).billingPeriod==='P1M');
  }
  function phaseText(phase,lang) {
    const match=phase.billingPeriod.match(/^P(\d+)([DWMY])$/);
    if (!match) return '';
    const period=new Intl.NumberFormat(lang,{style:'unit',unit:{D:'day',W:'week',M:'month',Y:'year'}[match[2]],unitDisplay:'long'}).format(Number(match[1]));
    return text(lang,phase.recurrenceMode===1?'recurring':phase.recurrenceMode===2?'limited':'once',{price:phase.formattedPrice,period,count:new Intl.NumberFormat(lang).format(phase.billingCycleCount)});
  }
  function requestId(w) {
    if (w.crypto?.randomUUID) return w.crypto.randomUUID();
    if (!w.crypto?.getRandomValues) return '';
    const b=w.crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
    const h=Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }
  function trusted(w,event) { return event?.isTrusted===true && (!w.navigator.userActivation || w.navigator.userActivation.isActive===true); }
  function takeBillingReturn(w) {
    try {
      const url=new URL(w.location.href),modes=url.searchParams.getAll('pro_return'),receipts=url.searchParams.getAll('session_id');
      if(!modes.length)return null;
      const mode=modes.length===1&&['1','cancelled','managed'].includes(modes[0])?modes[0]:'';
      const sessionId=mode==='1'&&receipts.length===1&&/^cs_(?:live|test)_[A-Za-z0-9_]{1,220}$/.test(receipts[0])?receipts[0]:'';
      // This script runs synchronously before analytics. Remove even invalid or
      // duplicated receipt values; they never belong in page-view URLs.
      url.searchParams.delete('pro_return');url.searchParams.delete('session_id');
      w.history.replaceState(w.history.state,'',url.pathname+url.search+url.hash);
      return url.pathname==='/pricing/pricing.html'&&mode?{mode,sessionId}:null;
    } catch (_) { return null; }
  }
  function retentionEligible(state) {
    return entitlement(state)&&!legacySubscription(state)&&state.provider==='stripe'&&state.canManage===true&&state.retentionEligible===true&&
      state.retentionOffer?.percentOff===50&&state.retentionOffer?.months===3;
  }
  function playRetentionOffers(value) {
    return playOffers(value).filter(offer=>typeof offer.offerId==='string'&&/^[a-z0-9][a-z0-9-]{0,62}$/.test(offer.offerId)&&/^[a-z0-9][a-z0-9-]{0,62}$/.test(offer.basePlanId)&&
      offer.pricingPhases.length===2&&offer.pricingPhases[0].recurrenceMode===2&&
      offer.pricingPhases.every(phase=>phase.billingPeriod==='P1M'&&phase.currencyCode===offer.pricingPhases[0].currencyCode)&&
      offer.pricingPhases[0].priceAmountMicros>0&&offer.pricingPhases[0].priceAmountMicros<offer.pricingPhases[1].priceAmountMicros);
  }
  function boot(w) {
    if (!w?.document || !adult(w) || w.MatchAppPro) return null;
    const d=w.document,returned=takeBillingReturn(w);
    let view=null,returnFocus=null,epoch=0,accountId='',state=null,catalog=null,market=country(w),busy=false;
    let nativeRequest='',nativeOffers=[],nativePurpose='',quoteTime=0,quoteChargeAt=0,notice='loading',deadline=null;
    let receipt=native(w)?'':returned?.sessionId||'',receiptAccount='',returnMode=returned?.mode||'',returnTimer=null,returnChecks=0;
    let retentionPanel=false,retentionNotice='';
    const pricingViews=new Map();
    let pricingData=null,pricingLoading=false,pricingReadId=0,pricingReadKey='',pricingBaseService='',pricingBaseMeta=null;
    function node(tag,className,content) { const el=d.createElement(tag);if(className)el.className=className;if(content!==undefined)el.textContent=content;return el; }
    function stopReturnTimer(){if(returnTimer!==null){w.clearTimeout(returnTimer);returnTimer=null;}}
    function scheduleReturnCheck(){
      stopReturnTimer();if(!receipt||returnChecks>=4||!view||view.scrim.hidden)return;
      const delay=[2000,5000,10000,20000][returnChecks++];
      returnTimer=w.setTimeout(()=>{void refresh({prepare:false});},delay);
    }
    function stopDeadline() { if(deadline!==null){w.clearTimeout(deadline);deadline=null;} }
    function notifyStatus() { d.dispatchEvent(new w.CustomEvent('matchapp:prostatus',{detail:{entitled:entitlement(state),provider:state?.provider||null,expiresAt:state?.expiresAt||null}})); }
    async function bounded(promise) {
      let timer;
      try { return await Promise.race([promise,new Promise((_,reject)=>{timer=w.setTimeout(()=>reject(Error('billing_timeout')),12000);})]); }
      finally { w.clearTimeout(timer); }
    }
    async function session() {
      const sb=w.supabaseClient;
      if(!sb?.auth)return null;
      const result=await bounded(w.ensureCompactMatchSession?w.ensureCompactMatchSession():sb.auth.getSession());
      if(result.error)throw Error('session_unavailable');
      return result.data?.session||null;
    }
    async function invoke(action,values={}) {
      if(!w.supabaseClient?.functions?.invoke)throw Error('billing_unavailable');
      const response=await bounded(w.supabaseClient.functions.invoke('pro-billing',{body:{action,...values}}));
      if(response.error||response.data?.ok!==true)throw Error('billing_unavailable');
      return response.data;
    }
    function post(type,extra={}) {
      const bridge=w.MatchAppNativeBilling;
      if(typeof bridge?.postMessage!=='function'||!nativeRequest)return false;
      try { bridge.postMessage(JSON.stringify({type,requestId:nativeRequest,...extra}));return true; } catch (_) { return false; }
    }
    function clearNative() {
      stopDeadline();
      if(typeof w.MatchAppNativeBilling?.postMessage==='function') {
        const id=requestId(w);if(id)try{w.MatchAppNativeBilling.postMessage(JSON.stringify({type:'clear',requestId:id}));}catch(_){}
      }
      nativeRequest='';nativeOffers=[];nativePurpose='';quoteTime=0;quoteChargeAt=0;
    }
    function close() {
      if(!view)return;
      ++epoch;busy=false;clearNative();stopReturnTimer();retentionPanel=false;
      view.scrim.hidden=true;view.dialog.removeAttribute('open');
      if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
    }
    function button(label,fn,quiet=false) {
      const el=node('button','ma-pro-button no-depth'+(quiet?' ma-pro-button--quiet':''),label);el.type='button';
      el.addEventListener('click',event=>{if(trusted(w,event))fn(event);});return el;
    }
    function regionName(code) { try{return new Intl.DisplayNames([locale(w)],{type:'region'}).of(code)||code;}catch(_){return code;} }
    function pricingPage(){return ['/pricing','/pricing/','/pricing/pricing.html'].includes(w.location.pathname);}
    function pricingReady(){return pricingPage()&&w.MatchAppTokens?.enabled===true;}
    function writeSchema(id,data){let el=d.getElementById(id);if(!el){el=node('script');el.id=id;el.type='application/ld+json';d.head.append(el);}el.textContent=JSON.stringify(data).replace(/</g,'\\u003c');return el;}
    function syncPricingMetadata(){
      try{
        if(!pricingPage())return false;
        const enabled=pricingReady(),lang=locale(w),service=d.getElementById('matchapp-pricing-service');
        if(service&&!pricingBaseService)pricingBaseService=service.textContent;
        const selectors=['meta[name="description"]','meta[property="og:title"]','meta[property="og:description"]','meta[name="twitter:title"]','meta[name="twitter:description"]'];
        if(!enabled){
          writeSchema('matchapp-pricing-offers',pricingCatalog(null,lang,false));
          if(service&&pricingBaseService)service.textContent=pricingBaseService;
          if(pricingBaseMeta){d.title=pricingBaseMeta.title;for(const [selector,value] of pricingBaseMeta.values){const el=d.querySelector(selector);if(el)el.content=value;}pricingBaseMeta=null;}
          return false;
        }
        if(!pricingBaseMeta)pricingBaseMeta={title:d.title,values:selectors.map(selector=>[selector,d.querySelector(selector)?.content||''])};
        const title=text(lang,'pricingTitle'),description=text(lang,'pricingDescription');d.title=title;
        selectors.forEach(selector=>{const el=d.querySelector(selector);if(el)el.content=selector.includes('title')?title:description;});
        const schema=pricingCatalog(pricingData,lang,!native(w)&&[...pricingViews.keys()].some(host=>!host.hidden));
        writeSchema('matchapp-pricing-offers',schema);
        if(service){const value=JSON.parse(pricingBaseService||'{}');value.name='MatchApp Ai Pro';value['@id']='https://matchapp.tv/pricing/pricing.html#pro-one-match';value.description=text(lang,'summary')+' '+text(lang,'providers');service.textContent=JSON.stringify(value).replace(/</g,'\\u003c');}
        return true;
      }catch(_){return false;}
    }
    function drawPricing(){
      try{
        const lang=locale(w),t=(key,args)=>text(lang,key,args),offer=!native(w)?catalogOffer(pricingData):null;
        for(const [host,panel] of pricingViews){
          host.hidden=!pricingReady();host.lang=lang;host.dir=lang==='ar'?'rtl':'ltr';
          panel.heading.textContent=t('pricingHeading');panel.freeTitle.textContent=t('freeTitle');panel.freeDaily.textContent=t('freeDaily');panel.freeReset.textContent=t('freeReset');
          panel.reward.textContent=t('rewardOption');panel.checkin.textContent=t('checkinOption');panel.summary.textContent=t('summary');
          panel.price.textContent=offer?t('monthly',{price:price(offer,lang)}):t(native(w)?'options':pricingLoading?'loading':'unavailable');
          panel.market.textContent=offer?t('market',{country:regionName(offer.country)}):'';
          panel.terms.textContent=t('terms');panel.providers.textContent=t('providers');panel.existing.textContent=t('pricingExisting');panel.action.textContent=t('options');
        }
        syncPricingMetadata();
      }catch(_){}
    }
    async function loadPricingCatalog(){
      if(!pricingReady()||!pricingViews.size||native(w)){if(!pricingReady()){++pricingReadId;pricingReadKey='';pricingData=null;pricingLoading=false;}drawPricing();return;}
      const key=market+'|'+locale(w);if(pricingReadKey===key)return;pricingReadKey=key;
      const current=++pricingReadId;pricingLoading=true;pricingData=null;drawPricing();
      try{const data=await invoke('catalog',{country:market,lang:locale(w)});if(current!==pricingReadId||!pricingReady())return;pricingData=data;}
      catch(_){if(current!==pricingReadId)return;pricingData=null;}
      if(current===pricingReadId){pricingLoading=false;drawPricing();}
    }
    function mountPricing(host){
      host.classList.add('ma-pro-pricing');
      const heading=node('h1'),grid=node('div','ma-pro-pricing-grid'),free=node('article','ma-pro-pricing-card'),pro=node('article','ma-pro-pricing-card');
      const freeTitle=node('h2'),freeDaily=node('p','ma-pro-pricing-lead'),freeReset=node('p'),reward=node('p'),checkin=node('p');free.append(freeTitle,freeDaily,freeReset,reward,checkin);
      const proTitle=node('h2','','MatchApp Ai Pro'),summary=node('p'),quote=node('div','ma-pro-pricing-quote'),priceLine=node('p','ma-pro-pricing-price'),marketLine=node('p','ma-pro-pricing-market');
      quote.setAttribute('role','status');quote.setAttribute('aria-live','polite');quote.append(priceLine,marketLine);
      const terms=node('p','ma-pro-pricing-terms'),action=button('',event=>open(event)),providers=node('p','ma-pro-pricing-terms'),existing=node('p','ma-pro-pricing-existing');
      pro.append(proTitle,summary,quote,terms,action,providers);grid.append(free,pro);host.append(heading,grid,existing);
      pricingViews.set(host,{heading,freeTitle,freeDaily,freeReset,reward,checkin,summary,price:priceLine,market:marketLine,terms,action,providers,existing});
    }
    function draw(){try{drawView();}catch(_){}}
    function drawView() {
      if(!view)return;
      const lang=locale(w),t=(key,args)=>text(lang,key,args),live=view.state;
      view.dialog.lang=lang;view.dialog.dir=lang==='ar'?'rtl':'ltr';view.close.setAttribute('aria-label',t('close'));
      view.summary.textContent=t('summary');view.providers.textContent=t('providers');view.terms.textContent=t('terms');
      live.replaceChildren();view.actions.replaceChildren();view.escape.replaceChildren();view.offers.replaceChildren();view.country.replaceChildren();
      const active=entitlement(state),legacy=legacySubscription(state),currentOffer=catalogOffer(catalog);
      const webManaged=native(w)&&state?.ok===true&&state.provider==='stripe'&&state.canManage===true&&(active||legacy);
      const nativeRetention=retentionPanel&&native(w)&&active&&state.provider==='play'&&!legacy;
      view.dialog.classList.toggle('ma-pro-native-retention',nativeRetention);
      live.tabIndex=nativeRetention?0:-1;
      view.offers.classList.toggle('ma-pro-offers--native',native(w)&&((!active&&!legacy)||nativeRetention));
      live.append(node('p','',t(active?'active':legacy?'legacyPlan':notice)));
      if((active||legacy)&&(busy||notice==='requestFailed'))live.append(node('p','ma-pro-market',t(busy?'loading':'requestFailed')));
      if(webManaged)live.append(node('p','ma-pro-market',t('legacyWebNote')));
      if(active) {
        const date=new Intl.DateTimeFormat(lang,{dateStyle:'medium'}).format(new Date(state.expiresAt));
        live.append(node('p','ma-pro-market',t('expires',{date})));
      } else if(!legacy&&!native(w)&&currentOffer) {
        live.append(node('p','ma-pro-price',t('monthly',{price:price(currentOffer,lang)})));
        live.append(node('p','ma-pro-market',t('market',{country:regionName(currentOffer.country)})));
      }
      if(active&&retentionNotice)live.append(node('p','ma-pro-market',t(retentionNotice)));
      if(nativeRetention) {
        view.summary.textContent=t('nativeRetentionTitle');view.terms.textContent=t('nativeRetentionTerms');
        // The management escape precedes the fixed quote reservation, including
        // while eligibility is loading or unavailable. It never accepts an offer.
        view.escape.append(button(t('continueCancel'),()=>manage('cancel'),true));
        if(!busy&&nativeOffers.length&&nativePurpose==='retention'&&quoteChargeAt>Date.now()) {
          view.offers.append(node('legend','',t('choose')));
          const date=new Intl.DateTimeFormat(lang,{dateStyle:'medium'}).format(new Date(quoteChargeAt));
          view.offers.append(node('p','ma-pro-retention-date',t('nativeRetentionDate',{date})));
          drawNativeOffers(lang);
          view.actions.append(button(t('nativeRetentionConfirm'),event=>launch(event)));
        }else if(!busy)live.append(node('p','ma-pro-market',t(['pending','verificationPending','cancelled'].includes(notice)?notice:'nativeRetentionUnavailable')));
        if(!busy)view.actions.append(button(t('refresh'),()=>prepareRetention(),true));
        view.actions.append(button(t('back'),()=>leaveRetention(),true));
        return;
      }
      if(retentionPanel&&!native(w)&&retentionEligible(state)) {
        view.summary.textContent=t('retentionTitle');view.terms.textContent=t('retentionTerms');
        if(!busy)view.actions.append(button(t('retain'),()=>retain()));
        // Cancellation stays visible even while a retention request is being
        // checked; it remains an ordinary secure portal cancellation flow.
        view.actions.append(button(t('continueCancel'),()=>manage('cancel'),true));
        if(!busy)view.actions.append(button(t('back'),()=>{retentionPanel=false;draw();},true));
        return;
      }
      if(!busy&&accountId&&state?.canManage===true&&!webManaged) {
        view.actions.append(button(t(legacy?'manageExisting':'manage'),()=>manage('manage'),true));
        view.actions.append(button(t('cancel'),()=>cancelSubscription(),true));
      }
      if(!busy&&!accountId) {
        live.append(node('p','ma-pro-market',t('signInNote')));
        view.actions.append(button(t('signIn'),()=>{close();if(typeof w.openAuthModal==='function')w.openAuthModal();else w.location.assign('/?signIn=1&lang='+encodeURIComponent(lang));}));
      }
      if(!active&&!legacy&&!native(w)&&currentOffer&&!busy&&!receipt) {
        view.actions.append(button(t('subscribe',{price:price(currentOffer,lang)}),()=>checkout()));
        const countries=Array.isArray(catalog.availableCountries)?[...new Set(catalog.availableCountries.filter(c=>/^[A-Z]{2}$/.test(c)))]:[];
        if(countries.length>1) {
          const label=node('label','ma-pro-country'),select=node('select');label.append(node('span','',t('country')));
          for(const code of countries){const option=node('option','',regionName(code));option.value=code;option.selected=code===currentOffer.country;select.append(option);}
          select.addEventListener('change',()=>{market=select.value;void refresh();});label.append(select);view.country.append(label);
        }
      }
      if(native(w)&&!busy&&accountId&&!active&&!legacy&&nativeOffers.length) {
        const legend=node('legend','',t('choose'));view.offers.append(legend);
        drawNativeOffers(lang);
        view.actions.append(button(t('checkout'),event=>launch(event)));
      }
      if(native(w)&&!busy&&typeof w.MatchAppNativeBilling?.postMessage==='function') {
        if(accountId)view.actions.append(button(t('restore'),()=>restore(),true));
        // Management remains reachable for expired or unconfigured Play products.
        if(!legacy&&!webManaged&&state?.canManage!==true)view.actions.append(button(t('manage'),()=>manage('manage'),true));
      }
      if(!busy)view.actions.append(button(t('refresh'),()=>refresh(),true));
    }
    function drawNativeOffers(lang) {
      nativeOffers.forEach((offer,index)=>{
        const label=node('label','ma-pro-offer'),input=node('input'),list=node('ul');input.type='radio';input.name='ma-pro-play-offer';input.value=offer.offerKey;input.checked=index===0;
        for(const phase of offer.pricingPhases)list.append(node('li','',phaseText(phase,lang)));
        label.append(input,list);view.offers.append(label);
      });
    }
    function mount() {
      if(view)return;
      const scrim=node('div','ma-pro-scrim');scrim.hidden=true;
      const dialog=node('section','ma-pro-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','ma-pro-title');dialog.tabIndex=-1;
      const heading=node('div','ma-pro-heading'),title=node('h2','ma-pro-title','MatchApp Ai Pro');title.id='ma-pro-title';
      const dismiss=button('×',close,true);dismiss.classList.add('ma-pro-close');heading.append(title,dismiss);
      const summary=node('p','ma-pro-summary'),status=node('div','ma-pro-state');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
      const countryHost=node('div'),escape=node('div','ma-pro-management-escape'),offers=node('fieldset','ma-pro-offers'),terms=node('p','ma-pro-terms'),actions=node('div','ma-pro-actions'),providers=node('p','ma-pro-terms');
      dialog.append(heading,summary,status,countryHost,escape,offers,terms,actions,providers);scrim.append(dialog);d.body.append(scrim);
      view={scrim,dialog,close:dismiss,summary,state:status,country:countryHost,escape,offers,terms,actions,providers};
      scrim.addEventListener('click',event=>{if(event.target===scrim)close();});
      dialog.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();close();return;}
        if(event.key!=='Tab')return;
        const controls=[...dialog.querySelectorAll('button:not(:disabled),select,input')];
        if(event.shiftKey&&d.activeElement===controls[0]){event.preventDefault();controls.at(-1)?.focus();}
        else if(!event.shiftKey&&d.activeElement===controls.at(-1)){event.preventDefault();controls[0]?.focus();}
      });
    }
    async function refresh({prepare=true}={}) {
      const current=++epoch;stopReturnTimer();busy=true;notice='loading';nativeOffers=[];if(!native(w))catalog=null;draw();
      try {
        const auth=await session();if(current!==epoch)return null;
        const userId=auth?.user?.id||'';
        if(accountId&&accountId!==userId){clearNative();state=null;}
        accountId=userId;
        if(receiptAccount&&receiptAccount!==userId){receipt='';returnMode='';receiptAccount='';}
        if(auth){
          if(receipt)receiptAccount=userId;
          const result=await invoke('status',receipt?{sessionId:receipt}:{});if(current!==epoch)return null;state=result;
          if(entitlement(state)){receipt='';returnMode='';stopReturnTimer();}
        }else state=null;
        if(!native(w)) {const data=await invoke('catalog',{country:market,lang:locale(w)});if(current!==epoch)return null;catalog=data;
          if(pricingReady()){++pricingReadId;pricingReadKey=market+'|'+locale(w);pricingData=data;pricingLoading=false;drawPricing();}}
        if(current!==epoch)return null;
        notice=entitlement(state)?'active':receipt?'verificationPending':returnMode==='cancelled'?'cancelled':!native(w)&&catalogOffer(catalog)?'inactive':'unavailable';busy=false;notifyStatus();draw();
        if(native(w)&&auth&&!entitlement(state)&&!legacySubscription(state)&&prepare&&view&&!view.scrim.hidden)await prepareNative('prepare',auth,current);
        scheduleReturnCheck();return state;
      }catch(_){if(current===epoch){busy=false;notice=receipt?'verificationPending':'unavailable';state=null;draw();scheduleReturnCheck();}return null;}
    }
    async function prepareNative(type,auth,current=epoch) {
      nativeOffers=[];nativeRequest=requestId(w);nativePurpose=type==='prepare_retention'?'retention':type;quoteTime=0;quoteChargeAt=0;
      if(!nativeRequest||!post(type,{accessToken:auth.access_token})){notice='nativeUnavailable';busy=false;draw();return;}
      busy=true;notice=type==='restore'?'verifying':'loading';draw();stopDeadline();
      deadline=w.setTimeout(()=>{if(current===epoch){busy=false;nativeOffers=[];notice='nativeUnavailable';draw();}},20000);
    }
    async function restore() {
      const current=++epoch;busy=true;notice='verifying';draw();
      try {const auth=await session();if(current!==epoch)return;if(!auth||auth.user.id!==accountId)throw Error('account_changed');await prepareNative('restore',auth,current);}
      catch(_){if(current===epoch){busy=false;notice='accountChanged';draw();}}
    }
    function launch(event) {
      if(legacySubscription(state))return;
      if(!trusted(w,event)||busy||!nativeRequest||Date.now()-quoteTime>55000){notice='nativeUnavailable';nativeOffers=[];draw();return;}
      if(nativePurpose==='retention'&&(!retentionPanel||!entitlement(state)||state.provider!=='play'||quoteChargeAt<=Date.now())){nativeOffers=[];notice='nativeUnavailable';draw();return;}
      const offerKey=view.offers.querySelector('input:checked')?.value;
      if(!nativeOffers.some(o=>o.offerKey===offerKey))return;
      // Do not await before native's independent physical-gesture check.
      if(post('launch',{offerKey})){busy=true;notice='verifying';draw();}
    }
    async function checkout() {
      if(native(w)||busy||legacySubscription(state)||!catalogOffer(catalog))return;
      const current=++epoch;busy=true;notice='verifying';draw();
      try {
        const auth=await session();if(current!==epoch)return;
        if(!auth){busy=false;accountId='';notice='inactive';draw();return;}
        if(accountId&&auth.user.id!==accountId)throw Error('account_changed');
        const result=await invoke('checkout',{country:catalog.offer.country,lang:locale(w)});if(current!==epoch)return;
        const destination=billingUrl(result.url,'checkout');if(!destination)throw Error('invalid_checkout');
        w.location.assign(destination);
      }catch(_){
        if(current!==epoch)return;
        // A recurring plan can become active after the price was displayed.
        // Re-read authenticated status after a rejected checkout; the error
        // payload itself never grants a benefit or authorizes management.
        try{const auth=await session();if(current!==epoch)return;
          if(!auth||auth.user.id!==accountId){state=null;notice='accountChanged';busy=false;draw();return;}
          const result=await invoke('status');if(current!==epoch)return;state=result;}catch(_){}
        if(current===epoch){busy=false;notice='requestFailed';draw();}
      }
    }
    function cancelSubscription(){
      if(!native(w)&&retentionEligible(state)){retentionPanel=true;retentionNotice='';draw();return;}
      if(native(w)&&entitlement(state)&&state.provider==='play'&&state.canManage===true&&!legacySubscription(state)&&typeof w.MatchAppNativeBilling?.postMessage==='function') {
        retentionPanel=true;retentionNotice='';void prepareRetention();return;
      }
      void manage('cancel');
    }
    async function prepareRetention() {
      if(!native(w)||!retentionPanel||busy||!entitlement(state)||state.provider!=='play'||state.canManage!==true||legacySubscription(state))return;
      const current=++epoch;clearNative();busy=true;notice='loading';draw();
      try {
        const auth=await session();if(current!==epoch)return;
        if(!auth||auth.user.id!==accountId)throw Error('account_changed');
        await prepareNative('prepare_retention',auth,current);
      }catch(_){if(current===epoch){busy=false;nativeOffers=[];notice='nativeUnavailable';draw();}}
    }
    function leaveRetention() {
      ++epoch;clearNative();retentionPanel=false;busy=false;notice=entitlement(state)?'active':'inactive';draw();
    }
    async function retain(){
      if(native(w)||busy||!retentionPanel||!retentionEligible(state))return;
      const current=++epoch;busy=true;notice='verifying';draw();
      try{
        const auth=await session();if(current!==epoch)return;if(!auth||auth.user.id!==accountId)throw Error('account_changed');
        const result=await invoke('retain');if(current!==epoch)return;
        if(result.applied===true&&result.percentOff===50&&result.months===3)retentionNotice='retained';
        else if(result.applied===false&&result.alreadyApplied===true)retentionNotice='retentionUsed';
        else throw Error('retention_unconfirmed');
        retentionPanel=false;await refresh({prepare:false});
      }catch(_){if(current===epoch){busy=false;notice='requestFailed';draw();}}
    }
    async function manage(intent) {
      if(native(w)){
        if(legacySubscription(state)||(entitlement(state)&&state.provider==='stripe')){notice='legacyPlan';draw();return;}
        ++epoch;clearNative();retentionPanel=false;busy=false;
        nativeRequest=requestId(w);
        if(!post('manage')){notice='nativeUnavailable';draw();}
        else draw();
        return;
      }
      if((busy&&!retentionPanel)||!state?.canManage)return;
      const current=++epoch;busy=true;notice='loading';draw();
      try {
        const auth=await session();if(current!==epoch)return;if(!auth||auth.user.id!==accountId)throw Error('account_changed');
        const result=await invoke('manage',{intent,lang:locale(w)});if(current!==epoch)return;
        const destination=billingUrl(result.url,'manage');if(!destination)throw Error('invalid_management');
        w.location.assign(destination);
      }catch(_){if(current===epoch){busy=false;notice='requestFailed';draw();}}
    }
    function open(event) {
      if(event&&!trusted(w,event))return false;
      mount();retentionPanel=false;returnFocus=d.activeElement;view.scrim.hidden=false;view.dialog.setAttribute('open','');draw();view.close.focus({preventScroll:true});void refresh();return true;
    }
    async function billingEvent(event) {
      const detail=event.detail;
      if(!detail||typeof detail!=='object')return;
      if(detail.requestId==='native-resume'&&detail.status==='restore_required') {
        if(accountId)void restore();return;
      }
      if(!nativeRequest||detail.requestId!==nativeRequest)return;
      if(detail.status==='ready') {
        stopDeadline();
        if(Array.isArray(detail.offers)) {
          if(nativePurpose==='retention') {
            const date=detail.chargeAt;
            nativeOffers=detail.purpose==='retention'&&Number.isSafeInteger(date)&&date>Date.now()&&date<=Date.now()+366*86400000?playRetentionOffers(detail.offers):[];
            quoteChargeAt=nativeOffers.length?date:0;
          }else nativeOffers=detail.purpose==='retention'?[]:playOffers(detail.offers);
          quoteTime=Date.now();
        }
        else if(detail.reason!=='user_gesture_required'||Date.now()-quoteTime>55000)nativeOffers=[];
        busy=false;notice=nativeOffers.length?'inactive':'nativeUnavailable';draw();return;
      }
      if(['verified','already_entitled'].includes(detail.status)&&detail.serverVerified===true) {stopDeadline();nativeOffers=[];retentionPanel=false;await refresh({prepare:false});return;}
      if(['loading','launching','verifying'].includes(detail.status)){busy=true;notice='verifying';draw();return;}
      stopDeadline();
      busy=false;nativeOffers=[];
      notice={pending:'pending',verification_pending:'verificationPending',restored_none:'restoreNone',cancelled:'cancelled',unavailable:'nativeUnavailable',management_opened:'inactive'}[detail.status]||'verificationPending';draw();
    }
    function authChanged() {++epoch;accountId='';state=null;catalog=null;busy=false;retentionPanel=false;retentionNotice='';clearNative();stopReturnTimer();notice='accountChanged';notifyStatus();draw();if(view&&!view.scrim.hidden)w.setTimeout(()=>{void refresh();},0);}
    function initialize() {
      for(const host of d.querySelectorAll('[data-matchapp-pro-entry]')) {
        if(host.dataset.proReady==='1')continue;host.dataset.proReady='1';host.classList.add('ma-pro-entry');
        if(host.hasAttribute('data-pro-pricing')&&pricingPage()){mountPricing(host);continue;}
        host.append(node(host.dataset.proHeading==='h1'?'h1':'h2','','MatchApp Ai Pro'),node('p','ma-pro-entry-copy'),button('',event=>open(event)));
      }
      translateEntries();
      if(returned&&!native(w))open();
    }
    function translateEntries(){for(const host of d.querySelectorAll('[data-matchapp-pro-entry][data-pro-ready="1"]')){if(pricingViews.has(host))continue;host.hidden=w.MatchAppTokens?.enabled!==true;host.querySelector('.ma-pro-entry-copy').textContent=text(locale(w),'summary');host.querySelector('button').textContent=text(locale(w),'options');}drawPricing();void loadPricingCatalog();draw();}
    d.addEventListener('matchapp:authchange',authChanged);
    d.addEventListener('matchapp:tokenpolicy',translateEntries);
    d.addEventListener('matchapp:langchange',translateEntries);d.addEventListener('matchapp:languagechange',translateEntries);
    w.addEventListener('matchapp:billing',event=>{void billingEvent(event);});
    w.addEventListener('pageshow',()=>{if(view&&!view.scrim.hidden)void refresh({prepare:false});});
    d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='visible'&&view&&!view.scrim.hidden)void refresh({prepare:false});});
    const api=Object.freeze({open,close,refresh,syncPricingMetadata,isEntitled:()=>entitlement(state),native:()=>native(w)});w.MatchAppPro=api;
    if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
    return api;
  }
  return Object.freeze({languages,keys,rows,text,locale,native,adult,country,catalogOffer,pricingCatalog,price,entitlement,legacySubscription,billingUrl,playOffers,playRetentionOffers,phaseText,requestId,trusted,takeBillingReturn,retentionEligible,boot});
});
