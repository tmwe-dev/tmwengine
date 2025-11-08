# Brain System - Multi-Agent Collaborative Debugging

## Overview
Brain è un sistema avanzato di analisi codice che utilizza 3 AI (Gemini, GPT, Claude) per discutere collaborativamente e raggiungere consensus su refactoring e debugging.

## Architettura

### Pattern Radio Chat Orchestrator
Il sistema Brain replica il meccanismo di **Radio Chat Orchestrator** dove gli AI discutono sequenzialmente:

✅ **Sequential Agent Calls:** Loop `for` invece di `Promise.all`  
✅ **Context Cumulative:** Ogni AI vede risposte precedenti via contesto cumulativo  
✅ **System Prompt Dynamic:** Inject personalità + contesto round  
✅ **Database Persistence:** Salva ogni risposta in `brain_ai_tasks`  
✅ **Frontend Polling:** Aggiorna UI ogni 2s via `useQuery` con `refetchInterval`  
✅ **Multi-Round Logic:** Outer loop per rounds, inner loop per agents  
✅ **Pause Between Calls:** 300ms tra agents, 500ms tra rounds  

### Innovazioni Brain-Specific

🧠 **Technical Context Injection:** Dati da `brain_function_analysis` nel prompt  
🧠 **Round-Aware Prompts:** Obiettivi diversi per round 1 vs ultimo round  
🧠 **Consensus Calculation:** Analisi keyword comuni + sintesi finale  

## Componenti

### 1. Brain Dashboard (`/brain`)
- Metriche globali (funzioni totali, % duplicati, % condivise, heavy functions)
- Quick actions: Scan Codebase, Export Report, AI Analysis
- Navigazione verso Orchestrator, Function Tree, Chat Brain

### 2. AI Orchestrator (`/brain/orchestrator`)
- Selezione 1-3 agenti AI (Gemini, GPT, Claude)
- Configurazione numero di round (2-4)
- Input task tecnico
- Live discussion view con polling real-time
- Consensus view finale con keyword comuni

### 3. Function Tree (`/brain/function-tree`)
- Visualizzazione albero funzioni da `brain_function_analysis`
- Evidenzia: duplicati (🔴), condivise (🟠), pesanti (🟣)
- Click su funzione → dettagli (LOC, complexity, references)

### 4. Chat Brain (`/brain/chat`)
- Chat singola con AI selezionabile
- Context pre-caricato da `brain_function_analysis`
- Risposta immediata con suggerimenti tecnici

## Database

### `brain_ai_tasks`
Tabella principale per gestire task multi-round collaborativi.

```sql
CREATE TABLE brain_ai_tasks (
  id uuid PRIMARY KEY,
  conversation_id uuid REFERENCES chat_laboratory_conversations,
  round_number integer DEFAULT 1,
  task_type text NOT NULL,
  input_data jsonb NOT NULL,
  
  -- AI Agent info
  assigned_agent text NOT NULL,
  agent_order integer NOT NULL,
  
  -- Execution state
  status text DEFAULT 'queued',
  
  -- Results
  output_data jsonb,
  error_message text,
  
  -- Context cumulativo
  previous_responses jsonb,
  
  -- Metadata
  user_id uuid,
  created_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer
);
```

### `brain_function_analysis`
Metadata funzioni analizzate (già esistente):
- `function_name`, `file_path`
- `loc`, `cyclomatic_complexity`
- `is_duplicate`, `is_heavy`, `is_shared`
- `content_hash`, `references`

### `brain_code_scans`
Storico scan codebase (già esistente):
- `scan_type`, `files_scanned`
- `functions_found`, `duplicates_detected`
- `started_at`, `completed_at`, `status`

## Edge Functions

### `brain-ai-orchestrator`
Gestisce discussione multi-round sequenziale.

**Input:**
```typescript
{
  conversation_id: string,
  task: string,
  agents: string[], // ['gemini', 'chatgpt', 'claude']
  rounds: number,   // 2-4
  technical_context: {
    duplicates_count: number,
    heavy_count: number,
    shared_count: number
  }
}
```

**Workflow:**
1. Outer loop: iterare su `rounds`
2. Inner loop: iterare su `agents` sequenzialmente
3. Per ogni agente:
   - Crea task record in `brain_ai_tasks`
   - Build prompt con context precedente + round corrente
   - Chiamata AI (Gemini/GPT/Claude)
   - Salva risposta in DB
   - Pause 300ms
4. Pause 500ms tra round

### `brain-chat-assistant`
Single-agent chat con context tecnico.

**Input:**
```typescript
{
  conversation_id: string,
  user_message: string,
  technical_context: {
    duplicates: Array<{function, file, duplicate_of}>,
    heavy_functions: Array<{function, complexity, loc}>,
    shared_functions: Array<{function, share_count}>
  },
  selected_agent: 'gemini' | 'chatgpt' | 'claude'
}
```

**Output:**
```typescript
{
  response: string
}
```

## Workflow Utente

### Scenario 1: Multi-Round Collaborative Debug
1. Dashboard → AI Orchestrator
2. Seleziona 3 AI (Gemini, GPT, Claude)
3. Imposta 2 round
4. Task: "Analizza duplicati in src/hooks/"
5. Avvia discussione
6. Visualizza 6 chiamate totali (3 AI × 2 round)
7. Consensus finale con keyword comuni

### Scenario 2: Quick Chat con Context
1. Dashboard → Chat Brain
2. Chiedi: "Trova funzioni duplicate in useEmailSync"
3. Risposta immediata con context da `brain_function_analysis`

### Scenario 3: Visual Analysis
1. Dashboard → Function Tree
2. Click "Scan Codebase"
3. Visualizza duplicati/heavy/shared
4. Click su funzione → dettagli

## Meccanismo Consensus

### Round 1: Analisi Iniziale
Ogni AI fornisce osservazioni tecniche indipendenti basate su:
- Dati da `brain_function_analysis`
- Task description
- Nessun contesto precedente

### Round 2+: Discussione Collaborativa
Ogni AI vede:
- **Round precedente:** tutte le risposte del round N-1
- **Round corrente:** risposte degli agenti che hanno già parlato in questo round

Prompt include:
```
ROUND 1 - RISPOSTE PRECEDENTI:
**GEMINI:** [risposta round 1]
**GPT:** [risposta round 1]
**CLAUDE:** [risposta round 1]

ROUND 2 - RISPOSTE ATTUALI:
**GEMINI:** [appena data]

OBIETTIVO: Ultimo round. Proposta finale concreta.
```

### Consensus Finale
Algoritmo semplice:
1. Estrai keyword comuni (lunghezza >5, appaiono ≥2 volte)
2. Mostra badge con keyword condivise
3. Display proposte finali di tutti gli agenti

## Costi Stimati

Assumendo Lovable AI:
- Gemini 2.5 Flash × 2 round = Gratis
- GPT-5 Mini × 2 round = ~$0.002
- Claude Sonnet 4.5 × 2 round = ~$0.006

**Totale per discussione:** ~$0.008 (< 1 centesimo)

Per 100 discussioni/giorno: ~$24/mese

## Testing

### Test Completo Workflow
```bash
# 1. Scan codebase
curl -X POST /functions/v1/brain-code-scanner \
  -d '{"files": ["src/hooks/*.ts"]}'

# 2. Verifica DB
SELECT * FROM brain_function_analysis LIMIT 10;

# 3. Avvia discussione
curl -X POST /functions/v1/brain-ai-orchestrator \
  -d '{
    "conversation_id": "...",
    "task": "Analizza duplicati",
    "agents": ["gemini", "chatgpt", "claude"],
    "rounds": 2
  }'

# 4. Verifica tasks
SELECT * FROM brain_ai_tasks WHERE conversation_id = '...';
```

### RLS Verification
```sql
-- Testare che user veda solo propri task
SELECT * FROM brain_ai_tasks WHERE user_id = auth.uid();
```

## Documentazione Tecnica

- **Radio Chat Orchestrator:** `supabase/functions/radio-chat-orchestrator/index.ts`
- **Prompt Builder:** `supabase/functions/bar-chat-orchestrator/lib/prompt-builder.ts`
- **AI Providers:** `supabase/functions/radio-chat-orchestrator/lib/ai-providers.ts`

## Limitazioni Conosciute

⚠️ **Token cost:** Discussioni lunghe (4 round × 3 AI) possono generare ~$0.015  
⚠️ **Latency:** Sequential calls = 3-4 secondi per round  
⚠️ **Context window:** Prompt + history + responses ≤ 8K tokens  

## Future Enhancements

🚀 Tool calling per `analyze_function`, `find_duplicates`  
🚀 Audio TTS per risposte AI (ElevenLabs integration)  
🚀 Knowledge graph visualization per dependencies  
🚀 Auto-refactor con apply changes button  

---

**Versione:** 1.0  
**Last Updated:** 2025-01-29  
**Maintainer:** TMWEngine Development Team
