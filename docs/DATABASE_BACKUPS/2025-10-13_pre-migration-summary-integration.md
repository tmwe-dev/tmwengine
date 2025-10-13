# Backup #3 - Bar Chat Orchestrator (Pre-Summary Integration)

**Data**: 2025-10-13  
**Obiettivo**: Integrazione riassunto cumulativo (`riassunto_contesto`) nel flusso Bar Chat

---

## 📋 Modifiche Previste

1. **Recupero `riassunto_contesto`** dalla tabella `chat_laboratory_conversations`
2. **Inserimento summary** nella conversationHistory (dopo prompt, prima degli ultimi messaggi)
3. **Auto-rigenerazione** del summary ogni 20 messaggi (chiamata asincrona a `generate-chunked-summary`)

---

## 🔍 Stato Corrente del File

**File**: `supabase/functions/bar-chat-orchestrator/index.ts`  
**Totale righe**: 557

### Sezione 1: Fetch Conversation Data (righe 131-140)

```typescript
// Fetch conversation data
const { data: conversation, error: convError } = await supabaseClient
  .from('chat_laboratory_conversations')
  .select('economy_mode, current_turn_index, last_speaker_index')
  .eq('id', conversationId)
  .single();

if (convError) throw convError;

const useEconomyMode = conversation?.economy_mode ?? true;
console.log('💰 Economy Mode:', useEconomyMode ? 'ATTIVO (usa content_summary)' : 'DISATTIVO (usa content completo)');
```

**Nota**: Attualmente NON recupera `riassunto_contesto`

---

### Sezione 2: Prepare Conversation History (righe 298-303)

```typescript
// Prepare conversation history
const conversationHistory = [
  { role: 'system', content: composedPrompt },
  ...historyMessages,
  { role: 'user', content: userMessage }
];
```

**Nota**: Non include il riassunto cumulativo

---

### Sezione 3: Salvataggio Messaggio (righe 500-541)

```typescript
const { data: savedMessage, error: saveError } = await supabaseClient
  .from('chat_laboratory_messages')
  .insert({
    conversation_id: conversationId,
    message_sequence: nextSequence,
    sender_type: selectedParticipant.type,
    sender_name: selectedParticipant.name,
    content: aiResponse,
    token_input: tokenInput,
    token_output: tokenOutput,
    tempo_risposta_ms: responseTime
  })
  .select()
  .single();

if (saveError || !savedMessage) {
  console.error('❌ Errore salvataggio messaggio:', saveError);
  throw new Error('Errore salvataggio messaggio');
}

// Update conversation turn index
await supabaseClient
  .from('chat_laboratory_conversations')
  .update({ 
    last_speaker_index: currentTurnIndex,
    current_turn_index: (currentTurnIndex + 1) % participants.length
  })
  .eq('id', conversationId);

console.log(`✅ Messaggio salvato (ID: ${savedMessage.id}) e turno aggiornato`);

return new Response(
  JSON.stringify({ 
    success: true, 
    content: aiResponse,
    speaker: selectedParticipant.name,
    tokens: { input: tokenInput, output: tokenOutput },
    responseTime,
    messageId: savedMessage.id,
    audioGenerating: voiceEnabled
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

**Nota**: Nessun trigger di auto-summary dopo il salvataggio

---

## 📦 Elementi Utilizzati Correttamente

### ✅ Prompt Sections (BASE, TOPIC, AGENT_PERSONALITY)
- **Righe 154-176**: Fetch BASE sections
- **Righe 164-176**: Fetch TOPIC sections (se `selected_topic` attivo)
- **Righe 264-273**: Fetch AGENT_PERSONALITY sections
- **Righe 276-294**: Composizione finale del prompt

### ✅ Global System Prompt
- **Righe 143-151**: Fetch da `chat_laboratory_system_prompts` con `attivo = true`

### ✅ Economy Mode
- **Righe 185-203**: Applica `content_summary` per messaggi AI (preserva menzioni utente)

---

## ❌ Elementi NON Utilizzati (non implementati in questo sprint)

1. **Knowledge Base**: Nessuna chiamata a `search_kb_documents`
2. **ElevenLabs `text_generation_prompt`**: Non recuperato da `elevenlabs_agents`

---

## 🔄 Edge Functions Correlati

- `generate-chunked-summary` (esistente, usato per generare/aggiornare `riassunto_contesto`)

---

## 📊 Struttura DB Coinvolta

### Tabella: `chat_laboratory_conversations`

**Colonne rilevanti**:
- `riassunto_contesto` (text, nullable) - Summary cumulativo
- `economy_mode` (boolean, default: true)
- `current_turn_index` (integer)
- `last_speaker_index` (integer)

### Tabella: `chat_laboratory_messages`

**Colonne rilevanti**:
- `conversation_id` (uuid)
- `message_sequence` (integer)
- `sender_type` (text)
- `sender_name` (text)
- `content` (text)
- `content_summary` (text, nullable)
- `is_summary_available` (boolean)

---

## 🎯 Obiettivo Post-Modifica

Il sistema dovrà:

1. **Recuperare** `riassunto_contesto` insieme agli altri dati della conversazione
2. **Inserire** il summary nella conversationHistory come messaggio `system` (dopo il prompt, prima degli ultimi messaggi)
3. **Triggerare** automaticamente `generate-chunked-summary` ogni 20 messaggi (chiamata asincrona in background)

**Flusso finale**:
```
[System Prompt] → [Cumulative Summary] → [Last 20 messages] → [New user message] → AI Response → [Trigger: ogni 20 msg → update summary]
```

---

## ⚠️ Note Importanti

- **Nessuna modifica al DB**: Le colonne esistono già
- **Nessuna modifica ad altri edge functions**: Solo `bar-chat-orchestrator/index.ts`
- **Backward compatible**: Se `riassunto_contesto` è null, il sistema continua a funzionare normalmente
- **Non-blocking**: La rigenerazione del summary avviene in background (non blocca la risposta)

---

**Backup creato il**: 2025-10-13  
**Versione corrente**: 557 righe  
**Prossima modifica**: Integrazione punti 1, 2, 3 del piano
