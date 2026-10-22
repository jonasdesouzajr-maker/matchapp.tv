/* ============================================================
   MatchApp — Activity log

   A rolling record of what the user did: matches, AI questions, saves,
   removals, shares, purchases, platform clicks.

   DELIBERATELY LOCAL-ONLY.
   This never leaves the device. Two reasons, and the privacy one matters
   more: a server-side behavioural log of what someone watches, searches and
   buys is genuinely sensitive data, and MatchApp has no need for it — the
   feature exists so the USER can see their own history, not so we can.
   Keeping it in localStorage also means no table, no migration, no RLS
   policy, and no breach surface.

   RETENTION is user-controlled: entries stay until the owner deletes them
   (or the localStorage ceiling is hit). We never auto-wipe history.
   ============================================================ */

(function () {
    'use strict';

    const KEY = 'match_activity';
    const RETENTION_DAYS = 0;    // 0 = keep forever until the user deletes an entry
    const MAX_ENTRIES = 800;     // a hard ceiling so a heavy user cannot fill the quota

    const TYPES = {
        match:    { icon: '🎬', label: 'Match' },
        ai:       { icon: '🤖', label: 'AI question' },
        save:     { icon: '⭐', label: 'Saved' },
        remove:   { icon: '🗑', label: 'Removed' },
        seen:     { icon: '👁', label: 'Marked seen' },
        share:    { icon: '📤', label: 'Shared' },
        purchase: { icon: '💳', label: 'Purchase' },
        platform: { icon: '▶',  label: 'Opened' },
        together: { icon: '🤝', label: 'Match Together' },
        settings: { icon: '⚙️', label: 'Settings' }
    };

    // Presentation only: follow the app's selected language without rewriting
    // event types, titles, questions or stored activity records.
    const COPY = {
        en: {
            types: { match:'Match', ai:'AI question', save:'Saved', remove:'Removed', seen:'Marked seen', share:'Shared', purchase:'Purchase', platform:'Opened', together:'Match Together', settings:'Settings' },
            empty:'Nothing here yet. Matches, AI questions and saves stay here until you remove them.',
            count:'Entries: {count} · Kept until you remove them.', justNow:'just now',
            deleteEntry:'Delete this entry', filter:'Filter activity',
            clearConfirm:'Delete your entire activity history? This cannot be undone.', cleared:'Activity history cleared.'
        },
        'pt-BR': {
            types: { match:'Recomendação', ai:'Pergunta à IA', save:'Salvo', remove:'Removido', seen:'Marcado como visto', share:'Compartilhado', purchase:'Compra', platform:'Aberto', together:'Match Together', settings:'Configurações' },
            empty:'Nada por aqui ainda. Recomendações, perguntas à IA e itens salvos ficam aqui até você removê-los.',
            count:'Registros: {count} · Mantidos até você removê-los.', justNow:'agora mesmo',
            deleteEntry:'Excluir este registro', filter:'Filtrar atividade',
            clearConfirm:'Excluir todo o seu histórico de atividades? Esta ação não pode ser desfeita.', cleared:'Histórico de atividades excluído.'
        },
        es: {
            types: { match:'Recomendación', ai:'Pregunta a la IA', save:'Guardado', remove:'Eliminado', seen:'Marcado como visto', share:'Compartido', purchase:'Compra', platform:'Abierto', together:'Match Together', settings:'Ajustes' },
            empty:'Aún no hay nada aquí. Las recomendaciones, preguntas a la IA y elementos guardados permanecen aquí hasta que los elimines.',
            count:'Registros: {count} · Se conservan hasta que los elimines.', justNow:'ahora mismo',
            deleteEntry:'Eliminar este registro', filter:'Filtrar actividad',
            clearConfirm:'¿Eliminar todo tu historial de actividad? Esta acción no se puede deshacer.', cleared:'Historial de actividad eliminado.'
        },
        fr: {
            types: { match:'Recommandation', ai:'Question à l’IA', save:'Enregistré', remove:'Supprimé', seen:'Marqué comme vu', share:'Partagé', purchase:'Achat', platform:'Ouvert', together:'Match Together', settings:'Paramètres' },
            empty:'Rien ici pour le moment. Les recommandations, questions à l’IA et éléments enregistrés restent ici jusqu’à leur suppression.',
            count:'Entrées : {count} · Conservées jusqu’à leur suppression.', justNow:'à l’instant',
            deleteEntry:'Supprimer cette entrée', filter:'Filtrer l’activité',
            clearConfirm:'Supprimer tout votre historique d’activité ? Cette action est irréversible.', cleared:'Historique d’activité supprimé.'
        },
        de: {
            types: { match:'Empfehlung', ai:'KI-Frage', save:'Gespeichert', remove:'Entfernt', seen:'Als gesehen markiert', share:'Geteilt', purchase:'Kauf', platform:'Geöffnet', together:'Match Together', settings:'Einstellungen' },
            empty:'Hier ist noch nichts. Empfehlungen, KI-Fragen und gespeicherte Inhalte bleiben hier, bis du sie entfernst.',
            count:'Einträge: {count} · Bleiben erhalten, bis du sie entfernst.', justNow:'gerade eben',
            deleteEntry:'Diesen Eintrag löschen', filter:'Aktivitäten filtern',
            clearConfirm:'Deinen gesamten Aktivitätsverlauf löschen? Dies kann nicht rückgängig gemacht werden.', cleared:'Aktivitätsverlauf gelöscht.'
        },
        it: {
            types: { match:'Consiglio', ai:'Domanda all’IA', save:'Salvato', remove:'Rimosso', seen:'Segnato come visto', share:'Condiviso', purchase:'Acquisto', platform:'Aperto', together:'Match Together', settings:'Impostazioni' },
            empty:'Qui non c’è ancora nulla. I consigli, le domande all’IA e gli elementi salvati rimangono qui finché non li rimuovi.',
            count:'Voci: {count} · Conservate finché non le rimuovi.', justNow:'proprio ora',
            deleteEntry:'Elimina questa voce', filter:'Filtra attività',
            clearConfirm:'Eliminare tutta la cronologia delle attività? Questa azione è irreversibile.', cleared:'Cronologia delle attività eliminata.'
        },
        tr: {
            types: { match:'Öneri', ai:'Yapay zekâ sorusu', save:'Kaydedildi', remove:'Kaldırıldı', seen:'İzlendi olarak işaretlendi', share:'Paylaşıldı', purchase:'Satın alma', platform:'Açıldı', together:'Match Together', settings:'Ayarlar' },
            empty:'Henüz burada bir şey yok. Öneriler, yapay zekâ soruları ve kaydedilenler siz kaldırana kadar burada kalır.',
            count:'Kayıtlar: {count} · Siz kaldırana kadar saklanır.', justNow:'az önce',
            deleteEntry:'Bu kaydı sil', filter:'Etkinlikleri filtrele',
            clearConfirm:'Tüm etkinlik geçmişiniz silinsin mi? Bu işlem geri alınamaz.', cleared:'Etkinlik geçmişi silindi.'
        },
        ru: {
            types: { match:'Рекомендация', ai:'Вопрос ИИ', save:'Сохранено', remove:'Удалено', seen:'Отмечено как просмотренное', share:'Отправлено', purchase:'Покупка', platform:'Открыто', together:'Match Together', settings:'Настройки' },
            empty:'Здесь пока ничего нет. Рекомендации, вопросы ИИ и сохранённые материалы остаются здесь, пока вы их не удалите.',
            count:'Записи: {count} · Хранятся, пока вы их не удалите.', justNow:'только что',
            deleteEntry:'Удалить эту запись', filter:'Фильтр активности',
            clearConfirm:'Удалить всю историю активности? Это действие нельзя отменить.', cleared:'История активности удалена.'
        },
        ar: {
            types: { match:'توصية', ai:'سؤال للذكاء الاصطناعي', save:'تم الحفظ', remove:'تمت الإزالة', seen:'تم وضع علامة تمت المشاهدة', share:'تمت المشاركة', purchase:'عملية شراء', platform:'تم الفتح', together:'Match Together', settings:'الإعدادات' },
            empty:'لا يوجد شيء هنا بعد. تبقى التوصيات وأسئلة الذكاء الاصطناعي والعناصر المحفوظة هنا حتى تزيلها.',
            count:'السجلات: {count} · تُحفظ حتى تزيلها.', justNow:'الآن',
            deleteEntry:'حذف هذا السجل', filter:'تصفية النشاط',
            clearConfirm:'هل تريد حذف سجل نشاطك بالكامل؟ لا يمكن التراجع عن هذا الإجراء.', cleared:'تم حذف سجل النشاط.'
        },
        hi: {
            types: { match:'सुझाव', ai:'AI से सवाल', save:'सहेजा गया', remove:'हटाया गया', seen:'देखा हुआ चिह्नित', share:'साझा किया गया', purchase:'खरीद', platform:'खोला गया', together:'Match Together', settings:'सेटिंग्स' },
            empty:'यहाँ अभी कुछ नहीं है। सुझाव, AI से पूछे गए सवाल और सहेजी गई चीज़ें आपके हटाने तक यहाँ रहती हैं।',
            count:'प्रविष्टियाँ: {count} · आपके हटाने तक रखी जाती हैं।', justNow:'अभी-अभी',
            deleteEntry:'यह प्रविष्टि मिटाएँ', filter:'गतिविधि फ़िल्टर करें',
            clearConfirm:'क्या आप अपनी पूरी गतिविधि का इतिहास मिटाना चाहते हैं? यह कार्रवाई वापस नहीं ली जा सकती।', cleared:'गतिविधि का इतिहास मिटा दिया गया।'
        },
        id: {
            types: { match:'Rekomendasi', ai:'Pertanyaan AI', save:'Disimpan', remove:'Dihapus', seen:'Ditandai sudah ditonton', share:'Dibagikan', purchase:'Pembelian', platform:'Dibuka', together:'Match Together', settings:'Pengaturan' },
            empty:'Belum ada apa pun di sini. Rekomendasi, pertanyaan AI, dan item yang disimpan tetap di sini sampai Anda menghapusnya.',
            count:'Entri: {count} · Disimpan sampai Anda menghapusnya.', justNow:'baru saja',
            deleteEntry:'Hapus entri ini', filter:'Filter aktivitas',
            clearConfirm:'Hapus seluruh riwayat aktivitas Anda? Tindakan ini tidak dapat dibatalkan.', cleared:'Riwayat aktivitas dihapus.'
        },
        ja: {
            types: { match:'おすすめ', ai:'AIへの質問', save:'保存済み', remove:'削除済み', seen:'視聴済みに設定', share:'共有済み', purchase:'購入', platform:'開いた項目', together:'Match Together', settings:'設定' },
            empty:'まだ履歴はありません。おすすめ、AIへの質問、保存した項目は、削除するまでここに残ります。',
            count:'記録：{count}件 · 削除するまで保存されます。', justNow:'たった今',
            deleteEntry:'この記録を削除', filter:'アクティビティを絞り込む',
            clearConfirm:'アクティビティ履歴をすべて削除しますか？この操作は取り消せません。', cleared:'アクティビティ履歴を削除しました。'
        },
        ko: {
            types: { match:'추천', ai:'AI 질문', save:'저장됨', remove:'삭제됨', seen:'시청 완료로 표시', share:'공유됨', purchase:'구매', platform:'열어본 항목', together:'Match Together', settings:'설정' },
            empty:'아직 기록이 없습니다. 추천, AI 질문 및 저장한 항목은 직접 삭제할 때까지 여기에 남습니다.',
            count:'기록: {count}개 · 직접 삭제할 때까지 보관됩니다.', justNow:'방금',
            deleteEntry:'이 기록 삭제', filter:'활동 필터',
            clearConfirm:'전체 활동 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.', cleared:'활동 기록이 삭제되었습니다.'
        },
        zh: {
            types: { match:'推荐', ai:'AI 提问', save:'已保存', remove:'已移除', seen:'已标记为看过', share:'已分享', purchase:'购买', platform:'已打开', together:'Match Together', settings:'设置' },
            empty:'这里还没有记录。推荐、AI 提问和已保存的内容会一直保留，直到你将其移除。',
            count:'记录：{count} 条 · 会保留到你主动移除。', justNow:'刚刚',
            deleteEntry:'删除此记录', filter:'筛选活动',
            clearConfirm:'要删除全部活动历史吗？此操作无法撤销。', cleared:'活动历史已删除。'
        }
    };

    function language() {
        const normalize = value => {
            const code = String(value || '').trim().replace(/_/g, '-').toLowerCase();
            if (code === 'pt' || code.startsWith('pt-')) return 'pt-BR';
            const base = code.split('-')[0];
            return Object.prototype.hasOwnProperty.call(COPY, base) ? base : '';
        };
        let saved = '';
        try { saved = normalize(localStorage.getItem('match_lang')); } catch (_) {}
        return saved || normalize(window.MATCH_LANG) || normalize(document.documentElement.lang) || 'en';
    }

    function read() {
        let list = [];
        try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
        if (!Array.isArray(list)) return [];

        // Keep every entry until the user deletes it. Only drop broken rows.
        return list.filter(e => e && e.ts);
    }

    function write(list) {
        try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES))); }
        catch (e) {
            // Quota is shared with saved lists and avatars, which matter more
            // than history. Halve the log and retry once rather than letting
            // an activity write break something the user actually needs.
            try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, Math.floor(MAX_ENTRIES / 2)))); } catch (e2) {}
        }
    }

    window.MatchActivity = {
        /* Newest first, so the panel needs no sorting and a prepend is O(1). */
        log(type, detail, meta) {
            if (!TYPES[type]) return;
            const list = read();
            list.unshift({
                ts: Date.now(),
                type: type,
                detail: String(detail || '').slice(0, 160),   // cap: a pasted AI question can be long
                meta: meta || null
            });
            write(list);
            document.dispatchEvent(new CustomEvent('matchapp:historychange'));
            // Repaint only if the panel happens to be open.
            if (document.getElementById('activity-list')) window.renderActivity();
        },

        all() { return read(); },

        removeAt(ts) {
            write(read().filter(e => e.ts !== ts));
            document.dispatchEvent(new CustomEvent('matchapp:historychange'));
        },

        clear() {
            try { localStorage.removeItem(KEY); } catch (e) {}
            document.dispatchEvent(new CustomEvent('matchapp:historychange'));
        },

        TYPES,
        RETENTION_DAYS
    };

    /* ---------- rendering ---------- */

    function timeAgo(ts, lang, copy, formatter) {
        const s = Math.floor((Date.now() - ts) / 1000);
        if (!Number.isFinite(s)) return '—';
        if (s < 60) return copy.justNow;
        const unit = s < 3600 ? 'minute' : (s < 86400 ? 'hour' : 'day');
        const amount = Math.floor(s / (unit === 'minute' ? 60 : (unit === 'hour' ? 3600 : 86400)));
        return formatter ? formatter.format(-amount, unit) : new Date(ts).toLocaleString(lang);
    }

    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    window.renderActivity = function () {
        const box = document.getElementById('activity-list');
        if (!box) return;
        const lang = language(), copy = COPY[lang];
        box.lang = lang;
        box.dir = lang === 'ar' ? 'rtl' : 'ltr';
        const filterEl = document.getElementById('activity-filter');
        if (filterEl) filterEl.setAttribute('aria-label', copy.filter);
        const filter = filterEl ? filterEl.value : '';

        let items = read();
        if (filter) {
            // "save" in the dropdown covers both directions of the same action,
            // which is how a user thinks about it.
            const group = filter === 'save' ? ['save', 'remove', 'seen'] : [filter];
            items = items.filter(e => group.includes(e.type));
        }

        const countEl = document.getElementById('activity-count');
        if (!items.length) {
            box.innerHTML = '<p class="activity-empty">' + esc(copy.empty) + '</p>';
            if (countEl) countEl.textContent = '';
            return;
        }

        const formatter = typeof Intl.RelativeTimeFormat === 'function' ? new Intl.RelativeTimeFormat(lang, {numeric:'auto', style:'short'}) : null;
        box.innerHTML = items.map(e => {
            const t = TYPES[e.type] || { icon: '•', label: e.type };
            return `<div class="activity-row">
                <span class="activity-icon" aria-hidden="true">${t.icon}</span>
                <div class="activity-main">
                    <span class="activity-label">${esc(copy.types[e.type] || t.label)}</span>
                    <span class="activity-detail">${esc(e.detail)}</span>
                </div>
                <span class="activity-time">${esc(timeAgo(e.ts, lang, copy, formatter))}</span>
                <button type="button" class="activity-del" onclick="deleteActivity(${e.ts})"
                        aria-label="${esc(copy.deleteEntry)}" title="${esc(copy.deleteEntry)}">&times;</button>
            </div>`;
        }).join('');

        if (countEl) {
            countEl.lang = lang;
            countEl.dir = box.dir;
            countEl.textContent = copy.count.replace('{count}', new Intl.NumberFormat(lang).format(items.length));
        }
    };

    window.deleteActivity = function (ts) {
        window.MatchActivity.removeAt(ts);
        window.renderActivity();
    };

    window.clearActivity = function () {
        const copy = COPY[language()];
        if (!confirm(copy.clearConfirm)) return;
        window.MatchActivity.clear();
        window.renderActivity();
        if (window.showToast) showToast(copy.cleared);
    };

    document.addEventListener('matchapp:langchange', () => window.renderActivity());
    window.addEventListener('storage', event => {
        if (event.key === 'match_lang' || event.key === null) window.renderActivity();
    });

    /* ---------- automatic capture ----------
       Hooked to events the app already dispatches, rather than sprinkling
       log() calls through every feature — fewer places to forget, and no
       behaviour change in the features themselves. */
    document.addEventListener('matchapp:newmatch', () => {
        const t = window.globalMatchTitle;
        if (t) window.MatchActivity.log('match', t, { platform: window.globalPlatform || '' });
    });
    document.addEventListener('matchapp:settingschanged', (e) => {
        if (e.detail && e.detail.key && e.detail.key !== '*') {
            window.MatchActivity.log('settings', 'Changed ' + e.detail.key);
        }
    });
    document.addEventListener('matchapp:creditschanged', (e) => {
        if (e.detail) window.MatchActivity.log('purchase', 'Credits now ' + e.detail.credits);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.renderActivity());
    } else {
        window.renderActivity();
    }
})();
