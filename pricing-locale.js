/* Presentation-only labels for the dynamic purchase hub. */
(function(){
 'use strict';
 const labels={
  en:[
   'In-App Purchases',
   'Adult and Kids allowances are separate. Each experience uses its own daily pool first, then its own top-up balances.',
   'Purchase type','★ Extra Matches','✦ Ask AI Credits',
   'Buy More Matches',
   'For adult Matches only. Extra Matches do not expire and never consume Ask AI credits or Kids balances.',
   'Extra Matches','Buy Matches','Buy Ask AI Credits',
   '1 credit = 1 Ask AI prompt. Credits are for Ask AI only and never buy Matches. These are adult Ask AI credits and never affect Kids balances.',
   'Ask AI Credits','Buy Credits','Most popular','Best value',
   '🌟 Kids Credits','MatchApp Kids Credits',
   'Parent-purchased Kids top-ups stay inside Kids Mode and never reduce or increase adult Match or Ask AI balances.',
   'Kids Match Credits','Used only after the separate Kids daily allowance is finished.','Kids Matches',
   'Kids Ask AI Credits','Used only for Kids Ask AI after the separate Kids daily allowance is finished.','Kids Ask AI','Buy for Kids'
  ],
  'pt-BR':[
   'Compras no app',
   'As cotas para adultos e Kids são separadas. Cada experiência usa primeiro sua própria cota diária e depois seus próprios saldos extras.',
   'Tipo de compra','★ Matches extras','✦ Créditos de IA',
   'Comprar mais Matches',
   'Somente para Matches de adultos. Matches extras não expiram e nunca usam créditos do Pergunte à IA nem saldos Kids.',
   'Matches extras','Comprar Matches','Comprar créditos de IA',
   '1 crédito = 1 pergunta à IA. Esses créditos são somente para o Pergunte à IA e não compram Matches. São créditos para adultos e nunca afetam os saldos Kids.',
   'Créditos de IA','Comprar créditos','Mais popular','Melhor custo-benefício',
   '🌟 Créditos Kids','Créditos do MatchApp Kids',
   'As recargas Kids compradas pelos responsáveis ficam no Modo Kids e nunca reduzem nem aumentam os saldos de Matches ou do Pergunte à IA para adultos.',
   'Créditos de Matches Kids','Usados somente após o fim da cota diária separada do Kids.','Matches Kids',
   'Créditos do Pergunte à IA Kids','Usados somente no Pergunte à IA Kids, após o fim da cota diária separada do Kids.','Pergunte à IA Kids','Comprar para Kids'
  ],
  es:[
   'Compras en la app',
   'Los cupos de adultos y Kids son independientes. Cada experiencia usa primero su propio cupo diario y después sus propios saldos adicionales.',
   'Tipo de compra','★ Matches adicionales','✦ Créditos de Pregunta a la IA',
   'Comprar más Matches',
   'Solo para Matches de adultos. Los Matches adicionales no caducan y nunca consumen créditos de Pregunta a la IA ni saldos de Kids.',
   'Matches adicionales','Comprar Matches','Comprar créditos de Pregunta a la IA',
   '1 crédito = 1 pregunta a la IA. Estos créditos solo sirven para Pregunta a la IA y nunca compran Matches. Son créditos para adultos y nunca afectan a los saldos de Kids.',
   'Créditos de Pregunta a la IA','Comprar créditos','Más popular','Mejor valor',
   '🌟 Créditos Kids','Créditos de MatchApp Kids',
   'Las recargas Kids compradas por madres, padres o tutores permanecen en el modo Kids y nunca reducen ni aumentan los saldos de Matches o Pregunta a la IA para adultos.',
   'Créditos de Matches Kids','Solo se usan cuando se agota el cupo diario independiente de Kids.','Matches Kids',
   'Créditos de Pregunta a la IA Kids','Solo se usan en Pregunta a la IA Kids cuando se agota el cupo diario independiente de Kids.','Pregunta a la IA Kids','Comprar para Kids'
  ],
  fr:[
   'Achats dans l’application',
   'Les quotas adultes et Kids sont distincts. Chaque expérience utilise d’abord son propre quota quotidien, puis ses propres soldes supplémentaires.',
   'Type d’achat','★ Matches supplémentaires','✦ Crédits Demander à l’IA',
   'Acheter plus de Matches',
   'Pour les Matches adultes uniquement. Les Matches supplémentaires n’expirent pas et ne consomment jamais de crédits Demander à l’IA ni de soldes Kids.',
   'Matches supplémentaires','Acheter des Matches','Acheter des crédits Demander à l’IA',
   '1 crédit = 1 question à l’IA. Ces crédits servent uniquement à Demander à l’IA et n’achètent jamais de Matches. Ce sont des crédits adultes, sans effet sur les soldes Kids.',
   'Crédits Demander à l’IA','Acheter des crédits','Le plus populaire','Le plus avantageux',
   '🌟 Crédits Kids','Crédits MatchApp Kids',
   'Les recharges Kids achetées par les parents restent dans le mode Kids et ne réduisent ni n’augmentent jamais les soldes adultes de Matches ou de Demander à l’IA.',
   'Crédits de Matches Kids','Utilisés uniquement après épuisement du quota quotidien distinct de Kids.','Matches Kids',
   'Crédits Demander à l’IA Kids','Utilisés uniquement pour Demander à l’IA Kids, après épuisement du quota quotidien distinct de Kids.','Demander à l’IA Kids','Acheter pour Kids'
  ],
  de:[
   'In-App-Käufe',
   'Die Kontingente für Erwachsene und Kids sind getrennt. Jeder Bereich nutzt zuerst sein eigenes Tageskontingent und danach sein eigenes Zusatzguthaben.',
   'Kaufart','★ Zusätzliche Matches','✦ KI-fragen-Guthaben',
   'Mehr Matches kaufen',
   'Nur für Matches für Erwachsene. Zusätzliche Matches verfallen nicht und verbrauchen weder KI-fragen-Guthaben noch Kids-Guthaben.',
   'Zusätzliche Matches','Matches kaufen','KI-fragen-Guthaben kaufen',
   '1 Guthabeneinheit = 1 KI-Frage. Dieses Guthaben gilt nur für KI fragen und kauft keine Matches. Es gehört zum Erwachsenenbereich und beeinflusst kein Kids-Guthaben.',
   'KI-fragen-Guthaben','Guthaben kaufen','Am beliebtesten','Bester Gegenwert',
   '🌟 Kids-Guthaben','MatchApp Kids Guthaben',
   'Von Eltern gekaufte Kids-Aufladungen bleiben im Kids-Modus und verringern oder erhöhen niemals das Match- oder KI-fragen-Guthaben für Erwachsene.',
   'Kids-Match-Guthaben','Wird erst nach Verbrauch des getrennten Kids-Tageskontingents genutzt.','Kids-Matches',
   'Kids-KI-fragen-Guthaben','Wird nur für KI fragen in Kids genutzt, nachdem das getrennte Kids-Tageskontingent verbraucht ist.','KI fragen in Kids','Für Kids kaufen'
  ],
  it:[
   'Acquisti nell’app',
   'Le quote per adulti e Kids sono separate. Ogni esperienza usa prima la propria quota giornaliera e poi i propri saldi aggiuntivi.',
   'Tipo di acquisto','★ Matches aggiuntivi','✦ Crediti Chiedi all’IA',
   'Acquista altri Matches',
   'Solo per i Matches degli adulti. I Matches aggiuntivi non scadono e non consumano mai crediti Chiedi all’IA o saldi Kids.',
   'Matches aggiuntivi','Acquista Matches','Acquista crediti Chiedi all’IA',
   '1 credito = 1 domanda all’IA. Questi crediti sono solo per Chiedi all’IA e non acquistano mai Matches. Sono crediti per adulti e non influiscono mai sui saldi Kids.',
   'Crediti Chiedi all’IA','Acquista crediti','Più popolare','Più conveniente',
   '🌟 Crediti Kids','Crediti MatchApp Kids',
   'Le ricariche Kids acquistate dai genitori restano nella modalità Kids e non riducono né aumentano mai i saldi di Matches o Chiedi all’IA per adulti.',
   'Crediti Matches Kids','Usati solo dopo l’esaurimento della quota giornaliera separata di Kids.','Matches Kids',
   'Crediti Chiedi all’IA Kids','Usati solo per Chiedi all’IA Kids dopo l’esaurimento della quota giornaliera separata di Kids.','Chiedi all’IA Kids','Acquista per Kids'
  ],
  tr:[
   'Uygulama içi satın alımlar',
   'Yetişkin ve Kids hakları ayrıdır. Her deneyim önce kendi günlük hakkını, ardından kendi ek bakiyelerini kullanır.',
   'Satın alma türü','★ Ek eşleşmeler','✦ Yapay zekâya sor kredileri',
   'Daha fazla eşleşme al',
   'Yalnızca yetişkin eşleşmeleri içindir. Ek eşleşmelerin süresi dolmaz; Yapay zekâya sor kredilerini veya Kids bakiyelerini asla kullanmaz.',
   'Ek eşleşmeler','Eşleşme satın al','Yapay zekâya sor kredileri al',
   '1 kredi = 1 yapay zekâ sorusu. Krediler yalnızca Yapay zekâya sor içindir ve eşleşme satın almaz. Bunlar yetişkin kredileridir ve Kids bakiyelerini asla etkilemez.',
   'Yapay zekâya sor kredileri','Kredi satın al','En popüler','En avantajlı',
   '🌟 Kids kredileri','MatchApp Kids kredileri',
   'Ebeveynlerin satın aldığı Kids ek bakiyeleri Kids Modu içinde kalır; yetişkin eşleşme veya Yapay zekâya sor bakiyelerini asla azaltmaz ya da artırmaz.',
   'Kids eşleşme kredileri','Yalnızca ayrı Kids günlük hakkı tükendikten sonra kullanılır.','Kids eşleşmeleri',
   'Kids Yapay zekâya sor kredileri','Ayrı Kids günlük hakkı tükendikten sonra yalnızca Kids Yapay zekâya sor için kullanılır.','Kids Yapay zekâya sor','Kids için satın al'
  ],
  ru:[
   'Покупки в приложении',
   'Лимиты для взрослых и Kids раздельные. Каждый раздел сначала использует свой дневной лимит, а затем собственные дополнительные балансы.',
   'Тип покупки','★ Дополнительные подборы','✦ Кредиты «Спросить ИИ»',
   'Купить больше подборов',
   'Только для подборов для взрослых. Дополнительные подборы не сгорают и никогда не расходуют кредиты «Спросить ИИ» или балансы Kids.',
   'Дополнительные подборы','Купить подборы','Купить кредиты «Спросить ИИ»',
   '1 кредит = 1 вопрос ИИ. Кредиты предназначены только для «Спросить ИИ» и не покупают подборы. Это кредиты для взрослых, которые никогда не влияют на балансы Kids.',
   'Кредиты «Спросить ИИ»','Купить кредиты','Самый популярный','Самый выгодный',
   '🌟 Кредиты Kids','Кредиты MatchApp Kids',
   'Пополнения Kids, купленные родителями, остаются в режиме Kids и никогда не уменьшают и не увеличивают взрослые балансы подборов или «Спросить ИИ».',
   'Кредиты подборов Kids','Используются только после исчерпания отдельного дневного лимита Kids.','Подборы Kids',
   'Кредиты «Спросить ИИ» Kids','Используются только для «Спросить ИИ» Kids после исчерпания отдельного дневного лимита Kids.','«Спросить ИИ» Kids','Купить для Kids'
  ],
  ar:[
   'المشتريات داخل التطبيق',
   'حصص البالغين وKids منفصلة. تستخدم كل تجربة حصتها اليومية أولًا، ثم أرصدتها الإضافية الخاصة.',
   'نوع الشراء','★ مطابقات إضافية','✦ أرصدة اسأل الذكاء الاصطناعي',
   'شراء المزيد من المطابقات',
   'لمطابقات البالغين فقط. لا تنتهي صلاحية المطابقات الإضافية، ولا تستهلك أبدًا أرصدة اسأل الذكاء الاصطناعي أو أرصدة Kids.',
   'مطابقات إضافية','شراء مطابقات','شراء أرصدة اسأل الذكاء الاصطناعي',
   'رصيد واحد = سؤال واحد للذكاء الاصطناعي. تُستخدم هذه الأرصدة فقط في اسأل الذكاء الاصطناعي ولا تشتري مطابقات. هي أرصدة للبالغين ولا تؤثر أبدًا في أرصدة Kids.',
   'أرصدة اسأل الذكاء الاصطناعي','شراء أرصدة','الأكثر شيوعًا','أفضل قيمة',
   '🌟 أرصدة Kids','أرصدة MatchApp Kids',
   'تبقى أرصدة Kids الإضافية التي يشتريها الوالدان داخل وضع Kids، ولا تقلل أو تزيد أبدًا أرصدة المطابقات أو اسأل الذكاء الاصطناعي للبالغين.',
   'أرصدة مطابقات Kids','تُستخدم فقط بعد نفاد الحصة اليومية المنفصلة لـKids.','مطابقات Kids',
   'أرصدة اسأل الذكاء الاصطناعي Kids','تُستخدم فقط في اسأل الذكاء الاصطناعي Kids بعد نفاد الحصة اليومية المنفصلة لـKids.','اسأل الذكاء الاصطناعي Kids','الشراء لـKids'
  ],
  hi:[
   'ऐप में खरीदारी',
   'वयस्कों और Kids की सीमाएँ अलग हैं। हर अनुभव पहले अपनी दैनिक सीमा और फिर अपना अतिरिक्त बैलेंस इस्तेमाल करता है।',
   'खरीद का प्रकार','★ अतिरिक्त मैच','✦ AI से पूछें क्रेडिट',
   'और मैच खरीदें',
   'केवल वयस्कों के मैच के लिए। अतिरिक्त मैच की समय सीमा नहीं होती और वे कभी AI से पूछें क्रेडिट या Kids बैलेंस इस्तेमाल नहीं करते।',
   'अतिरिक्त मैच','मैच खरीदें','AI से पूछें क्रेडिट खरीदें',
   '1 क्रेडिट = AI से 1 सवाल। ये क्रेडिट केवल AI से पूछें के लिए हैं और मैच नहीं खरीदते। ये वयस्कों के क्रेडिट हैं और Kids बैलेंस को कभी प्रभावित नहीं करते।',
   'AI से पूछें क्रेडिट','क्रेडिट खरीदें','सबसे लोकप्रिय','सबसे किफ़ायती',
   '🌟 Kids क्रेडिट','MatchApp Kids क्रेडिट',
   'अभिभावकों के खरीदे Kids टॉप-अप केवल Kids मोड में रहते हैं और वयस्कों के मैच या AI से पूछें बैलेंस को कभी घटाते या बढ़ाते नहीं हैं।',
   'Kids मैच क्रेडिट','अलग Kids दैनिक सीमा खत्म होने के बाद ही इस्तेमाल होते हैं।','Kids मैच',
   'Kids AI से पूछें क्रेडिट','अलग Kids दैनिक सीमा खत्म होने के बाद केवल Kids AI से पूछें के लिए इस्तेमाल होते हैं।','Kids AI से पूछें','Kids के लिए खरीदें'
  ],
  id:[
   'Pembelian dalam aplikasi',
   'Kuota dewasa dan Kids terpisah. Setiap pengalaman memakai kuota hariannya sendiri terlebih dahulu, lalu saldo tambahannya sendiri.',
   'Jenis pembelian','★ Match tambahan','✦ Kredit Tanya AI',
   'Beli lebih banyak Match',
   'Hanya untuk Match dewasa. Match tambahan tidak kedaluwarsa dan tidak pernah memakai kredit Tanya AI atau saldo Kids.',
   'Match tambahan','Beli Match','Beli kredit Tanya AI',
   '1 kredit = 1 pertanyaan Tanya AI. Kredit hanya untuk Tanya AI dan tidak membeli Match. Ini adalah kredit dewasa dan tidak pernah memengaruhi saldo Kids.',
   'Kredit Tanya AI','Beli kredit','Paling populer','Paling hemat',
   '🌟 Kredit Kids','Kredit MatchApp Kids',
   'Isi ulang Kids yang dibeli orang tua tetap berada di Mode Kids dan tidak pernah mengurangi atau menambah saldo Match atau Tanya AI dewasa.',
   'Kredit Match Kids','Hanya dipakai setelah kuota harian Kids yang terpisah habis.','Match Kids',
   'Kredit Tanya AI Kids','Hanya dipakai untuk Tanya AI Kids setelah kuota harian Kids yang terpisah habis.','Tanya AI Kids','Beli untuk Kids'
  ],
  ja:[
   'アプリ内購入',
   '大人向けとKidsの利用枠は別々です。それぞれの日次利用枠を先に使い、その後で専用の追加残高を使います。',
   '購入の種類','★ 追加マッチ','✦ AIに質問クレジット',
   'マッチを追加購入',
   '大人向けのマッチ専用です。追加マッチに有効期限はなく、AIに質問のクレジットやKidsの残高を消費することもありません。',
   '追加マッチ','マッチを購入','AIに質問クレジットを購入',
   '1クレジット = AIへの質問1回。クレジットはAIに質問専用で、マッチの購入には使えません。大人向けのクレジットのため、Kidsの残高には影響しません。',
   'AIに質問クレジット','クレジットを購入','人気の商品','最もお得',
   '🌟 Kidsクレジット','MatchApp Kidsクレジット',
   '保護者が購入したKidsの追加残高はKidsモード専用です。大人向けのマッチやAIに質問の残高を増減させることはありません。',
   'Kidsマッチクレジット','Kids専用の日次利用枠を使い切った後にのみ使われます。','Kidsマッチ',
   'Kids AIに質問クレジット','Kids専用の日次利用枠を使い切った後、KidsのAIに質問にのみ使われます。','Kids AIに質問','Kids用に購入'
  ],
  ko:[
   '앱 내 구매',
   '성인과 Kids의 이용 한도는 별개입니다. 각 서비스는 자체 일일 한도를 먼저 사용한 뒤 자체 추가 잔액을 사용합니다.',
   '구매 유형','★ 추가 매치','✦ AI에게 질문 크레딧',
   '매치 추가 구매',
   '성인용 매치에만 사용할 수 있습니다. 추가 매치는 만료되지 않으며 AI에게 질문 크레딧이나 Kids 잔액을 사용하지 않습니다.',
   '추가 매치','매치 구매','AI에게 질문 크레딧 구매',
   '1크레딧 = AI 질문 1회. 크레딧은 AI에게 질문 전용이며 매치를 구매할 수 없습니다. 성인용 크레딧이므로 Kids 잔액에 영향을 주지 않습니다.',
   'AI에게 질문 크레딧','크레딧 구매','가장 인기 있음','가장 경제적',
   '🌟 Kids 크레딧','MatchApp Kids 크레딧',
   '보호자가 구매한 Kids 충전 잔액은 Kids 모드에만 적용되며 성인용 매치나 AI에게 질문 잔액을 줄이거나 늘리지 않습니다.',
   'Kids 매치 크레딧','별도의 Kids 일일 한도를 모두 사용한 후에만 사용됩니다.','Kids 매치',
   'Kids AI에게 질문 크레딧','별도의 Kids 일일 한도를 모두 사용한 후 Kids AI에게 질문에만 사용됩니다.','Kids AI에게 질문','Kids용 구매'
  ],
  zh:[
   '应用内购买',
   '成人与Kids的额度相互独立。每个体验先使用各自的每日额度，再使用各自的充值余额。',
   '购买类型','★ 额外匹配','✦ 向AI提问积分',
   '购买更多匹配次数',
   '仅用于成人匹配。额外匹配次数不会过期，也不会消耗向AI提问积分或Kids余额。',
   '额外匹配','购买匹配次数','购买向AI提问积分',
   '1积分 = 1次AI提问。积分仅用于向AI提问，不能购买匹配次数。这些是成人积分，不会影响Kids余额。',
   '向AI提问积分','购买积分','最受欢迎','最划算',
   '🌟 Kids积分','MatchApp Kids积分',
   '家长购买的Kids充值余额仅用于Kids模式，不会减少或增加成人匹配或向AI提问的余额。',
   'Kids匹配积分','仅在Kids独立的每日额度用完后使用。','Kids匹配',
   'Kids向AI提问积分','仅在Kids独立的每日额度用完后，用于Kids向AI提问。','Kids向AI提问','为Kids购买'
  ]
 };
 function render(){
  const hub=document.getElementById('purchase-hub');if(!hub)return;
  const raw=String(window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase();
  const lang=/^pt(?:-|$)/.test(raw)?'pt-BR':raw.split('-')[0];
  const text=labels[lang]||labels.en;
  const set=(selector,value)=>hub.querySelectorAll(selector).forEach(el=>{el.textContent=value});
  const action=(selector,value)=>hub.querySelectorAll(selector).forEach(el=>{
   if(el.disabled||el.getAttribute('aria-disabled')==='true'||el.getAttribute('aria-busy')==='true'||el.dataset.adFreeOwned==='true'||el.dataset.androidPurchaseUnavailable==='true')return;
   el.textContent=value;
  });
  set('#purchase-hub-title',text[0]);set('#purchase-hub-title + p',text[1]);
  hub.querySelector('.purchase-tabs')?.setAttribute('aria-label',text[2]);
  set('#purchase-tab-matches',text[3]);set('#purchase-tab-credits',text[4]);set('#purchase-tab-kids',text[15]);
  set('#match-packs-section h3',text[5]);set('#match-packs-section > h3 + p',text[6]);
  set('#match-packs-section .purchase-pack small',text[7]);action('[data-match-pack]',text[8]);
  set('#ask-ai-credits h3',text[9]);set('#ask-ai-credits > h3 + p',text[10]);
  set('#ask-ai-credits .purchase-pack small',text[11]);action('[data-credit-pack]',text[12]);
  set('#kids-packs-section h3',text[16]);set('#kids-packs-section > h3 + p',text[17]);
  set('#kids-packs-section .kids-purchase-group:first-child h4',text[18]);
  set('#kids-packs-section .kids-purchase-group:first-child .kids-purchase-note',text[19]);
  set('#kids-packs-section .kids-purchase-group:first-child .purchase-pack small',text[20]);
  set('#kids-packs-section .kids-purchase-group:last-child h4',text[21]);
  set('#kids-packs-section .kids-purchase-group:last-child .kids-purchase-note',text[22]);
  set('#kids-packs-section .kids-purchase-group:last-child .purchase-pack small',text[23]);
  action('[data-kids-match-pack],[data-kids-credit-pack]',text[24]);
  hub.querySelectorAll('.purchase-badge').forEach(el=>{
   const key=el.parentElement.querySelector('button')?.dataset;
   const product=key?.matchPack||key?.creditPack||key?.kidsMatchPack||key?.kidsCreditPack||'';
   if(product)el.textContent=/^(?:kids_)?(?:matches_25|credits_75)$/.test(product)?text[13]:text[14];
  });
  window.MatchBillingPresentation?.refresh?.();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
 document.addEventListener('matchapp:langchange',render);
}());
