# 🚀 Deployment Guide - GOOD ONE System

**Versione:** 1.0.0  
**Data:** 2025-01-18

---

## Pre-Requisiti

- ✅ Supabase project attivo
- ✅ ElevenLabs API key configurata
- ✅ Voice agents configurati in DB (`chat_laboratory_voice_agents`)
- ✅ Lovable environment ready

---

## Step 1: Backup Corrente (Opzionale ma Raccomandato)

Prima di procedere con il restore, salva lo stato attuale:

```bash
# Backup Edge Function
cp supabase/functions/bar-chat-orchestrator/index.ts \
   backups/bar-chat-orchestrator-index.ts.OLD

# Backup Frontend Components
cp src/components/chat-laboratory/MessageTabsView.tsx \
   backups/MessageTabsView.tsx.OLD
cp src/components/chat-laboratory/MultiAgentMessage.tsx \
   backups/MultiAgentMessage.tsx.OLD
cp src/components/chat-laboratory/AudioMessagePlayer.tsx \
   backups/AudioMessagePlayer.tsx.OLD
```

---

## Step 2: Restore Files

### A. Edge Function

```bash
cd docs/CODE_BACKUPS/2025-01-18_GOOD-ONE-multiagent-audio-sequential

cp bar-chat-orchestrator-index.ts.backup \
   ../../../supabase/functions/bar-chat-orchestrator/index.ts
```

**Verifica:**
```bash
wc -l ../../../supabase/functions/bar-chat-orchestrator/index.ts
# Dovrebbe essere: 500 righe
```

### B. Frontend Components

```bash
cp MessageTabsView.tsx.backup \
   ../../../src/components/chat-laboratory/MessageTabsView.tsx

cp MultiAgentMessage.tsx.backup \
   ../../../src/components/chat-laboratory/MultiAgentMessage.tsx

cp AudioMessagePlayer.tsx.backup \
   ../../../src/components/chat-laboratory/AudioMessagePlayer.tsx
```

**Verifica:**
```bash
grep -n "handleAudioEnd" ../../../src/components/chat-laboratory/MessageTabsView.tsx
# Dovrebbe trovare la funzione intorno alla riga 132
```

---

## Step 3: Deploy Edge Function

### Lovable Environment

**⚠️ IMPORTANTE:** Le modifiche agli Edge Functions richiedono un **rebuild del preview**.

#### Opzione A: Auto-Rebuild (Attendi)
Lovable rileva automaticamente le modifiche e trigghera il rebuild.

#### Opzione B: Forzare Rebuild
Fai una modifica minore a qualsiasi file `.tsx` per forzare il rebuild:

```typescript
// In qualsiasi componente, aggiungi un commento:
// Rebuild trigger 2025-01-18
```

#### Verifica Deploy
1. Apri la console Lovable
2. Cerca log: `🍹 Bar Chat Orchestrator riceve:`
3. Verifica che l'edge function sia stata ridistribuita

---

## Step 4: Verifica Database

### Voice Agents Configuration

Assicurati che la tabella `chat_laboratory_voice_agents` contenga:

```sql
SELECT * FROM chat_laboratory_voice_agents 
WHERE conversation_id = '<YOUR_CONV_ID>'
AND is_active = true;
```

**Expected Output:**
```
name              | voice_id      | is_active
------------------|---------------|----------
Renny - GPT       | 11szj1LU...   | true
Tonino - Anthropic| Ak3m7Npq...   | true
Vittorio - Gemini | KOtk7Uqu...   | true
```

### Bar Mode Settings

```sql
SELECT mode, voice_enabled FROM chat_laboratory_bar_mode 
WHERE conversation_id = '<YOUR_CONV_ID>';
```

**Expected Output:**
```
mode | voice_enabled
-----|---------------
bar  | true
```

---

## Step 5: Test End-to-End

### Test 1: Single Message

1. Apri Chat Laboratory (`/chat-laboratory`)
2. Attiva **Bar Mode**
3. Assicurati che **3 agenti siano attivi** (Gemini, ChatGPT, Claude)
4. Invia messaggio: `"Ciao a tutti!"`
5. Aspetta ~15 secondi

**Expected Behavior:**
- Tab cambia automaticamente a **Gemini**
- Audio parte automaticamente 🔊
- Quando audio finisce, tab cambia a **ChatGPT**
- Audio ChatGPT parte automaticamente 🔊
- Quando audio finisce, tab cambia a **Claude**
- Audio Claude parte automaticamente 🔊

### Test 2: Pause Manuale

1. Durante la riproduzione audio di Gemini, clicca **Pause** ⏸️
2. **Verifica:** Tab NON deve cambiare
3. Clicca **Play** ▶️
4. **Verifica:** Audio riprende, tab rimane su Gemini
5. Attendi fine audio
6. **Verifica:** Tab cambia a ChatGPT automaticamente

### Test 3: Logs Verification

Apri console del browser (`F12`) e cerca:

```
🎤 Voice match: Gemini → Vittorio - Gemini (KOtk7Uqu...)
✅ Messaggio salvato (ID: ba184d61-...)
🔊 Tab attivo: Gemini - Audio pronto per partire
🎵 Audio finito → Passo al tab successivo: ChatGPT
🎤 Voice match: ChatGPT → Renny - GPT (11szj1LU...)
```

---

## Step 6: Database Verification

### Check Audio URLs

```sql
SELECT 
  sender_name,
  LENGTH(content) as content_length,
  audio_url IS NOT NULL as has_audio,
  tempo_risposta_ms
FROM chat_laboratory_messages
WHERE conversation_id = '<YOUR_CONV_ID>'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Output:**
```
sender_name | content_length | has_audio | tempo_risposta_ms
------------|----------------|-----------|------------------
Claude      | 245            | true      | 4823
ChatGPT     | 312            | true      | 3456
Gemini      | 198            | true      | 1987
User        | 12             | false     | null
```

### Check Attachments

```sql
SELECT 
  sender_name,
  attachments->'structured_prompt'->>'message_id' as msg_id
FROM chat_laboratory_messages
WHERE conversation_id = '<YOUR_CONV_ID>'
AND sender_type != 'human'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:** `msg_id` dovrebbe corrispondere a `id` del messaggio.

---

## Rollback Instructions

Se qualcosa va storto, ripristina i file originali:

### Edge Function Rollback

```bash
cp backups/bar-chat-orchestrator-index.ts.OLD \
   supabase/functions/bar-chat-orchestrator/index.ts
```

### Frontend Rollback

```bash
cp backups/MessageTabsView.tsx.OLD \
   src/components/chat-laboratory/MessageTabsView.tsx
cp backups/MultiAgentMessage.tsx.OLD \
   src/components/chat-laboratory/MultiAgentMessage.tsx
cp backups/AudioMessagePlayer.tsx.OLD \
   src/components/chat-laboratory/AudioMessagePlayer.tsx
```

Poi **forzare rebuild** (vedi Step 3).

---

## Troubleshooting

### Problema: Audio non generato

**Sintomo:** `audio_url` è NULL nel DB

**Possibili cause:**
1. Voice agent non trovato (check logs: `⚠️ No voice agent found`)
2. ElevenLabs API key mancante
3. Voice agent `is_active = false` nel DB

**Fix:**
```sql
-- Verifica voice agents attivi
SELECT * FROM chat_laboratory_voice_agents 
WHERE conversation_id = '<YOUR_CONV_ID>' 
AND is_active = true;

-- Se mancano, inseriscili manualmente
INSERT INTO chat_laboratory_voice_agents (conversation_id, name, voice_id, is_active)
VALUES 
  ('<CONV_ID>', 'Renny - GPT', '11szj1LU...', true),
  ('<CONV_ID>', 'Tonino - Anthropic', 'Ak3m7Npq...', true),
  ('<CONV_ID>', 'Vittorio - Gemini', 'KOtk7Uqu...', true);
```

### Problema: Tab non cambiano automaticamente

**Sintomo:** Audio finisce ma tab rimane fermo

**Possibili cause:**
1. `isAutoFollowEnabled = false`
2. `handleAudioEnd` non viene chiamato
3. Event listener `'ended'` non registrato

**Fix:**
```typescript
// In MessageTabsView.tsx, verifica:
const isAutoFollowEnabled = externalAutoFollow ?? true; // ✅ Default true

// In AudioMessagePlayer.tsx, verifica:
audio.addEventListener('ended', handleEnded); // ✅ Listener presente
```

### Problema: Tab cambia su pause manuale

**Sintomo:** Premi pause e il tab cambia al successivo

**Causa:** `onPlayEnd` chiamato in `togglePlay()`

**Fix:**
```typescript
// ❌ SBAGLIATO
const togglePlay = () => {
  if (isPlaying) {
    audio.pause();
    onPlayEnd?.(); // ❌ RIMUOVERE
  }
}

// ✅ CORRETTO
const togglePlay = () => {
  if (isPlaying) {
    audio.pause();
    // onPlayEnd() viene chiamato SOLO dall'event listener 'ended'
  }
}
```

### Problema: Voice agent matching fallisce

**Sintomo:** Logs mostrano `⚠️ No voice agent found for ChatGPT`

**Causa:** Keywords non matchano con i nomi dei voice agents

**Fix:**
```typescript
// In bar-chat-orchestrator/index.ts, verifica:
const agentKeywords: Record<string, string[]> = {
  'chatgpt': ['gpt', 'openai', 'renny'],
  'claude': ['anthropic', 'claude', 'tonino'],
  'gemini': ['gemini', 'google', 'vittorio']
};

// Assicurati che almeno UNA keyword sia presente nel nome voice agent (case-insensitive)
```

---

## Performance Monitoring

### Expected Metrics

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| Gemini Response Time | < 2s | < 4s | > 6s |
| ChatGPT Response Time | < 4s | < 6s | > 10s |
| Claude Response Time | < 6s | < 8s | > 12s |
| Audio Generation | < 1s | < 2s | > 3s |
| Total Turn Time | < 15s | < 25s | > 40s |

### Monitoring Query

```sql
SELECT 
  sender_name,
  AVG(tempo_risposta_ms) as avg_response_ms,
  COUNT(*) as total_messages
FROM chat_laboratory_messages
WHERE conversation_id = '<YOUR_CONV_ID>'
AND sender_type != 'human'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY sender_name;
```

---

## Success Criteria

✅ **System is GOOD** if:
- [ ] Gemini audio plays automatically
- [ ] ChatGPT audio plays automatically after Gemini ends
- [ ] Claude audio plays automatically after ChatGPT ends
- [ ] Tab auto-switching works correctly
- [ ] Manual pause does NOT trigger tab change
- [ ] Logs show correct voice agent matching
- [ ] `audio_url` is populated for all AI messages
- [ ] Total turn time < 25s for 3 agents

---

## Support

Per problemi o domande:
- 📖 Vedi `ARCHITECTURE.md` per dettagli tecnici
- 📖 Vedi `README.md` per overview funzionalità
- 🔍 Controlla logs console e Supabase Edge Function logs

---

**🎉 Buon deployment!**
