# Chat Laboratory Orchestrator - Documentazione Tecnica

## Panoramica Generale

L'**Orchestrator della Chat Laboratory** è un Edge Function Supabase che gestisce conversazioni multi-agente con AI. Il sistema coordina i turni tra diversi partecipanti AI, costruisce prompt dinamici combinando più fonti di informazione, e instrada le richieste ai provider AI appropriati (Anthropic, OpenAI, Google Gemini).

### Caratteristiche Principali

- **Composizione dinamica dei prompt** da più fonti (sezioni base, personalità agente, topic, Knowledge Base)
- **Gestione intelligente dei turni** con randomizzazione e logica di skip
- **Supporto multi-provider** (Anthropic Claude, OpenAI GPT, Google Gemini)
- **Tracking completo** di token usage e tempi di risposta
- **Sistema di logging** dettagliato per debugging

---

## Sistema di Composizione Prompt Dinamico

Il prompt finale inviato all'AI viene costruito dinamicamente combinando diverse fonti di informazione in un ordine specifico.

### Ordine di Composizione

Il prompt finale viene assemblato nel seguente ordine:

1. **Sezioni Base del Prompt** (`chat_laboratory_prompt_sections`)
2. **Personalità dell'Agente** (`elevenlabs_agents.personality_prompt`)
3. **Obiettivi del Topic** (se un topic è selezionato in bar mode)
4. **Contesto dalla Knowledge Base** (se attiva in bar mode)

### 1. Sezioni Base del Prompt

Le sezioni base vengono caricate da `chat_laboratory_prompt_sections` e filtrate secondo questi criteri:

```typescript
// Query per le sezioni attive
const { data: promptSections } = await supabase
  .from('chat_laboratory_prompt_sections')
  .select('*')
  .eq('is_active', true)
  .order('order_priority', { ascending: true });
```

**Filtri applicati:**
- `is_active = true` (solo sezioni attive)
- Ordinamento per `order_priority` (crescente)
- Se un topic è selezionato, vengono incluse solo sezioni con `topic_tags` vuoto o che contengono il topic corrente

**Struttura della tabella:**
```sql
chat_laboratory_prompt_sections:
  - section_name: TEXT
  - section_type: TEXT ('base', 'topic_specific', 'rules', etc.)
  - content: TEXT (contenuto della sezione)
  - is_active: BOOLEAN
  - order_priority: INTEGER
  - topic_tags: TEXT[] (array di topic)
```

### 2. Personalità dell'Agente

Ogni partecipante AI può avere un prompt personalizzato che definisce il suo ruolo e comportamento:

```typescript
// Recupero della personalità dell'agente
const { data: agentData } = await supabase
  .from('elevenlabs_agents')
  .select('personality_prompt, name')
  .eq('id', participant.elevenlabs_agent_id)
  .single();

if (agentData?.personality_prompt) {
  fullPrompt += `\n\n### TUO RUOLO E PERSONALITÀ:\n${agentData.personality_prompt}`;
}
```

**Struttura personalità agente:**
```sql
elevenlabs_agents:
  - name: TEXT
  - personality_prompt: TEXT
  - response_style: TEXT ('bar_chat', 'formal', etc.)
  - max_words_per_response: INTEGER
```

### 3. Obiettivi del Topic (Bar Mode)

Se un topic è selezionato nella modalità Bar, vengono aggiunti obiettivi specifici:

```typescript
const { data: barMode } = await supabase
  .from('chat_laboratory_bar_mode')
  .select('selected_topic')
  .eq('conversation_id', conversationId)
  .single();

if (barMode?.selected_topic && barMode.selected_topic !== 'none') {
  const topicObjectives = getTopicObjectives(barMode.selected_topic);
  fullPrompt += `\n\n### OBIETTIVI DEL TOPIC "${barMode.selected_topic}":\n${topicObjectives}`;
}
```

**Topic disponibili:**
- `logistica`: Discussioni su trasporti, spedizioni, supply chain
- `medico`: Argomenti medici, sanitari, farmaceutici
- `fiscale`: Tasse, normative fiscali, compliance
- `tecnologia`: IT, software, innovazione digitale
- `legale`: Contratti, normative, questioni legali
- `marketing`: Strategie di marketing, branding, comunicazione
- `finanza`: Investimenti, budget, analisi finanziarie

### 4. Contesto dalla Knowledge Base

Se una Knowledge Base è attiva, viene eseguita una similarity search per trovare documenti rilevanti:

```typescript
const { data: barMode } = await supabase
  .from('chat_laboratory_bar_mode')
  .select('active_kb_id')
  .eq('conversation_id', conversationId)
  .single();

if (barMode?.active_kb_id) {
  // Genera embedding del messaggio utente
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: userMessage
    })
  });

  // Cerca documenti rilevanti
  const { data: relevantDocs } = await supabase.rpc('search_kb_documents', {
    p_kb_id: barMode.active_kb_id,
    p_query_embedding: embedding,
    p_match_threshold: 0.7,
    p_match_count: 3
  });

  // Aggiungi al prompt
  if (relevantDocs && relevantDocs.length > 0) {
    fullPrompt += '\n\n### KNOWLEDGE BASE CONTEXT:\n';
    relevantDocs.forEach(doc => {
      fullPrompt += `\n**${doc.title}**:\n${doc.content}\n`;
    });
  }
}
```

### Esempio di Prompt Finale

```
[SEZIONE BASE: Introduzione]
Sei un assistente AI in una conversazione multi-agente...

[SEZIONE BASE: Regole di conversazione]
- Rispondi in modo conciso...
- Evita ripetizioni...

### TUO RUOLO E PERSONALITÀ:
Sei Marco, un esperto di logistica con 20 anni di esperienza...

### OBIETTIVI DEL TOPIC "logistica":
- Discutere soluzioni ottimizzate per trasporti
- Analizzare costi e tempi di spedizione
- Proporre strategie di supply chain

### KNOWLEDGE BASE CONTEXT:

**Normativa Trasporti 2024**:
Le nuove regolamentazioni europee prevedono...

**Costi Spedizione Internazionale**:
Tabella comparativa dei costi per zona geografica...
```

---

## Gestione Turni

Il sistema di gestione turni determina quale AI deve rispondere e quando deve saltare il suo turno.

### Selezione del Prossimo Speaker

La selezione avviene con questa logica:

1. **Randomizzazione (30%)**: In 30% dei casi viene scelto un partecipante casuale
2. **Rotazione sequenziale (70%)**: Negli altri casi si segue l'ordine basato su `last_speaker_index`

```typescript
const shouldRandomize = Math.random() < 0.3;
let nextIndex;

if (shouldRandomize && participants.length > 1) {
  // Seleziona casualmente, evitando l'ultimo speaker
  const availableIndices = participants.map((_, i) => i).filter(i => i !== lastSpeakerIndex);
  nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
} else {
  // Rotazione sequenziale
  nextIndex = (lastSpeakerIndex + 1) % participants.length;
}
```

### Sistema di Skip Intelligente

La funzione `checkIfShouldSkip()` determina se un AI deve saltare il turno basandosi su:

#### 1. Conversazione troppo corta
```typescript
if (messages.length < 3) {
  return false; // Non skippare se ci sono meno di 3 messaggi
}
```

#### 2. Domanda diretta dall'utente
```typescript
const lastUserMessage = messages.filter(m => m.sender_type === 'user').pop();
if (lastUserMessage?.content.includes('?')) {
  return false; // Non skippare se c'è una domanda
}
```

#### 3. Consenso rilevato
```typescript
const lastMessages = messages.slice(-3);
const agreementPhrases = ['d\'accordo', 'esatto', 'concordo', 'anche io penso'];

const hasConsensus = lastMessages.some(msg => 
  agreementPhrases.some(phrase => msg.content.toLowerCase().includes(phrase))
);

if (hasConsensus) {
  return true; // Skippa se c'è consenso forte
}
```

**Frasi di consenso rilevate:**
- "d'accordo"
- "esatto"
- "concordo"
- "anche io penso"
- "sono d'accordo"
- "hai ragione"

### Aggiornamento dello Speaker Index

Dopo ogni risposta, l'indice viene aggiornato nel database:

```typescript
await supabase
  .from('chat_laboratory_conversations')
  .update({ 
    last_speaker_index: nextIndex,
    updated_at: new Date().toISOString()
  })
  .eq('id', conversationId);
```

---

## Provider AI Supportati

L'orchestrator supporta tre provider AI principali, selezionando automaticamente in base al tipo di partecipante.

### 1. Anthropic (Claude)

**Tipo partecipante:** `anthropic`

**Modelli supportati:**
- `claude-sonnet-4-5` (default)
- `claude-opus-4-1-20250805`
- `claude-sonnet-4-20250514`
- `claude-3-7-sonnet-20250219`

**Chiamata API:**
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: conversationHistory.map(msg => ({
      role: msg.sender_type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    system: fullPrompt
  })
});
```

### 2. OpenAI (GPT)

**Tipo partecipante:** `openai`

**Modelli supportati:**
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4-turbo`

**Chiamata API:**
```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: fullPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ]
  })
});
```

### 3. Google Gemini (via Lovable AI Gateway)

**Tipo partecipante:** `gemini`

**Modelli supportati:**
- `google/gemini-2.5-flash` (default)
- `google/gemini-2.5-pro`
- `google/gemini-2.5-flash-lite`

**Chiamata API:**
```typescript
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: fullPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ]
  })
});
```

**Note su Gemini:**
- Usa Lovable AI Gateway (non API diretta Google)
- Modelli gratuiti fino al 13 Ottobre 2025
- `LOVABLE_API_KEY` è auto-fornito da Supabase

---

## Database Schema

### Tabelle Principali Utilizzate

#### 1. `chat_laboratory_conversations`
Memorizza le conversazioni principali.

```sql
CREATE TABLE chat_laboratory_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo TEXT,
  riassunto_contesto TEXT,
  sistema_prompt_id UUID,
  last_speaker_index INTEGER DEFAULT 0,
  active_participants JSONB DEFAULT '[]',
  conversation_phase TEXT DEFAULT 'discussion',
  response_mode TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `chat_laboratory_messages`
Memorizza tutti i messaggi della conversazione.

```sql
CREATE TABLE chat_laboratory_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_laboratory_conversations(id),
  sender_name TEXT NOT NULL,
  sender_type TEXT NOT NULL, -- 'user', 'anthropic', 'openai', 'gemini'
  content TEXT NOT NULL,
  token_input INTEGER,
  token_output INTEGER,
  tempo_risposta_ms INTEGER,
  is_visible_to_ai BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. `chat_laboratory_participants`
Definisce i partecipanti AI alla conversazione.

```sql
CREATE TABLE chat_laboratory_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_laboratory_conversations(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'anthropic', 'openai', 'gemini'
  system_prompt TEXT,
  role_name TEXT DEFAULT 'Partecipante',
  role_description TEXT,
  is_active BOOLEAN DEFAULT true,
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. `chat_laboratory_prompt_sections`
Contiene le sezioni base del prompt.

```sql
CREATE TABLE chat_laboratory_prompt_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name TEXT NOT NULL,
  section_type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  order_priority INTEGER DEFAULT 0,
  topic_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. `chat_laboratory_bar_mode`
Configurazione della modalità Bar (topic, KB, voice).

```sql
CREATE TABLE chat_laboratory_bar_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_laboratory_conversations(id),
  user_id UUID,
  selected_topic TEXT,
  active_kb_id UUID REFERENCES knowledge_bases(id),
  voice_enabled BOOLEAN DEFAULT false,
  auto_play_audio BOOLEAN DEFAULT true,
  active_elevenlabs_agents UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. `elevenlabs_agents`
Definisce gli agenti ElevenLabs per le risposte vocali.

```sql
CREATE TABLE elevenlabs_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  elevenlabs_agent_id TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  personality_prompt TEXT NOT NULL,
  response_style TEXT DEFAULT 'bar_chat',
  max_words_per_response INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7. `knowledge_base_documents`
Documenti della Knowledge Base per RAG.

```sql
CREATE TABLE knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id UUID REFERENCES knowledge_bases(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Funzioni Database Utilizzate

#### `search_kb_documents()`
Esegue similarity search sulla Knowledge Base.

```sql
CREATE OR REPLACE FUNCTION search_kb_documents(
  p_kb_id UUID,
  p_query_embedding VECTOR,
  p_match_threshold FLOAT,
  p_match_count INTEGER
)
RETURNS TABLE (
  id UUID,
  kb_id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.kb_id,
    d.title,
    d.content,
    1 - (d.embedding <=> p_query_embedding) AS similarity
  FROM knowledge_base_documents d
  WHERE 
    d.kb_id = p_kb_id
    AND 1 - (d.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY similarity DESC
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Variabili d'Ambiente

L'orchestrator richiede le seguenti variabili d'ambiente configurate in Supabase Edge Functions:

### Chiavi API Richieste

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (per GPT e embeddings)
OPENAI_API_KEY=sk-...

# Lovable AI Gateway (auto-fornito)
LOVABLE_API_KEY=auto-generated

# Supabase (auto-forniti)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### Come Configurarle

Le chiavi possono essere configurate tramite:

1. **Supabase Dashboard**:
   - Settings → Edge Functions → Secrets

2. **Supabase CLI**:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase secrets set OPENAI_API_KEY=sk-...
   ```

---

## Logging e Debugging

### Console Logging

L'orchestrator utilizza logging estensivo per debugging:

```typescript
console.log('🎯 Chat Laboratory Orchestrator avviato');
console.log('📋 Prompt sections caricate:', promptSections?.length);
console.log('👤 Agente selezionato:', participant.name);
console.log('📝 Prompt finale lunghezza:', fullPrompt.length);
console.log('⏱️ Tempo risposta:', responseTime, 'ms');
console.log('🔢 Token usati - Input:', inputTokens, 'Output:', outputTokens);
```

### Monitoraggio Edge Function Logs

Per visualizzare i logs in tempo reale:

```bash
# Supabase CLI
supabase functions logs chat-laboratory-orchestrator --tail

# Con filtri
supabase functions logs chat-laboratory-orchestrator --filter "ERROR"
```

### Supabase Dashboard

I logs sono visibili anche nella Dashboard:
- Functions → chat-laboratory-orchestrator → Logs
- Filtri disponibili: Info, Warning, Error
- Ricerca per timestamp, conversation_id

### Tracking Statistiche

Le statistiche vengono salvate in `chat_laboratory_usage_stats`:

```typescript
await supabase.from('chat_laboratory_usage_stats').insert({
  conversation_id: conversationId,
  data_utilizzo: new Date().toISOString().split('T')[0],
  numero_messaggi: 1,
  token_totali_input: inputTokens || 0,
  token_totali_output: outputTokens || 0,
  tempo_totale_ms: responseTime
});
```

---

## Esempi di Utilizzo

### Workflow Completo

#### 1. Inizializzazione Conversazione

```typescript
// Frontend: Crea conversazione
const { data: conversation } = await supabase
  .from('chat_laboratory_conversations')
  .insert({
    titolo: 'Nuova discussione',
    active_participants: [],
    last_speaker_index: 0
  })
  .select()
  .single();

// Aggiungi partecipanti AI
await supabase.from('chat_laboratory_participants').insert([
  {
    conversation_id: conversation.id,
    name: 'Claude',
    type: 'anthropic',
    is_active: true
  },
  {
    conversation_id: conversation.id,
    name: 'GPT',
    type: 'openai',
    is_active: true
  }
]);

// Configura bar mode (opzionale)
await supabase.from('chat_laboratory_bar_mode').insert({
  conversation_id: conversation.id,
  user_id: userId,
  selected_topic: 'logistica',
  active_kb_id: knowledgeBaseId
});
```

#### 2. Invio Messaggio Utente

```typescript
// Frontend: Salva messaggio utente
const { data: userMsg } = await supabase
  .from('chat_laboratory_messages')
  .insert({
    conversation_id: conversationId,
    sender_name: 'Utente',
    sender_type: 'user',
    content: 'Come posso ottimizzare i costi di spedizione?'
  })
  .select()
  .single();

// Chiama orchestrator
const { data, error } = await supabase.functions.invoke(
  'chat-laboratory-orchestrator',
  {
    body: {
      conversationId: conversationId,
      userMessage: 'Come posso ottimizzare i costi di spedizione?',
      participants: [
        { id: '...', name: 'Claude', type: 'anthropic', ... },
        { id: '...', name: 'GPT', type: 'openai', ... }
      ]
    }
  }
);
```

#### 3. Elaborazione Risposta

```typescript
// Orchestrator elabora e restituisce:
{
  success: true,
  message: "Risposta dell'AI salvata con successo",
  messageId: "uuid-del-messaggio",
  participant: "Claude",
  responseTime: 1234,
  tokens: {
    input: 450,
    output: 120
  }
}
```

### Gestione Errori

#### Errore: API Key Mancante

```typescript
if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY non configurata');
  return new Response(
    JSON.stringify({ 
      error: 'Configurazione API mancante',
      details: 'ANTHROPIC_API_KEY non impostata' 
    }),
    { status: 500, headers: corsHeaders }
  );
}
```

#### Errore: Rate Limit

```typescript
if (!aiResponse.ok) {
  if (aiResponse.status === 429) {
    console.error('⚠️ Rate limit raggiunto');
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit raggiunto',
        retryAfter: 60 
      }),
      { status: 429, headers: corsHeaders }
    );
  }
}
```

#### Errore: Database

```typescript
const { data, error } = await supabase
  .from('chat_laboratory_messages')
  .insert(messageData);

if (error) {
  console.error('❌ Errore database:', error);
  return new Response(
    JSON.stringify({ 
      error: 'Errore nel salvare il messaggio',
      details: error.message 
    }),
    { status: 500, headers: corsHeaders }
  );
}
```

---

## Best Practices

### 1. Gestione Token

- Monitora sempre `token_input` e `token_output`
- Imposta limiti ragionevoli (max 4000 token totali)
- Usa `max_tokens` nelle chiamate API per evitare costi eccessivi

### 2. Prompt Engineering

- Mantieni le sezioni base concise e focalizzate
- Usa `order_priority` per controllare la sequenza
- Testa le sezioni singolarmente prima di combinarle

### 3. Performance

- Usa caching per prompt sections statiche
- Limita la cronologia conversazione (ultimi 20 messaggi)
- Implementa timeout sulle chiamate AI (30 secondi)

### 4. Debugging

- Logga sempre il prompt finale completo
- Traccia `conversationId` in tutti i logs
- Salva metadata per ogni risposta AI

---

## Troubleshooting

### Problema: Prompt troppo lungo

**Sintomo:** Errore "context_length_exceeded"

**Soluzione:**
```typescript
// Limita cronologia messaggi
const recentMessages = messages.slice(-20);

// Oppure riduci max_tokens
max_tokens: Math.min(1024, 4096 - estimatedPromptTokens)
```

### Problema: Skip troppo frequente

**Sintomo:** Molti turni vengono skippati

**Soluzione:**
```typescript
// Ajusta soglia consenso
const hasStrongConsensus = lastMessages.filter(msg =>
  agreementPhrases.some(phrase => msg.content.includes(phrase))
).length >= 2; // Richiedi almeno 2 messaggi di consenso
```

### Problema: Knowledge Base non trovata

**Sintomo:** Nessun contesto KB nel prompt

**Soluzione:**
```typescript
// Verifica KB attiva
const { data: kb } = await supabase
  .from('knowledge_bases')
  .select('*')
  .eq('id', kbId)
  .eq('is_active', true)
  .single();

if (!kb) {
  console.warn('⚠️ Knowledge Base non attiva o non trovata');
}
```

---

## Changelog

### v1.0.0 (Attuale)
- Sistema di composizione prompt dinamico
- Supporto multi-provider (Anthropic, OpenAI, Gemini)
- Gestione turni con randomizzazione
- Integrazione Knowledge Base
- Sistema di skip intelligente
- Tracking completo metriche

---

## Riferimenti

- **Edge Function**: `supabase/functions/chat-laboratory-orchestrator/index.ts`
- **Dashboard Logs**: https://supabase.com/dashboard/project/dlldkrzoxvjxpgkkttxu/functions/chat-laboratory-orchestrator/logs
- **API Anthropic**: https://docs.anthropic.com/
- **API OpenAI**: https://platform.openai.com/docs/
- **Lovable AI Gateway**: https://docs.lovable.dev/features/ai
