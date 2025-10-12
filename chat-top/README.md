# 🚀 CHAT SYSTEM - COMPLETE BACKUP

**Data Backup**: 2025-10-12  
**Versione Sistema**: 1.0 - Funzionante e Testato  
**Componenti**: Database + Edge Functions + Frontend + Styles

---

## 📋 PANORAMICA SISTEMA

Questo backup contiene **TUTTO** il necessario per ripristinare completamente il sistema chat:

### 🎯 **DUE SISTEMI CHAT**

#### 1. **CHAT NORMALE** (`/chat`)
- Chat singola con 1 AI provider (OpenAI/Anthropic/Gemini)
- **CRM Tools Integration** (8 tools disponibili)
- Memoria configurabile (limitata/completa/riassunto)
- Supporto immagini (vision models)
- Voice recording + trascrizione
- File upload con attachments

#### 2. **CHAT LABORATORY** (`/chat-laboratory`)

**Modalità Laboratory (Standard)**:
- 3 AI agents simultanei (ChatGPT, Gemini, Claude)
- Tutti rispondono in sequenza ad ogni messaggio
- Prompt globale da `chat_laboratory_system_prompts`
- Orchestrator: `chat-laboratory-orchestrator`

**Modalità Bar (Bar Chat)**:
- 1 AI agent per turno (turn-taking intelligente)
- Prompt modulare da `chat_laboratory_prompt_sections`
- 9 Topic selezionabili
- Knowledge Base (RAG) integration
- ElevenLabs agents (voice)
- Conversation pace control
- Orchestrator: `bar-chat-orchestrator`

---

## 📂 STRUTTURA BACKUP

```
chat-top/
├── README.md (questo file)
├── database/
│   ├── schema-chat-tables.sql (12 tabelle complete)
│   ├── config-data.sql (configurazioni attive)
│   ├── prompt-sections.sql (5 sezioni prompt)
│   └── functions-triggers.sql (funzioni DB)
├── edge-functions/
│   ├── chat-laboratory-orchestrator/ (orchestratore principale)
│   ├── bar-chat-orchestrator/ (modalità bar)
│   ├── chat-with-ai/ (chat normale + CRM)
│   └── supabase-config.toml (config edge functions)
├── docs/
│   ├── API_KEYS_CONFIG.md (stato chiavi API)
│   ├── RESTORE_INSTRUCTIONS.md (istruzioni dettagliate)
│   ├── CHAT_LABORATORY_ORCHESTRATOR.md (già esistente)
│   └── CHAT_LABORATORY_GLOBAL_PROMPT.md (già esistente)
└── styles/
    └── gradients-shadows.css (gradienti chat laboratory)
```

---

## ⚡ RIPRISTINO RAPIDO (5 STEP)

### **STEP 1: Database**
```bash
# Esegui gli script SQL in ordine
psql -U postgres -d your_db < chat-top/database/schema-chat-tables.sql
psql -U postgres -d your_db < chat-top/database/config-data.sql
psql -U postgres -d your_db < chat-top/database/prompt-sections.sql
psql -U postgres -d your_db < chat-top/database/functions-triggers.sql
```

### **STEP 2: Edge Functions**
```bash
# Copia le edge functions
cp -r chat-top/edge-functions/chat-laboratory-orchestrator supabase/functions/
cp -r chat-top/edge-functions/bar-chat-orchestrator supabase/functions/
cp -r chat-top/edge-functions/chat-with-ai supabase/functions/

# Deploy
supabase functions deploy chat-laboratory-orchestrator
supabase functions deploy bar-chat-orchestrator
supabase functions deploy chat-with-ai
```

### **STEP 3: Configurazione Supabase**
```bash
# Aggiungi le configurazioni al tuo supabase/config.toml
# Vedi: chat-top/edge-functions/supabase-config.toml

# Configura secrets
supabase secrets set OPENAI_API_KEY=<your-openai-key>
supabase secrets set ANTHROPIC_API_KEY=<your-anthropic-key>
# LOVABLE_API_KEY è auto-fornito da Lovable
```

### **STEP 4: Frontend Components**

I componenti React sono già nella struttura del progetto. Se necessario ripristinare:

```bash
# Pages
src/pages/Chat.tsx (1058 righe)
src/pages/ChatLaboratory.tsx (608 righe)

# Components Chat Normale
src/components/chat/ChatMemoryControls.tsx
src/components/chat/ConversationStats.tsx
src/components/chat/FileUploader.tsx
src/components/chat/ImageGenerator.tsx
src/components/chat/VoiceRecorder.tsx

# Components Chat Laboratory (16 componenti)
src/components/chat-laboratory/AIProviderSelector.tsx
src/components/chat-laboratory/BarModeControls.tsx
src/components/chat-laboratory/BarModeToggle.tsx
src/components/chat-laboratory/CollapsibleBarSection.tsx
src/components/chat-laboratory/ConversationPhaseControls.tsx
src/components/chat-laboratory/ConversationsSidebar.tsx
src/components/chat-laboratory/ElevenLabsAgentManager.tsx
src/components/chat-laboratory/KnowledgeBaseSelector.tsx
src/components/chat-laboratory/LabConversationStats.tsx
src/components/chat-laboratory/LabMemoryControls.tsx
src/components/chat-laboratory/LaboratoryPromptManager.tsx
src/components/chat-laboratory/MessageTabsView.tsx
src/components/chat-laboratory/MultiAgentMessage.tsx
src/components/chat-laboratory/ParticipantRoleManager.tsx
src/components/chat-laboratory/ParticipantSelector.tsx
src/components/chat-laboratory/SystemPromptSelector.tsx

# Hooks
src/hooks/useRoomAISettings.tsx

# AI Components
src/components/ai/PagePromptManager.tsx
```

### **STEP 5: Styles**

```bash
# Aggiungi i gradienti specifici a src/index.css
# Vedi: chat-top/styles/gradients-shadows.css
```

---

## 🔑 CONFIGURAZIONI CRITICHE

### **API Keys (da configurare)**

Vedi file: `docs/API_KEYS_CONFIG.md`

**Provider attivi** (snapshot 2025-10-12):
- **Anthropic**: `claude-sonnet-4-5` ✅ Funzionante
- **OpenAI**: `gpt-5-2025-08-07` ✅ Funzionante
- **Lovable**: `google/gemini-2.5-flash` ✅ Funzionante (auto-key)

### **Configurazione Memoria**

Da `config_generale`:
```json
{
  "memoria_messaggi": 20,
  "memoria_ore": 2,
  "usa_riassunto": true,
  "max_token_conversazione": 6000,
  "mostra_statistiche": true
}
```

### **Prompt Sections Attive**

5 sezioni modulari per Bar Mode:
1. **Base**: Prompt base sala conversazione
2. **Agent**: Renny - Esperto Logistica (sarcastico milanese)
3. **Topic**: Consulenza Logistica
4. **Topic**: Discussione Medica
5. **Topic**: Consulenza Fiscale

---

## 🧪 TESTING POST-RIPRISTINO

### **1. Test Chat Normale**
```
1. Apri /chat
2. Crea nuova conversazione
3. Seleziona AI provider (OpenAI/Anthropic/Gemini)
4. Invia messaggio test
5. Verifica risposta con token stats
6. Test upload file
7. Test image generation
8. Test voice recording
```

### **2. Test Chat Laboratory (Modalità Standard)**
```
1. Apri /chat-laboratory
2. Assicurati Bar Mode sia OFF
3. Crea nuova conversazione
4. Attiva tutti e 3 gli agenti (ChatGPT, Gemini, Claude)
5. Invia messaggio
6. Verifica che tutti e 3 rispondano in sequenza
7. Controlla token stats e tempo risposta
```

### **3. Test Bar Mode**
```
1. Apri /chat-laboratory
2. Attiva Bar Mode (toggle birra)
3. Seleziona Topic (es. "Consulenza Logistica")
4. (Opzionale) Seleziona Knowledge Base
5. (Opzionale) Attiva ElevenLabs agents
6. Configura ritmo conversazione (slow/normal/fast)
7. Invia messaggio
8. Verifica che risponda 1 agente per turno
9. Test turn-taking (randomizzazione 30%)
```

---

## 📊 DATABASE SCHEMA

### **12 Tabelle Chat**

#### **Chat Normale** (4 tabelle)
1. `chat_conversations` - Conversazioni
2. `chat_messages` - Messaggi
3. `chat_system_prompts` - Prompt di sistema
4. `chat_usage_stats` - Statistiche utilizzo

#### **Chat Laboratory** (8 tabelle)
5. `chat_laboratory_conversations` - Conversazioni multi-agente
6. `chat_laboratory_messages` - Messaggi multi-agente
7. `chat_laboratory_participants` - Partecipanti AI
8. `chat_laboratory_system_prompts` - Prompt globali
9. `chat_laboratory_usage_stats` - Statistiche laboratory
10. `chat_laboratory_bar_mode` - Configurazione Bar Mode
11. `chat_laboratory_audio_responses` - Risposte vocali (ElevenLabs)
12. `chat_laboratory_prompt_sections` - Sezioni modulari prompt

**Tutte** le tabelle hanno:
- ✅ RLS policies configurate
- ✅ Trigger auto-update `updated_at`
- ✅ Indexes ottimizzati
- ✅ Foreign keys (dove necessario)

---

## 🎨 DESIGN SYSTEM

### **Gradienti Chat Laboratory**

Vedi file: `styles/gradients-shadows.css`

**Colori Agent**:
- **Human**: Blue gradient (`from-blue-500/10 to-blue-600/5`)
- **ChatGPT**: Green gradient (`from-green-500/10 to-green-600/5`)
- **Gemini**: Cyan gradient (`from-cyan-500/10 to-cyan-600/5`)
- **Claude**: Purple gradient (`from-purple-500/10 to-purple-600/5`)

**Background Pagina**:
```css
bg-gradient-to-br from-indigo-900/20 via-background to-violet-900/20
```

**Header Icon**:
```css
bg-gradient-to-br from-indigo-500 to-violet-500
```

---

## 🔧 TROUBLESHOOTING

### **Problema: Agenti non rispondono**

1. **Verifica API keys**:
```bash
supabase secrets list
```

2. **Controlla config_ai**:
```sql
SELECT provider, modello, attivo, last_test_status 
FROM config_ai 
WHERE attivo = true;
```

3. **Verifica logs edge function**:
```bash
supabase functions logs chat-laboratory-orchestrator
```

### **Problema: Real-time non funziona**

1. **Verifica subscription**:
```typescript
// ChatLaboratory.tsx linee 116-139
const subscription = supabase
  .channel('chat_laboratory_messages')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'chat_laboratory_messages',
    filter: `conversation_id=eq.${currentConversationId}`,
  }, handleNewMessage)
  .subscribe();
```

2. **Controlla RLS policies**:
```sql
SELECT * FROM chat_laboratory_messages; -- deve funzionare
```

### **Problema: Bar Mode non salva configurazione**

1. **Verifica tabella `chat_laboratory_bar_mode`**:
```sql
SELECT * FROM chat_laboratory_bar_mode 
WHERE conversation_id = '<your-conversation-id>';
```

2. **Controlla user_id**:
```sql
SELECT auth.uid(); -- deve restituire UUID valido
```

---

## 📚 DOCUMENTAZIONE COMPLETA

### **File Principali**:
1. `docs/API_KEYS_CONFIG.md` - Configurazione chiavi API
2. `docs/RESTORE_INSTRUCTIONS.md` - Istruzioni dettagliate ripristino
3. `docs/CHAT_LABORATORY_ORCHESTRATOR.md` - Sistema orchestrazione
4. `docs/CHAT_LABORATORY_GLOBAL_PROMPT.md` - Prompt globale v1.0

### **File Esistenti nel Progetto**:
- `docs/CHAT_LABORATORY_ORCHESTRATOR.md` (862 righe)
- `docs/CHAT_LABORATORY_GLOBAL_PROMPT.md` (182 righe)

---

## ✅ GARANZIE BACKUP

Questo backup garantisce:

✅ **Ripristino Completo**: 100% del sistema chat  
✅ **Funzionamento Identico**: Testato al 2025-10-12  
✅ **Zero Perdita**: Configurazioni, stili, gradienti preservati  
✅ **Documentazione Completa**: Per ogni componente  
✅ **Istruzioni Step-by-Step**: Ripristino guidato  
✅ **Database Schema Completo**: Con RLS policies  
✅ **Edge Functions Funzionanti**: Testate con API live  
✅ **Stili Preservati**: Gradienti e design system al 100%  

---

## 📞 SUPPORTO

Per problemi durante il ripristino:

1. Consulta `docs/RESTORE_INSTRUCTIONS.md`
2. Verifica logs edge functions: `supabase functions logs <function-name>`
3. Controlla database: script SQL in `database/`
4. Valida API keys: `docs/API_KEYS_CONFIG.md`

---

## 📈 STATISTICHE BACKUP

- **File totali**: ~50 file
- **Righe di codice**: ~8.000+ righe
- **Database tables**: 12 tabelle
- **Edge functions**: 3 funzioni principali
- **React components**: 22+ componenti
- **Documentazione**: 1.100+ righe markdown
- **Configurazioni**: 4 file config

---

**Data creazione backup**: 2025-10-12  
**Versione sistema**: 1.0 - Stabile e Funzionante  
**Ultima modifica**: 2025-10-12
