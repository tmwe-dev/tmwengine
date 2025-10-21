# 🧠 AI Collaboration System

Questa cartella contiene file di supporto per la collaborazione tra Lovable e AI esterni (ChatGPT, Claude, Gemini) della Chat Laboratory.

## 📂 Struttura File

| File | Scopo | Aggiornamento |
|------|-------|---------------|
| `project-overview.md` | Struttura app, stack, componenti | GitHub Action (commit) |
| `errors-log.json` | Errori runtime/build | ErrorBoundary + Edge Function |
| `ai-tasks.md` | Coda task proposti da AI | Edge Function `manage-ai-tasks` |
| `change-history.md` | Log modifiche codice | GitHub Action (commit) |

## 🔐 Accesso

- **Lettura**: Edge function `get-ai-docs` (JWT auth)
- **Scrittura**: Solo edge functions autorizzate
- **Storage**: Duplicati in Supabase Storage bucket `ai-collaboration-docs`

## 🔄 Workflow

1. **Lovable** genera/modifica codice → Update `change-history.md`
2. **ErrorBoundary** rileva errore → Update `errors-log.json`
3. **AI esterni** leggono docs via tool calling → Analizzano
4. **AI esterni** propongono task → Scrivono in `ai-tasks.md`
5. **Utente** approva task manualmente
6. **Lovable** implementa → Marca completato

## 🛠️ Tool Calling per AI

```typescript
// Esempio: Claude legge errori
{
  "type": "function",
  "function": {
    "name": "read_lovable_docs",
    "arguments": '{"docType": "errors"}'
  }
}

// Esempio: ChatGPT propone task
{
  "type": "function",
  "function": {
    "name": "propose_lovable_task",
    "arguments": '{
      "title": "Ottimizza render MessageTabsView",
      "file": "MessageTabsView.tsx",
      "problem": "Re-render eccessivi su activeTab change",
      "priority": "media"
    }'
  }
}
```

## 📊 Monitoraggio

- **Supabase Dashboard**: Logs edge functions
- **Database Table**: `ai_collaboration_tasks` (tracking task queue)
- **Storage Bucket**: `ai-collaboration-docs` (backup file)

## 🚀 Edge Functions Disponibili

1. **get-ai-docs**: Lettura documenti (JWT auth richiesta)
2. **log-error**: Logging errori runtime (no auth - chiamato da client)
3. **manage-ai-tasks**: Gestione task queue (auth selettiva)

## 📖 Esempi Chiamate API

### Leggere Documenti
```bash
curl -X POST https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/get-ai-docs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"docType": "errors"}'
```

### Proporre Task
```bash
curl -X POST https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/manage-ai-tasks \
  -H "Content-Type: application/json" \
  -d '{
    "action": "propose",
    "task": {
      "title": "Fix memory leak",
      "file": "ChatLaboratory.tsx",
      "problem": "Component non unmonta correttamente",
      "priority": "alta",
      "proposedBy": "Claude"
    }
  }'
```

## 🔒 Sicurezza

- **JWT Authentication**: Richiesta per lettura documenti
- **Service Role Key**: Usata solo in edge functions server-side
- **RLS Policies**: Database table protetta con Row Level Security
- **Private Storage**: Bucket `ai-collaboration-docs` non pubblico
