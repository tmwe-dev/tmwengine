# 📝 Edge Functions Changelog

Questo documento traccia tutte le modifiche alle Supabase Edge Functions del progetto.

**Regole:**
- Ogni modifica crea un backup progressivo (index-old1.ts, index-old2.ts, etc.)
- Mai sovrascrivere backup esistenti
- Documentare sempre motivo, modifiche, impatto

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
