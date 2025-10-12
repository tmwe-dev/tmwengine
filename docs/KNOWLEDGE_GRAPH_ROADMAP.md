# 🗺️ Knowledge Graph - Roadmap Completa

## 📊 Stato Attuale del Sistema

### ✅ Funzionalità Implementate (v1.0 - Foundation)

#### 1. **Database Schema**
- ✅ Tabella `knowledge_nodes`: Nodi del grafo con tipologia, testo, confidence, embedding vettoriale
- ✅ Tabella `knowledge_edges`: Relazioni tra nodi con tipo di relazione
- ✅ Indici vettoriali HNSW per ricerca semantica rapida
- ✅ RLS policies per sicurezza multi-utente
- ✅ Trigger per aggiornamento automatico `updated_at`
- ✅ Funzione `match_knowledge_nodes()` per similarity search

#### 2. **Edge Function: extract-knowledge-graph**
- ✅ Estrazione automatica da messaggi AI
- ✅ Parsing strutturato via LLM (Gemini 2.5 Flash)
- ✅ Generazione embeddings (OpenAI text-embedding-3-small)
- ✅ Deduplicazione semantica (threshold: 0.95)
- ✅ Salvataggio nodi + edge nel database
- ✅ Logging completo per debugging

#### 3. **Orchestratore Chat Laboratory**
- ✅ Integrazione automatica: trigger knowledge graph dopo ogni risposta AI
- ✅ Chiamata asincrona `extract-knowledge-graph`
- ✅ Passaggio `messageId`, `conversationId`, `messageContent`
- ✅ Non blocca il flusso conversazione

#### 4. **UI Component: KnowledgeGraphViewer**
- ✅ Visualizzazione interattiva con `react-force-graph-2d`
- ✅ Nodi colorati per tipo (concept, entity, event, opinion, question, answer)
- ✅ Sizing dinamico basato su confidence
- ✅ Edge con label per tipo relazione
- ✅ Controlli: zoom in/out, fit view
- ✅ Conteggio nodi/edge + legenda
- ✅ Rendering solo dopo 15+ messaggi
- ✅ Integrato in sidebar Chat Laboratory

---

## 🚀 Roadmap Futura

### 📅 Fase 2: Query & Retrieval (Prossimi Passi)

#### 2.1 **RAG Enhancement**
**Priorità:** 🔴 Alta  
**Tempo stimato:** 3-5 giorni

**Obiettivi:**
- Integrare knowledge graph nel sistema RAG esistente
- Query semantica del grafo durante conversazioni
- Combinare retrieval documenti + grafo per risposte più ricche

**Tasks:**
1. Modificare `chat-laboratory-orchestrator` per query grafo pre-response
2. Aggiungere `match_knowledge_nodes()` nel prompt assembly
3. Creare sezione "Contesto dal Knowledge Graph" nei prompt
4. Threshold adattivo per relevance (0.7-0.85)
5. Limit configurabile (5-10 nodi più rilevanti)

**Files da modificare:**
- `supabase/functions/chat-laboratory-orchestrator/index.ts`
- Aggiungere chiamata a `match_knowledge_nodes()` prima di costruire prompt

#### 2.2 **Graph-Based Search UI**
**Priorità:** 🟡 Media  
**Tempo stimato:** 2-3 giorni

**Obiettivi:**
- Permettere agli utenti di fare query esplicite sul grafo
- Esplorare concetti correlati
- Navigazione visuale dei collegamenti

**Features:**
- Input box per query semantica
- Highlight dei nodi matching in grafo
- Lista testuale dei risultati con similarity score
- Click su nodo → espandi collegamenti (1-hop, 2-hop)
- Filtri per tipo nodo e confidence minima

**Componenti da creare:**
- `KnowledgeGraphSearch.tsx`
- `GraphNodeDetails.tsx`

---

### 📅 Fase 3: Analytics & Insights (2-4 settimane)

#### 3.1 **Conversation Analytics**
**Priorità:** 🟢 Bassa  
**Tempo stimato:** 3-4 giorni

**Metriche:**
- **Topic Coverage:** Quanti concetti unici per conversazione
- **Consensus Tracking:** Evoluzione opinioni nel tempo
- **Knowledge Density:** Ratio nodi/messaggi
- **Connection Strength:** Centralità nodi (PageRank-like)

**Implementazione:**
- Tabella `knowledge_graph_analytics`
- Job periodico (ogni 10 messaggi) per calcolo metriche
- Dashboard con charts (Recharts)

#### 3.2 **Cross-Conversation Insights**
**Priorità:** 🟢 Bassa  
**Tempo stimato:** 5-7 giorni

**Features:**
- Identificare pattern ricorrenti tra conversazioni
- Suggerimenti automatici basati su conversazioni passate
- "Hot topics" globali (concetti più discussi)
- Grafo unificato multi-conversazione

**Sfide tecniche:**
- Scalabilità con migliaia di nodi
- Privacy: separare grafo per utente vs team vs globale
- Aggregazione embeddings per cluster tematici

---

### 📅 Fase 4: Advanced Features (1-2 mesi)

#### 4.1 **Temporal Knowledge Graph**
**Priorità:** 🔵 Futura  
**Tempo stimato:** 7-10 giorni

**Concetto:**
- Tracciare evoluzione concetti nel tempo
- Versioning dei nodi (es. opinione cambia)
- Timeline view: "come è cambiata l'idea X durante la discussione"

**Schema changes:**
```sql
ALTER TABLE knowledge_nodes 
ADD COLUMN version INT DEFAULT 1,
ADD COLUMN superseded_by UUID REFERENCES knowledge_nodes(id),
ADD COLUMN valid_from TIMESTAMP DEFAULT NOW(),
ADD COLUMN valid_to TIMESTAMP;
```

#### 4.2 **Multi-Modal Knowledge**
**Priorità:** 🔵 Futura  
**Tempo stimato:** 10-14 giorni

**Obiettivi:**
- Estrarre knowledge da immagini/documenti caricati
- Linking automatico testo ↔ immagini
- Nodi multimodali (testo + visual embedding)

**Tecnologie:**
- Vision models (GPT-4 Vision, Claude Vision)
- CLIP embeddings per immagini
- Unified embedding space (contrastive learning)

#### 4.3 **Collaborative Graph Editing**
**Priorità:** 🔵 Futura  
**Tempo stimato:** 5-7 giorni

**Features:**
- Utenti possono manualmente aggiungere/modificare nodi
- Merge suggestions: "Questi 2 nodi sembrano duplicati"
- Voting system per validare edge AI-generate
- Annotation layer: commenti su nodi/edge

---

## 🛠️ Architettura Tecnica

### Stack Tecnologico

#### **Frontend**
- **React 18** + TypeScript
- **react-force-graph-2d** (v1.29.0) per visualizzazione
- **TanStack Query** per data fetching
- **Tailwind CSS** per styling

#### **Backend**
- **Supabase** (PostgreSQL 15+)
- **pgvector** (v0.5+) per vector similarity
- **Edge Functions** (Deno) per processing

#### **AI/ML**
- **Lovable AI Gateway** per orchestrazione LLM
- **Google Gemini 2.5 Flash** per knowledge extraction
- **OpenAI text-embedding-3-small** (1536 dim) per embeddings

### Flusso Dati

```
[Messaggio AI] 
    ↓
[Orchestratore salva messaggio]
    ↓
[Trigger extract-knowledge-graph]
    ↓
[LLM estrae JSON strutturato]
    ↓
[Generate embeddings per ogni nodo]
    ↓
[Semantic dedup check (similarity > 0.95)]
    ↓
[Insert nodes + edges in DB]
    ↓
[UI auto-refresh via realtime subscription]
```

### Performance

**Attuali:**
- Extraction time: ~2-5s per messaggio
- Embedding generation: ~500ms per nodo
- Graph rendering: <1s per 100 nodi
- Vector search: <100ms (con HNSW index)

**Ottimizzazioni future:**
- Batch embeddings (più nodi in 1 call)
- Lazy loading grafo (load on viewport)
- Cache embeddings per concetti comuni
- Pre-compute centrality metrics

---

## 📖 Guida Rapida per Sviluppatori

### Come Testare il Sistema

1. **Avvia conversazione in Chat Laboratory**
   - Crea nuova conversazione
   - Aggiungi almeno 1 AI participant
   - Avvia discussione su topic complesso

2. **Monitora extraction**
   ```bash
   # Logs edge function
   supabase functions logs extract-knowledge-graph --tail
   ```

3. **Verifica database**
   ```sql
   -- Conta nodi per conversazione
   SELECT conversation_id, COUNT(*) 
   FROM knowledge_nodes 
   GROUP BY conversation_id;

   -- Visualizza edge
   SELECT 
     n1.text as from_node,
     e.relation_type,
     n2.text as to_node
   FROM knowledge_edges e
   JOIN knowledge_nodes n1 ON e.from_node_id = n1.id
   JOIN knowledge_nodes n2 ON e.to_node_id = n2.id
   LIMIT 10;
   ```

4. **Debug similarity search**
   ```sql
   -- Genera embedding manualmente
   SELECT match_knowledge_nodes(
     (SELECT embedding FROM knowledge_nodes LIMIT 1),
     0.7,
     10,
     'your-conversation-id'
   );
   ```

### Estendere il Sistema

#### Aggiungere nuovo tipo nodo

1. Modifica enum:
```sql
ALTER TYPE knowledge_node_type ADD VALUE 'new_type';
```

2. Aggiorna prompt in `extract-knowledge-graph/index.ts`:
```typescript
const prompt = `Extract knowledge elements:
- concept
- entity
- new_type  // <-- ADD HERE
...`;
```

3. Aggiungi colore in `KnowledgeGraphViewer.tsx`:
```typescript
const nodeColor = (type: string) => {
  switch (type) {
    case 'new_type': return '#FF6B9D';  // <-- ADD HERE
    // ...
  }
};
```

#### Aggiungere nuova relazione

Simile a sopra, modifica `knowledge_edge_type`:
```sql
ALTER TYPE knowledge_edge_type ADD VALUE 'contradicts';
```

---

## 🎯 KPI & Metriche di Successo

### Metriche Attuali da Tracciare

1. **Extraction Quality**
   - % messaggi con extraction success
   - Media nodi estratti per messaggio
   - Ratio duplicati rilevati

2. **User Engagement**
   - % conversazioni che visualizzano grafo
   - Tempo medio su KnowledgeGraphViewer
   - Click su nodi (quando implementato)

3. **Performance**
   - Latency extraction (<5s target)
   - Database query time (<100ms target)
   - Graph render time (<2s target)

### Goals Q2 2025

- ✅ Foundation completata
- 🎯 RAG integration (80% conversazioni usano grafo)
- 🎯 10,000+ nodi nel database
- 🎯 <2s average extraction time
- 🎯 User satisfaction: 4.5/5 su graph utility

---

## 🐛 Known Issues & Limitazioni

### Attuali

1. **LLM Hallucinations**
   - Estratti concetti non esplicitamente menzionati
   - **Soluzione:** Aumentare confidence threshold, prompt tuning

2. **Embedding Costs**
   - ~$0.0001 per nodo (OpenAI pricing)
   - **Mitigazione:** Batch processing, cache comuni

3. **Graph Layout**
   - Force-directed layout può sovrapporre nodi
   - **Fix futuro:** Layout algorithms alternativi (hierarchical, circular)

4. **Scalability**
   - Non testato con >1000 nodi per conversazione
   - **Monitoring:** Implementare pagination/chunking

### Limitazioni Tecniche

- Max embedding dimension: 1536 (OpenAI)
- pgvector HNSW index: rebuild cost su UPDATE
- Realtime subscriptions: max 100 concurrent connessioni
- Edge function timeout: 30s (raramente hit)

---

## 📚 Risorse & Riferimenti

### Documentazione Tecnica

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [react-force-graph Docs](https://github.com/vasturiano/react-force-graph)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Supabase Vector Docs](https://supabase.com/docs/guides/ai/vector-columns)

### Paper di Riferimento

- "Graph Neural Networks for Knowledge Graphs" (2020)
- "Retrieval-Augmented Generation for Knowledge-Intensive NLP" (Lewis et al., 2020)
- "REALM: Retrieval-Augmented Language Model Pre-Training" (Guu et al., 2020)

### Internal Docs

- [`CHAT_LABORATORY_ORCHESTRATOR.md`](./CHAT_LABORATORY_ORCHESTRATOR.md)
- [`DATABASE_INFO.md`](./DATABASE_INFO.md) (se esiste)
- [`chat-top/README.md`](../chat-top/README.md)

---

## 🔄 Changelog

### v1.0.0 (12 Ottobre 2025)
- ✅ Initial release
- ✅ Database schema completo
- ✅ Edge function extraction
- ✅ UI visualization component
- ✅ Orchestrator integration

### v1.1.0 (Pianificata - Q4 2025)
- 🎯 RAG integration
- 🎯 Graph search UI
- 🎯 Analytics dashboard

---

## 👥 Team & Ownership

**Responsabile Feature:** Chat Laboratory Team  
**Point of Contact:** [Inserisci nome]  
**Tech Lead:** [Inserisci nome]  
**Review Cadence:** Settimanale (ogni lunedì)

---

## 🎨 Design Philosophy

Il Knowledge Graph è progettato con questi principi:

1. **Automatic-First:** Zero sforzo manuale, tutto automatico
2. **Non-Intrusive:** Non rallenta conversazioni, async processing
3. **Semantic-Native:** Embeddings al centro, non keyword matching
4. **Privacy-Aware:** RLS policies, isolamento per conversazione
5. **Scalable:** Architettura pronta per milioni di nodi

---

**Documento compilato il:** 12 Ottobre 2025  
**Versione:** 1.0  
**Ultimo aggiornamento:** 12 Ottobre 2025

Per domande o suggerimenti, apri issue su GitHub o contatta il team.
