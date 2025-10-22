import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  docType: 'overview' | 'errors' | 'tasks' | 'history';
  format?: 'markdown' | 'json';
}

// 📄 EMBEDDED DOCS - Sync manuale con docs/ai-collaboration/
const EMBEDDED_DOCS = {
  overview: `# TMWE Chat Laboratory - Project Overview

## 🏗️ Technology Stack
- **Frontend**: React, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **UI**: Tailwind CSS, shadcn/ui
- **State Management**: React Query
- **Auth**: Supabase Auth (JWT)

## 🎯 Core Features

### 1. Chat Laboratory
Multi-agent chat system con supporto per ChatGPT, Claude e Gemini.

**Database**:
\`\`\`
chat_laboratory_conversations:
  - id (uuid, PK)
  - user_id (uuid, FK → auth.users)
  - title (text)
  - participants (jsonb) - es. [{"type":"user","name":"User"},{"type":"chatgpt","name":"GPT-4"}]
  - voice_enabled (boolean)
  - created_at, updated_at

chat_laboratory_messages:
  - id (uuid, PK)
  - conversation_id (uuid, FK)
  - participant_type ('user'|'chatgpt'|'claude'|'gemini')
  - participant_name (text)
  - content (text)
  - audio_url (text, nullable) - URL file audio in Supabase Storage
  - created_at

chat_laboratory_bar_mode:
  - id (uuid, PK)
  - conversation_id (uuid, FK, unique)
  - selected_agents (text[]) - es. ['chatgpt', 'gemini']
  - message_order (text) - 'simultaneous' | 'sequential'
  - voice_enabled (boolean)
\`\`\`

**Funzionalità Microfono**:
- \`src/components/chat/VoiceInput.tsx\` - Registrazione audio da browser
- Storage bucket: \`chat-audio\` (file .webm)
- Trascrizione tramite ElevenLabs API

### 2. Visual Composer
Drag & drop UI component editor (WIP).

### 3. Email System
Integrazione con sistema email TMWE esterno tramite Edge Functions:
- \`tmwe-api-proxy\`: Proxy autenticato verso API TMWE
- \`send-email\`: Invio email via TMWE API
- Altri endpoint specifici TMWE

## 🗄️ Database Schema (Sintesi)

### Auth & Users
\`\`\`
auth.users (built-in Supabase)
user_profiles:
  - user_id (uuid, PK)
  - preferred_language (text)
  - tmwe_email (text, unique)
  - created_at, updated_at
\`\`\`

### Chat Laboratory
Vedi sezione precedente.

### Intranet Rooms (AI Chat generico)
\`\`\`
intranet_rooms: stanze chat collaborative
intranet_messages: messaggi dentro stanze
intranet_room_ai_prompts: prompt personalizzati per AI dentro stanze
\`\`\`

## 🔐 Storage Buckets
- \`chat-audio\`: Registrazioni vocali utente (.webm)
- \`chat-audio-responses\`: Risposte vocali AI (.mp3 da ElevenLabs)
- \`visual-composer\`: Asset per Visual Composer
- \`email-attachments\`: Allegati email
- Altri bucket per intranet/knowledge base

## 🔑 Authentication & API Keys
- **Pattern**: JWT auth via Supabase (\`auth.users\`)
- **API Keys** (secrets Supabase):
  - \`OPENAI_API_KEY\`: GPT-4/GPT-5
  - \`ANTHROPIC_API_KEY\`: Claude
  - \`GOOGLE_AI_API_KEY\`: Gemini
  - \`ELEVENLABS_API_KEY\`: Text-to-Speech
  - \`TMWE_API_*\`: Credenziali sistema email TMWE

## ⚙️ Critical Edge Functions

### \`bar-chat-orchestrator\`
Orchestrator principale per AI multi-agente. Gestisce:
- Chiamate parallele/sequenziali a ChatGPT, Claude, Gemini
- Tool calling (lettura docs, propose task)
- Generazione audio con ElevenLabs
- Salvataggio messaggi in DB

**Input**: \`{ conversationId, messageContent, participants, voiceEnabled }\`
**Output**: Array di risposte AI con metadata

### \`chat-laboratory-orchestrator\`
Orchestrator per Chat Laboratory standard (non bar mode).

### \`tmwe-api-proxy\`
Proxy autenticato per chiamate API TMWE esterne.

## 🔄 Key Workflows

### Message Flow (Chat Laboratory)
1. User invia messaggio → \`ChatLaboratory.tsx\`
2. Salva in \`chat_laboratory_messages\` (participant_type='user')
3. Chiama \`bar-chat-orchestrator\` con conversationId
4. Orchestrator:
   - Carica config da \`chat_laboratory_bar_mode\`
   - Chiama AI agents (parallelo/sequenziale)
   - Processa tool calls se presenti
   - Genera audio se \`voiceEnabled=true\`
5. Salva risposte AI in DB
6. Frontend aggiorna UI con React Query

### Error Flow (AI Collaboration)
1. Runtime error catturato da error boundary
2. Log in \`docs/ai-collaboration/errors-log.json\` (via edge function)
3. AI legge errors via tool \`read_lovable_docs\`
4. AI propone fix via tool \`propose_lovable_task\`
5. User approva → Lovable implementa

## 📝 Recent Changes
- **2025-01-21**: Implementato sistema AI collaboration docs
- **2025-01-20**: Rollback refactoring Chat Laboratory (commit 71e21ed)

## ⚠️ Known Issues

### High Priority
- Bar mode: Agenti AI non ricevono correttamente il context della conversazione
- Tool calling: \`get-ai-docs\` restituisce 404 (docs non accessibili da edge function)

### Medium Priority
- ChatLaboratory.tsx: \`currentPrompt\` state declared but never set (line 92)
- Performance: Nessun lazy loading componenti pesanti`,

  errors: JSON.stringify({
    "lastUpdate": "2025-01-21T00:00:00Z",
    "buildErrors": [],
    "runtimeErrors": [],
    "warnings": [],
    "performance": {
      "slowComponents": [],
      "memoryLeaks": [],
      "unusedCode": [
        {
          "file": "ChatLaboratory.tsx",
          "line": 92,
          "issue": "currentPrompt state declared but never set",
          "severity": "low",
          "lovableGenerated": true
        }
      ]
    },
    "statistics": {
      "totalErrors": 0,
      "fixedToday": 0,
      "avgResolutionTime": "N/A"
    }
  }, null, 2),

  tasks: `# 🤖 AI Tasks Queue

> **Workflow**: AI propone task → Utente approva → Lovable implementa → Task marcato completato

---

## 🔴 ALTA PRIORITÀ

*Nessun task in coda*

---

## 🟡 MEDIA PRIORITÀ

*Nessun task in coda*

---

## 🟢 BASSA PRIORITÀ

*Nessun task in coda*

---

## ✅ COMPLETATI

*Cronologia task completati apparirà qui*

---

## 📊 Statistiche
- **Proposti**: 0
- **In Progress**: 0
- **Completati**: 0
- **Tempo medio completamento**: N/A`,

  history: `# 📝 Change History

> **Formato**: [Data] [Autore] [Tipo] [File] - Descrizione

---

## 2025-01-21

### Sistema Collaborazione AI
- **Autore**: Lovable AI
- **File**: \`/docs/ai-collaboration/*\`, edge functions
- **Tipo**: Nuova feature
- **Dettagli**: Implementato sistema documentazione automatica per collaborazione AI multi-agente

---

## 2025-01-20

### 14:30 - Rollback Refactoring
- **Autore**: Utente (manuale)
- **Commit**: \`71e21ed\`
- **File**: Vari componenti Chat Laboratory
- **Tipo**: Rollback
- **Motivo**: Refactoring Lovable ha causato bug tab switching e altre rotture

---

*Auto-generato da Git log via GitHub Action*`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AUTH: Verifica Service Role Key (chiamate interne) o JWT utente
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // ✅ Accetta service role key (chiamate interne da orchestrator)
    const isServiceRole = token === serviceRoleKey;
    
    if (isServiceRole) {
      console.log(`✅ Service role access (internal call)`);
    } else {
      // Verifica JWT utente
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error('❌ Auth error:', authError);
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`✅ User ${user.email} requesting AI docs`);
    }

    // Parse request
    const { docType, format } = await req.json() as RequestBody;

    // Valida docType
    if (!EMBEDDED_DOCS[docType]) {
      return new Response(JSON.stringify({ error: 'Invalid docType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ottieni content da embedded docs
    const content = EMBEDDED_DOCS[docType];
    
    console.log(`📄 Serving ${docType} doc (${content.length} chars) from embedded`);

    // Ritorna content (JSON auto-parsed se .json)
    const responseData = docType === 'errors' ? JSON.parse(content) : content;

    return new Response(JSON.stringify({ 
      docType, 
      content: responseData,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('🔥 Error in get-ai-docs:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
