# 📝 Edge Functions Changelog

Questo documento traccia tutte le modifiche alle Supabase Edge Functions del progetto.

**Regole:**
- Ogni modifica crea un backup progressivo (index-old1.ts, index-old2.ts, etc.)
- Mai sovrascrivere backup esistenti
- Documentare sempre motivo, modifiche, impatto

---

## [2025-11-04] - Background Email Sync TEST - Pre-Check Duplicate Optimization

### File Creato
- **Function:** `supabase/functions/background-email-sync-test/index.ts`
- **Tipo:** Nuova funzione temporanea per testing
- **Status:** 🧪 TEST MODE - Non sostituisce `background-email-sync` esistente

### Motivo Creazione
Creare funzione isolata per testare ottimizzazione **pre-check duplicati** prima di applicarla alla funzione production. Evita download inutili di email già presenti nel database.

### Problema da Risolvere
**Comportamento attuale** (`background-email-sync`):
1. Scarica TUTTE le email dalla cartella via TMWE API
2. Tenta inserimento in DB con `ignoreDuplicates: true`
3. Database scarta duplicati in fase di insert
4. **Spreco:** Download completo anche per cartelle già sincronizzate

**Esempio:** Cartella INBOX con 1000 email già scaricate → scarica tutte 1000, poi scarta 1000 duplicati (~500 secondi sprecati)

### Soluzione Implementata

#### Pre-Check UIDs (linee ~238-280)
```typescript
// 1. Query UIDs già presenti nel database
const { data: existingEmails } = await supabase
  .from('email_messages')
  .select('message_id')
  .eq('user_email', userEmail)
  .eq('folder_name', folder);

// 2. Estrai numeri UID dalle message_id
const existingUIDs = new Set(
  existingEmails?.map(e => {
    const parts = e.message_id.split('/'); // "user@domain/INBOX/12345" → 12345
    const uidStr = parts[parts.length - 1];
    return parseInt(uidStr, 10);
  }).filter(uid => !isNaN(uid)) || []
);

// 3. Filtra solo UIDs nuovi
const newUIDs = uids.filter(uid => !existingUIDs.has(uid));

// 4. Skip cartella se nessun nuovo UID
if (newUIDs.length === 0) {
  console.log('✅ Folder fully synced, skipping download');
  continue;
}

// 5. Download SOLO newUIDs (non tutti gli uids)
for (let j = 0; j < newUIDs.length; j += batchSize) {
  const batch = newUIDs.slice(j, j + batchSize); // ✅ Usa newUIDs
  // ... download batch
}
```

#### Logging Ottimizzazione (linee ~250-260, ~370-375)
```typescript
console.log('📊 UID Analysis for INBOX:');
console.log('  - Total UIDs on server: 1000');
console.log('  - Already in database: 950');
console.log('  - New UIDs to download: 50');
console.log('  - Optimization savings: 950 downloads skipped (95%)');
console.log('  - Estimated time saved: ~475s');
```

### Modifiche Rispetto a `background-email-sync`

| Aspetto | `background-email-sync` (OLD) | `background-email-sync-test` (NEW) |
|---------|-------------------------------|-------------------------------------|
| **Query DB prima download** | ❌ No | ✅ Sì - query `email_messages` per UIDs esistenti |
| **UIDs scaricati** | Tutti | Solo nuovi (`newUIDs`) |
| **Skip cartelle già sync** | ❌ No (scarica sempre) | ✅ Sì (se `newUIDs.length === 0`) |
| **Logging stats** | Base | Dettagliato (%, tempo risparmiato) |
| **Logica core** | Invariata | Invariata (stesse API calls, stessa gestione errori) |

### Performance Attese

| Scenario | `background-email-sync` | `background-email-sync-test` | Miglioramento |
|----------|-------------------------|------------------------------|---------------|
| **Cartella già sincronizzata** (1000/1000) | ~500s (scarica tutte, scarta) | ~5s (query DB, skip) | **100x più veloce** ⚡ |
| **Cartella parziale** (50/1000 nuove) | ~500s (scarica tutte) | ~30s (query + 50 download) | **16x più veloce** ⚡ |
| **Nuova cartella** (0/1000) | ~500s | ~500s | Identico |

### Test Plan

#### Test 1: Cartella già sincronizzata
```bash
# Chiamata API
POST /functions/v1/background-email-sync-test
{ "folders": ["INBOX"], "user_email": "user@example.com" }

# Atteso nei log:
# [Job xxx] New UIDs to download: 0
# [Job xxx] ✅ Folder INBOX fully synced (1000 emails already in DB)
# Tempo: < 5 secondi
```

#### Test 2: Cartella parzialmente sincronizzata
```sql
-- Simula: elimina 50 email recenti
DELETE FROM email_messages 
WHERE folder_name = 'INBOX' 
ORDER BY date DESC LIMIT 50;
```
```bash
# Atteso nei log:
# [Job xxx] New UIDs to download: 50
# [Job xxx] Downloaded new: 50
# Tempo: ~30 secondi
```

#### Test 3: Nuova cartella
```bash
# Chiamata su cartella mai sincronizzata
POST /functions/v1/background-email-sync-test
{ "folders": ["INBOX/NEW_FOLDER"], "user_email": "user@example.com" }

# Atteso: comportamento identico a background-email-sync
```

### Impatto
- **Tabelle Database:** `email_sync_progress`, `email_messages` (SELECT only, nessuna modifica struttura)
- **Frontend:** Nessuna modifica necessaria (job_id compatibile con UI esistente)
- **API TMWE:** Riduzione chiamate 90% per cartelle aggiornate
- **User Experience:** Download molto più veloci su sync ripetute

### Rollback Plan
Funzione isolata, nessun impatto su production. Per tornare indietro:
```bash
# Opzione 1: Elimina funzione TEST
rm -rf supabase/functions/background-email-sync-test

# Opzione 2: Disabilita in config.toml
[functions.background-email-sync-test]
disabled = true
```

Funzione `background-email-sync` rimane **invariata e funzionante**.

### Decisione Post-Test
✅ **Se test positivi (100% successo):**
- Creare backup: `cp background-email-sync/index.ts background-email-sync/index-old2.ts`
- Sostituire: `cp background-email-sync-test/index.ts background-email-sync/index.ts`
- Eliminare: `rm -rf background-email-sync-test`
- Documentare: Aggiornare questo changelog con successo implementazione

❌ **Se problemi (errori, duplicati mancanti):**
- Mantenere `background-email-sync` originale
- Eliminare `background-email-sync-test`
- Analizzare logs per debug

### Next Steps
1. Deploy automatico function TEST
2. Eseguire Test 1, 2, 3 in sequenza
3. Verificare logs in Supabase Dashboard
4. Confrontare performance con version OLD
5. Decidere se applicare a production

---

## [2025-01-29] - Background Email Sync - Fix getFolderUIDs()

### File Modificato
- **Function:** `supabase/functions/background-email-sync/index.ts`
- **Backup Creato:** `index-old1.ts`
- **Versione Precedente:** Versione originale (nessun backup precedente)

### Motivo Modifica
**Fix critico**: `getFolderUIDs()` cercava messaggi in `data.data`, ma `tmwe-api-proxy` ritorna `data.messages`. Questo causava array vuoto e zero download.

### Problema Risolto
```typescript
// ❌ PRIMA (linea 501) - array sempre vuoto
const messages = data.data || [];

// ✅ DOPO (linea 501) - estrae correttamente i messaggi
const messages = data.messages || [];
```

### Root Cause Analysis
1. **TmweBackendDebugger** (funzionante): usa `data.messages` ✅
2. **background-email-sync** (bug): usava `data.data` ❌
3. **Response structure** da `tmwe-api-proxy`: `{ messages: [...], total: X }`

### Test Post-Fix
- [x] Verificato logs: `Extracted messages - isArray: true, length: 3`
- [x] UIDs parsati correttamente: `✅ SUCCESS - Parsed 3 valid UIDs`
- [x] Download email in `email_messages` tabella
- [x] Progress tracking aggiornato in real-time

### Impatto
- **Tabelle Database:** `email_sync_progress`, `email_messages`
- **Frontend:** `EmailSyncStatus.tsx`, Quick Download UI
- **User Experience:** Download email finalmente funziona 🎉

### Rollback Plan
```bash
cp supabase/functions/background-email-sync/index-old1.ts supabase/functions/background-email-sync/index.ts
# Deploy automatico Supabase
```

---

## [2025-01-29] - TMWE Email Sync Master - Dual Mode Sync

### File Modificato
- **Function:** `supabase/functions/tmwe-email-sync-master/index.ts`
- **Frontend:** `src/components/email/FunEmailDownloader.tsx`
- **Backup:** `docs/CODE_BACKUPS/tmwe-email-sync-master.BACKUP-2025-01-29-PRE-DUAL-MODE.ts`

### Motivo Modifica
Implementare **due modalità di sincronizzazione complementari** per bilanciare velocità e accuratezza senza perdere la robustezza del sistema esistente.

### Modalità Implementate

#### 1. **MODALITÀ COMPLETA (Full Sync)** - Default originale
- **Quando usare**: Prima sincronizzazione, sync settimanale/mensile, dopo cambio server
- **Comportamento**: 
  - Scarica TUTTE le email dalla cartella
  - Pre-filtering batch locale (verifica email già presenti)
  - Insert solo email nuove
- **Vantaggi**: 
  - ✅ Accuratezza 100%
  - ✅ Trova email mancanti anche se non consecutive
  - ✅ Affidabile anche con database corrotto

#### 2. **MODALITÀ VELOCE (Fast Sync)** - Nuova
- **Quando usare**: Sync quotidiane, aggiornamenti frequenti, cartelle già sincronizzate
- **Comportamento**:
  - Query `MAX(message_id)` dal database locale
  - API request con `uid_min = max_uid_local + 1`
  - Download SOLO email con UID superiore
  - Early exit se 0 nuove email
- **Vantaggi**:
  - ⚡ Rapidissima (1-5s per cartella aggiornata)
  - 🚀 Skip immediato se nessuna nuova email
  - 📉 Riduce carico server TMWE del 90%

### Implementazione Tecnica

**Edge Function** (`index.ts`):
- Nuovo parametro `sync_mode?: 'full' | 'fast'` in `SyncRequest`
- Query `MAX(message_id)` condizionale se `sync_mode === 'fast'`
- Request body con `uid_min` opzionale
- Early exit per cartelle già aggiornate

**Frontend** (`FunEmailDownloader.tsx`):
- Toggle UI per selezionare modalità VELOCE/COMPLETA
- Default: modalità VELOCE
- Stato `syncMode` salvato localmente

### Metriche Performance Attese

| Modalità | Tempo/Cartella | Bandwidth | Caso d'uso |
|----------|----------------|-----------|------------|
| COMPLETA | 20-40s | Alta | Prima sync, backup completo |
| VELOCE | 1-5s | Bassissima | Sync quotidiane, aggiornamenti |

### Compatibilità
- ✅ Backward compatible: modalità COMPLETA = comportamento originale
- ✅ Se API TMWE non supporta `uid_min`, comportamento identico a prima
- ✅ Nessuna breaking change

---

## [2025-01-15] - Image Generation Backend

### File Creato
- **Function:** `supabase/functions/generate-image/index.ts`
- **Backup:** N/A (nuova funzione)

### Motivo Creazione
Supporto generazione immagini nel Chat Laboratory tramite Lovable AI Gateway (Google Gemini Flash Image Preview).

### Funzionalità Implementate
1. **Multi-provider support:**
   - Lovable AI (google/gemini-2.5-flash-image-preview) - default
   - OpenAI (dall-e-3)
   - HuggingFace (stabilityai/stable-diffusion-2-1)

2. **Features:**
   - CORS headers configurati
   - Validazione input (prompt, model, size)
   - Gestione errori dettagliata
   - Support per image editing (Lovable AI)
   - Logging completo

3. **Sicurezza:**
   - API keys da Supabase secrets
   - Nessuna API key hardcoded
   - Validazione parametri

### Codice Principale
```typescript
// Lovable AI (default)
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: model || "google/gemini-2.5-flash-image-preview",
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"]
  })
});

const data = await response.json();
const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
```

### Impatto
- **Frontend:** ChatLaboratory page (nuova UI generazione immagini)
- **Database:** `chat_laboratory_messages.generated_images` (jsonb)
- **Altre Functions:** Nessuna

### Test Eseguiti
- [x] Test Lovable AI provider
- [x] Test generazione base64 image
- [x] Test error handling
- [x] Verifica CORS
- [x] Test integrazione frontend

### Breaking Changes
- [ ] Nessun breaking change (nuova feature)

### Rollback Plan
Non applicabile (nuova funzione, può essere disabilitata lato frontend).

---

## [2025-01-15] - Chat Laboratory Orchestrator - Image Generation Skip

### File Modificato
- **Function:** `supabase/functions/chat-laboratory-orchestrator/index.ts`
- **Backup Creato:** `index-old1.ts`
- **Versione Precedente:** Versione originale (no backup precedenti)

### Motivo Modifica
Dopo generazione immagine, l'orchestrator deve permettere solo all'utente di continuare la conversazione, non agli AI participants.

### Modifiche Apportate

1. **Aggiunta detection immagini generate:**
```typescript
// Fetch ultimo messaggio
const { data: lastMessage } = await supabase
  .from('chat_laboratory_messages')
  .select('generated_images, sender_type')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

// Skip AI response se immagine appena generata
if (lastMessage?.generated_images && 
    lastMessage.generated_images.length > 0 &&
    lastMessage.sender_type === 'user') {
  console.log('Image generated, skipping AI participants response');
  
  return new Response(
    JSON.stringify({
      success: true,
      skipped: true,
      reason: 'image_generation_completed',
      message: 'Immagine generata. Attendo prossima richiesta utente.'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

2. **Logging migliorato:**
```typescript
console.log('🎲 Selected participant:', {
  index: selectedIndex,
  name: selectedParticipant.name,
  type: selectedParticipant.type,
  hasResponded: selectedParticipant.has_responded_current_turn
});
```

### Codice Modificato

**Prima:**
```typescript
// Nessun check per immagini generate
// Orchestrator rispondeva sempre con AI participant
```

**Dopo:**
```typescript
// Check se ultimo messaggio ha immagini generate
if (lastMessage?.generated_images?.length > 0) {
  // Skip AI response, attendi utente
  return skipResponse();
}
```

### Impatto
- **Altre Edge Functions:** Nessuna
- **Tabelle Database:** Legge da `chat_laboratory_messages`
- **Frontend:** ChatLaboratory - comportamento conversazione dopo image gen
- **User Experience:** Dopo generazione immagine, solo utente può continuare

### Test Eseguiti
- [x] Test generazione immagine + skip AI response
- [x] Test conversazione normale (senza immagini)
- [x] Test edge case: immagine + messaggio testuale
- [x] Verifica logs production
- [x] Test turn-taking dopo skip

### Breaking Changes
- [ ] Nessun breaking change
- [x] Comportamento cambiato: AI non risponde dopo image gen

### Rollback Plan
In caso di problemi:
1. Copiare `index-old1.ts` → `index.ts`
2. Rideploy edge function via Supabase Dashboard
3. Verificare logs per conferma rollback
4. Testare conversazione normale

---

## [2025-01-14] - TMWE Email Sync Master - Batch Processing

### File Modificato
- **Function:** `supabase/functions/tmwe-email-sync-master/index.ts`
- **Backup Creato:** `index-old2.ts`
- **Versione Precedente:** `index-old1.ts`

### Motivo Modifica
Ottimizzazione sincronizzazione email TMWE con processing batch per migliorare performance su grandi volumi.

### Modifiche Apportate
1. Processing batch parallelo (5 batch concorrenti)
2. Progress tracking in `email_sync_progress`
3. Gestione timeout migliorata
4. Retry logic per folder vuote

### Impatto
- **Frontend:** TMWEEmailDashboard (progress bar)
- **Database:** `email_sync_progress`, `email_sync_logs`
- **Performance:** 5x più veloce su 1000+ email

### Test Eseguiti
- [x] Test sync 100 email
- [x] Test sync 1000+ email
- [x] Test interruzione/resume
- [x] Test error recovery

### Breaking Changes
- [ ] Nessun breaking change (backward compatible)

---

## [2025-01-12] - Intranet AI Chat Assistant - Multi-Language

### File Modificato
- **Function:** `supabase/functions/intranet-ai-chat-assistant/index.ts`
- **Backup Creato:** `index-old3.ts`
- **Versione Precedente:** `index-old2.ts`

### Motivo Modifica
Supporto traduzioni automatiche basate su preferenze lingua utente.

### Modifiche Apportate
1. Detection lingua utente da `user_profiles`
2. Traduzione messaggi AI in lingua preferita
3. Support per multiple lingue (IT, EN, ES, FR, DE)

### Impatto
- **Frontend:** Intranet page
- **Database:** Legge `user_profiles.preferred_language`
- **User Experience:** Messaggi AI tradotti automaticamente

### Test Eseguiti
- [x] Test IT/EN translation
- [x] Test edge cases (lingua non supportata)
- [x] Performance test

---

## Template Entry (da usare per future modifiche)

```markdown
## [YYYY-MM-DD] - [Titolo Modifica]

### File Modificato
- **Function:** `supabase/functions/nome-funzione/index.ts`
- **Backup Creato:** `index-oldX.ts`
- **Versione Precedente:** `index-oldY.ts`

### Motivo Modifica
[Descrizione dettagliata del perché]

### Modifiche Apportate
1. [Cosa è cambiato]
2. [Cosa è stato aggiunto]
3. [Cosa è stato rimosso]

### Codice Modificato
\`\`\`typescript
// Prima
const oldCode = 'example';

// Dopo
const newCode = 'improved';
\`\`\`

### Impatto
- **Altre Edge Functions:** [Lista]
- **Tabelle Database:** [Lista]
- **Frontend:** [Componenti impattati]

### Test Eseguiti
- [ ] Test funzione isolata
- [ ] Test integrazione frontend
- [ ] Test edge cases
- [ ] Verifica logs
- [ ] Test performance

### Breaking Changes
- [ ] Nessun breaking change
- [ ] [Descrizione se presente]

### Rollback Plan
1. Copiare `index-oldX.ts` → `index.ts`
2. Rideploy
3. Verificare logs
```

---

## [2025-01-20] - Bar Chat Orchestrator - TTS Fix & System Backup

### File Modificato
- **Function:** `supabase/functions/bar-chat-orchestrator/index.ts`
- **Backup Creato:** `index-old-2025-01-20.ts`
- **Versione Precedente:** Versioni precedenti senza TTS funzionante

### Motivo Backup
**BACKUP COMPLETO SISTEMA** prima fix risposta simultanea agenti.

### Modifiche Implementate
1. **Fix Stack Overflow TTS**: Risolto crash conversione base64 audio
2. **Fix Full-Duplex Text**: Trascrizione passata correttamente alla chat
3. **Sistema TTS Funzionante**: Agenti parlano con audio ElevenLabs

### Issue Nota
⚠️ **Agenti rispondono tutti simultaneamente** invece che a turno
- Da risolvere nel prossimo intervento

### Stato Sistema
✅ TTS ElevenLabs: Funzionante  
✅ Full-Duplex Recorder: Funzionante  
✅ Storage Audio: Funzionante  
✅ Prompt Sections: Funzionante  
⚠️ Sequential Response: Da implementare

### Database Backup
- **File:** `docs/DATABASE_BACKUPS/2025-01-20_pre-bar-mode-simultaneous-fix.md`
- **Contenuto:** Schema completo tabelle, RLS policies, functions, triggers
- **Coverage:** 100% sistema Bar Mode

### Test Eseguiti
- [x] TTS generation con tutti gli agenti
- [x] Upload audio Supabase Storage
- [x] Full-Duplex transcription
- [x] Prompt sections composition
- [x] Interrupt functionality

### Rollback Plan
```bash
cp index-old-2025-01-20.ts index.ts
# Rideploy automatico
# Sistema torna a versione stabile TTS funzionante
```

---

## 📊 Statistics

**Total Functions:** 25+  
**Total Modifications:** 7 (documented)  
**Total Backups:** 12+ files  
**Last Update:** 2025-01-20

---

## 🔗 Related Documentation

- [MASTER_RULES.md](./MASTER_RULES.md) - Regole sviluppo
- [DATABASE_INFO.md](./DATABASE_INFO.md) - Schema database
- [DATABASE_BACKUPS/](./DATABASE_BACKUPS/) - Backup database

---

**Maintainer:** Development Team  
**Review:** Ogni modifica edge function  
**Format:** Markdown con code blocks
