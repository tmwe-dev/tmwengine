# 🏗️ Project Overview - TMWE Chat Laboratory
*Auto-generato: 2025-01-21T00:00:00Z*

## 📊 Stack Tecnologico
- **Frontend**: React 18.3.1, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **UI**: Tailwind CSS + shadcn/ui
- **State Management**: React Query (@tanstack/react-query)
- **Auth**: Supabase Auth (JWT)

## 🎯 Funzionalità Principali

### 1. Chat Laboratory Multi-Agente
**Path**: `/chat-laboratory`  
**Componente**: `src/pages/ChatLaboratory.tsx`

**Descrizione**: Sistema di chat collaborativa con 3 AI simultanei:
- **ChatGPT** (OpenAI GPT-5 via Lovable AI Gateway)
- **Claude** (Anthropic Claude Sonnet 4.5)
- **Gemini** (Google Gemini via Lovable AI Gateway)

**Edge Function**: `bar-chat-orchestrator` (verify_jwt=true)

**Tabelle DB**:
- `chat_laboratory_conversations` - Conversazioni principali
- `chat_laboratory_messages` - Messaggi multi-agente
- `chat_laboratory_bar_mode` - Configurazioni Bar Mode
- `chat_laboratory_system_prompts` - Prompt personalizzati

**Microfoni**:
- `VoiceRecorder` (PTT - Push To Talk)
- `BarVoiceRecorder` (Bar Mode compatto)
- `BarVoiceRecorderV2_Hybrid` (Ibrido, attualmente disabilitato)

### 2. Visual Composer
**Path**: `/visual-composer`  
**Componente**: `src/pages/VisualComposer.tsx`

**Descrizione**: Editor drag-and-drop per componenti UI.

### 3. Sistema Email (TMWE Integration)
**Edge Functions**: `tmwe-email-*` (18 funzioni)  
**Pattern Auth**: JWT + Bearer token TMWE esterno

## 🗄️ Database Schema Principale

```sql
-- Conversazioni Chat Lab
chat_laboratory_conversations (
  id UUID PRIMARY KEY,
  titolo TEXT,
  created_at TIMESTAMPTZ,
  economy_mode BOOLEAN DEFAULT true
)

-- Messaggi Multi-Agente
chat_laboratory_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES chat_laboratory_conversations,
  sender_name TEXT, -- 'ChatGPT' | 'Claude' | 'Gemini' | 'Tu'
  content TEXT,
  audio_url TEXT NULLABLE,
  created_at TIMESTAMPTZ
)

-- Configurazione Bar Mode
chat_laboratory_bar_mode (
  conversation_id UUID PRIMARY KEY REFERENCES chat_laboratory_conversations,
  voice_enabled BOOLEAN DEFAULT false,
  conversation_pace TEXT, -- 'fast' | 'normal' | 'deep'
  conversation_style TEXT -- 'colleagues' | 'formal' | 'casual'
)
```

## 📦 Storage Buckets
- `import-files` (pubblico) - File importazione
- `chat-attachments` (pubblico) - Allegati chat
- `audio-responses` (pubblico) - Audio generati ElevenLabs
- `chat-deliverables` (privato) - Deliverable conversazioni
- `chat-laboratory` (pubblico) - Thumbnail/preview
- `ai-collaboration-docs` (privato) - Documenti collaborazione AI

## 🔐 Autenticazione & API Keys

### Pattern JWT (20+ edge functions)
```typescript
const token = req.headers.get('Authorization')?.replace('Bearer ', '');
const { data: { user } } = await supabase.auth.getUser(token);
if (!user) throw new Error('Unauthorized');
```

### API Keys Locazione
| Provider | Sorgente | Header |
|----------|----------|--------|
| Anthropic | `config_ai` table | `x-api-key` |
| OpenAI | `config_ai` table | `Authorization: Bearer` |
| Lovable | `LOVABLE_API_KEY` secret | `Authorization: Bearer` |
| ElevenLabs | `config_ai` table | `xi-api-key` |

## 🚀 Edge Functions Critiche

### `bar-chat-orchestrator` (verify_jwt=true)
**Path**: `supabase/functions/bar-chat-orchestrator/index.ts`  
**Scopo**: Orchestrazione sequenziale chiamate AI (Gemini → ChatGPT → Claude)  
**Input**: `{ conversationId, userMessage, participants }`  
**Output**: Array risposte AI + telemetria + audio URLs

### `chat-laboratory-orchestrator` (verify_jwt=true)
**Path**: `supabase/functions/chat-laboratory-orchestrator/index.ts`  
**Scopo**: Orchestrazione modalità Laboratory (più verbosa)

### `tmwe-api-proxy` (verify_jwt=false - webhook esterno)
**Path**: `supabase/functions/tmwe-api-proxy/index.ts`  
**Scopo**: Proxy chiamate API TMWE (sistema email esterno)

## 🔄 Flussi Chiave

### Flusso Messaggio Chat Laboratory
1. Utente invia messaggio (voice/text) → `ChatLaboratory.tsx:handleSendMessage()`
2. Salva in DB (`chat_laboratory_messages`) con `sender_name='Tu'`
3. Chiama `bar-chat-orchestrator` edge function
4. Orchestrator chiama sequenzialmente:
   - Gemini (via Lovable AI Gateway)
   - ChatGPT (via Lovable AI Gateway)
   - Claude (via Anthropic API diretta)
5. Ogni risposta AI:
   - Salvata in DB
   - Audio generato (se `voice_enabled=true`) via ElevenLabs
   - Uploadato in `audio-responses` bucket
6. Real-time subscription aggiorna UI
7. Tab switching automatico al termine audio

### Flusso Error Handling (NUOVO - Sistema Collaborazione AI)
1. ErrorBoundary rileva errore → Chiama `log-error` edge function
2. `log-error` aggiorna `errors-log.json`
3. AI esterni leggono via `get-ai-docs` tool calling
4. AI propongono fix via `manage-ai-tasks`
5. Utente approva task manualmente
6. Lovable implementa → Task marcato completato

---

## 📝 Modifiche Recenti (Ultima settimana)

### 2025-01-21 - Sistema Collaborazione AI
- **File**: `/docs/ai-collaboration/*`, nuove edge functions
- **Tipo**: Nuova feature
- **Dettaglio**: Sistema documentazione automatica per collaborazione tra Lovable e AI esterni (ChatGPT, Claude, Gemini)

### 2025-01-20 - Rollback Refactoring
- **File**: Vari componenti Chat Laboratory
- **Tipo**: Rollback
- **Motivo**: Refactoring ha causato bug tab switching

---

## 🐛 Problemi Noti

### ALTA Priorità
1. **Variabile `currentPrompt` inutilizzata** (`ChatLaboratory.tsx:92`)
2. **Duplicato `previousMessagesLengthRef`** (`ChatLaboratory.tsx:177` vs `useTabSwitching.ts:30`)

### MEDIA Priorità
1. **47 console.log attivi** in vari componenti
2. **Nessun error boundary** per logging errori (IN IMPLEMENTAZIONE)

---

*Ultimo aggiornamento: 2025-01-21T00:00:00Z*  
*Generato automaticamente da GitHub Action*
