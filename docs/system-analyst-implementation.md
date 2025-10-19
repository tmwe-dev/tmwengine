# System Analyst - Implementation Guide

**Date**: 2025-10-19  
**Status**: ✅ Implemented & Working  
**Version**: 1.0

---

## 📋 Overview

System Analyst è una modalità speciale di Claude che fornisce accesso completo ai dati e alla struttura del sistema CRM per analisi avanzate.

---

## ✅ Cosa Funziona

### 1. **Tool Calling per Dati CRM** ✅
Claude può eseguire query reali sul database via tool calling:

| Tool | Descrizione |
|------|-------------|
| `get_statistics()` | Statistiche generali sistema |
| `count_records(table, filters)` | Conta record in tabelle |
| `get_table_data(table, columns, filters, order_by, limit)` | Leggi dati effettivi |
| `search_contacts(query)` | Cerca contatti per nome/email/azienda |
| `get_campaign_status(campaign_id)` | Info campagne |
| `get_activities(status, priority, assignee)` | Lista attività |
| `insert_contact(dati)` | Crea nuovo contatto |
| `insert_activity(dati)` | Crea nuova attività |
| `update_record(table, id, updates)` | Aggiorna record |

### 2. **System Prompt Dedicato** ✅
Claude riceve istruzioni specializzate per:
- Security audit
- Performance review
- Data quality analysis
- Architecture audit
- Error diagnosis

### 3. **System Snapshot (Primo Messaggio)** ✅
Claude riceve automaticamente snapshot del sistema contenente:
- **Database**: Tutte le tabelle con conteggio record
- **Edge Functions**: Lista funzioni deployate + versioni
- **AI Configurations**: Provider e modelli attivi (senza API keys)
- **System Prompts**: Lista prompts configurati
- **Placeholder**: RLS policies, logs recenti (da implementare)

### 4. **Navigation Link** ✅
Link diretto: `/chat?page=/system-analyst`

### 5. **Quick Actions** ✅
Bottoni rapidi nella UI per:
- Full System Audit
- Security Check
- Performance Review
- Data Quality
- Recent Errors

---

## 🔧 Come Usare

### Accesso
1. Vai a `/chat?page=/system-analyst`
2. Attiva toggle "System Prompt"
3. Badge mostra "Claude System Analyst"

### Esempi Query

#### Analisi Generale
```
"Esegui un'analisi completa dello stato del sistema"
```

**Output Atteso**:
```markdown
📊 System Health Report

Overview Generale:
- Database: 47 tabelle, 15.432 email, 3.248 contatti
- Edge Functions: 2 attive (chat-with-ai, crm-tools)
- AI Configs: 1 attiva (OpenAI GPT-4)

🔴 CRITICAL ISSUES (2):
1. RLS Disabilitato su email_messages
   Impatto: 15.432 email esposte pubblicamente
   Fix: ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

🟡 MEDIUM ISSUES (3):
1. Index mancante su email_messages(user_email)
   Tempo query: 800ms → Fix: CREATE INDEX...

Health Score: 68/100
```

#### Security Audit
```
"Analizza tutte le RLS policies e trova vulnerabilità di sicurezza"
```

#### Performance Check
```
"Identifica query lente e suggerisci indici da aggiungere"
```

#### Data Quality
```
"Controlla la qualità dei dati: duplicati, inconsistenze, record orfani"
```

#### Errori Recenti
```
"Mostra errori critici degli ultimi 7 giorni e analizza le cause"
```

---

## 🛠️ Architettura Tecnica

### Flow Diagram
```mermaid
graph TD
    A[/chat?page=/system-analyst] --> B[PagePrompt Attivo]
    B --> C[Chat.tsx]
    C --> D[chat-with-ai Edge Function]
    D --> E{isSystemAnalyst?}
    E -->|Yes + First Message| F[collectSystemSnapshot]
    F --> G[Query DB Tables]
    F --> H[Query Edge Functions]
    F --> I[Query AI Configs]
    F --> J[Query System Prompts]
    G --> K[Build Snapshot JSON]
    H --> K
    I --> K
    J --> K
    K --> L[Prepend to Prompt]
    E -->|No| M[Normal Flow]
    L --> N[Send to Claude]
    M --> N
    N --> O[Claude Response with Tools]
    O --> P[Save to DB]
```

### File Modificati

#### Backend
- `supabase/functions/chat-with-ai/index.ts`:
  - ✅ Funzione `collectSystemSnapshot()` (safe version con try-catch)
  - ✅ Trigger `isSystemAnalyst` (solo primo messaggio)
  - ✅ Prepend snapshot al prompt utente

#### Database
- `supabase/migrations/...`:
  - ✅ Tabella `edge_function_versions` creata
  - ✅ RLS policies attive
  - ✅ Record iniziali inseriti

#### Frontend
- `src/pages/Chat.tsx`:
  - ✅ Quick Actions buttons (riga ~948)
  - ✅ Badge "System Context Active"

---

## 🔐 Security

### Dati Esposti
✅ **SAFE**:
- Schema database (nomi tabelle, conteggi record)
- Nomi edge functions + versioni
- Provider AI + modelli (senza API keys)
- Nomi system prompts

❌ **NON ESPOSTI**:
- API keys
- Password
- Dati sensibili utenti (solo via tool calling con RLS)

### RLS Protection
Tutti i tool calling rispettano le RLS policies:
- `get_table_data()` → Solo dati accessibili all'utente
- `update_record()` → Solo record di proprietà utente
- `insert_*()` → Assegnato automaticamente a utente autenticato

---

## 🐛 Troubleshooting

### Problema: Snapshot non viene raccolto
**Causa**: Edge function crasha durante `collectSystemSnapshot()`

**Debug**:
1. Controlla logs: [Edge Functions - chat-with-ai](https://supabase.com/dashboard/project/dlldkrzoxvjxpgkkttxu/functions/chat-with-ai/logs)
2. Cerca errori `[SNAPSHOT]` o `[SYSTEM ANALYST]`
3. Verifica tabelle esistono:
   ```sql
   SELECT * FROM edge_function_versions;
   SELECT * FROM page_system_prompts;
   ```

**Fix**: Edge function continua anche se snapshot fallisce (try-catch)

### Problema: Claude non usa i tools
**Causa**: Query non rilevata come CRM-related

**Debug**:
1. Verifica funzione `isCRMRelatedQuery()` (line ~132)
2. Keywords: `['crm', 'contatt', 'campagn', 'attivit', 'email', 'cliente', 'lead', 'rubrica', 'quanti', 'lista', 'statistiche']`

**Fix**: Aggiungi keyword alla lista se necessario

### Problema: RLS policy impedisce lettura
**Causa**: Utente non ha permessi su tabella

**Debug**:
```sql
-- Verifica RLS attivo
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'edge_function_versions';

-- Verifica dati
SELECT * FROM edge_function_versions;
```

**Fix**: Policy "Everyone can view edge function versions" già creata

---

## 🚀 Future Enhancements

### 📅 Roadmap

#### v1.1 - RLS Policies Query (Medium Priority)
```sql
-- Accesso a pg_policies richiede SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_rls_policies()
RETURNS TABLE(table_name text, policy_name text, cmd text) 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tablename::text, policyname::text, cmd::text
  FROM pg_policies
  WHERE schemaname = 'public';
$$;
```

#### v1.2 - Scheduled Reports (Low Priority)
- Cron job settimanale per analisi automatica
- Export PDF report
- Email notifiche admin

#### v1.3 - Auto-Fix Suggestions (Low Priority)
- Bottone "Apply Fix" per migration SQL suggerite
- Preview modifiche prima di applicare
- Rollback automatico se fallisce

#### v1.4 - Trend Analysis (Low Priority)
- Confronto snapshot nel tempo
- Grafici evoluzione metriche
- Alert anomalie

---

## 📚 References

### Documentation
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Claude Tool Calling](https://docs.anthropic.com/claude/docs/tool-use)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

### Code Links
- [Edge Function: chat-with-ai](https://supabase.com/dashboard/project/dlldkrzoxvjxpgkkttxu/functions/chat-with-ai)
- [Database: edge_function_versions](https://supabase.com/dashboard/project/dlldkrzoxvjxpgkkttxu/editor)
- [Frontend: Chat.tsx](src/pages/Chat.tsx)

---

## 📝 Changelog

### v1.0 (2025-10-19)
✅ Initial implementation:
- Created `collectSystemSnapshot()` function
- Created `edge_function_versions` table
- Implemented System Analyst trigger
- Added Quick Actions UI
- Documentation created

### Known Issues
❌ **FIXED**: `TypeError: Cannot read properties of undefined (reading 'name')` at line 705
  - **Causa**: `aiConfig` undefined durante tool calling
  - **Fix**: Added optional chaining `aiConfig?.provider || 'unknown'`

❌ **FIXED**: `edge_function_versions` table not found
  - **Causa**: Migration non eseguita
  - **Fix**: Migration completata con successo

---

## 🎓 Best Practices

### Per Sviluppatori

1. **Sempre try-catch nelle query Supabase**:
   ```typescript
   try {
     const { data, error } = await supabase.from('table').select();
     if (!error && data) { /* usa data */ }
   } catch (e) {
     console.error('Failed:', e);
     // ✅ Continua esecuzione
   }
   ```

2. **Non esporre mai secrets negli snapshot**:
   ```typescript
   // ❌ WRONG
   .select('api_key, provider')
   
   // ✅ CORRECT
   .select('provider, modello')
   ```

3. **Fallback graceful**:
   ```typescript
   if (systemSnapshot && Object.keys(systemSnapshot).length > 0) {
     // usa snapshot
   } else {
     // continua senza snapshot
   }
   ```

### Per Utenti

1. **Prima query**: Sempre partire con "Analizza lo stato generale del sistema"
2. **Query specifiche**: Poi drill-down su problemi specifici
3. **Verificare fix**: Dopo SQL suggerite, ri-eseguire audit
4. **Backup**: Prima di applicare fix, backup database

---

## 🔍 FAQ

### Q: Claude non riceve lo snapshot?
**A**: Verifica che:
1. Toggle "System Prompt" sia attivo
2. Sia il **primo messaggio** della conversazione
3. Logs mostrano `[SYSTEM ANALYST] Snapshot collected successfully`

### Q: Come aggiungere nuove metriche allo snapshot?
**A**: Modifica `collectSystemSnapshot()` in `chat-with-ai/index.ts`:
```typescript
// 7. Nuova metrica
try {
  const { data, error } = await supabaseClient
    .from('nuova_tabella')
    .select('campo1, campo2');
  if (!error && data) {
    snapshot.nuova_metrica = { total: data.length, items: data };
  }
} catch (e) {
  snapshot.nuova_metrica = { error: 'Failed to load' };
}
```

### Q: Come disabilitare System Analyst?
**A**: 
1. Disattiva system prompt nella tabella `page_system_prompts`
2. Oppure vai su `/chat` normale (senza `?page=/system-analyst`)

---

**Maintained by**: AI Development Team  
**Last Updated**: 2025-10-19  
**Version**: 1.0  
**Status**: ✅ Production Ready
