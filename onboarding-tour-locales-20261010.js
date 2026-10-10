/* MatchApp Ai guided tour: complete, authored UI explanations for every supported locale.
   Never machine-translate targets or copy the text of an unrelated hidden card. */
(function(){
'use strict';
const keys=['pick','mood','format','platform','more','book','bookFormat','ai','latest','kids','profile'];
function make(controls,rows){
 if(controls.length!==5||rows.length!==keys.length||rows.some(pair=>pair.length!==2||!pair[0]||!pair[1]))throw Error('Incomplete guided tour locale');
 const t=Object.fromEntries(keys.map((key,i)=>[key,Object.freeze(rows[i])]));
 Object.assign(t,{tap:controls[0],next:controls[1],back:controls[2],finish:controls[3],skip:controls[4],counter:(a,b)=>a+' / '+b});
 return Object.freeze(t);
}
const locales={
en:make(['This control','Next','Back','Done','Close'],[
 ['Find your next match','Open this section to build a personalized entertainment match.'],
 ['Choose a mood','Set the feeling you want. You can change it before searching.'],
 ['Choose a format','Select a movie, series or another available entertainment format.'],
 ['Select streaming services','Choose the services you use, or leave the selection open to search more.'],
 ['Optional filters','Open More Filters to refine genre, era and other preferences.'],
 ['Meet Bookworms','Open this separate reading section for e-books, audiobooks and magazines.'],
 ['Choose a reading format','Select E-book, Audiobook or Magazine, then explore legitimate sources.'],
 ['Talk with Jonas','Tap Jonas to speak or type. He can recommend entertainment and help you find where it is available.'],
 ['Explore trending titles','Browse this live row of posters, then select a title for details and viewing options.'],
 ['Explore Kids Mode','Open the separate, age-reviewed Kids experience on the website.'],
 ['Your account','Sign in or open your profile to manage preferences and saved activity.']
]),
'pt-BR':make(['Este controle','Próximo','Voltar','Concluir','Fechar'],[
 ['Encontre seu próximo match','Abra esta seção para montar uma sugestão de entretenimento personalizada.'],
 ['Escolha seu clima','Defina como você quer se sentir. É possível mudar antes de buscar.'],
 ['Escolha o formato','Selecione filme, série ou outro formato de entretenimento disponível.'],
 ['Escolha as plataformas','Marque os serviços que você usa ou deixe a busca aberta para mais opções.'],
 ['Filtros opcionais','Abra Mais Filtros para ajustar gênero, época e outras preferências.'],
 ['Conheça o Bookworms','Abra esta área separada para e-books, audiolivros e revistas.'],
 ['Escolha como ler ou ouvir','Selecione E-book, Audiolivro ou Revista e explore fontes legítimas.'],
 ['Converse com Jonas','Toque em Jonas para falar ou digitar. Ele ajuda a escolher títulos e descobrir onde estão disponíveis.'],
 ['Explore os títulos em alta','Navegue pelos pôsteres e selecione um título para ver detalhes e onde assistir.'],
 ['Explore o Modo Kids','Abra a experiência infantil separada, com conteúdo revisado por idade, no site.'],
 ['Sua conta','Entre ou abra seu perfil para gerenciar preferências e atividades salvas.']
]),
es:make(['Este control','Siguiente','Atrás','Listo','Cerrar'],[
 ['Encuentra tu próxima elección','Abre esta sección para crear una recomendación de entretenimiento personalizada.'],
 ['Elige tu estado de ánimo','Indica cómo quieres sentirte; puedes cambiarlo antes de buscar.'],
 ['Elige un formato','Selecciona película, serie u otro formato disponible.'],
 ['Elige plataformas','Marca los servicios que usas o deja la búsqueda abierta.'],
 ['Filtros opcionales','Abre Más filtros para ajustar género, época y otras preferencias.'],
 ['Conoce Bookworms','Abre esta sección separada de libros electrónicos, audiolibros y revistas.'],
 ['Elige qué leer o escuchar','Selecciona libro electrónico, audiolibro o revista para explorar fuentes legítimas.'],
 ['Habla con Jonas','Toca Jonas para hablar o escribir y descubrir títulos y dónde encontrarlos.'],
 ['Explora las tendencias','Recorre los carteles y elige un título para ver detalles y dónde verlo.'],
 ['Explora el Modo Infantil','Abre en el sitio la experiencia infantil independiente con contenido revisado por edades.'],
 ['Tu cuenta','Inicia sesión o abre tu perfil para gestionar preferencias y actividad guardada.']
]),
fr:make(['Ce contrôle','Suivant','Retour','Terminer','Fermer'],[
 ['Trouvez votre prochaine découverte','Ouvrez cette section pour obtenir une recommandation personnalisée.'],
 ['Choisissez votre humeur','Indiquez votre envie du moment; vous pouvez la modifier avant la recherche.'],
 ['Choisissez un format','Sélectionnez un film, une série ou un autre format disponible.'],
 ['Choisissez les plateformes','Sélectionnez vos services ou laissez la recherche ouverte à davantage d’options.'],
 ['Filtres facultatifs','Ouvrez Plus de filtres pour préciser le genre, l’époque et vos préférences.'],
 ['Découvrez Bookworms','Ouvrez cet espace distinct pour livres numériques, livres audio et magazines.'],
 ['Choisissez votre lecture','Choisissez livre numérique, livre audio ou magazine et consultez les sources officielles.'],
 ['Discutez avec Jonas','Touchez Jonas pour parler ou écrire et découvrir des titres et leur disponibilité.'],
 ['Explorez les tendances','Parcourez les affiches et sélectionnez un titre pour les détails et les plateformes.'],
 ['Explorez le mode Enfants','Ouvrez sur le site l’espace enfants séparé, avec des contenus adaptés à l’âge.'],
 ['Votre compte','Connectez-vous ou ouvrez votre profil pour gérer vos goûts et votre activité enregistrée.']
]),
de:make(['Dieses Element','Weiter','Zurück','Fertig','Schließen'],[
 ['Finde dein nächstes Match','Öffne diesen Bereich für eine persönliche Unterhaltungsempfehlung.'],
 ['Wähle deine Stimmung','Bestimme, wie du dich fühlen möchtest. Vor der Suche kannst du das ändern.'],
 ['Wähle ein Format','Entscheide dich für Film, Serie oder ein anderes verfügbares Format.'],
 ['Wähle Streamingdienste','Wähle deine Dienste oder lasse die Suche für weitere Angebote offen.'],
 ['Optionale Filter','Öffne Weitere Filter für Genre, Zeitraum und andere Vorlieben.'],
 ['Entdecke Bookworms','Dieser separate Bereich bietet E-Books, Hörbücher und Magazine.'],
 ['Wähle das Leseformat','Wähle E-Book, Hörbuch oder Magazin und finde offizielle Quellen.'],
 ['Sprich mit Jonas','Tippe auf Jonas, um zu sprechen oder zu schreiben und Titel sowie Anbieter zu finden.'],
 ['Entdecke Trends','Sieh dir die Poster an und öffne einen Titel für Details und Streamingoptionen.'],
 ['Entdecke den Kindermodus','Öffne auf der Website den separaten altersgerechten Kinderbereich.'],
 ['Dein Konto','Melde dich an oder öffne dein Profil für Vorlieben und gespeicherte Aktivitäten.']
]),
it:make(['Questo controllo','Avanti','Indietro','Fine','Chiudi'],[
 ['Trova il prossimo titolo','Apri questa sezione per consigli di intrattenimento personalizzati.'],
 ['Scegli il tuo umore','Indica come vuoi sentirti; puoi cambiarlo prima della ricerca.'],
 ['Scegli il formato','Seleziona film, serie o un altro formato disponibile.'],
 ['Scegli le piattaforme','Indica i servizi che usi o lascia la ricerca aperta ad altre opzioni.'],
 ['Filtri facoltativi','Apri Altri filtri per definire genere, epoca e preferenze.'],
 ['Scopri Bookworms','Apri questa sezione separata per e-book, audiolibri e riviste.'],
 ['Scegli cosa leggere','Seleziona e-book, audiolibro o rivista e consulta fonti legittime.'],
 ['Parla con Jonas','Tocca Jonas per parlare o scrivere, scoprire titoli e dove trovarli.'],
 ['Scopri le tendenze','Sfoglia le locandine e apri un titolo per dettagli e piattaforme.'],
 ['Scopri la modalità Bambini','Apri sul sito la sezione separata con contenuti verificati per età.'],
 ['Il tuo account','Accedi o apri il profilo per gestire preferenze e attività salvate.']
]),
tr:make(['Bu kontrol','İleri','Geri','Bitti','Kapat'],[
 ['Sıradaki eşleşmeni bul','Kişiselleştirilmiş eğlence önerisi için bu bölümü aç.'],
 ['Ruh halini seç','Nasıl hissetmek istediğini belirt; aramadan önce değiştirebilirsin.'],
 ['Biçim seç','Film, dizi veya kullanılabilir başka bir biçim seç.'],
 ['Platformları seç','Kullandığın servisleri seç veya daha fazla seçenek için açık bırak.'],
 ['İsteğe bağlı filtreler','Tür, dönem ve tercihleri ayarlamak için Daha fazla filtreyi aç.'],
 ['Bookworms ile tanış','E-kitap, sesli kitap ve dergiler için ayrı okuma bölümünü aç.'],
 ['Okuma biçimini seç','E-kitap, sesli kitap veya dergi seçip resmi kaynaklara göz at.'],
 ['Jonas ile konuş','Konuşmak veya yazmak, içerik ve izleme kaynağı bulmak için Jonas’a dokun.'],
 ['Trendleri keşfet','Afişlere göz at; ayrıntılar ve izleme seçenekleri için bir başlık seç.'],
 ['Çocuk Modunu keşfet','Web sitesindeki yaşa uygun ayrı çocuk deneyimini aç.'],
 ['Hesabın','Giriş yap veya tercihlerini ve kayıtlı etkinlikleri yönetmek için profilini aç.']
]),
ru:make(['Этот элемент','Далее','Назад','Готово','Закрыть'],[
 ['Найдите следующий вариант','Откройте раздел для персональной рекомендации развлечений.'],
 ['Выберите настроение','Укажите желаемое настроение; его можно изменить до поиска.'],
 ['Выберите формат','Выберите фильм, сериал или другой доступный формат.'],
 ['Выберите платформы','Укажите свои сервисы или оставьте поиск открытым для других вариантов.'],
 ['Дополнительные фильтры','Откройте фильтры, чтобы уточнить жанр, эпоху и предпочтения.'],
 ['Познакомьтесь с Bookworms','Отдельный раздел электронных книг, аудиокниг и журналов.'],
 ['Выберите формат чтения','Выберите электронную книгу, аудиокнигу или журнал и официальные источники.'],
 ['Поговорите с Йонасом','Нажмите на Йонаса, чтобы говорить или писать, искать названия и сервисы.'],
 ['Исследуйте тренды','Листайте постеры и выбирайте названия для подробностей и просмотра.'],
 ['Детский режим','На сайте есть отдельный раздел с материалами по возрасту.'],
 ['Ваш аккаунт','Войдите или откройте профиль для настройки предпочтений и сохранений.']
]),
ar:make(['هذا العنصر','التالي','السابق','تم','إغلاق'],[
 ['اعثر على اختيارك التالي','افتح هذا القسم للحصول على اقتراح ترفيهي يناسب ذوقك.'],
 ['اختر حالتك المزاجية','حدد الشعور الذي تريده، ويمكنك تغييره قبل البحث.'],
 ['اختر نوع المحتوى','اختر فيلماً أو مسلسلاً أو نوعاً آخر متاحاً.'],
 ['اختر منصات المشاهدة','حدد خدماتك أو اترك البحث مفتوحاً لمزيد من الخيارات.'],
 ['عوامل تصفية اختيارية','افتح المزيد من الفلاتر لتحديد النوع والفترة والتفضيلات.'],
 ['تعرّف على Bookworms','افتح قسماً منفصلاً للكتب الإلكترونية والصوتية والمجلات.'],
 ['اختر طريقة القراءة','اختر كتاباً إلكترونياً أو صوتياً أو مجلة واستكشف المصادر الرسمية.'],
 ['تحدث مع جوناس','اضغط على جوناس للتحدث أو الكتابة والعثور على العناوين وأماكن توفرها.'],
 ['استكشف الأعمال الرائجة','تصفح الملصقات واختر عنواناً لعرض التفاصيل وخيارات المشاهدة.'],
 ['استكشف وضع الأطفال','افتح قسم الأطفال المنفصل المناسب للأعمار على الموقع.'],
 ['حسابك','سجل الدخول أو افتح ملفك الشخصي لإدارة التفضيلات والنشاط المحفوظ.']
]),
hi:make(['यह नियंत्रण','आगे','पीछे','पूरा','बंद करें'],[
 ['अपना अगला मनोरंजन चुनें','अपनी पसंद के अनुसार सुझाव पाने के लिए यह भाग खोलें।'],
 ['अपना मूड चुनें','बताएँ आप कैसा महसूस करना चाहते हैं; खोज से पहले इसे बदल सकते हैं।'],
 ['फ़ॉर्मैट चुनें','फ़िल्म, सीरीज़ या दूसरा उपलब्ध मनोरंजन फ़ॉर्मैट चुनें।'],
 ['स्ट्रीमिंग सेवा चुनें','अपनी सेवाएँ चुनें या अधिक विकल्पों के लिए खोज खुली रखें।'],
 ['वैकल्पिक फ़िल्टर','शैली, समय और अन्य पसंद के लिए अधिक फ़िल्टर खोलें।'],
 ['Bookworms से मिलें','ई-बुक, ऑडियोबुक और पत्रिकाओं के अलग भाग को खोलें।'],
 ['पढ़ने का फ़ॉर्मैट चुनें','ई-बुक, ऑडियोबुक या पत्रिका चुनकर अधिकृत स्रोत देखें।'],
 ['Jonas से बात करें','बोलने या लिखने और शीर्षक व उपलब्ध सेवाएँ जानने के लिए Jonas को छुएँ।'],
 ['लोकप्रिय शीर्षक देखें','पोस्टर ब्राउज़ करें और विवरण व देखने के विकल्पों के लिए शीर्षक चुनें।'],
 ['किड्स मोड देखें','वेबसाइट पर आयु के अनुसार अलग बच्चों का भाग खोलें।'],
 ['आपका खाता','पसंद और सहेजी गतिविधि सँभालने के लिए लॉग इन करें या प्रोफ़ाइल खोलें।']
]),
id:make(['Kontrol ini','Lanjut','Kembali','Selesai','Tutup'],[
 ['Temukan tontonan berikutnya','Buka bagian ini untuk rekomendasi hiburan sesuai seleramu.'],
 ['Pilih suasana hati','Tentukan suasana yang diinginkan; kamu bisa mengubahnya sebelum mencari.'],
 ['Pilih format','Pilih film, serial, atau format hiburan lain yang tersedia.'],
 ['Pilih platform','Tandai layanan yang digunakan atau biarkan pencarian mencakup layanan lain.'],
 ['Filter tambahan','Buka Filter lainnya untuk genre, era, dan preferensi lain.'],
 ['Kenali Bookworms','Buka bagian terpisah untuk e-book, buku audio, dan majalah.'],
 ['Pilih format bacaan','Pilih e-book, buku audio, atau majalah dan jelajahi sumber resmi.'],
 ['Bicara dengan Jonas','Ketuk Jonas untuk bicara atau mengetik serta menemukan judul dan tempat menontonnya.'],
 ['Jelajahi yang tren','Geser poster dan pilih judul untuk detail serta pilihan layanan.'],
 ['Jelajahi Mode Anak','Buka pengalaman anak terpisah yang sesuai usia di situs web.'],
 ['Akunmu','Masuk atau buka profil untuk mengatur preferensi dan aktivitas tersimpan.']
]),
ja:make(['この項目','次へ','戻る','完了','閉じる'],[
 ['次に観る作品を探す','ここを開いて好みに合わせたエンタメのおすすめを探しましょう。'],
 ['気分を選ぶ','今の気分を選びます。検索前ならいつでも変更できます。'],
 ['作品形式を選ぶ','映画、シリーズなど利用可能な形式を選びます。'],
 ['配信サービスを選ぶ','利用中のサービスを指定するか、幅広く検索できます。'],
 ['詳細フィルター','ジャンルや年代などを絞り込むには追加フィルターを開きます。'],
 ['Bookwormsを使う','電子書籍、オーディオブック、雑誌専用のセクションです。'],
 ['読書形式を選ぶ','電子書籍、オーディオブック、雑誌から選び、公式の提供元を確認します。'],
 ['Jonasと話す','Jonasをタップして音声や文字で相談し、作品や配信先を探せます。'],
 ['話題の作品を見る','ポスターを閲覧し、作品を選んで詳細や視聴方法を確認します。'],
 ['キッズモード','ウェブサイトから年齢に合った独立したキッズ体験を開きます。'],
 ['アカウント','ログインまたはプロフィールを開き、好みや保存した履歴を管理します。']
]),
ko:make(['이 항목','다음','이전','완료','닫기'],[
 ['다음 볼거리 찾기','이 영역을 열어 취향에 맞는 엔터테인먼트 추천을 받으세요.'],
 ['기분 선택','원하는 분위기를 선택하세요. 검색 전에는 언제든 바꿀 수 있습니다.'],
 ['형식 선택','영화, 시리즈 또는 다른 이용 가능한 형식을 선택하세요.'],
 ['스트리밍 서비스 선택','이용 중인 서비스를 고르거나 더 넓게 검색하세요.'],
 ['추가 필터','장르, 시대 등 취향을 설정하려면 추가 필터를 여세요.'],
 ['Bookworms 알아보기','전자책, 오디오북, 잡지를 위한 별도 영역을 여세요.'],
 ['읽기 형식 선택','전자책, 오디오북 또는 잡지를 선택하고 공식 출처를 확인하세요.'],
 ['Jonas와 대화','Jonas를 눌러 말하거나 입력하고 작품과 시청 가능한 서비스를 찾아보세요.'],
 ['인기 작품 탐색','포스터를 살펴보고 제목을 선택해 상세 정보와 시청 옵션을 확인하세요.'],
 ['키즈 모드 탐색','웹사이트에서 연령에 맞춘 별도의 어린이 영역을 여세요.'],
 ['내 계정','로그인하거나 프로필을 열어 취향과 저장한 활동을 관리하세요.']
]),
zh:make(['此控件','下一步','返回','完成','关闭'],[
 ['寻找下一部好作品','打开这里，获取符合你喜好的娱乐推荐。'],
 ['选择心情','选择你想要的氛围；搜索前可以随时更改。'],
 ['选择内容类型','选择电影、剧集或其他可用类型。'],
 ['选择流媒体平台','选择你使用的服务，也可以扩大搜索范围。'],
 ['可选筛选条件','展开更多筛选，设置类型、年代及其他偏好。'],
 ['认识 Bookworms','打开独立的电子书、有声书和杂志专区。'],
 ['选择阅读形式','选择电子书、有声书或杂志，查看正规来源。'],
 ['与 Jonas 交谈','点击 Jonas，通过语音或文字寻找作品和观看平台。'],
 ['探索热门内容','浏览海报并选择作品，查看详情与播放渠道。'],
 ['探索儿童模式','在网站上打开独立的适龄儿童体验。'],
 ['你的账户','登录或打开个人资料，管理偏好和收藏记录。']
])
};
window.MatchAppGuideLocales=Object.freeze(locales);
})();
